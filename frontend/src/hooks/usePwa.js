import { useEffect, useState, useSyncExternalStore } from 'react';
import { obtenerEstadoPwa, suscribir } from '../pwa.js';

/** Estado de la PWA: { puedeInstalar, hayVersionNueva, instalada }. */
export function usePwa() {
  return useSyncExternalStore(suscribir, obtenerEstadoPwa);
}

/** true si el dispositivo tiene conexión a internet. */
export function useConexion() {
  const [conectado, setConectado] = useState(() => navigator.onLine);
  useEffect(() => {
    const conectar = () => setConectado(true);
    const desconectar = () => setConectado(false);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    return () => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
    };
  }, []);
  return conectado;
}
