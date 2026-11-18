import { Link } from 'react-router-dom'

import Card from '../../components/ui/Card.jsx'
import { formatearFecha, nombreUbicacion } from './accionesViaje.js'

function textoAsientos(asientos) {
  if (asientos === 0) {
    return 'Sin asientos'
  }

  return asientos === 1 ? '1 asiento disponible' : `${asientos} asientos disponibles`
}

function textoDistancia(distanciaKm) {
  if (distanciaKm === null || distanciaKm === undefined) {
    return 'Distancia no calculada'
  }

  return `${distanciaKm} km`
}

export default function ViajeCard({ viaje }) {
  return (
    <Card className="viaje-card">
      <span className={`estado estado--${viaje.estado}`}>{viaje.estado}</span>

      <h2 className="viaje-card__ruta">
        {nombreUbicacion(viaje.origen)} → {nombreUbicacion(viaje.destino)}
      </h2>

      <ul className="viaje-card__datos">
        <li>{formatearFecha(viaje.fecha)}</li>
        <li>
          {viaje.vehiculo?.marca} {viaje.vehiculo?.modelo}
        </li>
        <li>{textoAsientos(viaje.asientosDisponibles)}</li>
        <li>{textoDistancia(viaje.distanciaKm)}</li>
      </ul>

      <Link
        className="button button--ghost button--compact"
        to={`/viajes/${viaje.id}`}
      >
        Ver detalle
      </Link>
    </Card>
  )
}
