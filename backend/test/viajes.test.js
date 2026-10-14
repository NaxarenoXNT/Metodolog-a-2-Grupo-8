const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const crearApp = require('../src/app');

const AHORA = new Date('2026-10-11T12:00:00.000Z');

function crearDatosValidos(cambios = {}) {
  return {
    vehiculo: {
      id: 10,
      modelo: 'Auto de prueba',
      capacidadAsientos: 4,
    },
    fecha: '2026-10-12T12:00:00.000Z',
    asientosDisponibles: 3,
    origen: {
      nombre: 'Bahía Blanca',
      lat: -38.7183,
      lng: -62.2663,
    },
    destino: {
      nombre: 'CABA',
      lat: -34.6037,
      lng: -58.3816,
    },
    paradas: [
      { orden: 1, nombre: 'Tres Arroyos' },
      { orden: 2, nombre: 'Azul' },
    ],
    ...cambios,
  };
}

test('GET /api/viajes conserva los viajes que exponía el servidor original', async () => {
  const app = crearApp();

  const respuesta = await request(app).get('/api/viajes').expect(200);

  assert.deepEqual(respuesta.body, [
    {
      id: 1,
      origen: 'Bahía Blanca',
      destino: 'CABA',
      asientosDisponibles: 3,
    },
    {
      id: 2,
      origen: 'CABA',
      destino: 'Bahía Blanca',
      asientosDisponibles: 1,
    },
  ]);
});

test('POST /api/viajes publica un viaje válido y guarda la distancia del proveedor', async () => {
  const llamadas = [];
  const proveedorRutas = {
    async calcularDistancia(origen, destino) {
      llamadas.push({ origen, destino });
      return 690;
    },
  };
  const app = crearApp({ proveedorRutas, ahora: () => AHORA });
  const datos = crearDatosValidos();

  const creacion = await request(app)
    .post('/api/viajes')
    .send(datos)
    .expect(201);

  assert.equal(creacion.body.id, 3);
  assert.equal(creacion.body.distanciaKm, 690);
  assert.equal(creacion.body.fecha, '2026-10-12T12:00:00.000Z');
  assert.deepEqual(llamadas, [
    { origen: datos.origen, destino: datos.destino },
  ]);

  const consulta = await request(app).get('/api/viajes/3').expect(200);
  assert.deepEqual(consulta.body, creacion.body);
});

test('POST /api/viajes rechaza fechas pasadas antes de llamar al proveedor', async () => {
  let cantidadLlamadas = 0;
  const proveedorRutas = {
    async calcularDistancia() {
      cantidadLlamadas += 1;
      return 690;
    },
  };
  const app = crearApp({ proveedorRutas, ahora: () => AHORA });

  const respuesta = await request(app)
    .post('/api/viajes')
    .send(crearDatosValidos({ fecha: '2026-10-10T12:00:00.000Z' }))
    .expect(400);

  assert.equal(respuesta.body.error, 'VIAJE_INVALIDO');
  assert.ok(respuesta.body.detalles.includes('fecha debe ser futura'));
  assert.equal(cantidadLlamadas, 0);
});

test('POST /api/viajes rechaza más asientos que la capacidad del vehículo', async () => {
  const app = crearApp({ ahora: () => AHORA });

  const respuesta = await request(app)
    .post('/api/viajes')
    .send(crearDatosValidos({ asientosDisponibles: 5 }))
    .expect(400);

  assert.ok(
    respuesta.body.detalles.includes(
      'asientosDisponibles no puede superar la capacidad del vehículo',
    ),
  );
});

test('POST /api/viajes rechaza paradas fuera de orden', async () => {
  const app = crearApp({ ahora: () => AHORA });

  const respuesta = await request(app)
    .post('/api/viajes')
    .send(
      crearDatosValidos({
        paradas: [
          { orden: 2, nombre: 'Azul' },
          { orden: 1, nombre: 'Tres Arroyos' },
        ],
      }),
    )
    .expect(400);

  assert.ok(
    respuesta.body.detalles.includes(
      'las paradas deben estar ordenadas de forma ascendente',
    ),
  );
});

test('POST /api/viajes rechaza coordenadas nulas o vacías', async () => {
  const app = crearApp({ ahora: () => AHORA });

  const respuesta = await request(app)
    .post('/api/viajes')
    .send(
      crearDatosValidos({
        origen: { nombre: 'Origen inválido', lat: null, lng: '' },
      }),
    )
    .expect(400);

  assert.equal(respuesta.body.error, 'VIAJE_INVALIDO');
  assert.ok(
    respuesta.body.detalles.includes('origen.lat debe estar entre -90 y 90'),
  );
  assert.ok(
    respuesta.body.detalles.includes('origen.lng debe estar entre -180 y 180'),
  );
});

test('POST /api/viajes responde 400 si el cuerpo JSON es null', async () => {
  const app = crearApp({ ahora: () => AHORA });

  const respuesta = await request(app)
    .post('/api/viajes')
    .set('Content-Type', 'application/json')
    .send('null')
    .expect(400);

  assert.equal(respuesta.body.error, 'JSON_INVALIDO');
  assert.equal(respuesta.body.mensaje, 'El cuerpo debe ser un objeto JSON válido');
});

test('GET /api/viajes/:id responde 404 cuando el viaje no existe', async () => {
  const app = crearApp();

  const respuesta = await request(app).get('/api/viajes/999').expect(404);

  assert.equal(respuesta.body.error, 'VIAJE_NO_ENCONTRADO');
});

test('GET /api/viajes/:id responde 400 cuando el id es inválido', async () => {
  const app = crearApp();

  const respuesta = await request(app).get('/api/viajes/no-es-id').expect(400);

  assert.equal(respuesta.body.error, 'ID_INVALIDO');
});
