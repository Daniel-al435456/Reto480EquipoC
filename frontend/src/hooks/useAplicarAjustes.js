import { useEffect } from 'react';

const COLOR_BARRA = { claro: '#f4f6f6', oscuro: '#1f2222' };

/**
 * Aplica los ajustes de visualización del alumno como atributos de <html>
 * (data-tema, data-texto, data-contraste, data-movimiento), que leen las variables CSS.
 * Los valores "auto" y "normal" no añaden atributo: se sigue al dispositivo.
 * index.html aplica lo mismo antes de cargar la app para evitar parpadeos.
 */
export function useAplicarAjustes(ajustes) {
  useEffect(() => {
    const raiz = document.documentElement;
    for (const clave of ['tema', 'texto', 'contraste', 'movimiento']) {
      const valor = ajustes[clave];
      if (!valor || valor === 'auto' || valor === 'normal') delete raiz.dataset[clave];
      else raiz.dataset[clave] = valor;
    }

    // Color de la barra del navegador y del sistema: el del tema elegido, o el del dispositivo.
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      const delSistema = meta.media.includes('dark') ? COLOR_BARRA.oscuro : COLOR_BARRA.claro;
      meta.content = COLOR_BARRA[ajustes.tema] ?? delSistema;
    });
  }, [ajustes]);
}
