'use client'
import { useState, useMemo } from 'react'
import { useCRM } from '@/lib/store'
import { Session } from '@/lib/data'
import SessionModal from '../modals/SessionModal'

/* ── Helpers dates ── */

const MOIS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
const MOIS_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

/** Parse une date abrégée française ("20 oct. 2025" ou "4 avril 2025") → Date */
function parseDateFR(str: string): Date | null {
  const s = str.trim().toLowerCase()
  // Formats supportés : "20 oct. 2025", "4 avril 2025", "20 oct 2025"
  const match = s.match(/(\d{1,2})\s+(\S+?)\.?\s+(\d{4})/)
  if (!match) return null
  const day = parseInt(match[1])
  const monthStr = match[2].replace('.', '')
  const year = parseInt(match[3])
  const monthAbbrevs = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc']
  const monthFull = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  let monthIdx = monthAbbrevs.findIndex(m => monthStr.startsWith(m))
  if (monthIdx === -1) monthIdx = monthFull.findIndex(m => monthStr.startsWith(m))
  if (monthIdx === -1) return null
  return new Date(year, monthIdx, day)
}

/** Parse la plage de dates d'une session ("20 oct. — 24 oct. 2025") → [debut, fin] */
function parseDateRange(dates: string): [Date, Date] | null {
  // Séparer par — ou -
  const parts = dates.split(/\s*[—–-]\s*/)
  if (parts.length < 2) return null
  const end = parseDateFR(parts[1].trim())
  if (!end) return null
  // La partie gauche peut ne pas avoir l'année → on prend celle de la fin
  let startStr = parts[0].trim()
  if (!/\d{4}/.test(startStr)) startStr += ` ${end.getFullYear()}`
  const start = parseDateFR(startStr)
  if (!start) return null
  return [start, end]
}

/** Toutes les dates d'un mois donné (grille lundi→dimanche) */
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Lundi = 0 dans notre grille
  let startOffset = (firstDay.getDay() + 6) % 7 // 0=lun, 6=dim
  const days: { date: Date; inMonth: boolean }[] = []
  // Jours du mois précédent
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, inMonth: false })
  }
  // Jours du mois
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true })
  }
  // Jours du mois suivant pour compléter la grille
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - startOffset - lastDay.getDate() + 1)
    days.push({ date: d, inMonth: false })
  }
  return days
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isInRange(day: Date, start: Date, end: Date) {
  const d = day.getTime()
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return d >= s && d <= e
}

/* ── Couleurs par session (rotation) ── */
const SESSION_COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },  // bleu
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED' },  // violet
  { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },  // orange
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },  // vert
  { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },  // rouge
  { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },  // ambre
]

/* ── Composant principal ── */

export default function Calendrier() {
  const { sessions, formateurs } = useCRM()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  // Sessions parsées avec leurs plages de dates
  const sessionRanges = useMemo(() => {
    return sessions.map((s, idx) => {
      const range = parseDateRange(s.dates)
      return { session: s, range, color: SESSION_COLORS[idx % SESSION_COLORS.length] }
    }).filter(sr => sr.range !== null) as { session: Session; range: [Date, Date]; color: typeof SESSION_COLORS[0] }[]
  }, [sessions])

  // Sessions visibles ce mois
  const visibleSessions = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    return sessionRanges.filter(({ range }) => {
      return range[0] <= monthEnd && range[1] >= monthStart
    })
  }, [sessionRanges, currentMonth, currentYear])

  const calendarDays = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth])

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()) }

  // Formateurs noms pour le tooltip
  const getFormateurs = (session: Session) => {
    if (!session.planning) return []
    return session.planning.map(p => {
      const f = formateurs.find(f => f.id === p.formateurId)
      return f ? f.nom : ''
    }).filter(Boolean)
  }

  return (
    <>
      <div>
        <div className="page-header animate-in">
          <div>
            <div className="page-title">Calendrier</div>
            <div className="page-subtitle">Planning des sessions de formation</div>
          </div>
        </div>

        {/* Navigation mois */}
        <div className="cal-nav animate-in">
          <button className="btn btn-sm" onClick={prevMonth}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3l-5 5 5 5"/></svg>
          </button>
          <button className="btn btn-sm" onClick={goToday}>Aujourd'hui</button>
          <button className="btn btn-sm" onClick={nextMonth}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
          </button>
          <span className="cal-month-label">{MOIS_LONG[currentMonth]} {currentYear}</span>
        </div>

        {/* Légende sessions */}
        {visibleSessions.length > 0 && (
          <div className="cal-legend animate-in">
            {visibleSessions.map(({ session, color }) => (
              <div
                key={session.id}
                className="cal-legend-item"
                style={{ background: color.bg, borderColor: color.border, color: color.text }}
                onClick={() => setSelectedSession(session)}
              >
                <span className="cal-legend-dot" style={{ background: color.text }} />
                {session.name}
                <span className="cal-legend-meta">{session.dates}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grille calendrier */}
        <div className="cal-grid card animate-in">
          {/* En-tête jours */}
          <div className="cal-header">
            {JOURS.map(j => (
              <div key={j} className="cal-header-cell">{j}</div>
            ))}
          </div>

          {/* Cellules */}
          <div className="cal-body">
            {calendarDays.map(({ date, inMonth }, idx) => {
              const isToday = isSameDay(date, today)
              const daySessions = visibleSessions.filter(({ range }) => isInRange(date, range[0], range[1]))
              const isWeekend = date.getDay() === 0 || date.getDay() === 6

              return (
                <div
                  key={idx}
                  className={[
                    'cal-cell',
                    !inMonth && 'cal-cell-outside',
                    isToday && 'cal-cell-today',
                    isWeekend && 'cal-cell-weekend',
                  ].filter(Boolean).join(' ')}
                >
                  <div className={`cal-day-num${isToday ? ' cal-today-badge' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="cal-events">
                    {daySessions.map(({ session, range, color }) => {
                      const isStart = isSameDay(date, range[0])
                      const isEnd = isSameDay(date, range[1])
                      const fmtrs = getFormateurs(session)
                      return (
                        <div
                          key={session.id}
                          className={[
                            'cal-event',
                            isStart && 'cal-event-start',
                            isEnd && 'cal-event-end',
                          ].filter(Boolean).join(' ')}
                          style={{
                            background: color.bg,
                            borderColor: color.border,
                            color: color.text,
                          }}
                          title={`${session.name}\n${session.dates}\n${fmtrs.length > 0 ? 'Formateurs : ' + fmtrs.join(', ') : ''}`}
                          onClick={() => setSelectedSession(session)}
                        >
                          {isStart && (
                            <span className="cal-event-label">{session.name.length > 18 ? session.name.slice(0, 16) + '…' : session.name}</span>
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

        {/* Détail des sessions du mois */}
        {visibleSessions.length > 0 && (
          <div className="cal-details animate-in">
            <div className="card">
              <div className="card-header">
                <div className="card-title">Sessions ce mois</div>
              </div>
              {visibleSessions.map(({ session, color }) => {
                const fmtrs = getFormateurs(session)
                const statusLabel: Record<string, string> = { active: 'En cours', done: 'Terminée', upcoming: 'À venir' }
                return (
                  <div
                    key={session.id}
                    className="session-item"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="cal-detail-color" style={{ background: color.text }} />
                    <div className="session-info">
                      <div className="session-name">{session.name}</div>
                      <div className="session-meta">
                        <span>{session.dates}</span>
                        <span className={`tag tag-${session.financeur === 'France Travail' ? 'ft' : 'opco'}`}>{session.financeur}</span>
                        <span className={`status-pill ${session.status}`}>{statusLabel[session.status] ?? session.status}</span>
                      </div>
                      {fmtrs.length > 0 && (
                        <div className="cal-detail-formateurs">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="4" r="3"/><path d="M2 14s0-4 6-4 6 4 6 4"/></svg>
                          {fmtrs.join(' · ')}
                        </div>
                      )}
                    </div>
                    <span className="session-participants">{session.participants} participants</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {visibleSessions.length === 0 && (
          <div className="cal-empty animate-in">
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📅</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                Aucune session prévue en {MOIS_LONG[currentMonth].toLowerCase()} {currentYear}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSession && (
        <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </>
  )
}
