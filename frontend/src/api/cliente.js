/*
 * Capa de acceso a datos.
 *
 * Las pantallas solo llaman a estas funciones, nunca a fetch directamente.
 *
 * - Si está definida la variable de entorno VITE_API_URL (dirección del backend FastAPI),
 *   las funciones llaman a la API.
 * - Si no está definida, o si el backend no responde, usan los datos de ejemplo y las respuestas
 *   simuladas de este archivo. Así la aplicación nunca se queda sin respuesta (por ejemplo, en la demo).
 *
 * La IA real está en el backend (propuesta P1): Claude prepara el contenido y Groq redacta el diagnóstico
 * y responde como mentor. El frontend nunca llama a la IA directamente ni conoce sus claves.
 * Contrato de la API: véase frontend/README.md, "Conexión con el backend".
 */
import { cursos } from './datos.js';
import { planificarSesion as planificar } from './planificador.js';
import { frasesMentor } from './mentor.js';

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/*
 * VITE_API_URL admite una dirección completa (https://api.ejemplo.com) o "/" para usar la misma dirección
 * que la app: en desarrollo, el servidor de Vite reenvía /api y /salud al backend (vite.config.js).
 */
const DIRECCION = (import.meta.env && import.meta.env.VITE_API_URL) || '';
const API = DIRECCION.replace(/\/$/, '');
const TIEMPO_MAXIMO_MS = 8000;
const TIEMPO_SALUD_MS = 3000;

/** true si la aplicación está configurada para usar un backend (y, por tanto, la IA real). */
export const usaBackend = Boolean(DIRECCION);

let servidorDisponible = null;

/**
 * Comprueba una sola vez si el backend responde en /salud. Si no responde, la app pasa a las respuestas
 * de ejemplo sin hacer esperar al alumno 8 segundos en cada pantalla. Devuelve true o false.
 */
export function estadoServidor() {
  if (!usaBackend) return Promise.resolve(false);
  servidorDisponible ??= fetch(`${API}/salud`, { signal: AbortSignal.timeout(TIEMPO_SALUD_MS) })
    .then((respuesta) => respuesta.ok)
    .catch(() => false);
  return servidorDisponible;
}

/**
 * Llama a la API y, si no hay backend o falla, ejecuta la versión simulada.
 * La respuesta indica de dónde viene, para que la interfaz pueda avisar de que la ha generado la IA.
 * Los errores del backend llegan como { error, mensaje } (backend/app/errores.py) y se anotan en la consola.
 */
async function conRespaldo(ruta, cuerpo, simulado) {
  if (!(await estadoServidor())) return { ...(await simulado()), origen: 'simulado' };
  try {
    const respuesta = await fetch(`${API}${ruta}`, {
      method: cuerpo ? 'POST' : 'GET',
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({}));
      throw new Error(`${respuesta.status} ${error.error ?? ''}: ${error.mensaje ?? ''}`);
    }
    return { ...(await respuesta.json()), origen: 'api' };
  } catch (error) {
    // Si el servidor no responde, se deja de usar hasta recargar la app; si responde con un error, solo esta vez.
    if (error.name === 'TimeoutError' || error.name === 'TypeError') servidorDisponible = Promise.resolve(false);
    console.warn(`Backend no disponible en ${ruta}; se usa el modo simulado.`, error);
    return { ...(await simulado()), origen: 'simulado' };
  }
}

export async function obtenerCursos() {
  const { cursos: lista } = await conRespaldo('/api/cursos', null, async () => {
    await esperar(150);
    return {
      cursos: cursos.map(({ id, titulo, descripcion, nivel, lecciones }) => ({
        id,
        titulo,
        descripcion,
        nivel,
        numeroLecciones: lecciones.length,
      })),
    };
  });
  return lista;
}

/*
 * El curso local se conserva para el modo demo y como respaldo si la API no está disponible.
 * La interfaz carga el contenido completo mediante obtenerCursoCompleto.
 */

const cursosCompletos = new Map();

export function obtenerCursoCompleto(id) {
  if (!id) return Promise.resolve(null);
  if (!cursosCompletos.has(id)) {
    cursosCompletos.set(
      id,
      conRespaldo(`/api/cursos/${encodeURIComponent(id)}/lecciones`, null, async () => {
        await esperar(150);
        const curso = obtenerCurso(id);
        if (!curso) return {};
        const { testInicial, ...contenido } = curso;
        return contenido;
      }).then((curso) => (curso.id ? curso : null)),
    );
  }
  return cursosCompletos.get(id);
}

export function obtenerCurso(id) {
  return cursos.find((c) => c.id === id) ?? null;
}

export async function obtenerTestInicial(cursoId) {
  const { preguntas } = await conRespaldo(`/api/cursos/${cursoId}/test`, null, async () => {
    await esperar(150);
    return { preguntas: obtenerCurso(cursoId)?.testInicial ?? [] };
  });
  return preguntas;
}

/**
 * Evalúa el test inicial. La puntuación es determinista: cada acierto marca como dominadas todas las
 * lecciones del vídeo al que pertenece la lección de la pregunta.
 * Con backend, la explicación la redacta la IA (agente Diagnóstico); sin backend, una plantilla.
 * Devuelve { dominio, mensaje, origen }.
 */
export function evaluarTestInicial(cursoId, respuestas, contexto = {}) {
  return conRespaldo(`/api/cursos/${cursoId}/test/evaluacion`, { respuestas, ...contexto }, () =>
    evaluarTestSimulado(cursoId, respuestas),
  );
}

async function evaluarTestSimulado(cursoId, respuestas) {
  await esperar(500);
  const curso = obtenerCurso(cursoId);
  const dominio = {};
  const videoDe = Object.fromEntries(curso.lecciones.map((l) => [l.id, l.videoId]));
  for (const pregunta of curso.testInicial) {
    if (respuestas[pregunta.id] !== pregunta.correcta) continue;
    for (const leccion of curso.lecciones) {
      if (leccion.videoId === videoDe[pregunta.leccionId]) dominio[leccion.id] = true;
    }
  }
  const dominadas = curso.lecciones.filter((l) => dominio[l.id]);
  const siguiente = curso.lecciones.find((l) => !dominio[l.id]);

  let mensaje;
  if (dominadas.length === 0) {
    mensaje = 'Empezamos desde el principio. Iremos paso a paso, a tu ritmo.';
  } else if (!siguiente) {
    mensaje = 'Ya dominas todo el contenido del curso. Puedes repasar cualquier lección cuando quieras.';
  } else {
    mensaje = `Ya dominas ${dominadas.length} de ${curso.lecciones.length} lecciones, así que no tendrás que verlas. Empezarás por «${siguiente.titulo}».`;
  }
  return { dominio, mensaje };
}

export function planificarSesion(curso, modo, dominio, completadas) {
  return planificar(curso, modo, dominio, completadas);
}

/**
 * Corrige una respuesta escrita comprobando palabras clave (simulado).
 * Con IA, se sustituiría por una corrección que entienda respuestas equivalentes.
 */
export function corregirRespuestaEscrita(actividad, texto) {
  return conRespaldo('/api/actividades/correccion', { actividadId: actividad.id, texto }, async () => {
    await esperar(400);
    const normalizado = normalizar(texto);
    const faltan = actividad.palabrasClave.filter((p) => !normalizado.includes(normalizar(p)));
    return { correcta: faltan.length === 0, solucion: actividad.solucion };
  });
}

/**
 * Mensaje proactivo del mentor ante una señal de bloqueo.
 * contexto: { cursoId, esMenor, personalidad, tratamiento }. Devuelve el texto.
 */
export async function mensajeProactivoMentor(leccion, contexto = {}) {
  const { texto } = await conRespaldo(
    '/api/mentor/proactivo',
    { ...contexto, leccionId: leccion.id, senal: 'bloqueo' },
    async () => {
      await esperar(300);
      const frases = frasesMentor(contexto.personalidad, contexto.tratamiento);
      return { texto: `«${leccion.titulo}». ${frases.atasco} ${leccion.resumen} ${frases.reintento}` };
    },
  );
  return texto;
}

/**
 * Respuesta del mentor (agente Mentor) a una consulta del alumno.
 * contexto: { cursoId, leccionId, esMenor, personalidad, tratamiento }. leccionId es la lección de la que se habla, si la hay.
 * Devuelve { texto, derivado, origen }.
 */
export function preguntarMentor(texto, contexto = {}) {
  return conRespaldo('/api/mentor/mensaje', { ...contexto, texto }, () => respuestaMentorSimulada(texto, contexto));
}

async function respuestaMentorSimulada(texto, { cursoId, leccionId, personalidad, tratamiento }) {
  const frases = frasesMentor(personalidad, tratamiento);
  await esperar(700);
  const curso = obtenerCurso(cursoId) ?? cursos[0];
  const consulta = normalizar(texto);
  const leccion =
    curso.lecciones.find((l) => {
      // "variable" también encuentra la lección de "variables".
      const raiz = normalizar(l.concepto).replace(/e?s$/, '');
      return consulta.includes(raiz) || consulta.includes(normalizar(l.id));
    }) ??
    curso.lecciones.find((l) => l.id === leccionId);
  if (leccion) {
    return {
      texto: `${frases.respuesta} «${leccion.titulo}»: ${leccion.resumen} ${frases.cierre}`,
    };
  }
  if (consulta.includes('ejemplo')) {
    return { texto: `${frases.respuesta} edad = 18 crea una variable, y print(edad) muestra su valor por pantalla.` };
  }
  return {
    texto:
      `${frases.aclarar} Por ejemplo: variables, cadenas, tipos de datos, condicionales u operadores. Si prefieres, puedes pedir ayuda a un tutor.`,
  };
}

/** Deriva la conversación a un tutor humano. Devuelve el texto de confirmación. */
export async function solicitarTutorHumano(contexto = {}) {
  const { texto } = await conRespaldo('/api/mentor/derivacion', contexto, async () => {
    await esperar(400);
    return { texto: 'He avisado a tu tutor. Te responderá lo antes posible.' };
  });
  return texto;
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
