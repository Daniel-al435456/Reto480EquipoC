import { useState } from 'react';
import { generarAlias } from '../api/perfil.js';
import { AvatarPixel } from '../componentes/AvatarPixel.jsx';
import { Boton } from '../componentes/Boton.jsx';
import { IconoCandado, IconoRegenerar } from '../componentes/Iconos.jsx';
import { Interruptor } from '../componentes/Interruptor.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Alias.module.css';

/**
 * Alias anónimo con avatar de píxeles. Se muestra la primera vez y desde el perfil.
 * Pantalla de los prototipos, aprobada en la propuesta P6.
 */
export function Alias({ navegar }) {
  const { estado, guardarPerfil, registrarEvento } = useEstado();
  const desdePerfil = estado.bienvenidaVista;
  const [alias, setAlias] = useState(() => estado.alias || generarAlias());
  const [anonimo, setAnonimo] = useState(estado.anonimo);
  const aliasLimpio = alias.trim();

  const continuar = () => {
    guardarPerfil({ alias: aliasLimpio, anonimo });
    registrarEvento('perfil_guardado', { anonimo });
    navegar(desdePerfil ? '/perfil' : '/');
  };

  return (
    <Pantalla
      titulo="¿Cómo quieres que te llamemos?"
      subtitulo="Puedes usar un alias. Tu nombre real no se muestra ni se envía a la IA."
      alVolver={() => navegar(desdePerfil ? '/perfil' : '/bienvenida')}
      pie={
        <Boton anchoCompleto disabled={!aliasLimpio} onClick={continuar}>
          {desdePerfil ? 'Guardar' : 'Continuar'}
        </Boton>
      }
    >
      <div className={`${comun.tarjeta} ${estilos.tarjetaAlias}`}>
        <AvatarPixel alias={aliasLimpio} />
        <label htmlFor="alias" className={comun.secundario} style={{ fontWeight: 600 }}>
          Tu alias
        </label>
        <input
          id="alias"
          className={estilos.campoAlias}
          value={alias}
          maxLength={24}
          autoComplete="off"
          onChange={(e) => setAlias(e.target.value)}
        />
        <button type="button" className={comun.enlaceAccion} onClick={() => setAlias(generarAlias(alias))}>
          <IconoRegenerar tamano={18} /> Generar otro alias
        </button>
      </div>

      <Interruptor
        titulo="Modo anónimo"
        descripcion="Los tutores te verán con tu alias. Puedes cambiarlo en tu perfil."
        activo={anonimo}
        alCambiar={setAnonimo}
      />

      <p className={`${comun.secundario} ${estilos.nota}`}>
        <IconoCandado tamano={18} /> Puedes ver y borrar tus datos cuando quieras.
      </p>
    </Pantalla>
  );
}
