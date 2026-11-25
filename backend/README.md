<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Backend (Python + FastAPI)

API que usa la PWA. El frontend nunca habla con la IA: toda llamada a los modelos
pasa por este servidor y por el filtro de privacidad (`app/privacidad.py`, previsto
en la Fase 2).

Estado: **fase 1 completa (esqueleto y harness de comprobación).** Pendiente en la
Fase 2: la conexión real con PostgreSQL y `app/privacidad.py`; los endpoints de
negocio siguen en la issue #13.

## Requisitos

- Python 3.12 o superior (`python3 --version`)
- PostgreSQL 14 o superior. En macOS, por ejemplo con
  [Postgres.app](https://postgres.app); en el resto de sistemas, con el
  instalador oficial o un contenedor de Docker.

## Puesta en marcha

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
