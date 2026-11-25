import { useEffect, useRef, useState } from 'react';
import { IconoCheck, IconoIA, IconoMeta, IconoReloj, IconoReproducir } from './Iconos.jsx';
import { movimientoReducido } from './Pato.jsx';
import estilos from './Orbita.module.css';

export const VENTAJAS = [
  {
    Icono: IconoMeta,
    texto: 'Aprendizaje personalizado',
    detalle: 'Un test inicial descubre lo que ya sabes y tu itinerario empieza donde lo necesitas.',
  },
  {
    Icono: IconoIA,
    texto: 'Tutor IA + tutor personal',
    detalle: 'Resuelve tus dudas al momento y, si hace falta, te pasa con un tutor de la academia.',
  },
  {
    Icono: IconoReproducir,
    texto: 'Material adaptado',
    detalle: 'Vídeo, lectura o resumen según el tiempo que tengas y si puedes usar sonido.',
  },
  {
    Icono: IconoReloj,
    texto: 'Sesiones de 5 a 20 min',
    detalle: 'Dinos cuánto tiempo tienes y preparamos una sesión que cabe en él.',
  },
  {
    Icono: IconoCheck,
    texto: 'Sin repetir lo que ya sabes',
    detalle: 'Lo que dominas no se repite, aunque puedes repasarlo cuando quieras.',
  },
];

const GIRO_AUTOMATICO = 0.004; // radianes por fotograma (una vuelta cada ~26 s a 60 fps)
const ROZAMIENTO = 0.94;
const PASO = (2 * Math.PI) / VENTAJAS.length;

/**
 * Ilustración de la bienvenida: las ventajas de la app giran alrededor del círculo de marca en una órbita
 * en perspectiva. La que pasa por delante muestra su nombre y se explica debajo. Gira sola despacio y se puede
 * girar arrastrando con el dedo o el ratón, con inercia. Con "reducir movimiento" no gira sola.
 * El lector de pantalla recibe la lista de ventajas completa, sin animación.
 */
export function Orbita() {
  const escenario = useRef(null);
  const anillo = useRef(null);
  const circulo = useRef(null);
  const elementos = useRef([]);
  const [activa, setActiva] = useState(0);
  const [girada, setGirada] = useState(false);

  useEffect(() => {
    const nodo = escenario.current;
    let angulo = 0;
    let velocidad = 0;
    let arrastre = null;
    let rx = 0;
    let ry = 0;
    let ancho = 0;
    let fotograma;
    let delante = -1;

    const medir = () => {
      const { width, height } = nodo.getBoundingClientRect();
      ancho = width;
      const radioCirculo = circulo.current.offsetWidth / 2;
      const alto = elementos.current[0]?.offsetHeight ?? 44;
      // Los de delante pasan por debajo del círculo y los de detrás asoman por encima.
      rx = Math.max(radioCirculo + alto, Math.min(width / 2 - alto, 190));
      ry = Math.min(radioCirculo + alto * 0.6, height / 2 - alto / 2);
      anillo.current.style.width = `${rx * 2}px`;
      anillo.current.style.height = `${ry * 2}px`;
    };

    const colocar = () => {
      let masCerca = 0;
      let maxProfundidad = -2;
      // Se leen los anchos antes de mover nada para no forzar el cálculo del diseño en cada elemento.
      const anchos = elementos.current.map((e) => e?.offsetWidth ?? 0);
      elementos.current.forEach((elemento, i) => {
        if (!elemento) return;
        const a = angulo + i * PASO;
        const profundidad = Math.cos(a); // 1 delante, -1 detrás
        const t = (profundidad + 1) / 2;
        // Ningún elemento se sale de la pantalla, aunque tenga el texto desplegado.
        const limite = Math.max(0, ancho / 2 - anchos[i] / 2 - 4);
        const x = Math.max(-limite, Math.min(limite, Math.sin(a) * rx));
        elemento.style.transform = `translate(-50%, -50%) translate(${x}px, ${profundidad * ry}px) scale(${0.78 + 0.22 * t})`;
        elemento.style.zIndex = profundidad > 0 ? 3 : 1;
        elemento.style.opacity = String(0.35 + 0.65 * t);
        if (profundidad > maxProfundidad) {
          maxProfundidad = profundidad;
          masCerca = i;
        }
      });
      if (masCerca !== delante) {
        delante = masCerca;
        elementos.current.forEach((e, i) => e && (e.dataset.delante = i === delante ? 'si' : 'no'));
        setActiva(delante);
      }
    };

    const animar = () => {
      if (!arrastre) {
        if (movimientoReducido()) velocidad *= ROZAMIENTO;
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
      // Arrastrar hacia la derecha mueve hacia la derecha lo que está delante.
      const delta = (e.clientX - arrastre.x) / rx;
      const tiempo = Math.max(1, e.timeStamp - arrastre.tiempo);
      angulo += delta;
      velocidad = (delta / tiempo) * 16;
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

  const ventaja = VENTAJAS[activa];

  return (
    <div className={estilos.contenedor}>
      <ul className="visualmente-oculto">
        {VENTAJAS.map(({ texto, detalle }) => (
          <li key={texto}>
            {texto}: {detalle}
          </li>
        ))}
      </ul>
      <div ref={escenario} className={estilos.escenario} aria-hidden="true">
        <span ref={anillo} className={estilos.anillo} />
        <span className={estilos.halo} />
        <span ref={circulo} className={estilos.circulo} />
        {VENTAJAS.map(({ Icono, texto }, i) => (
          <span key={texto} ref={(n) => (elementos.current[i] = n)} className={estilos.elemento}>
            <span className={estilos.icono}>
              <Icono tamano={18} />
            </span>
            <span className={estilos.textoElemento}>{texto}</span>
          </span>
        ))}
      </div>
      <p key={activa} className={estilos.detalle} aria-hidden="true">
        {ventaja.detalle}
      </p>
      <span className={`${estilos.pista} ${girada ? estilos.oculta : ''}`} aria-hidden="true">
        Arrastra para girar
      </span>
    </div>
  );
}
