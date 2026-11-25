import { obtenerCurso } from '../api/cliente.js';
import { nombreVisible } from '../api/cuenta.js';
import { leccionesPendientes } from '../api/planificador.js';
import { AvatarPixel } from '../componentes/AvatarPixel.jsx';
import { Boton } from '../componentes/Boton.jsx';
import { BotonInstalar } from '../componentes/BotonInstalar.jsx';
import { FilaAjuste } from '../componentes/FilaAjuste.jsx';
import { IconoMas } from '../componentes/Iconos.jsx';
import { Interruptor } from '../componentes/Interruptor.jsx';
import { PieLegal } from '../componentes/PieLegal.jsx';
import { tramoDe } from '../api/edad.js';
import { PERSONALIDADES } from '../api/mentor.js';
import { esMenor, useEstado } from '../hooks/useEstado.jsx';
import { useTituloPantalla } from '../hooks/useTituloPantalla.js';
import comun from './comun.module.css';
import estilos from './Perfil.module.css';

const NOMBRE_FORMA = { pato: 'Pato', pata: 'Pata', ninguno: 'Solo texto' };

/** Perfil del alumno, organizado por secciones: cuenta, mentor, apariencia, seguridad, privacidad y cursos. */
export function Perfil({ navegar }) {
  const { estado, cambiarAnonimo, cerrarSesion, registrarEvento } = useEstado();
  const encabezado = useTituloPantalla('Perfil');
  const { ajustes, cuenta } = estado;

  const curso = estado.cursoId && estado.testHecho ? obtenerCurso(estado.cursoId) : null;
  const pendientes = curso ? leccionesPendientes(curso, estado.dominio, estado.completadas) : [];
  const porcentaje = curso
    ? Math.round(((curso.lecciones.length - pendientes.length) / curso.lecciones.length) * 100)
    : 0;
  const tema = { auto: 'Tema automático', claro: 'Tema claro', oscuro: 'Tema oscuro' }[ajustes.tema];

  return (
    <div className={estilos.perfil}>
      <header className={estilos.cabecera}>
        <AvatarPixel alias={estado.alias} tamano="mediano" />
        <div className={estilos.nombre}>
          <h1 ref={encabezado} tabIndex={-1}>
            {nombreVisible(estado)}
          </h1>
          <span className={comun.secundario}>{cuenta ? `${cuenta.email} · ${cuenta.empresa}` : ''}</span>
        </div>
      </header>

      <Interruptor
        titulo="Modo anónimo"
        descripcion={estado.anonimo ? `Los tutores te ven como «${estado.alias}»` : 'Los tutores ven tu nombre real'}
        activo={estado.anonimo}
        alCambiar={(valor) => {
          cambiarAnonimo(valor);
          registrarEvento('modo_anonimo_cambiado', { anonimo: valor });
        }}
      />

      {esMenor(estado) && (
        <p className={estilos.menor}>
          {tramoDe(estado) === 'menor14' && estado.consentimientoFamilia
            ? `Cuenta de menor de 14 años · consentimiento de tu familia registrado el ${new Date(
                estado.consentimientoFamilia,
              ).toLocaleDateString('es-ES')}.`
            : 'Cuenta de menor de edad · el mentor adapta su tono y te pasa con una persona si algo te preocupa.'}
        </p>
      )}

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

      <section className={estilos.seccion} aria-labelledby="titulo-ajustes">
        <h2 id="titulo-ajustes">Ajustes</h2>
        <div className={estilos.ajustes}>
          <FilaAjuste texto="Mi cuenta" valor="Datos y alias" alPulsar={() => navegar('/perfil/cuenta')} />
          <FilaAjuste
            texto="Tu mentor"
            valor={`${NOMBRE_FORMA[ajustes.mentor]} · ${PERSONALIDADES.find((p) => p.id === estado.personalidadMentor)?.nombre ?? ''}`}
            alPulsar={() => navegar('/perfil/mentor')}
          />
          <FilaAjuste texto="Apariencia" valor={tema} alPulsar={() => navegar('/perfil/apariencia')} />
          <FilaAjuste
            texto="Modo de estudio habitual"
            valor={`${estado.modo.minutos} min · ${estado.modo.audio ? 'con audio' : 'sin audio'}`}
            alPulsar={() => navegar(curso ? `/curso/${curso.id}/hoy` : '/cursos')}
          />
          <FilaAjuste texto="Seguridad" valor="Contraseña y sesión" alPulsar={() => navegar('/perfil/seguridad')} />
          <FilaAjuste
            texto="Privacidad y datos"
            valor={estado.mentorIA ? 'Mentor con IA activado' : 'Mentor con IA desactivado'}
            alPulsar={() => navegar('/perfil/privacidad')}
          />
          <BotonInstalar className={estilos.ajuste} claseValor={estilos.valor} />
        </div>
      </section>

      <Boton
        variante="secundario"
        onClick={() => {
          registrarEvento('sesion_cerrada');
          cerrarSesion();
          navegar('/bienvenida');
        }}
      >
        Cerrar sesión
      </Boton>

      <PieLegal navegar={navegar} />
    </div>
  );
}
