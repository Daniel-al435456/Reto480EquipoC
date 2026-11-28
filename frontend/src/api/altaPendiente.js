/*
 * Contraseña del alta mientras se completan sus cuatro pasos (issue #57).
 *
 * Con backend, la cuenta se crea en el servidor al terminar el paso 4, porque necesita los datos de todos
 * los pasos. La contraseña se escribe en el paso 1, así que hay que guardarla hasta entonces: solo en memoria,
 * nunca en localStorage, donde quedaría en claro en el móvil. Si el alumno recarga la app a mitad del alta,
 * se pierde y el paso 4 se la vuelve a pedir.
 */

let contrasena = null;

export function guardarContrasenaAlta(valor) {
  contrasena = valor;
}

/** La contraseña del alta, o null si no hay (por ejemplo, tras recargar la app). */
export function contrasenaAlta() {
  return contrasena;
}

export function olvidarContrasenaAlta() {
  contrasena = null;
}
