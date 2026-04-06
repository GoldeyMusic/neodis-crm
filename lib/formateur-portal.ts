// lib/formateur-portal.ts — Chargement des données pour le portail formateur public
import { supabase } from './supabase'
import { Formateur, Session, PlanningEntry } from './data'

export interface PortalDocument {
  id: number
  nom: string
  cat: string
  taille: string
  date: string
  data: string
  formateur?: string
  formateurId?: number
  uploadedBy?: 'admin' | 'formateur'
  matiere?: string | string[]   // tag(s) matière pour les supports pédago (Streaming, Branding, etc.)
}

export interface PortalData {
  formateur: Formateur
  sessions: {
    session: Session
    planning: PlanningEntry  // l'entrée du formateur dans cette session
  }[]
  documents: PortalDocument[]
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

  // 2. Charger les sessions où le formateur intervient (via planning)
  const { data: sRows } = await supabase.from('sessions').select('data')
  const allSessions = (sRows ?? []).map(r => r.data as Session)

  const sessions = allSessions
    .filter(s => s.planning?.some(p => p.formateurId === formateur.id))
    .map(s => ({
      session: s,
      planning: s.planning!.find(p => p.formateurId === formateur.id)!,
    }))
    .sort((a, b) => {
      const order: Record<string, number> = { active: 0, upcoming: 1, done: 2 }
      return (order[a.session.status] ?? 3) - (order[b.session.status] ?? 3)
    })

  // 3. Charger UNIQUEMENT les documents qui concernent ce formateur :
  //    - Documents portant son nom (contrat, facture du formateur)
  //    - Documents pédagogiques (cours PDF) des sessions où il intervient
  //    - Son CV
  //    - Ses factures uploadées
  //    ⚠️ PAS les documents des apprenants (présence, bilans, factures financeurs)
  const { data: dRows } = await supabase.from('documents').select('data')
  const allDocs = (dRows ?? []).map(r => r.data as any)

  const sessionNames = new Set(sessions.map(s => s.session.name))
  const FORMATEUR_CATS = ['factures_formateurs', 'cv', 'pedago', 'contrat', 'contrat_st']
  // Docs globaux partagés à tous les formateurs
  const GLOBAL_CATS = ['reglement', 'programme', 'charte', 'matrice', 'qcm_formatif']

  const formateurPathPrefix = `formateur_${formateur.id}_`
  const documents: PortalDocument[] = allDocs.filter((d: any) => {
    // Documents globaux NEODIS → visibles par tous les formateurs
    if (GLOBAL_CATS.includes(d.cat)) return true
    // Documents directement liés au formateur (par ID, par nom, ou par chemin du fichier)
    const isFormateurDoc =
      d.formateurId === formateur.id ||
      d.formateur === formateur.nom ||
      (d.data && typeof d.data === 'string' && d.data.includes(formateurPathPrefix))
    if (isFormateurDoc && FORMATEUR_CATS.includes(d.cat)) {
      return true
    }
    // Ressources pédagogiques des sessions du formateur
    if (d.session && d.cat === 'pedago') {
      const docSessions = (d.session as string).split(' | ')
      return docSessions.some((s: string) => sessionNames.has(s))
    }
    return false
  })


  // Ajouter le CV stocké directement sur la fiche formateur (s'il existe et pas déjà dans les docs)
  if (formateur.cv) {
    const alreadyHasCV = documents.some(d => d.cat === 'cv' && d.nom === formateur.cv!.name)
    if (!alreadyHasCV) {
      documents.unshift({
        id: -1,
        nom: formateur.cv.name,
        cat: 'cv',
        taille: formateur.cv.size,
        date: '',
        data: formateur.cv.data,
        formateur: formateur.nom,
      })
    }
  }

  return { formateur, sessions, documents }
}
