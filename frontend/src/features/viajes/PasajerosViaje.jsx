import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import { formatearDistancia, mismoId } from './accionesViaje.js'

export default function PasajerosViaje({
  pasajeros = [],
  usuario,
  permisos,
  enCurso,
  onBajar,
}) {
  return (
    <Card className="detalle-card">
      <h2>Pasajeros</h2>

      {pasajeros.length === 0 ? (
        <p className="viajes-vacio">Todavía no hay pasajeros.</p>
      ) : (
        <ul className="pasajeros-lista">
          {pasajeros.map((pasajero) => {
            const soyYo = mismoId(pasajero.usuarioId, usuario?.id)

            return (
              <li key={pasajero.usuarioId}>
                <span>{pasajero.nombre || `Usuario #${pasajero.usuarioId}`}</span>
                <span className="pasajeros-lista__acciones">
                  <span className="pasajeros-lista__km">
                    {formatearDistancia(pasajero.kmRecorridos)}
                  </span>
                  {permisos.puedeBajar(pasajero) ? (
                    <Button
                      className="button--compact"
                      variant="ghost"
                      disabled={enCurso}
                      onClick={() => onBajar(pasajero, soyYo)}
                    >
                      {soyYo ? 'Bajarme' : 'Bajar'}
                    </Button>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
