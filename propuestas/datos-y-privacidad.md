<sub>[Volver a propuestas](README.md) · Propuesta P3, aprobada el 24/11/2026</sub>

# P3. Arquitectura detallada, modelo de datos y privacidad

## Arquitectura detallada

```mermaid
flowchart LR
  subgraph Movil["Móvil del alumno"]
    PWA["React PWA<br/>(Vite, caché offline)"]
  end

  subgraph Servidor["Backend FastAPI"]
    API["API REST"]
    PLAN["Planificador de sesión<br/>(reglas, sin IA)"]
    SEN["Detector de señales<br/>(reglas, sin IA)"]
    PRIV["Filtro de privacidad<br/>(seudonimización y limpieza)"]
  end

  DB[("PostgreSQL<br/>alumnos · dominio · eventos<br/>contenido preparado")]

  GROQ["Groq<br/>Diagnóstico y Mentor<br/>(tiempo real)"]
  RESP["Respaldo<br/>plantilla fija · derivación a tutor"]

  CAT["Catálogo del curso +<br/>transcripciones"]
  CLAUDE["Claude<br/>Preparador<br/>(una vez por vídeo, antes de la demo)"]

  PWA <--> API
  API --> PLAN
  API --> SEN
  API <--> DB
  SEN -- "señal de riesgo" --> PRIV
  API -- "test / consulta" --> PRIV
  PRIV --> GROQ
  GROQ -. "si falla" .-> RESP
  CAT --> CLAUDE
  CLAUDE -- "contenido preparado" --> DB
  PWA -. "vídeo con marcas de tiempo" .-> YT["YouTube"]
```

| Componente | Función |
|---|---|
| **React PWA** | Interfaz mobile‑first, utilizable con una mano y con las acciones principales en la zona del pulgar. Almacena en caché la interfaz y el texto de la sesión para tolerar conexiones 4G inestables. Incluye un acceso al tutor desde cualquier pantalla que envía la lección actual como contexto. |
| **API FastAPI** | Punto único de entrada: autenticación simulada en el prototipo y endpoints de test, sesión, eventos y mentor. |
| **Planificador de sesión** | Lógica determinista, sin IA. A partir del mapa de dominio, el tiempo disponible y la disponibilidad de audio, selecciona fragmentos y actividades. Es predecible, no tiene coste y se puede probar. |
| **Detector de señales** | Reglas sobre los eventos registrados (fallos consecutivos, abandono, inactividad, racha). Determina cuándo interviene el mentor. |
| **Filtro de privacidad** | Toda llamada a la IA pasa por este módulo, que sustituye la identidad por un seudónimo y elimina datos personales del texto libre. Detalle en el apartado "Privacidad". |
| **Claude (Preparador)** | Genera fragmentos, resúmenes, versión sin audio, preguntas y actividades a partir de la transcripción. Se ejecuta una vez por vídeo, antes de la demo, y no recibe datos de alumnos. El resultado se guarda en PostgreSQL ([propuesta P1](README.md#p1-agentes-de-ia)). |
| **Groq (Diagnóstico y Mentor)** | Redacta el resultado del test y responde al alumno en tiempo real, solo con el contenido de la lección y con datos seudonimizados. |
| **Respaldo** | Si Groq no está disponible: plantilla fija para el diagnóstico y derivación a un tutor humano para el mentor. La aplicación nunca se queda sin respuesta. |
| **PostgreSQL** | Datos del alumno separados en identidad y aprendizaje, eventos y contenido preparado. |
| **Integración** | La plataforma actual no dispone de API. Se diseña como servicio independiente con API propia, integrable posteriormente mediante SSO, LTI 1.3 y xAPI. |

## Modelo de datos y flujo hacia la IA

**Diagrama entidad-relación**

![Diagrama entidad-relación de la base de datos](../docs/img/modelo-entidad-relacion.jpg)

**Entidades**

Actualizadas el 25/11/2026 con la cuenta de usuario de P7 y la implementación del esquema (`backend/migraciones/001_esquema_inicial.sql`). La unidad de estudio se llama **lección**, como en el frontend y la API: un vídeo entero o un trozo de él.

```
Empresa(id, nombre)
Identidad(id, alumno_id, empresa_id, id_externo, nombre, apellidos, email, hash_contrasena,
          fecha_nacimiento, consentimiento_familia_en, privacidad_aceptada_en)   -- nunca se envía a la IA
Alumno(id, seudonimo_ia, alias, anonimo, mentor_ia_activo, personalidad_mentor, tratamiento)
Curso(id, titulo, descripcion, nivel)
Video(id, curso_id, titulo, youtube_id, duracion_s, orden, transcripcion, origen_transcripcion)
Leccion(id, video_id, titulo, descripcion, inicio_s, fin_s, duracion_lectura_min, resumen, lectura, ejercicio)
Concepto(id, curso_id, nombre)
Pregunta(id, concepto_id, leccion_id, uso, formato, dificultad, enunciado, solucion, explicacion)
   opciones (multivaluado): orden, texto, correcta
   palabras_clave (multivaluado)
Recurso(id, leccion_id, tipo, contenido)
Evento(id, alumno_id, tipo, leccion_id, pregunta_id, valor, detalles)
Sesion(id, alumno_id, minutos, audio, estado)
MensajeMentor(id, alumno_id, leccion_id, rol, texto_filtrado, proactivo)   -- se elimina a los 90 días
```

Todas las tablas tienen además `creado_en` y `actualizado_en`. La contraseña solo se guarda como hash (Argon2 o bcrypt), calculado por el backend. La fecha de nacimiento no sale de `Identidad`: el backend calcula el tramo de edad y a la IA solo le llega si el alumno es menor. La personalidad del mentor y el tratamiento (femenino, masculino o neutro) se guardan en `Alumno` porque el backend los envía a la IA. Las preferencias visuales (tema, tamaño del texto, forma del mentor) se guardan en el dispositivo, no en la base de datos.

**Relaciones**

| Relación | Entidades | Cardinalidad | Atributos | Tabla |
|---|---|---|---|---|
| Trabaja en | Empresa – Identidad | 1 : N | | |
| Corresponde | Identidad – Alumno | 1 : 1 | | |
| Pertenece | Alumno – Curso | N : M | fecha_inicio, estado | `matriculas` |
| Incluye | Curso – Vídeo | 1 : N | | |
| Contiene | Curso – Concepto | 1 : N | | |
| Divide | Vídeo – Lección | 1 : N | | |
| Cubre | Lección – Concepto | N : M | | `lecciones_conceptos` |
| Domina | Alumno – Concepto | N : M | nivel, nivel_test | `dominios` |
| Evalúa | Concepto – Pregunta | 1 : N | | |
| Comprueba | Lección – Pregunta | 0..1 : N | | |
| Apoya | Lección – Recurso | 1 : N | | |
| Genera | Alumno – Evento | 1 : N | | |
| Referencia | Pregunta – Evento | 0..1 : N | | |
| Referencia | Lección – Evento | 0..1 : N | | |
| Planifica | Alumno – Sesión | 1 : N | | |
| Compone | Sesión – Lección | N : M | orden, completado | `sesiones_lecciones` |
| Conversa | Alumno – Mensaje mentor | 1 : N | | |
| Trata | Lección – Mensaje mentor | 0..1 : N | | |

Los atributos multivaluados de Pregunta se guardan en las tablas `opciones_pregunta` y `palabras_clave` (primera forma normal).

La identidad real del alumno está en una entidad separada (`Identidad`), que es la única que guarda el vínculo con `Alumno`: desde `Alumno` no hay ningún camino hacia los datos personales. Borrar la identidad deja anónimos los datos de aprendizaje. El resto del sistema, incluida la IA, trabaja con el seudónimo; el alias lo escribe el alumno y tampoco se envía a la IA.

**Datos enviados a la IA**

| Se envía | No se envía |
|---|---|
| Seudónimo aleatorio, distinto del identificador interno | Nombre, email, teléfono, fecha de nacimiento |
| Indicador de minoría de edad (para ajustar el tono) | Edad exacta |
| Nivel por concepto y eventos recientes agregados | Historial completo de navegación |
| Texto de las consultas tras el filtro de privacidad | Texto libre sin filtrar |
| Fragmentos del curso (contenido de la academia) | Datos de pago o suscripción |

Base legal, tratamiento de menores, proveedor, conservación y derechos: véase "Privacidad".

## Privacidad

Entre los alumnos de 480 Academy hay menores de 18 años y la academia está sujeta al RGPD. Este documento describe cómo se garantiza que ningún dato personal identificable llegue a servicios de IA sin un tratamiento claro y justificado, tal como exige el enunciado.

> Este documento recoge un diseño técnico y no constituye asesoramiento jurídico. Antes del paso a producción debe revisarlo el delegado de protección de datos de 480 Academy.

---

### 1. Principio general

La IA no conoce la identidad del alumno. Los datos se separan en dos grupos que nunca se combinan en una llamada a la IA:

| Tabla | Contenido | Acceso de la IA |
|---|---|---|
| `Identidad` | Nombre, email, fecha de nacimiento, consentimiento | Nunca |
| `Alumno`, `Dominio`, `Evento` | Seudónimo aleatorio, indicador de minoría de edad, nivel por concepto, eventos | Solo los campos imprescindibles, seudonimizados |

El seudónimo es un UUID aleatorio distinto del identificador interno de la base de datos. Una llamada interceptada no permitiría identificar al alumno.

### 2. Filtro de privacidad

Todas las llamadas a la IA pasan por un único módulo del backend (`backend/app/privacidad.py`), que es el único punto del código autorizado a comunicarse con el proveedor. Sus funciones son:

1. **Sustitución de identidad.** Reemplaza cualquier identificador por el seudónimo.
2. **Limpieza de texto libre.** Detecta en las consultas del alumno emails, teléfonos, DNI/NIE, direcciones y su propio nombre, y los sustituye por marcadores (`[EMAIL]`, `[NOMBRE]`). En el prototipo se emplean expresiones regulares; en producción, una librería de detección de datos personales con soporte para español.
3. **Minimización.** Cada llamada a la IA recibe únicamente los campos incluidos en su lista blanca (véase "Modelo de datos").

### 3. Menores de edad

- La IA recibe solo el indicador de minoría de edad (menor de 18 o no), nunca la edad exacta.
- Con alumnos menores, el mentor adopta un tono adaptado y aplica instrucciones más estrictas: evita temas personales y deriva a un humano ante cualquier señal de malestar.
- Si hay alumnos menores de **14 años**, en España el tratamiento de sus datos requiere el consentimiento de sus progenitores o tutores legales. Dicho consentimiento se registra en `Identidad`.
- **No se toman decisiones automatizadas con efectos significativos.** La IA recomienda un itinerario, pero el alumno puede consultar y elegir cualquier contenido. La calificación del examen no depende de la IA.

### 4. Proveedor de IA

- En el prototipo, el diagnóstico y el mentor usan Groq, cuyo contrato establece que no entrena con los datos del cliente; procesa en EE. UU., por lo que solo recibe datos seudonimizados. El Preparador usa Claude y solo recibe transcripciones.
- En producción, el acceso se realiza a través de un proveedor cloud con procesamiento en la UE y contrato de encargado de tratamiento.
- Según las condiciones comerciales del proveedor, los datos enviados por API no se emplean para entrenar modelos. Este punto debe verificarse contractualmente antes del paso a producción.
- La generación de material a partir de los vídeos no recibe en ningún caso datos de alumnos: trabaja exclusivamente con las transcripciones.

### 5. Conservación y derechos

| Dato | Plazo de conservación | Finalidad |
|---|---|---|
| Mensajes con el mentor | 90 días | Continuidad de la conversación |
| Nivel por concepto y eventos agregados | Mientras dure la suscripción | Personalización del itinerario |
| Registros de llamadas a la IA | Solo metadatos (tokens, coste, latencia), sin contenido | Control del coste |

La pantalla **"Datos y privacidad"** muestra al alumno exactamente qué información se envía a la IA y le permite borrar su historial con el mentor, lo que hace efectivos los derechos de acceso y supresión.

### 6. Base legal

El tratamiento de los datos de aprendizaje se basa en la **ejecución del contrato** de formación, que incluye el acompañamiento. El uso del mentor de IA se informa en el alta y puede desactivarse.

