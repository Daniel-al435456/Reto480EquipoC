import { useState } from 'react';
import { obtenerCurso } from '../api/cliente.js';
import { leccionesPendientes } from '../api/planificador.js';
import { AvatarPixel } from '../componentes/AvatarPixel.jsx';
import { Boton } from '../componentes/Boton.jsx';
import { IconoFlecha, IconoMas } from '../componentes/Iconos.jsx';
import { Interruptor } from '../componentes/Interruptor.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import { useTituloPantalla } from '../hooks/useTituloPantalla.js';
import comun from './comun.module.css';
import estilos from './Perfil.module.css';

/**
 * Perfil del alumno: alias, modo anónimo, cursos y control de sus datos.
 * Pantalla de los prototipos, aprobada en la propuesta P6.
 */
export function Perfil({ navegar }) {
  const { estado, cambiarAnonimo, borrarHistorialTutor, reiniciar, registrarEvento } = useEstado();
  const encabezado = useTituloPantalla('Perfil');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [aviso, setAviso] = useState('');

  const curso = estado.cursoId && estado.testHecho ? obtenerCurso(estado.cursoId) : null;
  const pendientes = curso ? leccionesPendientes(curso, estado.dominio, estado.completadas) : [];
  const porcentaje = curso
    ? Math.round(((curso.lecciones.length - pendientes.length) / curso.lecciones.length) * 100)
    : 0;
  const modo = `${estado.modo.minutos} min · ${estado.modo.audio ? 'con audio' : 'sin audio'}`;

  const borrar = () => {
    borrarHistorialTutor();
    registrarEvento('historial_tutor_borrado');
    setConfirmarBorrado(false);
    setAviso('Historial con el tutor borrado.');
  };

  return (
    <div className={estilos.perfil}>
      <header className={estilos.cabecera}>
        <AvatarPixel alias={estado.alias} tamano="mediano" />
        <div className={estilos.nombre}>
          <h1 ref={encabezado} tabIndex={-1}>
            {estado.anonimo ? estado.alias || 'Sin alias' : 'Tu nombre'}
          </h1>
          <span className={comun.secundario}>
            {estado.anonimo ? 'Alias anónimo · se muestra a los tutores' : 'Nombre real · visible para los tutores'}
          </span>
        </div>
      </header>

      <Interruptor
        titulo="Modo anónimo"
        descripcion="Los tutores te ven con tu alias"
        activo={estado.anonimo}
        alCambiar={(valor) => {
          cambiarAnonimo(valor);
          registrarEvento('modo_anonimo_cambiado', { anonimo: valor });
        }}
      />

      <section className={estilos.seccion} aria-labelledby="titulo-cursos">
        <div className={estilos.tituloSeccion}>
          <h2 id="titulo-cursos">Mis cursos</h2>
          <a
            href="#/cursos"
            className={estilos.enlace}
            onClick={(e) => {
              e.preventDefault();
              navegar('/cursos');
            }}
          >
            Ver catálogo
          </a>
        </div>

        {curso && (
          <button type="button" className={`${comun.tarjetaGrafito} ${estilos.curso}`} onClick={() => navegar('/progreso')}>
            <span className={estilos.cursoFila}>
              <strong>{curso.titulo}</strong>
              <strong>{porcentaje} %</strong>
            </span>
            <span className={estilos.barra} aria-hidden="true">
              <span style={{ width: `${porcentaje}%` }} />
            </span>
            <span className={comun.secundario}>
              {pendientes[0] ? `Siguiente: ${pendientes[0].titulo}` : 'Curso completado'}
            </span>
          </button>
        )}

        <button type="button" className={estilos.otroCurso} onClick={() => navegar('/cursos')}>
          <span className={estilos.iconoMas} aria-hidden="true">
            <IconoMas tamano={18} />
          </span>
          <span className={estilos.textoOtro}>
            <strong>{curso ? 'Empezar otro curso' : 'Elegir un curso'}</strong>
            <span className={comun.secundario}>Tu suscripción incluye todo el catálogo</span>
          </span>
        </button>
      </section>

      <div className={estilos.ajustes}>
        <button type="button" className={estilos.ajuste} onClick={() => navegar('/alias')}>
          <span>Cambiar alias</span>
          <IconoFlecha tamano={18} />
        </button>

        <details className={estilos.desplegable}>
          <summary className={estilos.ajuste}>
            <span>Qué datos usa la IA</span>
            <IconoFlecha tamano={18} />
          </summary>
          <div className={estilos.detalle}>
            <p>
              <strong>Se usan:</strong> tu alias, tus respuestas al test y a las actividades, y las preguntas que haces
              al tutor.
            </p>
            <p>
              <strong>No se usan:</strong> tu nombre real, tu email ni otros datos de tu cuenta.
            </p>
            <p className={comun.secundario}>
              En esta versión de demostración todo se guarda solo en este dispositivo. El tratamiento definitivo está
              pendiente de aprobación (propuesta P3).
            </p>
          </div>
        </details>

        <button
          type="button"
          className={estilos.ajuste}
          onClick={() => navegar(curso ? `/curso/${curso.id}/hoy` : '/cursos')}
        >
          <span>Modo de estudio habitual</span>
          <span className={estilos.valor}>{modo}</span>
        </button>

        <details className={estilos.desplegable}>
          <summary className={estilos.ajuste}>
            <span>Tamaño del texto y tema</span>
            <span className={estilos.valor}>Automático</span>
          </summary>
          <div className={estilos.detalle}>
            <p>
              La aplicación sigue los ajustes de tu dispositivo: el tamaño de letra, el modo claro u oscuro y la
              reducción de animaciones.
            </p>
          </div>
        </details>

        {confirmarBorrado ? (
          <div className={estilos.confirmar} role="group" aria-label="Confirmar borrado">
            <p>¿Borrar toda la conversación con el tutor? No se puede deshacer.</p>
            <div className={comun.acciones}>
              <Boton variante="secundario" onClick={borrar}>
                Sí, borrar
              </Boton>
              <Boton variante="texto" onClick={() => setConfirmarBorrado(false)}>
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <button type="button" className={estilos.ajustePeligro} onClick={() => setConfirmarBorrado(true)}>
            Borrar mi historial con el tutor
          </button>
        )}
      </div>

      <p role="status" className={comun.secundario}>
        {aviso}
      </p>

      <Boton
        variante="texto"
        onClick={() => {
          reiniciar();
          navegar('/bienvenida');
        }}
      >
        Reiniciar la demostración
      </Boton>
    </div>
  );
}
