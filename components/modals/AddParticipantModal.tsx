'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import { OPCOStatus, AssiduiteStatus } from '@/lib/data'

interface Props { onClose: () => void }

export default function AddParticipantModal({ onClose }: Props) {
  const { sessions, addParticipant, showToast } = useCRM()

  const [nom, setNom] = useState('')
  const [nomArtiste, setNomArtiste] = useState('')
  const [email, setEmail] = useState('')
  const [tel, setTel] = useState('')
  const [region, setRegion] = useState('')
  const [adresse, setAdresse] = useState('')
  const [session, setSession] = useState(sessions[0]?.name || '')
  const [financeur, setFinanceur] = useState('')
  const [factures, setFactures] = useState('—')
  const [idFT, setIdFT] = useState('—')
  const [numConvention, setNumConvention] = useState('—')
  const [insta, setInsta] = useState('—')
  const [youtube, setYoutube] = useState('—')
  const [streaming, setStreaming] = useState('—')
  const [spotifyTitre, setSpotifyTitre] = useState('—')
  const [titreSingle, setTitreSingle] = useState('—')
  const [lienUMANI, setLienUMANI] = useState('—')
  const [opcoStatus, setOpcoStatus] = useState<OPCOStatus>('')
  const [assiduite, setAssiduite] = useState<AssiduiteStatus>('')

  const handleSubmit = () => {
    if (!nom.trim()) { showToast('Nom requis'); return }
    const initials = nom.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    addParticipant({
      nom: nom.trim(), nomArtiste, email, tel, region, adresse, session, financeur, factures,
      idFT, numConvention, insta, youtube, streaming, spotifyTitre, titreSingle, lienUMANI, initials,
      parcours: [], opcoStatus, assiduite,
    })
    showToast('Participant ajouté')
    onClose()
  }

  return (
    <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal">
        <div className="form-modal-header">
          <div className="form-modal-title">Ajouter un participant</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Nom complet *</label>
              <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nom d'artiste</label>
              <input className="form-input" value={nomArtiste} onChange={e => setNomArtiste(e.target.value)} />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={tel} onChange={e => setTel(e.target.value)} />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Région</label>
              <input className="form-input" value={region} onChange={e => setRegion(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input className="form-input" value={adresse} onChange={e => setAdresse(e.target.value)} />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Session</label>
              <select className="form-input" value={session} onChange={e => setSession(e.target.value)}>
                <option value="">— Aucune —</option>
                {sessions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Financeur</label>
              <input className="form-input" value={financeur} onChange={e => setFinanceur(e.target.value)} />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Statut OPCO</label>
              <select className="form-input" value={opcoStatus} onChange={e => setOpcoStatus(e.target.value as OPCOStatus)}>
                <option value="">— Non renseigné</option>
                <option value="valide">Accepté</option>
                <option value="refuse">Refusé</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assiduité</label>
              <select className="form-input" value={assiduite} onChange={e => setAssiduite(e.target.value as AssiduiteStatus)}>
                <option value="">— Non renseigné</option>
                <option value="suivi_complet">Suivi complet</option>
                <option value="abandonne">Abandon</option>
                <option value="jamais_presente">Jamais présenté</option>
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
