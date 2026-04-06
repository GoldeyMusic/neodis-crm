# NEODIS CRM — Contexte complet du projet
> Document de reprise — à fournir tel quel à Claude pour continuer le travail.

---

## 1. Vue d'ensemble

**Projet** : NEODIS CRM — outil de gestion pédagogique pour les formations musicales UMANI
**Propriétaire** : David BERDUGO — contact@neodis-medias.fr
**Code source local** : `~/Desktop/neodis-crm`
**Repo GitHub** : `https://github.com/GoldeyMusic/neodis-crm` (public)
**URL de production** : `https://neodis-crm.vercel.app`
**URL custom (en attente DNS OVH)** : `https://crm.neodis-medias.fr`

---

## 2. Stack technique

| Couche | Techno |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | React + CSS custom (variables CSS, DM Sans / DM Mono) |
| Base de données | Supabase (PostgreSQL, schéma JSONB) |
| Fichiers | Supabase Storage (bucket `neodis-files`) |
| Déploiement | Vercel (Hobby plan, repo public requis) |
| DNS | OVH (CNAME à configurer) |

---

## 3. Variables d'environnement (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://uyeswtjisbzfyribnywt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_fWTDWjHX_MnvsNb9DwDtEWbMWHrFVtetW
```

> ⚠️ Le fichier `.env.local` est dans `.gitignore` — il faut le reconfigurer sur Vercel manuellement si besoin.
> Sur Vercel : Settings → Environment Variables

---

## 4. Schéma Supabase

Toutes les tables partagent le même schéma : `{ id TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ }`.
L'objet TypeScript complet est stocké dans la colonne `data`.

```sql
-- Tables à créer si elles n'existent pas :
CREATE TABLE IF NOT EXISTS sessions      (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS participants  (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS formateurs    (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS documents     (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS impact        (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS equipe        (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS user_profiles (id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
```

**Supabase Storage** : bucket `neodis-files`, accès public.
Politiques RLS à configurer via l'UI Supabase (Storage → Policies) :
- `allow_public_uploads` : INSERT pour anon
- `allow_public_updates` : UPDATE pour anon

---

## 5. Architecture des fichiers clés

```
neodis-crm/
├── app/
│   ├── page.tsx               # Entrée : CRMProvider + CRMApp (dynamic, ssr:false)
│   └── layout.tsx
├── components/
│   ├── CRMApp.tsx             # Shell principal, routing par activeView
│   ├── Login.tsx              # Écran de connexion + "se souvenir de moi"
│   ├── layout/
│   │   ├── Sidebar.tsx        # Navigation (dashboard/sessions/participants/formateurs/equipe/documents/impact/admin)
│   │   └── Topbar.tsx
│   ├── modals/
│   │   ├── SessionModal.tsx   # Onglets : Infos, Participants, Formateurs, Budget, Documents, Parcours
│   │   ├── ProfileModal.tsx   # Photo profil (upload async → Storage)
│   │   └── ...
│   ├── views/
│   │   ├── Dashboard.tsx
│   │   ├── Sessions.tsx
│   │   ├── Participants.tsx
│   │   ├── Formateurs.tsx
│   │   ├── Equipe.tsx         # ← NOUVEAU : membres UMANI avec photo/rôle/contact
│   │   ├── Documents.tsx
│   │   ├── Impact.tsx
│   │   └── Admin.tsx          # Export/import JSON, liste tous les comptes
│   └── ui/
│       ├── DocumentViewer.tsx # Visionneuse PDF (fonctionne avec URL et base64)
│       └── ...
└── lib/
    ├── supabase.ts            # Client Supabase (createClient)
    ├── storage.ts             # CRUD Supabase (loadRecords, upsertAll, deleteRecord, loadUserProfile, saveUserProfile)
    ├── filestore.ts           # Upload fichiers → Supabase Storage (fileSave, fileDelete)
    ├── store.tsx              # CRMProvider + CRMContext (état global, persistance auto)
    └── data.ts                # Types TypeScript + seed data (sessions, participants, formateurs, equipe, authUsers)
```

---

## 6. Comptes utilisateurs (`lib/data.ts` → `authUsers`)

```typescript
export const authUsers = [
  { email: 'admin@neodis.fr',              password: 'neodis2025', name: 'Admin',    nom: 'NEODIS'    },
  { email: 'goldey@neodis-medias.fr',      password: 'neodis2026', name: 'David',    nom: 'BERDUGO'   },
  { email: 'abakan@neodis-medias.fr',      password: 'neodis2026', name: 'David',    nom: 'ABAKAN'    },
  { email: 'philip@neodis-medias.fr',      password: 'neodis2026', name: 'Philip',   nom: 'NESMES'    },
  { email: 'jennifer.galap@umani.town',    password: 'neodis2026', name: 'Jennifer', nom: 'GALAP'     },
  { email: 'harry@neodis-medias.fr',       password: 'neodis2026', name: 'Harry',    nom: 'ROSELMACK' },
]
```

---

## 7. Membres équipe UMANI (`lib/data.ts` → `equipeData`)

```typescript
export const equipeData: MembreEquipe[] = [
  { id: 1, prenom: 'David',    nom: 'BERDUGO',   role: '', email: 'goldey@neodis-medias.fr',   tel: '', linkedEmail: 'goldey@neodis-medias.fr'   },
  { id: 2, prenom: 'David',    nom: 'ABAKAN',    role: '', email: 'abakan@neodis-medias.fr',   tel: '', linkedEmail: 'abakan@neodis-medias.fr'   },
  { id: 3, prenom: 'Harry',    nom: 'ROSELMACK', role: '', email: 'harry@neodis-medias.fr',    tel: '', linkedEmail: 'harry@neodis-medias.fr'    },
  { id: 4, prenom: 'Jennifer', nom: 'GALAP',     role: '', email: 'jennifer.galap@umani.town', tel: '', linkedEmail: 'jennifer.galap@umani.town' },
  { id: 5, prenom: 'Philip',   nom: 'NESMES',    role: '', email: 'philip@neodis-medias.fr',   tel: '', linkedEmail: 'philip@neodis-medias.fr'   },
]
```

---

## 8. Fichiers lib — code complet

### `lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### `lib/storage.ts`
```typescript
// Couche de persistance Supabase — remplace l'ancien localStorage
import { supabase } from './supabase'

export async function loadRecords<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('data')
  if (error) { console.error(`[storage] load ${table}:`, error.message); return [] }
  return (data ?? []).map(row => row.data as T)
}

export async function upsertRecord(table: string, id: number | string, record: object): Promise<void> {
  const { error } = await supabase.from(table).upsert({ id: String(id), data: record, updated_at: new Date().toISOString() })
  if (error) console.error(`[storage] upsert ${table}/${id}:`, error.message)
}

export async function upsertAll(table: string, records: Array<{ id: number | string }>): Promise<void> {
  if (records.length === 0) return
  const rows = records.map(r => ({ id: String(r.id), data: r, updated_at: new Date().toISOString() }))
  const { error } = await supabase.from(table).upsert(rows)
  if (error) console.error(`[storage] upsertAll ${table}:`, error.message)
}

export async function deleteRecord(table: string, id: number | string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', String(id))
  if (error) console.error(`[storage] delete ${table}/${id}:`, error.message)
}

export async function loadImpact(): Promise<any[]> {
  const { data, error } = await supabase.from('impact').select('data').eq('id', 'all').maybeSingle()
  if (error || !data) return []
  return (data.data as any[]) ?? []
}

export async function saveImpact(impact: any[]): Promise<void> {
  const { error } = await supabase.from('impact').upsert({ id: 'all', data: impact, updated_at: new Date().toISOString() })
  if (error) console.error('[storage] saveImpact:', error.message)
}

export async function loadUserProfile(email: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase.from('user_profiles').select('data').eq('id', email.toLowerCase()).maybeSingle()
  if (error || !data) return null
  return data.data as Record<string, any>
}

export async function saveUserProfile(email: string, profile: object): Promise<void> {
  const { error } = await supabase.from('user_profiles').upsert({ id: email.toLowerCase(), data: profile, updated_at: new Date().toISOString() })
  if (error) console.error('[storage] saveUserProfile:', error.message)
}
```

### `lib/filestore.ts`
```typescript
import { supabase } from './supabase'
const BUCKET = 'neodis-files'

export async function fileSave(key: string, base64Data: string): Promise<string> {
  if (!base64Data || base64Data.length < 100) return ''
  let mimeType = 'application/octet-stream'; let ext = 'bin'
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);/)
    if (match) { mimeType = match[1]; const rawExt = mimeType.split('/')[1] ?? 'bin'; ext = rawExt.replace('jpeg','jpg').replace('svg+xml','svg') }
  }
  const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data
  const byteChars = atob(raw); const byteArray = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i)
  const blob = new Blob([byteArray], { type: mimeType })
  const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filePath = `${safeName}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, blob, { upsert: true, contentType: mimeType })
  if (error) { console.error('[filestore] upload error:', error.message); return '' }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function fileDelete(url: string): Promise<void> {
  if (!url || !url.includes(BUCKET)) return
  const match = url.match(new RegExp(`${BUCKET}/(.+)$`))
  if (!match) return
  const { error } = await supabase.storage.from(BUCKET).remove([match[1]])
  if (error) console.error('[filestore] delete error:', error.message)
}

export async function fileLoad(_key: number | string): Promise<string | null> { return null }
export async function fileLoadAll(): Promise<Record<string, string>> { return {} }
```

---

## 9. Principes d'architecture du store (`lib/store.tsx`)

- **Seed data** : au démarrage, l'état React est initialisé avec les données de `data.ts`
- **Chargement Supabase** : au montage, on charge toutes les tables en parallèle — si Supabase a des données, elles remplacent le seed
- **Guard `filesLoaded`** : les effets de persistance ne s'exécutent qu'après le chargement initial (évite d'écraser Supabase avec le seed)
- **Pattern upsert** : jamais de DELETE global, on fait toujours INSERT OR UPDATE par id
- **Base64 → Storage** : `isBase64(s)` détecte si une string est une data-URL (pas une URL http) — si oui, upload vers Supabase Storage avant de stocker l'URL
- **Session persistante** : `localStorage.getItem('neodis_session')` → auto-login au chargement si "se souvenir de moi" était coché
- **Profil utilisateur** : table `user_profiles` dans Supabase, chargée après login, photo uploadée dans Storage

---

## 10. Fonctionnalités du CRM

| Vue | Contenu |
|---|---|
| Dashboard | KPIs, activité récente, alertes |
| Sessions | 3 sessions de formation (Prest@ppli, AIF, OPCO) |
| Participants | 32 participants, parcours pédagogique, suivi FT |
| Formateurs | 7 formateurs, photo/CV → Storage, planning, tarif horaire |
| **Équipe** | 5 membres UMANI, photo/rôle/contact, lien compte CRM |
| Documents | Upload PDF/DOC, catégories, montants (frais admin → budget auto) |
| Impact | Suivi post-formation à 3, 6, 12 mois |
| Admin | Liste comptes, export/import JSON, journal d'activité |

---

## 11. DNS OVH — action en attente

CNAME à ajouter dans la zone DNS de `neodis-medias.fr` sur OVH :
- **Type** : CNAME
- **Sous-domaine** : `crm`
- **Cible** : `80e9f0b73776a04c.vercel-dns-017.com.`
- **TTL** : 3600

---

## 12. Déploiement

```bash
cd ~/Desktop/neodis-crm
git add .
git commit -m "description"
git push
# → Vercel redéploie automatiquement en ~1 min
```

---

## 13. État de la persistance (tout est persisté ✅)

| Donnée | Stockage |
|---|---|
| Sessions / Participants / Formateurs | Supabase table |
| Documents (métadonnées) | Supabase table |
| Fichiers (PDFs, photos, CVs) | Supabase Storage (`neodis-files`) |
| Équipe UMANI | Supabase table |
| Profil utilisateur (photo, nom) | Supabase table `user_profiles` + Storage |
| Session login ("se souvenir de moi") | `localStorage` (`neodis_session`) |
| Journal d'activité | Éphémère (intentionnel) |
