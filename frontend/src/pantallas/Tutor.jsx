import { useCallback, useEffect, useRef, useState } from 'react';
import { preguntarTutor, solicitarTutorHumano, usaBackend } from '../api/cliente.js';
import { Boton } from '../componentes/Boton.jsx';
import { IconoCerrar, IconoEnviar, IconoTutor } from '../componentes/Iconos.jsx';
import { Pato } from '../componentes/Pato.jsx';
import { TextoTecleado } from '../componentes/TextoTecleado.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { esMenor, useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Tutor.module.css';

const SUGERENCIAS = ['No entiendo los bucles', '¿Qué es una variable?', 'Dame un ejemplo'];

/**
 * Pantalla 5 del boceto: tutor virtual (agente Mentor, propuesta P1).
 * Responde dudas y, además, escribe por iniciativa propia cuando detecta que el alumno se atasca.
 * Si se abre desde una lección, sabe de qué lección se habla (historia H9).
 */
export function Tutor({ navegar }) {
  const { estado, anadirMensaje, marcarTutorLeido, registrarEvento, ponerContextoTutor, cambiarTutorIA } = useEstado();
  const contexto = estado.contextoTutor;
  const avatar = estado.ajustes.tutor;

  // Los mensajes que llegan mientras la pantalla está abierta se muestran letra a letra.
  const vistos = useRef(new Set(estado.mensajesTutor.map((m) => m.id)));
  const [tecleando, setTecleando] = useState(null);
  const [caraPato, setCaraPato] = useState(null);
  useEffect(() => {
    const ultimo = estado.mensajesTutor[estado.mensajesTutor.length - 1];
    if (ultimo && !vistos.current.has(ultimo.id)) {
      vistos.current.add(ultimo.id);
      if (ultimo.autor === 'tutor') setTecleando(ultimo.id);
    }
  }, [estado.mensajesTutor]);
  const alTerminar = useCallback(() => {
    setTecleando(null);
    setCaraPato(null);
  }, []);
  const ultimoTutor = [...estado.mensajesTutor].reverse().find((m) => m.autor === 'tutor');
  const datosConsulta = { cursoId: estado.cursoId, leccionId: contexto?.leccionId, esMenor: esMenor(estado) };
  const [texto, setTexto] = useState('');
  const [esperando, setEsperando] = useState(false);
  const finConversacion = useRef(null);

  useEffect(() => {
    marcarTutorLeido();
  }, [marcarTutorLeido]);

  useEffect(() => {
    finConversacion.current?.scrollIntoView({ block: 'end' });
  }, [estado.mensajesTutor.length, esperando]);

  const enviar = async (pregunta) => {
    const limpia = pregunta.trim();
    if (!limpia || esperando) return;
    anadirMensaje({ autor: 'alumno', texto: limpia });
    registrarEvento('pregunta_tutor', { cursoId: estado.cursoId, leccionId: contexto?.leccionId });
    setTexto('');
    setEsperando(true);
    const respuesta = await preguntarTutor(limpia, datosConsulta);
    anadirMensaje({ autor: 'tutor', texto: respuesta.texto });
    setEsperando(false);
  };

  const pedirHumano = async () => {
    setEsperando(true);
    registrarEvento('derivacion_tutor', { cursoId: estado.cursoId });
    anadirMensaje({ autor: 'alumno', texto: 'Quiero hablar con un tutor.' });
    anadirMensaje({ autor: 'tutor', texto: await solicitarTutorHumano(datosConsulta) });
    setEsperando(false);
  };

  const volverSesion =
    estado.sesion && estado.cursoId
      ? () => navegar(`/curso/${estado.cursoId}/sesion/${estado.sesion.indice}`)
      : contexto && estado.cursoId
        ? () => navegar(`/curso/${estado.cursoId}/leccion/${contexto.leccionId}`)
        : undefined;

  if (!estado.tutorIA) {
    return (
      <Pantalla titulo="Tutor" icono={<IconoTutor tamano={22} />} alVolver={volverSesion}>
        <div className={comun.tarjeta}>
          <h2>Has desactivado el tutor con IA</h2>
          <p className={comun.medio}>
            Puedes seguir estudiando con normalidad. Si tienes una duda, escribe a un tutor de la academia.
          </p>
          <div className={comun.acciones}>
            <Boton onClick={pedirHumano} disabled={esperando}>
              Hablar con un tutor de la academia
            </Boton>
            <Boton variante="texto" onClick={() => cambiarTutorIA(true)}>
              Activar el tutor con IA
            </Boton>
          </div>
        </div>
        {estado.mensajesTutor.length > 1 && (
          <p className={comun.secundario}>{estado.mensajesTutor[estado.mensajesTutor.length - 1].texto}</p>
        )}
      </Pantalla>
    );
  }

  return (
    <Pantalla
      titulo="Tutor"
      subtitulo="Responde con el contenido de tu curso"
      icono={<IconoTutor tamano={22} />}
      alVolver={volverSesion}
      textoVolver={estado.sesion ? 'Volver a la sesión' : 'Volver a la lección'}
    >
      {contexto && (
        <div className={estilos.contexto}>
          <span>
            Hablando de: <strong>{contexto.titulo}</strong>
          </span>
          <button
            type="button"
            className={estilos.quitarContexto}
            onClick={() => ponerContextoTutor(null)}
            aria-label={`Dejar de hablar de ${contexto.titulo} y preguntar sobre cualquier tema`}
          >
            <IconoCerrar tamano={16} />
          </button>
        </div>
      )}

      <p className={comun.secundario}>
        Respuestas generadas con IA a partir del contenido del curso. Si lo necesitas, puedes hablar con un tutor de la
        academia.{!usaBackend && ' Sin conexión con el servidor, las respuestas son de ejemplo.'}
      </p>

      <ol className={estilos.conversacion} role="log" aria-label="Conversación con el tutor" aria-live="polite">
        {estado.mensajesTutor.map((m) => {
          const burbuja = (
            <div className={m.autor === 'tutor' ? estilos.tutor : estilos.alumno}>
              <span className="visualmente-oculto">{m.autor === 'tutor' ? 'Tutor:' : 'Tú:'}</span>
              {m.proactivo && <span className={estilos.marca}>Te he visto atascado</span>}
              {tecleando === m.id ? (
                <span>
                  <TextoTecleado
                    texto={m.texto}
                    alHablar={(c) => setCaraPato(m.proactivo ? (c === 'abierto' ? 'animando' : 'animando_c') : c)}
                    alTerminar={alTerminar}
                  />
                </span>
              ) : (
                m.texto
              )}
            </div>
          );
          // El pato acompaña al último mensaje del tutor (salvo mientras escribe la respuesta siguiente).
          const conPato = avatar !== 'ninguno' && m.id === ultimoTutor?.id && !esperando;
          return (
            <li key={m.id} className={m.autor === 'tutor' ? estilos.filaTutor : estilos.filaAlumno}>
              {conPato && (
                <Pato variante={avatar} cara={caraPato} reposo={m.proactivo ? 'animando_c' : 'cerrado'} tamano={56} />
              )}
              {burbuja}
            </li>
          );
        })}
        {esperando && (
          <li className={estilos.filaTutor} aria-label="El tutor está escribiendo">
            {avatar !== 'ninguno' && <Pato variante={avatar} cara="pensando" tamano={56} />}
            <div className={estilos.tutor}>
              <span className={estilos.escribiendo} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </li>
        )}
      </ol>
      <div ref={finConversacion} />

      <div className={estilos.sugerencias} aria-label="Preguntas sugeridas" role="group">
        {SUGERENCIAS.map((s) => (
          <button key={s} type="button" className={estilos.sugerencia} onClick={() => enviar(s)} disabled={esperando}>
            {s}
          </button>
        ))}
        <button type="button" className={estilos.sugerencia} onClick={pedirHumano} disabled={esperando}>
          Hablar con un tutor de la academia
        </button>
      </div>

      <form
        className={estilos.formulario}
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <label htmlFor="pregunta-tutor" className="visualmente-oculto">
          Escribe tu pregunta
        </label>
        <input
          id="pregunta-tutor"
          className={comun.campo}
          type="text"
          placeholder="¿Dudas?"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className={estilos.enviar} disabled={!texto.trim() || esperando} aria-label="Enviar pregunta">
          <IconoEnviar />
        </button>
      </form>
    </Pantalla>
  );
}
