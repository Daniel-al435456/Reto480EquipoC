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
| Uso responsable de la IA | Pendiente de aprobación: [agentes, modelo y coste](propuestas/README.md#p1-agentes-de-ia) · [datos y privacidad](propuestas/README.md#p3-arquitectura-detallada-modelo-de-datos-y-privacidad) |
| Originalidad y creatividad | [Idea original](SPEC.md#10-idea-original) |
| Demo y proceso | [Bitácora](BITACORA.md) · [Guía de contribución](CONTRIBUTING.md) |
| Reacción ante los cambios | [Bitácora: problemas y soluciones](BITACORA.md#problemas-y-soluciones) |

---

## Documentación

| Documento | Contenido |
|---|---|
| [SPEC.md](SPEC.md) | Especificación del paquete de diseño (algunos apartados pendientes de aprobación) |
| [docs/decisiones.md](docs/decisiones.md) | Decisiones de stack, modelo de IA y producto |
| [propuestas/](propuestas/README.md) | Propuestas pendientes de votación del equipo: agentes de IA, historias, datos y privacidad, contenido, decisión de producto y pantallas nuevas |
| [BITACORA.md](BITACORA.md) | Registro de sesiones, tareas y problemas |
| [Tablero de tareas](https://github.com/users/andreaperibaz/projects/1) | Backlog del proyecto en GitHub Projects: qué falta, quién se encarga y en qué estado está |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Roles, ramas, pull requests y definición de terminado |
| [AGENTS.md](AGENTS.md) | Convenciones de código y commits para el equipo y sus asistentes de IA |
| [frontend/](frontend/README.md) | Aplicación del alumno (React PWA): puesta en marcha, pantallas y estructura |
| [docs/img/](docs/img/README.md) | Bocetos y diagramas de la sesión de diseño |

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite, PWA |
| Backend | Python 3.12, FastAPI |
| Base de datos | PostgreSQL |
| IA | Pendiente de decisión ([propuesta P1](propuestas/README.md#p1-agentes-de-ia)) |

Justificación en [docs/decisiones.md](docs/decisiones.md).

---

## Equipo

| Nombre | Rol |
|---|---|
| Daniel | Backend (Python + FastAPI) |
| Jeremy | Diseño (interfaz y experiencia móvil) |
| Talia | Base de datos (PostgreSQL) |
| Andrea | Frontend (React PWA) |

## Calendario

| Fecha | Hito |
|---|---|
| Lunes 23/11 | Sesión 1: análisis del caso, preguntas al cliente y diseño |
| 24–29/11 | Semana intermedia (opcional) |
| Lunes 30/11 | Sesión 2: construcción, entregables y demo |
