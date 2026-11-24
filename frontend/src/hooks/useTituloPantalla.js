import { useEffect, useRef } from 'react';

/**
 * Para pantallas con cabecera propia: actualiza el título de la pestaña y mueve el foco al h1,
 * igual que hace el componente Pantalla. Devuelve la referencia que se asigna al h1.
 */
export function useTituloPantalla(titulo) {
  const encabezado = useRef(null);

  useEffect(() => {
    document.title = `${titulo} · 480 Academy`;
    encabezado.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [titulo]);

  return encabezado;
}
