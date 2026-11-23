<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · **Decisiones** · [Privacidad](privacidad.md) · [Propuestas](../propuestas/README.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Decisiones

Registro de las tres decisiones que más condicionan la solución: opción elegida, alternativas consideradas y justificación.

---

## 1. Stack tecnológico

**Decisión.** React + Vite como PWA en el frontend, Python + FastAPI en el backend y PostgreSQL como base de datos.

**Alternativas.** Flutter (opción inicial), Next.js, SvelteKit, Vue.

**Justificación.** Flutter Web descarga un motor de renderizado voluminoso antes de mostrar contenido, lo que choca con el requisito de carga razonable en 4G. El propio cliente sugirió en la reunión del 23/11 valorar otra opción. React como PWA es ligero, instalable desde el navegador y más conocido por el equipo. FastAPI permite trabajar en Python, el lenguaje del ecosistema de IA, y genera documentación automática de la API, útil para una integración posterior. PostgreSQL cubre bien los datos relacionales (alumnos, conceptos, eventos) y admite JSONB para el contenido generado.

---

## 2. Modelo y proveedor de IA

Pendiente de decisión del equipo. Propuesta en votación: [P1. Agentes de IA](../propuestas/README.md#p1-agentes-de-ia).

---

## 3. Decisión de producto

**Decisión.** Personalizar el aprendizaje según **lo que el alumno ya sabe** (test inicial y mapa de dominio) y según **su contexto** (tiempo y audio), y no según estilos de aprendizaje (visual, auditivo, etc.).

**Alternativas.** Adaptar el material a preferencias visuales, auditivas o lectoras (planteamiento inicial del equipo); itinerarios fijos con gamificación (certificados, insignias).

**Justificación.** El cliente estableció como prioridad que los alumnos aprendan. La hipótesis de que adaptar el formato al estilo preferido mejora el aprendizaje carece de respaldo empírico. En cambio, sí lo tienen evitar la repetición de contenido dominado, la práctica de recuperación tras cada bloque y el repaso espaciado. El formato se adapta por razones prácticas: sin auriculares no es posible seguir un vídeo con audio. Esta decisión determina el resto del producto: el test inicial, la segmentación por conceptos, las comprobaciones y el modo contexto.
