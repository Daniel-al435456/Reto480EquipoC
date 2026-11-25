import { necesitaConsentimiento } from './edad.js';
import { coincide } from './rutas.js';

/*
 * Reglas de acceso y navegación del alumno. Son funciones puras, sin React, para poder probarlas:
 * de ellas dependen el alta en cuatro pasos y las protecciones para menores.
 */

/** Pantallas accesibles sin sesión iniciada. */
export const PUBLICAS = ['/bienvenida', '/registro', '/entrar', '/legal/:pagina'];
/** Pasos del alta, accesibles con sesión antes de completarla. Después, el alias se cambia desde el perfil. */
export const ALTA = ['/edad', '/consentimiento', '/alias', '/preferencias'];
/** Con la sesión iniciada no tiene sentido volver a la bienvenida, al registro ni al inicio de sesión. */
export const SOLO_SIN_SESION = ['/bienvenida', '/registro', '/entrar'];
/** Pasos del alta que no se repiten: la fecha de nacimiento y el consentimiento solo puede corregirlos la academia. */
export const SOLO_EN_ALTA = ['/edad', '/consentimiento', '/preferencias'];
const esUna = (patrones, ruta) => patrones.some((p) => coincide(p, ruta));

const conSesion = (estado) => Boolean(estado.cuenta && estado.sesionIniciada);

/** Indica si el alumno puede ver una ruta en su situación actual. */
export function rutaPermitida(estado, ruta) {
  if (!conSesion(estado)) return esUna(PUBLICAS, ruta);
  if (!estado.altaCompleta) return esUna(ALTA, ruta) || esUna(PUBLICAS, ruta);
  return !esUna(SOLO_SIN_SESION, ruta) && !esUna(SOLO_EN_ALTA, ruta);
}

/**
 * Adónde lleva la pestaña "Hoy": al punto en el que se quedó el alumno.
 * Sin sesión → bienvenida; alta a medias → el paso que falte; sin curso → catálogo; sin test → test inicial; si no, la lección de hoy.
 */
export function destinoInicio(estado, hoy = new Date()) {
  if (!estado.cuenta || !estado.sesionIniciada) return '/bienvenida';
  if (!estado.fechaNacimiento) return '/edad';
  if (necesitaConsentimiento(estado, hoy)) return '/consentimiento';
  if (!estado.alias) return '/alias';
  if (!estado.altaCompleta) return '/preferencias';
  if (!estado.cursoId) return '/cursos';
  if (!estado.testHecho) return `/curso/${estado.cursoId}/test`;
  return `/curso/${estado.cursoId}/hoy`;
}

