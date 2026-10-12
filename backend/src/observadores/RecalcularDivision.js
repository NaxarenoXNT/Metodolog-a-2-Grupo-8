const { DistanciaNoDisponibleError } = require('../services/costo.service');

const MODO_POR_DEFECTO = 'iguales';

// Observador: recalcula cuánto paga cada pasajero reutilizando las estrategias
// de división de CostoService (Strategy del integrante 2).
class RecalcularDivision {
  constructor({ viajeRepository, costoService }) {
    this.viajeRepository = viajeRepository;
    this.costoService = costoService;
  }

  notificar({ viajeId }) {
    const viaje = this.viajeRepository.buscarPorId(viajeId);

    if (!viaje) {
      return;
    }

    const modo = viaje.modoDivision ?? MODO_POR_DEFECTO;
    let montos;

    try {
      montos = this.costoService.dividirGastos(viajeId, modo);
    } catch (error) {
      // Sin distancia no hay costo que repartir; el resto de las reacciones
      // (asientos, aviso al conductor) siguen funcionando igual.
      if (error instanceof DistanciaNoDisponibleError) {
        montos = null;
      } else {
        throw error;
      }
    }

    viaje.division = montos ? { modo, montos } : null;
    this.viajeRepository.actualizar(viaje);
  }
}

module.exports = RecalcularDivision;