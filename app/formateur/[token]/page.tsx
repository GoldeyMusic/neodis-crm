'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { loadPortalData, PortalData, PortalDocument } from '@/lib/formateur-portal'
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

/** Extrait l'année depuis la string dates d'une session */
function getSessionYear(dates: string): number | null {
  const range = parseDateRange(dates)
  return range ? range[0].getFullYear() : null
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

/* ── Nav items ── */
const NAV_ITEMS = [
  { id: 'recap', label: 'Mon récap', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
  { id: 'calendrier', label: 'Calendrier', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2.5" width="14" height="12" rx="2"/><path d="M5 .5v4M11 .5v4M1 6.5h14"/><circle cx="5" cy="9.5" r=".8" fill="currentColor" stroke="none"/><circle cx="8" cy="9.5" r=".8" fill="currentColor" stroke="none"/><circle cx="11" cy="9.5" r=".8" fill="currentColor" stroke="none"/></svg> },
  { id: 'documents', label: 'Documents', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1z"/><path d="M9 1v5h5M5 9h6M5 12h4"/></svg> },
  { id: 'liens', label: 'Liens & Outils', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"/></svg> },
]

/* ── Page principale ── */
export default function FormateurPortal({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | false>(false)
  const [activeTab, setActiveTab] = useState('recap')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
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
      </div>
    </div>
  )

  const { formateur: f } = data

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-header-inner">
          <button className="portal-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
          </button>
          <span className="portal-logo">UMA<span>NI</span></span>
          <span className="portal-sep" style={{ color: 'var(--border-strong)', fontSize: 16 }}>|</span>
          <span className="portal-byline">Espace formateur</span>
          <div style={{ flex: 1 }} />
          <div className="portal-user">
            <div className="portal-avatar">
              {f.photo ? <img src={f.photo} alt={f.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : f.nom.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div className="portal-user-info">
              <div className="portal-name">{f.nom}</div>
              <div className="portal-role">
                {f.type === 'principal' ? 'Formateur' : 'Intervenant Masterclass'} · {f.spec.join(', ')}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="portal-body">
        {sidebarOpen && <div className="portal-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <nav className={`portal-sidebar${sidebarOpen ? ' portal-sidebar-open' : ''}`}>
          {NAV_ITEMS.map(item => (
            <div
              key={item.id}
              className={`nav-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>
        <main className="portal-content">
          {activeTab === 'recap' && <RecapTab data={data} />}
          {activeTab === 'calendrier' && <CalendrierTab data={data} />}
          {activeTab === 'documents' && <DocumentsTab data={data} />}
          {activeTab === 'liens' && <LiensTab data={data} />}
        </main>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ONGLET RÉCAP — KPIs filtrés + suivi paiements
   ══════════════════════════════════════════════════════════════════════════════ */
function RecapTab({ data }: { data: PortalData }) {
  const { formateur: f, sessions } = data
  const [filterYear, setFilterYear] = useState<number | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Années disponibles
  const years = useMemo(() => {
    const set = new Set<number>()
    sessions.forEach(({ session: s }) => { const y = getSessionYear(s.dates); if (y) set.add(y) })
    return Array.from(set).sort((a, b) => b - a)
  }, [sessions])

  // Sessions filtrées
  const filtered = useMemo(() => sessions.filter(({ session: s }) => {
    if (filterYear !== 'all') { const y = getSessionYear(s.dates); if (y !== filterYear) return false }
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    return true
  }), [sessions, filterYear, filterStatus])

  // KPIs calculés sur les sessions filtrées
  const totalHeures = filtered.reduce((sum, s) => sum + s.planning.heures, 0)
  const enAttente = filtered.filter(s => s.planning.paiement !== 'paye')
  const paye = filtered.filter(s => s.planning.paiement === 'paye')
  const montantEnAttente = f.tarifHoraire ? enAttente.reduce((sum, s) => sum + s.planning.heures, 0) * f.tarifHoraire : 0
  const montantPaye = f.tarifHoraire ? paye.reduce((sum, s) => sum + s.planning.heures, 0) * f.tarifHoraire : 0
  const montantTotal = f.tarifHoraire ? totalHeures * f.tarifHoraire : 0

  const hasFilters = years.length > 1 || sessions.some(s => s.session.status !== sessions[0]?.session.status)

  const chipStyle = (active: boolean) => ({
    padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 500, cursor: 'pointer',
    whiteSpace: 'nowrap' as const, fontFamily: 'Inter, sans-serif', border: '1px solid',
    borderColor: active ? 'var(--text-primary)' : 'var(--border)',
    background: active ? 'var(--text-primary)' : 'var(--surface)',
    color: active ? 'white' : 'var(--text-secondary)',
    transition: 'all .15s',
  })

  const statusLabels: Record<string, string> = { active: 'En cours', done: 'Terminée', upcoming: 'À venir' }

  return (
    <div>
      {/* Filtres */}
      {hasFilters && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={chipStyle(filterYear === 'all')} onClick={() => setFilterYear('all')}>Toutes années</button>
          {years.map(y => <button key={y} style={chipStyle(filterYear === y)} onClick={() => setFilterYear(y)}>{y}</button>)}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button style={chipStyle(filterStatus === 'all')} onClick={() => setFilterStatus('all')}>Tous</button>
          {['upcoming', 'active', 'done'].map(s => (
            <button key={s} style={chipStyle(filterStatus === s)} onClick={() => setFilterStatus(s)}>{statusLabels[s]}</button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="portal-kpi-grid">
        <div className="portal-kpi">
          <div className="portal-kpi-value">{filtered.length}</div>
          <div className="portal-kpi-label">Session{filtered.length > 1 ? 's' : ''}</div>
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
        {montantEnAttente > 0 && (
          <div className="portal-kpi" style={{ borderColor: '#FED7AA' }}>
            <div className="portal-kpi-value" style={{ color: '#C2410C' }}>{montantEnAttente.toLocaleString('fr-FR')} €</div>
            <div className="portal-kpi-label">En attente</div>
          </div>
        )}
        {montantPaye > 0 && (
          <div className="portal-kpi" style={{ borderColor: '#BBF7D0' }}>
            <div className="portal-kpi-value" style={{ color: '#16A34A' }}>{montantPaye.toLocaleString('fr-FR')} €</div>
            <div className="portal-kpi-label">Réglé</div>
          </div>
        )}
        {montantTotal > 0 && montantPaye > 0 && montantEnAttente > 0 && (
          <div className="portal-kpi">
            <div className="portal-kpi-value">{montantTotal.toLocaleString('fr-FR')} €</div>
            <div className="portal-kpi-label">Total brut</div>
          </div>
        )}
      </div>

      {/* Détail par session */}
      <div className="portal-section-title">Mes interventions</div>
      {filtered.length === 0 && (
        <div className="portal-empty">Aucune session pour ces filtres</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(({ session: s, planning: p }) => {
          const montant = f.tarifHoraire ? p.heures * f.tarifHoraire : null
          const isPaid = p.paiement === 'paye'
          return (
            <div key={s.id} className="portal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.dates}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span className={`status-pill ${s.status}`}>{statusLabels[s.status] ?? s.status}</span>
                </div>
              </div>
              <div className="portal-detail-grid">
                <div className="portal-detail">
                  <div className="portal-detail-label">Module</div>
                  <div className="portal-detail-value">{p.module}</div>
                </div>
                <div className="portal-detail">
                  <div className="portal-detail-label">Heures</div>
                  <div className="portal-detail-value">{p.heures}h</div>
                </div>
                {montant != null && (
                  <div className="portal-detail">
                    <div className="portal-detail-label">Montant</div>
                    <div className="portal-detail-value" style={{ fontFamily: 'DM Mono' }}>{montant.toLocaleString('fr-FR')} €</div>
                  </div>
                )}
                <div className="portal-detail">
                  <div className="portal-detail-label">Paiement</div>
                  <div className="portal-detail-value">
                    {isPaid ? (
                      <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 500 }}>
                        ✓ Réglé{p.paiementDate ? ` le ${p.paiementDate}` : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#C2410C', fontSize: 12, fontWeight: 500 }}>En attente</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ONGLET CALENDRIER — uniquement ses sessions
   ══════════════════════════════════════════════════════════════════════════════ */
/* ── Parser planning (same logic as CRM Calendrier) ── */
type PortalSlot = 'matin' | 'am' | 'soir' | 'journee'
interface PortalDaySlot { day: number; slot: PortalSlot; module: string; formateurId: number }

function portalParseModuleSlots(module: string, formateurId: number): PortalDaySlot[] {
  const moduleName = module.replace(/\s*\(.*\)\s*$/, '').trim()
  const parenMatch = module.match(/\(([^)]+)\)/)
  if (!parenMatch) return []
  const inside = parenMatch[1].trim()
  const results: PortalDaySlot[] = []
  const parts = inside.split(/\s*\+\s*/)
  const globalSlotMatch = inside.match(/(matin|après-midi|après midi|AM|soir)$/i)
  const toSlot = (s: string): PortalSlot => { const l = s.toLowerCase(); if (l === 'matin') return 'matin'; if (l === 'soir') return 'soir'; return 'am' }
  const globalSlot: PortalSlot | null = globalSlotMatch ? toSlot(globalSlotMatch[1]) : null
  for (const part of parts) {
    const p = part.trim()
    const rangeMatch = p.match(/J(\d+)\s*(?:à|a|-)\s*J(\d+)/i)
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1]), to = parseInt(rangeMatch[2])
      const localMatch = p.match(/(matin|après-midi|après midi|AM|soir)/i)
      const slot: PortalSlot = localMatch ? toSlot(localMatch[1]) : globalSlot ?? 'journee'
      for (let d = from; d <= to; d++) results.push({ day: d, slot, module: moduleName, formateurId })
      continue
    }
    const singleMatch = p.match(/J(\d+)(?:\s+(matin|après-midi|après midi|AM|soir))?/i)
    if (singleMatch) {
      const dayNum = parseInt(singleMatch[1])
      const slot: PortalSlot = singleMatch[2] ? toSlot(singleMatch[2]) : globalSlot ?? 'journee'
      results.push({ day: dayNum, slot, module: moduleName, formateurId })
    }
  }
  return results
}

function portalBuildDayMap(session: { dates: string; planning?: { formateurId: number; module: string }[] }, range: [Date, Date]): Map<string, { matin: PortalDaySlot[]; am: PortalDaySlot[]; soir: PortalDaySlot[] }> {
  const map = new Map<string, { matin: PortalDaySlot[]; am: PortalDaySlot[]; soir: PortalDaySlot[] }>()
  if (!session.planning) return map
  const workDays: Date[] = []
  const cur = new Date(range[0])
  while (cur <= range[1]) {
    if (cur.getDay() >= 1 && cur.getDay() <= 5) workDays.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  const allSlots: PortalDaySlot[] = []
  for (const entry of session.planning) {
    allSlots.push(...portalParseModuleSlots(entry.module, entry.formateurId))
  }
  for (const slot of allSlots) {
    const dayIdx = slot.day - 1
    if (dayIdx < 0 || dayIdx >= workDays.length) continue
    const dateKey = workDays[dayIdx].toISOString().slice(0, 10)
    if (!map.has(dateKey)) map.set(dateKey, { matin: [], am: [], soir: [] })
    const d = map.get(dateKey)!
    if (slot.slot === 'matin') d.matin.push(slot)
    else if (slot.slot === 'am') d.am.push(slot)
    else if (slot.slot === 'soir') d.soir.push(slot)
    else { d.matin.push(slot); d.am.push(slot) }
  }
  return map
}

function CalendrierTab({ data }: { data: PortalData }) {
  const { formateur: f } = data
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

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
    }).filter(sr => sr.range !== null) as { session: typeof data.sessions[0]['session']; range: [Date, Date]; color: { bg: string; border: string; text: string } }[]
  }, [data.sessions])

  // Build day maps for all sessions (full planning, not just this formateur)
  const dayMaps = useMemo(() => {
    const maps = new Map<number, Map<string, { matin: PortalDaySlot[]; am: PortalDaySlot[]; soir: PortalDaySlot[] }>>()
    for (const { session, range } of sessionRanges) {
      maps.set(session.id, portalBuildDayMap(session, range))
    }
    return maps
  }, [sessionRanges])

  // Formateur names from session planning
  const fmtNames = useMemo(() => {
    const nameMap = new Map<number, string>()
    for (const { session } of data.sessions) {
      for (const p of session.planning ?? []) {
        // We only have session data, not full formateur list — use what we can
        if (!nameMap.has(p.formateurId)) {
          // Check if it's the current formateur
          if (p.formateurId === f.id) nameMap.set(p.formateurId, f.nom)
        }
      }
    }
    return nameMap
  }, [data.sessions, f])

  const fmtShort = (id: number) => {
    if (id === f.id) return f.nom.split(' ')[0]
    const n = fmtNames.get(id)
    return n ? n.split(' ')[0] : ''
  }

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
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const daySessions = sessionRanges.filter(sr => isInRange(date, sr.range[0], sr.range[1]))
            return (
              <div
                key={idx}
                className={[
                  'cal-cell',
                  !inMonth && 'cal-cell-outside',
                  isToday && 'cal-cell-today',
                  isWeekend && 'cal-cell-weekend',
                  selectedDay && isSameDay(date, selectedDay) && 'cal-cell-selected',
                ].filter(Boolean).join(' ')}
                onClick={() => daySessions.length > 0 && setSelectedDay(date)}
                style={daySessions.length > 0 ? { cursor: 'pointer' } : undefined}
              >
                <div className={`cal-day-num${isToday ? ' cal-today-badge' : ''}`}>{date.getDate()}</div>
                <div className="cal-events">
                  {daySessions.map(({ session, range, color }) => {
                    const dateKey = date.toISOString().slice(0, 10)
                    const dayData = dayMaps.get(session.id)?.get(dateKey)
                    const hasDetail = dayData && (dayData.matin.length > 0 || dayData.am.length > 0 || dayData.soir.length > 0)
                    return (
                      <div
                        key={session.id}
                        className="cal-event-detail"
                        style={{ borderLeftColor: color.text, background: color.bg }}
                      >
                        {hasDetail ? (
                          <>
                            {dayData.matin.length > 0 && (
                              <div className="cal-slot">
                                <span className="cal-slot-period">AM</span>
                                {dayData.matin.map((s, i) => (
                                  <span key={i} className="cal-slot-entry" style={{ color: color.text }}>
                                    {s.module} {s.formateurId === f.id && <span className="cal-slot-fmtr" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, borderRadius: 4, padding: '0 3px', fontSize: 8 }}>Moi</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {dayData.am.length > 0 && (
                              <div className="cal-slot">
                                <span className="cal-slot-period">PM</span>
                                {dayData.am.map((s, i) => (
                                  <span key={i} className="cal-slot-entry" style={{ color: color.text }}>
                                    {s.module} {s.formateurId === f.id && <span className="cal-slot-fmtr" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, borderRadius: 4, padding: '0 3px', fontSize: 8 }}>Moi</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {dayData.soir.length > 0 && (
                              <div className="cal-slot">
                                <span className="cal-slot-period">SO</span>
                                {dayData.soir.map((s, i) => (
                                  <span key={i} className="cal-slot-entry" style={{ color: color.text }}>
                                    {s.module} {s.formateurId === f.id && <span className="cal-slot-fmtr" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, borderRadius: 4, padding: '0 3px', fontSize: 8 }}>Moi</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="cal-event-label" style={{ color: color.text }}>
                            {session.name.length > 16 ? session.name.slice(0,14)+'…' : session.name}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDay && (() => {
        const dayKey = selectedDay.toISOString().slice(0, 10)
        const daySes = sessionRanges.filter(sr => isInRange(selectedDay, sr.range[0], sr.range[1]))
        if (daySes.length === 0) return null
        const dayLabel = selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        return (
          <div className="portal-card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: 14, textTransform: 'capitalize' }}>{dayLabel}</div>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12 }}>Fermer</button>
            </div>
            {daySes.map(({ session, color }) => {
              const dayData = dayMaps.get(session.id)?.get(dayKey)
              const hasDetail = dayData && (dayData.matin.length > 0 || dayData.am.length > 0 || dayData.soir.length > 0)
              return (
                <div key={session.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasDetail ? 8 : 0 }}>
                    <div style={{ width: 4, height: 24, borderRadius: 2, background: color.text, flexShrink: 0 }} />
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{session.name}</div>
                  </div>
                  {hasDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 12 }}>
                      {dayData.matin.length > 0 && (
                        <div className="cal-day-slot-row">
                          <span className="cal-day-slot-badge" style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Matin</span>
                          <div className="cal-day-slot-entries">
                            {dayData.matin.map((s, i) => (
                              <div key={i} className="cal-day-slot-entry">
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{s.module}</span>
                                {s.formateurId === f.id && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 500 }}>Vous</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {dayData.am.length > 0 && (
                        <div className="cal-day-slot-row">
                          <span className="cal-day-slot-badge" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>Après-midi</span>
                          <div className="cal-day-slot-entries">
                            {dayData.am.map((s, i) => (
                              <div key={i} className="cal-day-slot-entry">
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{s.module}</span>
                                {s.formateurId === f.id && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 500 }}>Vous</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {dayData.soir.length > 0 && (
                        <div className="cal-day-slot-row">
                          <span className="cal-day-slot-badge" style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>Soir</span>
                          <div className="cal-day-slot-entries">
                            {dayData.soir.map((s, i) => (
                              <div key={i} className="cal-day-slot-entry">
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{s.module}</span>
                                {s.formateurId === f.id && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 500 }}>Vous</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ONGLET DOCUMENTS — catégorisé, drag & drop multi-fichiers, tags matière
   ══════════════════════════════════════════════════════════════════════════════ */
const MATIERES = ['Streaming', 'Branding', 'Marketing musical', "Identité d'artiste", 'MAO', 'Droits', 'Écriture']

function DocumentsTab({ data }: { data: PortalData }) {
  const { formateur: f, documents } = data
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [uploaded, setUploaded] = useState<PortalDocument[]>([])
  const [uploadCat, setUploadCat] = useState<string>('pedago')
  const [uploadMatieres, setUploadMatieres] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const UPLOAD_CATS = [
    { id: 'pedago', label: 'Cours / Support pédago', icon: '📚' },
    { id: 'factures_formateurs', label: 'Facture', icon: '🧾' },
    { id: 'cv', label: 'CV', icon: '📋' },
  ]

  const catLabels: Record<string, string> = {
    pedago: 'Cours / Pédago', cv: 'CV', contrat: 'Contrat',
    factures_formateurs: 'Facture', contrat_st: 'Contrat sous-traitance',
    reglement: 'Règlement intérieur', programme: 'Programme détaillé',
    charte: 'Charte qualité', matrice: 'Matrice progression',
    qcm_formatif: 'QCM formatifs',
  }
  const catIcons: Record<string, string> = {
    pedago: '📚', cv: '📋', contrat: '📝', factures_formateurs: '🧾',
    contrat_st: '📝', reglement: '📜', programme: '📑',
    charte: '✅', matrice: '📊', qcm_formatif: '📝',
  }

  const allDocs = [...documents, ...uploaded]

  const grouped = useMemo(() => {
    const map = new Map<string, PortalDocument[]>()
    allDocs.forEach(d => {
      const list = map.get(d.cat) || []
      list.push(d)
      map.set(d.cat, list)
    })
    return map
  }, [allDocs])

  const toggleMatiere = (m: string) => setUploadMatieres(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const uploadOneFile = async (file: File, cat: string, matieres: string[]): Promise<PortalDocument | null> => {
    if (file.size > 10 * 1024 * 1024) return null
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `formateur_${f.id}_${cat}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const { error } = await supabase.storage.from('neodis-files').upload(path, file, { upsert: true })
      if (error) return null
      const { data: urlData } = supabase.storage.from('neodis-files').getPublicUrl(path)
      const doc: PortalDocument = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        nom: file.name,
        cat,
        formateur: f.nom,
        formateurId: f.id,
        taille: file.size < 1024*1024 ? Math.round(file.size/1024)+' KB' : (file.size/(1024*1024)).toFixed(1)+' MB',
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
        data: urlData.publicUrl,
        uploadedBy: 'formateur',
        matiere: cat === 'pedago' && matieres.length > 0 ? (matieres.length === 1 ? matieres[0] : matieres) : undefined,
      }
      await supabase.from('documents').upsert({ id: String(doc.id), data: doc, updated_at: new Date().toISOString() })
      return doc
    } catch (e) {
      console.error('[portal] upload error:', e)
      return null
    }
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setUploadCount(0)
    setUploadTotal(files.length)
    const results: PortalDocument[] = []
    for (const file of files) {
      const doc = await uploadOneFile(file, uploadCat, uploadMatieres)
      if (doc) results.push(doc)
      setUploadCount(prev => prev + 1)
    }
    setUploaded(prev => [...prev, ...results])
    setUploading(false)
  }

  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; setDragging(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false) }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current = 0; setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFiles(files)
  }

  const chipStyle = (active: boolean) => ({
    padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 500, cursor: 'pointer',
    whiteSpace: 'nowrap' as const, fontFamily: 'Inter, sans-serif', border: '1px solid',
    borderColor: active ? 'var(--text-primary)' : 'var(--border)',
    background: active ? 'var(--text-primary)' : 'var(--surface)',
    color: active ? 'white' : 'var(--text-secondary)',
    transition: 'all .12s',
  })

  return (
    <div>
      <div className="portal-section-title">Mes documents</div>

      {/* Zone d'upload — drag & drop */}
      <div className="portal-card" style={{ marginBottom: 20, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Déposer des documents</div>

        {/* Choix de catégorie */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {UPLOAD_CATS.map(c => (
            <button key={c.id} onClick={() => setUploadCat(c.id)} style={chipStyle(uploadCat === c.id)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Tags matière — uniquement pour pédago */}
        {uploadCat === 'pedago' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Matière :</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[...MATIERES, ...f.spec.filter(s => !MATIERES.includes(s))].map(m => (
                <button key={m} onClick={() => toggleMatiere(m)} style={{
                  padding: '3px 9px', borderRadius: 12, fontSize: 10, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', border: '1px solid', transition: 'all .12s',
                  borderColor: uploadMatieres.includes(m) ? '#2563EB' : 'var(--border)',
                  background: uploadMatieres.includes(m) ? '#EFF6FF' : 'var(--surface)',
                  color: uploadMatieres.includes(m) ? '#2563EB' : 'var(--text-tertiary)',
                }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload zone — adaptive mobile/desktop */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploading ? (
              <div style={{ padding: 16, textAlign: 'center', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div className="portal-spinner" style={{ width: 20, height: 20, margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Upload {uploadCount}/{uploadTotal}…</div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  background: 'var(--surface)', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', transition: 'all .15s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 12V4M5 7l3-3 3 3"/><path d="M3 13h10"/></svg>
                Ajouter un fichier
              </button>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              PDF, DOC, images · max 10 MB/fichier
            </div>
          </div>
        ) : (
          <div
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#2563EB' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              padding: uploading ? '16px' : '24px',
              textAlign: 'center',
              cursor: uploading ? 'default' : 'pointer',
              transition: 'all .15s',
              background: dragging ? '#EFF6FF' : 'var(--bg)',
            }}
          >
            {uploading ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <div className="portal-spinner" style={{ width: 20, height: 20, margin: '0 auto 8px' }} />
                Upload {uploadCount}/{uploadTotal}…
              </div>
            ) : (
              <>
                <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
                <div style={{ fontSize: 13, color: dragging ? '#2563EB' : 'var(--text-secondary)', fontWeight: 500 }}>
                  {dragging ? 'Lâcher pour déposer' : 'Glisser-déposer vos fichiers ici'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  ou cliquer pour parcourir · PDF, DOC, images · max 10 MB/fichier
                </div>
              </>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            const files = Array.from(e.target.files || [])
            if (files.length > 0) handleFiles(files)
            e.target.value = ''
          }}
        />
      </div>

      {/* Compteur uploads de la session */}
      {uploaded.length > 0 && (
        <div className="portal-card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: 16, padding: '10px 16px' }}>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
            ✓ {uploaded.length} document{uploaded.length > 1 ? 's' : ''} déposé{uploaded.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Documents par catégorie */}
      {allDocs.length === 0 && (
        <div className="portal-empty">Aucun document pour le moment</div>
      )}
      {['contrat', 'contrat_st', 'factures_formateurs', 'pedago', 'cv', 'reglement', 'programme', 'charte', 'matrice', 'qcm_formatif'].map(cat => {
        const docs = grouped.get(cat)
        if (!docs || docs.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{catIcons[cat] || '📄'}</span> {catLabels[cat] || cat}
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>({docs.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {docs.map(d => (
                <div key={d.id} className="portal-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {d.taille}{d.date ? ` · ${d.date}` : ''}
                      {d.matiere && (Array.isArray(d.matiere) ? d.matiere : [d.matiere]).map(m => (
                        <span key={m} style={{ padding: '0 6px', borderRadius: 8, background: '#EFF6FF', color: '#2563EB', fontSize: 10, border: '1px solid #BFDBFE' }}>{m}</span>
                      ))}
                      {d.uploadedBy === 'formateur' && (
                        <span style={{ padding: '0 5px', borderRadius: 6, background: '#F0FDF4', color: '#16A34A', fontSize: 10, border: '1px solid #BBF7D0' }}>Déposé par moi</span>
                      )}
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
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ONGLET LIENS & OUTILS — liens personnalisés du formateur
   ══════════════════════════════════════════════════════════════════════════════ */
function LiensTab({ data }: { data: PortalData }) {
  const { formateur: f } = data

  // Les liens personnalisés du formateur (configurés par l'admin via le CRM)
  const allLiens = f.liens || []

  return (
    <div>
      <div className="portal-section-title">Liens & outils</div>
      {allLiens.length === 0 && (
        <div className="portal-empty">
          Aucun lien configuré pour le moment.
          <br />L'équipe NEODIS peut ajouter vos liens d'accès personnalisés.
        </div>
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
