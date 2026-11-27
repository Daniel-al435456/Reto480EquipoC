"""Rutas del mentor (SPEC §7). Con GROQ_API_KEY responde el agente Mentor; sin ella, el respaldo."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import (
    EntradaDerivacion,
    EntradaMensaje,
    EntradaProactivo,
    SalidaMensaje,
    SalidaTexto,
)
from app.routers.dependencias import NombresDelAlumno
from app.servicios import mentor

router = APIRouter(prefix="/api/mentor", tags=["mentor"])


@router.post("/proactivo", response_model=SalidaTexto, summary="Mensaje del mentor ante un bloqueo")
def proactivo(entrada: EntradaProactivo) -> SalidaTexto:
    return mentor.mensaje_proactivo(
        entrada.curso_id,
        entrada.leccion_id,
        entrada.personalidad,
        entrada.tratamiento,
        es_menor=entrada.es_menor,
        senal=entrada.senal,
        progreso=entrada.progreso,
    )


@router.post(
    "/mensaje",
    response_model=SalidaMensaje,
    response_model_exclude_none=True,
    summary="Responde a una consulta",
)
def mensaje(entrada: EntradaMensaje, nombres: NombresDelAlumno) -> SalidaMensaje:
    # Con sesión, el nombre y los apellidos del alumno se quitan de lo que llega a la IA.
    return mentor.responder(
        entrada.texto,
        entrada.curso_id,
        entrada.leccion_id,
        entrada.personalidad,
        entrada.tratamiento,
        es_menor=entrada.es_menor,
        historial=entrada.historial,
        progreso=entrada.progreso,
        nombres=nombres,
    )


@router.post("/derivacion", response_model=SalidaTexto, summary="Pasa la consulta a un tutor")
def derivacion(entrada: EntradaDerivacion) -> SalidaTexto:
    return mentor.derivar_a_tutor()
