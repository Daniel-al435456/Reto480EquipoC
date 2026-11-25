<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](decisiones.md) · [Propuestas](../propuestas/README.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Registro del harness

Programamos con asistentes de IA. Para que su código sea fiable, el repositorio les da **guías** (lo que leen antes de trabajar), **sensores** (lo que comprueba su trabajo) y **límites** (lo que no pueden hacer). Cada vez que un asistente se equivoca, no basta con arreglar el código: cambiamos el entorno para que el error no se repita, y lo anotamos aquí.

## Piezas

| Pieza | Tipo | Dónde |
|---|---|---|
| Instrucciones comunes para cualquier asistente | Guía | [AGENTS.md](../AGENTS.md) (Claude Code lo carga desde `CLAUDE.md`) |
| Especificación, decisiones y propuestas | Guía | [SPEC.md](../SPEC.md), [decisiones.md](decisiones.md), [propuestas/](../propuestas/README.md) |
| Flujo para funcionalidades nuevas: plan, pruebas primero, verificación y revisión | Guía | `/nueva-funcionalidad` en `.claude/commands/` |
| Pruebas unitarias de las reglas de negocio (acceso, menores, cuenta, planificador) | Sensor | `frontend/pruebas/unitarias/` |
| Pruebas de arquitectura (red solo desde `src/api/`, sin claves ni llamadas a la IA, sin dependencias nuevas) | Sensor | `frontend/pruebas/unitarias/arquitectura.test.js` |
| Pruebas en navegador con tamaño de móvil (alta, menores, sesión, sin conexión, accesibilidad, peso) | Sensor | `frontend/pruebas/e2e/` |
| `npm test` tras cada edición y compilación al terminar | Sensor automático | `.claude/settings.json` y `.claude/hooks/comprobar.mjs` |
| `npm run verificar` en cada pull request | Sensor automático | `.github/workflows/frontend.yml` |
| Revisor con contexto limpio y solo lectura | Sensor que razona | `.claude/agents/revisor.md` |
| Sin `git push`, sin leer `.env`, sin editar `pato.js` a mano, con confirmación para commits y propuestas | Límite | `.claude/settings.json` |

Las comprobaciones viven en los scripts de `frontend/package.json`, así que sirven igual con cualquier asistente, para las personas y en GitHub Actions. Los archivos de `.claude/` solo los llaman.

## Fallos y cambios

| Fecha | Fallo del asistente | Cambio en el harness |
|---|---|---|
| 25/11/2026 | Las comprobaciones del frontend (registro, perfil, funcionamiento sin conexión, accesibilidad) se hacían con scripts fuera del repositorio, así que nadie más podía repetirlas. | Pruebas dentro de `frontend/pruebas/`, `npm run verificar` y GitHub Actions en cada pull request. |
| 25/11/2026 | Desde el perfil se podían cambiar el correo, la empresa y el tramo de edad; un menor de 14 años podía cambiar su edad para saltarse el consentimiento. Lo detectamos al revisar la app. | Regla en `src/api/cuenta.js` (`CAMPOS_EDITABLES`) y en `src/api/acceso.js`, con pruebas unitarias y en navegador. Reglas de menores en AGENTS.md. |
| 25/11/2026 | Al cambiar el nombre de una acción del estado, el asistente dejó dos funciones con el mismo nombre y la app dejó de compilar. | La compilación forma parte de `npm run verificar` y de la comprobación al terminar de Claude Code. |
| 25/11/2026 | Los dibujos del pato (`src/api/pato.js`) se retocaban a mano y se separaban del diseño. | Script `frontend/herramientas/pato.py` que los genera; AGENTS.md indica que no se editan a mano y `.claude/settings.json` lo impide. |
| 25/11/2026 | La clave del estado guardado cambió en el código, pero no en el script de `index.html` que aplica el tema antes de cargar la app. | Prueba de arquitectura que comprueba que ambas coinciden. |
| 25/11/2026 | Al montar la configuración del backend, el asistente escribió la URL de conexión con el usuario de la base de datos en el código, incumpliendo «sin credenciales en el repositorio». Lo detectó quien revisaba, no ninguna prueba. | Prueba de arquitectura `test_las_urls_de_los_servicios_viven_en_el_entorno`; el valor por defecto queda vacío y la URL se lee solo del entorno (`.env`). |
| 25/11/2026 | La prueba «cada endpoint tiene su prueba» pasaba sin revisar ningún endpoint: con FastAPI 0.165 las rutas montadas se envuelven en un objeto sin `path`, así que solo miraba las rutas de documentación. Además, el docstring de la propia prueba contenía rutas de ejemplo que servían como cobertura. Lo detectó la revisión de la PR #34. | Las rutas se leen de `openapi()` (API pública), la ruta tiene que aparecer tras una comilla —solo cuenta una llamada real—, el fichero de la prueba de arquitectura no cuenta como cobertura y la versión de FastAPI queda acotada. Prueba de la prueba: un endpoint sin prueba la pone en rojo. |

## Revisión periódica

- Si una regla de AGENTS.md ya la comprueba una prueba, se marca con ✓ o se quita.
- Si AGENTS.md pasa de 100 líneas, algo sobra o debe ir a una skill o a la documentación enlazada.
- Las pruebas que escribe un asistente se revisan antes que la implementación: son la especificación.
