import { NavLink } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth.js'
import Button from '../ui/Button.jsx'

function claseEnlace({ isActive }) {
  return `nav__link ${isActive ? 'nav__link--active' : ''}`
}

export default function Navbar() {
  const { usuario, estaAutenticado, cerrarSesion } = useAuth()

  return (
    <header className="site-header">
      <nav className="nav container" aria-label="Navegación principal">
        <NavLink className="brand" to="/viajes" aria-label="Viajes Grupo 8">
          <span className="brand__mark" aria-hidden="true">
            G8
          </span>
          <span>
            <strong>Viajes</strong>
            <small>Grupo 8</small>
          </span>
        </NavLink>

        <div className="nav__links">
          <NavLink className={claseEnlace} to="/viajes" end>
            Viajes
          </NavLink>
          {estaAutenticado ? (
            <>
              <NavLink className={claseEnlace} to="/viajes/nuevo">
                Publicar
              </NavLink>
              <NavLink className={claseEnlace} to="/vehiculos">
                Vehículos
              </NavLink>
            </>
          ) : null}
        </div>

        <div className="nav__actions">
          {estaAutenticado ? (
            <>
              <div className="user-chip" title={usuario.email}>
                <span className="user-chip__avatar" aria-hidden="true">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="user-chip__name">{usuario.nombre}</span>
              </div>
              <Button variant="ghost" onClick={cerrarSesion}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <NavLink className="nav__login" to="/login">
                Ingresar
              </NavLink>
              <NavLink className="button button--primary button--compact" to="/registro">
                Crear cuenta
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
