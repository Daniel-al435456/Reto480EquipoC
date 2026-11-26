<sub>[Inicio](README.md) · [Especificación](SPEC.md) · [Bitácora](BITACORA.md) · [Decisiones](docs/decisiones.md) · [Propuestas](propuestas/README.md) · **Contribución** </sub>

# Guía de contribución

Acuerdos de trabajo del Equipo C.

## Roles

| Nombre | Área técnica |
|---|---|
| Daniel | Backend (Python + FastAPI) |
| Jeremy | Diseño (interfaz y experiencia móvil) |
| Talia | Base de datos (PostgreSQL) |
| Andrea | Frontend (React PWA) |

El 24/11 nos repartimos las tareas de otra forma: Daniel, IA y material del curso; Jeremy, base de datos; Talia, backend; Andrea, frontend. Es un reparto orientativo y en la práctica participamos todos en todo ([Bitácora, sesión 2](BITACORA.md#sesión-2--martes-24112026)).

Cada historia de usuario se gestiona como una issue con responsable y estimación.

## Ramas

- `main` contiene siempre una versión funcional. No admitimos commits directos de código.
- Usamos una rama por issue, con el formato `tipo/numero-descripcion`:
  - `feat/3-modo-sin-audio`
  - `fix/12-test-no-avanza`
  - `docs/bitacora-23-11`

## Pull requests

1. La pull request enlaza su issue (`Closes #3`).
2. La descripción indica los cambios, cómo probarlos y una captura si afecta a la interfaz.
3. Necesita la aprobación de otro miembro del equipo antes de fusionarse. La documentación puede incorporarse sin revisión.
4. Fusionamos con *squash merge* para mantener un historial limpio.

### Commits

Seguimos *Conventional Commits* en español y en imperativo: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, con ámbito opcional.

Ejemplo: `feat(frontend): añade selector de tiempo en la pantalla de inicio`.

El formato completo, el estilo de código y la estructura de carpetas están en [AGENTS.md](AGENTS.md). Las mismas normas sirven para las personas y para sus asistentes de IA.

## Definición de terminado

Consideramos terminada una issue cuando:

- [ ] Cumple todos sus criterios de aceptación ([SPEC §4](SPEC.md#4-historias-de-usuario)).
- [ ] Funciona en un móvil real, no solo en el emulador.
- [ ] Pasa `npm run verificar` (GitHub Actions lo comprueba en la pull request).
- [ ] Está fusionada en `main` mediante una pull request revisada.
- [ ] Está registrada en la bitácora.

## Asistentes de IA para el desarrollo

Cada miembro usa su propio asistente de IA. Todos siguen [AGENTS.md](AGENTS.md). En la bitácora anotamos la herramienta y el modelo utilizados en cada tarea relevante, ya que el cliente lo solicita en la presentación.

Cuando un asistente se equivoca, no nos limitamos a corregir el código: añadimos la regla, la prueba o el límite que lo evita y lo anotamos en [docs/registro-harness.md](docs/registro-harness.md). Revisamos las pruebas que escribe un asistente antes que su implementación.
