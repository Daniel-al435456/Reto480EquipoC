import { Boton } from '../componentes/Boton.jsx';
import { IconoReloj, IconoReproducir } from '../componentes/Iconos.jsx';
import { useTituloPantalla } from '../hooks/useTituloPantalla.js';
import estilos from './Bienvenida.module.css';

/**
 * Bienvenida para quien abre la app por primera vez.
 * Pantalla de los prototipos pendiente de votación del equipo (propuesta P6).
 */
export function Bienvenida({ navegar }) {
  const encabezado = useTituloPantalla('Bienvenida');

  return (
    <div className={estilos.bienvenida}>
      <div className={estilos.marca}>
        <span className={estilos.logo} aria-hidden="true">
          480
        </span>
        <span className={estilos.nombre}>
          480<span className={estilos.coral}>&gt;</span>Academy
        </span>
      </div>

      <div className={estilos.ilustracion} aria-hidden="true">
        <span className={estilos.circuloGrande} />
        <span className={estilos.circuloMedio} />
        <span className={estilos.circuloAcento} />
        <span className={estilos.baldosa}>
          <IconoReproducir tamano={28} />
        </span>
        <span className={estilos.pildora}>
          <IconoReloj tamano={16} /> 10 min
        </span>
      </div>

      <div className={estilos.texto}>
        <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
          Aprende a tu ritmo.
          <br />
          En <span className={estilos.resalte}>tu momento</span>.
        </h1>
        <p className={estilos.descripcion}>
          Lo que ya sabes no se repite y cada sesión se adapta al tiempo que tienes.
        </p>
      </div>

      <Boton anchoCompleto onClick={() => navegar('/alias')}>
        Empezar
      </Boton>
    </div>
  );
}
