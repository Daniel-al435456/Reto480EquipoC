"""Contenido del curso: catálogo, test inicial y corrección de actividades.

El curso sale de una de dos fuentes, siempre con la misma forma (issue #40):

  - Con `DATABASE_URL`, de PostgreSQL (`app/servicios/cursos_bd.py`), cargado antes con
    `migraciones/cargar_curso.sh`.
  - Sin `DATABASE_URL`, de `app/datos/cursos-ejemplo.json`, la misma copia que usa el frontend
    (se genera con `frontend/herramientas/exportar-curso.mjs`). Así se puede arrancar el backend
    sin instalar PostgreSQL.

Si `DATABASE_URL` está definida, el curso sale solo de PostgreSQL: si falla, no se recurre al JSON
a escondidas, para que un error de la base de datos no pase desapercibido.
"""

from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.errores import ErrorDeNegocio
from app.esquemas import (
    CursoResumen,
    Personalidad,
    PreguntaTest,
    SalidaCorreccion,
    SalidaCursoLecciones,
    SalidaCursos,
    SalidaEvaluacion,
    SalidaTest,
    Tratamiento,
)
from app.persistencia import hay_base_de_datos
from app.servicios import agentes, cursos_bd

ARCHIVO_CURSOS = Path(__file__).resolve().parent.parent / "datos" / "cursos-ejemplo.json"


def _cursos() -> list[dict[str, Any]]:
    """Cursos disponibles, de PostgreSQL o del JSON de ejemplo.

    De PostgreSQL se leen en cada petición, sin guardarlos en memoria: así, tras volver a cargar el
    curso con `cargar_curso.sh`, el backend sirve lo nuevo sin reiniciarlo. Son pocas filas.
    """
    if hay_base_de_datos():
        return cursos_bd.leer_cursos()
    return _cursos_del_json()


def origen_del_curso() -> str:
    """Frase para la terminal al arrancar: de dónde sale el curso y cómo cambiarlo."""
    if hay_base_de_datos():
        return "Curso: PostgreSQL (DATABASE_URL)."
    return (
        "Curso: JSON de ejemplo, porque no hay DATABASE_URL. Para leerlo de PostgreSQL, "
        "ver 'Conectar la base de datos' en backend/README.md."
    )


@lru_cache(maxsize=1)
def _cursos_del_json() -> list[dict[str, Any]]:
    """Cursos del JSON de ejemplo. Se leen una sola vez por proceso."""
    return json.loads(ARCHIVO_CURSOS.read_text(encoding="utf-8"))["cursos"]


def obtener_curso(curso_id: str) -> dict[str, Any]:
    """Curso completo por su identificador, o error 404 si no existe."""
    for curso in _cursos():
        if curso["id"] == curso_id:
            return curso
    raise ErrorDeNegocio("curso_no_encontrado", f"No existe el curso «{curso_id}».", 404)


def obtener_leccion(curso_id: str, leccion_id: str) -> dict[str, Any]:
    """Lección de un curso, o error 404 si no existe."""
    for leccion in obtener_curso(curso_id)["lecciones"]:
        if leccion["id"] == leccion_id:
            return leccion
    raise ErrorDeNegocio("leccion_no_encontrada", f"No existe la lección «{leccion_id}».", 404)


def listar_cursos() -> SalidaCursos:
    """Catálogo de cursos con el número de lecciones de cada uno."""
    return SalidaCursos(
        cursos=[
            CursoResumen(
                id=curso["id"],
                titulo=curso["titulo"],
                descripcion=curso["descripcion"],
                nivel=curso["nivel"],
                numero_lecciones=len(curso["lecciones"]),
            )
            for curso in _cursos()
        ]
    )


def obtener_curso_con_lecciones(curso_id: str) -> SalidaCursoLecciones:
    """Devuelve los datos del curso y sus lecciones, sin incluir las respuestas del test."""
    return SalidaCursoLecciones.model_validate(obtener_curso(curso_id))


def preguntas_test(curso_id: str) -> SalidaTest:
    """Preguntas del test inicial. La respuesta correcta nunca sale del servidor."""
    return SalidaTest(
        preguntas=[
            PreguntaTest(
                id=pregunta["id"],
                leccion_id=pregunta["leccionId"],
                enunciado=pregunta["enunciado"],
                opciones=pregunta["opciones"],
            )
            for pregunta in obtener_curso(curso_id)["testInicial"]
        ]
    )


def evaluar_test(
    curso_id: str,
    respuestas: dict[str, int],
    es_menor: bool = False,
    personalidad: Personalidad = "amable",
    tratamiento: Tratamiento = "neutro",
) -> SalidaEvaluacion:
    """Corrige el test inicial con reglas, sin IA.

    Cada acierto marca como dominadas todas las lecciones del vídeo de la lección de la pregunta.

    La nota no la decide la IA. Con `GROQ_API_KEY`, el agente Diagnóstico redacta el mensaje a
    partir de este resultado; sin clave, o si la IA falla, se usa la plantilla (SPEC §7).
    """
    curso = obtener_curso(curso_id)
    lecciones = curso["lecciones"]
    video_de = {leccion["id"]: leccion["videoId"] for leccion in lecciones}
    videos_acertados = {
        video_de[pregunta["leccionId"]]
        for pregunta in curso["testInicial"]
        if respuestas.get(pregunta["id"]) == pregunta["correcta"]
    }
    dominio = {
        leccion["id"]: True for leccion in lecciones if leccion["videoId"] in videos_acertados
    }
    dominadas = [leccion for leccion in lecciones if dominio.get(leccion["id"])]
    siguiente = next((leccion for leccion in lecciones if not dominio.get(leccion["id"])), None)
    if not dominadas:
        mensaje = "Empezamos desde el principio. Iremos paso a paso, a tu ritmo."
    elif siguiente is None:
        mensaje = (
            "Ya dominas todo el contenido del curso. "
            "Puedes repasar cualquier lección cuando quieras."
        )
    else:
        mensaje = (
            f"Ya dominas {len(dominadas)} de {len(lecciones)} lecciones, así que no tendrás que "
            f"verlas. Empezarás por «{siguiente['titulo']}»."
        )
    titulo_de_video = {video["id"]: video["titulo"] for video in curso.get("videos", [])}
    # Lo que recibe el agente Diagnóstico: cada vídeo del test y si se domina. Nada del alumno.
    conceptos: dict[str, bool] = {}
    for pregunta in curso["testInicial"]:
        video = video_de[pregunta["leccionId"]]
        conceptos[titulo_de_video.get(video, video)] = video in videos_acertados
    redactado = agentes.redactar_diagnostico(
        conceptos=conceptos,
        dominadas=len(dominadas),
        total=len(lecciones),
        siguiente=siguiente["titulo"] if siguiente else None,
        titulo_curso=curso.get("titulo", ""),
        es_menor=es_menor,
        personalidad=personalidad,
        tratamiento=tratamiento,
    )
    if redactado:
        return SalidaEvaluacion(dominio=dominio, mensaje=redactado, redactado_por_ia=True)
    return SalidaEvaluacion(dominio=dominio, mensaje=mensaje)


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes, sin comillas y con un solo espacio entre palabras."""
    sin_tildes = "".join(
        caracter
        for caracter in unicodedata.normalize("NFD", texto.lower())
        if not unicodedata.combining(caracter)
    )
    sin_comillas = "".join(c for c in sin_tildes if c not in "\"'`")
    return " ".join(sin_comillas.split())


def _actividad(actividad_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """La actividad y la lección a la que pertenece."""
    for curso in _cursos():
        for leccion in curso["lecciones"]:
            for actividad in leccion["actividades"]:
                if actividad["id"] == actividad_id:
                    return actividad, leccion
    raise ErrorDeNegocio(
        "actividad_no_encontrada", f"No existe la actividad «{actividad_id}».", 404
    )


def corregir_respuesta(
    actividad_id: str,
    texto: str,
    es_menor: bool = False,
    personalidad: Personalidad = "amable",
    tratamiento: Tratamiento = "neutro",
    nombres: list[str] | None = None,
) -> SalidaCorreccion:
    """Corrige una respuesta escrita.

    `nombres` son el nombre y los apellidos del alumno con sesión: no llegan a la IA.

    Si contiene todas las palabras clave, es correcta sin preguntar a nadie. Si no, con
    `GROQ_API_KEY` decide el agente de corrección, que entiende respuestas equivalentes escritas
    con otras palabras y explica el motivo. Sin clave, o si la IA falla, cuentan solo las
    palabras clave.
    """
    actividad, leccion = _actividad(actividad_id)
    if actividad.get("tipo") != "escrita":
        raise ErrorDeNegocio(
            "actividad_no_escrita", "Esa actividad no se responde por escrito.", 400
        )
    respuesta = normalizar(texto)
    if all(normalizar(clave) in respuesta for clave in actividad["palabrasClave"]):
        return SalidaCorreccion(correcta=True, solucion=actividad["solucion"])
    if texto.strip():
        corregida = agentes.corregir_respuesta(
            enunciado=actividad["enunciado"],
            solucion=actividad["solucion"],
            palabras_clave=actividad["palabrasClave"],
            leccion=leccion,
            respuesta=texto,
            es_menor=es_menor,
            personalidad=personalidad,
            tratamiento=tratamiento,
            nombres=nombres,
        )
        if corregida:
            return SalidaCorreccion(
                correcta=corregida["correcta"],
                solucion=actividad["solucion"],
                comentario=corregida["comentario"],
                redactado_por_ia=True,
            )
    return SalidaCorreccion(correcta=False, solucion=actividad["solucion"])
