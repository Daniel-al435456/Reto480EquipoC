import { useEstado } from '../hooks/useEstado.jsx';
import comun from '../pantallas/comun.module.css';
import { Pato } from './Pato.jsx';
import estilos from './ElegirMentor.module.css';

const OPCIONES = [
  { valor: 'pato', texto: 'Pato' },
  { valor: 'pata', texto: 'Pata' },
  { valor: 'ninguno', texto: 'Solo texto' },
];

/** Elección de cómo aparece el mentor: pato, pata o solo texto. Se usa en el alta y en Perfil → Tu mentor. */
export function ElegirMentor() {
  const { estado, cambiarAjuste } = useEstado();
  return (
    <fieldset className={comun.grupo}>
      <legend>¿Cómo quieres ver a tu mentor?</legend>
      <div className={estilos.opciones}>
        {OPCIONES.map(({ valor, texto }) => (
          <label key={valor} className={`${comun.tarjetaOpcion} ${estilos.opcion}`}>
            <input
              type="radio"
              name="mentor"
              checked={estado.ajustes.mentor === valor}
              onChange={() => cambiarAjuste('mentor', valor)}
            />
            {valor === 'ninguno' ? (
              <span className={estilos.sinPato} aria-hidden="true">
                Aa
              </span>
            ) : (
              <Pato variante={valor} tamano={64} vivo={estado.ajustes.mentor === valor} />
            )}
            <strong>{texto}</strong>
          </label>
        ))}
      </div>
      <p className={comun.secundario}>El pato es un guiño a la técnica del "pato de goma": explicar tu duda en voz alta ayuda a resolverla.</p>
    </fieldset>
  );
}
