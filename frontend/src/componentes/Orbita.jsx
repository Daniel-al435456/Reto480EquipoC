import { useEffect, useRef, useState } from 'react';
import { IconoCheck, IconoIA, IconoProgreso, IconoReloj, IconoReproducir, IconoSinAudio } from './Iconos.jsx';
import { Pato, movimientoReducido } from './Pato.jsx';
import estilos from './Orbita.module.css';

const ELEMENTOS = [
  { Icono: IconoReproducir, texto: 'Vídeos cortos' },
  { Icono: IconoReloj, texto: '5, 10 o 20 min' },
  { Icono: IconoCheck, texto: 'Sin repetir' },
  { Icono: IconoIA, texto: 'Tutor' },
  { Icono: IconoProgreso, texto: 'Tu progreso' },
  { Icono: IconoSinAudio, texto: 'Sin audio' },
];

const GIRO_AUTOMATICO = 0.004; // radianes por fotograma (una vuelta cada ~26 s a 60 fps)
const ROZAMIENTO = 0.94;

/**
 * Ilustración de la bienvenida: el pato en el círculo de marca y las ventajas de la app girando en una órbita
 * en perspectiva. Gira sola despacio y se puede girar arrastrando con el dedo o el ratón, con inercia.
 * Es decorativa (aria-hidden): el texto de la pantalla ya cuenta lo mismo.
 * Con "reducir movimiento" no gira sola, pero se puede seguir girando a mano.
 */
export function Orbita() {
  const escenario = useRef(null);
  const anillo = useRef(null);
  const circulo = useRef(null);
  const elementos = useRef([]);
  const [girada, setGirada] = useState(false);

  useEffect(() => {
    const nodo = escenario.current;
    let angulo = 0;
    let velocidad = 0;
    let arrastre = null;
    let rx = 0;
    let ry = 0;
    let fotograma;

    const medir = () => {
      const { width, height } = nodo.getBoundingClientRect();
      const radioCirculo = circulo.current.offsetWidth / 2;
      const altoElemento = elementos.current[0]?.offsetHeight ?? 44;
      // Los elementos de delante pasan por debajo del círculo y los de detrás asoman por encima.
      rx = Math.max(90, Math.min(width / 2 - altoElemento, 190));
      ry = Math.min(radioCirculo + altoElemento * 0.55, height / 2 - altoElemento / 2);
      anillo.current.style.width = `${rx * 2}px`;
      anillo.current.style.height = `${ry * 2}px`;
    };

    const colocar = () => {
      elementos.current.forEach((elemento, i) => {
        if (!elemento) return;
        const a = angulo + (i * 2 * Math.PI) / ELEMENTOS.length;
        const profundidad = Math.cos(a); // 1 delante, -1 detrás
        const escala = 0.78 + 0.22 * ((profundidad + 1) / 2);
        elemento.style.transform = `translate(-50%, -50%) translate(${Math.sin(a) * rx}px, ${profundidad * ry}px) scale(${escala})`;
        elemento.style.zIndex = profundidad > 0 ? 3 : 1;
        elemento.style.opacity = String(0.35 + 0.65 * ((profundidad + 1) / 2));
        // Solo el elemento que pasa por delante muestra su texto.
        const delante = profundidad > 0.82;
        if (delante !== (elemento.dataset.delante === 'si')) elemento.dataset.delante = delante ? 'si' : 'no';
      });
    };

    const animar = () => {
      if (!arrastre) {
        const reducido = movimientoReducido();
        if (reducido) velocidad *= ROZAMIENTO;
        else velocidad = velocidad * ROZAMIENTO + GIRO_AUTOMATICO * (1 - ROZAMIENTO);
        angulo += velocidad;
      }
      colocar();
      fotograma = requestAnimationFrame(animar);
    };

    const alPulsar = (e) => {
      arrastre = { x: e.clientX, tiempo: e.timeStamp };
      velocidad = 0;
      nodo.setPointerCapture(e.pointerId);
      nodo.dataset.arrastrando = 'si';
    };
    const alMover = (e) => {
      if (!arrastre) return;
      const delta = (e.clientX - arrastre.x) / rx;
      const tiempo = Math.max(1, e.timeStamp - arrastre.tiempo);
      angulo += delta;
      velocidad = (delta / tiempo) * 16; // por fotograma
      arrastre = { x: e.clientX, tiempo: e.timeStamp };
      setGirada(true);
    };
    const alSoltar = () => {
      arrastre = null;
      velocidad = Math.max(-0.25, Math.min(0.25, velocidad));
      delete nodo.dataset.arrastrando;
    };

    medir();
    colocar();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    nodo.addEventListener('pointerdown', alPulsar);
    nodo.addEventListener('pointermove', alMover);
    nodo.addEventListener('pointerup', alSoltar);
    nodo.addEventListener('pointercancel', alSoltar);
    fotograma = requestAnimationFrame(animar);
    return () => {
      cancelAnimationFrame(fotograma);
      observador.disconnect();
      nodo.removeEventListener('pointerdown', alPulsar);
      nodo.removeEventListener('pointermove', alMover);
      nodo.removeEventListener('pointerup', alSoltar);
      nodo.removeEventListener('pointercancel', alSoltar);
    };
  }, []);

  return (
    <div className={estilos.contenedor} aria-hidden="true">
      <div ref={escenario} className={estilos.escenario}>
        <span ref={anillo} className={estilos.anillo} />
        <span className={estilos.halo} />
        <span ref={circulo} className={estilos.circulo}>
          <Pato tamano={84} />
        </span>
        {ELEMENTOS.map(({ Icono, texto }, i) => (
          <span key={texto} ref={(n) => (elementos.current[i] = n)} className={estilos.elemento}>
            <span className={estilos.icono}>
              <Icono tamano={18} />
            </span>
            <span className={estilos.textoElemento}>{texto}</span>
          </span>
        ))}
      </div>
      <span className={`${estilos.pista} ${girada ? estilos.oculta : ''}`}>Arrastra para girar</span>
    </div>
  );
}
