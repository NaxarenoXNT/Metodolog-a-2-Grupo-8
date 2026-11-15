import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { extraerErrorApi } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import AuthPageLayout from './AuthPageLayout.jsx'

const FORMULARIO_INICIAL = {
  nombre: '',
  email: '',
  telefono: '',
  password: '',
}

export default function RegistroPage() {
  const { estaAutenticado, registrar } = useAuth()
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (estaAutenticado) {
    return <Navigate to="/viajes" replace />
  }

  function actualizarCampo(event) {
    setFormulario((actual) => ({
      ...actual,
      [event.target.name]: event.target.value,
    }))
  }

  async function enviar(event) {
    event.preventDefault()
    setError(null)
    setEnviando(true)

    const datos = {
      nombre: formulario.nombre,
      email: formulario.email,
      password: formulario.password,
      ...(formulario.telefono.trim()
        ? { telefono: formulario.telefono }
        : {}),
    }

    try {
      await registrar(datos)
      navigate('/viajes', { replace: true })
    } catch (errorSolicitud) {
      setError(extraerErrorApi(errorSolicitud))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Sumate a la comunidad"
      title="Creá tu cuenta"
      description="Completá tus datos y empezá a organizar viajes compartidos."
      alternateText="¿Ya tenés una cuenta?"
      alternateLink="/login"
      alternateLabel="Ingresá acá"
    >
      {error ? (
        <Alert title="No pudimos crear la cuenta" details={error.detalles}>
          {error.mensaje}
        </Alert>
      ) : null}

      <form className="auth-form auth-form--grid" onSubmit={enviar} noValidate>
        <Input
          id="registro-nombre"
          label="Nombre completo"
          name="nombre"
          type="text"
          autoComplete="name"
          placeholder="Ej. Ana Pérez"
          value={formulario.nombre}
          onChange={actualizarCampo}
          required
        />
        <Input
          id="registro-telefono"
          label="Teléfono (opcional)"
          name="telefono"
          type="tel"
          autoComplete="tel"
          placeholder="Ej. 291 555-0101"
          value={formulario.telefono}
          onChange={actualizarCampo}
        />
        <Input
          className="auth-form__wide"
          id="registro-email"
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          value={formulario.email}
          onChange={actualizarCampo}
          required
        />
        <Input
          className="auth-form__wide"
          id="registro-password"
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Elegí una contraseña"
          hint="Guardala en un lugar seguro; la sesión dura 24 horas."
          value={formulario.password}
          onChange={actualizarCampo}
          required
        />
        <div className="auth-form__wide">
          <Button fullWidth loading={enviando} type="submit">
            {enviando ? 'Creando cuenta…' : 'Crear mi cuenta'}
          </Button>
        </div>
      </form>
    </AuthPageLayout>
  )
}
