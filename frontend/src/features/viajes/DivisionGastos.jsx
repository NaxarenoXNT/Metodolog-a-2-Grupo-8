import { useState } from 'react'

import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatearMonto, mismoId } from './accionesViaje.js'
import { useCarga } from './useCarga.js'
import { viajesApi } from './viajes.api.js'

const MODOS = [
  { valor: 'iguales', etiqueta: 'Partes iguales' },
  { valor: 'km', etiqueta: 'Por kilómetros' },
]

function nombrePasajero(pasajeros, usuarioId) {
  const pasajero = pasajeros.find((actual) =>
    mismoId(actual.usuarioId, usuarioId),
  )

  return pasajero?.nombre || `Usuario #${usuarioId}`
}

export default function DivisionGastos({ viaje }) {
  const [modo, setModo] = useState('iguales')
  const pasajeros = viaje.pasajeros ?? []
  const firma = pasajeros
    .map((pasajero) => `${pasajero.usuarioId}:${pasajero.kmRecorridos}`)
    .join('|')

  const { datos, error, cargando } = useCarga(
    () =>
      Promise.all([
        viajesApi.costo(viaje.id),
        viajesApi.division(viaje.id, modo),
      ]),
    `${viaje.id}/${modo}/${firma}`,
  )

  function contenido() {
    if (cargando) {
      return (
        <div className="division-cargando">
          <Spinner size="small" />
          <span>Calculando…</span>
        </div>
      )
    }

    if (error) {
      return error.codigo === 'DISTANCIA_NO_DISPONIBLE' ? (
        <Alert tone="info">{error.mensaje}</Alert>
      ) : (
        <Alert details={error.detalles}>{error.mensaje}</Alert>
      )
    }

    const [{ costoTotal }, { division }] = datos

    if (division.length === 0) {
      return <p className="viajes-vacio">Sin pasajeros no hay nada que dividir.</p>
    }

    return (
      <>
        <p className="division-total">
          Costo total: {formatearMonto(costoTotal)}
        </p>
        <ul className="pasajeros-lista">
          {division.map((parte) => (
            <li key={parte.usuarioId}>
              {nombrePasajero(pasajeros, parte.usuarioId)}:{' '}
              {formatearMonto(parte.monto)}
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <Card className="detalle-card">
      <h2>División de gastos</h2>

      <div className="division-modos" role="group" aria-label="Modo de división">
        {MODOS.map((opcion) => (
          <Button
            key={opcion.valor}
            className="button--compact"
            variant={modo === opcion.valor ? 'primary' : 'ghost'}
            aria-pressed={modo === opcion.valor}
            onClick={() => setModo(opcion.valor)}
          >
            {opcion.etiqueta}
          </Button>
        ))}
      </div>

      {contenido()}

      <p className="viajes-vacio">
        Calculado por el servidor según el modo elegido.
      </p>
    </Card>
  )
}
