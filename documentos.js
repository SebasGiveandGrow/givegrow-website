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
  repLegal: { nombre: "Juan Sebastián Navarro Osorio", cargo: "Representante Legal", cc: "" },
  /* T.P. verificada contra el texto publicado en #transparencia. */
  revisora: { nombre: "Manuela Londoño Arboleda", cargo: "Revisora Fiscal", tp: "244894-T", cc: "" }
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
  h.texto(t.rastreo, { tam: 9.5, color: SUAVE, interlinea: 14, despues: 18 });

  h.regla({ despues: 12 });
  h.texto(ENTIDAD.nombreCorto, { tam: 9, fuente: f.negrita, color: TINTA, despues: 2 });
  h.texto("NIT " + ENTIDAD.nit + "  ·  " + ENTIDAD.domicilio, { tam: 8.5, color: GRIS, interlinea: 12 });
  h.texto(t.esal, { tam: 8.5, color: GRIS, interlinea: 12, despues: 6 });
  h.texto(t.generado + fechaLarga(hoyISO) + ".", { tam: 8, color: GRIS });

  h.cerrarPie(a.guia);
  return pdf.save();
}

/* ===========================================================================
   CERTIFICADO DE DONACIÓN
   ===========================================================================
   Texto suministrado por la contadora de la Fundación. Se resolvieron sus
   variables de plantilla con los datos del aporte y se retiró la rama de
   "bienes en especie" de los numerales 3 y 5: este certificado se expide sobre
   pagos en dinero por la pasarela, y ofrecer una rama que no aplica es una
   invitación a firmarla por error. El articulado de la sección III no se tocó.

   Solo en español: es un documento para la DIAN.
   =========================================================================== */

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
    enLetras(Math.round(Number(c.monto_centavos) / 100)) + " pesos M/cte.).");
  h.numeral(5,
    "Manera en que se efectuó la donación: mediante transferencia electrónica No. " +
    (c.transaccion || "-") + " del " + fechaLarga(c.fecha_donacion) + ", realizada a través del " +
    "sistema financiero en la " + ENTIDAD.cuenta + " de " + ENTIDAD.banco + ", en cumplimiento de " +
    "lo previsto en el artículo 771-2 del Estatuto Tributario.");
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
