// Servidor estático mínimo para probar la versión compilada (dist/) sin dependencias.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export const DIST = process.env.DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url));

/** Arranca el servidor en un puerto libre y devuelve su dirección y una función para pararlo. */
export async function arrancarServidor() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error(`No existe ${DIST}index.html. Ejecuta antes "npm run build".`);
  }
  const servidor = createServer((peticion, respuesta) => {
    const ruta = normalize(decodeURIComponent(new URL(peticion.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let fichero = join(DIST, ruta);
    if (!existsSync(fichero) || statSync(fichero).isDirectory()) fichero = join(DIST, 'index.html');
    respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(fichero)] ?? 'application/octet-stream' });
    createReadStream(fichero).pipe(respuesta);
  });
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  const { port } = servidor.address();
  return { url: `http://127.0.0.1:${port}/`, parar: () => new Promise((r) => servidor.close(r)) };
}
