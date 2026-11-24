import { patronAvatar } from '../api/perfil.js';
import estilos from './AvatarPixel.module.css';

/** Avatar de píxeles en cian sobre grafito, inspirado en la temática pixel de 480. Es decorativo. */
export function AvatarPixel({ alias, tamano = 'grande' }) {
  return (
    <span className={`${estilos.avatar} ${estilos[tamano]}`} aria-hidden="true">
      {patronAvatar(alias).map((encendido, i) => (
        <span key={i} className={encendido ? estilos.pixel : undefined} />
      ))}
    </span>
  );
}
