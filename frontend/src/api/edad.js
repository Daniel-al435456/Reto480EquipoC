/*
 * Edad del alumno. Se guarda la fecha de nacimiento para que el tramo se actualice solo al cumplir 14 o 18 años.
 * A la IA nunca le llega la fecha ni la edad: solo si el alumno es menor o no (SPEC §6).
 */

const EDAD_MAXIMA = 120;

/** Convierte "AAAA-MM-DD" en fecha local, o null si no es válida. */
function leerFecha(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto ?? '');
  if (!partes) return null;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia ? fecha : null;
}

/** Años cumplidos en la fecha "hoy". */
export function calcularEdad(fechaNacimiento, hoy = new Date()) {
  const nacimiento = leerFecha(fechaNacimiento);
  if (!nacimiento) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAnio = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (hoy < cumpleEsteAnio) edad -= 1;
  return edad;
}

/** Tramo de edad: "adulto" (18 o más), "14a17" o "menor14". null si no hay fecha. */
export function tramoEdad(fechaNacimiento, hoy = new Date()) {
  const edad = calcularEdad(fechaNacimiento, hoy);
  if (edad === null) return null;
  if (edad >= 18) return 'adulto';
  if (edad >= 14) return '14a17';
  return 'menor14';
}

/** Mensaje de error de la fecha de nacimiento, o cadena vacía si es correcta. */
export function errorFechaNacimiento(fechaNacimiento, hoy = new Date()) {
  if (!fechaNacimiento) return 'Indica tu fecha de nacimiento.';
  const edad = calcularEdad(fechaNacimiento, hoy);
  if (edad === null) return 'Escribe una fecha válida.';
  if (edad < 0) return 'La fecha no puede ser posterior a hoy.';
  if (edad > EDAD_MAXIMA) return 'Revisa el año de nacimiento.';
  return '';
}

/** Tramo de edad del alumno según su estado. */
export const tramoDe = (estado, hoy = new Date()) => tramoEdad(estado.fechaNacimiento, hoy);

/** El alumno es menor de edad. Es lo único de su edad que llega a la IA. */
export const esMenor = (estado, hoy = new Date()) => {
  const tramo = tramoDe(estado, hoy);
  return tramo === '14a17' || tramo === 'menor14';
};

/** Con menos de 14 años hace falta el consentimiento de la familia. Al cumplir 14 deja de hacer falta. */
export const necesitaConsentimiento = (estado, hoy = new Date()) =>
  tramoDe(estado, hoy) === 'menor14' && !estado.consentimientoFamilia;
