<sub>[Inicio](README.md) · [Especificación](SPEC.md) · **Bitácora** · [Decisiones](docs/decisiones.md) · [Propuestas](propuestas/README.md) · [Contribución](CONTRIBUTING.md)</sub>

# Bitácora

Registro de las sesiones de trabajo del Equipo C: actividades, coordinación, reparto de tareas, problemas y soluciones. Responsable: Andrea. Las entradas se ordenan de la más reciente a la más antigua.

---

## Trabajo entre sesiones · Jueves 26/11/2026

**Participan:** Daniel, Jeremy, Andrea

### Actividades

| Nombre | Actividad |
|---|---|
| Andrea | Rutas del backend que usa el frontend (catálogo, test inicial y evaluación, corrección de respuestas escritas y mentor, de momento sin IA ni base de datos) y conexión de la app con el backend. Fusionada en [#39](https://github.com/Daniel-al435456/Reto480EquipoC/pull/39). |
| Daniel | Lecciones servidas desde el backend: la app pide el curso a la API en lugar de usar los datos simulados, con sus pruebas. Fusionada en [#42](https://github.com/Daniel-al435456/Reto480EquipoC/pull/42). |
| Jeremy | Script de carga del curso de ejemplo en la base de datos (`cargar_curso.sh` y `cargar_curso.sql`): se puede ejecutar varias veces sin duplicar nada, actualiza lo que cambia y conserva los datos de los alumnos. Incluye pruebas de carga. Fusionada en [#43](https://github.com/Daniel-al435456/Reto480EquipoC/pull/43). |
| Jeremy | Lectura del curso desde la base de datos: con `DATABASE_URL`, el backend saca el curso de PostgreSQL con el mismo formato que el JSON, y sin ella sigue leyendo el JSON. Si la base de datos falla, la app usa su copia local. También corrige la carga de ficheros de más de 128 KB y añade las pruebas de la base de datos a la comprobación automática de cada pull request. Fusionada el 27/11 en [#45](https://github.com/Daniel-al435456/Reto480EquipoC/pull/45). |

### Acuerdos

- **Un solo tablero de tareas:** a partir de ahora usamos el tablero [Reto480EquipoC](https://github.com/users/Daniel-al435456/projects/1), vinculado al repositorio. Los demás dejan de usarse; el [tablero anterior](https://github.com/users/andreaperibaz/projects/1) se conserva solo como consulta y no se actualiza.

### Problemas y soluciones

| Problema | Solución |
|---|---|
| Había varios tableros de tareas y cada uno se actualizaba por separado, así que no coincidían. | Nos quedamos con uno solo, vinculado al repositorio, para que se vea desde las issues y desde la pestaña Projects. |
| La carga del curso fallaba con ficheros de más de 128 KB, porque el JSON se pasaba a `psql` como argumento y Linux no lo admite. Con las transcripciones de los vídeos, el curso supera ese tamaño. | `psql` lee el fichero directamente, y una prueba carga un curso de más de 128 KB. |

### Herramientas de IA utilizadas

| Herramienta | Modelo | Uso |
|---|---|---|
| Claude (claude.ai) | Claude Opus 5.5 | Andrea: rutas del backend, conexión de la app con el backend y redacción de esta entrada |
| Claude | Claude Opus 5.5 | Jeremy: script de carga del curso y lectura del curso desde la base de datos |
| GitHub Copilot (VS Code) | Sin indicar | Daniel: lecciones servidas desde el backend |

---

## Trabajo entre sesiones · Miércoles 25/11/2026

**Participan:** Talia, Jeremy, Andrea

### Actividades

| Nombre | Actividad |
|---|---|
| Talia | Estructura base del backend en `backend/`: aplicación FastAPI con la ruta de salud, formato común de errores y configuración leída del entorno, pruebas por endpoint y de arquitectura, y comprobación automática de formato, estilo y pruebas en cada pull request. Fusionada en [#34](https://github.com/Daniel-al435456/Reto480EquipoC/pull/34). |
| Jeremy | Esquema inicial de la base de datos en `backend/migraciones/`: las 18 tablas del modelo de P3 adaptadas a la cuenta de usuario, la fecha de nacimiento y el mentor; scripts para aplicar las migraciones y probarlas, con 33 pruebas; y documentación del modelo actualizada. Fusionada en [#35](https://github.com/Daniel-al435456/Reto480EquipoC/pull/35). |
| Andrea | Mejoras del frontend: cuenta de usuario con alta en cuatro pasos, páginas legales (borradores), perfil por secciones, mentor con forma de pato o pata (opcional), personalidad y trato del mentor a elegir, y nueva pantalla de bienvenida. |
| Andrea | Traslado a SPEC.md y docs/decisiones.md de las propuestas aprobadas el 24/11, con lo que el paquete de diseño queda completo. |
| Andrea | Harness de desarrollo con IA: instrucciones comunes para los asistentes (AGENTS.md), pruebas automáticas del frontend, comprobación en cada pull request y [registro de fallos](docs/registro-harness.md). |

### Acuerdos

- **Nomenclatura:** llamamos "mentor" a la IA y "tutor" a la persona de la academia. Lo aplicamos en la interfaz, en el código y en la documentación.

### Cambios

| Cambio | Motivo |
|---|---|
| **Fecha de nacimiento en lugar del tramo de edad.** El alumno indica su fecha de nacimiento y la app calcula el tramo cada vez. | Con solo el tramo, un alumno de 17 años seguiría como menor después de cumplir 18. Con la fecha, el tramo cambia solo al cumplir 14 o 18 años. El modelo de datos aprobado ya guardaba la fecha en `Identidad`, y a la IA sigue llegando solo si el alumno es menor o no. |
| **Datos de la cuenta que no se cambian desde la app.** El correo, la empresa, la fecha de nacimiento y el consentimiento de la familia se fijan en el alta y solo puede corregirlos la academia. | El correo es el usuario para iniciar sesión y la empresa relaciona al alumno con la formación que paga. Si la edad pudiera cambiarse, un menor podría saltarse las protecciones. |
| **Personalidad y trato del mentor.** El alumno elige si el mentor es amable, motivador, gracioso o estricto, y si se dirige a él en femenino, en masculino o de forma neutra. | Para que el alumno se sienta cómodo con el mentor. Solo llegan a la IA la personalidad y el trato, sin datos personales. |

### Problemas y soluciones

| Problema | Solución |
|---|---|
| Desde el perfil se podían cambiar la empresa y la edad, con lo que un menor de 14 años podía saltarse el consentimiento. | Los fijamos en el alta y añadimos pruebas automáticas que lo comprueban. |
| Si el alumno escribe a mano el nombre de su empresa, puede no coincidir con el de la base de datos (erratas, mayúsculas). Una lista de empresas no sirve, porque mostraría qué otras empresas son clientes. | Pendiente de decidir. Se plantea que cada empresa reciba un código o enlace de invitación que asigne la empresa al registrarse, con una solicitud a la academia como alternativa para quien no lo tenga. |

### Herramientas de IA utilizadas

| Herramienta | Modelo | Uso |
|---|---|---|
| Claude (claude.ai) | Claude Opus 5.5 | Andrea: desarrollo del frontend, traslado de las propuestas a la especificación, harness de desarrollo con IA y redacción de esta entrada |

---

## Sesión 2 · Martes 24/11/2026

**Asistentes:** Daniel, Jeremy, Talia, Andrea

### Actividades

- Estructura base del frontend en `frontend/`: aplicación React instalable como PWA, con las pantallas del boceto, el estilo de los prototipos y respuestas simuladas mientras se decide la IA. Pendiente de revisión en una pull request.
- Propuesta P6 para votar las pantallas nuevas de los prototipos: bienvenida, alias anónimo y perfil.
- Tablero de tareas en GitHub Projects ([tablero anterior](https://github.com/users/andreaperibaz/projects/1), solo de consulta; desde el 26/11 se usa el [tablero del repositorio](https://github.com/users/Daniel-al435456/projects/1)) con el backlog del proyecto: 15 tareas creadas como issues en el repositorio, cada una con su etiqueta y sus dependencias.
- Reunión del equipo, en la que participamos los cuatro, para tratar las propuestas P1 a P6 y repartirnos las tareas.

### Acuerdos de la reunión

| Propuesta | Resultado |
|---|---|
| [P1. Agentes de IA](propuestas/README.md#p1-agentes-de-ia) | Aprobada con cambios. Preparador: Claude, antes de la demo, una vez por vídeo. Diagnóstico: Groq, con plantilla fija de respaldo. Mentor: Groq, con derivación al tutor humano de respaldo. |
| [P2. Historias de usuario](propuestas/README.md#p2-historias-de-usuario) | Aprobada. Se añade el acceso al tutor desde cualquier pantalla mediante un símbolo de IA. |
| [P3. Arquitectura y privacidad](propuestas/README.md#p3-arquitectura-detallada-modelo-de-datos-y-privacidad) | Aprobada. Hay que actualizar el esquema con los cambios de P1 y añadir material sobre la base de datos. |
| [P4. Contenido del curso](propuestas/README.md#p4-contenido-del-curso-de-muestra) | Aprobada. Se empleará como ejemplo un curso de Python. |
| [P5. Decisión de producto](propuestas/README.md#p5-decisión-de-producto) | Aprobada. Se añaden mapas conceptuales y tarjetas para reforzar el aprendizaje. |
| [P6. Pantallas de bienvenida, alias y perfil](propuestas/README.md#p6-pantallas-de-bienvenida-alias-y-perfil) | Aprobada. |

Las propuestas quedan aprobadas tal como están escritas, por lo que se retiran sus tablas de votación.

### Reparto de tareas

| Nombre | Tareas |
|---|---|
| Daniel | IA y material del curso |
| Jeremy | Base de datos |
| Talia | Backend |
| Andrea | Frontend, tablero de tareas y backlog, bitácora |

Es un reparto orientativo, para tener un esquema general de quién se ocupa de cada área; en la práctica participamos todos en todo. Sustituye a las áreas técnicas acordadas en la sesión 1.

### Problemas y soluciones

| Problema | Solución |
|---|---|
| No teníamos una forma común de saber qué tareas quedaban ni quién se encargaba de cada una. | Creamos un tablero en GitHub Projects con todas las tareas pendientes. Las tareas se asignan en equipo y cada tarjeta avanza por las columnas a medida que se trabaja. |

### Cambios

| Cambio | Motivo |
|---|---|
| **Opción de IA.** La propuesta inicial usaba modelos de pago de Claude para los tres agentes. Ahora el Preparador usa Claude y el Diagnóstico y el Mentor usan Groq. | Queríamos opciones gratuitas para el prototipo. El Preparador se ejecuta una sola vez por vídeo y antes de la demo, así que priorizamos la calidad del contenido y no recibe datos de alumnos. El Diagnóstico y el Mentor necesitan responder al momento: Groq responde en menos de un segundo, es gratuito sin tarjeta y su contrato establece que no entrena con nuestros datos. Como el plan gratuito tiene límites, ambos tienen respaldo: plantilla fija y derivación al tutor. Descartamos Google Gemini gratuito porque sus condiciones exigen usuarios de 18 años o más y prohíben las aplicaciones que probablemente usen menores. |
| **Personalización del aprendizaje.** En un primer momento optamos por adaptar el material a estilos de aprendizaje (visual, auditivo…). Ahora personalizamos según lo que el alumno ya sabe (test inicial y mapa de dominio) y según su contexto (tiempo y audio). | Tras investigar, vimos que adaptar el formato al estilo preferido no tiene respaldo empírico como mejora del aprendizaje. Sí lo tienen evitar repetir lo que el alumno ya domina, comprobar lo aprendido tras cada bloque y repasar de forma espaciada. El formato se adapta solo por motivos prácticos, como no poder escuchar audio. |

### Herramientas de IA utilizadas

| Herramienta | Modelo | Uso |
|---|---|---|
| Claude (claude.ai) | Claude Opus 5.5 | Generación de la estructura del frontend, prototipos de pantallas, redacción del backlog y script para crear los issues, búsqueda de opciones de IA gratuitas y actualización de las propuestas con los acuerdos de la reunión |

---

## Sesión 1 · Lunes 23/11/2026

**Asistentes:** Daniel, Jeremy, Talia, Andrea

### Actividades

- Presentación del equipo. Daniel, Jeremy y Talia estudian Ingeniería Informática en la UJI; Andrea procede de FP.
- Lluvia de ideas sobre los cuatro problemas planteados por 480 Academy.
- Reunión con el cliente: preguntas sobre el caso y presentación de la propuesta.

### Hoja de acuerdos

Comunicación por WhatsApp y repositorio en GitHub. Para la semana del 24 al 29, todos pueden trabajar entre semana por las mañanas.

**Qué creemos que le pasa a 480 Academy:** existe una falta de motivación en los alumnos por falta de incentivos, y la empresa necesita conocer realmente la experiencia de cada usuario y su aprendizaje.

**Preguntas preparadas para el cliente:**
- Qué prioridad tienen y qué esperan conseguir.
- Si hay un presupuesto máximo.
- Qué grado de libertad tenemos sobre el material.

![Hoja de acuerdos de la sesión 1](docs/img/hoja-acuerdos.jpg)

Páginas completas de la sesión: [hoja de acuerdos](docs/img/originales/hoja-acuerdos.jpg) · [flujo del alumno y respuesta a los problemas](docs/img/originales/flujo-y-respuestas.jpg) · [arquitectura](docs/img/originales/arquitectura.jpg).

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
| Talia | Contacto con el cliente |
| Jeremy | Sin tareas asignadas en esta sesión, por coincidir con otra presentación |
| Andrea | Bitácora |

### Problemas y soluciones

| Problema | Solución |
|---|---|
| Habíamos elegido Flutter para el frontend, pero el cliente sugirió otra opción: Flutter Web carga demasiado para conexiones 4G. | Adoptamos React como PWA ([Decisiones §1](docs/decisiones.md#1-stack-tecnológico)). |
| La primera versión de la especificación planteaba que la IA reemplazaría a los tutores, cuando el cliente pide mejorar su trabajo. | Reformulamos el planteamiento: el mentor asume el seguimiento diario y deriva a un tutor humano cuando es necesario. |
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
