import Vision
import Foundation
import CoreGraphics

// Usage: swift ocr-pdf.swift <chemin_pdf>
// Sortie: texte OCR sur stdout

guard CommandLine.arguments.count > 1 else { exit(0) }
let pdfPath = CommandLine.arguments[1]
let pdfURL  = URL(fileURLWithPath: pdfPath)

guard let pdfDoc = CGPDFDocument(pdfURL as CFURL),
      let page   = pdfDoc.page(at: 1) else {
  exit(0)
}

// Rendre la page PDF en CGImage (haute résolution pour OCR)
let scale: CGFloat = 2.0
let mediaRect  = page.getBoxRect(.mediaBox)
let width      = Int(mediaRect.width  * scale)
let height     = Int(mediaRect.height * scale)

let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
guard let ctx = CGContext(data: nil, width: width, height: height,
                          bitsPerComponent: 8, bytesPerRow: 0,
                          space: colorSpace, bitmapInfo: bitmapInfo.rawValue) else { exit(0) }

// Fond blanc
ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

// Transformation pour adapter à la taille cible
let transform = page.getDrawingTransform(
  .mediaBox,
  rect: CGRect(x: 0, y: 0, width: width, height: height),
  rotate: 0, preserveAspectRatio: true
)
ctx.concatenate(transform)
ctx.drawPDFPage(page)

guard let cgImage = ctx.makeImage() else { exit(0) }

// OCR avec Vision (macOS 10.15+)
let semaphore = DispatchSemaphore(value: 0)
var fullText  = ""

let request = VNRecognizeTextRequest { req, _ in
  let obs = req.results as? [VNRecognizedTextObservation] ?? []
  fullText = obs.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
  semaphore.signal()
}
request.recognitionLevel        = .accurate
request.recognitionLanguages    = ["fr-FR", "en-US"]
request.usesLanguageCorrection  = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
semaphore.wait()

print(fullText)
