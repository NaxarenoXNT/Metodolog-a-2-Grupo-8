const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const crearApp = require('../src/app');
const VehiculoRepositoryMemoria = require('../src/repositories/vehiculo.repository.memoria');
const {
  JWT_SECRET_PRUEBAS,
  crearUsuario,
  bearer,
} = require('../test-helpers/auth');

function crearContexto() {
  const vehiculoRepository = new VehiculoRepositoryMemoria();
  const app = crearApp({
    jwtSecret: JWT_SECRET_PRUEBAS,
    vehiculoRepository,
  });
  return { app, vehiculoRepository };
}

const ANA = crearUsuario(1, { nombre: 'Ana', email: 'ana@example.com' });
const BETO = crearUsuario(2, { nombre: 'Beto', email: 'beto@example.com' });
const VEHICULO = {
  tipo: 'auto',
  marca: 'Toyota',
  modelo: 'Etios',
  capacidadAsientos: 5,
  consumoL100km: 6.8,
  tipoCombustible: 'nafta',
};

describe('POST y GET /api/vehiculos', () => {
  test('crea un vehículo para el usuario autenticado y lista solo los propios', async () => {
    const { app } = crearContexto();

    const creadoAna = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', bearer(ANA))
      .send({ ...VEHICULO, usuarioId: BETO.id })
      .expect(201);
    await request(app)
      .post('/api/vehiculos')
      .set('Authorization', bearer(BETO))
      .send({ ...VEHICULO, modelo: 'Cronos' })
      .expect(201);

    assert.equal(creadoAna.body.usuarioId, ANA.id);
    assert.deepEqual(
      (await request(app)
        .get('/api/vehiculos')
        .set('Authorization', bearer(ANA))
        .expect(200)).body,
      [{ id: 1, usuarioId: ANA.id, ...VEHICULO }],
    );
    assert.deepEqual(
      (await request(app)
        .get('/api/vehiculos')
        .set('Authorization', bearer(BETO))
        .expect(200)).body.map((vehiculo) => vehiculo.usuarioId),
      [BETO.id],
    );
  });

  test('ambos endpoints exigen autenticación', async () => {
    const { app } = crearContexto();

    const creacion = await request(app)
      .post('/api/vehiculos')
      .send(VEHICULO)
      .expect(401);
    const listado = await request(app).get('/api/vehiculos').expect(401);

    assert.equal(creacion.body.error, 'NO_AUTENTICADO');
    assert.equal(listado.body.error, 'NO_AUTENTICADO');
  });

  test('valida tipo, capacidad y consumo', async () => {
    const { app } = crearContexto();

    const respuesta = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', bearer(ANA))
      .send({ tipo: '', capacidadAsientos: 0, consumoL100km: -1 })
      .expect(400);

    assert.equal(respuesta.body.error, 'SOLICITUD_INVALIDA');
    assert.deepEqual(respuesta.body.detalles, [
      'tipo es obligatorio',
      'capacidadAsientos debe ser un entero positivo',
      'consumoL100km debe ser un número positivo',
    ]);
  });
});

describe('VehiculoRepositoryMemoria', () => {
  test('cumple el contrato async, filtra por usuario y devuelve copias', async () => {
    const repositorio = new VehiculoRepositoryMemoria();
    const promesa = repositorio.crear({ usuarioId: ANA.id, ...VEHICULO });
    assert.equal(promesa instanceof Promise, true);

    const creado = await promesa;
    creado.modelo = 'Modificado';
    assert.equal((await repositorio.buscarPorId(creado.id)).modelo, VEHICULO.modelo);
    assert.equal(await repositorio.buscarPorId(999), null);
    assert.equal((await repositorio.listarPorUsuario(ANA.id)).length, 1);
    assert.deepEqual(await repositorio.listarPorUsuario(BETO.id), []);
  });
});
