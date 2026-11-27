"""Pruebas de la corrección de respuestas escritas (issue #13)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_una_respuesta_con_todas_las_palabras_clave_es_correcta(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/actividades/correccion",
        json={"actividadId": "programas-py-2", "texto": "PYTHON  Programa.py"},
    )
    assert respuesta.status_code == 200
    assert respuesta.json() == {"correcta": True, "solucion": "python programa.py"}


def test_una_respuesta_incompleta_es_incorrecta_y_da_la_solucion(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/actividades/correccion",
        json={"actividadId": "programas-py-2", "texto": "programa.py"},
    )
    assert respuesta.json()["correcta"] is False


def test_una_actividad_que_no_es_escrita_se_rechaza(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/actividades/correccion", json={"actividadId": "que-es-python-1", "texto": "x"}
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["error"] == "actividad_no_escrita"
