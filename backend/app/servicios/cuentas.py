"""Cuenta del alumno en la base de datos (issue #55).

Alta, inicio y cierre de sesión, perfil, cambio de contraseña y eliminación de la cuenta.

- La identidad (nombre, correo, fecha de nacimiento...) va en `identidades` y lo demás del alumno en
  `alumnos`, sin datos personales (SPEC §6). Nada de este módulo llega a la IA.
- La contraseña se guarda solo como hash Argon2id. Nunca se guarda ni se registra en claro.
- La sesión es un token aleatorio que la app envía en cada petición. En `accesos` solo se guarda su
  resumen SHA-256, con la fecha de caducidad: cerrar sesión borra la fila.
- Con menos de 14 años hace falta el consentimiento de la familia (AGENTS.md), con el mismo cálculo
  de la edad que el frontend (frontend/src/api/edad.js).
"""

from __future__ import annotations

import hashlib
import re
import secrets
from datetime import date

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.errores import ErrorDeNegocio
from app.esquemas import (
    EntradaAlta,
    EntradaContrasena,
    EntradaPerfil,
    EntradaSesion,
    Perfil,
    SalidaSesion,
)
from app.persistencia import Conexion, conexion, hay_base_de_datos

#: Días que dura una sesión. Después hay que volver a entrar.
DIAS_SESION = 30
#: Las mismas reglas que el frontend (api/cuenta.js y api/edad.js).
LONGITUD_MINIMA_CONTRASENA = 8
EDAD_CONSENTIMIENTO = 14
EDAD_MAXIMA = 120

_hasher = PasswordHasher()
#: Hash de una contraseña cualquiera: se comprueba contra él cuando el correo no existe, para que
#: responder tarde lo mismo y no delate qué correos están registrados.
_HASH_DE_RELLENO = _hasher.hash("contraseña-de-relleno-1")

_CONSULTA_PERFIL = """
    SELECT i.nombre, i.apellidos, i.email, coalesce(i.puesto, '') AS puesto, i.fecha_nacimiento,
           i.consentimiento_familia_en, i.creado_en, e.nombre AS empresa, a.alias, a.anonimo,
           a.mentor_ia_activo, a.personalidad_mentor, a.tratamiento
    FROM alumnos a
    JOIN identidades i ON i.alumno_id = a.id
    JOIN empresas e ON e.id = i.empresa_id
    WHERE a.id = %s
"""


def _exigir_base_de_datos() -> None:
    """Las cuentas solo existen en la base de datos: sin ella, la app sigue en modo local."""
    if not hay_base_de_datos():
        raise ErrorDeNegocio(
            "base_datos_no_disponible",
            "Las cuentas necesitan la base de datos, y este servidor no tiene ninguna configurada.",
            503,
        )


def _sesion_no_valida() -> ErrorDeNegocio:
    return ErrorDeNegocio(
        "sesion_no_valida", "Tu sesión ha caducado o no es válida. Vuelve a iniciar sesión.", 401
    )


def _contrasena_incorrecta() -> ErrorDeNegocio:
    return ErrorDeNegocio("contrasena_incorrecta", "La contraseña no es correcta.", 403)


def _resumen(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _verificar(hash_contrasena: str, contrasena: str) -> bool:
    try:
        return _hasher.verify(hash_contrasena, contrasena)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def comprobar_contrasena_nueva(contrasena: str) -> None:
    """Al menos 8 caracteres, con alguna letra y algún número, como pide el frontend."""
    if (
        len(contrasena) < LONGITUD_MINIMA_CONTRASENA
        or not re.search(r"[^\W\d_]", contrasena)
        or not re.search(r"\d", contrasena)
    ):
        raise ErrorDeNegocio(
            "contrasena_debil",
            f"La contraseña debe tener al menos {LONGITUD_MINIMA_CONTRASENA} caracteres, "
            "con alguna letra y algún número.",
            422,
        )


def edad(fecha_nacimiento: date, hoy: date | None = None) -> int:
    """Años cumplidos en la fecha `hoy`."""
    hoy = hoy or date.today()
    cumplidos = hoy.year - fecha_nacimiento.year
    if (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
        cumplidos -= 1
    return cumplidos


def _comprobar_alta(entrada: EntradaAlta) -> bool:
    """Reglas del alta. Devuelve si el alumno es menor de 14 años."""
    if not entrada.privacidad_aceptada:
        raise ErrorDeNegocio(
            "privacidad_no_aceptada", "Para crear la cuenta, acepta la política de privacidad.", 422
        )
    anios = edad(entrada.fecha_nacimiento)
    if anios < 0 or anios > EDAD_MAXIMA:
        raise ErrorDeNegocio("fecha_nacimiento_invalida", "Revisa la fecha de nacimiento.", 422)
    menor_de_14 = anios < EDAD_CONSENTIMIENTO
    if menor_de_14 and not entrada.consentimiento_familia:
        raise ErrorDeNegocio(
            "consentimiento_necesario",
            "Con menos de 14 años, hace falta el consentimiento de tu familia para continuar.",
            422,
        )
    comprobar_contrasena_nueva(entrada.contrasena)
    return menor_de_14


def _empresa(bd: Conexion, nombre: str) -> int:
    """La empresa con ese nombre, sin distinguir mayúsculas. Si no existe, se crea."""
    fila = bd.execute(
        "SELECT id FROM empresas WHERE lower(nombre) = lower(%s) ORDER BY id LIMIT 1", (nombre,)
    ).fetchone()
    if fila:
        return int(fila["id"])
    fila = bd.execute(
        "INSERT INTO empresas (nombre) VALUES (%s) RETURNING id", (nombre,)
    ).fetchone()
    assert fila is not None
    return int(fila["id"])


def _abrir_sesion(bd: Conexion, alumno_id: int) -> str:
    """Crea un acceso nuevo y devuelve su token. El token solo lo ve la app."""
    token = secrets.token_urlsafe(32)
    bd.execute(
        "INSERT INTO accesos (alumno_id, hash_token, caduca_en) "
        "VALUES (%s, %s, now() + make_interval(days => %s))",
        (alumno_id, _resumen(token), DIAS_SESION),
    )
    return token


def _perfil(bd: Conexion, alumno_id: int) -> Perfil:
    fila = bd.execute(_CONSULTA_PERFIL, (alumno_id,)).fetchone()
    if fila is None:
        raise _sesion_no_valida()
    return Perfil(
        empresa=fila["empresa"],
        nombre=fila["nombre"],
        apellidos=fila["apellidos"],
        email=fila["email"],
        puesto=fila["puesto"],
        fecha_nacimiento=fila["fecha_nacimiento"],
        consentimiento_familia=fila["consentimiento_familia_en"],
        creada_en=fila["creado_en"],
        alias=fila["alias"],
        anonimo=fila["anonimo"],
        mentor_ia=fila["mentor_ia_activo"],
        personalidad_mentor=fila["personalidad_mentor"],
        tratamiento=fila["tratamiento"],
    )


def crear_cuenta(entrada: EntradaAlta) -> SalidaSesion:
    """Alta completa: crea el alumno, su identidad y su primera sesión, todo o nada."""
    _exigir_base_de_datos()
    menor_de_14 = _comprobar_alta(entrada)
    hash_contrasena = _hasher.hash(entrada.contrasena)
    with conexion() as bd:
        if bd.execute(
            "SELECT 1 FROM identidades WHERE lower(email) = lower(%s)", (entrada.email,)
        ).fetchone():
            raise ErrorDeNegocio(
                "email_registrado",
                "Ya hay una cuenta con ese correo. Inicia sesión con él.",
                409,
            )
        empresa_id = _empresa(bd, entrada.empresa)
        alumno = bd.execute(
            "INSERT INTO alumnos "
            "(alias, anonimo, mentor_ia_activo, personalidad_mentor, tratamiento) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (
                entrada.alias,
                entrada.anonimo,
                entrada.mentor_ia,
                entrada.personalidad_mentor,
                entrada.tratamiento,
            ),
        ).fetchone()
        assert alumno is not None
        alumno_id = int(alumno["id"])
        bd.execute(
            "INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, puesto, "
            "hash_contrasena, fecha_nacimiento, consentimiento_familia_en, privacidad_aceptada_en) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CASE WHEN %s THEN now() END, now())",
            (
                alumno_id,
                empresa_id,
                entrada.nombre,
                entrada.apellidos,
                entrada.email,
                entrada.puesto or None,
                hash_contrasena,
                entrada.fecha_nacimiento,
                menor_de_14 and entrada.consentimiento_familia,
            ),
        )
        token = _abrir_sesion(bd, alumno_id)
        return SalidaSesion(token=token, perfil=_perfil(bd, alumno_id))


def iniciar_sesion(entrada: EntradaSesion) -> SalidaSesion:
    """Comprueba el correo y la contraseña y abre una sesión nueva.

    El error es el mismo si el correo no existe o si la contraseña no es correcta.
    """
    _exigir_base_de_datos()
    with conexion() as bd:
        fila = bd.execute(
            "SELECT alumno_id, hash_contrasena FROM identidades WHERE lower(email) = lower(%s)",
            (entrada.email,),
        ).fetchone()
        correcta = _verificar(
            fila["hash_contrasena"] if fila else _HASH_DE_RELLENO, entrada.contrasena
        )
        if fila is None or not correcta:
            raise ErrorDeNegocio(
                "credenciales_incorrectas", "El correo o la contraseña no son correctos.", 401
            )
        alumno_id = int(fila["alumno_id"])
        # Las sesiones caducadas ya no valen: se borran aquí para que no se acumulen.
        bd.execute("DELETE FROM accesos WHERE alumno_id = %s AND caduca_en < now()", (alumno_id,))
        token = _abrir_sesion(bd, alumno_id)
        return SalidaSesion(token=token, perfil=_perfil(bd, alumno_id))


def alumno_del_token(token: str) -> int:
    """El alumno de una sesión válida (existe y no ha caducado), o un error 401."""
    _exigir_base_de_datos()
    if not token:
        raise _sesion_no_valida()
    with conexion() as bd:
        fila = bd.execute(
            "SELECT alumno_id FROM accesos WHERE hash_token = %s AND caduca_en > now()",
            (_resumen(token),),
        ).fetchone()
    if fila is None:
        raise _sesion_no_valida()
    return int(fila["alumno_id"])


def nombres_del_token(token: str) -> list[str]:
    """Nombre y apellidos del alumno con esa sesión, para quitarlos de lo que va a la IA.

    Si no hay base de datos o el token no vale, devuelve una lista vacía: el mentor responde igual.
    """
    if not token or not hay_base_de_datos():
        return []
    try:
        with conexion() as bd:
            fila = bd.execute(
                "SELECT i.nombre, i.apellidos FROM accesos a "
                "JOIN identidades i ON i.alumno_id = a.alumno_id "
                "WHERE a.hash_token = %s AND a.caduca_en > now()",
                (_resumen(token),),
            ).fetchone()
    except ErrorDeNegocio:
        return []
    return [fila["nombre"], fila["apellidos"]] if fila else []


def cerrar_sesion(token: str) -> None:
    """Borra la sesión: el token deja de valer, aunque alguien lo hubiera copiado."""
    with conexion() as bd:
        bd.execute("DELETE FROM accesos WHERE hash_token = %s", (_resumen(token),))


def obtener_perfil(alumno_id: int) -> Perfil:
    with conexion() as bd:
        return _perfil(bd, alumno_id)


def actualizar_perfil(alumno_id: int, entrada: EntradaPerfil) -> Perfil:
    """Cambia solo los datos que el alumno puede cambiar y que vienen en la petición."""
    cambios = entrada.model_dump(exclude_none=True)
    columnas_identidad = {"nombre": "nombre", "apellidos": "apellidos", "puesto": "puesto"}
    columnas_alumno = {
        "alias": "alias",
        "anonimo": "anonimo",
        "mentor_ia": "mentor_ia_activo",
        "personalidad_mentor": "personalidad_mentor",
        "tratamiento": "tratamiento",
    }
    with conexion() as bd:
        for tabla, clave, columnas in (
            ("identidades", "alumno_id", columnas_identidad),
            ("alumnos", "id", columnas_alumno),
        ):
            valores = {
                columna: (cambios[campo] or None) if campo == "puesto" else cambios[campo]
                for campo, columna in columnas.items()
                if campo in cambios
            }
            if valores:
                # Los nombres de columna salen de las listas de arriba, nunca de la petición.
                asignaciones = ", ".join(f"{columna} = %s" for columna in valores)
                bd.execute(
                    f"UPDATE {tabla} SET {asignaciones} WHERE {clave} = %s",  # noqa: S608
                    (*valores.values(), alumno_id),
                )
        return _perfil(bd, alumno_id)


def _hash_de(bd: Conexion, alumno_id: int) -> str:
    fila = bd.execute(
        "SELECT hash_contrasena FROM identidades WHERE alumno_id = %s", (alumno_id,)
    ).fetchone()
    if fila is None:
        raise _sesion_no_valida()
    return str(fila["hash_contrasena"])


def cambiar_contrasena(alumno_id: int, token: str, entrada: EntradaContrasena) -> None:
    """Cambia la contraseña y cierra las demás sesiones del alumno. La actual sigue abierta."""
    comprobar_contrasena_nueva(entrada.nueva)
    with conexion() as bd:
        if not _verificar(_hash_de(bd, alumno_id), entrada.actual):
            raise _contrasena_incorrecta()
        bd.execute(
            "UPDATE identidades SET hash_contrasena = %s WHERE alumno_id = %s",
            (_hasher.hash(entrada.nueva), alumno_id),
        )
        bd.execute(
            "DELETE FROM accesos WHERE alumno_id = %s AND hash_token <> %s",
            (alumno_id, _resumen(token)),
        )


def eliminar_cuenta(alumno_id: int, contrasena: str) -> None:
    """Borra el alumno y, en cascada, su identidad, sus sesiones y todo su aprendizaje."""
    with conexion() as bd:
        if not _verificar(_hash_de(bd, alumno_id), contrasena):
            raise _contrasena_incorrecta()
        bd.execute("DELETE FROM alumnos WHERE id = %s", (alumno_id,))
