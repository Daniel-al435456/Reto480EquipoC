"""Contenido del curso: catálogo, test inicial y corrección de actividades.

Mientras el curso no esté cargado en PostgreSQL (issue #15), el contenido se lee
de `app/datos/cursos-ejemplo.json`, la misma copia que usa el frontend
(se genera con `frontend/herramientas/exportar-curso.mjs`). Cuando esté la base
de datos, solo cambia `_cursos()`: las rutas y el contrato siguen igual.
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
    SalidaCursos,
    SalidaEvaluacion,
    SalidaTest,
)

ARCHIVO_CURSOS = Path(__file__).resolve().parent.parent / "datos" / "cursos-ejemplo.json"


@lru_cache(maxsize=1)
def _cursos() -> list[dict[str, Any]]:
    """Cursos disponibles. Se leen una sola vez por proceso."""
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
    """Corrige el test inicial con reglas, sin IA: cada acierto marca su lección como dominada.

    El mensaje es una plantilla. Con la issue #16, el agente Diagnóstico lo redactará
    a partir de este resultado y la plantilla quedará como respaldo (SPEC §7).
    """
    curso = obtener_curso(curso_id)
    dominio = {
        pregunta["leccionId"]: True
        for pregunta in curso["testInicial"]
        if respuestas.get(pregunta["id"]) == pregunta["correcta"]
    }
    lecciones = curso["lecciones"]
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
            f"Ya dominas {len(dominadas)} de {len(lecciones)} temas, así que no tendrás que "
            f"verlos. Empezarás por «{siguiente['titulo']}»."
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
