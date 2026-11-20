import apiClient from '../../api/client.js'

function texto(valor) {
  return String(valor ?? '').trim()
}

// Arma el cuerpo de POST /api/viajes. Nunca incluye conductorId ni
// conductorNombre: los define el backend a partir de la sesión.
export function construirCuerpoViaje(form, vehiculo) {
  return {
    vehiculoId: vehiculo.id,
    fecha: new Date(form.fecha).toISOString(),
    asientosDisponibles: Number(texto(form.asientosDisponibles)),
    origen: { lat: Number(form.origen.lat), lng: Number(form.origen.lng) },
    destino: { lat: Number(form.destino.lat), lng: Number(form.destino.lng) },
    paradas: (form.paradas ?? []).map((parada, indice) => {
      const descripcion = texto(parada.descripcion)

      return {
        orden: indice + 1,
        lat: Number(texto(parada.lat)),
        lng: Number(texto(parada.lng)),
        ...(descripcion ? { descripcion } : {}),
      }
    }),
  }
}

export const publicacionApi = {
  async listarVehiculos() {
    const { data } = await apiClient.get('/api/vehiculos')
    return data
  },

  async publicar(datos) {
    const { data } = await apiClient.post('/api/viajes', datos)
    return data
  },
}
