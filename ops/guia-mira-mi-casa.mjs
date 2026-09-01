/* Genera la guía de Mira Mi Casa en PDF. Script de un solo uso: no forma parte
   del sitio y se borra después de correrlo. Usa el pdf-lib que ya tiene el repo.

   Los ENLACES de este documento se comprobaron uno por uno contra producción el
   31 de agosto de 2026 antes de escribirlos — no se copiaron de memoria. */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";

/* Los mismos colores que usan los documentos del proyecto (documentos.js). */
const VERDE = rgb(0.122, 0.361, 0.220);
const TINTA = rgb(0.098, 0.094, 0.075);
const GRIS  = rgb(0.361, 0.388, 0.435);
const AMBAR = rgb(0.659, 0.302, 0.0);
const LINEA = rgb(0.855, 0.831, 0.765);
const PAPEL = rgb(0.961, 0.945, 0.910);

/* Las Standard 14 se codifican en WinAnsi. Mismo criterio que documentos.js:
   se traducen los sospechosos y se descarta lo que no cabe, porque pdf-lib LANZA
   al encontrar un carácter que no puede codificar. */
const MAPA = { "‘": "'", "’": "'", "“": '"', "”": '"',
               "–": "-", "…": "...", "→": "->", " ": " " };
function wa(s) {
  let out = "";
  for (const ch of String(s == null ? "" : s)) {
    if (Object.prototype.hasOwnProperty.call(MAPA, ch)) { out += MAPA[ch]; continue; }
    const c = ch.codePointAt(0);
    if (c === 10 || c === 13) { out += ch; continue; }
    if (c >= 32 && c <= 126) { out += ch; continue; }
    if (c >= 160 && c <= 255) { out += ch; continue; }
    if (c === 0x2014 || c === 0x20AC) { out += ch; continue; }
  }
  return out;
}

const doc = await PDFDocument.create();
doc.setTitle("Mira Mi Casa - Guia de funcionamiento");
doc.setAuthor("Fundacion Give&Grow International");
doc.setSubject("Como funciona Mira Mi Casa y donde esta cada area");

const N = await doc.embedFont(StandardFonts.Helvetica);
const B = await doc.embedFont(StandardFonts.HelveticaBold);
const M = await doc.embedFont(StandardFonts.Courier);
/* La «&» de la marca es de palo seco con peso, no una serif: Helvetica-Bold es
   lo mas cercano que dan las Standard 14. El favicon usa Georgia porque ahi la
   sirve el navegador; aqui no se puede embeber Unbounded (ver la nota de arriba). */
const MARCA = B;

const A4 = [595.28, 841.89];
const MG = 56, ANCHO = A4[0] - MG * 2;
let p, y;

/* ── LA MARCA ────────────────────────────────────────────────────────────────
   Se DIBUJA, no se importa: `favicon.svg` la define como un cuadrado verde de
   radio 14/64 con la «&» blanca centrada, y esa es la marca que esta en
   produccion. Reconstruirla vectorialmente sale nitida a cualquier tamano y no
   mete un PNG borroso en el PDF. Si el favicon cambia, esto cambia con el. */
function marca(x, yTop, s, sobreVerde = false) {
  const r = s * (14 / 64);
  const d = "M " + r + " 0 H " + (s - r) +
            " A " + r + " " + r + " 0 0 1 " + s + " " + r + " V " + (s - r) +
            " A " + r + " " + r + " 0 0 1 " + (s - r) + " " + s + " H " + r +
            " A " + r + " " + r + " 0 0 1 0 " + (s - r) + " V " + r +
            " A " + r + " " + r + " 0 0 1 " + r + " 0 Z";
  p.drawSvgPath(d, { x, y: yTop, color: sobreVerde ? PAPEL : VERDE, borderWidth: 0 });
  const t = "&", ts = s * 0.62;
  p.drawText(t, {
    x: x + (s - MARCA.widthOfTextAtSize(t, ts)) / 2,
    y: yTop - s + s * 0.24,
    size: ts, font: MARCA, color: sobreVerde ? VERDE : PAPEL
  });
}

/* Tracking a mano: pdf-lib no tiene letter-spacing, y los eyebrows en
   mayusculas pequenas con aire son la mitad del lenguaje editorial que pide el
   sistema de diseno. Se dibuja caracter por caracter. */
function eyebrow(t, o = {}) {
  const size = o.size || 7.6, extra = o.extra == null ? 1.7 : o.extra;
  const color = o.color || GRIS, font = o.font || B;
  let x = o.x == null ? MG : o.x;
  for (const ch of wa(t.toUpperCase())) {
    p.drawText(ch, { x, y: o.y == null ? y : o.y, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + extra;
  }
  if (o.y == null) y -= (o.despues == null ? 14 : o.despues);
  return x;
}

function pagina() { p = doc.addPage(A4); y = A4[1] - 62; }

const DESBORDES = [];
function pie(n, total) {
  if (y < 62) DESBORDES.push("pagina " + n + " (y=" + Math.round(y) + ")");
  p.drawLine({ start: { x: MG, y: 46 }, end: { x: MG + ANCHO, y: 46 }, thickness: 0.5, color: LINEA });
  marca(MG, 40, 11);
  p.drawText(wa("Mira Mi Casa  ·  guía de funcionamiento  ·  31 de agosto de 2026"),
    { x: MG + 18, y: 32, size: 7.4, font: N, color: GRIS });
  const t = wa(String(n) + " / " + String(total));
  p.drawText(t, { x: MG + ANCHO - N.widthOfTextAtSize(t, 7.4), y: 32, size: 7.4, font: B, color: VERDE });
}
function espacio(n) { y -= n; }

function texto(t, o = {}) {
  const size = o.size || 9.7, font = o.font || N, color = o.color || TINTA;
  const ancho = o.ancho || ANCHO, x0 = o.x || MG, il = o.interlinea || size * 1.5;
  const lineas = [];
  let linea = "";
  for (const w of wa(t).split(/\s+/)) {
    const prueba = linea ? linea + " " + w : w;
    if (font.widthOfTextAtSize(prueba, size) <= ancho) { linea = prueba; continue; }
    lineas.push(linea); linea = w;
  }
  if (linea) lineas.push(linea);
  for (const l of lineas) { p.drawText(l, { x: x0, y, size, font, color }); y -= il; }
  y -= (o.despues == null ? 5 : o.despues);
}
/* Regla fina y titulo: jerarquia de publicacion, no de dashboard. La regla va
   ARRIBA del titulo — separa secciones sin encajonarlas en tarjetas. */
function h2(t) {
  espacio(14);
  p.drawLine({ start: { x: MG, y: y + 13 }, end: { x: MG + ANCHO, y: y + 13 }, thickness: 1.4, color: VERDE });
  p.drawText(wa(t), { x: MG, y, size: 14.5, font: B, color: TINTA });
  y -= 20;
}
function h3(t) {
  espacio(5);
  texto(t, { size: 10.3, font: B, despues: 3 });
}
function punto(t, o = {}) {
  /* Un guion fino y no una vineta: la vineta redonda es lenguaje de app. */
  p.drawLine({ start: { x: MG + 3, y: y + 3.2 }, end: { x: MG + 9, y: y + 3.2 },
               thickness: 0.9, color: VERDE });
  texto(t, { x: MG + 17, ancho: ANCHO - 17, despues: o.despues == null ? 3 : o.despues });
}
function mono(t, o = {}) {
  texto(t, { font: M, size: o.size || 8.5, color: o.color || VERDE, x: o.x || MG + 17,
             ancho: ANCHO - 17, despues: o.despues == null ? 4 : o.despues });
}
/* Panel de aviso: fondo papel y UNA regla vertical de color a la izquierda. Sin
   bordes en las cuatro caras ni esquinas redondas — eso es tarjeta de app. */
function caja(titulo, lineas, color) {
  const c = color || AMBAR;
  const alto = 24 + lineas.length * 12.8;
  p.drawRectangle({ x: MG, y: y - alto + 13, width: ANCHO, height: alto, color: PAPEL });
  p.drawRectangle({ x: MG, y: y - alto + 13, width: 2.4, height: alto, color: c });
  eyebrow(titulo, { y: y, x: MG + 14, color: c, size: 7.8 });
  y -= 17;
  for (const l of lineas) {
    p.drawText(wa(l), { x: MG + 14, y, size: 8.8, font: N, color: TINTA });
    y -= 12.8;
  }
  y -= 20;
}
function fila(izq, der, o = {}) {
  const wIzq = o.wIzq || 150, size = 9.1;
  const corta = (txt, font, sz, max) => {
    const out = []; let l = "";
    for (const w of wa(txt).split(/\s+/)) {
      const t = l ? l + " " + w : w;
      if (font.widthOfTextAtSize(t, sz) <= max) { l = t; continue; }
      out.push(l); l = w;
    }
    if (l) out.push(l);
    return out;
  };
  const dl = corta(der, o.mono ? M : N, o.mono ? 8.3 : size, ANCHO - wIzq - 8);
  const il = corta(izq, B, size, wIzq - 10);
  const y0 = y, n = Math.max(dl.length, il.length);
  il.forEach((l, i) => p.drawText(l, { x: MG, y: y0 - i * 12.4, size, font: B, color: TINTA }));
  dl.forEach((l, i) => p.drawText(l, { x: MG + wIzq, y: y0 - i * 12.4,
    size: o.mono ? 8.3 : size, font: o.mono ? M : N, color: o.mono ? VERDE : GRIS }));
  y = y0 - n * 12.4 - 7;
}
/* ══════════════════════ 1 ══════════════════════ */
pagina();

/* ── LA PORTADA ──────────────────────────────────────────────────────────────
   El «elemento firma» de la pieza, y el unico: una banda verde con la marca en
   negativo. Todo lo demas del documento se queda quieto y disciplinado, que es
   la regla del sistema de diseno — se gasta la audacia en un solo sitio.

   La banda ocupa el tercio superior y no la pagina entera: una portada suelta
   obligaria a una hoja mas para cinco paginas de contenido, y un documento
   operativo que se imprime y se lleva encima no puede gastar papel en eso. */
const BANDA = 208;
p.drawRectangle({ x: 0, y: A4[1] - BANDA, width: A4[0], height: BANDA, color: VERDE });
marca(MG, A4[1] - 44, 34, true);
/* Alineado al CENTRO ÓPTICO de la marca, no al borde superior de la banda: con
   la línea base arriba el eyebrow flotaba y la marca quedaba colgando. */
eyebrow("Fundación Give&Grow International", { y: A4[1] - 64, x: MG + 48, color: PAPEL, size: 7.8, extra: 2 });
p.drawText(wa("Mira Mi Casa"), { x: MG, y: A4[1] - 122, size: 34, font: B, color: PAPEL });
p.drawText(wa("Guía de funcionamiento"), { x: MG, y: A4[1] - 150, size: 13, font: N, color: PAPEL });
p.drawText(wa("Qué es, cómo funciona, y dónde está cada cosa."),
  { x: MG, y: A4[1] - 172, size: 10, font: N, color: PAPEL });
/* La regla en papel sobre el verde cierra la banda por dentro: el mismo recurso
   editorial que separa las secciones, no un adorno distinto. */
p.drawLine({ start: { x: MG, y: A4[1] - 188 }, end: { x: MG + 96, y: A4[1] - 188 },
             thickness: 1.6, color: PAPEL });
y = A4[1] - BANDA - 34;

h2("Qué es");
texto("Una familia cuya casa se afectó por el sismo del 10 de agosto de 2026 sube unas fotos. " +
  "Un ingeniero voluntario con matrícula las mira y le da un CONCEPTO a distancia: si hay señales " +
  "para no permanecer en la casa o en una parte de ella, qué precauciones tomar, y con qué " +
  "materiales conviene repararla. Con eso se ordena la fila de visitas. Si alguien va, firma una " +
  "inspección en terreno. Y si se entregan materiales, queda anotado a qué casa llegaron.");

caja("Lo que Mira Mi Casa NO hace, y hay que decirlo primero", [
  "1. NO declara si una casa es habitable. Eso no se determina por fotos, y la declaratoria",
  "     con efectos legales le corresponde a la autoridad municipal, no a la Fundación.",
  "2. NO promete una fecha. Se dan dos hechos: cuántos días lleva esperando y cuántos casos",
  "     siguen sin abrir. Prometerle un plazo sería peor que decírselo así.",
  "3. NO compromete la reparación de una casa concreta. Se busca ayuda para todas las que se",
  "     pueda, y eso se le dice antes del formulario, no después."
]);

h2("El recorrido, de punta a punta");
h3("1. La familia reporta");
punto("Llena el formulario público y sube fotos. El teléfono es obligatorio; el correo NO, a propósito: en estas zonas mucha gente tiene WhatsApp y no correo.");
punto("Recibe su número de caso y un enlace privado. Si dejó correo, también le llega por ahí.");
h3("2. Un ingeniero da el concepto");
punto("Entra al triaje, ve los casos que esperan, y clasifica: visita urgente, visita programada, no requiere visita, o no puedo evaluar con esto.");
punto("Si no puede evaluar, tiene que decir QUÉ falta. La familia lo ve en su enlace y puede subir esa foto.");
h3("3. Si hace falta, alguien va");
punto("En la casa se llena el formulario de la visita, que funciona SIN internet y se envía cuando hay señal. Sale un documento firmado.");
h3("4. Y si hay materiales");
punto("Se anota qué casa los recibió, atándola a la entrega. Así se puede responder a qué casa evaluada le falta lo suyo.", { despues: 6 });

pie(1, 5);

/* ══════════════════════ 2 ══════════════════════ */
pagina();
h2("Las cuatro puertas");
texto("Mira Mi Casa tiene cuatro entradas y cada una es para alguien distinto. Las dos primeras " +
  "son públicas; las otras dos piden identificarse.", { despues: 12 });

h3("1. La familia — pública, sin cuenta");
mono("https://miramicasa.thegiveandgrowproject.org");
punto("Es la dirección que se reparte. Abre directamente en «Revisa tu casa».");

h3("2. Quien quiera ayudar — pública");
punto("Desde la misma dirección: el banco de casas revisadas, la postulación de ingenieros y el apadrinamiento.");

h3("3. El ingeniero voluntario — pide identificarse");
mono("https://thegiveandgrowproject.org/triaje");
punto("OJO: va en el dominio principal, NO en «miramicasa». Con el subdominio funciona igual, pero da un salto de más — y en la calle con mala señal eso importa.");

h3("4. El equipo — pide identificarse");
mono("https://thegiveandgrowproject.org/admin");
punto("El subdominio «miramicasa» NO sirve para el panel: responde 403 y no redirige. Hay que usar el dominio principal.");

caja("Cómo se entra a las dos que piden identificarse", [
  "Sin cuenta y sin contraseña. Se abre el enlace, se pide un código, llega al correo, y con",
  "él se entra. El correo tiene que ser el mismo con el que la persona se postuló.",
  "",
  "Son DOS permisos distintos: el del triaje deja ver casos y dar conceptos; el del panel",
  "deja ver teléfonos y direcciones. Un ingeniero voluntario tiene el primero, no el segundo."
], VERDE);

h2("Las áreas públicas, con su enlace");
texto("Comprobados uno por uno contra el sitio en producción el 31 de agosto de 2026.",
  { size: 8.6, color: GRIS, despues: 10 });

fila("Revisa tu casa", "https://miramicasa.thegiveandgrowproject.org/#vivienda", { mono: true });
fila("", "El formulario de la familia.");
fila("Casas revisadas", "https://miramicasa.thegiveandgrowproject.org/#casas", { mono: true });
fila("", "El banco público. Sale sector, material y prioridad; nunca nombre, dirección ni fotos, y solo si la familia lo autorizó.");
fila("Ingenieros", "https://miramicasa.thegiveandgrowproject.org/#ingenieros", { mono: true });
fila("", "Donde se postula un ingeniero. El alcance se lee ANTES del formulario.");
fila("Apadrinar", "https://miramicasa.thegiveandgrowproject.org/#apadrinar", { mono: true });
fila("", "Quien quiere aportar se registra. No se cobra nada en línea y no se compromete una casa concreta.");
fila("Privacidad", "https://miramicasa.thegiveandgrowproject.org/#privacidad", { mono: true });

pie(2, 5);

/* ══════════════════════ 3 ══════════════════════ */
pagina();
h2("Las áreas privadas");

h3("Tu caso — solo la familia, con su enlace");
mono("https://miramicasa.thegiveandgrowproject.org/caso/CV-2026-000001?t=…");
punto("Cada familia tiene el suyo, con una llave en la dirección. Ahí ve si un ingeniero ya lo revisó, qué le falta si le pidieron algo, puede subir más fotos, y descarga su concepto en PDF.");
punto("Ese enlace es lo único que devuelve el acceso a un caso. Se le manda por correo al crearlo, y el equipo puede volver a dárselo desde el panel.");
punto("La página no se indexa ni se guarda en cachés compartidas, justamente porque la dirección lleva la llave.");

h3("El triaje — el ingeniero voluntario");
mono("https://thegiveandgrowproject.org/triaje");
punto("Tres pestañas: sin revisar, piden confirmación (urgentes con una sola opinión, o casos en desacuerdo) y ya clasificados.");
punto("Al final: «Tus conceptos», que dice qué pasó con cada uno que firmó — si es el que manda, si otro lo clasificó más grave, y en qué estado está la casa hoy.");
punto("NO ve teléfono ni dirección de la familia. No los necesita para dar un concepto.");

h3("El formulario de la visita — en la casa");
mono("https://thegiveandgrowproject.org/triaje/inspeccion");
punto("ÁBRELO CON SEÑAL ANTES DE SALIR. Se guarda en el teléfono y desde ahí funciona sin internet; lo que se llene se envía cuando vuelva la señal.");
punto("Recoge 26 ítems, observaciones, recomendaciones de la guía del AIS, coordenadas y dos firmas. Al enviarse sale un documento firmado y un aviso al equipo.");

h3("El panel del equipo");
mono("https://thegiveandgrowproject.org/admin");
punto("«Salud del ecosistema»: las colas de lo que está pendiente, ordenadas por urgencia.");
punto("«Casas por revisar»: la bandeja completa, con teléfono y dirección, y el «hilo de la casa» de cada una — todo lo que pasó, en orden.");
punto("«Inspecciones en terreno», con su documento y sus fotos.");
punto("«Entregas»: se ata cada casa que recibió materiales.");
punto("«Quién quiere entrar»: se verifica la matrícula de un ingeniero, y con eso se le abre el acceso.");

h3("La ruta de la brigada");
mono("https://thegiveandgrowproject.org/admin/ruta");
punto("Para llevar en el bolsillo: a qué puerta se va ahora, con teléfono, WhatsApp y —si alguien ya estuvo— un enlace al mapa con las coordenadas de esa visita.");

pie(3, 5);

/* ══════════════════════ 4 ══════════════════════ */
pagina();
h2("Cómo entra un ingeniero nuevo");
texto("Cuatro pasos, y el tercero es el que abre la puerta.", { despues: 10 });
h3("1. Se postula");
punto("En «Ingenieros». Deja nombre, correo, ciudad, matrícula y especialidad, y acepta dos cosas por separado: el tratamiento de datos, y que esto es un triaje de priorización y NO un dictamen de habitabilidad.");
h3("2. Recibe un acuse");
punto("Le dice que una persona va a comprobar su matrícula, y que por eso no es inmediato.");
h3("3. Alguien verifica su matrícula");
punto("En el registro público del COPNIA, y la marca en el panel. ESO es lo que abre la puerta — aceptar la postulación en la bandeja no le abre nada.");
h3("4. El sistema le escribe");
punto("Al marcarla, le llega un correo con la dirección del triaje. Si ese aviso falla, el panel lo dice en el momento y en su fila hay un botón para reenviarlo.", { despues: 6 });

caja("Un detalle que evita un error caro", [
  "La matrícula que se imprime en el informe de la familia sale del REGISTRO, no de lo que el",
  "ingeniero teclee al evaluar. Por eso el formulario ya no la pide: le enseña con qué nombre",
  "y número va a firmar. Si ahí hay un error, se avisa al equipo y se corrige en el registro",
  "— no se escribe distinto en cada caso."
], VERDE);

h2("Los avisos automáticos");
texto("Quién recibe un correo, y cuándo. Ninguno reemplaza una llamada.",
  { size: 8.6, color: GRIS, despues: 10 });
fila("La familia", "Al crear su caso: su número y su enlace.", { wIzq: 120 });
fila("", "Cuando hay concepto: qué dijo el ingeniero y dónde verlo. Solo si dejó correo, si los ingenieros no discrepan, y si la matrícula está verificada.", { wIzq: 120 });
fila("El equipo", "Cuando entra un caso nuevo.", { wIzq: 120 });
fila("", "Cuando llega una inspección de terreno. Si trae PELIGRO INMINENTE o EVACUAR, lo dice en el asunto.", { wIzq: 120 });
fila("", "Cuando dos ingenieros no coinciden, o cuando un concepto no puede salir por falta de matrícula verificada.", { wIzq: 120 });
fila("El ingeniero", "Al postularse, el acuse. Al verificarse su matrícula, que ya puede entrar.", { wIzq: 120 });

pie(4, 5);

/* ══════════════════════ 5 ══════════════════════ */
pagina();
h2("Qué mirar cuando algo va mal");
texto("En el panel, «Salud del ecosistema». Cada cola dice cuántos hay, desde cuándo, y cómo se " +
  "arregla. Estas son las de Mira Mi Casa, de la más urgente a la menos:", { despues: 10 });
fila("Terreno sin atender", "Alguien fue a la casa y marcó peligro inminente, evacuar, o requiere especialista. Se cierra con «Ya la atendimos» y diciendo qué se hizo.", { wIzq: 168 });
fila("Urgentes sin visitar", "Un ingeniero dijo urgente y no ha ido nadie.", { wIzq: 168 });
fila("Respondieron", "La familia mandó las fotos que le pidieron y nadie las ha vuelto a mirar.", { wIzq: 168 });
fila("Casos sin evaluar", "Nadie los ha abierto todavía.", { wIzq: 168 });
fila("Esperando fotos", "Se le pidió material a la familia y no ha llegado. Quizá haya que llamarla.", { wIzq: 168 });
fila("Conceptos sin respaldo", "Hay concepto, pero la matrícula no está verificada, así que a la familia NO le ha salido.", { wIzq: 168 });
fila("Visitadas sin materiales", "Se fue a la casa y no se le ha anotado ninguna entrega.", { wIzq: 168 });

h2("Tres cosas que conviene saber");
punto("El formulario de la visita hay que abrirlo CON señal antes de salir. Si se abre por primera vez sin internet, no carga.");
punto("Para el panel hay que usar el dominio principal: el subdominio «miramicasa» responde 403 en /admin y no redirige.");
punto("Un concepto de un ingeniero cuya matrícula no se ha verificado se guarda y lo revisa el equipo, pero NO le sale solo a la familia. Eso es a propósito.");

caja("Lo que todavía no se ha probado con una persona real", [
  "Al 31 de agosto de 2026, ningún ingeniero ha entrado con la regla de acceso automática.",
  "Todo lo de abajo funciona en el código y se verificó contra la base de datos, pero no se",
  "ha ejercitado con una sesión real:",
  "",
  "     · el formulario del triaje enseñando con qué firma, en vez de pedirlo",
  "     · un envío del formulario de la visita, con su aviso por correo",
  "     · el botón «Ya la atendimos», y el de atar una casa a una entrega",
  "",
  "La primera vez que un ingeniero entre es la prueba que falta. Lo que hay que mirar es que",
  "al enviar una inspección el contador del teléfono baje a cero."
]);

texto("Esta guía se escribió el 31 de agosto de 2026. Los enlaces se comprobaron uno por uno " +
  "contra el sitio en producción antes de incluirlos.", { size: 8.4, color: GRIS, despues: 0 });

pie(5, 5);

const bytes = await doc.save();
fs.writeFileSync(process.argv[2] || "guia-mira-mi-casa.pdf", bytes);
if (DESBORDES.length) console.log("DESBORDE en: " + DESBORDES.join(", "));
else console.log("ninguna página desborda");
console.log("listo: " + (bytes.length / 1024).toFixed(1) + " KB, " + doc.getPageCount() + " páginas");
