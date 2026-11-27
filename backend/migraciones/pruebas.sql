-- Pruebas del esquema de la base de datos (issue #14).
-- Se ejecutan con probar.sh sobre una base de datos temporal; nunca sobre la de trabajo.
-- Cada regla de negocio del modelo de datos tiene al menos una prueba.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Ejecuta una sentencia que debe fallar con un código de error concreto de PostgreSQL:
-- 23502 = falta un valor obligatorio, 23503 = clave foránea, 23505 = valor repetido, 23514 = CHECK.
CREATE FUNCTION pg_temp.debe_fallar(sentencia text, codigo text, descripcion text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE sentencia;
  EXCEPTION WHEN others THEN
    IF SQLSTATE = codigo THEN
      RAISE NOTICE 'ok   %', descripcion;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FALLO %: esperaba el error % y llegó % (%)', descripcion, codigo, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FALLO %: la base de datos lo aceptó', descripcion;
END $$;

CREATE FUNCTION pg_temp.comprobar(condicion boolean, descripcion text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condicion IS NOT TRUE THEN
    RAISE EXCEPTION 'FALLO %', descripcion;
  END IF;
  RAISE NOTICE 'ok   %', descripcion;
END $$;

-- 1. Existen las 19 tablas del modelo.
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN (
     'empresas', 'identidades', 'alumnos', 'cursos', 'videos', 'lecciones', 'conceptos',
     'lecciones_conceptos', 'preguntas', 'opciones_pregunta', 'palabras_clave', 'recursos',
     'matriculas', 'dominios', 'sesiones', 'sesiones_lecciones', 'eventos', 'mensajes_mentor',
     'derivaciones')) = 19,
  'existen las 19 tablas del modelo');

-- Datos de ejemplo válidos: si alguno falla, el esquema rechaza datos correctos.
INSERT INTO empresas (nombre) VALUES ('Empresa de prueba');
INSERT INTO cursos (id, titulo, descripcion, nivel) VALUES ('python-desde-cero', 'Python desde cero', 'Fundamentos', 'Inicial');
INSERT INTO videos (id, curso_id, titulo, youtube_id, duracion_s, orden)
  VALUES ('python-intro', 'python-desde-cero', 'Introducción', 'abc123', 600, 1);
INSERT INTO lecciones (id, video_id, titulo, descripcion, inicio_s, fin_s, duracion_lectura_min, resumen, lectura, ejercicio)
  VALUES ('variables', 'python-intro', 'Variables', 'Guardar datos', 0, 300, 4, 'Resumen', 'Lectura', 'Ejercicio');
INSERT INTO conceptos (id, curso_id, nombre) VALUES ('variables', 'python-desde-cero', 'Variables');
INSERT INTO lecciones_conceptos (leccion_id, concepto_id) VALUES ('variables', 'variables');
INSERT INTO preguntas (id, concepto_id, leccion_id, uso, formato, dificultad, enunciado)
  VALUES ('t-variables', 'variables', NULL, 'diagnostico', 'test', 1, '¿De qué tipo es 3.14?');
INSERT INTO opciones_pregunta (pregunta_id, orden, texto, correcta)
  VALUES ('t-variables', 1, 'int', false), ('t-variables', 2, 'float', true);
INSERT INTO preguntas (id, concepto_id, leccion_id, uso, formato, enunciado, solucion)
  VALUES ('variables-1', 'variables', 'variables', 'comprobacion', 'escrita', 'Guarda Ana en nombre', 'nombre = "Ana"');
INSERT INTO palabras_clave (pregunta_id, palabra) VALUES ('variables-1', 'nombre'), ('variables-1', 'ana');
INSERT INTO recursos (leccion_id, tipo, contenido) VALUES ('variables', 'tarjetas', '[{"pregunta": "a", "respuesta": "b"}]');
INSERT INTO alumnos (alias) VALUES ('Lince42');
INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento, privacidad_aceptada_en)
  VALUES (1, 1, 'Ana', 'López', 'ana@ejemplo.com', '$argon2id$hash', '2000-05-01', now());
INSERT INTO matriculas (alumno_id, curso_id) VALUES (1, 'python-desde-cero');
INSERT INTO dominios (alumno_id, concepto_id, nivel, nivel_test) VALUES (1, 'variables', 0.4, 1);
INSERT INTO sesiones (alumno_id, minutos, audio) VALUES (1, 10, true);
INSERT INTO sesiones_lecciones (sesion_id, leccion_id, orden) VALUES (1, 'variables', 1);
INSERT INTO eventos (alumno_id, tipo, leccion_id, detalles) VALUES (1, 'video_iniciado', 'variables', '{"repaso": false}');
INSERT INTO mensajes_mentor (alumno_id, leccion_id, rol, texto_filtrado, proactivo) VALUES (1, 'variables', 'mentor', 'Hola', true);
SELECT pg_temp.comprobar(true, 'acepta un conjunto completo de datos válidos');

-- 2. Valores automáticos.
SELECT pg_temp.comprobar((SELECT seudonimo_ia IS NOT NULL FROM alumnos WHERE id = 1),
  'el seudónimo para la IA se genera solo');
SELECT pg_temp.comprobar((SELECT anonimo AND mentor_ia_activo FROM alumnos WHERE id = 1),
  'modo anónimo y mentor con IA activados por defecto');
SELECT pg_temp.comprobar(
  (SELECT personalidad_mentor = 'amable' AND tratamiento = 'neutro' FROM alumnos WHERE id = 1),
  'el mentor empieza amable y con trato neutro, como en el frontend');
SELECT pg_temp.debe_fallar($$UPDATE alumnos SET personalidad_mentor = 'borde' WHERE id = 1$$, '23514',
  'una personalidad del mentor desconocida se rechaza');
SELECT pg_temp.debe_fallar($$UPDATE alumnos SET tratamiento = 'formal' WHERE id = 1$$, '23514',
  'un tratamiento desconocido se rechaza');
SELECT pg_temp.comprobar((SELECT creado_en IS NOT NULL AND actualizado_en IS NOT NULL FROM cursos),
  'creado_en y actualizado_en se rellenan solos');
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.column_name = 'actualizado_en'
     AND NOT EXISTS (SELECT 1 FROM information_schema.triggers t
                     WHERE t.event_object_table = c.table_name AND t.event_manipulation = 'UPDATE')) = 0,
  'todas las tablas con actualizado_en lo actualizan solas (también las de migraciones futuras)');
UPDATE alumnos SET actualizado_en = '2000-01-01' WHERE id = 1;
UPDATE alumnos SET alias = 'Lince43' WHERE id = 1;
SELECT pg_temp.comprobar((SELECT actualizado_en > '2000-01-01' FROM alumnos WHERE id = 1),
  'actualizado_en cambia al modificar una fila');

-- 3. Preguntas: uso, formato y lección.
SELECT pg_temp.debe_fallar($$INSERT INTO preguntas (id, concepto_id, leccion_id, uso, formato, enunciado)
  VALUES ('p1', 'variables', NULL, 'comprobacion', 'vf', 'x')$$, '23514',
  'una pregunta de comprobación sin lección se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO preguntas (id, concepto_id, leccion_id, uso, formato, enunciado)
  VALUES ('p2', 'variables', 'variables', 'diagnostico', 'test', 'x')$$, '23514',
  'una pregunta de diagnóstico con lección se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO preguntas (id, concepto_id, uso, formato, enunciado)
  VALUES ('p3', 'variables', 'examen', 'test', 'x')$$, '23514',
  'un uso desconocido se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO preguntas (id, concepto_id, uso, formato, enunciado)
  VALUES ('p4', 'variables', 'diagnostico', 'dibujo', 'x')$$, '23514',
  'un formato desconocido se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO preguntas (id, concepto_id, leccion_id, uso, formato, enunciado)
  VALUES ('p5', 'variables', 'variables', 'comprobacion', 'escrita', 'x')$$, '23514',
  'una pregunta escrita sin solución se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO preguntas (id, concepto_id, uso, formato, dificultad, enunciado)
  VALUES ('p6', 'variables', 'diagnostico', 'test', 4, 'x')$$, '23514',
  'una dificultad fuera de 1 a 3 se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO opciones_pregunta (pregunta_id, orden, texto, correcta)
  VALUES ('t-variables', 3, 'str', true)$$, '23505',
  'una pregunta no puede tener dos opciones correctas');

-- 4. Identidad y privacidad.
INSERT INTO alumnos (alias) VALUES ('Zorro7');
SELECT pg_temp.debe_fallar($$INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento, privacidad_aceptada_en)
  VALUES (2, 1, 'Otra', 'Persona', 'ANA@ejemplo.com', 'h', '2001-01-01', now())$$, '23505',
  'el correo es único aunque cambien mayúsculas y minúsculas');
SELECT pg_temp.debe_fallar($$INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento, privacidad_aceptada_en)
  VALUES (1, 1, 'Otra', 'Persona', 'otra@ejemplo.com', 'h', '2001-01-01', now())$$, '23505',
  'un alumno tiene una sola identidad');
SELECT pg_temp.debe_fallar($$INSERT INTO identidades (alumno_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento, privacidad_aceptada_en)
  VALUES (2, 'Otra', 'Persona', 'otra@ejemplo.com', 'h', '2001-01-01', now())$$, '23502',
  'no se crea una identidad sin empresa');
SELECT pg_temp.debe_fallar($$INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento)
  VALUES (2, 1, 'Otra', 'Persona', 'otra@ejemplo.com', 'h', '2001-01-01')$$, '23502',
  'no se crea una identidad sin aceptar la política de privacidad');
SELECT pg_temp.debe_fallar($$INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento, privacidad_aceptada_en)
  VALUES (2, 1, 'Otra', 'Persona', 'otra@ejemplo.com', 'h', current_date + 1, now())$$, '23514',
  'una fecha de nacimiento futura se rechaza');
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'alumnos' AND column_name IN ('nombre', 'apellidos', 'email', 'fecha_nacimiento')) = 0,
  'la tabla alumnos no contiene datos personales');
DELETE FROM identidades WHERE alumno_id = 1;
SELECT pg_temp.comprobar((SELECT count(*) FROM dominios WHERE alumno_id = 1) = 1,
  'borrar la identidad deja anónimos los datos de aprendizaje');
INSERT INTO identidades (alumno_id, empresa_id, nombre, apellidos, email, hash_contrasena, fecha_nacimiento, privacidad_aceptada_en)
  VALUES (1, 1, 'Ana', 'López', 'ana@ejemplo.com', 'h', '2000-05-01', now());

-- 5. Contenido.
SELECT pg_temp.debe_fallar($$INSERT INTO cursos (id, titulo) VALUES ('Python Avanzado', 'x')$$, '23514',
  'los id de contenido solo admiten minúsculas, números y guiones');
SELECT pg_temp.debe_fallar($$INSERT INTO lecciones (id, video_id, titulo, inicio_s, fin_s, duracion_lectura_min)
  VALUES ('mala', 'python-intro', 'x', 300, 100, 3)$$, '23514',
  'una lección no puede terminar antes de empezar');
SELECT pg_temp.debe_fallar($$INSERT INTO recursos (leccion_id, tipo, contenido) VALUES ('variables', 'video', '{}')$$, '23514',
  'un tipo de recurso desconocido se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO lecciones (id, video_id, titulo, inicio_s, fin_s, duracion_lectura_min)
  VALUES ('huerfana', 'no-existe', 'x', 0, 10, 1)$$, '23503',
  'una lección debe pertenecer a un vídeo existente');
SELECT pg_temp.comprobar(
  (SELECT is_nullable = 'YES' AND data_type = 'text' FROM information_schema.columns
   WHERE table_name = 'lecciones' AND column_name = 'aviso'),
  'una lección puede llevar un aviso bajo el vídeo, y es opcional');

-- 6. Aprendizaje.
SELECT pg_temp.debe_fallar($$UPDATE dominios SET nivel = 1.5 WHERE alumno_id = 1$$, '23514',
  'el nivel de dominio está entre 0 y 1');
SELECT pg_temp.debe_fallar($$INSERT INTO matriculas (alumno_id, curso_id, estado) VALUES (2, 'python-desde-cero', 'pausado')$$, '23514',
  'un estado de matrícula desconocido se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO sesiones (alumno_id, minutos, audio) VALUES (1, 15, true)$$, '23514',
  'una sesión solo dura 5, 10 o 20 minutos');
SELECT pg_temp.debe_fallar($$INSERT INTO mensajes_mentor (alumno_id, rol, texto_filtrado) VALUES (1, 'tutor', 'x')$$, '23514',
  'un rol de mensaje desconocido se rechaza');

-- 7. Derivaciones a un tutor de la academia (H7, migración 003).
INSERT INTO derivaciones (alumno_id, curso_id, leccion_id, motivo) VALUES (1, 'python-desde-cero', 'variables', 'alumno');
INSERT INTO derivaciones (alumno_id, motivo) VALUES (1, 'malestar'), (1, 'sin_ia');
SELECT pg_temp.comprobar((SELECT count(*) = 3 AND bool_and(estado = 'pendiente') FROM derivaciones WHERE alumno_id = 1),
  'una derivación empieza pendiente, y el curso y la lección son opcionales (motivos: alumno, malestar o sin_ia)');
UPDATE derivaciones SET actualizado_en = '2000-01-01' WHERE motivo = 'alumno';
UPDATE derivaciones SET estado = 'atendida' WHERE motivo = 'alumno';
SELECT pg_temp.comprobar((SELECT estado = 'atendida' AND actualizado_en > '2000-01-01' FROM derivaciones WHERE motivo = 'alumno'),
  'una derivación se puede marcar como atendida, y queda anotado cuándo');
SELECT pg_temp.debe_fallar($$INSERT INTO derivaciones (alumno_id, motivo) VALUES (1, 'aburrimiento')$$, '23514',
  'un motivo de derivación desconocido se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO derivaciones (alumno_id) VALUES (1)$$, '23502',
  'una derivación sin motivo se rechaza');
SELECT pg_temp.debe_fallar($$UPDATE derivaciones SET estado = 'olvidada'$$, '23514',
  'un estado de derivación desconocido se rechaza');
SELECT pg_temp.debe_fallar($$INSERT INTO derivaciones (alumno_id, motivo) VALUES (99, 'alumno')$$, '23503',
  'una derivación debe ser de un alumno existente');
SELECT pg_temp.comprobar(
  (SELECT array_agg(column_name::text ORDER BY column_name) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'derivaciones')
  = ARRAY['actualizado_en', 'alumno_id', 'creado_en', 'curso_id', 'estado', 'id', 'leccion_id', 'motivo'],
  'la derivación no guarda el texto de la consulta ni datos personales');
INSERT INTO lecciones (id, video_id, titulo, inicio_s, fin_s, duracion_lectura_min)
  VALUES ('leccion-borrable', 'python-intro', 'Se borra', 300, 600, 1);
INSERT INTO derivaciones (alumno_id, leccion_id, motivo) VALUES (1, 'leccion-borrable', 'alumno');
DELETE FROM lecciones WHERE id = 'leccion-borrable';
SELECT pg_temp.comprobar(
  (SELECT count(*) = 4 AND count(*) FILTER (WHERE leccion_id IS NOT NULL) = 1 FROM derivaciones WHERE alumno_id = 1),
  'si se borra la lección, la derivación se conserva sin ella');
INSERT INTO cursos (id, titulo) VALUES ('curso-borrable', 'Se borra');
INSERT INTO derivaciones (alumno_id, curso_id, motivo) VALUES (1, 'curso-borrable', 'alumno');
DELETE FROM cursos WHERE id = 'curso-borrable';
SELECT pg_temp.comprobar(
  (SELECT count(*) = 5 AND count(*) FILTER (WHERE curso_id IS NOT NULL) = 1 FROM derivaciones WHERE alumno_id = 1),
  'si se borra el curso, la derivación se conserva sin él');

DELETE FROM alumnos WHERE id = 1;
SELECT pg_temp.comprobar(
  (SELECT count(*) FROM identidades WHERE alumno_id = 1) + (SELECT count(*) FROM eventos WHERE alumno_id = 1)
  + (SELECT count(*) FROM mensajes_mentor WHERE alumno_id = 1) + (SELECT count(*) FROM sesiones WHERE alumno_id = 1)
  + (SELECT count(*) FROM derivaciones WHERE alumno_id = 1) = 0,
  'eliminar un alumno borra todos sus datos');
