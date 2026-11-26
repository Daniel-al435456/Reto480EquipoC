---
description: Implementa una funcionalidad siguiendo el flujo del equipo (plan, pruebas primero, verificación y revisión)
argument-hint: descripción o número de la issue
---

Funcionalidad: $ARGUMENTS

Sigue estos pasos y no te saltes ninguno:

1. **Explora.** Lee la issue (si hay número), sus criterios de aceptación en SPEC.md y el código de las carpetas afectadas. No edites nada todavía.
2. **Planifica.** Propón los archivos que vas a tocar y una prueba por criterio de aceptación, incluidos los casos límite. Si falta información o algo no está en la especificación, pregunta. Espera a que apruebe el plan.
3. **Pruebas primero.** Escribe las pruebas (reglas en `frontend/pruebas/unitarias`, recorridos del alumno en `frontend/pruebas/e2e`), ejecútalas y comprueba que fallan.
4. **Implementa** lo mínimo para que pasen, siguiendo AGENTS.md.
5. **Verifica** con `npm run verificar` en `frontend/`. Si falla, sigue trabajando.
6. **Revisa** con el subagente `revisor` y corrige lo importante.
7. **Mejora el entorno.** Si algo falló por falta de información o de comprobación, propón la línea para AGENTS.md, la prueba o la entrada de `docs/registro-harness.md` que lo evitaría.
8. **Resume** los cambios y propón el mensaje de commit (Conventional Commits en español, con `Closes #n` si cierra una issue y `Asistido por: <modelo>`). No hagas commit ni push.
