// Script Node.js autonome — aucun webpack, importe pdfjs-dist directement
// Appelé par l'API route via child_process.execFile
// Usage: node extract-pdf.mjs <chemin_pdf>
// Sortie: JSON sur stdout

// ── Polyfills minimaux (au cas où @napi-rs/canvas manque) ───────────────────
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0
      this.m11=1;this.m12=0;this.m13=0;this.m14=0
      this.m21=0;this.m22=1;this.m23=0;this.m24=0
      this.m31=0;this.m32=0;this.m33=1;this.m34=0
      this.m41=0;this.m42=0;this.m43=0;this.m44=1
      this.is2D=true;this.isIdentity=true
    }
    translate(){return new globalThis.DOMMatrix()}
    scale()    {return new globalThis.DOMMatrix()}
    multiply() {return new globalThis.DOMMatrix()}
    inverse()  {return new globalThis.DOMMatrix()}
    transformPoint(p){return p||{x:0,y:0,w:1}}
    static fromMatrix()      {return new globalThis.DOMMatrix()}
    static fromFloat64Array(){return new globalThis.DOMMatrix()}
  }
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4)}
  }
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {
    moveTo(){}lineTo(){}bezierCurveTo(){}closePath(){}arc(){}rect(){}
  }
}

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { resolve, dirname } from 'path'
import { fileURLToPath }    from 'url'
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'
import { tmpdir }           from 'os'
import { randomBytes }      from 'crypto'
import { execFileSync }     from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
GlobalWorkerOptions.workerSrc = resolve(
  __dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
)

// ── OCR via tesseract.js (Node.js) ───────────────────────────────────────────
// ── Cherche un exécutable dans les chemins courants ──────────────────────────
function findBin(name) {
  const paths = [
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    `/usr/bin/${name}`,
    `/opt/local/bin/${name}`,
  ]
  for (const p of paths) {
    try { readFileSync(p); return p } catch {}
  }
  return null
}

// ── OCR via Swift + Vision (natif macOS, zéro installation) ──────────────────
function ocrWithSwift(swiftBin, pdfPath) {
  try {
    const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'ocr-pdf.swift')
    const text = execFileSync(swiftBin, [scriptPath, pdfPath], {
      timeout: 60000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    process.stderr.write(`[diag] Swift Vision OCR chars=${text.length}\n`)
    return text
  } catch (e) {
    process.stderr.write(`[diag] Swift OCR error: ${e.message?.slice(0, 120)}\n`)
    return ''
  }
}

// ── OCR via pdftoppm + tesseract CLI ─────────────────────────────────────────
async function ocrPage(pdfPath) {
  const id     = randomBytes(6).toString('hex')
  const outDir = resolve(tmpdir(), `neodis-ocr-${id}`)
  const base   = resolve(outDir, 'page')

  try {
    // Créer dossier temp via Node.js (pas execFileSync)
    const { mkdirSync } = await import('fs')
    mkdirSync(outDir, { recursive: true })
    process.stderr.write(`[diag] outDir=${outDir}\n`)

    // Chercher pdftoppm et tesseract (prioritaire — rapide)
    const pdftoppm  = findBin('pdftoppm')
    const tesseract = findBin('tesseract')
    process.stderr.write(`[diag] pdftoppm=${pdftoppm} tesseract=${tesseract}\n`)

    if (!pdftoppm || !tesseract) {
      // Fallback 1 : Swift Vision (natif macOS, pas besoin d'install)
      const swift = findBin('swift')
      if (swift) {
        process.stderr.write('[diag] swift → Vision OCR\n')
        return ocrWithSwift(swift, pdfPath)
      }
      // Fallback 2 : tesseract.js
      process.stderr.write('[diag] fallback tesseract.js\n')
      return await ocrWithTesseractJs(pdfPath)
    }

    // Convertir page 1 en PNG 300 dpi (timeout 30s)
    process.stderr.write(`[diag] pdftoppm start...\n`)
    execFileSync(pdftoppm, ['-r', '300', '-l', '1', '-png', pdfPath, base], {
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    process.stderr.write(`[diag] pdftoppm done\n`)

    // Trouver l'image générée
    const files = readdirSync(outDir).filter(f => f.endsWith('.png'))
    if (!files.length) { process.stderr.write('[diag] pdftoppm: aucune image\n'); return '' }

    const imgPath = resolve(outDir, files[0])
    process.stderr.write(`[diag] image rendue: ${imgPath}\n`)

    // OCR tesseract CLI
    const txtBase = resolve(outDir, 'result')
    execFileSync(tesseract, [imgPath, txtBase, '-l', 'fra+eng'], { timeout: 30000 })

    const txtPath = `${txtBase}.txt`
    const text = readFileSync(txtPath, 'utf-8')
    process.stderr.write(`[diag] OCR chars=${text.length}\n`)
    return text

  } catch (e) {
    process.stderr.write(`[diag] OCR error: ${e.message}\n`)
    return ''
  } finally {
    try { execFileSync('rm', ['-rf', outDir]) } catch {}
  }
}

// ── Fallback : tesseract.js (sans pdfjs rendering) ───────────────────────────
async function ocrWithTesseractJs(pdfPath) {
  try {
    const { createCanvas } = await import('@napi-rs/canvas')
    const { createWorker } = await import('tesseract.js')
    const lib  = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const data = new Uint8Array(readFileSync(pdfPath))
    const pdf  = await lib.getDocument({ data, useSystemFonts: true }).promise
    const page = await pdf.getPage(1)
    const vp   = page.getViewport({ scale: 2.5 })
    const cv   = createCanvas(vp.width, vp.height)
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise
    const buf = cv.toBuffer('image/png')
    const tmp = resolve(tmpdir(), `neodis-tjs-${randomBytes(4).toString('hex')}.png`)
    writeFileSync(tmp, buf)
    const worker = await createWorker('fra+eng')
    const { data: { text } } = await worker.recognize(tmp)
    await worker.terminate()
    try { unlinkSync(tmp) } catch {}
    return text
  } catch (e) {
    process.stderr.write(`[diag] tesseract.js error: ${e.message}\n`)
    return ''
  }
}

// ── Extraction brute des bytes du PDF (fonctionne sans outil externe) ────────
function extractRawText(pdfPath) {
  const buf = readFileSync(pdfPath)
  const raw = buf.toString('latin1')  // préserver tous les bytes

  let out = ''

  // 1. Chaînes entre parenthèses : (texte ici)
  const parenRe = /\(([^\)\\]{2,200})\)/g
  let m
  while ((m = parenRe.exec(raw)) !== null) {
    const s = m[1].replace(/\\[nrtbf\\()]/g, ' ').trim()
    if (s.length > 2 && /[A-Za-z0-9]/.test(s)) out += s + ' '
  }

  // 2. Chaînes hex UTF-16BE : <FEFF0043004F...>
  const hexRe = /<(FEFF[0-9A-Fa-f]{4,})>/g
  while ((m = hexRe.exec(raw)) !== null) {
    try {
      const hex = m[1]
      let s = ''
      for (let i = 2; i < hex.length - 1; i += 4) {
        const code = parseInt(hex.slice(i, i + 4), 16)
        if (code > 31 && code < 65536) s += String.fromCharCode(code)
      }
      if (s.trim().length > 2) out += s + ' '
    } catch {}
  }

  // 3. Chaînes hex ASCII simple : <434F4E...>
  const hexAsciiRe = /<([0-9A-Fa-f]{4,})>/g
  while ((m = hexAsciiRe.exec(raw)) !== null) {
    try {
      const hex = m[1]
      if (hex.startsWith('FEFF')) continue  // déjà traité
      let s = ''
      for (let i = 0; i < hex.length - 1; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16)
        if (code > 31 && code < 128) s += String.fromCharCode(code)
      }
      if (s.trim().length > 3 && /[A-Za-z]/.test(s)) out += s + ' '
    } catch {}
  }

  process.stderr.write(`[diag] raw extraction chars=${out.length}\n`)
  return out
}

// ── Extraction principale ─────────────────────────────────────────────────────
async function main() {
  const pdfPath = process.argv[2]
  if (!pdfPath) {
    process.stdout.write(JSON.stringify({ text: '', error: 'no path' }))
    process.exit(0)
  }

  try {
    const data = new Uint8Array(readFileSync(pdfPath))
    const pdf  = await getDocument({ data, useSystemFonts: true }).promise
    process.stderr.write(`[diag] numPages=${pdf.numPages}\n`)

    // Étape 1 : extraction texte natif via pdfjs
    let text = ''
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      process.stderr.write(`[diag] page${i} items=${content.items.length}\n`)
      text += content.items.map(item => item.str ?? '').join(' ') + '\n'
    }

    // Étape 2 : extraction brute des bytes PDF (PDFs numériques avec encodage non-standard)
    const hasPattern = (t) => /CONVENTION|VREF|F-\d{4}/i.test(t)
    if (!hasPattern(text)) {
      process.stderr.write('[diag] pdfjs sans pattern → extraction brute bytes\n')
      const raw = extractRawText(pdfPath)
      if (hasPattern(raw)) text = raw
    }

    // Étape 3 : OCR (pdftoppm+tesseract ou Swift Vision si pattern toujours absent)
    if (!hasPattern(text)) {
      process.stderr.write('[diag] → fallback OCR\n')
      text = await ocrPage(pdfPath)
    }

    process.stdout.write(JSON.stringify({ text: text.trim() }))
  } catch (e) {
    process.stdout.write(JSON.stringify({ text: '', error: e.message }))
  }
}

main()
