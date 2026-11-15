import axios from 'axios'

import {
  AUTH_INVALIDATED_EVENT,
  borrarToken,
  leerToken,
} from '../auth/session.js'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const token = leerToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const codigo = error.response?.data?.error
    const sesionInvalida =
      error.response?.status === 401 &&
      ['NO_AUTENTICADO', 'TOKEN_INVALIDO'].includes(codigo)

    if (sesionInvalida) {
      borrarToken()
      window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT))
    }

    return Promise.reject(error)
  },
)

export function extraerErrorApi(error) {
  if (error.code === 'ECONNABORTED') {
    return {
      codigo: 'TIEMPO_AGOTADO',
      mensaje: 'El servidor tardó demasiado en responder. Intentá nuevamente.',
      detalles: [],
    }
  }

  if (!error.response) {
    return {
      codigo: 'SIN_CONEXION',
      mensaje:
        'No pudimos comunicarnos con el servidor. Verificá que el backend esté iniciado.',
      detalles: [],
    }
  }

  return {
    codigo: error.response.data?.error || 'ERROR_INESPERADO',
    mensaje:
      error.response.data?.mensaje ||
      'Ocurrió un problema inesperado. Intentá nuevamente.',
    detalles: Array.isArray(error.response.data?.detalles)
      ? error.response.data.detalles
      : [],
  }
}

export default apiClient
