/*
 * Capa de acceso a datos.
 *
 * Las pantallas solo llaman a estas funciones, nunca a fetch directamente.
 * Hoy devuelven datos de ejemplo y respuestas simuladas; cuando el backend esté listo,
 * basta con sustituir el cuerpo de cada función por una llamada a la API
 * (la URL base se leerá de import.meta.env.VITE_API_URL).
 *
 * Las funciones de IA (evaluación del test, tutor) son SIMULADAS:
 * la IA está pendiente de decisión del equipo (propuesta P1).
 */
import { cursos } from './datos.js';
import { planificarSesion as planificar } from './planificador.js';

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export async function obtenerCursos() {
  await esperar(150);
  return cursos.map(({ id, titulo, descripcion, nivel, lecciones }) => ({
    id,
    titulo,
    descripcion,
    nivel,
    numeroLecciones: lecciones.length,
  }));
}

export function obtenerCurso(id) {
  return cursos.find((c) => c.id === id) ?? null;
}

export function obtenerLeccion(cursoId, leccionId) {
  return obtenerCurso(cursoId)?.lecciones.find((l) => l.id === leccionId) ?? null;
}

export async function obtenerTestInicial(cursoId) {
  await esperar(150);
  return obtenerCurso(cursoId)?.testInicial ?? [];
}

/**
 * Evalúa el test inicial. La puntuación es determinista: cada acierto marca
 * la lección como dominada. El mensaje para el alumno es simulado (IA pendiente).
 */
export async function evaluarTestInicial(cursoId, respuestas) {
  await esperar(500);
  const curso = obtenerCurso(cursoId);
  const dominio = {};
  for (const pregunta of curso.testInicial) {
    if (respuestas[pregunta.id] === pregunta.correcta) dominio[pregunta.leccionId] = true;
  }
  const dominadas = curso.lecciones.filter((l) => dominio[l.id]);
  const siguiente = curso.lecciones.find((l) => !dominio[l.id]);

  let mensaje;
  if (dominadas.length === 0) {
    mensaje = 'Empezamos desde el principio. Iremos paso a paso, a tu ritmo.';
  } else if (!siguiente) {
    mensaje = 'Ya dominas todo el contenido del curso. Puedes repasar cualquier lección cuando quieras.';
  } else {
    mensaje = `Ya dominas ${dominadas.length} de ${curso.lecciones.length} temas, así que no tendrás que verlos. Empezarás por «${siguiente.titulo}».`;
  }
  return { dominio, mensaje };
}

export function planificarSesion(cursoId, modo, dominio, completadas) {
  return planificar(obtenerCurso(cursoId), modo, dominio, completadas);
}

/**
 * Corrige una respuesta escrita comprobando palabras clave (simulado).
 * Con IA, se sustituiría por una corrección que entienda respuestas equivalentes.
 */
export async function corregirRespuestaEscrita(actividad, texto) {
  await esperar(400);
  const normalizado = normalizar(texto);
  const faltan = actividad.palabrasClave.filter((p) => !normalizado.includes(normalizar(p)));
  return { correcta: faltan.length === 0, solucion: actividad.solucion };
}

/** Mensaje proactivo del tutor ante una señal de bloqueo (simulado). */
export async function mensajeProactivoTutor(leccion) {
  await esperar(300);
  return `Veo que «${leccion.titulo}» se te está resistiendo. Te lo cuento de otra forma: ${leccion.resumen} ¿Lo repasamos juntos?`;
}

/** Respuesta del tutor a una consulta del alumno (simulada). */
export async function preguntarTutor(texto, cursoId) {
  await esperar(700);
  const curso = obtenerCurso(cursoId) ?? cursos[0];
  const consulta = normalizar(texto);
  const leccion = curso.lecciones.find(
    (l) => consulta.includes(normalizar(l.concepto)) || consulta.includes(normalizar(l.id)),
  );
  if (leccion) {
    return `Sobre «${leccion.titulo}»: ${leccion.resumen} Si quieres, puedes repasarlo en la lección correspondiente.`;
  }
  if (consulta.includes('ejemplo')) {
    return 'Un ejemplo sencillo: edad = 18 crea una variable, y print(edad) muestra su valor por pantalla.';
  }
  return 'Buena pregunta. ¿Me dices de qué tema es? Por ejemplo: variables, condicionales, bucles, listas o funciones. Si prefieres, puedes pedir ayuda a un tutor.';
}

export async function solicitarTutorHumano() {
  await esperar(400);
  return 'He avisado a tu tutor. Te responderá lo antes posible.';
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
