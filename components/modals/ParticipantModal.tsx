'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import { Participant, parcoursSteps } from '@/lib/data'
import EditParticipantModal from './EditParticipantModal'
import DropZone from '../ui/DropZone'

interface Props { participant: Participant; onClose: () => void }
const tabs = ['Profil', 'Parcours pédagogique', 'Checklist admin', 'Documents', 'Notes']

export default function ParticipantModal({ participant, onClose }: Props) {
  const { sessions, participants, documents, deleteParticipant, updateParticipant, addDocument, deleteDocument, showToast } = useCRM()
  // Read participant live from store so updates are reflected immediately
  const p = participants.find(x => x.id === participant.id) || participant
  const [activeTab, setActiveTab] = useState(0)
  const [showEdit, setShowEdit] = useState(false)
  // Parcours persisted in participant data
  const parcours: boolean[] = Array.isArray(p.parcours) && p.parcours.length === parcoursSteps.length
    ? p.parcours
    : new Array(parcoursSteps.length).fill(false)
  const [notes, setNotes] = useState('')

  const session = sessions.find(s => s.name === p.session)
  const done = parcours.filter(Boolean).length

  const handleDelete = () => {
    if (confirm(`Supprimer ${p.nom} ?`)) { deleteParticipant(p.id); onClose() }
  }

  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div className="modal-toprow" style={{ alignItems: 'flex-start', gap: 12 }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, flexShrink: 0, marginTop: 2 }}>{p.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.nomArtiste} · {p.session}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-sm" onClick={() => setShowEdit(true)}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                  Modifier
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleDelete}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/></svg>
                  Supprimer
                </button>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-tabs">
            {tabs.map((t, i) => <div key={t} className={`modal-tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>{t}</div>)}
          </div>
        </div>

        <div className="modal-body">
          {/* PROFIL */}
          {activeTab === 0 && (
            <div>
              <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 20 }}>
                <div className="info-block"><div className="info-label">Nom d'artiste</div><div className="info-value">{p.nomArtiste || '—'}</div></div>
                <div className="info-block"><div className="info-label">Email</div><div className="info-value" style={{ fontSize: 13 }}>{p.email}</div></div>
                <div className="info-block"><div className="info-label">Téléphone</div><div className="info-value">{p.tel}</div></div>
                <div className="info-block"><div className="info-label">Session</div><div className="info-value" style={{ fontSize: 13 }}>{p.session}</div></div>
                <div className="info-block"><div className="info-label">Financeur</div><div className="info-value">{p.financeur}</div></div>
                <div className="info-block"><div className="info-label">Factures</div><div className="info-value" style={{ fontSize: 12 }}>{p.factures}</div></div>
              </div>

              <div className="section-label">Présence en ligne</div>
              <div className="card" style={{ marginBottom: 20 }}>
                {[
                  { icon: '📸', label: 'Instagram', val: p.insta },
                  { icon: '▶️', label: 'YouTube', val: p.youtube },
                  { icon: '🎵', label: 'Spotify artiste', val: p.streaming },
                  { icon: '🎵', label: p.titreSingle || 'Single', val: p.spotifyTitre },
                  { icon: '🏠', label: 'Lien UMANI', val: p.lienUMANI },
                ].map(({ icon, label, val }) => val && val !== '—' && (
                  <div key={label} className="session-item" style={{ cursor: 'default', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{label}</div>
                      <a href={val} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--ft)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }} onClick={e => e.stopPropagation()}>{val}</a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-label">Session</div>
              <div className="card">
                <div className="session-item" style={{ cursor: 'default' }}>
                  <div className={`session-dot ${session?.status || 'done'}`} />
                  <div className="session-info">
                    <div className="session-name">{p.session}</div>
                    <div className="session-meta">{session?.dates} · {p.financeur}</div>
                  </div>
                  <span className={`status-pill ${session?.status || 'done'}`}>
                    {{ active: 'En cours', done: 'Terminée', upcoming: 'À venir' }[session?.status || 'done']}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PARCOURS */}
          {activeTab === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cliquer pour basculer le statut</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}>{done} / {parcoursSteps.length}</div>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--green)', borderRadius: 2, width: `${(done/parcoursSteps.length)*100}%`, transition: 'width .3s' }} />
              </div>
              <div className="parcours-grid">
                {parcoursSteps.map((step, i) => (
                  <div key={i} className={`parcours-step${parcours[i] ? ' done' : ''}`} onClick={() => {
                    const next = [...parcours]; next[i] = !next[i]
                    updateParticipant(p.id, { parcours: next })
                  }}>
                    <span className="parcours-step-num">{String(i+1).padStart(2,'0')}</span>
                    <span className="parcours-step-label">{step}</span>
                    {parcours[i] && <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHECKLIST */}
          {activeTab === 2 && (
            <div>
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--ft-bg)', border: '1px solid var(--ft-border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--ft)' }}>
                Financeur : <strong>{p.financeur} (AIF)</strong> — checklist individuelle par élève
              </div>
              {[['Avant la formation', ['Créer la session (KAIROS)', 'Créer le devis AIF sur KAIROS', 'Attester du commencement (J1)']],
                ['En fin de formation', ['Valider et télécharger le bilan', 'Créer la facture Qonto', 'Envoyer sur Chorus Pro : facture, bilan, feuille de présence']]
              ].map(([title, items]) => (
                <div key={title as string} className="checklist-section">
                  <div className="checklist-title">{title as string}</div>
                  {(items as string[]).map(item => <CheckItem key={item} label={item} />)}
                </div>
              ))}
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 3 && (() => {
            const norm = (s: string) => s.toLowerCase().replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ç]/g, 'c')
            // "Ayanah Mouflet" → ["ayanah", "mouflet"]
            const nameParts = p.nom.split(/\s+/).map(w => norm(w)).filter(w => w.length > 2)

            // Fuzzy substring: check if any window of length n in haystack is ≤ maxDist edits from needle
            const fuzzyContains = (haystack: string, needle: string, maxDist: number) => {
              const n = needle.length
              if (n === 0) return false
              for (let start = 0; start <= haystack.length - n + maxDist && start <= haystack.length - 1; start++) {
                const end = Math.min(start + n + maxDist, haystack.length)
                const window = haystack.slice(start, end)
                if (levenshtein(window, needle) <= maxDist) return true
              }
              return false
            }
            const levenshtein = (a: string, b: string): number => {
              const m = a.length, n = b.length
              const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
                const row = new Array(n + 1).fill(0); row[0] = i; return row
              })
              for (let j = 0; j <= n; j++) dp[0][j] = j
              for (let i = 1; i <= m; i++)
                for (let j = 1; j <= n; j++)
                  dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0))
              return dp[m][n]
            }

            const matchesName = (filename: string) => {
              const fnRaw = norm(filename.replace(/\.[^.]+$/, ''))
              const fnFlat = fnRaw.replace(/[_\-.\s]+/g, '')
              const fnSpaced = fnRaw.replace(/[_\-.\s]+/g, ' ')
              const matched = nameParts.filter(part => {
                // Exact substring
                if (fnFlat.includes(part) || fnSpaced.includes(part)) return true
                // Fuzzy match: tolerate 1 edit for 4-5 char names, 2 for 6+ chars
                const maxDist = part.length >= 6 ? 2 : part.length >= 4 ? 1 : 0
                if (maxDist > 0 && fuzzyContains(fnFlat, part, maxDist)) return true
                return false
              })
              return matched.length > 0
            }

            // Direct uploads for this participant
            const directDocs = documents.filter(d => d.participant === p.nom)
            // Linked from CRM documents by filename match (bilans = 1 per participant)
            const linkedDocs = documents.filter(d =>
              d.participant !== p.nom && matchesName(d.nom)
            )
            // Session-level shared docs (presence only — bilans are per-participant)
            const sessionDocs = documents.filter(d =>
              d.participant !== p.nom && !linkedDocs.find(ld => ld.id === d.id) &&
              d.session === p.session && d.cat === 'presence'
            )
            // Deduplicate
            const seenIds = new Set(directDocs.map(d => d.id))
            const allDocs = [...directDocs, ...linkedDocs.filter(d => !seenIds.has(d.id)), ...sessionDocs.filter(d => !seenIds.has(d.id) && !linkedDocs.find(ld => ld.id === d.id))]

            const handleFiles = async (files: File[]) => {
              for (const file of files) {
                const taille = file.size < 1024 * 1024
                  ? `${(file.size / 1024).toFixed(0)} Ko`
                  : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
                await addDocument({
                  nom: file.name,
                  cat: 'Participant',
                  participant: p.nom,
                  session: p.session,
                  taille,
                  date: new Date().toLocaleDateString('fr-FR'),
                  data: URL.createObjectURL(file),
                })
              }
              showToast(`${files.length} fichier${files.length > 1 ? 's' : ''} importé${files.length > 1 ? 's' : ''}`)
            }
            return (
              <div>
                <div className="section-label" style={{ marginBottom: 12 }}>Documents liés</div>
                <DropZone
                  onFiles={handleFiles}
                  multiple
                  label="Glisser-déposer des fichiers ici"
                  sublabel="PDF, images, documents — max 10 Mo"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                {allDocs.length > 0 && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {allDocs.map(doc => {
                      const isLinked = !directDocs.find(d => d.id === doc.id)
                      const catLabel: Record<string, string> = { bilans: 'Bilan', presence: 'Présence', pedago: 'Pédago', factures_financeurs: 'Facture', Participant: 'Upload' }
                      const catColor: Record<string, { bg: string; color: string; border: string }> = {
                        bilans: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
                        presence: { bg: '#F0FFF4', color: '#16A34A', border: '#BBF7D0' },
                        Participant: { bg: 'var(--surface-2)', color: 'var(--text-secondary)', border: 'var(--border)' },
                      }
                      const colors = catColor[doc.cat] || { bg: 'var(--surface-2)', color: 'var(--text-tertiary)', border: 'var(--border)' }
                      return (
                        <div key={doc.id} className="session-item" style={{ cursor: doc.data ? 'pointer' : 'default', gap: 10 }} onClick={() => doc.data && window.open(doc.data, '_blank')}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{doc.cat === 'bilans' ? '📊' : doc.cat === 'presence' ? '📋' : '📄'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</span>
                              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`, flexShrink: 0 }}>{catLabel[doc.cat] || doc.cat}</span>
                              {isLinked && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', flexShrink: 0 }}>Lié</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{doc.taille} · {doc.date}</div>
                          </div>
                          {!isLinked && <button className="tbl-action" style={{ color: 'var(--red)', flexShrink: 0 }} onClick={e => { e.stopPropagation(); if (confirm(`Supprimer ${doc.nom} ?`)) deleteDocument(doc.id) }}>Supprimer</button>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* NOTES */}
          {activeTab === 4 && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-tertiary)' }}>Notes internes — visibles uniquement par l'équipe admin</div>
              <textarea className="form-input" style={{ minHeight: 160, resize: 'vertical' }} placeholder="Ajouter une note…" value={notes} onChange={e => setNotes(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => showToast('Note enregistrée')}>Enregistrer</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showEdit && <EditParticipantModal participant={p} onClose={() => setShowEdit(false)} />}
    </div>
  )
}

function CheckItem({ label }: { label: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className={`checklist-item${done ? ' done' : ''}`} onClick={() => setDone(v => !v)}>
      <div className="check-box">
        {done && <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={{ width: 10, height: 10 }}><path d="M1.5 5l2.5 2.5 4.5-4.5"/></svg>}
      </div>
      <span className="check-text">{label}</span>
    </div>
  )
}
