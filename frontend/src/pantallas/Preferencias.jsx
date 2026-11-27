import { useState } from 'react';
import { contrasenaAlta } from '../api/altaPendiente.js';
import { crearCuentaServidor, usaBackend } from '../api/cliente.js';
import { errorContrasena } from '../api/cuenta.js';
import { cuerpoAlta, mensajeDeError } from '../api/sesion.js';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { AjustesMentor } from '../componentes/AjustesMentor.jsx';
import { Interruptor } from '../componentes/Interruptor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import { PASOS_ALTA } from './Registro.jsx';

const TEMAS = [
  ['auto', 'Automático'],
  ['claro', 'Claro'],
  ['oscuro', 'Oscuro'],
];
const TEXTOS = [
  ['normal', 'Normal'],
  ['grande', 'Grande'],
  ['muy-grande', 'Muy grande'],
];

/**
 * Alta, paso 4 de 4: preferencias (mentor, tema y tamaño del texto). Se pueden cambiar después en el perfil.
 * Con backend, al terminar se crea la cuenta en el servidor con los datos de los cuatro pasos (issue #57).
 */
export function Preferencias({ navegar }) {
  const { estado, cambiarAjuste, cambiarMentorIA, completarAlta, entrarConServidor, registrarEvento } = useEstado();
  const { ajustes } = estado;
  // Si la app se recargó a mitad del alta, la contraseña ya no está en memoria: se vuelve a pedir aquí.
  const [faltaContrasena] = useState(() => usaBackend && !contrasenaAlta());
  const [contrasena, setContrasena] = useState('');
  const [errorClave, setErrorClave] = useState('');
  const [error, setError] = useState('');
  // Si el correo ya tiene cuenta, se ofrece entrar con él o volver al paso 1 para cambiarlo.
  const [correoRegistrado, setCorreoRegistrado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const terminar = async () => {
    if (usaBackend) {
      const clave = faltaContrasena ? contrasena : contrasenaAlta();
      const fallaClave = faltaContrasena ? errorContrasena(contrasena) : '';
      if (fallaClave) {
        setErrorClave(fallaClave);
        return;
      }
      setEnviando(true);
      setError('');
      try {
        entrarConServidor(await crearCuentaServidor(cuerpoAlta(estado, clave)));
      } catch (fallo) {
        setError(mensajeDeError(fallo));
        setCorreoRegistrado(fallo.codigo === 'email_registrado');
        setEnviando(false);
        return;
      }
    } else {
      completarAlta();
    }
    registrarEvento('alta_completada', {
      forma: ajustes.mentor,
      personalidad: estado.personalidadMentor,
      mentorIA: estado.mentorIA,
    });
    navegar('/');
  };

  return (
    <Pantalla
      titulo="Hazla a tu medida"
      subtitulo="Puedes cambiarlo cuando quieras en tu perfil."
      alVolver={() => navegar('/alias')}
      progreso={{ valor: 4, maximo: PASOS_ALTA, etiqueta: `Paso 4 de ${PASOS_ALTA}` }}
      pie={
        <>
          {error && (
            <p role="alert" className={`${comun.aviso} ${comun.incorrecto}`}>
              {error}
            </p>
          )}
          {correoRegistrado && (
            <div className={comun.acciones}>
              <Boton variante="secundario" onClick={() => navegar('/entrar')}>
                Iniciar sesión
              </Boton>
              <Boton variante="texto" onClick={() => navegar('/registro')}>
                Cambiar el correo
              </Boton>
            </div>
          )}
          <Boton anchoCompleto onClick={terminar} disabled={enviando}>
            Empezar a aprender
          </Boton>
        </>
      }
    >
      {faltaContrasena && (
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          valor={contrasena}
          alCambiar={(valor) => {
            setContrasena(valor);
            setErrorClave('');
            setError('');
          }}
          error={errorClave}
          ayuda="Por seguridad, la contraseña no se guarda en el dispositivo: vuelve a escribirla. Al menos 8 caracteres, con letras y números."
          autoComplete="new-password"
        />
      )}
      <AjustesMentor />

      <fieldset className={comun.grupo}>
        <legend>Tema</legend>
        <div className={comun.segmentado}>
          {TEMAS.map(([valor, texto]) => (
            <label key={valor} className={comun.segmento}>
              <input type="radio" name="tema" checked={ajustes.tema === valor} onChange={() => cambiarAjuste('tema', valor)} />
              {texto}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={comun.grupo}>
        <legend>Tamaño del texto</legend>
        <div className={comun.segmentado}>
          {TEXTOS.map(([valor, texto]) => (
            <label key={valor} className={comun.segmento}>
              <input type="radio" name="texto" checked={ajustes.texto === valor} onChange={() => cambiarAjuste('texto', valor)} />
              {texto}
            </label>
          ))}
        </div>
      </fieldset>

      <Interruptor
        titulo="Mentor con IA"
        descripcion="Resuelve dudas con el contenido del curso y te avisa si te atascas. Solo recibe tu alias, nunca tu nombre."
        activo={estado.mentorIA}
        alCambiar={cambiarMentorIA}
      />
    </Pantalla>
  );
}
