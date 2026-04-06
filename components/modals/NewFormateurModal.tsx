'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'

interface Props { onClose: () => void }

const SPECIALITES = [
  'Streaming',
  'Branding',
  'Marketing musical',
  "Identité d'artiste",
  'MAO',
  'Droits',
  'Écriture',
]

export default function NewFormateurModal({ onClose }: Props) {
  const { addFormateur, showToast } = useCRM()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [specs, setSpecs] = useState<string[]>([])
  const [specAutre, setSpecAutre] = useState('')
  const [tarifHoraire, setTarifHoraire] = useState('')
  const [email, setEmail] = useState('')
  const [tel, setTel] = useState('')
  const [type, setType] = useState<'principal' | 'masterclass'>('principal')
  const [statut, setStatut] = useState<'verified' | 'contact'>('contact')

  const toggleSpec = (s: string) => {
    setSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const finalSpecs = specAutre.trim()
    ? [...specs, specAutre.trim()]
    : specs

  const handleSubmit = () => {
    if (!nom || !prenom) { showToast('Prénom et nom requis'); return }
    if (finalSpecs.length === 0) { showToast('Au moins une spécialité requise'); return }
    addFormateur({ nom: `${prenom} ${nom}`, spec: finalSpecs, email, tel, type, statut, tarifHoraire: tarifHoraire ? parseFloat(tarifHoraire) : undefined })
    showToast(`${prenom} ${nom} ajouté·e`)
    onClose()
  }

  return (
    <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal">
        <div className="form-modal-header">
          <div className="form-modal-title">Nouveau formateur</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="form-input" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de famille" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Spécialités * <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)', fontSize: 11 }}>— sélection multiple</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {SPECIALITES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all .12s',
                      background: specs.includes(s) ? 'var(--text-primary)' : 'var(--surface)',
                      color: specs.includes(s) ? 'white' : 'var(--text-secondary)',
                      borderColor: specs.includes(s) ? 'var(--text-primary)' : 'var(--border)',
                    }}
                  >
                    {specs.includes(s) && <span style={{ marginRight: 4 }}>✓</span>}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Autre spécialité <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)', fontSize: 11 }}>— champ libre</span></label>
              <input className="form-input" value={specAutre} onChange={e => setSpecAutre(e.target.value)} placeholder="ex. Beatmaking, Vocal coaching…" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.fr" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={tel} onChange={e => setTel(e.target.value)} placeholder="06 XX XX XX XX" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tarif horaire <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)', fontSize: 11 }}>— € HT / heure</span></label>
              <input type="number" className="form-input" value={tarifHoraire} onChange={e => setTarifHoraire(e.target.value)} placeholder="ex. 120" min="0" />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="principal">Formateur principal</option>
                <option value="masterclass">Masterclass</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-input" value={statut} onChange={e => setStatut(e.target.value as any)}>
                <option value="verified">Vérifié</option>
                <option value="contact">À contacter</option>
              </select>
            </div>
          </div>
        </div>
        <div className="form-modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Ajouter</button>
        </div>
      </div>
    </div>
  )
}
