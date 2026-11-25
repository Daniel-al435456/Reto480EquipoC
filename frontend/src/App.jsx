import { useCallback } from 'react';
import { AvisosApp } from './componentes/AvisosApp.jsx';
import { BarraInferior } from './componentes/BarraInferior.jsx';
import { Boton } from './componentes/Boton.jsx';
import { BotonMentor } from './componentes/BotonMentor.jsx';
import { LimiteErrores } from './componentes/LimiteErrores.jsx';
import { Pantalla } from './componentes/Pantalla.jsx';
import { useAplicarAjustes } from './hooks/useAplicarAjustes.js';
import { EstadoProvider, useEstado } from './hooks/useEstado.jsx';
import { coincide, useRuta } from './hooks/useRuta.js';
import { rutaPermitida } from './api/acceso.js';
import { Ajustes } from './pantallas/Ajustes.jsx';
import { Alias } from './pantallas/Alias.jsx';
import { Bienvenida } from './pantallas/Bienvenida.jsx';
import { Consentimiento } from './pantallas/Consentimiento.jsx';
import { Edad } from './pantallas/Edad.jsx';
import { Entrar } from './pantallas/Entrar.jsx';
import { Legal } from './pantallas/Legal.jsx';
import { PerfilCuenta } from './pantallas/PerfilCuenta.jsx';
import { PerfilPrivacidad } from './pantallas/PerfilPrivacidad.jsx';
import { PerfilMentor } from './pantallas/PerfilMentor.jsx';
import { PerfilSeguridad } from './pantallas/PerfilSeguridad.jsx';
import { Preferencias } from './pantallas/Preferencias.jsx';
import { Registro } from './pantallas/Registro.jsx';
import { Inicio } from './pantallas/Inicio.jsx';
import { Leccion } from './pantallas/Leccion.jsx';
import { Perfil } from './pantallas/Perfil.jsx';
import { PrevioSesion } from './pantallas/PrevioSesion.jsx';
import { Progreso } from './pantallas/Progreso.jsx';
import { SeleccionCurso } from './pantallas/SeleccionCurso.jsx';
import { Sesion } from './pantallas/Sesion.jsx';
import { TestInicial } from './pantallas/TestInicial.jsx';
import { Mentor } from './pantallas/Mentor.jsx';
import estilos from './App.module.css';

/*
 * sinBarra: pantallas de concentración (primera vez, test y sesión), que ocultan la barra inferior
 * como en los prototipos para que el alumno no se distraiga.
 */
const RUTAS = [
  { patron: '/', Componente: Inicio },
  { patron: '/bienvenida', Componente: Bienvenida, sinBarra: true },
  { patron: '/registro', Componente: Registro, sinBarra: true },
  { patron: '/entrar', Componente: Entrar, sinBarra: true },
  { patron: '/legal/:pagina', Componente: Legal, sinBarra: true },
  { patron: '/edad', Componente: Edad, sinBarra: true },
  { patron: '/consentimiento', Componente: Consentimiento, sinBarra: true },
  { patron: '/alias', Componente: Alias, sinBarra: true },
  { patron: '/preferencias', Componente: Preferencias, sinBarra: true },
  { patron: '/cursos', Componente: SeleccionCurso },
  { patron: '/curso/:cursoId/test', Componente: TestInicial, sinBarra: true },
  { patron: '/curso/:cursoId/test/:modo', Componente: TestInicial, sinBarra: true },
  { patron: '/curso/:cursoId/leccion/:leccionId', Componente: Leccion },
  { patron: '/curso/:cursoId/hoy', Componente: PrevioSesion },
  { patron: '/curso/:cursoId/sesion/:paso', Componente: Sesion, sinBarra: true },
  { patron: '/mentor', Componente: Mentor },
  { patron: '/progreso', Componente: Progreso },
  { patron: '/perfil', Componente: Perfil },
  { patron: '/perfil/cuenta', Componente: PerfilCuenta },
  { patron: '/perfil/mentor', Componente: PerfilMentor },
  { patron: '/perfil/apariencia', Componente: Ajustes },
  { patron: '/perfil/seguridad', Componente: PerfilSeguridad },
  { patron: '/perfil/privacidad', Componente: PerfilPrivacidad },
  { patron: '/ajustes', Componente: Ajustes },
];


function NoEncontrada({ navegar }) {
  return (
    <Pantalla titulo="Página no encontrada">
      <p>Esta página no existe.</p>
      <Boton onClick={() => navegar('/')}>Ir al inicio</Boton>
    </Pantalla>
  );
}

function Aplicacion() {
  const { ruta, navegar } = useRuta();
  const { estado, ponerContextoMentor } = useEstado();
  useAplicarAjustes(estado.ajustes);

  // Desde la barra de navegación, el mentor se abre sin lección concreta (pregunta general).
  const navegarDesdeBarra = useCallback(
    (destino) => {
      if (destino === '/mentor') ponerContextoMentor(null);
      navegar(destino);
    },
    [navegar, ponerContextoMentor],
  );

  let contenido = <NoEncontrada navegar={navegar} />;
  let conBarra = true;
  for (const { patron, Componente, sinBarra } of RUTAS) {
    const parametros = coincide(patron, ruta);
    if (parametros) {
      contenido = <Componente key={ruta} {...parametros} navegar={navegar} />;
      conBarra = !sinBarra;
      break;
    }
  }
  // Sin sesión solo se ven las pantallas públicas; con el alta a medias, sus pasos (reglas en api/acceso.js).
  const enAlta = !estado.cuenta || !estado.sesionIniciada || !estado.altaCompleta;
  const permitida = rutaPermitida(estado, ruta);
  if (!permitida) {
    contenido = <Inicio navegar={navegar} />;
    conBarra = false;
  }

  return (
    <div className={`${estilos.app} ${conBarra ? estilos.conBarra : estilos.sinBarra}`}>
      <a
        className="saltar-contenido"
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('contenido')?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <main id="contenido" tabIndex={-1} className={estilos.principal}>
        <AvisosApp sugerirInstalacion={conBarra} />
        <LimiteErrores key={ruta}>{contenido}</LimiteErrores>
      </main>
      {conBarra && (
        <BarraInferior
          ruta={ruta}
          navegar={navegarDesdeBarra}
          avisoMentor={estado.mentorNoLeido && ruta !== '/mentor'}
        />
      )}
      {!enAlta && estado.mentorIA && <BotonMentor ruta={ruta} navegar={navegar} />}
    </div>
  );
}

export default function App() {
  return (
    <LimiteErrores>
      <EstadoProvider>
        <Aplicacion />
      </EstadoProvider>
    </LimiteErrores>
  );
}
