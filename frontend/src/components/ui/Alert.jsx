export default function Alert({
  children,
  title,
  tone = 'error',
  details = [],
}) {
  return (
    <div className={`alert alert--${tone}`} role="alert" aria-live="assertive">
      <span className="alert__icon" aria-hidden="true">
        {tone === 'error' ? '!' : 'i'}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        {children ? <p>{children}</p> : null}
        {details.length > 0 ? (
          <ul>
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
