// Edad del alumno: el tramo se calcula con la fecha de nacimiento y cambia solo al cumplir años.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcularEdad, errorFechaNacimiento, esMenor, necesitaConsentimiento, tramoEdad } from '../../src/api/edad.js';

const HOY = new Date(2026, 10, 25); // 25/11/2026

describe('edad y tramo', () => {
  it('cuenta los años cumplidos, no el año de nacimiento', () => {
    assert.equal(calcularEdad('2008-11-25', HOY), 18);
    assert.equal(calcularEdad('2008-11-26', HOY), 17);
    assert.equal(calcularEdad('2008-12-31', HOY), 17);
  });

  it('pasa a mayor de edad el día que cumple 18 años, sin que nadie lo cambie', () => {
    const fecha = '2008-12-20';
    assert.equal(tramoEdad(fecha, HOY), '14a17');
    assert.equal(tramoEdad(fecha, new Date(2026, 11, 19)), '14a17');
    assert.equal(tramoEdad(fecha, new Date(2026, 11, 20)), 'adulto');
  });

  it('distingue los tres tramos', () => {
    assert.equal(tramoEdad('1990-01-01', HOY), 'adulto');
    assert.equal(tramoEdad('2010-01-01', HOY), '14a17');
    assert.equal(tramoEdad('2015-01-01', HOY), 'menor14');
    assert.equal(tramoEdad(null, HOY), null);
  });

  it('a efectos de la IA, es menor quien tiene menos de 18 años', () => {
    assert.equal(esMenor({ fechaNacimiento: '2010-01-01' }, HOY), true);
    assert.equal(esMenor({ fechaNacimiento: '1990-01-01' }, HOY), false);
  });

  it('solo los menores de 14 años necesitan el consentimiento de su familia', () => {
    assert.equal(necesitaConsentimiento({ fechaNacimiento: '2015-01-01' }, HOY), true);
    assert.equal(necesitaConsentimiento({ fechaNacimiento: '2015-01-01', consentimientoFamilia: 'x' }, HOY), false);
    assert.equal(necesitaConsentimiento({ fechaNacimiento: '2010-01-01' }, HOY), false);
  });
});

describe('validación de la fecha de nacimiento', () => {
  it('acepta una fecha correcta', () => {
    assert.equal(errorFechaNacimiento('2000-02-29', HOY), '');
  });

  it('rechaza fechas vacías, imposibles, futuras o demasiado antiguas', () => {
    assert.ok(errorFechaNacimiento('', HOY));
    assert.ok(errorFechaNacimiento('2001-02-29', HOY));
    assert.ok(errorFechaNacimiento('2027-01-01', HOY));
    assert.ok(errorFechaNacimiento('1880-01-01', HOY));
  });
});
