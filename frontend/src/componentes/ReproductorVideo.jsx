import { useState } from 'react';
import { IconoReproducir } from './Iconos.jsx';
import estilos from './ReproductorVideo.module.css';

/**
 * Reproductor de YouTube que no se carga hasta que el alumno pulsa "reproducir".
 * Ahorra varios cientos de KB en 4G y evita cookies de seguimiento antes de que el alumno
 * decida ver el vídeo (dominio youtube-nocookie.com).
 */
export function ReproductorVideo({ youtubeId, titulo, alReproducir }) {
  const [activo, setActivo] = useState(false);

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
    return (
      <div className={estilos.marco}>
        <iframe
          className={estilos.iframe}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&cc_load_policy=1&hl=es`}
          title={`Vídeo: ${titulo}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
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
      </button>
    </div>
  );
}
