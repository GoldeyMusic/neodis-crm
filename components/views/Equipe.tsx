'use client'
import { useState, useRef } from 'react'
import { useCRM } from '@/lib/store'
import { MembreEquipe } from '@/lib/data'

// ── Carte d'un membre ────────────────────────────────────────────────────────
function MembreCard({ m, isCurrentUser, currentUserPhoto }: {
  m: MembreEquipe
  isCurrentUser: boolean
  currentUserPhoto?: string
}) {
  const { updateMembre, showToast } = useCRM()
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState(m.role)
  const [email, setEmail] = useState(m.email)
  const [tel, setTel] = useState(m.tel)
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  // Photo : si le membre est l'utilisateur connecté et a une photo de profil → l'utiliser
  const displayPhoto = isCurrentUser && currentUserPhoto ? currentUserPhoto : m.photo

  const initials = (m.prenom[0] + m.nom[0]).toUpperCase()

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { showToast('Photo trop lourde (max 3 MB)'); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      await updateMembre(m.id, { photo: ev.target?.result as string })
      setUploading(false)
      showToast('Photo enregistrée')
    }
    reader.readAsDataURL(file)
  }

  const saveEdits = async () => {
    await updateMembre(m.id, { role, email, tel })
    setEditing(false)
    showToast('Membre mis à jour')
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Bandeau coloré */}
      <div style={{ height: 6, background: 'var(--ft-bg, #f0f4ff)', borderBottom: '1px solid var(--border)' }} />

      <div style={{ padding: '20px 20px 16px' }}>
        {/* Avatar + nom */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--text-primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontFamily: 'DM Mono', overflow: 'hidden',
              border: '2px solid var(--border)',
            }}>
              {displayPhoto
                ? <img src={displayPhoto} alt={m.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            {/* Bouton photo */}
            <button
              onClick={() => !uploading && photoRef.current?.click()}
              title="Changer la photo"
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--surface)', border: '1px solid var(--border)',
                cursor: uploading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow)',
              }}
            >
              {uploading
                ? <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin .7s linear infinite' }}><circle cx="8" cy="8" r="6" strokeOpacity=".2"/><path d="M8 2a6 6 0 0 1 6 6"/></svg>
                : <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
              }
            </button>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {m.prenom} <span style={{ fontFamily: 'DM Mono', fontSize: 13 }}>{m.nom}</span>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {m.linkedEmail && (
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99,
                  background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                  fontFamily: 'DM Mono',
                }}>
                  Compte CRM
                </span>
              )}
              {isCurrentUser && (
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99,
                  background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
                  fontFamily: 'DM Mono',
                }}>
                  Vous
                </span>
              )}
            </div>
          </div>

          {/* Bouton éditer */}
          {!editing && (
            <button
              className="btn btn-sm"
              onClick={() => { setRole(m.role); setEmail(m.email); setTel(m.tel); setEditing(true) }}
              style={{ flexShrink: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
              Modifier
            </button>
          )}
        </div>

        {/* Infos / formulaire */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Rôle / Poste</label>
              <input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="ex. Directeur artistique" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input type="tel" className="form-input" value={tel} onChange={e => setTel(e.target.value)} placeholder="+33 6 …" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditing(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveEdits}>Enregistrer</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Rôle */}
            <div style={{ fontSize: 13, color: m.role ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontStyle: m.role ? 'normal' : 'italic' }}>
              {m.role || 'Rôle non renseigné'}
            </div>

            {/* Contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
              {m.email ? (
                <a href={`mailto:${m.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 6l7 4 7-4"/></svg>
                  {m.email}
                </a>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 6l7 4 7-4"/></svg>
                  Email non renseigné
                </span>
              )}
              {m.tel ? (
                <a href={`tel:${m.tel}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2a1 1 0 0 1 1-1h2l1 3-1.5 1.5a10 10 0 0 0 4 4L11 8l3 1v2a1 1 0 0 1-1 1A13 13 0 0 1 2 3a1 1 0 0 1 1-1z"/></svg>
                  {m.tel}
                </a>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2a1 1 0 0 1 1-1h2l1 3-1.5 1.5a10 10 0 0 0 4 4L11 8l3 1v2a1 1 0 0 1-1 1A13 13 0 0 1 2 3a1 1 0 0 1 1-1z"/></svg>
                  Téléphone non renseigné
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vue principale Équipe ────────────────────────────────────────────────────
export default function Equipe() {
  const { equipe, user } = useCRM()

  return (
    <div className="view-container">
      {/* En-tête */}
      <div className="view-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="view-title">Équipe UMANI</div>
          <div className="view-subtitle">{equipe.length} membre{equipe.length > 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Grille de cartes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {equipe.map(m => (
          <MembreCard
            key={m.id}
            m={m}
            isCurrentUser={!!(user && m.linkedEmail && m.linkedEmail.toLowerCase() === user.email.toLowerCase())}
            currentUserPhoto={user?.photo}
          />
        ))}
      </div>
    </div>
  )
}
