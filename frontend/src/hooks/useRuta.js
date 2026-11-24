import { useCallback, useEffect, useState } from 'react';

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

/**
 * Compara una ruta con un patrón como "/curso/:id/sesion/:paso".
 * Devuelve los parámetros o null si no coincide.
 */
export function coincide(patron, ruta) {
  const partesPatron = patron.split('/').filter(Boolean);
  const partesRuta = ruta.split('/').filter(Boolean);
  if (partesPatron.length !== partesRuta.length) return null;
  const parametros = {};
  for (let i = 0; i < partesPatron.length; i++) {
    if (partesPatron[i].startsWith(':')) {
      parametros[partesPatron[i].slice(1)] = decodeURIComponent(partesRuta[i]);
    } else if (partesPatron[i] !== partesRuta[i]) {
      return null;
    }
  }
  return parametros;
}
