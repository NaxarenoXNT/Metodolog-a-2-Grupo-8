import { useSearchParams } from 'react-router-dom'

import Alert from '../../components/ui/Alert.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import FiltrosViajes from './FiltrosViajes.jsx'
import ViajeCard from './ViajeCard.jsx'
import { useCarga } from './useCarga.js'
import { viajesApi } from './viajes.api.js'
import './viajes.css'

export default function ViajesPage() {
  const [params, setParams] = useSearchParams()

  const filtros = {
    estado: params.get('estado') ?? '',
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
  }

  const { datos: viajes, error, cargando } = useCarga(
    () => viajesApi.listar(filtros),
    params.toString(),
  )

  function cambiarFiltro(nombre, valor) {
    const copia = new URLSearchParams(params)

    if (valor) {
      copia.set(nombre, valor)
    } else {
      copia.delete(nombre)
    }

    setParams(copia, { replace: true })
  }

  function limpiarFiltros() {
    setParams({})
  }

  return (
    <div className="viajes-page container">
      <header>
        <span className="eyebrow">Explorá nuevas rutas</span>
        <h1>Viajes disponibles</h1>
      </header>

      <FiltrosViajes
        filtros={filtros}
        onCambiar={cambiarFiltro}
        onLimpiar={limpiarFiltros}
      />

      {cargando ? (
        <div className="page-loading">
          <Spinner size="large" />
          <span>Cargando viajes…</span>
        </div>
      ) : error ? (
        <Alert details={error.detalles}>{error.mensaje}</Alert>
      ) : viajes.length === 0 ? (
        <p className="viajes-vacio">No hay viajes que coincidan con los filtros.</p>
      ) : (
        <div className="viajes-grid">
          {viajes.map((viaje) => (
            <ViajeCard key={viaje.id} viaje={viaje} />
          ))}
        </div>
      )}
    </div>
  )
}
