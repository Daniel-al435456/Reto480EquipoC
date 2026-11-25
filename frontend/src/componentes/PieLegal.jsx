import estilos from './PieLegal.module.css';

const ENLACES = [
  ['privacidad', 'Privacidad'],
  ['cookies', 'Cookies'],
  ['aviso-legal', 'Aviso legal'],
];

/** Enlaces a las páginas legales: política de privacidad, política de cookies y aviso legal. */
export function PieLegal({ navegar }) {
  return (
    <nav className={estilos.pie} aria-label="Información legal">
      {ENLACES.map(([ruta, texto]) => (
        <a
          key={ruta}
          href={`#/legal/${ruta}`}
          onClick={(e) => {
            e.preventDefault();
            navegar(`/legal/${ruta}`);
          }}
        >
          {texto}
        </a>
      ))}
    </nav>
  );
}
