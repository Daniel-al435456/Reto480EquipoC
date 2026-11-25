// Reglas de acceso del alumno: alta en cuatro pasos, menores y datos que no se repiten.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { destinoInicio, rutaPermitida } from '../../src/api/acceso.js';

const cuenta = { email: 'lucia@acme.es', empresa: 'Acme' };
const alumnoCompleto = {
  cuenta,
  sesionIniciada: true,
  tramoEdad: 'adulto',
  alias: 'Rayo amable',
  altaCompleta: true,
  cursoId: 'python-desde-cero',
  testHecho: true,
};

describe('destinoInicio', () => {
  it('sin cuenta o sin sesión lleva a la bienvenida', () => {
    assert.equal(destinoInicio({}), '/bienvenida');
    assert.equal(destinoInicio({ cuenta, sesionIniciada: false }), '/bienvenida');
  });

  it('recorre los pasos del alta en orden', () => {
    const base = { cuenta, sesionIniciada: true };
    assert.equal(destinoInicio(base), '/edad');
    assert.equal(destinoInicio({ ...base, tramoEdad: 'adulto' }), '/alias');
    assert.equal(destinoInicio({ ...base, tramoEdad: 'adulto', alias: 'X' }), '/preferencias');
  });

  it('un menor de 14 años no avanza sin el consentimiento de su familia', () => {
    const menor = { cuenta, sesionIniciada: true, tramoEdad: 'menor14', alias: 'X', altaCompleta: true };
    assert.equal(destinoInicio(menor), '/consentimiento');
    assert.equal(destinoInicio({ ...menor, consentimientoFamilia: '2026-11-25T10:00:00Z' }), '/cursos');
  });

  it('entre 14 y 17 años no necesita consentimiento', () => {
    const alumno = { cuenta, sesionIniciada: true, tramoEdad: '14a17', alias: 'X', altaCompleta: true };
    assert.equal(destinoInicio(alumno), '/cursos');
  });

  it('con el alta completa lleva al curso, al test o a la lección de hoy', () => {
    assert.equal(destinoInicio({ ...alumnoCompleto, cursoId: null }), '/cursos');
    assert.equal(destinoInicio({ ...alumnoCompleto, testHecho: false }), '/curso/python-desde-cero/test');
    assert.equal(destinoInicio(alumnoCompleto), '/curso/python-desde-cero/hoy');
  });
});

describe('rutaPermitida', () => {
  it('sin sesión solo se ven las pantallas públicas', () => {
    for (const ruta of ['/bienvenida', '/registro', '/entrar', '/legal/privacidad']) {
      assert.ok(rutaPermitida({}, ruta), ruta);
    }
    for (const ruta of ['/', '/progreso', '/perfil', '/tutor', '/edad']) {
      assert.ok(!rutaPermitida({}, ruta), ruta);
    }
  });

  it('con el alta a medias solo se ven sus pasos y las públicas', () => {
    const enAlta = { cuenta, sesionIniciada: true };
    assert.ok(rutaPermitida(enAlta, '/edad'));
    assert.ok(rutaPermitida(enAlta, '/preferencias'));
    assert.ok(!rutaPermitida(enAlta, '/progreso'));
    assert.ok(!rutaPermitida(enAlta, '/tutor'));
  });

  it('tras el alta no se puede volver a la edad, al consentimiento ni a las preferencias', () => {
    for (const ruta of ['/edad', '/consentimiento', '/preferencias']) {
      assert.ok(!rutaPermitida(alumnoCompleto, ruta), ruta);
    }
  });

  it('con la sesión iniciada no se vuelve a la bienvenida, al registro ni al inicio de sesión', () => {
    for (const ruta of ['/bienvenida', '/registro', '/entrar']) {
      assert.ok(!rutaPermitida(alumnoCompleto, ruta), ruta);
    }
  });

  it('con el alta completa se puede cambiar el alias y leer las páginas legales', () => {
    assert.ok(rutaPermitida(alumnoCompleto, '/alias'));
    assert.ok(rutaPermitida(alumnoCompleto, '/legal/cookies'));
    assert.ok(rutaPermitida(alumnoCompleto, '/perfil/cuenta'));
  });
});
