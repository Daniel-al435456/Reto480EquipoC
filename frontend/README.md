<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](../docs/decisiones.md) · [Propuestas](../propuestas/README.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Frontend · React PWA

Aplicación del alumno, diseñada primero para el móvil e instalable como PWA.

## Puesta en marcha

Requisito: Node.js 22 o superior (`node -v`).

```bash
cd frontend
npm install
npm run dev
```

- **En el ordenador:** abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).
- **En el móvil:** conectado a la misma Wi-Fi, abre la dirección "Network" que muestra la terminal.

Comprobaciones (detalle en "Pruebas"):

```bash
npx playwright install chromium   # solo la primera vez: navegador para las pruebas
npm test                          # pruebas unitarias y de arquitectura (menos de un segundo)
npm run verificar                 # todo: pruebas, compilación y pruebas en navegador
```

Compilación para producción:

```bash
npm run build     # genera la carpeta dist/
npm run preview   # sirve dist/ para probar la versión final, con service worker
```

## Pantallas

Siguen el boceto de la sesión 1 ([SPEC §2](../SPEC.md#2-flujo-del-alumno)), más el previo de los modos de estudio ([SPEC §10](../SPEC.md#10-idea-original)). El aspecto visual sigue los prototipos de la paleta "Grafito 480" claro.

**Sin sesión** (pantallas públicas):

| Pantalla | Ruta | Fichero |
|---|---|---|
| Bienvenida: crear cuenta o iniciar sesión | `#/bienvenida` | `src/pantallas/Bienvenida.jsx` |
| Crear cuenta (paso 1 de 4) | `#/registro` | `src/pantallas/Registro.jsx` |
| Iniciar sesión | `#/entrar` | `src/pantallas/Entrar.jsx` |
| Privacidad, cookies y aviso legal | `#/legal/privacidad`, `#/legal/cookies`, `#/legal/aviso-legal` | `src/pantallas/Legal.jsx` |

**Alta** (después de crear la cuenta, sin barra inferior):

| Pantalla | Ruta | Fichero |
|---|---|---|
| Fecha de nacimiento (paso 2) | `#/edad` | `src/pantallas/Edad.jsx` |
| Consentimiento de la familia (menores de 14 años) | `#/consentimiento` | `src/pantallas/Consentimiento.jsx` |
| Alias anónimo con avatar de píxeles (paso 3) | `#/alias` | `src/pantallas/Alias.jsx` |
| Preferencias: mentor (forma, personalidad y trato), tema, tamaño del texto y mentor con IA (paso 4) | `#/preferencias` | `src/pantallas/Preferencias.jsx` |

**Con sesión:**

| Pantalla | Ruta | Fichero |
|---|---|---|
| Hoy: lleva al alumno al punto en el que se quedó | `#/` | `src/pantallas/Inicio.jsx` |
| Selección de curso | `#/cursos` | `src/pantallas/SeleccionCurso.jsx` |
| Test inicial (`/test/repetir` para hacerlo de nuevo) | `#/curso/:id/test` | `src/pantallas/TestInicial.jsx` |
| Modos de estudio: "¿Cómo quieres estudiar hoy?" | `#/curso/:id/hoy` | `src/pantallas/PrevioSesion.jsx` |
| Ficha de una lección: estudiarla o repasarla cuando se quiera | `#/curso/:id/leccion/:leccion` | `src/pantallas/Leccion.jsx` |
| Vídeo (o lectura sin audio) | `#/curso/:id/sesion/:paso` | `src/pantallas/Video.jsx` |
| Actividades | `#/curso/:id/sesion/:paso` | `src/pantallas/Actividades.jsx` |
| Mentor | `#/mentor` | `src/pantallas/Mentor.jsx` |
| Progreso | `#/progreso` | `src/pantallas/Progreso.jsx` |
| Perfil: resumen, cursos y acceso a los ajustes | `#/perfil` | `src/pantallas/Perfil.jsx` |
| Mi cuenta: alias, datos personales y datos fijos de la cuenta | `#/perfil/cuenta` | `src/pantallas/PerfilCuenta.jsx` |
| Tu mentor: forma, personalidad y cómo se dirige al alumno | `#/perfil/mentor` | `src/pantallas/PerfilMentor.jsx` |
| Apariencia: texto, tema, contraste y animaciones | `#/perfil/apariencia` | `src/pantallas/Ajustes.jsx` |
| Seguridad: contraseña, cerrar sesión y eliminar cuenta | `#/perfil/seguridad` | `src/pantallas/PerfilSeguridad.jsx` |
| Privacidad y datos: mentor con IA, descarga y borrado | `#/perfil/privacidad` | `src/pantallas/PerfilPrivacidad.jsx` |

Sin sesión, cualquier ruta privada lleva a la bienvenida; con la alta a medias, al paso pendiente (`destinoInicio` y `rutaPermitida` en `src/api/acceso.js`).

Las pantallas de bienvenida, alias y perfil proceden de los prototipos y se aprobaron en la [propuesta P6](../propuestas/README.md#p6-pantallas-de-bienvenida-alias-y-perfil).

La barra inferior tiene cuatro pestañas (Hoy, Progreso, Mentor y Perfil) y se oculta en las pantallas públicas, en la alta y en las de concentración (test y sesión). En el escritorio se convierte en un menú lateral.

## Qué incluye

**Modos de estudio.** Antes de cada sesión, el alumno indica el tiempo disponible (5, 10 o 20 minutos) y si puede escuchar audio. Con audio la lección es un vídeo; sin audio, una lectura. Si no cabe una lección completa, se propone un resumen rápido con sus actividades. La lógica está en `src/api/planificador.js` y no usa IA.

**El alumno decide.** El test y el planificador proponen qué estudiar, pero el alumno tiene la última palabra:
- En el resultado del test puede incluir en sus sesiones un tema que ya domina ("Prefiero estudiarlo") y deshacerlo después.
- Desde Progreso puede abrir cualquier lección, aunque ya la domine o la haya completado, y estudiarla o repasarla con vídeo o con lectura, o hacer solo sus actividades.
- Puede repetir el test inicial cuando quiera desde Progreso.

**Seguimiento continuo.** Cada respuesta, vídeo o sesión se registra como evento (`useEstado` → `registrarEvento`). La pantalla de progreso muestra las lecciones superadas y el porcentaje de aciertos.

**Mentor proactivo.** Tras dos fallos en las actividades de una lección, el mentor interviene sin que el alumno lo pida. El alumno también puede preguntar o pedir un tutor de la academia.

**Mentor desde cualquier pantalla** (historia H9). Un botón flotante con el símbolo de IA abre el mentor desde cualquier pantalla, salvo en la alta, en el test inicial (para no condicionar el resultado) y en los formularios del perfil. Si el alumno está en una lección, el chat muestra "Hablando de: [lección]" y envía esa lección al backend como contexto; la etiqueta se puede quitar para preguntar sobre cualquier tema. El chat y el resultado del test avisan cuando el texto lo ha generado la IA.

**Cuenta de usuario.** El alta tiene cuatro pasos:
1. Crear la cuenta: empresa, nombre, apellidos, correo, contraseña y, opcionalmente, puesto o área. Hay que aceptar la política de privacidad.
2. Fecha de nacimiento y, si es menor de 14 años, consentimiento de la familia.
3. Alias y avatar.
4. Preferencias: forma del mentor (pato, pata o solo texto), su personalidad, cómo se dirige al alumno, tema, tamaño del texto y si quiere usar el mentor con IA.

**Qué datos se pueden cambiar después.** Desde Perfil → Mi cuenta el alumno puede cambiar su nombre, apellidos y puesto, y desde otras secciones su alias, el modo anónimo, la apariencia, el mentor con IA y la contraseña (pidiendo la actual). Estos datos se fijan en el alta y solo puede corregirlos la academia; el perfil los muestra con un candado:
- Correo: es el usuario para iniciar sesión y cambiarlo exige verificar el nuevo, lo que necesita el backend.
- Empresa: relaciona al alumno con la formación que contrata su empresa.
- Fecha de nacimiento y consentimiento de la familia: de ellos dependen las protecciones para menores, así que el alumno no puede cambiarlos para saltárselas.

La regla está en `CAMPOS_EDITABLES` (`src/api/cuenta.js`), que también impide cambiarlos aunque se fuerce la acción, y en `src/api/acceso.js`, que no deja volver a las pantallas de edad, consentimiento y preferencias del alta ni a la bienvenida, el registro o el inicio de sesión con la sesión iniciada. El registro avisa en el campo de empresa y en el del correo de que no se podrán cambiar.

Mientras no haya backend, la cuenta se guarda solo en el dispositivo. La contraseña nunca se guarda: se guarda su resumen SHA-256 (`src/api/cuenta.js`). Las contraseñas deben tener al menos 8 caracteres, con una letra y un número. "¿Has olvidado tu contraseña?" solo muestra un aviso hasta que el backend pueda enviar correos.

**Perfil por secciones.** El perfil muestra el nombre (o el alias en modo anónimo), los cursos y las filas de ajustes:
- Mi cuenta: alias, datos personales editables (nombre, apellidos y puesto) y datos fijos de la cuenta (correo, empresa, fecha de nacimiento, consentimiento y fecha de alta).
- Tu mentor: forma, personalidad y cómo se dirige al alumno.
- Apariencia: tamaño del texto, tema, contraste y animaciones.
- Modo de estudio habitual.
- Seguridad: cambiar la contraseña (pide la actual), cerrar sesión y eliminar la cuenta, con confirmación.
- Privacidad y datos: activar o desactivar el mentor con IA, qué datos usa la IA, descargar mis datos en JSON (sin la contraseña) y borrar el historial del mentor.

**Bienvenida.** Las ventajas de la app (aprendizaje personalizado, mentor con IA y tutor personal, material adaptado, sesiones de 5 a 20 minutos y sin repetir lo que ya sabe) giran alrededor del círculo de marca en una órbita en perspectiva. La que pasa por delante muestra su nombre y se explica debajo. Gira sola despacio y se puede girar arrastrando con el dedo o el ratón, con inercia. Con "reducir movimiento" no gira sola. El lector de pantalla recibe la lista completa de ventajas (`src/componentes/Orbita.jsx`).

**Páginas legales.** Privacidad, cookies y aviso legal, enlazadas en el pie de la bienvenida, del perfil y de la privacidad. Son borradores basados en la [propuesta P3](../propuestas/datos-y-privacidad.md): los datos de 480 Academy (razón social, NIF, dirección y contacto) aparecen entre corchetes y resaltados hasta que los confirme la academia, y el texto final debe revisarlo la academia.

**Mentor con forma de pato.** El alumno elige en el alta o en Perfil → Tu mentor si el mentor aparece como pato (con gafas cian), pata (con lazo coral) o solo texto. El pato respira, parpadea y de vez en cuando se mira la cola; mientras el mentor escribe, el texto aparece letra a letra y el pico se abre en las vocales y se cierra al terminar. Con "reducir movimiento" el pato queda quieto y el texto aparece completo. El lector de pantalla siempre recibe el texto completo.
- `src/componentes/Pato.jsx`: dibuja el pato y sus animaciones de reposo.
- `src/componentes/TextoTecleado.jsx`: texto letra a letra.
- `src/componentes/ElegirMentor.jsx`: selector de forma del mentor.
- `src/api/pato.js`: dibujos del pato en píxeles (32 × 32). No se edita a mano: se genera con `python3 herramientas/pato.py` (con `--hoja` guarda además una imagen de todas las caras para revisarlas; requiere Pillow).

**Personalidad del mentor y trato.** El alumno elige la personalidad del mentor (amable, motivador, gracioso o estricto) y si quiere que se dirija a él en femenino, en masculino o de forma neutra. Se envían al backend junto a cada consulta (`contextoIA` en `src/api/mentor.js`) para que el mentor redacte con ese tono; sin backend, las respuestas de ejemplo usan las frases de `frasesMentor`.

**Mentor con IA opcional.** Si el alumno desactiva el mentor con IA, desaparece el botón flotante, el mentor no interviene en las actividades y la pantalla del mentor ofrece hablar con un tutor de la academia o volver a activarlo.

**Ajustes del alumno** (Perfil → Apariencia). Se aplican al momento y se guardan en el dispositivo:
- Tamaño del texto: normal, grande o muy grande. Todo el diseño usa `rem`, así que escala por completo.
- Tema: automático (el del dispositivo), claro u oscuro.
- Contraste: normal o alto (textos secundarios más oscuros, bordes más marcados y foco más grueso).
- Animaciones: automáticas (según "reducir movimiento" del dispositivo) o reducidas.

Se aplican con atributos en `<html>` (`data-tema`, `data-texto`, `data-contraste`, `data-movimiento`) que leen las variables de `src/estilos/variables.css`. `index.html` los aplica antes de cargar la app para que no haya parpadeos. Al eliminar la cuenta se borra todo salvo estos ajustes.

**Menores de edad** ([propuesta P3](../propuestas/datos-y-privacidad.md#3-menores-de-edad)). Durante el alta, el alumno indica su fecha de nacimiento, que el modelo de datos guarda en `Identidad`. Con ella el tramo (18 o más, 14 a 17, menos de 14) se calcula cada vez (`src/api/edad.js`), así que cambia solo cuando el alumno cumple 14 o 18 años. Al backend de IA solo llega si es menor o no, para que el mentor adapte el tono. Con menos de 14 años, la app pide el consentimiento de la madre, el padre o el tutor legal antes de continuar. En el prototipo no se envía ningún correo ni se guarda la dirección: solo se registra la fecha del consentimiento, que aparece en el perfil.

**Diseño.** Paleta "Grafito 480" (grafito, cian, verde y coral de la marca), tipografías Plus Jakarta Sans y JetBrains Mono (desde Google Fonts; sin conexión se usa la fuente del sistema), botones de 56 px, tarjetas blancas, tarjetas destacadas en grafito y barras de progreso por segmentos. El cian de marca solo se usa como fondo con texto oscuro; para textos y enlaces se usa un cian oscurecido que cumple el contraste.

**PWA:**
- `public/manifest.webmanifest`: nombre, colores, iconos y accesos directos (mantener pulsado el icono: Lección de hoy, Mentor y Mi progreso).
- `public/sw.js`: service worker que guarda la aplicación en el dispositivo; carga al instante y funciona sin conexión.
- `public/icons/`: iconos normales y "maskable" (Android), icono para iPhone y favicon.
- **Instalar:** en Android y en el escritorio con Chrome o Edge, botón "Instalar" (aviso en la pantalla de inicio, una vez, y fila en el perfil). En iPhone, Safari no permite el botón, así que el perfil explica cómo añadirla a la pantalla de inicio. Si ya está instalada, no se muestra.
- **Actualizar:** al publicar una versión nueva (subir `VERSION` en `sw.js`), la app avisa "Hay una versión nueva" y se actualiza al pulsar el botón, nunca a mitad de una lección.
- **Sin conexión:** aviso visible cuando se pierde la conexión.
- **Pantalla de carga** con el logotipo mientras se descarga la app (en `index.html`), y **pantalla de error** con opciones si algo falla (`LimiteErrores`), para que la app nunca se quede en blanco.
- Para instalarla desde el móvil hace falta HTTPS: usar la versión publicada (ver "Publicación"). El código de PWA está en `src/pwa.js` y `src/hooks/usePwa.js`.

**Todos los dispositivos:**
- Diseño mobile-first: una columna en el móvil y una columna centrada en tableta y escritorio.
- Acciones principales y navegación en la parte inferior, al alcance del pulgar.
- Escritorio (desde 1024 px): menú lateral en lugar de la barra inferior y contenido centrado.
- Zonas seguras de pantallas con notch, modo horizontal y modo oscuro automático o elegido por el alumno.

**Accesibilidad:**
- HTML semántico, idioma `es`, un `h1` por pantalla y título de pestaña actualizado.
- Al cambiar de pantalla, el foco va al encabezado para que el lector de pantalla la anuncie.
- Enlace "Saltar al contenido", navegación completa con teclado y foco siempre visible.
- Formularios con etiquetas, grupos de opciones con `fieldset`/`legend` y resultados anunciados con `aria-live`.
- Contraste AA, áreas táctiles de al menos 44 px, texto ampliable y respeto a "reducir movimiento".
- El color nunca es la única pista: cada estado lleva también texto.

**Rendimiento en 4G:**
- Sin librerías de rutas ni de componentes: unos 80 KB de JavaScript comprimido en total.
- El reproductor de YouTube solo se carga al pulsar "reproducir", desde el dominio sin cookies.

## Datos y conexión con el backend

- `src/api/datos.js`: curso de ejemplo *Python desde cero* ([propuesta P4](../propuestas/README.md#p4-contenido-del-curso-de-muestra)), con los 15 primeros vídeos del [curso de La Geekipedia De Ernesto](https://www.youtube.com/playlist?list=PLyvsggKtwbLW1j0d5yaCkRF9Axpdlhsxz), cortados en 53 lecciones de unos 5 minutos (cada lección es un trozo de un vídeo, con su inicio y su fin en segundos). El backend sirve una copia en JSON: si cambia este fichero, se regenera con `node herramientas/exportar-curso.mjs`.
- `src/api/cliente.js`: única capa de acceso a datos. Las pantallas nunca llaman a `fetch` ni a la IA directamente.
- `obtenerCursoCompleto` carga el curso y sus lecciones desde la API. Si no hay backend, se conserva `datos.js` como respaldo para la demo.

Esta conexión es un paso intermedio: el backend todavía lee el curso del JSON de ejemplo. La conexión del servicio a PostgreSQL queda para una fase posterior y no forma parte de este contrato.
- La cuenta, el progreso, los ajustes, el alias y el modo anónimo se guardan en el navegador (`localStorage`, clave `reto480-estado-v3`). Si se cambia la forma de los datos guardados, hay que subir la versión de la clave en `src/hooks/useEstado.jsx` y en `index.html`.

**Conectar el backend.** Con el backend en marcha (`backend/README.md`), crear el fichero `frontend/.env.local`, que no se sube al repositorio, con:

```
VITE_API_URL=/
```

y arrancar el frontend con `npm run dev`. Con `/`, el servidor de desarrollo de Vite reenvía `/api` y `/salud` al backend en `http://localhost:8000` (`vite.config.js`; otra dirección, con la variable `BACKEND_URL`). Así no hay problemas de CORS y funciona también desde el móvil en la misma Wi-Fi. En una versión publicada (Netlify), `VITE_API_URL` es la dirección completa del backend, que debe permitir por CORS la del frontend (`FRONTEND_URL` en el backend).

Al arrancar, la app comprueba una vez si el backend responde en `/salud` (3 segundos como máximo). Si no responde, o si no hay `VITE_API_URL`, usa los datos de ejemplo y las respuestas simuladas, y la pantalla del mentor avisa de que no hay conexión. Así la demo nunca se queda sin respuesta. Si una petición falla, se usa la respuesta simulada y el error del backend (`{ error, mensaje }`) se anota en la consola del navegador.

**Contrato de la API.** Todas las rutas devuelven JSON y están implementadas en el backend (`backend/README.md`, "Rutas"):

| Función de `cliente.js` | Petición | Cuerpo | Respuesta |
|---|---|---|---|
| `obtenerCursos` | `GET /api/cursos` | | `{ cursos: [{ id, titulo, descripcion, nivel, numeroLecciones }] }` |
| `obtenerCursoCompleto` | `GET /api/cursos/{id}/lecciones` | | `{ id, titulo, descripcion, nivel, lecciones: [...] }` (lecturas, vídeos, duraciones y actividades; sin preguntas del test inicial). Cada lección lleva su trozo de vídeo: `inicioS` y, si no llega al final, `finS`, en segundos |
| `obtenerTestInicial` | `GET /api/cursos/{id}/test` | | `{ preguntas: [{ id, leccionId, enunciado, opciones }] }` (sin la respuesta correcta) |
| `evaluarTestInicial` | `POST /api/cursos/{id}/test/evaluacion` | `{ respuestas, esMenor, personalidad, tratamiento }` | `{ dominio: { leccionId: true }, mensaje, redactadoPorIa }` (con la #16, el mensaje lo redacta el agente Diagnóstico; mientras, es una plantilla y `redactadoPorIa` es `false`) |
| `corregirRespuestaEscrita` | `POST /api/actividades/correccion` | `{ actividadId, texto, esMenor, personalidad, tratamiento }` | `{ correcta, solucion, comentario?, redactadoPorIa? }`. Con IA, `comentario` explica la corrección |
| `mensajeProactivoMentor` | `POST /api/mentor/proactivo` | `{ cursoId, leccionId, senal, esMenor, personalidad, tratamiento, progreso }` | `{ texto }` |
| `preguntarMentor` | `POST /api/mentor/mensaje` | `{ cursoId, leccionId, texto, esMenor, personalidad, tratamiento, historial, progreso }`. `historial`: últimos mensajes `{ autor, texto }`; `progreso`: `{ dominadas, completadas }` (identificadores de lecciones) | `{ texto, derivado, leccionId?, leccionTitulo? }`. Si llega `leccionId`, el mentor propone abrir esa lección y se muestra un botón |
| `solicitarTutorHumano` | `POST /api/mentor/derivacion` | `{ cursoId, leccionId }` | `{ texto }` |

La IA está en el backend ([propuesta P1](../propuestas/README.md#p1-agentes-de-ia)): Claude prepara el contenido una vez por vídeo y Groq redacta el diagnóstico y responde como mentor. Las claves de la IA nunca llegan al frontend.

## Pruebas

Se usan el ejecutor de pruebas de Node (`node:test`) y Playwright, sin más dependencias.

| Carpeta | Qué comprueba |
|---|---|
| `pruebas/unitarias/` | Reglas de negocio en funciones puras de `src/api/`: acceso y alta, edad y menores (incluido el cambio de tramo al cumplir años), datos de la cuenta, contraseñas, personalidad y trato del mentor, datos que llegan a la IA y planificador de sesión (historias H2 a H5). También reglas de arquitectura: solo `src/api/` usa la red, no hay claves ni llamadas a proveedores de IA, no hay dependencias nuevas y la clave del estado coincide con `index.html`. |
| `pruebas/e2e/` | La app compilada en Chromium con tamaño de móvil: alta de un adulto y de un menor de 14 años, fecha de nacimiento futura, respuesta del mentor con la personalidad elegida, datos que no se pueden cambiar, cierre e inicio de sesión, funcionamiento sin conexión, accesibilidad básica de las pantallas públicas y peso del JavaScript (menos de 200 KB comprimido). |

`npm run verificar` las ejecuta todas tras compilar, y GitHub Actions lo repite en cada pull request (`.github/workflows/frontend.yml`). Una regla de negocio nueva se escribe como función pura en `src/api/` y se prueba en `pruebas/unitarias/`.

## Estructura

```
frontend/
├── index.html
├── herramientas/        # script de diseño del pato (genera src/api/pato.js)
├── pruebas/             # unitarias (node:test) y en navegador (Playwright)
├── public/              # manifest, service worker e iconos
└── src/
    ├── main.jsx         # arranque
    ├── pwa.js           # instalación, actualizaciones y service worker
    ├── App.jsx          # rutas y estructura general
    ├── pantallas/       # una por pantalla del flujo
    ├── componentes/     # piezas reutilizables
    ├── api/             # datos de ejemplo, cliente de API, reglas de acceso y cuenta, planificador y dibujos del pato
    ├── hooks/           # navegación, estado del alumno, ajustes y PWA
    └── estilos/         # variables de diseño (colores, tipografía, espaciado)
```

Los colores y la tipografía están en `src/estilos/variables.css`, para ajustarlos al diseño sin tocar los componentes.

## Publicación

La navegación usa rutas con `#`, así que funciona en cualquier alojamiento estático sin configuración extra. Por ejemplo, en Netlify:
- Directorio base: `frontend`
- Comando de compilación: `npm run build`
- Carpeta publicada: `dist` (dentro del directorio base)
- Variable de entorno (cuando haya backend publicado): `VITE_API_URL`, con la dirección completa del backend
