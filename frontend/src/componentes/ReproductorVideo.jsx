import { useEffect, useRef, useState } from 'react';
import { estadoTrozo, formatoMinuto } from '../api/trozo.js';
import { Boton } from './Boton.jsx';
import { IconoReproducir } from './Iconos.jsx';
import estilos from './ReproductorVideo.module.css';

const ORIGEN_YOUTUBE = 'https://www.youtube-nocookie.com';

/**
 * Reproductor de YouTube que no se carga hasta que el alumno pulsa "reproducir".
 * Ahorra varios cientos de KB en 4G y evita cookies de seguimiento antes de que el alumno
 * decida ver el vídeo (dominio youtube-nocookie.com).
 *
 * inicio y fin (en segundos) limitan la reproducción al trozo del vídeo que corresponde a la lección.
 * El reproductor de YouTube informa del segundo en que va (mensajes de la API de iframes, sin cargar
 * ningún script): si el alumno pasa del fin, el vídeo se pausa; si va a un punto anterior al inicio,
 * vuelve al inicio.
 */
export function ReproductorVideo({ youtubeId, titulo, inicio = 0, fin = null, alReproducir }) {
  const [activo, setActivo] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [devuelto, setDevuelto] = useState(false);
  const marco = useRef(null);

  const enviar = (mensaje) => {
    const datos = JSON.stringify({ ...mensaje, id: youtubeId, channel: 'widget' });
    marco.current?.contentWindow?.postMessage(datos, ORIGEN_YOUTUBE);
  };
  const orden = (func, args = []) => enviar({ event: 'command', func, args });

  useEffect(() => {
    if (!activo) return undefined;
    // Hasta que el reproductor contesta, se le pide cada medio segundo que informe del tiempo (máx. 15 s).
    let conectado = false;
    // Al empezar, YouTube puede informar del segundo 0 antes de saltar al inicio del trozo: eso no es
    // que el alumno haya retrocedido, así que el aviso solo sale una vez que el vídeo ha llegado al trozo.
    let enElTrozo = false;
    let intentos = 0;
    const llamada = setInterval(() => {
      if (conectado || ++intentos > 30) clearInterval(llamada);
      else enviar({ event: 'listening' });
    }, 500);
    const alMensaje = (evento) => {
      if (evento.origin !== ORIGEN_YOUTUBE || evento.source !== marco.current?.contentWindow) return;
      let datos;
      try {
        datos = typeof evento.data === 'string' ? JSON.parse(evento.data) : evento.data;
      } catch {
        return;
      }
      conectado = true;
      const tiempo = datos?.info?.currentTime;
      if (typeof tiempo !== 'number') return;
      const estado = estadoTrozo(tiempo, inicio, fin);
      if (estado === 'antes') {
        orden('seekTo', [inicio, true]);
        if (enElTrozo) setDevuelto(true);
      }
      if (estado === 'dentro') {
        enElTrozo = true;
        if (tiempo > inicio + 3) setDevuelto(false);
      }
      if (estado === 'despues') {
        orden('pauseVideo');
        setTerminado(true);
      }
    };
    window.addEventListener('message', alMensaje);
    return () => {
      clearInterval(llamada);
      window.removeEventListener('message', alMensaje);
    };
  }, [activo, inicio, fin]);

  const verOtraVez = () => {
    orden('seekTo', [inicio, true]);
    orden('playVideo');
    setTerminado(false);
  };

  // Explicación del trozo, siempre a la vista bajo el vídeo: la barra de YouTube muestra el vídeo entero.
  const explicacion = fin ? (
    <div className={estilos.trozo}>
      <p>
        <strong>
          Este trozo va {inicio ? `del minuto ${formatoMinuto(inicio)}` : 'del principio'} al{' '}
          {formatoMinuto(fin)} del vídeo.
        </strong>{' '}
        La barra de YouTube muestra el vídeo entero, pero solo se reproduce este trozo.
      </p>
      <p className={estilos.devuelto} role="status">
        {devuelto && `Has ido a un punto anterior: el trozo empieza en el ${formatoMinuto(inicio)} y volvemos ahí.`}
      </p>
    </div>
  ) : null;

  if (!youtubeId) {
    return (
      <div className={estilos.marco}>
        <div className={estilos.vacio}>
          <span className={estilos.play} aria-hidden="true">
            <IconoReproducir tamano={28} />
          </span>
          <p>Vídeo de ejemplo pendiente de seleccionar</p>
        </div>
      </div>
    );
  }

  if (activo) {
    const trozo = `${inicio ? `&start=${inicio}` : ''}${fin ? `&end=${fin}` : ''}`;
    const origen = encodeURIComponent(window.location.origin);
    return (
      <>
        <div className={estilos.marco}>
          <iframe
            ref={marco}
            className={estilos.iframe}
            src={`${ORIGEN_YOUTUBE}/embed/${youtubeId}?autoplay=1&rel=0&cc_load_policy=1&hl=es&enablejsapi=1&origin=${origen}${trozo}`}
            title={`Vídeo: ${titulo}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => enviar({ event: 'listening' })}
          />
          {terminado && (
            <div className={estilos.final} role="status">
              <p>Has terminado este trozo del vídeo.</p>
              <Boton variante="secundario" onClick={verOtraVez}>
                Volver a verlo
              </Boton>
            </div>
          )}
        </div>
        {explicacion}
      </>
    );
  }

  return (
    <>
      <div className={estilos.marco}>
        <button
          type="button"
          className={estilos.portada}
          onClick={() => {
            setActivo(true);
            alReproducir?.();
          }}
          aria-label={`Reproducir vídeo: ${titulo}`}
        >
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            className={estilos.imagen}
          />
          <span className={estilos.play}>
            <IconoReproducir tamano={32} />
          </span>
          {fin && (
            <span className={estilos.chip}>
              {inicio ? formatoMinuto(inicio) : '0:00'} – {formatoMinuto(fin)}
            </span>
          )}
        </button>
      </div>
      {explicacion}
    </>
  );
}
