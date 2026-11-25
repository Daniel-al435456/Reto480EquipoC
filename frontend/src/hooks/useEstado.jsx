import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cambiosPermitidos } from '../api/cuenta.js';

/*
 * Estado del alumno en el dispositivo: cuenta y sesión, ajustes de visualización, tramo de edad y consentimiento familiar,
 * perfil (alias y modo anónimo), curso elegido, resultado del test, progreso,
 * modo de estudio, sesión en curso, conversación con el tutor y eventos de aprendizaje.
 * Se guarda en el almacenamiento local para no perder el progreso al cerrar la app.
 * Cuando exista backend, la cuenta y la sesión se gestionarán en el servidor y los eventos se enviarán a la API.
 */

const CLAVE = 'reto480-estado-v2';

const MENSAJE_INICIAL_TUTOR = {
  id: 'bienvenida',
  autor: 'tutor',
  texto: 'Hola, soy tu tutor. Pregúntame cualquier duda sobre el curso.',
};

/** Ajustes de visualización. "auto" sigue la configuración del dispositivo. */
export const AJUSTES_INICIALES = {
  texto: 'normal', // normal | grande | muy-grande
  tema: 'auto', // auto | claro | oscuro
  contraste: 'normal', // normal | alto
  movimiento: 'auto', // auto | reducido
  tutor: 'pato', // pato | pata | ninguno: cómo aparece el tutor
};

const estadoInicial = {
  /**
   * Cuenta del alumno: { nombre, apellidos, email, empresa, puesto, hashContrasena, creada }.
   * Prototipo: se guarda en este dispositivo y la contraseña solo como resumen SHA-256.
   * Estos datos identifican al alumno y nunca se envían a la IA (propuesta P3).
   */
  cuenta: null,
  sesionIniciada: false,
  /** true cuando el alumno ha completado todos los pasos del alta. */
  altaCompleta: false,
  /** El alumno puede desactivar el tutor con IA (propuesta P3, "Base legal"). */
  tutorIA: true,
  ajustes: AJUSTES_INICIALES,
  /** adulto | 14a17 | menor14. Solo el tramo, nunca la edad exacta (propuesta P3). */
  tramoEdad: null,
  /** Fecha en que se registró el consentimiento de la familia (menores de 14 años). */
  consentimientoFamilia: null,
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
  /** Lección de la que se habla al abrir el tutor desde una lección: { leccionId, titulo }. */
  contextoTutor: null,
  eventos: [],
};

/** El alumno es menor de edad si su tramo no es adulto. */
export const esMenor = (estado) => estado.tramoEdad === '14a17' || estado.tramoEdad === 'menor14';

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    return guardado
      ? { ...estadoInicial, ...guardado, ajustes: { ...AJUSTES_INICIALES, ...guardado.ajustes } }
      : estadoInicial;
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
      cambiarAjuste: (clave, valor) => setEstado((e) => ({ ...e, ajustes: { ...e.ajustes, [clave]: valor } })),
      // El tramo de edad y el consentimiento solo se indican durante el alta; después solo puede cambiarlos la academia.
      guardarEdad: (tramoEdad) =>
        setEstado((e) =>
          e.altaCompleta
            ? e
            : { ...e, tramoEdad, consentimientoFamilia: tramoEdad === 'menor14' ? e.consentimientoFamilia : null },
        ),
      registrarConsentimiento: () =>
        setEstado((e) => (e.altaCompleta ? e : { ...e, consentimientoFamilia: new Date().toISOString() })),
      ponerContextoTutor: (contexto) => setEstado((e) => ({ ...e, contextoTutor: contexto })),
      crearCuenta: (cuenta) =>
        setEstado((e) => ({ ...e, cuenta: { ...cuenta, creada: new Date().toISOString() }, sesionIniciada: true })),
      // Desde el perfil solo se pueden cambiar algunos datos (CAMPOS_EDITABLES en api/cuenta.js); el resto solo la academia.
      actualizarCuenta: (cambios) =>
        setEstado((e) => {
          return { ...e, cuenta: { ...e.cuenta, ...cambiosPermitidos(cambios) } };
        }),
      guardarContrasena: (hashContrasena) => setEstado((e) => ({ ...e, cuenta: { ...e.cuenta, hashContrasena } })),
      iniciarSesion: () => setEstado((e) => ({ ...e, sesionIniciada: true })),
      cerrarSesion: () => setEstado((e) => ({ ...e, sesionIniciada: false, sesion: null, contextoTutor: null })),
      completarAlta: () => setEstado((e) => ({ ...e, altaCompleta: true })),
      cambiarTutorIA: (tutorIA) => setEstado((e) => ({ ...e, tutorIA })),
      guardarPerfil: ({ alias, anonimo }) => setEstado((e) => ({ ...e, alias, anonimo })),
      cambiarAnonimo: (anonimo) => setEstado((e) => ({ ...e, anonimo })),
      seleccionarCurso: (cursoId) =>
        setEstado((e) =>
          e.cursoId === cursoId
            ? e
            : {
                ...estadoInicial,
                cuenta: e.cuenta,
                sesionIniciada: e.sesionIniciada,
                altaCompleta: e.altaCompleta,
                tutorIA: e.tutorIA,
                ajustes: e.ajustes,
                tramoEdad: e.tramoEdad,
                consentimientoFamilia: e.consentimientoFamilia,
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
      // Eliminar la cuenta borra todos los datos del alumno de este dispositivo. Se conservan los ajustes de visualización.
      eliminarCuenta: () => setEstado((e) => ({ ...estadoInicial, ajustes: e.ajustes })),
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
