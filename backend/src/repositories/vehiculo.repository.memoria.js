class VehiculoRepositoryMemoria {
  constructor(vehiculos = []) {
    this.vehiculos = structuredClone(vehiculos);
    this.proximoId =
      this.vehiculos.reduce(
        (maximo, vehiculo) => Math.max(maximo, vehiculo.id ?? 0),
        0,
      ) + 1;
  }

  async crear(vehiculo) {
    const creado = {
      ...structuredClone(vehiculo),
      id: this.proximoId++,
    };

    this.vehiculos.push(structuredClone(creado));
    return structuredClone(creado);
  }

  async listarPorUsuario(usuarioId) {
    return structuredClone(
      this.vehiculos.filter(
        (vehiculo) => String(vehiculo.usuarioId) === String(usuarioId),
      ),
    );
  }

  async buscarPorId(id) {
    const vehiculo = this.vehiculos.find(
      (actual) => String(actual.id) === String(id),
    );
    return vehiculo ? structuredClone(vehiculo) : null;
  }
}

module.exports = VehiculoRepositoryMemoria;
