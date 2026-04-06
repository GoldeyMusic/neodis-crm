'use client'
import { useState, useRef } from 'react'
import { useCRM, Document } from '@/lib/store'
import { Participant, Formateur, Session } from '@/lib/data'
import DocumentViewer from '../ui/DocumentViewer'
import DropZone from '../ui/DropZone'
// ── Extraction numéro de facture depuis le nom de fichier ────────────────────
function extractInvoiceNum(filename: string): string | null {
  const m = filename.match(/F-\d{4}-\d{3}/i)
  return m ? m[0].toUpperCase() : null
}

// ── Modal de matching factures ───────────────────────────────────────────────
interface FactureItem {
  file:       File
  data:       string
  size:       string
  invoiceNum: string | null
  matched:    Participant | null
  assignedId: number | null   // sélection manuelle
}

function FactureMatchModal({ items, participants, onConfirm, onClose }: {
  items:        FactureItem[]
  participants: Participant[]
  onConfirm:    (resolved: { item: FactureItem; participantId: number | null }[]) => void
  onClose:      () => void
}) {
  const [rows, setRows] = useState<FactureItem[]>(items)
  const [assignments, setAssignments] = useState<Record<number, number | null>>(
    Object.fromEntries(items.map((it, i) => [i, it.matched?.id ?? null]))
  )

  const removeRow = (idx: number) => {
    setRows(r => r.filter((_, i) => i !== idx))
    setAssignments(a => {
      const next: Record<number, number | null> = {}
      Object.entries(a).forEach(([k, v]) => { const ki = parseInt(k); if (ki < idx) next[ki] = v; else if (ki > idx) next[ki - 1] = v })
      return next
    })
  }

  const unlinkedParticipants = participants.filter(p => !p.factures || p.factures === '—')

  return (
    <div className="form-modal-backdrop" style={{ opacity: 1, pointerEvents: 'auto' }}>
      <div className="form-modal" style={{ maxWidth: 620, width: '100%' }}>
        <div className="form-modal-header">
          <div className="form-modal-title">🧾 Lier les factures aux participants</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {rows.length} facture{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}.
            Les correspondances automatiques sont pré-remplies.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((it, i) => {
              const autoMatched = !!it.matched
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, border: `1px solid ${autoMatched ? '#BBF7D0' : 'var(--border)'}`, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.file.name}
                    </div>
                    <div style={{ fontSize: 11, color: it.invoiceNum ? 'var(--ft)' : 'var(--warn)', fontFamily: 'DM Mono' }}>
                      {it.invoiceNum ?? 'N° non détecté'}
                    </div>
                  </div>
                  <div>
                    {autoMatched
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%' }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: '#F0FFF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>✓ Auto</span>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{it.matched!.nom}</span>
                        </div>
                      : <select
                          className="form-input"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          value={assignments[i] ?? ''}
                          onChange={e => setAssignments(a => ({ ...a, [i]: e.target.value ? parseInt(e.target.value) : null }))}
                        >
                          <option value="">— Sélectionner un participant</option>
                          {unlinkedParticipants.map(p => (
                            <option key={p.id} value={p.id}>{p.nom} · {p.session.replace('Promo UMANI ', '')}</option>
                          ))}
                        </select>
                    }
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    title="Retirer cette facture"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                  >✕</button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="form-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={rows.length === 0} onClick={() => onConfirm(rows.map((it, i) => ({ item: it, participantId: assignments[i] ?? null })))}>
            Confirmer et uploader{rows.length > 0 ? ` (${rows.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de matching factures formateurs ────────────────────────────────────
interface FactureFormateurItem {
  file:        File
  data:        string
  size:        string
  suggested:   Formateur | null   // suggestion auto par nom dans le fichier
  formateurId: number | null      // sélection finale
  sessionIds:  number[]           // une ou plusieurs sessions associées
}

function guessFormateur(filename: string, formateurs: Formateur[]): Formateur | null {
  const lower = filename.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const f of formateurs) {
    const parts = f.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ')
    // Match si nom OU prénom (≥4 chars) apparaît dans le nom du fichier
    if (parts.some(p => p.length >= 4 && lower.includes(p))) return f
  }
  return null
}

function FactureFormateurMatchModal({ items, formateurs, sessions, onConfirm, onClose }: {
  items:      FactureFormateurItem[]
  formateurs: Formateur[]
  sessions:   Session[]
  onConfirm:  (resolved: FactureFormateurItem[]) => void
  onClose:    () => void
}) {
  const [rows, setRows] = useState<FactureFormateurItem[]>(items)

  const update = (i: number, patch: Partial<FactureFormateurItem>) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))

  const removeRow = (idx: number) =>
    setRows(r => r.filter((_, i) => i !== idx))

  const toggleSession = (rowIdx: number, sessionId: number) => {
    setRows(r => r.map((row, idx) => {
      if (idx !== rowIdx) return row
      const ids = row.sessionIds.includes(sessionId)
        ? row.sessionIds.filter(id => id !== sessionId)
        : [...row.sessionIds, sessionId]
      return { ...row, sessionIds: ids }
    }))
  }

  return (
    <div className="form-modal-backdrop" style={{ opacity: 1, pointerEvents: 'auto' }}>
      <div className="form-modal" style={{ maxWidth: 660, width: '100%' }}>
        <div className="form-modal-header">
          <div className="form-modal-title">🧾 Lier les factures aux formateurs</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {rows.length} facture{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}.
            Les suggestions automatiques sont pré-remplies — à vérifier avant de confirmer.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((row, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8,
                border: `1px solid ${row.suggested ? '#DDD6FE' : 'var(--border)'}`,
                position: 'relative',
              }}>
                {/* Bouton supprimer la ligne */}
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  title="Retirer cette facture"
                  style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 15, padding: 0, lineHeight: 1 }}
                >✕</button>
                {/* Ligne 1 : fichier + formateur */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, paddingRight: 20 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.file.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{row.size}</div>
                    {row.suggested && (
                      <div style={{ marginTop: 4, fontSize: 11, padding: '2px 7px', borderRadius: 8, background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE', display: 'inline-block' }}>
                        ✦ suggestion auto
                      </div>
                    )}
                  </div>
                  <select
                    className="form-input"
                    style={{ fontSize: 12, padding: '4px 8px', alignSelf: 'center' }}
                    value={row.formateurId ?? ''}
                    onChange={e => update(i, { formateurId: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">— Formateur</option>
                    {formateurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
                {/* Ligne 2 : sessions (multi-select chips) */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Sessions concernées <span style={{ fontWeight: 400, textTransform: 'none' }}>(une ou plusieurs)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sessions.map(s => {
                      const active = row.sessionIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSession(i, s.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 20, border: '1px solid',
                            fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            transition: 'all .12s',
                            background: active ? 'var(--text-primary)' : 'var(--surface)',
                            color: active ? 'white' : 'var(--text-secondary)',
                            borderColor: active ? 'var(--text-primary)' : 'var(--border)',
                          }}
                        >
                          {active && '✓ '}{s.name.replace('Promo UMANI ', '')}
                        </button>
                      )
                    })}
                  </div>
                  {row.sessionIds.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' }}>Aucune session sélectionnée</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="form-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={rows.length === 0} onClick={() => onConfirm(rows)}>
            Confirmer et uploader{rows.length > 0 ? ` (${rows.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal avis de paiement ────────────────────────────────────────────────────
interface AvisItem {
  file: File
  data: string
  size: string
  nom:  string
}

function AvisPaiementModal({ items, onConfirm, onClose }: {
  items:     AvisItem[]
  onConfirm: (rows: AvisItem[]) => void
  onClose:   () => void
}) {
  const [rows, setRows] = useState<AvisItem[]>(items)

  const update    = (i: number, nom: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, nom } : row))
  const removeRow = (i: number) =>
    setRows(r => r.filter((_, idx) => idx !== i))

  return (
    <div className="form-modal-backdrop" style={{ opacity: 1, pointerEvents: 'auto' }}>
      <div className="form-modal" style={{ maxWidth: 600, width: '100%' }}>
        <div className="form-modal-header">
          <div className="form-modal-title">💳 Avis de paiement</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {rows.length} avis détecté{rows.length > 1 ? 's' : ''}. Renommez chaque fichier si besoin, puis confirmez.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 8, alignItems: 'center',
                padding: '10px 12px', background: 'var(--surface-2)',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    {row.file.name} · {row.size}
                  </div>
                  <input
                    className="form-input"
                    value={row.nom}
                    onChange={e => update(i, e.target.value)}
                    placeholder="Nom du fichier…"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </div>
                <button type="button" onClick={() => removeRow(i)}
                  title="Retirer"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div className="form-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            disabled={rows.length === 0}
            onClick={() => onConfirm(rows)}
          >
            Confirmer et uploader ({rows.length})
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal frais administratifs ───────────────────────────────────────────────
interface FraisAdminItem {
  file:       File
  data:       string
  size:       string
  nom:        string
  montant:    string   // chaîne pendant la saisie, convertie en number à la confirmation
  sessionIds: number[] // sessions rattachées
}

function FraisAdminModal({ items, sessions, onConfirm, onClose }: {
  items:     FraisAdminItem[]
  sessions:  Session[]
  onConfirm: (rows: FraisAdminItem[]) => void
  onClose:   () => void
}) {
  const [rows, setRows] = useState<FraisAdminItem[]>(items)

  const update    = (i: number, patch: Partial<FraisAdminItem>) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  const removeRow = (i: number) =>
    setRows(r => r.filter((_, idx) => idx !== i))

  const toggleSession = (rowIdx: number, sessionId: number) => {
    setRows(r => r.map((row, idx) => {
      if (idx !== rowIdx) return row
      const ids = row.sessionIds.includes(sessionId)
        ? row.sessionIds.filter(id => id !== sessionId)
        : [...row.sessionIds, sessionId]
      return { ...row, sessionIds: ids }
    }))
  }

  return (
    <div className="form-modal-backdrop" style={{ opacity: 1, pointerEvents: 'auto' }}>
      <div className="form-modal" style={{ maxWidth: 620, width: '100%' }}>
        <div className="form-modal-header">
          <div className="form-modal-title">🗂️ Frais administratifs</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {rows.length} document{rows.length > 1 ? 's' : ''} — renseignez le montant HT et rattachez chaque facture à une ou plusieurs sessions.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((row, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: 'var(--surface-2)',
                borderRadius: 8, border: '1px solid var(--border)',
                position: 'relative',
              }}>
                {/* Bouton supprimer */}
                <button type="button" onClick={() => removeRow(i)} title="Retirer"
                  style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 15, padding: 0, lineHeight: 1 }}>✕</button>

                {/* Ligne 1 : nom + montant */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10, paddingRight: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{row.file.name} · {row.size}</div>
                    <input
                      className="form-input"
                      value={row.nom}
                      onChange={e => update(i, { nom: e.target.value })}
                      placeholder="Nom du document…"
                      style={{ fontSize: 12, padding: '5px 8px' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Montant HT (€)</div>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.montant}
                      onChange={e => update(i, { montant: e.target.value })}
                      placeholder="0.00"
                      style={{ fontSize: 12, padding: '5px 8px' }}
                    />
                  </div>
                </div>

                {/* Ligne 2 : sessions (chips) */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Sessions concernées <span style={{ fontWeight: 400, textTransform: 'none' }}>(une ou plusieurs)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sessions.map(s => {
                      const active = row.sessionIds.includes(s.id)
                      return (
                        <button key={s.id} type="button" onClick={() => toggleSession(i, s.id)} style={{
                          padding: '4px 10px', borderRadius: 20, border: '1px solid',
                          fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          transition: 'all .12s',
                          background: active ? 'var(--text-primary)' : 'var(--surface)',
                          color: active ? 'white' : 'var(--text-secondary)',
                          borderColor: active ? 'var(--text-primary)' : 'var(--border)',
                        }}>
                          {active && '✓ '}{s.name.replace('Promo UMANI ', '')}
                        </button>
                      )
                    })}
                  </div>
                  {row.sessionIds.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' }}>Aucune session sélectionnée</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="form-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            disabled={rows.length === 0}
            onClick={() => onConfirm(rows)}
          >
            Confirmer et uploader ({rows.length})
          </button>
        </div>
      </div>
    </div>
  )
}

const catLabels: Record<string, string> = {
  factures_financeurs: 'Factures financeurs',
  factures_formateurs: 'Factures formateurs',
  avis_paiement: 'Avis de paiement',
  frais_admin: 'Frais administratifs',
  presence: 'Feuilles de présence',
  bilans: 'Bilans',
  cv: 'CV Formateurs',
  pedago: 'Ressources pédago',
}

const catColors: Record<string, { bg: string; color: string; border: string }> = {
  factures_financeurs: { bg: 'var(--ft-bg)', color: 'var(--ft)', border: 'var(--ft-border)' },
  factures_formateurs: { bg: 'var(--opco-bg)', color: 'var(--opco)', border: '#DDD6FE' },
  avis_paiement:       { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  frais_admin:         { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
  presence:            { bg: '#F0FFF4', color: '#16A34A', border: '#BBF7D0' },
  bilans:              { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  cv:                  { bg: 'var(--ft-bg)', color: 'var(--ft)', border: 'var(--ft-border)' },
  pedago:              { bg: 'var(--surface-2)', color: 'var(--text-tertiary)', border: 'var(--border)' },
}

const catIcon: Record<string, string> = {
  factures_financeurs: '🧾', factures_formateurs: '🧾',
  avis_paiement: '💳', frais_admin: '🗂️',
  presence: '📋', bilans: '📊', cv: '📄', pedago: '📄',
}

export default function Documents() {
  const { formateurs, participants, sessions, documents, addDocument, deleteDocument, updateDocument, updateFormateur, updateParticipant, showToast, filesLoaded } = useCRM()
  const updateFormateurCV = (id: number) => updateFormateur(id, { cv: undefined })
  const [cat, setCat] = useState('all')
  const [viewer, setViewer] = useState<{ name: string; data: string } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<Document | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<{ name: string; size: string; data: string } | null>(null)
  const [uploadCat, setUploadCat] = useState('')
  const [uploadNom, setUploadNom] = useState('')
  const [uploadSession, setUploadSession] = useState('')
  const [factureItems, setFactureItems] = useState<FactureItem[] | null>(null)
  const [formateurFactureItems, setFormateurFactureItems] = useState<FactureFormateurItem[] | null>(null)
  const [avisItems, setAvisItems] = useState<AvisItem[] | null>(null)
  const [fraisAdminItems, setFraisAdminItems] = useState<FraisAdminItem[] | null>(null)

  // CV Formateurs depuis les fiches
  const cvDocs: Document[] = formateurs
    .filter(f => f.cv)
    .map(f => ({
      id: -f.id,
      nom: f.cv!.name,
      cat: f.cv!.cat || 'cv',
      formateur: f.nom,
      taille: f.cv!.size,
      date: '—',
      data: f.cv!.data,
    }))

  const allDocs = [...cvDocs, ...documents]
  const filtered = cat === 'all' ? allDocs : allDocs.filter(d => d.cat === cat)
  const countFor = (c: string) => c === 'all' ? allDocs.length : allDocs.filter(d => d.cat === c).length

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { showToast('Fichier trop lourd (max 10 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const size = file.size < 1024 * 1024
        ? Math.round(file.size / 1024) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      setPendingFile({ name: file.name, size, data: ev.target?.result as string })
      setUploadNom(file.name)
      setUploadOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const confirmUpload = () => {
    if (!pendingFile || !uploadCat) { showToast('Sélectionne une catégorie'); return }
    const now = new Date()
    const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    addDocument({
      nom: uploadNom || pendingFile.name,
      cat: uploadCat,
      session: uploadSession || undefined,
      taille: pendingFile.size,
      date,
      data: pendingFile.data,
    })
    showToast(`"${uploadNom || pendingFile.name}" uploadé`)
    setPendingFile(null); setUploadCat(''); setUploadNom(''); setUploadSession(''); setUploadOpen(false)
  }

  const downloadDoc = (data: string, name: string) => {
    const a = document.createElement('a'); a.href = data; a.download = name; a.click()
  }

  // ── Multi-upload avis de paiement ───────────────────────────────────────────
  const handleAvisFiles = (files: File[]) => {
    const initial: AvisItem[] = files.map(file => {
      const size = file.size < 1024 * 1024
        ? Math.round(file.size / 1024) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      return { file, data: '', size, nom: file.name }
    })
    setAvisItems(initial)

    // Lire les fichiers en base64 en arrière-plan
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = ev => {
        const data = ev.target?.result as string
        setAvisItems(prev => prev
          ? prev.map((item, idx) => idx === i ? { ...item, data } : item)
          : prev
        )
      }
      reader.readAsDataURL(file)
    })
  }

  const confirmAvisUpload = (rows: AvisItem[]) => {
    const now = new Date()
    const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    rows.forEach(row => {
      addDocument({ nom: row.nom || row.file.name, cat: 'avis_paiement', taille: row.size, date, data: row.data })
    })
    showToast(`${rows.length} avis de paiement uploadé${rows.length > 1 ? 's' : ''}`)
    setAvisItems(null)
  }

  // ── Multi-upload frais administratifs ───────────────────────────────────
  const handleFraisAdminFiles = (files: File[]) => {
    const initial: FraisAdminItem[] = files.map(file => {
      const size = file.size < 1024 * 1024
        ? Math.round(file.size / 1024) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      return { file, data: '', size, nom: file.name, montant: '', sessionIds: [] }
    })
    setFraisAdminItems(initial)
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = ev => {
        const data = ev.target?.result as string
        setFraisAdminItems(prev => prev
          ? prev.map((item, idx) => idx === i ? { ...item, data } : item)
          : prev
        )
      }
      reader.readAsDataURL(file)
    })
  }

  const confirmFraisAdminUpload = (rows: FraisAdminItem[]) => {
    const now = new Date()
    const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    rows.forEach(row => {
      const montant = row.montant ? parseFloat(row.montant) : undefined
      const sessionNames = row.sessionIds
        .map(id => sessions.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(' | ')
      addDocument({ nom: row.nom || row.file.name, cat: 'frais_admin', taille: row.size, date, data: row.data, montant, session: sessionNames || undefined })
    })
    showToast(`${rows.length} document${rows.length > 1 ? 's' : ''} uploadé${rows.length > 1 ? 's' : ''}`)
    setFraisAdminItems(null)
  }

  // ── Multi-upload générique (catégorie connue — bilans, présence, pedago…) ──
  const handleGenericFiles = (files: File[], category: string) => {
    const now = new Date()
    const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    let added = 0
    let pending = files.length
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { showToast(`"${file.name}" trop lourd (max 10 MB)`); if (--pending === 0 && added > 0) showToast(`${added} document${added > 1 ? 's' : ''} uploadé${added > 1 ? 's' : ''}`); return }
      const reader = new FileReader()
      reader.onload = ev => {
        const size = file.size < 1024 * 1024
          ? Math.round(file.size / 1024) + ' KB'
          : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        addDocument({ nom: file.name, cat: category, taille: size, date, data: ev.target?.result as string })
        added++
        if (--pending === 0) showToast(`${added} document${added > 1 ? 's' : ''} uploadé${added > 1 ? 's' : ''}`)
      }
      reader.readAsDataURL(file)
    })
  }

  // ── Multi-upload factures financeurs ──────────────────────────────────────
  const handleFactureFiles = (files: File[]) => {
    let pending = files.length
    const items: FactureItem[] = []
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const data = ev.target?.result as string
        const size = file.size < 1024 * 1024
          ? Math.round(file.size / 1024) + ' KB'
          : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        const invoiceNum = extractInvoiceNum(file.name)
        const matched = invoiceNum
          ? (participants.find(p => p.factures === invoiceNum) ?? null)
          : null
        items.push({ file, data, size, invoiceNum, matched, assignedId: matched?.id ?? null })
        if (--pending === 0) setFactureItems([...items])
      }
      reader.readAsDataURL(file)
    })
  }

  // ── Multi-upload factures formateurs ─────────────────────────────────────
  const handleFormateurFiles = (files: File[]) => {
    let pending = files.length
    const items: FactureFormateurItem[] = []
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const data = ev.target?.result as string
        const size = file.size < 1024 * 1024
          ? Math.round(file.size / 1024) + ' KB'
          : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        const suggested = guessFormateur(file.name, formateurs)
        items.push({ file, data, size, suggested, formateurId: suggested?.id ?? null, sessionIds: [] })
        if (--pending === 0) setFormateurFactureItems([...items])
      }
      reader.readAsDataURL(file)
    })
  }

  const confirmFormateurUpload = (resolved: FactureFormateurItem[]) => {
    const now = new Date()
    const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    let linked = 0
    resolved.forEach(row => {
      const formateur    = formateurs.find(f => f.id === row.formateurId)
      const sessionNames = row.sessionIds
        .map(id => sessions.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(' | ')
      addDocument({
        nom:       row.file.name,
        cat:       'factures_formateurs',
        taille:    row.size,
        date,
        data:      row.data,
        formateur: formateur?.nom,
        session:   sessionNames || undefined,
      })
      if (formateur) linked++
    })
    showToast(`${resolved.length} facture${resolved.length > 1 ? 's' : ''} uploadée${resolved.length > 1 ? 's' : ''} · ${linked} formateur${linked > 1 ? 's' : ''} lié${linked > 1 ? 's' : ''}`)
    setFormateurFactureItems(null)
  }

  const confirmFactureUpload = (resolved: { item: FactureItem; participantId: number | null }[]) => {
    const now = new Date()
    const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    let linked = 0
    resolved.forEach(({ item, participantId }) => {
      addDocument({ nom: item.file.name, cat: 'factures_financeurs', taille: item.size, date, data: item.data })
      if (participantId && item.invoiceNum) {
        updateParticipant(participantId, { factures: item.invoiceNum })
        linked++
      }
    })
    showToast(`${resolved.length} facture${resolved.length > 1 ? 's' : ''} uploadée${resolved.length > 1 ? 's' : ''} · ${linked} participant${linked > 1 ? 's' : ''} mis à jour`)
    setFactureItems(null)
  }

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-subtitle">{allDocs.length} document{allDocs.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 11V3M4 7l4-4 4 4"/><path d="M3 13h10"/></svg>
          Uploader
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'factures_financeurs', 'factures_formateurs', 'avis_paiement', 'frais_admin', 'presence', 'bilans', 'cv', 'pedago'].map(c => {
          const count = countFor(c)
          const active = cat === c
          return (
            <button key={c} className="btn btn-sm"
              style={active ? { background: 'var(--text-primary)', color: 'white', borderColor: 'var(--text-primary)' } : {}}
              onClick={() => setCat(c)}>
              {c === 'all' ? 'Tous' : catLabels[c]}
              {count > 0 && <span style={{ marginLeft: 5, background: active ? 'rgba(255,255,255,.2)' : 'var(--surface-2)', padding: '0 5px', borderRadius: 10, fontSize: 10, fontFamily: 'DM Mono' }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Drop zone */}
      {cat === 'factures_financeurs' ? (
        <DropZone
          onFiles={handleFactureFiles}
          multiple
          label="Glisser-déposer les factures financeurs ici"
          sublabel="Plusieurs fichiers acceptés · nom ex. 2511-F-2025-006-NEODIS.pdf · max 10 MB chacun"
          accept="application/pdf,image/*"
          maxMB={10}
        />
      ) : cat === 'factures_formateurs' ? (
        <DropZone
          onFiles={handleFormateurFiles}
          multiple
          label="Glisser-déposer les factures formateurs ici"
          sublabel="Plusieurs fichiers acceptés · le formateur sera pré-rempli si son nom est dans le fichier · max 10 MB chacun"
          accept="application/pdf,image/*"
          maxMB={10}
        />
      ) : cat === 'avis_paiement' ? (
        // Avis de paiement → extraction automatique des références PDF
        <DropZone
          onFiles={handleAvisFiles}
          multiple
          label="Glisser-déposer les avis de paiement ici"
          sublabel="Plusieurs PDFs acceptés · les références CONVENTION / VREF sont lues automatiquement · max 10 MB chacun"
          accept="application/pdf"
          maxMB={10}
        />
      ) : cat === 'frais_admin' ? (
        <DropZone
          onFiles={handleFraisAdminFiles}
          multiple
          label="Glisser-déposer les factures de frais administratifs ici"
          sublabel="Plusieurs fichiers acceptés · vous pourrez saisir le montant HT de chaque facture · max 10 MB chacun"
          accept="application/pdf,image/*"
          maxMB={10}
        />
      ) : cat !== 'all' ? (
        // Catégorie connue → multi-upload direct, pas de modal
        <DropZone
          onFiles={files => handleGenericFiles(files, cat)}
          multiple
          label={`Glisser-déposer ${cat === 'bilans' ? 'les bilans' : cat === 'presence' ? 'les feuilles de présence' : cat === 'cv' ? 'les CV' : 'les documents'} ici`}
          sublabel="Plusieurs fichiers acceptés · PDF, Word, images · max 10 MB chacun"
          accept="*/*"
          maxMB={10}
        />
      ) : (
        // Filtre "Tous" → fichier unique + modal pour choisir la catégorie
        <DropZone
          onFile={file => {
            if (file.size > 10 * 1024 * 1024) { showToast('Fichier trop lourd (max 10 MB)'); return }
            const reader = new FileReader()
            reader.onload = ev => {
              const size = file.size < 1024 * 1024
                ? Math.round(file.size / 1024) + ' KB'
                : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
              setPendingFile({ name: file.name, size, data: ev.target?.result as string })
              setUploadNom(file.name)
              setUploadOpen(true)
            }
            reader.readAsDataURL(file)
          }}
          label="Glisser-déposer un document ici"
          sublabel="Un fichier à la fois depuis cette vue · sélectionne une catégorie pour l'upload multiple"
          accept="*/*"
        />
      )}

      {/* Liste */}
      <div key={cat} className="card" style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            <div style={{ marginBottom: 8, fontSize: 28 }}>📁</div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Aucun document</div>
            <div style={{ fontSize: 12 }}>{cat === 'cv' ? 'Ajoutez des CV depuis les fiches formateurs' : cat === 'all' ? 'Cliquez sur "Uploader" pour ajouter un document' : `Aucun document dans la catégorie "${catLabels[cat] ?? cat}"`}</div>
          </div>
        ) : filtered.map(d => {
          const colors = catColors[d.cat] || catColors.pedago
          const isCvFromFormateur = d.id < 0
          return (
            <div key={d.id} className="doc-item">
              <div style={{ width: 36, height: 36, borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
                {catIcon[d.cat] || '📄'}
              </div>
              <div className="doc-info">
                <div className="doc-name">{d.nom}</div>
                <div className="doc-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{d.taille}</span>
                  {d.date !== '—' && <span>· {d.date}</span>}
                  {d.formateur && <span>· {d.formateur}</span>}
                  {d.session && <span>· {d.session}</span>}
                  <span className="tag" style={{ fontSize: 10, padding: '1px 6px', background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>{catLabels[d.cat]}</span>
                </div>
              </div>
              <div className="doc-actions">
                <button
                  className="btn btn-sm"
                  disabled={!filesLoaded && !d.data}
                  title={!filesLoaded && !d.data ? 'Chargement…' : undefined}
                  onClick={() => d.data ? setViewer({ name: d.nom, data: d.data }) : showToast('Fichier en cours de chargement…')}
                >
                  {!filesLoaded && !d.data
                    ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} />
                    : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/></svg>
                  }
                  {!filesLoaded && !d.data ? 'Chargement' : 'Voir'}
                </button>
                <button
                  className="btn btn-sm"
                  disabled={!filesLoaded && !d.data}
                  onClick={() => d.data ? downloadDoc(d.data, d.nom) : showToast('Fichier en cours de chargement…')}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v8M5 8l3 3 3-3M3 13h10"/></svg>
                  ↓
                </button>
                <button className="btn btn-sm" onClick={() => setEditDoc(d)}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                    Modifier
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => {
                    if (confirm(`Supprimer "${d.nom}" ?`)) {
                      if (isCvFromFormateur) {
                        const f = formateurs.find(f => f.cv?.name === d.nom)
                        if (f) updateFormateurCV(f.id)
                      } else {
                        deleteDocument(d.id)
                      }
                    }
                  }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal avis de paiement */}
      {avisItems && (
        <AvisPaiementModal
          items={avisItems}
          onConfirm={confirmAvisUpload}
          onClose={() => setAvisItems(null)}
        />
      )}

      {/* Modal frais administratifs */}
      {fraisAdminItems && (
        <FraisAdminModal
          items={fraisAdminItems}
          sessions={sessions}
          onConfirm={confirmFraisAdminUpload}
          onClose={() => setFraisAdminItems(null)}
        />
      )}

      {/* Modal upload */}
      {uploadOpen && pendingFile && (
        <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && setUploadOpen(false)}>
          <div className="form-modal" style={{ maxWidth: 440 }}>
            <div className="form-modal-header">
              <div className="form-modal-title">Classer le document</div>
              <button className="modal-close" onClick={() => setUploadOpen(false)}>✕</button>
            </div>
            <div className="form-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div><div style={{ fontSize: 13, fontWeight: 500 }}>{pendingFile.name}</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{pendingFile.size}</div></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom du document</label>
                  <input className="form-input" value={uploadNom} onChange={e => setUploadNom(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Catégorie *</label>
                  <select className="form-input" value={uploadCat} onChange={e => setUploadCat(e.target.value)} autoFocus>
                    <option value="">Choisir…</option>
                    {Object.entries(catLabels).filter(([k]) => k !== 'cv').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Session(s) associée(s) <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)', fontSize: 11 }}>— optionnel, sélection multiple</span></label>
                  <SessionPicker value={uploadSession} onChange={setUploadSession} />
                </div>
              </div>
            </div>
            <div className="form-modal-footer">
              <button className="btn" onClick={() => setUploadOpen(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={confirmUpload}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifier */}
      {editDoc && (
        <EditDocModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={(updates) => {
            if (editDoc.id < 0) {
              // CV formateur — update name and cat on the cv object
              const fmt = formateurs.find(f => f.cv?.name === editDoc.nom || -f.id === editDoc.id)
              if (fmt && fmt.cv) {
                updateFormateur(fmt.id, { cv: { ...fmt.cv, name: updates.nom || fmt.cv.name, cat: updates.cat || fmt.cv.cat } })
              }
            } else {
              updateDocument(editDoc.id, updates)
            }
            showToast('Document mis à jour')
            setEditDoc(null)
          }}
        />
      )}

      {/* Modal matching factures financeurs */}
      {factureItems && (
        <FactureMatchModal
          items={factureItems}
          participants={participants}
          onConfirm={confirmFactureUpload}
          onClose={() => setFactureItems(null)}
        />
      )}

      {/* Modal matching factures formateurs */}
      {formateurFactureItems && (
        <FactureFormateurMatchModal
          items={formateurFactureItems}
          formateurs={formateurs}
          sessions={sessions}
          onConfirm={confirmFormateurUpload}
          onClose={() => setFormateurFactureItems(null)}
        />
      )}

      {viewer && <DocumentViewer name={viewer.name} data={viewer.data} onClose={() => setViewer(null)} />}
    </div>
  )
}

// ── MODALE MODIFICATION ──
function EditDocModal({ doc, onClose, onSave }: { doc: Document; onClose: () => void; onSave: (u: Partial<Document>) => void }) {
  const { sessions } = useCRM()
  const [nom, setNom] = useState(doc.nom)
  const [cat, setCat] = useState(doc.cat)
  const [session, setSession] = useState(doc.session || '')

  return (
    <div className="form-modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal" style={{ maxWidth: 440 }}>
        <div className="form-modal-header">
          <div className="form-modal-title">Modifier le document</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom du document</label>
              <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} autoFocus />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-input" value={cat} onChange={e => setCat(e.target.value)}>
                {Object.entries({ factures_financeurs: 'Factures financeurs', factures_formateurs: 'Factures formateurs', presence: 'Feuilles de présence', bilans: 'Bilans', cv: 'CV Formateurs', pedago: 'Ressources pédago' }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Session(s) associée(s)</label>
              <SessionPicker value={session} onChange={setSession} />
            </div>
          </div>
        </div>
        <div className="form-modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave({ nom, cat, session: session || undefined })}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ── SESSION PICKER ──
function SessionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { sessions } = useCRM()
  const selected = value ? value.split(' | ').filter(Boolean) : []

  const toggle = (name: string) => {
    const next = selected.includes(name)
      ? selected.filter(s => s !== name)
      : [...selected, name]
    onChange(next.join(' | '))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {sessions.map(s => {
          const active = selected.includes(s.name)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.name)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: '1px solid',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all .12s',
                background: active ? 'var(--text-primary)' : 'var(--surface)',
                color: active ? 'white' : 'var(--text-secondary)',
                borderColor: active ? 'var(--text-primary)' : 'var(--border)',
              }}
            >
              {active && <span style={{ marginRight: 4 }}>✓</span>}
              {s.name}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          {selected.length} session{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
