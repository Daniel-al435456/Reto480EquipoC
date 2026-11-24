import estilos from './Interruptor.module.css';

/** Interruptor accesible: el lector de pantalla anuncia "activado" o "desactivado". */
export function Interruptor({ titulo, descripcion, activo, alCambiar }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      className={estilos.interruptor}
      onClick={() => alCambiar(!activo)}
    >
      <span className={estilos.texto}>
        <strong>{titulo}</strong>
        {descripcion && <span className={estilos.descripcion}>{descripcion}</span>}
      </span>
      <span className={estilos.pista} aria-hidden="true" />
    </button>
  );
}
