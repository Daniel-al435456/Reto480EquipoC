# Backend

Por ahora solo contiene la base de datos (issue #14). El servidor FastAPI se añadirá aquí (issue #12).

## Base de datos (PostgreSQL)

El modelo de datos está en la [propuesta P3](../propuestas/datos-y-privacidad.md#modelo-de-datos-y-flujo-hacia-la-ia). Los cambios de esquema se hacen solo con scripts en `migraciones/`, nunca a mano sobre la base de datos (AGENTS.md).

### Puesta en marcha

Requiere PostgreSQL 13 o posterior (se ha probado con la versión 18).

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
