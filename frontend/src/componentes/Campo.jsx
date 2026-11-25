import { useId, useState } from 'react';
import comun from '../pantallas/comun.module.css';
import estilos from './Campo.module.css';

/**
 * Campo de formulario con etiqueta, ayuda y mensaje de error accesibles.
 * Con tipo "password" añade un botón para mostrar u ocultar la contraseña.
 */
export function Campo({ etiqueta, error, ayuda, opcional, tipo = 'text', valor, alCambiar, ...resto }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const esContrasena = tipo === 'password';
  const descripcion = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
        {opcional && <span className={estilos.opcional}> (opcional)</span>}
      </label>
      <div className={estilos.entrada}>
        <input
          id={id}
          className={comun.campo}
          type={esContrasena && visible ? 'text' : tipo}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripcion}
          {...resto}
        />
        {esContrasena && (
          <button
            type="button"
            className={estilos.mostrar}
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {ayuda && (
        <p id={`${id}-ayuda`} className={comun.secundario}>
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={estilos.error}>
          {error}
        </p>
      )}
    </div>
  );
}
