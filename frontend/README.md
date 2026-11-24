<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](../docs/decisiones.md) · [Propuestas](../propuestas/README.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Frontend · React PWA

Aplicación del alumno, diseñada primero para el móvil e instalable como PWA.

## Puesta en marcha

Requisito: Node.js 20.19 o superior (`node -v`).

```bash
cd frontend
npm install
npm run dev
```

- **En el ordenador:** abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).
- **En el móvil:** conectado a la misma Wi-Fi, abre la dirección "Network" que muestra la terminal.

Compilación para producción:

```bash
npm run build     # genera la carpeta dist/
npm run preview   # sirve dist/ para probar la versión final, con service worker
```

## Pantallas

Siguen el boceto de la sesión 1 ([SPEC §2](../SPEC.md#2-flujo-del-alumno)), más el previo de los modos de estudio ([SPEC §10](../SPEC.md#10-idea-original)). El aspecto visual sigue los prototipos de la paleta "Grafito 480" claro.

| Pantalla | Ruta | Fichero |
|---|---|---|
| Hoy: lleva al alumno al punto en el que se quedó | `#/` | `src/pantallas/Inicio.jsx` |
| Bienvenida (primera vez) | `#/bienvenida` | `src/pantallas/Bienvenida.jsx` |
| Alias anónimo con avatar de píxeles | `#/alias` | `src/pantallas/Alias.jsx` |
| Selección de curso | `#/cursos` | `src/pantallas/SeleccionCurso.jsx` |
| Test inicial (`/test/repetir` para hacerlo de nuevo) | `#/curso/:id/test` | `src/pantallas/TestInicial.jsx` |
| Modos de estudio: "¿Cómo quieres estudiar hoy?" | `#/curso/:id/hoy` | `src/pantallas/PrevioSesion.jsx` |
| Ficha de una lección: estudiarla o repasarla cuando se quiera | `#/curso/:id/leccion/:leccion` | `src/pantallas/Leccion.jsx` |
| Vídeo (o lectura sin audio) | `#/curso/:id/sesion/:paso` | `src/pantallas/Video.jsx` |
| Actividades | `#/curso/:id/sesion/:paso` | `src/pantallas/Actividades.jsx` |
| Tutor | `#/tutor` | `src/pantallas/Tutor.jsx` |
| Progreso | `#/progreso` | `src/pantallas/Progreso.jsx` |
| Perfil | `#/perfil` | `src/pantallas/Perfil.jsx` |

Las pantallas de bienvenida, alias y perfil proceden de los prototipos y se aprobaron en la [propuesta P6](../propuestas/README.md#p6-pantallas-de-bienvenida-alias-y-perfil).

La barra inferior tiene cuatro pestañas (Hoy, Progreso, Tutor y Perfil) y se oculta en las pantallas de concentración: primera vez, test y sesión.

## Qué incluye

**Modos de estudio.** Antes de cada sesión, el alumno indica el tiempo disponible (5, 10 o 20 minutos) y si puede escuchar audio. Con audio la lección es un vídeo; sin audio, una lectura. Si no cabe una lección completa, se propone un resumen rápido con sus actividades. La lógica está en `src/api/planificador.js` y no usa IA.

**El alumno decide.** El test y el planificador proponen qué estudiar, pero el alumno tiene la última palabra:
- En el resultado del test puede incluir en sus sesiones un tema que ya domina ("Prefiero estudiarlo") y deshacerlo después.
- Desde Progreso puede abrir cualquier lección, aunque ya la domine o la haya completado, y estudiarla o repasarla con vídeo o con lectura, o hacer solo sus actividades.
- Puede repetir el test inicial cuando quiera desde Progreso.

**Seguimiento continuo.** Cada respuesta, vídeo o sesión se registra como evento (`useEstado` → `registrarEvento`). La pantalla de progreso muestra las lecciones superadas y el porcentaje de aciertos.

**Tutor proactivo.** Tras dos fallos en las actividades de una lección, el tutor interviene sin que el alumno lo pida. El alumno también puede preguntar o pedir un tutor de la academia.

**Diseño.** Paleta "Grafito 480" (grafito, cian, verde y coral de la marca), tipografías Plus Jakarta Sans y JetBrains Mono (desde Google Fonts; sin conexión se usa la fuente del sistema), botones de 56 px, tarjetas blancas, tarjetas destacadas en grafito y barras de progreso por segmentos. El cian de marca solo se usa como fondo con texto oscuro; para textos y enlaces se usa un cian oscurecido que cumple el contraste.

**PWA:**
- `public/manifest.webmanifest`: nombre, colores e iconos para instalar la aplicación.
- `public/sw.js`: service worker que guarda la aplicación en el dispositivo; carga al instante y funciona sin conexión.
- `public/icons/`: iconos normales y "maskable" (Android), icono para iPhone y favicon.
- Para instalarla desde el móvil hace falta HTTPS: usar la versión publicada (ver "Publicación").

**Todos los dispositivos:**
- Diseño mobile-first: una columna en el móvil y una columna centrada en tableta y escritorio.
- Acciones principales y navegación en la parte inferior, al alcance del pulgar.
- Zonas seguras de pantallas con notch, modo horizontal y modo oscuro automático.

**Accesibilidad:**
- HTML semántico, idioma `es`, un `h1` por pantalla y título de pestaña actualizado.
- Al cambiar de pantalla, el foco va al encabezado para que el lector de pantalla la anuncie.
- Enlace "Saltar al contenido", navegación completa con teclado y foco siempre visible.
- Formularios con etiquetas, grupos de opciones con `fieldset`/`legend` y resultados anunciados con `aria-live`.
- Contraste AA, áreas táctiles de al menos 44 px, texto ampliable y respeto a "reducir movimiento".
- El color nunca es la única pista: cada estado lleva también texto.

**Rendimiento en 4G:**
- Sin librerías de rutas ni de componentes: unos 75 KB de JavaScript comprimido en total.
- El reproductor de YouTube solo se carga al pulsar "reproducir", desde el dominio sin cookies.

## Datos y conexión con el backend

- `src/api/datos.js`: curso de ejemplo *Python desde cero* (pendiente de la [propuesta P4](../propuestas/README.md#p4-contenido-del-curso-de-muestra)). Los vídeos de YouTube están sin seleccionar.
- `src/api/cliente.js`: única capa de acceso a datos. Hoy devuelve datos de ejemplo y **respuestas simuladas** para el test y el tutor, porque la IA está pendiente de la [propuesta P1](../propuestas/README.md#p1-agentes-de-ia). Para conectar el backend basta con cambiar el cuerpo de estas funciones; las pantallas no cambian.
- El progreso, el alias y el modo anónimo se guardan en el navegador (`localStorage`). El botón "Reiniciar la demostración", en Perfil, lo borra todo y vuelve a la bienvenida.

## Estructura

```
frontend/
├── index.html
├── public/              # manifest, service worker e iconos
└── src/
    ├── main.jsx         # arranque y registro del service worker
    ├── App.jsx          # rutas y estructura general
    ├── pantallas/       # una por pantalla del flujo
    ├── componentes/     # piezas reutilizables
    ├── api/             # datos de ejemplo, cliente de API y planificador
    ├── hooks/           # navegación (useRuta) y estado del alumno (useEstado)
    └── estilos/         # variables de diseño (colores, tipografía, espaciado)
```

Los colores y la tipografía están en `src/estilos/variables.css`, para ajustarlos al diseño sin tocar los componentes.

## Publicación

La navegación usa rutas con `#`, así que funciona en cualquier alojamiento estático sin configuración extra. Por ejemplo, en Netlify:
- Directorio base: `frontend`
- Comando de compilación: `npm run build`
- Carpeta publicada: `dist` (dentro del directorio base)
