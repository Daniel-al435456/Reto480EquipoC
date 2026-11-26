"""Rutas del mentor (SPEC §7). De momento responden sin IA; la issue #16 añade el agente."""

from __future__ import annotations

from fastapi import APIRouter

from app.esquemas import (
    EntradaDerivacion,
    EntradaMensaje,
    EntradaProactivo,
    SalidaMensaje,
    SalidaTexto,
)
from app.servicios import mentor

router = APIRouter(prefix="/api/mentor", tags=["mentor"])


@router.post("/proactivo", response_model=SalidaTexto, summary="Mensaje del mentor ante un bloqueo")
def proactivo(entrada: EntradaProactivo) -> SalidaTexto:
    return mentor.mensaje_proactivo(
        entrada.curso_id, entrada.leccion_id, entrada.personalidad, entrada.tratamiento
    )


@router.post("/mensaje", response_model=SalidaMensaje, summary="Responde a una consulta")
def mensaje(entrada: EntradaMensaje) -> SalidaMensaje:
    return mentor.responder(
        entrada.texto,
        entrada.curso_id,
        entrada.leccion_id,
        entrada.personalidad,
        entrada.tratamiento,
    )


@router.post("/derivacion", response_model=SalidaTexto, summary="Pasa la consulta a un tutor")
def derivacion(entrada: EntradaDerivacion) -> SalidaTexto:
    return mentor.derivar_a_tutor()
