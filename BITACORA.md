<sub>[Inicio](README.md) · [Especificación](SPEC.md) · **Bitácora** · [Decisiones](docs/decisiones.md) · [Privacidad](docs/privacidad.md) · [Propuestas](propuestas/README.md) · [Contribución](CONTRIBUTING.md)</sub>

# Bitácora

Registro de las sesiones de trabajo del Equipo C: actividades, coordinación, reparto de tareas, problemas y soluciones. Responsable: Andrea. Las entradas se ordenan de la más reciente a la más antigua.

---

## Sesión 1 · Lunes 23/11/2026

**Asistentes:** Daniel, Jeremy, Talia, Andrea

### Actividades

- Presentación del equipo. Daniel, Jeremy y Talia estudian Ingeniería Informática en la UJI; Andrea procede de FP.
- Lluvia de ideas sobre los cuatro problemas planteados por 480 Academy.
- Reunión con el cliente: preguntas sobre el caso y presentación de la propuesta.

### Ideas iniciales

- Un test inicial que detecte lo que el alumno ya sabe para poder omitirlo.
- Modos de uso según el contexto: sin audio (por ejemplo, en el autobús) o con poco tiempo disponible.
- Una IA que actúe como mentor y que, en lugar de esperar preguntas, intervenga cuando el alumno se bloquea o pierde interés.
- Adaptar el material a preferencias visuales o auditivas. Más tarde descartamos esta idea (véase "Problemas y soluciones").

### Información obtenida del cliente

En la ronda de preguntas, el cliente nos indicó que:
- Lo prioritario es que los alumnos aprendan.
- El material puede acortarse; los vídeos pueden dividirse por secciones.
- El público objetivo es muy amplio.
- No hay un presupuesto máximo ni mínimo para la IA; se valorará la propuesta más interesante.
- Los exámenes actuales duran entre 15 y 20 minutos.
- La suscripción da acceso a todos los cursos.
- Otros equipos han propuesto certificados o logros al completar un curso.

En la presentación de la propuesta:
- El cliente valoró positivamente nuestra propuesta.
- Nos sugirió buscar una alternativa a Flutter más adecuada a nuestras necesidades.

### Reparto de tareas

| Nombre | Tareas |
|---|---|
| Daniel | Gestión del repositorio |
| Talia | Exposición y preguntas al cliente |
| Jeremy | Sin tareas asignadas en esta sesión, por coincidir con otra presentación |
| Andrea | Bitácora |

### Problemas y soluciones

| Problema | Solución |
|---|---|
| Habíamos elegido Flutter para el frontend, pero el cliente sugirió otra opción: Flutter Web carga demasiado para conexiones 4G. | Adoptamos React como PWA ([Decisiones §1](docs/decisiones.md#1-stack-tecnológico)). |
| La primera versión de la especificación planteaba que la IA reemplazaría a los tutores, cuando el cliente pide mejorar su trabajo. | Reformulamos el planteamiento: el mentor asume el seguimiento diario y deriva a un tutor humano cuando es necesario. |
| La adaptación por estilos de aprendizaje carece de respaldo científico, y la prioridad del cliente es el aprendizaje. | La sustituimos por una adaptación basada en conocimiento previo y contexto. |
| Otros equipos ya proponían certificados como incentivo. | Los dejamos fuera de alcance y desarrollamos una propuesta propia: el modo contexto. |
| El panel para tutores no encaja con la petición de centrarse en el alumno. | Lo planteamos como evolución futura, fuera del prototipo. |

### Roles técnicos acordados

| Nombre | Área |
|---|---|
| Daniel | Backend (Python + FastAPI) |
| Jeremy | Diseño (interfaz y experiencia móvil) |
| Talia | Base de datos (PostgreSQL) |
| Andrea | Frontend (React PWA) |

### Herramientas de IA utilizadas

| Herramienta | Modelo | Uso |
|---|---|---|
| Claude (claude.ai) | Claude Opus 5.5 | Organización del repositorio, redacción de la especificación, las decisiones, la política de privacidad y la estimación de coste y de esta bitácora |

---

<!-- Plantilla para nuevas entradas

## Sesión N · DD/MM/AAAA

**Asistentes:**

### Actividades
### Reparto de tareas
### Problemas y soluciones
### Cambios del cliente
### Herramientas de IA utilizadas

-->
