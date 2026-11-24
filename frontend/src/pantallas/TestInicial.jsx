import { useEffect, useState } from 'react';
import { evaluarTestInicial, obtenerCurso, obtenerTestInicial } from '../api/cliente.js';
import { leccionesPendientes } from '../api/planificador.js';
import { Boton } from '../componentes/Boton.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './TestInicial.module.css';

const NO_LO_SE = -1;
const CIRCUNFERENCIA = 2 * Math.PI * 52;

/**
 * Pantalla 2 del boceto: test inicial para conocer el nivel del alumno.
 * Con la ruta /test/repetir se empieza de nuevo aunque ya esté hecho.
 */
export function TestInicial({ cursoId, modo, navegar }) {
  const curso = obtenerCurso(cursoId);
  const { estado, guardarTest, estudiarIgualmente, registrarEvento } = useEstado();
  const [preguntas, setPreguntas] = useState(null);
  const [fase, setFase] = useState(estado.testHecho && modo !== 'repetir' ? 'resultado' : 'intro');
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState({});

  useEffect(() => {
    obtenerTestInicial(cursoId).then(setPreguntas);
  }, [cursoId]);

  if (!curso) return null;
  const volver = () => navegar('/cursos');

  if (fase === 'intro') {
    return (
      <Pantalla
        etiqueta={`Test inicial · ${curso.titulo}`}
        titulo="Antes de empezar, veamos qué sabes ya"
        alVolver={volver}
        textoVolver="Volver a los cursos"
        pie={
          <Boton anchoCompleto disabled={!preguntas} onClick={() => setFase('preguntas')}>
            Empezar el test
          </Boton>
        }
      >
        <div className={comun.tarjeta}>
          <p>
            Son {curso.testInicial.length} preguntas cortas y se tarda unos 2 minutos. Lo que ya domines no tendrás
            que volver a estudiarlo, salvo que tú lo prefieras.
          </p>
          <p className={comun.secundario}>Si no sabes una respuesta, elige «No lo sé». No pasa nada.</p>
        </div>
      </Pantalla>
    );
  }

  if (fase === 'preguntas' || fase === 'evaluando') {
    const pregunta = preguntas[indice];
    const elegida = respuestas[pregunta.id];
    const ultima = indice === preguntas.length - 1;

    const siguiente = async () => {
      if (!ultima) {
        setIndice(indice + 1);
        return;
      }
      setFase('evaluando');
      const resultado = await evaluarTestInicial(cursoId, respuestas);
      guardarTest(resultado.dominio);
      registrarEvento('test_completado', {
        cursoId,
        aciertos: Object.keys(resultado.dominio).length,
        total: preguntas.length,
      });
      setFase('resultado');
    };

    const opciones = [
      ...pregunta.opciones.map((texto, i) => ({ texto, valor: i })),
      { texto: 'No lo sé', valor: NO_LO_SE },
    ];

    return (
      <Pantalla
        etiqueta={`Test inicial · ${curso.titulo}`}
        titulo={pregunta.enunciado}
        alVolver={indice > 0 ? () => setIndice(indice - 1) : () => setFase('intro')}
        textoVolver={indice > 0 ? 'Pregunta anterior' : 'Volver'}
        progreso={{ valor: indice + 1, maximo: preguntas.length, etiqueta: `Pregunta ${indice + 1} de ${preguntas.length}` }}
        pie={
          <>
            <p className={`${comun.secundario} ${estilos.nota}`}>Lo que ya domines no tendrás que volver a estudiarlo.</p>
            <Boton anchoCompleto disabled={elegida === undefined || fase === 'evaluando'} onClick={siguiente}>
              {fase === 'evaluando' ? 'Analizando tus respuestas…' : ultima ? 'Ver resultado' : 'Siguiente'}
            </Boton>
          </>
        }
      >
        <fieldset className={comun.grupo} key={pregunta.id}>
          <legend className="visualmente-oculto">{pregunta.enunciado}</legend>
          <div className={comun.opciones}>
            {opciones.map(({ texto, valor }) => (
              <label key={valor} className={valor === NO_LO_SE ? comun.opcionNeutra : comun.opcion}>
                <input
                  type="radio"
                  name={pregunta.id}
                  checked={elegida === valor}
                  onChange={() => setRespuestas({ ...respuestas, [pregunta.id]: valor })}
                />
                <span className={valor === NO_LO_SE ? undefined : comun.codigo}>{texto}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Pantalla>
    );
  }

  // Resultado
  const total = curso.lecciones.length;
  const dominadas = curso.lecciones.filter((l) => estado.dominio[l.id]).length;
  const primera = leccionesPendientes(curso, estado.dominio, estado.completadas)[0];

  return (
    <Pantalla
      antetitulo={curso.titulo}
      titulo="Tu punto de partida"
      alVolver={volver}
      textoVolver="Volver a los cursos"
      pie={
        <>
          <Boton anchoCompleto onClick={() => navegar(`/curso/${cursoId}/hoy`)}>
            Empezar la lección de hoy
          </Boton>
          <Boton
            variante="texto"
            onClick={() => {
              setRespuestas({});
              setIndice(0);
              setFase('intro');
            }}
          >
            Repetir el test
          </Boton>
        </>
      }
    >
      <div className={`${comun.tarjetaGrafito} ${estilos.resumen}`} role="status">
        <div className={estilos.anillo} aria-hidden="true">
          <svg width="112" height="112" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-grafito-pista)" strokeWidth="12" />
            {dominadas > 0 && (
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--color-verde-marca)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(dominadas / total) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
                transform="rotate(-90 60 60)"
              />
            )}
          </svg>
          <span className={estilos.cifra}>
            <strong>
              {dominadas}/{total}
            </strong>
            <span>temas</span>
          </span>
        </div>
        <p className={estilos.textoResumen}>
          {dominadas === 0
            ? 'Empezamos desde el principio. Iremos paso a paso, a tu ritmo.'
            : !primera
              ? 'Ya dominas todo el contenido del curso. Puedes repasar cualquier lección cuando quieras.'
              : `Ya dominas ${dominadas} ${dominadas === 1 ? 'tema' : 'temas'}, así que no tendrás que verlos.`}
          {primera && dominadas > 0 && (
            <>
              {' '}
              Empezarás por <strong>{primera.titulo}</strong>.
            </>
          )}
        </p>
      </div>

      <p className={comun.secundario}>
        Si prefieres estudiar un tema que ya dominas, puedes incluirlo. También podrás repasar cualquier lección desde
        Progreso.
      </p>

      <ul className={comun.listaCompacta} aria-label="Temas del curso" aria-live="polite">
        {curso.lecciones.map((leccion) => {
          const domina = estado.dominio[leccion.id];
          const elegida = !domina && estado.dominioTest?.[leccion.id];
          const esPrimera = leccion.id === primera?.id;
          return (
            <li key={leccion.id} className={esPrimera ? comun.filaDestacada : comun.fila}>
              <span className={estilos.tema}>
                {leccion.titulo}
                {(domina || elegida) && (
                  <button
                    type="button"
                    className={estilos.cambiar}
                    onClick={() => estudiarIgualmente(leccion.id, Boolean(domina))}
                  >
                    {domina ? 'Prefiero estudiarlo' : 'Volver a saltármelo'}
                  </button>
                )}
              </span>
              {domina ? (
                <span className={comun.etiquetaExito}>Ya lo dominas</span>
              ) : esPrimera ? (
                <span className={comun.etiquetaAcento}>Empiezas aquí</span>
              ) : (
                <span className={comun.secundario}>Por aprender</span>
              )}
            </li>
          );
        })}
      </ul>
    </Pantalla>
  );
}
