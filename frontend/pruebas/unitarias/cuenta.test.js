// Reglas de la cuenta: contraseñas y datos que solo puede cambiar la academia.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cambiosPermitidos,
  comprobarContrasena,
  EMAIL_VALIDO,
  errorContrasena,
  nombreVisible,
  resumirContrasena,
} from '../../src/api/cuenta.js';

describe('contraseñas', () => {
  it('exige al menos 8 caracteres, con letras y números', () => {
    assert.ok(errorContrasena('corta1'));
    assert.ok(errorContrasena('solotexto'));
    assert.ok(errorContrasena('12345678'));
    assert.equal(errorContrasena('clave1234'), '');
  });

  it('nunca guarda la contraseña: guarda un resumen que no la contiene', async () => {
    const resumen = await resumirContrasena('clave1234');
    assert.ok(!resumen.includes('clave1234'));
    assert.ok(await comprobarContrasena('clave1234', resumen));
    assert.ok(!(await comprobarContrasena('clave12345', resumen)));
  });
});

describe('datos de la cuenta', () => {
  it('desde el perfil solo se cambian nombre, apellidos y puesto', () => {
    const cambios = {
      nombre: 'Lucía',
      apellidos: 'García',
      puesto: 'Ventas',
      email: 'otro@correo.es',
      empresa: 'Otra',
      hashContrasena: 'x',
    };
    assert.deepEqual(cambiosPermitidos(cambios), { nombre: 'Lucía', apellidos: 'García', puesto: 'Ventas' });
  });

  it('valida el formato del correo', () => {
    assert.ok(EMAIL_VALIDO.test('lucia@acme.es'));
    assert.ok(!EMAIL_VALIDO.test('lucia@acme'));
    assert.ok(!EMAIL_VALIDO.test('lucia acme.es'));
  });

  it('en modo anónimo se muestra el alias y no el nombre real', () => {
    const estado = { anonimo: true, alias: 'Rayo amable', cuenta: { nombre: 'Lucía', apellidos: 'García' } };
    assert.equal(nombreVisible(estado), 'Rayo amable');
    assert.equal(nombreVisible({ ...estado, anonimo: false }), 'Lucía García');
  });
});
