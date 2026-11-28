import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ponerTokenSesion } from '../api/cliente.js';
import { cambiosPermitidos } from '../api/cuenta.js';
import { borrarClavesAntiguas } from '../api/progresoLocal.js';
import { mensajeDeError } from '../api/sesion.js';
import { accionesDeSesion } from './sesionServidor.js';
import { esMenor } from '../api/edad.js';
import { PERSONALIDAD_INICIAL, TRATAMIENTO_INICIAL } from '../api/mentor.js';

export { esMenor };

/*
 * Estado del alumno en el dispositivo: cuenta y sesión, ajustes de visualización, fecha de nacimiento y consentimiento familiar, mentor,
 * perfil (alias y modo anónimo), curso elegido, resultado del test, progreso,
 * modo de estudio, sesión en curso, conversación con el mentor y eventos de aprendizaje.
 * Se guarda en el almacenamiento local para no perder el progreso al cerrar la app.
 *
 * Con backend (issue #57), la cuenta vive en el servidor: aquí se guarda el token de la sesión y los cambios del perfil
 * se envían solos. El progreso sigue en el móvil hasta las ramas 3 y 4, guardado por cuenta: al cambiar de cuenta,
 * cada una recupera el suyo. Sin backend, la cuenta solo existe en el móvil, como antes.
 * Si cambia la forma del estado guardado, se sube la versión de la clave aquí y en index.html.
 */

const CLAVE = 'reto480-estado-v5';

const MENSAJE_INICIAL_MENTOR = {
  id: 'bienvenida',
  autor: 'mentor',
  texto: 'Hola, soy tu mentor. Pregúntame cualquier duda sobre el curso.',
};

/** Ajustes de visualización. "auto" sigue la configuración del dispositivo. */
export const AJUSTES_INICIALES = {
  texto: 'normal', // normal | grande | muy-grande
  tema: 'auto', // auto | claro | oscuro
  contraste: 'normal', // normal | alto
  movimiento: 'auto', // auto | reducido
  mentor: 'pato', // pato | pata | ninguno: cómo aparece el mentor
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
  /** El alumno puede desactivar el mentor con IA (propuesta P3, "Base legal"). */
  mentorIA: true,
  /** Carácter del mentor: amable | motivador | gracioso | estricto (api/mentor.js). */
  personalidadMentor: PERSONALIDAD_INICIAL,
  /** Cómo se dirige el mentor al alumno: femenino | masculino | neutro. */
  tratamiento: TRATAMIENTO_INICIAL,
  ajustes: AJUSTES_INICIALES,
  /**
   * Fecha de nacimiento (AAAA-MM-DD). Con ella el tramo de edad se actualiza solo al cumplir 14 o 18 años
   * (api/edad.js). Nunca se envía a la IA: solo si el alumno es menor o no.
   */
  fechaNacimiento: null,
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
  mensajesMentor: [MENSAJE_INICIAL_MENTOR],
  mentorNoLeido: false,
  /** Lección de la que se habla al abrir el mentor desde una lección: { leccionId, titulo }. */
  contextoMentor: null,
  eventos: [],
  /** Token de la sesión en el servidor (con backend). Nunca la contraseña. */
  token: null,
  /** Aviso para la pantalla de entrar, por ejemplo cuando la sesión ha caducado. */
  avisoSesion: '',
  /**
   * Ya se ha entrado con una cuenta del servidor en este móvil. Al cerrar sesión se borran sus datos, pero la bienvenida
   * sigue ofreciendo "Iniciar sesión" en lugar de "Crear cuenta". No guarda nada de la cuenta.
   */
  cuentaConocida: false,
  /** Aviso que se muestra en cualquier pantalla, por ejemplo si un cambio del perfil no se ha podido guardar. */
  avisoGlobal: '',
};

function cargar() {
  borrarClavesAntiguas();
  let estado = estadoInicial;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (guardado) estado = { ...estadoInicial, ...guardado, ajustes: { ...AJUSTES_INICIALES, ...guardado.ajustes } };
  } catch {
    // Sin almacenamiento o con datos dañados: se empieza de cero.
  }
  // Antes de la primera petición, para que ya lleve la sesión.
  ponerTokenSesion(estado.token);
  return estado;
}

const Contexto = createContext(null);

export function EstadoProvider({ children }) {
  const [estado, setEstado] = useState(cargar);
  // Estado actual para las acciones que llaman al servidor, que no deben depender de cada cambio.
  const estadoActual = useRef(estado);
  estadoActual.current = estado;

  useEffect(() => {
    ponerTokenSesion(estado.token);
  }, [estado.token]);

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

  // Acciones de la sesión con el servidor (hooks/sesionServidor.js). No dependen de cada cambio del estado.
  const sesionServidor = useMemo(() => accionesDeSesion({ estadoActual, setEstado, inicial: estadoInicial }), []);

  // Comprueba la sesión al abrir la app y al volver a ella: si ha caducado, pide entrar de nuevo.
  useEffect(() => {
    sesionServidor.comprobarSesion();
    const alVolver = () => document.visibilityState === 'visible' && sesionServidor.comprobarSesion();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [sesionServidor]);

  /** Un cambio del perfil que el servidor no ha guardado: el móvil sigue como estaba y se avisa. */
  const avisarFallo = useCallback((error) => {
    if (error?.codigo === 'sesion_no_valida') return;
    setEstado((e) => ({ ...e, avisoGlobal: `No se ha podido guardar el cambio. ${mensajeDeError(error)}` }));
  }, []);
  const cambiar = useCallback((cambios) => sesionServidor.cambiarPerfil(cambios).catch(avisarFallo), [sesionServidor, avisarFallo]);

  const acciones = useMemo(
    () => ({
      registrarEvento,
      cambiarAjuste: (clave, valor) => setEstado((e) => ({ ...e, ajustes: { ...e.ajustes, [clave]: valor } })),
      // La fecha de nacimiento y el consentimiento solo se indican durante el alta; después solo puede corregirlos la academia.
      guardarFechaNacimiento: (fechaNacimiento) => setEstado((e) => (e.altaCompleta ? e : { ...e, fechaNacimiento })),
      registrarConsentimiento: () =>
        setEstado((e) => (e.altaCompleta ? e : { ...e, consentimientoFamilia: new Date().toISOString() })),
      ponerContextoMentor: (contexto) => setEstado((e) => ({ ...e, contextoMentor: contexto })),
      // Paso 1 del alta. Con backend, la cuenta aún no existe en el servidor: se crea al terminar el paso 4.
      crearCuenta: (cuenta) =>
        setEstado((e) => ({ ...e, cuenta: { ...cuenta, creada: new Date().toISOString() }, sesionIniciada: true })),
      entrarConServidor: sesionServidor.entrarConServidor,
      // Desde el perfil solo se pueden cambiar algunos datos (CAMPOS_EDITABLES en api/cuenta.js); el resto solo la academia.
      // Devuelve una promesa: PerfilCuenta espera a que el servidor los guarde para confirmarlo.
      actualizarCuenta: (cambios) => sesionServidor.cambiarPerfil(cambiosPermitidos(cambios)),
      guardarContrasena: (hashContrasena) => setEstado((e) => ({ ...e, cuenta: { ...e.cuenta, hashContrasena } })),
      iniciarSesion: () => setEstado((e) => ({ ...e, sesionIniciada: true })),
      cerrarSesion: sesionServidor.cerrarSesion,
      completarAlta: () => setEstado((e) => ({ ...e, altaCompleta: true })),
      // Ajustes que también se guardan en el servidor: con sesión, se aplican cuando el servidor los confirma.
      cambiarMentorIA: (mentorIA) => cambiar({ mentorIA }),
      cambiarPersonalidadMentor: (personalidadMentor) => cambiar({ personalidadMentor }),
      cambiarTratamiento: (tratamiento) => cambiar({ tratamiento }),
      guardarPerfil: ({ alias, anonimo }) => cambiar({ alias, anonimo }),
      cambiarAnonimo: (anonimo) => cambiar({ anonimo }),
      caducarSesion: sesionServidor.caducarSesion,
      quitarAvisoSesion: () => setEstado((e) => (e.avisoSesion ? { ...e, avisoSesion: '' } : e)),
      quitarAvisoGlobal: () => setEstado((e) => (e.avisoGlobal ? { ...e, avisoGlobal: '' } : e)),
      seleccionarCurso: (cursoId) =>
        setEstado((e) =>
          e.cursoId === cursoId
            ? e
            : {
                ...estadoInicial,
                cuenta: e.cuenta,
                token: e.token,
                cuentaConocida: e.cuentaConocida,
                sesionIniciada: e.sesionIniciada,
                altaCompleta: e.altaCompleta,
                mentorIA: e.mentorIA,
                personalidadMentor: e.personalidadMentor,
                tratamiento: e.tratamiento,
                ajustes: e.ajustes,
                fechaNacimiento: e.fechaNacimiento,
                consentimientoFamilia: e.consentimientoFamilia,
                alias: e.alias,
                anonimo: e.anonimo,
                modo: e.modo,
                cursoId,
                mensajesMentor: e.mensajesMentor,
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
          mentorNoLeido: e.mentorNoLeido || Boolean(mensaje.proactivo),
          mensajesMentor: [...e.mensajesMentor, { id: `${Date.now()}-${Math.random()}`, ...mensaje }].slice(-100),
        })),
      borrarHistorialMentor: () =>
        setEstado((e) => ({ ...e, mensajesMentor: [MENSAJE_INICIAL_MENTOR], mentorNoLeido: false })),
      marcarMentorLeido: () => setEstado((e) => (e.mentorNoLeido ? { ...e, mentorNoLeido: false } : e)),
      // Eliminar la cuenta borra todos los datos del alumno de este dispositivo. Se conservan los ajustes de visualización.
      // Con backend, la pantalla la elimina antes en el servidor.
      eliminarCuenta: sesionServidor.eliminarCuenta,
    }),
    [registrarEvento, sesionServidor, cambiar],
  );

  const valor = useMemo(() => ({ estado, ...acciones }), [estado, acciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useEstado debe usarse dentro de EstadoProvider');
  return contexto;
}
