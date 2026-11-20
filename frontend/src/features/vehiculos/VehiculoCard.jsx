import Card from '../../components/ui/Card.jsx'
import { COMBUSTIBLES, TIPOS_VEHICULO } from './validaciones.js'

function etiquetaDe(lista, valor) {
  return lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
}

export default function VehiculoCard({ vehiculo }) {
  const marcaModelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')
  const consumo =
    vehiculo.consumoL100km === null || vehiculo.consumoL100km === undefined
      ? 'Consumo no informado'
      : `Consumo: ${vehiculo.consumoL100km} L/100 km`

  return (
    <Card className="vehiculo-card">
      <span className="vehiculo-card__tipo">
        {etiquetaDe(TIPOS_VEHICULO, vehiculo.tipo)}
      </span>
      <h2 className="vehiculo-card__nombre">
        {marcaModelo || 'Sin marca/modelo'}
      </h2>
      <ul className="vehiculo-card__datos">
        <li>Capacidad: {vehiculo.capacidadAsientos} asientos</li>
        <li>{consumo}</li>
        <li>
          {vehiculo.tipoCombustible
            ? `Combustible: ${etiquetaDe(COMBUSTIBLES, vehiculo.tipoCombustible)}`
            : 'Combustible no informado'}
        </li>
      </ul>
    </Card>
  )
}
