import { useState } from 'react';
import { cambiarContrasenaServidor, eliminarCuentaServidor, usaBackend } from '../api/cliente.js';
import { comprobarContrasena, errorContrasena, resumirContrasena } from '../api/cuenta.js';
import { mensajeDeError } from '../api/sesion.js';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Perfil.module.css';

/**
 * Perfil → Seguridad: cambiar la contraseña, cerrar sesión y eliminar la cuenta (que pide la contraseña).
 * Con backend, todo se hace en el servidor (issue #57); sin backend, con la cuenta guardada en el dispositivo.
 */
export function PerfilSeguridad({ navegar }) {
  const { estado, guardarContrasena, cerrarSesion, eliminarCuenta, caducarSesion, registrarEvento } = useEstado();
  const [contrasenaEliminar, setContrasenaEliminar] = useState('');
  const [errorEliminar, setErrorEliminar] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  // Mientras una petición está en curso, su botón no se puede volver a pulsar.
  const [cambiando, setCambiando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [claves, setClaves] = useState({ actual: '', nueva: '', repetida: '' });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const cambiar = (clave) => (valor) => {
    setClaves((c) => ({ ...c, [clave]: valor }));
    setErrores((e) => ({ ...e, [clave]: undefined }));
    setAviso('');
    setErrorGeneral('');
  };

  const cambiarContrasena = async (evento) => {
    evento.preventDefault();
    const e = {};
    if (!usaBackend && !(await comprobarContrasena(claves.actual, estado.cuenta?.hashContrasena))) {
      e.actual = 'La contraseña actual no es correcta.';
    }
    if (!claves.actual) e.actual = 'Escribe tu contraseña actual.';
    const errorNueva = errorContrasena(claves.nueva);
    if (errorNueva) e.nueva = errorNueva;
    else if (claves.nueva === claves.actual) e.nueva = 'La contraseña nueva debe ser distinta de la actual.';
    if (claves.repetida !== claves.nueva) e.repetida = 'Las contraseñas no coinciden.';
    setErrores(e);
    if (Object.keys(e).length) return;
    if (usaBackend) {
      setCambiando(true);
      try {
        // El servidor comprueba la actual y cierra las demás sesiones; esta sigue abierta.
        await cambiarContrasenaServidor(claves.actual, claves.nueva);
      } catch (fallo) {
        if (fallo.codigo === 'sesion_no_valida') caducarSesion(fallo.token);
        else if (fallo.codigo === 'contrasena_incorrecta') setErrores({ actual: 'La contraseña actual no es correcta.' });
        else setErrorGeneral(mensajeDeError(fallo));
        return;
      } finally {
        setCambiando(false);
      }
    } else {
      guardarContrasena(await resumirContrasena(claves.nueva));
    }
    registrarEvento('contrasena_cambiada');
    setClaves({ actual: '', nueva: '', repetida: '' });
    setAviso('Contraseña actualizada.');
  };

  return (
    <Pantalla titulo="Seguridad" alVolver={() => navegar('/perfil')} textoVolver="Volver al perfil">
      <section className={estilos.seccion} aria-labelledby="titulo-contrasena">
        <h2 id="titulo-contrasena">Cambiar la contraseña</h2>
        <form className={comun.grupo} onSubmit={cambiarContrasena} noValidate>
          <Campo etiqueta="Contraseña actual" tipo="password" valor={claves.actual} alCambiar={cambiar('actual')} error={errores.actual} autoComplete="current-password" />
          <Campo
            etiqueta="Contraseña nueva"
            tipo="password"
            valor={claves.nueva}
            alCambiar={cambiar('nueva')}
            error={errores.nueva}
            ayuda="Al menos 8 caracteres, con letras y números."
            autoComplete="new-password"
          />
          <Campo etiqueta="Repite la contraseña nueva" tipo="password" valor={claves.repetida} alCambiar={cambiar('repetida')} error={errores.repetida} autoComplete="new-password" />
          <Boton type="submit" disabled={cambiando}>
            Cambiar contraseña
          </Boton>
          {errorGeneral && (
            <p role="alert" className={`${comun.aviso} ${comun.incorrecto}`}>
              {errorGeneral}
            </p>
          )}
          <p role="status" className={comun.secundario}>
            {aviso}
          </p>
        </form>
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-sesion">
        <h2 id="titulo-sesion">Sesión</h2>
        <p className={comun.secundario}>Tu progreso se conserva en este dispositivo al cerrar la sesión.</p>
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
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-eliminar">
        <h2 id="titulo-eliminar">Eliminar la cuenta</h2>
        {confirmarEliminar ? (
          <div className={estilos.confirmarBloque} role="group" aria-labelledby="titulo-eliminar">
            <p>
              Se borrarán tu cuenta, tu progreso y tu historial con el mentor. <strong>No se puede deshacer.</strong>
            </p>
            <Campo
              etiqueta="Escribe tu contraseña para confirmar"
              tipo="password"
              valor={contrasenaEliminar}
              alCambiar={(valor) => {
                setContrasenaEliminar(valor);
                setErrorEliminar('');
              }}
              error={errorEliminar}
              autoComplete="current-password"
            />
            <div className={comun.acciones}>
              <Boton
                variante="secundario"
                disabled={eliminando}
                onClick={async () => {
                  if (!contrasenaEliminar) {
                    setErrorEliminar('Escribe tu contraseña para confirmar.');
                    return;
                  }
                  setEliminando(true);
                  if (usaBackend) {
                    try {
                      await eliminarCuentaServidor(contrasenaEliminar);
                    } catch (fallo) {
                      if (fallo.codigo === 'sesion_no_valida') caducarSesion(fallo.token);
                      else setErrorEliminar(mensajeDeError(fallo));
                      setEliminando(false);
                      return;
                    }
                  } else if (!(await comprobarContrasena(contrasenaEliminar, estado.cuenta?.hashContrasena))) {
                    setErrorEliminar(mensajeDeError({ codigo: 'contrasena_incorrecta' }));
                    setEliminando(false);
                    return;
                  }
                  eliminarCuenta();
                  navegar('/bienvenida');
                }}
              >
                Sí, eliminar mi cuenta
              </Boton>
              <Boton
                variante="texto"
                onClick={() => {
                  setConfirmarEliminar(false);
                  setContrasenaEliminar('');
                  setErrorEliminar('');
                }}
              >
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <>
            <p className={comun.secundario}>Borra todos tus datos. Antes puedes descargarlos desde Privacidad y datos.</p>
            <Boton variante="peligro" onClick={() => setConfirmarEliminar(true)}>
              Eliminar mi cuenta
            </Boton>
          </>
        )}
      </section>
    </Pantalla>
  );
}
