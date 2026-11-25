/*
 * Funciones de la PWA: instalación, actualizaciones y service worker.
 * Las pantallas no usan este archivo directamente, sino el hook usePwa.
 */

let eventoInstalacion = null; // evento "beforeinstallprompt" guardado para lanzar la instalación al pulsar el botón
let versionNueva = null; // service worker nuevo esperando a activarse
let pidioActualizar = false;
const oyentes = new Set();

let instantanea = crearInstantanea();

function crearInstantanea() {
  return { puedeInstalar: Boolean(eventoInstalacion), hayVersionNueva: Boolean(versionNueva), instalada: estaInstalada() };
}

function avisar() {
  instantanea = crearInstantanea();
  oyentes.forEach((oyente) => oyente());
}

export function suscribir(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export const obtenerEstadoPwa = () => instantanea;

/** true si la app se está usando instalada (desde el icono), no desde el navegador. */
export function estaInstalada() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** true en iPhone e iPad, donde Safari no permite el botón de instalar y hay que hacerlo a mano. */
export function esIos() {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

/** Muestra el diálogo de instalación del navegador. Devuelve true si el alumno la acepta. */
export async function instalar() {
  if (!eventoInstalacion) return false;
  eventoInstalacion.prompt();
  const { outcome } = await eventoInstalacion.userChoice;
  eventoInstalacion = null;
  avisar();
  return outcome === 'accepted';
}

/** Activa la versión nueva; la página se recarga sola cuando está lista. */
export function actualizar() {
  if (!versionNueva) return;
  pidioActualizar = true;
  versionNueva.postMessage('activar');
}

export function iniciarPwa({ registrarServiceWorker }) {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    eventoInstalacion = evento;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalacion = null;
    avisar();
  });

  // El service worker solo se registra en producción, para no interferir con el desarrollo.
  if (!registrarServiceWorker || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registro = await navigator.serviceWorker.register('./sw.js');
      const vigilar = (trabajador) => {
        trabajador.addEventListener('statechange', () => {
          // "installed" con un service worker ya activo = hay una versión nueva esperando.
          if (trabajador.state === 'installed' && navigator.serviceWorker.controller) {
            versionNueva = trabajador;
            avisar();
          }
        });
      };
      if (registro.waiting && navigator.serviceWorker.controller) {
        versionNueva = registro.waiting;
        avisar();
      }
      registro.addEventListener('updatefound', () => registro.installing && vigilar(registro.installing));
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (pidioActualizar) window.location.reload();
      });
    } catch {
      // Si el navegador no lo permite, la aplicación funciona igual, solo que sin modo sin conexión.
    }
  });
}
