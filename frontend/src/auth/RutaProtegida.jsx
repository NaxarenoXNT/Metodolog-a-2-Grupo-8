import { Navigate, Outlet, useLocation } from 'react-router-dom'

import Spinner from '../components/ui/Spinner.jsx'
import { useAuth } from './useAuth.js'

export default function RutaProtegida() {
  const { estaAutenticado, inicializando } = useAuth()
  const location = useLocation()

  if (inicializando) {
    return (
      <div className="page-loading" role="status" aria-live="polite">
        <Spinner size="large" />
        <span>Recuperando tu sesión…</span>
      </div>
    )
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
