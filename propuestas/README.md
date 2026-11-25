<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](../docs/decisiones.md) · **Propuestas** · [Contribución](../CONTRIBUTING.md)</sub>

# Propuestas

Propuestas del equipo y su estado. Mientras una propuesta no se apruebe, no forma parte de la especificación. P1 a P6 se aprobaron en la reunión del 24/11/2026 ([Bitácora, sesión 2](../BITACORA.md#sesión-2--martes-24112026)); su contenido se ha trasladado a SPEC.md y a docs/decisiones.md.

**Cómo votar:** cada miembro edita la tabla de votación de la propuesta (icono del lápiz en GitHub) con su voto (a favor, en contra o abstención) y, si quiere, un comentario. Una propuesta se aprueba con mayoría. Al aprobarse, su contenido se traslada a SPEC.md y a docs/decisiones.md.

| # | Propuesta | Estado |
|---|---|---|
| P1 | [Agentes de IA, modelo y coste](#p1-agentes-de-ia) | Aprobada con cambios (24/11) |
| P2 | [Historias de usuario](#p2-historias-de-usuario) | Aprobada con un añadido (24/11) |
| P3 | [Arquitectura detallada, modelo de datos y privacidad](#p3-arquitectura-detallada-modelo-de-datos-y-privacidad) | Aprobada (24/11) |
| P4 | [Contenido del curso de muestra](#p4-contenido-del-curso-de-muestra) | Aprobada (24/11) |
| P5 | [Decisión de producto](#p5-decisión-de-producto) | Aprobada con un añadido (24/11) |
| P6 | [Pantallas de bienvenida, alias y perfil](#p6-pantallas-de-bienvenida-alias-y-perfil) | Aprobada (24/11) |

---

## P1. Agentes de IA

### Resumen

Tres agentes de IA; el resto del sistema funciona con reglas fijas, sin IA.

| Agente | Momento | Función | Modelo |
|---|---|---|---|
| **Preparador** ([ficha](agentes/preparador.md)) | Una vez por vídeo, antes de la demo y antes de que lo vea ningún alumno | A partir de la transcripción, divide el vídeo en fragmentos de unos 5 minutos y genera resumen, versión en texto para el modo sin audio, preguntas del test inicial y comprobaciones | Claude |
| **Diagnóstico** ([ficha](agentes/diagnostico.md)) | Al terminar el test inicial | Traduce la nota por concepto (calculada por el backend) a dominado / a repasar / nuevo y explica al alumno su itinerario | Groq (`gpt-oss-20b`), con plantilla fija de respaldo |
| **Mentor** ([ficha](agentes/mentor.md)) | Ante señales (fallos repetidos, abandono, inactividad) o cuando el alumno pregunta | Explica el concepto de otra forma, remite al minuto exacto del vídeo, anima y, si no basta, deriva a un tutor humano | Groq (`gpt-oss-120b`), con derivación al tutor humano de respaldo |

**Sin IA, a propósito:** el planificador de sesión (qué contenido toca) y el detector de señales (cuándo interviene el mentor). Son reglas predecibles, gratuitas y comprobables.

**Privacidad:** todas las llamadas pasan por el filtro de privacidad descrito en la [propuesta P3](datos-y-privacidad.md#privacidad), que sustituye la identidad por un seudónimo y elimina datos personales del texto.

### Detalle por agente

| Agente | Función | Modelo y justificación | Entrada | Salida | Límites |
|---|---|---|---|---|---|
| **Preparador** ([ficha](agentes/preparador.md)) | Transforma cada vídeo en material de aprendizaje: fragmentos de unos 5 minutos, conceptos, resumen, actividad sin audio, preguntas de diagnóstico y comprobaciones. | **Sonnet 5.5 por lotes.** Se ejecuta una sola vez por vídeo y fuera de línea, lo que permite priorizar calidad. El procesamiento por lotes reduce el coste a la mitad. | Transcripción con marcas de tiempo y metadatos del catálogo | JSON validado contra esquema, revisable por un tutor | No recibe datos de alumnos. Se limita a la transcripción. Salida JSON estricta. |
| **Diagnóstico** ([ficha](agentes/diagnostico.md)) | Interpreta el resultado del test inicial y redacta para el alumno una explicación breve de su itinerario. | **Haiku 5.5.** Respuesta en tiempo real con coste mínimo; suficiente para resumir resultados estructurados. | Seudónimo, indicador de minoría de edad y resultados por concepto (puntuados por el backend) | Clasificación por concepto y mensaje de ≤ 80 palabras | No determina la puntuación, que es determinista. No recibe datos personales. |
| **Mentor** ([ficha](agentes/mentor.md)) | Acompaña al alumno de forma proactiva ante señales (bloqueo, abandono, inactividad, racha) y responde a sus consultas. | **Haiku 5.5.** Requiere respuestas en menos de 3 segundos y un coste mínimo por mensaje. Con instrucciones en caché, cada llamada cuesta fracciones de céntimo. | Señal o consulta filtrada, nivel por concepto, fragmentos relevantes | Mensaje breve con una acción concreta o derivación a tutor | Responde solo con contenido del curso y cita el fragmento. No facilita respuestas del examen final ni solicita datos personales. Máximo 30 mensajes diarios por alumno. Deriva a un humano ante señales de malestar. |

El Planificador y el Detector de señales se implementan deliberadamente sin IA: resultan predecibles, gratuitos y verificables. La IA se reserva para las tareas que requieren lenguaje y criterio.

### Modelo y proveedor

**Decisión (aprobada el 24/11/2026).**

| Agente | Proveedor | Cuándo | Respaldo |
|---|---|---|---|
| Preparador | Claude | Antes de la demo, una vez por vídeo | Revisión manual del contenido generado |
| Diagnóstico | Groq, modelo `gpt-oss-20b` | En el momento, al terminar el test | Plantilla fija con el resultado, sin IA |
| Mentor | Groq, modelo `gpt-oss-120b` | En el momento de la pregunta o de la señal | Mensaje fijo y derivación al tutor humano |

**Justificación.**
- **Preparador con Claude:** se ejecuta una sola vez por vídeo y fuera de línea, así que se prioriza la calidad del contenido en español. No recibe datos de alumnos, solo transcripciones, y el resultado queda guardado y revisable antes de publicarse.
- **Diagnóstico y Mentor con Groq:** necesitan responder en tiempo real desde el móvil. Groq responde en menos de un segundo, tiene un plan gratuito sin tarjeta suficiente para el prototipo y su contrato establece que no entrena con los datos del cliente. Solo recibe datos seudonimizados, a través del filtro de privacidad.
- **Respaldo en los agentes en tiempo real:** el plan gratuito tiene límites (unas 4 o 5 respuestas por minuto y modelo). Si se superan o el servicio falla, la aplicación sigue funcionando: el diagnóstico muestra una plantilla y el mentor deriva al tutor.
- **Proveedor intercambiable:** el modelo de cada agente se configura en un único fichero. Para producción puede cambiarse a un proveedor de pago con procesamiento en la UE y contrato de encargado de tratamiento sin modificar la aplicación.

**Alternativas descartadas.**
- **Claude Haiku para el tiempo real** (propuesta inicial): de pago; se mantiene como opción para producción.
- **Google Gemini gratuito:** sus condiciones exigen usuarios de 18 años o más, prohíben su uso en aplicaciones que probablemente usen menores y, para usuarios del Espacio Económico Europeo, solo permiten los servicios de pago.
- **Modelo abierto en local (Ollama):** máxima privacidad, pero latencia insuficiente sin GPU para el mentor. Puede servir de respaldo adicional.

> Antes del paso a producción debe elegirse un proveedor con procesamiento en la UE, formalizarse el contrato de encargado de tratamiento (DPA) y revisarse sus condiciones de uso con menores.

### Coste estimado

**En el prototipo:** el diagnóstico y el mentor no tienen coste (plan gratuito de Groq). El único gasto es la preparación del contenido con Claude, puntual y de céntimos para los vídeos de la demo.

**En producción con un proveedor de pago** (estimación de la propuesta inicial, con Claude Haiku para el tiempo real). Precios de lista de Anthropic en USD por millón de tokens:
- **Haiku 5.5:** 0,10 de entrada, 0,50 de salida y 0,01 de lectura de caché.
- **Sonnet 5.5:** 2 de entrada y 10 de salida; por lotes, 1 y 5.

**Hipótesis para un alumno activo medio:**
- 12 sesiones al mes con 4 intervenciones del mentor por sesión (48 llamadas).
- Unos 3.000 tokens de entrada por llamada, de los que 1.500 se leen de caché, y 250 de salida.
- Un diagnóstico al mes.

| Concepto | Cálculo | USD / alumno / mes |
|---|---|---|
| Mentor, entrada sin caché | 48 × 1.500 tokens × 0,10 $/M | 0,0072 |
| Mentor, entrada en caché | 48 × 1.500 tokens × 0,01 $/M | 0,0007 |
| Mentor, salida | 48 × 250 tokens × 0,50 $/M | 0,0060 |
| Diagnóstico | 4.000 tokens de entrada y 800 de salida | 0,0008 |
| Planificador y señales | sin IA | 0 |
| **Total estimado** | | **≈ 0,015** |
| **Con margen ×3** (uso intensivo, conversaciones largas) | | **≈ 0,05** |

**Para 1.200 alumnos:** entre 18 y 60 USD al mes.

**Coste puntual de preparación:**
- Los 400 vídeos del catálogo, con Sonnet por lotes (unos 8.000 tokens de entrada y 5.000 de salida por vídeo): unos 13 USD en total.
- La transcripción local del 70 % sin subtítulos solo consume tiempo de cómputo.

**Medidas de contención:**
- Contenido generado una vez por vídeo, no por alumno.
- Planificador y detector de señales sin IA.
- Caché de las instrucciones del mentor, que reduce a una décima parte el coste de esa porción.
- Contexto del mentor limitado a unos 8.000 tokens, por debajo del umbral de 100.000 a partir del cual Haiku 5.5 multiplica su precio por cinco.
- Límite de 30 mensajes diarios por alumno.
- Reutilización de respuestas frecuentes por fragmento.

**Resultado.** Aprobada con cambios en la reunión del 24/11/2026. Se mantienen los tres agentes y su función; cambian los proveedores: Claude para el Preparador y Groq para el Diagnóstico y el Mentor, con respaldo en ambos (véase "Modelo y proveedor").


---

## P2. Historias de usuario

Afecta a: SPEC §4 y al backlog de GitHub Issues (que se crea a partir de estas historias una vez aprobadas).

| # | Como… | Quiero… | Para… | Prioridad | Criterios de aceptación |
|---|---|---|---|---|---|
| H1 | alumno nuevo | realizar un test inicial breve | no revisar contenido que ya conozco | Imprescindible | Duración ≤ 6 min (≤ 12 preguntas). Dificultad adaptativa. Al finalizar se muestra el mapa con cada concepto clasificado como dominado, a repasar o nuevo. |
| H2 | alumno | que el itinerario omita lo que ya domino | mantener el interés | Imprescindible | Los fragmentos de conceptos dominados no aparecen en el itinerario y siguen accesibles desde "Ver todo". |
| H3 | alumno sin auriculares | seleccionar un modo sin audio | estudiar en cualquier lugar | Imprescindible | En modo sin audio solo se ofrecen lecturas, actividades y preguntas. No se reproduce vídeo con sonido. |
| H4 | alumno con poco tiempo | indicar 5, 10 o 20 minutos disponibles | completar la sesión en ese tiempo | Imprescindible | La sesión propuesta se ajusta al tiempo elegido (±1 min) y muestra la duración estimada antes de empezar. |
| H5 | alumno | responder 2 o 3 preguntas tras cada fragmento | comprobar que lo he entendido | Imprescindible | La comprobación aparece al final de cada fragmento. Un fallo marca el concepto como "a repasar" y se refleja en el mapa. |
| H6 | alumno bloqueado | recibir ayuda sin tener que pedirla | no abandonar | Imprescindible | Tras 2 fallos en el mismo concepto, o al abandonar un fragmento antes de la mitad, el mentor ofrece una explicación alternativa en ≤ 3 s, basada exclusivamente en el contenido del curso. |
| H7 | alumno | consultar dudas al mentor y solicitar un tutor | sentirme acompañado | Deseable | El mentor responde con contenido del curso y cita el fragmento. La opción "Hablar con un tutor" registra la derivación. |
| H8 | alumno, o su familia si es menor | conocer y borrar los datos que usa la IA | confiar en la plataforma | Deseable | La pantalla de privacidad muestra los datos enviados a la IA. La opción de borrado elimina el historial del mentor. |
| H9 | alumno | acceder al tutor desde cualquier pantalla mediante un símbolo de IA | resolver dudas sin perder el punto en el que estoy | Deseable | Botón visible en todas las pantallas salvo el test inicial y la bienvenida. Abre el chat con la lección actual como contexto. |
| — | tutor | consultar un panel de alumnos en riesgo | priorizar mi dedicación | Fuera de alcance | El cliente ha solicitado centrar el prototipo en el alumno. Se plantea como evolución (§10). |

**Resultado.** Aprobada en la reunión del 24/11/2026, con un añadido: acceso al tutor desde cualquier pantalla mediante un símbolo de IA (historia H9).


---

## P3. Arquitectura detallada, modelo de datos y privacidad

Afecta a: SPEC §5 (esquema detallado), SPEC §6 y privacidad.

Propuesta completa en [datos-y-privacidad.md](datos-y-privacidad.md): esquema de componentes, entidades de la base de datos, qué datos del alumno se envían a la IA y cómo se protegen (seudonimización, filtro de datos personales, tratamiento de menores, conservación).

**Resultado.** Aprobada en la reunión del 24/11/2026. El esquema se ha actualizado con los proveedores de P1. Se ha añadido el diagrama entidad-relación de la base de datos.


---

## P4. Contenido del curso de muestra

Afecta a: SPEC §8.

- **Curso:***Python desde cero*. Encaja con una academia de formación profesional y tecnológica, presenta niveles previos muy variados (lo que pone a prueba el test inicial) y dispone de abundante material en español.
- **Vídeos:** 12 vídeos públicos de YouTube de un mismo curso, de entre 5 y 25 minutos (selección pendiente).
- **Transcripciones:** 1. Si el vídeo dispone de subtítulos (como el 30 % del catálogo real), se utilizan directamente.
  2. En caso contrario, se transcriben con Whisper en servidor propio, sin coste por llamada y sin envío a terceros.
- **Material derivado:** se genera una sola vez por vídeo y se almacena en la base de datos con el agente Preparador, mediante Claude ([propuesta P1](#p1-agentes-de-ia)). En producción, un tutor lo revisa antes de publicarlo.

**Resultado.** Aprobada en la reunión del 24/11/2026. El curso de ejemplo es *Python desde cero*.


---

## P5. Decisión de producto

Afecta a: docs/decisiones.md §3.

**Decisión.** Personalizar el aprendizaje según **lo que el alumno ya sabe** (test inicial y mapa de dominio) y según **su contexto** (tiempo y audio), y no según estilos de aprendizaje (visual, auditivo, etc.).

**Alternativas.** Adaptar el material a preferencias visuales, auditivas o lectoras (planteamiento inicial del equipo); itinerarios fijos con gamificación (certificados, insignias).

**Justificación.** El cliente estableció como prioridad que los alumnos aprendan. La hipótesis de que adaptar el formato al estilo preferido mejora el aprendizaje carece de respaldo empírico. En cambio, sí lo tienen evitar la repetición de contenido dominado, la práctica de recuperación tras cada bloque y el repaso espaciado. El formato se adapta por razones prácticas: sin auriculares no es posible seguir un vídeo con audio. Esta decisión determina el resto del producto: el test inicial, la segmentación por conceptos, las comprobaciones y el modo contexto.

**Resultado.** Aprobada en la reunión del 24/11/2026, con un añadido: incorporar mapas conceptuales y tarjetas de repaso para reforzar el aprendizaje.


---

## P6. Pantallas de bienvenida, alias y perfil

Afecta a: SPEC §2 y frontend.

**Resumen.** Añadir al flujo del alumno tres pantallas que no aparecen en el boceto de la sesión 1 y que proceden de los prototipos. Están implementadas en el frontend.

**Detalle.**
- **Bienvenida:** pantalla inicial la primera vez que se abre la aplicación, con el lema "Aprende a tu ritmo. En tu momento." y el botón Empezar.
- **Alias anónimo:** el alumno elige un alias (o genera uno) con un avatar de píxeles en los colores de 480. El modo anónimo, activado por defecto, hace que los tutores le vean con su alias. Relacionado con la privacidad de la [propuesta P3](datos-y-privacidad.md#privacidad).
- **Perfil:** alias y modo anónimo, cursos del alumno, qué datos usa la IA, modo de estudio habitual, tamaño del texto y tema, y borrado del historial con el tutor.
- La barra inferior pasa a tener cuatro pestañas: Hoy, Progreso, Tutor y Perfil.

**Resultado.** Aprobada en la reunión del 24/11/2026.

---

<!-- Plantilla para nuevas propuestas

## PN. Título

### Resumen
### Detalle
### Votación

| Nombre | Voto | Comentarios |
|---|---|---|
| Daniel | | |
| Jeremy | | |
| Talia | | |
| Andrea | | |

-->
