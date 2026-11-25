// Repositorio de vehículos sobre PostgreSQL. Recibe el pool por constructor
// para poder inyectar uno real o uno de prueba.

// Traduce una fila de la tabla vehiculos (snake_case) al contrato (camelCase).
// pg devuelve NUMERIC como string para no perder precisión: consumoL100km se
// pasa a número, pero un NULL de la base se conserva como null (Number(null)
// daría 0).
function filaAVehiculo(fila) {
  if (!fila) {
    return null;
  }

  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    tipo: fila.tipo,
    marca: fila.marca,
    modelo: fila.modelo,
    capacidadAsientos: fila.capacidad_asientos,
    consumoL100km:
      fila.consumo_l_100km == null ? null : Number(fila.consumo_l_100km),
    tipoCombustible: fila.tipo_combustible,
  };
}

class VehiculoRepositoryPostgres {
  constructor({ pool }) {
    this.pool = pool;
  }

  // marca, modelo, consumoL100km y tipoCombustible son opcionales en la
  // tabla: si no llegan se guardan como NULL.
  async crear({
    usuarioId,
    tipo,
    marca,
    modelo,
    capacidadAsientos,
    consumoL100km,
    tipoCombustible,
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO vehiculos
         (usuario_id, tipo, marca, modelo, capacidad_asientos,
          consumo_l_100km, tipo_combustible)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        usuarioId,
        tipo,
        marca ?? null,
        modelo ?? null,
        capacidadAsientos,
        consumoL100km ?? null,
        tipoCombustible ?? null,
      ],
    );

    return filaAVehiculo(rows[0]);
  }

  async listarPorUsuario(usuarioId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM vehiculos WHERE usuario_id = $1 ORDER BY id',
      [usuarioId],
    );

    return rows.map(filaAVehiculo);
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM vehiculos WHERE id = $1',
      [id],
    );

    return filaAVehiculo(rows[0] ?? null);
  }
}

module.exports = VehiculoRepositoryPostgres;
module.exports.filaAVehiculo = filaAVehiculo;
