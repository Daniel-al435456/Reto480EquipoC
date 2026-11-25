<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · **Decisiones** · [Propuestas](../propuestas/README.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Decisiones

Registro de las tres decisiones que más condicionan la solución: opción elegida, alternativas consideradas y justificación.

---

## 1. Stack tecnológico

**Decisión.** React + Vite como PWA en el frontend, Python + FastAPI en el backend y PostgreSQL como base de datos.

**Alternativas.** Flutter (opción inicial).

**Justificación.** Flutter Web descarga un motor de renderizado voluminoso antes de mostrar contenido, lo que choca con el requisito de carga razonable en 4G. El propio cliente sugirió en la reunión del 23/11 valorar otra opción. React como PWA es ligero e instalable desde el navegador. FastAPI permite trabajar en Python, el lenguaje del ecosistema de IA, y genera documentación automática de la API, útil para una integración posterior. PostgreSQL cubre bien los datos relacionales (alumnos, conceptos, eventos) y admite JSONB para el contenido generado.

---

## 2. Modelo y proveedor de IA

**Decisión.** Claude para el agente Preparador, que genera el contenido una vez por vídeo antes de la demo, y Groq (`gpt-oss-20b` para el Diagnóstico y `gpt-oss-120b` para el Mentor) para los agentes que responden en tiempo real. Ambos con respaldo sin IA: plantilla fija para el diagnóstico y derivación al tutor humano para el mentor.

**Alternativas.** Claude Haiku para el tiempo real (propuesta inicial, de pago); Google Gemini gratuito; un modelo abierto en local con Ollama.

**Justificación.** El Preparador no recibe datos de alumnos y se ejecuta una sola vez, así que se prioriza la calidad en español. Groq responde en menos de un segundo, tiene un plan gratuito suficiente para el prototipo y no entrena con los datos del cliente; solo recibe datos seudonimizados. Gemini gratuito se descartó porque exige usuarios mayores de 18 años y, en el Espacio Económico Europeo, solo permite los servicios de pago. Ollama en local no da la latencia necesaria sin GPU. El modelo de cada agente se configura en un único fichero, así que en producción puede pasarse a un proveedor de pago con procesamiento en la UE. Aprobada el 24/11/2026 ([propuesta P1](../propuestas/README.md#p1-agentes-de-ia)).

---

## 3. Decisión de producto

**Decisión.** Personalizar el aprendizaje según lo que el alumno ya sabe (test inicial y mapa de dominio) y según su contexto (tiempo disponible y si puede usar audio), y no según estilos de aprendizaje (visual, auditivo, etc.).

**Alternativas.** Adaptar el material a preferencias visuales, auditivas o lectoras (planteamiento inicial del equipo); itinerarios fijos con gamificación (certificados, insignias).

**Justificación.** El cliente estableció como prioridad que los alumnos aprendan. Adaptar el formato al estilo preferido no tiene respaldo empírico; sí lo tienen no repetir lo que ya se domina, practicar la recuperación tras cada bloque y repasar de forma espaciada. El formato se adapta solo por razones prácticas: sin auriculares no se puede seguir un vídeo con audio. Esta decisión condiciona el resto del producto: el test inicial, la división por conceptos, las comprobaciones y los modos de estudio. Aprobada el 24/11/2026 ([propuesta P5](../propuestas/README.md#p5-decisión-de-producto)), con un añadido: incorporar mapas conceptuales y tarjetas de repaso.
