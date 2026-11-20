function texto(valor) {
  return String(valor ?? '').trim()
}

function aNumero(valor) {
  const limpio = texto(valor)
  return limpio === '' ? Number.NaN : Number(limpio)
}

function mismaUbicacion(a, b) {
  return a.lat === b.lat && a.lng === b.lng
}

export function validarViaje(form, vehiculo) {
  const errores = {}

  if (!vehiculo) {
    errores.vehiculoId = 'Elegí un vehículo.'
  }

  if (texto(form.fecha) === '') {
    errores.fecha = 'Indicá la fecha y la hora de salida.'
  } else {
    const fecha = new Date(form.fecha)

    if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) {
      errores.fecha = 'La salida tiene que ser en una fecha y hora futuras.'
    }
  }

  const asientos = aNumero(form.asientosDisponibles)
  if (!Number.isInteger(asientos) || asientos <= 0) {
    errores.asientosDisponibles = 'Ingresá un número entero mayor a 0.'
  } else if (vehiculo && asientos > vehiculo.capacidadAsientos) {
    errores.asientosDisponibles = `No puede superar la capacidad del vehículo (${vehiculo.capacidadAsientos}).`
  }

  if (!form.origen) {
    errores.origen = 'Elegí el origen.'
  }

  if (!form.destino) {
    errores.destino = 'Elegí el destino.'
  } else if (form.origen && mismaUbicacion(form.origen, form.destino)) {
    errores.destino = 'El destino tiene que ser distinto del origen.'
  }

  return errores
}
