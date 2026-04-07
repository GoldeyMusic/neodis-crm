'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import { Participant, OPCOStatus, AssiduiteStatus } from '@/lib/data'

interface Props { participant: Participant; onClose: () => void }

export default function EditParticipantModal({ participant, onClose }: Props) {
  const { sessions, updateParticipant, showToast } = useCRM()
  const p = participant

  const [nom, setNom] = useState(p.nom)
  const [nomArtiste, setNomArtiste] = useState(p.nomArtiste)
  const [email, setEmail] = useState(p.email)
  const [tel, setTel] = useState(p.tel)
  const [region, setRegion] = useState(p.region)
  const [adresse, setAdresse] = useState(p.adresse)
  const [session, setSession] = useState(p.session)
  const [financeur, setFinanceur] = useState(p.financeur)
  const [factures, setFactures] = useState(p.factures)
  const [idFT, setIdFT] = useState(p.idFT)
  const [numConvention, setNumConvention] = useState(p.numConvention)
  const [insta, setInsta] = useState(p.insta)
  const [youtube, setYoutube] = useState(p.youtube)
  const [streaming, setStreaming] = useState(p.streaming)
  const [spotifyTitre, setSpotifyTitre] = useState(p.spotifyTitre)
  const [titreSingle, setTitreSingle] = useState(p.titreSingle)
  const [lienUMANI, setLienUMANI] = useState(p.lienUMANI)
  const [opcoStatus, setOpcoStatus] = useState<OPCOStatus>(p.opcoStatus || '')
  const [assiduite, setAssiduite] = useState<AssiduiteStatus>(p.assiduite || '')

  const handleSubmit = () => {
    if (!nom.trim()) { showToast('Nom requis'); return }
    const initials = nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    updateParticipant(p.id, {
      nom, nomArtiste, email, tel, region, adresse, session, financeur, factures,
      idFT, numConvention, insta, youtube, streaming, spotifyTitre, titreSingle, lienUMANI, initials,
      opcoStatus, assiduite,
    })
    showToast('Participant mis à jour')
    onClose()
  }

  return (
    <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal">
        <div className="form-modal-header">
          <div className="form-modal-title">Modifier le participant</div>
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
              <label className="form-label">ID France Travail</label>
              <input className="form-input" value={idFT} onChange={e => setIdFT(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">N° convention</label>
              <input className="form-input" value={numConvention} onChange={e => setNumConvention(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Factures</label>
              <input className="form-input" value={factures} onChange={e => setFactures(e.target.value)} />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Statut OPCO</label>
              <select className="form-input" value={opcoStatus} onChange={e => setOpcoStatus(e.target.value as OPCOStatus)}>
                <option value="">— Non renseigné</option>
                <option value="en_attente">En attente</option>
                <option value="valide">Validé</option>
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

          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
            <div className="form-label" style={{ marginBottom: 12, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tertiary)' }}>Présence en ligne</div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input className="form-input" value={insta} onChange={e => setInsta(e.target.value)} placeholder="https://instagram.com/…" />
            </div>
            <div className="form-group">
              <label className="form-label">YouTube</label>
              <input className="form-input" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="https://youtube.com/…" />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Spotify artiste</label>
              <input className="form-input" value={streaming} onChange={e => setStreaming(e.target.value)} placeholder="https://open.spotify.com/…" />
            </div>
            <div className="form-group">
              <label className="form-label">Titre single</label>
              <input className="form-input" value={titreSingle} onChange={e => setTitreSingle(e.target.value)} placeholder="Nom du single" />
            </div>
          </div>

          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Spotify titre</label>
              <input className="form-input" value={spotifyTitre} onChange={e => setSpotifyTitre(e.target.value)} placeholder="https://open.spotify.com/track/…" />
            </div>
            <div className="form-group">
              <label className="form-label">Lien UMANI</label>
              <input className="form-input" value={lienUMANI} onChange={e => setLienUMANI(e.target.value)} placeholder="https://…" />
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
