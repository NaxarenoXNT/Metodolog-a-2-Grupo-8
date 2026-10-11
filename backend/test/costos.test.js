const { test, describe } = require('node:test');
const assert = require('node:assert');
const CostoService = require('../src/services/costo.service');
const PartesIguales = require('../src/domain/division/PartesIguales');

describe('Estrategia PartesIguales', () => {
  test('devuelve un array con monto dividido equitativamente', () => {
    const estrategia = new PartesIguales();
    const costoTotal = 900;
    const pasajeros = [
      { usuarioId: 'u1' },
      { usuarioId: 'u2' },
      { usuarioId: 'u3' },
    ];

    const resultado = estrategia.dividir(costoTotal, pasajeros);

    assert.deepStrictEqual(resultado, [
      { usuarioId: 'u1', monto: 300 },
      { usuarioId: 'u2', monto: 300 },
      { usuarioId: 'u3', monto: 300 },
    ]);
  });
});

describe('CostoService con mock de viajeRepo', () => {
  test('calcularCostoTotal multiplica distanciaTotalKm por precioPorKm', async () => {
    const viajeRepoMock = {
      obtenerViajePorId: async () => ({
        id: 'v1',
        distanciaTotalKm: 6,
        pasajeros: [
          { usuarioId: 'u1' },
          { usuarioId: 'u2' },
        ],
      }),
    };

    const costoService = new CostoService(viajeRepoMock);
    const costoTotal = await costoService.calcularCostoTotal('v1');

    // precioPorKm = 150 -> 6 * 150 = 900
    assert.strictEqual(costoTotal, 900);
  });

  test('dividirGastos con modo "iguales" devuelve el array correcto', async () => {
    const viajeRepoMock = {
      obtenerViajePorId: async () => ({
        id: 'v1',
        distanciaTotalKm: 6,
        pasajeros: [
          { usuarioId: 'u1' },
          { usuarioId: 'u2' },
        ],
      }),
    };

    const costoService = new CostoService(viajeRepoMock);
    const division = await costoService.dividirGastos('v1', 'iguales');

    assert.deepStrictEqual(division, [
      { usuarioId: 'u1', monto: 450 },
      { usuarioId: 'u2', monto: 450 },
    ]);
  });
});
