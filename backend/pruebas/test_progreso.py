"""Pruebas del progreso del alumno en el servidor (issue #60).

Matrícula, resultado del test inicial, dominio, sesiones de estudio, lecciones completadas y
eventos de aprendizaje, con los datos en PostgreSQL. Todas las rutas necesitan una sesión.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from app.persistencia import conexion
from fastapi.testclient import TestClient

CURSO = "python-desde-cero"
OTRO_CURSO = "curso-de-prueba"
LECCION_OTRO_CURSO = "leccion-de-prueba"
CONTRASENA = "secreta123"


@pytest.fixture
def cliente_bd(con_base_de_datos: str) -> Iterator[TestClient]:
    """Cliente contra la aplicación con la base de datos temporal."""
    from app.main import crear_app

    with TestClient(crear_app()) as cliente_local:
        yield cliente_local


@pytest.fixture
def otro_curso(con_base_de_datos: str) -> Iterator[str]:
    """Un segundo curso con una lección, que se borra al terminar la prueba.

    Se borra para que las pruebas del catálogo, que comparten la base de datos, sigan viendo
    un solo curso.
    """
    with conexion() as bd:
        bd.execute("INSERT INTO cursos (id, titulo) VALUES (%s, 'Curso de prueba')", (OTRO_CURSO,))
        bd.execute(
            "INSERT INTO videos (id, curso_id, titulo, orden) "
            "VALUES ('video-de-prueba', %s, 'Vídeo de prueba', 1)",
            (OTRO_CURSO,),
        )
        bd.execute(
            "INSERT INTO lecciones (id, video_id, titulo, duracion_lectura_min) "
            "VALUES (%s, 'video-de-prueba', 'Lección de prueba', 2)",
            (LECCION_OTRO_CURSO,),
        )
        bd.execute(
            "INSERT INTO conceptos (id, curso_id, nombre) VALUES (%s, %s, 'Concepto de prueba')",
            (LECCION_OTRO_CURSO, OTRO_CURSO),
        )
        bd.execute(
            "INSERT INTO lecciones_conceptos (leccion_id, concepto_id) VALUES (%s, %s)",
            (LECCION_OTRO_CURSO, LECCION_OTRO_CURSO),
        )
    try:
        yield OTRO_CURSO
    finally:
        with conexion() as bd:
            bd.execute("DELETE FROM cursos WHERE id = %s", (OTRO_CURSO,))


def _alta(cliente: TestClient) -> tuple[str, str]:
    """Crea una cuenta y devuelve su token y su correo."""
    email = f"alumno-{uuid.uuid4().hex[:8]}@ejemplo.com"
    respuesta = cliente.post(
        "/api/cuenta",
        json={
            "empresa": "Acme",
            "nombre": "Ana",
            "apellidos": "López",
            "email": email,
            "contrasena": CONTRASENA,
            "fechaNacimiento": "2000-05-01",
            "privacidadAceptada": True,
            "alias": "Lince42",
        },
    )
    assert respuesta.status_code == 201, respuesta.json()
    return respuesta.json()["token"], email


def _con(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _filas(consulta: str, *parametros: Any) -> list[dict[str, Any]]:
    with conexion() as bd:
        return bd.execute(consulta, parametros).fetchall()


def _alumno(email: str) -> int:
    return int(_filas("SELECT alumno_id FROM identidades WHERE email = %s", email)[0]["alumno_id"])


def _lecciones() -> list[str]:
    """Las lecciones del curso de ejemplo, en el orden del curso."""
    filas = _filas(
        "SELECT le.id FROM lecciones le JOIN videos v ON v.id = le.video_id "
        "WHERE v.curso_id = %s ORDER BY v.orden, le.inicio_s",
        CURSO,
    )
    return [fila["id"] for fila in filas]


def _progreso(cliente: TestClient, token: str) -> dict[str, Any]:
    respuesta = cliente.get("/api/progreso", headers=_con(token))
    assert respuesta.status_code == 200, respuesta.json()
    return respuesta.json()


def _matricular(cliente: TestClient, token: str, curso: str = CURSO) -> dict[str, Any]:
    respuesta = cliente.put(f"/api/cursos/{curso}/matricula", headers=_con(token))
    assert respuesta.status_code == 200, respuesta.json()
    return respuesta.json()


def _guardar_test(cliente: TestClient, token: str, dominadas: list[str]) -> dict[str, Any]:
    respuesta = cliente.put(
        f"/api/cursos/{CURSO}/test/resultado",
        headers=_con(token),
        json={"dominio": dict.fromkeys(dominadas, True)},
    )
    assert respuesta.status_code == 200, respuesta.json()
    return respuesta.json()


def _estudiar(cliente: TestClient, token: str, leccion: str, estudiar: bool) -> dict[str, Any]:
    respuesta = cliente.put(
        f"/api/cursos/{CURSO}/dominio/{leccion}", headers=_con(token), json={"estudiar": estudiar}
    )
    assert respuesta.status_code == 200, respuesta.json()
    return respuesta.json()


def _crear_sesion(cliente: TestClient, token: str, lecciones: list[str], **cambios: Any) -> int:
    datos = {"cursoId": CURSO, "minutos": 10, "audio": True, "lecciones": lecciones, **cambios}
    respuesta = cliente.post("/api/sesiones", headers=_con(token), json=datos)
    assert respuesta.status_code == 201, respuesta.json()
    return int(respuesta.json()["id"])


def _completar(cliente: TestClient, token: str, sesion: int, leccion: str) -> int:
    return cliente.put(
        f"/api/sesiones/{sesion}/lecciones/{leccion}", headers=_con(token)
    ).status_code


def _terminar(cliente: TestClient, token: str, sesion: int, estado: str) -> Any:
    return cliente.patch(f"/api/sesiones/{sesion}", headers=_con(token), json={"estado": estado})


def _estado_sesion(sesion: int) -> str:
    return str(_filas("SELECT estado FROM sesiones WHERE id = %s", sesion)[0]["estado"])


# --- Acceso -----------------------------------------------------------------------------

#: Todas las rutas del progreso, con un cuerpo válido.
RUTAS = [
    ("GET", "/api/progreso", None),
    ("PUT", f"/api/cursos/{CURSO}/matricula", None),
    ("PUT", f"/api/cursos/{CURSO}/test/resultado", {"dominio": {}}),
    ("PUT", f"/api/cursos/{CURSO}/dominio/que-es-python", {"estudiar": True}),
    (
        "POST",
        "/api/sesiones",
        {"cursoId": CURSO, "minutos": 10, "audio": True, "lecciones": ["que-es-python"]},
    ),
    ("PUT", "/api/sesiones/1/lecciones/que-es-python", None),
    ("PATCH", "/api/sesiones/1", {"estado": "completada"}),
    ("POST", "/api/eventos", {"tipo": "video_iniciado", "leccionId": "que-es-python"}),
]


def test_sin_sesion_las_rutas_del_progreso_dan_401(cliente_bd: TestClient) -> None:
    for metodo, ruta, cuerpo in RUTAS:
        respuesta = cliente_bd.request(metodo, ruta, json=cuerpo)
        assert respuesta.status_code == 401, (metodo, ruta)
        assert respuesta.json()["error"] == "sesion_no_valida"


def test_sin_base_de_datos_el_progreso_responde_503() -> None:
    from app.main import crear_app

    with TestClient(crear_app()) as cliente_local:
        for metodo, ruta, cuerpo in RUTAS:
            respuesta = cliente_local.request(metodo, ruta, json=cuerpo, headers=_con("token"))
            assert respuesta.status_code == 503, (metodo, ruta)


# --- Matrícula y curso actual -----------------------------------------------------------


def test_sin_matricula_no_hay_curso_actual(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    assert _progreso(cliente_bd, token) == {
        "cursoId": None,
        "testHecho": False,
        "dominioTest": {},
        "dominio": {},
        "completadas": [],
    }


def test_matricularse_devuelve_el_progreso_vacio_del_curso(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    progreso = _matricular(cliente_bd, token)
    assert progreso["cursoId"] == CURSO
    assert progreso["testHecho"] is False
    assert _progreso(cliente_bd, token) == progreso
    filas = _filas("SELECT estado FROM matriculas WHERE alumno_id = %s", _alumno(email))
    assert filas == [{"estado": "en_curso"}]


def test_matricularse_dos_veces_no_duplica_la_matricula(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    _matricular(cliente_bd, token)
    _matricular(cliente_bd, token)
    assert len(_filas("SELECT 1 FROM matriculas WHERE alumno_id = %s", _alumno(email))) == 1


def test_matricularse_en_un_curso_que_no_existe_da_404(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.put("/api/cursos/no-existe/matricula", headers=_con(token))
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "curso_no_encontrado"


def test_cambiar_de_curso_y_volver_recupera_su_progreso(
    cliente_bd: TestClient, otro_curso: str
) -> None:
    token, _ = _alta(cliente_bd)
    primera = _lecciones()[0]
    _matricular(cliente_bd, token)
    _guardar_test(cliente_bd, token, [primera])

    en_el_otro = _matricular(cliente_bd, token, otro_curso)
    assert en_el_otro["cursoId"] == otro_curso
    assert en_el_otro["testHecho"] is False
    assert _progreso(cliente_bd, token)["cursoId"] == otro_curso

    de_vuelta = _matricular(cliente_bd, token)
    assert de_vuelta["cursoId"] == CURSO
    assert de_vuelta["testHecho"] is True
    assert de_vuelta["dominio"] == {primera: True}
    assert _progreso(cliente_bd, token)["cursoId"] == CURSO


def test_guardar_el_test_o_empezar_una_sesion_vuelve_actual_el_curso(
    cliente_bd: TestClient, otro_curso: str
) -> None:
    token, _ = _alta(cliente_bd)
    _matricular(cliente_bd, token)
    _matricular(cliente_bd, token, otro_curso)
    _guardar_test(cliente_bd, token, [])
    assert _progreso(cliente_bd, token)["cursoId"] == CURSO

    _matricular(cliente_bd, token, otro_curso)
    _crear_sesion(cliente_bd, token, [_lecciones()[0]])
    assert _progreso(cliente_bd, token)["cursoId"] == CURSO


# --- Test inicial -----------------------------------------------------------------------


def test_guardar_el_test_guarda_el_dominio_y_lo_que_dijo_el_test(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    dominadas = _lecciones()[:2]
    _matricular(cliente_bd, token)
    progreso = _guardar_test(cliente_bd, token, dominadas)
    assert progreso["testHecho"] is True
    assert progreso["dominio"] == progreso["dominioTest"] == dict.fromkeys(dominadas, True)
    assert _progreso(cliente_bd, token) == progreso

    # Una fila por cada concepto del curso: 1 en los que domina y 0 en el resto.
    filas = _filas(
        "SELECT concepto_id, nivel, nivel_test FROM dominios WHERE alumno_id = %s", _alumno(email)
    )
    assert len(filas) == len(_lecciones())
    for fila in filas:
        esperado = 1 if fila["concepto_id"] in dominadas else 0
        assert fila["nivel"] == fila["nivel_test"] == esperado


def test_el_test_cuenta_como_hecho_aunque_no_domine_nada(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    progreso = _guardar_test(cliente_bd, token, [])
    assert progreso["testHecho"] is True
    assert progreso["dominio"] == {}
    assert _progreso(cliente_bd, token)["testHecho"] is True


def test_guardar_el_test_matricula_en_el_curso_si_hacia_falta(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    _guardar_test(cliente_bd, token, [])
    assert _progreso(cliente_bd, token)["cursoId"] == CURSO


def test_el_test_con_lecciones_de_otro_curso_o_inexistentes_da_422(
    cliente_bd: TestClient, otro_curso: str
) -> None:
    token, _ = _alta(cliente_bd)
    for leccion in ("no-existe", LECCION_OTRO_CURSO):
        respuesta = cliente_bd.put(
            f"/api/cursos/{CURSO}/test/resultado",
            headers=_con(token),
            json={"dominio": {leccion: True}},
        )
        assert respuesta.status_code == 422, leccion
        assert respuesta.json()["error"] == "lecciones_no_validas"
    assert _progreso(cliente_bd, token)["testHecho"] is False


def test_repetir_el_test_sustituye_el_resultado_y_anula_estudiar_igualmente(
    cliente_bd: TestClient,
) -> None:
    token, _ = _alta(cliente_bd)
    primera, segunda, tercera = _lecciones()[:3]
    _guardar_test(cliente_bd, token, [primera, segunda])
    _estudiar(cliente_bd, token, primera, True)

    progreso = _guardar_test(cliente_bd, token, [tercera])
    assert progreso["dominio"] == progreso["dominioTest"] == {tercera: True}


# --- Estudiar igualmente ----------------------------------------------------------------


def test_estudiar_igualmente_quita_la_leccion_del_dominio_y_conserva_el_test(
    cliente_bd: TestClient,
) -> None:
    token, _ = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    _guardar_test(cliente_bd, token, [primera, segunda])

    progreso = _estudiar(cliente_bd, token, primera, True)
    assert progreso["dominio"] == {segunda: True}
    assert progreso["dominioTest"] == {primera: True, segunda: True}
    assert _progreso(cliente_bd, token) == progreso


def test_volver_a_saltar_una_leccion_solo_si_el_test_la_dio_por_dominada(
    cliente_bd: TestClient,
) -> None:
    token, _ = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    _guardar_test(cliente_bd, token, [primera])
    _estudiar(cliente_bd, token, primera, True)

    assert _estudiar(cliente_bd, token, primera, False)["dominio"] == {primera: True}
    # El test no la dio por dominada: no se puede saltar.
    assert _estudiar(cliente_bd, token, segunda, False)["dominio"] == {primera: True}


def test_estudiar_igualmente_sin_test_no_cambia_nada(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    progreso = _estudiar(cliente_bd, token, _lecciones()[0], True)
    assert progreso["testHecho"] is False
    assert progreso["dominio"] == {}


def test_estudiar_igualmente_una_leccion_de_otro_curso_da_404(
    cliente_bd: TestClient, otro_curso: str
) -> None:
    token, _ = _alta(cliente_bd)
    for leccion in ("no-existe", LECCION_OTRO_CURSO):
        respuesta = cliente_bd.put(
            f"/api/cursos/{CURSO}/dominio/{leccion}",
            headers=_con(token),
            json={"estudiar": True},
        )
        assert respuesta.status_code == 404, leccion
        assert respuesta.json()["error"] == "leccion_no_encontrada"


# --- Sesiones de estudio ----------------------------------------------------------------


def test_crear_una_sesion_guarda_sus_lecciones_en_orden(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    lecciones = _lecciones()[:3][::-1]
    sesion = _crear_sesion(cliente_bd, token, lecciones, minutos=20, audio=False)

    fila = _filas("SELECT alumno_id, minutos, audio, estado FROM sesiones WHERE id = %s", sesion)
    assert fila == [
        {"alumno_id": _alumno(email), "minutos": 20, "audio": False, "estado": "en_curso"}
    ]
    orden = _filas(
        "SELECT leccion_id, completado FROM sesiones_lecciones WHERE sesion_id = %s ORDER BY orden",
        sesion,
    )
    assert orden == [{"leccion_id": leccion, "completado": False} for leccion in lecciones]
    # Crear una sesión también matricula en su curso.
    assert _progreso(cliente_bd, token)["cursoId"] == CURSO


@pytest.mark.parametrize("minutos", [0, 7, 15, 30])
def test_una_sesion_solo_admite_5_10_o_20_minutos(cliente_bd: TestClient, minutos: int) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/sesiones",
        headers=_con(token),
        json={"cursoId": CURSO, "minutos": minutos, "audio": True, "lecciones": [_lecciones()[0]]},
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "validacion"


def test_una_sesion_sin_lecciones_da_422(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/sesiones",
        headers=_con(token),
        json={"cursoId": CURSO, "minutos": 10, "audio": True, "lecciones": []},
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "validacion"


def test_una_sesion_con_lecciones_de_otro_curso_da_422(
    cliente_bd: TestClient, otro_curso: str
) -> None:
    token, _ = _alta(cliente_bd)
    for lecciones in ([_lecciones()[0], LECCION_OTRO_CURSO], ["no-existe"]):
        respuesta = cliente_bd.post(
            "/api/sesiones",
            headers=_con(token),
            json={"cursoId": CURSO, "minutos": 10, "audio": True, "lecciones": lecciones},
        )
        assert respuesta.status_code == 422, lecciones
        assert respuesta.json()["error"] == "lecciones_no_validas"


def test_una_sesion_de_un_curso_que_no_existe_da_404(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/sesiones",
        headers=_con(token),
        json={"cursoId": "no-existe", "minutos": 10, "audio": True, "lecciones": ["no-existe"]},
    )
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "curso_no_encontrado"


def test_una_leccion_repetida_en_la_sesion_se_guarda_una_vez(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    sesion = _crear_sesion(cliente_bd, token, [primera, primera, segunda])
    orden = _filas(
        "SELECT leccion_id, orden FROM sesiones_lecciones WHERE sesion_id = %s ORDER BY orden",
        sesion,
    )
    assert orden == [{"leccion_id": primera, "orden": 1}, {"leccion_id": segunda, "orden": 2}]


def test_crear_una_sesion_abandona_la_que_seguia_abierta(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    anterior = _crear_sesion(cliente_bd, token, [_lecciones()[0]])
    terminada = _crear_sesion(cliente_bd, token, [_lecciones()[1]])
    assert _terminar(cliente_bd, token, terminada, "completada").status_code == 204

    nueva = _crear_sesion(cliente_bd, token, [_lecciones()[2]])
    assert _estado_sesion(anterior) == "abandonada"
    assert _estado_sesion(terminada) == "completada"
    assert _estado_sesion(nueva) == "en_curso"


@pytest.mark.parametrize("estado", ["completada", "abandonada"])
def test_terminar_una_sesion_guarda_su_estado(cliente_bd: TestClient, estado: str) -> None:
    token, _ = _alta(cliente_bd)
    sesion = _crear_sesion(cliente_bd, token, [_lecciones()[0]])
    assert _terminar(cliente_bd, token, sesion, estado).status_code == 204
    assert _estado_sesion(sesion) == estado
    # Repetir la misma petición (por ejemplo, al reintentar) no da error.
    assert _terminar(cliente_bd, token, sesion, estado).status_code == 204


def test_una_sesion_terminada_no_cambia_de_estado(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    sesion = _crear_sesion(cliente_bd, token, [_lecciones()[0]])
    _terminar(cliente_bd, token, sesion, "completada")
    respuesta = _terminar(cliente_bd, token, sesion, "abandonada")
    assert respuesta.status_code == 409
    assert respuesta.json()["error"] == "sesion_terminada"
    assert _estado_sesion(sesion) == "completada"


def test_terminar_una_sesion_con_un_estado_no_permitido_da_422(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    sesion = _crear_sesion(cliente_bd, token, [_lecciones()[0]])
    for estado in ("en_curso", "planificada", "otro"):
        assert _terminar(cliente_bd, token, sesion, estado).status_code == 422, estado


# --- Lecciones completadas --------------------------------------------------------------


def test_completar_una_leccion_la_anade_a_completadas(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    sesion = _crear_sesion(cliente_bd, token, [segunda, primera])

    assert _completar(cliente_bd, token, sesion, segunda) == 204
    assert _completar(cliente_bd, token, sesion, primera) == 204
    # Repetirlo no la añade dos veces.
    assert _completar(cliente_bd, token, sesion, segunda) == 204
    # En el orden en que se completaron.
    assert _progreso(cliente_bd, token)["completadas"] == [segunda, primera]


def test_una_leccion_completada_en_dos_sesiones_sale_una_vez(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    primera = _lecciones()[0]
    for _ in range(2):
        sesion = _crear_sesion(cliente_bd, token, [primera])
        _completar(cliente_bd, token, sesion, primera)
        _terminar(cliente_bd, token, sesion, "completada")
    assert _progreso(cliente_bd, token)["completadas"] == [primera]


def test_completar_una_leccion_que_no_es_de_la_sesion_da_404(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    sesion = _crear_sesion(cliente_bd, token, [primera])
    respuesta = cliente_bd.put(f"/api/sesiones/{sesion}/lecciones/{segunda}", headers=_con(token))
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "leccion_no_encontrada"
    assert _progreso(cliente_bd, token)["completadas"] == []


def test_completar_una_leccion_de_una_sesion_terminada_la_guarda(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    primera = _lecciones()[0]
    sesion = _crear_sesion(cliente_bd, token, [primera])
    _terminar(cliente_bd, token, sesion, "abandonada")
    assert _completar(cliente_bd, token, sesion, primera) == 204
    # Repetirlo tampoco da error.
    assert _completar(cliente_bd, token, sesion, primera) == 204
    assert _progreso(cliente_bd, token)["completadas"] == [primera]
    assert _estado_sesion(sesion) == "abandonada"


def test_una_leccion_terminada_en_otro_dispositivo_no_se_pierde(cliente_bd: TestClient) -> None:
    """El móvil A sigue en su sesión; el B empieza otra, que abandona la de A."""
    token, _ = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    en_a = _crear_sesion(cliente_bd, token, [primera])
    _crear_sesion(cliente_bd, token, [segunda])
    assert _completar(cliente_bd, token, en_a, primera) == 204
    assert _progreso(cliente_bd, token)["completadas"] == [primera]


def test_las_completadas_se_ven_al_entrar_desde_otro_dispositivo(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    primera, segunda = _lecciones()[:2]
    sesion = _crear_sesion(cliente_bd, token, [primera, segunda])
    _completar(cliente_bd, token, sesion, primera)

    otro_dispositivo = cliente_bd.post(
        "/api/sesion", json={"email": email, "contrasena": CONTRASENA}
    ).json()["token"]
    progreso = _progreso(cliente_bd, otro_dispositivo)
    assert progreso["cursoId"] == CURSO
    assert progreso["completadas"] == [primera]


def test_las_completadas_son_solo_las_del_curso_actual(
    cliente_bd: TestClient, otro_curso: str
) -> None:
    token, _ = _alta(cliente_bd)
    primera = _lecciones()[0]
    sesion = _crear_sesion(cliente_bd, token, [primera])
    _completar(cliente_bd, token, sesion, primera)
    assert _matricular(cliente_bd, token, otro_curso)["completadas"] == []


# --- Datos de otros alumnos -------------------------------------------------------------


def test_un_alumno_no_puede_tocar_la_sesion_de_otro(cliente_bd: TestClient) -> None:
    token_a, _ = _alta(cliente_bd)
    token_b, _ = _alta(cliente_bd)
    primera = _lecciones()[0]
    sesion = _crear_sesion(cliente_bd, token_a, [primera])

    for respuesta in (
        cliente_bd.put(f"/api/sesiones/{sesion}/lecciones/{primera}", headers=_con(token_b)),
        _terminar(cliente_bd, token_b, sesion, "abandonada"),
    ):
        assert respuesta.status_code == 404
        assert respuesta.json()["error"] == "sesion_no_encontrada"
    assert _estado_sesion(sesion) == "en_curso"
    assert _progreso(cliente_bd, token_b)["completadas"] == []


def test_una_sesion_que_no_existe_da_404(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = _terminar(cliente_bd, token, 999_999_999, "completada")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"] == "sesion_no_encontrada"


def test_el_progreso_de_un_alumno_no_se_mezcla_con_el_de_otro(cliente_bd: TestClient) -> None:
    token_a, _ = _alta(cliente_bd)
    token_b, _ = _alta(cliente_bd)
    _guardar_test(cliente_bd, token_a, [_lecciones()[0]])
    _matricular(cliente_bd, token_b)
    progreso_b = _progreso(cliente_bd, token_b)
    assert progreso_b["testHecho"] is False
    assert progreso_b["dominio"] == {}


# --- Eventos de aprendizaje -------------------------------------------------------------


def test_guardar_un_evento_de_aprendizaje(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/eventos",
        headers=_con(token),
        json={
            "tipo": "actividad_respondida",
            "leccionId": "que-es-python",
            "preguntaId": "que-es-python-1",
            "valor": 1,
            "detalles": {"cursoId": CURSO, "correcta": True},
        },
    )
    assert respuesta.status_code == 204, respuesta.json()
    filas = _filas(
        "SELECT tipo, leccion_id, pregunta_id, valor, detalles FROM eventos WHERE alumno_id = %s",
        _alumno(email),
    )
    assert filas == [
        {
            "tipo": "actividad_respondida",
            "leccion_id": "que-es-python",
            "pregunta_id": "que-es-python-1",
            "valor": 1,
            "detalles": {"cursoId": CURSO, "correcta": True},
        }
    ]


@pytest.mark.parametrize(
    "tipo",
    [
        "cuenta_creada",
        "contrasena_cambiada",
        "sesion_cerrada",
        "fecha_nacimiento_indicada",
        # La escribe el backend junto con su fila de derivaciones (migración 003).
        "derivacion_tutor",
        # Sin curso ni minutos es el inicio de sesión en la cuenta, no el de una sesión de estudio.
        "sesion_iniciada",
        "otro",
    ],
)
def test_los_eventos_que_no_son_de_aprendizaje_no_se_guardan(
    cliente_bd: TestClient, tipo: str
) -> None:
    token, email = _alta(cliente_bd)
    respuesta = cliente_bd.post("/api/eventos", headers=_con(token), json={"tipo": tipo})
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "validacion"
    assert _filas("SELECT 1 FROM eventos WHERE alumno_id = %s", _alumno(email)) == []


@pytest.mark.parametrize(
    "detalles",
    [
        {"nota": "cualquier cosa"},  # clave que no está en la lista
        {"senal": "me llamo Ana López"},  # texto libre
        {"cursoId": "x" * 200},  # demasiado largo
        {"cursoId": {"anidado": True}},  # solo valores simples
        {"senal": "ana-lopez"},  # un nombre con forma de identificador
        {"formato": "ana"},
        {"cursoId": "ana-lopez"},  # un curso que no existe
        {"aciertos": 1000},
    ],
)
def test_los_detalles_de_un_evento_no_admiten_texto_libre_ni_otras_claves(
    cliente_bd: TestClient, detalles: dict[str, Any]
) -> None:
    token, email = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/eventos",
        headers=_con(token),
        json={"tipo": "mentor_proactivo", "detalles": detalles},
    )
    assert respuesta.status_code == 422
    assert _filas("SELECT 1 FROM eventos WHERE alumno_id = %s", _alumno(email)) == []


def test_un_evento_con_una_leccion_que_no_existe_da_422(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/eventos",
        headers=_con(token),
        json={"tipo": "video_iniciado", "leccionId": "no-existe"},
    )
    assert respuesta.status_code == 422


def test_un_evento_con_una_pregunta_que_no_existe_da_422(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/eventos",
        headers=_con(token),
        json={"tipo": "actividad_respondida", "preguntaId": "no-existe", "valor": 0},
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "datos_no_validos"


def test_el_inicio_de_una_sesion_de_estudio_se_guarda_con_su_curso_y_minutos(
    cliente_bd: TestClient,
) -> None:
    token, email = _alta(cliente_bd)
    detalles = {"cursoId": CURSO, "minutos": 10, "audio": True, "pasos": 4}
    respuesta = cliente_bd.post(
        "/api/eventos",
        headers=_con(token),
        json={"tipo": "sesion_iniciada", "detalles": detalles},
    )
    assert respuesta.status_code == 204, respuesta.json()
    filas = _filas("SELECT detalles FROM eventos WHERE alumno_id = %s", _alumno(email))
    assert filas == [{"detalles": detalles}]


# --- Eliminar la cuenta -----------------------------------------------------------------


def test_eliminar_la_cuenta_borra_todo_el_progreso(cliente_bd: TestClient) -> None:
    token, email = _alta(cliente_bd)
    alumno = _alumno(email)
    primera = _lecciones()[0]
    _guardar_test(cliente_bd, token, [primera])
    sesion = _crear_sesion(cliente_bd, token, [primera])
    _completar(cliente_bd, token, sesion, primera)
    cliente_bd.post("/api/eventos", headers=_con(token), json={"tipo": "video_iniciado"})

    respuesta = cliente_bd.request(
        "DELETE", "/api/cuenta", headers=_con(token), json={"contrasena": CONTRASENA}
    )
    assert respuesta.status_code == 204
    for tabla in ("matriculas", "dominios", "sesiones", "eventos"):
        assert _filas(f"SELECT 1 FROM {tabla} WHERE alumno_id = %s", alumno) == [], tabla
    assert _filas("SELECT 1 FROM sesiones_lecciones WHERE sesion_id = %s", sesion) == []
