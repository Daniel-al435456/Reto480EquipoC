"""Conexión con PostgreSQL (issue #40).

Único módulo del backend que abre conexiones con la base de datos (lo comprueba
`pruebas/test_arquitectura.py`). Los servicios piden aquí la conexión; los routers no la tocan.

La dirección sale de la variable de entorno `DATABASE_URL` (`app/config.py`), con el formato de
libpq: `dbname=reto480` o una URL completa. También se admite el formato de `.env.example`
(`postgresql+psycopg://`, el de SQLAlchemy). Sin `DATABASE_URL`, el backend no usa la base de datos
y el curso se lee del JSON de ejemplo.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg.rows import DictRow, dict_row

from app.config import obtener_configuracion
from app.errores import ErrorDeNegocio

logger = logging.getLogger(__name__)

#: Tipo de la conexión que reciben los servicios: así no necesitan importar psycopg.
type Conexion = psycopg.Connection[DictRow]

#: Segundos que se espera a la base de datos antes de dar el error.
TIEMPO_MAXIMO_CONEXION = 3


def hay_base_de_datos() -> bool:
    """True si el backend está configurado para usar PostgreSQL."""
    return bool(obtener_configuracion().url_base_datos)


def _direccion() -> str:
    """DATABASE_URL en un formato que entienda psycopg (quita el "+psycopg" de SQLAlchemy)."""
    direccion = obtener_configuracion().url_base_datos
    for prefijo in ("postgresql+psycopg:", "postgres+psycopg:"):
        if direccion.startswith(prefijo):
            return "postgresql:" + direccion.removeprefix(prefijo)
    return direccion


def _no_disponible(motivo: str) -> ErrorDeNegocio:
    """Error 503 para el frontend; el motivo real solo va al registro del servidor."""
    logger.warning("No se puede usar la base de datos: %s", motivo)
    return ErrorDeNegocio(
        "base_datos_no_disponible", "No se puede conectar con la base de datos.", 503
    )


@contextmanager
def conexion() -> Iterator[psycopg.Connection[DictRow]]:
    """Abre una conexión cuyas filas son diccionarios y la cierra al terminar.

    Si no se puede conectar, o una consulta falla (por ejemplo, porque faltan las tablas), lanza
    un error 503 con el formato común y sin los datos de conexión: el frontend lo trata como
    "backend no disponible" y usa sus respuestas de ejemplo. El motivo queda en el registro.
    """
    try:
        conectada = psycopg.connect(
            _direccion(), row_factory=dict_row, connect_timeout=TIEMPO_MAXIMO_CONEXION
        )
    except psycopg.ProgrammingError as error:
        # El mensaje de este error repite la dirección entera, que podría llevar la contraseña.
        raise _no_disponible("DATABASE_URL está mal escrita.") from error
    except psycopg.OperationalError as error:
        # El servidor no responde o rechaza el acceso. libpq nunca incluye la contraseña aquí.
        raise _no_disponible(str(error).strip()) from error
    with conectada:
        try:
            yield conectada
        except psycopg.errors.UniqueViolation as error:
            # Un valor que ya existe (por ejemplo, dos altas a la vez con el mismo correo) no es
            # que la base de datos no esté disponible: es un conflicto con lo guardado.
            raise ErrorDeNegocio(
                "conflicto", "Ya hay un registro guardado con esos datos.", 409
            ) from error
        except psycopg.Error as error:
            raise _no_disponible(str(error).strip()) from error
