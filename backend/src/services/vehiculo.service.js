function crearError(mensaje, statusCode, code, detalles) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  if (detalles?.length) {
    error.detalles = detalles;
  }
  return error;
}

class VehiculoService {
  constructor({ vehiculoRepository } = {}) {
    if (!vehiculoRepository) {
      throw new Error('VehiculoService necesita un repositorio de vehículos');
    }

    this.vehiculoRepository = vehiculoRepository;
  }

  async crear(usuarioId, datos = {}) {
    const vehiculo = normalizarVehiculo(datos);
    return this.vehiculoRepository.crear({ usuarioId, ...vehiculo });
  }

  async listarPorUsuario(usuarioId) {
    return this.vehiculoRepository.listarPorUsuario(usuarioId);
  }

  async obtenerPropio(id, usuarioId) {
    const vehiculoId = convertirNumero(id);

    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      throw vehiculoNoEncontrado();
    }

    const vehiculo = await this.vehiculoRepository.buscarPorId(vehiculoId);

    if (!vehiculo || String(vehiculo.usuarioId) !== String(usuarioId)) {
      throw vehiculoNoEncontrado();
    }

    return vehiculo;
  }
}

function normalizarVehiculo(datos) {
  const entrada =
    datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  const detalles = [];
  const tipo = textoObligatorio(entrada.tipo, 'tipo', detalles);
  const marca = textoOpcional(entrada.marca, 'marca', detalles);
  const modelo = textoOpcional(entrada.modelo, 'modelo', detalles);
  const tipoCombustible = textoOpcional(
    entrada.tipoCombustible,
    'tipoCombustible',
    detalles,
  );
  const capacidadAsientos = convertirNumero(entrada.capacidadAsientos);

  if (!Number.isInteger(capacidadAsientos) || capacidadAsientos <= 0) {
    detalles.push('capacidadAsientos debe ser un entero positivo');
  }

  let consumoL100km;
  if (entrada.consumoL100km !== undefined && entrada.consumoL100km !== null) {
    consumoL100km = convertirNumero(entrada.consumoL100km);
    if (!Number.isFinite(consumoL100km) || consumoL100km <= 0) {
      detalles.push('consumoL100km debe ser un número positivo');
    }
  }

  if (detalles.length > 0) {
    throw crearError('Los datos del vehículo no son válidos', 400, null, detalles);
  }

  return {
    tipo,
    marca: marca ?? null,
    modelo: modelo ?? null,
    capacidadAsientos,
    consumoL100km: consumoL100km ?? null,
    tipoCombustible: tipoCombustible ?? null,
  };
}

function convertirNumero(valor) {
  if (
    valor === null ||
    typeof valor === 'boolean' ||
    (typeof valor === 'string' && !valor.trim())
  ) {
    return Number.NaN;
  }

  return Number(valor);
}

function textoObligatorio(valor, campo, detalles) {
  if (typeof valor !== 'string' || !valor.trim()) {
    detalles.push(`${campo} es obligatorio`);
    return '';
  }
  return valor.trim();
}

function textoOpcional(valor, campo, detalles) {
  if (valor === undefined || valor === null) {
    return undefined;
  }
  if (typeof valor !== 'string' || !valor.trim()) {
    detalles.push(`${campo} debe ser un texto no vacío`);
    return undefined;
  }
  return valor.trim();
}

function vehiculoNoEncontrado() {
  return crearError(
    'El vehículo no existe o no pertenece al usuario autenticado',
    404,
    'VEHICULO_NO_ENCONTRADO',
  );
}

module.exports = VehiculoService;
module.exports.vehiculoNoEncontrado = vehiculoNoEncontrado;
