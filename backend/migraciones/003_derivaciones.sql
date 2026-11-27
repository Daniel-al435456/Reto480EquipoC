-- Derivaciones a un tutor de la academia (H7: «La opción "Hablar con un tutor" registra la derivación»).
-- Una fila por cada vez que el alumno pide hablar con un tutor, el mentor lo deriva ante señales de malestar
-- (AGENTS.md) o el mentor se queda sin IA y deriva como respaldo (SPEC §7). El hecho también queda en eventos, con tipo derivacion_tutor, como dice la ficha del
-- mentor; aquí se guarda la petición con su estado, que cambia con el tiempo, para el futuro panel de tutores.
--
-- A diferencia de sesiones, guarda curso_id aunque la lección ya diga su curso: el alumno puede pedir un tutor
-- desde la pestaña del mentor, sin lección. Si hay lección, su curso debe ser curso_id; lo comprueba el
-- backend (backend/README.md, «Reglas que comprueba el backend»).
--
-- Se conserva mientras exista el alumno: se borra con él (ON DELETE CASCADE), como sus sesiones y eventos.
--
-- No guarda el texto de la consulta: es texto libre y puede contener datos personales. Tampoco apunta a
-- identidades: el tutor sabe quién es el alumno por alumno_id, como en el resto de datos de aprendizaje.
CREATE TABLE derivaciones (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id      bigint NOT NULL REFERENCES alumnos ON DELETE CASCADE,
  curso_id       slug REFERENCES cursos ON DELETE SET NULL,      -- en qué curso estaba, si estaba en uno
  leccion_id     slug REFERENCES lecciones ON DELETE SET NULL,   -- desde qué lección la pidió, si fue desde una
  -- alumno: lo pide el alumno; malestar: el mentor detecta señales de malestar; sin_ia: la IA no responde.
  motivo         text NOT NULL CHECK (motivo IN ('alumno', 'malestar', 'sin_ia')),
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'atendida')),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
-- Las derivaciones de un alumno por fecha, como en eventos y mensajes_mentor.
CREATE INDEX derivaciones_alumno_fecha ON derivaciones (alumno_id, creado_en);

-- El trigger de 001_esquema_inicial.sql solo se creó para las tablas que existían entonces.
CREATE TRIGGER derivaciones_actualizado_en BEFORE UPDATE ON derivaciones
  FOR EACH ROW EXECUTE FUNCTION establecer_actualizado_en();
