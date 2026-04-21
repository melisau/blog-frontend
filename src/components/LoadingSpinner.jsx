export default function LoadingSpinner({ label = '', size = 'md', centered = true }) {
  return (
    <div className={`loading-spinner${centered ? ' loading-spinner--centered' : ''}`} role="status" aria-live="polite">
      <span className={`loading-spinner__circle loading-spinner__circle--${size}`} aria-hidden="true" />
      {label ? <span className="loading-spinner__label">{label}</span> : null}
    </div>
  )
}
