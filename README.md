<div align="center">

# Reto 480 Academy · Equipo C

**Prototipo de aprendizaje adaptativo**

Hackadō · Learn by dō

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-lightgrey)
![Frontend](https://img.shields.io/badge/frontend-React%20PWA-lightgrey)
![Backend](https://img.shields.io/badge/backend-Python%20%2B%20FastAPI-lightgrey)
![Base de datos](https://img.shields.io/badge/BD-PostgreSQL-lightgrey)

[Especificación](SPEC.md) · [Bitácora](BITACORA.md) · [Decisiones](docs/decisiones.md) · [Propuestas](propuestas/README.md) · [Contribución](CONTRIBUTING.md)

</div>

---

## Resumen

En 480 Academy todos los alumnos siguen el mismo itinerario, solo el 38 % de los vídeos se ve completo y no existe información sobre el aprendizaje entre el inicio del vídeo y el examen final.

El prototipo aborda estos problemas con tres componentes:

| Componente | Función |
|---|---|
| **Test inicial adaptativo** | Identifica los conceptos que el alumno ya domina. Esos contenidos se omiten de su itinerario. |
| **Modos de estudio** | El alumno elige cómo estudiar según su situación: sin audio si no puede escuchar, o adaptado al tiempo que tiene. |
| **Mentor proactivo** | Detecta señales de bloqueo o pérdida de interés e interviene sin esperar a que el alumno pregunte. Cuando es necesario, deriva el caso a un tutor humano. |

---

## Criterios de evaluación

| Criterio | Documentación |
|---|---|
| Valor para el alumno | [Respuesta a los cuatro problemas](SPEC.md#3-respuesta-a-los-cuatro-problemas) · [Historias de usuario](SPEC.md#4-historias-de-usuario) |
| Calidad técnica y claridad de la arquitectura | [Arquitectura](SPEC.md#5-arquitectura) · [Modelo de datos](SPEC.md#6-modelo-de-datos-y-flujo-hacia-la-ia) · [Decisiones](docs/decisiones.md) |
| Uso responsable de la IA | [Agentes de IA](SPEC.md#7-agentes-de-ia) · [Datos y privacidad](SPEC.md#6-modelo-de-datos-y-flujo-hacia-la-ia) · [Coste](SPEC.md#9-coste-de-ia-por-alumno-y-mes) · [Cómo usamos la IA para programar](docs/registro-harness.md) |
| Originalidad y creatividad | [Idea original](SPEC.md#10-idea-original) |
| Demo y proceso | [Bitácora](BITACORA.md) · [Guía de contribución](CONTRIBUTING.md) |
| Reacción ante los cambios | [Bitácora: problemas y soluciones](BITACORA.md#problemas-y-soluciones) |

---

## Documentación

| Documento | Contenido |
|---|---|
| [SPEC.md](SPEC.md) | Especificación del paquete de diseño |
| [docs/decisiones.md](docs/decisiones.md) | Decisiones de stack, modelo de IA y producto |
| [propuestas/](propuestas/README.md) | Propuestas del equipo y su estado, con el detalle de lo aprobado |
| [BITACORA.md](BITACORA.md) | Registro de sesiones, tareas y problemas |
| [Tablero de tareas](https://github.com/users/Daniel-al435456/projects/1) | Backlog del proyecto en GitHub Projects, vinculado al repositorio: qué falta, quién se encarga y en qué estado está |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Roles, ramas, pull requests y definición de terminado |
| [AGENTS.md](AGENTS.md) | Instrucciones para los asistentes de IA de desarrollo: comandos, reglas, convenciones y límites |
| [docs/despliegue.md](docs/despliegue.md) | Cómo publicar la app con cuentas propias en Supabase, Render y Netlify |
| [docs/ia.md](docs/ia.md) | Cómo funciona la IA en la app: agentes, datos que recibe, configuración y pruebas |
| [docs/registro-harness.md](docs/registro-harness.md) | Fallos de los asistentes de IA y qué cambiamos en el proyecto para que no se repitan |
| [frontend/](frontend/README.md) | Aplicación del alumno (React PWA): puesta en marcha, pantallas y estructura |
| [docs/img/](docs/img/README.md) | Bocetos y diagramas de la sesión de diseño |

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite, PWA |
| Backend | Python 3.12, FastAPI |
| Base de datos | PostgreSQL |
| IA | Claude para preparar el contenido y Groq para el diagnóstico y el mentor ([propuesta P1](propuestas/README.md#p1-agentes-de-ia)) |

Justificación en [docs/decisiones.md](docs/decisiones.md).

---

## Equipo

| Nombre | Rol |
|---|---|
| Daniel | Backend (Python + FastAPI) |
| Jeremy | Diseño (interfaz y experiencia móvil) |
| Talia | Base de datos (PostgreSQL) |
| Andrea | Frontend (React PWA) |

El 24/11 nos repartimos las tareas de otra forma: Daniel, IA y material del curso; Jeremy, base de datos; Talia, backend; Andrea, frontend. Es un reparto orientativo y en la práctica participamos todos en todo ([Bitácora, sesión 2](BITACORA.md#sesión-2--martes-24112026)).

## Calendario

| Fecha | Hito |
|---|---|
| Lunes 23/11 | Sesión 1: análisis del caso, preguntas al cliente y diseño |
| 24–29/11 | Semana intermedia (opcional) |
| Lunes 30/11 | Sesión 2: construcción, entregables y demo |
