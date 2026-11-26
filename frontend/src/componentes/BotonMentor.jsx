import { coincide } from '../hooks/useRuta.js';
import { useEstado } from '../hooks/useEstado.jsx';
import { useCurso } from '../hooks/useCurso.js';
import { IconoIA } from './Iconos.jsx';
import estilos from './BotonMentor.module.css';

/** Pantallas donde no se muestra: el propio mentor, el alta, el test inicial (para no condicionarlo) y los formularios del perfil. */
const OCULTO_EN = [
  '/mentor',
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
  '/perfil/mentor',
  '/perfil/seguridad',
  '/perfil/privacidad',
  '/ajustes',
];

/** Lección que el alumno tiene delante, para que el mentor sepa de qué se habla. */
function cursoActual(ruta) {
  return (
    coincide('/curso/:cursoId/leccion/:leccionId', ruta)?.cursoId ??
    coincide('/curso/:cursoId/sesion/:paso', ruta)?.cursoId
  );
}

function leccionActual(ruta, estado, curso) {
  const enLeccion = coincide('/curso/:cursoId/leccion/:leccionId', ruta);
  if (enLeccion) return curso?.lecciones.find((leccion) => leccion.id === enLeccion.leccionId) ?? null;
  const enSesion = coincide('/curso/:cursoId/sesion/:paso', ruta);
  if (enSesion && estado.sesion) {
    const paso = estado.sesion.pasos[Number(enSesion.paso)];
    if (paso) return curso?.lecciones.find((leccion) => leccion.id === paso.leccionId) ?? null;
  }
  return null;
}

/**
 * Acceso al mentor desde cualquier pantalla (historia H9), con el símbolo de IA.
 * Si el alumno está en una lección, el mentor se abre sabiendo de qué lección se habla.
 */
export function BotonMentor({ ruta, navegar }) {
  const { estado, ponerContextoMentor } = useEstado();
  const curso = useCurso(cursoActual(ruta));
  if (OCULTO_EN.some((patron) => coincide(patron, ruta))) return null;

  const leccion = leccionActual(ruta, estado, curso);
  const abrir = () => {
    ponerContextoMentor(leccion ? { leccionId: leccion.id, titulo: leccion.titulo } : null);
    navegar('/mentor');
  };

  return (
    <button
      type="button"
      className={estilos.boton}
      onClick={abrir}
      aria-label={leccion ? `Preguntar al mentor sobre ${leccion.titulo}` : 'Abrir el mentor'}
      title="Pregunta al mentor"
    >
      <IconoIA tamano={26} />
      {estado.mentorNoLeido && (
        <>
          <span className={estilos.punto} aria-hidden="true" />
          <span className="visualmente-oculto">(mensaje nuevo)</span>
        </>
      )}
    </button>
  );
}
