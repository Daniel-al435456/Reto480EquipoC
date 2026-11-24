import { useEffect, useState } from 'react';
import { obtenerCursos } from '../api/cliente.js';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';

/** Pantalla 1 del boceto: selección de curso. */
export function SeleccionCurso({ navegar }) {
  const { estado, seleccionarCurso, registrarEvento } = useEstado();
  const [cursos, setCursos] = useState(null);

  useEffect(() => {
    obtenerCursos().then(setCursos);
  }, []);

  const abrir = (curso) => {
    const continua = estado.cursoId === curso.id && estado.testHecho;
    seleccionarCurso(curso.id);
    registrarEvento('curso_abierto', { cursoId: curso.id });
    navegar(continua ? `/curso/${curso.id}/hoy` : `/curso/${curso.id}/test`);
  };

  return (
    <Pantalla
      antetitulo={estado.alias ? `Hola, ${estado.alias}` : undefined}
      titulo="Elige un curso"
      subtitulo="Tu suscripción incluye todo el catálogo."
    >
      {!cursos ? (
        <p className={comun.cargando} role="status">
          Cargando cursos…
        </p>
      ) : (
        <ul className={comun.lista}>
          {cursos.map((curso) => {
            const actual = estado.cursoId === curso.id && estado.testHecho;
            const hechas = actual
              ? new Set([...Object.keys(estado.dominio), ...estado.completadas]).size
              : 0;
            return (
              <li key={curso.id}>
                <button type="button" className={comun.tarjetaBoton} onClick={() => abrir(curso)}>
                  {actual && <span className={comun.etiqueta}>Continuar · {hechas} de {curso.numeroLecciones}</span>}
                  <h2 style={{ fontSize: 'var(--texto-medio)' }}>{curso.titulo}</h2>
                  <p className={comun.medio}>{curso.descripcion}</p>
                  <p className={comun.secundario}>
                    {curso.numeroLecciones} lecciones · Nivel {curso.nivel.toLowerCase()}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Pantalla>
  );
}
