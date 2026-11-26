"""Fixtures comunes de las pruebas del backend.

Las pruebas de rutas se ejecutan dos veces: con el curso leído del JSON de ejemplo y con el
curso leído de PostgreSQL (issue #40). Así se comprueba que el frontend recibe lo mismo venga
de donde venga.

Para PostgreSQL se crea una base de datos temporal con las migraciones y el curso cargado con
`migraciones/cargar_curso.sh`, y se borra al terminar. Si PostgreSQL no está disponible, esas
pruebas se saltan, salvo que la variable REQUIERE_POSTGRES esté definida (en GitHub Actions lo
está): entonces fallan, para que no pasen en verde sin haberse ejecutado.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from collections.abc import Iterator
from pathlib import Path

import pytest
from app.config import obtener_configuracion
from fastapi.testclient import TestClient

CARPETA_MIGRACIONES = Path(__file__).resolve().parents[1] / "migraciones"


def _usar_base_de_datos(monkeypatch: pytest.MonkeyPatch, conexion: str) -> None:
    """Configura el backend para leer de esa base de datos ("" = sin base de datos, JSON)."""
    # La variable de entorno manda sobre backend/.env: no depende de la configuración local.
    monkeypatch.setenv("DATABASE_URL", conexion)
    obtener_configuracion.cache_clear()


@pytest.fixture(autouse=True)
def sin_base_de_datos(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Por defecto, ninguna prueba usa la base de datos: la pide expresamente quien la necesita."""
    _usar_base_de_datos(monkeypatch, "")
    yield
    obtener_configuracion.cache_clear()


def _postgres_disponible() -> bool:
    if not (shutil.which("psql") and shutil.which("createdb")):
        return False
    prueba = subprocess.run(
        ["psql", "-X", "-q", "-d", "postgres", "-c", "SELECT 1"], capture_output=True, check=False
    )
    return prueba.returncode == 0


def _base_de_datos_temporal(sufijo: str, scripts: tuple[str, ...]) -> Iterator[str]:
    """Crea una base de datos temporal, ejecuta esos scripts de migraciones/ y la borra al final.

    Devuelve su cadena de conexión de libpq: el servidor, el usuario y la contraseña salen de
    PGHOST, PGUSER...
    """
    if not _postgres_disponible():
        if os.environ.get("REQUIERE_POSTGRES"):
            pytest.fail(
                "REQUIERE_POSTGRES está definida, pero no se puede conectar con PostgreSQL."
            )
        pytest.skip("PostgreSQL no está disponible en este equipo.")

    nombre = f"reto480_pytest_{sufijo}_{os.getpid()}"
    subprocess.run(["createdb", nombre], check=True)
    try:
        for script in scripts:
            subprocess.run(
                [str(CARPETA_MIGRACIONES / script), nombre], check=True, capture_output=True
            )
        yield f"dbname={nombre}"
    finally:
        subprocess.run(["dropdb", "--if-exists", nombre], check=False)


@pytest.fixture(scope="session")
def base_de_datos() -> Iterator[str]:
    """Base de datos temporal con el esquema y el curso de ejemplo."""
    yield from _base_de_datos_temporal("curso", ("aplicar.sh", "cargar_curso.sh"))


@pytest.fixture(scope="session")
def base_de_datos_sin_tablas() -> Iterator[str]:
    """Base de datos temporal sin migraciones aplicadas."""
    yield from _base_de_datos_temporal("sin_tablas", ())


@pytest.fixture(scope="session")
def base_de_datos_sin_cursos() -> Iterator[str]:
    """Base de datos temporal con las tablas creadas pero sin ningún curso cargado."""
    yield from _base_de_datos_temporal("sin_cursos", ("aplicar.sh",))


@pytest.fixture
def con_base_de_datos(base_de_datos: str, monkeypatch: pytest.MonkeyPatch) -> str:
    """El backend lee el curso de la base de datos temporal."""
    _usar_base_de_datos(monkeypatch, base_de_datos)
    return base_de_datos


@pytest.fixture(params=["json", "postgresql"])
def cliente(request: pytest.FixtureRequest) -> Iterator[TestClient]:
    """Cliente de pruebas contra la aplicación real, montada igual que en producción.

    Se ejecuta dos veces: con el curso del JSON y con el curso de PostgreSQL.
    El import va dentro de la fixture: si la aplicación no arranca, solo fallan
    las pruebas que la necesitan y las demás siguen dando información.
    """
    if request.param == "postgresql":
        request.getfixturevalue("con_base_de_datos")

    from app.main import crear_app

    with TestClient(crear_app()) as cliente_local:
        yield cliente_local
