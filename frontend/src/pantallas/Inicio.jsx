import { useEffect } from 'react';
import { useEstado } from '../hooks/useEstado.jsx';

/**
 * Pestaña "Hoy": lleva al alumno al punto en el que se quedó.
 * Primera vez → bienvenida; sin curso → catálogo; sin test → test inicial; si no, la lección de hoy.
 */
export function destinoInicio(estado) {
  if (!estado.bienvenidaVista) return '/bienvenida';
  if (!estado.cursoId) return '/cursos';
  if (!estado.testHecho) return `/curso/${estado.cursoId}/test`;
  return `/curso/${estado.cursoId}/hoy`;
}

export function Inicio({ navegar }) {
  const { estado } = useEstado();
  const destino = destinoInicio(estado);

  useEffect(() => {
    navegar(destino, { reemplazar: true });
  }, [destino, navegar]);

  return null;
}
