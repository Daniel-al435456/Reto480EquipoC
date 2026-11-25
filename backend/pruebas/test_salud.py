"""Pruebas de la ruta de salud: el termómetro de que el backend arranca.

Criterio de la issue #12: "el backend arranca en local y responde en /salud".
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_la_ruta_de_salud_responde_200(cliente: TestClient) -> None:
    """GET /salud devuelve 200, que es la señal de que el servidor está vivo."""
    assert cliente.get("/salud").status_code == 200


def test_la_ruta_de_salud_declara_que_esta_en_servicio(cliente: TestClient) -> None:
    """El cuerpo dice 'ok' en el campo 'estado', que es lo que comprueba el monitor."""
    assert cliente.get("/salud").json()["estado"] == "ok"


def test_la_ruta_de_salud_no_filtra_la_configuracion(cliente: TestClient) -> None:
    """La salud informa del estado, nunca de credenciales ni de la base de datos."""
    texto = str(cliente.get("/salud").json()).lower()
    for reservado in ("password", "contrasena", "secret", "gsk_", "postgres://", "url_base"):
        assert reservado not in texto, f"La ruta de salud filtra configuración: {reservado}"
