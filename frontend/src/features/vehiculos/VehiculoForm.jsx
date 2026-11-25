import { useState } from 'react'

import { extraerErrorApi } from '../../api/client.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import { vehiculosApi } from './vehiculos.api.js'
import {
  COMBUSTIBLES,
  LIMITE_MARCA,
  LIMITE_MODELO,
  TIPOS_VEHICULO,
  validarVehiculo,
} from './validaciones.js'

const FORM_INICIAL = {
  tipo: '',
  marca: '',
  modelo: '',
  capacidadAsientos: '',
  consumoL100km: '',
  tipoCombustible: '',
}

export default function VehiculoForm({ onCreado, onCancelar }) {
  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState(null)
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo) {
    return (evento) => {
      const valor = evento.target.value
      setForm((actual) => ({ ...actual, [campo]: valor }))
    }
  }

  async function enviar(evento) {
    evento.preventDefault()

    if (enviando) {
      return
    }

    const erroresForm = validarVehiculo(form)
    setErrores(erroresForm)
    setErrorApi(null)

    if (Object.keys(erroresForm).length > 0) {
      return
    }

    setEnviando(true)

    try {
      const vehiculo = await vehiculosApi.crear(form)
      onCreado(vehiculo)
    } catch (error) {
      setErrorApi(extraerErrorApi(error))
      setEnviando(false)
    }
  }

  return (
    <Card className="vehiculo-form-card">
      <form className="vehiculo-form" onSubmit={enviar} noValidate>
        <h2 className="vehiculo-form__titulo">Registrar vehículo</h2>

        <div className="vehiculo-form__grid">
          <div className="field">
            <label className="field__label" htmlFor="vehiculo-tipo">
              Tipo
            </label>
            <select
              className={`field__input ${errores.tipo ? 'field__input--error' : ''}`}
              id="vehiculo-tipo"
              value={form.tipo}
              onChange={cambiar('tipo')}
              required
              aria-invalid={Boolean(errores.tipo)}
              aria-describedby={errores.tipo ? 'vehiculo-tipo-error' : undefined}
            >
              <option value="">Elegí un tipo</option>
              {TIPOS_VEHICULO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
            {errores.tipo ? (
              <span
                className="field__message field__message--error"
                id="vehiculo-tipo-error"
              >
                {errores.tipo}
              </span>
            ) : null}
          </div>

          <Input
            id="vehiculo-capacidad"
            label="Capacidad de asientos"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            required
            value={form.capacidadAsientos}
            onChange={cambiar('capacidadAsientos')}
            error={errores.capacidadAsientos}
          />

          <Input
            id="vehiculo-marca"
            label="Marca (opcional)"
            maxLength={LIMITE_MARCA}
            value={form.marca}
            onChange={cambiar('marca')}
            error={errores.marca}
          />

          <Input
            id="vehiculo-modelo"
            label="Modelo (opcional)"
            maxLength={LIMITE_MODELO}
            value={form.modelo}
            onChange={cambiar('modelo')}
            error={errores.modelo}
          />

          <Input
            id="vehiculo-consumo"
            label="Consumo cada 100 km (L/100 km)"
            type="number"
            min="0.1"
            step="0.1"
            inputMode="decimal"
            value={form.consumoL100km}
            onChange={cambiar('consumoL100km')}
            error={errores.consumoL100km}
            hint="Opcional"
          />

          <div className="field">
            <label className="field__label" htmlFor="vehiculo-combustible">
              Combustible
            </label>
            <select
              className={`field__input ${errores.tipoCombustible ? 'field__input--error' : ''}`}
              id="vehiculo-combustible"
              value={form.tipoCombustible}
              onChange={cambiar('tipoCombustible')}
              aria-invalid={Boolean(errores.tipoCombustible)}
              aria-describedby={
                errores.tipoCombustible ? 'vehiculo-combustible-error' : undefined
              }
            >
              <option value="">Sin especificar</option>
              {COMBUSTIBLES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
            {errores.tipoCombustible ? (
              <span
                className="field__message field__message--error"
                id="vehiculo-combustible-error"
              >
                {errores.tipoCombustible}
              </span>
            ) : null}
          </div>
        </div>

        {errorApi ? (
          <Alert details={[...new Set(errorApi.detalles)]}>
            {errorApi.mensaje}
          </Alert>
        ) : null}

        <div className="vehiculo-form__acciones">
          <Button type="submit" loading={enviando}>
            Guardar vehículo
          </Button>
          <Button variant="ghost" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
