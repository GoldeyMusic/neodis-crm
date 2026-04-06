'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { loadPortalData, PortalData } from '@/lib/formateur-portal'
import { supabase } from '@/lib/supabase'

/* ── Helpers calendrier ── */
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function parseDateFR(str: string): Date | null {
  const s = str.trim().toLowerCase()
  const match = s.match(/(\d{1,2})\s+(\S+?)\.?\s+(\d{4})/)
  if (!match) return null
  const day = parseInt(match[1]), monthStr = match[2].replace('.',''), year = parseInt(match[3])
  const abbrevs = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc']
  const full = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  let idx = abbrevs.findIndex(m => monthStr.startsWith(m))
  if (idx === -1) idx = full.findIndex(m => monthStr.startsWith(m))
  if (idx === -1) return null
  return new Date(year, idx, day)
}

function parseDateRange(dates: string): [Date, Date] | null {
  const parts = dates.split(/\s*[—–-]\s*/)
  if (parts.length < 2) return null
  const end = parseDateFR(parts[1].trim())
  if (!end) return null
  let startStr = parts[0].trim()
  if (!/\d{4}/.test(startStr)) startStr += ` ${end.getFullYear()}`
  const start = parseDateFR(startStr)
  if (!start) return null
  return [start, end]
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1), last = new Date(year, month + 1, 0)
  let offset = (first.getDay() + 6) % 7
  const days: { date: Date; inMonth: boolean }[] = []
  for (let i = offset - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), inMonth: false })
  for (let d = 1; d <= last.getDate(); d++) days.push({ date: new Date(year, month, d), inMonth: true })
  while (days.length % 7 !== 0) days.push({ date: new Date(year, month + 1, days.length - offset - last.getDate() + 1), inMonth: false })
  return days
}

function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function isInRange(day: Date, s: Date, e: Date) { return day.getTime() >= new Date(s.getFullYear(),s.getMonth(),s.getDate()).getTime() && day.getTime() <= new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime() }

/* ── Tabs ── */
const TABS = [
  { id: 'recap', label: 'Mon récap', icon: '📋' },
  { id: 'calendrier', label: 'Calendrier', icon: '📅' },
  { id: 'documents', label: 'Documents', icon: '📁' },
  { id: 'liens', label: 'Liens & Outils', icon: '🔗' },
]

/* ── Page principale ── */
export default function FormateurPortal({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | false>(false)
  const [activeTab, setActiveTab] = useState('recap')

  useEffect(() => {
    // Support both sync and async params (Next.js 14/15 compat)
    const resolveToken = async () => {
      const p = params instanceof Promise ? await params : params
      return p.token
    }
    resolveToken().then(token => {
      if (!token) { setError('Token manquant'); setLoading(false); return }
      loadPortalData(token)
        .then(d => {
          if (d) setData(d)
          else setError('Formateur introuvable pour ce token')
          setLoading(false)
        })
        .catch(err => {
          console.error('[portal] loadPortalData error:', err)
          setError('Erreur de chargement')
          setLoading(false)
        })
    })
  }, [params])

  if (loading) return (
    <div className="portal-shell">
      <div className="portal-loading">
        <div className="portal-spinner" />
        <div>Chargement de votre espace…</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="portal-shell">
      <div className="portal-error">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Lien invalide</div>
        <div style={{ color: 'var(--text-tertiary)', maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
          Ce lien d'accès formateur n'est pas reconnu ou a expiré.
          <br />Contactez l'équipe NEODIS si le problème persiste.
        </div>
        {typeof error === 'string' && process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'DM Mono' }}>{error}</div>
        )}
      </div>
    </div>
  )

  const { formateur: f, sessions, documents } = data
  const totalHeures = sessions.reduce((sum, s) => sum + s.planning.heures, 0)
  const totalDu = f.tarifHoraire ? totalHeures * f.tarifHoraire : 0

  return (
    <div className="portal-shell">
      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="portal-avatar">
              {f.photo ? <img src={f.photo} alt={f.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : f.nom.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="portal-name">{f.nom}</div>
              <div className="portal-role">
                {f.type === 'principal' ? 'Formateur' : 'Intervenant Masterclass'} · {f.spec.join(', ')}
              </div>
            </div>
          </div>
          <div className="portal-brand">
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>UMANI</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-tertiary)' }}> by NEODIS</span>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="portal-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`portal-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="portal-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="portal-content">
        {activeTab === 'recap' && <RecapTab data={data} totalHeures={totalHeures} totalDu={totalDu} />}
        {activeTab === 'calendrier' && <CalendrierTab data={data} />}
        {activeTab === 'documents' && <DocumentsTab data={data} />}
        {activeTab === 'liens' && <LiensTab data={data} />}
      </main>
    </div>
  )
}

/* ── Onglet Récap ── */
function RecapTab({ data, totalHeures, totalDu }: { data: PortalData; totalHeures: number; totalDu: number }) {
  const { formateur: f, sessions } = data

  return (
    <div>
      {/* KPIs */}
      <div className="portal-kpi-grid">
        <div className="portal-kpi">
          <div className="portal-kpi-value">{sessions.length}</div>
          <div className="portal-kpi-label">Session{sessions.length > 1 ? 's' : ''}</div>
        </div>
        <div className="portal-kpi">
          <div className="portal-kpi-value">{totalHeures}h</div>
          <div className="portal-kpi-label">Total heures</div>
        </div>
        {f.tarifHoraire && (
          <div className="portal-kpi">
            <div className="portal-kpi-value">{f.tarifHoraire} €/h</div>
            <div className="portal-kpi-label">Tarif horaire</div>
          </div>
        )}
        {totalDu > 0 && (
          <div className="portal-kpi">
            <div className="portal-kpi-value" style={{ color: '#16A34A' }}>{totalDu.toLocaleString('fr-FR')} €</div>
            <div className="portal-kpi-label">Total brut</div>
          </div>
        )}
      </div>

      {/* Détail par session */}
      <div className="portal-section-title">Mes interventions</div>
      {sessions.length === 0 && (
        <div className="portal-empty">Aucune session assignée pour le moment</div>
      )}
      {sessions.map(({ session: s, planning: p }) => {
        const statusLabel: Record<string, string> = { active: 'En cours', done: 'Terminée', upcoming: 'À venir' }
        const montant = f.tarifHoraire ? p.heures * f.tarifHoraire : null
        return (
          <div key={s.id} className="portal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.dates}</div>
              </div>
              <span className={`status-pill ${s.status}`}>{statusLabel[s.status] ?? s.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div className="portal-detail">
                <div className="portal-detail-label">Module</div>
                <div className="portal-detail-value">{p.module}</div>
              </div>
              <div className="portal-detail">
                <div className="portal-detail-label">Heures</div>
                <div className="portal-detail-value">{p.heures}h</div>
              </div>
              {montant && (
                <div className="portal-detail">
                  <div className="portal-detail-label">Montant</div>
                  <div className="portal-detail-value" style={{ color: '#16A34A', fontFamily: 'DM Mono' }}>{montant.toLocaleString('fr-FR')} €</div>
                </div>
              )}
              <div className="portal-detail">
                <div className="portal-detail-label">Durée totale</div>
                <div className="portal-detail-value">{s.duree}</div>
              </div>
              <div className="portal-detail">
                <div className="portal-detail-label">Financeur</div>
                <div className="portal-detail-value">
                  <span className={`tag tag-${s.financeur === 'France Travail' ? 'ft' : 'opco'}`}>{s.financeur}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Onglet Calendrier ── */
function CalendrierTab({ data }: { data: PortalData }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const sessionRanges = useMemo(() => {
    return data.sessions.map(({ session: s }, idx) => {
      const range = parseDateRange(s.dates)
      const colors = [
        { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
        { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED' },
        { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
        { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
      ]
      return { session: s, range, color: colors[idx % colors.length] }
    }).filter(sr => sr.range !== null) as any[]
  }, [data.sessions])

  const calDays = useMemo(() => getCalendarDays(year, month), [year, month])

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  return (
    <div>
      <div className="cal-nav" style={{ marginBottom: 16 }}>
        <button className="btn btn-sm" onClick={prev}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3l-5 5 5 5"/></svg>
        </button>
        <button className="btn btn-sm" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }}>Aujourd'hui</button>
        <button className="btn btn-sm" onClick={next}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span className="cal-month-label">{MOIS[month]} {year}</span>
      </div>

      <div className="cal-grid card">
        <div className="cal-header">
          {JOURS.map(j => <div key={j} className="cal-header-cell">{j}</div>)}
        </div>
        <div className="cal-body">
          {calDays.map(({ date, inMonth }, idx) => {
            const isToday = isSameDay(date, today)
            const daySessions = sessionRanges.filter((sr: any) => sr.range && isInRange(date, sr.range[0], sr.range[1]))
            return (
              <div key={idx} className={['cal-cell', !inMonth && 'cal-cell-outside', isToday && 'cal-cell-today'].filter(Boolean).join(' ')}>
                <div className={`cal-day-num${isToday ? ' cal-today-badge' : ''}`}>{date.getDate()}</div>
                <div className="cal-events">
                  {daySessions.map((sr: any) => {
                    const isStart = isSameDay(date, sr.range[0])
                    return (
                      <div key={sr.session.id} className={['cal-event', isStart && 'cal-event-start'].filter(Boolean).join(' ')}
                        style={{ background: sr.color.bg, borderColor: sr.color.border, color: sr.color.text }}
                        title={sr.session.name}>
                        {isStart && <span className="cal-event-label">{sr.session.name.length > 16 ? sr.session.name.slice(0,14)+'…' : sr.session.name}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Onglet Documents ── */
function DocumentsTab({ data }: { data: PortalData }) {
  const { formateur: f, documents } = data
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<string[]>([])

  const catLabels: Record<string, string> = {
    pedago: 'Ressource pédago', cv: 'CV', bilans: 'Bilan',
    factures_formateurs: 'Facture', contrat: 'Contrat',
  }

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `formateur_upload_${f.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('neodis-files').upload(path, file, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('neodis-files').getPublicUrl(path)
        // Sauvegarder le document dans Supabase
        const doc = {
          id: Date.now(),
          nom: file.name,
          cat: 'pedago',
          formateur: f.nom,
          taille: file.size < 1024*1024 ? Math.round(file.size/1024)+' KB' : (file.size/(1024*1024)).toFixed(1)+' MB',
          date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
          data: urlData.publicUrl,
        }
        await supabase.from('documents').upsert({ id: String(doc.id), data: doc, updated_at: new Date().toISOString() })
        setUploaded(prev => [...prev, file.name])
      }
    } catch (e) {
      console.error('[portal] upload error:', e)
    }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="portal-section-title" style={{ marginBottom: 0 }}>Mes documents</div>
        <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Upload…' : '↑ Déposer un document'}
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
      </div>

      {uploaded.length > 0 && (
        <div className="portal-card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
            ✓ {uploaded.length} document{uploaded.length > 1 ? 's' : ''} déposé{uploaded.length > 1 ? 's' : ''} — merci !
          </div>
        </div>
      )}

      {documents.length === 0 && uploaded.length === 0 && (
        <div className="portal-empty">Aucun document disponible</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map((d: any) => (
          <div key={d.id} className="portal-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--ft-bg)', border: '1px solid var(--ft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {d.taille} · {d.date}
                {catLabels[d.cat] && <span style={{ marginLeft: 6, padding: '0 5px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 10 }}>{catLabels[d.cat]}</span>}
              </div>
            </div>
            <a href={d.data} target="_blank" rel="noopener" className="btn btn-sm" download={d.nom}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v8M5 8l3 3 3-3M3 13h10"/></svg>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Onglet Liens ── */
function LiensTab({ data }: { data: PortalData }) {
  const { formateur: f } = data

  // Liens par défaut UMANI + liens personnalisés
  const defaultLiens = [
    { label: 'UMANI.town — Accès map', url: 'https://umani.town' },
  ]
  const allLiens = [...defaultLiens, ...(f.liens || [])]

  return (
    <div>
      <div className="portal-section-title">Liens & outils</div>
      {allLiens.length === 0 && (
        <div className="portal-empty">Aucun lien configuré</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allLiens.map((l, i) => (
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="portal-card portal-link-card">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{l.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h7v7M13 3L6 10"/></svg>
          </a>
        ))}
      </div>

      {/* Contact */}
      <div className="portal-section-title" style={{ marginTop: 24 }}>Contact NEODIS</div>
      <div className="portal-card">
        <div style={{ fontSize: 13 }}>Pour toute question, contactez-nous :</div>
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <a href="mailto:contact@neodis-medias.fr" style={{ color: 'var(--ft)', textDecoration: 'none' }}>contact@neodis-medias.fr</a>
        </div>
      </div>
    </div>
  )
}
