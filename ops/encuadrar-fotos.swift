// Encuadra las fotos de los niños de Regalos de diciembre alrededor del rostro.
//
// POR QUÉ (12 nov 2026). Las fundaciones mandan fotos de cuerpo entero, unas
// verticales y otras 16:9 con el niño pequeño en el centro. La tarjeta de
// /regalos las recorta en 4:3 por el medio y la cabeza se pierde. Sebas: «lo
// principal es el rostro». Un `object-position` no sirve para fotos tan
// distintas; esto busca la cara en cada una y recorta en 4:3 de la cabeza al
// pecho, que es la forma exacta de la tarjeta.
//
// TODO EN ESTE EQUIPO: usa Vision de macOS. Ninguna foto sale a un servicio.
//
// Uso (desde la raíz del repo, con la carpeta de fotos fuera del repo):
//   swiftc -O -o /tmp/encuadrar ops/encuadrar-fotos.swift
//   /tmp/encuadrar <carpeta-entrada> <carpeta-salida> [--hoja hoja.jpg]
//
// Lee .jpg, .jpeg, .png y .heic; escribe .jpg de 1200 px de ancho como mucho,
// con el mismo nombre. Con --hoja arma además una hoja de contactos para
// revisarlas todas de un vistazo antes de subirlas. Las fotos se suben después
// desde /admin/regalos (lote por zona-número) o, si ya están publicadas, se
// reemplazan en R2 con la misma clave. Ver ops/regalos.md.
//
// TRAMPA: el teléfono guarda muchas fotos acostadas con una marca de
// orientación que el navegador respeta. Sin `applyOrientationProperty` la cara
// se detecta igual pero el recorte sale de lado.

import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("Uso: encuadrar <carpeta-entrada> <carpeta-salida> [--hoja hoja.jpg]"); exit(2)
}
let entrada = URL(fileURLWithPath: args[1]), salida = URL(fileURLWithPath: args[2])
let hoja = args.firstIndex(of: "--hoja").flatMap { $0 + 1 < args.count ? args[$0 + 1] : nil }
try? FileManager.default.createDirectory(at: salida, withIntermediateDirectories: true)

let ctx = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
let extensiones: Set<String> = ["jpg", "jpeg", "png", "heic"]
let archivos = (try? FileManager.default.contentsOfDirectory(atPath: entrada.path))?
  .filter { extensiones.contains(($0 as NSString).pathExtension.lowercased()) }.sorted() ?? []
var hechas: [URL] = [], sinCara = 0

for f in archivos {
  guard let foto = CIImage(contentsOf: entrada.appendingPathComponent(f),
                           options: [.applyOrientationProperty: true]) else { print("✘", f, "ilegible"); continue }
  let W = foto.extent.width, H = foto.extent.height
  let pedido = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(ciImage: foto, options: [:]).perform([pedido])
  // La cara más grande es la del niño: las de fondo salen más pequeñas.
  let caras = (pedido.results ?? []).sorted { $0.boundingBox.width > $1.boundingBox.width }

  var ancho: CGFloat, alto: CGFloat, centroX: CGFloat, arriba: CGFloat
  if let c = caras.first {
    let b = c.boundingBox                       // normalizado, origen abajo a la izquierda
    let anchoCara = b.width * W, altoCara = b.height * H
    // Unas cinco caras de ancho: cabeza, hombros y pecho.
    ancho = min(W, max(anchoCara * 5.2, W * 0.25)); alto = ancho * 3 / 4
    if alto > H { alto = H; ancho = alto * 4 / 3 }
    centroX = b.midX * W
    arriba = (1 - b.maxY) * H - altoCara * 0.9   // un poco de aire sobre la cabeza
    print("✔", f, caras.count > 1 ? "(\(caras.count) caras: se usa la más grande)" : "")
  } else {
    // Sin cara detectada: la franja de arriba, al centro. Revisarla en la hoja.
    ancho = min(W, H * 4 / 3); alto = ancho * 3 / 4; centroX = W / 2; arriba = 0
    sinCara += 1
    print("·", f, "sin cara: se deja la franja de arriba")
  }
  let x = max(0, min(centroX - ancho / 2, W - ancho))
  let y = max(0, min(arriba, H - alto))
  let marco = CGRect(x: x, y: H - y - alto, width: ancho, height: alto)   // CoreImage: origen abajo
  var recorte = foto.cropped(to: marco).transformed(by: CGAffineTransform(translationX: -marco.minX, y: -marco.minY))
  let escala = min(1, 1200 / ancho)
  recorte = recorte.transformed(by: CGAffineTransform(scaleX: escala, y: escala))
  let destino = salida.appendingPathComponent((f as NSString).deletingPathExtension + ".jpg")
  do {
    try ctx.writeJPEGRepresentation(of: recorte, to: destino, colorSpace: srgb,
      options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.85])
    hechas.append(destino)
  } catch { print("✘", f, error.localizedDescription) }
}
print("\(hechas.count) de \(archivos.count) encuadradas; \(sinCara) sin cara detectada")

if let hoja = hoja, !hechas.isEmpty {
  let tw: CGFloat = 200, th: CGFloat = 150, cols = 9
  let filas = (hechas.count + cols - 1) / cols
  var lienzo = CIImage(color: .white).cropped(to: CGRect(x: 0, y: 0, width: tw * CGFloat(cols), height: th * CGFloat(filas)))
  for (i, u) in hechas.enumerated() {
    guard let im = CIImage(contentsOf: u) else { continue }
    let s = min(tw / im.extent.width, th / im.extent.height)
    let fila = i / cols, col = i % cols
    lienzo = im.transformed(by: CGAffineTransform(scaleX: s, y: s))
      .transformed(by: CGAffineTransform(translationX: CGFloat(col) * tw, y: CGFloat(filas - 1 - fila) * th))
      .composited(over: lienzo)
  }
  try? ctx.writeJPEGRepresentation(of: lienzo, to: URL(fileURLWithPath: hoja), colorSpace: srgb, options: [:])
  print("hoja de contactos:", hoja)
}
