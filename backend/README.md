<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Backend (Python + FastAPI + PostgreSQL)

API que usa la PWA. El frontend nunca habla con la IA: toda llamada a los modelos
pasa por este servidor y por el filtro de privacidad (`app/privacidad.py`, previsto
en la Fase 2).

Estado: la **base de datos ya está creada** (issue #14) y el servidor tiene las
**rutas que usa el frontend** (issue #13), con el curso de ejemplo. Con `GROQ_API_KEY`, el diagnóstico y el mentor responden con IA (issue #16); sin ella, con sus respuestas de respaldo.
El curso (catálogo, lecciones, actividades y test) se lee de PostgreSQL si está configurada
`DATABASE_URL` (issue #40), y si no, de `app/datos/cursos-ejemplo.json`
([Conectar la base de datos](#conectar-la-base-de-datos)). Quedan pendientes `app/privacidad.py`
y el agente Mentor (issue #16).

## Rutas

Todas bajo `/api`, salvo la de salud. Entrada y salida en JSON con los campos en
camelCase, como los usa el frontend (`leccionId`, `esMenor`). Detalle y pruebas en
`http://localhost:8000/docs`.

| Ruta | Qué hace | De momento |
|---|---|---|
| `GET /salud` | Comprueba que el servidor responde | |
| `GET /api/cursos` | Catálogo de cursos | |
| `GET /api/cursos/{curso_id}/lecciones` | Datos del curso y contenido completo de sus lecciones, con el trozo de vídeo de cada una (`inicioS`, `finS`) | No incluye el test inicial |
| `GET /api/cursos/{curso_id}/test` | Preguntas del test inicial, sin la respuesta correcta | |
| `POST /api/cursos/{curso_id}/test/evaluacion` | Corrige el test con reglas y explica el itinerario | Con clave, el agente Diagnóstico redacta el mensaje; sin ella o si falla, plantilla |
| `POST /api/actividades/correccion` | Corrige una respuesta escrita | Por palabras clave; si faltan y hay clave, decide el agente de corrección y explica el motivo |
| `POST /api/mentor/mensaje` | Responde a una consulta con la personalidad y el trato elegidos | Con clave, el agente Mentor, con hasta 3 lecciones relacionadas, el índice del curso, el progreso y la conversación; puede proponer abrir una lección. Sin clave o si falla, respuesta de respaldo |
| `POST /api/mentor/proactivo` | Mensaje del mentor cuando el alumno se bloquea | Con clave, el agente Mentor; sin ella o si falla, respuesta de respaldo |
| `POST /api/mentor/derivacion` | Pasa la consulta a un tutor de la academia | Solo confirma. La tabla `derivaciones` ya existe (migración 003); para guardarla falta saber qué alumno la pide (inicio de sesión) |
| `POST /api/cuenta` | Crea la cuenta al terminar el alta (los cuatro pasos) y abre la sesión | |
| `GET /api/cuenta` | Perfil del alumno con sesión | |
| `PATCH /api/cuenta` | Cambia nombre, apellidos, puesto, alias, modo anónimo y ajustes del mentor | El correo, la empresa, la fecha de nacimiento y el consentimiento solo los corrige la academia |
| `DELETE /api/cuenta` | Elimina la cuenta y todos los datos del alumno | Pide la contraseña |
| `PUT /api/cuenta/contrasena` | Cambia la contraseña y cierra las demás sesiones | Pide la actual |
| `POST /api/sesion` | Inicia sesión con el correo y la contraseña | |
| `DELETE /api/sesion` | Cierra la sesión de este dispositivo | |

### Cuenta y sesión

Las rutas de la cuenta (issue #55) necesitan la base de datos: sin `DATABASE_URL` responden 503. Una app con `VITE_API_URL` que apunta a un backend sin base de datos no puede crear cuentas ni iniciar sesión (avisa de que no puede conectar): todo despliegue con backend necesita su base de datos. Solo la app sin `VITE_API_URL` funciona en modo local. Las que no son el alta ni el inicio de sesión necesitan además una sesión: la app envía en cada petición la cabecera `Authorization: Bearer <token>`, con el token que devuelven `POST /api/cuenta` y `POST /api/sesion`.

- **Contraseña:** se recibe por HTTPS y se guarda solo como hash Argon2id (`argon2-cffi`, con los parámetros mínimos de OWASP: 19 MiB y 2 pasadas, para no agotar la memoria de Render). Debe tener al menos 8 caracteres, con alguna letra y algún número, como en el frontend. Todavía no hay límite de intentos de inicio de sesión.
- **Sesión:** el token es aleatorio y dura 30 días. En la tabla `accesos` solo se guarda su resumen SHA-256, así que una copia de la base de datos no sirve para entrar. Cerrar sesión borra su fila; cambiar la contraseña borra las demás del alumno; eliminar la cuenta, todas. Las caducadas se borran cuando el alumno vuelve a entrar.
- **Alta:** se crea con todos los datos de los cuatro pasos, en una sola transacción. La empresa se busca sin distinguir mayúsculas y, si no existe, se crea; al eliminar la cuenta se borra si ya no la usa nadie. Con menos de 14 años hace falta el consentimiento de la familia, con la fecha del servidor. Responder `email_registrado` permite saber si un correo tiene cuenta: es lo habitual en un alta, y el inicio de sesión no lo revela (mismo error y mismo tiempo de respuesta).
- **Privacidad:** si el mentor, la corrección o la evaluación del test llevan una sesión válida, el backend calcula si el alumno es menor con su fecha de nacimiento (no se fía de `esMenor`), y el filtro de privacidad quita su nombre y sus apellidos de lo que escribe antes de enviarlo a la IA. Sin sesión, o si la base de datos falla en ese momento, funcionan igual que antes, con lo que diga la app.
- **Registro del servidor:** de un error de la base de datos solo se registran su código y su mensaje principal, nunca el detalle, que puede repetir la fila con los datos del alumno.
- **Eliminar la cuenta** es `DELETE /api/cuenta` con la contraseña en el cuerpo (`{"contrasena": "..."}`).

| Error | Código | Cuándo |
|---|---|---|
| `email_registrado` | 409 | Ya hay una cuenta con ese correo, aunque cambien las mayúsculas |
| `consentimiento_necesario` | 422 | Menor de 14 años sin el consentimiento de la familia |
| `privacidad_no_aceptada` | 422 | No se ha aceptado la política de privacidad |
| `fecha_nacimiento_invalida` | 422 | Fecha futura o de hace más de 120 años |
| `contrasena_debil` | 422 | Menos de 8 caracteres, o sin letras o sin números |
| `credenciales_incorrectas` | 401 | Correo o contraseña incorrectos al iniciar sesión (el mismo error en los dos casos) |
| `sesion_no_valida` | 401 | Sin token, o con uno que no existe o ha caducado |
| `contrasena_incorrecta` | 403 | La contraseña actual no es correcta al cambiarla o al eliminar la cuenta |
| `datos_no_validos` | 422 | La base de datos rechaza un dato (por ejemplo, un carácter que no admite) |
| `conflicto` | 409 | Un valor que tiene que ser único ya está guardado |

El curso de ejemplo es una copia del del frontend. Si cambia `frontend/src/api/datos.js`,
se regenera con `node herramientas/exportar-curso.mjs` desde `frontend/`.

Si la base de datos está configurada pero no se puede usar, las rutas del curso devuelven 503 y
el frontend pasa a sus respuestas de ejemplo. El motivo queda en el registro del servidor (sin
la contraseña):

| Error | Cuándo |
|---|---|
| `base_datos_no_disponible` | No responde, rechaza el acceso, `DATABASE_URL` está mal escrita o faltan las tablas (no se ha ejecutado `aplicar.sh`) |
| `base_datos_sin_cursos` | Las tablas existen, pero no se ha cargado ningún curso (`cargar_curso.sh`) |

`/salud` no se ve afectado: no toca la base de datos a propósito.

## Requisitos

- Python 3.12 o superior para ejecutar la API (`python3 --version`).
- PostgreSQL 13 o posterior para las migraciones y para que la API lea el curso de la base de
  datos; sin él, la API funciona con el JSON de ejemplo (se ha probado con la versión 18). En macOS, por ejemplo, con
  [Postgres.app](https://postgres.app); en Ubuntu/Debian, con `sudo apt install postgresql`;
  en el resto de sistemas, con el instalador oficial o un contenedor de Docker.
- La clave `GROQ_API_KEY` es opcional: sin ella, el diagnóstico, el mentor y la corrección usan
  sus respuestas de respaldo. Cada persona crea la suya, gratis, en la consola de Groq y la pone en `backend/.env`
  (o en las variables de Render). Al arrancar, la terminal dice si hay IA o no. Los modelos se
  pueden cambiar con `MODELO_DIAGNOSTICO`, `MODELO_MENTOR` y `MODELO_CORRECCION`. Cómo funciona todo, en
  [docs/ia.md](../docs/ia.md).

## Puesta en marcha del servidor

```bash
cd backend

# 1. Entorno virtual (solo la primera vez)
python3 -m venv .venv

# 2. Dependencias
.venv/bin/python -m pip install -e ".[dev]"

# 3. Arrancar
.venv/bin/uvicorn app.main:app --reload
```

Sin más configuración, la API lee el curso del JSON de ejemplo: no hace falta PostgreSQL
ni un fichero `.env` para arrancarla.

### Conectar la base de datos

Para que la API lea el curso de PostgreSQL (issue #40):

1. Crear la base de datos, sus tablas y cargar el curso ([Puesta en marcha](#puesta-en-marcha)).
2. Copiar la plantilla `cp .env.example .env` (el `.env` no se sube al repositorio) y dejar la
   línea de la base de datos así:

   ```
   DATABASE_URL=dbname=reto480
   ```

   Con solo el nombre, se conecta a la base de datos local con tu usuario y sin contraseña,
   igual que `psql reto480`. El formato de la plantilla
   (`postgresql+psycopg://USUARIO@localhost:5432/reto480`) también vale, pero va por la red y
   PostgreSQL suele pedir contraseña: habría que añadirla (`USUARIO:CONTRASEÑA@`) o usar
   `PGPASSWORD`.
3. Arrancar (o reiniciar) la API.

Mientras está en marcha, si se vuelve a cargar el curso con `cargar_curso.sh`, la API sirve lo
nuevo sin reiniciarla.

La API queda en `http://localhost:8000` y la documentación interactiva en
`http://localhost:8000/docs`.

## Base de datos (PostgreSQL)

El modelo de datos está en la [propuesta P3](../propuestas/datos-y-privacidad.md#modelo-de-datos-y-flujo-hacia-la-ia). Los cambios de esquema se hacen solo con scripts en `migraciones/`, nunca a mano sobre la base de datos (AGENTS.md).

### Puesta en marcha

```bash
sudo apt install postgresql                      # Ubuntu/Debian
sudo -u postgres createuser --superuser $USER    # tu usuario de PostgreSQL
createdb reto480                                 # base de datos de trabajo
./migraciones/aplicar.sh                         # crea las tablas
./migraciones/cargar_curso.sh                    # carga el curso de ejemplo
```

La conexión usa las variables de entorno estándar de PostgreSQL (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). Sin ellas, se conecta a la base de datos local `reto480` con tu usuario. Las credenciales nunca se escriben en el repositorio.

### Comandos

| Qué | Comando (desde `backend/`) |
|---|---|
| Aplicar las migraciones pendientes | `./migraciones/aplicar.sh [base_de_datos]` |
| Cargar o actualizar el curso de ejemplo | `./migraciones/cargar_curso.sh [base_de_datos] [fichero_json]` |
| Probar el esquema y la carga en bases de datos temporales | `./migraciones/probar.sh` |

`aplicar.sh` anota cada migración en la tabla `migraciones_aplicadas`, así que puede ejecutarse varias veces: solo aplica las nuevas. Cada migración se aplica entera o no se aplica.

`cargar_curso.sh` lleva a las tablas el curso de `app/datos/cursos-ejemplo.json` (issue #15). Se vuelve a ejecutar cada vez que cambia el curso: actualiza lo que ha cambiado, borra lo que ya no está en el fichero y no duplica nada. Tampoco borra los datos de los alumnos (cuentas, matrículas, dominios, sesiones, eventos, mensajes con el mentor y derivaciones). Todo va en una transacción: si algo falla, la base de datos se queda como estaba. Antes de cargar nada, `validar_curso.sql` comprueba el fichero entero (issue #50) y, si no cumple las reglas, lista todos los fallos con el identificador afectado. Cómo pasa cada campo del JSON a su tabla está explicado al principio de `cargar_curso.sql`; lo más importante:

- Cada vídeo del fichero (`videos`) se guarda en su tabla, y cada lección es un trozo de su vídeo (`videoId`, `inicioS` y `finS`), con su `aviso` si lo tiene. Un vídeo sin elegir (`youtubeId` vacío) se guarda sin `youtube_id`.
- Cada lección cubre un concepto, también con su mismo identificador.
- Las actividades son preguntas de comprobación de su lección. Las de verdadero o falso se guardan con dos opciones, "Verdadero" y "Falso".
- Las preguntas del test inicial son de diagnóstico: van unidas al concepto de su lección, no a la lección.

`probar.sh` crea dos bases de datos temporales y las borra al terminar; no toca la base de datos de trabajo. En la primera aplica las migraciones y ejecuta `pruebas.sql`. En la segunda carga el curso cuatro veces y, tras cada carga, ejecuta `pruebas_carga.sql`: la primera vez, la segunda (no duplica nada ni borra los datos de un alumno), una tercera con otro vídeo de YouTube en el primer vídeo y una actividad menos, y una cuarta con un fichero de más de 128 KB.

`cargar_curso.sh` no pasa el JSON a `psql` como argumento: le da la ruta en la variable de entorno `ARCHIVO_CURSO` y `cargar_curso.sql` lo lee él mismo. Linux no admite un argumento de más de 128 KB, y el curso con las transcripciones de los vídeos lo supera.

### Añadir un cambio de esquema

1. Crear `migraciones/NNN_descripcion.sql` con el número siguiente (`002_...`). Nunca se modifica una migración ya fusionada en `main`. Una tabla nueva lleva `creado_en`, `actualizado_en` y su trigger `establecer_actualizado_en()` (hay una prueba que lo comprueba).
2. Añadir a `migraciones/pruebas.sql` una prueba por cada regla nueva y comprobar que falla antes del cambio.
3. Ejecutar `./migraciones/probar.sh` hasta que pase.
4. Actualizar el modelo de datos de P3 y los diagramas.

### Decisiones del esquema

- **Identificadores.** El contenido (cursos, vídeos, lecciones, conceptos, preguntas) usa texto legible en minúsculas con guiones, igual que el frontend (`python-desde-cero`, `variables`). Los datos que generan los alumnos usan números automáticos.
- **Valores permitidos** (`uso`, `formato`, `estado`, `rol`...) con `CHECK`, más fáciles de ampliar que los tipos `ENUM`.
- **Nombres de tablas en plural**: las relaciones del diagrama PERTENECE, CUBRE y COMPONE son las tablas `matriculas`, `lecciones_conceptos` y `sesiones_lecciones`.
- **Derivaciones a un tutor** (migración 003, H7): cada petición es una fila de `derivaciones` con su motivo (`alumno`, `malestar` o `sin_ia`, cuando la IA no responde) y su estado (`pendiente` o `atendida`), y además un evento `derivacion_tutor` en `eventos`. El evento dice que pasó; la tabla guarda el estado, que cambia. No se guarda el texto de la consulta.
- **Cuentas** (migración 004): `identidades.puesto` es opcional. Las sesiones iniciadas están en `accesos`, con el resumen del token y su caducidad, nunca el token.
- **Reglas que comprueba el backend**, porque dependen de varias filas o de la fecha actual: el consentimiento de la familia para menores de 14 años, que todas las lecciones de una sesión sean del mismo curso y que el curso de una derivación sea el de su lección, si la tiene.

## Comprobaciones

```bash
cd backend
.venv/bin/ruff format --check .   # formato
.venv/bin/ruff check .            # análisis estático
.venv/bin/python -m pytest         # pruebas
```

Las mismas comprobaciones se ejecutan solas en cada pull request
(`.github/workflows/backend.yml`). No se da nada por terminado sin pasarlas.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `app/routers/` | Validan la petición y delegan. No tocan la base de datos ni la IA |
| `app/servicios/` | La lógica de negocio |
| `app/esquemas.py` | Contratos de entrada y salida (Pydantic) |
| `app/errores.py` | Formato único de error: `{"error", "mensaje"}` |
| `app/config.py` | Variables de entorno. Aquí no se escribe ningún valor secreto |
| `app/datos/` | Curso de ejemplo en JSON: lo que carga `cargar_curso.sh` y lo que se usa sin base de datos |
| `app/persistencia.py` | Único módulo que abre conexiones con PostgreSQL (#40) |
| `app/privacidad.py` | Único módulo que habla con la IA: quita datos personales y, si la IA falla, devuelve `None` para usar el respaldo (SPEC §5) |
| `migraciones/` | Único origen del esquema de la base de datos |
| `pruebas/` | Pruebas por endpoint y pruebas de arquitectura |

## Convenciones que comprueban las pruebas

- Los routers no acceden a la base de datos: delegan en `servicios/`.
- Solo `app/privacidad.py` puede llamar a un proveedor de IA (SPEC §5). Los agentes están en `app/servicios/agentes.py`.
- El esquema de las tablas solo se define en `migraciones/`.
- Ninguna clave o contraseña aparece en el código fuente.
- Cada endpoint tiene al menos una prueba.

Estas reglas están en `AGENTS.md`; aquí se comprueban solas en
`pruebas/test_arquitectura.py`.
