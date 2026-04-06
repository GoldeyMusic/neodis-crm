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
    <div className="form-card" style={{ cursor: 'default' }}>
      {/* Avatar + nom + badges (même layout que FormateurCard) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="f-avatar" style={{ margin: 0, flexShrink: 0, overflow: 'hidden' }}>
            {displayPhoto
              ? <img src={displayPhoto} alt={m.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <button
            onClick={() => !uploading && photoRef.current?.click()}
            title="Changer la photo"
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow)',
            }}
          >
            {uploading
              ? <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin .7s linear infinite' }}><circle cx="8" cy="8" r="6" strokeOpacity=".2"/><path d="M8 2a6 6 0 0 1 6 6"/></svg>
              : <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
            }
          </button>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.prenom} {m.nom}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {m.linkedEmail && (
              <span className="tag" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: 10 }}>Compte CRM</span>
            )}
            {isCurrentUser && (
              <span className="tag tag-verified" style={{ fontSize: 10 }}>Vous</span>
            )}
          </div>
        </div>
      </div>

      {/* Rôle (comme les spécialités des formateurs) */}
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
            <button className="btn btn-sm" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn btn-sm btn-primary" onClick={saveEdits}>Enregistrer</button>
          </div>
        </div>
      ) : (
        <>
          {m.role ? (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{m.role}</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: 10 }}>Rôle non renseigné</div>
          )}

          {/* Contact (même style que les formateurs) */}
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{m.email || 'Email non renseigné'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}>{m.tel || '—'}</div>

          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-sm"
              onClick={() => { setRole(m.role); setEmail(m.email); setTel(m.tel); setEditing(true) }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
              Modifier
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Vue principale Équipe ────────────────────────────────────────────────────
export default function Equipe() {
  const { equipe, user } = useCRM()

  return (
    <div>
      {/* En-tête (même style que Formateurs) */}
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Équipe UMANI</div>
          <div className="page-subtitle">{equipe.length} membre{equipe.length > 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Grille de cartes (même classe que formateur-grid) */}
      <div className="formateur-grid animate-in">
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
