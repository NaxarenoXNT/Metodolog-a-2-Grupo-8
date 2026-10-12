const { ViajeNoEncontradoError } = require('./viaje.service');
const { EVENTOS_PASAJEROS } = require('../domain/eventos/PublicadorEventos');

function crearError(mensaje, statusCode, code, detalles) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  error.code = code;
  if (detalles) {
    error.detalles = detalles;
  }
  return error;
}

class PasajeroService {
  constructor({ viajeRepository, publicador } = {}) {
    if (!viajeRepository) {
      throw new Error('PasajeroService necesita un repositorio de viajes');
    }
    if (!publicador) {
      throw new Error('PasajeroService necesita un publicador de eventos');
    }

    this.viajeRepository = viajeRepository;
    this.publicador = publicador;
  }

  sumar(viajeId, datos = {}) {
    const viaje = this.obtenerViaje(viajeId);
    const pasajero = this.normalizarPasajero(datos, viaje);
    const pasajeros = viaje.pasajeros ?? [];

    if (pasajeros.some((actual) => actual.usuarioId === pasajero.usuarioId)) {
      throw crearError(
        `El usuario ${pasajero.usuarioId} ya está en el viaje ${viajeId}`,
        409,
        'PASAJERO_YA_SUMADO',
      );
    }

    if (!(viaje.asientosDisponibles > 0)) {
      throw crearError(
        `El viaje ${viajeId} no tiene asientos disponibles`,
        409,
        'SIN_ASIENTOS',
      );
    }

    viaje.pasajeros = [...pasajeros, pasajero];
    this.viajeRepository.actualizar(viaje);

    // El servicio solo registra el cambio y avisa. Asientos, división y aviso
    // al conductor son observadores suscriptos por separado.
    this.publicador.emitir(EVENTOS_PASAJEROS.SUMADO, { viajeId, pasajero });

    return this.obtenerViaje(viajeId);
  }

  bajar(viajeId, usuarioId) {
    const viaje = this.obtenerViaje(viajeId);
    const id = String(usuarioId);
    const pasajeros = viaje.pasajeros ?? [];
    const pasajero = pasajeros.find((actual) => actual.usuarioId === id);

    if (!pasajero) {
      throw crearError(
        `El usuario ${id} no está en el viaje ${viajeId}`,
        404,
        'PASAJERO_NO_ENCONTRADO',
      );
    }

    viaje.pasajeros = pasajeros.filter((actual) => actual.usuarioId !== id);
    this.viajeRepository.actualizar(viaje);

    this.publicador.emitir(EVENTOS_PASAJEROS.BAJADO, { viajeId, pasajero });

    return this.obtenerViaje(viajeId);
  }

  obtenerViaje(id) {
    const viaje = this.viajeRepository.buscarPorId(id);

    if (!viaje) {
      throw new ViajeNoEncontradoError(id);
    }

    return viaje;
  }

  normalizarPasajero(datos, viaje) {
    const errores = [];
    const usuarioId =
      datos.usuarioId === undefined || datos.usuarioId === null
        ? ''
        : String(datos.usuarioId).trim();

    if (!usuarioId) {
      errores.push('usuarioId es obligatorio');
    }

    const pasajero = { usuarioId };

    if (typeof datos.nombre === 'string' && datos.nombre.trim()) {
      pasajero.nombre = datos.nombre.trim();
    }

    // Por defecto el pasajero hace el recorrido completo. PorKilometro usa
    // este campo para repartir el costo.
    const km = datos.kmRecorridos ?? viaje.distanciaKm;

    if (km !== undefined && km !== null) {
      const kmRecorridos = Number(km);

      if (!Number.isFinite(kmRecorridos) || kmRecorridos <= 0) {
        errores.push('kmRecorridos debe ser un número positivo');
      } else if (
        Number.isFinite(viaje.distanciaKm) &&
        kmRecorridos > viaje.distanciaKm
      ) {
        errores.push('kmRecorridos no puede superar la distancia del viaje');
      } else {
        pasajero.kmRecorridos = kmRecorridos;
      }
    }

    if (errores.length > 0) {
      throw crearError(
        'Los datos del pasajero no son válidos',
        400,
        'PASAJERO_INVALIDO',
        errores,
      );
    }

    return pasajero;
  }
}

module.exports = PasajeroService;