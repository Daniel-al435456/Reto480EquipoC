"""Lectura del curso desde PostgreSQL (issue #40).

Monta los cursos con la misma forma que `app/datos/cursos-ejemplo.json`, así el resto de
servicios y el contrato con el frontend no cambian según de dónde venga el curso. Es el camino
inverso de `migraciones/cargar_curso.sql`:

  - `videos` son los vídeos del curso en su orden, con su duración en segundos.
  - Cada lección lleva su vídeo (`videoId` y `youtubeId`), su trozo (`inicioS`, `finS`) y su
    `aviso`, si lo tiene. Sin `finS`,
    llega hasta el final del vídeo. `duracionVideo` son los minutos de ese trozo, redondeados
    hacia arriba.
  - `concepto` es el nombre del primer concepto que cubre la lección.
  - Verdadero o falso: la respuesta correcta es la opción marcada ("Verdadero" o "Falso").
  - Las preguntas del test inicial van unidas a un concepto; `leccionId` es la primera lección
    que lo cubre.
"""

from __future__ import annotations

import logging
import math
import re
from typing import Any

from app.errores import ErrorDeNegocio
from app.persistencia import conexion

logger = logging.getLogger(__name__)

CONSULTA_CURSOS = """
    SELECT id, titulo, descripcion, nivel FROM cursos ORDER BY id
"""

CONSULTA_VIDEOS = """
    SELECT curso_id, id, titulo, youtube_id, duracion_s FROM videos ORDER BY curso_id, orden
"""

CONSULTA_LECCIONES = """
    SELECT v.curso_id, l.id, l.video_id, l.titulo, l.aviso, l.descripcion, l.resumen, l.lectura,
           l.duracion_lectura_min, l.inicio_s, l.fin_s, v.youtube_id, v.duracion_s,
           (SELECT co.nombre FROM lecciones_conceptos lc JOIN conceptos co ON co.id = lc.concepto_id
            WHERE lc.leccion_id = l.id ORDER BY co.id LIMIT 1) AS concepto
    FROM lecciones l JOIN videos v ON v.id = l.video_id
    ORDER BY v.curso_id, v.orden, l.inicio_s
"""

CONSULTA_ACTIVIDADES = """
    SELECT p.id, p.leccion_id, p.formato, p.enunciado, p.solucion, p.explicacion,
           (SELECT o.texto = 'Verdadero' FROM opciones_pregunta o
            WHERE o.pregunta_id = p.id AND o.correcta) AS verdadera,
           ARRAY(SELECT k.palabra FROM palabras_clave k
                 WHERE k.pregunta_id = p.id ORDER BY k.palabra) AS palabras_clave
    FROM preguntas p
    WHERE p.uso = 'comprobacion'
"""

CONSULTA_TEST = """
    SELECT co.curso_id, p.id, p.enunciado, primera.leccion_id,
           ARRAY(SELECT o.texto FROM opciones_pregunta o
                 WHERE o.pregunta_id = p.id ORDER BY o.orden) AS opciones,
           (SELECT o.orden - 1 FROM opciones_pregunta o
            WHERE o.pregunta_id = p.id AND o.correcta) AS correcta
    FROM preguntas p
    JOIN conceptos co ON co.id = p.concepto_id
    LEFT JOIN LATERAL (
      SELECT l.id AS leccion_id, v.orden, l.inicio_s
      FROM lecciones_conceptos lc
      JOIN lecciones l ON l.id = lc.leccion_id
      JOIN videos v ON v.id = l.video_id
      WHERE lc.concepto_id = p.concepto_id
      ORDER BY v.orden, l.inicio_s
      LIMIT 1
    ) AS primera ON true
    WHERE p.uso = 'diagnostico'
    ORDER BY co.curso_id, primera.orden, primera.inicio_s, p.id
"""


def _orden_natural(identificador: str) -> list[Any]:
    """Ordena 'leccion-2' antes que 'leccion-10' (la tabla preguntas no tiene columna de orden)."""
    return [int(trozo) if trozo.isdigit() else trozo for trozo in re.split(r"(\d+)", identificador)]


def _minutos_de_video(fila: dict[str, Any]) -> int:
    """Minutos del trozo de vídeo de la lección, redondeados hacia arriba."""
    fin = fila["fin_s"] if fila["fin_s"] is not None else fila["duracion_s"]
    if fin is None:
        return 0
    return math.ceil((fin - fila["inicio_s"]) / 60)


def _actividad(fila: dict[str, Any]) -> dict[str, Any]:
    actividad: dict[str, Any] = {
        "id": fila["id"],
        "tipo": fila["formato"],
        "enunciado": fila["enunciado"],
    }
    if fila["formato"] == "vf":
        actividad["correcta"] = bool(fila["verdadera"])
    else:
        actividad["palabrasClave"] = list(fila["palabras_clave"])
        actividad["solucion"] = fila["solucion"]
    if fila["explicacion"] is not None:
        actividad["explicacion"] = fila["explicacion"]
    return actividad


def _leccion(fila: dict[str, Any], actividades: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    leccion: dict[str, Any] = {
        "id": fila["id"],
        "videoId": fila["video_id"],
        "titulo": fila["titulo"],
        "concepto": fila["concepto"] or "",
        "youtubeId": fila["youtube_id"] or "",
        "inicioS": fila["inicio_s"],
        "finS": fila["fin_s"],
        "duracionVideo": _minutos_de_video(fila),
        "duracionLectura": fila["duracion_lectura_min"],
        "descripcion": fila["descripcion"] or "",
        # cargar_curso.sql guarda los párrafos separados por una línea en blanco.
        "lectura": fila["lectura"].split("\n\n") if fila["lectura"] else [],
        "resumen": fila["resumen"] or "",
        "actividades": actividades.get(fila["id"], []),
    }
    if fila["aviso"] is not None:
        leccion["aviso"] = fila["aviso"]
    return leccion


def leer_cursos() -> list[dict[str, Any]]:
    """Todos los cursos con sus lecciones, actividades y test inicial."""
    with conexion() as bd:
        cursos = bd.execute(CONSULTA_CURSOS).fetchall()
        videos = bd.execute(CONSULTA_VIDEOS).fetchall()
        lecciones = bd.execute(CONSULTA_LECCIONES).fetchall()
        actividades = bd.execute(CONSULTA_ACTIVIDADES).fetchall()
        preguntas_test = bd.execute(CONSULTA_TEST).fetchall()

    if not cursos:
        # Con un 200 y la lista vacía, la app enseñaría un catálogo vacío sin que nadie se entere.
        logger.warning("La base de datos no tiene ningún curso: falta migraciones/cargar_curso.sh.")
        raise ErrorDeNegocio(
            "base_datos_sin_cursos",
            "La base de datos no tiene ningún curso: hay que cargarlo con cargar_curso.sh.",
            503,
        )

    actividades_por_leccion: dict[str, list[dict[str, Any]]] = {}
    for fila in sorted(actividades, key=lambda fila: _orden_natural(fila["id"])):
        actividades_por_leccion.setdefault(fila["leccion_id"], []).append(_actividad(fila))

    resultado = []
    for curso in cursos:
        resultado.append(
            {
                "id": curso["id"],
                "titulo": curso["titulo"],
                "descripcion": curso["descripcion"] or "",
                "nivel": curso["nivel"] or "",
                "videos": [
                    {
                        "id": fila["id"],
                        "titulo": fila["titulo"],
                        "youtubeId": fila["youtube_id"] or "",
                        "duracion": fila["duracion_s"],
                    }
                    for fila in videos
                    if fila["curso_id"] == curso["id"]
                ],
                "lecciones": [
                    _leccion(fila, actividades_por_leccion)
                    for fila in lecciones
                    if fila["curso_id"] == curso["id"]
                ],
                "testInicial": [
                    {
                        "id": fila["id"],
                        "leccionId": fila["leccion_id"],
                        "enunciado": fila["enunciado"],
                        "opciones": list(fila["opciones"]),
                        "correcta": fila["correcta"],
                    }
                    for fila in preguntas_test
                    if fila["curso_id"] == curso["id"]
                ],
            }
        )
    return resultado
