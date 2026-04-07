'use client'
import { useState, useMemo } from 'react'
import { useCRM } from '@/lib/store'
import { Participant, ImpactEntry } from '@/lib/data'

// ── CATÉGORISATION ──────────────────────────────────────────────────────────
const CAT_KEYWORDS: Record<string, string[]> = {
  technique:     ['mao', 'logic', 'logiciel', 'production', 'séquenc', 'outil', 'suno', 'spotify', 'platform', 'intelligence artificielle', 'mixage', 'enregistr', 'numérique', 'ableton', 'studio', 'masterclass', ' ia ', 'daw', 'plugin'],
  confiance:     ['confianc', 'autonomi', 'déclic', 'oser', 'cap ', 'assumer', 'rassur', 'motivant', "état d'esprit", 'disciplin', 'certaine', 'tournant', 'capaci', 'timid', 'structur'],
  professionnel: ['concert', 'single', 'sortie', 'streaming', 'youtube', 'stratégi', 'calendrier', 'carrièr', 'live', 'professionnel', 'chorus', 'édition', 'marketing', 'réseaux sociaux', 'distribut', 'scène', 'composi', 'titre', 'release', 'label'],
  reseau:        ['lien', 'contact', 'martiniquais', 'paysage', 'socioculturel', 'réseau', 'ultra-marin', 'outre-mer', 'région', 'considér', 'communauté', 'artiste de la formation', 'ultra marin'],
}

const CAT_META: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  technique:     { label: 'Technique & Outils',        icon: '🎛', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  confiance:     { label: 'Confiance & Mindset',       icon: '💪', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  professionnel: { label: 'Activité Professionnelle',  icon: '🎤', color: '#16A34A', bg: '#F0FFF4', border: '#BBF7D0' },
  reseau:        { label: 'Réseau & Communauté',       icon: '🤝', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
}

const PROOF_PATTERNS: { pattern: RegExp; label: string; icon: string }[] = [
  { pattern: /premier concert|concert guitare|donné.*concert|scène/i,       label: 'Concert / Scène',       icon: '🎤' },
  { pattern: /logic en live|utilisé logic|mao.*live|séquence.*live/i,       label: 'MAO en live',           icon: '🎹' },
  { pattern: /composé.*titre|réalisé.*titre|premier titre|finalise.*projet/i, label: 'Production musicale', icon: '🎵' },
  { pattern: /sortie.*single|single.*sortie|stratégie.*singles/i,            label: 'Sorties planifiées',   icon: '📅' },
  { pattern: /youtube|stratégi.*réseaux|identité visuelle/i,                 label: 'Stratégie digitale',   icon: '📱' },
  { pattern: /calendrier.*2026|plan.*2026|objectifs.*2026/i,                 label: 'Plan carrière 2026',   icon: '🗓' },
  { pattern: /première fois/i,                                               label: 'Première fois',        icon: '⭐' },
]

function extractProofs(verbatim: string): { label: string; icon: string; sentence: string }[] {
  if (!verbatim) return []
  const sentences = verbatim.split(/[.\n!?]+/).map(s => s.trim()).filter(Boolean)
  const found: { label: string; icon: string; sentence: string }[] = []
  for (const { pattern, label, icon } of PROOF_PATTERNS) {
    const sentence = sentences.find(s => pattern.test(s))
    if (sentence && !found.find(f => f.label === label)) found.push({ label, icon, sentence })
  }
  return found
}

function categorizeVerbatim(verbatim: string): Record<string, string[]> {
  if (!verbatim) return { technique: [], confiance: [], professionnel: [], reseau: [] }
  const sentences = verbatim.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 15)
  const result: Record<string, string[]> = { technique: [], confiance: [], professionnel: [], reseau: [] }
  for (const sentence of sentences) {
    const low = sentence.toLowerCase()
    for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
      if (keywords.some(k => low.includes(k))) { result[cat].push(sentence); break }
    }
  }
  return result
}

function computeScore(entry: ImpactEntry | undefined): number {
  if (!entry) return 0
  let score = 0
  if (entry.verbatim?.trim()) score += 25
  if (entry.statut === 'activite') score += 30
  else if (entry.statut === 'recherche') score += 15
  const proofs = extractProofs(entry.verbatim ?? '')
  score += Math.min(proofs.length * 10, 20)
  const cats = categorizeVerbatim(entry.verbatim ?? '')
  score += Object.values(cats).filter(c => c.length > 0).length * 3
  score += Math.min((entry.releases ?? 0) * 5, 10)
  score += Math.min((entry.contrats ?? 0) * 10, 10)
  return Math.min(score, 100)
}

function scoreColor(s: number) {
  if (s >= 70) return '#16A34A'
  if (s >= 40) return '#D97706'
  return '#6B7280'
}

// ── STATUTS ─────────────────────────────────────────────────────────────────
const STATUTS = [
  { id: 'activite',       label: 'En activité',    color: '#16A34A', bg: '#F0FFF4', border: '#BBF7D0' },
  { id: 'recherche',      label: 'En recherche',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'sans_nouvelles', label: 'Sans nouvelles', color: '#6B7280', bg: 'var(--surface-2)', border: 'var(--border)' },
  { id: '',               label: 'Non contacté',   color: 'var(--text-tertiary)', bg: 'var(--bg)', border: 'var(--border)' },
]
function statutStyle(statut: string) { return STATUTS.find(s => s.id === statut) ?? STATUTS[3] }

// ── PDF REPORT ───────────────────────────────────────────────────────────────
function generateReportHTML(sessionLabel: string, participants: Participant[], entries: (ImpactEntry | undefined)[]): string {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const withVerbatim = participants.filter((_, i) => entries[i]?.verbatim?.trim())
  const enActivite   = participants.filter((_, i) => entries[i]?.statut === 'activite').length

  const participantHTML = withVerbatim.map(p => {
    const idx = participants.indexOf(p)
    const entry = entries[idx]
    const verbatim = entry?.verbatim ?? ''
    const proofs = extractProofs(verbatim)
    const cats = categorizeVerbatim(verbatim)
    const score = computeScore(entry)
    const st = statutStyle(entry?.statut ?? '')
    const catsActive = Object.entries(cats).filter(([, s]) => s.length > 0)
    const sc = score >= 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#6B7280'

    return `
<div class="participant">
  <div class="participant-header">
    <div>
      <span class="participant-name">${p.nom}</span>
      ${p.nomArtiste && p.nomArtiste !== '—' ? `<span class="artist-name">${p.nomArtiste}</span>` : ''}
      <div class="tags" style="margin-top:6px">
        <span class="badge" style="background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
        ${catsActive.map(([cat]) => `<span class="badge" style="background:${CAT_META[cat].bg};color:${CAT_META[cat].color};border:1px solid ${CAT_META[cat].border}">${CAT_META[cat].icon} ${CAT_META[cat].label}</span>`).join('')}
      </div>
    </div>
    <div class="score-circle" style="color:${sc};border-color:${sc}20;background:${sc}10">${score}<span style="font-size:10px;font-weight:400">/100</span></div>
  </div>
  <blockquote class="verbatim">"${verbatim.replace(/\n/g, '<br>')}"</blockquote>
  ${proofs.length > 0 ? `<div class="proofs-title">Preuves concrètes</div>${proofs.map(pr => `<div class="proof">${pr.icon} <strong>${pr.label}</strong> — ${pr.sentence}</div>`).join('')}` : ''}
</div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Impact — ${sessionLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:820px;margin:0 auto;padding:40px 32px;color:#1a1a2e;font-size:14px;line-height:1.5}
.print-bar{background:#1a1a2e;color:white;padding:12px 20px;border-radius:8px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between}
.print-bar button{background:white;color:#1a1a2e;border:none;padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px}
.logo{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin-bottom:6px}
h1{font-size:28px;font-weight:700;margin-bottom:4px}
.subtitle{color:#888;font-size:13px;margin-bottom:24px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:32px;padding:20px;background:#f8f8f8;border-radius:10px}
.stat{text-align:center}
.stat-value{font-size:28px;font-weight:700}
.stat-label{font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-top:2px}
.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:1px solid #eee;padding-bottom:8px;margin:32px 0 16px}
.participant{padding:20px;background:#fafafa;border:1px solid #eee;border-radius:10px;margin-bottom:16px;break-inside:avoid}
.participant-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
.participant-name{font-size:16px;font-weight:700}
.artist-name{font-size:12px;color:#888;margin-left:8px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500}
.score-circle{width:52px;height:52px;border-radius:50%;border:2px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0}
.verbatim{font-style:italic;font-size:13px;line-height:1.8;color:#444;border-left:3px solid #ddd;padding-left:16px;margin:12px 0}
.proofs-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:6px}
.proof{background:#E8F5E9;border-radius:6px;padding:6px 12px;font-size:12px;color:#2D6A4F;margin-bottom:4px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#aaa}
@media print{.print-bar{display:none}body{padding:20px 24px}}
</style>
</head>
<body>
<div class="print-bar">
  <span>Rapport prêt — <strong>Ctrl+P</strong> (ou ⌘P) pour exporter en PDF, choisir "Enregistrer au format PDF"</span>
  <button onclick="window.print()">🖨 Imprimer / PDF</button>
</div>

<div class="logo">NEODIS · UMANI Town</div>
<h1>Rapport d'impact post-formation</h1>
<p class="subtitle">${sessionLabel} · Généré le ${date}</p>

<div class="stats">
  <div class="stat"><div class="stat-value">${participants.length}</div><div class="stat-label">Apprenants</div></div>
  <div class="stat"><div class="stat-value" style="color:#16A34A">${enActivite}</div><div class="stat-label">En activité</div></div>
  <div class="stat"><div class="stat-value" style="color:#7C3AED">${withVerbatim.length}</div><div class="stat-label">Verbatims reçus</div></div>
</div>

<div class="section-title">Témoignages des apprenants</div>
${participantHTML || '<p style="color:#888;font-style:italic;padding:16px 0">Aucun verbatim collecté pour cette sélection.</p>'}

<div class="footer">
  <span>NEODIS · Document confidentiel</span>
  <span>Destiné à France Travail — usage interne</span>
</div>
</body>
</html>`
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Impact() {
  const { participants, impact, updateImpact } = useCRM()
  const [mode, setMode]                         = useState<'suivi' | 'rapport'>('suivi')
  const [selected, setSelected]                 = useState<Participant | null>(null)
  const [rapportSession, setRapportSession]     = useState<string>('all')

  // On prend le premier entry disponible (pas de période)
  const getEntry = (pId: number) => impact.find(e => e.participantId === pId)

  const sessionNames = useMemo(() => Array.from(new Set(participants.map(p => p.session))).sort(), [participants])

  const withVerbatim = participants.filter(p => getEntry(p.id)?.verbatim?.trim())
  const enActivite   = participants.filter(p => getEntry(p.id)?.statut === 'activite').length
  const total        = participants.length

  const rapportParticipants = rapportSession === 'all'
    ? participants
    : participants.filter(p => p.session === rapportSession)

  const handlePDF = () => {
    const label   = rapportSession === 'all' ? 'Toutes promotions' : rapportSession
    const entries = rapportParticipants.map(p => getEntry(p.id))
    const html    = generateReportHTML(label, rapportParticipants, entries)
    const blob    = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url     = URL.createObjectURL(blob)
    const win     = window.open(url, '_blank')
    if (!win) alert('Autorisez les popups pour ce site afin d\'ouvrir le rapport.')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* LIGNE 1 — Titre */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Impact post-formation</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 3 }}>Verbatims, preuves concrètes et scores ambassadeurs</div>
      </div>

      {/* LIGNE 2 — Toggle mode */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', width: 'fit-content', marginBottom: 16 }}>
        {(['suivi', 'rapport'] as const).map(m => (
          <button key={m}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
            onClick={() => setMode(m)}>
            {m === 'suivi' ? '📋 Suivi individuel' : '📊 Rapport promo'}
          </button>
        ))}
      </div>

      {/* LIGNE 3 — Filtres session + PDF (rapport uniquement) */}
      {mode === 'rapport' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Promotion :</span>
          <button className="btn btn-sm"
            style={rapportSession === 'all' ? { background: 'var(--text-primary)', color: 'white', borderColor: 'var(--text-primary)' } : {}}
            onClick={() => setRapportSession('all')}>Toutes promotions</button>
          {sessionNames.map(s => (
            <button key={s} className="btn btn-sm"
              style={rapportSession === s ? { background: 'var(--text-primary)', color: 'white', borderColor: 'var(--text-primary)' } : {}}
              onClick={() => setRapportSession(s)}>
              {s.replace('Promo UMANI ', '').replace(' 2025', '')}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={handlePDF}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 11V3M4 7l4-4 4 4"/><path d="M3 13h10"/></svg> Rapport PDF
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Apprenants contactés</div>
          <div className="kpi-value">{withVerbatim.length}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-tertiary)' }}> / {total}</span></div>
          <div className="kpi-meta"><span className="kpi-dot" style={{ background: 'var(--green)' }} />{total > 0 ? Math.round(withVerbatim.length / total * 100) : 0}% de retour</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">En activité</div>
          <div className="kpi-value" style={{ color: '#16A34A' }}>{enActivite}</div>
          <div className="kpi-meta">{total > 0 ? Math.round(enActivite / total * 100) : 0}% des apprenants</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Verbatims collectés</div>
          <div className="kpi-value">{withVerbatim.length}</div>
          <div className="kpi-meta">témoignages reçus</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Score moyen</div>
          <div className="kpi-value">
            {withVerbatim.length > 0
              ? Math.round(withVerbatim.reduce((acc, p) => acc + computeScore(getEntry(p.id)), 0) / withVerbatim.length)
              : '—'}
          </div>
          <div className="kpi-meta">impact sur {withVerbatim.length} profils</div>
        </div>
      </div>

      {mode === 'suivi'
        ? <SuiviView participants={participants} getEntry={getEntry} onSelect={setSelected} />
        : <RapportView
            participants={rapportParticipants}
            getEntry={getEntry}
          />
      }

      {selected && (
        <ImpactPanel
          participant={selected}
          impact={impact}
          updateImpact={updateImpact}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ── SUIVI VIEW ───────────────────────────────────────────────────────────────
function SuiviView({ participants, getEntry, onSelect }: {
  participants: Participant[]
  getEntry: (pId: number) => ImpactEntry | undefined
  onSelect: (p: Participant) => void
}) {
  const sorted = [...participants].sort((a, b) => computeScore(getEntry(b.id)) - computeScore(getEntry(a.id)))

  return (
    <div className="card animate-in" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 60px 1fr 44px', gap: 8, padding: '9px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <div>Apprenant</div><div>Session</div><div style={{ textAlign: 'center' }}>Statut</div>
        <div style={{ textAlign: 'center' }}>Score</div><div>Verbatim</div><div />
      </div>
      {sorted.map(p => {
        const entry  = getEntry(p.id)
        const st     = statutStyle(entry?.statut ?? '')
        const score  = computeScore(entry)
        const proofs = extractProofs(entry?.verbatim ?? '')
        const sShort = p.session.replace('Promo UMANI ', '').replace(' 2025', '')
        return (
          <div key={p.id}
            style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 60px 1fr 44px', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => onSelect(p)}
          >
            {/* Nom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: score > 0 ? scoreColor(score) : 'var(--text-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'DM Mono', flexShrink: 0 }}>
                {p.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {proofs.slice(0, 2).map(pr => (
                    <span key={pr.label} style={{ fontSize: 10, color: '#2D6A4F' }}>{pr.icon} {pr.label}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Session */}
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sShort}</div>
            {/* Statut */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>{st.label}</span>
            </div>
            {/* Score */}
            <div style={{ textAlign: 'center', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700, color: score > 0 ? scoreColor(score) : 'var(--text-tertiary)' }}>
              {score > 0 ? score : '—'}
            </div>
            {/* Verbatim */}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: entry?.verbatim ? 'italic' : 'normal', opacity: entry?.verbatim ? 1 : 0.35 }}>
              {entry?.verbatim || 'Aucun verbatim'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)' }}><path d="M6 3l5 5-5 5"/></svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── RAPPORT VIEW ─────────────────────────────────────────────────────────────
function RapportView({ participants, getEntry }: {
  participants: Participant[]
  getEntry: (pId: number) => ImpactEntry | undefined
}) {
  const withVerbatim = participants.filter(p => getEntry(p.id)?.verbatim?.trim())
  const enActivite   = participants.filter(p => getEntry(p.id)?.statut === 'activite').length

  // Scores triés — uniquement ceux qui ont répondu (score > 0)
  const scored = [...participants]
    .map(p => ({ p, entry: getEntry(p.id), score: computeScore(getEntry(p.id)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  // Verbatims par catégorie
  const catMap: Record<string, { p: Participant; sentence: string }[]> = { technique: [], confiance: [], professionnel: [], reseau: [] }
  for (const p of withVerbatim) {
    const cats = categorizeVerbatim(getEntry(p.id)?.verbatim ?? '')
    for (const [cat, sentences] of Object.entries(cats)) {
      for (const sentence of sentences) catMap[cat].push({ p, sentence })
    }
  }

  // Toutes les preuves concrètes
  const allProofs = withVerbatim.flatMap(p =>
    extractProofs(getEntry(p.id)?.verbatim ?? '').map(proof => ({ p, proof }))
  )

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Apprenants',   value: participants.length,  color: 'var(--text-primary)' },
          { label: 'En activité',  value: enActivite,           color: '#16A34A' },
          { label: 'Verbatims',    value: withVerbatim.length,  color: '#7C3AED' },
        ].map(k => (
          <div key={k.label} className="kpi-card animate-in">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Ambassadeurs */}
      <div className="card animate-in" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🏆</span> Score d'impact — Ambassadeurs potentiels
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>Qui contacter en priorité pour un témoignage vidéo</span>
        </div>
        <div>
          {scored.map(({ p, entry, score }) => {
            const st     = statutStyle(entry?.statut ?? '')
            const proofs = extractProofs(entry?.verbatim ?? '')
            const cats   = Object.entries(categorizeVerbatim(entry?.verbatim ?? '')).filter(([, s]) => s.length > 0)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: score > 0 ? scoreColor(score) : 'var(--surface-2)', color: score > 0 ? 'white' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'DM Mono', flexShrink: 0 }}>
                  {p.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nom}</span>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                    {proofs.map(pr => (
                      <span key={pr.label} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#E8F5E9', color: '#2D6A4F' }}>{pr.icon} {pr.label}</span>
                    ))}
                    {cats.map(([cat]) => (
                      <span key={cat} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: CAT_META[cat].bg, color: CAT_META[cat].color }}>{CAT_META[cat].icon}</span>
                    ))}
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: score > 0 ? scoreColor(score) : 'var(--surface-2)', borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 700, color: score > 0 ? scoreColor(score) : 'var(--text-tertiary)', minWidth: 36, textAlign: 'right' }}>
                  {score > 0 ? score : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Verbatims par catégorie */}
      {withVerbatim.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {Object.entries(CAT_META).map(([cat, meta]) => {
              const items = catMap[cat]
              return (
                <div key={cat} className="card animate-in" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{meta.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: meta.color }}>{meta.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)' }}>{items.length} extrait{items.length > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {items.length === 0
                      ? <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Aucun extrait pour cette catégorie.</div>
                      : items.map((item, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.65 }}>« {item.sentence} »</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>— {item.p.nom}</div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* Preuves concrètes */}
          {allProofs.length > 0 && (
            <div className="card animate-in" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✅</span> Preuves concrètes identifiées
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>Faits vérifiables à mettre en avant dans le dossier France Travail</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {allProofs.map(({ p, proof }, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{proof.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                        {proof.label} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {p.nom}</span>
                      </div>
                      <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                        « {proof.sentence} »
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {withVerbatim.length === 0 && (
        <div className="card animate-in" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          Aucun verbatim collecté pour cette sélection.
        </div>
      )}
    </>
  )
}

// ── IMPACT PANEL ─────────────────────────────────────────────────────────────
function ImpactPanel({ participant: p, impact, updateImpact, onClose }: {
  participant: Participant
  impact: ImpactEntry[]
  updateImpact: (id: number, per: any, u: Partial<ImpactEntry>) => void
  onClose: () => void
}) {
  // On utilise toujours '3mois' comme clé de stockage (pas de multi-période)
  const PERIODE = '3mois' as const
  const entry  = impact.find(e => e.participantId === p.id && e.periode === PERIODE)
  const update = (field: string, val: string | number) => updateImpact(p.id, PERIODE, { [field]: val })

  const score  = computeScore(entry)
  const proofs = extractProofs(entry?.verbatim ?? '')
  const cats   = entry?.verbatim ? categorizeVerbatim(entry.verbatim) : {}
  const catsActive = Object.entries(cats).filter(([, s]) => s.length > 0)
  const sShort = p.session.replace('Promo UMANI ', '').replace(' 2025', '')

  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div className="modal-toprow" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div className="modal-title">{p.nom}</div>
                {score > 0 && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: `${scoreColor(score)}15`, color: scoreColor(score), fontWeight: 700, border: `1px solid ${scoreColor(score)}30` }}>
                    Score {score}/100
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                {p.nomArtiste && p.nomArtiste !== '—' ? `${p.nomArtiste} · ` : ''}{sShort}
              </div>
              {/* Preuves */}
              {proofs.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {proofs.map(pr => (
                    <span key={pr.label} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: '#E8F5E9', color: '#2D6A4F', border: '1px solid #BBF7D0' }}>
                      {pr.icon} {pr.label}
                    </span>
                  ))}
                </div>
              )}
              {/* Catégories */}
              {catsActive.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {catsActive.map(([cat]) => {
                    const meta = CAT_META[cat]
                    return (
                      <span key={cat} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                        {meta.icon} {meta.label}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Statut */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Statut</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {STATUTS.filter(s => s.id !== '').map(s => {
                const active = (entry?.statut ?? '') === s.id
                return (
                  <button key={s.id} onClick={() => update('statut', active ? '' : s.id)}
                    style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? s.color : s.border}`, background: active ? s.bg : 'var(--surface)', color: active ? s.color : 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: active ? 600 : 400 }}
                  >{active && '✓ '}{s.label}</button>
                )
              })}
            </div>
          </div>

          {/* Date contact */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Date de contact</label>
            <input className="form-input" type="date" value={entry?.contactDate ?? ''} onChange={e => update('contactDate', e.target.value)} />
          </div>

          {/* Verbatim */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Verbatim <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'none', fontSize: 11 }}>— témoignage de l'apprenant</span></label>
            <textarea className="form-input" rows={6} placeholder="Coller ou saisir le témoignage…"
              style={{ resize: 'vertical', fontStyle: 'italic', lineHeight: 1.65 }}
              value={entry?.verbatim ?? ''} onChange={e => update('verbatim', e.target.value)}
            />
          </div>

          {/* Indicateurs */}
          <div className="section-label" style={{ marginBottom: 10 }}>Indicateurs</div>
          <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="info-block">
              <div className="info-label">Releases sorties</div>
              <input className="form-input" type="number" min="0" style={{ marginTop: 4, fontFamily: 'DM Mono', width: '100%' }} value={entry?.releases ?? 0} onChange={e => update('releases', parseInt(e.target.value) || 0)} />
            </div>
            <div className="info-block">
              <div className="info-label">Contrats signés</div>
              <input className="form-input" type="number" min="0" style={{ marginTop: 4, fontFamily: 'DM Mono', width: '100%' }} value={entry?.contrats ?? 0} onChange={e => update('contrats', parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
