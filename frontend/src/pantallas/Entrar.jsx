import { useState } from 'react';
import { comprobarContrasena } from '../api/cuenta.js';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';

/**
 * Inicio de sesión.
 * Prototipo: comprueba la cuenta guardada en este dispositivo. Con backend, lo hará el servidor.
 */
export function Entrar({ navegar }) {
  const { estado, iniciarSesion, registrarEvento } = useEstado();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [recuperar, setRecuperar] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
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
      <form className={comun.grupo} onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Correo electrónico"
          tipo="email"
          inputMode="email"
          valor={email}
          alCambiar={(v) => {
            setEmail(v);
            setError('');
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
          }}
          autoComplete="current-password"
          error={error}
        />
        <Boton anchoCompleto type="submit" disabled={!email.trim() || !contrasena}>
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
