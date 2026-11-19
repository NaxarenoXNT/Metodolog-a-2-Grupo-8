import apiClient from '../../api/client.js'

function tieneValor(valor) {
  if (valor === undefined || valor === null) {
    return false
  }

  return String(valor).trim() !== ''
}

function limpiarFiltros(filtros = {}) {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => tieneValor(valor)),
  )
}

export const viajesApi = {
  async listar(filtros) {
    const { data } = await apiClient.get('/api/viajes', {
      params: limpiarFiltros(filtros),
    })
    return data
  },

  async obtener(id) {
    const { data } = await apiClient.get(`/api/viajes/${id}`)
    return data
  },

  async costo(id) {
    const { data } = await apiClient.get(`/api/viajes/${id}/costo`)
    return data
  },

  async division(id, modo) {
    const { data } = await apiClient.get(`/api/viajes/${id}/division`, {
      params: limpiarFiltros({ modo }),
    })
    return data
  },

  async sumarme(id, kmRecorridos) {
    const cuerpo = tieneValor(kmRecorridos)
      ? { kmRecorridos: Number(kmRecorridos) }
      : {}
    const { data } = await apiClient.post(`/api/viajes/${id}/pasajeros`, cuerpo)
    return data
  },

  async bajar(id, usuarioId) {
    const { data } = await apiClient.delete(
      `/api/viajes/${id}/pasajeros/${encodeURIComponent(usuarioId)}`,
    )
    return data
  },

  async cancelar(id) {
    const { data } = await apiClient.patch(`/api/viajes/${id}/cancelar`)
    return data
  },
}
