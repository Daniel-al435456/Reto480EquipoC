// Planificador de sesión (sin IA): historias H2, H3 y H4 de SPEC §4.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cursos } from '../../src/api/datos.js';
import { leccionesPendientes, planificarLeccion, planificarSesion } from '../../src/api/planificador.js';

const curso = cursos[0];
const TIEMPOS = [5, 10, 20];

describe('planificarSesion', () => {
  it('H4: la sesión cabe en el tiempo elegido (con un minuto de margen)', () => {
    for (const minutos of TIEMPOS) {
      for (const audio of [true, false]) {
        const plan = planificarSesion(curso, { minutos, audio });
        assert.ok(plan.pasos.length > 0, `${minutos} min sin pasos`);
        assert.ok(plan.minutos <= minutos + 1, `${minutos} min, audio ${audio}: ${plan.minutos}`);
        assert.equal(plan.minutos, plan.pasos.reduce((t, p) => t + p.minutos, 0));
      }
    }
  });

  it('H3: sin audio no propone ningún vídeo', () => {
    for (const minutos of TIEMPOS) {
      const plan = planificarSesion(curso, { minutos, audio: false });
      assert.ok(plan.pasos.every((p) => p.tipo !== 'video'));
    }
  });

  it('H2: no incluye lo que el alumno ya domina ni lo que ha completado', () => {
    const [primera, segunda] = curso.lecciones;
    const plan = planificarSesion(curso, { minutos: 20, audio: true }, { [primera.id]: true }, [segunda.id]);
    const incluidas = new Set(plan.pasos.map((p) => p.leccionId));
    assert.ok(!incluidas.has(primera.id));
    assert.ok(!incluidas.has(segunda.id));
  });

  it('cada lección va seguida de sus actividades (comprobación tras cada fragmento, H5)', () => {
    const plan = planificarSesion(curso, { minutos: 20, audio: true });
    plan.pasos.forEach((paso, i) => {
      if (paso.tipo !== 'actividades') {
        assert.equal(plan.pasos[i + 1]?.tipo, 'actividades');
        assert.equal(plan.pasos[i + 1].leccionId, paso.leccionId);
      }
    });
  });

  it('si todo está dominado no queda nada pendiente', () => {
    const dominio = Object.fromEntries(curso.lecciones.map((l) => [l.id, true]));
    assert.equal(leccionesPendientes(curso, dominio).length, 0);
    assert.equal(planificarSesion(curso, { minutos: 20, audio: true }, dominio).pasos.length, 0);
  });
});

describe('planificarLeccion', () => {
  it('el alumno puede repasar una lección que ya domina, con o sin el contenido', () => {
    const leccion = curso.lecciones[0];
    assert.deepEqual(
      planificarLeccion(leccion, { audio: false }).pasos.map((p) => p.tipo),
      ['lectura', 'actividades'],
    );
    assert.deepEqual(
      planificarLeccion(leccion, { audio: true, soloActividades: true }).pasos.map((p) => p.tipo),
      ['actividades'],
    );
  });
});
