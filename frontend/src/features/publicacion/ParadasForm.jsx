import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import { ciudades } from '../../data/ciudades.js'
import UbicacionForm from './UbicacionForm.jsx'
import { LIMITE_DESCRIPCION_PARADA } from './validaciones.js'

let contadorParadas = 0

function nuevaParada() {
  contadorParadas += 1

  return { id: `parada-${contadorParadas}`, descripcion: '', lat: '', lng: '' }
}

export default function ParadasForm({ paradas, onChange, errores = {} }) {
  function agregar() {
    onChange([...paradas, nuevaParada()])
  }

  function quitar(id) {
    onChange(paradas.filter((parada) => parada.id !== id))
  }

  function actualizar(id, cambios) {
    onChange(
      paradas.map((parada) =>
        parada.id === id ? { ...parada, ...cambios } : parada,
      ),
    )
  }

  function completarDesdeCiudad(id, ubicacion) {
    const ciudad = ubicacion
      ? ciudades.find(
          (actual) => actual.lat === ubicacion.lat && actual.lng === ubicacion.lng,
        )
      : null

    if (ciudad) {
      actualizar(id, {
        descripcion: ciudad.nombre,
        lat: String(ciudad.lat),
        lng: String(ciudad.lng),
      })
    }
  }

  return (
    <fieldset className="paradas">
      <legend className="paradas__titulo">Paradas intermedias (opcional)</legend>

      {paradas.length === 0 ? (
        <p className="paradas__vacio">El viaje no tiene paradas intermedias.</p>
      ) : (
        <ol className="paradas__lista">
          {paradas.map((parada, indice) => (
            <li className="parada" key={parada.id}>
              <div className="parada__cabecera">
                <strong>Parada {indice + 1}</strong>
                <Button
                  variant="ghost"
                  className="button--compact"
                  onClick={() => quitar(parada.id)}
                  aria-label={`Quitar parada ${indice + 1}`}
                >
                  Quitar
                </Button>
              </div>

              <div className="parada__campos">
                <UbicacionForm
                  id={`${parada.id}-ciudad`}
                  label="Completar desde ciudad"
                  value={null}
                  onChange={(ubicacion) =>
                    completarDesdeCiudad(parada.id, ubicacion)
                  }
                  placeholder="Elegí una ciudad (opcional)"
                />

                <Input
                  id={`${parada.id}-descripcion`}
                  label="Descripción (opcional)"
                  maxLength={LIMITE_DESCRIPCION_PARADA}
                  value={parada.descripcion}
                  onChange={(evento) =>
                    actualizar(parada.id, { descripcion: evento.target.value })
                  }
                  error={errores[`paradas.${indice}.descripcion`]}
                />

                <Input
                  id={`${parada.id}-lat`}
                  label="Latitud"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  inputMode="decimal"
                  required
                  value={parada.lat}
                  onChange={(evento) =>
                    actualizar(parada.id, { lat: evento.target.value })
                  }
                  error={errores[`paradas.${indice}.lat`]}
                />

                <Input
                  id={`${parada.id}-lng`}
                  label="Longitud"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  inputMode="decimal"
                  required
                  value={parada.lng}
                  onChange={(evento) =>
                    actualizar(parada.id, { lng: evento.target.value })
                  }
                  error={errores[`paradas.${indice}.lng`]}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <Button variant="ghost" onClick={agregar}>
        Agregar parada
      </Button>
    </fieldset>
  )
}
