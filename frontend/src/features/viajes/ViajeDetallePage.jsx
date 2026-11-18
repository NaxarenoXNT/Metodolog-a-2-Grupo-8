import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/ui/Alert.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import DatosViaje from './DatosViaje.jsx'
import PasajerosViaje from './PasajerosViaje.jsx'
import { permisosViaje } from './accionesViaje.js'
import { useCarga } from './useCarga.js'
import { viajesApi } from './viajes.api.js'
import './viajes.css'

const ERRORES_NO_EXISTE = ['VIAJE_NO_ENCONTRADO', 'ID_INVALIDO']

export default function ViajeDetallePage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const { datos: viaje, error, cargando } = useCarga(
    () => viajesApi.obtener(id),
    id,
  )

  if (cargando) {
    return (
      <div className="page-loading">
        <Spinner size="large" />
        <span>Cargando viaje…</span>
      </div>
    )
  }

  if (error) {
    const noExiste = ERRORES_NO_EXISTE.includes(error.codigo)

    return (
      <div className="viajes-page container">
        <Alert details={noExiste ? [] : error.detalles}>
          {noExiste ? 'Este viaje no existe' : error.mensaje}
        </Alert>
        <Link className="button button--ghost detalle-volver" to="/viajes">
          Volver a viajes
        </Link>
      </div>
    )
  }

  const { esConductor } = permisosViaje(viaje, usuario)

  return (
    <div className="viajes-page container">
      <Link className="detalle-volver-link" to="/viajes">
        ← Volver a viajes
      </Link>

      {viaje.estado === 'cancelado' ? (
        <Alert tone="info">Este viaje fue cancelado; ya no admite cambios.</Alert>
      ) : null}

      <DatosViaje
        viaje={viaje}
        nombreConductor={esConductor ? usuario.nombre : null}
      />
      <PasajerosViaje pasajeros={viaje.pasajeros} />
    </div>
  )
}
