"""Rutas de las actividades del curso."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import EntradaCorreccion, SalidaCorreccion
from app.servicios import contenido

router = APIRouter(prefix="/api/actividades", tags=["actividades"])


@router.post(
    "/correccion", response_model=SalidaCorreccion, summary="Corrige una respuesta escrita"
)
def corregir(entrada: EntradaCorreccion) -> SalidaCorreccion:
    return contenido.corregir_respuesta(entrada.actividad_id, entrada.texto)
