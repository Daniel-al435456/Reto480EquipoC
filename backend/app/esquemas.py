"""Esquemas de entrada y salida de la API.

Son los contratos que ven y producen las rutas (Pydantic). No confundir con el
esquema de la base de datos, que vive en `backend/migraciones/`.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
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
    consentimiento_familia_en: datetime | None = Field(
        default=None, description="Cuándo dio la familia su consentimiento, si hizo falta"
    )
    creado_en: datetime = Field(description="Cuándo se creó la cuenta")


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


# ---------------------------------------------------------------------------
# Progreso del alumno (issue #60): matrícula, test inicial, dominio, sesiones de estudio y eventos.
# Nada de esto identifica al alumno: se guarda con su alumno_id, nunca con su identidad.
# ---------------------------------------------------------------------------

#: Identificador de contenido, como el dominio `slug` de la base de datos.
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)]


class Progreso(EsquemaApi):
    """Progreso del alumno en un curso, con la forma que usa el estado del frontend.

    `dominio` y `dominioTest` tienen una entrada por lección dominada: lo que usa el itinerario
    y lo que dijo el test. Son distintos cuando el alumno elige estudiar igualmente una lección.
    """

    curso_id: str | None = Field(description="Curso del progreso; null si no está en ninguno")
    test_hecho: bool
    dominio_test: dict[str, bool]
    dominio: dict[str, bool]
    completadas: list[str] = Field(
        description="Lecciones completadas, en el orden en que lo fueron"
    )


class EntradaResultadoTest(EsquemaApi):
    """Resultado del test inicial: las lecciones que domina, como lo devuelve la evaluación."""

    dominio: dict[Slug, bool] = Field(max_length=500)


class EntradaDominio(EsquemaApi):
    """Estudiar igualmente una lección que el test dio por dominada (true) o volver a saltarla."""

    estudiar: bool


class EntradaSesionEstudio(EsquemaApi):
    """Sesión de estudio que empieza el alumno, con sus lecciones en orden."""

    curso_id: Slug
    minutos: Literal[5, 10, 20] = Field(description="Tiempo que eligió el alumno (H4)")
    audio: bool
    lecciones: list[Slug] = Field(min_length=1, max_length=100)


class SalidaSesionEstudio(EsquemaApi):
    id: int


class EntradaFinSesion(EsquemaApi):
    estado: Literal["completada", "abandonada"]


#: Eventos de aprendizaje que se guardan. No están los de la cuenta (alta, contraseña, inicio y
#: cierre de sesión, perfil...), que no van a `eventos` (migración 001), ni `derivacion_tutor`, que
#: lo escribe el backend junto con su fila de `derivaciones` (migración 003).
TipoEvento = Literal[
    "curso_abierto",
    "test_completado",
    "leccion_elegida",
    "sesion_iniciada",
    "video_iniciado",
    "contenido_completado",
    "actividad_respondida",
    "mentor_proactivo",
    "leccion_completada",
    "sesion_completada",
    "sesion_abandonada",
    "pregunta_mentor",
]


class DetallesEvento(EsquemaApi):
    """Lo que puede acompañar a un evento, cada dato con su tipo.

    No admite otros datos ni texto libre, que podría llevar datos personales: el texto que se
    admite es un identificador de curso, que el backend comprueba que existe, o un valor de una
    lista cerrada. La lección y la pregunta van fuera, en `leccionId` y `preguntaId`.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    curso_id: Slug | None = None
    #: Tipo del paso de la sesión que se ha completado.
    formato: Literal["video", "lectura", "resumen"] | None = None
    #: Señal del detector que ha hecho intervenir al mentor. Se añaden aquí las nuevas.
    senal: Literal["fallos_repetidos"] | None = None
    minutos: Literal[5, 10, 20] | None = None
    paso: int | None = Field(default=None, ge=0, le=200)
    pasos: int | None = Field(default=None, ge=0, le=200)
    aciertos: int | None = Field(default=None, ge=0, le=100)
    total: int | None = Field(default=None, ge=0, le=100)
    audio: bool | None = None
    solo_actividades: bool | None = None
    repaso: bool | None = None
    correcta: bool | None = None


class EntradaEvento(EsquemaApi):
    tipo: TipoEvento
    leccion_id: Slug | None = None
    pregunta_id: Slug | None = Field(default=None, description="La actividad o pregunta respondida")
    valor: float | None = None
    detalles: DetallesEvento = Field(default_factory=DetallesEvento)

    @model_validator(mode="after")
    def _sesion_de_estudio(self) -> EntradaEvento:
        """`sesion_iniciada` es el inicio de una sesión de estudio, con su curso y sus minutos.

        El frontend usa el mismo nombre al iniciar sesión en la cuenta, sin datos: ese evento es de
        la cuenta y no se guarda.
        """
        if self.tipo == "sesion_iniciada" and (
            self.detalles.curso_id is None or self.detalles.minutos is None
        ):
            raise ValueError("sesion_iniciada necesita el curso y los minutos de la sesión")
        return self
