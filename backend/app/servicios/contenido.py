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
    PreguntaTest,
    SalidaCorreccion,
    SalidaCursoLecciones,
    SalidaCursos,
    SalidaEvaluacion,
    SalidaTest,
)
from app.persistencia import hay_base_de_datos
from app.servicios import cursos_bd

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


def evaluar_test(curso_id: str, respuestas: dict[str, int]) -> SalidaEvaluacion:
    """Corrige el test inicial con reglas, sin IA.

    Cada acierto marca como dominadas todas las lecciones del vídeo de la lección de la pregunta.

    El mensaje es una plantilla. Con la issue #16, el agente Diagnóstico lo redactará
    a partir de este resultado y la plantilla quedará como respaldo (SPEC §7).
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


def _actividad(actividad_id: str) -> dict[str, Any]:
    for curso in _cursos():
        for leccion in curso["lecciones"]:
            for actividad in leccion["actividades"]:
                if actividad["id"] == actividad_id:
                    return actividad
    raise ErrorDeNegocio(
        "actividad_no_encontrada", f"No existe la actividad «{actividad_id}».", 404
    )


def corregir_respuesta(actividad_id: str, texto: str) -> SalidaCorreccion:
    """Corrige una respuesta escrita: es correcta si contiene todas las palabras clave."""
    actividad = _actividad(actividad_id)
    if actividad.get("tipo") != "escrita":
        raise ErrorDeNegocio(
            "actividad_no_escrita", "Esa actividad no se responde por escrito.", 400
        )
    respuesta = normalizar(texto)
    correcta = all(normalizar(clave) in respuesta for clave in actividad["palabrasClave"])
    return SalidaCorreccion(correcta=correcta, solucion=actividad["solucion"])
