#!/usr/bin/env bash
# Crea bases de datos temporales, aplica todas las migraciones, ejecuta las pruebas y las borra.
#   pruebas.sql:       reglas del esquema.
#   pruebas_carga.sql: carga del curso de ejemplo con cargar_curso.sh (primera carga, repetida, con
#                      cambios y con un fichero de más de 128 KB).
#   Ficheros inválidos (issue #50): cargar_curso.sh rechaza un curso que no cumple las reglas, dice qué
#                      falla y no cambia la base de datos.
# Uso: ./probar.sh   (no toca la base de datos de trabajo)
set -euo pipefail
cd "$(dirname "$0")"

BD="reto480_pruebas_$$"
BD_CARGA="reto480_pruebas_carga_$$"
CURSO="../app/datos/cursos-ejemplo.json"
CURSO_CAMBIADO="$(mktemp)"
CURSO_GRANDE="$(mktemp)"
CURSO_PRUEBA="$(mktemp)"
trap 'dropdb --if-exists "$BD"; dropdb --if-exists "$BD_CARGA"; rm -f "$CURSO_CAMBIADO" "$CURSO_GRANDE" "$CURSO_PRUEBA"' EXIT

# Muestra solo los mensajes de las pruebas ("ok ..." o el fallo), sin el prefijo de psql.
limpiar() {
  sed -e "s/^psql:[a-z_]*.sql:[0-9]*: //" -e "s/^NOTICE:  //" -e "s/^ERROR:  //" | grep -v "^$"
}

# Escribe en $2 el resultado de la expresión SQL $1 sobre el curso de $CURSO, que en la expresión se llama d.
# psql lee el fichero él mismo: pasarlo como argumento falla a partir de 128 KB.
transformar_curso() {
  ARCHIVO_CURSO="$CURSO" psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD_CARGA" > "$2" <<SQL
\set datos \`cat -- "\$ARCHIVO_CURSO"\`
SELECT $1 FROM (SELECT :'datos'::jsonb AS d) AS curso;
SQL
}

# Un dato del curso de $CURSO, según la ruta $1 (por ejemplo, {cursos,0,lecciones,0,id}).
dato() {
  transformar_curso "d #>> '$1'" "$CURSO_PRUEBA"
  cat "$CURSO_PRUEBA"
}

createdb "$BD"
./aplicar.sh "$BD" > /dev/null
psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$BD" -f pruebas.sql 2>&1 | limpiar
echo "Todas las pruebas del esquema pasan."

createdb "$BD_CARGA"
./aplicar.sh "$BD_CARGA" > /dev/null

# El mismo curso con otro vídeo de YouTube en el primer vídeo y la segunda actividad de la primera lección
# sustituida por otra con otro identificador: la anterior debe borrarse.
transformar_curso "jsonb_set(jsonb_set(d, '{cursos,0,videos,0,youtubeId}', '\"video-elegido\"'),
                             '{cursos,0,lecciones,0,actividades,1}',
                             jsonb_build_object('id', 'actividad-nueva', 'tipo', 'vf',
                                                'enunciado', 'Una actividad nueva.', 'correcta', true,
                                                'explicacion', 'Sustituye a la anterior.'))" "$CURSO_CAMBIADO"

# El mismo curso con 200 KB de texto de más, como cuando lleve las transcripciones de los vídeos.
# Linux no admite un argumento de más de 128 KB: así se comprueba que el JSON no se pasa como argumento.
transformar_curso "jsonb_set(d, '{relleno}', to_jsonb(repeat('x', 200000)))" "$CURSO_GRANDE"
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

# --- Ficheros inválidos (issue #50) ---
# Cada prueba estropea el curso bueno en un punto y comprueba que la carga falla, que el mensaje dice
# qué falla y que la base de datos no cambia. Los identificadores salen del fichero, para que las pruebas
# sigan valiendo si cambia el contenido. Se da por hecho que las dos primeras lecciones son del primer vídeo.
echo "-- Ficheros inválidos"
salida="$(./cargar_curso.sh "$BD_CARGA" "$CURSO" 2>&1)"
if [ "$salida" != "Curso cargado en $BD_CARGA desde $CURSO" ]; then
  echo "FALLO una carga correcta debe decir solo «Curso cargado en ...». Dice:
$salida" >&2
  exit 1
fi
echo "ok   una carga correcta solo dice «Curso cargado en ...»"
if salida="$(./cargar_curso.sh "reto480_no_existe_$$" "$CURSO" 2>&1)" \
   || ! grep -qF "El curso no se ha cargado por un error de la base de datos" <<< "$salida"; then
  echo "FALLO un error de la base de datos debe decir que el curso no se ha cargado. Dice:
$salida" >&2
  exit 1
fi
echo "ok   un error de la base de datos dice que el curso no se ha cargado"
C="$(dato '{cursos,0,id}')"
V0="$(dato '{cursos,0,videos,0,id}')"
L0="$(dato '{cursos,0,lecciones,0,id}')"
A0="$(dato '{cursos,0,lecciones,0,actividades,0,id}')"
T0="$(dato '{cursos,0,testInicial,0,id}')"
VF="jsonb_build_object('id', 'extra-vf', 'tipo', 'vf', 'enunciado', 'Texto.', 'correcta', true, 'explicacion', 'x')"

# Resumen del contenido de la base de datos, para comprobar que una carga rechazada no cambia nada.
huella() {
  psql -X -q -t -A -d "$BD_CARGA" -c "
    SELECT md5(string_agg(fila, '|' ORDER BY fila)) FROM (
      SELECT c::text AS fila FROM cursos c UNION ALL SELECT v::text FROM videos v
      UNION ALL SELECT l::text FROM lecciones l UNION ALL SELECT co::text FROM conceptos co
      UNION ALL SELECT p::text FROM preguntas p UNION ALL SELECT o::text FROM opciones_pregunta o
      UNION ALL SELECT pc::text FROM palabras_clave pc) AS contenido"
}

fallo() {
  echo "FALLO $1" >&2
  exit 1
}

# Uso: debe_rechazar "descripción" "expresión SQL sobre d" "texto esperado en el mensaje" [más textos...]
debe_rechazar() {
  local descripcion="$1" expresion="$2" antes salida esperado
  shift 2
  transformar_curso "$expresion" "$CURSO_PRUEBA"
  antes="$(huella)"
  if salida="$(./cargar_curso.sh "$BD_CARGA" "$CURSO_PRUEBA" 2>&1)"; then
    fallo "$descripcion: el curso se ha cargado y debía rechazarse"
  fi
  for esperado in "El curso no se ha cargado" "$@"; do
    grep -qF -- "$esperado" <<< "$salida" || fallo "$descripcion: el mensaje no dice «$esperado». Dice:
$salida"
  done
  [ "$(huella)" = "$antes" ] || fallo "$descripcion: la base de datos ha cambiado"
  echo "ok   rechaza $descripcion"
}

# Uso: debe_aceptar "descripción" "expresión SQL sobre d". Después vuelve a dejar cargado el curso bueno.
debe_aceptar() {
  local salida
  transformar_curso "$2" "$CURSO_PRUEBA"
  salida="$(./cargar_curso.sh "$BD_CARGA" "$CURSO_PRUEBA" 2>&1)" || fallo "$1: no se ha cargado. Dice:
$salida"
  ./cargar_curso.sh "$BD_CARGA" "$CURSO" > /dev/null
  echo "ok   acepta $1"
}

# Estructura y campos obligatorios.
debe_rechazar "un fichero que no es JSON válido" "left(d::text, 50)" "El fichero no es un JSON válido"
debe_rechazar "un fichero sin la lista de cursos" "'{}'::jsonb" "falta la lista «cursos»"
debe_rechazar "un curso sin la lista de vídeos" "d #- '{cursos,0,videos}'" "curso $C: falta la lista «videos»"
debe_rechazar "un vídeo que dura 0 segundos" "jsonb_set(d, '{cursos,0,videos,0,duracion}', '0')" \
  "vídeo $V0: «duracion» debe ser un número entero mayor que 0"
debe_rechazar "una lección sin título" "d #- '{cursos,0,lecciones,0,titulo}'" "lección $L0: falta «titulo»"
debe_rechazar "una lección con la lectura vacía" "jsonb_set(d, '{cursos,0,lecciones,0,lectura}', '[]')" \
  "lección $L0: falta «lectura»"

# Identificadores.
debe_rechazar "un identificador con mayúsculas" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0,id}', '\"Mal_Id\"')" "identificador «Mal_Id» no válido"
debe_rechazar "un identificador repetido" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,1,id}', to_jsonb('$A0'::text))" "identificador repetido: $A0"

# Trozos de vídeo.
debe_rechazar "una lección de un vídeo que no existe" \
  "jsonb_set(d, '{cursos,0,lecciones,0,videoId}', '\"no-existe\"')" "lección $L0: su vídeo no-existe no está en el curso"
debe_rechazar "una lección que acaba antes de empezar" \
  "jsonb_set(d, '{cursos,0,lecciones,0,finS}', d #> '{cursos,0,lecciones,0,inicioS}')" \
  "lección $L0: «finS» debe ser mayor que «inicioS»"
debe_rechazar "una lección que acaba después del final de su vídeo" \
  "jsonb_set(d, '{cursos,0,lecciones,0,finS}', to_jsonb((d #>> '{cursos,0,videos,0,duracion}')::int + 100))" \
  "lección $L0: acaba en el segundo" "después del final de su vídeo"
debe_rechazar "un hueco entre dos trozos" \
  "jsonb_set(d, '{cursos,0,lecciones,1,inicioS}', to_jsonb((d #>> '{cursos,0,lecciones,0,finS}')::int + 10))" \
  "vídeo $V0: hay un hueco"
debe_rechazar "un vídeo cuyo primer trozo no empieza en 0" "jsonb_set(d, '{cursos,0,lecciones,0,inicioS}', '5')" \
  "vídeo $V0: el primer trozo empieza en el segundo 5"
debe_rechazar "un vídeo cuyos trozos no llegan al final" \
  "jsonb_set(d, '{cursos,0,videos,0,duracion}', to_jsonb((d #>> '{cursos,0,videos,0,duracion}')::int + 60))" \
  "vídeo $V0: el último trozo acaba en el segundo"
debe_rechazar "un vídeo sin lecciones" \
  "jsonb_insert(d, '{cursos,0,videos,-1}', '{\"id\": \"video-extra\", \"titulo\": \"Extra\", \"duracion\": 60}', true)" \
  "vídeo video-extra: no tiene lecciones"

# Actividades (H5).
debe_rechazar "una lección con 1 actividad" "d #- '{cursos,0,lecciones,0,actividades,1}'" \
  "lección $L0: debe tener 2 o 3 actividades y tiene 1"
debe_rechazar "una lección con 4 actividades" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades}', d #> '{cursos,0,lecciones,0,actividades}'
     || jsonb_build_array($VF, jsonb_set($VF, '{id}', '\"extra-vf-2\"')))" \
  "lección $L0: debe tener 2 o 3 actividades y tiene 4"
debe_aceptar "una lección con 3 actividades" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades}', d #> '{cursos,0,lecciones,0,actividades}' || jsonb_build_array($VF))"
debe_rechazar "una actividad de un tipo desconocido" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0,tipo}', '\"test\"')" \
  "actividad $A0: el tipo debe ser «vf» o «escrita»"
debe_rechazar "una actividad de verdadero o falso sin respuesta" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0}', jsonb_build_object('id', '$A0', 'tipo', 'vf', 'enunciado', 'x'))" \
  "actividad $A0: es «vf» y le falta «correcta» (true o false)"
debe_rechazar "una actividad escrita sin solución" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0}',
     jsonb_build_object('id', '$A0', 'tipo', 'escrita', 'enunciado', 'x', 'palabrasClave', jsonb_build_array('a')))" \
  "actividad $A0: es «escrita» y le falta «solucion»"
debe_rechazar "una actividad escrita sin palabras clave" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0}',
     jsonb_build_object('id', '$A0', 'tipo', 'escrita', 'enunciado', 'x', 'solucion', 'a'))" \
  "actividad $A0: es «escrita» y le faltan las palabras clave"

# Test inicial (H1). El curso bueno tiene 12 preguntas, el máximo, y las fases de carga ya lo aceptan.
debe_rechazar "un test inicial de 13 preguntas" \
  "jsonb_insert(d, '{cursos,0,testInicial,-1}', jsonb_build_object('id', 't-extra', 'leccionId', '$L0',
     'enunciado', 'x', 'opciones', jsonb_build_array('a', 'b'), 'correcta', 0), true)" \
  "curso $C: el test inicial tiene 13 preguntas y como mucho puede tener 12"
debe_rechazar "una pregunta del test de una lección que no existe" \
  "jsonb_set(d, '{cursos,0,testInicial,0,leccionId}', '\"no-existe\"')" \
  "pregunta del test $T0: su lección no-existe no está en el curso"
debe_rechazar "dos preguntas del test del mismo vídeo" \
  "jsonb_set(d, '{cursos,0,testInicial,1,leccionId}', d #> '{cursos,0,testInicial,0,leccionId}')" \
  "tiene 2 preguntas en el test inicial y como mucho puede tener 1"
debe_rechazar "una pregunta del test con la respuesta fuera de sus opciones" \
  "jsonb_set(d, '{cursos,0,testInicial,0,correcta}', '7')" "pregunta del test $T0: «correcta» debe estar entre 0 y"
debe_rechazar "una pregunta del test con una sola opción" \
  "jsonb_set(jsonb_set(d, '{cursos,0,testInicial,0,opciones}', '[\"única\"]'), '{cursos,0,testInicial,0,correcta}', '0')" \
  "pregunta del test $T0: debe tener al menos 2 opciones"

# Tipos inesperados: deben salir en la lista de fallos, no como errores de PostgreSQL al cargar.
debe_rechazar "una lista de cursos que es un objeto" "jsonb_build_object('cursos', jsonb_build_object('a', 1))" \
  "falta la lista «cursos»"
debe_rechazar "un vídeo que no es un objeto" "jsonb_set(d, '{cursos,0,videos,0}', '\"x\"')" \
  "vídeo n.º 1 del curso $C: debe ser un objeto"
debe_rechazar "una duración escrita como texto" "jsonb_set(d, '{cursos,0,videos,0,duracion}', '\"60\"')" \
  "vídeo $V0: «duracion» debe ser un número entero"
debe_rechazar "una duración con decimales (786.0)" \
  "jsonb_set(d, '{cursos,0,videos,0,duracion}', ((d #>> '{cursos,0,videos,0,duracion}') || '.0')::jsonb)" \
  "vídeo $V0: «duracion» debe ser un número entero"
debe_rechazar "una respuesta del test con decimales (0.0)" "jsonb_set(d, '{cursos,0,testInicial,0,correcta}', '0.0')" \
  "pregunta del test $T0: «correcta» debe estar entre 0 y"
debe_rechazar "unos minutos de lectura que no caben en la base de datos" \
  "jsonb_set(d, '{cursos,0,lecciones,0,duracionLectura}', '40000')" \
  "lección $L0: «duracionLectura» debe ser un número entero de minutos, de 1 a 32767"
debe_rechazar "un vídeo de la lección escrito como número, con un solo fallo" \
  "jsonb_set(d, '{cursos,0,lecciones,0,videoId}', '5')" "Hay 1 error:" "lección $L0: «videoId» debe ser un texto"
debe_rechazar "un identificador escrito como número" "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0,id}', '5')" \
  "actividad n.º 1 de la lección $L0: «id» debe ser un texto"
debe_rechazar "una actividad de verdadero o falso con solución" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0}', jsonb_build_object('id', '$A0', 'tipo', 'vf',
     'enunciado', 'x', 'correcta', true, 'solucion', 'algo'))" \
  "actividad $A0: es «vf» y no puede tener «solucion»"
debe_rechazar "una actividad de verdadero o falso con palabras clave" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0}', jsonb_build_object('id', '$A0', 'tipo', 'vf',
     'enunciado', 'x', 'correcta', true, 'palabrasClave', 'algo'))" \
  "actividad $A0: es «vf» y no puede tener «palabrasClave»"
debe_rechazar "unas palabras clave con un nulo" \
  "jsonb_set(d, '{cursos,0,lecciones,0,actividades,0}', jsonb_build_object('id', '$A0', 'tipo', 'escrita',
     'enunciado', 'x', 'solucion', 'print', 'palabrasClave', jsonb_build_array('print', null)))" \
  "actividad $A0: «palabrasClave» solo puede tener textos no vacíos"
debe_rechazar "unas opciones del test con una vacía" \
  "jsonb_set(d, '{cursos,0,testInicial,0,opciones}', '[\"a\", \"\", \"b\", \"c\"]')" \
  "pregunta del test $T0: «opciones» solo puede tener textos no vacíos"
debe_rechazar "una lectura con un párrafo que no es texto" \
  "jsonb_set(d, '{cursos,0,lecciones,0,lectura}', '[\"Un párrafo.\", 5]')" \
  "lección $L0: «lectura» solo puede tener textos no vacíos"
debe_rechazar "dos vídeos con el mismo vídeo de YouTube" \
  "jsonb_set(d, '{cursos,0,videos,1,youtubeId}', d #> '{cursos,0,videos,0,youtubeId}')" \
  "identificador de YouTube repetido"
debe_aceptar "dos trozos que se solapan 30 segundos" \
  "jsonb_set(d, '{cursos,0,lecciones,1,inicioS}', to_jsonb((d #>> '{cursos,0,lecciones,0,finS}')::int - 30))"

# Todos los fallos a la vez.
debe_rechazar "un fichero con dos fallos, y los dice los dos" \
  "jsonb_set(d #- '{cursos,0,lecciones,0,titulo}', '{cursos,0,videos,0,duracion}', '0')" \
  "Hay 2 errores" "vídeo $V0: «duracion»" "lección $L0: falta «titulo»"
echo "Todas las pruebas de la validación del curso pasan."
