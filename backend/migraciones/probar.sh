#!/usr/bin/env bash
# Crea bases de datos temporales, aplica todas las migraciones, ejecuta las pruebas y las borra.
#   pruebas.sql:       reglas del esquema.
#   pruebas_carga.sql: carga del curso de ejemplo con cargar_curso.sh (primera carga, repetida, con
#                      cambios y con un fichero de más de 128 KB).
# Uso: ./probar.sh   (no toca la base de datos de trabajo)
set -euo pipefail
cd "$(dirname "$0")"

BD="reto480_pruebas_$$"
BD_CARGA="reto480_pruebas_carga_$$"
CURSO="../app/datos/cursos-ejemplo.json"
CURSO_CAMBIADO="$(mktemp)"
CURSO_GRANDE="$(mktemp)"
trap 'dropdb --if-exists "$BD"; dropdb --if-exists "$BD_CARGA"; rm -f "$CURSO_CAMBIADO" "$CURSO_GRANDE"' EXIT

# Muestra solo los mensajes de las pruebas ("ok ..." o el fallo), sin el prefijo de psql.
limpiar() {
  sed -e "s/^psql:[a-z_]*.sql:[0-9]*: //" -e "s/^NOTICE:  //" -e "s/^ERROR:  //" | grep -v "^$"
}

# Escribe en $2 el curso de $CURSO transformado por la expresión SQL $1 (el JSON original es :'datos').
# psql lee el fichero él mismo: pasarlo como argumento falla a partir de 128 KB.
transformar_curso() {
  ARCHIVO_CURSO="$CURSO" psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD_CARGA" > "$2" <<SQL
\set datos \`cat -- "\$ARCHIVO_CURSO"\`
SELECT $1;
SQL
}

createdb "$BD"
./aplicar.sh "$BD" > /dev/null
psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD" -f pruebas.sql 2>&1 | limpiar
echo "Todas las pruebas del esquema pasan."

createdb "$BD_CARGA"
./aplicar.sh "$BD_CARGA" > /dev/null

# El mismo curso con otro vídeo de YouTube en el primer vídeo y sin la segunda actividad de la primera lección.
transformar_curso "jsonb_set(:'datos'::jsonb, '{cursos,0,videos,0,youtubeId}', '\"video-elegido\"')
                   #- '{cursos,0,lecciones,0,actividades,1}'" "$CURSO_CAMBIADO"

# El mismo curso con 200 KB de texto de más, como cuando lleve las transcripciones de los vídeos.
# Linux no admite un argumento de más de 128 KB: así se comprueba que el JSON no se pasa como argumento.
transformar_curso "jsonb_set(:'datos'::jsonb, '{relleno}', to_jsonb(repeat('x', 200000)))" "$CURSO_GRANDE"
if [ "$(wc -c < "$CURSO_GRANDE")" -le 131072 ]; then
  echo "FALLO el curso grande de la prueba no supera los 128 KB" >&2
  exit 1
fi

for fase in primera segunda cambios grande; do
  case "$fase" in
    cambios) fichero="$CURSO_CAMBIADO" ;;
    grande) fichero="$CURSO_GRANDE" ;;
    *) fichero="$CURSO" ;;
  esac
  ./cargar_curso.sh "$BD_CARGA" "$fichero" > /dev/null
  echo "-- Carga $fase"
  ARCHIVO_CURSO="$fichero" psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD_CARGA" -v fase="$fase" \
    -f pruebas_carga.sql 2>&1 | limpiar
done
echo "Todas las pruebas de la carga del curso pasan."
