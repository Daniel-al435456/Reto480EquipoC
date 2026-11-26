<sub>[Inicio](README.md) · [Especificación](SPEC.md) · [Bitácora](BITACORA.md) · [Decisiones](docs/decisiones.md) · [Propuestas](propuestas/README.md) · [Contribución](CONTRIBUTING.md)</sub>

# Instrucciones para asistentes de IA de desarrollo

Cada miembro del equipo programa con su propio asistente de IA (Claude, Copilot, Cursor u otros). Este archivo es lo que todos deben saber siempre sobre el proyecto; la mayoría de asistentes lo leen solos al empezar. Las personas siguen las mismas normas.

Lo que se puede comprobar no se pide aquí: lo comprueban las pruebas (`npm run verificar`). Cada regla nueva nace de un fallo real, anotado en [docs/registro-harness.md](docs/registro-harness.md).

## Comandos

| Qué | Comando (desde `frontend/`) | Cuándo |
|---|---|---|
| Instalar | `npm install` y, la primera vez, `npx playwright install chromium` | Al clonar o al cambiar dependencias |
| Desarrollo | `npm run dev` | Para ver la app en `http://localhost:5173` |
| Comprobación rápida | `npm test` | Tras cada cambio (menos de un segundo) |
| Comprobación completa | `npm run verificar` | Antes de dar algo por terminado y antes de cada pull request |

El backend (Python) tiene sus propios comandos, desde `backend/`:

| Qué | Comando (desde `backend/`) | Cuándo |
|---|---|---|
| Instalar | `python3 -m venv .venv` y `.venv/bin/python -m pip install -e ".[dev]"` | Al clonar o cambiar dependencias |
| Desarrollo | `.venv/bin/uvicorn app.main:app --reload` | Para ver la API en `http://localhost:8000` y su documentación en `/docs` |
| Comprobación | `.venv/bin/ruff format --check .`, `.venv/bin/ruff check .` y `.venv/bin/python -m pytest` | Tras cada cambio y antes de cada pull request |
| Crear las tablas | `./migraciones/aplicar.sh` | Al clonar y al añadir una migración |
| Cargar el curso de ejemplo | `./migraciones/cargar_curso.sh` | Al clonar y cuando cambie `app/datos/cursos-ejemplo.json` |
| Leer el curso de la base de datos | `cp .env.example .env` y poner `DATABASE_URL=dbname=reto480` | Una vez, tras cargar el curso. Sin ella se lee el JSON de ejemplo; al arrancar, el backend dice cuál usa |
| Probar el esquema y la carga | `./migraciones/probar.sh` | Antes de cada pull request que cambie la base de datos |

`npm run verificar` ejecuta las pruebas unitarias y de arquitectura, compila y prueba la app en un navegador real con tamaño de móvil. GitHub Actions lo repite en cada pull request, y el workflow `.github/workflows/backend.yml` hace lo propio con las comprobaciones del backend.

## Forma de trabajar

1. **Explorar.** Leer la issue, sus criterios de aceptación en [SPEC §4](SPEC.md#4-historias-de-usuario) y el código de la carpeta afectada. Seguir los patrones que ya hay.
2. **Planificar.** Para una funcionalidad nueva, proponer un plan (archivos y pruebas) y no editar hasta que la persona lo apruebe.
3. **Pruebas primero.** Una prueba por criterio de aceptación o regla de negocio, incluidos los casos límite. Comprobar que falla.
4. **Implementar** lo mínimo para que pase.
5. **Verificar** con `npm run verificar`. No decir "hecho" sin haberlo ejecutado.
6. **Registrar el fallo.** Si algo salió mal por falta de información o de comprobación, proponer el cambio en este archivo, una prueba nueva o una línea en `docs/registro-harness.md`.

## Reglas de negocio

Detalle en [SPEC](SPEC.md) y [propuestas](propuestas/README.md). Las marcadas con ✓ ya tienen prueba.

- El frontend nunca llama a un proveedor de IA ni contiene claves: todo pasa por el backend. ✓
- Toda llamada a la IA pasa por `backend/app/privacidad.py`: seudónimo en lugar de identidad y texto libre sin datos personales ([SPEC §6](SPEC.md#6-modelo-de-datos-y-flujo-hacia-la-ia)).
- A la IA solo llega si el alumno es menor o no, nunca su fecha de nacimiento ni su edad. La fecha se guarda para que el tramo cambie solo al cumplir 14 o 18 años. ✓
- Con menos de 14 años, el alumno no continúa sin el consentimiento de su familia. ✓
- A la IA, junto a la consulta, solo llegan además la personalidad elegida para el mentor y cómo quiere que se dirija al alumno (femenino, masculino o neutro). ✓
- La IA recomienda, pero no decide: el alumno puede abrir cualquier lección aunque el test diga que la domina. ✓
- El planificador de sesión y el detector de señales funcionan con reglas, sin IA. La sesión cabe en el tiempo elegido (±1 min) y sin audio no hay vídeo. ✓
- El mentor solo usa el contenido del curso, cita el fragmento, admite 30 mensajes al día por alumno y deriva a un tutor humano ante señales de malestar.
- Los mensajes con el mentor se borran a los 90 días; el alumno puede borrarlos antes.

## Convenciones

| Aspecto | Convención |
|---|---|
| Idioma | Español en interfaz, comentarios y documentación. Tuteo y sin tecnicismos en la interfaz. Se dice "alumno". "Mentor" es siempre la IA y "tutor", la persona de la academia, también en el código (`mentorIA`, `Mentor.jsx`, `solicitarTutorHumano`). |
| Identificadores de dominio | Español sin tildes ni ñ (`alumno`, `sesion`, `anio`), iguales en base de datos, API y frontend |
| Identificadores técnicos | Inglés cuando son términos del framework (`router`, `hook`, `props`) |
| Formato | UTF-8 y LF. 2 espacios en JavaScript, CSS, JSON y Markdown; 4 en Python |
| Secretos | Solo en variables de entorno (`.env`, `.env.local`), nunca en el repositorio |
| Documentación | Diseño en tono impersonal; bitácora y acuerdos en primera persona del plural. Sobria y sin emojis |

**Commits:** *Conventional Commits* en español e imperativo, `tipo(ámbito): descripción` con tipos `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` y ámbitos `frontend`, `backend`, `bd`, `ia`, `docs`. Si el asistente ha generado una parte importante del cambio, el cuerpo incluye `Asistido por: <modelo>`; el cliente pide documentar los modelos usados. Ramas y pull requests: [CONTRIBUTING.md](CONTRIBUTING.md).

## Frontend (React + Vite, PWA)

```
frontend/
├── src/
│   ├── pantallas/    # una por pantalla; no llaman a fetch
│   ├── componentes/  # piezas reutilizables
│   ├── api/          # datos, cliente de API y reglas puras (sin React), probadas en pruebas/unitarias
│   ├── hooks/        # estado del alumno, navegación, ajustes y PWA
│   └── estilos/      # variables CSS: colores, tipografía, espaciado
├── pruebas/          # unitarias/ (node:test) y e2e/ (Playwright)
└── herramientas/     # script que genera los dibujos del pato
```

- Componentes funcionales con hooks; `PascalCase` en componentes, `camelCase` en funciones y hooks.
- Estilos con CSS Modules y las variables de `src/estilos/variables.css`. Sin librerías de componentes ni de estilos.
- Una regla de negocio nueva va como función pura en `src/api/`, con su prueba.
- Mobile-first: se maqueta para 360 px, acciones principales al alcance del pulgar y áreas táctiles de 44 px o más.
- `src/api/pato.js` no se edita a mano: se genera con `python3 herramientas/pato.py`.
- Si cambia la forma del estado guardado, se sube la versión de la clave en `useEstado.jsx` y en `index.html`.

## Backend y base de datos ([puesta en marcha](backend/README.md))

- Python 3.12 y FastAPI. Formato y lint con Ruff; tipos en las funciones públicas. Pruebas con pytest, al menos una por endpoint.
- Los routers validan y delegan; la lógica va en `servicios/`. Entrada y salida con esquemas Pydantic. Errores con el formato `{"error": "codigo", "mensaje": "..."}`.
- PostgreSQL: tablas en plural y `snake_case`, clave `id`, foráneas `<entidad>_id`, fechas `creado_en` y `actualizado_en` con zona horaria. `identidades` separada del resto. Cambios de esquema solo con un script nuevo en `backend/migraciones/` (nunca se edita uno ya fusionado), con su prueba en `pruebas.sql`.
- La API que espera el frontend está en [frontend/README.md](frontend/README.md#datos-y-conexión-con-el-backend).

## Límites

- No hace `git push`, no confirma cambios en `main` ni fusiona pull requests.
- No lee ni muestra `.env` ni claves.
- No añade dependencias sin justificarlas en la pull request. El JavaScript inicial debe pesar menos de 200 KB comprimido. ✓
- No modifica `propuestas/` ni decisiones del equipo salvo petición expresa.
- No implementa lo que está fuera de alcance en [SPEC §11](SPEC.md#11-alcance-para-el-3011).
- No inventa requisitos ni datos: si algo no está en la especificación o en la issue, lo pregunta.
- No envía a ningún servicio de IA nombre, correo ni identificador interno de un alumno.

Para quien usa Claude Code, `.claude/` aplica estas normas de forma automática: permisos, comprobaciones tras cada edición, un revisor y el comando `/nueva-funcionalidad`.
