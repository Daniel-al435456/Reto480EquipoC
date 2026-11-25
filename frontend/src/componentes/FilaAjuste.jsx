import { IconoFlecha } from './Iconos.jsx';
import estilos from '../pantallas/Perfil.module.css';

/** Fila de una lista de ajustes que lleva a otra pantalla. */
export function FilaAjuste({ texto, valor, alPulsar, peligro }) {
  return (
    <button type="button" className={peligro ? estilos.ajustePeligro : estilos.ajuste} onClick={alPulsar}>
      <span>{texto}</span>
      <span className={estilos.valorFila}>
        {valor && <span className={estilos.valor}>{valor}</span>}
        {!peligro && <IconoFlecha tamano={18} />}
      </span>
    </button>
  );
}
