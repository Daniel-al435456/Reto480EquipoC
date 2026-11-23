<sub>[Inicio](README.md) · [Especificación](SPEC.md) · [Bitácora](BITACORA.md) · [Decisiones](docs/decisiones.md) · [Propuestas](propuestas/README.md) · [Contribución](CONTRIBUTING.md)</sub>

# Instrucciones para asistentes de IA de desarrollo

Cada miembro del equipo trabaja con su propio asistente de IA (Claude, Copilot, Cursor u otros). Este documento es la referencia común para que todos produzcan código, commits y configuración con el mismo estilo. Al empezar a trabajar, basta con indicar al asistente que lea este documento.

Los agentes de IA del producto están pendientes de decisión ([propuesta P1](propuestas/README.md#p1-agentes-de-ia)). Este documento cubre únicamente los asistentes de desarrollo.

---

## 1. Antes de empezar cualquier tarea

El asistente debe revisar el repositorio antes de escribir código:

1. Leer [SPEC.md](SPEC.md) y la issue asignada, incluidos sus criterios de aceptación.
2. Leer [CONTRIBUTING.md](CONTRIBUTING.md): ramas, pull requests y definición de terminado.
3. Revisar el historial reciente (`git log --oneline -20`) e imitar el formato de los commits existentes.
4. Revisar la estructura de la carpeta en la que va a trabajar y seguir los patrones del código ya escrito: nombres, organización de ficheros, manejo de errores.
5. Si una convención de este documento contradice el código existente, prevalece este documento y la discrepancia se comenta en la pull request.

---

## 2. Convenciones generales

| Aspecto | Convención |
|---|---|
| Idioma de la interfaz | Español |
| Idioma de comentarios y documentación | Español |
| Identificadores de dominio | Español, sin tildes ni ñ: `alumno`, `fragmento`, `sesion`, `dominio`, `anio` |
| Identificadores técnicos | Inglés cuando son términos del framework: `router`, `hook`, `props`, `schema` |
| Codificación y saltos de línea | UTF‑8, LF |
| Indentación | 4 espacios en Python; 2 espacios en JavaScript, JSON, YAML, CSS y Markdown |
| Longitud de línea | 100 caracteres |
| Secretos | Solo en variables de entorno (`.env`, excluido del repositorio). |

Los nombres del dominio coinciden con los del modelo de datos de [SPEC §6](SPEC.md#6-modelo-de-datos-y-flujo-hacia-la-ia), de modo que una misma entidad se llama igual en la base de datos, la API y el frontend.

---

## 3. Commits

Se sigue el formato *Conventional Commits*, en español y en imperativo:

```
<tipo>(<ámbito opcional>): <descripción en minúscula, sin punto final>
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Documentación |
| `style` | Formato, sin cambios de lógica |
| `refactor` | Reestructuración sin cambiar el comportamiento |
| `test` | Pruebas |
| `chore` | Configuración, dependencias, scripts |

Ámbitos habituales: `frontend`, `backend`, `bd`, `ia`, `docs`.

Ejemplos:
```
feat(frontend): añade selector de tiempo en la pantalla de inicio
fix(backend): corrige el cálculo de duración de la sesión
chore(bd): crea la tabla de eventos
docs: actualiza la bitácora del 30/11
```

Normas:
- Un commit agrupa un único cambio coherente.
- Si el commit cierra una issue, el cuerpo incluye `Closes #número`.
- Si el asistente de IA ha generado una parte significativa del cambio, se indica en el cuerpo, por ejemplo: `Asistido por: Claude Opus 5.5`. El cliente pide documentar qué modelos se han usado.

---

## 4. Ramas y pull requests

- Una rama por issue: `tipo/numero-descripcion-corta` (`feat/3-modo-sin-audio`).
- Las ramas se crean desde `main` actualizada y se mantienen cortas: menos de un día de trabajo.
- Antes de abrir la pull request: `git pull origin main`, resolver conflictos y comprobar que el formateador y las pruebas pasan.

---

## 5. Backend (Python 3.12 + FastAPI)

**Estilo**
- Formato y lint con **Ruff** (`ruff format` y `ruff check`), longitud de línea 100.
- Anotaciones de tipo en todas las funciones públicas.
- `snake_case` para variables, funciones y módulos; `PascalCase` para clases.
- Docstrings breves en español solo cuando el nombre no basta para entender la función.

**Estructura**
```
backend/
├── app/
│   ├── main.py            # creación de la app y registro de routers
│   ├── config.py          # lectura de variables de entorno
│   ├── privacidad.py      # único módulo que llama al proveedor de IA
│   ├── routers/           # un fichero por recurso: alumnos.py, sesiones.py, eventos.py, mentor.py
│   ├── esquemas/          # modelos Pydantic de entrada y salida
│   ├── modelos/           # modelos SQLAlchemy (tablas)
│   ├── servicios/         # lógica: planificador.py, senales.py, diagnostico.py
│   └── ia/                # integración con la IA, siempre a través de privacidad.py
├── tests/
└── requirements.txt
```

**Patrones**
- Los routers solo validan y delegan; la lógica vive en `servicios/`.
- Entrada y salida siempre con esquemas Pydantic, nunca diccionarios sueltos.
- Errores con el formato común `{"error": "codigo", "mensaje": "..."}`.
- Pruebas con `pytest` en `backend/tests/`, al menos una por endpoint.

---

## 6. Base de datos (PostgreSQL)

- Tablas en plural y `snake_case`: `alumnos`, `fragmentos`, `eventos`.
- Clave primaria `id`; claves foráneas `<entidad>_id` (`alumno_id`).
- Columnas de fecha `creado_en` y `actualizado_en`, con zona horaria (`timestamptz`).
- La tabla `identidades` permanece separada del resto ([propuesta P3](propuestas/datos-y-privacidad.md)).
- Los cambios de esquema se realizan mediante scripts versionados en `backend/migraciones/`, nunca a mano sobre la base de datos.

---

## 7. Frontend (React + Vite, PWA)

**Estilo**
- Formato con **Prettier** (comillas simples, punto y coma, 100 caracteres) y lint con **ESLint** (configuración por defecto de Vite para React).
- Solo componentes funcionales con hooks.
- `PascalCase` para componentes y sus ficheros (`SelectorTiempo.jsx`); `camelCase` para funciones, variables y hooks (`useSesion`).
- Una pieza por fichero; componentes de menos de unas 150 líneas.

**Estructura**
```
frontend/src/
├── pantallas/        # una por pantalla del flujo (SPEC §2)
├── componentes/      # piezas reutilizables: Boton, Tarjeta, BarraInferior, MensajeMentor
├── api/              # llamadas a la API, una función por endpoint; datos simulados mientras no exista
├── hooks/            # lógica reutilizable: useSesion, useEventos
├── estilos/          # variables CSS globales: colores, tipografía, espaciado
└── main.jsx
```

**Patrones**
- Las pantallas no llaman a `fetch` directamente: usan las funciones de `src/api/`.
- Estilos con CSS Modules (`SelectorTiempo.module.css`) y variables CSS globales. No se añaden librerías de componentes ni de estilos sin acuerdo del equipo.
- Diseño mobile‑first: se maqueta primero para 360 px de ancho, con las acciones principales en la zona del pulgar y áreas táctiles de al menos 44 px.
- Textos de la interfaz en español, con tuteo y sin tecnicismos.
- Pruebas con Vitest para la lógica de `hooks/` y `api/`.

---

## 8. Límites del asistente

- No confirma cambios en `main` ni fusiona pull requests.
- No añade dependencias sin justificarlas en la pull request. Objetivo del frontend: interfaz inicial inferior a 200 KB comprimida.
- No modifica `propuestas/` salvo petición expresa.
- No implementa funcionalidades marcadas como fuera de alcance en SPEC §4.
- No inventa requisitos: si algo no está en la especificación o en la issue, lo pregunta.
- No envía a ningún servicio de IA nombre, email ni identificador interno de un alumno.
