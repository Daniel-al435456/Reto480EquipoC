// Reglas de acceso del alumno: alta en cuatro pasos, menores y datos que no se repiten.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { destinoInicio, rutaPermitida } from '../../src/api/acceso.js';

const cuenta = { email: 'lucia@acme.es', empresa: 'Acme' };
const HOY = new Date(2026, 10, 25);
const alumnoCompleto = {
  cuenta,
  sesionIniciada: true,
  fechaNacimiento: '1990-05-10',
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
    assert.equal(destinoInicio({ ...base, fechaNacimiento: '1990-05-10' }), '/alias');
    assert.equal(destinoInicio({ ...base, fechaNacimiento: '1990-05-10', alias: 'X' }), '/preferencias');
  });

  it('un menor de 14 años no avanza sin el consentimiento de su familia', () => {
    const menor = { cuenta, sesionIniciada: true, fechaNacimiento: '2014-01-15', alias: 'X', altaCompleta: true };
    assert.equal(destinoInicio(menor, HOY), '/consentimiento');
    assert.equal(destinoInicio({ ...menor, consentimientoFamilia: '2026-11-25T10:00:00Z' }, HOY), '/cursos');
  });

  it('al cumplir 14 años deja de necesitar el consentimiento', () => {
    const alumno = { cuenta, sesionIniciada: true, fechaNacimiento: '2012-11-26', alias: 'X', altaCompleta: true };
    assert.equal(destinoInicio(alumno, new Date(2026, 10, 25)), '/consentimiento');
    assert.equal(destinoInicio(alumno, new Date(2026, 10, 26)), '/cursos');
  });

  it('entre 14 y 17 años no necesita consentimiento', () => {
    const alumno = { cuenta, sesionIniciada: true, fechaNacimiento: '2010-03-01', alias: 'X', altaCompleta: true };
    assert.equal(destinoInicio(alumno, HOY), '/cursos');
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
    for (const ruta of ['/', '/progreso', '/perfil', '/mentor', '/edad']) {
      assert.ok(!rutaPermitida({}, ruta), ruta);
    }
  });

  it('con el alta a medias solo se ven sus pasos y las públicas', () => {
    const enAlta = { cuenta, sesionIniciada: true };
    assert.ok(rutaPermitida(enAlta, '/edad'));
    assert.ok(rutaPermitida(enAlta, '/preferencias'));
    assert.ok(!rutaPermitida(enAlta, '/progreso'));
    assert.ok(!rutaPermitida(enAlta, '/mentor'));
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
