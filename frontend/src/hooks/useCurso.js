import { useEffect, useState } from 'react';
import { obtenerCurso, obtenerCursoCompleto } from '../api/cliente.js';

export function useCurso(cursoId) {
  const [carga, setCarga] = useState({ cursoId: null, curso: null });

  useEffect(() => {
    let vigente = true;
    if (!cursoId) {
      setCarga({ cursoId: null, curso: null });
      return () => {
        vigente = false;
      };
    }
    obtenerCursoCompleto(cursoId).then((curso) => {
      if (vigente) setCarga({ cursoId, curso });
    });
    return () => {
      vigente = false;
    };
  }, [cursoId]);

  return carga.cursoId === cursoId ? carga.curso : obtenerCurso(cursoId);
}
