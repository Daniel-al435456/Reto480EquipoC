import { useEffect, useRef, useState } from 'react';
import { preguntarTutor, solicitarTutorHumano } from '../api/cliente.js';
import { IconoEnviar, IconoTutor } from '../componentes/Iconos.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Tutor.module.css';

const SUGERENCIAS = ['No entiendo los bucles', '¿Qué es una variable?', 'Dame un ejemplo'];

/**
 * Pantalla 5 del boceto: tutor virtual.
 * Responde dudas y, además, escribe por iniciativa propia cuando detecta que el alumno se atasca.
 * Respuestas simuladas mientras la IA está pendiente de decisión (propuesta P1).
 */
export function Tutor({ navegar }) {
  const { estado, anadirMensaje, marcarTutorLeido, registrarEvento } = useEstado();
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
    registrarEvento('pregunta_tutor', { cursoId: estado.cursoId });
    setTexto('');
    setEsperando(true);
    const respuesta = await preguntarTutor(limpia, estado.cursoId);
    anadirMensaje({ autor: 'tutor', texto: respuesta });
    setEsperando(false);
  };

  const pedirHumano = async () => {
    setEsperando(true);
    registrarEvento('derivacion_tutor', { cursoId: estado.cursoId });
    anadirMensaje({ autor: 'alumno', texto: 'Quiero hablar con un tutor.' });
    anadirMensaje({ autor: 'tutor', texto: await solicitarTutorHumano() });
    setEsperando(false);
  };

  const volverSesion =
    estado.sesion && estado.cursoId
      ? () => navegar(`/curso/${estado.cursoId}/sesion/${estado.sesion.indice}`)
      : undefined;

  return (
    <Pantalla
      titulo="Tutor"
      subtitulo="Responde con el contenido de tu curso"
      icono={<IconoTutor tamano={22} />}
      alVolver={volverSesion}
      textoVolver="Volver a la sesión"
    >
      <p className={comun.secundario}>Versión de demostración: las respuestas son de ejemplo.</p>

      <ol className={estilos.conversacion} role="log" aria-label="Conversación con el tutor" aria-live="polite">
        {estado.mensajesTutor.map((m) => (
          <li key={m.id} className={m.autor === 'tutor' ? estilos.tutor : estilos.alumno}>
            <span className="visualmente-oculto">{m.autor === 'tutor' ? 'Tutor:' : 'Tú:'}</span>
            {m.proactivo && <span className={estilos.marca}>Te he visto atascado</span>}
            {m.texto}
          </li>
        ))}
        {esperando && (
          <li className={estilos.tutor} aria-label="El tutor está escribiendo">
            <span className={estilos.escribiendo} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
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
