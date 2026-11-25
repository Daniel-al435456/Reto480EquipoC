import { useEffect, useRef, useState } from 'react';
import { movimientoReducido } from './Pato.jsx';
import estilos from './TextoTecleado.module.css';

const VOCAL = /[aeiouáéíóú]/i;
const PAUSA = /[\s.,;:¿?¡!]/;

/**
 * Muestra un texto letra a letra, como si el mentor lo dijera en ese momento.
 * - alHablar("abierto" | "cerrado"): para mover el pico del pato (se abre con las vocales y se cierra en las pausas).
 * - alTerminar(): cuando se ha mostrado todo el texto.
 * El lector de pantalla recibe el texto completo de una vez, no letra a letra.
 * Con "reducir animaciones" el texto aparece entero.
 */
export function TextoTecleado({ texto, alHablar, alTerminar }) {
  const [mostradas, setMostradas] = useState(() => (movimientoReducido() ? texto.length : 0));
  const terminado = useRef(false);

  useEffect(() => {
    if (mostradas >= texto.length) {
      if (!terminado.current) {
        terminado.current = true;
        alHablar?.('cerrado');
        alTerminar?.();
      }
      return undefined;
    }
    const anterior = texto[mostradas - 1] ?? '';
    const espera = /[.,;:?!]/.test(anterior) ? 240 : 30;
    const t = setTimeout(() => setMostradas((n) => n + 1), espera);
    return () => clearTimeout(t);
  }, [mostradas, texto, alHablar, alTerminar]);

  useEffect(() => {
    const letra = texto[mostradas - 1];
    if (!letra || mostradas >= texto.length) return;
    if (VOCAL.test(letra)) alHablar?.('abierto');
    else if (PAUSA.test(letra)) alHablar?.('cerrado');
  }, [mostradas, texto, alHablar]);

  return (
    <>
      <span className="visualmente-oculto">{texto}</span>
      <span aria-hidden="true">
        {texto.slice(0, mostradas)}
        {mostradas < texto.length && <span className={estilos.cursor} />}
      </span>
    </>
  );
}
