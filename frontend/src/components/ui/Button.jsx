import Spinner from './Spinner.jsx'

export default function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}) {
  const clases = [
    'button',
    `button--${variant}`,
    fullWidth ? 'button--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...props}
      className={clases}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <Spinner size="small" /> : null}
      <span>{children}</span>
    </button>
  )
}
