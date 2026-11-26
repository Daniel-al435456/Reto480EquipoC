<sub>[Inicio](../../README.md) · [Especificación](../../SPEC.md) · [Contribución](../../CONTRIBUTING.md)</sub>

# Migraciones de la base de datos

**Único lugar del proyecto donde se define el esquema de PostgreSQL.**

Cualquier `CREATE TABLE`, `ALTER TABLE` o `DROP TABLE` que aparezca fuera de esta
carpeta hace fallar `pruebas/test_arquitectura.py`.

## Acuerdo con el backend

Las tablas se nombran según `AGENTS.md` y el modelo aprobado en `SPEC.md` §6
(propuesta P3):

- Tablas en plural y `snake_case`: `alumnos`, `cursos`, `lecciones`, `mensajes_mentor`.
- Clave principal `id`; foráneas `<entidad>_id`: `alumno_id`, `curso_id`.
- Fechas `creado_en` y `actualizado_en`, con zona horaria.
- La tabla `identidades` va separada del resto: los datos personales no se mezclan
  con el aprendizaje (condición de privacidad, `SPEC.md` §6).

## Cómo se aplican

Las migraciones se aplican con los scripts de esta carpeta (issue #14), siempre
desde `backend/`:

```bash
./migraciones/aplicar.sh       # crea las tablas pendientes
./migraciones/cargar_curso.sh  # carga o actualiza el curso de ejemplo (issue #15)
./migraciones/probar.sh        # prueba el esquema y la carga en bases de datos temporales
```

`cargar_curso.sh` no es una migración: no cambia el esquema, solo llena las tablas
de contenido con `app/datos/cursos-ejemplo.json`. Por eso no lleva número y
`aplicar.sh` no lo ejecuta.

Los ficheros se nombran con tres dígitos y un guion bajo (`001_esquema_inicial.sql`,
`002_...`) y no se editan una vez fusionados en `main`: si algo cambia, se añade un
fichero nuevo. Así todas las máquinas del equipo terminan con el mismo esquema sin
tener que sincronizar nada a mano. El proceso completo —con `pruebas.sql` y las
reglas de cada tabla— está en [Añadir un cambio de esquema](../README.md#añadir-un-cambio-de-esquema).
