"""Fábrica de la aplicación FastAPI.

El orden importa: primero los manejadores de error (para que todo lo que falle
después salga en el formato acordado) y después CORS y rutas.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import obtener_configuracion
from app.errores import instalar_manejadores
from app.routers import salud

DESCRIPCION = (
    "API del prototipo de aprendizaje adaptativo para 480 Academy. "
    "El frontend nunca habla con la IA: toda llamada pasa por este servidor "
    "y por el filtro de privacidad (`app/privacidad.py`)."
)


def crear_app() -> FastAPI:
    """Monta la aplicación completa: errores, CORS y rutas."""
    configuracion = obtener_configuracion()

    app = FastAPI(
        title="API del Reto 480 · Equipo C",
        description=DESCRIPCION,
        version="0.1.0",
        contact={
            "name": "Equipo C · Reto 480",
            "url": "https://github.com/Daniel-al435456/Reto480EquipoC",
        },
    )

    instalar_manejadores(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuracion.origenes_cors,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(salud.router)
    return app


#: Instancia que arranca `uvicorn app.main:app`.
app = crear_app()
