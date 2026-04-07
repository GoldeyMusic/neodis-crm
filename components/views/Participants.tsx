'use client'
import { useState, useMemo } from 'react'
import { useCRM } from '@/lib/store'
import { Participant } from '@/lib/data'
import ParticipantModal from '../modals/ParticipantModal'

type SortKey = 'nom' | 'nomArtiste' | 'session' | 'tel' | 'titreSingle'
type SortDir = 'asc' | 'desc'

export default function Participants() {
  const { participants, sessions, showToast } = useCRM()
  const [selected, setSelected] = useState<Participant | null>(null)
  const [search, setSearch] = useState('')
  const [filterSession, setFilterSession] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('nom')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const list = participants.filter(p => {
      const matchSession = filterSession === 'all' || p.session === filterSession
      const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase()) || p.nomArtiste.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
      return matchSession && matchSearch
    })
    const mult = sortDir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      const va = (a[sortKey] || '—').toLowerCase()
      const vb = (b[sortKey] || '—').toLowerCase()
      return va < vb ? -1 * mult : va > vb ? 1 * mult : 0
    })
  }, [participants, filterSession, search, sortKey, sortDir])

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" style={{ marginLeft: 4, opacity: 0.4 }}><path d="M3 4l2-2 2 2M3 6l2 2 2-2"/></svg>
    return sortDir === 'asc'
      ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginLeft: 4 }}><path d="M3 6l2-2 2 2"/></svg>
      : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginLeft: 4 }}><path d="M3 4l2 2 2-2"/></svg>
  }

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">Participants</div>
          <div className="page-subtitle">{participants.length} participant{participants.length > 1 ? 's' : ''} au total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => showToast('Importer Google Sheets — activer le Sheet en accès public d\'abord')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#34A853" opacity=".15"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Importer Google Sheets
          </button>
          <button className="btn btn-primary" onClick={() => showToast('Ajouter un participant — à connecter')}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Rechercher par nom, artiste, email…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <select className="form-input" value={filterSession} onChange={e => setFilterSession(e.target.value)} style={{ width: 240 }}>
          <option value="all">Toutes les sessions</option>
          {sessions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="card animate-in">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('nom')}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>Nom civil{sortIcon('nom')}</span>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('nomArtiste')}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>Nom d'artiste{sortIcon('nomArtiste')}</span>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('session')}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>Session{sortIcon('session')}</span>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('tel')}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>Téléphone{sortIcon('tel')}</span>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('titreSingle')}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>Single{sortIcon('titreSingle')}</span>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 32 }}>Aucun participant trouvé</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} onClick={() => setSelected(p)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar">{p.initials}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.nom}</div>
                      {p.email !== '—' && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.email}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.nomArtiste || '—'}</td>
                <td>
                  <span className="tag tag-ft" style={{ fontSize: 11 }}>{p.session.replace('Promo UMANI ', '')}</span>
                </td>
                <td style={{ color: 'var(--text-tertiary)', fontFamily: 'DM Mono', fontSize: 12 }}>{p.tel}</td>
                <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{p.titreSingle || '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="tbl-action" onClick={() => setSelected(p)}>Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <ParticipantModal participant={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
