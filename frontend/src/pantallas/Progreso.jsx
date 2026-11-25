import { obtenerCurso } from '../api/cliente.js';
import { leccionesPendientes } from '../api/planificador.js';
import { Boton } from '../componentes/Boton.jsx';
import { IconoCheck, IconoMeta, IconoReproducir, IconoSaltar } from '../componentes/Iconos.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import estilos from './Progreso.module.css';

const ESTADOS = {
  completada: { texto: 'Completada', Icono: IconoCheck },
  dominada: { texto: 'Ya la dominabas', Icono: IconoSaltar },
  siguiente: { texto: 'Siguiente', Icono: IconoReproducir },
  pendiente: { texto: 'Pendiente', Icono: null },
};

/**
 * Alto de cada etapa del recorrido (en rem, para que crezca con el tamaño de letra elegido)
 * y su equivalente en las unidades del dibujo del camino. Posición horizontal (en %) de los nodos.
 */
const ALTO_ETAPA_REM = 5;
const ALTO_ETAPA = 76;
const LADO = 24;

/** Camino en zigzag que une los nodos, en coordenadas de 0 a 100 en horizontal. */
function caminoZigzag(etapas) {
  const puntos = Array.from({ length: etapas }, (_, i) => ({
    x: i % 2 === 0 ? LADO : 100 - LADO,
    y: i * ALTO_ETAPA + 37,
  }));
  return puntos
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const anterior = puntos[i - 1];
      const curva = ALTO_ETAPA * 0.6;
      return `C ${anterior.x} ${anterior.y + curva}, ${p.x} ${p.y - curva}, ${p.x} ${p.y}`;
    })
    .join(' ');
}

/** Pantalla 6 del boceto: recorrido del curso hasta la meta. */
export function Progreso({ navegar }) {
  const { estado } = useEstado();
  const curso = estado.cursoId ? obtenerCurso(estado.cursoId) : null;

  if (!curso || !estado.testHecho) {
    return (
      <Pantalla titulo="Tu recorrido">
        <p>Todavía no has empezado ningún curso.</p>
        <Boton anchoCompleto onClick={() => navegar('/cursos')}>
          Elegir un curso
        </Boton>
      </Pantalla>
    );
  }

  const pendientes = leccionesPendientes(curso, estado.dominio, estado.completadas);
  const siguiente = pendientes[0];
  const hechas = curso.lecciones.length - pendientes.length;
  const respuestas = estado.eventos.filter((e) => e.tipo === 'actividad_respondida');
  const aciertos = respuestas.filter((e) => e.correcta).length;

  const estadoDe = (leccion) => {
    if (estado.completadas.includes(leccion.id)) return 'completada';
    if (estado.dominio[leccion.id]) return 'dominada';
    if (leccion.id === siguiente?.id) return 'siguiente';
    return 'pendiente';
  };

  const etapas = [
    ...curso.lecciones.map((leccion) => ({ id: leccion.id, titulo: leccion.titulo, clave: estadoDe(leccion) })),
    {
      id: 'meta',
      titulo: 'Meta',
      clave: 'meta',
      texto: pendientes.length === 0 ? '¡Curso completado!' : 'Curso completado',
    },
  ];

  return (
    <Pantalla
      antetitulo={curso.titulo}
      titulo="Tu recorrido"
      pie={
        siguiente && (
          <Boton anchoCompleto onClick={() => navegar(`/curso/${curso.id}/hoy`)}>
            Continuar con {siguiente.titulo}
          </Boton>
        )
      }
    >
      <div className={estilos.cifras}>
        <p className={estilos.cifra}>
          <strong>
            {hechas}
            <span> / {curso.lecciones.length}</span>
          </strong>
          <span>lecciones superadas</span>
        </p>
        <p className={estilos.cifra}>
          <strong>{respuestas.length > 0 ? `${Math.round((aciertos / respuestas.length) * 100)} %` : '–'}</strong>
          <span>aciertos en actividades</span>
        </p>
      </div>

      <p className={estilos.ayuda}>Toca cualquier lección para estudiarla o repasarla cuando quieras.</p>

      <ol
        className={estilos.recorrido}
        aria-label="Recorrido del curso"
        style={{ height: `${etapas.length * ALTO_ETAPA_REM}rem` }}
      >
        <svg
          className={estilos.camino}
          viewBox={`0 0 100 ${etapas.length * ALTO_ETAPA}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={caminoZigzag(etapas.length)} />
        </svg>
        {etapas.map((etapa, i) => {
          const { texto, Icono } = etapa.clave === 'meta' ? { texto: etapa.texto, Icono: IconoMeta } : ESTADOS[etapa.clave];
          const derecha = i % 2 === 1;
          return (
            <li
              key={etapa.id}
              className={`${estilos.etapa} ${estilos[etapa.clave]} ${derecha ? estilos.derecha : ''}`}
              style={{ top: `${i * ALTO_ETAPA_REM}rem` }}
            >
              {etapa.clave === 'meta' ? (
                <span className={estilos.contenidoEtapa}>
                  <span className={estilos.nodo} aria-hidden="true">
                    <Icono tamano={22} />
                  </span>
                  <span className={estilos.texto}>
                    <strong>{etapa.titulo}</strong>
                    <span>{texto}</span>
                  </span>
                </span>
              ) : (
                <a
                  href={`#/curso/${curso.id}/leccion/${etapa.id}`}
                  className={estilos.contenidoEtapa}
                  onClick={(e) => {
                    e.preventDefault();
                    navegar(`/curso/${curso.id}/leccion/${etapa.id}`);
                  }}
                >
                  <span className={estilos.nodo} aria-hidden="true">
                    {Icono && <Icono tamano={etapa.clave === 'siguiente' ? 24 : 22} />}
                  </span>
                  <span className={estilos.texto}>
                    <strong>{etapa.titulo}</strong>
                    <span>{texto}</span>
                  </span>
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <Boton variante="texto" onClick={() => navegar(`/curso/${curso.id}/test/repetir`)}>
        Repetir el test inicial
      </Boton>
    </Pantalla>
  );
}
