import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cambiosPermitidos } from '../api/cuenta.js';
import { esMenor } from '../api/edad.js';
import { PERSONALIDAD_INICIAL, TRATAMIENTO_INICIAL } from '../api/tutor.js';

export { esMenor };

/*
 * Estado del alumno en el dispositivo: cuenta y sesión, ajustes de visualización, fecha de nacimiento y consentimiento familiar, tutor,
 * perfil (alias y modo anónimo), curso elegido, resultado del test, progreso,
 * modo de estudio, sesión en curso, conversación con el tutor y eventos de aprendizaje.
 * Se guarda en el almacenamiento local para no perder el progreso al cerrar la app.
 * Cuando exista backend, la cuenta y la sesión se gestionarán en el servidor y los eventos se enviarán a la API.
 */

const CLAVE = 'reto480-estado-v3';

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
  /** Carácter del tutor: amable | motivador | gracioso | estricto (api/tutor.js). */
  personalidadTutor: PERSONALIDAD_INICIAL,
  /** Cómo se dirige el tutor al alumno: femenino | masculino | neutro. */
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
  mensajesTutor: [MENSAJE_INICIAL_TUTOR],
  tutorNoLeido: false,
  /** Lección de la que se habla al abrir el tutor desde una lección: { leccionId, titulo }. */
  contextoTutor: null,
  eventos: [],
};


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
      // La fecha de nacimiento y el consentimiento solo se indican durante el alta; después solo puede corregirlos la academia.
      guardarFechaNacimiento: (fechaNacimiento) => setEstado((e) => (e.altaCompleta ? e : { ...e, fechaNacimiento })),
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
      cambiarPersonalidadTutor: (personalidadTutor) => setEstado((e) => ({ ...e, personalidadTutor })),
      cambiarTratamiento: (tratamiento) => setEstado((e) => ({ ...e, tratamiento })),
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
                personalidadTutor: e.personalidadTutor,
                tratamiento: e.tratamiento,
                ajustes: e.ajustes,
                fechaNacimiento: e.fechaNacimiento,
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
