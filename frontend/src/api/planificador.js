import { DURACION_ACTIVIDADES, DURACION_RESUMEN } from './datos.js';

/**
 * Lecciones que el alumno todavía tiene que estudiar:
 * ni las domina según el test inicial ni las ha completado.
 */
export function leccionesPendientes(curso, dominio = {}, completadas = []) {
  return curso.lecciones.filter((l) => !dominio[l.id] && !completadas.includes(l.id));
}

/**
 * Prepara la sesión de hoy según el tiempo disponible y si el alumno puede escuchar audio.
 * Lógica determinista, sin IA: es predecible y se puede probar.
 *
 * - Con audio, cada lección es un vídeo; sin audio, una lectura.
 * - Después de cada lección van sus actividades.
 * - Si no cabe ninguna lección completa, se propone una sesión exprés:
 *   el resumen de la siguiente lección y sus actividades.
 */
export function planificarSesion(curso, { minutos, audio }, dominio = {}, completadas = []) {
  const pendientes = leccionesPendientes(curso, dominio, completadas);
  const pasos = [];
  let total = 0;

  for (const leccion of pendientes) {
    const contenido = audio ? leccion.duracionVideo : leccion.duracionLectura;
    const completa = contenido + DURACION_ACTIVIDADES;

    if (total + completa <= minutos) {
      pasos.push({ tipo: audio ? 'video' : 'lectura', leccionId: leccion.id, minutos: contenido });
      pasos.push({ tipo: 'actividades', leccionId: leccion.id, minutos: DURACION_ACTIVIDADES });
      total += completa;
    } else {
      if (pasos.length === 0) {
        pasos.push({ tipo: 'resumen', leccionId: leccion.id, minutos: DURACION_RESUMEN });
        pasos.push({ tipo: 'actividades', leccionId: leccion.id, minutos: DURACION_ACTIVIDADES });
        total += DURACION_RESUMEN + DURACION_ACTIVIDADES;
      }
      break;
    }
  }

  return { pasos, minutos: total, expres: pasos[0]?.tipo === 'resumen' };
}

/**
 * Sesión con una lección concreta que elige el alumno, aunque ya la domine o la haya completado:
 * el contenido (vídeo o lectura) y sus actividades, o solo las actividades.
 */
export function planificarLeccion(leccion, { audio, soloActividades = false }) {
  const pasos = [];
  if (!soloActividades) {
    pasos.push({
      tipo: audio ? 'video' : 'lectura',
      leccionId: leccion.id,
      minutos: audio ? leccion.duracionVideo : leccion.duracionLectura,
    });
  }
  pasos.push({ tipo: 'actividades', leccionId: leccion.id, minutos: DURACION_ACTIVIDADES });
  return { pasos, minutos: pasos.reduce((total, paso) => total + paso.minutos, 0), expres: false, elegida: true };
}
