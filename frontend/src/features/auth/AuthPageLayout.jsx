import { Link } from 'react-router-dom'

export default function AuthPageLayout({
  eyebrow,
  title,
  description,
  children,
  alternateText,
  alternateLink,
  alternateLabel,
}) {
  return (
    <div className="auth-page container">
      <aside className="auth-visual" aria-label="Viaje compartido">
        <div className="auth-visual__content">
          <span className="auth-visual__eyebrow">Viajá en comunidad</span>
          <h2>Menos autos vacíos. Más caminos compartidos.</h2>
          <p>
            Encontrá personas que hacen tu misma ruta y organicen el viaje de
            forma simple y transparente.
          </p>
        </div>
        <div className="route-map" aria-hidden="true">
          <span className="route-map__city route-map__city--start">
            Bahía Blanca
          </span>
          <span className="route-map__line" />
          <span className="route-map__stop route-map__stop--one" />
          <span className="route-map__stop route-map__stop--two" />
          <span className="route-map__city route-map__city--end">CABA</span>
        </div>
        <div className="auth-visual__stat">
          <strong>Una sola cuenta</strong>
          <span>para publicar, reservar y gestionar tus vehículos</span>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-panel__heading">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        <p className="auth-panel__alternate">
          {alternateText}{' '}
          <Link to={alternateLink}>{alternateLabel}</Link>
        </p>
      </section>
    </div>
  )
}
