// Pruebas de extremo a extremo en un navegador real (Chromium, tamaño de móvil) sobre la versión compilada.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';
import { chromium, devices } from 'playwright';
import { cursos } from '../../src/api/datos.js';
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
  await pagina.getByText('¿Cuándo naciste?').waitFor();
}

/** Indica la fecha de nacimiento (AAAA-MM-DD) y continúa. */
async function indicarNacimiento(pagina, fecha) {
  await pagina.getByLabel('Fecha de nacimiento').fill(fecha);
  await boton(pagina, 'Continuar').click();
}

/** Completa el alta de un alumno adulto. En las preferencias se puede elegir el mentor. */
async function completarAlta(pagina, { personalidad, tratamiento } = {}) {
  await crearCuenta(pagina);
  await indicarNacimiento(pagina, '1990-05-10');
  await pagina.getByText('¿Cómo quieres que te llamemos?').waitFor();
  await boton(pagina, 'Continuar').click();
  await pagina.getByText('Hazla a tu medida').waitFor();
  // El pie fijo con el botón puede tapar las opciones: se pulsan sin depender de la posición en pantalla.
  if (personalidad) await pagina.getByRole('radio', { name: new RegExp(`^${personalidad}`) }).dispatchEvent('click');
  if (tratamiento) await pagina.getByRole('radio', { name: tratamiento, exact: true }).dispatchEvent('click');
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
    await indicarNacimiento(pagina, '2015-03-01');
    await pagina.getByText('Necesitamos el permiso de tu familia').waitFor();
    await pagina.goto(servidor.url + '#/progreso');
    await pagina.waitForTimeout(300);
    assert.equal(await ruta(pagina), '/consentimiento');
    await contexto.close();
  });
});

describe('contenido del curso', () => {
  it('muestra en la lección el contenido recibido desde la API', async () => {
    const { contexto, pagina, errores } = await abrir();
    const curso = structuredClone(cursos[0]);
    curso.lecciones[0].titulo = 'Lección enviada por API';
    curso.lecciones[0].duracionVideo = 9;
    curso.lecciones[0].resumen = 'Resumen enviado por API';
    curso.lecciones[0].actividades[0].enunciado = 'Actividad enviada por API';
    delete curso.testInicial;
    let detalleSolicitado = false;

    await pagina.route('**/salud', (route) =>
      route.fulfill({ json: { estado: 'ok', servicio: 'prueba', version: 'test' } }),
    );
    await pagina.route('**/api/cursos', (route) =>
      route.fulfill({
        json: {
          cursos: [
            {
              id: curso.id,
              titulo: curso.titulo,
              descripcion: curso.descripcion,
              nivel: curso.nivel,
              numeroLecciones: curso.lecciones.length,
            },
          ],
        },
      }),
    );
    await pagina.route('**/api/cursos/python-desde-cero/test', (route) =>
      route.fulfill({
        json: {
          preguntas: cursos[0].testInicial.map(({ id, leccionId, enunciado, opciones }) => ({
            id,
            leccionId,
            enunciado,
            opciones,
          })),
        },
      }),
    );
    await pagina.route('**/api/cursos/python-desde-cero/test/evaluacion', (route) =>
      route.fulfill({ json: { dominio: {}, mensaje: 'Empezamos por el principio.', redactadoPorIa: false } }),
    );
    await pagina.route('**/api/cursos/python-desde-cero/lecciones', (route) => {
      detalleSolicitado = true;
      return route.fulfill({ json: curso });
    });

    await completarAlta(pagina);
    await pagina.getByRole('button', { name: /Python desde cero/ }).click();
    await boton(pagina, 'Empezar el test').click();
    for (let indice = 0; indice < cursos[0].testInicial.length; indice++) {
      await pagina.getByLabel('No lo sé').check();
      await boton(pagina, indice === cursos[0].testInicial.length - 1 ? 'Ver resultado' : 'Siguiente').click();
    }
    await pagina.getByRole('heading', { name: 'Tu punto de partida' }).waitFor();
    await pagina.getByText('Lección enviada por API', { exact: true }).waitFor();

    await pagina.evaluate(() => {
      location.hash = '#/progreso';
    });
    await pagina.getByRole('heading', { name: 'Tu recorrido' }).waitFor();
    await pagina.getByText('Lección enviada por API', { exact: true }).waitFor();
    await boton(pagina, 'Continuar con Lección enviada por API').click();
    await pagina.getByText('Resumen rápido', { exact: true }).waitFor();
    await boton(pagina, 'Empezar · 3 min').click();
    await pagina.getByText('Resumen enviado por API', { exact: true }).waitFor();
    await boton(pagina, 'Continuar con las actividades').click();
    await pagina.getByText('Actividad enviada por API', { exact: true }).waitFor();

    assert.equal(detalleSolicitado, true);
    assert.deepEqual(errores, []);
    await contexto.close();
  });
});

describe('alta: fecha de nacimiento', () => {
  it('no acepta una fecha de nacimiento futura', async () => {
    const { contexto, pagina } = await abrir();
    await crearCuenta(pagina);
    await indicarNacimiento(pagina, '2099-01-01');
    await pagina.getByText('La fecha no puede ser posterior a hoy.').waitFor();
    assert.equal(await ruta(pagina), '/edad');
    await contexto.close();
  });
});

describe('mentor', () => {
  it('responde con la personalidad y el trato elegidos en el alta', async () => {
    const { contexto, pagina, errores } = await abrir();
    await completarAlta(pagina, { personalidad: 'Gracioso', tratamiento: 'Femenino' });
    await pagina.goto(servidor.url + '#/mentor');
    await pagina.locator('#pregunta-mentor').fill('¿Qué es una variable?');
    await pagina.keyboard.press('Enter');
    // El texto aparece letra a letra; el lector de pantalla recibe la respuesta completa desde el principio.
    await pagina.getByText(/Cuac, esta me la sé/).first().waitFor({ state: 'attached', timeout: 15000 });
    assert.deepEqual(errores, []);
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

describe('vídeo por trozos', () => {
  it('el vídeo se para al final del trozo de la lección y se puede volver a ver', async () => {
    const { contexto, pagina, errores } = await abrir();
    // Reproductor de YouTube simulado: informa del tiempo como el de verdad y anota las órdenes que recibe.
    const ordenes = [];
    pagina.on('console', (m) => m.text().startsWith('YT ') && ordenes.push(m.text()));
    await contexto.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 204 }));
    await contexto.route('https://www.youtube-nocookie.com/**', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: `<script>
          let t = 205, empezado = false;
          addEventListener('message', (e) => {
            const d = JSON.parse(e.data);
            console.log('YT ' + (d.func || d.event) + ' ' + JSON.stringify(d.args || []));
            if (d.func === 'seekTo') t = d.args[0];
            if (d.event === 'listening' && !empezado) {
              empezado = true;
              setInterval(() => { t += 3; parent.postMessage(JSON.stringify({ event: 'infoDelivery', info: { currentTime: t } }), '*'); }, 100);
            }
          });
        </script>`,
      }),
    );

    await completarAlta(pagina);
    await pagina.getByRole('button', { name: /Python desde cero/ }).click();
    await boton(pagina, 'Empezar el test').click();
    for (let indice = 0; indice < cursos[0].testInicial.length; indice++) {
      await pagina.getByLabel('No lo sé').check();
      await boton(pagina, indice === cursos[0].testInicial.length - 1 ? 'Ver resultado' : 'Siguiente').click();
    }
    await boton(pagina, 'Empezar la lección de hoy').click();
    await pagina.getByRole('button', { name: /^Empezar · / }).click();
    await pagina.getByText('Este trozo va del principio al 3:34 del vídeo.').waitFor();
    await pagina.getByRole('button', { name: /Reproducir vídeo/ }).click();

    const fin = cursos[0].lecciones[0].finS;
    assert.match(await pagina.locator('iframe').getAttribute('src'), new RegExp(`enablejsapi=1.*&end=${fin}`));
    await pagina.getByText('Has terminado este trozo del vídeo.').waitFor({ timeout: 10000 });
    assert.ok(ordenes.some((o) => o.startsWith('YT pauseVideo')));
    await boton(pagina, 'Volver a verlo').click();
    await pagina.getByText('Has terminado este trozo del vídeo.').waitFor({ state: 'detached' });
    // Los mensajes de la consola del reproductor llegan con un pequeño retraso.
    const vuelveAlInicio = `YT seekTo [${cursos[0].lecciones[0].inicioS},true]`;
    for (let i = 0; i < 20 && !ordenes.includes(vuelveAlInicio); i++) await pagina.waitForTimeout(100);
    assert.ok(ordenes.includes(vuelveAlInicio));
    assert.deepEqual(errores, []);
    await contexto.close();
  });
});

describe('vídeo por trozos: inicio', () => {
  it('al empezar un trozo que no está al principio no avisa de que se ha retrocedido', async () => {
    const { contexto, pagina, errores } = await abrir();
    const leccion = cursos[0].lecciones[1];
    // Como YouTube al cargar: primero informa del segundo 0 y, tras saltar al inicio, avanza desde ahí.
    await contexto.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 204 }));
    await contexto.route('https://www.youtube-nocookie.com/**', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: `<script>
          let t = 0, empezado = false;
          addEventListener('message', (e) => {
            const d = JSON.parse(e.data);
            if (d.func === 'seekTo') t = d.args[0];
            if (d.event === 'listening' && !empezado) {
              empezado = true;
              setInterval(() => { parent.postMessage(JSON.stringify({ event: 'infoDelivery', info: { currentTime: t } }), '*'); if (t > 0) t += 0.1; }, 100);
              setTimeout(() => { if (t === 0) t = ${leccion.inicioS}; }, 400);
            }
          });
        </script>`,
      }),
    );

    await completarAlta(pagina);
    await pagina.evaluate((id) => {
      location.hash = `#/curso/python-desde-cero/leccion/${id}`;
    }, leccion.id);
    await pagina.getByRole('button', { name: /^Estudiar la lección/ }).click();
    await pagina.getByRole('button', { name: /Reproducir vídeo/ }).click();
    await pagina.waitForTimeout(1500);
    assert.equal(await pagina.getByText(/Has ido a un punto anterior/).count(), 0);
    assert.deepEqual(errores, []);
    await contexto.close();
  });
});
