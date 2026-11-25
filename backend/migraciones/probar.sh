#!/usr/bin/env bash
# Crea una base de datos temporal, aplica todas las migraciones, ejecuta pruebas.sql y la borra.
# Uso: ./probar.sh   (no toca la base de datos de trabajo)
set -euo pipefail
cd "$(dirname "$0")"

BD="reto480_pruebas_$$"
trap 'dropdb --if-exists "$BD"' EXIT

createdb "$BD"
./aplicar.sh "$BD" > /dev/null
psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD" -f pruebas.sql 2>&1 | sed -e "s/^psql:pruebas.sql:[0-9]*: //" -e "s/^NOTICE:  //" -e "s/^ERROR:  //" | grep -v "^$"
echo "Todas las pruebas del esquema pasan."
