/*
 * Cuenta en el servidor (issue #57): reglas puras, sin React, para pasar datos entre el estado de la app y las
 * rutas de cuenta del backend (backend/README.md, "Cuenta y sesión").
 */

/** Datos del perfil que el alumno puede cambiar y que se guardan en el servidor (PATCH /api/cuenta). */
export const CAMPOS_PERFIL = ['nombre', 'apellidos', 'puesto', 'alias', 'anonimo', 'mentorIA', 'personalidadMentor', 'tratamiento'];

/**
 * Progreso del alumno: lo que se guarda por cuenta en este móvil hasta que esté en el servidor (ramas 3 y 4).
 * No incluye la cuenta, la sesión ni los ajustes de visualización, que son del dispositivo.
 */
export const CAMPOS_PROGRESO = [
  'cursoId',
  'testHecho',
  'dominioTest',
  'dominio',
  'completadas',
  'modo',
  'sesion',
  'mensajesMentor',
  'mentorNoLeido',
  'contextoMentor',
  'eventos',
];

/** Cuerpo de POST /api/cuenta: los datos de los cuatro pasos del alta. Nunca el resumen local de la contraseña. */
export function cuerpoAlta(estado, contrasena) {
  const { cuenta } = estado;
  return {
    empresa: cuenta.empresa,
    nombre: cuenta.nombre,
    apellidos: cuenta.apellidos,
    email: cuenta.email.trim().toLowerCase(),
    contrasena,
    puesto: cuenta.puesto ?? '',
    fechaNacimiento: estado.fechaNacimiento,
    consentimientoFamilia: Boolean(estado.consentimientoFamilia),
    // El paso 1 no deja seguir sin aceptar la política de privacidad.
    privacidadAceptada: true,
    alias: estado.alias,
    anonimo: estado.anonimo,
    mentorIA: estado.mentorIA,
    personalidadMentor: estado.personalidadMentor,
    tratamiento: estado.tratamiento,
  };
}

/** Lo que el perfil del servidor cambia en el estado de la app: la cuenta, con el alta completa y la sesión abierta. */
export function estadoDesdePerfil(perfil) {
  return {
    cuenta: {
      empresa: perfil.empresa,
      nombre: perfil.nombre,
      apellidos: perfil.apellidos,
      email: perfil.email,
      puesto: perfil.puesto,
      creada: perfil.creadoEn,
    },
    fechaNacimiento: perfil.fechaNacimiento,
    consentimientoFamilia: perfil.consentimientoFamiliaEn,
    alias: perfil.alias,
    anonimo: perfil.anonimo,
    mentorIA: perfil.mentorIA,
    personalidadMentor: perfil.personalidadMentor,
    tratamiento: perfil.tratamiento,
    altaCompleta: true,
    sesionIniciada: true,
  };
}

/** Un cambio del perfil (CAMPOS_PERFIL) aplicado al estado: nombre, apellidos y puesto van en la cuenta. */
export function aplicarCambiosPerfil(estado, cambios) {
  const { nombre, apellidos, puesto, ...resto } = cambios;
  const deLaCuenta = Object.fromEntries(
    Object.entries({ nombre, apellidos, puesto }).filter(([, valor]) => valor !== undefined),
  );
  return { ...estado, ...resto, cuenta: { ...estado.cuenta, ...deLaCuenta } };
}

/**
 * Estado al entrar con una cuenta del servidor (alta o inicio de sesión). `inicial` es el estado de una app recién
 * instalada. Se conservan los ajustes del dispositivo; el progreso es el que ya había en el móvil si es la misma
 * cuenta (al terminar el alta) o el guardado para esa cuenta (`progresoGuardado`).
 */
export function estadoAlEntrar(estado, { token, perfil }, progresoGuardado, inicial) {
  const mismaCuenta = estado.cuenta?.email === perfil.email;
  const progreso = mismaCuenta ? progresoDe(estado) : progresoGuardado;
  return { ...inicial, ajustes: estado.ajustes, ...progreso, ...estadoDesdePerfil(perfil), token, cuentaConocida: true };
}

/**
 * Estado al salir de una cuenta del servidor (cerrar sesión, sesión caducada o cuenta eliminada): no queda nada de
 * la cuenta, solo los ajustes del dispositivo y si ya se entró desde aquí (para ofrecer "Iniciar sesión").
 */
export function estadoAlSalir(estado, inicial, cambios = {}) {
  return { ...inicial, ajustes: estado.ajustes, cuentaConocida: estado.cuentaConocida, ...cambios };
}

/** El progreso del estado, para guardarlo aparte con la cuenta a la que pertenece. */
export function progresoDe(estado) {
  return Object.fromEntries(CAMPOS_PROGRESO.filter((campo) => campo in estado).map((campo) => [campo, estado[campo]]));
}

/** El progreso que se guarda en el móvil: con la fecha de creación de la cuenta, para no dárselo a otra con su correo. */
export function progresoParaGuardar(estado) {
  return { ...progresoDe(estado), cuentaCreadaEn: estado.cuenta?.creada ?? null };
}

/** Días que se conservan los mensajes con el mentor (SPEC §6). */
export const DIAS_MENSAJES = 90;

/** Fecha de un mensaje del mentor, que va al principio de su id (useEstado, anadirMensaje), o null si no la tiene. */
const fechaDeMensaje = (mensaje) => Number(String(mensaje.id).split('-')[0]) || null;

/**
 * El progreso guardado de una cuenta, listo para recuperarlo: vacío si era de otra cuenta con el mismo correo (por
 * ejemplo, reasignado por la academia), y sin los mensajes del mentor de más de 90 días.
 */
export function progresoRecuperado(guardado, perfil, ahora = Date.now()) {
  if (!guardado || guardado.cuentaCreadaEn !== perfil.creadoEn) return {};
  const { cuentaCreadaEn, ...progreso } = guardado;
  const limite = ahora - DIAS_MENSAJES * 24 * 60 * 60 * 1000;
  if (Array.isArray(progreso.mensajesMentor)) {
    progreso.mensajesMentor = progreso.mensajesMentor.filter((m) => {
      const fecha = fechaDeMensaje(m);
      return fecha === null || fecha >= limite;
    });
  }
  return progreso;
}

/** Resumen corto (FNV-1a) para no dejar el correo en claro en el nombre de la clave. No es una protección criptográfica. */
function resumen(texto) {
  let h = 2166136261;
  for (const letra of texto) h = Math.imul(h ^ letra.codePointAt(0), 16777619) >>> 0;
  return h.toString(36);
}

/** Clave de localStorage con el progreso de una cuenta en este móvil. */
export function claveProgreso(email) {
  return `reto480-progreso-v5:${resumen(email.trim().toLowerCase())}`;
}

const SIN_CONEXION = 'No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const GENERAL = 'No se ha podido completar. Inténtalo de nuevo.';

const MENSAJES = {
  sin_conexion: SIN_CONEXION,
  // El backend no tiene base de datos: para el alumno es lo mismo que no poder conectar.
  base_datos_no_disponible: SIN_CONEXION,
  credenciales_incorrectas: 'El correo o la contraseña no son correctos.',
  email_registrado: 'Ya hay una cuenta con ese correo. Inicia sesión con él o cambia el correo.',
  sesion_no_valida: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  contrasena_incorrecta: 'La contraseña no es correcta.',
  validacion: 'Revisa los datos: alguno no tiene el formato correcto.',
  datos_no_validos: 'Revisa los datos: alguno no tiene el formato correcto.',
};

/** Errores de las reglas del alta: su mensaje del servidor está escrito para el alumno y se muestra tal cual. */
const CON_MENSAJE_DEL_SERVIDOR = [
  'consentimiento_necesario',
  'privacidad_no_aceptada',
  'fecha_nacimiento_invalida',
  'contrasena_debil',
];

/** Mensaje para el alumno ante un error de las rutas de cuenta ({ codigo, mensaje }). Nunca un tecnicismo. */
export function mensajeDeError(error) {
  if (MENSAJES[error?.codigo]) return MENSAJES[error.codigo];
  if (CON_MENSAJE_DEL_SERVIDOR.includes(error?.codigo) && error.mensaje) return error.mensaje;
  return GENERAL;
}
