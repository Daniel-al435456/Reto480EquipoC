/*
 * Iconos en SVG, sin librerías externas. Son decorativos (aria-hidden):
 * el texto o la etiqueta del botón que los acompaña es lo que lee el lector de pantalla.
 */
function Icono({ children, tamano = 24 }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconoInicio = (p) => (
  <Icono {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
  </Icono>
);

export const IconoProgreso = (p) => (
  <Icono {...p}>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h4a4 4 0 0 0 4-4V8" />
  </Icono>
);

export const IconoTutor = (p) => (
  <Icono {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </Icono>
);

export const IconoAtras = (p) => (
  <Icono {...p}>
    <path d="M15 18 9 12l6-6" />
  </Icono>
);

export const IconoReproducir = (p) => (
  <Icono {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" />
  </Icono>
);

export const IconoCheck = (p) => (
  <Icono {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icono>
);

export const IconoSaltar = (p) => (
  <Icono {...p}>
    <path d="m5 5 7 7-7 7" />
    <path d="m12 5 7 7-7 7" />
  </Icono>
);

export const IconoMeta = (p) => (
  <Icono {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </Icono>
);

export const IconoEnviar = (p) => (
  <Icono {...p}>
    <path d="m4 12 16-8-6 16-2.5-6.5L4 12Z" />
  </Icono>
);

export const IconoAudio = (p) => (
  <Icono {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
  </Icono>
);

export const IconoSinAudio = (p) => (
  <Icono {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="m17 9 4 6M21 9l-4 6" />
  </Icono>
);

export const IconoReloj = (p) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icono>
);

export const IconoCerrar = (p) => (
  <Icono {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icono>
);

export const IconoPerfil = (p) => (
  <Icono {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icono>
);

export const IconoRegenerar = (p) => (
  <Icono {...p}>
    <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
  </Icono>
);

export const IconoCandado = (p) => (
  <Icono {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icono>
);

export const IconoMas = (p) => (
  <Icono {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

export const IconoFlecha = (p) => (
  <Icono {...p}>
    <path d="m9 18 6-6-6-6" />
  </Icono>
);
