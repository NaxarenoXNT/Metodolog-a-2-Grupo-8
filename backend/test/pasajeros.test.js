const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const crearApp = require('../src/app');
const ViajeRepositoryMemoria = require('../src/repositories/viaje.repository.memoria');
const PublicadorEventos = require('../src/domain/eventos/PublicadorEventos');
const { EVENTOS_PASAJEROS } = require('../src/domain/eventos/PublicadorEventos');
const PasajeroService = require('../src/services/pasajero.service');
const {
  JWT_SECRET_PRUEBAS,
  crearUsuario,
  bearer,
} = require('../test-helpers/auth');

const CONDUCTOR = crearUsuario('conductor', {
  nombre: 'Conductor',
  email: 'conductor@example.com',
});
const USUARIO_1 = crearUsuario('u1', {
  nombre: 'Ana',
  email: 'ana@example.com',
});
const USUARIO_2 = crearUsuario('u2', {
  nombre: 'Beto',
  email: 'beto@example.com',
});
const USUARIO_9 = crearUsuario('u9');

function crearViajes() {
  return [
    {
      id: 1,
      conductorId: CONDUCTOR.id,
      vehiculo: { capacidadAsientos: 4 },
      asientosDisponibles: 2,
      distanciaKm: 10, // 10 km * 150 = 1500
      pasajeros: [],
      estado: 'pendiente',
    },
    {
      id: 2,
      conductorId: CONDUCTOR.id,
      asientosDisponibles: 1,
      distanciaKm: null,
      estado: 'pendiente',
    },
  ];
}

function crearNotificadorFalso() {
  const enviados = [];
  return {
    enviados,
    enviar(aviso) {
      enviados.push(aviso);
    },
  };
}

function crearAppDePrueba() {
  const notificador = crearNotificadorFalso();
  const app = crearApp({
    jwtSecret: JWT_SECRET_PRUEBAS,
    viajeRepository: new ViajeRepositoryMemoria(crearViajes()),
    notificador,
  });
  return { app, notificador };
}

describe('PublicadorEventos (Observer)', () => {
  test('avisa a cada observador suscripto, en orden', async () => {
    const publicador = new PublicadorEventos();
    const llamadas = [];

    publicador.suscribir('x', { notificar: (d) => llamadas.push(['a', d.valor]) });
    publicador.suscribir('x', { notificar: (d) => llamadas.push(['b', d.valor]) });
    publicador.suscribir('y', { notificar: () => llamadas.push(['c']) });

    await publicador.emitir('x', { valor: 7 });

    assert.deepEqual(llamadas, [
      ['a', 7],
      ['b', 7],
    ]);
  });

  test('espera a cada observador asíncrono antes de llamar al siguiente', async () => {
    const publicador = new PublicadorEventos();
    const llamadas = [];

    publicador.suscribir('x', {
      notificar: async () => {
        llamadas.push('a:inicio');
        await new Promise((resolver) => setTimeout(resolver, 20));
        llamadas.push('a:fin');
      },
    });
    publicador.suscribir('x', { notificar: async () => llamadas.push('b') });

    await publicador.emitir('x', {});

    assert.deepEqual(llamadas, ['a:inicio', 'a:fin', 'b']);
  });

  test('si un observador lanza, corta la emisión y propaga el error', async () => {
    const publicador = new PublicadorEventos();
    const llamadas = [];
    const falla = new Error('falló el observador');

    publicador.suscribir('x', { notificar: async () => llamadas.push('a') });
    publicador.suscribir('x', {
      notificar: async () => {
        throw falla;
      },
    });
    publicador.suscribir('x', { notificar: async () => llamadas.push('c') });

    await assert.rejects(() => publicador.emitir('x', {}), falla);
    assert.deepEqual(llamadas, ['a']);
  });

  test('se puede desuscribir un observador', async () => {
    const publicador = new PublicadorEventos();
    let veces = 0;
    const desuscribir = publicador.suscribir('x', { notificar: () => veces++ });

    await publicador.emitir('x', {});
    desuscribir();
    await publicador.emitir('x', {});

    assert.equal(veces, 1);
  });

  test('rechaza observadores sin método notificar', () => {
    assert.throws(() => new PublicadorEventos().suscribir('x', {}), TypeError);
  });
});

describe('PasajeroService', () => {
  test('emite pasajero:sumado y pasajero:bajado sin conocer a los observadores', async () => {
    const publicador = new PublicadorEventos();
    const eventos = [];
    for (const evento of Object.values(EVENTOS_PASAJEROS)) {
      publicador.suscribir(evento, {
        notificar: (d) => eventos.push([d.evento, d.viajeId, d.pasajero.usuarioId]),
      });
    }
    const servicio = new PasajeroService({
      viajeRepository: new ViajeRepositoryMemoria(crearViajes()),
      publicador,
    });

    await servicio.sumar(1, { usuarioId: 'u1' });
    await servicio.bajar(1, 'u1');

    assert.deepEqual(eventos, [
      ['pasajero:sumado', 1, 'u1'],
      ['pasajero:bajado', 1, 'u1'],
    ]);
  });
});

describe('POST /api/viajes/:id/pasajeros', () => {
  test('suma al pasajero, descuenta un asiento, recalcula la división y avisa', async () => {
    const { app, notificador } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({ usuarioId: 'u2', nombre: 'Nombre falso' })
      .expect(201);

    const respuesta = await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_2))
      .send({})
      .expect(201);

    assert.equal(respuesta.body.asientosDisponibles, 0);
    assert.deepEqual(respuesta.body.pasajeros, [
      { usuarioId: 'u1', nombre: 'Ana', kmRecorridos: 10 },
      { usuarioId: 'u2', nombre: 'Beto', kmRecorridos: 10 },
    ]);
    assert.deepEqual(respuesta.body.division, {
      modo: 'iguales',
      montos: [
        { usuarioId: 'u1', monto: 750 },
        { usuarioId: 'u2', monto: 750 },
      ],
    });
    assert.equal(notificador.enviados.length, 2);
    assert.equal(
      notificador.enviados[1].mensaje,
      'Beto se sumó al viaje 1. Asientos disponibles: 0.',
    );
  });

  test('la división guardada coincide con GET /division del integrante 2', async () => {
    const { app } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({});
    const { body: viaje } = await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_2))
      .send({});
    const { body: division } = await request(app)
      .get('/api/viajes/1/division?modo=iguales')
      .expect(200);

    assert.deepEqual(viaje.division.montos, division.division);
  });

  test('guarda kmRecorridos para la división por kilómetro', async () => {
    const { app } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({ kmRecorridos: 2 });
    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_2))
      .send({ kmRecorridos: 8 });

    const respuesta = await request(app)
      .get('/api/viajes/1/division?modo=km')
      .expect(200);

    assert.deepEqual(respuesta.body.division, [
      { usuarioId: 'u1', monto: 300 },
      { usuarioId: 'u2', monto: 1200 },
    ]);
  });

  test('sin distancia calculada igual suma al pasajero y deja la división en null', async () => {
    const { app } = crearAppDePrueba();

    const respuesta = await request(app)
      .post('/api/viajes/2/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({})
      .expect(201);

    assert.equal(respuesta.body.asientosDisponibles, 0);
    assert.equal(respuesta.body.division, null);
  });

  test('responde con los errores esperados', async () => {
    const { app, notificador } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/2/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({});

    const casos = [
      ['/api/viajes/999/pasajeros', {}, USUARIO_9, 404, 'VIAJE_NO_ENCONTRADO'],
      ['/api/viajes/abc/pasajeros', {}, USUARIO_9, 400, 'ID_INVALIDO'],
      ['/api/viajes/1/pasajeros', { kmRecorridos: 0 }, USUARIO_9, 400, 'PASAJERO_INVALIDO'],
      ['/api/viajes/1/pasajeros', { kmRecorridos: 50 }, USUARIO_9, 400, 'PASAJERO_INVALIDO'],
      ['/api/viajes/2/pasajeros', {}, USUARIO_1, 409, 'PASAJERO_YA_SUMADO'],
      ['/api/viajes/2/pasajeros', {}, USUARIO_2, 409, 'SIN_ASIENTOS'],
    ];

    for (const [url, cuerpo, usuario, status, codigo] of casos) {
      const respuesta = await request(app)
        .post(url)
        .set('Authorization', bearer(usuario))
        .send(cuerpo)
        .expect(status);
      assert.equal(respuesta.body.error, codigo, `${url} ${JSON.stringify(cuerpo)}`);
    }

    // Solo la primera operación válida generó un aviso.
    assert.equal(notificador.enviados.length, 1);
  });
});

describe('DELETE /api/viajes/:id/pasajeros/:usuarioId', () => {
  test('baja al pasajero, devuelve el asiento, recalcula la división y avisa', async () => {
    const { app, notificador } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({});
    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_2))
      .send({});

    const respuesta = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
      .set('Authorization', bearer(USUARIO_1))
      .expect(200);

    assert.equal(respuesta.body.asientosDisponibles, 1);
    assert.deepEqual(
      respuesta.body.pasajeros.map((p) => p.usuarioId),
      ['u2'],
    );
    assert.deepEqual(respuesta.body.division.montos, [
      { usuarioId: 'u2', monto: 1500 },
    ]);
    assert.equal(
      notificador.enviados.at(-1).mensaje,
      'Ana se bajó del viaje 1. Asientos disponibles: 1.',
    );
  });

  test('si se baja el último pasajero la división queda vacía', async () => {
    const { app } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({});
    const respuesta = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
      .set('Authorization', bearer(USUARIO_1))
      .expect(200);

    assert.equal(respuesta.body.asientosDisponibles, 2);
    assert.deepEqual(respuesta.body.division.montos, []);
  });

  test('responde 404 si el viaje o el pasajero no existen', async () => {
    const { app } = crearAppDePrueba();

    const casos = [
      ['/api/viajes/999/pasajeros/u1', 'VIAJE_NO_ENCONTRADO'],
      ['/api/viajes/1/pasajeros/u1', 'PASAJERO_NO_ENCONTRADO'],
    ];

    for (const [url, codigo] of casos) {
      const respuesta = await request(app)
        .delete(url)
        .set('Authorization', bearer(USUARIO_1))
        .expect(404);
      assert.equal(respuesta.body.error, codigo, url);
    }
  });

  test('solo el propio pasajero o el conductor pueden darlo de baja', async () => {
    const { app } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({})
      .expect(201);

    const prohibido = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
      .set('Authorization', bearer(USUARIO_2))
      .expect(403);
    assert.equal(prohibido.body.error, 'PROHIBIDO');

    await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
      .set('Authorization', bearer(CONDUCTOR))
      .expect(200);
  });
});

describe('Autenticación de pasajeros', () => {
  test('POST y DELETE rechazan solicitudes sin token', async () => {
    const { app } = crearAppDePrueba();

    const alta = await request(app)
      .post('/api/viajes/1/pasajeros')
      .send({})
      .expect(401);
    const baja = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
      .expect(401);

    assert.equal(alta.body.error, 'NO_AUTENTICADO');
    assert.equal(baja.body.error, 'NO_AUTENTICADO');
  });
});

describe('Viajes que no están pendientes', () => {
  // El viaje 1 queda con u1 como pasajero y cancelado.
  async function crearAppConViajeCancelado() {
    const contexto = crearAppDePrueba();

    await request(contexto.app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_1))
      .send({})
      .expect(201);
    await request(contexto.app)
      .patch('/api/viajes/1/cancelar')
      .set('Authorization', bearer(CONDUCTOR))
      .expect(200);

    return contexto;
  }

  async function verificarViajeSinCambios(app, notificador, avisosAntes) {
    const { body: viaje } = await request(app).get('/api/viajes/1').expect(200);

    assert.equal(viaje.estado, 'cancelado');
    assert.deepEqual(
      viaje.pasajeros.map((pasajero) => pasajero.usuarioId),
      ['u1'],
    );
    assert.equal(viaje.asientosDisponibles, 1);
    assert.equal(notificador.enviados.length, avisosAntes);
  }

  test('POST /pasajeros responde 409 VIAJE_NO_MODIFICABLE y no cambia el viaje', async () => {
    const { app, notificador } = await crearAppConViajeCancelado();
    const avisosAntes = notificador.enviados.length;

    const respuesta = await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_2))
      .send({})
      .expect(409);

    assert.equal(respuesta.body.error, 'VIAJE_NO_MODIFICABLE');
    await verificarViajeSinCambios(app, notificador, avisosAntes);
  });

  test('DELETE /pasajeros/:usuarioId responde 409 VIAJE_NO_MODIFICABLE y no cambia el viaje', async () => {
    const { app, notificador } = await crearAppConViajeCancelado();
    const avisosAntes = notificador.enviados.length;

    const respuesta = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
      .set('Authorization', bearer(USUARIO_1))
      .expect(409);

    assert.equal(respuesta.body.error, 'VIAJE_NO_MODIFICABLE');
    await verificarViajeSinCambios(app, notificador, avisosAntes);
  });

  test('el 409 se chequea antes que las validaciones de cada operación', async () => {
    const { app } = await crearAppConViajeCancelado();

    // Sin el orden 404 -> 409 -> resto, estos darían 400 y 404.
    const sumarInvalido = await request(app)
      .post('/api/viajes/1/pasajeros')
      .set('Authorization', bearer(USUARIO_2))
      .send({ kmRecorridos: 0 })
      .expect(409);
    const bajarInexistente = await request(app)
      .delete('/api/viajes/1/pasajeros/u9')
      .set('Authorization', bearer(USUARIO_9))
      .expect(409);

    assert.equal(sumarInvalido.body.error, 'VIAJE_NO_MODIFICABLE');
    assert.equal(bajarInexistente.body.error, 'VIAJE_NO_MODIFICABLE');
  });
});
