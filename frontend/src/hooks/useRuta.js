import { useCallback, useEffect, useState } from 'react';
import { coincide } from '../api/rutas.js';

export { coincide };

/*
 * Navegación mínima basada en el hash de la URL (#/ruta), sin dependencias.
 * Funciona en cualquier alojamiento estático sin configurar el servidor
 * y permite usar el botón "atrás" del móvil.
 */

function leerHash() {
  const ruta = window.location.hash.replace(/^#/, '');
  return ruta.startsWith('/') ? ruta : '/';
}

export function useRuta() {
  const [ruta, setRuta] = useState(leerHash);

  useEffect(() => {
    const alCambiar = () => setRuta(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  /** Con { reemplazar: true } no deja la ruta actual en el historial (redirecciones). */
  const navegar = useCallback((destino, { reemplazar = false } = {}) => {
    setRuta(destino);
    try {
      if (window.location.hash === `#${destino}`) return;
      if (reemplazar) window.history.replaceState(null, '', `#${destino}`);
      else window.location.hash = destino;
    } catch {
      // Si el entorno no permite cambiar la URL, la navegación sigue funcionando en memoria.
    }
  }, []);

  return { ruta, navegar };
}

