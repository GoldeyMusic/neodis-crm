'use client'
import { useState, useRef, useEffect } from 'react'
import { useCRM } from '@/lib/store'

export default function Login() {
  const { login, showToast } = useCRM()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Pré-remplir l'email si une session est mémorisée
    const saved = localStorage.getItem('neodis_session')
    if (saved) {
      try {
        const { email: savedEmail } = JSON.parse(saved)
        if (savedEmail) { setEmail(savedEmail); setRemember(true) }
      } catch { /* ignore */ }
    }
    emailRef.current?.focus()
  }, [])

  const handleLogin = async () => {
    if (!email) { setError(''); return }
    if (!password) return
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const ok = login(email.trim().toLowerCase(), password, remember)
    setLoading(false)
    if (!ok) {
      setError('Email ou mot de passe incorrect')
      setPassword('')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="/umani-logo.svg" alt="UMANI" style={{ height: 36 }} />
          <span style={{ color: 'var(--text-primary)' }}>UMA<span style={{ color: 'var(--text-tertiary)' }}>NI</span></span>
          <span style={{ fontSize: '0.6em', fontWeight: 400, opacity: 0.6 }}>by</span>
          <span>NEO<span style={{ color: 'var(--text-tertiary)' }}>DIS</span></span>
        </div>
        <div className="login-tagline">Plateforme de gestion pédagogique</div>
        <div className="login-title">Connexion</div>
        <div className="login-subtitle">Accès réservé à l'équipe admin</div>

        <div className="login-field">
          <label className="login-label">Email</label>
          <input
            ref={emailRef}
            type="email"
            className={`login-input${error ? ' error' : ''}`}
            placeholder="votre@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoComplete="email"
          />
        </div>

        <div className="login-field">
          <label className="login-label">Mot de passe</label>
          <div className="pass-wrap">
            <input
              type={showPass ? 'text' : 'password'}
              className={`login-input${error ? ' error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
              style={{ paddingRight: 40 }}
            />
            <button className="pass-eye" type="button" onClick={() => setShowPass(v => !v)}>
              {showPass
                ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l12 12M6.5 6.6A2.5 2.5 0 0 0 9.4 9.5M4.2 4.3C2.6 5.4 1 8 1 8s2.5 5 7 5c1.4 0 2.6-.4 3.7-1M6 3.1C6.6 3 7.3 3 8 3c4.5 0 7 5 7 5s-.7 1.4-2 2.8"/></svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/></svg>
              }
            </button>
          </div>
        </div>

        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Se souvenir de moi
        </label>

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading
            ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" style={{ animation: 'spin .7s linear infinite' }}><circle cx="8" cy="8" r="6" strokeOpacity=".2"/><path d="M8 2a6 6 0 0 1 6 6"/></svg>
            : 'Se connecter'
          }
        </button>

        {error && (
          <div className="login-error">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11v.5"/></svg>
            {error}
          </div>
        )}

        <div className="login-footer">
          UMANI · CRM by NEODIS © 2025<br />
          <span style={{ fontSize: 11 }}>En cas de problème, contactez l'administrateur</span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
