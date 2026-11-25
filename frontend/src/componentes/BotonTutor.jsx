import { coincide } from '../hooks/useRuta.js';
import { useEstado } from '../hooks/useEstado.jsx';
import { obtenerLeccion } from '../api/cliente.js';
import { IconoIA } from './Iconos.jsx';
import estilos from './BotonTutor.module.css';

/** Pantallas donde no se muestra: el propio tutor, el alta, el test inicial (para no condicionarlo) y los formularios del perfil. */
const OCULTO_EN = [
  '/tutor',
  '/bienvenida',
  '/registro',
  '/entrar',
  '/legal/:pagina',
  '/edad',
  '/consentimiento',
  '/alias',
  '/preferencias',
  '/curso/:cursoId/test',
  '/curso/:cursoId/test/:modo',
  // Formularios del perfil: el botón taparía los campos.
  '/perfil/cuenta',
  '/perfil/apariencia',
  '/perfil/tutor',
  '/perfil/seguridad',
  '/perfil/privacidad',
  '/ajustes',
];

/** Lección que el alumno tiene delante, para que el tutor sepa de qué se habla. */
function leccionActual(ruta, estado) {
  const enLeccion = coincide('/curso/:cursoId/leccion/:leccionId', ruta);
  if (enLeccion) return obtenerLeccion(enLeccion.cursoId, enLeccion.leccionId);
  const enSesion = coincide('/curso/:cursoId/sesion/:paso', ruta);
  if (enSesion && estado.sesion) {
    const paso = estado.sesion.pasos[Number(enSesion.paso)];
    if (paso) return obtenerLeccion(enSesion.cursoId, paso.leccionId);
  }
  return null;
}

/**
 * Acceso al tutor desde cualquier pantalla (historia H9), con el símbolo de IA.
 * Si el alumno está en una lección, el tutor se abre sabiendo de qué lección se habla.
 */
export function BotonTutor({ ruta, navegar }) {
  const { estado, ponerContextoTutor } = useEstado();
  if (OCULTO_EN.some((patron) => coincide(patron, ruta))) return null;

  const leccion = leccionActual(ruta, estado);
  const abrir = () => {
    ponerContextoTutor(leccion ? { leccionId: leccion.id, titulo: leccion.titulo } : null);
    navegar('/tutor');
  };

  return (
    <button
      type="button"
      className={estilos.boton}
      onClick={abrir}
      aria-label={leccion ? `Preguntar al tutor sobre ${leccion.titulo}` : 'Abrir el tutor'}
      title="Pregunta al tutor"
    >
      <IconoIA tamano={26} />
      {estado.tutorNoLeido && (
        <>
          <span className={estilos.punto} aria-hidden="true" />
          <span className="visualmente-oculto">(mensaje nuevo)</span>
        </>
      )}
    </button>
  );
}
