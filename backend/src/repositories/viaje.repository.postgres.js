const { filaAVehiculo } = require('./vehiculo.repository.postgres');

// Repositorio de viajes sobre PostgreSQL. Implementa el mismo contrato que
// ViajeRepositoryMemoria (listar, buscarPorId, guardar, actualizar). Un viaje
// se arma con datos de cinco tablas: viajes, vehiculos, paradas,
// viaje_pasajeros y usuarios (para el nombre de cada pasajero).

// Consulta base: viaje + vehículo. Las columnas del vehículo llevan el prefijo
// vehiculo_ para que no choquen con las del viaje (por ejemplo, id).
const SELECT_VIAJES = `
  SELECT
    v.id,
    v.conductor_id,
    v.vehiculo_id,
    v.fecha_salida,
    v.origen_lat,
    v.origen_lng,
    v.destino_lat,
    v.destino_lng,
    v.distancia_km,
    v.asientos_disponibles,
    v.modo_division,
    v.estado,
    ve.usuario_id AS vehiculo_usuario_id,
    ve.tipo AS vehiculo_tipo,
    ve.marca AS vehiculo_marca,
    ve.modelo AS vehiculo_modelo,
    ve.capacidad_asientos AS vehiculo_capacidad_asientos,
    ve.consumo_l_100km AS vehiculo_consumo_l_100km,
    ve.tipo_combustible AS vehiculo_tipo_combustible
  FROM viajes v
  JOIN vehiculos ve ON ve.id = v.vehiculo_id`;

// pg devuelve NUMERIC como string. Los servicios usan Number.isFinite, así
// que se convierte a número; NULL se conserva (Number(null) daría 0).
function numeroONull(valor) {
  return valor == null ? null : Number(valor);
}

// Arma el viaje del contrato a partir de la fila principal (viaje + vehículo)
// y de las filas de paradas y pasajeros que le pertenecen.
function filaAViaje(fila, paradas = [], pasajeros = []) {
  if (!fila) {
    return null;
  }

  const conMonto = pasajeros.filter((pasajero) => pasajero.monto_pagar != null);

  return {
    id: fila.id,
    conductorId: fila.conductor_id,
    vehiculo: filaAVehiculo({
      id: fila.vehiculo_id,
      usuario_id: fila.vehiculo_usuario_id,
      tipo: fila.vehiculo_tipo,
      marca: fila.vehiculo_marca,
      modelo: fila.vehiculo_modelo,
      capacidad_asientos: fila.vehiculo_capacidad_asientos,
      consumo_l_100km: fila.vehiculo_consumo_l_100km,
      tipo_combustible: fila.vehiculo_tipo_combustible,
    }),
    fecha: new Date(fila.fecha_salida).toISOString(),
    asientosDisponibles: fila.asientos_disponibles,
    origen: { lat: Number(fila.origen_lat), lng: Number(fila.origen_lng) },
    destino: { lat: Number(fila.destino_lat), lng: Number(fila.destino_lng) },
    paradas: paradas.map((parada) => ({
      orden: parada.orden,
      lat: Number(parada.lat),
      lng: Number(parada.lng),
      descripcion: parada.descripcion,
    })),
    distanciaKm: numeroONull(fila.distancia_km),
    // usuarioId como string: PasajeroService compara con ===.
    pasajeros: pasajeros.map((pasajero) => ({
      usuarioId: String(pasajero.usuario_id),
      nombre: pasajero.nombre,
      kmRecorridos: numeroONull(pasajero.km_recorridos),
    })),
    estado: fila.estado,
    modoDivision: fila.modo_division,
    // La división no tiene tabla propia: se reconstruye con monto_pagar.
    division:
      conMonto.length === 0
        ? null
        : {
            modo: fila.modo_division,
            montos: conMonto.map((pasajero) => ({
              usuarioId: String(pasajero.usuario_id),
              monto: Number(pasajero.monto_pagar),
            })),
          },
  };
}

class ViajeRepositoryPostgres {
  constructor({ pool }) {
    this.pool = pool;
  }

  // Los filtros llegan normalizados ({ estado, desde, hasta }, con desde y
  // hasta como ISO UTC). Ambos bordes de fecha son inclusivos.
  async listar(filtros) {
    const { estado, desde, hasta } = filtros ?? {};
    const condiciones = [];
    const valores = [];

    if (estado != null) {
      valores.push(estado);
      condiciones.push(`v.estado = $${valores.length}`);
    }

    if (desde != null) {
      valores.push(desde);
      condiciones.push(`v.fecha_salida >= $${valores.length}`);
    }

    if (hasta != null) {
      valores.push(hasta);
      condiciones.push(`v.fecha_salida <= $${valores.length}`);
    }

    const where =
      condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';
    const { rows } = await this.pool.query(
      `${SELECT_VIAJES}${where} ORDER BY v.id`,
      valores,
    );

    return armarViajes(this.pool, rows);
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_VIAJES} WHERE v.id = $1`, [
      id,
    ]);
    const [viaje] = await armarViajes(this.pool, rows);

    return viaje ?? null;
  }

  // Inserta viaje, paradas y pasajeros en una sola transacción y devuelve el
  // viaje releído, con la misma forma que buscarPorId. El id lo asigna la base.
  async guardar(viaje) {
    const client = await this.pool.connect();
    let enTransaccion = false;
    let descartarConexion = false;
    let id;

    try {
      await client.query('BEGIN');
      enTransaccion = true;

      const { rows } = await client.query(
        `INSERT INTO viajes
           (conductor_id, vehiculo_id, fecha_salida, origen_lat, origen_lng,
            destino_lat, destino_lng, distancia_km, asientos_disponibles,
            modo_division, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          viaje.conductorId,
          viaje.vehiculoId ?? viaje.vehiculo?.id,
          viaje.fecha,
          viaje.origen?.lat,
          viaje.origen?.lng,
          viaje.destino?.lat,
          viaje.destino?.lng,
          viaje.distanciaKm ?? null,
          viaje.asientosDisponibles,
          viaje.modoDivision ?? 'iguales',
          viaje.estado ?? 'pendiente',
        ],
      );
      id = rows[0].id;

      for (const parada of viaje.paradas ?? []) {
        await client.query(
          `INSERT INTO paradas (viaje_id, orden, lat, lng, descripcion)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, parada.orden, parada.lat, parada.lng, parada.descripcion ?? null],
        );
      }

      await insertarPasajeros(client, id, viaje);

      enTransaccion = false;
      await client.query('COMMIT');
    } catch (error) {
      if (enTransaccion) {
        descartarConexion = await deshacer(client);
      }
      throw error;
    } finally {
      liberar(client, descartarConexion);
    }

    return this.buscarPorId(id);
  }

  // Actualiza los datos que cambian los servicios (asientos, estado,
  // distancia, modo de división) y reemplaza la lista de pasajeros. El DELETE
  // y los INSERT van en la misma transacción: si falla un pasajero, el
  // ROLLBACK restaura la lista anterior completa.
  async actualizar(viaje) {
    const client = await this.pool.connect();
    let enTransaccion = false;
    let descartarConexion = false;

    try {
      await client.query('BEGIN');
      enTransaccion = true;

      const { rowCount } = await client.query(
        `UPDATE viajes
         SET asientos_disponibles = $1,
             estado = $2,
             distancia_km = $3,
             modo_division = $4
         WHERE id = $5`,
        [
          viaje.asientosDisponibles,
          viaje.estado,
          viaje.distanciaKm ?? null,
          viaje.modoDivision ?? 'iguales',
          viaje.id,
        ],
      );

      if (rowCount === 0) {
        // Se marca antes para que, si este ROLLBACK falla, el catch no
        // intente un segundo ROLLBACK. En ese caso no hay error previo que
        // preservar: se relanza el del ROLLBACK y la conexión se descarta.
        enTransaccion = false;
        try {
          await client.query('ROLLBACK');
        } catch (error) {
          descartarConexion = true;
          throw error;
        }
        return null;
      }

      await client.query('DELETE FROM viaje_pasajeros WHERE viaje_id = $1', [
        viaje.id,
      ]);
      await insertarPasajeros(client, viaje.id, viaje);

      enTransaccion = false;
      await client.query('COMMIT');
    } catch (error) {
      if (enTransaccion) {
        descartarConexion = await deshacer(client);
      }
      throw error;
    } finally {
      liberar(client, descartarConexion);
    }

    return this.buscarPorId(viaje.id);
  }
}

// Completa las filas principales con sus paradas y pasajeros usando dos
// consultas en total (ANY), no dos por viaje. Sin viajes no consulta nada más.
async function armarViajes(pool, filas) {
  if (filas.length === 0) {
    return [];
  }

  const ids = filas.map((fila) => fila.id);

  const { rows: paradas } = await pool.query(
    `SELECT viaje_id, orden, lat, lng, descripcion
     FROM paradas
     WHERE viaje_id = ANY($1)
     ORDER BY viaje_id, orden`,
    [ids],
  );

  // ORDER BY vp.id conserva el orden en que se sumaron los pasajeros.
  const { rows: pasajeros } = await pool.query(
    `SELECT vp.viaje_id, vp.usuario_id, u.nombre, vp.km_recorridos,
            vp.monto_pagar
     FROM viaje_pasajeros vp
     JOIN usuarios u ON u.id = vp.usuario_id
     WHERE vp.viaje_id = ANY($1)
     ORDER BY vp.viaje_id, vp.id`,
    [ids],
  );

  const paradasPorViaje = agruparPorViaje(paradas);
  const pasajerosPorViaje = agruparPorViaje(pasajeros);

  return filas.map((fila) =>
    filaAViaje(
      fila,
      paradasPorViaje.get(fila.id) ?? [],
      pasajerosPorViaje.get(fila.id) ?? [],
    ),
  );
}

function agruparPorViaje(filas) {
  const grupos = new Map();

  for (const fila of filas) {
    if (!grupos.has(fila.viaje_id)) {
      grupos.set(fila.viaje_id, []);
    }
    grupos.get(fila.viaje_id).push(fila);
  }

  return grupos;
}

// El monto de cada pasajero sale de viaje.division.montos. Los ids se comparan
// como texto porque las estrategias de división los devuelven como string.
async function insertarPasajeros(client, viajeId, viaje) {
  const montos = viaje.division?.montos ?? [];

  for (const pasajero of viaje.pasajeros ?? []) {
    const monto = montos.find(
      (m) => String(m.usuarioId) === String(pasajero.usuarioId),
    )?.monto;

    await client.query(
      `INSERT INTO viaje_pasajeros
         (viaje_id, usuario_id, km_recorridos, monto_pagar)
       VALUES ($1, $2, $3, $4)`,
      [
        viajeId,
        Number(pasajero.usuarioId),
        pasajero.kmRecorridos ?? null,
        monto ?? null,
      ],
    );
  }
}

// Si el ROLLBACK también falla (por ejemplo, se cortó la conexión), su error
// se ignora para que el llamador reciba el error original que hizo fallar la
// operación. Devuelve true si falló: esa conexión quedó en un estado incierto
// y no debe volver al pool.
async function deshacer(client) {
  try {
    await client.query('ROLLBACK');
    return false;
  } catch {
    return true;
  }
}

// release(true) le indica a pg que destruya la conexión en lugar de
// devolverla al pool.
function liberar(client, descartar) {
  if (descartar) {
    client.release(true);
  } else {
    client.release();
  }
}

module.exports = ViajeRepositoryPostgres;
module.exports.filaAViaje = filaAViaje;
