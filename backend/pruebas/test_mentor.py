"""Pruebas de las rutas del mentor con las respuestas de respaldo, sin IA (issue #13)."""

from __future__ import annotations

from fastapi.testclient import TestClient

CURSO = "python-desde-cero"


def test_el_mentor_responde_con_la_personalidad_elegida(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/mentor/mensaje",
        json={"cursoId": CURSO, "texto": "¿Qué es una variable?", "personalidad": "gracioso"},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["texto"].startswith("Cuac, esta me la sé:")
    assert "«Qué es una variable»" in cuerpo["texto"]
    assert cuerpo["derivado"] is False


def test_el_mentor_no_acepta_un_mensaje_vacio(cliente: TestClient) -> None:
    respuesta = cliente.post("/api/mentor/mensaje", json={"cursoId": CURSO, "texto": ""})
    assert respuesta.status_code == 422


def test_el_mensaje_proactivo_usa_el_trato_elegido(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/mentor/proactivo",
        json={
            "cursoId": CURSO,
            "leccionId": "que-es-un-if",
            "senal": "bloqueo",
            "tratamiento": "femenino",
        },
    )
    assert respuesta.status_code == 200
    assert "¿Lista para intentarlo otra vez?" in respuesta.json()["texto"]


def test_el_mensaje_proactivo_de_una_leccion_que_no_existe_da_404(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/mentor/proactivo", json={"cursoId": CURSO, "leccionId": "no-existe"}
    )
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "leccion_no_encontrada"


def test_la_derivacion_confirma_que_avisa_al_tutor(cliente: TestClient) -> None:
    respuesta = cliente.post("/api/mentor/derivacion", json={"cursoId": CURSO})
    assert respuesta.status_code == 200
    assert "tutor" in respuesta.json()["texto"]
