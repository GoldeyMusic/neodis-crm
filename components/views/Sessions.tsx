'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import { Session } from '@/lib/data'
import SessionModal from '../modals/SessionModal'
import NewSessionModal from '../modals/NewSessionModal'

// Extrait l'année depuis un champ dates ex. "20 oct. — 24 oct. 2025" → 2025
function extractYear(dates: string): number {
  const m = dates.match(/\d{4}/)
  return m ? parseInt(m[0]) : 0
}

const CURRENT_YEAR = new Date().getFullYear()

export default function Sessions() {
  const { sessions, participants } = useCRM()
  const [selected, setSelected] = useState<Session | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(true)

  const statusLabel: Record<string, string> = { active: 'En cours', done: 'Terminée', upcoming: 'À venir' }

  // Filtre texte + statut/financeur
  const matchesFilter = (s: Session) => {
    const matchFilter = filter === 'all' || s.status === filter || s.financeur === filter
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      || s.dates.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  }

  // Sessions correspondant aux filtres actifs
  const allFiltered = sessions.filter(matchesFilter)

  const visibleSessions = allFiltered
  const hiddenCount = 0

  // Groupement par année pour l'historique complet
  const useGrouping = showAll && !search && filter === 'all'
  const years = useGrouping
    ? Array.from(new Set(visibleSessions.map(s => extractYear(s.dates)))).sort((a, b) => b - a)
    : []

  const SessionRow = ({ s }: { s: Session }) => {
    const count = participants.filter(p => p.session === s.name).length
    return (
      <div key={s.id} className="session-item" onClick={() => setSelected(s)}>
        <div className={`session-dot ${s.status}`} />
        <div className="session-info">
          <div className="session-name">{s.name}</div>
          <div className="session-meta">
            <span>{s.dates}</span>
            <span className={`tag tag-${s.financeur === 'France Travail' ? 'ft' : 'opco'}`}>{s.financeur}</span>
            {s.typeFT && <span className="tag">{s.typeFT}</span>}
            <span className={`tag tag-${s.duree}`}>{s.duree}</span>
            <span className={`status-pill ${s.status}`}>{statusLabel[s.status]}</span>
          </div>
        </div>
        <span className="session-participants">{count || s.participants} participants</span>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Sessions</div>
          <div className="page-subtitle">{sessions.length} session{sessions.length > 1 ? 's' : ''} au total</div>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
          Nouvelle session
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Rechercher une session…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        {['all', 'active', 'upcoming', 'done', 'France Travail', 'OPCO'].map(f => (
          <button key={f} className="btn btn-sm"
            style={filter === f ? { background: 'var(--text-primary)', color: 'white', borderColor: 'var(--text-primary)' } : {}}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'Toutes' : f === 'active' ? 'En cours' : f === 'upcoming' ? 'À venir' : f === 'done' ? 'Terminées' : f}
          </button>
        ))}
      </div>

      {/* Liste */}
      {visibleSessions.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Aucune session trouvée
        </div>
      ) : useGrouping ? (
        // Vue historique groupée par année
        years.map(year => {
          const yearSessions = visibleSessions.filter(s => extractYear(s.dates) === year)
          return (
            <div key={year} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 2 }}>
                {year} · {yearSessions.length} session{yearSessions.length > 1 ? 's' : ''}
              </div>
              <div className="card">
                {yearSessions.map(s => <SessionRow key={s.id} s={s} />)}
              </div>
            </div>
          )
        })
      ) : (
        <div className="card animate-in">
          {visibleSessions.map(s => <SessionRow key={s.id} s={s} />)}
        </div>
      )}

      {/* Lien voir tout / réduire */}
      {hiddenCount > 0 && !showAll && (
        <button
          className="btn btn-sm"
          style={{ marginTop: 12, width: '100%', justifyContent: 'center', color: 'var(--text-tertiary)' }}
          onClick={() => setShowAll(true)}
        >
          Voir tout l'historique · {hiddenCount} session{hiddenCount > 1 ? 's' : ''} plus ancienne{hiddenCount > 1 ? 's' : ''}
        </button>
      )}
      {showAll && filter === 'all' && !search && (
        <button
          className="btn btn-sm"
          style={{ marginTop: 12, width: '100%', justifyContent: 'center', color: 'var(--text-tertiary)' }}
          onClick={() => setShowAll(false)}
        >
          Réduire l'historique
        </button>
      )}

      {selected && <SessionModal session={selected} onClose={() => setSelected(null)} />}
      {newOpen && <NewSessionModal onClose={() => setNewOpen(false)} />}
    </div>
  )
}
