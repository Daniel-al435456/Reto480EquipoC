import { useEffect } from 'react';
import { destinoInicio } from '../api/acceso.js';
import { useEstado } from '../hooks/useEstado.jsx';

/** Pestaña "Hoy": lleva al alumno al punto en el que se quedó (reglas en api/acceso.js). */
export function Inicio({ navegar }) {
  const { estado } = useEstado();
  const destino = destinoInicio(estado);

  useEffect(() => {
    navegar(destino, { reemplazar: true });
  }, [destino, navegar]);

  return null;
}
