// Pruebas de extremo a extremo en un navegador real (Chromium, tamaño de móvil) sobre la versión compilada.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';
import { chromium, devices } from 'playwright';
import { arrancarServidor, DIST } from './servidor.js';

let servidor;
let navegador;

before(async () => {
  servidor = await arrancarServidor();
  navegador = await chromium.launch();
});

after(async () => {
  await navegador?.close();
  await servidor?.parar();
});

/** Abre la app en un móvil nuevo, sin datos guardados, y recoge los errores de JavaScript. */
async function abrir() {
  const contexto = await navegador.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.goto(servidor.url);
  await pagina.getByText('Aprende a tu ritmo.').waitFor();
  return { contexto, pagina, errores };
}

const ruta = (pagina) => pagina.evaluate(() => location.hash.replace(/^#/, ''));
const boton = (pagina, nombre) => pagina.getByRole('button', { name: nombre, exact: true });

/** Crea una cuenta y la lleva hasta el paso de la edad. */
async function crearCuenta(pagina) {
  await boton(pagina, 'Crear cuenta').click();
  await pagina.getByLabel('Empresa').fill('Acme Formación');
  await pagina.getByLabel('Nombre', { exact: true }).fill('Lucía');
  await pagina.getByLabel('Apellidos').fill('García Pérez');
  await pagina.getByLabel('Correo electrónico').fill('lucia@acme.es');
  await pagina.getByLabel('Contraseña', { exact: true }).fill('clave1234');
  await pagina.getByLabel(/política de privacidad/).check();
  await pagina.getByRole('button', { name: 'Crear cuenta' }).last().click();
  await pagina.getByText('¿Cuántos años tienes?').waitFor();
}

/** Completa el alta de un alumno adulto. */
async function completarAlta(pagina) {
  await crearCuenta(pagina);
  await pagina.getByLabel('18 años o más').check();
  await boton(pagina, 'Continuar').click();
  await pagina.getByText('¿Cómo quieres que te llamemos?').waitFor();
  await boton(pagina, 'Continuar').click();
  await pagina.getByText('Hazla a tu medida').waitFor();
  await boton(pagina, 'Empezar a aprender').click();
  await pagina.getByText('Elige un curso').waitFor();
}

describe('alta del alumno', () => {
  it('el registro marca los campos obligatorios vacíos', async () => {
    const { contexto, pagina, errores } = await abrir();
    await boton(pagina, 'Crear cuenta').click();
    await pagina.getByRole('button', { name: 'Crear cuenta' }).last().click();
    assert.equal(await pagina.locator('[aria-invalid="true"]').count() >= 5, true);
    assert.equal(await ruta(pagina), '/registro');
    assert.deepEqual(errores, []);
    await contexto.close();
  });

  it('un adulto completa el alta en cuatro pasos y llega al catálogo', async () => {
    const { contexto, pagina, errores } = await abrir();
    await completarAlta(pagina);
    assert.equal(await ruta(pagina), '/cursos');
    assert.deepEqual(errores, []);
    await contexto.close();
  });

  it('un menor de 14 años necesita el consentimiento de su familia para continuar', async () => {
    const { contexto, pagina } = await abrir();
    await crearCuenta(pagina);
    await pagina.getByLabel('Menos de 14 años').check();
    await boton(pagina, 'Continuar').click();
    await pagina.getByText('Necesitamos el permiso de tu familia').waitFor();
    await pagina.goto(servidor.url + '#/progreso');
    await pagina.waitForTimeout(300);
    assert.equal(await ruta(pagina), '/consentimiento');
    await contexto.close();
  });
});

describe('cuenta y sesión', () => {
  it('el correo y la empresa no se pueden editar, y la edad no se puede volver a elegir', async () => {
    const { contexto, pagina } = await abrir();
    await completarAlta(pagina);
    await pagina.goto(servidor.url + '#/perfil/cuenta');
    await pagina.getByText('Datos de la cuenta').waitFor();
    assert.equal(await pagina.getByLabel('Empresa').count(), 0);
    assert.equal(await pagina.getByLabel('Correo electrónico').count(), 0);
    assert.equal(await pagina.getByLabel('Nombre', { exact: true }).count(), 1);
    for (const destino of ['/edad', '/consentimiento', '/preferencias', '/registro']) {
      await pagina.goto(servidor.url + '#' + destino);
      await pagina.waitForTimeout(200);
      assert.notEqual(await ruta(pagina), destino, destino);
    }
    await contexto.close();
  });

  it('sin sesión no se ve nada privado y la contraseña incorrecta se rechaza', async () => {
    const { contexto, pagina } = await abrir();
    await completarAlta(pagina);
    await pagina.goto(servidor.url + '#/perfil');
    await boton(pagina, 'Cerrar sesión').click();
    await pagina.getByText('Aprende a tu ritmo.').waitFor();
    await pagina.goto(servidor.url + '#/progreso');
    await pagina.waitForTimeout(200);
    assert.equal(await ruta(pagina), '/bienvenida');
    await boton(pagina, 'Iniciar sesión').click();
    await pagina.getByLabel('Correo electrónico').fill('lucia@acme.es');
    await pagina.getByLabel('Contraseña', { exact: true }).fill('otra1234');
    await boton(pagina, 'Iniciar sesión').click();
    await pagina.getByText('El correo o la contraseña no son correctos.').waitFor();
    await pagina.getByLabel('Contraseña', { exact: true }).fill('clave1234');
    await boton(pagina, 'Iniciar sesión').click();
    await pagina.waitForFunction(() => location.hash === '#/cursos');
    await contexto.close();
  });
});

describe('PWA, accesibilidad y rendimiento', () => {
  it('funciona sin conexión una vez cargada', async () => {
    const contexto = await navegador.newContext(devices['Pixel 7']);
    const pagina = await contexto.newPage();
    await pagina.goto(servidor.url);
    // Espera a que el service worker esté activo y haya guardado la app; después recarga para que la controle.
    await pagina.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await pagina.reload();
    await pagina.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 });
    await contexto.setOffline(true);
    await pagina.reload();
    await pagina.getByText('Aprende a tu ritmo.').waitFor();
    await contexto.close();
  });

  it('cada pantalla pública tiene un solo h1 y no hay botones ni campos sin nombre', async () => {
    const { contexto, pagina } = await abrir();
    for (const destino of ['/bienvenida', '/registro', '/entrar', '/legal/privacidad']) {
      await pagina.goto(servidor.url + '#' + destino);
      await pagina.waitForTimeout(200);
      const revision = await pagina.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        botonesSinNombre: [...document.querySelectorAll('button')].filter(
          (b) => !b.textContent.trim() && !b.getAttribute('aria-label'),
        ).length,
        camposSinEtiqueta: [...document.querySelectorAll('input:not([type=hidden])')].filter(
          (i) => !i.labels?.length && !i.getAttribute('aria-label'),
        ).length,
      }));
      assert.deepEqual(revision, { h1: 1, botonesSinNombre: 0, camposSinEtiqueta: 0 }, destino);
    }
    await contexto.close();
  });

  it('el JavaScript inicial pesa menos de 200 KB comprimido (carga en 4G)', () => {
    const carpeta = join(DIST, 'assets');
    const total = readdirSync(carpeta)
      .filter((f) => f.endsWith('.js'))
      .reduce((suma, f) => suma + gzipSync(readFileSync(join(carpeta, f))).length, 0);
    assert.ok(total < 200 * 1024, `${Math.round(total / 1024)} KB`);
  });
});
