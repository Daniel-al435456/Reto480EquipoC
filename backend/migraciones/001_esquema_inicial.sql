-- Esquema inicial de la base de datos (issue #14).
-- Modelo de datos de la propuesta P3, con los cambios acordados el 25/11/2026: lección en lugar de fragmento,
-- empresas, datos de la cuenta de P7, fecha de nacimiento en lugar de tramo de edad y primera forma normal.
--
-- Convenciones (AGENTS.md): tablas en plural y snake_case, clave primaria id, claves foráneas <entidad>_id,
-- creado_en y actualizado_en con zona horaria en todas las tablas.
-- Identificadores: texto legible en el contenido (como en el frontend: 'python-desde-cero', 'variables');
-- números automáticos en los datos que generan los alumnos.

-- Formato de los identificadores de contenido: minúsculas, números y guiones.
CREATE DOMAIN slug AS text CHECK (VALUE ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Pone actualizado_en a la hora actual en cada modificación. Se aplica a todas las tablas al final.
CREATE FUNCTION establecer_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END $$;


-- =====================================================================
-- Contenido del curso. Lo genera el agente Preparador una vez por vídeo.
-- =====================================================================

CREATE TABLE cursos (
  id             slug PRIMARY KEY,
  titulo         text NOT NULL,
  descripcion    text,
  nivel          text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE videos (
  id                   slug PRIMARY KEY,
  curso_id             slug NOT NULL REFERENCES cursos ON DELETE CASCADE,
  titulo               text NOT NULL,
  youtube_id           text UNIQUE,  -- vacío mientras no se elija el vídeo
  duracion_s           integer CHECK (duracion_s > 0),
  orden                smallint NOT NULL CHECK (orden > 0),
  transcripcion        text,
  origen_transcripcion text CHECK (origen_transcripcion IN ('subtitulos', 'whisper')),
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curso_id, orden)
);

-- Unidad de estudio: un vídeo entero o un trozo, con su versión en texto (modo sin audio).
CREATE TABLE lecciones (
  id                   slug PRIMARY KEY,
  video_id             slug NOT NULL REFERENCES videos ON DELETE CASCADE,
  titulo               text NOT NULL,
  descripcion          text,
  inicio_s             integer NOT NULL DEFAULT 0 CHECK (inicio_s >= 0),
  fin_s                integer,
  duracion_lectura_min smallint NOT NULL CHECK (duracion_lectura_min > 0),
  resumen              text,
  lectura              text,  -- párrafos separados por una línea en blanco
  ejercicio            text,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en       timestamptz NOT NULL DEFAULT now(),
  CHECK (fin_s IS NULL OR fin_s > inicio_s)  -- sin fin_s, la lección llega hasta el final del vídeo
);

CREATE TABLE conceptos (
  id             slug PRIMARY KEY,
  curso_id       slug NOT NULL REFERENCES cursos ON DELETE CASCADE,
  nombre         text NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Relación CUBRE: qué conceptos explica cada lección.
CREATE TABLE lecciones_conceptos (
  leccion_id     slug REFERENCES lecciones ON DELETE CASCADE,
  concepto_id    slug REFERENCES conceptos ON DELETE CASCADE,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (leccion_id, concepto_id)
);

CREATE TABLE preguntas (
  id             slug PRIMARY KEY,
  concepto_id    slug NOT NULL REFERENCES conceptos ON DELETE CASCADE,
  leccion_id     slug REFERENCES lecciones ON DELETE CASCADE,
  uso            text NOT NULL CHECK (uso IN ('diagnostico', 'comprobacion')),
  formato        text NOT NULL CHECK (formato IN ('test', 'vf', 'escrita')),
  dificultad     smallint CHECK (dificultad BETWEEN 1 AND 3),
  enunciado      text NOT NULL,
  solucion       text,
  explicacion    text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  -- Las de comprobación salen de una lección; las de diagnóstico son generales del concepto.
  CHECK ((uso = 'comprobacion') = (leccion_id IS NOT NULL)),
  -- Solo las de respuesta escrita tienen solución en texto.
  CHECK ((formato = 'escrita') = (solucion IS NOT NULL))
);

-- Atributo multivaluado "opciones" de las preguntas de test y verdadero/falso.
CREATE TABLE opciones_pregunta (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pregunta_id    slug NOT NULL REFERENCES preguntas ON DELETE CASCADE,
  orden          smallint NOT NULL CHECK (orden > 0),
  texto          text NOT NULL,
  correcta       boolean NOT NULL DEFAULT false,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pregunta_id, orden)
);
-- Una sola opción correcta por pregunta.
CREATE UNIQUE INDEX opciones_pregunta_una_correcta ON opciones_pregunta (pregunta_id) WHERE correcta;

-- Atributo multivaluado "palabras_clave" de las preguntas de respuesta escrita.
CREATE TABLE palabras_clave (
  pregunta_id    slug REFERENCES preguntas ON DELETE CASCADE,
  palabra        text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pregunta_id, palabra)
);

-- Tarjetas de resumen y mapa conceptual de cada lección (añadido aprobado en P5).
CREATE TABLE recursos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  leccion_id     slug NOT NULL REFERENCES lecciones ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('tarjetas', 'mapa')),
  contenido      jsonb NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (leccion_id, tipo)
);


-- =====================================================================
-- Identidad y alumno. Los datos personales están solo en identidades y nunca se envían a la IA.
-- =====================================================================

CREATE TABLE empresas (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         text NOT NULL UNIQUE,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- El alumno sin datos personales. A la IA le llegan seudonimo_ia, la personalidad del mentor, el tratamiento
-- y si es menor (calculado aparte). El alias lo escribe el alumno y puede contener su nombre: es para los
-- tutores de la academia, no para la IA. "Mentor" es la IA y "tutor", la persona de la academia.
CREATE TABLE alumnos (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seudonimo_ia        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  alias               text NOT NULL,
  anonimo             boolean NOT NULL DEFAULT true,
  mentor_ia_activo    boolean NOT NULL DEFAULT true,
  personalidad_mentor text NOT NULL DEFAULT 'amable'
                      CHECK (personalidad_mentor IN ('amable', 'motivador', 'gracioso', 'estricto')),
  tratamiento         text NOT NULL DEFAULT 'neutro' CHECK (tratamiento IN ('femenino', 'masculino', 'neutro')),
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);

-- El vínculo con el alumno vive aquí: desde alumnos no hay ningún camino hacia los datos personales.
-- Borrar la identidad deja los datos de aprendizaje anónimos. Borrar el alumno borra también su identidad.
-- El tramo de edad no se guarda: lo calcula el backend a partir de fecha_nacimiento.
-- El correo, la empresa, la fecha de nacimiento y el consentimiento solo los corrige la academia.
CREATE TABLE identidades (
  id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id                 bigint NOT NULL UNIQUE REFERENCES alumnos ON DELETE CASCADE,
  empresa_id                bigint NOT NULL REFERENCES empresas ON DELETE RESTRICT,
  id_externo                text UNIQUE,  -- identificador en la plataforma de la academia (SSO en producción)
  nombre                    text NOT NULL,
  apellidos                 text NOT NULL,
  email                     text NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  hash_contrasena           text NOT NULL,  -- Argon2 o bcrypt, calculado por el backend; nunca la contraseña
  fecha_nacimiento          date NOT NULL CHECK (fecha_nacimiento <= current_date),
  consentimiento_familia_en timestamptz,  -- obligatorio para menores de 14 años (lo exige el backend)
  privacidad_aceptada_en    timestamptz NOT NULL,
  creado_en                 timestamptz NOT NULL DEFAULT now(),
  actualizado_en            timestamptz NOT NULL DEFAULT now()
);
-- El correo es el usuario para iniciar sesión: único sin distinguir mayúsculas y minúsculas.
CREATE UNIQUE INDEX identidades_email_unico ON identidades (lower(email));


-- =====================================================================
-- Aprendizaje del alumno. Se borra junto con el alumno.
-- =====================================================================

-- Relación PERTENECE: en qué cursos está cada alumno.
CREATE TABLE matriculas (
  alumno_id      bigint REFERENCES alumnos ON DELETE CASCADE,
  curso_id       slug REFERENCES cursos ON DELETE CASCADE,
  fecha_inicio   date NOT NULL DEFAULT current_date,
  estado         text NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'completado', 'abandonado')),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alumno_id, curso_id)
);

-- Relación DOMINA: nivel actual por concepto y lo que dijo el test inicial.
CREATE TABLE dominios (
  alumno_id      bigint REFERENCES alumnos ON DELETE CASCADE,
  concepto_id    slug REFERENCES conceptos ON DELETE CASCADE,
  nivel          numeric(3, 2) NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 1),
  nivel_test     numeric(3, 2) CHECK (nivel_test BETWEEN 0 AND 1),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alumno_id, concepto_id)
);

-- Toda sesión se crea con sus lecciones y todas son del mismo curso (lo comprueba el backend);
-- por eso no hay curso_id: se deduce de sus lecciones.
CREATE TABLE sesiones (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id      bigint NOT NULL REFERENCES alumnos ON DELETE CASCADE,
  minutos        smallint NOT NULL CHECK (minutos IN (5, 10, 20)),  -- H4
  audio          boolean NOT NULL,
  estado         text NOT NULL DEFAULT 'planificada'
                 CHECK (estado IN ('planificada', 'en_curso', 'completada', 'abandonada')),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Relación COMPONE: lecciones de cada sesión, en orden.
CREATE TABLE sesiones_lecciones (
  sesion_id      bigint REFERENCES sesiones ON DELETE CASCADE,
  leccion_id     slug REFERENCES lecciones ON DELETE CASCADE,
  orden          smallint NOT NULL CHECK (orden > 0),
  completado     boolean NOT NULL DEFAULT false,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sesion_id, leccion_id),
  UNIQUE (sesion_id, orden)
);

-- Solo eventos de aprendizaje (ver, responder, abandonar...). Los de la cuenta no van aquí.
-- tipo es texto libre para no tener que cambiar el esquema cada vez que el frontend añade un evento.
CREATE TABLE eventos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id      bigint NOT NULL REFERENCES alumnos ON DELETE CASCADE,
  tipo           text NOT NULL,
  leccion_id     slug REFERENCES lecciones ON DELETE SET NULL,
  pregunta_id    slug REFERENCES preguntas ON DELETE SET NULL,
  valor          numeric,
  detalles       jsonb NOT NULL DEFAULT '{}',
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eventos_alumno_fecha ON eventos (alumno_id, creado_en);

-- Conversación con el mentor, ya filtrada. Se borra a los 90 días contados desde creado_en.
CREATE TABLE mensajes_mentor (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id      bigint NOT NULL REFERENCES alumnos ON DELETE CASCADE,
  leccion_id     slug REFERENCES lecciones ON DELETE SET NULL,  -- desde dónde se abrió el chat (H9)
  rol            text NOT NULL CHECK (rol IN ('alumno', 'mentor')),
  texto_filtrado text NOT NULL,
  proactivo      boolean NOT NULL DEFAULT false,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mensajes_mentor_alumno_fecha ON mensajes_mentor (alumno_id, creado_en);


-- actualizado_en automático en todas las tablas que lo tienen.
DO $$
DECLARE
  tabla text;
BEGIN
  FOR tabla IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'actualizado_en'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION establecer_actualizado_en()',
      tabla || '_actualizado_en', tabla);
  END LOOP;
END $$;
