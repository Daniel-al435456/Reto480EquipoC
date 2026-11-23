<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](decisiones.md) · **Privacidad** · [Propuestas](../propuestas/README.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Privacidad y uso responsable de la IA

Entre los alumnos de 480 Academy hay menores de 18 años y la academia está sujeta al RGPD. Este documento describe cómo se garantiza que ningún dato personal identificable llegue a servicios de IA sin un tratamiento claro y justificado, tal como exige el enunciado.

> Este documento recoge un diseño técnico y no constituye asesoramiento jurídico. Antes del paso a producción debe revisarlo el delegado de protección de datos de 480 Academy.

---

## 1. Principio general

La IA no conoce la identidad del alumno. Los datos se separan en dos grupos que nunca se combinan en una llamada a la IA:

| Tabla | Contenido | Acceso de la IA |
|---|---|---|
| `Identidad` | Nombre, email, fecha de nacimiento, consentimiento | Nunca |
| `Alumno`, `Dominio`, `Evento` | Seudónimo aleatorio, franja de edad, nivel por concepto, eventos | Solo los campos imprescindibles, seudonimizados |

El seudónimo es un UUID aleatorio distinto del identificador interno de la base de datos. Una llamada interceptada no permitiría identificar al alumno.

## 2. Filtro de privacidad

Todas las llamadas a la IA pasan por un único módulo del backend (`backend/app/privacidad.py`), que es el único punto del código autorizado a comunicarse con el proveedor. Sus funciones son:

1. **Sustitución de identidad.** Reemplaza cualquier identificador por el seudónimo.
2. **Limpieza de texto libre.** Detecta en las consultas del alumno emails, teléfonos, DNI/NIE, direcciones y su propio nombre, y los sustituye por marcadores (`[EMAIL]`, `[NOMBRE]`). En el prototipo se emplean expresiones regulares; en producción, una librería de detección de datos personales con soporte para español.
3. **Minimización.** Cada llamada a la IA recibe únicamente los campos incluidos en su lista blanca (SPEC §6).

## 3. Menores de edad

- La IA recibe la **franja de edad** (14–17 / 18+) y el indicador de minoría de edad, nunca la edad exacta.
- Con alumnos menores, el mentor adopta un tono adaptado y aplica instrucciones más estrictas: evita temas personales y deriva a un humano ante cualquier señal de malestar.
- En España, el tratamiento de datos de menores de **14 años** requiere el consentimiento de sus progenitores o tutores legales. Dicho consentimiento se registra en `Identidad`.
- **No se toman decisiones automatizadas con efectos significativos.** La IA recomienda un itinerario, pero el alumno puede consultar y elegir cualquier contenido. La calificación del examen no depende de la IA.

## 4. Proveedor de IA

- En producción, el acceso se realiza a través de un proveedor cloud con procesamiento en la UE y contrato de encargado de tratamiento.
- Según las condiciones comerciales del proveedor, los datos enviados por API no se emplean para entrenar modelos. Este punto debe verificarse contractualmente antes del paso a producción.
- La generación de material a partir de los vídeos no recibe en ningún caso datos de alumnos: trabaja exclusivamente con las transcripciones.

## 5. Conservación y derechos

| Dato | Plazo de conservación | Finalidad |
|---|---|---|
| Mensajes con el mentor | 90 días | Continuidad de la conversación |
| Nivel por concepto y eventos agregados | Mientras dure la suscripción | Personalización del itinerario |
| Registros de llamadas a la IA | Solo metadatos (tokens, coste, latencia), sin contenido | Control del coste |

La pantalla **"Datos y privacidad"** muestra al alumno exactamente qué información se envía a la IA y le permite borrar su historial con el mentor, lo que hace efectivos los derechos de acceso y supresión.

## 6. Base legal

El tratamiento de los datos de aprendizaje se basa en la **ejecución del contrato** de formación, que incluye el acompañamiento. El uso del mentor de IA se informa en el alta y puede desactivarse.
