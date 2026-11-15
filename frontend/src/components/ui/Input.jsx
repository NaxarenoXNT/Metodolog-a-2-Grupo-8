export default function Input({
  id,
  label,
  hint,
  error,
  className = '',
  ...props
}) {
  const mensajeId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...props}
        aria-describedby={mensajeId}
        aria-invalid={Boolean(error)}
        className={`field__input ${error ? 'field__input--error' : ''}`}
        id={id}
      />
      {error ? (
        <span className="field__message field__message--error" id={mensajeId}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__message" id={mensajeId}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
