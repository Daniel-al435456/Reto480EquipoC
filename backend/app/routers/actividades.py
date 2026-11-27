"""Rutas de las actividades del curso."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import EntradaCorreccion, SalidaCorreccion
from app.routers.dependencias import NombresDelAlumno
from app.servicios import contenido

router = APIRouter(prefix="/api/actividades", tags=["actividades"])


@router.post(
    "/correccion",
    response_model=SalidaCorreccion,
    response_model_exclude_none=True,
    summary="Corrige una respuesta escrita",
)
def corregir(entrada: EntradaCorreccion, nombres: NombresDelAlumno) -> SalidaCorreccion:
    # Con sesión, el nombre y los apellidos del alumno se quitan de lo que llega a la IA.
    return contenido.corregir_respuesta(
        entrada.actividad_id,
        entrada.texto,
        es_menor=entrada.es_menor,
        personalidad=entrada.personalidad,
        tratamiento=entrada.tratamiento,
        nombres=nombres,
    )
