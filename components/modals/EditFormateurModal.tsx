'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import { Formateur } from '@/lib/data'

interface Props { formateur: Formateur; onClose: () => void }

const SPECIALITES = [
  'Streaming',
  'Branding',
  'Marketing musical',
  "Identité d'artiste",
  'MAO',
  'Droits',
  'Écriture',
]

export default function EditFormateurModal({ formateur, onClose }: Props) {
  const { updateFormateur, showToast } = useCRM()

  const existingKnown = formateur.spec.filter(s => SPECIALITES.includes(s))
  const existingAutre = formateur.spec.filter(s => !SPECIALITES.includes(s)).join(', ')

  const [nom, setNom] = useState(formateur.nom)
  const [specs, setSpecs] = useState<string[]>(existingKnown)
  const [specAutre, setSpecAutre] = useState(existingAutre)
  const [email, setEmail] = useState(formateur.email)
  const [tel, setTel] = useState(formateur.tel)
  const [type, setType] = useState<'principal' | 'masterclass'>(formateur.type)
  const [statut, setStatut] = useState<'verified' | 'contact'>(formateur.statut)
  const [tarifHoraire, setTarifHoraire] = useState(formateur.tarifHoraire?.toString() || '')

  const toggleSpec = (s: string) => {
    setSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const finalSpecs = specAutre.trim()
    ? [...specs, ...specAutre.split(',').map(s => s.trim()).filter(Boolean)]
    : specs

  const handleSubmit = () => {
    if (!nom) { showToast('Nom requis'); return }
    if (finalSpecs.length === 0) { showToast('Au moins une spécialité requise'); return }
    updateFormateur(formateur.id, { nom, spec: finalSpecs, email, tel, type, statut, tarifHoraire: tarifHoraire ? parseFloat(tarifHoraire) : undefined })
    showToast('Formateur mis à jour')
    onClose()
  }

  return (
    <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal">
        <div className="form-modal-header">
          <div className="form-modal-title">Modifier le formateur</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom complet *</label>
              <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} autoFocus />
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
              <label className="form-label">Autre spécialité <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)', fontSize: 11 }}>— champ libre, séparées par virgule</span></label>
              <input className="form-input" value={specAutre} onChange={e => setSpecAutre(e.target.value)} placeholder="ex. Beatmaking, Vocal coaching…" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={tel} onChange={e => setTel(e.target.value)} />
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
          <button className="btn btn-primary" onClick={handleSubmit}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
