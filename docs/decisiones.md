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

Pendiente de decisión del equipo. Propuesta en votación: [P1. Agentes de IA](../propuestas/README.md#p1-agentes-de-ia).

---

## 3. Decisión de producto

Pendiente de aprobación del equipo. Propuesta en votación: [P5. Decisión de producto](../propuestas/README.md#p5-decisión-de-producto).
