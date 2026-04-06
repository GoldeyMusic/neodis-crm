'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import { Session } from '@/lib/data'
import SessionModal from '../modals/SessionModal'

export default function Dashboard() {
  const { sessions, participants, formateurs, documents, setActiveView } = useCRM()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const active = sessions.filter(s => s.status === 'active').length
  const total = participants.length
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
  const caFacture = sessions.reduce((total, s) => {
    if (s.typeFT === 'Prest@ppli') {
      // Forfait global — comptabilisé si la session est terminée et a un montant défini
      const sessionDone = s.status === 'done'
      const hasFacture  = participants.some(p => p.session === s.name && p.factures && p.factures !== '—')
      if ((sessionDone || hasFacture) && s.montantCA) return total + s.montantCA
    } else {
      // AIF : un participant = une facture individuelle
      const linked = participants.filter(p => p.session === s.name && p.factures && p.factures !== '—').length
      return total + linked * TARIF_AIF
    }
    return total
  }, 0)

  // Détail pour le sous-titre du KPI
  const nbFacturesAIF       = participants.filter(p => {
    const s = sessions.find(s => s.name === p.session)
    return s?.typeFT !== 'Prest@ppli' && p.factures && p.factures !== '—'
  }).length
  const nbSessionsPrestappli = sessions.filter(s => s.typeFT === 'Prest@ppli' && s.montantCA && (s.status === 'done' || participants.some(p => p.session === s.name && p.factures && p.factures !== '—'))).length

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
          <div className="kpi-meta">Tous statuts confondus</div>
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
              <span className="session-participants">{s.participants} participants</span>
            </div>
          ))}
        </div>

        {/* Alertes */}
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">Alertes checklist</div>
          </div>
          <div style={{ padding: '20px', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            ✓ Aucune alerte en cours
          </div>
        </div>
      </div>
    </div>

    {selectedSession && (
      <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    )}
    </>
  )
}
