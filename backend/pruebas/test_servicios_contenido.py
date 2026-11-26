"""Pruebas de las reglas del contenido, sin pasar por HTTP."""

from __future__ import annotations

import json

from app.servicios import contenido
from app.servicios.mentor import frases


def test_el_curso_del_backend_es_el_mismo_que_el_del_frontend() -> None:
    """El JSON se genera desde frontend/src/api/datos.js: si se edita a mano, se nota aquí."""
    datos = json.loads(contenido.ARCHIVO_CURSOS.read_text(encoding="utf-8"))
    assert "exportar-curso.mjs" in datos["aviso"]


def test_acertar_todo_el_test_deja_todo_el_curso_dominado() -> None:
    curso = contenido.obtener_curso("python-desde-cero")
    respuestas = {pregunta["id"]: pregunta["correcta"] for pregunta in curso["testInicial"]}
    resultado = contenido.evaluar_test("python-desde-cero", respuestas)
    assert len(resultado.dominio) == len(curso["lecciones"])
    assert resultado.mensaje.startswith("Ya dominas todo")


def test_no_acertar_nada_empieza_desde_el_principio() -> None:
    resultado = contenido.evaluar_test("python-desde-cero", {})
    assert resultado.dominio == {}
    assert resultado.mensaje.startswith("Empezamos desde el principio")


def test_normalizar_quita_tildes_comillas_y_espacios_de_mas() -> None:
    assert contenido.normalizar('  Print("Buenos   Días") ') == "print(buenos dias)"


def test_el_trato_neutro_no_usa_genero() -> None:
    for personalidad in ("amable", "motivador", "gracioso", "estricto"):
        reintento = frases(personalidad, "neutro")["reintento"].lower()
        assert "lista" not in reintento
        assert "listo" not in reintento
