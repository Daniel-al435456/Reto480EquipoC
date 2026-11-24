import estilos from './Boton.module.css';

/**
 * Botón accesible con área táctil mínima de 44 px.
 * variante: "primario" | "secundario" | "texto"
 */
export function Boton({ variante = 'primario', anchoCompleto = false, className = '', ...props }) {
  const clases = [estilos.boton, estilos[variante], anchoCompleto ? estilos.anchoCompleto : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={clases} {...props} />;
}
