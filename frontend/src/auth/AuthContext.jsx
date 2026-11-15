import { useCallback, useEffect, useMemo, useState } from 'react'

import { authApi } from '../features/auth/auth.api.js'
import AuthContext from './auth-context.js'
import {
  AUTH_INVALIDATED_EVENT,
  borrarToken,
  guardarToken,
  leerToken,
} from './session.js'

export function AuthProvider({ children }) {
  const [tokenInicial] = useState(leerToken)
  const [usuario, setUsuario] = useState(null)
  const [inicializando, setInicializando] = useState(Boolean(tokenInicial))

  const cerrarSesion = useCallback(() => {
    borrarToken()
    setUsuario(null)
    setInicializando(false)
  }, [])

  const guardarSesion = useCallback(({ usuario: usuarioSesion, token }) => {
    guardarToken(token)
    setUsuario(usuarioSesion)
    setInicializando(false)
    return usuarioSesion
  }, [])

  const iniciarSesion = useCallback(
    async (credenciales) => guardarSesion(await authApi.login(credenciales)),
    [guardarSesion],
  )

  const registrar = useCallback(
    async (datos) => guardarSesion(await authApi.registrar(datos)),
    [guardarSesion],
  )

  useEffect(() => {
    if (!tokenInicial) {
      return undefined
    }

    let activo = true

    authApi
      .yo()
      .then((usuarioActual) => {
        if (activo) {
          setUsuario(usuarioActual)
        }
      })
      .catch(() => {
        if (activo) {
          borrarToken()
          setUsuario(null)
        }
      })
      .finally(() => {
        if (activo) {
          setInicializando(false)
        }
      })

    return () => {
      activo = false
    }
  }, [tokenInicial])

  useEffect(() => {
    window.addEventListener(AUTH_INVALIDATED_EVENT, cerrarSesion)
    return () =>
      window.removeEventListener(AUTH_INVALIDATED_EVENT, cerrarSesion)
  }, [cerrarSesion])

  const valor = useMemo(
    () => ({
      usuario,
      estaAutenticado: Boolean(usuario),
      inicializando,
      iniciarSesion,
      registrar,
      cerrarSesion,
    }),
    [
      usuario,
      inicializando,
      iniciarSesion,
      registrar,
      cerrarSesion,
    ],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
