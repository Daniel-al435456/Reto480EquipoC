import { useState } from 'react';
import { iniciarSesionServidor, usaBackend } from '../api/cliente.js';
import { comprobarContrasena, EMAIL_VALIDO } from '../api/cuenta.js';
import { mensajeDeError } from '../api/sesion.js';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';

/**
 * Inicio de sesión. Con backend, lo comprueba el servidor y carga la cuenta (issue #57). Sin backend, comprueba la
 * cuenta guardada en este dispositivo.
 */
export function Entrar({ navegar }) {
  const { estado, iniciarSesion, entrarConServidor, quitarAvisoSesion, registrarEvento } = useEstado();
  const [enviando, setEnviando] = useState(false);
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  // Errores que no son del correo ni de la contraseña (por ejemplo, sin conexión): se muestran aparte.
  const [errorGeneral, setErrorGeneral] = useState('');
  const [recuperar, setRecuperar] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    if (!EMAIL_VALIDO.test(email.trim())) {
      setError('Escribe un correo válido, por ejemplo nombre@empresa.com.');
      return;
    }
    if (usaBackend) {
      setEnviando(true);
      try {
        entrarConServidor(await iniciarSesionServidor(email.trim().toLowerCase(), contrasena));
      } catch (fallo) {
        if (fallo.codigo === 'credenciales_incorrectas') setError(mensajeDeError(fallo));
        else setErrorGeneral(mensajeDeError(fallo));
        setEnviando(false);
        return;
      }
      registrarEvento('sesion_iniciada');
      navegar('/');
      return;
    }
    const cuenta = estado.cuenta;
    const correcto =
      cuenta &&
      cuenta.email === email.trim().toLowerCase() &&
      (await comprobarContrasena(contrasena, cuenta.hashContrasena));
    if (!correcto) {
      setError('El correo o la contraseña no son correctos.');
      return;
    }
    iniciarSesion();
    registrarEvento('sesion_iniciada');
    navegar('/');
  };

  return (
    <Pantalla titulo="Inicia sesión" subtitulo="Te damos la bienvenida de nuevo." alVolver={() => navegar('/bienvenida')}>
      {estado.avisoSesion && (
        <p role="alert" className={comun.aviso}>
          {estado.avisoSesion}
        </p>
      )}
      {errorGeneral && (
        <p role="alert" className={`${comun.aviso} ${comun.incorrecto}`}>
          {errorGeneral}
        </p>
      )}
      <form className={comun.grupo} onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Correo electrónico"
          tipo="email"
          inputMode="email"
          valor={email}
          alCambiar={(v) => {
            setEmail(v);
            setError('');
            setErrorGeneral('');
            quitarAvisoSesion();
          }}
          autoComplete="email"
          placeholder="nombre@empresa.com"
        />
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          valor={contrasena}
          alCambiar={(v) => {
            setContrasena(v);
            setError('');
            setErrorGeneral('');
          }}
          autoComplete="current-password"
          error={error}
        />
        <Boton anchoCompleto type="submit" disabled={!email.trim() || !contrasena || enviando}>
          Iniciar sesión
        </Boton>
      </form>

      <Boton variante="texto" onClick={() => setRecuperar(!recuperar)} aria-expanded={recuperar}>
        ¿Has olvidado tu contraseña?
      </Boton>
      {recuperar && (
        <p className={comun.aviso} role="status">
          Pide a tu empresa o al soporte de 480 Academy que te envíe un enlace para crear una contraseña nueva. Cuando la
          aplicación esté conectada al servidor, podrás hacerlo tú desde aquí con tu correo.
        </p>
      )}

      <p className={comun.secundario} style={{ textAlign: 'center' }}>
        ¿No tienes cuenta?{' '}
        <a
          href="#/registro"
          onClick={(e) => {
            e.preventDefault();
            navegar('/registro');
          }}
        >
          Crea una
        </a>
      </p>
    </Pantalla>
  );
}
