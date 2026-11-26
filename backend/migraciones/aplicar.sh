#!/usr/bin/env bash
# Aplica, en orden, las migraciones NNN_*.sql que aún no se hayan aplicado.
# Uso: ./aplicar.sh [base_de_datos]   (por defecto, $PGDATABASE o reto480)
# La conexión usa las variables de entorno estándar de PostgreSQL (PGHOST, PGUSER, PGPASSWORD...):
# nunca se escriben credenciales en el repositorio.
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")"

BD="${1:-${PGDATABASE:-reto480}}"
export PGOPTIONS="-c client_min_messages=warning"  # oculta avisos informativos de PostgreSQL
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$BD")

"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
  nombre text PRIMARY KEY,
  aplicada_en timestamptz NOT NULL DEFAULT now())"

for fichero in [0-9][0-9][0-9]_*.sql; do
  if [ -n "$("${PSQL[@]}" -tA -c "SELECT 1 FROM migraciones_aplicadas WHERE nombre = '$fichero'")" ]; then
    echo "Ya aplicada: $fichero"
    continue
  fi
  # Cada migración y su registro van en una sola transacción: o se aplica entera o no se aplica.
  "${PSQL[@]}" --single-transaction -f "$fichero" \
    -c "INSERT INTO migraciones_aplicadas (nombre) VALUES ('$fichero')"
  echo "Aplicada: $fichero"
done
