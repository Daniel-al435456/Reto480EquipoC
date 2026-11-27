"""Rutas de las actividades del curso."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import EntradaCorreccion, SalidaCorreccion
from app.routers.dependencias import DatosDelAlumno
from app.servicios import contenido

router = APIRouter(prefix="/api/actividades", tags=["actividades"])


@router.post(
    "/correccion",
    response_model=SalidaCorreccion,
    response_model_exclude_none=True,
    summary="Corrige una respuesta escrita",
)
def corregir(entrada: EntradaCorreccion, alumno: DatosDelAlumno) -> SalidaCorreccion:
    # Con sesión, el nombre del alumno se quita de su respuesta y si es menor lo dice su fecha.
    return contenido.corregir_respuesta(
        entrada.actividad_id,
        entrada.texto,
        es_menor=alumno.menor(entrada.es_menor),
        personalidad=entrada.personalidad,
        tratamiento=entrada.tratamiento,
        nombres=alumno.nombres,
    )
