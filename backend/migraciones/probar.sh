#!/usr/bin/env bash
# Crea bases de datos temporales, aplica todas las migraciones, ejecuta las pruebas y las borra.
#   pruebas.sql:       reglas del esquema.
#   pruebas_carga.sql: carga del curso de ejemplo con cargar_curso.sh (primera carga, repetida y con cambios).
# Uso: ./probar.sh   (no toca la base de datos de trabajo)
set -euo pipefail
cd "$(dirname "$0")"

BD="reto480_pruebas_$$"
BD_CARGA="reto480_pruebas_carga_$$"
CURSO="../app/datos/cursos-ejemplo.json"
CURSO_CAMBIADO="$(mktemp)"
trap 'dropdb --if-exists "$BD"; dropdb --if-exists "$BD_CARGA"; rm -f "$CURSO_CAMBIADO"' EXIT

# Muestra solo los mensajes de las pruebas ("ok ..." o el fallo), sin el prefijo de psql.
limpiar() {
  sed -e "s/^psql:[a-z_]*.sql:[0-9]*: //" -e "s/^NOTICE:  //" -e "s/^ERROR:  //" | grep -v "^$"
}

createdb "$BD"
./aplicar.sh "$BD" > /dev/null
psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD" -f pruebas.sql 2>&1 | limpiar
echo "Todas las pruebas del esquema pasan."

createdb "$BD_CARGA"
./aplicar.sh "$BD_CARGA" > /dev/null

# El mismo curso con el vídeo de la primera lección ya elegido y sin su tercera actividad.
psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD_CARGA" -v datos="$(cat "$CURSO")" > "$CURSO_CAMBIADO" <<'SQL'
SELECT jsonb_set(:'datos'::jsonb, '{cursos,0,lecciones,0,youtubeId}', '"video-elegido"')
       #- '{cursos,0,lecciones,0,actividades,2}';
SQL

for fase in primera segunda cambios; do
  fichero="$CURSO"
  [ "$fase" = cambios ] && fichero="$CURSO_CAMBIADO"
  ./cargar_curso.sh "$BD_CARGA" "$fichero" > /dev/null
  echo "-- Carga $fase"
  psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD_CARGA" -v fase="$fase" -v datos="$(cat "$fichero")" \
    -f pruebas_carga.sql 2>&1 | limpiar
done
echo "Todas las pruebas de la carga del curso pasan."
