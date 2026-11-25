/*
 * Service worker de la PWA.
 * - Guarda la aplicación en el dispositivo para que cargue al instante y funcione sin conexión.
 * - Navegación: intenta la red y, si no hay conexión, sirve la versión guardada.
 * - Resto de ficheros propios: sirve la copia guardada y la actualiza en segundo plano.
 * - Nunca guarda contenido de otros dominios (vídeos de YouTube, API externas).
 *
 * - Las versiones nuevas esperan a que el alumno pulse "Actualizar" (aviso dentro de la app),
 *   para no cambiar la aplicación a mitad de una lección.
 *
 * Al publicar cambios, sube la versión: así los dispositivos detectan que hay una versión nueva.
 */
const VERSION = 'v5';
const CACHE = `reto480-${VERSION}`;
const ESENCIALES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESENCIALES)));
});

// La app pide activar la versión nueva cuando el alumno pulsa "Actualizar".
self.addEventListener('message', (evento) => {
  if (evento.data === 'activar') self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copia));
          return respuesta;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  evento.respondWith(
    caches.match(request).then((guardada) => {
      const red = fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        })
        .catch(() => guardada);
      return guardada || red;
    }),
  );
});
