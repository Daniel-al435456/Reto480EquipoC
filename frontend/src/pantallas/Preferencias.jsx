import { Boton } from '../componentes/Boton.jsx';
import { AjustesTutor } from '../componentes/AjustesTutor.jsx';
import { Interruptor } from '../componentes/Interruptor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import { PASOS_ALTA } from './Registro.jsx';

const TEMAS = [
  ['auto', 'Automático'],
  ['claro', 'Claro'],
  ['oscuro', 'Oscuro'],
];
const TEXTOS = [
  ['normal', 'Normal'],
  ['grande', 'Grande'],
  ['muy-grande', 'Muy grande'],
];

/** Alta, paso 4 de 4: preferencias (tutor, tema y tamaño del texto). Se pueden cambiar después en el perfil. */
export function Preferencias({ navegar }) {
  const { estado, cambiarAjuste, cambiarTutorIA, completarAlta, registrarEvento } = useEstado();
  const { ajustes } = estado;

  const terminar = () => {
    completarAlta();
    registrarEvento('alta_completada', {
      tutor: ajustes.tutor,
      personalidad: estado.personalidadTutor,
      tutorIA: estado.tutorIA,
    });
    navegar('/');
  };

  return (
    <Pantalla
      titulo="Hazla a tu medida"
      subtitulo="Puedes cambiarlo cuando quieras en tu perfil."
      alVolver={() => navegar('/alias')}
      progreso={{ valor: 4, maximo: PASOS_ALTA, etiqueta: `Paso 4 de ${PASOS_ALTA}` }}
      pie={
        <Boton anchoCompleto onClick={terminar}>
          Empezar a aprender
        </Boton>
      }
    >
      <AjustesTutor />

      <fieldset className={comun.grupo}>
        <legend>Tema</legend>
        <div className={comun.segmentado}>
          {TEMAS.map(([valor, texto]) => (
            <label key={valor} className={comun.segmento}>
              <input type="radio" name="tema" checked={ajustes.tema === valor} onChange={() => cambiarAjuste('tema', valor)} />
              {texto}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={comun.grupo}>
        <legend>Tamaño del texto</legend>
        <div className={comun.segmentado}>
          {TEXTOS.map(([valor, texto]) => (
            <label key={valor} className={comun.segmento}>
              <input type="radio" name="texto" checked={ajustes.texto === valor} onChange={() => cambiarAjuste('texto', valor)} />
              {texto}
            </label>
          ))}
        </div>
      </fieldset>

      <Interruptor
        titulo="Tutor con IA"
        descripcion="Resuelve dudas con el contenido del curso y te avisa si te atascas. Solo recibe tu alias, nunca tu nombre."
        activo={estado.tutorIA}
        alCambiar={cambiarTutorIA}
      />
    </Pantalla>
  );
}
