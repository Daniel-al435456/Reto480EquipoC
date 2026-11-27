-- Pruebas de la carga del curso de ejemplo en la base de datos (issue #15).
-- Las ejecuta probar.sh sobre una base de datos temporal, en cuatro fases, después de cada carga:
--   primera: tras cargar el fichero por primera vez. Además crea los datos de un alumno.
--   segunda: tras volver a cargar el mismo fichero: no se duplica nada ni se borran datos de alumnos.
--   cambios: tras cargar el fichero con otro vídeo de YouTube en el primer vídeo y una actividad menos.
--   grande:  tras cargar el fichero con más de 128 KB (como cuando lleve las transcripciones).
-- Recibe la variable de psql fase y, en la variable de entorno ARCHIVO_CURSO, la ruta del JSON que se
-- acaba de cargar. Lo esperado se calcula a partir de ese JSON, así que las pruebas siguen valiendo
-- si cambia el contenido del curso.

\set ON_ERROR_STOP 1
\set QUIET 1
-- psql lee el fichero él mismo: pasarlo como argumento falla a partir de 128 KB.
\set datos `cat -- "$ARCHIVO_CURSO"`

CREATE FUNCTION pg_temp.comprobar(condicion boolean, descripcion text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicion IS NOT TRUE THEN
    RAISE EXCEPTION 'FALLO %', descripcion;
  END IF;
  RAISE NOTICE 'ok   %', descripcion;
END $$;

-- Lo que dice el fichero, en forma de tablas.
CREATE TEMP TABLE cursos_esperados AS
  SELECT c->>'id' AS id, c
  FROM jsonb_array_elements(:'datos'::jsonb -> 'cursos') AS c;
CREATE TEMP TABLE videos_esperados AS
  SELECT ce.id AS curso_id, v->>'id' AS id, v, n AS orden
  FROM cursos_esperados ce, jsonb_array_elements(ce.c -> 'videos') WITH ORDINALITY AS t(v, n);
CREATE TEMP TABLE lecciones_esperadas AS
  SELECT ce.id AS curso_id, l->>'id' AS id, l, n AS orden
  FROM cursos_esperados ce, jsonb_array_elements(ce.c -> 'lecciones') WITH ORDINALITY AS t(l, n);
CREATE TEMP TABLE actividades_esperadas AS
  SELECT le.id AS leccion_id, a->>'id' AS id, a
  FROM lecciones_esperadas le, jsonb_array_elements(le.l -> 'actividades') AS a;
CREATE TEMP TABLE test_esperado AS
  SELECT ce.id AS curso_id, p->>'id' AS id, p
  FROM cursos_esperados ce, jsonb_array_elements(ce.c -> 'testInicial') AS p;

SELECT :'fase' = 'primera' AS es_primera \gset

-- 1. Curso.
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM cursos) = (SELECT count(*) FROM cursos_esperados)
  AND NOT EXISTS (
    SELECT FROM cursos_esperados ce LEFT JOIN cursos c ON c.id = ce.id
    WHERE c.titulo IS DISTINCT FROM ce.c->>'titulo'
       OR c.descripcion IS DISTINCT FROM ce.c->>'descripcion'
       OR c.nivel IS DISTINCT FROM ce.c->>'nivel'),
  'cada curso del fichero está en la base de datos, con su título, descripción y nivel');

-- 2. Vídeos y lecciones.
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM videos) = (SELECT count(*) FROM videos_esperados)
  AND NOT EXISTS (
    SELECT FROM videos_esperados ve LEFT JOIN videos v ON v.id = ve.id
    WHERE v.curso_id IS DISTINCT FROM ve.curso_id
       OR v.orden IS DISTINCT FROM ve.orden
       OR v.titulo IS DISTINCT FROM ve.v->>'titulo'
       OR v.youtube_id IS DISTINCT FROM NULLIF(ve.v->>'youtubeId', '')
       OR v.duracion_s IS DISTINCT FROM (ve.v->>'duracion')::integer),
  'cada vídeo del fichero está guardado, en su orden, con su título, su identificador de YouTube y su duración');
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM lecciones) = (SELECT count(*) FROM lecciones_esperadas)
  AND NOT EXISTS (
    SELECT FROM lecciones_esperadas le LEFT JOIN lecciones l ON l.id = le.id
    WHERE l.video_id IS DISTINCT FROM le.l->>'videoId'
       OR l.inicio_s IS DISTINCT FROM (le.l->>'inicioS')::integer
       OR l.fin_s IS DISTINCT FROM (le.l->>'finS')::integer
       OR l.aviso IS DISTINCT FROM le.l->>'aviso'),
  'cada lección es el trozo de su vídeo, de inicio_s a fin_s');
SELECT pg_temp.comprobar(
  NOT EXISTS (
    SELECT FROM lecciones_esperadas le
    LEFT JOIN lecciones l ON l.id = le.id
    WHERE l.titulo IS DISTINCT FROM le.l->>'titulo'
       OR l.descripcion IS DISTINCT FROM le.l->>'descripcion'
       OR l.resumen IS DISTINCT FROM le.l->>'resumen'
       OR l.duracion_lectura_min IS DISTINCT FROM (le.l->>'duracionLectura')::smallint),
  'cada lección guarda su título, descripción, resumen y minutos de lectura');
SELECT pg_temp.comprobar(
  NOT EXISTS (
    SELECT FROM lecciones_esperadas le JOIN lecciones l ON l.id = le.id
    WHERE string_to_array(l.lectura, E'\n\n')
          IS DISTINCT FROM ARRAY(SELECT jsonb_array_elements_text(le.l->'lectura'))),
  'la lectura guarda los párrafos separados por una línea en blanco');

-- 3. Conceptos: uno por lección, con el mismo identificador que la lección.
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM conceptos) = (SELECT count(*) FROM lecciones_esperadas)
  AND NOT EXISTS (
    SELECT FROM lecciones_esperadas le
    LEFT JOIN conceptos co ON co.id = le.id
    LEFT JOIN lecciones_conceptos lc ON lc.leccion_id = le.id AND lc.concepto_id = le.id
    WHERE co.nombre IS DISTINCT FROM le.l->>'concepto'
       OR co.curso_id IS DISTINCT FROM le.curso_id
       OR lc.leccion_id IS NULL),
  'cada lección cubre su concepto, con el nombre del fichero');

-- 4. Actividades de cada lección: preguntas de comprobación.
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM preguntas WHERE uso = 'comprobacion') = (SELECT count(*) FROM actividades_esperadas)
  AND NOT EXISTS (
    SELECT FROM actividades_esperadas ae LEFT JOIN preguntas p ON p.id = ae.id
    WHERE p.uso IS DISTINCT FROM 'comprobacion'
       OR p.leccion_id IS DISTINCT FROM ae.leccion_id
       OR p.concepto_id IS DISTINCT FROM ae.leccion_id
       OR p.formato IS DISTINCT FROM ae.a->>'tipo'
       OR p.enunciado IS DISTINCT FROM ae.a->>'enunciado'
       OR p.explicacion IS DISTINCT FROM ae.a->>'explicacion'),
  'las actividades son preguntas de comprobación de su lección, ni más ni menos que en el fichero');
SELECT pg_temp.comprobar(
  NOT EXISTS (
    SELECT FROM actividades_esperadas ae
    WHERE ae.a->>'tipo' = 'vf'
      AND ((SELECT count(*) FROM opciones_pregunta o WHERE o.pregunta_id = ae.id) <> 2
           OR (SELECT o.texto FROM opciones_pregunta o WHERE o.pregunta_id = ae.id AND o.correcta)
              IS DISTINCT FROM CASE WHEN (ae.a->>'correcta')::boolean THEN 'Verdadero' ELSE 'Falso' END)),
  'verdadero o falso: dos opciones y la correcta marcada');
SELECT pg_temp.comprobar(
  NOT EXISTS (
    SELECT FROM actividades_esperadas ae JOIN preguntas p ON p.id = ae.id
    WHERE ae.a->>'tipo' = 'escrita'
      AND (p.solucion IS DISTINCT FROM ae.a->>'solucion'
           OR ARRAY(SELECT palabra FROM palabras_clave k WHERE k.pregunta_id = ae.id ORDER BY palabra)
              IS DISTINCT FROM ARRAY(SELECT x FROM jsonb_array_elements_text(ae.a->'palabrasClave') AS x ORDER BY x))),
  'respuesta escrita: su solución y sus palabras clave');

-- 5. Test inicial: preguntas de diagnóstico del concepto de su lección.
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM preguntas WHERE uso = 'diagnostico') = (SELECT count(*) FROM test_esperado)
  AND NOT EXISTS (
    SELECT FROM test_esperado te LEFT JOIN preguntas p ON p.id = te.id
    WHERE p.uso IS DISTINCT FROM 'diagnostico'
       OR p.formato IS DISTINCT FROM 'test'
       OR p.leccion_id IS NOT NULL
       OR p.concepto_id IS DISTINCT FROM te.p->>'leccionId'
       OR p.enunciado IS DISTINCT FROM te.p->>'enunciado'),
  'el test inicial son preguntas de diagnóstico del concepto de su lección');
SELECT pg_temp.comprobar(
  NOT EXISTS (
    SELECT FROM test_esperado te
    WHERE ARRAY(SELECT texto FROM opciones_pregunta o WHERE o.pregunta_id = te.id ORDER BY orden)
          IS DISTINCT FROM ARRAY(SELECT jsonb_array_elements_text(te.p->'opciones'))
       OR (SELECT orden FROM opciones_pregunta o WHERE o.pregunta_id = te.id AND o.correcta)
          IS DISTINCT FROM (te.p->>'correcta')::integer + 1),
  'el test inicial guarda las opciones en orden y marca la correcta (la posición 0 del fichero es el orden 1)');

-- 6. Datos de un alumno: se crean en la primera fase y deben sobrevivir a las cargas siguientes.
\if :es_primera
INSERT INTO alumnos (alias) VALUES ('Lince42');
INSERT INTO matriculas (alumno_id, curso_id) SELECT 1, id FROM cursos_esperados LIMIT 1;
INSERT INTO dominios (alumno_id, concepto_id, nivel, nivel_test) SELECT 1, id, 0.4, 1 FROM lecciones_esperadas WHERE orden = 1;
INSERT INTO sesiones (alumno_id, minutos, audio) VALUES (1, 10, true);
INSERT INTO sesiones_lecciones (sesion_id, leccion_id, orden) SELECT 1, id, 1 FROM lecciones_esperadas WHERE orden = 1;
INSERT INTO eventos (alumno_id, tipo, leccion_id) SELECT 1, 'video_iniciado', id FROM lecciones_esperadas WHERE orden = 1;
INSERT INTO derivaciones (alumno_id, curso_id, leccion_id, motivo)
  SELECT 1, curso_id, id, 'alumno' FROM lecciones_esperadas WHERE orden = 1;
\else
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM matriculas) = 1
  AND (SELECT count(*) FROM dominios) = 1
  AND (SELECT count(*) FROM sesiones_lecciones) = 1
  AND (SELECT count(*) FROM eventos WHERE leccion_id IS NOT NULL) = 1
  AND (SELECT count(*) FROM derivaciones WHERE curso_id IS NOT NULL AND leccion_id IS NOT NULL) = 1,
  'volver a cargar el curso no borra la matrícula, el dominio, la sesión, los eventos ni las derivaciones del alumno');
\endif

SELECT :'fase' = 'cambios' AS es_cambios \gset
\if :es_cambios
SELECT pg_temp.comprobar((SELECT count(*) FROM videos WHERE youtube_id = 'video-elegido') = 1,
  'al volver a cargar, el vídeo de YouTube cambiado queda guardado');
\endif
