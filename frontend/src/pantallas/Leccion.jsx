import { useState } from 'react';
import { obtenerCurso } from '../api/cliente.js';
import { DURACION_ACTIVIDADES } from '../api/datos.js';
import { leccionesPendientes, planificarLeccion } from '../api/planificador.js';
import { Boton } from '../componentes/Boton.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';

/**
 * Ficha de una lección: el alumno puede estudiarla o repasarla cuando quiera,
 * aunque el test diga que ya la domina o aunque ya la haya completado.
 */
export function Leccion({ cursoId, leccionId, navegar }) {
  const curso = obtenerCurso(cursoId);
  const leccion = curso?.lecciones.find((l) => l.id === leccionId);
  const { estado, empezarSesion, estudiarIgualmente, registrarEvento } = useEstado();
  const [audio, setAudio] = useState(estado.modo.audio);

  if (!curso || !leccion) return null;

  const completada = estado.completadas.includes(leccion.id);
  const dominada = Boolean(estado.dominio[leccion.id]);
  const elegidaPorElAlumno = !dominada && estado.dominioTest?.[leccion.id];
  const siguiente = leccionesPendientes(curso, estado.dominio, estado.completadas)[0];

  let etiqueta = 'Pendiente';
  let clase = comun.etiquetaNeutra;
  if (completada) [etiqueta, clase] = ['Completada', comun.etiquetaExito];
  else if (dominada) [etiqueta, clase] = ['Ya la dominabas', comun.etiquetaExito];
  else if (leccion.id === siguiente?.id) [etiqueta, clase] = ['Siguiente', comun.etiquetaAcento];

  const contenido = audio ? leccion.duracionVideo : leccion.duracionLectura;
  const repaso = completada || dominada;

  const empezar = (soloActividades) => {
    const plan = planificarLeccion(leccion, { audio, soloActividades });
    empezarSesion({ ...estado.modo, audio }, plan);
    registrarEvento('leccion_elegida', { cursoId, leccionId, soloActividades, repaso });
    navegar(`/curso/${cursoId}/sesion/0`);
  };

  return (
    <Pantalla
      antetitulo={curso.titulo}
      titulo={leccion.titulo}
      alVolver={() => navegar('/progreso')}
      textoVolver="Volver al recorrido"
      pie={
        <>
          <Boton anchoCompleto onClick={() => empezar(false)}>
            {repaso ? 'Repasar la lección' : 'Estudiar la lección'} · {contenido + DURACION_ACTIVIDADES} min
          </Boton>
          <Boton anchoCompleto variante="secundario" onClick={() => empezar(true)}>
            Solo las actividades · {DURACION_ACTIVIDADES} min
          </Boton>
        </>
      }
    >
      <span className={clase}>{etiqueta}</span>
      <p className={comun.medio}>{leccion.descripcion}</p>

      <fieldset className={comun.grupo}>
        <legend>¿Puedes escuchar audio?</legend>
        <div className={comun.segmentado}>
          <label className={comun.segmento}>
            <input type="radio" name="audio" checked={audio} onChange={() => setAudio(true)} />
            Sí, con vídeo
          </label>
          <label className={comun.segmento}>
            <input type="radio" name="audio" checked={!audio} onChange={() => setAudio(false)} />
            No, con lectura
          </label>
        </div>
      </fieldset>

      {dominada && !completada && (
        <div className={comun.tarjeta}>
          <p>El test indica que ya dominas este tema, así que no aparece en tus sesiones.</p>
          <Boton variante="texto" onClick={() => estudiarIgualmente(leccion.id, true)}>
            Incluirla en mis sesiones
          </Boton>
        </div>
      )}

      {elegidaPorElAlumno && !completada && (
        <div className={comun.tarjeta}>
          <p>Has elegido estudiar este tema aunque el test indicaba que ya lo dominas.</p>
          <Boton variante="texto" onClick={() => estudiarIgualmente(leccion.id, false)}>
            Volver a saltármela
          </Boton>
        </div>
      )}
    </Pantalla>
  );
}
