import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="not-found container">
      <span className="not-found__code">404</span>
      <h1>Ese camino no existe</h1>
      <p>La dirección puede estar incompleta o la página cambió de lugar.</p>
      <Link className="button button--primary" to="/viajes">
        Volver a viajes
      </Link>
    </div>
  )
}
