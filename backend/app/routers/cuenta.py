"""Rutas de la cuenta del alumno y de su sesión (issue #55).

Validan la petición y delegan en `servicios/cuentas.py`. Todas necesitan la base de datos; las
de la cuenta, además, una sesión iniciada (`Authorization: Bearer <token>`).
"""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.esquemas import (
    EntradaAlta,
    EntradaContrasena,
    EntradaEliminarCuenta,
    EntradaPerfil,
    EntradaSesion,
    Perfil,
    SalidaSesion,
)
from app.routers.dependencias import AlumnoConSesion, TokenSesion
from app.servicios import cuentas

router = APIRouter(prefix="/api", tags=["cuenta"])


@router.post(
    "/cuenta",
    response_model=SalidaSesion,
    status_code=status.HTTP_201_CREATED,
    summary="Crea la cuenta al terminar el alta e inicia la sesión",
)
def crear_cuenta(entrada: EntradaAlta) -> SalidaSesion:
    return cuentas.crear_cuenta(entrada)


@router.get("/cuenta", response_model=Perfil, summary="Perfil del alumno con sesión")
def ver_cuenta(alumno_id: AlumnoConSesion) -> Perfil:
    return cuentas.obtener_perfil(alumno_id)


@router.patch(
    "/cuenta",
    response_model=Perfil,
    summary="Cambia los datos del perfil que puede cambiar el alumno",
)
def cambiar_cuenta(entrada: EntradaPerfil, alumno_id: AlumnoConSesion) -> Perfil:
    return cuentas.actualizar_perfil(alumno_id, entrada)


@router.delete(
    "/cuenta",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina la cuenta y todos los datos del alumno (pide la contraseña)",
)
def eliminar_cuenta(entrada: EntradaEliminarCuenta, alumno_id: AlumnoConSesion) -> Response:
    cuentas.eliminar_cuenta(alumno_id, entrada.contrasena)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/cuenta/contrasena",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cambia la contraseña y cierra las demás sesiones",
)
def cambiar_contrasena(
    entrada: EntradaContrasena, alumno_id: AlumnoConSesion, token: TokenSesion
) -> Response:
    cuentas.cambiar_contrasena(alumno_id, token, entrada)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sesion", response_model=SalidaSesion, summary="Inicia sesión")
def iniciar_sesion(entrada: EntradaSesion) -> SalidaSesion:
    return cuentas.iniciar_sesion(entrada)


@router.delete(
    "/sesion",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cierra la sesión de este dispositivo",
)
def cerrar_sesion(alumno_id: AlumnoConSesion, token: TokenSesion) -> Response:
    cuentas.cerrar_sesion(token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
