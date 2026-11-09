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

  // Referencia del contrato de listar(filtros). Los filtros llegan ya
  // normalizados: { estado, desde, hasta }, con desde/hasta como ISO completo.
  // Las fechas se comparan como instantes (no como texto), porque viaje.fecha
  // puede estar escrita con otra zona horaria. Ambos bordes son inclusivos y,
  // si hay filtro de fecha, los viajes sin fecha (o con fecha inválida) quedan
  // afuera.
  async listar(filtros) {
    const { estado, desde, hasta } = filtros ?? {};
    const desdeMs = desde == null ? null : instanteDelFiltro(desde, 'desde');
    const hastaMs = hasta == null ? null : instanteDelFiltro(hasta, 'hasta');
    const filtraPorFecha = desdeMs !== null || hastaMs !== null;

    const viajes = this.viajes.filter((viaje) => {
      if (estado != null && viaje.estado !== estado) {
        return false;
      }

      if (!filtraPorFecha) {
        return true;
      }

      const salidaMs = milisegundosDe(viaje.fecha);

      if (Number.isNaN(salidaMs)) {
        return false;
      }

      return (
        (desdeMs === null || salidaMs >= desdeMs) &&
        (hastaMs === null || salidaMs <= hastaMs)
      );
    });

    return clonar(viajes);
  }

  async buscarPorId(id) {
    const viaje = this.viajes.find((candidato) => candidato.id === id);
    return viaje ? clonar(viaje) : null;
  }

  async guardar(viaje) {
    const viajeGuardado = clonar({
      ...viaje,
      id: viaje.id ?? this.proximoId++,
    });

    this.viajes.push(viajeGuardado);
    return clonar(viajeGuardado);
  }

  async actualizar(viaje) {
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

function milisegundosDe(fecha) {
  // new Date(null) es la época: se descarta a mano para no tomarla por válida.
  if (fecha === undefined || fecha === null) {
    return Number.NaN;
  }

  return new Date(fecha).getTime();
}

function instanteDelFiltro(valor, nombre) {
  const milisegundos = new Date(valor).getTime();

  if (Number.isNaN(milisegundos)) {
    throw new TypeError(`El filtro ${nombre} no es una fecha válida`);
  }

  return milisegundos;
}

function clonar(valor) {
  return structuredClone(valor);
}

module.exports = ViajeRepositoryMemoria;
module.exports.VIAJES_INICIALES = VIAJES_INICIALES;