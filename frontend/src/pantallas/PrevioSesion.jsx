import { nombreCorto } from '../api/cuenta.js';
import { useMemo, useState } from 'react';
import { obtenerCurso, planificarSesion } from '../api/cliente.js';
import { Boton } from '../componentes/Boton.jsx';
import { IconoAudio, IconoSinAudio } from '../componentes/Iconos.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './PrevioSesion.module.css';

const TIEMPOS = [
  { minutos: 5, texto: '5 min' },
  { minutos: 10, texto: '10 min' },
  { minutos: 20, texto: '20 min' },
];

const NOMBRE_PASO = {
  video: 'Vídeo',
  lectura: 'Lectura',
  resumen: 'Resumen rápido',
  actividades: 'Actividades',
};

/**
 * Previo de la lección de hoy: modos de estudio (idea original del equipo).
 * El alumno indica cuánto tiempo tiene y si puede escuchar audio, y la sesión se adapta.
 */
export function PrevioSesion({ cursoId, navegar }) {
  const curso = obtenerCurso(cursoId);
  const { estado, empezarSesion, registrarEvento } = useEstado();
  const [minutos, setMinutos] = useState(estado.modo.minutos);
  const [audio, setAudio] = useState(estado.modo.audio);

  const plan = useMemo(
    () => planificarSesion(cursoId, { minutos, audio }, estado.dominio, estado.completadas),
    [cursoId, minutos, audio, estado.dominio, estado.completadas],
  );

  if (!curso) return null;
  const tituloLeccion = (id) => curso.lecciones.find((l) => l.id === id)?.titulo;

  const empezar = () => {
    empezarSesion({ minutos, audio }, plan);
    registrarEvento('sesion_iniciada', { cursoId, minutos, audio, pasos: plan.pasos.length });
    navegar(`/curso/${cursoId}/sesion/0`);
  };

  if (plan.pasos.length === 0) {
    return (
      <Pantalla antetitulo={curso.titulo} titulo="¡Curso completado!">
        <p className={comun.correcto}>Has terminado todas las lecciones de este curso.</p>
        <Boton anchoCompleto onClick={() => navegar('/progreso')}>
          Ver mi progreso
        </Boton>
        <Boton anchoCompleto variante="secundario" onClick={() => navegar('/cursos')}>
          Empezar otro curso
        </Boton>
      </Pantalla>
    );
  }

  return (
    <Pantalla
      antetitulo={nombreCorto(estado) ? `Hola, ${nombreCorto(estado)}` : curso.titulo}
      titulo="¿Cómo quieres estudiar hoy?"
      pie={
        <Boton anchoCompleto onClick={empezar}>
          Empezar · {plan.minutos} min
        </Boton>
      }
    >
      <fieldset className={comun.grupo}>
        <legend>¿Cuánto tiempo tienes?</legend>
        <div className={comun.segmentado}>
          {TIEMPOS.map((t) => (
            <label key={t.minutos} className={comun.segmento}>
              <input type="radio" name="tiempo" checked={minutos === t.minutos} onChange={() => setMinutos(t.minutos)} />
              {t.texto}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={comun.grupo}>
        <legend>¿Puedes escuchar audio?</legend>
        <div className={comun.opcionesFila}>
          <label className={comun.tarjetaOpcion}>
            <input type="radio" name="audio" checked={audio} onChange={() => setAudio(true)} />
            <IconoAudio tamano={26} />
            <strong>Sí</strong>
            <span className={comun.secundario}>Con vídeos</span>
          </label>
          <label className={comun.tarjetaOpcion}>
            <input type="radio" name="audio" checked={!audio} onChange={() => setAudio(false)} />
            <IconoSinAudio tamano={26} />
            <strong>No</strong>
            <span className={comun.secundario}>Lecturas y actividades</span>
          </label>
        </div>
      </fieldset>

      <section className={comun.tarjeta} aria-labelledby="titulo-plan" aria-live="polite">
        <div className={estilos.cabeceraPlan}>
          <h2 id="titulo-plan">Tu sesión de hoy</h2>
          <span className={comun.etiqueta}>{plan.minutos} min</span>
        </div>
        {plan.expres && (
          <p className={comun.secundario}>
            No te da tiempo a una lección completa: te proponemos un resumen rápido y sus actividades.
          </p>
        )}
        <ol className={estilos.pasos}>
          {plan.pasos.map((paso, i) => (
            <li key={i} className={estilos.paso}>
              <span className={estilos.numero} aria-hidden="true">
                {i + 1}
              </span>
              <span className={estilos.textoPaso}>
                <strong>{NOMBRE_PASO[paso.tipo]}</strong>
                <span className={comun.secundario}>{tituloLeccion(paso.leccionId)}</span>
              </span>
              <span className={estilos.minutos}>{paso.minutos} min</span>
            </li>
          ))}
        </ol>
      </section>
    </Pantalla>
  );
}
