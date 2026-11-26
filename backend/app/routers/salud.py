"""Rutas del estado del sistema."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import SalidaSalud
from app.servicios.sistema import estado_del_servicio

router = APIRouter(tags=["sistema"])


@router.get(
    "/salud",
    response_model=SalidaSalud,
    summary="Comprueba que el backend responde",
)
def salud() -> SalidaSalud:
    """Responde si el servicio está en marcha. No filtra configuración ni credenciales."""
    return estado_del_servicio()
