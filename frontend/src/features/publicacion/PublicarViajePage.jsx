import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { extraerErrorApi } from '../../api/client.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useCarga } from '../viajes/useCarga.js'
import UbicacionForm from './UbicacionForm.jsx'
import { construirCuerpoViaje, publicacionApi } from './publicacion.api.js'
import { validarViaje } from './validaciones.js'
import './publicacion.css'

const FORM_INICIAL = {
  vehiculoId: '',
  fecha: '',
  asientosDisponibles: '',
  origen: null,
  destino: null,
  paradas: [],
}

const MENSAJE_PROHIBIDO = 'No tenés permisos para realizar esta acción'

const CODIGOS_CON_DETALLES = ['VIAJE_INVALIDO', 'SOLICITUD_INVALIDA']

function dosDigitos(numero) {
  return String(numero).padStart(2, '0')
}

// Formato que espera <input type="datetime-local">, en hora local.
function ahoraLocal() {
  const ahora = new Date()

  return (
    `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}` +
    `T${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`
  )
}

function asientosPorDefecto(vehiculo) {
  return String(Math.max(1, vehiculo.capacidadAsientos - 1))
}

function nombreVehiculo(vehiculo) {
  const marcaModelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')

  return marcaModelo || vehiculo.tipo
}

function describirVehiculo(vehiculo) {
  return `${nombreVehiculo(vehiculo)} - ${vehiculo.capacidadAsientos} asientos`
}

function FormularioPublicacion({ vehiculos, onVehiculoInvalido, onEnviando }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [fechaMinima] = useState(ahoraLocal)
  const enviandoRef = useRef(false)

  const vehiculo = vehiculos.find(
    (actual) => String(actual.id) === form.vehiculoId,
  )

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  function elegirVehiculo(evento) {
    const id = evento.target.value
    const elegido = vehiculos.find((actual) => String(actual.id) === id)

    setForm((actual) => ({
      ...actual,
      vehiculoId: id,
      asientosDisponibles: elegido
        ? asientosPorDefecto(elegido)
        : actual.asientosDisponibles,
    }))
  }

  async function enviar(evento) {
    evento.preventDefault()

    if (enviandoRef.current) {
      return
    }

    const erroresForm = validarViaje(form, vehiculo)
    setErrores(erroresForm)
    setErrorApi(null)
    onEnviando()

    if (Object.keys(erroresForm).length > 0) {
      return
    }

    enviandoRef.current = true
    setEnviando(true)

    try {
      const viaje = await publicacionApi.publicar(
        construirCuerpoViaje(form, vehiculo),
      )
      navigate(`/viajes/${viaje.id}`)
    } catch (error) {
      const { codigo, mensaje, detalles } = extraerErrorApi(error)

      enviandoRef.current = false

      if (codigo === 'VEHICULO_NO_ENCONTRADO') {
        onVehiculoInvalido(mensaje)
        return
      }

      setEnviando(false)

      if (codigo === 'PROHIBIDO') {
        setErrorApi({ mensaje: MENSAJE_PROHIBIDO, detalles: [] })
      } else if (CODIGOS_CON_DETALLES.includes(codigo)) {
        setErrorApi({ mensaje, detalles: [...new Set(detalles)] })
      } else {
        setErrorApi({ mensaje, detalles: [] })
      }
    }
  }

  return (
    <Card className="publicar-card">
      <form className="publicar-form" onSubmit={enviar} noValidate>
        <div className="publicar-grid">
          <div className="field publicar-grid__ancho">
            <label className="field__label" htmlFor="publicar-vehiculo">
              Vehículo
            </label>
            <select
              className={`field__input ${errores.vehiculoId ? 'field__input--error' : ''}`}
              id="publicar-vehiculo"
              value={form.vehiculoId}
              onChange={elegirVehiculo}
              required
              aria-invalid={Boolean(errores.vehiculoId)}
              aria-describedby={
                errores.vehiculoId ? 'publicar-vehiculo-error' : undefined
              }
            >
              <option value="">Elegí un vehículo</option>
              {vehiculos.map((actual) => (
                <option key={actual.id} value={String(actual.id)}>
                  {describirVehiculo(actual)}
                </option>
              ))}
            </select>
            {errores.vehiculoId ? (
              <span
                className="field__message field__message--error"
                id="publicar-vehiculo-error"
              >
                {errores.vehiculoId}
              </span>
            ) : null}
          </div>

          <Input
            id="publicar-fecha"
            label="Fecha y hora de salida"
            type="datetime-local"
            min={fechaMinima}
            required
            value={form.fecha}
            onChange={(evento) => cambiar('fecha', evento.target.value)}
            error={errores.fecha}
          />

          <Input
            id="publicar-asientos"
            label="Asientos disponibles"
            type="number"
            min="1"
            max={vehiculo ? vehiculo.capacidadAsientos : undefined}
            step="1"
            inputMode="numeric"
            required
            value={form.asientosDisponibles}
            onChange={(evento) =>
              cambiar('asientosDisponibles', evento.target.value)
            }
            error={errores.asientosDisponibles}
            hint={
              vehiculo
                ? `Hasta ${vehiculo.capacidadAsientos} según el vehículo`
                : undefined
            }
          />

          <UbicacionForm
            id="publicar-origen"
            label="Origen"
            value={form.origen}
            onChange={(ubicacion) => cambiar('origen', ubicacion)}
            error={errores.origen}
            excluir={form.destino}
          />

          <UbicacionForm
            id="publicar-destino"
            label="Destino"
            value={form.destino}
            onChange={(ubicacion) => cambiar('destino', ubicacion)}
            error={errores.destino}
            excluir={form.origen}
          />
        </div>

        {errorApi ? (
          <Alert details={errorApi.detalles}>{errorApi.mensaje}</Alert>
        ) : null}

        <div className="publicar-acciones">
          <Button type="submit" loading={enviando}>
            Publicar viaje
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function PublicarViajePage() {
  const [version, setVersion] = useState(0)
  const [aviso, setAviso] = useState(null)
  const { datos: vehiculos, error, cargando } = useCarga(
    () => publicacionApi.listarVehiculos(),
    `vehiculos-${version}`,
  )

  function recargarVehiculos(mensaje) {
    setAviso(mensaje)
    setVersion((actual) => actual + 1)
  }

  return (
    <div className="publicar-page container">
      <header>
        <span className="eyebrow">Publicar un viaje</span>
        <h1>Compartí tu próxima ruta</h1>
      </header>

      {aviso ? <Alert>{aviso}</Alert> : null}

      {cargando ? (
        <div className="page-loading">
          <Spinner size="large" />
          <span>Cargando vehículos…</span>
        </div>
      ) : error ? (
        <Alert details={[...new Set(error.detalles)]}>{error.mensaje}</Alert>
      ) : vehiculos.length === 0 ? (
        <Alert tone="info">
          Para publicar un viaje primero tenés que registrar un vehículo.{' '}
          <Link className="publicar-enlace" to="/vehiculos">
            Ir a mis vehículos
          </Link>
        </Alert>
      ) : (
        <FormularioPublicacion
          vehiculos={vehiculos}
          onVehiculoInvalido={recargarVehiculos}
          onEnviando={() => setAviso(null)}
        />
      )}
    </div>
  )
}
