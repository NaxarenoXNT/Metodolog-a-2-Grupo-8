const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const crearApp = require('../src/app');
const ViajeRepositoryMemoria = require('../src/repositories/viaje.repository.memoria');
const MapboxAdapter = require('../src/adapters/MapboxAdapter');

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

function crearAppConProveedor() {
  return crearApp({
    ahora: () => AHORA,
    proveedorRutas: { calcularDistancia: async () => 690 },
  });
}

async function publicarViaje(app, cambios) {
  const { body } = await request(app)
    .post('/api/viajes')
    .send(crearDatosValidos(cambios))
    .expect(201);

  return body;
}

test('POST /api/viajes publica el viaje con estado pendiente y ignora el estado enviado', async () => {
  const app = crearAppConProveedor();

  const viaje = await publicarViaje(app, { estado: 'cancelado' });

  assert.equal(viaje.estado, 'pendiente');
});

test('PATCH /api/viajes/:id/cancelar cancela un viaje pendiente', async () => {
  const app = crearAppConProveedor();
  const viaje = await publicarViaje(app);

  const respuesta = await request(app)
    .patch(`/api/viajes/${viaje.id}/cancelar`)
    .expect(200);

  assert.deepEqual(respuesta.body, { ...viaje, estado: 'cancelado' });

  const consulta = await request(app).get(`/api/viajes/${viaje.id}`).expect(200);
  assert.equal(consulta.body.estado, 'cancelado');
});

test('PATCH /api/viajes/:id/cancelar responde 409 VIAJE_NO_MODIFICABLE si ya está cancelado', async () => {
  const app = crearAppConProveedor();
  const viaje = await publicarViaje(app);

  await request(app).patch(`/api/viajes/${viaje.id}/cancelar`).expect(200);
  const respuesta = await request(app)
    .patch(`/api/viajes/${viaje.id}/cancelar`)
    .expect(409);

  assert.equal(respuesta.body.error, 'VIAJE_NO_MODIFICABLE');
});

test('PATCH /api/viajes/:id/cancelar responde 404 si no existe y 400 si el id es inválido', async () => {
  const app = crearAppConProveedor();

  const noExiste = await request(app).patch('/api/viajes/999/cancelar').expect(404);
  const invalido = await request(app).patch('/api/viajes/abc/cancelar').expect(400);

  assert.equal(noExiste.body.error, 'VIAJE_NO_ENCONTRADO');
  assert.equal(invalido.body.error, 'ID_INVALIDO');
});

// Viajes con fechas elegidas alrededor de los bordes del día 2026-12-15 en hora
// argentina (UTC-03:00): ese día va de 2026-12-15T03:00:00.000Z a
// 2026-12-16T02:59:59.999Z.
function crearViajesParaFiltros() {
  return [
    { id: 1, estado: 'pendiente', fecha: '2026-12-14T20:00:00.000Z' }, // 14/12 17:00
    { id: 2, estado: 'pendiente', fecha: '2026-12-15T02:59:59.999Z' }, // 14/12 23:59:59.999
    { id: 3, estado: 'pendiente', fecha: '2026-12-15T03:00:00.000Z' }, // 15/12 00:00:00.000
    { id: 4, estado: 'cancelado', fecha: '2026-12-16T02:59:00.000Z' }, // 15/12 23:59:00
    { id: 5, estado: 'pendiente', fecha: '2026-12-16T02:59:59.999Z' }, // 15/12 23:59:59.999
    { id: 6, estado: 'pendiente', fecha: '2026-12-16T03:00:00.000Z' }, // 16/12 00:00:00.000
    { id: 7, estado: 'pendiente', fecha: '2026-12-20T12:00:00.000Z' },
    { id: 8, estado: 'pendiente' }, // sin fecha
  ];
}

function crearAppConViajesParaFiltros() {
  return crearApp({
    viajeRepository: new ViajeRepositoryMemoria(crearViajesParaFiltros()),
  });
}

async function listarIds(app, filtros) {
  const respuesta = await request(app)
    .get('/api/viajes')
    .query(filtros)
    .expect(200);

  return respuesta.body.map((viaje) => viaje.id);
}

async function pedirFiltroInvalido(app, filtros) {
  const respuesta = await request(app)
    .get('/api/viajes')
    .query(filtros)
    .expect(400);

  assert.equal(respuesta.body.error, 'FILTRO_INVALIDO');
  assert.ok(Array.isArray(respuesta.body.detalles));

  return respuesta.body.detalles;
}

const MENSAJE_FECHA_INVALIDA =
  'debe ser una fecha YYYY-MM-DD o ISO 8601 con zona horaria';

test('GET /api/viajes sin filtros devuelve todos los viajes, también con parámetros desconocidos', async () => {
  const app = crearAppConViajesParaFiltros();
  const todos = [1, 2, 3, 4, 5, 6, 7, 8];

  assert.deepEqual(await listarIds(app, {}), todos);
  assert.deepEqual(await listarIds(app, { otro: 'valor' }), todos);
});

test('GET /api/viajes?estado filtra por estado', async () => {
  const app = crearAppConViajesParaFiltros();

  assert.deepEqual(await listarIds(app, { estado: 'cancelado' }), [4]);
  assert.deepEqual(
    await listarIds(app, { estado: 'pendiente' }),
    [1, 2, 3, 5, 6, 7, 8],
  );
});

test('GET /api/viajes?desde incluye el inicio del día argentino y excluye viajes sin fecha', async () => {
  const app = crearAppConViajesParaFiltros();

  // El 2 (14/12 23:59:59.999) queda afuera; el 3 (15/12 00:00:00.000) entra.
  assert.deepEqual(await listarIds(app, { desde: '2026-12-15' }), [3, 4, 5, 6, 7]);
});

test('GET /api/viajes?hasta cubre el día argentino entero y excluye viajes sin fecha', async () => {
  const app = crearAppConViajesParaFiltros();

  // El 4 (15/12 23:59:00) y el 5 (15/12 23:59:59.999) entran; el 6 (16/12 00:00) no.
  assert.deepEqual(await listarIds(app, { hasta: '2026-12-15' }), [1, 2, 3, 4, 5]);
});

test('GET /api/viajes con desde y hasta del mismo día devuelve solo ese día argentino', async () => {
  const app = crearAppConViajesParaFiltros();

  assert.deepEqual(
    await listarIds(app, { desde: '2026-12-15', hasta: '2026-12-15' }),
    [3, 4, 5],
  );
});

test('GET /api/viajes combina estado, desde y hasta', async () => {
  const app = crearAppConViajesParaFiltros();

  assert.deepEqual(
    await listarIds(app, {
      estado: 'pendiente',
      desde: '2026-12-15',
      hasta: '2026-12-15',
    }),
    [3, 5],
  );
  assert.deepEqual(
    await listarIds(app, { estado: 'cancelado', desde: '2026-12-16' }),
    [],
  );
});

test('GET /api/viajes: desde y hasta son inclusivos al milisegundo', async () => {
  const app = crearAppConViajesParaFiltros();

  // El viaje 3 sale exactamente a 2026-12-15T03:00:00.000Z.
  assert.deepEqual(
    await listarIds(app, {
      desde: '2026-12-15T03:00:00.000Z',
      hasta: '2026-12-15T03:00:00.000Z',
    }),
    [3],
  );
  assert.deepEqual(
    await listarIds(app, { desde: '2026-12-15T03:00:00.001Z', hasta: '2026-12-15' }),
    [4, 5],
  );
  // El viaje 5 sale exactamente a 2026-12-16T02:59:59.999Z.
  assert.deepEqual(
    await listarIds(app, { desde: '2026-12-16T02:59:59.999Z', hasta: '2026-12-16T02:59:59.999Z' }),
    [5],
  );
  assert.deepEqual(
    await listarIds(app, { desde: '2026-12-16T02:59:59.000Z', hasta: '2026-12-16T02:59:59.998Z' }),
    [],
  );
});

test('GET /api/viajes: el solo-día es hora argentina y el ISO con zona se usa tal cual', async () => {
  const app = crearAppConViajesParaFiltros();
  const desdeDia = [3, 4, 5, 6, 7];

  // Mismo instante que '2026-12-15' en hora argentina, escrito de tres formas.
  assert.deepEqual(await listarIds(app, { desde: '2026-12-15' }), desdeDia);
  assert.deepEqual(await listarIds(app, { desde: '2026-12-15T03:00:00.000Z' }), desdeDia);
  assert.deepEqual(await listarIds(app, { desde: '2026-12-15T00:00:00-03:00' }), desdeDia);

  // 00:00 UTC es 21:00 del día anterior en Argentina: entra también el viaje 2.
  assert.deepEqual(
    await listarIds(app, { desde: '2026-12-15T00:00:00Z' }),
    [2, 3, 4, 5, 6, 7],
  );

  // Lo mismo para hasta: el fin del día argentino no es el fin del día UTC.
  assert.deepEqual(await listarIds(app, { hasta: '2026-12-15' }), [1, 2, 3, 4, 5]);
  assert.deepEqual(
    await listarIds(app, { hasta: '2026-12-15T23:59:59.999Z' }),
    [1, 2, 3],
  );
  assert.deepEqual(
    await listarIds(app, { hasta: '2026-12-15T23:59:59.999-03:00' }),
    [1, 2, 3, 4, 5],
  );
});

test('GET /api/viajes responde 400 FILTRO_INVALIDO si desde es posterior a hasta', async () => {
  const app = crearAppConViajesParaFiltros();

  const detalles = await pedirFiltroInvalido(app, {
    desde: '2026-12-16',
    hasta: '2026-12-15',
  });

  assert.deepEqual(detalles, ['desde no puede ser posterior a hasta']);
});

test('GET /api/viajes responde 400 FILTRO_INVALIDO con un estado desconocido o vacío', async () => {
  const app = crearAppConViajesParaFiltros();

  for (const estado of ['en_curso', 'Pendiente', '']) {
    const detalles = await pedirFiltroInvalido(app, { estado });

    assert.deepEqual(detalles, ['estado debe ser uno de: pendiente, cancelado']);
  }
});

test('GET /api/viajes responde 400 FILTRO_INVALIDO con fechas inválidas', async () => {
  const app = crearAppConViajesParaFiltros();
  const invalidas = [
    'no-es-fecha',
    '2026-02-30', // el día no existe
    '2026-13-01', // el mes no existe
    '2026-12-15T10:00:00', // ISO sin zona: dependería del servidor
    '2026-12-15T25:00:00Z',
    '2026-12-15T10:00:00+24:00',
    '',
  ];

  for (const valor of invalidas) {
    assert.deepEqual(
      await pedirFiltroInvalido(app, { desde: valor }),
      [`desde ${MENSAJE_FECHA_INVALIDA}`],
      `desde=${valor}`,
    );
    assert.deepEqual(
      await pedirFiltroInvalido(app, { hasta: valor }),
      [`hasta ${MENSAJE_FECHA_INVALIDA}`],
      `hasta=${valor}`,
    );
  }
});

test('GET /api/viajes junta todos los errores de filtros en detalles', async () => {
  const app = crearAppConViajesParaFiltros();

  const detalles = await pedirFiltroInvalido(app, {
    estado: 'en_curso',
    desde: 'ayer',
    hasta: 'mañana',
  });

  assert.deepEqual(detalles, [
    'estado debe ser uno de: pendiente, cancelado',
    `desde ${MENSAJE_FECHA_INVALIDA}`,
    `hasta ${MENSAJE_FECHA_INVALIDA}`,
  ]);
});

test('GET /api/viajes rechaza parámetros repetidos', async () => {
  const app = crearAppConViajesParaFiltros();

  const respuesta = await request(app)
    .get('/api/viajes?estado=pendiente&estado=cancelado')
    .expect(400);

  assert.equal(respuesta.body.error, 'FILTRO_INVALIDO');
  assert.deepEqual(respuesta.body.detalles, ['estado debe tener un único valor']);
});

test.describe('ViajeRepositoryMemoria.listar(filtros)', () => {
  function crearRepositorio(viajes = crearViajesParaFiltros()) {
    return new ViajeRepositoryMemoria(viajes);
  }

  async function ids(repositorio, filtros) {
    const viajes = await repositorio.listar(filtros);
    return viajes.map((viaje) => viaje.id);
  }

  test('sin filtros devuelve todos los viajes, en orden y como copias', async () => {
    const repositorio = crearRepositorio();

    for (const filtros of [undefined, null, {}]) {
      assert.deepEqual(await ids(repositorio, filtros), [1, 2, 3, 4, 5, 6, 7, 8]);
    }

    const viajes = await repositorio.listar();
    viajes[0].estado = 'modificado desde afuera';

    assert.equal((await repositorio.buscarPorId(1)).estado, 'pendiente');
  });

  test('filtra por estado exacto', async () => {
    const repositorio = crearRepositorio();

    assert.deepEqual(await ids(repositorio, { estado: 'cancelado' }), [4]);
    assert.deepEqual(await ids(repositorio, { estado: 'pendiente' }), [1, 2, 3, 5, 6, 7, 8]);
  });

  test('desde y hasta son inclusivos al milisegundo', async () => {
    const repositorio = crearRepositorio();
    const desde = '2026-12-15T03:00:00.000Z';
    const hasta = '2026-12-16T02:59:59.999Z';

    assert.deepEqual(await ids(repositorio, { desde, hasta }), [3, 4, 5]);
    assert.deepEqual(
      await ids(repositorio, { desde: '2026-12-15T03:00:00.001Z', hasta }),
      [4, 5],
    );
    assert.deepEqual(
      await ids(repositorio, { desde, hasta: '2026-12-16T02:59:59.998Z' }),
      [3, 4],
    );
  });

  test('compara instantes y no texto: la fecha del viaje puede tener otra zona', async () => {
    const repositorio = crearRepositorio([
      { id: 1, fecha: '2026-12-15T00:00:00.000-03:00' }, // = 03:00:00.000Z
      { id: 2, fecha: '2026-12-14T23:59:59.999-03:00' }, // = 02:59:59.999Z
    ]);

    // Como texto, '2026-12-15T00:...' sería menor que '2026-12-15T03:...'.
    assert.deepEqual(await ids(repositorio, { desde: '2026-12-15T03:00:00.000Z' }), [1]);
    assert.deepEqual(await ids(repositorio, { hasta: '2026-12-15T02:59:59.999Z' }), [2]);
  });

  test('con filtro de fecha excluye viajes sin fecha o con fecha inválida; con solo estado los conserva', async () => {
    const repositorio = crearRepositorio([
      { id: 1, estado: 'pendiente' },
      { id: 2, estado: 'pendiente', fecha: null },
      { id: 3, estado: 'pendiente', fecha: 'no-es-fecha' },
      { id: 4, estado: 'pendiente', fecha: '2026-12-15T12:00:00.000Z' },
    ]);

    assert.deepEqual(await ids(repositorio, { desde: '2026-01-01T00:00:00.000Z' }), [4]);
    assert.deepEqual(await ids(repositorio, { hasta: '2027-01-01T00:00:00.000Z' }), [4]);
    assert.deepEqual(await ids(repositorio, { estado: 'pendiente' }), [1, 2, 3, 4]);
  });

  test('combina estado, desde y hasta', async () => {
    const repositorio = crearRepositorio();

    assert.deepEqual(
      await ids(repositorio, {
        estado: 'pendiente',
        desde: '2026-12-15T03:00:00.000Z',
        hasta: '2026-12-16T02:59:59.999Z',
      }),
      [3, 5],
    );
  });

  test('rechaza filtros de fecha que no se pueden interpretar', async () => {
    const repositorio = crearRepositorio();

    await assert.rejects(() => repositorio.listar({ desde: 'no-es-fecha' }), TypeError);
    await assert.rejects(() => repositorio.listar({ hasta: 'no-es-fecha' }), TypeError);
  });
});

// Ninguno de estos tests llama a Mapbox: fetch está reemplazado y, cuando hace
// falta, también el reloj del timeout (para no esperar 10 s reales).
test.describe('MapboxAdapter: tiempo límite con fetch stubbeado', () => {
  const origen = { lat: -38.7183, lng: -62.2663 };
  const destino = { lat: -34.6037, lng: -58.3816 };

  test('le pasa a fetch un AbortSignal.timeout de 10 s', async (t) => {
    const timeout = t.mock.method(
      AbortSignal,
      'timeout',
      () => new AbortController().signal,
    );
    const fetchFalso = t.mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ routes: [{ distance: 690000 }] }),
    }));

    const distanciaKm = await new MapboxAdapter('token-de-prueba').calcularDistancia(
      origen,
      destino,
    );

    assert.equal(distanciaKm, 690);
    assert.deepEqual(
      timeout.mock.calls.map((llamada) => llamada.arguments),
      [[10000]],
    );
    assert.equal(fetchFalso.mock.callCount(), 1);
    assert.equal(
      fetchFalso.mock.calls[0].arguments[1].signal,
      timeout.mock.calls[0].result,
    );
  });

  test('si Mapbox no responde a tiempo, POST /api/viajes responde 502 PROVEEDOR_RUTAS_NO_DISPONIBLE', async (t) => {
    // El timeout "vence" a los 5 ms en lugar de a los 10 s.
    t.mock.method(AbortSignal, 'timeout', () => {
      const controlador = new AbortController();
      setTimeout(() => {
        controlador.abort(
          new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
        );
      }, 5);
      return controlador.signal;
    });
    // Mapbox "colgado": fetch solo termina cuando se aborta su signal. Si el
    // adapter no lo pasa, el stub responde bien y el test falla por el status.
    const fetchFalso = t.mock.method(globalThis, 'fetch', (url, opciones) => {
      const signal = opciones?.signal;

      if (!signal) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ routes: [{ distance: 690000 }] }),
        });
      }

      return new Promise((resolver, rechazar) => {
        signal.addEventListener('abort', () => rechazar(signal.reason), { once: true });
      });
    });
    const app = crearApp({
      ahora: () => AHORA,
      proveedorRutas: new MapboxAdapter('token-de-prueba'),
    });

    const respuesta = await request(app)
      .post('/api/viajes')
      .send(crearDatosValidos())
      .expect(502);

    assert.equal(respuesta.body.error, 'PROVEEDOR_RUTAS_NO_DISPONIBLE');
    assert.equal(fetchFalso.mock.callCount(), 1);

    // El viaje no se guardó: el próximo id libre (3) sigue sin existir.
    await request(app).get('/api/viajes/3').expect(404);
  });
});
