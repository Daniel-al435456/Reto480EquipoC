import { useState } from 'react';
import { guardarContrasenaAlta } from '../api/altaPendiente.js';
import { usaBackend } from '../api/cliente.js';
import { EMAIL_VALIDO, errorContrasena, resumirContrasena } from '../api/cuenta.js';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';

export const PASOS_ALTA = 4;

/**
 * Alta, paso 1 de 4: datos de la cuenta.
 * El acceso a 480 Academy lo da la empresa del alumno, por eso se pide.
 * Estos datos identifican al alumno y nunca se envían a la IA (propuesta P3).
 * Con backend, la cuenta se crea en el servidor al terminar el paso 4 (Preferencias): hasta entonces la contraseña
 * solo se guarda en memoria (api/altaPendiente.js). Sin backend, se guarda su resumen en el dispositivo.
 */
export function Registro({ navegar }) {
  const { estado, crearCuenta, registrarEvento } = useEstado();
  const [datos, setDatos] = useState({ empresa: '', nombre: '', apellidos: '', email: '', contrasena: '', puesto: '' });
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (clave) => (valor) => {
    setDatos((d) => ({ ...d, [clave]: valor }));
    setErrores((e) => ({ ...e, [clave]: undefined }));
  };

  const validar = () => {
    const e = {};
    if (!datos.empresa.trim()) e.empresa = 'Indica tu empresa.';
    if (!datos.nombre.trim()) e.nombre = 'Indica tu nombre.';
    if (!datos.apellidos.trim()) e.apellidos = 'Indica tus apellidos.';
    if (!EMAIL_VALIDO.test(datos.email.trim())) e.email = 'Escribe un correo válido, por ejemplo nombre@empresa.com.';
    const errorClave = errorContrasena(datos.contrasena);
    if (errorClave) e.contrasena = errorClave;
    if (!acepta) e.acepta = 'Para crear la cuenta, acepta la política de privacidad.';
    return e;
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setEnviando(true);
    if (usaBackend) guardarContrasenaAlta(datos.contrasena);
    crearCuenta({
      empresa: datos.empresa.trim(),
      nombre: datos.nombre.trim(),
      apellidos: datos.apellidos.trim(),
      email: datos.email.trim().toLowerCase(),
      puesto: datos.puesto.trim(),
      ...(usaBackend ? {} : { hashContrasena: await resumirContrasena(datos.contrasena) }),
    });
    registrarEvento('cuenta_creada');
    navegar('/edad');
  };

  return (
    <Pantalla
      titulo="Crea tu cuenta"
      subtitulo="Tu empresa te da acceso a todo el catálogo de 480 Academy."
      alVolver={() => navegar('/bienvenida')}
      progreso={{ valor: 1, maximo: PASOS_ALTA, etiqueta: `Paso 1 de ${PASOS_ALTA}` }}
    >
      {!usaBackend && estado.cuenta && (
        <p className={comun.aviso}>Ya hay una cuenta en este dispositivo. Si creas otra, sustituirá a la anterior.</p>
      )}
      <form className={comun.grupo} onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Empresa"
          valor={datos.empresa}
          alCambiar={cambiar('empresa')}
          error={errores.empresa}
          ayuda="La empresa en la que trabajas. Después solo podrá cambiarla la academia."
          autoComplete="organization"
        />
        <Campo etiqueta="Nombre" valor={datos.nombre} alCambiar={cambiar('nombre')} error={errores.nombre} autoComplete="given-name" />
        <Campo etiqueta="Apellidos" valor={datos.apellidos} alCambiar={cambiar('apellidos')} error={errores.apellidos} autoComplete="family-name" />
        <Campo
          etiqueta="Correo electrónico"
          tipo="email"
          inputMode="email"
          valor={datos.email}
          alCambiar={cambiar('email')}
          error={errores.email}
          autoComplete="email"
          placeholder="nombre@empresa.com"
          ayuda="Será tu usuario para iniciar sesión y no se podrá cambiar desde la app."
        />
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          valor={datos.contrasena}
          alCambiar={cambiar('contrasena')}
          error={errores.contrasena}
          ayuda="Al menos 8 caracteres, con letras y números."
          autoComplete="new-password"
        />
        <Campo
          etiqueta="Puesto o área"
          opcional
          valor={datos.puesto}
          alCambiar={cambiar('puesto')}
          ayuda="Nos ayuda a recomendarte cursos útiles para tu trabajo."
          autoComplete="organization-title"
        />

        <label className={comun.opcion}>
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => {
              setAcepta(e.target.checked);
              setErrores((er) => ({ ...er, acepta: undefined }));
            }}
            aria-invalid={errores.acepta ? true : undefined}
          />
          <span>
            He leído la{' '}
            <a
              href="#/legal/privacidad"
              onClick={(e) => {
                e.preventDefault();
                navegar('/legal/privacidad');
              }}
            >
              política de privacidad
            </a>
            , incluido el uso de un mentor con IA, que puedo desactivar cuando quiera.
          </span>
        </label>
        {errores.acepta && <p className={comun.secundario} style={{ color: 'var(--color-error)', fontWeight: 600 }}>{errores.acepta}</p>}

        <Boton anchoCompleto type="submit" disabled={enviando}>
          Crear cuenta
        </Boton>
      </form>

      <p className={comun.secundario} style={{ textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <a
          href="#/entrar"
          onClick={(e) => {
            e.preventDefault();
            navegar('/entrar');
          }}
        >
          Inicia sesión
        </a>
      </p>
    </Pantalla>
  );
}
