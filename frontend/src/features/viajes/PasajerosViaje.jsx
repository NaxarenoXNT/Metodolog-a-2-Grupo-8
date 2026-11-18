import Card from '../../components/ui/Card.jsx'
import { formatearDistancia } from './accionesViaje.js'

export default function PasajerosViaje({ pasajeros = [] }) {
  return (
    <Card className="detalle-card">
      <h2>Pasajeros</h2>

      {pasajeros.length === 0 ? (
        <p className="viajes-vacio">Todavía no hay pasajeros.</p>
      ) : (
        <ul className="pasajeros-lista">
          {pasajeros.map((pasajero) => (
            <li key={pasajero.usuarioId}>
              <span>
                {pasajero.nombre || `Usuario #${pasajero.usuarioId}`}
              </span>
              <span className="pasajeros-lista__km">
                {formatearDistancia(pasajero.kmRecorridos)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
