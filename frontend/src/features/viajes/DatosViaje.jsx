import Card from '../../components/ui/Card.jsx'
import {
  formatearDistancia,
  formatearFecha,
  nombreUbicacion,
} from './accionesViaje.js'

export default function DatosViaje({ viaje }) {
  const { vehiculo, paradas = [] } = viaje

  return (
    <Card className="detalle-card">
      <span className={`estado estado--${viaje.estado}`}>{viaje.estado}</span>

      <h1 className="detalle-card__ruta">
        {nombreUbicacion(viaje.origen)} → {nombreUbicacion(viaje.destino)}
      </h1>

      <dl className="detalle-datos">
        <div>
          <dt>Salida</dt>
          <dd>{formatearFecha(viaje.fecha)}</dd>
        </div>
        <div>
          <dt>Conductor</dt>
          <dd>{viaje.conductorNombre || `Usuario #${viaje.conductorId}`}</dd>
        </div>
        <div>
          <dt>Vehículo</dt>
          <dd>
            {vehiculo?.marca} {vehiculo?.modelo}
            {vehiculo?.tipo ? ` (${vehiculo.tipo})` : null}
          </dd>
        </div>
        <div>
          <dt>Asientos disponibles</dt>
          <dd>
            {viaje.asientosDisponibles > 0
              ? viaje.asientosDisponibles
              : 'Sin asientos'}
          </dd>
        </div>
        <div>
          <dt>Distancia</dt>
          <dd>{formatearDistancia(viaje.distanciaKm)}</dd>
        </div>
      </dl>

      <section className="detalle-seccion">
        <h2>Paradas</h2>
        {paradas.length === 0 ? (
          <p className="viajes-vacio">Viaje directo, sin paradas.</p>
        ) : (
          <ol className="paradas-lista">
            {paradas.map((parada) => (
              <li key={parada.orden}>
                {parada.descripcion || nombreUbicacion(parada)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Card>
  )
}
