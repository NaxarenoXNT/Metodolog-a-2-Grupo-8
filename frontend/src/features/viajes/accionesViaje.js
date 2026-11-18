import { ciudades } from '../../data/ciudades.js'

const TOLERANCIA_COORDENADAS = 0.01

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

const formatoMonto = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function mismoId(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false
  }

  return String(a) === String(b)
}

export function permisosViaje(viaje, usuario) {
  const pendiente = viaje?.estado === 'pendiente'
  const hayUsuario = Boolean(usuario)
  const esConductor = hayUsuario && mismoId(viaje?.conductorId, usuario.id)
  const participa =
    hayUsuario &&
    (viaje?.pasajeros ?? []).some((pasajero) =>
      mismoId(pasajero.usuarioId, usuario.id),
    )

  return {
    esConductor,
    participa,
    puedeSumarse:
      hayUsuario &&
      pendiente &&
      !esConductor &&
      !participa &&
      viaje.asientosDisponibles > 0,
    puedeCancelar: pendiente && esConductor,
    puedeBajar: (pasajero) =>
      hayUsuario &&
      pendiente &&
      (esConductor || mismoId(pasajero?.usuarioId, usuario.id)),
  }
}

export function formatearFecha(iso) {
  return formatoFecha.format(new Date(iso))
}

export function formatearMonto(monto) {
  return formatoMonto.format(monto)
}

export function nombreUbicacion({ lat, lng }) {
  const ciudad = ciudades.find(
    (actual) =>
      Math.abs(actual.lat - lat) <= TOLERANCIA_COORDENADAS &&
      Math.abs(actual.lng - lng) <= TOLERANCIA_COORDENADAS,
  )

  if (ciudad) {
    return ciudad.nombre
  }

  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
}
