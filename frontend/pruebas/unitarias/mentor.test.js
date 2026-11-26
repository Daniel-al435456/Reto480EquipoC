// Personalidad del mentor, trato y datos que se envían a la IA.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contextoIA, frasesMentor, palabra, PERSONALIDADES, TRATAMIENTOS } from '../../src/api/mentor.js';

describe('mentor', () => {
  it('cada personalidad tiene sus propias frases', () => {
    const atascos = PERSONALIDADES.map(({ id }) => frasesMentor(id, 'neutro').atasco);
    assert.equal(new Set(atascos).size, PERSONALIDADES.length);
  });

  it('respeta el trato elegido y el neutro no usa género', () => {
    assert.match(frasesMentor('amable', 'femenino').reintento, /Lista/);
    assert.match(frasesMentor('amable', 'masculino').reintento, /Listo/);
    for (const { id } of PERSONALIDADES) {
      assert.doesNotMatch(frasesMentor(id, 'neutro').reintento, /\blist[oa]\b/i);
    }
    assert.equal(palabra('desconocido', { neutro: 'n', femenino: 'f' }), 'n');
    assert.equal(TRATAMIENTOS.length, 3);
  });

  it('una personalidad desconocida usa la amable', () => {
    assert.deepEqual(frasesMentor('otra', 'neutro'), frasesMentor('amable', 'neutro'));
  });

  it('a la IA solo le llega si es menor, la personalidad y el trato: nunca datos de la cuenta ni la fecha', () => {
    const estado = {
      cuenta: { nombre: 'Lucía', email: 'lucia@acme.es', empresa: 'Acme' },
      fechaNacimiento: '1990-01-01',
      personalidadMentor: 'gracioso',
      tratamiento: 'femenino',
      alias: 'Rayo amable',
    };
    const contexto = contextoIA(estado);
    assert.deepEqual(Object.keys(contexto).sort(), ['esMenor', 'personalidad', 'tratamiento']);
    assert.ok(!JSON.stringify(contexto).match(/Lucía|acme|1990/i));
  });
});
