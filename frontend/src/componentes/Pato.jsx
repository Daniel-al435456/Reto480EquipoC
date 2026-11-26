import { memo, useEffect, useMemo, useState } from 'react';
import { PALETA_PATO, SPRITES_PATO } from '../api/pato.js';
import estilos from './Pato.module.css';

const BASE32 = '0123456789abcdefghijklmnopqrstuv';

/** Monta la cuadrícula de una cara a partir de la base y sus diferencias. */
function cuadricula(variante, cara) {
  const datos = SPRITES_PATO[variante];
  const filas = datos.base.map((fila) => fila.split(''));
  const cambios = cara === 'cerrado' ? '' : (datos[cara] ?? '');
  for (let i = 0; i < cambios.length; i += 3) {
    filas[BASE32.indexOf(cambios[i + 1])][BASE32.indexOf(cambios[i])] = cambios[i + 2];
  }
  return filas;
}

const Dibujo = memo(function Dibujo({ variante, cara, tamano }) {
  const rects = useMemo(() => {
    const lista = [];
    cuadricula(variante, cara).forEach((fila, y) =>
      fila.forEach((color, x) => {
        if (color !== '.') lista.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.03" height="1.03" fill={PALETA_PATO[color]} />);
      }),
    );
    return lista;
  }, [variante, cara]);

  return (
    <svg viewBox="0 0 32 32" width={tamano} height={tamano} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
});

/** true si el alumno o su dispositivo piden reducir las animaciones. */
export function movimientoReducido() {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.movimiento === 'reducido'
  );
}

const MIRAR_COLA = [
  ['mirar', 450],
  ['cola', 1000],
  ['mirar', 350],
];

/**
 * Pato mentor en pixel art. Es decorativo: el texto del mentor es lo importante.
 *
 * - variante: "pato" (con gafas) o "pata" (con lazo).
 * - cara: cara que se muestra (por ejemplo, "abierto" mientras habla). Si no se indica, el pato está en reposo.
 * - reposo: cara de reposo ("cerrado", "contento_c", "animando_c"...).
 * - vivo: en reposo respira, parpadea y de vez en cuando se mira la cola.
 */
export function Pato({ variante = 'pato', cara, reposo = 'cerrado', tamano = 64, vivo = true, className = '' }) {
  const [caraReposo, setCaraReposo] = useState(reposo);
  const animar = vivo && !cara;

  useEffect(() => setCaraReposo(reposo), [reposo]);

  useEffect(() => {
    if (!animar || movimientoReducido()) return undefined;
    const temporizadores = [];
    const despues = (ms, fn) => temporizadores.push(setTimeout(fn, ms));
    let activo = true;

    const parpadear = () =>
      despues(2500 + Math.random() * 3500, () => {
        if (!activo) return;
        setCaraReposo('parpadeo');
        despues(130, () => {
          setCaraReposo(reposo);
          parpadear();
        });
      });

    const mirarCola = () =>
      despues(9000 + Math.random() * 7000, () => {
        let i = 0;
        const paso = () => {
          if (!activo) return;
          if (i >= MIRAR_COLA.length) {
            setCaraReposo(reposo);
            mirarCola();
            return;
          }
          const [nombre, ms] = MIRAR_COLA[i++];
          setCaraReposo(nombre);
          despues(ms, paso);
        };
        paso();
      });

    parpadear();
    mirarCola();
    return () => {
      activo = false;
      temporizadores.forEach(clearTimeout);
    };
  }, [animar, reposo]);

  return (
    <span className={`${estilos.pato} ${vivo ? estilos.respira : ''} ${className}`} style={{ width: tamano, height: tamano }}>
      <Dibujo variante={variante} cara={cara ?? caraReposo} tamano={tamano} />
    </span>
  );
}
