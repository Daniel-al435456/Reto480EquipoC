"""Respuestas del mentor sin IA.

Son las respuestas de respaldo de SPEC §7: las mismas que el frontend da sin
conexión, con la personalidad y el trato que elige el alumno. Con la issue #16,
el agente Mentor (Groq, a través de `app/privacidad.py`) redactará las
respuestas y estas quedarán para cuando la IA no responda.
"""

from __future__ import annotations

import re

from app.esquemas import Personalidad, SalidaMensaje, SalidaTexto, Tratamiento
from app.servicios.contenido import normalizar, obtener_curso, obtener_leccion

CURSO_POR_DEFECTO = "python-desde-cero"


def _palabra(tratamiento: Tratamiento, femenino: str, masculino: str, neutro: str) -> str:
    return {"femenino": femenino, "masculino": masculino}.get(tratamiento, neutro)


def frases(personalidad: Personalidad, tratamiento: Tratamiento) -> dict[str, str]:
    """Frases con las que el mentor abre y cierra sus mensajes (igual que en el frontend)."""
    reintento = _palabra(
        tratamiento,
        "¿Lista para intentarlo otra vez?",
        "¿Listo para intentarlo otra vez?",
        "¿Lo intentamos otra vez?",
    )
    todas = {
        "amable": {
            "atasco": "Veo que este tema se te está resistiendo, es normal. "
            "Te lo cuento de otra forma:",
            "respuesta": "Te lo explico:",
            "aclarar": "Buena pregunta. ¿Me dices de qué tema es?",
            "cierre": "Si quieres, lo repasamos juntos en la lección.",
            "reintento": reintento,
        },
        "motivador": {
            "atasco": "¡Vas por buen camino! Un tropiezo es parte de aprender. Míralo así:",
            "respuesta": "¡Buena pregunta!",
            "aclarar": "¡Me encanta que preguntes! ¿De qué tema es?",
            "cierre": "¡Tú puedes con esto!",
            "reintento": reintento,
        },
        "gracioso": {
            "atasco": "Cuac, este tema se ha puesto rebelde. Vamos a domarlo:",
            "respuesta": "Cuac, esta me la sé:",
            "aclarar": "Cuac, me he perdido. ¿De qué tema hablamos?",
            "cierre": "Y si no queda claro, te lo repito hasta que lo entienda "
            "hasta mi pato de goma.",
            "reintento": reintento,
        },
        "estricto": {
            "atasco": "Dos fallos en el mismo tema. Repasa esto con atención:",
            "respuesta": "Respuesta corta:",
            "aclarar": "Concreta: ¿de qué tema es la duda?",
            "cierre": "Repasa la lección y haz las actividades otra vez.",
            "reintento": _palabra(
                tratamiento,
                "Cuando estés lista, inténtalo de nuevo.",
                "Cuando estés listo, inténtalo de nuevo.",
                "Cuando puedas, inténtalo de nuevo.",
            ),
        },
    }
    return todas.get(personalidad, todas["amable"])


def mensaje_proactivo(
    curso_id: str, leccion_id: str, personalidad: Personalidad, tratamiento: Tratamiento
) -> SalidaTexto:
    """Mensaje del mentor cuando detecta que el alumno se ha bloqueado en una lección."""
    leccion = obtener_leccion(curso_id, leccion_id)
    f = frases(personalidad, tratamiento)
    return SalidaTexto(
        texto=f"«{leccion['titulo']}». {f['atasco']} {leccion['resumen']} {f['reintento']}"
    )


def responder(
    texto: str,
    curso_id: str | None,
    leccion_id: str | None,
    personalidad: Personalidad,
    tratamiento: Tratamiento,
) -> SalidaMensaje:
    """Respuesta a una consulta: busca la lección de la que habla el alumno y la resume."""
    f = frases(personalidad, tratamiento)
    curso = obtener_curso(curso_id or CURSO_POR_DEFECTO)
    consulta = normalizar(texto)
    leccion = next(
        (
            leccion
            for leccion in curso["lecciones"]
            # "variable" también encuentra la lección de "variables".
            if re.sub(r"e?s$", "", normalizar(leccion["concepto"])) in consulta
            or normalizar(leccion["id"]) in consulta
        ),
        None,
    ) or next((leccion for leccion in curso["lecciones"] if leccion["id"] == leccion_id), None)
    if leccion:
        return SalidaMensaje(
            texto=f"{f['respuesta']} «{leccion['titulo']}»: {leccion['resumen']} {f['cierre']}"
        )
    if "ejemplo" in consulta:
        return SalidaMensaje(
            texto=f"{f['respuesta']} edad = 18 crea una variable, y print(edad) muestra "
            "su valor por pantalla."
        )
    return SalidaMensaje(
        texto=f"{f['aclarar']} Por ejemplo: variables, cadenas, tipos de datos, condicionales "
        "u operadores. Si prefieres, puedes pedir ayuda a un tutor."
    )


def derivar_a_tutor() -> SalidaTexto:
    """Pasa la conversación a un tutor de la academia.

    De momento solo confirma al alumno. Guardar la petición para que la vea el
    tutor necesita la base de datos (tabla de mensajes del mentor).
    """
    return SalidaTexto(texto="He avisado a tu tutor. Te responderá lo antes posible.")
