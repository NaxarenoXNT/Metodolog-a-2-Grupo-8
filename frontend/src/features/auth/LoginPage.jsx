import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { extraerErrorApi } from '../../api/client.js'
import { useAuth } from '../../auth/useAuth.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import AuthPageLayout from './AuthPageLayout.jsx'

export default function LoginPage() {
  const { estaAutenticado, iniciarSesion } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (estaAutenticado) {
    return <Navigate to="/viajes" replace />
  }

  const destino = location.state?.from?.pathname || '/viajes'

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

    try {
      await iniciarSesion(formulario)
      navigate(destino, { replace: true })
    } catch (errorSolicitud) {
      setError(extraerErrorApi(errorSolicitud))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Bienvenido de nuevo"
      title="Ingresá a tu cuenta"
      description="Retomá tus viajes y administrá todo desde un mismo lugar."
      alternateText="¿Todavía no tenés cuenta?"
      alternateLink="/registro"
      alternateLabel="Registrate gratis"
    >
      {error ? (
        <Alert title="No pudimos iniciar sesión" details={error.detalles}>
          {error.mensaje}
        </Alert>
      ) : null}

      <form className="auth-form" onSubmit={enviar} noValidate>
        <Input
          id="login-email"
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
          id="login-password"
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Ingresá tu contraseña"
          value={formulario.password}
          onChange={actualizarCampo}
          required
        />
        <Button fullWidth loading={enviando} type="submit">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthPageLayout>
  )
}
