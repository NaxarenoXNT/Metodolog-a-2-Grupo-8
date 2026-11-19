import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { extraerErrorApi } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import DatosViaje from './DatosViaje.jsx'
import PasajerosViaje from './PasajerosViaje.jsx'
import { permisosViaje } from './accionesViaje.js'
import { useCarga } from './useCarga.js'
import { viajesApi } from './viajes.api.js'
import './viajes.css'

const ERRORES_NO_EXISTE = ['VIAJE_NO_ENCONTRADO', 'ID_INVALIDO']
const ERRORES_SESION = ['NO_AUTENTICADO', 'TOKEN_INVALIDO']
const ERRORES_RECARGAR = [
  'VIAJE_NO_MODIFICABLE',
  'SIN_ASIENTOS',
  'PASAJERO_YA_SUMADO',
  'PASAJERO_NO_ENCONTRADO',
]

export default function ViajeDetallePage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const {
    datos: viaje,
    error,
    cargando,
    setDatos,
  } = useCarga(() => viajesApi.obtener(id), id)

  const [enCurso, setEnCurso] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [km, setKm] = useState('')

  async function ejecutar(accion, mensajeExito) {
    setEnCurso(true)
    setAviso(null)

    try {
      setDatos(await accion())
      setAviso({ tone: 'success', mensaje: mensajeExito, detalles: [] })
      return true
    } catch (errorAccion) {
      const { codigo, mensaje, detalles } = extraerErrorApi(errorAccion)

      if (ERRORES_SESION.includes(codigo)) {
        navigate('/login', { state: { from: location } })
        return false
      }

      if (ERRORES_RECARGAR.includes(codigo)) {
        const viajeActual = await viajesApi.obtener(id).catch(() => null)

        if (viajeActual) {
          setDatos(viajeActual)
        }
      }

      setAviso({ tone: 'error', mensaje, detalles })
      return false
    } finally {
      setEnCurso(false)
    }
  }

  async function sumarme(evento) {
    evento.preventDefault()

    const exito = await ejecutar(
      () => viajesApi.sumarme(id, km),
      'Te sumaste al viaje.',
    )

    if (exito) {
      setKm('')
    }
  }

  function bajar(pasajero, soyYo) {
    const nombre = pasajero.nombre || `Usuario #${pasajero.usuarioId}`
    const confirmado = window.confirm(
      soyYo
        ? '¿Querés bajarte de este viaje?'
        : `¿Bajar a ${nombre} del viaje?`,
    )

    if (!confirmado) {
      return
    }

    ejecutar(
      () => viajesApi.bajar(id, pasajero.usuarioId),
      soyYo ? 'Te bajaste del viaje.' : 'Pasajero dado de baja.',
    )
  }

  function cancelar() {
    if (!window.confirm('¿Cancelar el viaje? No se puede deshacer.')) {
      return
    }

    ejecutar(() => viajesApi.cancelar(id), 'Viaje cancelado.')
  }

  if (cargando) {
    return (
      <div className="page-loading">
        <Spinner size="large" />
        <span>Cargando viaje…</span>
      </div>
    )
  }

  if (error) {
    const noExiste = ERRORES_NO_EXISTE.includes(error.codigo)

    return (
      <div className="viajes-page container">
        <Alert details={noExiste ? [] : error.detalles}>
          {noExiste ? 'Este viaje no existe' : error.mensaje}
        </Alert>
        <Link className="button button--ghost detalle-volver" to="/viajes">
          Volver a viajes
        </Link>
      </div>
    )
  }

  const permisos = permisosViaje(viaje, usuario)
  const pendiente = viaje.estado === 'pendiente'
  const invitarLogin = !usuario && pendiente
  const hayAcciones =
    invitarLogin || permisos.puedeSumarse || permisos.puedeCancelar

  return (
    <div className="viajes-page container">
      <Link className="detalle-volver-link" to="/viajes">
        ← Volver a viajes
      </Link>

      {aviso ? (
        <Alert tone={aviso.tone} details={aviso.detalles}>
          {aviso.mensaje}
        </Alert>
      ) : null}

      {viaje.estado === 'cancelado' ? (
        <Alert tone="info">Este viaje fue cancelado; ya no admite cambios.</Alert>
      ) : null}

      <DatosViaje
        viaje={viaje}
        nombreConductor={permisos.esConductor ? usuario.nombre : null}
      />

      {hayAcciones ? (
        <Card className="detalle-card">
          <h2>Acciones</h2>

          {invitarLogin ? (
            <Link
              className="button button--primary detalle-volver"
              to="/login"
              state={{ from: location }}
            >
              Ingresá para sumarte
            </Link>
          ) : null}

          {permisos.puedeSumarse ? (
            <form className="sumarme-form" onSubmit={sumarme}>
              <Input
                id="km"
                label="Kilómetros que vas a recorrer (opcional)"
                type="number"
                min="1"
                max={viaje.distanciaKm ?? undefined}
                hint="Si lo dejás vacío, se toma el recorrido completo"
                value={km}
                onChange={(evento) => setKm(evento.target.value)}
              />
              <Button type="submit" loading={enCurso}>
                Sumarme
              </Button>
            </form>
          ) : null}

          {permisos.puedeCancelar ? (
            <Button
              className="detalle-volver"
              variant="ghost"
              disabled={enCurso}
              onClick={cancelar}
            >
              Cancelar viaje
            </Button>
          ) : null}
        </Card>
      ) : null}

      <PasajerosViaje
        pasajeros={viaje.pasajeros}
        usuario={usuario}
        permisos={permisos}
        enCurso={enCurso}
        onBajar={bajar}
      />
    </div>
  )
}
