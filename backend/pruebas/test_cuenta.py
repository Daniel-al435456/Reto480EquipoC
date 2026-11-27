"""Pruebas de la cuenta del alumno en el servidor (issue #55).

Alta, inicio y cierre de sesión, perfil, cambio de contraseña y eliminación de la cuenta, con los
datos en PostgreSQL. La sesión es un token opaco: en la base de datos solo se guarda su resumen
(tabla `accesos`). También comprueban que el nombre del alumno con sesión no llega a la IA.
"""

from __future__ import annotations

import hashlib
import io
import json
import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from app import privacidad
from app.config import obtener_configuracion
from app.persistencia import conexion
from fastapi.testclient import TestClient

CURSO = "python-desde-cero"
CONTRASENA = "secreta123"


@pytest.fixture
def cliente_bd(con_base_de_datos: str) -> Iterator[TestClient]:
    """Cliente contra la aplicación con la base de datos temporal."""
    from app.main import crear_app

    with TestClient(crear_app()) as cliente_local:
        yield cliente_local


def _datos_alta(**cambios: Any) -> dict[str, Any]:
    """Datos de un alta válida, con un correo distinto en cada llamada."""
    datos: dict[str, Any] = {
        "empresa": "Acme",
        "nombre": "Ana",
        "apellidos": "López García",
        "email": f"ana-{uuid.uuid4().hex[:8]}@ejemplo.com",
        "contrasena": CONTRASENA,
        "puesto": "Administrativa",
        "fechaNacimiento": "2000-05-01",
        "consentimientoFamilia": False,
        "privacidadAceptada": True,
        "alias": "Lince42",
        "anonimo": True,
        "mentorIA": True,
        "personalidadMentor": "amable",
        "tratamiento": "neutro",
    }
    datos.update(cambios)
    return datos


def _alta(cliente: TestClient, **cambios: Any) -> tuple[str, dict[str, Any]]:
    """Crea una cuenta y devuelve su token y los datos con que se creó."""
    datos = _datos_alta(**cambios)
    respuesta = cliente.post("/api/cuenta", json=datos)
    assert respuesta.status_code == 201, respuesta.json()
    return respuesta.json()["token"], datos


def _con(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _fila(consulta: str, *parametros: Any) -> dict[str, Any] | None:
    with conexion() as bd:
        return bd.execute(consulta, parametros).fetchone()


def _resumen(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# --- Alta -------------------------------------------------------------------------------


def test_el_alta_crea_la_cuenta_y_devuelve_un_token(cliente_bd: TestClient) -> None:
    token, datos = _alta(cliente_bd)
    perfil = cliente_bd.get("/api/cuenta", headers=_con(token)).json()
    assert perfil["email"] == datos["email"]
    assert perfil["nombre"] == "Ana" and perfil["apellidos"] == "López García"
    assert perfil["empresa"] == "Acme" and perfil["puesto"] == "Administrativa"
    assert perfil["alias"] == "Lince42" and perfil["mentorIA"] is True
    assert perfil["fechaNacimiento"] == "2000-05-01"
    assert "contrasena" not in perfil and "hashContrasena" not in perfil


def test_la_contrasena_se_guarda_con_argon2_y_nunca_en_claro(cliente_bd: TestClient) -> None:
    _, datos = _alta(cliente_bd)
    fila = _fila("SELECT hash_contrasena FROM identidades WHERE email = %s", datos["email"])
    assert fila is not None
    assert fila["hash_contrasena"].startswith("$argon2id$")
    assert CONTRASENA not in fila["hash_contrasena"]


def test_el_token_se_guarda_solo_como_resumen(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    assert _fila("SELECT 1 AS hay FROM accesos WHERE hash_token = %s", token) is None
    assert _fila("SELECT 1 AS hay FROM accesos WHERE hash_token = %s", _resumen(token)) is not None


def test_un_correo_ya_registrado_da_409_aunque_cambien_las_mayusculas(
    cliente_bd: TestClient,
) -> None:
    _, datos = _alta(cliente_bd)
    respuesta = cliente_bd.post("/api/cuenta", json=_datos_alta(email=datos["email"].upper()))
    assert respuesta.status_code == 409
    assert respuesta.json()["error"] == "email_registrado"


def test_un_menor_de_14_sin_consentimiento_no_puede_darse_de_alta(cliente_bd: TestClient) -> None:
    respuesta = cliente_bd.post("/api/cuenta", json=_datos_alta(fechaNacimiento="2015-03-01"))
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "consentimiento_necesario"


def test_un_menor_de_14_con_consentimiento_si_puede_y_queda_la_fecha(
    cliente_bd: TestClient,
) -> None:
    token, _ = _alta(cliente_bd, fechaNacimiento="2015-03-01", consentimientoFamilia=True)
    assert cliente_bd.get("/api/cuenta", headers=_con(token)).json()["consentimientoFamilia"]


def test_con_14_anios_cumplidos_no_hace_falta_consentimiento(cliente_bd: TestClient) -> None:
    from datetime import date

    hoy = date.today()
    hace_14 = date(hoy.year - 14, hoy.month, 28 if (hoy.month, hoy.day) == (2, 29) else hoy.day)
    _alta(cliente_bd, fechaNacimiento=hace_14.isoformat())


@pytest.mark.parametrize(
    ("cambios", "codigo"),
    [
        ({"fechaNacimiento": "2999-01-01"}, "fecha_nacimiento_invalida"),
        ({"fechaNacimiento": "1850-01-01"}, "fecha_nacimiento_invalida"),
        ({"privacidadAceptada": False}, "privacidad_no_aceptada"),
        ({"contrasena": "corta1"}, "contrasena_debil"),
        ({"contrasena": "sinnumeros"}, "contrasena_debil"),
        ({"contrasena": "12345678"}, "contrasena_debil"),
        ({"email": "no-es-un-correo"}, "validacion"),
        ({"nombre": "  "}, "validacion"),
    ],
)
def test_el_alta_rechaza_datos_no_validos(
    cliente_bd: TestClient, cambios: dict[str, Any], codigo: str
) -> None:
    respuesta = cliente_bd.post("/api/cuenta", json=_datos_alta(**cambios))
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == codigo


def test_la_empresa_se_reconoce_sin_distinguir_mayusculas(cliente_bd: TestClient) -> None:
    nombre = f"Empresa {uuid.uuid4().hex[:6]}"
    _alta(cliente_bd, empresa=nombre.upper())
    _alta(cliente_bd, empresa=f"  {nombre.lower()} ")
    fila = _fila("SELECT count(*) AS n FROM empresas WHERE lower(nombre) = lower(%s)", nombre)
    assert fila == {"n": 1}


# --- Sesión -----------------------------------------------------------------------------


def test_iniciar_sesion_con_la_contrasena_correcta_da_un_token(cliente_bd: TestClient) -> None:
    _, datos = _alta(cliente_bd)
    respuesta = cliente_bd.post(
        "/api/sesion", json={"email": datos["email"].upper(), "contrasena": CONTRASENA}
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["perfil"]["email"] == datos["email"]
    assert cliente_bd.get("/api/cuenta", headers=_con(cuerpo["token"])).status_code == 200


def test_una_contrasena_mala_y_un_correo_inexistente_dan_el_mismo_error(
    cliente_bd: TestClient,
) -> None:
    _, datos = _alta(cliente_bd)
    mala = cliente_bd.post("/api/sesion", json={"email": datos["email"], "contrasena": "otra1234"})
    nadie = cliente_bd.post(
        "/api/sesion", json={"email": "nadie@ejemplo.com", "contrasena": CONTRASENA}
    )
    assert mala.status_code == nadie.status_code == 401
    assert mala.json() == nadie.json()
    assert mala.json()["error"] == "credenciales_incorrectas"


@pytest.mark.parametrize("cabecera", [None, "Bearer inventado", "Basic abc", "Bearer "])
def test_sin_un_token_valido_la_cuenta_da_401(cliente_bd: TestClient, cabecera: str | None) -> None:
    respuesta = cliente_bd.get(
        "/api/cuenta", headers={"Authorization": cabecera} if cabecera else {}
    )
    assert respuesta.status_code == 401
    assert respuesta.json()["error"] == "sesion_no_valida"


def test_un_token_caducado_da_401(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    with conexion() as bd:
        bd.execute(
            "UPDATE accesos SET caduca_en = now() - interval '1 minute' WHERE hash_token = %s",
            (_resumen(token),),
        )
    assert cliente_bd.get("/api/cuenta", headers=_con(token)).status_code == 401


def test_al_cerrar_sesion_el_token_deja_de_valer(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    assert cliente_bd.delete("/api/sesion", headers=_con(token)).status_code == 204
    assert _fila("SELECT 1 AS hay FROM accesos WHERE hash_token = %s", _resumen(token)) is None
    assert cliente_bd.get("/api/cuenta", headers=_con(token)).status_code == 401


def test_iniciar_sesion_borra_los_accesos_caducados_del_alumno(cliente_bd: TestClient) -> None:
    token, datos = _alta(cliente_bd)
    with conexion() as bd:
        bd.execute(
            "UPDATE accesos SET caduca_en = now() - interval '1 day' WHERE hash_token = %s",
            (_resumen(token),),
        )
    cliente_bd.post("/api/sesion", json={"email": datos["email"], "contrasena": CONTRASENA})
    assert _fila("SELECT 1 AS hay FROM accesos WHERE hash_token = %s", _resumen(token)) is None


# --- Perfil -----------------------------------------------------------------------------


def test_el_perfil_cambia_los_datos_editables(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    cambios = {
        "nombre": "Anabel",
        "apellidos": "Ruiz",
        "puesto": "Técnica",
        "alias": "Zorro7",
        "anonimo": False,
        "mentorIA": False,
        "personalidadMentor": "estricto",
        "tratamiento": "femenino",
    }
    respuesta = cliente_bd.patch("/api/cuenta", headers=_con(token), json=cambios)
    assert respuesta.status_code == 200
    perfil = cliente_bd.get("/api/cuenta", headers=_con(token)).json()
    assert {clave: perfil[clave] for clave in cambios} == cambios


def test_el_perfil_no_cambia_el_correo_la_empresa_ni_la_fecha(cliente_bd: TestClient) -> None:
    token, datos = _alta(cliente_bd)
    cliente_bd.patch(
        "/api/cuenta",
        headers=_con(token),
        json={"email": "otro@ejemplo.com", "empresa": "Otra", "fechaNacimiento": "2010-01-01"},
    )
    perfil = cliente_bd.get("/api/cuenta", headers=_con(token)).json()
    assert perfil["email"] == datos["email"]
    assert perfil["empresa"] == "Acme"
    assert perfil["fechaNacimiento"] == "2000-05-01"


def test_el_perfil_rechaza_una_personalidad_desconocida(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.patch(
        "/api/cuenta", headers=_con(token), json={"personalidadMentor": "borde"}
    )
    assert respuesta.status_code == 422


# --- Contraseña -------------------------------------------------------------------------


def test_cambiar_la_contrasena_exige_la_actual(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.put(
        "/api/cuenta/contrasena",
        headers=_con(token),
        json={"actual": "otra1234", "nueva": "nueva12345"},
    )
    assert respuesta.status_code == 403
    assert respuesta.json()["error"] == "contrasena_incorrecta"


def test_cambiar_la_contrasena_rechaza_una_nueva_debil(cliente_bd: TestClient) -> None:
    token, _ = _alta(cliente_bd)
    respuesta = cliente_bd.put(
        "/api/cuenta/contrasena", headers=_con(token), json={"actual": CONTRASENA, "nueva": "corta"}
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"] == "contrasena_debil"


def test_tras_cambiar_la_contrasena_vale_la_nueva_y_se_cierran_las_demas_sesiones(
    cliente_bd: TestClient,
) -> None:
    token, datos = _alta(cliente_bd)
    otro = cliente_bd.post(
        "/api/sesion", json={"email": datos["email"], "contrasena": CONTRASENA}
    ).json()["token"]
    respuesta = cliente_bd.put(
        "/api/cuenta/contrasena",
        headers=_con(token),
        json={"actual": CONTRASENA, "nueva": "nueva12345"},
    )
    assert respuesta.status_code == 204
    assert cliente_bd.get("/api/cuenta", headers=_con(token)).status_code == 200
    assert cliente_bd.get("/api/cuenta", headers=_con(otro)).status_code == 401
    vieja = cliente_bd.post("/api/sesion", json={"email": datos["email"], "contrasena": CONTRASENA})
    nueva = cliente_bd.post(
        "/api/sesion", json={"email": datos["email"], "contrasena": "nueva12345"}
    )
    assert vieja.status_code == 401 and nueva.status_code == 200


# --- Eliminar la cuenta -----------------------------------------------------------------


def test_eliminar_la_cuenta_exige_la_contrasena(cliente_bd: TestClient) -> None:
    token, datos = _alta(cliente_bd)
    respuesta = cliente_bd.request(
        "DELETE", "/api/cuenta", headers=_con(token), json={"contrasena": "otra1234"}
    )
    assert respuesta.status_code == 403
    assert respuesta.json()["error"] == "contrasena_incorrecta"
    assert _fila("SELECT 1 AS hay FROM identidades WHERE email = %s", datos["email"]) is not None


def test_eliminar_la_cuenta_borra_alumno_identidad_y_accesos(cliente_bd: TestClient) -> None:
    token, datos = _alta(cliente_bd)
    fila = _fila("SELECT alumno_id FROM identidades WHERE email = %s", datos["email"])
    assert fila is not None
    respuesta = cliente_bd.request(
        "DELETE", "/api/cuenta", headers=_con(token), json={"contrasena": CONTRASENA}
    )
    assert respuesta.status_code == 204
    assert _fila("SELECT 1 AS hay FROM alumnos WHERE id = %s", fila["alumno_id"]) is None
    assert _fila("SELECT 1 AS hay FROM identidades WHERE email = %s", datos["email"]) is None
    assert _fila("SELECT 1 AS hay FROM accesos WHERE alumno_id = %s", fila["alumno_id"]) is None
    assert cliente_bd.get("/api/cuenta", headers=_con(token)).status_code == 401


# --- Sin base de datos ------------------------------------------------------------------


def test_sin_base_de_datos_la_cuenta_responde_503() -> None:
    from app.main import crear_app

    with TestClient(crear_app()) as cliente_local:
        respuesta = cliente_local.post("/api/cuenta", json=_datos_alta())
        sesion = cliente_local.post(
            "/api/sesion", json={"email": "ana@ejemplo.com", "contrasena": CONTRASENA}
        )
    assert respuesta.status_code == sesion.status_code == 503
    assert respuesta.json()["error"] == "base_datos_no_disponible"


# --- El nombre del alumno no llega a la IA ----------------------------------------------


def test_el_filtro_quita_los_nombres_que_se_le_indican() -> None:
    texto = privacidad.limpiar(
        "Me llamo ANA, mi apellido es lopez y vivo en la calle de Ana", nombres=["Ana", "López"]
    )
    assert "ANA" not in texto and "lopez" not in texto.lower() and " Ana" not in texto
    assert texto.count("[nombre]") == 3


def test_el_filtro_no_quita_particulas_ni_trozos_de_palabras() -> None:
    texto = privacidad.limpiar("La variable de entrada es Anabel", nombres=["Ana", "de la Fuente"])
    assert texto == "La variable de entrada es Anabel"


@pytest.fixture
def ia(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Sustituye la conexión con Groq y guarda lo que se le habría enviado."""
    monkeypatch.setenv("GROQ_API_KEY", "clave-de-prueba")
    obtener_configuracion.cache_clear()
    estado: dict[str, Any] = {}

    def urlopen_falso(peticion: Any, timeout: float) -> io.BytesIO:
        estado["enviado"] = peticion.data.decode("utf-8")
        contenido = json.dumps({"mensaje": "Respuesta.", "accion": "ninguna", "correcta": True})
        return io.BytesIO(json.dumps({"choices": [{"message": {"content": contenido}}]}).encode())

    monkeypatch.setattr(privacidad.urllib.request, "urlopen", urlopen_falso)
    return estado


def test_con_sesion_el_nombre_del_alumno_no_llega_al_mentor(
    cliente_bd: TestClient, ia: dict[str, Any]
) -> None:
    token, _ = _alta(cliente_bd, nombre="Rocío", apellidos="Fernández Vidal")
    respuesta = cliente_bd.post(
        "/api/mentor/mensaje",
        headers=_con(token),
        json={
            "cursoId": CURSO,
            "texto": "Hola, soy Rocío Fernández, ¿qué es una variable?",
            "historial": [{"autor": "alumno", "texto": "Me llamo rocio vidal"}],
        },
    )
    assert respuesta.status_code == 200
    enviado = json.loads(ia["enviado"])
    texto = json.dumps(enviado, ensure_ascii=False).lower()
    assert "rocío" not in texto and "rocio" not in texto
    assert "fernández" not in texto and "vidal" not in texto


def test_con_sesion_el_nombre_del_alumno_no_llega_a_la_correccion(
    cliente_bd: TestClient, ia: dict[str, Any]
) -> None:
    token, _ = _alta(cliente_bd, nombre="Rocío", apellidos="Fernández Vidal")
    actividad = next(
        actividad
        for leccion in cliente_bd.get(f"/api/cursos/{CURSO}/lecciones").json()["lecciones"]
        for actividad in leccion["actividades"]
        if actividad["tipo"] == "escrita"
    )
    respuesta = cliente_bd.post(
        "/api/actividades/correccion",
        headers=_con(token),
        json={"actividadId": actividad["id"], "texto": "Soy Rocío y no lo sé"},
    )
    assert respuesta.status_code == 200
    assert "rocío" not in ia["enviado"].lower() and "roc\\u00edo" not in ia["enviado"].lower()


def test_un_token_no_valido_no_impide_hablar_con_el_mentor(cliente_bd: TestClient) -> None:
    respuesta = cliente_bd.post(
        "/api/mentor/mensaje",
        headers=_con("inventado"),
        json={"cursoId": CURSO, "texto": "¿Qué es una variable?"},
    )
    assert respuesta.status_code == 200
