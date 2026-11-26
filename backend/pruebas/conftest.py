"""Fixtures comunes de las pruebas del backend."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def cliente() -> TestClient:
    """Cliente de pruebas contra la aplicación real, montada igual que en producción.

    El import va dentro de la fixture: si la aplicación no arranca, solo fallan
    las pruebas que la necesitan y las demás siguen dando información.
    """
    from app.main import crear_app

    with TestClient(crear_app()) as cliente_local:
        yield cliente_local
