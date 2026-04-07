'use client'
import { useState, useRef } from 'react'
import { useCRM } from '@/lib/store'
import { Formateur } from '@/lib/data'
import NewFormateurModal from '../modals/NewFormateurModal'
import EditFormateurModal from '../modals/EditFormateurModal'
import DocumentViewer from '../ui/DocumentViewer'
import DropZone from '../ui/DropZone'

const FILTERS_TYPE   = [
  { id: 'all',        label: 'Tous' },
  { id: 'principal',  label: 'Formateurs' },
  { id: 'masterclass',label: 'Masterclass' },
] as const

const FILTERS_STATUT = [
  { id: 'all',      label: 'Tous statuts' },
  { id: 'verified', label: 'Vérifiés' },
  { id: 'contact',  label: 'À contacter' },
] as const

type FilterType   = typeof FILTERS_TYPE[number]['id']
type FilterStatut = typeof FILTERS_STATUT[number]['id']

export default function Formateurs() {
  const { formateurs } = useCRM()
  const [newOpen, setNewOpen]           = useState(false)
  const [selected, setSelected]         = useState<Formateur | null>(null)
  const [editing, setEditing]           = useState<Formateur | null>(null)
  const [filterType, setFilterType]     = useState<FilterType>('all')
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('all')

  const principaux  = formateurs.filter(f => f.type === 'principal')
  const masterclass = formateurs.filter(f => f.type === 'masterclass')
  const selectedLatest = selected ? formateurs.find(f => f.id === selected.id) || selected : null

  const filtered = formateurs.filter(f => {
    if (filterType   !== 'all' && f.type   !== filterType)   return false
    if (filterStatut !== 'all' && f.statut !== filterStatut) return false
    return true
  })

  const isFiltering = filterType !== 'all' || filterStatut !== 'all'

  const chipStyle = (active: boolean) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    whiteSpace: 'nowrap' as const, fontFamily: 'Inter, sans-serif',
    border: `1px solid ${active ? 'var(--text-primary)' : 'var(--border)'}`,
    background: active ? 'var(--text-primary)' : 'var(--surface)',
    color: active ? 'white' : 'var(--text-secondary)',
    transition: 'all .15s',
  })

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Formateurs</div>
          <div className="page-subtitle">{formateurs.length} intervenants · {principaux.length} formateurs · {masterclass.length} masterclass</div>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
          Ajouter
        </button>
      </div>

      {/* Barre de filtres */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS_TYPE.map(f => (
          <button key={f.id} style={chipStyle(filterType === f.id)} onClick={() => setFilterType(f.id)}>{f.label}</button>
        ))}
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        {FILTERS_STATUT.map(f => (
          <button key={f.id} style={chipStyle(filterStatut === f.id)} onClick={() => setFilterStatut(f.id)}>{f.label}</button>
        ))}
        {isFiltering && (
          <button onClick={() => { setFilterType('all'); setFilterStatut('all') }}
            style={{ marginLeft: 4, fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Réinitialiser
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Grille filtrée */}
      {isFiltering ? (
        filtered.length > 0
          ? <div className="formateur-grid animate-in">{filtered.map(f => <FormateurCard key={f.id} f={f} onClick={() => setSelected(f)} />)}</div>
          : <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>Aucun formateur pour ces filtres</div>
      ) : (
        <>
          {principaux.length > 0 && (
            <>
              <div className="section-label" style={{ marginBottom: 12 }}>Formateurs principaux</div>
              <div className="formateur-grid animate-in" style={{ marginBottom: 28 }}>
                {principaux.map(f => <FormateurCard key={f.id} f={f} onClick={() => setSelected(f)} />)}
              </div>
            </>
          )}
          {masterclass.length > 0 && (
            <>
              <div className="section-label" style={{ marginBottom: 12 }}>Masterclass</div>
              <div className="formateur-grid animate-in">
                {masterclass.map(f => <FormateurCard key={f.id} f={f} onClick={() => setSelected(f)} />)}
              </div>
            </>
          )}
        </>
      )}

      {formateurs.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Aucun formateur — ajouter via le bouton ci-dessus
        </div>
      )}

      {newOpen && <NewFormateurModal onClose={() => setNewOpen(false)} />}
      {editing && <EditFormateurModal formateur={editing} onClose={() => { setEditing(null); setSelected(null) }} />}
      {selectedLatest && !editing && (
        <FormateurPanel
          formateur={selectedLatest}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selectedLatest)}
        />
      )}
    </div>
  )
}

function FormateurCard({ f, onClick }: { f: Formateur; onClick: () => void }) {
  const initials = f.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="form-card" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div className="f-avatar" style={{ margin: 0, flexShrink: 0, overflow: 'hidden' }}>
          {f.photo ? <img src={f.photo} alt={f.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nom}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            <span className={`tag tag-${f.statut}`} style={{ display: 'inline-flex' }}>{f.statut === 'verified' ? '✓ Vérifié' : 'À contacter'}</span>
            {f.cv && <span className="tag" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: 10 }}>📄 CV</span>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {f.spec.map(s => (
          <span key={s} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{s}</span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.email}</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}>{f.tel}</div>
      {f.tarifHoraire && (
        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 8px', fontFamily: 'DM Mono' }}>
          {f.tarifHoraire} €/h
        </div>
      )}
    </div>
  )
}

function FormateurPanel({ formateur: f, onClose, onEdit }: {
  formateur: Formateur
  onClose: () => void
  onEdit: () => void
}) {
  const { updateFormateur, showToast } = useCRM()
  const photoRef = useRef<HTMLInputElement>(null)
  const cvRef = useRef<HTMLInputElement>(null)
  const [viewer, setViewer] = useState<{ name: string; data: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const initials = f.nom.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/formateur/${f.token}` : ''

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { showToast('Photo trop lourde (max 3 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => { updateFormateur(f.id, { photo: ev.target?.result as string }); showToast('Photo mise à jour') }
    reader.readAsDataURL(file)
  }

  const handleCV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('CV trop lourd (max 5 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const size = file.size < 1024 * 1024
        ? Math.round(file.size / 1024) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      updateFormateur(f.id, { cv: { name: file.name, data: ev.target?.result as string, size } })
      showToast(`CV "${file.name}" ajouté`)
    }
    reader.readAsDataURL(file)
  }

  const downloadCV = () => {
    if (!f.cv) return
    const a = document.createElement('a'); a.href = f.cv.data; a.download = f.cv.name; a.click()
  }

  return (
    <>
      <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-panel">
          <div className="modal-header">
            <div className="modal-toprow" style={{ alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--text-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'DM Mono', overflow: 'hidden', border: '2px solid var(--border)' }}>
                  {f.photo ? <img src={f.photo} alt={f.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                </div>
                <button onClick={() => photoRef.current?.click()} title="Changer la photo" style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                </button>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              </div>

              <div style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                <div className="modal-title">{f.nom}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {f.spec.map(s => (
                    <span key={s} className="tag" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 11 }}>{s}</span>
                  ))}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`tag tag-${f.statut}`}>{f.statut === 'verified' ? '✓ Vérifié' : 'À contacter'}</span>
                  <span className="tag" style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                    {f.type === 'principal' ? 'Formateur principal' : 'Masterclass'}
                  </span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" onClick={onEdit}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                    Modifier
                  </button>
                  {f.photo && (
                    <button className="btn btn-sm btn-danger" onClick={() => { updateFormateur(f.id, { photo: undefined }); showToast('Photo supprimée') }}>
                      Supprimer la photo
                    </button>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
          </div>

          <div className="modal-body">
            {!f.photo && (
              <div style={{ marginBottom: 16 }}>
                <DropZone
                  onFile={file => {
                    if (file.size > 3 * 1024 * 1024) { showToast('Photo trop lourde (max 3 MB)'); return }
                    const reader = new FileReader()
                    reader.onload = ev => { updateFormateur(f.id, { photo: ev.target?.result as string }); showToast('Photo mise à jour') }
                    reader.readAsDataURL(file)
                  }}
                  accept="image/*"
                  maxMB={3}
                  label="Glisser-déposer la photo ici"
                  sublabel="JPG, PNG · max 3 MB"
                  compact
                />
              </div>
            )}

            <div className="section-label" style={{ marginBottom: 10 }}>CV / Document</div>
            <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleCV} />

            {f.cv ? (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ft-bg)', border: '1px solid var(--ft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.cv.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{f.cv.size}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => setViewer({ name: f.cv!.name, data: f.cv!.data })}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/></svg>
                      Voir
                    </button>
                    <button className="btn btn-sm" onClick={downloadCV}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v8M5 8l3 3 3-3M3 13h10"/></svg>
                      ↓
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => { updateFormateur(f.id, { cv: undefined }); showToast('CV supprimé') }}>✕</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <DropZone
                  onFile={file => {
                    if (file.size > 5 * 1024 * 1024) { showToast('CV trop lourd (max 5 MB)'); return }
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const size = file.size < 1024 * 1024
                        ? Math.round(file.size / 1024) + ' KB'
                        : (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                      updateFormateur(f.id, { cv: { name: file.name, data: ev.target?.result as string, size } })
                      showToast(`CV "${file.name}" ajouté`)
                    }
                    reader.readAsDataURL(file)
                  }}
                  accept=".pdf,.doc,.docx"
                  maxMB={5}
                  label="Glisser-déposer le CV ici"
                  sublabel="PDF, DOC, DOCX · max 5 MB"
                />
              </div>
            )}

            <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="info-block">
                <div className="info-label">Email</div>
                <div className="info-value" style={{ fontSize: 13 }}>
                  <a href={`mailto:${f.email}`} style={{ color: 'var(--ft)', textDecoration: 'none' }}>{f.email || '—'}</a>
                </div>
              </div>
              <div className="info-block">
                <div className="info-label">Téléphone</div>
                <div className="info-value" style={{ fontFamily: 'DM Mono', fontSize: 13 }}>{f.tel || '—'}</div>
              </div>
              <div className="info-block" style={{ gridColumn: '1 / -1' }}>
                <div className="info-label">Spécialités</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {f.spec.map(s => (
                    <span key={s} className="tag" style={{ background: 'var(--ft-bg)', color: 'var(--ft)', border: '1px solid var(--ft-border)' }}>{s}</span>
                  ))}
                </div>
              </div>
              <div className="info-block">
                <div className="info-label">Type</div>
                <div className="info-value">{f.type === 'principal' ? 'Formateur principal' : 'Masterclass'}</div>
              </div>
              <div className="info-block">
                <div className="info-label">Tarif horaire</div>
                <div className="info-value" style={{ color: f.tarifHoraire ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {f.tarifHoraire ? `${f.tarifHoraire} €/h` : '—'}
                </div>
              </div>
            </div>

            {/* Lien portail formateur */}
            {f.token && (
              <div style={{ marginTop: 20 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Espace formateur</div>
                <div className="card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>🌐</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Portail personnel</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'DM Mono' }}>
                        /formateur/{f.token?.slice(0, 8)}…
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-sm" onClick={() => {
                        navigator.clipboard.writeText(portalUrl)
                        setLinkCopied(true)
                        showToast('Lien copié !')
                        setTimeout(() => setLinkCopied(false), 2000)
                      }}>
                        {linkCopied ? '✓ Copié' : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 0 1 2 9.5v-7A1.5 1.5 0 0 1 3.5 1h7A1.5 1.5 0 0 1 12 2.5V5"/></svg>
                            Copier le lien
                          </>
                        )}
                      </button>
                      <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary" style={{ textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h7v7M13 3L6 10"/></svg>
                        Ouvrir
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {viewer && <DocumentViewer name={viewer.name} data={viewer.data} onClose={() => setViewer(null)} />}
    </>
  )
}
