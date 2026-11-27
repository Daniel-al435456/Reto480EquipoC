"""Esquemas de entrada y salida de la API.

Son los contratos que ven y producen las rutas (Pydantic). No confundir con el
esquema de la base de datos, que vive en `backend/migraciones/`.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
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
    """Contenido completo de una lección, sin datos del test inicial.

    Cada lección es un trozo de un vídeo: de `inicio_s` a `fin_s`, en segundos.
    """

    id: str
    video_id: str
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
    aviso: str | None = None
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


class EntradaCorreccion(ContextoAlumno):
    actividad_id: str
    texto: str = Field(max_length=2000)


class SalidaCorreccion(EsquemaApi):
    correcta: bool
    solucion: str
    comentario: str | None = Field(
        default=None, description="Explicación breve para el alumno, si la ha redactado la IA"
    )
    redactado_por_ia: bool | None = Field(
        default=None, description="True si la corrección la ha decidido la IA"
    )


class ProgresoAlumno(EsquemaApi):
    """Qué lecciones domina o ha completado el alumno: el mentor lo usa para orientarle.

    Solo identificadores de lecciones del curso, nada de la persona.
    """

    dominadas: list[str] = Field(default_factory=list, max_length=200)
    completadas: list[str] = Field(default_factory=list, max_length=200)


class MensajeAnterior(EsquemaApi):
    """Un mensaje anterior de la conversación, para que el mentor no pierda el hilo."""

    autor: Literal["alumno", "mentor"]
    texto: str = Field(max_length=1500)


class EntradaProactivo(ContextoAlumno):
    """Señal del detector de bloqueo o abandono (SPEC §7, agente Mentor)."""

    curso_id: str
    leccion_id: str
    senal: Literal["bloqueo", "abandono"] = "bloqueo"
    progreso: ProgresoAlumno | None = None


class EntradaMensaje(ContextoAlumno):
    """Consulta del alumno al mentor. `leccion_id` es la lección de la que habla, si la hay."""

    curso_id: str | None = None
    leccion_id: str | None = None
    texto: str = Field(min_length=1, max_length=1000)
    historial: list[MensajeAnterior] = Field(
        default_factory=list, max_length=12, description="Últimos mensajes de la conversación"
    )
    progreso: ProgresoAlumno | None = None


class EntradaDerivacion(EsquemaApi):
    curso_id: str | None = None
    leccion_id: str | None = None


class SalidaTexto(EsquemaApi):
    texto: str


class SalidaMensaje(EsquemaApi):
    texto: str
    derivado: bool = Field(default=False, description="Si la conversación pasa a un tutor")
    leccion_id: str | None = Field(
        default=None, description="Lección que el mentor propone abrir, si propone alguna"
    )
    leccion_titulo: str | None = Field(default=None, description="Título de esa lección")
    redactado_por_ia: bool = Field(
        default=False, description="Si la respuesta la ha redactado la IA o es una de respaldo"
    )


# ---------------------------------------------------------------------------
# Cuenta del alumno (issue #55). Son los únicos esquemas con datos personales: viajan entre la app
# y el backend, se guardan en `identidades` y nunca se envían a la IA (SPEC §6).
# ---------------------------------------------------------------------------

#: Texto obligatorio: sin espacios a los lados y con algo escrito.
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
#: Texto opcional: puede quedar vacío.
TextoOpcional = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
#: El mismo patrón que el frontend (api/cuenta.js, EMAIL_VALIDO) y que el CHECK de identidades.
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, to_lower=True, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    ),
]
#: La contraseña se recibe para calcular su hash y no se guarda nunca.
#: Sus reglas están en servicios/cuentas.py.
Contrasena = Annotated[str, StringConstraints(max_length=200)]


class AjustesAlumno(EsquemaApi):
    """Datos del alumno que no lo identifican: alias, modo anónimo y cómo quiere al mentor."""

    alias: Texto
    anonimo: bool = True
    mentor_ia: bool = Field(default=True, alias="mentorIA", description="Si usa el mentor con IA")
    personalidad_mentor: Personalidad = "amable"
    tratamiento: Tratamiento = "neutro"


class EntradaAlta(AjustesAlumno):
    """Alta completa, al terminar sus cuatro pasos: la cuenta solo se crea con todos los datos."""

    empresa: Texto
    nombre: Texto
    apellidos: Texto
    email: Email
    contrasena: Contrasena
    puesto: TextoOpcional = ""
    fecha_nacimiento: date
    consentimiento_familia: bool = Field(
        default=False, description="La familia ha dado su consentimiento (menores de 14 años)"
    )
    privacidad_aceptada: bool


class EntradaSesion(EsquemaApi):
    email: Email
    contrasena: Contrasena


class Perfil(AjustesAlumno):
    """Lo que el alumno ve de su cuenta. Nunca lleva la contraseña ni su hash."""

    empresa: str
    nombre: str
    apellidos: str
    email: str
    puesto: str
    fecha_nacimiento: date
    consentimiento_familia: datetime | None = Field(
        default=None, description="Cuándo dio la familia su consentimiento, si hizo falta"
    )
    creada_en: datetime


class SalidaSesion(EsquemaApi):
    """Token de la sesión, que la app envía en cada petición como `Authorization: Bearer ...`."""

    token: str
    perfil: Perfil


class EntradaPerfil(EsquemaApi):
    """Cambios del perfil.

    El correo, la empresa, la fecha de nacimiento y el consentimiento solo los corrige la
    academia: si llegan, se ignoran.
    """

    nombre: Texto | None = None
    apellidos: Texto | None = None
    puesto: TextoOpcional | None = None
    alias: Texto | None = None
    anonimo: bool | None = None
    mentor_ia: bool | None = Field(default=None, alias="mentorIA")
    personalidad_mentor: Personalidad | None = None
    tratamiento: Tratamiento | None = None


class EntradaContrasena(EsquemaApi):
    actual: Contrasena
    nueva: Contrasena


class EntradaEliminarCuenta(EsquemaApi):
    """Para eliminar la cuenta hay que escribir la contraseña: no se puede deshacer."""

    contrasena: Contrasena
