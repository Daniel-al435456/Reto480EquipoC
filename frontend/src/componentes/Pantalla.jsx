import { useEffect, useRef } from 'react';
import { BarraProgreso } from './BarraProgreso.jsx';
import { IconoAtras, IconoCerrar } from './Iconos.jsx';
import estilos from './Pantalla.module.css';

/**
 * Estructura común de cada pantalla, con el estilo de los prototipos:
 * fila superior (botón volver o cerrar y progreso por segmentos), contenido opcional antes del título
 * (por ejemplo, el vídeo), antetítulo o etiqueta, título y subtítulo.
 * Al mostrarse, actualiza el título de la pestaña y mueve el foco al encabezado,
 * para que el lector de pantalla anuncie la pantalla nueva.
 */
export function Pantalla({
  titulo,
  antetitulo,
  etiqueta,
  subtitulo,
  alVolver,
  textoVolver = 'Volver',
  iconoVolver = 'atras',
  progreso,
  icono,
  antesDelTitulo,
  children,
  pie,
}) {
  const encabezado = useRef(null);

  useEffect(() => {
    document.title = `${titulo} · 480 Academy`;
    encabezado.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [titulo]);

  const IconoBoton = iconoVolver === 'cerrar' ? IconoCerrar : IconoAtras;
  const filaSuperior = alVolver || progreso;

  return (
    <div className={estilos.pantalla}>
      <header className={estilos.cabecera}>
        {filaSuperior && (
          <div className={estilos.filaSuperior}>
            {alVolver && (
              <button type="button" className={estilos.volver} onClick={alVolver} aria-label={textoVolver}>
                <IconoBoton tamano={20} />
              </button>
            )}
            {progreso && (
              <>
                <BarraProgreso valor={progreso.valor} maximo={progreso.maximo} etiqueta={progreso.etiqueta} />
                <span className={estilos.contador} aria-hidden="true">
                  {progreso.valor}/{progreso.maximo}
                </span>
              </>
            )}
          </div>
        )}
        {antesDelTitulo}
        <div className={icono ? estilos.tituloConIcono : estilos.bloqueTitulo}>
          {icono && (
            <span className={estilos.icono} aria-hidden="true">
              {icono}
            </span>
          )}
          <div className={estilos.bloqueTitulo}>
            {antetitulo && <span className={estilos.antetitulo}>{antetitulo}</span>}
            {etiqueta && <span className={estilos.etiqueta}>{etiqueta}</span>}
            <h1 ref={encabezado} tabIndex={-1} className={icono ? estilos.tituloPequeno : undefined}>
              {titulo}
            </h1>
            {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
          </div>
        </div>
      </header>
      <div className={estilos.contenido}>{children}</div>
      {pie && <div className={estilos.pie}>{pie}</div>}
    </div>
  );
}
