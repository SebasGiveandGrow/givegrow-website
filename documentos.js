/* ===========================================================================
   Give&Grow International · documentos en PDF
   ===========================================================================
   Dos piezas, y la diferencia entre ellas es jurídica, no de formato:

     RECIBO       lo emite el sistema solo al confirmarse el pago. Dice qué
                  llegó, cuándo y con qué guía, y dice expresamente que NO es
                  el certificado tributario. Por eso puede ser automático: no
                  afirma nada que requiera una firma profesional.

     CERTIFICADO  es una declaración bajo la gravedad de juramento que firman
                  el Representante Legal y la Revisora Fiscal (art. 125-3 ET y
                  num. 2 del art. 1.2.1.4.3 del Decreto 1625 de 2016). Lo emite
                  una persona desde /admin, nunca el webhook.

   Se generan en el Worker y no en el navegador porque llevan datos personales
   (nombre, documento, domicilio) que no deben salir de la base privada.

   Tipografía: las Standard 14 del PDF (Helvetica), no las de marca. Unbounded e
   Inter viven en /vendor como woff2 y pdf-lib no lee woff2 — habría que
   convertirlas, embeberlas con fontkit y sumar cientos de KB al bundle del
   Worker. Un documento tributario se lee mejor con tipografía de documento; la
   marca la cargan la estructura, el color y el papel, no la fuente.
   =========================================================================== */

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

/* --- identidad de la entidad. Un solo lugar: si cambia el domicilio o la
       Revisora Fiscal, se cambia aquí y cambia en los dos documentos. --- */
export const ENTIDAD = {
  nombre: "FUNDACIÓN GIVE&GROW INTERNATIONAL",
  nombreCorto: "Fundación Give&Grow International",
  nit: "901.948.930-2",
  domicilio: "Carrera 82 A # 9 A Sur 28, Medellín (Antioquia), Colombia",
  ciudad: "Medellín",
  vigilancia: "Gobernación de Antioquia",
  banco: "Bancolombia",
  cuenta: "cuenta de ahorros No. 31000009221",
  sitio: "thegiveandgrowproject.org",
  repLegal: { nombre: "Juan Sebastián Navarro Osorio", cargo: "Representante Legal", cc: "1.007.420.930" },
  /* T.P. verificada contra el texto publicado en #transparencia. La C.C. de la
     Revisora Fiscal acompaña a la T.P. porque el art. 3 de la Ley 43 de 1990
     obliga a consignar el número de tarjeta profesional, y quien recibe el
     documento debe poder verificar a la persona detrás de esa tarjeta. */
  revisora: { nombre: "Manuela Londoño Arboleda", cargo: "Revisora Fiscal", tp: "244894-T", cc: "1.040.745.501" }
};

/* --- paleta: los mismos tokens del sitio, en el espacio de color del PDF --- */
const VERDE = rgb(0.122, 0.361, 0.220);   // #1F5C38
const TINTA = rgb(0.098, 0.094, 0.075);   // #191813
const SUAVE = rgb(0.278, 0.267, 0.231);   // #47443B
const GRIS  = rgb(0.361, 0.388, 0.435);   // #5C636F
const LINEA = rgb(0.855, 0.827, 0.765);   // #DAD3C3
const PAPEL = rgb(0.984, 0.973, 0.945);   // #FBF8F1

const CARTA = [612, 792];                 // carta: el tamaño de oficina en Colombia
/* `abajo` deja aire de verdad sobre el pie: con 66 el último numeral del
   certificado quedaba a 6 pt de la regla del folio y se leía como si invadiera
   el pie de página. */
const MG    = { izq: 62, der: 62, arriba: 58, abajo: 84 };
const ANCHO = CARTA[0] - MG.izq - MG.der;

/* ---------------------------------------------------------------------------
   Las Standard 14 se codifican en WinAnsi, que cubre el español completo pero
   no las comillas curvas ni los guiones tipográficos que el copy del sitio sí
   usa. pdf-lib LANZA al encontrar un carácter que no puede codificar, así que
   un apóstrofo curvo en una dedicatoria tumbaría el recibo entero. Se traducen
   los sospechosos habituales y se descarta el resto.
   --------------------------------------------------------------------------- */
const MAPA = {
  "‘": "'", "’": "'", "‚": ",", "“": '"', "”": '"',
  "–": "-", "—": "—", "…": "...", " ": " ",
  "−": "-", "•": "·", "​": "", " ": " ", " ": " "
};
function winansi(s) {
  let out = "";
  for (const ch of String(s == null ? "" : s)) {
    if (Object.prototype.hasOwnProperty.call(MAPA, ch)) { out += MAPA[ch]; continue; }
    const c = ch.codePointAt(0);
    /* Latin-1 imprimible + los pocos huecos de CP1252 que sí existen. */
    if (c === 10 || c === 13) { out += ch; continue; }
    if (c >= 32 && c <= 126) { out += ch; continue; }
    if (c >= 160 && c <= 255) { out += ch; continue; }
    if (c === 0x2014 || c === 0x20AC) { out += ch; continue; }
    out += "";
  }
  return out;
}

/* --- formatos ------------------------------------------------------------ */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/* Las fechas de D1 vienen como 'YYYY-MM-DD HH:MM:SS' en UTC. Se parte la
   cadena en vez de usar Date: sin zona horaria explícita, `new Date()` sobre
   ese formato se interpreta distinto según el motor, y una fecha corrida un día
   en un documento tributario no es un detalle cosmético. */
export function partesFecha(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}
export function fechaLarga(iso) {
  const p = partesFecha(iso);
  if (!p) return "";
  return p.dia + " de " + MESES[p.mes - 1] + " de " + p.anio;
}
export function pesos(centavos) {
  return "$" + Math.round(Number(centavos || 0) / 100).toLocaleString("es-CO");
}

/* ---------------------------------------------------------------------------
   Valor en letras. El art. 125-3 lo pide en el certificado y escribirlo a mano
   es justo el punto donde se cuela un error que invalida el documento.
   Cubre hasta 999.999.999.999, muy por encima del tope de la pasarela.
   --------------------------------------------------------------------------- */
const UNI = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DEC = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CEN = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos"];

function centenas(n) {
  if (n === 0) return "";
  if (n === 100) return "cien";
  let s = "";
  const c = Math.floor(n / 100), r = n % 100;
  if (c) s += CEN[c];
  if (r) {
    if (s) s += " ";
    if (r < 30) s += UNI[r];
    else {
      const d = Math.floor(r / 10), u = r % 10;
      s += DEC[d] + (u ? " y " + UNI[u] : "");
    }
  }
  return s;
}

/* «dos millones DE pesos», pero «doscientos mil pesos». El español pide la
   preposición cuando el numeral termina en millón/millones o billón/billones, y
   no cuando termina en mil o en unidades. En un documento que se firma bajo
   juramento el valor en letras es el que manda si discrepa de la cifra, así que
   la concordancia no es un detalle de estilo. */
export function pesosEnLetras(n) {
  const letras = enLetras(n);
  return /(mill[oó]n|millones|bill[oó]n|billones)$/.test(letras)
    ? letras + " de pesos"
    : letras + " pesos";
}

export function enLetras(n) {
  n = Math.round(Number(n) || 0);
  if (n === 0) return "cero";
  if (n < 0) return "menos " + enLetras(-n);

  const bloques = [];               // de menor a mayor, de tres cifras
  let resto = n;
  while (resto > 0) { bloques.push(resto % 1000); resto = Math.floor(resto / 1000); }

  /* Escalas cortas del español: mil, millón, mil millones, billón. */
  const partes = [];
  for (let i = bloques.length - 1; i >= 0; i--) {
    const b = bloques[i];
    if (b === 0) continue;
    if (i === 0) { partes.push(centenas(b)); continue; }
    if (i === 1) { partes.push(b === 1 ? "mil" : centenas(b) + " mil"); continue; }
    if (i === 2) { partes.push(b === 1 ? "un millón" : centenas(b) + " millones"); continue; }
    if (i === 3) { partes.push(b === 1 ? "mil millones" : centenas(b) + " mil millones"); continue; }
    partes.push(b === 1 ? "un billón" : centenas(b) + " billones");
  }
  /* Ante escala, el español apocopa el "uno" final: "treinta y un mil", no
     "treinta y uno mil". "veintiuno" apocopa CON tilde — "veintiún mil" — y por
     eso necesita su propia regla antes que la general. */
  const escala = "(mil|millones|millón|billones|billón)";
  return partes.join(" ")
    .replace(new RegExp("veintiuno " + escala, "g"), "veintiún $1")
    .replace(new RegExp("\\buno " + escala, "g"), "un $1");
}

/* ===========================================================================
   Motor de maquetación
   ===========================================================================
   pdf-lib dibuja en coordenadas absolutas y no sabe de flujo: si el texto no
   cabe, se sale de la hoja en silencio. Este objeto lleva el cursor, parte los
   párrafos en líneas y abre página cuando hace falta — que en el certificado
   ocurre siempre, porque no cabe en una.
   =========================================================================== */

class Hoja {
  constructor(pdf, fuentes) {
    this.pdf = pdf;
    this.f = fuentes;
    this.paginas = [];
    this.nueva();
  }

  nueva() {
    this.p = this.pdf.addPage(CARTA);
    this.p.drawRectangle({ x: 0, y: 0, width: CARTA[0], height: CARTA[1], color: PAPEL });
    this.paginas.push(this.p);
    this.y = CARTA[1] - MG.arriba;
    return this.p;
  }

  /* Reserva vertical: si lo que viene no cabe entero, empieza página. Evita el
     huérfano clásico de un encabezado solo al pie de la hoja. */
  reservar(alto) {
    if (this.y - alto < MG.abajo) this.nueva();
  }

  salto(n) { this.y -= n; }

  regla(opts = {}) {
    const ancho = opts.ancho || ANCHO;
    const x = opts.x != null ? opts.x : MG.izq;
    this.reservar(10);
    this.p.drawLine({
      start: { x, y: this.y }, end: { x: x + ancho, y: this.y },
      thickness: opts.grueso || 0.75, color: opts.color || LINEA
    });
    this.y -= (opts.despues != null ? opts.despues : 14);
  }

  /* Parte una cadena en líneas que quepan en `ancho`. Una palabra más larga que
     la caja (una URL, un correo) se deja desbordar en su propia línea antes que
     partirla: un correo cortado deja de ser un correo. */
  lineas(txt, fuente, tam, ancho) {
    const salida = [];
    for (const bloque of String(txt).split("\n")) {
      let linea = "";
      for (const palabra of bloque.split(/\s+/)) {
        if (!palabra) continue;
        const prueba = linea ? linea + " " + palabra : palabra;
        if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) { linea = prueba; continue; }
        if (linea) salida.push(linea);
        linea = palabra;
      }
      salida.push(linea);
    }
    return salida;
  }

  texto(txt, opts = {}) {
    const tam = opts.tam || 10.5;
    const fuente = opts.fuente || this.f.normal;
    const color = opts.color || TINTA;
    const ancho = opts.ancho || ANCHO;
    const x0 = opts.x != null ? opts.x : MG.izq;
    const interlinea = opts.interlinea || tam * 1.45;

    const ls = this.lineas(winansi(txt), fuente, tam, ancho);
    for (const l of ls) {
      this.reservar(interlinea);
      let x = x0;
      if (opts.centrado) x = x0 + (ancho - fuente.widthOfTextAtSize(l, tam)) / 2;
      this.p.drawText(l, { x, y: this.y - tam, size: tam, font: fuente, color });
      this.y -= interlinea;
    }
    if (opts.despues) this.y -= opts.despues;
    return ls.length;
  }

  /* Eyebrow del sistema visual: versalita ancha en verde. */
  cintillo(txt, opts = {}) {
    const tam = opts.tam || 8;
    const t = winansi(String(txt).toUpperCase());
    this.reservar(tam * 2);
    /* pdf-lib no expone tracking, así que se dibuja letra a letra. Es el único
       gesto tipográfico de marca que sobrevive sin fuente propia. */
    let x = opts.x != null ? opts.x : MG.izq;
    const paso = opts.tracking != null ? opts.tracking : 1.6;
    for (const ch of t) {
      this.p.drawText(ch, { x, y: this.y - tam, size: tam, font: this.f.negrita, color: opts.color || VERDE });
      x += this.f.negrita.widthOfTextAtSize(ch, tam) + paso;
    }
    this.y -= (opts.despues != null ? opts.despues : tam * 2);
  }

  /* Fila de ledger: etiqueta a la izquierda, dato a la derecha, regla debajo.
     Es la misma gramática que la tabla de transparencia del sitio. */
  fila(clave, valor, opts = {}) {
    const tam = opts.tam || 10;
    const alto = opts.alto || 22;
    this.reservar(alto + 4);
    const yTexto = this.y - tam - 4;
    this.p.drawText(winansi(clave), { x: MG.izq, y: yTexto, size: tam, font: this.f.normal, color: GRIS });
    const v = winansi(String(valor == null ? "" : valor));
    const fv = opts.fuerte === false ? this.f.normal : this.f.negrita;
    /* El valor se ancla a la derecha; si es tan largo que invadiría la etiqueta,
       se deja alineado a la izquierda del hueco disponible y se recorta. */
    const anchoV = fv.widthOfTextAtSize(v, tam);
    const disponible = ANCHO - this.f.normal.widthOfTextAtSize(winansi(clave), tam) - 18;
    if (anchoV <= disponible) {
      this.p.drawText(v, { x: MG.izq + ANCHO - anchoV, y: yTexto, size: tam, font: fv, color: TINTA });
    } else {
      const ls = this.lineas(v, fv, tam, disponible);
      let yy = yTexto;
      for (const l of ls) {
        this.p.drawText(l, { x: MG.izq + ANCHO - fv.widthOfTextAtSize(l, tam), y: yy, size: tam, font: fv, color: TINTA });
        yy -= tam * 1.35;
      }
      this.y -= (ls.length - 1) * tam * 1.35;
    }
    this.y -= alto;
    this.p.drawLine({
      start: { x: MG.izq, y: this.y + 6 }, end: { x: MG.izq + ANCHO, y: this.y + 6 },
      thickness: 0.6, color: LINEA
    });
  }

  /* Numerales del certificado. La sangría francesa mantiene el número
     colgando, que es como se lee un articulado. */
  numeral(n, txt, opts = {}) {
    const tam = opts.tam || 9.3;
    const sangria = 18;
    const interlinea = tam * 1.42;
    const ls = this.lineas(winansi(txt), this.f.normal, tam, ANCHO - sangria);
    this.reservar(interlinea);
    this.p.drawText(String(n) + ".", { x: MG.izq, y: this.y - tam, size: tam, font: this.f.negrita, color: VERDE });
    let primera = true;
    for (const l of ls) {
      if (!primera) this.reservar(interlinea);
      this.p.drawText(l, { x: MG.izq + sangria, y: this.y - tam, size: tam, font: this.f.normal, color: SUAVE });
      this.y -= interlinea;
      primera = false;
    }
    this.y -= 3;
  }

  /* Sello diagonal en TODAS las páginas. Un certificado anulado que se vuelve a
     descargar limpio es un documento falso circulando con nuestra firma: quien
     lo reciba no tiene forma de saber que ya no vale. El sello va debajo del
     texto (se dibuja antes de nada en cada página) para no estorbar la lectura,
     pero es imposible no verlo. */
  sellar(texto, color) {
    const tam = 58;
    const t = winansi(String(texto).toUpperCase());
    this.paginas.forEach((p) => {
      const ancho = this.f.negrita.widthOfTextAtSize(t, tam);
      p.drawText(t, {
        x: (CARTA[0] - ancho * 0.72) / 2,
        y: CARTA[1] / 2 - 90,
        size: tam,
        font: this.f.negrita,
        color: color || rgb(0.75, 0.28, 0.22),
        rotate: degrees(38),
        opacity: 0.16
      });
    });
  }

  /* Pie institucional repetido en todas las páginas, con foliación. Se dibuja
     al cerrar, cuando ya se sabe cuántas páginas hay: un documento tributario
     sin "página 1 de 2" invita a que le falte una hoja y nadie lo note. */
  cerrarPie(referencia) {
    const total = this.paginas.length;
    this.paginas.forEach((p, i) => {
      const y = MG.abajo - 26;
      p.drawLine({
        start: { x: MG.izq, y: y + 20 }, end: { x: MG.izq + ANCHO, y: y + 20 },
        thickness: 0.6, color: LINEA
      });
      const izq = winansi(ENTIDAD.nombreCorto + "  ·  NIT " + ENTIDAD.nit + "  ·  " + ENTIDAD.sitio);
      p.drawText(izq, { x: MG.izq, y: y + 8, size: 7.5, font: this.f.normal, color: GRIS });
      const der = winansi(referencia + "  ·  Página " + (i + 1) + " de " + total);
      p.drawText(der, {
        x: MG.izq + ANCHO - this.f.normal.widthOfTextAtSize(der, 7.5),
        y: y + 8, size: 7.5, font: this.f.normal, color: GRIS
      });
    });
  }
}

async function abrir(titulo, asunto) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setSubject(asunto);
  pdf.setAuthor(ENTIDAD.nombreCorto);
  pdf.setProducer(ENTIDAD.sitio);
  pdf.setCreator(ENTIDAD.sitio);
  const fuentes = {
    normal:  await pdf.embedFont(StandardFonts.Helvetica),
    negrita: await pdf.embedFont(StandardFonts.HelveticaBold),
    cursiva: await pdf.embedFont(StandardFonts.HelveticaOblique)
  };
  return { pdf, hoja: new Hoja(pdf, fuentes), f: fuentes };
}

/* Membrete común: el nombre de la entidad como cintillo y una regla gruesa.
   Sin logo: el SVG de marca es un lockup tipográfico en Unbounded y rasterizarlo
   para el PDF lo dejaría peor que no ponerlo. */
function membrete(h) {
  h.cintillo(ENTIDAD.nombreCorto, { tam: 8.5, tracking: 1.8, despues: 12 });
  h.regla({ grueso: 1.6, color: VERDE, despues: 22 });
}

/* ===========================================================================
   RECIBO DE APORTE
   ===========================================================================
   Automático. Su trabajo es que el donante conserve por escrito su número de
   guía y sepa qué NO es este papel.
   =========================================================================== */

const T = {
  es: {
    titulo: "Recibo de aporte",
    cintilloGuia: "Número de guía",
    aviso: "Este documento confirma la recepción de tu aporte. No es el certificado de donación para efectos tributarios: ese se expide aparte, firmado por el Representante Legal y la Revisora Fiscal.",
    fecha: "Fecha de confirmación",
    monto: "Monto",
    frecuencia: "Frecuencia",
    destino: "Destino",
    medio: "Medio de pago",
    dedicatoria: "Dedicatoria",
    rastreo: "Sigue tu aporte en " + ENTIDAD.sitio + "/#rastrea con tu número de guía. Ahí aparecerá el acta cuando la fundación aliada haga la entrega.",
    /* En una campaña propia no hay fundación aliada: entregamos nosotros, y
       decir lo contrario en el recibo sería sencillamente falso. */
    rastreoBrigada: "Sigue tu aporte en " + ENTIDAD.sitio + "/#rastrea con tu número de guía. Ahí aparecerá el acta cuando la brigada haga la entrega.",
    esal: "Entidad sin ánimo de lucro calificada en el Régimen Tributario Especial del impuesto sobre la renta y complementarios.",
    generado: "Documento generado automáticamente el ",
    freq: { unico: "Único", mensual: "Mensual", anual: "Anual" },
    fondo: "Fondo general del HUB SOCIAL",
    asunto: "Recibo de aporte"
  },
  en: {
    titulo: "Gift receipt",
    cintilloGuia: "Tracking number",
    aviso: "This document confirms we received your gift. It is not the donation certificate for tax purposes: that one is issued separately, signed by the Legal Representative and the Statutory Auditor.",
    fecha: "Confirmed on",
    monto: "Amount",
    frecuencia: "Frequency",
    destino: "Destination",
    medio: "Payment method",
    dedicatoria: "Dedication",
    rastreo: "Follow your gift at " + ENTIDAD.sitio + "/#rastrea with your tracking number. The delivery record will appear there once the partner foundation delivers.",
    rastreoBrigada: "Follow your gift at " + ENTIDAD.sitio + "/#rastrea with your tracking number. The delivery record will appear there once the brigade delivers.",
    esal: "Non-profit entity qualified under Colombia's Special Tax Regime for income tax.",
    generado: "Document generated automatically on ",
    freq: { unico: "One-time", mensual: "Monthly", anual: "Annual" },
    fondo: "HUB SOCIAL general fund",
    asunto: "Gift receipt"
  }
};

const METODOS = {
  CARD: "Tarjeta", BANCOLOMBIA_TRANSFER: "Botón Bancolombia", NEQUI: "Nequi",
  PSE: "PSE", BANCOLOMBIA_COLLECT: "Corresponsal Bancolombia"
};

export async function recibo(a, hoyISO) {
  const en = a.idioma === "en";
  const t = en ? T.en : T.es;
  const { pdf, hoja: h, f } = await abrir(t.titulo + " " + a.guia, t.asunto);

  membrete(h);

  h.texto(t.titulo, { tam: 23, fuente: f.negrita, color: TINTA, interlinea: 27, despues: 14 });

  /* Elemento firma del documento: la guía en grande, en verde, tratada como la
     cifra monumental del sistema visual. Es el único dato que el donante
     necesita conservar, así que es lo que más pesa en la página. */
  h.cintillo(t.cintilloGuia, { tam: 7.5, despues: 12 });
  h.texto(a.guia, { tam: 30, fuente: f.negrita, color: VERDE, interlinea: 34, despues: 18 });

  h.texto(t.aviso, { tam: 9, color: GRIS, interlinea: 13.5, despues: 20, ancho: ANCHO - 60 });

  h.regla({ despues: 16 });
  h.fila(t.fecha, fechaLarga(a.aprobada_en || a.creada_en));
  h.fila(t.monto, pesos(a.monto_centavos) + " " + (a.moneda || "COP"));
  h.fila(t.frecuencia, t.freq[a.frecuencia] || a.frecuencia);
  h.fila(t.destino, a.modo === "dirigida" ? (a.proyecto || a.destino_id || "-") : t.fondo);
  if (a.metodo_pago) h.fila(t.medio, METODOS[a.metodo_pago] || a.metodo_pago);

  if (a.nota) {
    h.salto(14);
    h.cintillo(t.dedicatoria, { tam: 7.5, despues: 10 });
    /* La dedicatoria la escribe el donante y muchas ya vienen entrecomilladas.
       Sin quitar las suyas, el documento salía con comillas dobles pegadas. */
    const nota = String(a.nota).trim().replace(/^["'“”«»]+/, "").replace(/["'“”«»]+$/, "").trim();
    h.texto("“" + nota + "”", {
      tam: 11.5, fuente: f.cursiva, color: SUAVE, interlinea: 17, despues: 8
    });
  }

  h.salto(18);
  const esCampana = String(a.destino_id || "").startsWith("brigada-");
  h.texto(esCampana ? t.rastreoBrigada : t.rastreo,
    { tam: 9.5, color: SUAVE, interlinea: 14, despues: 18 });

  h.regla({ despues: 12 });
  h.texto(ENTIDAD.nombreCorto, { tam: 9, fuente: f.negrita, color: TINTA, despues: 2 });
  h.texto("NIT " + ENTIDAD.nit + "  ·  " + ENTIDAD.domicilio, { tam: 8.5, color: GRIS, interlinea: 12 });
  h.texto(t.esal, { tam: 8.5, color: GRIS, interlinea: 12, despues: 6 });
  h.texto(t.generado + fechaLarga(hoyISO) + ".", { tam: 8, color: GRIS });

  h.cerrarPie(a.guia);
  return pdf.save();
}


/* ===========================================================================
   CONCEPTO TÉCNICO PRELIMINAR — triage estructural
   ===========================================================================
   Lo que recibe la familia. Desde el 19 ago 2026 su centro es el CONCEPTO
   —si hay señales para no permanecer, qué precauciones tomar y con qué
   materiales reparar— y la prioridad de visita pasó a ser un dato más. El
   nombre del documento cambió con él.

   Lo que NO cambió, y no debe cambiar, es el aviso de que esto no determina
   habitabilidad: sigue yendo antes que el resultado y con las mismas palabras.

   Un papel con membrete de fundación y firma de ingeniero se lee como una
   sentencia sobre la casa. Si alguien lo usa para decidir si vuelve a dormir
   ahí, el documento tiene que haberle dicho, en grande y arriba, que esa
   decisión no está aquí — la toma una visita y la autoridad del municipio.
   Por eso el aviso va antes que el resultado y no en letra pequeña al final.
   =========================================================================== */
/* ===========================================================================
   INSPECCIÓN VISUAL PRELIMINAR — el catálogo de lo que se revisa
   ===========================================================================
   FUENTE ÚNICA de los 26 ítems. Los lee el formulario que se llena en terreno
   y los lee el PDF que sale de él: si estuvieran dos veces, se separarían sin
   que nadie lo note — este repositorio ya tiene esa cicatriz con el articulado
   del certificado, y por eso existe el check #10 del gate.

   Transcrito del documento en papel «Inspección Visual Preliminar de Vivienda»,
   sin añadir ni quitar ítems. Si los ingenieros lo corrigen, se corrige AQUÍ y
   las dos pantallas cambian solas.

   ⚠️ LOS IDENTIFICADORES SON PERMANENTES. Las respuestas se guardan en JSON
   con esta clave (`{"3.2":{"m":"RE",…}}`), así que renumerar un ítem
   reescribiría el significado de inspecciones ya firmadas. Para quitar uno se
   marca `retirado:true` y se deja su hueco; para añadir, se usa un número nuevo.

   LA ESCALA es la del papel y no se traduce a otra cosa:
     RE  = requiere revisión especializada
     OBS = observación a documentar
     SO  = sin observación aparente
   =========================================================================== */
export const INSPECCION_SECCIONES = [
  { n: "1", titulo: "Terreno y cimentación", items: [
    { id: "1.1", t: "Grietas en el suelo, hundimientos o talud inestable cercano" },
    { id: "1.2", t: "Pisos desnivelados / asentamientos (la casa «se corrió»)" },
    { id: "1.3", t: "Grietas que suben desde la base del muro" },
    { id: "1.4", t: "Humedad o socavación por agua en la base" }
  ]},
  { n: "2", titulo: "Estructura (columnas, vigas, nudos, placas)", items: [
    { id: "2.1", t: "Columnas: grietas diagonales, en X o con acero expuesto" },
    { id: "2.2", t: "Vigas: fisuras a 45°, pandeo o desprendimiento de recubrimiento" },
    { id: "2.3", t: "Nudos viga-columna dañados" },
    { id: "2.4", t: "Placa / entrepiso: fisuras pasantes o deflexión visible" },
    { id: "2.5", t: "Acero de refuerzo expuesto, corroído o pandeado" }
  ]},
  { n: "3", titulo: "Muros", items: [
    { id: "3.1", t: "Identificar si es portante o divisorio (anotar en observaciones)" },
    { id: "3.2", t: "Grietas pasantes (atraviesan el muro) o diagonales / escalonadas" },
    { id: "3.3", t: "Muro fuera de plomo (desplomado) o abombado" },
    { id: "3.4", t: "Separación muro-estructura o muro-muro en esquinas" },
    { id: "3.5", t: "Muros en tapia / adobe / bahareque (mayor vulnerabilidad)" }
  ]},
  { n: "4", titulo: "Cubierta", items: [
    { id: "4.1", t: "Estructura de soporte (cerchas/correas): pudrición, comején, desplazamiento" },
    { id: "4.2", t: "Anclajes de la cubierta a los muros (riesgo de soltarse)" },
    { id: "4.3", t: "Tejas rotas/desplazadas y filtraciones activas" }
  ]},
  { n: "5", titulo: "Cielo raso y pisos", items: [
    { id: "5.1", t: "Cielo raso: abombamiento, manchas de humedad, riesgo de caída" },
    { id: "5.2", t: "Pisos: hundimientos o baldosa fracturada en línea (sigue grieta inferior)" }
  ]},
  { n: "6", titulo: "Puertas y ventanas", items: [
    { id: "6.1", t: "Marcos deformados / hojas que no cierran (posible movimiento estructural)" },
    { id: "6.2", t: "Vidrios rotos o ventanas fuera de escuadra" }
  ]},
  { n: "7", titulo: "Instalaciones (seguridad inmediata)", items: [
    { id: "7.1", t: "Eléctrica: cableado expuesto, humedad en tomas o tablero" },
    { id: "7.2", t: "Gas: olor o tubería comprometida" },
    { id: "7.3", t: "Hidrosanitaria: fugas activas o tubería rota" }
  ]},
  { n: "8", titulo: "Humedad / patologías", items: [
    { id: "8.1", t: "Origen (cubierta, capilaridad, fuga) — anotar" },
    { id: "8.2", t: "Moho, eflorescencias, pudrición de maderas" }
  ]}
];

/* ===========================================================================
   AYUDA PARA QUIEN NO ES INGENIERO
   ===========================================================================
   Fuente: «Guía Técnica para la Inspección de Edificaciones Después de un
   Sismo — Manual de Campo», 4.ª edición, marzo de 2018. Asociación Colombiana
   de Ingeniería Sísmica (AIS) para el IDIGER de Bogotá.

   LA REGLA QUE GOBIERNA ESTE BLOQUE: solo se afirma lo que la guía respalda, y
   donde NO dice nada se dice que no dice nada. La guía es una fuente
   autorizada; rellenar sus huecos con conocimiento general y presentarlo con su
   autoridad sería justo lo que este proyecto prohíbe.

   Lo que la guía NO define, y por eso aquí no se explica como si lo hiciera:
   grieta escalonada, grieta pasante, grieta de retracción, cómo distinguir una
   grieta nueva de una vieja, deflexión, eflorescencia, abombado, fuera de plomo
   (usa «desplome» e «inclinación»), cercha y correa (las usa sin definirlas), y
   la humedad como daño. Varios de esos términos vienen del formulario en papel,
   no de la guía.

   Y UNA CORRECCIÓN QUE LA GUÍA LE HACE A ESTE FORMULARIO: su escala oficial
   tiene CINCO niveles de daño más colapso (ninguno/muy leve, leve, moderado,
   FUERTE, severo, colapso total) y CUATRO categorías de habitabilidad con color
   (habitable verde, uso restringido amarillo, no habitable naranja, peligro de
   colapso rojo). Nuestra escala RE/Obs/S-O es más simple a propósito —es la del
   papel que usa la fundación y no pretende clasificar habitabilidad—, pero
   conviene no confundirlas ni presentar la nuestra como si fuera la oficial.
   =========================================================================== */

/* El ancho de la grieta es la herramienta operativa central de la guía, y NO es
   el mismo umbral para todos los materiales. Confundirlos hace que una grieta
   grave en adobe parezca leve, o al revés. */
export const INSPECCION_ANCHOS = [
  { material: "Concreto (vigas, columnas, placas)", leve: "0,2 a 1,0 mm", moderado: "1,0 a 2,0 mm", fuerte: "más de 2,0 mm, con el acero a la vista" },
  { material: "Mampostería (ladrillo o bloque)",    leve: "0,2 a 1,0 mm", moderado: "1,0 a 3,0 mm", fuerte: "más de 3,0 mm, con piezas dislocadas" },
  { material: "Tapia, adobe o bahareque",           leve: "0,4 a 2,0 mm", moderado: "2,0 a 4,0 mm", fuerte: "más de 4,0 mm" }
];

/* El primer filtro que la guía autoriza y que cualquiera puede aplicar sin
   instrumento: si la grieta se ve a simple vista, ya pasó el umbral más bajo. */
export const INSPECCION_REGLA_VISTA =
  "Antes de medir: la guía del AIS llama «difícilmente visibles» a las fisuras de menos de 0,2 mm y " +
  "«perceptible a simple vista» a partir de ahí. Si la ves sin acercarte ni buscarla, ya no es la más leve.";

/* Ayuda por ítem. SOLO los que la guía respalda; los demás no llevan nada antes
   que llevar una explicación inventada. */
export const INSPECCION_AYUDA = {
  "1.1": "Agrietarse el suelo en una ladera puede indicar que un deslizamiento está próximo. La guía del AIS trata las grietas generalizadas en el terreno como la señal más grave de este grupo. Y si hay problemas de talud, dice que la evaluación necesita un ingeniero geotecnista, no solo estructural.",
  "1.2": "La guía llama subsidencia al desplazamiento hacia abajo del terreno que sostiene la casa, y nombra como causas frecuentes las tuberías de desagüe perforadas —el agua que se escapa erosiona los cimientos—, las obras subterráneas y los árboles robustos que secan el suelo.",
  "1.4": "Ojo con el agua: la guía nombra la fuga de un desagüe como causa de que el suelo bajo la casa se erosione. No es solo humedad, puede estar vaciando el apoyo.",
  "2.1": "Las grietas diagonales en columnas las produce el cortante o la torsión. Cuando se ve el acero de refuerzo, la guía ya lo cataloga como daño fuerte. Y las columnas son uno de los elementos que, dañados de gravedad, pueden obligar a evacuar aunque el resto de la casa se vea bien.",
  "2.2": "En vigas, las grietas diagonales vienen de cortante o torsión; las verticales, de flexión. La guía advierte que las uniones entre elementos son, por lo general, los puntos más críticos.",
  "2.3": "Los nudos viga-columna son de los elementos que la guía llama de «saturación del daño»: si están muy dañados, la casa puede perder estabilidad aunque los demás elementos no muestren daño importante. Puede ser necesaria la evacuación inmediata.",
  "2.4": "En las placas, la guía nombra las grietas por punzonamiento alrededor de las columnas y las grietas largas a lo largo del piso por exceso de flexión.",
  "2.5": "El acero expuesto o corroído importa doble: la guía advierte que el estado de oxidación de los materiales puede indicar una reducción significativa de resistencia, así que el daño real puede ser mayor que el visible.",
  "3.1": "Esta es la pregunta más difícil del formulario y la guía NO da un método para responderla mirando el muro: depende del sistema estructural de la casa. Lo que sí dice: en mampostería estructural las fachadas y algunos muros divisorios SÍ son estructurales; y en tapia, adobe, bahareque o mampostería sin confinar, los muros suelen ser los que cargan. La pista visual que ofrece: si el muro RELLENA un entramado visible de columnas y vigas, es divisorio; si no hay columnas ni vigas y el muro ES la estructura, es portante. Si tienes duda, anótalo como duda: la guía trata «no se pudo determinar» del lado grave, no del neutro.",
  "3.2": "El cortante produce grietas diagonales, muchas veces en forma de equis. La flexión produce grietas horizontales en los extremos del muro, más largas abajo. Y un matiz que la guía subraya: en un muro reforzado, que esté agrietado NO implica que vaya a fallar — depende del refuerzo que tenga. (La guía no usa los términos «pasante» ni «escalonada», que vienen de nuestro formulario.)",
  "3.3": "La guía llama a esto «desplome» o «inclinación», y lo cataloga como daño severo: aparece junto al aplastamiento local del muro. No usa «fuera de plomo» ni «abombado».",
  "3.5": "La guía dedica un apartado a estos materiales y es tajante: las viviendas de adobe y tapia son en general muy antiguas y muy vulnerables, sin condiciones de sismorresistencia adecuadas. Y sus umbrales de grieta son MÁS ANCHOS que en ladrillo (ver la tabla de anchos). Del bahareque dice algo que contradice el prejuicio: sus muros por sí solos tienen vulnerabilidad baja; el problema está en las conexiones y en el deterioro por agua, insectos y hongos.",
  "4.1": "La guía pide observar con especial atención los apoyos de correas y cerchas, porque fallar ahí puede hacer caer sectores enteros de la cubierta. También advierte que una cubierta muy pesada se mueve como un péndulo invertido y castiga los elementos que la sostienen.",
  "4.2": "La guía describe un buen amarre así: existen conexiones que sujetan el techo a los muros, hay arriostramiento de las vigas y la distancia entre ellas no es muy grande. Si la mayoría de eso no se cumple y la cubierta es pesada, lo llama malo.",
  "4.3": "Para cubierta, la guía mide por porcentaje de tejas caídas: hasta un 30% lo llama leve; entre 30 y 45% moderado; entre 45 y 60% fuerte, ya con problemas en los apoyos.",
  "5.1": "La guía califica el cielo raso por riesgo de caída, no por estética: si perdió su anclaje o apoyo, es daño severo. Y recuerda que muchos elementos que no cayeron con el sismo principal pueden caer con una réplica.",
  "7.1": "Entre las medidas que la guía autoriza recomendar está desconectar los suministros de energía, gas y acueducto.",
  "7.2": "Olor a gas es una de las condiciones que la guía trata como peligro inmediato, junto con la presencia de sustancias peligrosas. Desconectar el suministro está entre sus recomendaciones.",
  "7.3": "Una fuga no es solo un daño de la instalación: la guía nombra las tuberías de desagüe perforadas como causa de que el suelo bajo la casa se erosione."
};

/* Lo que el formulario nombra y un lego no entendería. Se marca la procedencia,
   porque no todo está en la guía. */
export const INSPECCION_GLOSARIO = [
  { t: "Cimentación", d: "La base sobre la que se apoya la casa. La guía no define la palabra, pero distingue las superficiales (entre 0,5 y 4 m de profundidad) de las profundas (pilas o pilotes).", fuente: "AIS" },
  { t: "Muro portante o de carga", d: "El que sostiene el peso de la casa. Si se daña de gravedad, puede comprometer la estabilidad completa. Ver la ayuda del ítem 3.1: no siempre se distingue mirando.", fuente: "AIS" },
  { t: "Muro divisorio", d: "El que solo separa espacios. La guía dice que su falla puede representar un riesgo para la vida —por caída— pero normalmente no causa el colapso de la casa.", fuente: "AIS" },
  { t: "Mampostería confinada", d: "Muros de ladrillo o bloque rodeados de elementos delgados de concreto —viguetas y columnetas— que los encierran como un anillo.", fuente: "AIS" },
  { t: "Tapia y adobe", d: "Muros de tierra apisonada o de bloques de tierra sin cocer, a veces mezclada con fibras vegetales, ladrillos o piedras.", fuente: "AIS" },
  { t: "Bahareque", d: "Paredes de paneles de madera o guadua, con o sin relleno de tierra, y recubrimientos de mortero, tabla o lámina. También existe sin relleno, «bahareque hueco».", fuente: "AIS" },
  { t: "Cercha y correa", d: "Las piezas que forman el armazón que sostiene el techo. La guía las nombra sin definirlas; lo que sí dice es que hay que mirar con especial atención sus APOYOS.", fuente: "AIS parcial" },
  { t: "Licuación", d: "En suelos arenosos saturados, el sismo puede hacer que el suelo pierda su capacidad de soporte y la casa se asiente.", fuente: "AIS" },
  { t: "Fisura y grieta", d: "La guía separa las dos por ancho: fisura por debajo de 1 mm, grieta a partir de ahí. Y usa la vista como primer filtro.", fuente: "AIS" },
  { t: "Fuera de plomo · abombado", d: "Términos de nuestro formulario. La guía usa «desplome» e «inclinación» para lo mismo, y no usa «abombado».", fuente: "nuestro" },
  { t: "Grieta pasante · escalonada", d: "Términos de nuestro formulario. La guía del AIS no los usa: clasifica por ancho y por dirección (diagonal, horizontal, vertical).", fuente: "nuestro" },
  { t: "Deflexión · eflorescencia", d: "Términos de nuestro formulario. La guía no los define. Deflexión es que un elemento horizontal se pandee visiblemente; eflorescencia, las manchas blancas que deja el agua al salir por el muro.", fuente: "nuestro" }
];

/* LAS MEDIDAS QUE LA GUÍA AUTORIZA A RECOMENDAR, agrupadas como ella las
   agrupa: por daño estructural, por daño no estructural y por problemas
   geotécnicos. Son las suyas, no una lista nuestra.

   ⚠️ «DEMOLER» NO ESTÁ, y no es un olvido: la guía lo prohíbe expresamente al
   evaluador —«en ningún caso los evaluadores deberán recomendar la posible
   demolición»— y en su lugar pide solicitar la visita de un experto señalando
   la inminencia del peligro. No se ofrece en el formulario lo que no se puede
   recomendar: una casilla que existe se marca.

   El id es PERMANENTE, como los de los ítems: se guarda en el JSON y renumerar
   reescribiría lo que dice una inspección ya firmada. */
export const INSPECCION_RECOMENDA = [
  { g: "Si el daño es estructural", items: [
    { id: "e1", t: "Evacuar la vivienda" },
    { id: "e2", t: "Evacuar o restringir el acceso a las viviendas vecinas" },
    { id: "e3", t: "Apuntalar" },
    { id: "e4", t: "Restringir el acceso a una parte de la vivienda" },
    { id: "e5", t: "Restringir el tránsito de personas o vehículos alrededor" }
  ]},
  { g: "Si el daño NO es estructural", items: [
    { id: "n1", t: "Retirar elementos en peligro de caer — solo si al quitarlos no se cae nada más" },
    { id: "n2", t: "Evacuar parcialmente y restringir el acceso a esa zona" },
    { id: "n3", t: "Desconectar la energía" },
    { id: "n4", t: "Cerrar el gas" },
    { id: "n5", t: "Cerrar el agua" },
    { id: "n6", t: "Cuidado con sustancias peligrosas en la vivienda" }
  ]},
  { g: "Si el problema es del terreno", items: [
    { id: "g1", t: "Cubrir con plástico la zona comprometida por el deslizamiento" },
    { id: "g2", t: "Taponar las grietas del terreno con material impermeable" },
    { id: "g3", t: "Desviar o controlar las aguas que caen sobre el talud" },
    { id: "g4", t: "Poner barreras para que nadie se acerque al talud" },
    { id: "g5", t: "NO remover material del pie del deslizamiento" }
  ]},
  { g: "Siempre que quede duda", items: [
    { id: "x1", t: "Pedir visita de un ingeniero estructural" },
    { id: "x2", t: "Pedir visita de un ingeniero geotecnista (problemas de talud o suelo)" },
    { id: "x3", t: "Avisar a la empresa de servicios públicos (fuga o daño en la red)" },
    { id: "x4", t: "URGENTE: el peligro parece inminente, priorizar la visita del experto" }
  ]}
];

/* Lo que hay que DECIRLE a la gente al terminar. Es de la guía, que lo pone como
   obligación del evaluador — y su última frase es la razón por la que este
   documento no puede ser lo último que pase en esa casa. */
export const INSPECCION_MENSAJE_COMUNIDAD =
  "Esta revisión y sus recomendaciones se basan en lo que se pudo ver durante la visita, así que " +
  "pueden existir situaciones no previstas que se escapan de su alcance. Quien responde por la " +
  "vivienda y quienes viven en ella deben tener presente que esto NO los exime de hacer los " +
  "estudios y las reparaciones que la casa necesite. Y que las condiciones de la vivienda y de su " +
  "entorno pueden cambiar: si eso pasa, hay que pedir una nueva evaluación a las autoridades " +
  "competentes.";

/* Cuatro límites que la guía impone al que inspecciona, y que conviene tener a
   la vista mientras se llena el formulario. */
export const INSPECCION_LIMITES = [
  "La estructura casi siempre está TAPADA por acabados y muros divisorios. La guía lo dice tres veces: si queda duda sobre un elemento estructural, hay que recomendar una inspección más detallada con un ingeniero particular, que incluya quitar acabados.",
  "NUNCA recomiendes demoler. La guía lo prohíbe expresamente al evaluador: si el peligro parece inminente, se pide la visita de un experto y se señala la urgencia.",
  "Después de un sismo fuerte las réplicas son muy probables, y muchos elementos que no cayeron con el principal pueden caer con una réplica o por su propio peso.",
  "Si no pudiste determinar algo, anótalo como no determinado. La guía trata la duda del lado grave, no del neutro."
];

export const INSPECCION_MARCAS = { RE: "Requiere revisión especializada", OBS: "Observación a documentar", SO: "Sin observación aparente" };

/* Los textos de alcance y de descargo van AQUÍ y no en el generador del PDF,
   porque el formulario tiene que enseñárselos al habitante ANTES de que firme.
   Firmar un documento cuyo alcance solo aparece en el PDF que recibe después
   no es consentir: es enterarse. Son literales del documento en papel. */
export const INSPECCION_ALCANCE =
  "Esta revisión es una inspección visual, preliminar y no destructiva. No incluye ensayos de " +
  "materiales, apiques ni cálculos estructurales. No constituye certificación de sismo-resistencia " +
  "ni garantía de habitabilidad. Las observaciones corresponden únicamente al estado aparente a la " +
  "fecha de la visita y pueden variar por réplicas, lluvias u otros eventos. El concepto estructural " +
  "definitivo y el diseño de intervención son responsabilidad de un ingeniero con matrícula " +
  "profesional, en documento aparte.";

export const INSPECCION_RECOMENDACION =
  "Se recomienda evaluación estructural detallada por ingeniero con matrícula profesional antes de " +
  "habitar o intervenir la vivienda. Este documento no autoriza ni prohíbe la ocupación del inmueble.";

export const INSPECCION_CONSENT =
  "El propietario / habitante autoriza la visita y declara entender que esta revisión es preliminar, " +
  "visual y no vinculante, y que no constituye garantía de habitabilidad.";

export async function informeTriage(c, hoyISO) {
  const { pdf, hoja: h, f } = await abrir(
    "Concepto técnico preliminar " + c.numero,
    "Triage estructural · no determina habitabilidad"
  );

  membrete(h);

  h.texto("CONCEPTO TÉCNICO PRELIMINAR", {
    tam: 17, fuente: f.negrita, color: TINTA, interlinea: 21, despues: 6
  });
  h.texto("Evaluación preliminar por fotografías", { tam: 10, color: GRIS, despues: 16 });

  h.cintillo("CASO", { tam: 7.5, despues: 10 });
  h.texto(c.numero, { tam: 26, fuente: f.negrita, color: VERDE, interlinea: 30, despues: 18 });

  /* El aviso ANTES del resultado. Es deliberado. */
  avisoEnCaja(h, f,
    "Este documento NO determina si la vivienda es habitable. Esa decisión requiere una visita " +
    "presencial y le corresponde a la autoridad municipal de gestión del riesgo. Lo que aquí se " +
    "entrega es el CONCEPTO PRELIMINAR de un ingeniero voluntario —las precauciones que " +
    "recomienda, los materiales con que sugiere reparar y la prioridad con que conviene visitar " +
    "esta vivienda—, a partir únicamente de las fotografías enviadas. Recomendar que no se use " +
    "una parte de la vivienda es una precaución preventiva, no una declaratoria de " +
    "inhabitabilidad.");

  seccion(h, f, "I", "LA VIVIENDA");
  h.fila("Sector", c.sector || "-");
  if (c.material) h.fila("Material de los muros", c.material);
  if (c.pisos) h.fila("Pisos", String(c.pisos));
  if (c.anio_aprox) h.fila("Año aproximado", c.anio_aprox);
  h.fila("Tenía grietas antes del sismo", c.danio_previo ? "Sí" : "No");
  h.fila("Habitada al momento del reporte", c.habitada ? "Sí" : "No");
  h.fila("Fotografías recibidas", String(c.medios || 0));
  h.salto(14);

  /* EL CONCEPTO VA ANTES DE LA PRIORIDAD, y el orden es la decisión. Hasta el
     19 ago 2026 el documento abría con la prioridad de visita: la familia leía
     primero «visita programada», que es una respuesta de logística nuestra, y
     tenía que bajar hasta las observaciones para encontrar lo único que puede
     usar hoy —si permanecer y con qué reparar—. Se invirtió. */
  seccion(h, f, "II", "CONCEPTO DEL INGENIERO");
  h.texto(c.nota_tecnica || "-", { tam: 10, interlinea: 15, despues: 14 });
  if (c.recomendacion) {
    h.texto("Qué hacer, y con qué reparar:", { tam: 9.5, fuente: f.negrita, despues: 5 });
    h.texto(c.recomendacion, { tam: 10, interlinea: 15, despues: 14 });
  }
  /* «QUÉ FALTA» SOLO SI EL CASO ES `inevaluable` (20 ago 2026). Antes bastaba
     con que el campo tuviera algo, y el formulario del triaje deja escribirlo
     con cualquier clasificación — así que el PDF podía decir a la vez
     «No requiere visita por ahora» y «Para poder evaluar hace falta: …».
     Lo vi en el concepto real de CV-2026-000001 al revisarlo antes del piloto.

     La PANTALLA de la familia ya lo hacía bien: solo enseña `mc.falta.*` cuando
     el caso está esperando material. Eran dos superficies del mismo dato en
     desacuerdo, que es exactamente la clase de fallo que ya mordió aquí una vez
     —el informe diciendo «programada» mientras el caso decía «urgente»—. */
  if (c.falta && c.clasificacion === "inevaluable") {
    h.texto("Para poder evaluar hace falta:", { tam: 9.5, fuente: f.negrita, despues: 5 });
    h.texto(c.falta, { tam: 10, interlinea: 15, despues: 14 });
  }

  seccion(h, f, "III", "PRIORIDAD DE VISITA");
  h.texto(ETIQUETA_CLAS[c.clasificacion] || String(c.clasificacion || "-"), {
    tam: 15, fuente: f.negrita, color: VERDE, interlinea: 19, despues: 6
  });
  h.texto(EXPLICA_CLAS[c.clasificacion] || "", { tam: 9.5, color: GRIS, interlinea: 13.5, despues: 16 });

  /* La firma es del INGENIERO, no de la Fundación: es él quien responde por el
     criterio técnico. La Fundación aparece como quien organiza, en el pie. */
  h.reservar(120);
  seccion(h, f, "IV", "QUIÉN LO EVALUÓ");
  h.salto(26);
  const yl = h.y;
  h.p.drawLine({ start: { x: MG.izq, y: yl }, end: { x: MG.izq + 240, y: yl }, thickness: 0.75, color: TINTA });
  h.y = yl - 14;
  h.texto(c.ing_nombre || "-", { tam: 10.5, fuente: f.negrita, despues: 3 });

  /* LA MATRÍCULA, Y SI ALGUIEN LA COMPROBÓ — que no es lo mismo y este documento
     los daba por iguales.

     Aquí se imprimía el número sin más, y `faq.a11` le promete a la familia «un
     ingeniero voluntario CON MATRÍCULA». Pero la regla que retiene la respuesta
     hasta que haya una matrícula verificada solo se aplicaba al correo: la
     pantalla y este PDF entregaban el concepto igual, con la matrícula sin
     comprobar impresa como si lo estuviera. De los tres canales por los que la
     familia recibe la respuesta, la garantía cubría uno.

     Decir «declarada» cuando nadie la comprobó no debilita el documento: lo hace
     cierto. Un concepto útil firmado con una credencial que la fundación aún no
     confirmó sigue siendo útil — lo que no puede es presentarse como confirmado.

     Desde el 31 ago la matrícula la pone el registro y no el formulario (ver
     `firmanteVerificado` en worker.js), así que el caso normal es el verificado.
     Este otro queda para cuando alguien del equipo firma un concepto: entra con
     la audiencia del panel y no cuenta como verificado, a propósito. */
  if (c.matricula_verificada) {
    h.texto("Ingeniero voluntario · Matrícula profesional " + (c.ing_matricula || "-")
      + ", verificada por la Fundación ante el COPNIA",
      { tam: 9, color: GRIS, despues: 3 });
  } else {
    h.texto("Ingeniero voluntario · Matrícula profesional declarada: " + (c.ing_matricula || "-"),
      { tam: 9, color: GRIS, despues: 3 });
    h.texto("La Fundación todavía no ha verificado esta matrícula ante el COPNIA.",
      { tam: 9, color: GRIS, despues: 3 });
  }
  h.texto("Evaluación realizada el " + fechaLarga(c.evaluado_en || hoyISO), { tam: 9, color: GRIS, despues: 16 });

  h.texto(
    "Este concepto se emite a título voluntario y gratuito, en el marco de la respuesta al sismo " +
    "del 10 de agosto de 2026, organizada por la Fundación Give&Grow International (NIT " +
    ENTIDAD.nit + "). No sustituye la evaluación oficial de habitabilidad ni un estudio " +
    "estructural detallado.",
    { tam: 8.5, color: GRIS, interlinea: 12.5 }
  );

  h.cerrarPie(c.numero);
  return pdf.save();
}

const ETIQUETA_CLAS = {
  urgente:     "Visita urgente",
  programada:  "Visita programada",
  no_requiere: "No requiere visita por ahora",
  inevaluable: "No se pudo evaluar con el material enviado"
};

const EXPLICA_CLAS = {
  urgente:     "El ingeniero recomienda que esta vivienda se visite entre las primeras. " +
               "Mientras tanto, evita permanecer en las zonas señaladas en las observaciones.",
  programada:  "El ingeniero recomienda una visita, sin que las fotografías muestren una " +
               "situación que obligue a atenderla de inmediato.",
  no_requiere: "Con lo que muestran las fotografías, el ingeniero no ve necesaria una visita " +
               "por ahora. Si aparecen grietas nuevas o crecen las existentes, vuelve a escribirnos.",
  inevaluable: "Las fotografías enviadas no permiten formarse un criterio. Abajo se indica qué " +
               "hace falta para poder evaluar."
};

/* ===========================================================================
   CERTIFICADO DE DONACIÓN
   ===========================================================================
   Texto suministrado por la contadora de la Fundación. Se resolvieron sus
   variables de plantilla con los datos del aporte y se retiró la rama de
   "bienes en especie" de los numerales 3 y 5: este certificado se expide sobre
   pagos en dinero por la pasarela, y ofrecer una rama que no aplica es una
   invitación a firmarla por error. El articulado de la sección III no se tocó.

   CORREGIDA la cita del numeral II.5 (14 ago 2026): decía art. 771-2, que trata
   de la factura como soporte de costos y deducciones y no viene al caso. La
   norma que exige que una donación en DINERO pase por el sistema financiero es
   el numeral 1 del art. 125-2 ET —cheque, tarjeta de crédito o intermediario
   financiero—, y es la que ahora se cita. El 771-5 sería el complemento sobre
   medios de pago; no se añade para no cargar el numeral con dos citas.

   Las donaciones EN ESPECIE no salen por aquí: van en la minuta aparte, porque
   su valor es el menor entre valor comercial y costo fiscal (art. 125-2 par. 1)
   y ese dato no vive en la base — lo soporta la factura del donante.

   Solo en español: es un documento para la DIAN.
   =========================================================================== */

/* ===========================================================================
   INSPECCIÓN VISUAL PRELIMINAR — el documento
   ===========================================================================
   Transcripción fiel del papel que trajo Sebas, en el mismo orden y con sus
   textos literales. Lo que se añade es lo que el papel no podía tener: las
   firmas capturadas con el dedo, embebidas como imagen.

   SE CONGELA AL EMITIRSE. Alguien lo firmó: si el articulado o la plantilla
   cambian mañana, el documento que esa persona firmó no puede cambiar con
   ellos. Es la misma regla del certificado de donación, y por eso el PDF se
   guarda en R2 y no se regenera — a diferencia del concepto del triaje, que sí
   se arma cada vez porque nadie lo firma.

   NO ES UN DICTAMEN, y el documento lo dice tres veces porque el papel lo decía
   tres veces: en el subtítulo, en el alcance y en el cierre. No se suaviza
   ninguna. =========================================================================== */
/* Los ids marcados se traducen a su texto desde el catálogo. Guardar el id y no
   la frase es lo que permite contarlos; imprimir la frase y no el id es lo que
   hace que el documento se entienda. */
function leerReco(crudo) {
  let d = {};
  try { d = typeof crudo === "string" ? JSON.parse(crudo || "{}") : (crudo || {}); } catch { d = {}; }
  const mapa = {};
  for (const g of INSPECCION_RECOMENDA) for (const it of g.items) mapa[it.id] = it.t;
  return {
    marcadas: (Array.isArray(d.marcadas) ? d.marcadas : []).map((x) => mapa[x]).filter(Boolean),
    texto: typeof d.texto === "string" ? d.texto : ""
  };
}

export async function inspeccionPDF(v, firmas, hoyISO) {
  const { pdf, hoja: h, f } = await abrir(
    "Inspección visual preliminar " + v.numero,
    "Reporte de observaciones · documento preliminar y no vinculante"
  );

  membrete(h);

  h.texto("INSPECCIÓN VISUAL PRELIMINAR DE VIVIENDA", {
    tam: 15, fuente: f.negrita, color: TINTA, interlinea: 19, despues: 5
  });
  h.texto("Reporte de observaciones — documento preliminar y no vinculante",
    { tam: 9.5, color: GRIS, despues: 14 });

  h.cintillo("INSPECCIÓN", { tam: 7.5, despues: 9 });
  h.texto(v.numero, { tam: 22, fuente: f.negrita, color: VERDE, interlinea: 26, despues: 16 });

  /* EL ALCANCE VA ANTES DE LOS HALLAZGOS, igual que en el papel y por la misma
     razón que el concepto del triaje pone su aviso arriba: quien lee tiene que
     saber qué NO es esto antes de leer qué se vio. */
  avisoEnCaja(h, f, "Alcance y limitaciones. " + INSPECCION_ALCANCE);
  h.salto(10);

  seccion(h, f, "I", "LA VIVIENDA");
  /* LA FAMILIA PRIMERO. El papel abría con «Proyecto / Campaña», pero en terreno
     lo que identifica una visita es de quién es la casa — y por eso el campo
     cambió. En vereda, el nombre del predio y las coordenadas hacen el trabajo
     que la dirección no puede hacer, porque no hay nomenclatura. */
  h.fila("Familia", v.familia || "-");
  if (v.finca) h.fila("Finca o predio", v.finca);
  h.fila("Municipio", v.municipio || "-");
  if (v.direccion) h.fila("Dirección / vereda", v.direccion);
  if (v.casa_no)   h.fila("Casa N.º", v.casa_no);
  h.fila("Fecha de la visita", v.fecha_visita || "-");
  if (v.hora)        h.fila("Hora", v.hora);
  if (v.propietario) h.fila("Propietario / habitante", v.propietario);
  if (v.contacto)    h.fila("Contacto", v.contacto);
  if (v.caso)        h.fila("Caso del triaje", v.caso);
  /* Las coordenadas van al documento porque son lo que permite VOLVER, y con su
     precisión al lado: 9 metros llevan a la casa, 2.000 son el municipio. */
  if (v.lat != null && v.lon != null) {
    h.fila("Coordenadas", Number(v.lat).toFixed(5) + ", " + Number(v.lon).toFixed(5) +
      (v.gps_precision != null ? "  (\u00b1" + Math.round(v.gps_precision) + " m)" : ""));
  }
  h.salto(12);

  seccion(h, f, "II", "OBSERVACIONES");
  h.texto("RE = requiere revisión especializada  ·  Obs = observación a documentar  ·  " +
          "S/O = sin observación aparente", { tam: 8, color: GRIS, despues: 12 });

  /* Solo se imprime lo que se MARCÓ. Un documento con 26 renglones donde 20
     dicen «sin marcar» esconde los 6 que importan, y el papel se llenaba a mano
     precisamente marcando. Lo no marcado se declara al final con su cuenta, que
     es un dato distinto y honesto. */
  let marcados = 0, sinMarcar = 0;
  for (const sec of INSPECCION_SECCIONES) {
    const conMarca = sec.items.filter((it) => v.respuestas && v.respuestas[it.id] && v.respuestas[it.id].m);
    sinMarcar += sec.items.length - conMarca.length;
    if (!conMarca.length) continue;
    h.reservar(46);
    h.texto(sec.n + ". " + sec.titulo.toUpperCase(),
      { tam: 9, fuente: f.negrita, color: TINTA, despues: 6 });
    for (const it of conMarca) {
      const r = v.respuestas[it.id];
      marcados++;
      const etiqueta = r.m === "RE" ? "[RE] " : r.m === "OBS" ? "[Obs] " : "[S/O] ";
      h.reservar(30);
      h.texto(etiqueta + it.id + "  " + it.t, {
        tam: 9.5, fuente: r.m === "RE" ? f.negrita : f.normal,
        color: TINTA, interlinea: 13, despues: 3
      });
      /* `ancho` HAY QUE PASARLO cuando se pasa `x`: texto() calcula el salto de
         línea con el ancho completo de la caja y no resta la indentación, así
         que una observación larga se salía 14 pt del margen derecho. No se veía
         con observaciones cortas, que son las que probé. */
      if (r.obs)   h.texto("Observación: " + r.obs, { tam: 9, color: GRIS, interlinea: 12.5, despues: 2, x: MG.izq + 14, ancho: ANCHO - 14 });
      if (r.fotos) h.texto("Foto N.º " + r.fotos, { tam: 9, color: GRIS, despues: 2, x: MG.izq + 14, ancho: ANCHO - 14 });
      h.salto(6);
    }
    h.salto(6);
  }
  if (!marcados) {
    h.texto("No se marcó ningún elemento en la visita.", { tam: 9.5, color: GRIS, despues: 8 });
  }
  if (sinMarcar) {
    h.texto("Elementos del listado sin marcar en esta visita: " + sinMarcar + " de " +
            (marcados + sinMarcar) + ".", { tam: 8.5, color: GRIS, despues: 10 });
  }

  seccion(h, f, "III", "CONCLUSIÓN");
  h.fila("¿Requiere revisión especializada?", v.requiere_esp ? "SÍ" : "NO");
  h.salto(10);
  h.texto("Recomendación. " + INSPECCION_RECOMENDACION,
    { tam: 9.5, interlinea: 13.5, despues: 16 });

  /* LAS RECOMENDACIONES VAN ANTES DE LAS FIRMAS, y no es cosmético: la guía del
     AIS obliga a explicárselas de viva voz a los ocupantes, y quien firma tiene
     que haberlas oído. Un documento que las pone después de la firma haría que
     la persona firmara algo que todavía no le habían dicho. */
  const reco = leerReco(v.recomendaciones);
  if (reco.marcadas.length || reco.texto || v.observaciones) {
    seccion(h, f, "IV", "RECOMENDACIONES Y OBSERVACIONES");
    if (reco.marcadas.length) {
      h.texto("Medidas recomendadas:", { tam: 9.5, fuente: f.negrita, despues: 5 });
      for (const t of reco.marcadas) {
        h.reservar(16);
        h.texto("·  " + t, { tam: 9.5, interlinea: 13, despues: 2, x: MG.izq + 8, ancho: ANCHO - 8 });
      }
      h.salto(8);
    }
    if (reco.texto) {
      h.texto("Además:", { tam: 9.5, fuente: f.negrita, despues: 5 });
      h.texto(reco.texto, { tam: 9.5, interlinea: 13.5, despues: 12 });
    }
    if (v.observaciones) {
      h.texto("Observaciones generales:", { tam: 9.5, fuente: f.negrita, despues: 5 });
      h.texto(v.observaciones, { tam: 9.5, interlinea: 13.5, despues: 12 });
    }
    h.texto("Esta inspección NO recomienda demoler. La guía técnica del AIS lo prohíbe " +
            "expresamente al evaluador: cuando el peligro parece inminente se pide la visita " +
            "de un experto y se señala la urgencia.",
      { tam: 8.5, fuente: f.cursiva, color: GRIS, interlinea: 12, despues: 16 });
  }

  seccion(h, f, "V", "FIRMAS");
  h.texto(INSPECCION_CONSENT, { tam: 9, color: GRIS, interlinea: 12.5, despues: 16 });

  await bloqueFirma(pdf, h, f, "Quien realizó la observación",
    v.obs_nombre, v.obs_cc, v.obs_matricula, firmas && firmas.obs, null);
  await bloqueFirma(pdf, h, f, "Propietario / habitante",
    v.propietario, v.hab_cc, null, firmas && firmas.hab, v.firma_hab_motivo);

  h.salto(6);
  h.texto("El concepto estructural definitivo (reparar / reforzar / demoler) y el diseño de " +
          "reconstrucción se emiten en documento independiente firmado por el ingeniero " +
          "responsable con matrícula profesional.",
    { tam: 8.5, color: GRIS, interlinea: 12, despues: 6 });

  h.cerrarPie(v.numero);
  return await pdf.save();
}

/* Un bloque de firma: la imagen si existe, o el motivo por el que no. NUNCA una
   línea en blanco: en un documento firmado, un espacio vacío no distingue «no
   pudo firmar» de «no autorizó», y son cosas opuestas. */
async function bloqueFirma(pdf, h, f, rol, nombre, cc, matricula, pngBytes, motivo) {
  /* 160 Y NO 112. La cuenta del bloque completo: 58 de imagen más su hueco, 18
     de la regla, y las cuatro líneas de identificación (rol, nombre, cédula,
     matrícula) con sus interlineados y separaciones, que suman ~72. Total ~148.

     Con 112 la reserva pasaba y las últimas líneas saltaban de página, así que
     en el documento que alguien firmó la FIRMA quedaba al pie de una hoja y el
     «Nombre / C.C. / Matrícula» al inicio de la siguiente. En una evidencia, una
     firma separada de a quién identifica es justo la ambigüedad que no puede
     haber. No se vio antes por dónde cayeron los bloques en la prueba. */
  h.reservar(160);
  const yBase = h.y;

  if (pngBytes && pngBytes.length) {
    try {
      const img = await pdf.embedPng(pngBytes);
      /* Se escala para caber en 190x52 sin deformar: una firma estirada deja de
         parecerse a la de la persona. */
      const esc = Math.min(190 / img.width, 52 / img.height, 1);
      h.p.drawImage(img, {
        x: MG.izq + 2, y: yBase - 52, width: img.width * esc, height: img.height * esc
      });
    } catch {
      h.texto("[la firma no se pudo incrustar]", { tam: 8.5, color: GRIS, despues: 0 });
    }
  } else {
    h.texto("Sin firma. Motivo declarado por quien observó: " + (motivo || "no se registró"),
      { tam: 9, fuente: f.cursiva, color: SUAVE, interlinea: 12.5, despues: 0 });
  }

  h.y = yBase - 58;
  h.regla({ ancho: 210, grueso: 0.9, despues: 8 });
  h.texto(rol, { tam: 8, fuente: f.negrita, color: GRIS, despues: 3 });
  h.texto("Nombre: " + (nombre || "-"), { tam: 9, despues: 2 });
  h.texto("C.C.: " + (cc || "-"), { tam: 9, despues: matricula ? 2 : 14 });
  if (matricula) h.texto("Matrícula profesional: " + matricula, { tam: 9, despues: 14 });
}

export async function certificado(c, hoyISO) {
  const { pdf, hoja: h, f } = await abrir(
    "Certificado de donación " + c.numero,
    "Certificado de donación · art. 125-3 ET"
  );

  membrete(h);

  h.texto("CERTIFICADO DE DONACIÓN", {
    tam: 16, fuente: f.negrita, color: TINTA, centrado: true, interlinea: 20, despues: 4
  });
  h.texto("No. " + c.numero, {
    tam: 12, fuente: f.negrita, color: VERDE, centrado: true, interlinea: 16, despues: 10
  });
  h.texto(ENTIDAD.ciudad + ", " + fechaLarga(c.emitido_en || hoyISO), {
    tam: 9.5, color: GRIS, centrado: true, despues: 22
  });

  h.texto(
    "La " + ENTIDAD.nombre + ", entidad sin ánimo de lucro identificada con NIT " + ENTIDAD.nit +
    ", con domicilio principal en la " + ENTIDAD.domicilio.replace(/, Colombia$/, "") +
    ", calificada y vigente en el Régimen Tributario Especial del impuesto sobre la renta y " +
    "complementarios, a través de los suscritos Representante Legal y Revisora Fiscal,",
    { tam: 10, interlinea: 15, despues: 20 }
  );

  /* Fórmula sacramental: va aislada entre reglas porque es la bisagra del
     documento — todo lo que sigue queda cubierto por el juramento. */
  h.regla({ despues: 12 });
  h.texto("CERTIFICA BAJO LA GRAVEDAD DE JURAMENTO", {
    tam: 11.5, fuente: f.negrita, color: VERDE, centrado: true, despues: 12
  });
  h.regla({ despues: 18 });

  h.texto(
    "Que recibió a título de donación, del donante que a continuación se identifica, el aporte " +
    "cuyas condiciones se detallan:",
    { tam: 10, interlinea: 15, despues: 22 }
  );

  seccion(h, f, "I", "IDENTIFICACIÓN DEL DONANTE");
  h.fila("Nombre o razón social", c.donante_nombre || "-");
  h.fila((c.doc_tipo === "NIT" ? "NIT" : "C.C.") + " No.", c.doc_numero || "-");
  h.fila("Domicilio", c.donante_ciudad || "-");
  h.salto(14);

  seccion(h, f, "II", "INFORMACIÓN DE LA DONACIÓN");
  h.numeral(1, "Fecha de la donación: " + fechaLarga(c.fecha_donacion) + ".");
  h.numeral(2,
    "Tipo de entidad donataria: entidad sin ánimo de lucro, calificada en el Régimen Tributario " +
    "Especial del impuesto sobre la renta y complementarios, sometida en su funcionamiento a la " +
    "inspección, vigilancia y control de la " + ENTIDAD.vigilancia + ".");
  h.numeral(3, "Clase de bien donado: dinero.");
  h.numeral(4,
    "Valor de la donación: " + pesos(c.monto_centavos) + " (" +
    pesosEnLetras(Math.round(Number(c.monto_centavos) / 100)) + " M/cte.).");
  h.numeral(5,
    "Manera en que se efectuó la donación: mediante transferencia electrónica No. " +
    (c.transaccion || "-") + " del " + fechaLarga(c.fecha_donacion) + ", realizada a través del " +
    "sistema financiero en la " + ENTIDAD.cuenta + " de " + ENTIDAD.banco + ", en cumplimiento de " +
    "lo previsto en el numeral 1 del artículo 125-2 del Estatuto Tributario.");
  h.numeral(6,
    "Destinación de la donación: los recursos donados fueron incorporados al patrimonio de la " +
    "Fundación y destinados exclusivamente al desarrollo de su objeto social y de su actividad " +
    "meritoria de interés general, de acceso a la comunidad, consistente en " + c.destinacion +
    ", en beneficio de la población vulnerable atendida a través del HUB SOCIAL.");
  h.salto(16);

  seccion(h, f, "III", "DECLARACIONES SOBRE EL CUMPLIMIENTO DE CONDICIONES LEGALES");
  h.texto(
    "Para efectos de lo previsto en los artículos 125-1, 125-2 y 125-3 del Estatuto Tributario, " +
    "se certifica que la Fundación:",
    { tam: 9.5, interlinea: 14, despues: 12 }
  );
  h.numeral(1, "Ha sido reconocida como persona jurídica sin ánimo de lucro y está sometida en su funcionamiento a vigilancia oficial.");
  h.numeral(2, "Ha cumplido con la obligación de presentar la declaración de renta y complementarios o de ingresos y patrimonio, según el caso, correspondiente al año inmediatamente anterior al de la donación.");
  h.numeral(3, "Maneja los ingresos por donaciones en depósitos o inversiones en establecimientos financieros autorizados.");
  h.numeral(4, "Se encuentra calificada y vigente en el Régimen Tributario Especial, y no está incursa en ninguna de las causales de exclusión previstas en el artículo 364-3 del Estatuto Tributario.");
  h.numeral(5, "Destina la totalidad de sus excedentes al desarrollo de su actividad meritoria, y ni el patrimonio ni los excedentes se distribuyen, directa ni indirectamente, entre el fundador o miembros, ni durante su existencia ni al momento de su disolución y liquidación.");
  h.numeral(6, "La donación aquí certificada constituye un acto de mera liberalidad y no dio lugar a contraprestación alguna, directa ni indirecta, a favor del donante.");
  h.numeral(7, "La donación no consistió en acciones, cuotas partes, participaciones, títulos valores, derechos o acreencias poseídos en entidades o sociedades.");
  h.salto(12);

  seccion(h, f, "IV", "SUSTENTO CONTABLE DE LA CERTIFICACIÓN");
  h.texto(
    "La información aquí certificada fue tomada de los libros de contabilidad de la Fundación, los " +
    "cuales se llevan conforme a las normas legales vigentes y al Marco Técnico Normativo de " +
    "Información Financiera para Pymes (Grupo 2), y se encuentran debidamente registrados. La " +
    "Revisora Fiscal realizó las verificaciones propias de su función respecto del registro, la " +
    "existencia y la destinación de la donación aquí relacionada, con base en las cuales suscribe " +
    "la presente certificación.",
    { tam: 9.5, interlinea: 14, despues: 20 }
  );

  /* La sección V no se parte. Es la que cierra el documento —efectos, aviso del
     art. 257, cláusula de expedición y las dos firmas— y repartirla dejaba una
     última hoja con dos rayas y dos nombres, que parece un documento al que le
     arrancaron una página. Reservada entera, cada hoja termina en frontera de
     sección y la última carga contenido de verdad.
     Alto medido sobre el peor caso: encabezado + párrafo + caja + cierre + firmas. */
  h.reservar(400);

  seccion(h, f, "V", "EFECTOS");
  h.texto(
    "El contenido de esta certificación se entiende rendido bajo la gravedad del juramento, sirve " +
    "como soporte del descuento tributario del donante y estará disponible para la Administración " +
    "Tributaria cuando esta lo requiera.",
    { tam: 9.5, interlinea: 14, despues: 14 }
  );

  /* El aviso del art. 257 va en caja: es lo único de todo el documento que el
     donante puede malinterpretar a su favor, y el sitio entero se apoya en esa
     cifra del 25%. Que se lea aparte es deliberado. */
  avisoEnCaja(h, f,
    "Se informa al donante que, conforme al artículo 257 del Estatuto Tributario, las donaciones " +
    "efectuadas a entidades sin ánimo de lucro calificadas en el Régimen Tributario Especial no son " +
    "deducibles del impuesto sobre la renta, pero dan lugar a un descuento del impuesto equivalente " +
    "al 25% del valor donado en el año o período gravable, con sujeción al límite del artículo 258 " +
    "del mismo Estatuto. La procedencia y aplicación de este descuento corresponde al donante y a " +
    "su asesor tributario.");

  h.texto(
    "La presente certificación se expide en cumplimiento del artículo 125-3 del Estatuto Tributario " +
    "y del numeral 2 del artículo 1.2.1.4.3 del Decreto 1625 de 2016, y únicamente puede ser " +
    "utilizada por el donante identificado en el numeral I.",
    { tam: 9.5, interlinea: 14, despues: 22 }
  );

  firmas(h, f);

  /* Trazabilidad interna: el certificado apunta a la guía, y la guía es la
     misma referencia que conoce la pasarela. Un auditor puede recorrer el
     camino completo desde este papel. */
  h.salto(10);
  h.texto("Aporte asociado: " + c.guia + "  ·  Certificado " + c.numero, { tam: 8, color: GRIS });

  /* El estado del certificado se imprime EN el certificado. Si está anulado o
     en revisión, quien lo tenga en la mano tiene que poder saberlo sin
     consultarnos: el papel viaja solo. */
  if (c.anulado_en) {
    h.salto(16);
    h.texto("Certificado ANULADO el " + fechaLarga(c.anulado_en) +
      motivoFrase(c.anulado_motivo) +
      " Este documento no tiene validez y no sirve como soporte tributario.",
      { tam: 9, fuente: f.negrita, color: rgb(0.65, 0.20, 0.15), interlinea: 13 });
    h.sellar("Anulado");
  } else if (c.revision_en) {
    h.salto(16);
    h.texto("Certificado EN REVISIÓN desde el " + fechaLarga(c.revision_en) +
      motivoFrase(c.revision_motivo) +
      " No debe usarse como soporte tributario mientras esté en este estado.",
      { tam: 9, fuente: f.negrita, color: rgb(0.60, 0.36, 0.05), interlinea: 13 });
    h.sellar("En revisión", rgb(0.78, 0.52, 0.10));
  }

  h.cerrarPie(c.numero);
  return pdf.save();
}

/* Los motivos los escribe una persona en un campo libre, así que unos traen
   punto final y otros no. Sin normalizar, el sello salía con «aprobada.. No
   debe usarse». */
function motivoFrase(motivo) {
  const m = String(motivo || "").trim().replace(/[.\s]+$/, "");
  return m ? ". Motivo: " + m + "." : ".";
}

function seccion(h, f, romano, titulo) {
  h.reservar(58);
  h.texto(romano + ". " + titulo, {
    tam: 10, fuente: f.negrita, color: VERDE, despues: 4
  });
  h.regla({ grueso: 0.9, color: VERDE, despues: 12 });
}

function avisoEnCaja(h, f, txt) {
  const tam = 9;
  const pad = 14;
  const ls = h.lineas(winansi(txt), f.normal, tam, ANCHO - pad * 2 - 6);
  const alto = ls.length * (tam * 1.45) + pad * 2;
  h.reservar(alto + 16);
  const yTop = h.y;
  /* Filete de acento a la izquierda, como la nota ámbar del sitio. */
  h.p.drawRectangle({ x: MG.izq, y: yTop - alto, width: 3, height: alto, color: VERDE });
  h.y = yTop - pad;
  for (const l of ls) {
    h.p.drawText(l, { x: MG.izq + pad + 6, y: h.y - tam, size: tam, font: f.normal, color: SUAVE });
    h.y -= tam * 1.45;
  }
  h.y = yTop - alto - 16;
}

/* Dos firmas, lado a lado: el documento no vale con una sola. Se dibujan sobre
   la misma línea base para que ninguna parezca subordinada a la otra. */
function firmas(h, f) {
  const anchoCol = (ANCHO - 40) / 2;
  h.reservar(96);
  const yLinea = h.y - 34;

  const cols = [
    { x: MG.izq, p: ENTIDAD.repLegal, extra: null },
    { x: MG.izq + anchoCol + 40, p: ENTIDAD.revisora, extra: "T.P. " + ENTIDAD.revisora.tp }
  ];

  for (const col of cols) {
    h.p.drawLine({
      start: { x: col.x, y: yLinea }, end: { x: col.x + anchoCol, y: yLinea },
      thickness: 0.75, color: TINTA
    });
    let y = yLinea - 14;
    h.p.drawText(winansi(col.p.nombre), { x: col.x, y, size: 10, font: f.negrita, color: TINTA });
    y -= 13;
    h.p.drawText(winansi(col.p.cargo), { x: col.x, y, size: 9, font: f.normal, color: GRIS });
    if (col.p.cc) { y -= 12; h.p.drawText(winansi("C.C. " + col.p.cc), { x: col.x, y, size: 9, font: f.normal, color: GRIS }); }
    if (col.extra) { y -= 12; h.p.drawText(winansi(col.extra), { x: col.x, y, size: 9, font: f.normal, color: GRIS }); }
  }
  h.y = yLinea - 62;
}
