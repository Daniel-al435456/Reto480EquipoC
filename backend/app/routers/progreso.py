"""Rutas del progreso del alumno (issue #60).

Validan la petición y delegan en `servicios/progreso.py`. Todas necesitan la base de datos y una
sesión iniciada (`Authorization: Bearer <token>`), como las de la cuenta.
"""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.esquemas import (
    EntradaDominio,
    EntradaEvento,
    EntradaFinSesion,
    EntradaResultadoTest,
    EntradaSesionEstudio,
    Progreso,
    SalidaSesionEstudio,
)
from app.routers.dependencias import AlumnoConSesion
from app.servicios import progreso

router = APIRouter(prefix="/api", tags=["progreso"])


@router.get("/progreso", response_model=Progreso, summary="Progreso del alumno en su curso actual")
def ver_progreso(alumno_id: AlumnoConSesion) -> Progreso:
    return progreso.obtener_progreso(alumno_id)


@router.put(
    "/cursos/{curso_id}/matricula",
    response_model=Progreso,
    summary="Elige el curso: lo hace el actual y devuelve su progreso",
)
def matricular(curso_id: str, alumno_id: AlumnoConSesion) -> Progreso:
    return progreso.matricular(alumno_id, curso_id)


@router.put(
    "/cursos/{curso_id}/test/resultado",
    response_model=Progreso,
    summary="Guarda el resultado del test inicial (sustituye el anterior)",
)
def guardar_test(
    curso_id: str, entrada: EntradaResultadoTest, alumno_id: AlumnoConSesion
) -> Progreso:
    return progreso.guardar_test(alumno_id, curso_id, entrada)


@router.put(
    "/cursos/{curso_id}/dominio/{leccion_id}",
    response_model=Progreso,
    summary="Estudia igualmente una lección dominada, o vuelve a saltarla",
)
def cambiar_dominio(
    curso_id: str, leccion_id: str, entrada: EntradaDominio, alumno_id: AlumnoConSesion
) -> Progreso:
    return progreso.estudiar_igualmente(alumno_id, curso_id, leccion_id, entrada.estudiar)


@router.post(
    "/sesiones",
    response_model=SalidaSesionEstudio,
    status_code=status.HTTP_201_CREATED,
    summary="Empieza una sesión de estudio con sus lecciones",
)
def crear_sesion(entrada: EntradaSesionEstudio, alumno_id: AlumnoConSesion) -> SalidaSesionEstudio:
    return SalidaSesionEstudio(id=progreso.crear_sesion(alumno_id, entrada))


@router.put(
    "/sesiones/{sesion_id}/lecciones/{leccion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marca una lección de la sesión como completada",
)
def completar_leccion(sesion_id: int, leccion_id: str, alumno_id: AlumnoConSesion) -> Response:
    progreso.completar_leccion(alumno_id, sesion_id, leccion_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/sesiones/{sesion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Termina la sesión de estudio: completada o abandonada",
)
def terminar_sesion(
    sesion_id: int, entrada: EntradaFinSesion, alumno_id: AlumnoConSesion
) -> Response:
    progreso.terminar_sesion(alumno_id, sesion_id, entrada.estado)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/eventos",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Guarda un evento de aprendizaje",
)
def guardar_evento(entrada: EntradaEvento, alumno_id: AlumnoConSesion) -> Response:
    progreso.guardar_evento(alumno_id, entrada)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
