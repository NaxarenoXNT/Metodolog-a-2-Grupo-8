import { useState } from 'react'
import { Link } from 'react-router-dom'

import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useCarga } from '../viajes/useCarga.js'
import VehiculoCard from './VehiculoCard.jsx'
import VehiculoForm from './VehiculoForm.jsx'
import { vehiculosApi } from './vehiculos.api.js'
import './vehiculos.css'

export default function VehiculosPage() {
  const { datos: vehiculos, error, cargando, setDatos } = useCarga(
    () => vehiculosApi.listar(),
    'vehiculos',
  )
  const [formAbierto, setFormAbierto] = useState(false)
  const [registrado, setRegistrado] = useState(false)

  function abrirForm() {
    setRegistrado(false)
    setFormAbierto(true)
  }

  function alCrear(vehiculo) {
    setDatos([...vehiculos, vehiculo])
    setFormAbierto(false)
    setRegistrado(true)
  }

  return (
    <div className="vehiculos-page container">
      <header>
        <span className="eyebrow">Mis vehículos</span>
        <h1>Gestioná con qué vehículo viajás</h1>
      </header>

      {cargando ? (
        <div className="page-loading">
          <Spinner size="large" />
          <span>Cargando vehículos…</span>
        </div>
      ) : error ? (
        <Alert details={[...new Set(error.detalles)]}>{error.mensaje}</Alert>
      ) : (
        <>
          {registrado ? (
            <Alert tone="success">
              Vehículo registrado.{' '}
              <Link className="vehiculos-enlace" to="/viajes/nuevo">
                Publicar un viaje
              </Link>
            </Alert>
          ) : null}

          {formAbierto ? (
            <VehiculoForm
              onCreado={alCrear}
              onCancelar={() => setFormAbierto(false)}
            />
          ) : null}

          {vehiculos.length === 0 ? (
            formAbierto ? null : (
              <div className="vehiculos-vacio">
                <p>Todavía no registraste vehículos</p>
                <Button onClick={abrirForm}>Registrar vehículo</Button>
              </div>
            )
          ) : (
            <>
              <div className="vehiculos-grid">
                {vehiculos.map((vehiculo) => (
                  <VehiculoCard key={vehiculo.id} vehiculo={vehiculo} />
                ))}
              </div>
              {formAbierto ? null : (
                <div className="vehiculos-acciones">
                  <Button onClick={abrirForm}>Agregar otro vehículo</Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
