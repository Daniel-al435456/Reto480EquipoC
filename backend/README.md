<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Backend (Python + FastAPI + PostgreSQL)

API que usa la PWA. El frontend nunca habla con la IA: toda llamada a los modelos
pasa por este servidor y por el filtro de privacidad (`app/privacidad.py`, previsto
en la Fase 2).

Estado: la **base de datos ya está creada** (issue #14) y el servidor tiene las
**rutas que usa el frontend** (issue #13), con el curso de ejemplo y el mentor sin IA.
Pendiente: la conexión entre el servidor y PostgreSQL (el curso se lee de momento de
`app/datos/cursos-ejemplo.json`), `app/privacidad.py` y el agente Mentor (issue #16).

## Rutas

Todas bajo `/api`, salvo la de salud. Entrada y salida en JSON con los campos en
camelCase, como los usa el frontend (`leccionId`, `esMenor`). Detalle y pruebas en
`http://localhost:8000/docs`.

| Ruta | Qué hace | De momento |
|---|---|---|
| `GET /salud` | Comprueba que el servidor responde | |
| `GET /api/cursos` | Catálogo de cursos | Curso de ejemplo en JSON |
| `GET /api/cursos/{curso_id}/test` | Preguntas del test inicial, sin la respuesta correcta | Curso de ejemplo en JSON |
| `POST /api/cursos/{curso_id}/test/evaluacion` | Corrige el test con reglas y explica el itinerario | Mensaje de plantilla; con la #16, el agente Diagnóstico |
| `POST /api/actividades/correccion` | Corrige una respuesta escrita por palabras clave | |
| `POST /api/mentor/mensaje` | Responde a una consulta con la personalidad y el trato elegidos | Respuesta de respaldo sin IA; con la #16, el agente Mentor |
| `POST /api/mentor/proactivo` | Mensaje del mentor cuando el alumno se bloquea | Respuesta de respaldo sin IA |
| `POST /api/mentor/derivacion` | Pasa la consulta a un tutor de la academia | Solo confirma; guardarla necesita la base de datos |

El curso de ejemplo es una copia del del frontend. Si cambia `frontend/src/api/datos.js`,
se regenera con `node herramientas/exportar-curso.mjs` desde `frontend/`.

## Requisitos

- Python 3.12 o superior (`python3 --version`)
- PostgreSQL 13 o posterior (se ha probado con la versión 18). En macOS, por ejemplo
  con [Postgres.app](https://postgres.app); en Ubuntu/Debian, con `sudo apt install
  postgresql`; en el resto de sistemas, con el instalador oficial o un contenedor
  de Docker.

## Puesta en marcha del servidor

```bash
cd backend

# 1. Entorno virtual (solo la primera vez)
python3 -m venv .venv

# 2. Dependencias
.venv/bin/python -m pip install -e ".[dev]"

# 3. Configuración local (solo la primera vez)
cp .env.example .env     # y completar DATABASE_URL y GROQ_API_KEY

# 4. Arrancar
.venv/bin/uvicorn app.main:app --reload
```

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
```

La conexión usa las variables de entorno estándar de PostgreSQL (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). Sin ellas, se conecta a la base de datos local `reto480` con tu usuario. Las credenciales nunca se escriben en el repositorio.

### Comandos

| Qué | Comando (desde `backend/`) |
|---|---|
| Aplicar las migraciones pendientes | `./migraciones/aplicar.sh [base_de_datos]` |
| Probar el esquema en una base de datos temporal | `./migraciones/probar.sh` |

`aplicar.sh` anota cada migración en la tabla `migraciones_aplicadas`, así que puede ejecutarse varias veces: solo aplica las nuevas. Cada migración se aplica entera o no se aplica.

`probar.sh` crea una base de datos temporal, aplica todas las migraciones, ejecuta `pruebas.sql` y la borra. No toca la base de datos de trabajo.

### Añadir un cambio de esquema

1. Crear `migraciones/NNN_descripcion.sql` con el número siguiente (`002_...`). Nunca se modifica una migración ya fusionada en `main`. Una tabla nueva lleva `creado_en`, `actualizado_en` y su trigger `establecer_actualizado_en()` (hay una prueba que lo comprueba).
2. Añadir a `migraciones/pruebas.sql` una prueba por cada regla nueva y comprobar que falla antes del cambio.
3. Ejecutar `./migraciones/probar.sh` hasta que pase.
4. Actualizar el modelo de datos de P3 y los diagramas.

### Decisiones del esquema

- **Identificadores.** El contenido (cursos, vídeos, lecciones, conceptos, preguntas) usa texto legible en minúsculas con guiones, igual que el frontend (`python-desde-cero`, `variables`). Los datos que generan los alumnos usan números automáticos.
- **Valores permitidos** (`uso`, `formato`, `estado`, `rol`...) con `CHECK`, más fáciles de ampliar que los tipos `ENUM`.
- **Nombres de tablas en plural**: las relaciones del diagrama PERTENECE, CUBRE y COMPONE son las tablas `matriculas`, `lecciones_conceptos` y `sesiones_lecciones`.
- **Reglas que comprueba el backend**, porque dependen de varias filas o de la fecha actual: el consentimiento de la familia para menores de 14 años y que todas las lecciones de una sesión sean del mismo curso.

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
| `app/datos/` | Curso de ejemplo en JSON, hasta que esté cargado en la base de datos (#15) |
| `app/privacidad.py` | Previsto (Fase 2): único módulo que hablará con la IA (SPEC §5) |
| `migraciones/` | Único origen del esquema de la base de datos |
| `pruebas/` | Pruebas por endpoint y pruebas de arquitectura |

## Convenciones que comprueban las pruebas

- Los routers no acceden a la base de datos: delegan en `servicios/`.
- Solo `app/privacidad.py` podrá llamar a un proveedor de IA (SPEC §5).
- El esquema de las tablas solo se define en `migraciones/`.
- Ninguna clave o contraseña aparece en el código fuente.
- Cada endpoint tiene al menos una prueba.

Estas reglas están en `AGENTS.md`; aquí se comprueban solas en
`pruebas/test_arquitectura.py`.
