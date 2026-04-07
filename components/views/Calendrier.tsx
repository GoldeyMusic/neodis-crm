'use client'
import { useState, useMemo } from 'react'
import { useCRM } from '@/lib/store'
import { Session, PlanningEntry } from '@/lib/data'
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

/* ── Parser de planning : extrait jour + créneau depuis le texte du module ── */
type Slot = 'matin' | 'am' | 'soir' | 'journee'

interface DaySlot {
  day: number           // 1-based day index (J1, J2, ...)
  slot: Slot            // matin, am (après-midi), soir, journee
  module: string        // nom du module (sans la parenthèse)
  formateurId: number
}

/**
 * Parse un module comme "MAO (J2 à J5 après-midi)" en slots par jour.
 * Patterns reconnus :
 *  - "J1 matin"           → jour 1, matin
 *  - "J2 + J4 matin"      → jours 2 et 4, matin
 *  - "J2 à J5 après-midi" → jours 2,3,4,5, après-midi
 *  - "J1 AM"              → jour 1, après-midi
 *  - "J1 AM + J2 + J4 matin" → J1 am, J2 journée, J4 matin
 *  - Pas de parenthèse    → pas de slot (masterclass, etc.)
 */
function parseModuleSlots(entry: PlanningEntry): DaySlot[] {
  const raw = entry.module
  const moduleName = raw.replace(/\s*\(.*\)\s*$/, '').trim()

  // Extraire le contenu entre parenthèses
  const parenMatch = raw.match(/\(([^)]+)\)/)
  if (!parenMatch) return []

  const inside = parenMatch[1].trim()
  const results: DaySlot[] = []

  // Séparer par "+" pour gérer "J1 AM + J2 + J4 matin"
  const parts = inside.split(/\s*\+\s*/)

  // Détecter le slot global (le dernier mot de toute l'expression)
  const globalSlotMatch = inside.match(/(matin|après-midi|après midi|AM|soir)$/i)
  const globalSlot: Slot | null = globalSlotMatch
    ? globalSlotMatch[1].toLowerCase() === 'matin' ? 'matin'
      : globalSlotMatch[1].toLowerCase() === 'soir' ? 'soir'
      : 'am'
    : null

  const toSlot = (s: string): Slot => {
    const l = s.toLowerCase()
    if (l === 'matin') return 'matin'
    if (l === 'soir') return 'soir'
    return 'am'
  }

  for (const part of parts) {
    const p = part.trim()

    // "J2 à J5 ..." → range
    const rangeMatch = p.match(/J(\d+)\s*(?:à|a|-)\s*J(\d+)/i)
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1])
      const to = parseInt(rangeMatch[2])
      const localSlotMatch = p.match(/(matin|après-midi|après midi|AM|soir)/i)
      const slot: Slot = localSlotMatch ? toSlot(localSlotMatch[1]) : globalSlot ?? 'journee'
      for (let d = from; d <= to; d++) {
        results.push({ day: d, slot, module: moduleName, formateurId: entry.formateurId })
      }
      continue
    }

    // "J3 matin" ou "J1 AM" ou "J3 soir" ou juste "J2"
    const singleMatch = p.match(/J(\d+)(?:\s+(matin|après-midi|après midi|AM|soir))?/i)
    if (singleMatch) {
      const dayNum = parseInt(singleMatch[1])
      const slot: Slot = singleMatch[2] ? toSlot(singleMatch[2]) : globalSlot ?? 'journee'
      results.push({ day: dayNum, slot, module: moduleName, formateurId: entry.formateurId })
    }
  }

  return results
}

/**
 * Pour une session donnée, génère la map date → slots de la journée
 */
function buildSessionDayMap(session: Session, range: [Date, Date], formateurs: { id: number; nom: string }[]): Map<string, { matin: DaySlot[]; am: DaySlot[]; soir: DaySlot[] }> {
  const map = new Map<string, { matin: DaySlot[]; am: DaySlot[]; soir: DaySlot[] }>()

  if (!session.planning) return map

  // Lister les jours ouvrés de la session (lun-ven)
  const workDays: Date[] = []
  const cur = new Date(range[0])
  while (cur <= range[1]) {
    const dow = cur.getDay()
    if (dow >= 1 && dow <= 5) {
      workDays.push(new Date(cur))
    }
    cur.setDate(cur.getDate() + 1)
  }

  // Parser chaque entrée de planning
  const allSlots: DaySlot[] = []
  for (const entry of session.planning) {
    const slots = parseModuleSlots(entry)
    allSlots.push(...slots)
  }

  // Mapper les slots sur les dates
  for (const slot of allSlots) {
    const dayIdx = slot.day - 1 // J1 → index 0
    if (dayIdx < 0 || dayIdx >= workDays.length) continue
    const dateKey = workDays[dayIdx].toISOString().slice(0, 10)
    if (!map.has(dateKey)) map.set(dateKey, { matin: [], am: [], soir: [] })
    const dayData = map.get(dateKey)!
    if (slot.slot === 'matin') {
      dayData.matin.push(slot)
    } else if (slot.slot === 'am') {
      dayData.am.push(slot)
    } else if (slot.slot === 'soir') {
      dayData.soir.push(slot)
    } else {
      // journée entière → matin + am
      dayData.matin.push(slot)
      dayData.am.push(slot)
    }
  }

  return map
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

  // Day maps : pour chaque session, map date → slots matin/am
  const dayMaps = useMemo(() => {
    const maps = new Map<number, Map<string, { matin: DaySlot[]; am: DaySlot[]; soir: DaySlot[] }>>()
    for (const { session, range } of sessionRanges) {
      maps.set(session.id, buildSessionDayMap(session, range, formateurs))
    }
    return maps
  }, [sessionRanges, formateurs])

  // Helper : formateur nom court (prénom ou premier mot)
  const fmtShort = (formateurId: number) => {
    const f = formateurs.find(f => f.id === formateurId)
    if (!f) return ''
    const parts = f.nom.split(' ')
    return parts.length > 1 ? parts[0] : f.nom
  }

  // State pour jour sélectionné (affiche le détail)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

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
                    selectedDay && isSameDay(date, selectedDay) && 'cal-cell-selected',
                  ].filter(Boolean).join(' ')}
                  onClick={() => daySessions.length > 0 && setSelectedDay(date)}
                  style={daySessions.length > 0 ? { cursor: 'pointer' } : undefined}
                >
                  <div className={`cal-day-num${isToday ? ' cal-today-badge' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="cal-events">
                    {daySessions.map(({ session, range, color }) => {
                      const dateKey = date.toISOString().slice(0, 10)
                      const dayData = dayMaps.get(session.id)?.get(dateKey)
                      const hasPlanningDetail = dayData && (dayData.matin.length > 0 || dayData.am.length > 0 || dayData.soir.length > 0)

                      return (
                        <div
                          key={session.id}
                          className="cal-event-detail"
                          style={{ borderLeftColor: color.text, background: color.bg }}
                          onClick={(e) => { e.stopPropagation(); setSelectedDay(date); setSelectedSession(null) }}
                        >
                          {hasPlanningDetail ? (
                            <>
                              {dayData.matin.length > 0 && (
                                <div className="cal-slot">
                                  <span className="cal-slot-period">AM</span>
                                  {dayData.matin.map((s, i) => (
                                    <span key={i} className="cal-slot-entry" style={{ color: color.text }}>
                                      {s.module} <span className="cal-slot-fmtr">{fmtShort(s.formateurId)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {dayData.am.length > 0 && (
                                <div className="cal-slot">
                                  <span className="cal-slot-period">PM</span>
                                  {dayData.am.map((s, i) => (
                                    <span key={i} className="cal-slot-entry" style={{ color: color.text }}>
                                      {s.module} <span className="cal-slot-fmtr">{fmtShort(s.formateurId)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {dayData.soir.length > 0 && (
                                <div className="cal-slot">
                                  <span className="cal-slot-period">SO</span>
                                  {dayData.soir.map((s, i) => (
                                    <span key={i} className="cal-slot-entry" style={{ color: color.text }}>
                                      {s.module} <span className="cal-slot-fmtr">{fmtShort(s.formateurId)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="cal-event-label" style={{ color: color.text }}>
                              {session.name.length > 16 ? session.name.slice(0, 14) + '…' : session.name}
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

        {/* Détail jour sélectionné */}
        {selectedDay && (() => {
          const dayKey = selectedDay.toISOString().slice(0, 10)
          const daySes = visibleSessions.filter(({ range }) => isInRange(selectedDay, range[0], range[1]))
          const dayLabel = selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          if (daySes.length === 0) return null
          return (
            <div className="cal-details animate-in">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ textTransform: 'capitalize' }}>{dayLabel}</div>
                  <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12 }}>Fermer</button>
                </div>
                {daySes.map(({ session, color }) => {
                  const dayData = dayMaps.get(session.id)?.get(dayKey)
                  const hasDetail = dayData && (dayData.matin.length > 0 || dayData.am.length > 0 || dayData.soir.length > 0)
                  return (
                    <div key={session.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasDetail ? 10 : 0 }}>
                        <div style={{ width: 4, height: 28, borderRadius: 2, background: color.text, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }} onClick={() => setSelectedSession(session)}>{session.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{session.dates}</div>
                        </div>
                      </div>
                      {hasDetail && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 14 }}>
                          {dayData.matin.length > 0 && (
                            <div className="cal-day-slot-row">
                              <span className="cal-day-slot-badge" style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Matin</span>
                              <div className="cal-day-slot-entries">
                                {dayData.matin.map((s, i) => {
                                  const f = formateurs.find(f => f.id === s.formateurId)
                                  return (
                                    <div key={i} className="cal-day-slot-entry">
                                      <span style={{ fontWeight: 500, fontSize: 13 }}>{s.module}</span>
                                      {f && (
                                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="4" r="3"/><path d="M2 14s0-4 6-4 6 4 6 4"/></svg>
                                          {f.nom}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {dayData.am.length > 0 && (
                            <div className="cal-day-slot-row">
                              <span className="cal-day-slot-badge" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>Après-midi</span>
                              <div className="cal-day-slot-entries">
                                {dayData.am.map((s, i) => {
                                  const f = formateurs.find(f => f.id === s.formateurId)
                                  return (
                                    <div key={i} className="cal-day-slot-entry">
                                      <span style={{ fontWeight: 500, fontSize: 13 }}>{s.module}</span>
                                      {f && (
                                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="4" r="3"/><path d="M2 14s0-4 6-4 6 4 6 4"/></svg>
                                          {f.nom}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {dayData.soir.length > 0 && (
                            <div className="cal-day-slot-row">
                              <span className="cal-day-slot-badge" style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>Soir</span>
                              <div className="cal-day-slot-entries">
                                {dayData.soir.map((s, i) => {
                                  const f = formateurs.find(f => f.id === s.formateurId)
                                  return (
                                    <div key={i} className="cal-day-slot-entry">
                                      <span style={{ fontWeight: 500, fontSize: 13 }}>{s.module}</span>
                                      {f && (
                                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="4" r="3"/><path d="M2 14s0-4 6-4 6 4 6 4"/></svg>
                                          {f.nom}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Sessions du mois (quand aucun jour sélectionné) */}
        {!selectedDay && visibleSessions.length > 0 && (
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
