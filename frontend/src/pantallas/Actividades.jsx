import { useRef, useState } from 'react';
import { corregirRespuestaEscrita, mensajeProactivoTutor } from '../api/cliente.js';
import { Boton } from '../componentes/Boton.jsx';
import { IconoTutor } from '../componentes/Iconos.jsx';
import { Pato } from '../componentes/Pato.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { contextoIA } from '../api/tutor.js';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Actividades.module.css';

/** Fallos en una lección a partir de los cuales el tutor interviene sin que se lo pidan. */
const FALLOS_PARA_AYUDA = 2;

/**
 * Pantalla 4 del boceto: actividades de verdadero/falso y de respuesta escrita.
 * Seguimiento continuo: cada respuesta se registra como evento de aprendizaje.
 */
export function Actividades({ leccion, paso, numero, total, cuentaComoLeccion, alSiguiente, alSalir, navegar }) {
  const { estado, registrarEvento, anadirMensaje, completarLeccion, ponerContextoTutor } = useEstado();
  const [indice, setIndice] = useState(0);
  const [respuesta, setRespuesta] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [comprobando, setComprobando] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const [pistaTutor, setPistaTutor] = useState(null);
  const fallos = useRef(0);

  const actividades = leccion.actividades;
  const terminado = indice >= actividades.length;
  const actividad = actividades[indice];

  const comprobar = async () => {
    setComprobando(true);
    let correcta;
    let solucion;
    if (actividad.tipo === 'vf') {
      correcta = respuesta === actividad.correcta;
    } else {
      ({ correcta, solucion } = await corregirRespuestaEscrita(actividad, respuesta ?? ''));
    }
    setComprobando(false);
    setResultado({ correcta, solucion });
    registrarEvento('actividad_respondida', { leccionId: leccion.id, actividadId: actividad.id, correcta });

    if (correcta) {
      setAciertos((a) => a + 1);
    } else {
      fallos.current += 1;
      if (fallos.current === FALLOS_PARA_AYUDA && estado.tutorIA) {
        const texto = await mensajeProactivoTutor(leccion, { cursoId: estado.cursoId, ...contextoIA(estado) });
        anadirMensaje({ autor: 'tutor', texto, proactivo: true });
        registrarEvento('tutor_proactivo', { leccionId: leccion.id, senal: 'fallos_repetidos' });
        setPistaTutor(texto);
      }
    }
  };

  const siguienteActividad = () => {
    const nuevoIndice = indice + 1;
    setIndice(nuevoIndice);
    setRespuesta(null);
    setResultado(null);
    if (nuevoIndice >= actividades.length && cuentaComoLeccion && aciertos >= actividades.length - 1) {
      completarLeccion(leccion.id);
      registrarEvento('leccion_completada', { leccionId: leccion.id });
    }
  };

  const progreso = { valor: numero, maximo: total, etiqueta: `Paso ${numero} de ${total} de la sesión` };

  if (terminado) {
    const superada = aciertos >= actividades.length - 1;
    return (
      <Pantalla
        antetitulo={leccion.titulo}
        titulo="Actividades terminadas"
        progreso={progreso}
        pie={
          <Boton anchoCompleto onClick={alSiguiente}>
            Continuar
          </Boton>
        }
      >
        <div className={superada ? comun.correcto : comun.aviso} role="status">
          <strong>
            Has acertado {aciertos} de {actividades.length}.
          </strong>
          <span>
            {superada
              ? cuentaComoLeccion
                ? 'Lección superada. ¡Buen trabajo!'
                : 'Buen repaso. Cuando tengas más tiempo, completa la lección entera.'
              : 'Te recomendamos repasar esta lección: volverá a aparecer en tu próxima sesión.'}
          </span>
        </div>
      </Pantalla>
    );
  }

  const puedeComprobar = actividad.tipo === 'vf' ? respuesta !== null : (respuesta ?? '').trim().length > 0;

  return (
    <Pantalla
      antetitulo={`Actividad ${indice + 1} de ${actividades.length} · ${leccion.titulo}`}
      titulo={actividad.tipo === 'vf' ? '¿Verdadero o falso?' : 'Escribe tu respuesta'}
      alVolver={alSalir}
      textoVolver="Salir de la sesión"
      iconoVolver="cerrar"
      progreso={progreso}
      pie={
        resultado ? (
          <Boton anchoCompleto onClick={siguienteActividad}>
            {indice === actividades.length - 1 ? 'Terminar' : 'Siguiente actividad'}
          </Boton>
        ) : (
          <Boton anchoCompleto disabled={!puedeComprobar || comprobando} onClick={comprobar}>
            {comprobando ? 'Comprobando…' : 'Comprobar'}
          </Boton>
        )
      }
    >
      {actividad.tipo === 'vf' ? (
        <fieldset className={comun.grupo} key={actividad.id} disabled={Boolean(resultado)}>
          <legend className="visualmente-oculto">¿Verdadero o falso?</legend>
          <p className={estilos.enunciado}>{actividad.enunciado}</p>
          <div className={estilos.dosColumnas}>
            {[
              { valor: true, texto: 'Verdadero' },
              { valor: false, texto: 'Falso' },
            ].map(({ valor, texto }) => (
              <label key={texto} className={comun.botonOpcion}>
                <input
                  type="radio"
                  name={actividad.id}
                  checked={respuesta === valor}
                  onChange={() => setRespuesta(valor)}
                />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className={comun.grupo} key={actividad.id}>
          <label htmlFor={`respuesta-${actividad.id}`} className={estilos.enunciado}>
            {actividad.enunciado}
          </label>
          <input
            id={`respuesta-${actividad.id}`}
            className={comun.campoCodigo}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={respuesta ?? ''}
            readOnly={Boolean(resultado)}
            onChange={(e) => setRespuesta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && puedeComprobar && !resultado) comprobar();
            }}
          />
        </div>
      )}

      <div role="status" aria-live="polite" className={estilos.respuestas}>
        {resultado && (
          <div className={resultado.correcta ? comun.correcto : comun.incorrecto}>
            <strong>{resultado.correcta ? 'Correcto' : 'No es correcto'}</strong>
            {actividad.tipo === 'vf' && <span>{actividad.explicacion}</span>}
            {actividad.tipo === 'escrita' && !resultado.correcta && (
              <span>
                Una respuesta válida es: <code>{resultado.solucion}</code>
              </span>
            )}
          </div>
        )}
      </div>

      {pistaTutor && (
        <aside className={estilos.pista} aria-label="Ayuda del tutor">
          {estado.ajustes.tutor === 'ninguno' ? (
            <span className={estilos.iconoPista} aria-hidden="true">
              <IconoTutor tamano={20} />
            </span>
          ) : (
            <Pato variante={estado.ajustes.tutor} reposo="animando_c" tamano={52} />
          )}
          <div className={estilos.textoPista}>
            <strong>Tu tutor tiene una pista</strong>
            <span>{pistaTutor}</span>
            <div className={comun.acciones}>
              <button
                type="button"
                className={estilos.botonPista}
                onClick={() => {
                  ponerContextoTutor({ leccionId: leccion.id, titulo: leccion.titulo });
                  navegar('/tutor');
                }}
              >
                Hablar con el tutor
              </button>
              <button type="button" className={estilos.botonAhoraNo} onClick={() => setPistaTutor(null)}>
                Ahora no
              </button>
            </div>
          </div>
        </aside>
      )}
    </Pantalla>
  );
}
