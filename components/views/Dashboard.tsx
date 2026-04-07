'use client'
import { useState, useMemo } from 'react'
import { useCRM } from '@/lib/store'
import { Session } from '@/lib/data'
import SessionModal from '../modals/SessionModal'

/* ── Mini-calendrier helpers ── */
const MOIS_FR_SHORT = ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.']
const JOURS_MINI = ['L','M','M','J','V','S','D']

function parseDateFR(str: string): Date | null {
  const s = str.trim().toLowerCase()
  const match = s.match(/(\d{1,2})\s+(\S+?)\.?\s+(\d{4})/)
  if (!match) return null
  const day = parseInt(match[1])
  const monthStr = match[2].replace('.', '')
  const year = parseInt(match[3])
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

function getMiniCalDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  let offset = (first.getDay() + 6) % 7
  const days: { date: Date; inMonth: boolean }[] = []
  for (let i = offset - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), inMonth: false })
  for (let d = 1; d <= last.getDate(); d++) days.push({ date: new Date(year, month, d), inMonth: true })
  while (days.length % 7 !== 0) days.push({ date: new Date(year, month + 1, days.length - offset - last.getDate() + 1), inMonth: false })
  return days
}

function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function isInRange(day: Date, s: Date, e: Date) {
  const d = day.getTime(), s0 = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime(), e0 = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime()
  return d >= s0 && d <= e0
}

export default function Dashboard() {
  const { sessions, participants, formateurs, documents, setActiveView } = useCRM()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  // Mini-calendrier state
  const today = new Date()
  const [miniMonth, setMiniMonth] = useState(today.getMonth())
  const [miniYear, setMiniYear] = useState(today.getFullYear())

  const sessionRanges = useMemo(() => {
    return sessions.map(s => ({ session: s, range: parseDateRange(s.dates) })).filter(sr => sr.range !== null) as { session: Session; range: [Date, Date] }[]
  }, [sessions])

  const miniDays = useMemo(() => getMiniCalDays(miniYear, miniMonth), [miniYear, miniMonth])

  const miniPrev = () => { if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y - 1) } else setMiniMonth(m => m - 1) }
  const miniNext = () => { if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y + 1) } else setMiniMonth(m => m + 1) }

  const active = sessions.filter(s => s.status === 'active').length
  const activeParticipants = participants.filter(p => p.assiduite !== 'abandonne' && p.assiduite !== 'jamais_presente')
  const total = activeParticipants.length
  const done = sessions.filter(s => s.status === 'done').length
  const upcoming = sessions.filter(s => s.status === 'upcoming').length

  const TARIF_AIF = 2100   // tarif par participant pour les formations AIF 35h

  // Budget formateurs total agrégé sur toutes les sessions
  const budgetTotal = sessions.reduce((sum, s) => {
    if (!s.planning) return sum
    return sum + s.planning.reduce((ssum, entry) => {
      const tarif = formateurs.find(f => f.id === entry.formateurId)?.tarifHoraire ?? 0
      return ssum + tarif * entry.heures
    }, 0)
  }, 0)
  const budgetPartiels = sessions.some(s =>
    s.planning?.some(e => !formateurs.find(f => f.id === e.formateurId)?.tarifHoraire)
  )

  // CA facturé : logique différenciée par type de financement
  // - Prest@ppli : montant forfaitaire fixe (montantCA sur la session)
  // - AIF        : nombre de participants avec une facture liée × tarif AIF
  //   On compte aussi les documents factures_financeurs tagués sur la session
  const caFacture = sessions.reduce((total, s) => {
    const nbFactureDocs = documents.filter(d =>
      d.cat === 'factures_financeurs' && d.session && d.session.split(' | ').includes(s.name)
    ).length
    if (s.typeFT === 'Prest@ppli') {
      const sessionDone = s.status === 'done'
      const hasFacture  = nbFactureDocs > 0 || participants.some(p => p.session === s.name && p.factures && p.factures !== '—')
      if ((sessionDone || hasFacture) && s.montantCA) return total + s.montantCA
    } else {
      // AIF : max entre participants liés et documents factures tagués
      const linkedParticipants = participants.filter(p => p.session === s.name && p.factures && p.factures !== '—').length
      const nbFactures = Math.max(linkedParticipants, nbFactureDocs)
      return total + nbFactures * TARIF_AIF
    }
    return total
  }, 0)

  // Détail pour le sous-titre du KPI
  const nbFacturesAIF = sessions.filter(s => s.typeFT !== 'Prest@ppli').reduce((n, s) => {
    const linkedP = participants.filter(p => p.session === s.name && p.factures && p.factures !== '—').length
    const linkedD = documents.filter(d => d.cat === 'factures_financeurs' && d.session && d.session.split(' | ').includes(s.name)).length
    return n + Math.max(linkedP, linkedD)
  }, 0)
  const nbSessionsPrestappli = sessions.filter(s => {
    if (s.typeFT !== 'Prest@ppli' || !s.montantCA) return false
    const hasDocs = documents.some(d => d.cat === 'factures_financeurs' && d.session && d.session.split(' | ').includes(s.name))
    return s.status === 'done' || hasDocs || participants.some(p => p.session === s.name && p.factures && p.factures !== '—')
  }).length

  // CA prévisionnel : sessions non terminées, logique identique
  const prevSessions     = sessions.filter(s => s.status !== 'done')
  const prevSessionNames = new Set(prevSessions.map(s => s.name))
  const prevParticipants = participants.filter(p => prevSessionNames.has(p.session))
  const caPrevisionnel   = prevSessions.reduce((total, s) => {
    if (s.typeFT === 'Prest@ppli') return total + (s.montantCA ?? 0)
    const nb = participants.filter(p => p.session === s.name).length
    return total + nb * TARIF_AIF
  }, 0)

  // Frais administratifs : somme des montants des documents de la catégorie frais_admin
  const fraisAdminDocs     = documents.filter(d => d.cat === 'frais_admin')
  const totalFraisAdmin    = fraisAdminDocs.reduce((sum, d) => sum + (d.montant ?? 0), 0)
  const nbFraisAvecMontant = fraisAdminDocs.filter(d => d.montant && d.montant > 0).length

  // Marge nette : CA facturé − budget formateurs − frais administratifs
  const margeNette       = caFacture - budgetTotal - totalFraisAdmin
  const margeIncomplete  = budgetPartiels || (fraisAdminDocs.length > 0 && nbFraisAvecMontant < fraisAdminDocs.length)
  const fmt2 = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const recentSessions = [...sessions].slice(0, 4)

  const statusLabel: Record<string, string> = { active: 'En cours', done: 'Terminée', upcoming: 'À venir' }

  // ── Documents manquants par session ──
  // Prest@ppli = formation collective → pas de bilans individuels
  const getRequiredCats = (s: Session) => {
    const base = [
      { cat: 'factures_financeurs', label: 'Factures financeurs' },
      { cat: 'factures_formateurs', label: 'Factures formateurs' },
      { cat: 'presence',            label: 'Feuilles de présence' },
    ]
    if (s.typeFT !== 'Prest@ppli') {
      base.push({ cat: 'bilans', label: 'Bilans' })
    }
    return base
  }

  const docAlerts = useMemo(() => {
    return sessions.map(s => {
      const sessionDocs = documents.filter(d => d.session?.split(' | ').includes(s.name))
      const required = getRequiredCats(s)
      const missing = required.filter(req => !sessionDocs.some(d => d.cat === req.cat))
      const total = required.length
      const done = total - missing.length
      return { session: s, missing, done, total }
    }).filter(a => a.missing.length > 0)
  }, [sessions, documents])

  return (
    <>
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Vue d'ensemble UMANI</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card animate-in" onClick={() => setActiveView('sessions')}>
          <div className="kpi-label">Sessions actives</div>
          <div className="kpi-value">{active}</div>
          <div className="kpi-meta"><span className="kpi-dot" style={{ background: 'var(--green)' }} />En cours ce mois</div>
        </div>
        <div className="kpi-card animate-in" onClick={() => setActiveView('participants')}>
          <div className="kpi-label">Participants total</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-meta">Hors abandons et absents</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Checklist en retard</div>
          <div className="kpi-value" style={{ color: 'var(--warn)' }}>0</div>
          <div className="kpi-meta"><span className="kpi-dot" style={{ background: 'var(--green)' }} />Tout est à jour</div>
        </div>
        <div className="kpi-card animate-in" onClick={() => setActiveView('sessions')}>
          <div className="kpi-label">Sessions totales</div>
          <div className="kpi-value">{sessions.length}</div>
          <div className="kpi-meta">{done} terminées · {upcoming} à venir</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">CA facturé</div>
          <div className="kpi-value" style={{ fontSize: 24, color: '#16A34A' }}>
            {caFacture > 0 ? `${caFacture.toLocaleString('fr-FR')} €` : '—'}
          </div>
          <div className="kpi-meta">
            <span className="kpi-dot" style={{ background: 'var(--green)' }} />
            {nbFacturesAIF > 0 && `${nbFacturesAIF} AIF`}
            {nbFacturesAIF > 0 && nbSessionsPrestappli > 0 && ' · '}
            {nbSessionsPrestappli > 0 && `${nbSessionsPrestappli} Prest@ppli`}
          </div>
        </div>
        {caPrevisionnel > 0 && (
          <div className="kpi-card animate-in" onClick={() => setActiveView('sessions')}>
            <div className="kpi-label">CA prévisionnel</div>
            <div className="kpi-value" style={{ fontSize: 24, color: '#7C3AED' }}>
              {caPrevisionnel.toLocaleString('fr-FR')} €
            </div>
            <div className="kpi-meta">
              <span className="kpi-dot" style={{ background: '#7C3AED' }} />
              {prevParticipants.length} participant{prevParticipants.length > 1 ? 's' : ''} · {prevSessionNames.size} session{prevSessionNames.size > 1 ? 's' : ''} en cours ou à venir
            </div>
          </div>
        )}
        <div className="kpi-card animate-in">
          <div className="kpi-label">Budget formateurs total</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>
            {budgetTotal > 0 ? `${budgetTotal.toLocaleString('fr-FR')} €` : '—'}
          </div>
          <div className="kpi-meta">
            <span className="kpi-dot" style={{ background: budgetPartiels ? 'var(--warn)' : 'var(--green)' }} />
            {budgetPartiels ? 'Tarifs partiels' : `${sessions.filter(s => s.planning).length} sessions tarifées`}
          </div>
        </div>
        <div className="kpi-card animate-in" onClick={() => setActiveView('documents')}>
          <div className="kpi-label">Frais administratifs</div>
          <div className="kpi-value" style={{ fontSize: 24, color: '#78716C' }}>
            {totalFraisAdmin > 0 ? `${fmt2(totalFraisAdmin)} €` : '—'}
          </div>
          <div className="kpi-meta">
            <span className="kpi-dot" style={{ background: fraisAdminDocs.length > 0 ? '#78716C' : 'var(--text-tertiary)' }} />
            {fraisAdminDocs.length === 0
              ? 'Aucune facture uploadée'
              : `${fraisAdminDocs.length} document${fraisAdminDocs.length > 1 ? 's' : ''} · ${nbFraisAvecMontant} avec montant`
            }
          </div>
        </div>
        {caFacture > 0 && (
          <div className="kpi-card animate-in">
            <div className="kpi-label">Marge nette</div>
            <div className="kpi-value" style={{ fontSize: 24, color: margeNette >= 0 ? '#16A34A' : '#DC2626' }}>
              {fmt2(margeNette)} €
            </div>
            <div className="kpi-meta">
              <span className="kpi-dot" style={{ background: margeIncomplete ? 'var(--warn)' : margeNette >= 0 ? 'var(--green)' : '#DC2626' }} />
              {margeIncomplete ? 'Données partielles' : 'CA − formateurs − admin'}
            </div>
          </div>
        )}
      </div>

      {/* Body grid */}
      <div className="dash-grid">
        {/* Sessions récentes */}
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">Sessions récentes</div>
            <span className="card-action" onClick={() => setActiveView('sessions')}>Voir tout →</span>
          </div>
          {recentSessions.length === 0 && (
            <div style={{ padding: '20px', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>Aucune session</div>
          )}
          {recentSessions.map(s => (
            <div key={s.id} className="session-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedSession(s)}>
              <div className={`session-dot ${s.status}`} />
              <div className="session-info">
                <div className="session-name">{s.name}</div>
                <div className="session-meta">
                  <span>{s.dates}</span>
                  <span className={`tag tag-${s.financeur === 'France Travail' ? 'ft' : 'opco'}`}>{s.financeur}</span>
                  <span className={`tag tag-${s.duree.replace('h', 'h')}`}>{s.duree}</span>
                </div>
              </div>
              <span className="session-participants">{participants.filter(p => p.session === s.name && p.assiduite !== 'abandonne' && p.assiduite !== 'jamais_presente').length} participants</span>
            </div>
          ))}
        </div>

        {/* Mini-calendrier */}
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">Calendrier</div>
            <span className="card-action" onClick={() => setActiveView('calendrier')}>Voir le planning →</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div className="mini-cal-nav">
              <button className="btn btn-sm" onClick={miniPrev} style={{ padding: '2px 6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3l-5 5 5 5"/></svg>
              </button>
              <span className="mini-cal-label">{MOIS_FR_SHORT[miniMonth]} {miniYear}</span>
              <button className="btn btn-sm" onClick={miniNext} style={{ padding: '2px 6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
              </button>
            </div>
            <div className="mini-cal-grid">
              {JOURS_MINI.map((j, i) => <div key={i} className="mini-cal-header">{j}</div>)}
              {miniDays.map(({ date, inMonth }, i) => {
                const isToday = isSameDay(date, today)
                const hasSession = sessionRanges.some(({ range }) => isInRange(date, range[0], range[1]))
                return (
                  <div
                    key={i}
                    className={[
                      'mini-cal-day',
                      !inMonth && 'outside',
                      isToday && 'today',
                      hasSession && inMonth && 'has-session',
                    ].filter(Boolean).join(' ')}
                    onClick={hasSession && inMonth ? () => setActiveView('calendrier') : undefined}
                  >
                    {date.getDate()}
                  </div>
                )
              })}
            </div>
            {sessionRanges.filter(({ range }) => {
              const ms = new Date(miniYear, miniMonth, 1), me = new Date(miniYear, miniMonth + 1, 0)
              return range[0] <= me && range[1] >= ms
            }).length === 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>Aucune session ce mois</div>
            )}
          </div>
        </div>
      </div>

      {/* Alertes documents manquants */}
      {docAlerts.length > 0 && (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--warn)' }}>⚠</span> Documents manquants
              <span style={{ fontFamily: 'DM Mono', fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--warn-bg)', color: 'var(--warn)', border: '1px solid #FDE68A' }}>
                {docAlerts.reduce((sum, a) => sum + a.missing.length, 0)}
              </span>
            </div>
          </div>
          {docAlerts.map(({ session: s, missing, done: d, total: t }) => (
            <div
              key={s.id}
              className="session-item"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedSession(s)}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--warn-bg)', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>📁</div>
              <div className="session-info">
                <div className="session-name">{s.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {missing.map(m => (
                    <span key={m.cat} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid #FECACA', fontFamily: 'DM Mono' }}>
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 12, color: d > 0 ? 'var(--warn)' : 'var(--red)', fontFamily: 'DM Mono', flexShrink: 0 }}>
                {d}/{t}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>

    {selectedSession && (
      <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    )}
    </>
  )
}
