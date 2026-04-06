'use client'
import { useState, useRef } from 'react'
import { useCRM } from '@/lib/store'
import { loadRecords, upsertAll } from '@/lib/storage'
import { authUsers } from '@/lib/data'

// ── Export / Import (Supabase) ───────────────────────────────────────────────

async function exportBackup(): Promise<void> {
  const [sessions, participants, formateurs, documents] = await Promise.all([
    loadRecords('sessions'),
    loadRecords('participants'),
    loadRecords('formateurs'),
    loadRecords('documents'),
  ])

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    sessions,
    participants,
    formateurs,
    documents,
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `neodis-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function importBackup(file: File): Promise<{ ok: boolean; error?: string }> {
  try {
    const text = await file.text()
    const backup = JSON.parse(text)

    if (!backup.version) {
      return { ok: false, error: 'Fichier invalide — ce n\'est pas une sauvegarde NEODIS.' }
    }

    // Restaurer dans Supabase
    const ops: Promise<void>[] = []
    if (backup.sessions?.length)     ops.push(upsertAll('sessions', backup.sessions))
    if (backup.participants?.length) ops.push(upsertAll('participants', backup.participants))
    if (backup.formateurs?.length)   ops.push(upsertAll('formateurs', backup.formateurs))
    if (backup.documents?.length)    ops.push(upsertAll('documents', backup.documents))

    await Promise.all(ops)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Erreur lors de la lecture du fichier.' }
  }
}

// ── Composant ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user, activityLog, showToast } = useCRM()
  const [tab, setTab] = useState('users')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportBackup()
      showToast('Sauvegarde téléchargée')
    } catch {
      showToast('Erreur lors de l\'export')
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportStatus(null)
    const result = await importBackup(file)
    setImporting(false)
    if (result.ok) {
      setImportStatus({ ok: true, msg: 'Import réussi. Rechargement en cours…' })
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setImportStatus({ ok: false, msg: result.error ?? 'Erreur inconnue' })
    }
  }

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Administration</div>
          <div className="page-subtitle">Paramètres et journal d'activité</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['users', 'Utilisateurs'], ['settings', 'Paramètres'], ['backup', 'Sauvegarde'], ['log', 'Journal']].map(([id, label]) => (
          <button key={id} className="btn btn-sm"
            style={tab === id ? { background: 'var(--text-primary)', color: 'white', borderColor: 'var(--text-primary)' } : {}}
            onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">Comptes CRM</div>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{authUsers.length} compte{authUsers.length > 1 ? 's' : ''}</span>
          </div>
          <table className="data-table">
            <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th></th></tr></thead>
            <tbody>
              {authUsers.map(u => {
                const isMe = user?.email.toLowerCase() === u.email.toLowerCase()
                const initials = u.name && u.nom ? (u.name[0] + u.nom[0]).toUpperCase() : u.name[0]?.toUpperCase() ?? '?'
                return (
                  <tr key={u.email} style={isMe ? { background: 'var(--surface-2)' } : {}}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{initials}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name} {u.nom}</div>
                          {isMe && <div style={{ fontSize: 11, color: 'var(--green, #16A34A)', marginTop: 1 }}>Vous</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'DM Mono' }}>{u.email}</td>
                    <td>
                      <span className={`tag ${u.email === 'admin@neodis.fr' ? 'tag-verified' : ''}`}
                        style={u.email !== 'admin@neodis.fr' ? { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' } : {}}>
                        {u.email === 'admin@neodis.fr' ? 'Super admin' : 'Admin'}
                      </span>
                    </td>
                    <td>{isMe && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Connecté</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
            Tous les membres ont accès complet au CRM.
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card animate-in">
          <div className="card-header"><div className="card-title">Paramètres généraux</div></div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Les données sont persistées dans Supabase (PostgreSQL).
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="info-block"><div className="info-label">Google Sheet ID</div><div className="info-value" style={{ fontFamily: 'DM Mono', fontSize: 12 }}>19To_mfbmpfJDjmyAe_fLZImfCzAcM_jQTGC5ghGMuik</div></div>
              <div className="info-block"><div className="info-label">Durées disponibles</div><div className="info-value">35h · 60h</div></div>
              <div className="info-block"><div className="info-label">Financeurs</div><div className="info-value">France Travail (Prest@ppli, AIF) · OPCO</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-in">

          {/* Export */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">💾 Exporter la sauvegarde</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Télécharge un fichier JSON avec toutes les données depuis Supabase.
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Le fichier <code style={{ fontSize: 11, background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>.json</code> contient
                participants, sessions, formateurs et documents. Les fichiers uploadés (photos, PDFs) restent dans Supabase Storage.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={exporting}
                style={{ gap: 8 }}
              >
                {exporting
                  ? <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', animation: 'spin .6s linear infinite' }} />
                  : '↓'
                }
                {exporting ? 'Préparation…' : 'Télécharger la sauvegarde'}
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📂 Restaurer une sauvegarde</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Importe un fichier de sauvegarde NEODIS dans Supabase.
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{
                padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                background: '#FFFBEB', border: '1px solid #FDE68A',
                fontSize: 12, color: '#92400E', lineHeight: 1.6,
              }}>
                ⚠️ Cette opération <strong>fusionne (upsert)</strong> les données dans Supabase.
                Les enregistrements existants avec le même ID seront mis à jour.
              </div>

              <input
                ref={importRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
              <button
                className="btn"
                onClick={() => importRef.current?.click()}
                disabled={importing}
                style={{ gap: 8 }}
              >
                {importing
                  ? <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--text-primary)', animation: 'spin .6s linear infinite' }} />
                  : '↑'
                }
                {importing ? 'Restauration en cours…' : 'Choisir un fichier de sauvegarde'}
              </button>

              {importStatus && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: importStatus.ok ? '#F0FFF4' : '#FFF1F2',
                  border: `1px solid ${importStatus.ok ? '#BBF7D0' : '#FECDD3'}`,
                  color: importStatus.ok ? '#15803D' : '#BE123C',
                }}>
                  {importStatus.ok ? '✓ ' : '✕ '}{importStatus.msg}
                </div>
              )}
            </div>
          </div>

          {/* Info déploiement */}
          <div className="card">
            <div className="card-header"><div className="card-title">ℹ️ Procédure de migration de données</div></div>
            <div style={{ padding: '16px 20px' }}>
              <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2, margin: 0, paddingLeft: 18 }}>
                <li>Exporter la sauvegarde depuis l'ancien CRM (localhost)</li>
                <li>Ouvrir le CRM sur Vercel</li>
                <li>Admin → Sauvegarde → Importer le fichier</li>
                <li>Le CRM se recharge avec toutes vos données</li>
              </ol>
            </div>
          </div>

        </div>
      )}

      {tab === 'log' && (
        <div className="card animate-in">
          <div className="card-header"><div className="card-title">Journal d'activité</div></div>
          {activityLog.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>Aucune activité enregistrée</div>
          ) : (
            activityLog.map((entry, i) => (
              <div key={i} className="alert-item">
                <div style={{ fontSize: 14 }}>{entry.icon}</div>
                <div>
                  <div className="alert-text" dangerouslySetInnerHTML={{ __html: entry.text }} />
                  <div className="alert-time">{entry.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
