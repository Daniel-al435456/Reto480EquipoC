// Cuenta en el servidor (issue #57): qué se envía en el alta, cómo se pasa el perfil al estado de la app,
// qué progreso se guarda por cuenta y qué mensaje ve el alumno ante cada error.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrasenaAlta, guardarContrasenaAlta, olvidarContrasenaAlta } from '../../src/api/altaPendiente.js';
import {
  aplicarCambiosPerfil,
  CAMPOS_PERFIL,
  claveProgreso,
  cuerpoAlta,
  estadoAlEntrar,
  estadoAlSalir,
  estadoDesdePerfil,
  mensajeDeError,
  progresoDe,
  progresoParaGuardar,
  progresoRecuperado,
} from '../../src/api/sesion.js';

const estadoDelAlta = {
  cuenta: {
    empresa: 'Acme Formación',
    nombre: 'Lucía',
    apellidos: 'García Pérez',
    email: ' Lucia@Acme.es ',
    puesto: 'Ventas',
    creada: '2026-11-27T10:00:00.000Z',
  },
  fechaNacimiento: '2012-05-10',
  consentimientoFamilia: '2026-11-27T10:01:00.000Z',
  alias: 'Lince42',
  anonimo: true,
  mentorIA: false,
  personalidadMentor: 'gracioso',
  tratamiento: 'femenino',
  ajustes: { tema: 'oscuro' },
  cursoId: 'python-desde-cero',
};

const perfil = {
  empresa: 'Acme Formación',
  nombre: 'Lucía',
  apellidos: 'García Pérez',
  email: 'lucia@acme.es',
  puesto: 'Ventas',
  fechaNacimiento: '2012-05-10',
  consentimientoFamiliaEn: '2026-11-27T10:01:00+00:00',
  creadoEn: '2026-11-27T10:02:00+00:00',
  alias: 'Lince42',
  anonimo: true,
  mentorIA: false,
  personalidadMentor: 'gracioso',
  tratamiento: 'femenino',
};

describe('alta en el servidor', () => {
  it('envía los datos de los cuatro pasos, con el correo en minúsculas', () => {
    assert.deepEqual(cuerpoAlta(estadoDelAlta, 'clave1234'), {
      empresa: 'Acme Formación',
      nombre: 'Lucía',
      apellidos: 'García Pérez',
      email: 'lucia@acme.es',
      contrasena: 'clave1234',
      puesto: 'Ventas',
      fechaNacimiento: '2012-05-10',
      consentimientoFamilia: true,
      privacidadAceptada: true,
      alias: 'Lince42',
      anonimo: true,
      mentorIA: false,
      personalidadMentor: 'gracioso',
      tratamiento: 'femenino',
    });
  });

  it('nunca envía un resumen local de la contraseña ni datos que no son de la cuenta', () => {
    const cuerpo = cuerpoAlta({ ...estadoDelAlta, cuenta: { ...estadoDelAlta.cuenta, hashContrasena: 'abc' } }, 'x');
    assert.ok(!('hashContrasena' in cuerpo));
    assert.ok(!('ajustes' in cuerpo) && !('cursoId' in cuerpo));
  });

  it('sin consentimiento registrado, lo envía como false', () => {
    assert.equal(cuerpoAlta({ ...estadoDelAlta, consentimientoFamilia: null }, 'x').consentimientoFamilia, false);
  });
});

describe('perfil del servidor', () => {
  it('se pasa al estado de la app como una sesión con el alta completa', () => {
    assert.deepEqual(estadoDesdePerfil(perfil), {
      cuenta: {
        empresa: 'Acme Formación',
        nombre: 'Lucía',
        apellidos: 'García Pérez',
        email: 'lucia@acme.es',
        puesto: 'Ventas',
        creada: '2026-11-27T10:02:00+00:00',
      },
      fechaNacimiento: '2012-05-10',
      consentimientoFamilia: '2026-11-27T10:01:00+00:00',
      alias: 'Lince42',
      anonimo: true,
      mentorIA: false,
      personalidadMentor: 'gracioso',
      tratamiento: 'femenino',
      altaCompleta: true,
      sesionIniciada: true,
    });
  });

  it('los datos del perfil que se guardan en el servidor son los que el alumno puede cambiar', () => {
    assert.deepEqual(
      [...CAMPOS_PERFIL].sort(),
      ['alias', 'anonimo', 'apellidos', 'mentorIA', 'nombre', 'personalidadMentor', 'puesto', 'tratamiento'],
    );
  });
});

describe('progreso por cuenta', () => {
  it('el progreso no incluye la cuenta, la sesión ni los ajustes del dispositivo', () => {
    const progreso = progresoDe({
      ...estadoDelAlta,
      token: 'secreto',
      testHecho: true,
      dominio: { a: true },
      completadas: ['a'],
      mensajesMentor: [{ texto: 'Hola' }],
    });
    assert.equal(progreso.cursoId, 'python-desde-cero');
    assert.deepEqual(progreso.completadas, ['a']);
    for (const campo of ['cuenta', 'token', 'ajustes', 'alias', 'fechaNacimiento']) assert.ok(!(campo in progreso), campo);
  });

  it('cada cuenta tiene su clave, sin distinguir mayúsculas y sin el correo en claro', () => {
    assert.equal(claveProgreso('Lucia@Acme.es'), claveProgreso(' lucia@acme.es'));
    assert.notEqual(claveProgreso('lucia@acme.es'), claveProgreso('pablo@acme.es'));
    assert.ok(!claveProgreso('lucia@acme.es').includes('lucia'));
  });

  const DIA = 24 * 60 * 60 * 1000;
  const ahora = Date.parse('2026-11-27T12:00:00Z');
  const mensaje = (diasAtras) => ({ id: `${ahora - diasAtras * DIA}-0.5`, autor: 'alumno', texto: `hace ${diasAtras}` });

  it('el progreso guardado recuerda de qué cuenta es (por su fecha de creación)', () => {
    const guardado = progresoParaGuardar({ ...estadoDelAlta, completadas: ['a'] });
    assert.equal(guardado.cuentaCreadaEn, estadoDelAlta.cuenta.creada);
    assert.deepEqual(progresoRecuperado(guardado, { creadoEn: estadoDelAlta.cuenta.creada }, ahora).completadas, ['a']);
  });

  it('no se recupera el progreso de otra cuenta con el mismo correo (por ejemplo, reasignado)', () => {
    const guardado = progresoParaGuardar({ ...estadoDelAlta, completadas: ['a'] });
    assert.deepEqual(progresoRecuperado(guardado, { creadoEn: '2027-01-01T00:00:00+00:00' }, ahora), {});
  });

  it('los mensajes del mentor de más de 90 días no se recuperan (SPEC §6)', () => {
    const guardado = progresoParaGuardar({
      ...estadoDelAlta,
      mensajesMentor: [{ id: 'bienvenida', autor: 'mentor', texto: 'Hola' }, mensaje(91), mensaje(89)],
    });
    const recuperado = progresoRecuperado(guardado, { creadoEn: estadoDelAlta.cuenta.creada }, ahora);
    assert.deepEqual(recuperado.mensajesMentor.map((m) => m.id), ['bienvenida', mensaje(89).id]);
  });
});

const inicial = { cuenta: null, token: null, sesionIniciada: false, cursoId: null, completadas: [], alias: '', ajustes: {} };

describe('entrar y salir de una cuenta del servidor', () => {
  it('al entrar, el estado es el perfil del servidor, su token y su progreso guardado, y conserva los ajustes', () => {
    const anterior = { ...inicial, ajustes: { tema: 'oscuro' }, alias: 'Otro', cursoId: 'otro-curso' };
    const estado = estadoAlEntrar(anterior, { token: 't1', perfil }, { cursoId: 'python-desde-cero' }, inicial);
    assert.equal(estado.token, 't1');
    assert.equal(estado.alias, 'Lince42');
    assert.equal(estado.cursoId, 'python-desde-cero');
    assert.deepEqual(estado.ajustes, { tema: 'oscuro' });
    assert.equal(estado.cuentaConocida, true);
  });

  it('al terminar el alta (misma cuenta), conserva el progreso que ya tenía en el móvil', () => {
    const anterior = { ...inicial, cuenta: { email: 'lucia@acme.es' }, cursoId: 'python-desde-cero' };
    assert.equal(estadoAlEntrar(anterior, { token: 't1', perfil }, {}, inicial).cursoId, 'python-desde-cero');
  });

  it('al salir no queda nada de la cuenta: solo los ajustes del dispositivo y que ya se entró aquí', () => {
    const conSesion = estadoAlEntrar({ ...inicial, ajustes: { tema: 'oscuro' } }, { token: 't1', perfil }, {}, inicial);
    const fuera = estadoAlSalir(conSesion, inicial);
    assert.deepEqual(fuera, { ...inicial, ajustes: { tema: 'oscuro' }, cuentaConocida: true });
    assert.ok(!JSON.stringify(fuera).match(/Lucía|lucia@acme|Lince42|t1/));
  });

  it('al eliminar la cuenta, la bienvenida deja de ofrecer iniciar sesión', () => {
    const conSesion = estadoAlEntrar(inicial, { token: 't1', perfil }, {}, inicial);
    assert.equal(estadoAlSalir(conSesion, inicial, { cuentaConocida: false }).cuentaConocida, false);
  });

  it('un cambio del perfil va a la cuenta (nombre, apellidos, puesto) o a los ajustes del alumno', () => {
    const estado = estadoAlEntrar(inicial, { token: 't1', perfil }, {}, inicial);
    const cambiado = aplicarCambiosPerfil(estado, { nombre: 'Ana', puesto: 'Dirección', mentorIA: true, alias: 'Nuevo' });
    assert.equal(cambiado.cuenta.nombre, 'Ana');
    assert.equal(cambiado.cuenta.puesto, 'Dirección');
    assert.equal(cambiado.cuenta.email, 'lucia@acme.es');
    assert.equal(cambiado.mentorIA, true);
    assert.equal(cambiado.alias, 'Nuevo');
  });
});

describe('mensajes de error', () => {
  it('cada error del servidor tiene un mensaje para el alumno', () => {
    assert.match(mensajeDeError({ codigo: 'sin_conexion' }), /No hemos podido conectar/);
    assert.equal(mensajeDeError({ codigo: 'base_datos_no_disponible' }), mensajeDeError({ codigo: 'sin_conexion' }));
    assert.equal(mensajeDeError({ codigo: 'credenciales_incorrectas' }), 'El correo o la contraseña no son correctos.');
    assert.match(mensajeDeError({ codigo: 'email_registrado' }), /Ya hay una cuenta con ese correo/);
    assert.match(mensajeDeError({ codigo: 'sesion_no_valida' }), /sesión ha caducado/);
    assert.equal(mensajeDeError({ codigo: 'contrasena_incorrecta' }), 'La contraseña no es correcta.');
  });

  it('las reglas del alta muestran el mensaje del servidor, que está pensado para el alumno', () => {
    const mensaje = 'Con menos de 14 años, hace falta el consentimiento de tu familia para continuar.';
    assert.equal(mensajeDeError({ codigo: 'consentimiento_necesario', mensaje }), mensaje);
  });

  it('los errores técnicos nunca muestran el mensaje del servidor', () => {
    for (const codigo of ['validacion', 'interno', 'conflicto', 'datos_no_validos', 'otro']) {
      const texto = mensajeDeError({ codigo, mensaje: "El campo 'email' no admite ese valor." });
      assert.ok(!texto.includes("'email'"), codigo);
    }
    assert.match(mensajeDeError({}), /No se ha podido/);
  });
});

describe('contraseña durante el alta', () => {
  it('se guarda en una variable del módulo (no en el estado ni en localStorage) y se puede olvidar', () => {
    guardarContrasenaAlta('clave1234');
    assert.equal(contrasenaAlta(), 'clave1234');
    olvidarContrasenaAlta();
    assert.equal(contrasenaAlta(), null);
  });
});
