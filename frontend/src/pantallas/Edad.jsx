import { useState } from 'react';
import { calcularEdad, errorFechaNacimiento, tramoEdad } from '../api/edad.js';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import { PASOS_ALTA } from './Registro.jsx';

const hoyISO = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

/**
 * Alta, paso 2 de 4: fecha de nacimiento (propuesta P3, "Menores de edad").
 * Con la fecha, el tramo de edad se actualiza solo al cumplir 14 o 18 años. A la IA solo le llega si el alumno
 * es menor o no, para adaptar el tono. Con menos de 14 años hace falta el consentimiento de la familia.
 */
export function Edad({ navegar }) {
  const { estado, guardarFechaNacimiento, registrarEvento } = useEstado();
  const [fecha, setFecha] = useState(estado.fechaNacimiento ?? '');
  const [error, setError] = useState('');
  const edad = errorFechaNacimiento(fecha) ? null : calcularEdad(fecha);

  const continuar = (evento) => {
    evento?.preventDefault();
    const problema = errorFechaNacimiento(fecha);
    setError(problema);
    if (problema) return;
    guardarFechaNacimiento(fecha);
    const tramo = tramoEdad(fecha);
    registrarEvento('fecha_nacimiento_indicada', { menor: tramo !== 'adulto' });
    navegar(tramo === 'menor14' && !estado.consentimientoFamilia ? '/consentimiento' : '/alias');
  };

  return (
    <Pantalla
      titulo="¿Cuándo naciste?"
      subtitulo="Lo usamos para proteger tus datos si eres menor y adaptar el tono del tutor. A la IA nunca le llega tu edad, solo si eres menor o no."
      progreso={{ valor: 2, maximo: PASOS_ALTA, etiqueta: `Paso 2 de ${PASOS_ALTA}` }}
      pie={
        <Boton anchoCompleto onClick={continuar}>
          Continuar
        </Boton>
      }
    >
      <form onSubmit={continuar} noValidate>
        <Campo
          etiqueta="Fecha de nacimiento"
          tipo="date"
          valor={fecha}
          alCambiar={(valor) => {
            setFecha(valor);
            setError('');
          }}
          error={error}
          ayuda={
            edad !== null
              ? `Tienes ${edad} años. Después solo podrá corregirla la academia.`
              : 'Después solo podrá corregirla la academia.'
          }
          max={hoyISO()}
          min="1900-01-01"
          autoComplete="bday"
        />
      </form>
    </Pantalla>
  );
}
