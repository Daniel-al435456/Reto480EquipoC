import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/*
 * Estado del alumno en el dispositivo: perfil (alias y modo anónimo), curso elegido, resultado del test, progreso,
 * modo de estudio, sesión en curso, conversación con el tutor y eventos de aprendizaje.
 * Se guarda en el almacenamiento local para no perder el progreso al cerrar la app.
 * Cuando exista backend, los eventos se enviarán también a la API.
 */

const CLAVE = 'reto480-estado-v1';

const MENSAJE_INICIAL_TUTOR = {
  id: 'bienvenida',
  autor: 'tutor',
  texto: 'Hola, soy tu tutor. Pregúntame cualquier duda sobre el curso.',
};

const estadoInicial = {
  bienvenidaVista: false,
  alias: '',
  anonimo: true,
  cursoId: null,
  testHecho: false,
  /** Lo que el test dijo que domina; dominio puede cambiar si el alumno elige estudiar un tema igualmente. */
  dominioTest: {},
  dominio: {},
  completadas: [],
  modo: { minutos: 10, audio: true },
  sesion: null,
  mensajesTutor: [MENSAJE_INICIAL_TUTOR],
  tutorNoLeido: false,
  eventos: [],
};

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    return guardado ? { ...estadoInicial, ...guardado } : estadoInicial;
  } catch {
    return estadoInicial;
  }
}

const Contexto = createContext(null);

export function EstadoProvider({ children }) {
  const [estado, setEstado] = useState(cargar);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Sin almacenamiento disponible (modo privado): el progreso se mantiene durante la sesión.
    }
  }, [estado]);

  const registrarEvento = useCallback((tipo, datos = {}) => {
    setEstado((e) => ({
      ...e,
      eventos: [...e.eventos, { tipo, ...datos, fecha: new Date().toISOString() }].slice(-200),
    }));
  }, []);

  const acciones = useMemo(
    () => ({
      registrarEvento,
      guardarPerfil: ({ alias, anonimo }) =>
        setEstado((e) => ({ ...e, alias, anonimo, bienvenidaVista: true })),
      cambiarAnonimo: (anonimo) => setEstado((e) => ({ ...e, anonimo })),
      seleccionarCurso: (cursoId) =>
        setEstado((e) =>
          e.cursoId === cursoId
            ? e
            : {
                ...estadoInicial,
                bienvenidaVista: e.bienvenidaVista,
                alias: e.alias,
                anonimo: e.anonimo,
                modo: e.modo,
                cursoId,
                mensajesTutor: e.mensajesTutor,
              },
        ),
      guardarTest: (dominio) => setEstado((e) => ({ ...e, testHecho: true, dominio, dominioTest: dominio })),
      /** El alumno decide estudiar (o volver a saltarse) un tema que el test marcó como dominado. */
      estudiarIgualmente: (leccionId, estudiar) =>
        setEstado((e) => {
          const dominio = { ...e.dominio };
          if (estudiar) delete dominio[leccionId];
          else if (e.dominioTest?.[leccionId]) dominio[leccionId] = true;
          return { ...e, dominio };
        }),
      empezarSesion: (modo, plan) => setEstado((e) => ({ ...e, modo, sesion: { ...plan, indice: 0 } })),
      irAPaso: (indice) => setEstado((e) => (e.sesion ? { ...e, sesion: { ...e.sesion, indice } } : e)),
      terminarSesion: () => setEstado((e) => ({ ...e, sesion: null })),
      completarLeccion: (leccionId) =>
        setEstado((e) =>
          e.completadas.includes(leccionId) ? e : { ...e, completadas: [...e.completadas, leccionId] },
        ),
      anadirMensaje: (mensaje) =>
        setEstado((e) => ({
          ...e,
          tutorNoLeido: e.tutorNoLeido || Boolean(mensaje.proactivo),
          mensajesTutor: [...e.mensajesTutor, { id: `${Date.now()}-${Math.random()}`, ...mensaje }].slice(-100),
        })),
      borrarHistorialTutor: () =>
        setEstado((e) => ({ ...e, mensajesTutor: [MENSAJE_INICIAL_TUTOR], tutorNoLeido: false })),
      marcarTutorLeido: () => setEstado((e) => (e.tutorNoLeido ? { ...e, tutorNoLeido: false } : e)),
      reiniciar: () => setEstado(estadoInicial),
    }),
    [registrarEvento],
  );

  const valor = useMemo(() => ({ estado, ...acciones }), [estado, acciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useEstado debe usarse dentro de EstadoProvider');
  return contexto;
}
