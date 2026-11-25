import { useState } from 'react';
import { useConexion, usePwa } from '../hooks/usePwa.js';
import { actualizar, instalar } from '../pwa.js';
import { IconoDescargar, IconoSinConexion } from './Iconos.jsx';
import estilos from './AvisosApp.module.css';

const CLAVE_DESCARTE = 'reto480-instalacion-descartada';

/**
 * Avisos generales de la aplicación, encima del contenido:
 * sin conexión, versión nueva disponible y sugerencia de instalar la app (una vez).
 */
export function AvisosApp({ sugerirInstalacion }) {
  const conectado = useConexion();
  const { puedeInstalar, hayVersionNueva } = usePwa();
  const [descartada, setDescartada] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_DESCARTE) === 'si';
    } catch {
      return false;
    }
  });

  const descartar = () => {
    setDescartada(true);
    try {
      localStorage.setItem(CLAVE_DESCARTE, 'si');
    } catch {
      // Sin almacenamiento: se descarta solo durante esta visita.
    }
  };

  return (
    <div className={estilos.avisos} role="status" aria-live="polite">
      {!conectado && (
        <div className={estilos.aviso}>
          <IconoSinConexion tamano={20} />
          <span>
            <strong>Sin conexión.</strong> Puedes seguir con lo que ya se ha cargado. El tutor responderá cuando vuelva
            la conexión.
          </span>
        </div>
      )}

      {hayVersionNueva && (
        <div className={estilos.aviso}>
          <span>Hay una versión nueva de la aplicación.</span>
          <button type="button" className={estilos.accion} onClick={actualizar}>
            Actualizar
          </button>
        </div>
      )}

      {sugerirInstalacion && puedeInstalar && !descartada && (
        <div className={`${estilos.aviso} ${estilos.instalar}`}>
          <IconoDescargar tamano={20} />
          <span>Instala 480 Academy para abrirla desde su icono y usarla sin conexión.</span>
          <span className={estilos.botones}>
            <button type="button" className={estilos.accion} onClick={instalar}>
              Instalar
            </button>
            <button type="button" className={estilos.secundario} onClick={descartar}>
              Ahora no
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
