export const LIMITE_DESCRIPCION_PARADA = 150

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

  ;(form.paradas ?? []).forEach((parada, indice) => {
    const lat = aNumero(parada.lat)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errores[`paradas.${indice}.lat`] =
        'Ingresá una latitud entre -90 y 90.'
    }

    const lng = aNumero(parada.lng)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errores[`paradas.${indice}.lng`] =
        'Ingresá una longitud entre -180 y 180.'
    }

    if (texto(parada.descripcion).length > LIMITE_DESCRIPCION_PARADA) {
      errores[`paradas.${indice}.descripcion`] =
        `La descripción no puede superar los ${LIMITE_DESCRIPCION_PARADA} caracteres.`
    }
  })

  return errores
}
