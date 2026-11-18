import { useCallback, useEffect, useState } from 'react'

import { extraerErrorApi } from '../../api/client.js'

const SIN_CARGAR = Symbol('sin-cargar')

export function useCarga(cargar, clave) {
  const [resultado, setResultado] = useState({
    clave: SIN_CARGAR,
    datos: null,
    error: null,
  })

  useEffect(() => {
    let activo = true

    cargar()
      .then((datos) => {
        if (activo) {
          setResultado({ clave, datos, error: null })
        }
      })
      .catch((error) => {
        if (activo) {
          setResultado({ clave, datos: null, error: extraerErrorApi(error) })
        }
      })

    return () => {
      activo = false
    }
    // Solo se recarga cuando cambia la clave: cargar suele ser una función nueva en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const setDatos = useCallback(
    (datos) => setResultado({ clave, datos, error: null }),
    [clave],
  )

  const cargando = resultado.clave !== clave

  return {
    datos: cargando ? null : resultado.datos,
    error: cargando ? null : resultado.error,
    cargando,
    setDatos,
  }
}
