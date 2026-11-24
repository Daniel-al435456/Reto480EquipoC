import estilos from './BarraProgreso.module.css';

/** A partir de este número de pasos la barra se dibuja continua en lugar de por segmentos. */
const MAXIMO_SEGMENTOS = 12;

/**
 * Barra de progreso accesible: el lector de pantalla anuncia el valor y la etiqueta.
 * Con pocos pasos se muestra por segmentos, uno por paso, como en los prototipos.
 */
export function BarraProgreso({ valor, maximo, etiqueta, className = '' }) {
  const porcentaje = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  const segmentada = maximo > 0 && maximo <= MAXIMO_SEGMENTOS;

  return (
    <div
      className={`${segmentada ? estilos.segmentos : estilos.barra} ${className}`}
      style={segmentada ? { gridTemplateColumns: `repeat(${maximo}, minmax(0, 1fr))` } : undefined}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor}
      aria-label={etiqueta}
    >
      {segmentada ? (
        Array.from({ length: maximo }, (_, i) => (
          <span key={i} className={i < valor ? estilos.hecho : estilos.segmento} />
        ))
      ) : (
        <div className={estilos.relleno} style={{ width: `${porcentaje}%` }} />
      )}
    </div>
  );
}
