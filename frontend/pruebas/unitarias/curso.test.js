// Coherencia del curso de muestra: vídeos, trozos de cada lección, actividades y test inicial.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cursos, DURACION_ACTIVIDADES } from '../../src/api/datos.js';

const curso = cursos[0];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

describe('curso de muestra', () => {
  it('los identificadores son únicos y válidos para la base de datos', () => {
    const ids = [
      ...curso.videos.map((v) => v.id),
      ...curso.lecciones.map((l) => l.id),
      ...curso.lecciones.flatMap((l) => l.actividades.map((a) => a.id)),
    ];
    assert.equal(new Set(ids).size, ids.length);
    for (const leccion of curso.lecciones) assert.match(leccion.id, SLUG);
    for (const video of curso.videos) assert.match(video.id, SLUG);
  });

  it('cada lección es un trozo de su vídeo, con el mismo identificador de YouTube', () => {
    for (const leccion of curso.lecciones) {
      const video = curso.videos.find((v) => v.id === leccion.videoId);
      assert.ok(video, `${leccion.id}: vídeo ${leccion.videoId}`);
      assert.equal(leccion.youtubeId, video.youtubeId, leccion.id);
      assert.ok(leccion.inicioS >= 0 && leccion.inicioS < leccion.finS && leccion.finS <= video.duracion, leccion.id);
      assert.equal(leccion.duracionVideo, Math.ceil((leccion.finS - leccion.inicioS) / 60), leccion.id);
    }
  });

  it('los trozos de cada vídeo lo cubren entero, en orden y sin huecos', () => {
    for (const video of curso.videos) {
      const trozos = curso.lecciones.filter((l) => l.videoId === video.id);
      assert.ok(trozos.length > 0, video.id);
      assert.equal(trozos[0].inicioS, 0, video.id);
      assert.equal(trozos.at(-1).finS, video.duracion, video.id);
      for (let i = 1; i < trozos.length; i++) assert.ok(trozos.at(i).inicioS <= trozos.at(i - 1).finS, trozos.at(i).id);
    }
  });

  it('cada trozo cabe con sus actividades en una sesión de 10 minutos', () => {
    for (const leccion of curso.lecciones) {
      assert.ok(leccion.duracionVideo + DURACION_ACTIVIDADES <= 10, `${leccion.id}: ${leccion.duracionVideo} min`);
    }
  });

  it('cada lección tiene 2 o 3 actividades, y la solución de las escritas cumple sus palabras clave (H5)', () => {
    for (const leccion of curso.lecciones) {
      assert.ok(leccion.actividades.length >= 2 && leccion.actividades.length <= 3, leccion.id);
      for (const actividad of leccion.actividades.filter((a) => a.tipo === 'escrita')) {
        const faltan = actividad.palabrasClave.filter((p) => !normalizar(actividad.solucion).includes(normalizar(p)));
        assert.deepEqual(faltan, [], actividad.id);
      }
    }
  });

  it('el test inicial tiene como mucho 12 preguntas, una por vídeo, con una respuesta válida (H1)', () => {
    assert.ok(curso.testInicial.length <= 12);
    const videos = curso.testInicial.map((p) => curso.lecciones.find((l) => l.id === p.leccionId)?.videoId);
    assert.ok(videos.every(Boolean));
    assert.equal(new Set(videos).size, videos.length);
    for (const pregunta of curso.testInicial) {
      assert.ok(pregunta.correcta >= 0 && pregunta.correcta < pregunta.opciones.length, pregunta.id);
    }
  });
});

describe('trozo del vídeo', () => {
  it('dentro del trozo sigue, al pasar del fin se para y antes del inicio vuelve al inicio', async () => {
    const { estadoTrozo } = await import('../../src/api/trozo.js');
    assert.equal(estadoTrozo(250, 212, 500), 'dentro');
    assert.equal(estadoTrozo(211.5, 212, 500), 'dentro');
    assert.equal(estadoTrozo(500, 212, 500), 'despues');
    assert.equal(estadoTrozo(597, 212, 500), 'despues');
    assert.equal(estadoTrozo(100, 212, 500), 'antes');
    assert.equal(estadoTrozo(9999, 0, null), 'dentro');
  });
});

describe('formato de minutos', () => {
  it('muestra los segundos como en YouTube', async () => {
    const { formatoMinuto } = await import('../../src/api/trozo.js');
    assert.equal(formatoMinuto(0), '0:00');
    assert.equal(formatoMinuto(212), '3:32');
    assert.equal(formatoMinuto(1877), '31:17');
  });
});
