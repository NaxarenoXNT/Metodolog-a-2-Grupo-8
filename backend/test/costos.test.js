const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const CostoService = require('../src/services/costo.service');
const ViajeRepositoryMemoria = require('../src/repositories/viaje.repository.memoria');
const PartesIguales = require('../src/domain/division/PartesIguales');

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