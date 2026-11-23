<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](../docs/decisiones.md) · [Privacidad](../docs/privacidad.md) · **Propuestas** · [Contribución](../CONTRIBUTING.md)</sub>

# Propuestas

Propuestas pendientes de aprobación por el equipo. Mientras una propuesta no se apruebe, no forma parte de la especificación.

**Cómo votar:** cada miembro edita la tabla de votación de la propuesta (icono del lápiz en GitHub) con su voto (a favor, en contra o abstención) y, si quiere, un comentario. Una propuesta se aprueba con mayoría. Al aprobarse, su contenido se traslada a SPEC.md y a docs/decisiones.md.

| # | Propuesta | Estado |
|---|---|---|
| P1 | [Agentes de IA](#p1-agentes-de-ia) | En votación |

---

## P1. Agentes de IA

### Resumen

Tres agentes de IA; el resto del sistema funciona con reglas fijas, sin IA.

| Agente | Momento | Función | Modelo |
|---|---|---|---|
| **Preparador** ([ficha](agentes/preparador.md)) | Una vez por vídeo, antes de que lo vea ningún alumno | A partir de la transcripción, divide el vídeo en fragmentos de unos 5 minutos y genera resumen, versión en texto para el modo sin audio, preguntas del test inicial y comprobaciones | Claude Sonnet 5.5 por lotes |
| **Diagnóstico** ([ficha](agentes/diagnostico.md)) | Al terminar el test inicial | Traduce la nota por concepto (calculada por el backend) a dominado / a repasar / nuevo y explica al alumno su itinerario | Claude Haiku 5.5 |
| **Mentor** ([ficha](agentes/mentor.md)) | Ante señales (fallos repetidos, abandono, inactividad) o cuando el alumno pregunta | Explica el concepto de otra forma, remite al minuto exacto del vídeo, anima y, si no basta, deriva a un tutor humano | Claude Haiku 5.5 |

**Sin IA, a propósito:** el planificador de sesión (qué contenido toca) y el detector de señales (cuándo interviene el mentor). Son reglas predecibles, gratuitas y comprobables.

**Privacidad:** todas las llamadas pasan por el [filtro de privacidad](../docs/privacidad.md), que sustituye la identidad por un seudónimo y elimina datos personales del texto.

### Detalle por agente

| Agente | Función | Modelo y justificación | Entrada | Salida | Límites |
|---|---|---|---|---|---|
| **Preparador** ([ficha](agentes/preparador.md)) | Transforma cada vídeo en material de aprendizaje: fragmentos de unos 5 minutos, conceptos, resumen, actividad sin audio, preguntas de diagnóstico y comprobaciones. | **Sonnet 5.5 por lotes.** Se ejecuta una sola vez por vídeo y fuera de línea, lo que permite priorizar calidad. El procesamiento por lotes reduce el coste a la mitad. | Transcripción con marcas de tiempo y metadatos del catálogo | JSON validado contra esquema, revisable por un tutor | No recibe datos de alumnos. Se limita a la transcripción. Salida JSON estricta. |
| **Diagnóstico** ([ficha](agentes/diagnostico.md)) | Interpreta el resultado del test inicial y redacta para el alumno una explicación breve de su itinerario. | **Haiku 5.5.** Respuesta en tiempo real con coste mínimo; suficiente para resumir resultados estructurados. | Seudónimo, franja de edad y resultados por concepto (puntuados por el backend) | Clasificación por concepto y mensaje de ≤ 80 palabras | No determina la puntuación, que es determinista. No recibe datos personales. |
| **Mentor** ([ficha](agentes/mentor.md)) | Acompaña al alumno de forma proactiva ante señales (bloqueo, abandono, inactividad, racha) y responde a sus consultas. | **Haiku 5.5.** Requiere respuestas en menos de 3 segundos y un coste mínimo por mensaje. Con instrucciones en caché, cada llamada cuesta fracciones de céntimo. | Señal o consulta filtrada, nivel por concepto, fragmentos relevantes | Mensaje breve con una acción concreta o derivación a tutor | Responde solo con contenido del curso y cita el fragmento. No facilita respuestas del examen final ni solicita datos personales. Máximo 30 mensajes diarios por alumno. Deriva a un humano ante señales de malestar. |

El Planificador y el Detector de señales se implementan deliberadamente sin IA: resultan predecibles, gratuitos y verificables. La IA se reserva para las tareas que requieren lenguaje y criterio.

### Modelo y proveedor

**Decisión.** Claude **Haiku 5.5** para las tareas en tiempo real (mentor y diagnóstico) y Claude **Sonnet 5.5 por lotes** para la preparación de contenido, una vez por vídeo. En producción, acceso a través de un proveedor cloud con región en la UE.

**Alternativas.** Un único modelo grande para todas las tareas (coste elevado); GPT‑6 Luna (precio equivalente a Haiku); Mistral (proveedor europeo); un modelo abierto en servidor propio (máximo control de datos, pero con coste de infraestructura y menor calidad en español para un prototipo).

**Justificación.** Separar las tareas en tiempo real, de bajo coste, de las tareas fuera de línea, de mayor calidad, sitúa el coste en torno a 0,015 USD por alumno y mes (véase "Coste estimado"). Haiku 5.5 cuesta 0,10 USD por millón de tokens de entrada y ofrece la latencia que requiere un mentor en móvil. Sonnet se ejecuta una sola vez por vídeo, por lo que su precio tiene un peso marginal. El diseño no depende del proveedor: los agentes reciben datos seudonimizados y el modelo se configura en un único fichero.

> Antes del paso a producción debe verificarse la disponibilidad del modelo en la región UE elegida y formalizarse el contrato de encargado de tratamiento (DPA).

### Coste estimado

Precios de lista de Anthropic en USD por millón de tokens:
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

### Votación

| Nombre | Voto | Comentarios |
|---|---|---|
| Daniel | | |
| Jeremy | | |
| Talia | | |
| Andrea | | |

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
