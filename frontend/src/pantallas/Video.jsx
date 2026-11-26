import { Boton } from '../componentes/Boton.jsx';
import { IconoMentor } from '../componentes/Iconos.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { ReproductorVideo } from '../componentes/ReproductorVideo.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';

const FORMATO = {
  video: 'Vídeo',
  lectura: 'Lectura · sin audio',
  resumen: 'Resumen rápido',
};

/**
 * Pantalla 3 del boceto: vídeo de la lección.
 * En el modo sin audio muestra la versión en texto; en la sesión exprés, el resumen.
 */
export function Video({ leccion, paso, numero, total, alSiguiente, alSalir, navegar }) {
  const { registrarEvento, ponerContextoMentor } = useEstado();

  const terminar = () => {
    registrarEvento('contenido_completado', { leccionId: leccion.id, formato: paso.tipo });
    alSiguiente();
  };

  return (
    <Pantalla
      titulo={leccion.titulo}
      alVolver={alSalir}
      textoVolver="Salir de la sesión"
      iconoVolver="cerrar"
      progreso={{ valor: numero, maximo: total, etiqueta: `Paso ${numero} de ${total} de la sesión` }}
      antesDelTitulo={
        <>
          {paso.tipo === 'video' && (
            <ReproductorVideo
              youtubeId={leccion.youtubeId}
              titulo={leccion.titulo}
              alReproducir={() => registrarEvento('video_iniciado', { leccionId: leccion.id })}
            />
          )}
          <div className={comun.etiquetas}>
            <span className={comun.etiqueta}>
              {FORMATO[paso.tipo]} · {paso.minutos} min
            </span>
            {paso.tipo === 'video' && <span className={comun.etiquetaNeutra}>Subtítulos</span>}
          </div>
        </>
      }
      pie={
        <>
          <a
            href="#/mentor"
            className={comun.enlaceAccion}
            onClick={(e) => {
              e.preventDefault();
              ponerContextoMentor({ leccionId: leccion.id, titulo: leccion.titulo });
              navegar('/mentor');
            }}
          >
            <IconoMentor tamano={18} /> ¿Dudas? Pregunta al mentor
          </a>
          <Boton anchoCompleto onClick={terminar}>
            Continuar con las actividades
          </Boton>
        </>
      }
    >
      {paso.tipo === 'video' && <p className={comun.medio}>{leccion.descripcion}</p>}

      {paso.tipo === 'lectura' && (
        <article className={`${comun.tarjeta} ${comun.medio}`}>
          {leccion.lectura.map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}
        </article>
      )}

      {paso.tipo === 'resumen' && (
        <article className={`${comun.tarjeta} ${comun.medio}`}>
          <p>{leccion.resumen}</p>
        </article>
      )}
    </Pantalla>
  );
}
