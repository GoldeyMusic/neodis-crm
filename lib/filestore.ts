// Couche de stockage de fichiers Supabase Storage — remplace l'ancien IndexedDB
import { supabase } from './supabase'

const BUCKET = 'neodis-files'

/**
 * Upload un fichier (base64 ou data-URL) dans Supabase Storage.
 * Retourne l'URL publique, ou '' en cas d'erreur.
 */
export async function fileSave(key: string, base64Data: string): Promise<string> {
  if (!base64Data || base64Data.length < 100) return ''

  // Détecter le type MIME depuis le header data-URL
  let mimeType = 'application/octet-stream'
  let ext = 'bin'
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);/)
    if (match) {
      mimeType = match[1]
      const rawExt = mimeType.split('/')[1] ?? 'bin'
      ext = rawExt.replace('jpeg', 'jpg').replace('svg+xml', 'svg')
    }
  }

  // Convertir base64 → Uint8Array
  const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data
  const byteChars = atob(raw)
  const byteArray = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i)
  const blob = new Blob([byteArray], { type: mimeType })

  // Chemin unique dans le bucket
  const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filePath = `${safeName}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, { upsert: true, contentType: mimeType })

  if (error) {
    console.error('[filestore] upload error:', error.message)
    return ''
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Supprime un fichier à partir de son URL publique.
 */
export async function fileDelete(url: string): Promise<void> {
  if (!url || !url.includes(BUCKET)) return
  const match = url.match(new RegExp(`${BUCKET}/(.+)$`))
  if (!match) return
  const { error } = await supabase.storage.from(BUCKET).remove([match[1]])
  if (error) console.error('[filestore] delete error:', error.message)
}

// Stubs de compatibilité avec l'ancienne API IndexedDB
export async function fileLoad(_key: number | string): Promise<string | null> {
  return null
}

export async function fileLoadAll(): Promise<Record<string, string>> {
  return {}
}
