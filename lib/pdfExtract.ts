'use client'

// Extraction des données depuis un avis de paiement PDF
// Stratégie : envoie le PDF à l'API /api/extract-pdf (pdf-parse côté serveur)
// Pas de dépendance webpack/pdfjs dans le navigateur.

export interface AvisData {
  convention: string | null
  vref:       string | null
  montant:    string | null
  suggestedName: string
}

// ── Parsing du texte extrait ─────────────────────────────────────────────────
function parseAvisText(text: string, fallbackName: string): AvisData {
  // Normaliser les espaces et retours à la ligne
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ')

  // CONVENTION + VREF sur la même ligne ou proches
  // Exemples: "CONVENTION : 41C67G303269/01 VREF : F-2025-021"
  //           "CONVENTION :41C67G303269/01\nVREF :F-2025-021"
  const refMatch =
    clean.match(/CONVENTION\s*:?\s*([A-Z0-9]+\/\d+)[^\n]{0,60}?VREF\s*:?\s*(F[-–]\d{4}[-–]\d{3,})/i) ??
    clean.match(/CONVENTION\s*:?\s*([A-Z0-9]+\/\d+)[\s\S]{0,80}?VREF\s*:?\s*(F[-–]\d{4}[-–]\d{3,})/i)

  const convention = refMatch?.[1]?.trim() ?? null
  const vref = refMatch?.[2]?.trim().replace(/[–—]/g, '-') ?? null

  // Montant total (ex: "2 100,00" ou "2100,00" ou "2 100.00")
  const montantMatch =
    clean.match(/[Mm]ontant\s+[Tt]otal[^0-9\n]{0,80}?([\d][\d\s]*[,\.]\d{2})/i) ??
    clean.match(/MONTANT[^0-9\n]{0,40}?([\d][\d\s]*[,\.]\d{2})/i) ??
    clean.match(/([\d]{1,3}(?:\s\d{3})*[,\.]\d{2})/)

  const montant = montantMatch
    ? montantMatch[1].replace(/\s/g, '').replace('.', ',')
    : null

  let suggestedName = fallbackName
  if (vref) {
    const montantStr = montant ? ` - ${montant}€` : ''
    suggestedName = `Avis paiement FT - ${vref}${montantStr}.pdf`
  }

  return { convention, vref, montant, suggestedName }
}

// ── Export principal ─────────────────────────────────────────────────────────
export async function extractAvisData(file: File): Promise<AvisData> {
  const empty: AvisData = { convention: null, vref: null, montant: null, suggestedName: file.name }
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') return empty

  try {
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const { text } = await res.json() as { text: string }
    console.log('[PDF] Texte extrait (300 chars):', text.slice(0, 300))

    const result = parseAvisText(text, file.name)
    console.log('[PDF] Résultat:', result)
    return result

  } catch (e) {
    console.error('[PDF] Erreur extraction:', e)
    return empty
  }
}
