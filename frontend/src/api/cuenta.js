/*
 * Cuenta del alumno.
 *
 * Prototipo: la cuenta se guarda solo en este dispositivo y la contraseña nunca se guarda en claro,
 * únicamente su resumen SHA-256. Cuando exista backend, el registro, el inicio de sesión y la recuperación
 * de la contraseña se harán en el servidor (con un algoritmo de contraseñas como Argon2 o bcrypt) y estas
 * funciones llamarán a la API.
 */

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LONGITUD_MINIMA_CONTRASENA = 8;

/** Resumen SHA-256 en hexadecimal (la contraseña no se guarda nunca en claro). */
export async function resumirContrasena(contrasena) {
  const datos = new TextEncoder().encode(contrasena);
  // crypto.subtle solo existe con HTTPS o en localhost. Al probar desde el móvil por la red local (http),
  // se usa un resumen sencillo para que el registro funcione igualmente.
  if (!globalThis.crypto?.subtle) {
    let h = 2166136261;
    for (const byte of datos) h = Math.imul(h ^ byte, 16777619) >>> 0;
    return `local-${h.toString(16)}`;
  }
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function comprobarContrasena(contrasena, hash) {
  return (await resumirContrasena(contrasena)) === hash;
}

/** Errores de validación de una contraseña nueva, o cadena vacía si es válida. */
export function errorContrasena(contrasena) {
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) return `Debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`;
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) || !/\d/.test(contrasena)) return 'Debe incluir al menos una letra y un número.';
  return '';
}

/** Nombre que se muestra: el alias en modo anónimo; si no, nombre y apellidos. */
export function nombreVisible(estado) {
  if (estado.anonimo || !estado.cuenta) return estado.alias || 'Sin alias';
  return `${estado.cuenta.nombre} ${estado.cuenta.apellidos}`.trim();
}

/** Nombre para saludar: el alias en modo anónimo; si no, el nombre de pila. */
export function nombreCorto(estado) {
  if (estado.anonimo || !estado.cuenta) return estado.alias;
  return estado.cuenta.nombre;
}

/**
 * Datos de la cuenta que el alumno puede cambiar desde el perfil. El correo (con el que inicia sesión), la empresa,
 * la fecha de nacimiento y el consentimiento de la familia se fijan en el alta y solo puede corregirlos la academia.
 */
export const CAMPOS_EDITABLES = ['nombre', 'apellidos', 'puesto'];

/** Se queda solo con los cambios permitidos desde el perfil. */
export function cambiosPermitidos(cambios) {
  return Object.fromEntries(Object.entries(cambios).filter(([clave]) => CAMPOS_EDITABLES.includes(clave)));
}
