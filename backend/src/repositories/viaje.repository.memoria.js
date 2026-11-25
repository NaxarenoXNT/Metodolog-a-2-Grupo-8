// Viajes de ejemplo con la forma del contrato de ViajeRepository. La capacidad
// del vehículo incluye al conductor: asientosDisponibles = capacidadAsientos - 1
// mientras no haya pasajeros. distanciaKm es la distancia por ruta (la línea
// recta entre las dos ciudades es de unos 574 km).
const VIAJES_INICIALES = [
  {
    id: 1,
    conductorId: 1,
    vehiculo: {
      tipo: 'auto',
      marca: 'Fiat',
      modelo: 'Mobi',
      capacidadAsientos: 4,
      consumoL100km: 6,
      tipoCombustible: 'nafta',
    },
    fecha: '2026-12-18T11:00:00.000Z', // 08:00 hora argentina
    asientosDisponibles: 3,
    origen: { lat: -38.7183, lng: -62.2663 }, // Bahía Blanca
    destino: { lat: -34.6037, lng: -58.3816 }, // CABA
    paradas: [],
    distanciaKm: 690,
    pasajeros: [],
    estado: 'pendiente',
  },
  {
    id: 2,
    conductorId: 2,
    vehiculo: {
      tipo: 'pickup',
      marca: 'Volkswagen',
      modelo: 'Saveiro',
      capacidadAsientos: 2,
      consumoL100km: 8.5,
      tipoCombustible: 'nafta',
    },
    fecha: '2026-12-20T21:00:00.000Z', // 18:00 hora argentina
    asientosDisponibles: 1,
    origen: { lat: -34.6037, lng: -58.3816 }, // CABA
    destino: { lat: -38.7183, lng: -62.2663 }, // Bahía Blanca
    paradas: [],
    distanciaKm: 690,
    pasajeros: [],
    estado: 'pendiente',
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