// Tests de arquitectura: convierten en comprobaciones automáticas las reglas de AGENTS.md.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(RAIZ, 'src');

function ficheros(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? ficheros(ruta) : [ruta];
  });
}
const codigo = ficheros(SRC).filter((f) => /\.(jsx?|css)$/.test(f));
const leer = (f) => readFileSync(f, 'utf8');
const nombre = (f) => relative(RAIZ, f);

describe('arquitectura del frontend', () => {
  it('solo src/api/ hace peticiones de red: las pantallas y componentes no llaman a fetch', () => {
    const infractores = codigo
      .filter((f) => !nombre(f).startsWith(join('src', 'api')))
      .filter((f) => /\bfetch\s*\(|XMLHttpRequest/.test(leer(f)));
    assert.deepEqual(infractores.map(nombre), []);
  });

  it('el frontend nunca llama a un proveedor de IA ni contiene claves', () => {
    const patrones = [/api\.anthropic\.com/, /api\.groq\.com/, /\bsk-[A-Za-z0-9_-]{16,}/, /\bgsk_[A-Za-z0-9]{16,}/];
    const infractores = codigo.filter((f) => patrones.some((p) => p.test(leer(f))));
    assert.deepEqual(infractores.map(nombre), []);
  });

  it('src/api/ no depende de React, para poder probar sus reglas', () => {
    const infractores = codigo
      .filter((f) => nombre(f).startsWith(join('src', 'api')))
      .filter((f) => /from 'react'|\.jsx'/.test(leer(f)));
    assert.deepEqual(infractores.map(nombre), []);
  });

  it('no se añaden dependencias de ejecución sin acuerdo: solo React', () => {
    const paquete = JSON.parse(leer(join(RAIZ, 'package.json')));
    assert.deepEqual(Object.keys(paquete.dependencies).sort(), ['react', 'react-dom']);
  });

  it('cada componente o pantalla tiene menos de 300 líneas', () => {
    const largos = codigo
      .filter((f) => f.endsWith('.jsx'))
      .map((f) => [nombre(f), leer(f).split('\n').length])
      .filter(([, lineas]) => lineas > 300);
    assert.deepEqual(largos, []);
  });

  it('la clave del estado guardado es la misma en el hook y en index.html', () => {
    const clave = leer(join(SRC, 'hooks', 'useEstado.jsx')).match(/const CLAVE = '([^']+)'/)[1];
    assert.ok(leer(join(RAIZ, 'index.html')).includes(clave), `index.html no usa ${clave}`);
  });
});
