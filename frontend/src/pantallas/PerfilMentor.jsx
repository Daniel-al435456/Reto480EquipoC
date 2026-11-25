import { AjustesMentor } from '../componentes/AjustesMentor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';

/** Perfil → Tu mentor: forma, personalidad y cómo se dirige al alumno. */
export function PerfilMentor({ navegar }) {
  return (
    <Pantalla
      titulo="Tu mentor"
      subtitulo="Los cambios se aplican al momento."
      alVolver={() => navegar('/perfil')}
      textoVolver="Volver al perfil"
    >
      <AjustesMentor />
    </Pantalla>
  );
}
