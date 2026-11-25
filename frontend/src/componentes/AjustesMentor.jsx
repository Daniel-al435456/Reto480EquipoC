import { frasesMentor, PERSONALIDADES, TRATAMIENTOS } from '../api/mentor.js';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from '../pantallas/comun.module.css';
import { ElegirMentor } from './ElegirMentor.jsx';
import estilos from './AjustesMentor.module.css';

/** Cómo es el mentor: forma (pato, pata o solo texto), personalidad y cómo se dirige al alumno. Alta y perfil. */
export function AjustesMentor() {
  const { estado, cambiarPersonalidadMentor, cambiarTratamiento } = useEstado();
  const tratamiento = TRATAMIENTOS.find((t) => t.id === estado.tratamiento) ?? TRATAMIENTOS[2];

  return (
    <>
      <ElegirMentor />

      <fieldset className={comun.grupo}>
        <legend>Personalidad del mentor</legend>
        <div className={comun.opciones}>
          {PERSONALIDADES.map(({ id, nombre, descripcion }) => (
            <label key={id} className={comun.opcion}>
              <input
                type="radio"
                name="personalidad"
                checked={estado.personalidadMentor === id}
                onChange={() => cambiarPersonalidadMentor(id)}
              />
              <span className={estilos.texto}>
                <strong>{nombre}</strong>
                <span className={comun.secundario}>{descripcion}</span>
                <span className={estilos.ejemplo}>«{frasesMentor(id, estado.tratamiento).atasco}»</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={comun.grupo}>
        <legend>¿Cómo quieres que el mentor se dirija a ti?</legend>
        <div className={comun.segmentado}>
          {TRATAMIENTOS.map(({ id, nombre }) => (
            <label key={id} className={comun.segmento}>
              <input
                type="radio"
                name="tratamiento"
                checked={estado.tratamiento === id}
                onChange={() => cambiarTratamiento(id)}
              />
              {nombre}
            </label>
          ))}
        </div>
        <p className={comun.secundario}>
          Por ejemplo: «{tratamiento.ejemplo}». Solo cambia cómo te habla el mentor; no se usa para nada más.
        </p>
      </fieldset>
    </>
  );
}
