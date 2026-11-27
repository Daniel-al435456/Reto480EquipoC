"""Dependencias comunes de las rutas: la sesión del alumno (issue #55).

La app envía el token en la cabecera `Authorization: Bearer <token>`. Estas funciones solo lo
leen y delegan en `servicios/cuentas.py`, que es quien lo busca en la base de datos.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.errores import ErrorDeNegocio
from app.servicios import cuentas

#: Sin `auto_error`, una cabecera que falta o no es "Bearer" llega como None y el error lo da
#: `token_de_sesion`, con el formato común y el código `sesion_no_valida`.
_portador = HTTPBearer(auto_error=False, description="Token de la sesión del alumno")

Credenciales = Annotated[HTTPAuthorizationCredentials | None, Depends(_portador)]


def token_de_sesion(credenciales: Credenciales) -> str:
    """El token de la petición, o un error 401 si no viene."""
    token = credenciales.credentials.strip() if credenciales else ""
    if not token:
        raise ErrorDeNegocio(
            "sesion_no_valida",
            "Tu sesión ha caducado o no es válida. Vuelve a iniciar sesión.",
            401,
        )
    return token


def alumno_con_sesion(token: Annotated[str, Depends(token_de_sesion)]) -> int:
    """El alumno de la sesión, o un error 401 si no es válida o ha caducado."""
    return cuentas.alumno_del_token(token)


def nombres_del_alumno(credenciales: Credenciales) -> list[str]:
    """Nombre y apellidos del alumno, si la petición trae una sesión válida.

    Solo sirven para quitarlos de lo que se envía a la IA. Sin sesión, la lista está vacía y la
    ruta funciona igual: el mentor y la corrección no exigen haber iniciado sesión.
    """
    return cuentas.nombres_del_token(credenciales.credentials.strip()) if credenciales else []


TokenSesion = Annotated[str, Depends(token_de_sesion)]
AlumnoConSesion = Annotated[int, Depends(alumno_con_sesion)]
NombresDelAlumno = Annotated[list[str], Depends(nombres_del_alumno)]
