"""Fábrica de la aplicación FastAPI.

El orden importa: primero los manejadores de error (para que todo lo que falle
después salga en el formato acordado) y después CORS y rutas.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import obtener_configuracion
from app.errores import instalar_manejadores
from app.routers import actividades, cuenta, cursos, mentor, salud
from app.servicios.agentes import origen_de_la_ia
from app.servicios.contenido import origen_del_curso

#: El registro de uvicorn: lo que se escribe aquí sale en la terminal al arrancar, con su formato.
registro_servidor = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def _al_arrancar(_app: FastAPI) -> AsyncIterator[None]:
    """Dice en la terminal de dónde sale el curso y si hay IA, para que no se dé por hecho."""
    registro_servidor.info(origen_del_curso())
    registro_servidor.info(origen_de_la_ia())
    yield


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
        lifespan=_al_arrancar,
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
    app.include_router(cursos.router)
    app.include_router(actividades.router)
    app.include_router(mentor.router)
    app.include_router(cuenta.router)
    return app


#: Instancia que arranca `uvicorn app.main:app`.
app = crear_app()
