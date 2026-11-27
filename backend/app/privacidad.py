"""Filtro de privacidad: la única puerta del backend hacia la IA (SPEC §5 y §6, issue #16).

Ningún otro módulo puede hablar con un proveedor de IA (lo comprueba
`pruebas/test_arquitectura.py`). Todo lo que sale hacia la IA pasa por `consultar`, que:

  - no hace nada si no hay `GROQ_API_KEY`: quien llama usa su respuesta de respaldo;
  - quita de los textos correos, teléfonos, documentos de identidad y enlaces;
  - si la IA falla, tarda demasiado o no devuelve un JSON válido, devuelve `None` y lo deja
    anotado en el registro, sin la clave.

Lo que se envía ya viene seudonimizado de los servicios: nunca el nombre, el correo ni la fecha
de nacimiento del alumno, solo si es menor y lo necesario para responder.
"""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from app.config import obtener_configuracion

logger = logging.getLogger(__name__)

URL_GROQ = "https://api.groq.com/openai/v1/chat/completions"

#: Segundos que se espera a la IA. El frontend espera 8 en total antes de usar su respaldo.
TIEMPO_MAXIMO = 6

#: Datos personales que se sustituyen antes de enviar un texto a la IA.
PATRONES_PERSONALES = (
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "[correo]"),
    (re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE), "[enlace]"),
    (re.compile(r"\b[XYZ]?\d{7,8}[-\s]?[A-Z]\b", re.IGNORECASE), "[documento]"),
    (re.compile(r"(?<![\w.])\+?\d(?:[\s.-]?\d){8,}(?![\w.])"), "[teléfono]"),
)


def hay_ia() -> bool:
    """True si hay clave de Groq: sin ella, los agentes usan sus respuestas de respaldo."""
    return bool(obtener_configuracion().clave_groq)


def limpiar(texto: str) -> str:
    """Sustituye los datos personales de un texto por una etiqueta."""
    for patron, etiqueta in PATRONES_PERSONALES:
        texto = patron.sub(etiqueta, texto)
    return texto


def _limpiar_datos(datos: Any) -> Any:
    """Aplica `limpiar` a todos los textos, también dentro de listas y diccionarios."""
    if isinstance(datos, str):
        return limpiar(datos)
    if isinstance(datos, list):
        return [_limpiar_datos(valor) for valor in datos]
    if isinstance(datos, dict):
        return {clave: _limpiar_datos(valor) for clave, valor in datos.items()}
    return datos


def _json_de(texto: str) -> dict[str, Any] | None:
    """El objeto JSON de la respuesta, aunque venga rodeado de texto."""
    try:
        valor = json.loads(texto)
    except ValueError:
        encontrado = re.search(r"\{.*\}", texto, re.DOTALL)
        if not encontrado:
            return None
        try:
            valor = json.loads(encontrado.group(0))
        except ValueError:
            return None
    return valor if isinstance(valor, dict) else None


def consultar(
    modelo: str,
    instrucciones: str,
    datos: dict[str, Any],
    historial: list[tuple[str, str]] | None = None,
    temperatura: float = 0.4,
    modelo_de_reserva: str | None = None,
) -> dict[str, Any] | None:
    """Pide a la IA una respuesta en JSON. Devuelve `None` si no se puede usar.

    `historial` son los mensajes anteriores de la conversación, como pares (autor, texto) con
    autor "alumno" o "mentor". También pasan por el filtro.

    Si el modelo responde que ha llegado a su límite de uso (429) y hay `modelo_de_reserva`, se
    repite la petición una vez con ese modelo.
    """
    clave = obtener_configuracion().clave_groq
    if not clave:
        return None

    mensajes = [{"role": "system", "content": instrucciones}]
    for autor, texto in historial or []:
        mensajes.append(
            {"role": "user" if autor == "alumno" else "assistant", "content": limpiar(texto)}
        )
    mensajes.append(
        {"role": "user", "content": json.dumps(_limpiar_datos(datos), ensure_ascii=False)}
    )
    cuerpo = {
        "model": modelo,
        "messages": mensajes,
        "response_format": {"type": "json_object"},
        "temperature": temperatura,
        "max_completion_tokens": 1024,
        "reasoning_effort": "low",
    }
    peticion = urllib.request.Request(
        URL_GROQ,
        data=json.dumps(cuerpo).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {clave}",
            "Content-Type": "application/json",
            # Sin un agente propio, algunos cortafuegos rechazan el de Python por defecto.
            "User-Agent": "reto480-api",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=TIEMPO_MAXIMO) as respuesta:
            contenido = json.loads(respuesta.read())["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as error:
        # El cuerpo del error de Groq explica el motivo (modelo, límite...) y no lleva la clave.
        detalle = error.read()[:300].decode("utf-8", "replace") if error.fp else ""
        if error.code == 429 and modelo_de_reserva and modelo_de_reserva != modelo:
            logger.warning(
                "%s ha llegado a su límite de uso: se prueba con %s.", modelo, modelo_de_reserva
            )
            return consultar(modelo_de_reserva, instrucciones, datos, historial, temperatura)
        logger.warning(
            "La IA respondió %s (%s): se usa la respuesta de respaldo.", error.code, detalle
        )
        return None
    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
        ValueError,
        KeyError,
        IndexError,
    ) as error:
        logger.warning("La IA no ha respondido (%s): se usa la respuesta de respaldo.", error)
        return None

    resultado = _json_de(contenido or "")
    if resultado is None:
        logger.warning("La IA no devolvió un JSON válido: se usa la respuesta de respaldo.")
    return resultado
