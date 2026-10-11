class ErrorValidacionViaje extends Error {
  constructor(detalles) {
    super('Los datos del viaje no son válidos');
    this.name = 'ErrorValidacionViaje';
    this.statusCode = 400;
    this.code = 'VIAJE_INVALIDO';
    this.detalles = detalles;
  }
}

class ViajeBuilder {
  constructor({ ahora } = {}) {
    this.ahora = ahora || (() => new Date());
    this.datos = { paradas: [] };
  }

  conVehiculo(vehiculo) {
    this.datos.vehiculo = vehiculo;
    return this;
  }

  conFecha(fecha) {
    this.datos.fecha = fecha;
    return this;
  }

  conAsientosDisponibles(asientosDisponibles) {
    this.datos.asientosDisponibles = asientosDisponibles;
    return this;
  }

  conOrigen(origen) {
    this.datos.origen = origen;
    return this;
  }

  conDestino(destino) {
    this.datos.destino = destino;
    return this;
  }

  conParadas(paradas) {
    this.datos.paradas = paradas;
    return this;
  }

  build() {
    const errores = [];
    const vehiculo = normalizarVehiculo(this.datos.vehiculo, errores);
    const fecha = normalizarFecha(this.datos.fecha, this.ahora(), errores);
    const asientosDisponibles = normalizarAsientos(
      this.datos.asientosDisponibles,
      vehiculo?.capacidadAsientos,
      errores,
    );
    const origen = normalizarUbicacion(this.datos.origen, 'origen', errores);
    const destino = normalizarUbicacion(this.datos.destino, 'destino', errores);
    const paradas = normalizarParadas(this.datos.paradas, errores);

    if (errores.length > 0) {
      throw new ErrorValidacionViaje(errores);
    }

    return {
      vehiculo,
      fecha: fecha.toISOString(),
      asientosDisponibles,
      origen,
      destino,
      paradas,
    };
  }
}

function normalizarVehiculo(vehiculo, errores) {
  if (!vehiculo || typeof vehiculo !== 'object' || Array.isArray(vehiculo)) {
    errores.push('vehiculo es obligatorio');
    return null;
  }

  const capacidadAsientos = Number(
    vehiculo.capacidadAsientos ?? vehiculo.capacidad,
  );

  if (!Number.isInteger(capacidadAsientos) || capacidadAsientos <= 0) {
    errores.push('vehiculo.capacidadAsientos debe ser un entero positivo');
    return null;
  }

  return { ...vehiculo, capacidadAsientos };
}

function normalizarFecha(valor, ahora, errores) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    errores.push('fecha debe tener un formato válido');
    return null;
  }

  if (!(ahora instanceof Date) || Number.isNaN(ahora.getTime())) {
    throw new TypeError('La función ahora debe devolver una fecha válida');
  }

  if (fecha.getTime() <= ahora.getTime()) {
    errores.push('fecha debe ser futura');
  }

  return fecha;
}

function normalizarAsientos(valor, capacidad, errores) {
  const asientos = Number(valor);

  if (!Number.isInteger(asientos) || asientos <= 0) {
    errores.push('asientosDisponibles debe ser un entero positivo');
    return null;
  }

  if (Number.isInteger(capacidad) && asientos > capacidad) {
    errores.push(
      'asientosDisponibles no puede superar la capacidad del vehículo',
    );
  }

  return asientos;
}

function normalizarUbicacion(ubicacion, nombre, errores) {
  if (!ubicacion || typeof ubicacion !== 'object' || Array.isArray(ubicacion)) {
    errores.push(`${nombre} debe incluir lat y lng`);
    return null;
  }

  const lat = Number(ubicacion.lat);
  const lng = Number(ubicacion.lng);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errores.push(`${nombre}.lat debe estar entre -90 y 90`);
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errores.push(`${nombre}.lng debe estar entre -180 y 180`);
  }

  return { ...ubicacion, lat, lng };
}

function normalizarParadas(paradas, errores) {
  if (!Array.isArray(paradas)) {
    errores.push('paradas debe ser un arreglo');
    return [];
  }

  let ordenAnterior = 0;

  const normalizadas = paradas.map((parada, indice) => {
    if (!parada || typeof parada !== 'object' || Array.isArray(parada)) {
      errores.push(`paradas[${indice}] debe ser un objeto`);
      return parada;
    }

    const orden = Number(parada.orden);

    if (!Number.isInteger(orden) || orden <= 0) {
      errores.push(`paradas[${indice}].orden debe ser un entero positivo`);
    } else if (orden <= ordenAnterior) {
      errores.push('las paradas deben estar ordenadas de forma ascendente');
    }

    ordenAnterior = orden;
    return { ...parada, orden };
  });

  return normalizadas;
}

module.exports = { ViajeBuilder, ErrorValidacionViaje };
