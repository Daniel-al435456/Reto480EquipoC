import { IconoInicio, IconoPerfil, IconoProgreso, IconoTutor } from './Iconos.jsx';
import estilos from './BarraInferior.module.css';

const SECCIONES = [
  { ruta: '/', texto: 'Hoy', Icono: IconoInicio },
  { ruta: '/progreso', texto: 'Progreso', Icono: IconoProgreso },
  { ruta: '/tutor', texto: 'Tutor', Icono: IconoTutor },
  { ruta: '/perfil', texto: 'Perfil', Icono: IconoPerfil },
];

const OTRAS = SECCIONES.slice(1).map((s) => s.ruta);

/** Navegación principal, en la parte inferior para usarla con una mano. */
export function BarraInferior({ ruta, navegar, avisoTutor }) {
  // La ficha de una lección se abre desde Progreso, así que esa pestaña queda marcada.
  const enProgreso = ruta.startsWith('/progreso') || ruta.includes('/leccion/');
  const activa = (r) => {
    if (r === '/progreso') return enProgreso;
    if (r === '/') return !enProgreso && !OTRAS.some((o) => ruta.startsWith(o));
    return ruta.startsWith(r);
  };

  return (
    <nav className={estilos.barra} aria-label="Navegación principal">
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
                {destino === '/tutor' && avisoTutor && <span className={estilos.punto} />}
              </span>
              <span>{texto}</span>
              {destino === '/tutor' && avisoTutor && <span className="visualmente-oculto">(mensaje nuevo)</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
