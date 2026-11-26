import { IconoInicio, IconoPerfil, IconoProgreso, IconoMentor } from './Iconos.jsx';
import estilos from './BarraInferior.module.css';

const SECCIONES = [
  { ruta: '/', texto: 'Hoy', Icono: IconoInicio },
  { ruta: '/progreso', texto: 'Progreso', Icono: IconoProgreso },
  { ruta: '/mentor', texto: 'Mentor', Icono: IconoMentor },
  { ruta: '/perfil', texto: 'Perfil', Icono: IconoPerfil },
];

const OTRAS = SECCIONES.slice(1).map((s) => s.ruta);

/**
 * Navegación principal: en el móvil, abajo para usarla con una mano;
 * en el escritorio, un menú lateral con el nombre de la academia.
 */
export function BarraInferior({ ruta, navegar, avisoMentor }) {
  // La ficha de una lección se abre desde Progreso, así que esa pestaña queda marcada.
  const enProgreso = ruta.startsWith('/progreso') || ruta.includes('/leccion/');
  const activa = (r) => {
    if (r === '/progreso') return enProgreso;
    if (r === '/') return !enProgreso && !OTRAS.some((o) => ruta.startsWith(o));
    return ruta.startsWith(r);
  };

  return (
    <nav className={estilos.barra} aria-label="Navegación principal">
      <span className={estilos.marca} aria-hidden="true">
        480<span className={estilos.coral}>&gt;</span>Academy
      </span>
      <ul className={estilos.lista}>
        {SECCIONES.map(({ ruta: destino, texto, Icono }) => (
          <li key={destino}>
            <a
              href={`#${destino}`}
              className={estilos.enlace}
              aria-current={activa(destino) ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                navegar(destino);
              }}
            >
              <span className={estilos.icono}>
                <Icono tamano={22} />
                {destino === '/mentor' && avisoMentor && <span className={estilos.punto} />}
              </span>
              <span>{texto}</span>
              {destino === '/mentor' && avisoMentor && <span className="visualmente-oculto">(mensaje nuevo)</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
