export const TOKEN_STORAGE_KEY = 'grupo8.token'
export const AUTH_INVALIDATED_EVENT = 'grupo8:auth-invalidada'

export function leerToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function guardarToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function borrarToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}
