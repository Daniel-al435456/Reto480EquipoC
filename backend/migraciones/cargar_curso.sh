#!/usr/bin/env bash
# Carga en la base de datos el curso de ejemplo, o lo actualiza si ya estaba (issue #15).
# Uso: ./cargar_curso.sh [base_de_datos] [fichero_json]
#   base_de_datos: por defecto, $PGDATABASE o reto480.
#   fichero_json:  por defecto, ../app/datos/cursos-ejemplo.json, que se genera desde el frontend con
#                  "node herramientas/exportar-curso.mjs".
# Se puede ejecutar las veces que haga falta: no duplica nada y conserva los datos de los alumnos.
# La conexión usa las variables de entorno estándar de PostgreSQL (PGHOST, PGUSER, PGPASSWORD...).
set -euo pipefail

BD="${1:-${PGDATABASE:-reto480}}"
CURSO="${2:-$(dirname "$0")/../app/datos/cursos-ejemplo.json}"
if [ ! -f "$CURSO" ]; then
  echo "No existe el fichero del curso: $CURSO" >&2
  exit 1
fi

export PGOPTIONS="-c client_min_messages=warning"  # oculta avisos informativos de PostgreSQL
# Todo en una transacción: si algo falla, la base de datos se queda como estaba.
psql -X -q -v ON_ERROR_STOP=1 --single-transaction -d "$BD" -v datos="$(cat "$CURSO")" \
  -f "$(dirname "$0")/cargar_curso.sql"
echo "Curso cargado en $BD desde $CURSO"
