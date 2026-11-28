/*
 * Acciones de la sesión con el servidor (issue #57), para useEstado.jsx. Las reglas de cómo cambia el estado al entrar,
 * al salir o al cambiar el perfil son funciones puras de api/sesion.js, con sus pruebas; aquí se coordinan con las
 * peticiones al servidor y con el progreso guardado por cuenta.
 *
 * - Los cambios del perfil se aplican cuando el servidor los confirma: si fallan, el móvil sigue como estaba
 *   (por ejemplo, quien desactiva el mentor con IA no lo vuelve a tener activado sin saberlo).
 * - Si el servidor responde que la sesión ha caducado, se cierra solo si es la sesión abierta en ese momento:
 *   una respuesta que llega tarde de una sesión ya cerrada no echa a nadie.
 */
import { olvidarContrasenaAlta } from '../api/altaPendiente.js';
import { actualizarPerfilServidor, cerrarSesionServidor, obtenerPerfilServidor } from '../api/cliente.js';
import { borrarProgreso, guardarProgreso, leerProgreso } from '../api/progresoLocal.js';
import {
  aplicarCambiosPerfil,
  CAMPOS_PERFIL,
  estadoAlEntrar,
  estadoAlSalir,
  estadoDesdePerfil,
  mensajeDeError,
} from '../api/sesion.js';

/**
 * estadoActual: referencia al estado de este momento (useRef). setEstado: el de useState. inicial: el estado de una
 * app recién instalada.
 */
export function accionesDeSesion({ estadoActual, setEstado, inicial }) {
  /** Cierra la sesión en el móvil y lleva a la pantalla de entrar con un aviso. */
  const caducarSesion = (tokenUsado = estadoActual.current.token) => {
    if (!tokenUsado || tokenUsado !== estadoActual.current.token) return;
    setEstado((e) => {
      guardarProgreso(e);
      return estadoAlSalir(e, inicial, { avisoSesion: mensajeDeError({ codigo: 'sesion_no_valida' }) });
    });
    window.location.hash = '/entrar';
  };

  /** Si el error es de sesión caducada, la cierra. Siempre vuelve a lanzar el error para quien llamó. */
  const conSesion = (error) => {
    if (error?.codigo === 'sesion_no_valida') caducarSesion(error.token);
    throw error;
  };

  /** Aplica el perfil del servidor si la respuesta es de la sesión que sigue abierta. */
  const aplicarPerfil = (tokenUsado, perfil) =>
    setEstado((e) => (e.token === tokenUsado ? { ...e, ...estadoDesdePerfil(perfil) } : e));

  return {
    caducarSesion,

    /** Sesión abierta en el servidor (alta o inicio de sesión). Guarda el progreso de la cuenta anterior, si era otra. */
    entrarConServidor: ({ token, perfil }) => {
      olvidarContrasenaAlta();
      setEstado((e) => {
        if (e.cuenta?.email && e.cuenta.email !== perfil.email) guardarProgreso(e);
        return estadoAlEntrar(e, { token, perfil }, leerProgreso(perfil), inicial);
      });
    },

    cerrarSesion: () => {
      olvidarContrasenaAlta();
      // El token deja de valer también en el servidor (se envía mientras aún está puesto). Si no responde, caducará solo.
      if (estadoActual.current.token) cerrarSesionServidor().catch(() => {});
      setEstado((e) => {
        if (!e.token) return { ...e, sesionIniciada: false, sesion: null, contextoMentor: null };
        guardarProgreso(e);
        return estadoAlSalir(e, inicial);
      });
    },

    /** Tras eliminarla (en el servidor, si hay backend): no queda nada de la cuenta en el móvil. */
    eliminarCuenta: () =>
      setEstado((e) => {
        borrarProgreso(e.cuenta?.email);
        return estadoAlSalir(e, inicial, { cuentaConocida: false });
      }),

    /**
     * Cambia datos del perfil (CAMPOS_PERFIL). Con sesión, primero en el servidor y después aquí, con lo que responda;
     * sin sesión (durante el alta o sin backend), solo aquí. Devuelve una promesa que falla si el servidor falla.
     */
    cambiarPerfil: async (cambios) => {
      const tokenUsado = estadoActual.current.token;
      if (!tokenUsado) {
        setEstado((e) => aplicarCambiosPerfil(e, cambios));
        return;
      }
      const datos = Object.fromEntries(Object.entries(cambios).filter(([clave]) => CAMPOS_PERFIL.includes(clave)));
      aplicarPerfil(tokenUsado, await actualizarPerfilServidor(datos).catch(conSesion));
    },

    /**
     * Comprueba que la sesión sigue valiendo y trae el perfil del servidor (cambios hechos en otro móvil o por la
     * academia). Si ha caducado, la cierra: sin ella, el servidor no quitaría el nombre de lo que va a la IA.
     */
    comprobarSesion: async () => {
      const tokenUsado = estadoActual.current.token;
      if (!tokenUsado) return;
      try {
        aplicarPerfil(tokenUsado, await obtenerPerfilServidor());
      } catch (error) {
        if (error.codigo === 'sesion_no_valida') caducarSesion(error.token);
      }
    },
  };
}
