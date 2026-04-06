'use client'
import { useState, useRef, useEffect } from 'react'
import { useCRM } from '@/lib/store'

interface Props { open: boolean; onClose: () => void }

export default function ProfileModal({ open, onClose }: Props) {
  const { user, updateUser, logout, showToast, logActivity } = useCRM()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [mdp, setMdp] = useState('')
  const [mdp2, setMdp2] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && user) {
      setPrenom(user.name)
      setNom(user.nom)
      setEmail(user.email)
      setRole('')
      setMdp(''); setMdp2('')
    }
  }, [open, user])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2097152) { showToast('Photo trop lourde (max 2 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => updateUser({ photo: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  const save = () => {
    if (!prenom || !nom) { showToast('Prénom et nom requis'); return }
    if (mdp && mdp !== mdp2) { showToast('Les mots de passe ne correspondent pas'); return }
    updateUser({ name: prenom, nom, email })
    logActivity('✎', `Profil mis à jour — ${prenom} ${nom}`)
    showToast('Profil enregistré')
    onClose()
  }

  const handleLogout = () => { onClose(); logout() }
  const initials = user ? (user.name[0] + user.nom[0]).toUpperCase() : 'AD'

  return (
    <div className={`form-modal-backdrop${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal" style={{ maxWidth: 460 }}>
        <div className="form-modal-header">
          <div className="form-modal-title">Mon profil</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--text-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontFamily: 'DM Mono', overflow: 'hidden', border: '2px solid var(--border)' }}>
                {user?.photo ? <img src={user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </div>
              <button onClick={() => photoRef.current?.click()} style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
              </button>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Photo de profil</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>JPG, PNG · max 2 MB</div>
              {user?.photo && <button onClick={() => updateUser({ photo: undefined })} style={{ marginTop: 6, fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans' }}>Supprimer</button>}
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group"><label className="form-label">Prénom *</label><input className="form-input" value={prenom} onChange={e => setPrenom(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={nom} onChange={e => setNom(e.target.value)} /></div>
          </div>
          <div className="form-row"><div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} /></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Rôle / Poste</label><input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="ex. Responsable pédagogique" /></div></div>

          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'DM Mono', paddingTop: 4, borderTop: '1px solid var(--border)', marginBottom: 14 }}>Changer le mot de passe</div>
          <div className="form-row two">
            <div className="form-group"><label className="form-label">Nouveau</label><input type="password" className="form-input" value={mdp} onChange={e => setMdp(e.target.value)} placeholder="••••••••" /></div>
            <div className="form-group"><label className="form-label">Confirmer</label><input type="password" className="form-input" value={mdp2} onChange={e => setMdp2(e.target.value)} placeholder="••••••••" /></div>
          </div>
        </div>
        <div className="form-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger" onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"/></svg>
            Se déconnecter
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={save}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
