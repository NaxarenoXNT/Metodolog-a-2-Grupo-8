const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const CostoService = require('../src/services/costo.service');
const ViajeRepositoryMemoria = require('../src/repositories/viaje.repository.memoria');
const PartesIguales = require('../src/domain/division/PartesIguales');
const PorKilometro = require('../src/domain/division/PorKilometro');

function sumar(division) {
  return Math.round(division.reduce((s, parte) => s + parte.monto * 100, 0)) / 100;
}

function crearServicio(viajes) {
  return new CostoService({
    viajeRepository: new ViajeRepositoryMemoria(viajes),
  });
}

describe('Estrategia PartesIguales', () => {
  test('devuelve un array con monto dividido equitativamente', () => {
    const resultado = new PartesIguales().dividir(900, [
      { usuarioId: 'u1' },
      { usuarioId: 'u2' },
      { usuarioId: 'u3' },
    ]);

    assert.deepEqual(resultado, [
      { usuarioId: 'u1', monto: 300 },
      { usuarioId: 'u2', monto: 300 },
      { usuarioId: 'u3', monto: 300 },
    ]);
  });

  test('reparte los centavos sobrantes para que la suma dé el total', () => {
    const resultado = new PartesIguales().dividir(1000, [
      { usuarioId: 'u1' },
      { usuarioId: 'u2' },
      { usuarioId: 'u3' },
    ]);

    assert.deepEqual(
      resultado.map((parte) => parte.monto),
      [333.34, 333.33, 333.33],
    );
    assert.equal(sumar(resultado), 1000);
  });
});

describe('Estrategia PorKilometro', () => {
  test('reparte proporcionalmente a los km recorridos', () => {
    const resultado = new PorKilometro().dividir(1000, [
      { usuarioId: 'u1', kmRecorridos: 100 },
      { usuarioId: 'u2', kmRecorridos: 300 },
    ]);

    assert.deepEqual(resultado, [
      { usuarioId: 'u1', monto: 250 },
      { usuarioId: 'u2', monto: 750 },
    ]);
  });

  test('la suma da el total aunque la proporción no sea exacta', () => {
    const resultado = new PorKilometro().dividir(100, [
      { usuarioId: 'u1', kmRecorridos: 1 },
      { usuarioId: 'u2', kmRecorridos: 1 },
      { usuarioId: 'u3', kmRecorridos: 1 },
    ]);

    assert.equal(sumar(resultado), 100);
  });

  test('sin km cargados reparte en partes iguales', () => {
    const resultado = new PorKilometro().dividir(900, [
      { usuarioId: 'u1' },
      { usuarioId: 'u2', kmRecorridos: 0 },
    ]);

    assert.deepEqual(
      resultado.map((parte) => parte.monto),
      [450, 450],
    );
  });
});

describe('CostoService con el repositorio en memoria real', () => {
  const viajes = [
    {
      id: 1,
      distanciaKm: 6,
      pasajeros: [{ usuarioId: 'u1' }, { usuarioId: 'u2' }],
    },
    { id: 2, distanciaKm: null },
  ];

  test('calcularCostoTotal multiplica distanciaKm por precioPorKm', () => {
    // precioPorKm = 150 -> 6 * 150 = 900
    assert.equal(crearServicio(viajes).calcularCostoTotal(1), 900);
  });

  test('dividirGastos con modo "iguales" devuelve el array correcto', () => {
    assert.deepEqual(crearServicio(viajes).dividirGastos(1, 'iguales'), [
      { usuarioId: 'u1', monto: 450 },
      { usuarioId: 'u2', monto: 450 },
    ]);
  });

  test('lanza VIAJE_NO_ENCONTRADO (404) si el viaje no existe', () => {
    assert.throws(() => crearServicio(viajes).calcularCostoTotal(999), {
      statusCode: 404,
      code: 'VIAJE_NO_ENCONTRADO',
    });
  });

  test('lanza DISTANCIA_NO_DISPONIBLE (422) si el viaje no tiene distancia', () => {
    assert.throws(() => crearServicio(viajes).calcularCostoTotal(2), {
      statusCode: 422,
      code: 'DISTANCIA_NO_DISPONIBLE',
    });
  });

  test('lanza MODO_DIVISION_INVALIDO (400) con modos inexistentes o heredados', () => {
    for (const modo of ['xyz', 'toString', 'constructor']) {
      assert.throws(() => crearServicio(viajes).dividirGastos(1, modo), {
        statusCode: 400,
        code: 'MODO_DIVISION_INVALIDO',
      });
    }
  });
});

describe('Endpoints de costos', () => {
  const request = require('supertest');
  const crearApp = require('../src/app');

  function crearAppConViajes(viajes) {
    return crearApp({ viajeRepository: new ViajeRepositoryMemoria(viajes) });
  }

  const viajes = [
    {
      id: 1,
      distanciaKm: 10,
      pasajeros: [
        { usuarioId: 'u1', kmRecorridos: 2 },
        { usuarioId: 'u2', kmRecorridos: 8 },
      ],
    },
    { id: 2, distanciaKm: null },
  ];

  test('GET /api/viajes/:id/costo devuelve el costo total', async () => {
    const respuesta = await request(crearAppConViajes(viajes))
      .get('/api/viajes/1/costo')
      .expect(200);

    assert.deepEqual(respuesta.body, { viajeId: 1, costoTotal: 1500 });
  });

  test('GET /api/viajes/:id/division usa "iguales" por defecto', async () => {
    const respuesta = await request(crearAppConViajes(viajes))
      .get('/api/viajes/1/division')
      .expect(200);

    assert.deepEqual(respuesta.body, {
      viajeId: 1,
      modo: 'iguales',
      division: [
        { usuarioId: 'u1', monto: 750 },
        { usuarioId: 'u2', monto: 750 },
      ],
    });
  });

  test('GET /api/viajes/:id/division?modo=km reparte según los km', async () => {
    const respuesta = await request(crearAppConViajes(viajes))
      .get('/api/viajes/1/division?modo=km')
      .expect(200);

    assert.deepEqual(respuesta.body.division, [
      { usuarioId: 'u1', monto: 300 },
      { usuarioId: 'u2', monto: 1200 },
    ]);
  });

  test('el costo de un viaje publicado usa la distancia del proveedor', async () => {
    const app = crearApp({
      ahora: () => new Date('2026-10-11T12:00:00.000Z'),
      proveedorRutas: { calcularDistancia: async () => 690 },
    });

    const { body: viaje } = await request(app)
      .post('/api/viajes')
      .send({
        vehiculo: { capacidadAsientos: 4 },
        fecha: '2026-10-12T12:00:00.000Z',
        asientosDisponibles: 3,
        origen: { lat: -38.7183, lng: -62.2663 },
        destino: { lat: -34.6037, lng: -58.3816 },
      })
      .expect(201);

    const respuesta = await request(app)
      .get(`/api/viajes/${viaje.id}/costo`)
      .expect(200);

    // 690 km * 150 = 103500
    assert.equal(respuesta.body.costoTotal, 103500);
  });

  test('responde 404, 400, 400 y 422 en los casos de error', async () => {
    const app = crearAppConViajes(viajes);

    const casos = [
      ['/api/viajes/999/costo', 404, 'VIAJE_NO_ENCONTRADO'],
      ['/api/viajes/abc/costo', 400, 'ID_INVALIDO'],
      ['/api/viajes/1/division?modo=xyz', 400, 'MODO_DIVISION_INVALIDO'],
      ['/api/viajes/2/costo', 422, 'DISTANCIA_NO_DISPONIBLE'],
    ];

    for (const [url, status, codigo] of casos) {
      const respuesta = await request(app).get(url).expect(status);
      assert.equal(respuesta.body.error, codigo, url);
    }
  });
});