import { NextRequest, NextResponse } from 'next/server'
import { execFile }  from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join, resolve } from 'path'
import { tmpdir }    from 'os'
import { randomBytes } from 'crypto'

const execFileAsync = promisify(execFile)

// Chemin du script Node.js autonome (hors webpack)
const EXTRACT_SCRIPT = join(process.cwd(), 'scripts', 'extract-pdf.mjs')

export async function POST(req: NextRequest) {
  const id      = randomBytes(6).toString('hex')
  const pdfPath = join(tmpdir(), `neodis-pdf-${id}.pdf`)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Écrire le PDF dans un fichier temporaire
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(pdfPath, buffer)

    // Lancer le script Node.js enfant (sans webpack, pdfjs-dist natif)
    // --require polyfills.cjs : installe DOMMatrix/ImageData/Path2D AVANT les imports ESM
    const POLYFILLS = resolve(join(process.cwd(), 'scripts', 'polyfills.cjs'))
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['--require', POLYFILLS, EXTRACT_SCRIPT, pdfPath],
      { timeout: 90000 }   // 90s : pdftoppm + tesseract peuvent prendre du temps
    )

    // Filtrer les warnings canvas (bruit), garder seulement les lignes [diag] et erreurs
    const diagLines = stderr.split('\n').filter(l => l.includes('[diag]') || l.includes('Error') || l.includes('error'))
    if (diagLines.length) console.log('[extract-pdf] diag:', diagLines.join(' | '))

    const result = JSON.parse(stdout.trim() || '{"text":""}') as { text: string; error?: string }
    console.log('[extract-pdf] chars:', result.text.length, '| preview:', result.text.slice(0, 150))

    return NextResponse.json({ text: result.text })

  } catch (e) {
    console.error('[extract-pdf] erreur:', e)
    return NextResponse.json({ text: '', error: String(e) })
  } finally {
    try { await unlink(pdfPath) } catch { /* ignore */ }
  }
}
