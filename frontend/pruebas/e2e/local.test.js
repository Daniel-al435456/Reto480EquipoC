// Pruebas en un navegador real del modo local (issue #57): la app compilada sin VITE_API_URL ("npm run build:local",
// en dist-local/). Sin backend, la cuenta solo existe en el dispositivo y nunca se llama a las rutas de cuenta.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { chromium, devices } from 'playwright';

process.env.DIST = fileURLToPath(new URL('../../dist-local/', import.meta.url));
const { arrancarServidor } = await import('./servidor.js');

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

const boton = (pagina, nombre) => pagina.getByRole('button', { name: nombre, exact: true });

describe('modo local, sin backend', () => {
  it('la cuenta se crea, se cierra, se vuelve a abrir y se elimina en el dispositivo, sin llamar al servidor', async () => {
    const contexto = await navegador.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    const peticiones = [];
    contexto.on('request', (r) => r.url().includes('/api/') && peticiones.push(new URL(r.url()).pathname));
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(e.message));
    await pagina.goto(servidor.url);

    await boton(pagina, 'Crear cuenta').click();
    await pagina.getByLabel('Empresa').fill('Acme Formación');
    await pagina.getByLabel('Nombre', { exact: true }).fill('Lucía');
    await pagina.getByLabel('Apellidos').fill('García Pérez');
    await pagina.getByLabel('Correo electrónico').fill('lucia@acme.es');
    await pagina.getByLabel('Contraseña', { exact: true }).fill('clave1234');
    await pagina.getByLabel(/política de privacidad/).check();
    await boton(pagina, 'Crear cuenta').last().click();
    await pagina.getByLabel('Fecha de nacimiento').fill('1990-05-10');
    await boton(pagina, 'Continuar').click();
    await boton(pagina, 'Continuar').click();
    await boton(pagina, 'Empezar a aprender').click();
    await pagina.getByText('Elige un curso').waitFor();

    await pagina.goto(servidor.url + '#/perfil');
    await boton(pagina, 'Cerrar sesión').click();
    await boton(pagina, 'Iniciar sesión').click();
    await pagina.getByLabel('Correo electrónico').fill('lucia@acme.es');
    await pagina.getByLabel('Contraseña', { exact: true }).fill('clave1234');
    await boton(pagina, 'Iniciar sesión').click();
    await pagina.waitForFunction(() => location.hash === '#/cursos');

    await pagina.goto(servidor.url + '#/perfil/seguridad');
    await boton(pagina, 'Eliminar mi cuenta').click();
    await pagina.getByLabel('Escribe tu contraseña para confirmar').fill('otra1234');
    await boton(pagina, 'Sí, eliminar mi cuenta').click();
    await pagina.getByText('La contraseña no es correcta.').waitFor();
    await pagina.getByLabel('Escribe tu contraseña para confirmar').fill('clave1234');
    await boton(pagina, 'Sí, eliminar mi cuenta').click();
    await pagina.getByText('Aprende a tu ritmo.').waitFor();

    assert.deepEqual(peticiones.filter((ruta) => /\/api\/(cuenta|sesion)/.test(ruta)), []);
    assert.deepEqual(errores, []);
    await contexto.close();
  });
});
