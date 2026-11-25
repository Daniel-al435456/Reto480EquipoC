import { Boton } from '../componentes/Boton.jsx';
import { Orbita } from '../componentes/Orbita.jsx';
import { PieLegal } from '../componentes/PieLegal.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import { useTituloPantalla } from '../hooks/useTituloPantalla.js';
import estilos from './Bienvenida.module.css';

/** Pantalla de inicio: presentación, crear cuenta o iniciar sesión, y enlaces legales. */
export function Bienvenida({ navegar }) {
  const encabezado = useTituloPantalla('Bienvenida');
  const { estado } = useEstado();
  const tieneCuenta = Boolean(estado.cuenta);

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

      <Orbita />

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

      <div className={estilos.acciones}>
        <Boton anchoCompleto onClick={() => navegar(tieneCuenta ? '/entrar' : '/registro')}>
          {tieneCuenta ? 'Iniciar sesión' : 'Crear cuenta'}
        </Boton>
        <Boton anchoCompleto variante="secundario" onClick={() => navegar(tieneCuenta ? '/registro' : '/entrar')}>
          {tieneCuenta ? 'Crear otra cuenta' : 'Ya tengo cuenta'}
        </Boton>
      </div>

      <PieLegal navegar={navegar} />
    </div>
  );
}
