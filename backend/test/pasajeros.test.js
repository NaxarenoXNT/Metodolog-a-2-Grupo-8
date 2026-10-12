const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const crearApp = require('../src/app');
const ViajeRepositoryMemoria = require('../src/repositories/viaje.repository.memoria');
const PublicadorEventos = require('../src/domain/eventos/PublicadorEventos');
const { EVENTOS_PASAJEROS } = require('../src/domain/eventos/PublicadorEventos');
const PasajeroService = require('../src/services/pasajero.service');

function crearViajes() {
  return [
    {
      id: 1,
      vehiculo: { capacidadAsientos: 4 },
      asientosDisponibles: 2,
      distanciaKm: 10, // 10 km * 150 = 1500
      pasajeros: [],
    },
    { id: 2, asientosDisponibles: 1, distanciaKm: null },
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
    viajeRepository: new ViajeRepositoryMemoria(crearViajes()),
    notificador,
  });
  return { app, notificador };
}

describe('PublicadorEventos (Observer)', () => {
  test('avisa a cada observador suscripto, en orden', () => {
    const publicador = new PublicadorEventos();
    const llamadas = [];

    publicador.suscribir('x', { notificar: (d) => llamadas.push(['a', d.valor]) });
    publicador.suscribir('x', { notificar: (d) => llamadas.push(['b', d.valor]) });
    publicador.suscribir('y', { notificar: () => llamadas.push(['c']) });

    publicador.emitir('x', { valor: 7 });

    assert.deepEqual(llamadas, [
      ['a', 7],
      ['b', 7],
    ]);
  });

  test('se puede desuscribir un observador', () => {
    const publicador = new PublicadorEventos();
    let veces = 0;
    const desuscribir = publicador.suscribir('x', { notificar: () => veces++ });

    publicador.emitir('x', {});
    desuscribir();
    publicador.emitir('x', {});

    assert.equal(veces, 1);
  });

  test('rechaza observadores sin método notificar', () => {
    assert.throws(() => new PublicadorEventos().suscribir('x', {}), TypeError);
  });
});

describe('PasajeroService', () => {
  test('emite pasajero:sumado y pasajero:bajado sin conocer a los observadores', () => {
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

    servicio.sumar(1, { usuarioId: 'u1' });
    servicio.bajar(1, 'u1');

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
      .send({ usuarioId: 'u1', nombre: 'Ana' })
      .expect(201);

    const respuesta = await request(app)
      .post('/api/viajes/1/pasajeros')
      .send({ usuarioId: 'u2', nombre: 'Beto' })
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

    await request(app).post('/api/viajes/1/pasajeros').send({ usuarioId: 'u1' });
    const { body: viaje } = await request(app)
      .post('/api/viajes/1/pasajeros')
      .send({ usuarioId: 'u2' });
    const { body: division } = await request(app)
      .get('/api/viajes/1/division?modo=iguales')
      .expect(200);

    assert.deepEqual(viaje.division.montos, division.division);
  });

  test('guarda kmRecorridos para la división por kilómetro', async () => {
    const { app } = crearAppDePrueba();

    await request(app)
      .post('/api/viajes/1/pasajeros')
      .send({ usuarioId: 'u1', kmRecorridos: 2 });
    await request(app)
      .post('/api/viajes/1/pasajeros')
      .send({ usuarioId: 'u2', kmRecorridos: 8 });

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
      .send({ usuarioId: 'u1' })
      .expect(201);

    assert.equal(respuesta.body.asientosDisponibles, 0);
    assert.equal(respuesta.body.division, null);
  });

  test('responde con los errores esperados', async () => {
    const { app, notificador } = crearAppDePrueba();

    await request(app).post('/api/viajes/2/pasajeros').send({ usuarioId: 'u1' });

    const casos = [
      ['/api/viajes/999/pasajeros', { usuarioId: 'u9' }, 404, 'VIAJE_NO_ENCONTRADO'],
      ['/api/viajes/abc/pasajeros', { usuarioId: 'u9' }, 400, 'ID_INVALIDO'],
      ['/api/viajes/1/pasajeros', {}, 400, 'PASAJERO_INVALIDO'],
      ['/api/viajes/1/pasajeros', { usuarioId: 'u9', kmRecorridos: 50 }, 400, 'PASAJERO_INVALIDO'],
      ['/api/viajes/2/pasajeros', { usuarioId: 'u1' }, 409, 'PASAJERO_YA_SUMADO'],
      ['/api/viajes/2/pasajeros', { usuarioId: 'u2' }, 409, 'SIN_ASIENTOS'],
    ];

    for (const [url, cuerpo, status, codigo] of casos) {
      const respuesta = await request(app).post(url).send(cuerpo).expect(status);
      assert.equal(respuesta.body.error, codigo, `${url} ${JSON.stringify(cuerpo)}`);
    }

    // Solo la primera operación válida generó un aviso.
    assert.equal(notificador.enviados.length, 1);
  });
});

describe('DELETE /api/viajes/:id/pasajeros/:usuarioId', () => {
  test('baja al pasajero, devuelve el asiento, recalcula la división y avisa', async () => {
    const { app, notificador } = crearAppDePrueba();

    await request(app).post('/api/viajes/1/pasajeros').send({ usuarioId: 'u1' });
    await request(app).post('/api/viajes/1/pasajeros').send({ usuarioId: 'u2' });

    const respuesta = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
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
      'u1 se bajó del viaje 1. Asientos disponibles: 1.',
    );
  });

  test('si se baja el último pasajero la división queda vacía', async () => {
    const { app } = crearAppDePrueba();

    await request(app).post('/api/viajes/1/pasajeros').send({ usuarioId: 'u1' });
    const respuesta = await request(app)
      .delete('/api/viajes/1/pasajeros/u1')
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
      const respuesta = await request(app).delete(url).expect(404);
      assert.equal(respuesta.body.error, codigo, url);
    }
  });
});