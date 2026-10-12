const { EVENTOS_PASAJEROS } = require('../domain/eventos/PublicadorEventos');

// Observador: le avisa al conductor que cambió la lista de pasajeros.
// El canal es un único notificador inyectado (hoy, la consola).
class AvisarConductor {
  constructor({ viajeRepository, notificador }) {
    this.viajeRepository = viajeRepository;
    this.notificador = notificador;
  }

  notificar({ evento, viajeId, pasajero }) {
    const viaje = this.viajeRepository.buscarPorId(viajeId);

    if (!viaje) {
      return;
    }

    const accion =
      evento === EVENTOS_PASAJEROS.SUMADO ? 'se sumó al' : 'se bajó del';
    const mensaje =
      `${pasajero.nombre ?? pasajero.usuarioId} ${accion} viaje ${viaje.id}. ` +
      `Asientos disponibles: ${viaje.asientosDisponibles}.`;

    try {
      this.notificador.enviar({
        destinatario: viaje.conductorId ?? `conductor del viaje ${viaje.id}`,
        mensaje,
      });
    } catch (error) {
      // Un aviso que falla no debe deshacer la operación del pasajero.
      console.error('No se pudo avisar al conductor:', error.message);
    }
  }
}

module.exports = AvisarConductor;