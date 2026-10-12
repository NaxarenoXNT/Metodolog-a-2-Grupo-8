const VIAJES_INICIALES = [
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
];

class ViajeRepositoryMemoria {
  constructor(viajesIniciales = VIAJES_INICIALES) {
    this.viajes = clonar(viajesIniciales);
    this.proximoId =
      this.viajes.reduce((mayor, viaje) => Math.max(mayor, viaje.id || 0), 0) + 1;
  }

  listar() {
    return clonar(this.viajes);
  }

  buscarPorId(id) {
    const viaje = this.viajes.find((candidato) => candidato.id === id);
    return viaje ? clonar(viaje) : null;
  }

  guardar(viaje) {
    const viajeGuardado = clonar({
      ...viaje,
      id: viaje.id ?? this.proximoId++,
    });

    this.viajes.push(viajeGuardado);
    return clonar(viajeGuardado);
  }

  actualizar(viaje) {
    const indice = this.viajes.findIndex(
      (candidato) => candidato.id === viaje.id,
    );

    if (indice === -1) {
      return null;
    }

    this.viajes[indice] = clonar(viaje);
    return clonar(this.viajes[indice]);
  }
}

function clonar(valor) {
  return structuredClone(valor);
}

module.exports = ViajeRepositoryMemoria;
module.exports.VIAJES_INICIALES = VIAJES_INICIALES;