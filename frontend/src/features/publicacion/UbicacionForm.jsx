import { ciudades } from '../../data/ciudades.js'

function mismaUbicacion(ciudad, ubicacion) {
  return (
    Boolean(ubicacion) &&
    ciudad.lat === ubicacion.lat &&
    ciudad.lng === ubicacion.lng
  )
}

export default function UbicacionForm({
  id,
  label,
  value,
  onChange,
  error,
  excluir,
  placeholder = 'Elegí una ciudad',
}) {
  const seleccionada = ciudades.find((ciudad) => mismaUbicacion(ciudad, value))
  const opciones = ciudades.filter(
    (ciudad) => ciudad === seleccionada || !mismaUbicacion(ciudad, excluir),
  )
  const errorId = error ? `${id}-error` : undefined

  function cambiar(evento) {
    const ciudad = ciudades.find((actual) => actual.nombre === evento.target.value)
    onChange(ciudad ? { lat: ciudad.lat, lng: ciudad.lng } : null)
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        className={`field__input ${error ? 'field__input--error' : ''}`}
        id={id}
        value={seleccionada?.nombre ?? ''}
        onChange={cambiar}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
      >
        <option value="">{placeholder}</option>
        {opciones.map((ciudad) => (
          <option key={ciudad.nombre} value={ciudad.nombre}>
            {ciudad.nombre}
          </option>
        ))}
      </select>
      {error ? (
        <span className="field__message field__message--error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
