"""Mentor: respuestas del agente Mentor y, si la IA no está, las de respaldo.

Con `GROQ_API_KEY`, el agente Mentor (`app/servicios/agentes.py`, a través de
`app/privacidad.py`) redacta las respuestas con las lecciones relacionadas, el índice del
curso, el progreso del alumno y la conversación. Sin
clave, o si la IA falla, se usan las respuestas de respaldo de SPEC §7: las mismas
que el frontend da sin conexión, con la personalidad y el trato que elige el alumno.
"""

from __future__ import annotations

import re
from typing import Any

from app.esquemas import (
    MensajeAnterior,
    Personalidad,
    ProgresoAlumno,
    SalidaMensaje,
    SalidaTexto,
    Tratamiento,
)
from app.servicios import agentes
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


#: Palabras que no ayudan a encontrar la lección de la que habla el alumno.
PALABRAS_VACIAS = {
    "como",
    "cual",
    "cuales",
    "cuando",
    "donde",
    "entiendo",
    "esta",
    "este",
    "esto",
    "hacer",
    "para",
    "pero",
    "porque",
    "puedo",
    "python",
    "sobre",
    "tengo",
    "todo",
    "una",
    "unas",
    "uno",
    "unos",
    "explica",
    "explicas",
    "explicame",
    "dame",
    "quiero",
    "saber",
    "ejemplo",
}

#: Fragmentos del curso que recibe el mentor como mucho (SPEC §7: de 1 a 3).
MAXIMO_FRAGMENTOS = 3


def _leccion_nombrada(curso: dict[str, Any], consulta: str) -> dict[str, Any] | None:
    """La lección cuyo concepto o identificador aparece en la consulta, como sin IA."""
    return next(
        (
            leccion
            for leccion in curso["lecciones"]
            # "variable" también encuentra la lección de "variables".
            if re.sub(r"e?s$", "", normalizar(leccion["concepto"])) in consulta
            or normalizar(leccion["id"]) in consulta
        ),
        None,
    )


def _lecciones_relevantes(
    curso: dict[str, Any], consulta: str, leccion_actual: str | None
) -> list[dict[str, Any]]:
    """Hasta tres lecciones relacionadas con la consulta, la más probable primero.

    Primero la que nombra la consulta y la lección desde la que se pregunta; después, las que
    comparten más palabras con la consulta en su título, concepto o resumen.
    """
    elegidas: list[dict[str, Any]] = []
    nombrada = _leccion_nombrada(curso, consulta)
    actual = next((item for item in curso["lecciones"] if item["id"] == leccion_actual), None)
    for leccion in (nombrada, actual):
        if leccion and leccion not in elegidas:
            elegidas.append(leccion)

    palabras = {
        re.sub(r"e?s$", "", palabra)
        for palabra in re.findall(r"[a-zñ0-9_]+", consulta)
        if len(palabra) > 3 and palabra not in PALABRAS_VACIAS
    }
    if palabras:
        puntuadas = []
        for leccion in curso["lecciones"]:
            texto = normalizar(f"{leccion['titulo']} {leccion['concepto']} {leccion['resumen']}")
            puntos = sum(1 for palabra in palabras if palabra in texto)
            if puntos and leccion not in elegidas:
                puntuadas.append((puntos, leccion))
        puntuadas.sort(key=lambda par: -par[0])
        elegidas.extend(leccion for _puntos, leccion in puntuadas)
    return elegidas[:MAXIMO_FRAGMENTOS]


def _progreso(progreso: ProgresoAlumno | None) -> dict[str, list[str]] | None:
    return progreso.model_dump() if progreso else None


def _salida(curso: dict[str, Any], respuesta_ia: dict[str, Any]) -> SalidaMensaje:
    """La respuesta del agente para el frontend, con el título de la lección que propone."""
    leccion_id = respuesta_ia["leccion_id"]
    titulo = next(
        (leccion["titulo"] for leccion in curso["lecciones"] if leccion["id"] == leccion_id), None
    )
    return SalidaMensaje(
        texto=respuesta_ia["texto"],
        derivado=respuesta_ia["derivado"],
        leccion_id=leccion_id,
        leccion_titulo=titulo,
        redactado_por_ia=True,
    )


def mensaje_proactivo(
    curso_id: str,
    leccion_id: str,
    personalidad: Personalidad,
    tratamiento: Tratamiento,
    es_menor: bool = False,
    senal: str = "bloqueo",
    progreso: ProgresoAlumno | None = None,
) -> SalidaTexto:
    """Mensaje del mentor cuando detecta que el alumno se ha bloqueado en una lección."""
    curso = obtener_curso(curso_id)
    # Si no está, obtener_leccion da el error 404 de siempre.
    leccion = next(
        (item for item in curso["lecciones"] if item["id"] == leccion_id), None
    ) or obtener_leccion(curso_id, leccion_id)
    respuesta_ia = agentes.responder_mentor(
        curso=curso,
        consulta=None,
        senal=senal,
        fragmentos=[agentes.fragmento(curso, leccion, _progreso(progreso))],
        progreso=_progreso(progreso),
        historial=[],
        es_menor=es_menor,
        personalidad=personalidad,
        tratamiento=tratamiento,
    )
    if respuesta_ia:
        return SalidaTexto(texto=respuesta_ia["texto"])
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
    es_menor: bool = False,
    historial: list[MensajeAnterior] | None = None,
    progreso: ProgresoAlumno | None = None,
    nombres: list[str] | None = None,
) -> SalidaMensaje:
    """Respuesta a una consulta del alumno.

    `nombres` son el nombre y los apellidos del alumno con sesión: no llegan a la IA.

    Con IA, el mentor responde con las lecciones relacionadas, el índice del curso, el progreso
    del alumno y la conversación anterior. Sin IA, resume la lección de la que habla.
    """
    f = frases(personalidad, tratamiento)
    curso = obtener_curso(curso_id or CURSO_POR_DEFECTO)
    consulta = normalizar(texto)
    respuesta_ia = agentes.responder_mentor(
        curso=curso,
        consulta=texto,
        senal=None,
        fragmentos=[
            agentes.fragmento(curso, leccion, _progreso(progreso))
            for leccion in _lecciones_relevantes(curso, consulta, leccion_id)
        ],
        progreso=_progreso(progreso),
        historial=[(mensaje.autor, mensaje.texto) for mensaje in historial or []],
        es_menor=es_menor,
        personalidad=personalidad,
        tratamiento=tratamiento,
        nombres=nombres,
    )
    if respuesta_ia:
        return _salida(curso, respuesta_ia)

    leccion = _leccion_nombrada(curso, consulta) or next(
        (leccion for leccion in curso["lecciones"] if leccion["id"] == leccion_id), None
    )
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

    De momento solo confirma al alumno. La petición se guardará en la tabla
    `derivaciones` (migración 003), con motivo "alumno" y estado "pendiente", y
    como evento `derivacion_tutor`; para eso falta saber qué alumno la pide
    (inicio de sesión).
    """
    return SalidaTexto(texto="He avisado a tu tutor. Te responderá lo antes posible.")
