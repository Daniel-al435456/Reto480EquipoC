"""Esquemas de entrada y salida de la API.

Son los contratos que ven y producen las rutas (Pydantic). No confundir con el
esquema de la base de datos, que vive en `backend/migraciones/`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SalidaSalud(BaseModel):
    """Respuesta de `GET /salud`: informa del estado, nunca de la configuración."""

    estado: Literal["ok"] = Field(description="Si el servicio está en marcha")
    servicio: str = Field(description="Nombre del servicio")
    version: str = Field(description="Versión del código desplegado")
