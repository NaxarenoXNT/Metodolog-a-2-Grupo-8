const { ViajeBuilder } = require('../domain/viaje/ViajeBuilder');
const { ESTADOS_VIAJE } = require('../domain/viaje/estados');

class ViajeNoEncontradoError extends Error {
  constructor(id) {
    super(`No existe un viaje con id ${id}`);
    this.name = 'ViajeNoEncontradoError';
    this.statusCode = 404;
    this.code = 'VIAJE_NO_ENCONTRADO';
  }
}

class ViajeNoModificableError extends Error {
  constructor(id, estado) {
    super(
      `El viaje ${id} no se puede modificar porque su estado es ${estado ?? 'desconocido'}`,
    );
    this.name = 'ViajeNoModificableError';
    this.statusCode = 409;
    this.code = 'VIAJE_NO_MODIFICABLE';
  }
}

class ViajeService {
  constructor({ viajeRepository, proveedorRutas, ahora } = {}) {
    if (!viajeRepository) {
      throw new Error('ViajeService necesita un repositorio de viajes');
    }

    this.viajeRepository = viajeRepository;
    this.proveedorRutas = proveedorRutas;
    this.ahora = ahora;
  }

  async listar() {
    return this.viajeRepository.listar();
  }

  async obtenerPorId(id) {
    const viaje = await this.viajeRepository.buscarPorId(id);

    if (!viaje) {
      throw new ViajeNoEncontradoError(id);
    }

    return viaje;
  }

  // 404 si no existe, 409 si ya no está pendiente.
  async cancelar(id) {
    const viaje = await this.obtenerPorId(id);

    if (viaje.estado !== ESTADOS_VIAJE.PENDIENTE) {
      throw new ViajeNoModificableError(id, viaje.estado);
    }

    return this.viajeRepository.actualizar({
      ...viaje,
      estado: ESTADOS_VIAJE.CANCELADO,
    });
  }

  async publicar(datos = {}) {
    const datosViaje =
      datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
    const builder = new ViajeBuilder({ ahora: this.ahora })
      .conVehiculo(datosViaje.vehiculo)
      .conFecha(datosViaje.fecha)
      .conAsientosDisponibles(
        datosViaje.asientosDisponibles ?? datosViaje.asientos,
      )
      .conOrigen(datosViaje.origen)
      .conDestino(datosViaje.destino)
      .conParadas(datosViaje.paradas ?? []);

    // Se valida antes de consultar servicios externos para no gastar una
    // llamada de rutas cuando el viaje ya es inválido.
    const viajeValidado = builder.build();
    const distanciaKm = await this.calcularDistancia(
      viajeValidado.origen,
      viajeValidado.destino,
    );

    return this.viajeRepository.guardar({
      ...viajeValidado,
      distanciaKm,
    });
  }

  async calcularDistancia(origen, destino) {
    if (!this.proveedorRutas) {
      return null;
    }

    let distanciaKm;

    try {
      distanciaKm = await this.proveedorRutas.calcularDistancia(origen, destino);
    } catch (causa) {
      const error = new Error('No se pudo calcular la distancia del viaje');
      error.statusCode = 502;
      error.code = 'PROVEEDOR_RUTAS_NO_DISPONIBLE';
      error.cause = causa;
      throw error;
    }

    if (!Number.isFinite(distanciaKm) || distanciaKm < 0) {
      const error = new Error('El proveedor de rutas devolvió una distancia inválida');
      error.statusCode = 502;
      error.code = 'DISTANCIA_INVALIDA';
      throw error;
    }

    return distanciaKm;
  }
}

module.exports = ViajeService;
module.exports.ViajeNoEncontradoError = ViajeNoEncontradoError;
module.exports.ViajeNoModificableError = ViajeNoModificableError;
