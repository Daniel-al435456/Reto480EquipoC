import { AjustesTutor } from '../componentes/AjustesTutor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';

/** Perfil → Tu tutor: forma, personalidad y cómo se dirige al alumno. */
export function PerfilTutor({ navegar }) {
  return (
    <Pantalla
      titulo="Tu tutor"
      subtitulo="Los cambios se aplican al momento."
      alVolver={() => navegar('/perfil')}
      textoVolver="Volver al perfil"
    >
      <AjustesTutor />
    </Pantalla>
  );
}
