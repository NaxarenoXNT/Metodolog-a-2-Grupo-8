import apiClient from '../../api/client.js'

export const authApi = {
  async registrar(datos) {
    const { data } = await apiClient.post('/api/auth/registro', datos)
    return data
  },

  async login(credenciales) {
    const { data } = await apiClient.post('/api/auth/login', credenciales)
    return data
  },

  async yo() {
    const { data } = await apiClient.get('/api/auth/yo')
    return data
  },
}
