// Personalidad del mentor, trato y datos que se envían a la IA.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  contextoIA,
  frasesMentor,
  historialIA,
  MENSAJES_DE_CONTEXTO,
  palabra,
  PERSONALIDADES,
  progresoIA,
  TRATAMIENTOS,
} from '../../src/api/mentor.js';

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

  it('el progreso solo lleva identificadores de lecciones dominadas y completadas', () => {
    const progreso = progresoIA({ dominio: { a: true, b: false }, completadas: ['c'], alias: 'Rayo', cuenta: { email: 'x@y.es' } });
    assert.deepEqual(progreso, { dominadas: ['a'], completadas: ['c'] });
  });

  it('el mentor ve solo los últimos mensajes de la conversación, sin datos extra', () => {
    const mensajes = Array.from({ length: 12 }, (_, i) => ({ id: i, autor: i % 2 ? 'mentor' : 'alumno', texto: `m${i}`, proactivo: true }));
    const historial = historialIA(mensajes);
    assert.equal(historial.length, MENSAJES_DE_CONTEXTO);
    assert.deepEqual(historial.at(-1), { autor: 'mentor', texto: 'm11' });
    assert.deepEqual(Object.keys(historial[0]).sort(), ['autor', 'texto']);
  });
});
