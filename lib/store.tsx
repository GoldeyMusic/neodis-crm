'use client'
import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { Session, Participant, Formateur, ImpactEntry, ImpactPeriode, sessionsData, participantsData, formateursData, impactSeedData } from './data'
import { loadRecords, upsertAll, deleteRecord, loadImpact, saveImpact, loadUserProfile, saveUserProfile } from './storage'
import { fileSave, fileDelete } from './filestore'

export interface Document {
  id: number
  nom: string
  cat: string
  session?: string
  formateur?: string
  taille: string
  date: string
  data: string      // URL Supabase Storage (anciennement base64)
  montant?: number
}

interface User {
  email: string
  name: string
  nom: string
  photo?: string
}

interface CRMState {
  user: User | null
  login: (email: string, password: string) => boolean
  logout: () => void
  updateUser: (u: Partial<User>) => Promise<void>

  sessions: Session[]
  participants: Participant[]
  formateurs: Formateur[]
  documents: Document[]
  impact: ImpactEntry[]

  addSession: (s: Omit<Session, 'id'>) => void
  addParticipant: (p: Omit<Participant, 'id'>) => void
  addFormateur: (f: Omit<Formateur, 'id'>) => void
  updateFormateur: (id: number, updates: Partial<Formateur>) => Promise<void>
  addDocument: (d: Omit<Document, 'id'>) => Promise<void>
  updateDocument: (id: number, updates: Partial<Document>) => void
  deleteDocument: (id: number) => void
  updateParticipant: (id: number, updates: Partial<Participant>) => void
  deleteParticipant: (id: number) => void
  updateSession: (id: number, updates: Partial<Session>) => void
  deleteSession: (id: number) => void
  updateImpact: (participantId: number, periode: ImpactPeriode, updates: Partial<ImpactEntry>) => void

  filesLoaded: boolean   // true une fois les données Supabase chargées

  activeView: string
  setActiveView: (v: string) => void
  toast: string
  showToast: (msg: string) => void
  activityLog: { icon: string; text: string; time: string }[]
  logActivity: (icon: string, text: string) => void
}

const CRMContext = createContext<CRMState | null>(null)
import { authUsers } from './data'

// IDs de participants définitivement supprimés
const DELETED_PARTICIPANT_IDS = new Set([309])

const SEED_PARTICIPANTS = participantsData.filter(p => !DELETED_PARTICIPANT_IDS.has(p.id))

// Détecte si une string est un base64 (pas une URL)
function isBase64(s: string | undefined): boolean {
  if (!s) return false
  if (s.startsWith('http')) return false
  return s.length > 100
}

export function CRMProvider({ children }: { children: ReactNode }) {
  // État initial = données seed de data.ts
  // Sera remplacé par les données Supabase dès le chargement
  const [sessions, setSessions] = useState<Session[]>(sessionsData)
  const [participants, setParticipants] = useState<Participant[]>(SEED_PARTICIPANTS)
  const [formateurs, setFormateurs] = useState<Formateur[]>(formateursData)
  const [documents, setDocuments] = useState<Document[]>([])
  const [impact, setImpact] = useState<ImpactEntry[]>(impactSeedData)

  const [user, setUser] = useState<User | null>(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [toast, setToast] = useState('')
  const [activityLog, setActivityLog] = useState<{ icon: string; text: string; time: string }[]>([])
  const [filesLoaded, setFilesLoaded] = useState(false)

  // Générateur d'IDs uniques basé sur timestamp
  const nextIdRef = useRef<number>(Date.now())
  const getNextId = (): number => {
    const id = nextIdRef.current
    nextIdRef.current = Math.max(nextIdRef.current + 1, Date.now())
    return id
  }

  // Ref pour accéder à l'utilisateur courant dans les callbacks async
  const userRef = useRef<User | null>(null)
  useEffect(() => { userRef.current = user }, [user])

  // ── Chargement initial depuis Supabase ──────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [dbSessions, dbParticipants, dbFormateurs, dbDocuments, dbImpact] = await Promise.all([
          loadRecords<Session>('sessions'),
          loadRecords<Participant>('participants'),
          loadRecords<Formateur>('formateurs'),
          loadRecords<Document>('documents'),
          loadImpact(),
        ])

        // Remplacer le seed par les données Supabase si elles existent
        if (dbSessions.length > 0) setSessions(dbSessions)
        if (dbParticipants.length > 0) {
          setParticipants(dbParticipants.filter(p => !DELETED_PARTICIPANT_IDS.has(p.id)))
        }
        if (dbFormateurs.length > 0) setFormateurs(dbFormateurs)
        if (dbDocuments.length > 0) setDocuments(dbDocuments)
        if (dbImpact.length > 0) setImpact(dbImpact)
      } catch (err) {
        console.warn('[store] Supabase load failed, using seed data:', err)
      }
      setFilesLoaded(true)
    }
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persistance automatique dans Supabase ──────────────────────────────────
  // Guard filesLoaded : on ne sauvegarde qu'après le chargement initial
  // (évite d'écraser les données Supabase avec le seed au démarrage)

  useEffect(() => {
    if (!filesLoaded) return
    upsertAll('sessions', sessions)
  }, [sessions, filesLoaded])

  useEffect(() => {
    if (!filesLoaded) return
    upsertAll('participants', participants)
  }, [participants, filesLoaded])

  useEffect(() => {
    if (!filesLoaded) return
    upsertAll('formateurs', formateurs)
  }, [formateurs, filesLoaded])

  useEffect(() => {
    if (!filesLoaded) return
    upsertAll('documents', documents)
  }, [documents, filesLoaded])

  useEffect(() => {
    if (!filesLoaded) return
    saveImpact(impact)
  }, [impact, filesLoaded])

  // ── Helpers UI ──────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const logActivity = useCallback((icon: string, text: string) => {
    setActivityLog(prev => [{ icon, text, time: "À l'instant" }, ...prev.slice(0, 49)])
  }, [])

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback((email: string, password: string) => {
    const found = authUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (found) {
      const baseUser = { email: found.email, name: found.name, nom: found.nom }
      setUser(baseUser)
      // Charger le profil persisté (photo etc.) en arrière-plan
      loadUserProfile(found.email).then(profile => {
        if (profile) {
          setUser(prev => prev ? { ...prev, ...profile } : prev)
        }
      }).catch(err => console.warn('[store] loadUserProfile failed:', err))
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => { setUser(null); setActiveView('dashboard') }, [])

  // updateUser est async : upload photo si base64, puis persiste dans Supabase
  const updateUser = useCallback(async (u: Partial<User>) => {
    const currentUser = userRef.current
    if (!currentUser) return

    let finalUpdates = { ...u }

    if (u.photo && isBase64(u.photo)) {
      // Afficher la base64 immédiatement pour un aperçu instantané
      setUser(prev => prev ? { ...prev, photo: u.photo } : prev)
      // Upload vers Supabase Storage, puis remplacer par l'URL permanente
      const key = `user_photo_${currentUser.email.replace(/[@.]/g, '_')}`
      const url = await fileSave(key, u.photo)
      if (url) finalUpdates = { ...finalUpdates, photo: url }
    }

    const next = { ...currentUser, ...finalUpdates }
    setUser(next)
    saveUserProfile(currentUser.email, next).catch(err =>
      console.warn('[store] saveUserProfile failed:', err)
    )
  }, []) // userRef est stable, pas de dépendance nécessaire

  // ── Sessions ────────────────────────────────────────────────────────────────
  const addSession = useCallback((s: Omit<Session, 'id'>) => {
    const newS = { ...s, id: getNextId() }
    setSessions(prev => [newS, ...prev])
    logActivity('＋', `Session <strong>${s.name}</strong> créée`)
  }, [logActivity])

  const updateSession = useCallback((id: number, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const deleteSession = useCallback((id: number) => {
    setSessions(prev => {
      const s = prev.find(x => x.id === id)
      if (s) logActivity('✕', `Session <strong>${s.name}</strong> supprimée`)
      return prev.filter(x => x.id !== id)
    })
    deleteRecord('sessions', id)
  }, [logActivity])

  // ── Participants ────────────────────────────────────────────────────────────
  const addParticipant = useCallback((p: Omit<Participant, 'id'>) => {
    const newP = { ...p, id: getNextId() }
    setParticipants(prev => [newP, ...prev])
    logActivity('＋', `Participant <strong>${p.nom}</strong> ajouté`)
  }, [logActivity])

  const updateParticipant = useCallback((id: number, updates: Partial<Participant>) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }, [])

  const deleteParticipant = useCallback((id: number) => {
    setParticipants(prev => {
      const p = prev.find(x => x.id === id)
      if (p) logActivity('✕', `Participant <strong>${p.nom}</strong> supprimé`)
      return prev.filter(x => x.id !== id)
    })
    deleteRecord('participants', id)
  }, [logActivity])

  // ── Formateurs ──────────────────────────────────────────────────────────────
  const addFormateur = useCallback((f: Omit<Formateur, 'id'>) => {
    const newF = { ...f, id: getNextId() }
    setFormateurs(prev => [...prev, newF])
    logActivity('＋', `Formateur <strong>${f.nom}</strong> ajouté`)
  }, [logActivity])

  // updateFormateur est async : si la mise à jour inclut une photo/CV en base64,
  // on l'uploade dans Supabase Storage avant de mettre à jour l'état.
  const updateFormateur = useCallback(async (id: number, updates: Partial<Formateur>) => {
    let finalUpdates = { ...updates }

    // Upload photo si base64
    if (isBase64(updates.photo)) {
      const url = await fileSave(`formateur_photo_${id}`, updates.photo!)
      if (url) finalUpdates = { ...finalUpdates, photo: url }
    }

    // Upload CV si base64
    if (updates.cv && isBase64(updates.cv.data)) {
      const url = await fileSave(`formateur_cv_${id}`, updates.cv.data)
      if (url) finalUpdates = { ...finalUpdates, cv: { ...updates.cv, data: url } }
    }

    setFormateurs(prev => prev.map(f => f.id === id ? { ...f, ...finalUpdates } : f))
  }, [])

  // ── Documents ───────────────────────────────────────────────────────────────
  // addDocument est async : upload le fichier dans Supabase Storage, puis stocke l'URL.
  const addDocument = useCallback(async (d: Omit<Document, 'id'>) => {
    const id = getNextId()
    let fileUrl = d.data

    // Upload si base64 (pas déjà une URL)
    if (isBase64(d.data)) {
      fileUrl = await fileSave(`doc_${id}`, d.data)
      // Si l'upload échoue, on bloque l'enregistrement et on alerte
      if (!fileUrl) {
        showToast(`❌ Échec de l'upload de "${d.nom}" — réessaie dans quelques secondes`)
        return
      }
    }

    const newDoc: Document = { ...d, id, data: fileUrl }
    setDocuments(prev => [newDoc, ...prev])
    logActivity('↑', `Document <strong>${d.nom}</strong> uploadé`)
  }, [logActivity, showToast])

  const updateDocument = useCallback((id: number, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [])

  const deleteDocument = useCallback((id: number) => {
    setDocuments(prev => {
      const d = prev.find(x => x.id === id)
      if (d) {
        logActivity('✕', `Document <strong>${d.nom}</strong> supprimé`)
        // Supprimer le fichier dans Supabase Storage
        if (d.data && d.data.startsWith('http')) {
          fileDelete(d.data).catch(err => console.warn('[store] fileDelete failed:', err))
        }
      }
      return prev.filter(x => x.id !== id)
    })
    deleteRecord('documents', id)
  }, [logActivity])

  // ── Impact ──────────────────────────────────────────────────────────────────
  const updateImpact = useCallback((participantId: number, periode: ImpactPeriode, updates: Partial<ImpactEntry>) => {
    setImpact(prev => {
      const exists = prev.find(e => e.participantId === participantId && e.periode === periode)
      if (exists) {
        return prev.map(e =>
          e.participantId === participantId && e.periode === periode
            ? { ...e, ...updates }
            : e
        )
      }
      return [...prev, {
        participantId, periode,
        statut: '', verbatim: '', releases: 0, contrats: 0, contactDate: '',
        ...updates,
      }]
    })
  }, [])

  return (
    <CRMContext.Provider value={{
      user, login, logout, updateUser,
      sessions, participants, formateurs, documents, impact,
      addSession, updateSession, deleteSession,
      addParticipant, updateParticipant, deleteParticipant,
      addFormateur, updateFormateur,
      addDocument, updateDocument, deleteDocument,
      updateImpact,
      filesLoaded,
      activeView, setActiveView,
      toast, showToast,
      activityLog, logActivity,
    }}>
      {children}
    </CRMContext.Provider>
  )
}

export function useCRM() {
  const ctx = useContext(CRMContext)
  if (!ctx) throw new Error('useCRM must be used within CRMProvider')
  return ctx
}
