-- Comprueba el curso antes de cargarlo (issue #50). Lo incluye cargar_curso.sql, con el JSON en :'datos'.
-- Si algo no cumple las reglas, detiene la carga con un error que lista todos los fallos, cada uno con el
-- identificador afectado. Como cargar_curso.sh carga en una sola transacción, la base de datos se queda
-- como estaba. Además deja el fichero en forma de tablas temporales, que usa cargar_curso.sql.
--
-- Las reglas salen de SPEC.md (H1 y H5), del esquema (001_esquema_inicial.sql) y de las pruebas del curso
-- de muestra en frontend/pruebas/unitarias/curso.test.js:
--   estructura:   hay cursos, y cada uno tiene las listas videos, lecciones y testInicial, de objetos.
--   campos:       los que necesitan las tablas y la app, con su tipo. Los números, enteros y sin decimales.
--   ids:          minúsculas, números y guiones, sin repetirse en el fichero. Tampoco se repite el vídeo
--                 de YouTube (youtube_id es UNIQUE).
--   trozos:       cada lección es un trozo de un vídeo de su curso, dentro de su duración. Los trozos de
--                 cada vídeo empiezan en 0, llegan al final y no dejan huecos (pueden solaparse).
--   actividades:  2 o 3 por lección (H5). vf con correcta true o false y sin solución ni palabras clave;
--                 escrita con solución y palabras clave.
--   test inicial: 12 preguntas como mucho (H1) y una por vídeo como mucho (curso.test.js), de lecciones del
--                 curso, con 2 o más opciones y la correcta entre ellas.
-- De curso.test.js no se comprueban aquí el youtubeId y la duracionVideo de cada lección (no se guardan:
-- salen de su vídeo y de su trozo), que cada trozo quepa en 10 minutos con sus actividades y que la solución
-- de las escritas contenga sus palabras clave. Son reglas de calidad del contenido, no de lo que necesitan
-- la base de datos y la app para funcionar, y ya las prueba el frontend.

-- Sin el contexto de PL/pgSQL en el mensaje de error: solo la lista de fallos.
\set VERBOSITY terse

-- Lo primero, que el fichero sea JSON. pg_input_is_valid necesita PostgreSQL 16 o posterior.
CREATE FUNCTION pg_temp.detener(mensaje text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'El curso no se ha cargado. %', mensaje;
END $$;
SELECT pg_input_is_valid(:'datos', 'jsonb') AS json_valido \gset
\if :json_valido
\else
  SELECT pg_temp.detener('El fichero no es un JSON válido: revisa las comas, las comillas y los corchetes.');
\endif

-- Ayudas: miran si un valor tiene el tipo esperado. Así un campo con otro tipo da un fallo claro en la
-- lista, y no un error de PostgreSQL al convertirlo durante la carga.
CREATE FUNCTION pg_temp.lista(valor jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(valor) = 'array' THEN valor ELSE '[]'::jsonb END
$$;
-- El número entero, o NULL si no es un número entero escrito sin decimales (cargar_curso.sql convierte
-- el texto con ::integer, que no acepta "786.0").
CREATE FUNCTION pg_temp.entero(valor jsonb) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF jsonb_typeof(valor) = 'number' AND valor::text ~ '^-?[0-9]{1,9}$' THEN
    RETURN valor::text::integer;
  END IF;
  RETURN NULL;
END $$;
CREATE FUNCTION pg_temp.hay_texto(valor jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_typeof(valor) = 'string' AND btrim(valor #>> '{}') <> '', false)
$$;
-- Qué le pasa a un campo de texto obligatorio, o NULL si está bien.
CREATE FUNCTION pg_temp.problema_texto(valor jsonb, campo text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
           WHEN coalesce(jsonb_typeof(valor), 'null') = 'null' THEN format('falta «%s»', campo)
           WHEN jsonb_typeof(valor) <> 'string' THEN format('«%s» debe ser un texto', campo)
           WHEN btrim(valor #>> '{}') = '' THEN format('falta «%s»', campo)
         END
$$;
-- Si una lista tiene algún elemento que no sea un texto no vacío.
CREATE FUNCTION pg_temp.hay_no_textos(valor jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT EXISTS (SELECT FROM jsonb_array_elements(pg_temp.lista(valor)) AS e WHERE NOT pg_temp.hay_texto(e))
$$;
CREATE FUNCTION pg_temp.longitud(valor jsonb) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_array_length(pg_temp.lista(valor))
$$;

-- El fichero en forma de tablas, solo con los elementos que son objetos (los demás se avisan abajo).
-- nombre identifica cada elemento en los mensajes: su id o, si no lo tiene, su posición.
CREATE TEMP TABLE cursos_json AS
  SELECT c->>'id' AS id, c, n::smallint AS orden,
         CASE WHEN pg_temp.hay_texto(c -> 'id') THEN c->>'id' ELSE 'n.º ' || n END AS nombre
  FROM jsonb_array_elements(pg_temp.lista(:'datos'::jsonb -> 'cursos')) WITH ORDINALITY AS t(c, n)
  WHERE jsonb_typeof(c) = 'object';
CREATE TEMP TABLE videos_json AS
  SELECT cj.id AS curso_id, v->>'id' AS id, v, n::smallint AS orden,
         CASE WHEN pg_temp.hay_texto(v -> 'id') THEN v->>'id'
              ELSE format('n.º %s del curso %s', n, cj.nombre) END AS nombre
  FROM cursos_json cj, jsonb_array_elements(pg_temp.lista(cj.c -> 'videos')) WITH ORDINALITY AS t(v, n)
  WHERE jsonb_typeof(v) = 'object';
CREATE TEMP TABLE lecciones_json AS
  SELECT cj.id AS curso_id, l->>'id' AS id, l, n::smallint AS orden,
         CASE WHEN pg_temp.hay_texto(l -> 'id') THEN l->>'id'
              ELSE format('n.º %s del curso %s', n, cj.nombre) END AS nombre
  FROM cursos_json cj, jsonb_array_elements(pg_temp.lista(cj.c -> 'lecciones')) WITH ORDINALITY AS t(l, n)
  WHERE jsonb_typeof(l) = 'object';
CREATE TEMP TABLE actividades_json AS
  SELECT lj.id AS leccion_id, a->>'id' AS id, a, n::smallint AS orden, lj.orden AS leccion_orden,
         CASE WHEN pg_temp.hay_texto(a -> 'id') THEN a->>'id'
              ELSE format('n.º %s de la lección %s', n, lj.nombre) END AS nombre
  FROM lecciones_json lj, jsonb_array_elements(pg_temp.lista(lj.l -> 'actividades')) WITH ORDINALITY AS t(a, n)
  WHERE jsonb_typeof(a) = 'object';
CREATE TEMP TABLE test_json AS
  SELECT cj.id AS curso_id, p->>'id' AS id, p, n::smallint AS orden,
         CASE WHEN pg_temp.hay_texto(p -> 'id') THEN p->>'id'
              ELSE format('n.º %s del curso %s', n, cj.nombre) END AS nombre
  FROM cursos_json cj, jsonb_array_elements(pg_temp.lista(cj.c -> 'testInicial')) WITH ORDINALITY AS t(p, n)
  WHERE jsonb_typeof(p) = 'object';

CREATE TEMP TABLE errores_curso (n serial, mensaje text NOT NULL);

-- 1. Estructura.
INSERT INTO errores_curso (mensaje)
SELECT 'falta la lista «cursos», con al menos un curso'
WHERE pg_temp.longitud(:'datos'::jsonb -> 'cursos') = 0;
INSERT INTO errores_curso (mensaje)
SELECT format('curso %s: falta la lista «%s»', cj.nombre, lista)
FROM cursos_json cj, unnest(ARRAY['videos', 'lecciones', 'testInicial']) WITH ORDINALITY AS t(lista, n)
WHERE jsonb_typeof(cj.c -> lista) IS DISTINCT FROM 'array'
ORDER BY cj.orden, t.n;
INSERT INTO errores_curso (mensaje)
SELECT format('%s n.º %s%s: debe ser un objeto con sus datos, entre llaves', que, n, dentro)
FROM (
  SELECT 1 AS grupo, 0 AS padre, n, 'curso' AS que, '' AS dentro
  FROM jsonb_array_elements(pg_temp.lista(:'datos'::jsonb -> 'cursos')) WITH ORDINALITY AS t(e, n)
  WHERE jsonb_typeof(e) <> 'object'
  UNION ALL
  SELECT 2, cj.orden, n, 'vídeo', ' del curso ' || cj.nombre
  FROM cursos_json cj, jsonb_array_elements(pg_temp.lista(cj.c -> 'videos')) WITH ORDINALITY AS t(e, n)
  WHERE jsonb_typeof(e) <> 'object'
  UNION ALL
  SELECT 3, cj.orden, n, 'lección', ' del curso ' || cj.nombre
  FROM cursos_json cj, jsonb_array_elements(pg_temp.lista(cj.c -> 'lecciones')) WITH ORDINALITY AS t(e, n)
  WHERE jsonb_typeof(e) <> 'object'
  UNION ALL
  SELECT 4, lj.orden, n, 'actividad', ' de la lección ' || lj.nombre
  FROM lecciones_json lj, jsonb_array_elements(pg_temp.lista(lj.l -> 'actividades')) WITH ORDINALITY AS t(e, n)
  WHERE jsonb_typeof(e) <> 'object'
  UNION ALL
  SELECT 5, cj.orden, n, 'pregunta del test', ' del curso ' || cj.nombre
  FROM cursos_json cj, jsonb_array_elements(pg_temp.lista(cj.c -> 'testInicial')) WITH ORDINALITY AS t(e, n)
  WHERE jsonb_typeof(e) <> 'object'
) AS no_objetos
ORDER BY grupo, padre, n;

-- 2. Campos de texto obligatorios.
INSERT INTO errores_curso (mensaje)
SELECT format('%s %s: %s', que, nombre, problema)
FROM (
  SELECT 1 AS grupo, orden, k, 'curso' AS que, nombre, pg_temp.problema_texto(c -> campo, campo) AS problema
  FROM cursos_json, unnest(ARRAY['titulo']) WITH ORDINALITY AS t(campo, k)
  UNION ALL
  SELECT 2, orden, k, 'vídeo', nombre, pg_temp.problema_texto(v -> campo, campo)
  FROM videos_json, unnest(ARRAY['titulo']) WITH ORDINALITY AS t(campo, k)
  UNION ALL
  SELECT 3, orden, k, 'lección', nombre, pg_temp.problema_texto(l -> campo, campo)
  FROM lecciones_json, unnest(ARRAY['videoId', 'titulo', 'concepto', 'resumen']) WITH ORDINALITY AS t(campo, k)
  UNION ALL
  SELECT 4, orden, k, 'pregunta del test', nombre, pg_temp.problema_texto(p -> campo, campo)
  FROM test_json, unnest(ARRAY['leccionId', 'enunciado']) WITH ORDINALITY AS t(campo, k)
) AS campos
WHERE problema IS NOT NULL
ORDER BY grupo, orden, k;

-- Vídeos: duración y vídeo de YouTube, que es opcional (un vídeo aún sin elegir).
INSERT INTO errores_curso (mensaje)
SELECT format('vídeo %s: %s', nombre, problema)
FROM (
  SELECT orden, nombre, 1 AS k,
         '«duracion» debe ser un número entero mayor que 0 (los segundos que dura)' AS problema
  FROM videos_json WHERE coalesce(pg_temp.entero(v -> 'duracion') <= 0, true)
  UNION ALL
  SELECT orden, nombre, 2, '«youtubeId» debe ser un texto'
  FROM videos_json WHERE coalesce(jsonb_typeof(v -> 'youtubeId'), 'null') NOT IN ('null', 'string')
) AS problemas
ORDER BY orden, k;

-- Lecciones: lectura, minutos de lectura (smallint en la tabla), trozo y lista de actividades.
INSERT INTO errores_curso (mensaje)
SELECT format('lección %s: %s', nombre, problema)
FROM (
  SELECT orden, nombre, 1 AS k, 'falta «lectura», una lista de párrafos' AS problema
  FROM lecciones_json WHERE pg_temp.longitud(l -> 'lectura') = 0
  UNION ALL
  SELECT orden, nombre, 2, '«lectura» solo puede tener textos no vacíos'
  FROM lecciones_json WHERE pg_temp.hay_no_textos(l -> 'lectura')
  UNION ALL
  SELECT orden, nombre, 3, '«duracionLectura» debe ser un número entero de minutos, de 1 a 32767'
  FROM lecciones_json WHERE coalesce(pg_temp.entero(l -> 'duracionLectura') NOT BETWEEN 1 AND 32767, true)
  UNION ALL
  SELECT orden, nombre, 4, '«inicioS» debe ser un número entero de segundos, 0 o más'
  FROM lecciones_json WHERE coalesce(pg_temp.entero(l -> 'inicioS') < 0, true)
  UNION ALL
  SELECT orden, nombre, 5, '«finS» debe ser un número entero de segundos'
  FROM lecciones_json WHERE pg_temp.entero(l -> 'finS') IS NULL
  UNION ALL
  SELECT orden, nombre, 6, '«finS» debe ser mayor que «inicioS»'
  FROM lecciones_json WHERE pg_temp.entero(l -> 'finS') <= pg_temp.entero(l -> 'inicioS')
  UNION ALL
  SELECT orden, nombre, 7, 'falta la lista «actividades»'
  FROM lecciones_json WHERE jsonb_typeof(l -> 'actividades') IS DISTINCT FROM 'array'
) AS problemas
ORDER BY orden, k;

-- 3. Identificadores: válidos para la base de datos y sin repetirse. Los cursos van en su propia tabla;
-- el resto se comprueba junto (las actividades y las preguntas del test comparten la tabla preguntas, y
-- cada lección da nombre a su concepto).
CREATE TEMP TABLE ids_json AS
  SELECT 1 AS grupo, 'curso' AS ambito, orden, 'curso' AS que, nombre, c -> 'id' AS valor FROM cursos_json
  UNION ALL SELECT 2, 'contenido', orden, 'vídeo', nombre, v -> 'id' FROM videos_json
  UNION ALL SELECT 3, 'contenido', orden, 'lección', nombre, l -> 'id' FROM lecciones_json
  UNION ALL SELECT 4, 'contenido', orden, 'actividad', nombre, a -> 'id' FROM actividades_json
  UNION ALL SELECT 5, 'contenido', orden, 'pregunta del test', nombre, p -> 'id' FROM test_json;
INSERT INTO errores_curso (mensaje)
SELECT CASE
         WHEN NOT pg_temp.hay_texto(valor) THEN format('%s %s: %s', que, nombre, pg_temp.problema_texto(valor, 'id'))
         ELSE format('identificador «%s» no válido: solo puede tener minúsculas, números y guiones, '
                     'como «variables-1»', valor #>> '{}')
       END
FROM ids_json
WHERE NOT pg_temp.hay_texto(valor) OR (valor #>> '{}') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
ORDER BY grupo, orden;
INSERT INTO errores_curso (mensaje)
SELECT format('identificador repetido: %s (%s veces)', valor #>> '{}', count(*))
FROM ids_json
WHERE pg_temp.hay_texto(valor)
GROUP BY ambito, valor #>> '{}'
HAVING count(*) > 1
ORDER BY min(grupo), min(orden);
INSERT INTO errores_curso (mensaje)
SELECT format('identificador de YouTube repetido: %s (vídeos %s)', v ->> 'youtubeId',
              string_agg(nombre, ', ' ORDER BY orden))
FROM videos_json
WHERE pg_temp.hay_texto(v -> 'youtubeId')
GROUP BY v ->> 'youtubeId'
HAVING count(*) > 1
ORDER BY min(orden);

-- 4. Trozos de vídeo.
CREATE TEMP TABLE trozos_json AS
  -- Una duración no válida ya tiene su fallo: no se usa para comprobar los trozos, para no repetirlo.
  SELECT lj.curso_id, lj.nombre, lj.orden, lj.l ->> 'videoId' AS video_id, vj.nombre AS video,
         pg_temp.hay_texto(lj.l -> 'videoId') AS video_es_texto,
         nullif(greatest(pg_temp.entero(vj.v -> 'duracion'), 0), 0) AS duracion,
         pg_temp.entero(lj.l -> 'inicioS') AS inicio, pg_temp.entero(lj.l -> 'finS') AS fin,
         vj.id IS NOT NULL AS video_existe
  FROM lecciones_json lj
  LEFT JOIN videos_json vj
    ON pg_temp.hay_texto(lj.l -> 'videoId') AND vj.id = lj.l ->> 'videoId'
   AND vj.curso_id IS NOT DISTINCT FROM lj.curso_id;
INSERT INTO errores_curso (mensaje)
SELECT CASE
         WHEN NOT video_existe THEN format('lección %s: su vídeo %s no está en el curso', nombre, video_id)
         ELSE format('lección %s: acaba en el segundo %s, después del final de su vídeo %s, que dura %s',
                     nombre, fin, video, duracion)
       END
FROM trozos_json
WHERE video_es_texto AND (NOT video_existe OR fin > duracion)
ORDER BY orden;

-- Cobertura de cada vídeo: primer inicio, último fin y huecos. Solo en los cursos en que todos los trozos
-- están bien formados: si una lección no dice bien de qué vídeo es o dónde empieza y acaba, no se sabe qué
-- parte cubre, y los fallos de cobertura serían consecuencia del suyo.
-- Un trozo deja hueco si empieza después del fin más tardío de los trozos anteriores.
CREATE TEMP TABLE cobertura_json AS
  SELECT video, duracion, inicio, fin,
         max(fin) OVER (PARTITION BY video ORDER BY inicio, fin
                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS cubierto_hasta
  FROM trozos_json t
  WHERE NOT EXISTS (SELECT FROM trozos_json m
                    WHERE m.curso_id IS NOT DISTINCT FROM t.curso_id
                      AND (NOT m.video_existe OR m.inicio IS NULL OR m.inicio < 0 OR m.fin IS NULL
                           OR m.fin <= m.inicio));
INSERT INTO errores_curso (mensaje)
SELECT mensaje FROM (
  SELECT vj.orden, 1 AS k, format('vídeo %s: no tiene lecciones', vj.nombre) AS mensaje
  FROM videos_json vj
  WHERE NOT EXISTS (SELECT FROM trozos_json t WHERE t.video_existe AND t.video = vj.nombre)
    AND NOT EXISTS (SELECT FROM trozos_json m
                    WHERE m.curso_id IS NOT DISTINCT FROM vj.curso_id AND NOT m.video_existe)
  UNION ALL
  SELECT vj.orden, 2, format('vídeo %s: el primer trozo empieza en el segundo %s y debe empezar en el 0',
                             vj.nombre, min(c.inicio))
  FROM videos_json vj JOIN cobertura_json c ON c.video = vj.nombre
  GROUP BY vj.orden, vj.nombre HAVING min(c.inicio) > 0
  UNION ALL
  SELECT vj.orden, 3, format('vídeo %s: hay un hueco entre el segundo %s y el %s que no cubre ninguna lección',
                             vj.nombre, c.cubierto_hasta, c.inicio)
  FROM videos_json vj JOIN cobertura_json c ON c.video = vj.nombre
  WHERE c.inicio > c.cubierto_hasta
  UNION ALL
  SELECT vj.orden, 4, format('vídeo %s: el último trozo acaba en el segundo %s y el vídeo dura %s',
                             vj.nombre, max(c.fin), max(c.duracion))
  FROM videos_json vj JOIN cobertura_json c ON c.video = vj.nombre
  GROUP BY vj.orden, vj.nombre HAVING max(c.fin) < max(c.duracion)
) AS problemas
ORDER BY orden, k;

-- 5. Actividades (H5).
INSERT INTO errores_curso (mensaje)
SELECT format('lección %s: debe tener 2 o 3 actividades y tiene %s', nombre, jsonb_array_length(l -> 'actividades'))
FROM lecciones_json
WHERE jsonb_typeof(l -> 'actividades') = 'array' AND jsonb_array_length(l -> 'actividades') NOT BETWEEN 2 AND 3
ORDER BY orden;

INSERT INTO errores_curso (mensaje)
SELECT format('actividad %s: %s', aj.nombre, problema)
FROM actividades_json aj
CROSS JOIN LATERAL (
  SELECT 1 AS k, pg_temp.problema_texto(aj.a -> 'enunciado', 'enunciado') AS problema
  UNION ALL
  SELECT 2, 'el tipo debe ser «vf» o «escrita»'
  WHERE (aj.a ->> 'tipo') IS DISTINCT FROM 'vf' AND (aj.a ->> 'tipo') IS DISTINCT FROM 'escrita'
  UNION ALL
  SELECT 3, 'es «vf» y le falta «correcta» (true o false)'
  WHERE aj.a ->> 'tipo' = 'vf' AND jsonb_typeof(aj.a -> 'correcta') IS DISTINCT FROM 'boolean'
  UNION ALL
  SELECT 4, format('es «vf» y no puede tener «%s»: es de las actividades escritas', campo)
  FROM unnest(ARRAY['solucion', 'palabrasClave']) AS campo
  WHERE aj.a ->> 'tipo' = 'vf' AND coalesce(jsonb_typeof(aj.a -> campo), 'null') <> 'null'
  UNION ALL
  SELECT 5, 'es «escrita» y le falta «solucion»'
  WHERE aj.a ->> 'tipo' = 'escrita' AND NOT pg_temp.hay_texto(aj.a -> 'solucion')
  UNION ALL
  SELECT 6, 'es «escrita» y le faltan las palabras clave («palabrasClave»)'
  WHERE aj.a ->> 'tipo' = 'escrita' AND pg_temp.longitud(aj.a -> 'palabrasClave') = 0
  UNION ALL
  SELECT 7, '«palabrasClave» solo puede tener textos no vacíos'
  WHERE aj.a ->> 'tipo' = 'escrita' AND pg_temp.hay_no_textos(aj.a -> 'palabrasClave')
) AS problemas
WHERE problema IS NOT NULL
ORDER BY aj.leccion_orden, aj.orden, problemas.k;

-- 6. Test inicial (H1).
INSERT INTO errores_curso (mensaje)
SELECT format('curso %s: el test inicial tiene %s preguntas y como mucho puede tener 12',
              cj.nombre, jsonb_array_length(cj.c -> 'testInicial'))
FROM cursos_json cj
WHERE jsonb_typeof(cj.c -> 'testInicial') = 'array' AND jsonb_array_length(cj.c -> 'testInicial') > 12
ORDER BY cj.orden;

INSERT INTO errores_curso (mensaje)
SELECT format('pregunta del test %s: %s', tj.nombre, problema)
FROM test_json tj
CROSS JOIN LATERAL (SELECT pg_temp.longitud(tj.p -> 'opciones') AS opciones) AS o
CROSS JOIN LATERAL (
  SELECT 1 AS k, format('su lección %s no está en el curso', tj.p ->> 'leccionId') AS problema
  WHERE pg_temp.hay_texto(tj.p -> 'leccionId')
    AND NOT EXISTS (SELECT FROM lecciones_json lj
                    WHERE lj.id = tj.p ->> 'leccionId' AND lj.curso_id IS NOT DISTINCT FROM tj.curso_id)
  UNION ALL
  SELECT 2, 'debe tener al menos 2 opciones' WHERE o.opciones < 2
  UNION ALL
  SELECT 3, '«opciones» solo puede tener textos no vacíos' WHERE pg_temp.hay_no_textos(tj.p -> 'opciones')
  UNION ALL
  SELECT 4, format('«correcta» debe estar entre 0 y %s: es la posición de la opción buena, empezando en 0',
                   o.opciones - 1)
  WHERE o.opciones >= 2 AND coalesce(pg_temp.entero(tj.p -> 'correcta') NOT BETWEEN 0 AND o.opciones - 1, true)
) AS problemas
ORDER BY tj.orden, problemas.k;

INSERT INTO errores_curso (mensaje)
SELECT format('vídeo %s: tiene %s preguntas en el test inicial y como mucho puede tener 1', vj.nombre, count(*))
FROM test_json tj
JOIN lecciones_json lj ON lj.id = tj.p ->> 'leccionId' AND lj.curso_id IS NOT DISTINCT FROM tj.curso_id
JOIN videos_json vj ON vj.id = lj.l ->> 'videoId' AND vj.curso_id IS NOT DISTINCT FROM lj.curso_id
GROUP BY vj.orden, vj.nombre
HAVING count(*) > 1
ORDER BY vj.orden;

-- Si hay algún fallo, se detiene la carga y se dicen todos.
DO $$
DECLARE
  total integer;
  lista text;
BEGIN
  SELECT count(*), string_agg('- ' || mensaje, E'\n' ORDER BY n) INTO total, lista FROM errores_curso;
  IF total > 0 THEN
    RAISE EXCEPTION E'El curso no se ha cargado. Hay % %:\n%',
      total, CASE WHEN total = 1 THEN 'error' ELSE 'errores' END, lista;
  END IF;
END $$;

-- La carga sigue con los mensajes completos: si la base de datos rechaza algo, el detalle dice qué fila.
\set VERBOSITY default
