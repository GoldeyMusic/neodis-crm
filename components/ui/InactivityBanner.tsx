'use client'

interface Props { onExtend: () => void }

export default function InactivityBanner({ onExtend }: Props) {
  return (
    <div className="inactivity-banner">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11v.5"/></svg>
      <span>Votre session expire dans <strong>2 minutes</strong> par inactivité</span>
      <button className="btn btn-sm" style={{ background: 'var(--warn)', color: 'white', borderColor: 'var(--warn)' }} onClick={onExtend}>
        Rester connecté
      </button>
    </div>
  )
}
