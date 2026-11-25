import { Boton } from '../componentes/Boton.jsx';
import { ElegirTutor } from '../componentes/ElegirTutor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { AJUSTES_INICIALES, useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Ajustes.module.css';

const GRUPOS = [
  {
    clave: 'texto',
    titulo: 'Tamaño del texto',
    opciones: [
      { valor: 'normal', texto: 'Normal' },
      { valor: 'grande', texto: 'Grande' },
      { valor: 'muy-grande', texto: 'Muy grande' },
    ],
  },
  {
    clave: 'tema',
    titulo: 'Tema',
    ayuda: 'Automático sigue el modo claro u oscuro de tu dispositivo.',
    opciones: [
      { valor: 'auto', texto: 'Automático' },
      { valor: 'claro', texto: 'Claro' },
      { valor: 'oscuro', texto: 'Oscuro' },
    ],
  },
  {
    clave: 'contraste',
    titulo: 'Contraste',
    ayuda: 'El contraste alto oscurece los textos secundarios y marca más los bordes.',
    opciones: [
      { valor: 'normal', texto: 'Normal' },
      { valor: 'alto', texto: 'Alto' },
    ],
  },
  {
    clave: 'movimiento',
    titulo: 'Animaciones',
    ayuda: 'Automático sigue la opción "reducir movimiento" de tu dispositivo.',
    opciones: [
      { valor: 'auto', texto: 'Automático' },
      { valor: 'reducido', texto: 'Reducidas' },
    ],
  },
];

/** Apariencia: tutor (pato, pata o solo texto) y ajustes de visualización. Se guardan en el dispositivo. */
export function Ajustes({ navegar }) {
  const { estado, cambiarAjuste } = useEstado();
  const { ajustes } = estado;
  const cambiados = ['texto', 'tema', 'contraste', 'movimiento'].some((c) => ajustes[c] !== AJUSTES_INICIALES[c]);

  return (
    <Pantalla
      titulo="Apariencia"
      subtitulo="Los cambios se aplican al momento y se guardan en este dispositivo."
      alVolver={() => navegar('/perfil')}
      textoVolver="Volver al perfil"
    >
      <ElegirTutor />

      {GRUPOS.map(({ clave, titulo, ayuda, opciones }) => (
        <fieldset key={clave} className={comun.grupo}>
          <legend>{titulo}</legend>
          <div className={comun.segmentado}>
            {opciones.map(({ valor, texto }) => (
              <label key={valor} className={comun.segmento}>
                <input
                  type="radio"
                  name={clave}
                  checked={ajustes[clave] === valor}
                  onChange={() => cambiarAjuste(clave, valor)}
                />
                {texto}
              </label>
            ))}
          </div>
          {ayuda && <p className={comun.secundario}>{ayuda}</p>}
        </fieldset>
      ))}

      <section className={`${comun.tarjeta} ${estilos.muestra}`} aria-labelledby="titulo-muestra">
        <span className={comun.etiqueta}>Vista previa</span>
        <h2 id="titulo-muestra">Variables y tipos de datos</h2>
        <p className={comun.medio}>
          Una variable guarda un valor con un nombre. Por ejemplo, <code className={comun.codigoTinta}>edad = 18</code>.
        </p>
        <p className={comun.secundario}>Texto secundario de ejemplo.</p>
      </section>

      {cambiados && (
        <Boton variante="texto" onClick={() => GRUPOS.forEach(({ clave }) => cambiarAjuste(clave, AJUSTES_INICIALES[clave]))}>
          Restablecer los valores por defecto
        </Boton>
      )}
    </Pantalla>
  );
}
