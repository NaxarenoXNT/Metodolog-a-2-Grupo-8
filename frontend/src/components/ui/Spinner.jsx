export default function Spinner({ size = 'medium' }) {
  return <span className={`spinner spinner--${size}`} aria-hidden="true" />
}
