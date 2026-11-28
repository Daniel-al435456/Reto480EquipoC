-- Cuentas de alumno en el servidor (issue #55).

-- Puesto del alumno en su empresa, que pide el alta. Es opcional.
ALTER TABLE identidades ADD COLUMN puesto text;

-- Sesiones iniciadas: una fila por cada dispositivo en el que el alumno ha entrado. La app envía un token
-- aleatorio en cada petición y el backend busca aquí su resumen SHA-256; el token no se guarda nunca, así
-- que una copia de la base de datos no sirve para entrar. Cerrar sesión borra la fila; eliminar la cuenta
-- borra todas las del alumno. Las caducadas no valen, y se borran cuando el alumno vuelve a entrar.
CREATE TABLE accesos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumno_id      bigint NOT NULL REFERENCES alumnos ON DELETE CASCADE,
  hash_token     text NOT NULL UNIQUE,
  caduca_en      timestamptz NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accesos_alumno ON accesos (alumno_id);

-- El trigger de 001_esquema_inicial.sql solo se creó para las tablas que existían entonces.
CREATE TRIGGER accesos_actualizado_en BEFORE UPDATE ON accesos
  FOR EACH ROW EXECUTE FUNCTION establecer_actualizado_en();
