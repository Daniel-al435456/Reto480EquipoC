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

/**
 * Servidor de cuentas simulado (issue #57): responde como las rutas de cuenta del backend (#55), con las
 * cuentas en memoria. Guarda cada petición para comprobar qué envía la app.
 */
async function servidorDeCuentas(contexto) {
  const cuentas = new Map(); // email → { perfil, contrasena }
  const tokens = new Map(); // token → email
  const peticiones = [];
  let siguiente = 1;
  const responder = (route, estado, json) =>
    estado === 204 ? route.fulfill({ status: 204 }) : route.fulfill({ status: estado, json });
  const error = (route, estado, codigo) => responder(route, estado, { error: codigo, mensaje: codigo });
  const abrirSesion = (email) => {
    const token = `token-${siguiente++}`;
    tokens.set(token, email);
    return { token, perfil: cuentas.get(email).perfil };
  };
  const emailDe = (route) => tokens.get((route.request().headers().authorization ?? '').replace('Bearer ', ''));
  const registrar = (route) => {
    const peticion = route.request();
    const cuerpo = peticion.postData() ? peticion.postDataJSON() : null;
    peticiones.push({ metodo: peticion.method(), ruta: new URL(peticion.url()).pathname, cuerpo, cabeceras: peticion.headers() });
    return cuerpo;
  };
  const crear = (datos) => {
    const { contrasena, consentimientoFamilia, privacidadAceptada, ...resto } = datos;
    const perfil = {
      puesto: '',
      anonimo: true,
      mentorIA: true,
      personalidadMentor: 'amable',
      tratamiento: 'neutro',
      ...resto,
      email: resto.email.toLowerCase(),
      consentimientoFamiliaEn: consentimientoFamilia ? '2026-11-27T10:00:00+00:00' : null,
      creadoEn: '2026-11-27T10:00:00+00:00',
    };
    cuentas.set(perfil.email, { perfil, contrasena });
    return perfil.email;
  };

  await contexto.route('**/api/cuenta', (route) => {
    const cuerpo = registrar(route);
    const metodo = route.request().method();
    if (metodo === 'POST') {
      if (cuentas.has(cuerpo.email.toLowerCase())) return error(route, 409, 'email_registrado');
      return responder(route, 201, abrirSesion(crear(cuerpo)));
    }
    const email = emailDe(route);
    if (!email) return error(route, 401, 'sesion_no_valida');
    const cuenta = cuentas.get(email);
    if (metodo === 'GET') return responder(route, 200, cuenta.perfil);
    if (metodo === 'PATCH') {
      Object.assign(cuenta.perfil, cuerpo);
      return responder(route, 200, cuenta.perfil);
    }
    if (cuerpo?.contrasena !== cuenta.contrasena) return error(route, 403, 'contrasena_incorrecta');
    cuentas.delete(email);
    for (const [token, dueno] of tokens) if (dueno === email) tokens.delete(token);
    return responder(route, 204);
  });
  await contexto.route('**/api/cuenta/contrasena', (route) => {
    const cuerpo = registrar(route);
    const email = emailDe(route);
    if (!email) return error(route, 401, 'sesion_no_valida');
    if (cuerpo.actual !== cuentas.get(email).contrasena) return error(route, 403, 'contrasena_incorrecta');
    cuentas.get(email).contrasena = cuerpo.nueva;
    return responder(route, 204);
  });
  await contexto.route('**/api/sesion', (route) => {
    const cuerpo = registrar(route);
    if (route.request().method() === 'DELETE') {
      tokens.delete((route.request().headers().authorization ?? '').replace('Bearer ', ''));
      return responder(route, 204);
    }
    const cuenta = cuentas.get(cuerpo.email.toLowerCase());
    if (!cuenta || cuenta.contrasena !== cuerpo.contrasena) return error(route, 401, 'credenciales_incorrectas');
    return responder(route, 200, abrirSesion(cuerpo.email.toLowerCase()));
  });
  return { cuentas, tokens, peticiones, crear };
}

/** Abre la app en un móvil nuevo, sin datos guardados, y recoge los errores de JavaScript. */
async function abrir() {
  const contexto = await navegador.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  const servidorCuentas = await servidorDeCuentas(contexto);
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.goto(servidor.url);
  await pagina.getByText('Aprende a tu ritmo.').waitFor();
  return { contexto, pagina, errores, servidorCuentas };
}

const estadoGuardado = (pagina) => pagina.evaluate(() => localStorage.getItem('reto480-estado-v5') ?? '');
/** Todo lo que la app ha guardado en este móvil, con todas sus claves. */
const todoLoGuardado = (pagina) =>
  pagina.evaluate(() => Object.keys(localStorage).map((clave) => `${clave}=${localStorage.getItem(clave)}`).join('\n'));

/** Espera a que una condición de la prueba (no de la página) se cumpla, como mucho 3 segundos. */
async function esperarCondicion(condicion) {
  for (let intento = 0; intento < 30; intento++) {
    if (condicion()) return;
    await new Promise((resolver) => setTimeout(resolver, 100));
  }
  assert.fail('La condición no se ha cumplido a tiempo.');
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

  it('con IA, envía la conversación y el progreso y abre la lección que propone', async () => {
    const { contexto, pagina, errores } = await abrir();
    const enviados = [];
    await pagina.route('**/salud', (route) =>
      route.fulfill({ json: { estado: 'ok', servicio: 'prueba', version: 'test' } }),
    );
    await pagina.route('**/api/mentor/mensaje', (route) => {
      enviados.push(route.request().postDataJSON());
      return route.fulfill({
        json: {
          texto: 'Ábrela y prueba el ejemplo del minuto 1.',
          derivado: false,
          leccionId: 'que-es-un-if',
          leccionTitulo: 'Qué es una condicional (if)',
          redactadoPorIa: true,
        },
      });
    });
    await completarAlta(pagina, { personalidad: 'Estricto', tratamiento: 'Masculino' });
    await pagina.getByRole('button', { name: /Python desde cero/ }).click();
    await pagina.goto(servidor.url + '#/mentor');
    for (const pregunta of ['No entiendo las condicionales', 'Dame otro ejemplo']) {
      await pagina.locator('#pregunta-mentor').fill(pregunta);
      await pagina.keyboard.press('Enter');
      await pagina.getByText('Ábrela y prueba el ejemplo del minuto 1.').last().waitFor({ state: 'attached' });
      await pagina.waitForFunction(() => !document.querySelector('[aria-label="El mentor está escribiendo"]'));
    }
    assert.equal(enviados.length, 2);
    assert.equal(enviados[1].texto, 'Dame otro ejemplo');
    assert.equal(enviados[1].personalidad, 'estricto');
    assert.equal(enviados[1].tratamiento, 'masculino');
    assert.deepEqual(Object.keys(enviados[1].progreso).sort(), ['completadas', 'dominadas']);
    assert.deepEqual(
      enviados[1].historial.slice(-2).map((m) => m.autor),
      ['alumno', 'mentor'],
    );
    assert.ok(!JSON.stringify(enviados).match(/Lucía|lucia@acme|Acme/));
    await pagina.getByText('Redactado con IA').first().waitFor();
    await pagina.getByRole('button', { name: 'Ir a «Qué es una condicional (if)»' }).last().click();
    await pagina.waitForFunction(() => location.hash === '#/curso/python-desde-cero/leccion/que-es-un-if');
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

describe('cuenta en el servidor', () => {
  const pablo = {
    empresa: 'Acme Formación',
    nombre: 'Pablo',
    apellidos: 'Ruiz',
    email: 'pablo@acme.es',
    contrasena: 'pablo1234',
    fechaNacimiento: '1985-02-03',
    alias: 'Zorro7',
  };

  /** Inicia sesión desde la bienvenida. */
  async function entrar(pagina, email, contrasena) {
    // En un móvil donde aún no se ha entrado, la bienvenida ofrece "Ya tengo cuenta" en lugar de "Iniciar sesión".
    await pagina.getByRole('button', { name: /^(Iniciar sesión|Ya tengo cuenta)$/ }).first().click();
    await pagina.getByLabel('Correo electrónico').fill(email);
    await pagina.getByLabel('Contraseña', { exact: true }).fill(contrasena);
    await boton(pagina, 'Iniciar sesión').click();
  }

  async function cerrarSesion(pagina) {
    await pagina.goto(servidor.url + '#/perfil');
    await boton(pagina, 'Cerrar sesión').click();
    await pagina.getByText('Aprende a tu ritmo.').waitFor();
  }

  it('el alta envía al terminar todos los datos, y la contraseña no se guarda en el móvil', async () => {
    const { contexto, pagina, errores, servidorCuentas } = await abrir();
    await completarAlta(pagina, { personalidad: 'Gracioso' });
    const altas = servidorCuentas.peticiones.filter((p) => p.metodo === 'POST' && p.ruta === '/api/cuenta');
    assert.equal(altas.length, 1);
    assert.deepEqual(
      { ...altas[0].cuerpo },
      {
        empresa: 'Acme Formación',
        nombre: 'Lucía',
        apellidos: 'García Pérez',
        email: 'lucia@acme.es',
        contrasena: 'clave1234',
        puesto: '',
        fechaNacimiento: '1990-05-10',
        consentimientoFamilia: false,
        privacidadAceptada: true,
        alias: JSON.parse(await estadoGuardado(pagina)).alias,
        anonimo: true,
        mentorIA: true,
        personalidadMentor: 'gracioso',
        tratamiento: 'neutro',
      },
    );
    assert.match(await estadoGuardado(pagina), /"token":"token-1"/);
    assert.ok(!(await todoLoGuardado(pagina)).includes('clave1234'));
    assert.deepEqual(errores, []);
    await contexto.close();
  });

  it('si el correo ya tiene cuenta, lo dice al terminar el alta', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    servidorCuentas.crear({ ...pablo, email: 'lucia@acme.es' });
    await crearCuenta(pagina);
    await indicarNacimiento(pagina, '1990-05-10');
    await boton(pagina, 'Continuar').click();
    await boton(pagina, 'Empezar a aprender').click();
    await pagina.getByText(/Ya hay una cuenta con ese correo/).waitFor();
    assert.equal(await ruta(pagina), '/preferencias');
    await contexto.close();
  });

  it('si el servidor no responde, avisa, se queda en el paso 4 y deja reintentar', async () => {
    const { contexto, pagina } = await abrir();
    await crearCuenta(pagina);
    await indicarNacimiento(pagina, '1990-05-10');
    await boton(pagina, 'Continuar').click();
    await pagina.route('**/api/cuenta', (route) => route.abort('connectionrefused'));
    await boton(pagina, 'Empezar a aprender').click();
    await pagina.getByText(/No hemos podido conectar/).waitFor();
    assert.equal(await ruta(pagina), '/preferencias');
    await pagina.unroute('**/api/cuenta');
    await boton(pagina, 'Empezar a aprender').click();
    await pagina.getByText('Elige un curso').waitFor();
    await contexto.close();
  });

  it('al recargar a mitad del alta, pide otra vez la contraseña antes de crear la cuenta', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await crearCuenta(pagina);
    await indicarNacimiento(pagina, '1990-05-10');
    await boton(pagina, 'Continuar').click();
    await pagina.reload();
    await pagina.getByText('Hazla a tu medida').waitFor();
    await pagina.getByLabel('Contraseña', { exact: true }).fill('clave1234');
    await boton(pagina, 'Empezar a aprender').click();
    await pagina.getByText('Elige un curso').waitFor();
    assert.equal(servidorCuentas.cuentas.get('lucia@acme.es').contrasena, 'clave1234');
    await contexto.close();
  });

  it('iniciar sesión con el servidor carga la cuenta y sus ajustes', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    servidorCuentas.crear(pablo);
    await entrar(pagina, 'Pablo@Acme.es', 'otra1234');
    await pagina.getByText('El correo o la contraseña no son correctos.').waitFor();
    await pagina.getByLabel('Contraseña', { exact: true }).fill('pablo1234');
    await boton(pagina, 'Iniciar sesión').click();
    await pagina.waitForFunction(() => location.hash === '#/cursos');
    assert.match(await estadoGuardado(pagina), /"alias":"Zorro7"/);
    await contexto.close();
  });

  it('cerrar sesión avisa al servidor y borra el token del móvil', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await completarAlta(pagina);
    await cerrarSesion(pagina);
    assert.ok(servidorCuentas.peticiones.some((p) => p.metodo === 'DELETE' && p.ruta === '/api/sesion'));
    assert.equal(servidorCuentas.tokens.size, 0);
    // En el estado del móvil no queda nada de la cuenta: ni el token ni sus datos personales.
    const estado = await estadoGuardado(pagina);
    for (const dato of ['token-1', 'Lucía', 'lucia@acme.es', 'Acme']) assert.ok(!estado.includes(dato), dato);
    // Al volver a entrar, la petición ya no lleva la sesión anterior.
    await entrar(pagina, 'lucia@acme.es', 'clave1234');
    await pagina.waitForFunction(() => location.hash === '#/cursos');
    const login = servidorCuentas.peticiones.findLast((p) => p.ruta === '/api/sesion' && p.metodo === 'POST');
    assert.equal(login.cabeceras.authorization, undefined);
    await contexto.close();
  });

  it('eliminar la cuenta pide la contraseña', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await completarAlta(pagina);
    await pagina.goto(servidor.url + '#/perfil/seguridad');
    await boton(pagina, 'Eliminar mi cuenta').click();
    await pagina.getByLabel('Escribe tu contraseña para confirmar').fill('otra1234');
    await boton(pagina, 'Sí, eliminar mi cuenta').click();
    await pagina.getByText('La contraseña no es correcta.').waitFor();
    assert.ok(servidorCuentas.cuentas.has('lucia@acme.es'));
    await pagina.getByLabel('Escribe tu contraseña para confirmar').fill('clave1234');
    await boton(pagina, 'Sí, eliminar mi cuenta').click();
    await pagina.getByText('Aprende a tu ritmo.').waitFor();
    assert.ok(!servidorCuentas.cuentas.has('lucia@acme.es'));
    await contexto.close();
  });

  it('las preguntas al mentor llevan la sesión del alumno', async () => {
    const { contexto, pagina } = await abrir();
    const cabeceras = [];
    await pagina.route('**/salud', (route) => route.fulfill({ json: { estado: 'ok', servicio: 'prueba', version: 'test' } }));
    await pagina.route('**/api/mentor/mensaje', (route) => {
      cabeceras.push(route.request().headers().authorization);
      return route.fulfill({ json: { texto: 'Respuesta del mentor.', derivado: false } });
    });
    await completarAlta(pagina);
    await pagina.getByRole('button', { name: /Python desde cero/ }).click();
    await pagina.goto(servidor.url + '#/mentor');
    await pagina.locator('#pregunta-mentor').fill('¿Qué es una variable?');
    await pagina.keyboard.press('Enter');
    await pagina.getByText('Respuesta del mentor.').last().waitFor({ state: 'attached' });
    assert.deepEqual(cabeceras, ['Bearer token-1']);
    await contexto.close();
  });

  it('cambiar el nombre desde el perfil lo guarda en el servidor', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await completarAlta(pagina);
    await pagina.goto(servidor.url + '#/perfil/cuenta');
    await pagina.getByLabel('Nombre', { exact: true }).fill('Lucía María');
    await boton(pagina, 'Guardar cambios').click();
    await pagina.getByText('Cambios guardados.').waitFor();
    await esperarCondicion(() => servidorCuentas.cuentas.get('lucia@acme.es').perfil.nombre === 'Lucía María');
    await contexto.close();
  });

  it('si la sesión ha caducado, vuelve a pedir que se inicie sesión', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await completarAlta(pagina);
    servidorCuentas.tokens.clear();
    await pagina.goto(servidor.url + '#/perfil/cuenta');
    await pagina.getByLabel('Nombre', { exact: true }).fill('Otra');
    await boton(pagina, 'Guardar cambios').click();
    await pagina.getByText(/Tu sesión ha caducado/).waitFor();
    assert.equal(await ruta(pagina), '/entrar');
    await contexto.close();
  });

  it('al abrir la app con una sesión caducada, pide entrar de nuevo', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await completarAlta(pagina);
    servidorCuentas.tokens.clear();
    await pagina.reload();
    await pagina.getByText(/Tu sesión ha caducado/).waitFor();
    assert.equal(await ruta(pagina), '/entrar');
    assert.ok(!(await estadoGuardado(pagina)).includes('Lucía'));
    await contexto.close();
  });

  it('si un cambio del perfil no se guarda en el servidor, avisa y el móvil sigue como estaba', async () => {
    const { contexto, pagina } = await abrir();
    await completarAlta(pagina);
    await pagina.goto(servidor.url + '#/perfil/privacidad');
    const interruptor = pagina.getByRole('switch', { name: /Mentor con IA/ });
    assert.equal(await interruptor.getAttribute('aria-checked'), 'true');
    await pagina.route('**/api/cuenta', (route) => route.abort('connectionrefused'));
    await interruptor.click();
    await pagina.getByText(/No se ha podido guardar el cambio/).waitFor();
    assert.equal(await interruptor.getAttribute('aria-checked'), 'true');
    assert.match(await estadoGuardado(pagina), /"mentorIA":true/);
    await contexto.close();
  });

  it('eliminar la cuenta con doble clic no muestra errores y borra su progreso del móvil', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    await completarAlta(pagina);
    await pagina.getByRole('button', { name: /Python desde cero/ }).click();
    await pagina.getByRole('button', { name: 'Empezar el test', exact: true }).waitFor();
    await pagina.goto(servidor.url + '#/perfil/seguridad');
    await boton(pagina, 'Eliminar mi cuenta').click();
    await pagina.getByLabel('Escribe tu contraseña para confirmar').fill('clave1234');
    await boton(pagina, 'Sí, eliminar mi cuenta').dblclick();
    await pagina.getByText('Aprende a tu ritmo.').waitFor();
    assert.equal(servidorCuentas.peticiones.filter((p) => p.metodo === 'DELETE' && p.ruta === '/api/cuenta').length, 1);
    assert.equal(await pagina.getByText(/sesión ha caducado/).count(), 0);
    const guardado = await todoLoGuardado(pagina);
    assert.ok(!guardado.includes('reto480-progreso'), guardado);
    // La bienvenida ya no ofrece entrar con una cuenta que no existe.
    await boton(pagina, 'Crear cuenta').waitFor();
    await contexto.close();
  });

  it('dos cuentas en el mismo móvil: cada una recupera su progreso', async () => {
    const { contexto, pagina, servidorCuentas } = await abrir();
    servidorCuentas.crear(pablo);
    await completarAlta(pagina);
    await pagina.getByRole('button', { name: /Python desde cero/ }).click();
    await pagina.getByRole('button', { name: 'Empezar el test', exact: true }).waitFor();
    await cerrarSesion(pagina);
    await entrar(pagina, 'pablo@acme.es', 'pablo1234');
    await pagina.waitForFunction(() => location.hash === '#/cursos');
    // Pablo no ve nada de Lucía: ni su nombre ni su alias ni su curso.
    const dePablo = await estadoGuardado(pagina);
    assert.match(dePablo, /"alias":"Zorro7"/);
    for (const dato of ['Lucía', 'lucia@acme.es', 'python-desde-cero']) assert.ok(!dePablo.includes(dato), dato);
    await cerrarSesion(pagina);
    await entrar(pagina, 'lucia@acme.es', 'clave1234');
    await pagina.waitForFunction(() => location.hash === '#/curso/python-desde-cero/test');
    await contexto.close();
  });
});

