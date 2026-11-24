import { BarraInferior } from './componentes/BarraInferior.jsx';
import { Boton } from './componentes/Boton.jsx';
import { Pantalla } from './componentes/Pantalla.jsx';
import { EstadoProvider, useEstado } from './hooks/useEstado.jsx';
import { coincide, useRuta } from './hooks/useRuta.js';
import { Alias } from './pantallas/Alias.jsx';
import { Bienvenida } from './pantallas/Bienvenida.jsx';
import { Inicio } from './pantallas/Inicio.jsx';
import { Leccion } from './pantallas/Leccion.jsx';
import { Perfil } from './pantallas/Perfil.jsx';
import { PrevioSesion } from './pantallas/PrevioSesion.jsx';
import { Progreso } from './pantallas/Progreso.jsx';
import { SeleccionCurso } from './pantallas/SeleccionCurso.jsx';
import { Sesion } from './pantallas/Sesion.jsx';
import { TestInicial } from './pantallas/TestInicial.jsx';
import { Tutor } from './pantallas/Tutor.jsx';
import estilos from './App.module.css';

/*
 * sinBarra: pantallas de concentración (primera vez, test y sesión), que ocultan la barra inferior
 * como en los prototipos para que el alumno no se distraiga.
 */
const RUTAS = [
  { patron: '/', Componente: Inicio },
  { patron: '/bienvenida', Componente: Bienvenida, sinBarra: true },
  { patron: '/alias', Componente: Alias, sinBarra: true },
  { patron: '/cursos', Componente: SeleccionCurso },
  { patron: '/curso/:cursoId/test', Componente: TestInicial, sinBarra: true },
  { patron: '/curso/:cursoId/test/:modo', Componente: TestInicial, sinBarra: true },
  { patron: '/curso/:cursoId/leccion/:leccionId', Componente: Leccion },
  { patron: '/curso/:cursoId/hoy', Componente: PrevioSesion },
  { patron: '/curso/:cursoId/sesion/:paso', Componente: Sesion, sinBarra: true },
  { patron: '/tutor', Componente: Tutor },
  { patron: '/progreso', Componente: Progreso },
  { patron: '/perfil', Componente: Perfil },
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
  const { estado } = useEstado();

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
  // La primera vez, cualquier ruta lleva a la bienvenida (salvo la propia creación del alias).
  if (!estado.bienvenidaVista && ruta !== '/bienvenida' && ruta !== '/alias') {
    contenido = <Inicio navegar={navegar} />;
    conBarra = false;
  }

  return (
    <>
      <a className="saltar-contenido" href="#contenido" onClick={(e) => {
        e.preventDefault();
        document.getElementById('contenido')?.focus();
      }}>
        Saltar al contenido
      </a>
      <main id="contenido" tabIndex={-1} className={`${estilos.principal} ${conBarra ? '' : estilos.sinBarra}`}>
        {contenido}
      </main>
      {conBarra && (
        <BarraInferior ruta={ruta} navegar={navegar} avisoTutor={estado.tutorNoLeido && ruta !== '/tutor'} />
      )}
    </>
  );
}

export default function App() {
  return (
    <EstadoProvider>
      <Aplicacion />
    </EstadoProvider>
  );
}
