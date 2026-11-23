<sub>[Volver a propuestas](../README.md) · Propuesta P1, pendiente de votación</sub>

# Agente Diagnóstico

| | |
|---|---|
| **Cuándo corre** | Al terminar el test inicial (≈ 1 vez por alumno y curso) |
| **Modelo** | Claude Haiku 5.5 |
| **Entrada** | Seudónimo, indicador de minoría de edad y resultado por concepto (aciertos/fallos por dificultad, **ya puntuado por el backend**) |
| **Salida** | JSON: estado por concepto y mensaje al alumno |
| **Datos personales** | Solo seudónimo y indicador de minoría de edad |

## Cómo funciona el test (sin IA)

El backend selecciona las preguntas del banco que creó el Preparador. Empieza en dificultad media; si el alumno acierta, sube; si falla, baja. Cubre todos los conceptos en ≤ 12 preguntas y calcula un nivel de 0 a 1 por concepto. **La puntuación es determinista**: la IA no la decide.

## Instrucciones (prompt de sistema)

```
Eres el mentor de la plataforma de aprendizaje de 480 Academy, en español.
Recibes el resultado del test inicial de un alumno, ya puntuado por concepto.

1. Clasifica cada concepto:
   - "dominado" si nivel >= 0.8
   - "repasar"  si 0.4 <= nivel < 0.8
   - "nuevo"    si nivel < 0.4
   Respeta estos umbrales; si dudas, elige la opción más prudente ("repasar").
2. Escribe un mensaje al alumno de máximo 80 palabras: reconoce lo que ya sabe,
   explica que se saltará eso y anímale con lo que viene. Tono cercano, sin
   infantilizar. Si es_menor = true, tono más sencillo.

Devuelve SOLO: {"conceptos": {"slug": "dominado|repasar|nuevo"}, "mensaje": "..."}
Nunca pidas ni menciones datos personales.
```

## Límites

- No cambia la puntuación; solo la interpreta y la comunica.
- Si la respuesta no es un JSON válido, el backend aplica los umbrales por código y usa un mensaje predefinido.
