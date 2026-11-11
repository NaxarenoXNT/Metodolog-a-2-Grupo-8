// Test de contrato de los repositorios. La misma batería de viajes corre
// contra ViajeRepositoryMemoria y ViajeRepositoryPostgres para comprobar que
// se pueden intercambiar. La parte de PostgreSQL solo corre si DATABASE_URL
// apunta a una base cuyo nombre termina en _test; si no, se saltea.
//
// Seguridad: cada test crea sus propios registros y al final se borran solo
// esos ids (nunca TRUNCATE ni DELETE sin WHERE id = ANY). No se asume que la
// base esté vacía. No se usa dotenv: backend/.env apunta a la base de
// desarrollo.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const crearPool = require('../src/db/pool');
const ViajeRepositoryMemoria = require('../src/repositories/viaje.repository.memoria');
const ViajeRepositoryPostgres = require('../src/repositories/viaje.repository.postgres');
const UsuarioRepositoryPostgres = require('../src/repositories/usuario.repository.postgres');
const VehiculoRepositoryPostgres = require('../src/repositories/vehiculo.repository.postgres');

const ID_INEXISTENTE = -1; // SERIAL nunca asigna ids negativos.

// Devuelve el motivo para saltear la parte de PostgreSQL, o null si se puede
// correr. Se evalúa antes de crear cualquier pool.
function motivoSalteoPostgres(url) {
  if (!url) {
    return 'DATABASE_URL no está definida';
  }

  let nombreBase;

  try {
    nombreBase = decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return 'DATABASE_URL no es una URL válida';
  }

  if (!nombreBase.endsWith('_test')) {
    return 'DATABASE_URL no apunta a una base *_test';
  }

  return null;
}

const MOTIVO_SALTEO_POSTGRES = motivoSalteoPostgres(process.env.DATABASE_URL);

// --- Entradas válidas igual en las dos implementaciones ---------------------
// Viajes siempre completos, con la precisión de los NUMERIC de la base
// (lat/lng 6 decimales, distancia 3, montos 2) y fecha en formato toISOString.

function pasajero(datos, indice, kmRecorridos) {
  const { usuarioId, nombre } = datos.pasajeros[indice];
  return { usuarioId, nombre, kmRecorridos };
}

function crearEntradaViaje(datos, opciones) {
  const {
    fecha,
    estado = 'pendiente',
    asientosDisponibles = 3,
    paradas = [
      { orden: 1, lat: -36.776943, lng: -59.858433, descripcion: 'Azul' },
      { orden: 2, lat: -35.578516, lng: -59.108221, descripcion: null },
    ],
    pasajeros = [],
    division = null,
  } = opciones;

  return {
    conductorId: datos.conductorId,
    vehiculo: structuredClone(datos.vehiculo),
    fecha,
    asientosDisponibles,
    origen: { lat: -38.7183, lng: -62.266347 },
    destino: { lat: -34.603722, lng: -58.381592 },
    paradas,
    distanciaKm: 690.125,
    pasajeros,
    estado,
    modoDivision: 'iguales',
    division,
  };
}

function corrida(iso, milisegundos) {
  return new Date(new Date(iso).getTime() + milisegundos).toISOString();
}

// Como la base puede tener otros viajes, no se compara la lista completa:
// cada id propio debe estar o no estar, y los propios deben salir en orden
// ascendente entre sí.
async function verificarListado(repo, filtros, { incluidos = [], excluidos = [] }) {
  const ids = (await repo.listar(filtros)).map((viaje) => viaje.id);

  for (const id of incluidos) {
    assert.ok(ids.includes(id), `falta el viaje ${id} con ${JSON.stringify(filtros)}`);
  }

  for (const id of excluidos) {
    assert.ok(!ids.includes(id), `sobra el viaje ${id} con ${JSON.stringify(filtros)}`);
  }

  const propios = ids.filter((id) => incluidos.includes(id));
  assert.deepEqual(propios, [...propios].sort((a, b) => a - b));
}

// --- Batería compartida -----------------------------------------------------
// crearContexto devuelve { repo, datos, registrarViaje }. datos tiene la forma
// que devolverían los repositorios de PostgreSQL:
// { conductorId, vehiculo (con id), pasajeros: [{ usuarioId (string), nombre }] }.

function probarContratoViajes(nombre, crearContexto) {
  describe(`Contrato ViajeRepository — ${nombre}`, () => {
    let repo;
    let datos;
    let registrarViaje;

    before(async () => {
      ({ repo, datos, registrarViaje } = await crearContexto());
    });

    async function guardar(opciones) {
      const entrada = crearEntradaViaje(datos, opciones);
      const guardado = await repo.guardar(entrada);
      registrarViaje(guardado.id);
      return { entrada, guardado };
    }

    test('los métodos del contrato devuelven Promise', () => {
      const resultados = [
        repo.listar({ desde: '2099-12-31T23:59:59.999Z' }),
        repo.buscarPorId(ID_INEXISTENTE),
        repo.actualizar({ ...crearEntradaViaje(datos, { fecha: '2099-01-01T00:00:00.000Z' }), id: ID_INEXISTENTE }),
      ];

      for (const resultado of resultados) {
        assert.ok(resultado instanceof Promise);
      }

      return Promise.all(resultados);
    });

    test('buscarPorId devuelve null si el viaje no existe', async () => {
      assert.equal(await repo.buscarPorId(ID_INEXISTENTE), null);
    });

    test('guardar asigna un id numérico y devuelve lo mismo que buscarPorId', async () => {
      const { guardado } = await guardar({
        fecha: '2099-03-10T12:00:00.000Z',
        pasajeros: [pasajero(datos, 0, 690.125)],
      });

      assert.ok(Number.isInteger(guardado.id));
      assert.deepStrictEqual(await repo.buscarPorId(guardado.id), guardado);
    });

    test('el viaje guardado conserva los datos de entrada', async () => {
      const { entrada, guardado } = await guardar({
        fecha: '2099-03-11T12:00:00.000Z',
        pasajeros: [pasajero(datos, 0, 345.5), pasajero(datos, 1, 690.125)],
      });

      assert.deepStrictEqual(guardado, { ...entrada, id: guardado.id });
      assert.deepStrictEqual(await repo.buscarPorId(guardado.id), { ...entrada, id: guardado.id });
    });

    test('fecha vuelve como el mismo string ISO en UTC', async () => {
      const fecha = '2099-03-12T08:30:15.250Z';
      const { guardado } = await guardar({ fecha });
      const leido = await repo.buscarPorId(guardado.id);

      assert.equal(leido.fecha, fecha);
      assert.equal(typeof leido.fecha, 'string');
    });

    test('los campos numéricos vuelven como number y usuarioId como string', async () => {
      const { guardado } = await guardar({
        fecha: '2099-03-13T12:00:00.000Z',
        pasajeros: [pasajero(datos, 0, 100.5)],
      });
      const leido = await repo.buscarPorId(guardado.id);

      assert.equal(typeof leido.distanciaKm, 'number');
      assert.equal(typeof leido.origen.lat, 'number');
      assert.equal(typeof leido.origen.lng, 'number');
      assert.equal(typeof leido.paradas[0].lat, 'number');
      assert.equal(typeof leido.pasajeros[0].kmRecorridos, 'number');
      assert.equal(typeof leido.pasajeros[0].usuarioId, 'string');
    });

    test('vehiculo vuelve completo, con capacidadAsientos numérica', async () => {
      const { guardado } = await guardar({ fecha: '2099-03-14T12:00:00.000Z' });
      const leido = await repo.buscarPorId(guardado.id);

      assert.deepStrictEqual(leido.vehiculo, datos.vehiculo);
      assert.equal(typeof leido.vehiculo.capacidadAsientos, 'number');
    });

    // Las paradas llegan siempre ordenadas: ViajeBuilder rechaza las desordenadas.
    test('las paradas vuelven ordenadas por orden', async () => {
      const { guardado } = await guardar({
        fecha: '2099-03-15T12:00:00.000Z',
        paradas: [
          { orden: 1, lat: -37.1, lng: -61.1, descripcion: 'Primera' },
          { orden: 2, lat: -36.2, lng: -60.2, descripcion: null },
          { orden: 3, lat: -35.3, lng: -59.3, descripcion: 'Tercera' },
        ],
      });
      const leido = await repo.buscarPorId(guardado.id);

      assert.deepEqual(leido.paradas.map((parada) => parada.orden), [1, 2, 3]);
    });

    test('los pasajeros conservan el orden en que se agregaron', async () => {
      const pasajeros = [pasajero(datos, 2, 50), pasajero(datos, 0, 60), pasajero(datos, 1, 70)];
      const { guardado } = await guardar({ fecha: '2099-03-16T12:00:00.000Z', pasajeros });

      assert.deepStrictEqual((await repo.buscarPorId(guardado.id)).pasajeros, pasajeros);
    });

    test('actualizar cambia asientos y estado y reemplaza la lista de pasajeros', async () => {
      const { guardado } = await guardar({
        fecha: '2099-03-17T12:00:00.000Z',
        asientosDisponibles: 2,
        pasajeros: [pasajero(datos, 0, 100), pasajero(datos, 1, 200)],
      });
      // Se quita al primero y se suma al tercero.
      const cambiado = {
        ...guardado,
        asientosDisponibles: 1,
        estado: 'cancelado',
        pasajeros: [pasajero(datos, 1, 200), pasajero(datos, 2, 300)],
      };

      const actualizado = await repo.actualizar(cambiado);

      assert.deepStrictEqual(actualizado, cambiado);
      assert.deepStrictEqual(await repo.buscarPorId(guardado.id), cambiado);
    });

    test('actualizar guarda la división con montos y buscarPorId la devuelve igual', async () => {
      const pasajeros = [pasajero(datos, 0, 690.125), pasajero(datos, 1, 345.5)];
      const { guardado } = await guardar({ fecha: '2099-03-18T12:00:00.000Z', pasajeros });
      const division = {
        modo: 'iguales',
        montos: [
          { usuarioId: pasajeros[0].usuarioId, monto: 51759.38 },
          { usuarioId: pasajeros[1].usuarioId, monto: 51759.37 },
        ],
      };

      const actualizado = await repo.actualizar({ ...guardado, division });

      assert.deepStrictEqual(actualizado.division, division);
      assert.deepStrictEqual(await repo.buscarPorId(guardado.id), { ...guardado, division });
    });

    test('actualizar sin pasajeros y con division null devuelve division null', async () => {
      const pasajeros = [pasajero(datos, 0, 100)];
      const { guardado } = await guardar({
        fecha: '2099-03-19T12:00:00.000Z',
        pasajeros,
        division: { modo: 'iguales', montos: [{ usuarioId: pasajeros[0].usuarioId, monto: 1000 }] },
      });

      const actualizado = await repo.actualizar({ ...guardado, pasajeros: [], division: null });

      assert.deepEqual(actualizado.pasajeros, []);
      assert.equal(actualizado.division, null);
      assert.equal((await repo.buscarPorId(guardado.id)).division, null);
    });

    test('actualizar devuelve null si el viaje no existe', async () => {
      const entrada = crearEntradaViaje(datos, { fecha: '2099-03-20T12:00:00.000Z' });
      assert.equal(await repo.actualizar({ ...entrada, id: ID_INEXISTENTE }), null);
    });

    test.describe('listar', () => {
      const FECHA_PENDIENTE = '2099-04-10T12:00:00.000Z';
      const FECHA_CANCELADO = '2099-04-10T15:00:00.000Z';
      let pendiente;
      let cancelado;

      before(async () => {
        ({ guardado: pendiente } = await guardar({ fecha: FECHA_PENDIENTE }));
        ({ guardado: cancelado } = await guardar({ fecha: FECHA_CANCELADO, estado: 'cancelado' }));
      });

      test('sin argumentos incluye los viajes creados', async () => {
        const ids = (await repo.listar()).map((viaje) => viaje.id);
        assert.ok(ids.includes(pendiente.id) && ids.includes(cancelado.id));
      });

      test('filtra por estado en los dos sentidos', async () => {
        await verificarListado(repo, { estado: 'cancelado' }, { incluidos: [cancelado.id], excluidos: [pendiente.id] });
        await verificarListado(repo, { estado: 'pendiente' }, { incluidos: [pendiente.id], excluidos: [cancelado.id] });
      });

      test('desde y hasta exactamente iguales a la fecha incluyen el viaje', async () => {
        await verificarListado(repo, { desde: FECHA_PENDIENTE, hasta: FECHA_PENDIENTE }, {
          incluidos: [pendiente.id],
          excluidos: [cancelado.id],
        });
        await verificarListado(repo, { desde: FECHA_PENDIENTE }, { incluidos: [pendiente.id, cancelado.id] });
        await verificarListado(repo, { hasta: FECHA_CANCELADO }, { incluidos: [pendiente.id, cancelado.id] });
      });

      test('con los bordes corridos 1 ms el viaje queda afuera', async () => {
        await verificarListado(repo, { desde: corrida(FECHA_PENDIENTE, 1) }, {
          incluidos: [cancelado.id],
          excluidos: [pendiente.id],
        });
        await verificarListado(repo, { hasta: corrida(FECHA_CANCELADO, -1) }, {
          incluidos: [pendiente.id],
          excluidos: [cancelado.id],
        });
        await verificarListado(repo, { desde: corrida(FECHA_PENDIENTE, 1), hasta: corrida(FECHA_CANCELADO, -1) }, {
          excluidos: [pendiente.id, cancelado.id],
        });
      });

      test('estado combinado con fechas filtra por las dos condiciones', async () => {
        const rango = { desde: FECHA_PENDIENTE, hasta: FECHA_CANCELADO };

        await verificarListado(repo, { ...rango, estado: 'cancelado' }, {
          incluidos: [cancelado.id],
          excluidos: [pendiente.id],
        });
        await verificarListado(repo, { estado: 'pendiente', desde: corrida(FECHA_PENDIENTE, 1) }, {
          excluidos: [pendiente.id, cancelado.id],
        });
      });

      test('los ids creados salen en orden ascendente', async () => {
        const { guardado: tercero } = await guardar({ fecha: '2099-04-10T09:00:00.000Z' });

        await verificarListado(repo, undefined, { incluidos: [pendiente.id, cancelado.id, tercero.id] });
        await verificarListado(repo, { desde: '2099-04-10T00:00:00.000Z', hasta: '2099-04-10T23:59:59.999Z' }, {
          incluidos: [pendiente.id, cancelado.id, tercero.id],
        });
      });
    });
  });
}

// --- Memoria ----------------------------------------------------------------

probarContratoViajes('memoria', () => ({
  repo: new ViajeRepositoryMemoria([]),
  datos: {
    conductorId: 1,
    vehiculo: {
      id: 1,
      usuarioId: 1,
      tipo: 'auto',
      marca: 'Fiat',
      modelo: 'Mobi',
      capacidadAsientos: 4,
      consumoL100km: 6,
      tipoCombustible: 'nafta',
    },
    pasajeros: [
      { usuarioId: '2', nombre: 'Ana' },
      { usuarioId: '3', nombre: 'Beto' },
      { usuarioId: '4', nombre: 'Carla' },
    ],
  },
  registrarViaje: () => {},
}));

// --- PostgreSQL ---------------------------------------------------------------

describe('Repositorios PostgreSQL', { skip: MOTIVO_SALTEO_POSTGRES ?? false }, () => {
  const creados = { viajes: [], vehiculos: [], usuarios: [] };
  const sufijo = Date.now();
  let contador = 0;
  let pool;
  let usuarios;
  let vehiculos;
  let datos;

  function emailUnico(rol) {
    contador += 1;
    return `contrato.${rol}.${sufijo}.${contador}@test.com`;
  }

  async function crearUsuario(nombre) {
    const usuario = await usuarios.crear({
      nombre,
      email: emailUnico(nombre.toLowerCase()),
      passwordHash: 'hash-de-prueba',
      telefono: null,
    });
    creados.usuarios.push(usuario.id);
    return usuario;
  }

  async function crearVehiculo(datosVehiculo) {
    const vehiculo = await vehiculos.crear(datosVehiculo);
    creados.vehiculos.push(vehiculo.id);
    return vehiculo;
  }

  before(async () => {
    pool = crearPool(process.env.DATABASE_URL);
    usuarios = new UsuarioRepositoryPostgres({ pool });
    vehiculos = new VehiculoRepositoryPostgres({ pool });

    const conductor = await crearUsuario('Conductor');
    const pasajeros = [
      await crearUsuario('Ana'),
      await crearUsuario('Beto'),
      await crearUsuario('Carla'),
    ];
    const vehiculo = await crearVehiculo({
      usuarioId: conductor.id,
      tipo: 'auto',
      marca: 'Fiat',
      modelo: 'Mobi',
      capacidadAsientos: 4,
      consumoL100km: 6,
      tipoCombustible: 'nafta',
    });

    datos = {
      conductorId: conductor.id,
      vehiculo,
      pasajeros: pasajeros.map((usuario) => ({ usuarioId: String(usuario.id), nombre: usuario.nombre })),
    };
  });

  // Corre aunque fallen tests (o el before a mitad de camino). Borra solo los
  // ids creados acá; paradas y pasajeros caen por ON DELETE CASCADE.
  after(async () => {
    if (!pool) {
      return;
    }

    try {
      await pool.query('DELETE FROM viajes WHERE id = ANY($1)', [creados.viajes]);
      await pool.query('DELETE FROM vehiculos WHERE id = ANY($1)', [creados.vehiculos]);
      await pool.query('DELETE FROM usuarios WHERE id = ANY($1)', [creados.usuarios]);
    } finally {
      await pool.end();
    }
  });

  probarContratoViajes('postgres', () => ({
    repo: new ViajeRepositoryPostgres({ pool }),
    datos,
    registrarViaje: (id) => creados.viajes.push(id),
  }));

  // Los repositorios en memoria de usuarios y vehículos (Negrete) todavía no
  // están en dev. Cuando existan, estos casos se pueden pasar a una batería
  // compartida como probarContratoViajes.
  describe('solo PostgreSQL', () => {
    test('actualizar hace rollback si falla un pasajero y deja el viaje intacto', async () => {
      const repo = new ViajeRepositoryPostgres({ pool });
      const guardado = await repo.guardar(
        crearEntradaViaje(datos, {
          fecha: '2099-05-10T12:00:00.000Z',
          asientosDisponibles: 2,
          pasajeros: [pasajero(datos, 0, 100), pasajero(datos, 1, 200)],
        }),
      );
      creados.viajes.push(guardado.id);

      await assert.rejects(
        repo.actualizar({
          ...guardado,
          asientosDisponibles: 0,
          pasajeros: [
            ...guardado.pasajeros,
            { usuarioId: String(ID_INEXISTENTE), nombre: 'Nadie', kmRecorridos: 10 },
          ],
        }),
        { code: '23503' },
      );

      const leido = await repo.buscarPorId(guardado.id);
      assert.equal(leido.asientosDisponibles, 2);
      assert.deepStrictEqual(leido.pasajeros, guardado.pasajeros);
    });

    test('UsuarioRepository.crear con email repetido rechaza con EMAIL_YA_REGISTRADO', async () => {
      const usuario = await crearUsuario('Repetido');

      await assert.rejects(
        usuarios.crear({ nombre: 'Otro', email: usuario.email, passwordHash: 'x' }),
        { code: 'EMAIL_YA_REGISTRADO', statusCode: 409 },
      );
    });

    test('UsuarioRepository.buscarPorEmail y buscarPorId encuentran al usuario o devuelven null', async () => {
      const usuario = await crearUsuario('Buscado');

      assert.deepStrictEqual(await usuarios.buscarPorEmail(usuario.email), usuario);
      assert.deepStrictEqual(await usuarios.buscarPorId(usuario.id), usuario);
      assert.equal(await usuarios.buscarPorEmail(`no-existe.${sufijo}@test.com`), null);
      assert.equal(await usuarios.buscarPorId(ID_INEXISTENTE), null);
    });

    test('VehiculoRepository.listarPorUsuario devuelve solo sus vehículos, ordenados por id', async () => {
      const duenio = await crearUsuario('Duenio');
      const conConsumo = await crearVehiculo({
        usuarioId: duenio.id,
        tipo: 'auto',
        marca: 'Toyota',
        modelo: 'Etios',
        capacidadAsientos: 5,
        consumoL100km: 7.25,
        tipoCombustible: 'nafta',
      });
      const sinConsumo = await crearVehiculo({ usuarioId: duenio.id, tipo: 'moto', capacidadAsientos: 2 });

      const lista = await vehiculos.listarPorUsuario(duenio.id);

      assert.deepStrictEqual(lista, [conConsumo, sinConsumo]);
      assert.ok(lista[0].id < lista[1].id);
      assert.equal(lista[0].consumoL100km, 7.25);
      assert.equal(lista[1].consumoL100km, null);
    });

    test('VehiculoRepository.buscarPorId devuelve null si el vehículo no existe', async () => {
      assert.equal(await vehiculos.buscarPorId(ID_INEXISTENTE), null);
    });
  });
});
