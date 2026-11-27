"""Esquemas de entrada y salida de la API.

Son los contratos que ven y producen las rutas (Pydantic). No confundir con el
esquema de la base de datos, que vive en `backend/migraciones/`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class SalidaSalud(BaseModel):
    """Respuesta de `GET /salud`: informa del estado, nunca de la configuración."""

    estado: Literal["ok"] = Field(description="Si el servicio está en marcha")
    servicio: str = Field(description="Nombre del servicio")
    version: str = Field(description="Versión del código desplegado")


# ---------------------------------------------------------------------------
# Contrato con el frontend (frontend/README.md, "Contrato de la API").
# En JSON los campos van en camelCase (`leccionId`, `esMenor`), como los usa el
# frontend; en Python, en snake_case. El alias se genera solo.
# ---------------------------------------------------------------------------

Personalidad = Literal["amable", "motivador", "gracioso", "estricto"]
Tratamiento = Literal["femenino", "masculino", "neutro"]


class EsquemaApi(BaseModel):
    """Base de los esquemas del contrato: camelCase en JSON y snake_case en Python."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ContextoAlumno(EsquemaApi):
    """Lo único del alumno que acompaña a una petición (SPEC §6): nunca su identidad."""

    es_menor: bool = Field(default=False, description="Si el alumno es menor de edad")
    personalidad: Personalidad = Field(default="amable", description="Carácter del mentor")
    tratamiento: Tratamiento = Field(default="neutro", description="Cómo se dirige al alumno")


class CursoResumen(EsquemaApi):
    id: str
    titulo: str
    descripcion: str
    nivel: str
    numero_lecciones: int


class SalidaCursos(EsquemaApi):
    """Respuesta de `GET /api/cursos`."""

    cursos: list[CursoResumen]


class ActividadContenido(EsquemaApi):
    """Actividad incluida en el contenido de una lección."""

    id: str
    tipo: Literal["vf", "escrita"]
    enunciado: str
    correcta: bool | None = None
    explicacion: str | None = None
    palabras_clave: list[str] | None = None
    solucion: str | None = None


class LeccionContenido(EsquemaApi):
    """Contenido completo de una lección, sin datos del test inicial."""

    id: str
    titulo: str
    concepto: str
    youtube_id: str
    inicio_s: int = Field(default=0, description="Segundo del vídeo en el que empieza la lección")
    fin_s: int | None = Field(
        default=None, description="Segundo en el que termina; sin él, llega al final del vídeo"
    )
    duracion_video: int = Field(description="Minutos de vídeo de la lección, redondeados arriba")
    duracion_lectura: int
    descripcion: str
    lectura: list[str]
    resumen: str
    actividades: list[ActividadContenido]


class SalidaCursoLecciones(EsquemaApi):
    """Respuesta de `GET /api/cursos/{curso_id}/lecciones`."""

    id: str
    titulo: str
    descripcion: str
    nivel: str
    lecciones: list[LeccionContenido]


class PreguntaTest(EsquemaApi):
    """Pregunta del test inicial, sin la respuesta correcta: la corrige el servidor."""

    id: str
    leccion_id: str
    enunciado: str
    opciones: list[str]


class SalidaTest(EsquemaApi):
    """Respuesta de `GET /api/cursos/{curso_id}/test`."""

    preguntas: list[PreguntaTest]


class EntradaEvaluacion(ContextoAlumno):
    """Respuestas del test: identificador de la pregunta → índice de la opción elegida."""

    respuestas: dict[str, int]


class SalidaEvaluacion(EsquemaApi):
    """Lecciones que el alumno domina y explicación de su itinerario."""

    dominio: dict[str, bool]
    mensaje: str
    redactado_por_ia: bool = Field(
        default=False, description="Si el mensaje lo ha redactado la IA o es una plantilla"
    )


class EntradaCorreccion(EsquemaApi):
    actividad_id: str
    texto: str = Field(max_length=2000)


class SalidaCorreccion(EsquemaApi):
    correcta: bool
    solucion: str


class EntradaProactivo(ContextoAlumno):
    """Señal del detector de bloqueo o abandono (SPEC §7, agente Mentor)."""

    curso_id: str
    leccion_id: str
    senal: Literal["bloqueo", "abandono"] = "bloqueo"


class EntradaMensaje(ContextoAlumno):
    """Consulta del alumno al mentor. `leccion_id` es la lección de la que habla, si la hay."""

    curso_id: str | None = None
    leccion_id: str | None = None
    texto: str = Field(min_length=1, max_length=1000)


class EntradaDerivacion(EsquemaApi):
    curso_id: str | None = None
    leccion_id: str | None = None


class SalidaTexto(EsquemaApi):
    texto: str


class SalidaMensaje(EsquemaApi):
    texto: str
    derivado: bool = Field(default=False, description="Si la conversación pasa a un tutor")
