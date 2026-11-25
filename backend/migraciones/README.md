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

Todavía no hay ningún script: el primero lo creará la **issue #14** (diseño de
las tablas) con el modelo de la `SPEC.md` §6. Cuando exista, se aplica así:

```bash
psql "$DATABASE_URL" -f migraciones/0001_esquema_inicial.sql
```

Los ficheros se nombran con cuatro dígitos y no se editan una vez aplicados: si algo
cambia, se añade un fichero nuevo. Así todas las máquinas del equipo terminan con el
mismo esquema sin tener que sincronizar nada a mano.
