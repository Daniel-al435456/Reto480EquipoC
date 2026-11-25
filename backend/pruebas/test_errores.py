"""Pruebas del formato único de error.

Regla de AGENTS.md: los errores salen siempre como ``{"error": "codigo", "mensaje": "..."}``.
Si una respuesta no cumple esto, el frontend no puede tratarla.
"""

from __future__ import annotations

from app.errores import ErrorDeNegocio, instalar_manejadores
from fastapi import FastAPI
from fastapi.testclient import TestClient


def _app_con_rutas_de_prueba() -> FastAPI:
    """Aplicación mínima que monta los manejadores reales del proyecto.

    No se reimplementa nada: se comprueba la misma función que usa la aplicación real.
    """
    app = FastAPI()
    instalar_manejadores(app)

    @app.get("/sin-sesion")
    def _sin_sesion() -> None:
        raise ErrorDeNegocio("sin_sesion", "Inicia sesión para continuar.", 401)

    @app.get("/con-minutos")
    def _con_minutos(minutos: int) -> dict[str, int]:
        return {"minutos": minutos}

    @app.get("/explota")
    def _explota() -> None:
        raise RuntimeError("fallo interno de mentira")

    return app


def test_las_rutas_desconocidas_devuelven_el_formato_de_error(cliente: TestClient) -> None:
    """Una dirección inexistente responde 404 con error y mensaje, no con el detalle técnico."""
    respuesta = cliente.get("/ruta-que-no-existe")
    assert respuesta.status_code == 404
    assert respuesta.json() == {
        "error": "no_encontrado",
        "mensaje": "No existe esa dirección en la API.",
    }


def test_los_errores_de_dominio_llevan_su_codigo() -> None:
    """Un error de negocio conserva el código que eligió quien lo lanzó."""
    respuesta = TestClient(_app_con_rutas_de_prueba()).get("/sin-sesion")
    assert respuesta.status_code == 401
    assert respuesta.json() == {
        "error": "sin_sesion",
        "mensaje": "Inicia sesión para continuar.",
    }


def test_los_errores_de_validacion_se_explican_en_espanol() -> None:
    """Un campo ausente o inválido nombra al campo en español, sin mensajes del framework."""
    respuesta = TestClient(_app_con_rutas_de_prueba()).get("/con-minutos")
    assert respuesta.status_code == 422
    cuerpo = respuesta.json()
    assert cuerpo["error"] == "validacion"
    assert "minutos" in cuerpo["mensaje"]


def test_los_metodos_no_permitidos_usan_el_formato(cliente: TestClient) -> None:
    """Un método que la ruta no acepta responde 405 con código y mensaje propios."""
    respuesta = cliente.request("DELETE", "/salud")
    assert respuesta.status_code == 405
    assert respuesta.json() == {
        "error": "metodo_no_permitido",
        "mensaje": "Ese método no está permitido en esta dirección.",
    }


def test_los_errores_inesperados_no_cuentan_nada_interno() -> None:
    """Un fallo inesperado responde 500 sin rutas, trazas ni el mensaje original."""
    respuesta = TestClient(_app_con_rutas_de_prueba(), raise_server_exceptions=False).get(
        "/explota"
    )
    assert respuesta.status_code == 500
    cuerpo = respuesta.json()
    assert cuerpo["error"] == "interno"
    texto = str(cuerpo).lower()
    for reservado in ("traceback", "stack", "/users/", 'file "', "fallo interno de mentira"):
        assert reservado not in texto, f"El error filtra información interna: {reservado}"
