const { EVENTOS_PASAJEROS } = require('../domain/eventos/PublicadorEventos');

// Observador: descuenta un asiento cuando alguien se suma y lo devuelve cuando
// alguien se baja.
class ActualizarAsientos {
  constructor({ viajeRepository }) {
    this.viajeRepository = viajeRepository;
  }

  notificar({ evento, viajeId }) {
    const viaje = this.viajeRepository.buscarPorId(viajeId);

    if (!viaje) {
      return;
    }

    const delta = evento === EVENTOS_PASAJEROS.SUMADO ? -1 : 1;
    const capacidad = viaje.vehiculo?.capacidadAsientos ?? Infinity;
    const asientos = (viaje.asientosDisponibles ?? 0) + delta;

    viaje.asientosDisponibles = Math.max(0, Math.min(asientos, capacidad));
    this.viajeRepository.actualizar(viaje);
  }
}

module.exports = ActualizarAsientos;