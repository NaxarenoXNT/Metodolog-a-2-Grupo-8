import apiClient from '../../api/client.js'

function texto(valor) {
  return String(valor ?? '').trim()
}

function construirCuerpo(datos) {
  const cuerpo = {
    tipo: texto(datos.tipo),
    capacidadAsientos: Number(texto(datos.capacidadAsientos)),
  }

  for (const campo of ['marca', 'modelo', 'tipoCombustible']) {
    const valor = texto(datos[campo])

    if (valor !== '') {
      cuerpo[campo] = valor
    }
  }

  const consumo = texto(datos.consumoL100km)

  if (consumo !== '') {
    cuerpo.consumoL100km = Number(consumo)
  }

  return cuerpo
}

export const vehiculosApi = {
  async listar() {
    const { data } = await apiClient.get('/api/vehiculos')
    return data
  },

  async crear(datos) {
    const { data } = await apiClient.post('/api/vehiculos', construirCuerpo(datos))
    return data
  },
}
