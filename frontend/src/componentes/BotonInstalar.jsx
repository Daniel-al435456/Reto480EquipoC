import { useState } from 'react';
import { usePwa } from '../hooks/usePwa.js';
import { esIos, instalar } from '../pwa.js';
import { IconoDescargar } from './Iconos.jsx';

/**
 * Fila "Instalar la app" del perfil.
 * - Android y escritorio con Chrome o Edge: abre el diálogo de instalación del navegador.
 * - iPhone y iPad: Safari no lo permite, así que explica cómo añadirla a la pantalla de inicio.
 * - Otros navegadores: explica dónde está la opción.
 * - Si la app ya está instalada, no se muestra.
 */
export function BotonInstalar({ className, claseValor }) {
  const { puedeInstalar, instalada } = usePwa();
  const [abierto, setAbierto] = useState(false);

  if (instalada) return null;

  if (puedeInstalar) {
    return (
      <button type="button" className={className} onClick={instalar}>
        <span>Instalar la app</span>
        <span className={claseValor}>
          <IconoDescargar tamano={18} />
        </span>
      </button>
    );
  }

  return (
    <div>
      <button type="button" className={className} aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>Instalar la app</span>
        <span className={claseValor}>Cómo hacerlo</span>
      </button>
      {abierto && (
        <div style={{ padding: '0 1rem 1rem', fontSize: 'var(--texto-pequeno)', lineHeight: 1.5 }}>
          {esIos() ? (
            <p>
              En Safari, pulsa el botón <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba) y elige{' '}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p>
              En Android, abre el menú del navegador (⋮) y elige <strong>Instalar aplicación</strong> o{' '}
              <strong>Añadir a pantalla de inicio</strong>. En el ordenador, con Chrome o Edge, pulsa el icono de
              instalar de la barra de direcciones.
            </p>
          )}
          <p style={{ marginTop: '0.5rem', color: 'var(--color-texto-suave)' }}>
            Instalada, se abre a pantalla completa desde su icono y funciona sin conexión.
          </p>
        </div>
      )}
    </div>
  );
}
