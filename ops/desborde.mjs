/* DESBORDE DE LOS PDF, midiendo lo que se dibuja.

   pdf-lib no tiene flujo: dibuja en coordenadas absolutas y, si el texto no
   cabe, se sale de la hoja EN SILENCIO. No lanza, no avisa, no recorta — el
   trozo que queda fuera sencillamente no existe para quien abre el documento.
   Eso hace que el fallo sea invisible en las pruebas normales: el PDF se
   genera, pesa lo que debe y se ve bien mientras los datos sean cortos.

   Este script envuelve `drawText` y anota dónde cae cada trazo. Luego arma los
   cuatro documentos con datos adversarios y avisa si algo se salió del papel.

   Trampas aprendidas midiendo esto:

   1. NO BASTA MIRAR EL BORDE DERECHO. `fila` ancla el valor a la derecha
      (`x = margen + ancho - anchoDelTexto`), así que un valor largo se va por
      la IZQUIERDA con x negativo. La primera versión de este script dio nueve
      «limpio» que eran desbordes por el otro lado.

   2. EL SELLO DE ANULADO SE SALE A PROPÓSITO. Va rotado 38° y más ancho que la
      caja: es un sello, no texto. Se descarta por `rotate`.

   3. EL PIE VIVE FUERA DEL MARGEN INFERIOR y eso es correcto. El límite
      vertical de verdad es el borde físico de la hoja, no el margen.

   4. MEDIR NO ES VER. Después de que el número diga «limpio», hay que abrir el
      PDF. `sips -s format png -Z 1400 x.pdf --out x.png` basta en macOS.

   Uso:  node ops/desborde.mjs            (desde cualquier carpeta)
   Sale con código 1 si algún trazo se salió del papel.
*/
import { PDFPage } from "pdf-lib";

const REG = [];
const original = PDFPage.prototype.drawText;
PDFPage.prototype.drawText = function (txt, o = {}) {
  const t = String(txt);
  const f = o.font;
  REG.push({
    t, x: o.x, y: o.y,
    w: f ? f.widthOfTextAtSize(t, o.size) : 0,
    rot: !!o.rotate, medible: !!f
  });
  return original.call(this, txt, o);
};

const D = await import("../documentos.js");
const HOJA_X = 612, HOJA_Y = 792;   /* carta, en puntos */
const HOY = "2026-09-10";

const PALABROTA = "Z".repeat(200);
const URL = "https://www.thegiveandgrowproject.org/historias/" + "x".repeat(200);

const RECIBO = {
  guia: "GG-2026-04821", monto_centavos: 15000000, moneda: "COP", frecuencia: "mensual",
  modo: "fondo", metodo_pago: "PSE", aprobada_en: "2026-09-01", creada_en: "2026-09-01",
  idioma: "es", nota: "Para mi mamá."
};
const CERT = {
  numero: "CD-2026-0114", emitido_en: HOY, donante_nombre: "María Fernanda Gómez Restrepo",
  doc_tipo: "CC", doc_numero: "1.017.845.221", donante_ciudad: "Medellín",
  fecha_donacion: "2026-03-14", monto_centavos: 250000000, transaccion: "BC-88471203",
  destinacion: "la atención de población vulnerable"
};
const TRIAJE = {
  numero: "MMC-2026-0338", sector: "Vereda La Mesa", material: "Mampostería confinada",
  pisos: 1, anio_aprox: "~1998", danio_previo: true, habitada: true, medios: 6,
  nota_tecnica: "Se observan fisuras diagonales en el muro sur.",
  recomendacion: "No usar la habitación sur.", clasificacion: "revisar",
  ing_nombre: "Ing. Juan Pablo Ríos", ing_matricula: "05202-123456",
  matricula_verificada: 1, evaluado_en: "2026-09-08"
};

/* Cada caso es: nombre, y una función que arma el documento. Los campos que se
   fuerzan son los que escribe una persona — el donante en la dedicatoria, el
   ingeniero en el concepto, la familia al reportar. */
const CASOS = [];
const caso = (n, fn) => CASOS.push([n, fn]);

caso("recibo · normal", () => D.recibo(RECIBO, HOY));
caso("recibo · dedicatoria de 280 letras seguidas", () => D.recibo({ ...RECIBO, nota: "a".repeat(280) }, HOY));
caso("recibo · dedicatoria con URL pegada", () => D.recibo({ ...RECIBO, nota: "Mira " + URL + " y comparte" }, HOY));
caso("recibo · destino dirigido larguísimo", () => D.recibo({ ...RECIBO, modo: "dirigida", proyecto: PALABROTA }, HOY));
caso("recibo · guía deforme", () => D.recibo({ ...RECIBO, guia: "G".repeat(300) }, HOY));
caso("recibo · en inglés", () => D.recibo({ ...RECIBO, idioma: "en", nota: URL }, HOY));

caso("certificado · normal", () => D.certificado(CERT, HOY));
caso("certificado · nombre sin espacios", () => D.certificado({ ...CERT, donante_nombre: "N".repeat(200) }, HOY));
caso("certificado · razón social larga", () => D.certificado({ ...CERT, doc_tipo: "NIT", donante_nombre: "FUNDACION PARA EL DESARROLLO INTEGRAL DE LAS COMUNIDADES RURALES DEL ORIENTE ANTIOQUENO SOCIEDAD POR ACCIONES SIMPLIFICADA" }, HOY));
caso("certificado · domicilio largo", () => D.certificado({ ...CERT, donante_ciudad: "C".repeat(150) }, HOY));
caso("certificado · transacción larga", () => D.certificado({ ...CERT, transaccion: "T".repeat(200) }, HOY));
caso("certificado · destinación larga", () => D.certificado({ ...CERT, destinacion: "D".repeat(400) }, HOY));
caso("certificado · documento larguísimo", () => D.certificado({ ...CERT, doc_numero: "9".repeat(120) }, HOY));
caso("certificado · monto de trece cifras", () => D.certificado({ ...CERT, monto_centavos: 99999999999900 }, HOY));

for (const campo of ["nota_tecnica", "recomendacion", "sector", "material", "anio_aprox", "ing_nombre", "ing_matricula"]) {
  caso("concepto · " + campo + " con palabra de 200", () => D.informeTriage({ ...TRIAJE, [campo]: "Normal " + PALABROTA + " y sigue." }, HOY));
}
caso("concepto · normal", () => D.informeTriage(TRIAJE, HOY));
caso("concepto · lo que falta, larguísimo", () => D.informeTriage({ ...TRIAJE, clasificacion: "inevaluable", falta: "F".repeat(220) }, HOY));

let malos = 0;
for (const [nombre, fn] of CASOS) {
  REG.length = 0;
  let bytes;
  try { bytes = await fn(); }
  catch (e) { console.log("REVENTÓ  " + nombre + "  ·  " + e.message); malos++; continue; }
  const fuera = REG.filter((r) => r.medible && !r.rot && (r.x < -0.5 || r.x + r.w > HOJA_X + 0.5 || r.y < -0.5 || r.y > HOJA_Y + 0.5));
  if (!fuera.length) { console.log("ok       " + nombre.padEnd(48) + bytes.length + " bytes"); continue; }
  malos++;
  console.log("SE SALE  " + nombre);
  for (const r of fuera.slice(0, 3)) {
    console.log("           x " + r.x.toFixed(0) + ".." + (r.x + r.w).toFixed(0) + " (hoja 0.." + HOJA_X + ")   «" + r.t.slice(0, 46) + "»");
  }
  if (fuera.length > 3) console.log("           y " + (fuera.length - 3) + " trazo(s) más");
}

console.log("\n" + CASOS.length + " casos · " + malos + " con texto fuera del papel");
process.exit(malos ? 1 : 0);
