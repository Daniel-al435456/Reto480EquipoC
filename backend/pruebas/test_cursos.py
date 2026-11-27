"""Pruebas de las rutas del curso: catálogo, test inicial y su evaluación (issue #13)."""

from __future__ import annotations

from fastapi.testclient import TestClient

CURSO = "python-desde-cero"


def test_el_catalogo_lista_los_cursos_con_su_numero_de_lecciones(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/cursos")
    assert respuesta.status_code == 200
    curso = respuesta.json()["cursos"][0]
    assert curso["id"] == CURSO
    assert curso["numeroLecciones"] == 53


def test_el_contenido_de_las_lecciones_devuelve_el_curso_completo_sin_test(
    cliente: TestClient,
) -> None:
    respuesta = cliente.get(f"/api/cursos/{CURSO}/lecciones")
    assert respuesta.status_code == 200
    curso = respuesta.json()
    assert curso["id"] == CURSO
    assert curso["titulo"] == "Python desde cero"
    assert len(curso["lecciones"]) == 53
    leccion = curso["lecciones"][0]
    assert {
        "id",
        "videoId",
        "titulo",
        "concepto",
        "youtubeId",
        "inicioS",
        "finS",
        "duracionVideo",
        "duracionLectura",
        "descripcion",
        "lectura",
        "resumen",
        "actividades",
    } <= set(leccion)
    assert leccion["youtubeId"] == "DAdRO6ByBoU"
    assert (leccion["inicioS"], leccion["finS"]) == (0, 214)
    assert leccion["duracionVideo"] == 4
    assert leccion["lectura"]
    assert leccion["actividades"][0]["id"] == "que-es-python-1"
    assert "testInicial" not in curso


def test_el_test_inicial_no_envia_las_respuestas_correctas(cliente: TestClient) -> None:
    respuesta = cliente.get(f"/api/cursos/{CURSO}/test")
    assert respuesta.status_code == 200
    preguntas = respuesta.json()["preguntas"]
    assert len(preguntas) == 12
    assert set(preguntas[0]) == {"id", "leccionId", "enunciado", "opciones"}


def test_un_curso_que_no_existe_devuelve_404_con_el_formato_de_error(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/cursos/no-existe/test")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "curso_no_encontrado"


def test_el_contenido_de_un_curso_que_no_existe_devuelve_404(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/cursos/no-existe/lecciones")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "curso_no_encontrado"


def test_un_acierto_marca_como_dominadas_todas_las_lecciones_de_su_video(
    cliente: TestClient,
) -> None:
    respuesta = cliente.post(
        f"/api/cursos/{CURSO}/test/evaluacion",
        json={"respuestas": {"t-ejecucion": 0, "t-variables": 0}, "esMenor": False},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["dominio"] == {"compilador-interprete": True, "programas-py": True}
    assert "2 de 53" in cuerpo["mensaje"]
    assert cuerpo["redactadoPorIa"] is False  # plantilla: la IA llega con la issue #16


def test_la_evaluacion_rechaza_un_trato_desconocido(cliente: TestClient) -> None:
    respuesta = cliente.post(
        f"/api/cursos/{CURSO}/test/evaluacion",
        json={"respuestas": {}, "tratamiento": "otro"},
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "validacion"
