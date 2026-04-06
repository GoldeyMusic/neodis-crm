// lib/formateur-portal.ts — Chargement des données pour le portail formateur public
import { supabase } from './supabase'
import { Formateur, Session, PlanningEntry } from './data'

export interface PortalData {
  formateur: Formateur
  sessions: {
    session: Session
    planning: PlanningEntry  // l'entrée du formateur dans cette session
  }[]
  documents: {
    id: number
    nom: string
    cat: string
    taille: string
    date: string
    data: string
  }[]
}

/**
 * Charge toutes les données nécessaires au portail formateur à partir du token.
 * Retourne null si le token est invalide.
 */
export async function loadPortalData(token: string): Promise<PortalData | null> {
  console.log('[portal] loading data for token:', token?.slice(0, 8) + '…')

  // 1. Charger tous les formateurs et trouver celui avec ce token
  const { data: fRows, error: fErr } = await supabase.from('formateurs').select('data')
  if (fErr) { console.error('[portal] Supabase formateurs error:', fErr.message); return null }
  if (!fRows || fRows.length === 0) { console.error('[portal] No formateurs found in Supabase'); return null }

  const allFormateurs = fRows.map(r => r.data as Formateur)
  console.log('[portal] Found', allFormateurs.length, 'formateurs, tokens:', allFormateurs.map(f => f.token?.slice(0,8)).filter(Boolean))
  const formateur = allFormateurs.find(f => f.token === token)
  if (!formateur) { console.error('[portal] No formateur matches token'); return null }

  // 2. Charger les sessions et filtrer celles où le formateur intervient
  const { data: sRows } = await supabase.from('sessions').select('data')
  const allSessions = (sRows ?? []).map(r => r.data as Session)

  const sessions = allSessions
    .filter(s => s.planning?.some(p => p.formateurId === formateur.id))
    .map(s => ({
      session: s,
      planning: s.planning!.find(p => p.formateurId === formateur.id)!,
    }))
    .sort((a, b) => {
      // Trier par statut (active > upcoming > done) puis par nom
      const order: Record<string, number> = { active: 0, upcoming: 1, done: 2 }
      return (order[a.session.status] ?? 3) - (order[b.session.status] ?? 3)
    })

  // 3. Charger les documents liés aux sessions du formateur ou au formateur lui-même
  const { data: dRows } = await supabase.from('documents').select('data')
  const allDocs = (dRows ?? []).map(r => r.data as any)

  const sessionNames = new Set(sessions.map(s => s.session.name))
  const documents = allDocs.filter((d: any) => {
    // Documents du formateur (facture, contrat)
    if (d.formateur === formateur.nom) return true
    // Documents des sessions du formateur dans les catégories pertinentes
    if (d.session && d.cat) {
      const docSessions = d.session.split(' | ')
      const relevant = ['pedago', 'cv', 'bilans'].includes(d.cat)
      return relevant && docSessions.some((s: string) => sessionNames.has(s))
    }
    return false
  })

  return { formateur, sessions, documents }
}
