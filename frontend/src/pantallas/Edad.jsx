import { useState } from 'react';
import { Boton } from '../componentes/Boton.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import { PASOS_ALTA } from './Registro.jsx';

const TRAMOS = [
  { valor: 'adulto', texto: '18 años o más' },
  { valor: '14a17', texto: 'Entre 14 y 17 años' },
  { valor: 'menor14', texto: 'Menos de 14 años' },
];

/**
 * Alta, paso 2 de 4: tramo de edad (propuesta P3, "Menores de edad").
 * Solo se guarda el tramo, nunca la edad exacta. A la IA solo le llega si el alumno es menor o no,
 * para adaptar el tono. Con menos de 14 años hace falta el consentimiento de la familia.
 */
export function Edad({ navegar }) {
  const { estado, guardarEdad, registrarEvento } = useEstado();
  const [tramo, setTramo] = useState(estado.tramoEdad);

  const continuar = () => {
    guardarEdad(tramo);
    registrarEvento('tramo_edad_indicado', { menor: tramo !== 'adulto' });
    if (tramo === 'menor14' && !estado.consentimientoFamilia) navegar('/consentimiento');
    else navegar('/alias');
  };

  return (
    <Pantalla
      titulo="¿Cuántos años tienes?"
      subtitulo="Lo usamos para proteger tus datos y adaptar el tono del tutor. No guardamos tu edad exacta y, una vez creada la cuenta, solo la academia puede cambiarlo."
      progreso={{ valor: 2, maximo: PASOS_ALTA, etiqueta: `Paso 2 de ${PASOS_ALTA}` }}
      pie={
        <Boton anchoCompleto disabled={!tramo} onClick={continuar}>
          Continuar
        </Boton>
      }
    >
      <fieldset className={comun.grupo}>
        <legend className="visualmente-oculto">Tramo de edad</legend>
        <div className={comun.opciones}>
          {TRAMOS.map(({ valor, texto }) => (
            <label key={valor} className={comun.opcion}>
              <input type="radio" name="edad" checked={tramo === valor} onChange={() => setTramo(valor)} />
              <span>{texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </Pantalla>
  );
}
