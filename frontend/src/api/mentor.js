/*
 * Personalidad del mentor y forma de dirigirse al alumno. El alumno las elige en el alta o en su perfil.
 * Con backend, ambas se envían al agente Mentor para que redacte con ese tono; sin backend, se usan aquí
 * para las respuestas de ejemplo. No son datos personales identificativos.
 */

import { esMenor } from './edad.js';

export const PERSONALIDADES = [
  { id: 'amable', nombre: 'Amable', descripcion: 'Paciente y cercano. Te explica con calma.' },
  { id: 'motivador', nombre: 'Motivador', descripcion: 'Te anima y celebra cada avance.' },
  { id: 'gracioso', nombre: 'Gracioso', descripcion: 'Explica con humor y algún que otro "cuac".' },
  { id: 'estricto', nombre: 'Estricto', descripcion: 'Directo y sin rodeos. Te pide un poco más.' },
];

export const TRATAMIENTOS = [
  { id: 'femenino', nombre: 'Femenino', ejemplo: '¿Lista para empezar?' },
  { id: 'masculino', nombre: 'Masculino', ejemplo: '¿Listo para empezar?' },
  { id: 'neutro', nombre: 'Neutro', ejemplo: '¿Te parece si empezamos?' },
];

export const PERSONALIDAD_INICIAL = 'amable';
export const TRATAMIENTO_INICIAL = 'neutro';

/** Elige la palabra según el tratamiento: palabra('femenino', { femenino: 'lista', masculino: 'listo', neutro: 'a punto' }). */
export function palabra(tratamiento, formas) {
  return formas[tratamiento] ?? formas.neutro;
}

/**
 * Frases con las que el mentor abre y cierra sus mensajes según su personalidad y el tratamiento.
 * Las usan las respuestas de ejemplo mientras no hay backend.
 */
export function frasesMentor(personalidad = PERSONALIDAD_INICIAL, tratamiento = TRATAMIENTO_INICIAL) {
  const listo = palabra(tratamiento, { femenino: '¿Lista para intentarlo otra vez?', masculino: '¿Listo para intentarlo otra vez?', neutro: '¿Lo intentamos otra vez?' });
  const frases = {
    amable: {
      atasco: 'Veo que este tema se te está resistiendo, es normal. Te lo cuento de otra forma:',
      respuesta: 'Te lo explico:',
      aclarar: 'Buena pregunta. ¿Me dices de qué tema es?',
      cierre: 'Si quieres, lo repasamos juntos en la lección.',
      reintento: listo,
    },
    motivador: {
      atasco: '¡Vas por buen camino! Un tropiezo es parte de aprender. Míralo así:',
      respuesta: '¡Buena pregunta!',
      aclarar: '¡Me encanta que preguntes! ¿De qué tema es?',
      cierre: '¡Tú puedes con esto!',
      reintento: listo,
    },
    gracioso: {
      atasco: 'Cuac, este tema se ha puesto rebelde. Vamos a domarlo:',
      respuesta: 'Cuac, esta me la sé:',
      aclarar: 'Cuac, me he perdido. ¿De qué tema hablamos?',
      cierre: 'Y si no queda claro, te lo repito hasta que lo entienda hasta mi pato de goma.',
      reintento: listo,
    },
    estricto: {
      atasco: 'Dos fallos en el mismo tema. Repasa esto con atención:',
      respuesta: 'Respuesta corta:',
      aclarar: 'Concreta: ¿de qué tema es la duda?',
      cierre: 'Repasa la lección y haz las actividades otra vez.',
      reintento: palabra(tratamiento, { femenino: 'Cuando estés lista, inténtalo de nuevo.', masculino: 'Cuando estés listo, inténtalo de nuevo.', neutro: 'Cuando puedas, inténtalo de nuevo.' }),
    },
  };
  return frases[personalidad] ?? frases[PERSONALIDAD_INICIAL];
}

/**
 * Lo único del alumno que se envía a la IA junto a su consulta: si es menor, la personalidad elegida para el mentor
 * y el tratamiento. Nunca el nombre, el correo, la empresa ni la fecha de nacimiento (SPEC §6).
 */
export function contextoIA(estado) {
  return {
    esMenor: esMenor(estado),
    personalidad: estado.personalidadMentor ?? PERSONALIDAD_INICIAL,
    tratamiento: estado.tratamiento ?? TRATAMIENTO_INICIAL,
  };
}
