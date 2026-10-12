const estrategiasPorDefecto = require('../domain/division');
const preciosPorDefecto = require('../config/precios');
const { ViajeNoEncontradoError } = require('./viaje.service');

class ModoDivisionInvalidoError extends Error {
  constructor(modo, modosValidos) {
    super(
      `Modo de división no soportado: ${modo}. Modos válidos: ${modosValidos.join(', ')}`,
    );
    this.name = 'ModoDivisionInvalidoError';
    this.statusCode = 400;
    this.code = 'MODO_DIVISION_INVALIDO';
  }
}

class DistanciaNoDisponibleError extends Error {
  constructor(id) {
    super(`El viaje ${id} no tiene una distancia calculada`);
    this.name = 'DistanciaNoDisponibleError';
    this.statusCode = 422;
    this.code = 'DISTANCIA_NO_DISPONIBLE';
  }
}

class CostoService {
  constructor({
    viajeRepository,
    estrategias = estrategiasPorDefecto,
    precios = preciosPorDefecto,
  } = {}) {
    if (!viajeRepository) {
      throw new Error('CostoService necesita un repositorio de viajes');
    }

    this.viajeRepository = viajeRepository;
    this.estrategias = estrategias;
    this.precios = precios;
  }

  calcularCostoTotal(viajeId) {
    return this.costoDe(this.obtenerViaje(viajeId));
  }

  dividirGastos(viajeId, modo = 'iguales') {
    const viaje = this.obtenerViaje(viajeId);

    // Object.hasOwn evita que ?modo=toString o ?modo=constructor encuentren
    // métodos heredados de Object en lugar de una estrategia.
    if (!Object.hasOwn(this.estrategias, modo)) {
      throw new ModoDivisionInvalidoError(modo, Object.keys(this.estrategias));
    }

    return this.estrategias[modo].dividir(
      this.costoDe(viaje),
      viaje.pasajeros ?? [],
    );
  }

  obtenerViaje(id) {
    const viaje = this.viajeRepository.buscarPorId(id);

    if (!viaje) {
      throw new ViajeNoEncontradoError(id);
    }

    return viaje;
  }

  costoDe(viaje) {
    const distanciaKm = viaje.distanciaKm;

    if (!Number.isFinite(distanciaKm)) {
      throw new DistanciaNoDisponibleError(viaje.id);
    }

    return Number((distanciaKm * this.precios.precioPorKm).toFixed(2));
  }
}

module.exports = CostoService;
module.exports.ModoDivisionInvalidoError = ModoDivisionInvalidoError;
module.exports.DistanciaNoDisponibleError = DistanciaNoDisponibleError;