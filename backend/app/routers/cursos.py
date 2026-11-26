"""Rutas del contenido del curso: catálogo y test inicial."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import EntradaEvaluacion, SalidaCursos, SalidaEvaluacion, SalidaTest
from app.servicios import contenido

router = APIRouter(prefix="/api/cursos", tags=["cursos"])


@router.get("", response_model=SalidaCursos, summary="Catálogo de cursos")
def listar_cursos() -> SalidaCursos:
    return contenido.listar_cursos()


@router.get("/{curso_id}/test", response_model=SalidaTest, summary="Preguntas del test inicial")
def preguntas_test(curso_id: str) -> SalidaTest:
    """Devuelve las preguntas sin la respuesta correcta."""
    return contenido.preguntas_test(curso_id)


@router.post(
    "/{curso_id}/test/evaluacion",
    response_model=SalidaEvaluacion,
    summary="Corrige el test inicial y explica el itinerario",
)
def evaluar_test(curso_id: str, entrada: EntradaEvaluacion) -> SalidaEvaluacion:
    return contenido.evaluar_test(curso_id, entrada.respuestas)
