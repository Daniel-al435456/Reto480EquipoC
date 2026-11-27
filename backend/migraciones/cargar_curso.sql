-- Carga en la base de datos el curso de ejemplo (issue #15). Lo ejecuta cargar_curso.sh en una sola transacción.
-- Recibe en la variable de entorno ARCHIVO_CURSO la ruta del JSON (por defecto, app/datos/cursos-ejemplo.json)
-- y lo lee aquí, en la variable de psql datos. No se pasa como argumento porque falla a partir de 128 KB.
\set datos `cat -- "$ARCHIVO_CURSO"`
--
-- Del JSON a las tablas:
--   curso              → cursos
--   vídeo              → videos, en el orden del fichero
--   lección            → lecciones: un trozo de un vídeo (inicio_s y fin_s) con su aviso, si lo tiene, y su concepto en conceptos
--                        y lecciones_conceptos (mismo id que la lección)
--   actividad          → preguntas de comprobación de su lección:
--                        vf, con dos opciones (Verdadero y Falso) y la correcta marcada;
--                        escrita, con su solución y sus palabras clave
--   pregunta del test  → preguntas de diagnóstico del concepto de su lección, con sus opciones
--                        (la posición 0 del fichero es el orden 1)
--
-- Se puede ejecutar varias veces. Lo que ya existe se actualiza (INSERT ... ON CONFLICT) y no se borra, así
-- que se conservan las matrículas, los dominios, las sesiones y los eventos de los alumnos. Lo que un curso
-- del fichero ya no tiene (una lección, una actividad) sí se borra, con lo que dependa de ello.

CREATE TEMP TABLE cursos_json AS
  SELECT c->>'id' AS id, c
  FROM jsonb_array_elements(:'datos'::jsonb -> 'cursos') AS c;
CREATE TEMP TABLE videos_json AS
  SELECT cj.id AS curso_id, v->>'id' AS id, v, n::smallint AS orden
  FROM cursos_json cj, jsonb_array_elements(cj.c -> 'videos') WITH ORDINALITY AS t(v, n);
CREATE TEMP TABLE lecciones_json AS
  SELECT cj.id AS curso_id, l->>'id' AS id, l, n::smallint AS orden
  FROM cursos_json cj, jsonb_array_elements(cj.c -> 'lecciones') WITH ORDINALITY AS t(l, n);
CREATE TEMP TABLE actividades_json AS
  SELECT lj.id AS leccion_id, a->>'id' AS id, a
  FROM lecciones_json lj, jsonb_array_elements(lj.l -> 'actividades') AS a;
CREATE TEMP TABLE test_json AS
  SELECT p->>'id' AS id, p
  FROM cursos_json cj, jsonb_array_elements(cj.c -> 'testInicial') AS p;

-- Cursos.
INSERT INTO cursos (id, titulo, descripcion, nivel)
SELECT id, c->>'titulo', c->>'descripcion', c->>'nivel'
FROM cursos_json
ON CONFLICT (id) DO UPDATE
  SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, nivel = EXCLUDED.nivel;

-- Vídeos. Primero se apartan los órdenes y los identificadores de YouTube actuales, para que cambiar el orden
-- de los vídeos o pasar un identificador de un vídeo a otro no choque con UNIQUE (curso_id, orden) ni con
-- UNIQUE (youtube_id). La transcripción no está en el fichero: si ya había una, se conserva.
UPDATE videos SET orden = orden + 1000, youtube_id = NULL WHERE curso_id IN (SELECT id FROM cursos_json);
INSERT INTO videos (id, curso_id, titulo, youtube_id, duracion_s, orden)
SELECT id, curso_id, v->>'titulo', NULLIF(v->>'youtubeId', ''), (v->>'duracion')::integer, orden
FROM videos_json
ON CONFLICT (id) DO UPDATE
  SET curso_id = EXCLUDED.curso_id, titulo = EXCLUDED.titulo, youtube_id = EXCLUDED.youtube_id,
      duracion_s = EXCLUDED.duracion_s, orden = EXCLUDED.orden;

-- Lecciones: cada una es un trozo de su vídeo, de inicio_s a fin_s.
INSERT INTO lecciones (id, video_id, titulo, descripcion, inicio_s, fin_s, aviso, duracion_lectura_min, resumen, lectura)
SELECT id, l->>'videoId', l->>'titulo', l->>'descripcion', (l->>'inicioS')::integer, (l->>'finS')::integer,
       l->>'aviso', (l->>'duracionLectura')::smallint, l->>'resumen',
       array_to_string(ARRAY(SELECT jsonb_array_elements_text(l->'lectura')), E'\n\n')
FROM lecciones_json
ON CONFLICT (id) DO UPDATE
  SET video_id = EXCLUDED.video_id, titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion,
      inicio_s = EXCLUDED.inicio_s, fin_s = EXCLUDED.fin_s, aviso = EXCLUDED.aviso,
      duracion_lectura_min = EXCLUDED.duracion_lectura_min, resumen = EXCLUDED.resumen,
      lectura = EXCLUDED.lectura;

-- Conceptos: uno por lección.
INSERT INTO conceptos (id, curso_id, nombre)
SELECT id, curso_id, l->>'concepto'
FROM lecciones_json
ON CONFLICT (id) DO UPDATE SET curso_id = EXCLUDED.curso_id, nombre = EXCLUDED.nombre;
INSERT INTO lecciones_conceptos (leccion_id, concepto_id)
SELECT id, id FROM lecciones_json
ON CONFLICT DO NOTHING;

-- Preguntas: las actividades de cada lección y las del test inicial. La dificultad no está en el fichero:
-- si ya había una, se conserva.
INSERT INTO preguntas (id, concepto_id, leccion_id, uso, formato, enunciado, solucion, explicacion)
SELECT id, leccion_id, leccion_id, 'comprobacion', a->>'tipo', a->>'enunciado', a->>'solucion', a->>'explicacion'
FROM actividades_json
UNION ALL
SELECT id, p->>'leccionId', NULL, 'diagnostico', 'test', p->>'enunciado', NULL, NULL
FROM test_json
ON CONFLICT (id) DO UPDATE
  SET concepto_id = EXCLUDED.concepto_id, leccion_id = EXCLUDED.leccion_id, uso = EXCLUDED.uso,
      formato = EXCLUDED.formato, enunciado = EXCLUDED.enunciado, solucion = EXCLUDED.solucion,
      explicacion = EXCLUDED.explicacion;

-- Opciones y palabras clave: se rehacen enteras en cada carga (nada de los alumnos apunta a ellas).
DELETE FROM opciones_pregunta
WHERE pregunta_id IN (SELECT id FROM actividades_json UNION ALL SELECT id FROM test_json);
INSERT INTO opciones_pregunta (pregunta_id, orden, texto, correcta)
SELECT id, 1, 'Verdadero', (a->>'correcta')::boolean FROM actividades_json WHERE a->>'tipo' = 'vf'
UNION ALL
SELECT id, 2, 'Falso', NOT (a->>'correcta')::boolean FROM actividades_json WHERE a->>'tipo' = 'vf'
UNION ALL
SELECT tj.id, o.n, o.texto, o.n - 1 = (tj.p->>'correcta')::integer
FROM test_json tj, jsonb_array_elements_text(tj.p->'opciones') WITH ORDINALITY AS o(texto, n);

DELETE FROM palabras_clave WHERE pregunta_id IN (SELECT id FROM actividades_json);
INSERT INTO palabras_clave (pregunta_id, palabra)
SELECT id, palabra
FROM actividades_json, jsonb_array_elements_text(a->'palabrasClave') AS palabra
ON CONFLICT DO NOTHING;

-- Lo que estos cursos ya no tienen en el fichero. No toca cursos que no estén en el fichero.
DELETE FROM preguntas p USING conceptos co
WHERE p.concepto_id = co.id
  AND co.curso_id IN (SELECT id FROM cursos_json)
  AND p.id NOT IN (SELECT id FROM actividades_json UNION ALL SELECT id FROM test_json);
DELETE FROM lecciones le USING videos v
WHERE le.video_id = v.id
  AND v.curso_id IN (SELECT id FROM cursos_json)
  AND le.id NOT IN (SELECT id FROM lecciones_json);
DELETE FROM videos
WHERE curso_id IN (SELECT id FROM cursos_json) AND id NOT IN (SELECT id FROM videos_json);
DELETE FROM conceptos
WHERE curso_id IN (SELECT id FROM cursos_json) AND id NOT IN (SELECT id FROM lecciones_json);
