import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth.js'
import Card from '../components/ui/Card.jsx'

export default function PlaceholderPage({ eyebrow, title, description, action }) {
  const { estaAutenticado } = useAuth()

  return (
    <div className="placeholder-page container">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p className="placeholder-page__lead">{description}</p>

      <div className="placeholder-grid">
        <Card className="placeholder-card placeholder-card--accent">
          <span className="placeholder-card__number">01</span>
          <h2>Base lista para integrar</h2>
          <p>
            La navegación, la sesión y la protección de rutas ya están
            conectadas con el backend.
          </p>
        </Card>
        <Card className="placeholder-card">
          <span className="placeholder-card__number">02</span>
          <h2>Próximo bloque del equipo</h2>
          <p>
            Esta pantalla marca el punto donde se conecta la funcionalidad sin
            mezclar responsabilidades entre ramas.
          </p>
        </Card>
      </div>

      {action ? (
        <Link className="button button--primary" to={action.to}>
          {action.label}
        </Link>
      ) : !estaAutenticado ? (
        <Link className="button button--primary" to="/registro">
          Crear una cuenta
        </Link>
      ) : null}
    </div>
  )
}
