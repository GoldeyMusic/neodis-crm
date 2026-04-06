'use client'
import { useState, useRef } from 'react'
import { useCRM, Document } from '@/lib/store'
import { Session, Participant } from '@/lib/data'
import ParticipantModal from './ParticipantModal'
import DocumentViewer from '../ui/DocumentViewer'

interface Props { session: Session; onClose: () => void }

const statusLabel: Record<string, string> = { active: 'En cours', done: 'Terminée', upcoming: 'À venir' }
const tabs = ["Vue d'ensemble", 'Participants', 'Documents', 'Checklist', 'Budget']

export default function SessionModal({ session: sessionProp, onClose }: Props) {
  const { participants, sessions, deleteSession, updateSession, showToast } = useCRM()
  const [activeTab, setActiveTab] = useState(0)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  // Toujours lire la session fraîche depuis le store (pour la checklist et le planning)
  const session = sessions.find(s => s.id === sessionProp.id) ?? sessionProp

  const sessionParticipants = participants.filter(p => p.session === session.name)

  // CA facturé de la session
  const TARIF_AIF = 2100
  const isPrestappli = session.typeFT === 'Prest@ppli'
  const nbFactures   = sessionParticipants.filter(p => p.factures && p.factures !== '—').length
  const caFacture    = isPrestappli
    ? (nbFactures > 0 || session.status === 'done' ? (session.montantCA ?? 0) : 0)
    : nbFactures * TARIF_AIF
  const caPotentiel  = isPrestappli
    ? (session.montantCA ?? 0)
    : sessionParticipants.length * TARIF_AIF
  const pctFacture   = caPotentiel > 0 ? Math.round((caFacture / caPotentiel) * 100) : 0

  const handleDelete = () => {
    if (confirm(`Supprimer "${session.name}" ?`)) {
      deleteSession(session.id)
      onClose()
    }
  }

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ['Nom', 'Nom artiste', 'Email', 'Téléphone', 'ID France Travail', 'N° Convention', 'Factures', 'Instagram', 'Lien UMANI']
    const rows = sessionParticipants.map(p => [
      p.nom, p.nomArtiste, p.email, p.tel,
      p.idFT, p.numConvention, p.factures,
      p.insta, p.lienUMANI,
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${session.name.replace(/\s+/g, '_')}_participants.csv`
    a.click()
    showToast(`${sessionParticipants.length} participants exportés`)
  }

  return (
    <>
      <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-panel">
          <div className="modal-header">
            <div className="modal-toprow" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{session.dates} · {session.financeur} · {session.duree}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <span className={`status-pill ${session.status}`}>{statusLabel[session.status]}</span>
                  <button className="btn btn-sm btn-danger" onClick={handleDelete}>Supprimer</button>
                </div>
              </div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-tabs">
              {tabs.map((t, i) => <div key={t} className={`modal-tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>{t}</div>)}
            </div>
          </div>

          <div className="modal-body">

            {/* Vue d'ensemble */}
            {activeTab === 0 && (
              <div>
                <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 20 }}>
                  <div className="info-block"><div className="info-label">Financeur</div><div className="info-value">{session.financeur}</div></div>
                  <div className="info-block"><div className="info-label">Type</div><div className="info-value">{session.typeFT || '—'}</div></div>
                  <div className="info-block"><div className="info-label">Durée</div><div className="info-value">{session.duree}</div></div>
                  <div className="info-block"><div className="info-label">Participants</div><div className="info-value">{sessionParticipants.length || session.participants}</div></div>
                  <div className="info-block"><div className="info-label">Statut</div><div className="info-value"><span className={`status-pill ${session.status}`}>{statusLabel[session.status]}</span></div></div>
                  <div className="info-block"><div className="info-label">Dates</div><div className="info-value" style={{ fontSize: 13 }}>{session.dates}</div></div>
                </div>

                {/* Bloc CA facturé */}
                {caPotentiel > 0 && (
                  <div style={{ padding: '14px 16px', background: caFacture === caPotentiel ? '#F0FFF4' : 'var(--surface-2)', border: `1px solid ${caFacture === caPotentiel ? '#BBF7D0' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                        CA facturé
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 700, color: caFacture === caPotentiel ? '#16A34A' : 'var(--text-primary)' }}>
                          {caFacture.toLocaleString('fr-FR')} €
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          / {caPotentiel.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${pctFacture}%`, borderRadius: 3, background: caFacture === caPotentiel ? '#16A34A' : 'var(--ft)', transition: 'width .4s ease' }} />
                    </div>

                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                      {isPrestappli
                        ? `Forfait Prest@ppli${caFacture > 0 ? ' · facturé' : ' · non facturé'}`
                        : `${nbFactures} facture${nbFactures > 1 ? 's' : ''} liée${nbFactures > 1 ? 's' : ''} sur ${sessionParticipants.length} participant${sessionParticipants.length > 1 ? 's' : ''} · ${TARIF_AIF.toLocaleString('fr-FR')} € / pers.`
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Participants */}
            {activeTab === 1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="section-label" style={{ marginBottom: 0 }}>
                    {sessionParticipants.length} participant{sessionParticipants.length > 1 ? 's' : ''}
                  </div>
                  {sessionParticipants.length > 0 && (
                    <button className="btn btn-sm" onClick={exportCSV}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v8M5 8l3 3 3-3M3 13h10"/></svg>
                      Exporter CSV
                    </button>
                  )}
                </div>
                {sessionParticipants.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: 24 }}>Aucun participant dans cette session</div>
                ) : (
                  <div className="card">
                    {sessionParticipants.map(p => (
                      <div
                        key={p.id}
                        className="session-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedParticipant(p)}
                      >
                        <div className="avatar" style={{ flexShrink: 0 }}>{p.initials}</div>
                        <div className="session-info" style={{ flex: 1 }}>
                          <div className="session-name">{p.nom}</div>
                          <div className="session-meta">{p.nomArtiste !== '—' ? p.nomArtiste : ''}{p.titreSingle && p.titreSingle !== '—' ? ` · ${p.titreSingle}` : ''}</div>
                        </div>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                          <path d="M6 3l5 5-5 5"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents */}
            {activeTab === 2 && (
              <SessionDocumentsTab session={session} />
            )}

            {/* Budget */}
            {activeTab === 4 && (
              <BudgetTab session={session} />
            )}

            {/* Checklist */}
            {activeTab === 3 && (
              <div>
                <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--ft-bg)', border: '1px solid var(--ft-border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--ft)' }}>
                  Financeur : <strong>{session.financeur} {session.typeFT ? `(${session.typeFT})` : ''}</strong>
                </div>
                {[['Avant la formation', ['Créer la session (CARIF)', 'Créer le devis (KAIROS)', 'Attester du commencement (KAIROS)']],
                  ['En fin de formation', ['Valider et télécharger le bilan (KAIROS)', 'Créer la facture Qonto', 'Envoyer facture sur Chorus Pro']]
                ].map(([title, items]) => (
                  <div key={title as string} className="checklist-section">
                    <div className="checklist-title">{title as string}</div>
                    {(items as string[]).map(item => (
                      <CheckItem
                        key={item}
                        label={item}
                        checked={!!(session.checklist?.[item])}
                        onChange={val => updateSession(session.id, {
                          checklist: { ...session.checklist, [item]: val }
                        })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fiche participant ouverte depuis la session */}
      {selectedParticipant && (
        <ParticipantModal
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}
    </>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className={`checklist-item${checked ? ' done' : ''}`} onClick={() => onChange(!checked)}>
      <div className="check-box">
        {checked && <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={{ width: 10, height: 10 }}><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>}
      </div>
      <span className="check-text">{label}</span>
    </div>
  )
}

const catLabels: Record<string, string> = {
  factures_financeurs: 'Factures financeurs', factures_formateurs: 'Factures formateurs',
  presence: 'Feuilles de présence', bilans: 'Bilans', cv: 'CV Formateurs', pedago: 'Ressources pédago',
}
const catColors: Record<string, { bg: string; color: string; border: string }> = {
  factures_financeurs: { bg: 'var(--ft-bg)', color: 'var(--ft)', border: 'var(--ft-border)' },
  factures_formateurs: { bg: 'var(--opco-bg)', color: 'var(--opco)', border: '#DDD6FE' },
  presence:            { bg: '#F0FFF4', color: '#16A34A', border: '#BBF7D0' },
  bilans:              { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  cv:                  { bg: 'var(--ft-bg)', color: 'var(--ft)', border: 'var(--ft-border)' },
  pedago:              { bg: 'var(--surface-2)', color: 'var(--text-tertiary)', border: 'var(--border)' },
}

function SessionDocumentsTab({ session }: { session: Session }) {
  const { documents, addDocument, deleteDocument, showToast } = useCRM()
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewer, setViewer] = useState<{ name: string; data: string } | null>(null)
  const [pending, setPending] = useState<{ name: string; size: string; data: string } | null>(null)
  const [uploadCat, setUploadCat] = useState('')
  const [uploadNom, setUploadNom] = useState('')

  // Documents liés à cette session
  const sessionDocs = documents.filter(d => d.session?.split(' | ').includes(session.name))

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { showToast('Fichier trop lourd (max 10 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const size = file.size < 1024 * 1024
        ? Math.round(file.size / 1024) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      setPending({ name: file.name, size, data: ev.target?.result as string })
      setUploadNom(file.name)
    }
    reader.readAsDataURL(file)
  }

  const confirmUpload = () => {
    if (!pending || !uploadCat) { showToast('Sélectionne une catégorie'); return }
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    addDocument({ nom: uploadNom || pending.name, cat: uploadCat, session: session.name, taille: pending.size, date, data: pending.data })
    showToast(`"${uploadNom || pending.name}" ajouté`)
    setPending(null); setUploadCat(''); setUploadNom('')
  }

  const download = (d: Document) => { const a = document.createElement('a'); a.href = d.data; a.download = d.nom; a.click() }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>
          {sessionDocs.length} document{sessionDocs.length !== 1 ? 's' : ''}
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 11V3M4 7l4-4 4 4"/><path d="M3 13h10"/></svg>
          Uploader
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>

      {sessionDocs.length === 0 && !pending ? (
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, cursor: 'pointer', border: '2px dashed var(--border)' }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Aucun document pour cette session</div>
          <div style={{ fontSize: 12 }}>Cliquez ou glissez un fichier pour uploader</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 14 }}>
          {sessionDocs.map(d => {
            const colors = catColors[d.cat] || catColors.pedago
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{d.taille} · {d.date}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>{catLabels[d.cat] || d.cat}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-sm" onClick={() => setViewer({ name: d.nom, data: d.data })}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/></svg>
                    Voir
                  </button>
                  <button className="btn btn-sm" onClick={() => download(d)}>↓</button>
                  <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`Supprimer "${d.nom}" ?`)) deleteDocument(d.id) }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal upload */}
      {pending && (
        <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && setPending(null)}>
          <div className="form-modal" style={{ maxWidth: 420 }}>
            <div className="form-modal-header">
              <div className="form-modal-title">Classer le document</div>
              <button className="modal-close" onClick={() => setPending(null)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div><div style={{ fontSize: 13, fontWeight: 500 }}>{pending.name}</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{pending.size}</div></div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Nom</label>
                <input className="form-input" value={uploadNom} onChange={e => setUploadNom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie *</label>
                <select className="form-input" value={uploadCat} onChange={e => setUploadCat(e.target.value)} autoFocus>
                  <option value="">Choisir…</option>
                  {Object.entries(catLabels).filter(([k]) => k !== 'cv').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="form-modal-footer">
              <button className="btn" onClick={() => setPending(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={confirmUpload}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {viewer && <DocumentViewer name={viewer.name} data={viewer.data} onClose={() => setViewer(null)} />}
    </div>
  )
}

function PlanningEditor({ session, onClose }: { session: Session; onClose: () => void }) {
  const { formateurs, updateSession, showToast } = useCRM()
  const [rows, setRows] = useState<{ formateurId: number; heures: number; module: string }[]>(
    session.planning ? [...session.planning] : []
  )

  const addRow = () => setRows(r => [...r, { formateurId: formateurs[0]?.id ?? 0, heures: 3.5, module: '' }])
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: string, val: string | number) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const save = () => {
    updateSession(session.id, { planning: rows })
    showToast('Planning mis à jour')
    onClose()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Modifier le planning</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-sm btn-primary" onClick={save}>Enregistrer</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 32px', gap: 8, padding: '8px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <div>Formateur</div><div style={{ textAlign: 'center' }}>Heures</div><div>Module</div><div />
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
            Aucune ligne — ajouter via le bouton ci-dessous
          </div>
        )}

        {rows.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 32px', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <select
              className="form-input"
              style={{ fontSize: 12, padding: '5px 8px' }}
              value={row.formateurId}
              onChange={e => updateRow(i, 'formateurId', Number(e.target.value))}
            >
              {formateurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            <input
              className="form-input"
              type="number"
              step="0.5"
              min="0"
              style={{ fontSize: 12, padding: '5px 8px', textAlign: 'center' }}
              value={row.heures}
              onChange={e => updateRow(i, 'heures', parseFloat(e.target.value) || 0)}
            />
            <input
              className="form-input"
              style={{ fontSize: 12, padding: '5px 8px' }}
              placeholder="Description du module"
              value={row.module}
              onChange={e => updateRow(i, 'module', e.target.value)}
            />
            <button
              className="btn btn-sm btn-danger"
              style={{ padding: '4px 8px', minWidth: 0 }}
              onClick={() => removeRow(i)}
            >✕</button>
          </div>
        ))}
      </div>

      <button className="btn btn-sm" onClick={addRow} style={{ width: '100%', justifyContent: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
        Ajouter un formateur
      </button>
    </div>
  )
}

function BudgetTab({ session }: { session: Session }) {
  const { formateurs, updateSession } = useCRM()
  const [editing, setEditing] = useState(false)

  if (!session.planning || session.planning.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Aucun planning défini pour cette session.
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-sm btn-primary" onClick={() => {
            updateSession(session.id, { planning: [] })
            setEditing(true)
          }}>+ Créer le planning</button>
        </div>
      </div>
    )
  }

  if (editing) {
    return <PlanningEditor session={session} onClose={() => setEditing(false)} />
  }

  const rows = session.planning.map(entry => {
    const formateur = formateurs.find(f => f.id === entry.formateurId)
    const tarif = formateur?.tarifHoraire ?? null
    const total = tarif !== null ? tarif * entry.heures : null
    return { formateur, entry, tarif, total }
  })

  const formation   = rows.filter(r => r.formateur?.type !== 'masterclass')
  const masterclass = rows.filter(r => r.formateur?.type === 'masterclass')

  const subtotal = (group: typeof rows) => ({
    heures: group.reduce((s, r) => s + r.entry.heures, 0),
    budget: group.reduce((s, r) => s + (r.total ?? 0), 0),
  })

  const sfm = subtotal(formation)
  const smc = subtotal(masterclass)
  const allTarifsSet = rows.every(r => r.tarif !== null)

  const COL = '1fr 60px 70px 80px'

  const HeaderRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '9px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
      <div>Formateur</div>
      <div style={{ textAlign: 'center' }}>Heures</div>
      <div style={{ textAlign: 'center' }}>Tarif/h</div>
      <div style={{ textAlign: 'right' }}>Total</div>
    </div>
  )

  const DataRow = ({ formateur, entry, tarif, total }: typeof rows[0]) => {
    const initials = formateur ? formateur.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'
    const isManquant = tarif === null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--text-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'DM Mono', flexShrink: 0, overflow: 'hidden' }}>
            {formateur?.photo ? <img src={formateur.photo} alt={formateur.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formateur?.nom ?? `Formateur #${entry.formateurId}`}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.module}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'DM Mono', fontSize: 13 }}>{entry.heures}h</div>
        <div style={{ textAlign: 'center', fontFamily: 'DM Mono', fontSize: 13, color: isManquant ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
          {isManquant ? <span style={{ fontSize: 11, color: '#D97706' }}>À renseigner</span> : `${tarif} €`}
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'DM Mono', fontSize: 13, fontWeight: total !== null ? 600 : 400, color: total !== null ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {total !== null ? `${total.toLocaleString('fr-FR')} €` : '—'}
        </div>
      </div>
    )
  }

  const SubtotalRow = ({ label, heures, budget }: { label: string; heures: number; budget: number }) => (
    <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '10px 16px', background: 'var(--surface-2)', alignItems: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ textAlign: 'center', fontFamily: 'DM Mono', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{heures}h</div>
      <div />
      <div style={{ textAlign: 'right', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {budget > 0 ? `${budget.toLocaleString('fr-FR')} €` : '—'}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
          Modifier le planning
        </button>
      </div>
      {!allTarifsSet && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: '#92400E' }}>
          ⚠ Certains formateurs n'ont pas de tarif horaire renseigné — le total est partiel.
        </div>
      )}

      {/* Section Formation */}
      {formation.length > 0 && (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '8px 16px', background: 'var(--ft-bg)', borderBottom: '1px solid var(--ft-border)', fontSize: 11, fontWeight: 700, color: 'var(--ft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Formation
          </div>
          <HeaderRow />
          {formation.map(r => <DataRow key={r.entry.formateurId} {...r} />)}
          <SubtotalRow label="Sous-total formation" heures={sfm.heures} budget={sfm.budget} />
        </div>
      )}

      {/* Section Masterclass */}
      {masterclass.length > 0 && (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Masterclass
          </div>
          <HeaderRow />
          {masterclass.map(r => <DataRow key={r.entry.formateurId} {...r} />)}
          <SubtotalRow label="Sous-total masterclass" heures={smc.heures} budget={smc.budget} />
        </div>
      )}

      {/* Total général */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '13px 16px', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Total général</div>
          <div style={{ textAlign: 'center', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700 }}>{sfm.heures + smc.heures}h</div>
          <div />
          <div style={{ textAlign: 'right', fontFamily: 'DM Mono', fontSize: 15, fontWeight: 700, color: 'var(--ft)' }}>
            {(sfm.budget + smc.budget) > 0 ? `${(sfm.budget + smc.budget).toLocaleString('fr-FR')} €` : '—'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>
        Budget calculé sur {rows.filter(r => r.tarif !== null).length}/{rows.length} formateurs tarifés
      </div>
    </div>
  )
}
