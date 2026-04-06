// Couche de persistance Supabase — remplace l'ancien localStorage
import { supabase } from './supabase'

/**
 * Charge tous les enregistrements d'une table.
 * Chaque ligne a la forme { id: TEXT, data: JSONB } — on retourne le contenu de `data`.
 */
export async function loadRecords<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('data')
  if (error) {
    console.error(`[storage] load ${table}:`, error.message)
    return []
  }
  return (data ?? []).map(row => row.data as T)
}

/**
 * Upsert un enregistrement (insert ou update selon l'id).
 */
export async function upsertRecord(
  table: string,
  id: number | string,
  record: object
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .upsert({ id: String(id), data: record, updated_at: new Date().toISOString() })
  if (error) console.error(`[storage] upsert ${table}/${id}:`, error.message)
}

/**
 * Upsert tous les enregistrements d'un tableau en une seule requête.
 */
export async function upsertAll(
  table: string,
  records: Array<{ id: number | string }>
): Promise<void> {
  if (records.length === 0) return
  const rows = records.map(r => ({
    id: String(r.id),
    data: r,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from(table).upsert(rows)
  if (error) console.error(`[storage] upsertAll ${table}:`, error.message)
}

/**
 * Supprime un enregistrement par son id.
 */
export async function deleteRecord(
  table: string,
  id: number | string
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', String(id))
  if (error) console.error(`[storage] delete ${table}/${id}:`, error.message)
}

/**
 * Charge les entrées d'impact (stockées comme tableau JSON unique).
 */
export async function loadImpact(): Promise<any[]> {
  const { data, error } = await supabase
    .from('impact')
    .select('data')
    .eq('id', 'all')
    .maybeSingle()
  if (error || !data) return []
  return (data.data as any[]) ?? []
}

/**
 * Sauvegarde les entrées d'impact.
 */
export async function saveImpact(impact: any[]): Promise<void> {
  const { error } = await supabase
    .from('impact')
    .upsert({ id: 'all', data: impact, updated_at: new Date().toISOString() })
  if (error) console.error('[storage] saveImpact:', error.message)
}
