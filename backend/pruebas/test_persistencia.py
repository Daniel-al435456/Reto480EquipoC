"""Pruebas de la lectura del curso desde PostgreSQL (issue #40).

Las rutas se prueban con las dos fuentes en el resto de ficheros (ver conftest.py). Aquí se
comprueba la lectura en sí: que de la base de datos sale el mismo curso que del JSON, que una
lección puede ser un trozo de un vídeo (versión B del contenido) y qué pasa si la base de datos
no responde.
"""

from __future__ import annotations

import copy
import json
from collections.abc import Iterator
from typing import Any

import psycopg
import pytest
from app.config import obtener_configuracion
from app.servicios import contenido
from fastapi.testclient import TestClient


def _cursos_del_json() -> list[dict[str, Any]]:
    return json.loads(contenido.ARCHIVO_CURSOS.read_text(encoding="utf-8"))["cursos"]


def _comparable(cursos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Lo que se puede comparar entre las dos fuentes.

    Quita el inicio y el fin de cada lección (el JSON de ejemplo no los tiene: cada lección es un
    vídeo entero) y ordena las palabras clave (la base de datos no guarda su orden, y no importa
    para corregir).
    """
    copia = copy.deepcopy(cursos)
    for curso in copia:
        for leccion in curso["lecciones"]:
            leccion.pop("inicioS", None)
            leccion.pop("finS", None)
            for actividad in leccion["actividades"]:
                if "palabrasClave" in actividad:
                    actividad["palabrasClave"] = sorted(actividad["palabrasClave"])
    return copia


def _cliente() -> TestClient:
    from app.main import crear_app

    return TestClient(crear_app())


def test_sin_base_de_datos_el_curso_sale_del_json() -> None:
    assert contenido._cursos() == _cursos_del_json()


def test_el_curso_leido_de_postgresql_es_el_mismo_que_el_del_json(con_base_de_datos: str) -> None:
    """Todo lo que usa la API sale igual: lecciones, actividades, test inicial y su orden."""
    assert _comparable(contenido._cursos()) == _comparable(_cursos_del_json())


def test_una_leccion_que_ocupa_todo_su_video_empieza_en_0_y_no_tiene_fin(
    con_base_de_datos: str,
) -> None:
    for leccion in contenido._cursos()[0]["lecciones"]:
        assert leccion["inicioS"] == 0
        assert leccion["finS"] is None


@pytest.fixture
def video_en_trozos(con_base_de_datos: str) -> Iterator[str]:
    """Un curso con un vídeo de 13 minutos partido en dos lecciones (versión B del contenido)."""
    with psycopg.connect(con_base_de_datos) as conexion:
        conexion.execute("""
            INSERT INTO cursos (id, titulo, descripcion, nivel)
              VALUES ('curso-de-prueba', 'Curso de prueba', 'Para las pruebas', 'Inicial');
            INSERT INTO videos (id, curso_id, titulo, youtube_id, duracion_s, orden)
              VALUES ('video-largo', 'curso-de-prueba', 'Vídeo largo', 'abc123', 780, 1);
            -- Se insertan al revés para comprobar que salen en el orden del vídeo.
            INSERT INTO lecciones (id, video_id, titulo, descripcion, inicio_s, fin_s,
                                   duracion_lectura_min, resumen, lectura)
              VALUES ('trozo-2', 'video-largo', 'Segundo trozo', 'd', 330, NULL, 3, 'r', 'a'),
                     ('trozo-1', 'video-largo', 'Primer trozo', 'd', 0, 330, 3, 'r', 'a');
            INSERT INTO conceptos (id, curso_id, nombre)
              VALUES ('concepto-de-prueba', 'curso-de-prueba', 'Concepto');
            INSERT INTO lecciones_conceptos (leccion_id, concepto_id)
              VALUES ('trozo-1', 'concepto-de-prueba'), ('trozo-2', 'concepto-de-prueba');
        """)
    yield "curso-de-prueba"
    with psycopg.connect(con_base_de_datos) as conexion:
        conexion.execute("DELETE FROM cursos WHERE id = 'curso-de-prueba'")


def test_una_leccion_que_es_un_trozo_de_video_lleva_su_inicio_su_fin_y_su_duracion(
    video_en_trozos: str,
) -> None:
    with _cliente() as cliente:
        respuesta = cliente.get(f"/api/cursos/{video_en_trozos}/lecciones")
    assert respuesta.status_code == 200
    primero, segundo = respuesta.json()["lecciones"]
    assert primero["id"] == "trozo-1"
    assert primero["youtubeId"] == "abc123"
    assert (primero["inicioS"], primero["finS"]) == (0, 330)
    # 330 s son 5,5 minutos: se redondea hacia arriba para que la sesión no se quede corta.
    assert primero["duracionVideo"] == 6
    # Sin fin, el trozo llega hasta el final del vídeo: (780 - 330) s = 7,5 minutos.
    assert segundo["inicioS"] == 330
    assert "finS" not in segundo
    assert segundo["duracionVideo"] == 8


def test_si_la_base_de_datos_no_responde_da_503_sin_mostrar_la_conexion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """El frontend recibe el formato de error común y pasa a sus respuestas de ejemplo."""
    monkeypatch.setenv("DATABASE_URL", "dbname=no_existe_reto480 connect_timeout=2")
    obtener_configuracion.cache_clear()
    with _cliente() as cliente:
        respuesta = cliente.get("/api/cursos")
    assert respuesta.status_code == 503
    assert respuesta.json()["error"] == "base_datos_no_disponible"
    assert "no_existe_reto480" not in respuesta.text


def test_acepta_la_direccion_con_el_formato_de_env_example(
    base_de_datos: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """`.env.example` usa el formato de SQLAlchemy, que psycopg no entiende por sí solo."""
    nombre = base_de_datos.removeprefix("dbname=")
    # Sin servidor ni usuario en la URL: salen del socket local o de PGHOST y PGUSER, como en psql.
    monkeypatch.setenv("DATABASE_URL", f"postgresql+psycopg:///{nombre}")
    obtener_configuracion.cache_clear()
    with _cliente() as cliente:
        respuesta = cliente.get("/api/cursos")
    assert respuesta.status_code == 200
    assert respuesta.json()["cursos"][0]["id"] == "python-desde-cero"


def test_una_direccion_mal_escrita_da_503_y_no_un_error_interno(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "esto no es una direccion")
    obtener_configuracion.cache_clear()
    with _cliente() as cliente:
        respuesta = cliente.get("/api/cursos")
    assert respuesta.status_code == 503
    assert respuesta.json()["error"] == "base_datos_no_disponible"
    assert "esto no es" not in respuesta.text


def _pedir_cursos(conexion: str, monkeypatch: pytest.MonkeyPatch) -> Any:
    monkeypatch.setenv("DATABASE_URL", conexion)
    obtener_configuracion.cache_clear()
    with _cliente() as cliente:
        return cliente.get("/api/cursos")


def test_si_faltan_las_tablas_da_503_y_no_un_error_interno(
    base_de_datos_sin_tablas: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """DATABASE_URL bien escrita, pero sin aplicar las migraciones."""
    respuesta = _pedir_cursos(base_de_datos_sin_tablas, monkeypatch)
    assert respuesta.status_code == 503
    assert respuesta.json()["error"] == "base_datos_no_disponible"


def test_sin_cursos_cargados_da_503_para_que_el_frontend_use_su_respaldo(
    base_de_datos_sin_cursos: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Con un 200 y la lista vacía, la app enseñaría un catálogo vacío sin avisar."""
    respuesta = _pedir_cursos(base_de_datos_sin_cursos, monkeypatch)
    assert respuesta.status_code == 503
    assert respuesta.json()["error"] == "base_datos_sin_cursos"
    assert "cargar_curso.sh" in respuesta.json()["mensaje"]


def test_el_motivo_del_503_queda_en_el_registro_sin_la_contrasena(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """Quien arranca el servidor tiene que poder saber por qué no conecta."""
    direccion = "dbname=no_existe_reto480 password=secreto123 connect_timeout=2"
    with caplog.at_level("WARNING"):
        respuesta = _pedir_cursos(direccion, monkeypatch)
    assert respuesta.status_code == 503
    assert "base de datos" in caplog.text
    assert len(caplog.records) >= 1
    assert "secreto123" not in caplog.text


def test_al_arrancar_avisa_de_que_el_curso_sale_del_json(caplog: pytest.LogCaptureFixture) -> None:
    """Quien espera leer de PostgreSQL ve en la terminal que le falta DATABASE_URL."""
    with caplog.at_level("INFO", logger="uvicorn.error"), _cliente():
        pass
    assert "JSON de ejemplo" in caplog.text
    assert "DATABASE_URL" in caplog.text


def test_al_arrancar_avisa_de_que_el_curso_sale_de_postgresql(
    con_base_de_datos: str, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("INFO", logger="uvicorn.error"), _cliente():
        pass
    assert "PostgreSQL" in caplog.text
    assert "JSON de ejemplo" not in caplog.text
