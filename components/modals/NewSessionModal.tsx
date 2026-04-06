'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'

interface Props { onClose: () => void }

export default function NewSessionModal({ onClose }: Props) {
  const { addSession, showToast } = useCRM()
  const [name, setName] = useState('')
  const [financeur, setFinanceur] = useState<'France Travail' | 'OPCO' | ''>('')
  const [typeFT, setTypeFT] = useState('')
  const [duree, setDuree] = useState<'35h' | '60h' | ''>('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = () => {
    if (!name || !financeur || !duree) { showToast('Nom, financeur et durée requis'); return }
    addSession({
      name,
      financeur: financeur as 'France Travail' | 'OPCO',
      typeFT: typeFT as any,
      duree: duree as '35h' | '60h',
      dates: dateStart && dateEnd ? `${dateStart} — ${dateEnd}` : dateStart || '—',
      participants: 0,
      status: 'upcoming',
    })
    showToast(`Session "${name}" créée`)
    onClose()
  }

  return (
    <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal">
        <div className="form-modal-header">
          <div className="form-modal-title">Nouvelle session</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <div className="form-row"><div className="form-group"><label className="form-label">Nom de la session *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="ex. Promo UMANI Jan 2026" /></div></div>
          <div className="form-row two">
            <div className="form-group">
              <label className="form-label">Financeur *</label>
              <select className="form-input" value={financeur} onChange={e => { setFinanceur(e.target.value as any); setTypeFT('') }}>
                <option value="">Choisir…</option>
                <option>France Travail</option>
                <option>OPCO</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Durée *</label>
              <select className="form-input" value={duree} onChange={e => setDuree(e.target.value as any)}>
                <option value="">Choisir…</option>
                <option>35h</option>
                <option>60h</option>
              </select>
            </div>
          </div>
          {financeur === 'France Travail' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type de financement</label>
                <select className="form-input" value={typeFT} onChange={e => setTypeFT(e.target.value)}>
                  <option value="">Choisir…</option>
                  <option>Prest@ppli</option>
                  <option>AIF</option>
                </select>
              </div>
            </div>
          )}
          <div className="form-row two">
            <div className="form-group"><label className="form-label">Date de début</label><input type="date" className="form-input" value={dateStart} onChange={e => setDateStart(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Date de fin</label><input type="date" className="form-input" value={dateEnd} onChange={e => setDateEnd(e.target.value)} /></div>
          </div>
          <div className="form-row"><div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes sur cette session…" /></div></div>
        </div>
        <div className="form-modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Créer la session</button>
        </div>
      </div>
    </div>
  )
}
