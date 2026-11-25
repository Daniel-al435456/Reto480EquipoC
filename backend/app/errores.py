"""Formato único de error de la API.

AGENTS.md fija el formato `{"error": "codigo", "mensaje": "..."}`. Como todos los
errores salen de un solo sitio, ninguna respuesta se escapa de la regla y el
frontend siempre sabe qué encontrar.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as ExcepcionHTTP

logger = logging.getLogger(__name__)

#: Mensaje por defecto de cada código HTTP, en español.
MENSAJES: dict[int, str] = {
    400: "La petición no es válida.",
    401: "Falta iniciar sesión.",
    403: "No tienes permiso para esta acción.",
    404: "No existe esa dirección en la API.",
    409: "La operación entra en conflicto con lo que hay guardado.",
    422: "Hay un campo con un valor que no se puede usar.",
    429: "Demasiadas peticiones seguidas: espera un momento.",
    500: "El servidor ha encontrado un problema inesperado.",
}

#: Código interno del error para cada código HTTP.
CODIGOS_HTTP: dict[int, str] = {
    400: "peticion_invalida",
    401: "no_autorizado",
    403: "prohibido",
    404: "no_encontrado",
    409: "conflicto",
    422: "validacion",
    429: "demasiadas_peticiones",
    500: "interno",
}

#: Detalles que pone el framework y que no tiene sentido traducir tal cual.
_DETALLES_GENERICOS = ("Not Found", "Method Not Allowed", "Internal Server Error")


class ErrorDeNegocio(Exception):
    """Error previsto por las reglas de negocio, con el código que decida quien lo lanza."""

    def __init__(self, codigo: str, mensaje: str, estado: int = 400) -> None:
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.estado = estado


def cuerpo_error(codigo: str, mensaje: str) -> dict[str, str]:
    """Único punto que construye un cuerpo de error."""
    return {"error": codigo, "mensaje": mensaje}


def _mensaje_de_validacion(errores: list[Any]) -> str:
    """Traduce los errores de Pydantic a una frase corta en español que nombra los campos."""
    campos: list[str] = []
    faltantes: list[str] = []
    for error in errores:
        ubicacion = [
            str(parte) for parte in error.get("loc", ()) if parte not in ("body", "query", "path")
        ]
        if not ubicacion:
            continue
        campo = ubicacion[-1]
        if campo not in campos:
            campos.append(campo)
        if error.get("type") == "missing" and campo not in faltantes:
            faltantes.append(campo)
    if not campos:
        return MENSAJES[422]
    enumerado = ", ".join(f"'{campo}'" for campo in campos)
    if faltantes:
        return f"Falta el campo {enumerado}."
    return f"El campo {enumerado} no admite ese valor."


def instalar_manejadores(app: FastAPI) -> None:
    """Registra en la aplicación los manejadores que garantizan el formato único."""

    @app.exception_handler(ErrorDeNegocio)
    async def _de_negocio(_request: Request, excepcion: ErrorDeNegocio) -> JSONResponse:
        return JSONResponse(
            status_code=excepcion.estado,
            content=cuerpo_error(excepcion.codigo, excepcion.mensaje),
        )

    @app.exception_handler(ExcepcionHTTP)
    async def _del_framework(_request: Request, excepcion: ExcepcionHTTP) -> JSONResponse:
        codigo = CODIGOS_HTTP.get(excepcion.status_code, f"http_{excepcion.status_code}")
        detalle = excepcion.detail
        mensaje = (
            detalle
            if isinstance(detalle, str) and detalle not in _DETALLES_GENERICOS
            else MENSAJES.get(excepcion.status_code, "No se ha podido completar la petición.")
        )
        return JSONResponse(
            status_code=excepcion.status_code, content=cuerpo_error(codigo, mensaje)
        )

    @app.exception_handler(RequestValidationError)
    async def _de_validacion(_request: Request, excepcion: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=cuerpo_error("validacion", _mensaje_de_validacion(excepcion.errors())),
        )

    @app.exception_handler(Exception)
    async def _inesperado(_request: Request, excepcion: Exception) -> JSONResponse:
        logger.error("Error inesperado al atender la petición: %s", excepcion, exc_info=True)
        return JSONResponse(status_code=500, content=cuerpo_error("interno", MENSAJES[500]))
