/* Validación pre-deploy Give&Grow — falla el build si algo se rompe. */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { esDict, decodeHtml, eachTextNode } from "./i18n-html.mjs";

let fail = 0;
const err = (m) => { console.error("NO OK  " + m); fail = 1; };
const ok  = (m) => console.log("ok     " + m);

/* 1 · Sintaxis JS
   No solo app.js: worker.js y documentos.js también se despliegan, y un error de
   sintaxis ahí no rompe el sitio en local —donde nadie los ejecuta al validar—
   sino el Worker entero en producción. `--check` sobre un módulo ES no resuelve
   los imports, así que no necesita node_modules: comprueba forma, no enlaces.
   Del enlazado se encarga el `--dry-run` de wrangler en ci.yml. */
for (const f of ["app.js", "worker.js", "documentos.js"]) {
  try { execSync(`node --check --input-type=module < ${f}`, { shell: "/bin/sh" }); ok(f + " sintaxis"); }
  catch (e) { err(f + " sintaxis inválida"); }
}

/* 1b · Sintaxis del JS que worker.js GENERA.
   El panel `/admin` no es un archivo del repo: son ~485 líneas que `adminJS()`
   devuelve como template literal y el navegador ejecuta. El check #1 valida
   worker.js —que compila perfectamente— y nunca miraba lo emitido.

   El 12 ago 2026 eso costó el panel entero durante siete horas: un `\n` dentro
   del template se interpoló y dejó un salto de línea real dentro de una cadena
   entre comillas. El admin.js servido no compilaba, así que las CUATRO tablas
   se quedaban en «Cargando…» y no había forma de notarlo desde el gate. Access
   es fail-closed, así que en local el panel devuelve 403 y tampoco se ve ahí.

   Se valida lo EMITIDO, no el código fuente del template: hay que evaluar el
   literal para que las secuencias de escape queden como quedan en producción. */
const workerSrc = readFileSync("worker.js", "utf8");
for (const [nombre, fn] of [["adminJS()", "adminJS"]]) {
  try {
    const i = workerSrc.indexOf("function " + fn + "()");
    if (i === -1) throw new Error("no se encontró " + nombre);
    const ini = workerSrc.indexOf("`", i);
    /* Cierre real del literal: la primera comilla invertida sin escapar. */
    let j = ini + 1;
    for (; j < workerSrc.length; j++) {
      if (workerSrc[j] === "\\") { j++; continue; }
      if (workerSrc[j] === "`") break;
    }
    const literal = workerSrc.slice(ini, j + 1);
    if (literal.includes("${")) throw new Error(nombre + " tiene interpolaciones; este check asume que no");
    const emitido = new Function("return " + literal)();
    /* stdio en pipe: si no, el stderr de node se cuela crudo en la salida del
       gate antes del NO OK y el mensaje real queda enterrado. */
    execSync("node --check", { input: emitido, stdio: ["pipe", "pipe", "pipe"] });
    ok(nombre + " emite JS válido (" + emitido.split("\n").length + " líneas)");

    /* Y que cada bandeja se pida al arrancar. `cargarReportadas` existía, su
       endpoint respondía 200 y su tabla se quedaba en «Cargando…» para siempre:
       solo se llamaba desde los botones de confirmar, nunca en el arranque.
       Las llamadas de arranque son las únicas en columna 0; las de dentro de
       una función van indentadas. */
    const definidas = [...emitido.matchAll(/^function (cargar\w*)\s*\(/gm)].map(m => m[1]);
    const arranque  = new Set([...emitido.matchAll(/^(cargar\w*)\(\);$/gm)].map(m => m[1]));
    const huerfanas = definidas.filter(f => !arranque.has(f));
    if (huerfanas.length) {
      err(nombre + ": " + huerfanas.join(", ") + " no se llama al arrancar — su tabla se queda en «Cargando…»");
    } else ok(nombre + " pide sus " + definidas.length + " bandejas al arrancar");
  } catch (e) {
    err(nombre + " emite JS INVÁLIDO — el panel no cargaría: " + (e.stderr ? String(e.stderr).split("\n")[1] || e.message : e.message));
  }
}

/* 1c · Las páginas HTML que el Worker GENERA no se truncan.
   El check #1b cubre el JS emitido y tenía un punto ciego: los templates de
   HTML. El 12 ago 2026 una comilla invertida dentro de un comentario HTML del
   panel cerró su template a mitad de camino y se perdieron las cinco tablas.
   `node --check worker.js` pasó en verde igualmente, porque una plantilla
   seguida de un punto —`...`.med-tbl— es sintaxis válida por accidente: se lee
   como un acceso a propiedad menos un identificador.

   La comprobación es tonta y por eso funciona: si un template empieza en
   <!doctype html>, su valor tiene que terminar en </html>. Un cierre temprano
   lo rompe siempre. */
for (const [i, m] of [...workerSrc.matchAll(/return `<!doctype html>/g)].entries()) {
  const ini = workerSrc.indexOf("`", m.index);
  let j = ini + 1;
  for (; j < workerSrc.length; j++) {
    if (workerSrc[j] === "\\") { j++; continue; }
    if (workerSrc[j] === "`") break;
  }
  const linea = workerSrc.slice(0, ini).split("\n").length;
  /* No se evalúa: estos templates interpolan valores y montar un entorno falso
     para cada uno sería más frágil que lo que se quiere comprobar. Se mira el
     TEXTO: dónde cierra la plantilla y qué hay justo antes.
     El escáner salta los ${…} con balance de llaves, porque dentro puede haber
     comillas invertidas legítimas que no cierran nada. */
  let k = ini + 1, cierre = -1;
  while (k < workerSrc.length) {
    const ch = workerSrc[k];
    if (ch === "\\") { k += 2; continue; }
    if (ch === "$" && workerSrc[k + 1] === "{") {
      let d = 1; k += 2;
      while (k < workerSrc.length && d > 0) {
        if (workerSrc[k] === "{") d++;
        else if (workerSrc[k] === "}") d--;
        k++;
      }
      continue;
    }
    if (ch === "`") { cierre = k; break; }
    k++;
  }
  if (cierre === -1) { err("plantilla HTML de worker.js:" + linea + " no cierra nunca"); continue; }
  const cuerpo = workerSrc.slice(ini + 1, cierre).trimEnd();
  if (!cuerpo.toLowerCase().endsWith("</html>")) {
    err("plantilla HTML de worker.js:" + linea + " se corta antes de </html> — termina en «" +
        cuerpo.slice(-46).replace(/\s+/g, " ") + "». Casi siempre es una comilla invertida suelta dentro del template.");
  } else {
    ok("plantilla HTML de worker.js:" + linea + " cierra en </html> (" + cuerpo.length + " chars)");
  }
}

const src  = readFileSync("app.js", "utf8");
const html = readFileSync("index.html", "utf8");

/* 2 · Paridad i18n: ES (app.js) vs EN (i18n/en.json) */
function esKeys() {
  const re = /\bes\s*:\s*\{/g; re.exec(src);
  let i = re.lastIndex, d = 1; const st = i;
  for (; i < src.length && d > 0; i++) { const c = src[i]; if (c === "{") d++; else if (c === "}") d--; }
  return new Set([...src.slice(st, i - 1).matchAll(/"([^"]+)"\s*:/g)].map(x => x[1]));
}
const es = esKeys();
let en = new Set();
try { en = new Set(Object.keys(JSON.parse(readFileSync("i18n/en.json", "utf8")))); ok("i18n/en.json válido (" + en.size + " claves)"); }
catch (e) { err("i18n/en.json inválido o ausente"); }
const soloEs = [...es].filter(k => !en.has(k));
const soloEn = [...en].filter(k => !es.has(k));
if (soloEs.length || soloEn.length) err("paridad i18n rota — solo ES: [" + soloEs.join(", ") + "] solo EN: [" + soloEn.join(", ") + "]");
else ok("paridad i18n " + es.size + "/" + en.size);

/* 3 · Cobertura data-i18n */
const used = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(x => x[1]);
const missing = [...new Set(used)].filter(k => !es.has(k));
if (missing.length) err("data-i18n sin clave: " + missing.join(", "));
else ok("cobertura data-i18n (" + new Set(used).size + " claves usadas)");

/* 4 · JSONs */
try { JSON.parse(readFileSync("data/partners.json", "utf8")); ok("data/partners.json válido"); }
catch (e) { err("data/partners.json inválido"); }
let ld = 0;
for (const b of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  ld++;
  try { JSON.parse(b[1]); } catch (e) { err("JSON-LD #" + ld + " inválido"); }
}
ok("JSON-LD (" + ld + " bloques)");

/* 4b · El FAQ del JSON-LD es un DUPLICADO del diccionario, y los duplicados se
   desfasan. `hydrate-i18n.mjs` no lo toca porque no tiene atributos data-i18n,
   así que nada lo vigilaba: el 11 ago 2026 el bloque seguía prometiendo "próximamente
   habilitaremos tarjeta y PSE vía Wompi" semanas después de que Wompi estuviera vivo.
   Google lee ese bloque, así que un texto viejo ahí es desinformación publicada. */
{
  const dict = esDict(src);
  const faqs = [];
  for (const b of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let d; try { d = JSON.parse(b[1]); } catch { continue; }
    if (d["@type"] !== "FAQPage") continue;
    for (const q of (d.mainEntity || [])) {
      faqs.push({ p: (q.name || "").trim(), r: ((q.acceptedAnswer || {}).text || "").trim() });
    }
  }
  const preguntas = Object.keys(dict).filter(k => /^faq\.q\d+$/.test(k));
  const desfasados = [];
  for (const kq of preguntas) {
    const ka = kq.replace(".q", ".a");
    if (!dict[ka]) continue;
    const enJson = faqs.find(f => f.p === dict[kq].trim());
    if (!enJson) continue;                       // no todas las del dict están en el JSON-LD
    if (enJson.r !== dict[ka].trim()) desfasados.push(ka);
  }
  if (desfasados.length) {
    err("JSON-LD del FAQ desfasado del diccionario ES en: " + desfasados.join(", ") +
        " — el bloque es un duplicado a mano y hay que actualizarlo junto al dict");
  } else {
    ok("JSON-LD del FAQ coincide con el diccionario (" + faqs.length + " respuestas)");
  }
}

/* 5 · Balance de tags */
let tagsOk = true;
for (const tag of ["main", "section", "div", "ul", "li", "span", "a", "button"]) {
  const o = (html.match(new RegExp("<" + tag + "[\\s>]", "g")) || []).length;
  const c = (html.match(new RegExp("</" + tag + ">", "g")) || []).length;
  if (o !== c) { err("tags <" + tag + "> desbalanceados: " + o + " abren / " + c + " cierran"); tagsOk = false; }
}
if (tagsOk) ok("balance de tags");

/* 5b · Claves ES duplicadas — en un literal JS gana la última, así que un duplicado
   silencia el valor que creíste haber puesto. Difícil de ver a ojo en 676 claves. */
{
  const blk = src.slice(src.indexOf("var I18N"), src.indexOf("function t("));
  const cuenta = {};
  for (const m of blk.matchAll(/"([a-zA-Z0-9_.\-]+)"\s*:/g)) cuenta[m[1]] = (cuenta[m[1]] || 0) + 1;
  const dup = Object.keys(cuenta).filter(k => cuenta[k] > 1);
  if (dup.length) err("claves ES duplicadas (gana la última): " + dup.join(", "));
  else ok("sin claves ES duplicadas");
}

/* 6 · index.html hidratado — el HTML servido debe decir lo mismo que el diccionario ES.
   Sin esto la SPA publica un cascarón hueco: crawlers, previews de enlace y modos
   lectura ven viñetas vacías y titulares desfasados. Regenerar con:
   node scripts/hydrate-i18n.mjs */
try {
  const dict = esDict(src);
  let vacios = 0, desfasados = 0;
  const ejemplos = [];
  eachTextNode(html, ({ key, inner }) => {
    const want = dict[key];
    if (want == null || decodeHtml(inner) === want) return;
    inner.trim() ? desfasados++ : vacios++;
    if (ejemplos.length < 5) ejemplos.push(key);
  });
  if (vacios || desfasados) {
    err("index.html desincronizado del diccionario ES: " + vacios + " vacíos, " + desfasados +
        " desfasados (" + ejemplos.join(", ") + "…) — corrige con: node scripts/hydrate-i18n.mjs");
  } else ok("index.html hidratado");
} catch (e) { err("no se pudo verificar la hidratación: " + e.message); }

/* 10 · Las minutas dicen lo mismo que el certificado del sistema.
   `ops/minutas-certificado.js` genera los .docx que se llenan a mano cuando una
   donación no pasó por el sitio o fue en especie. Su articulado es el MISMO que
   arma `documentos.js` — y ahí está el peligro: son dos copias del mismo texto
   legal en archivos distintos, que es exactamente la forma en que el Drive y el
   sitio terminaron diciendo cosas contrarias sobre el mismo artículo (Art. 125 /
   125% contra Art. 257 / 25%) durante meses, sin que nadie lo notara.

   Se comparan solo las cláusulas que son idénticas por definición en los dos
   documentos: la sección III completa, la IV, el aviso del art. 257 y la
   cláusula de expedición. Las que llevan datos del aporte (numerales II.1 a
   II.6) no se comparan: en el PDF se interpolan y en la minuta son campos en
   blanco, así que divergen a propósito.

   Falla en las dos direcciones: si el texto cambia en documentos.js y no en la
   minuta, y si la cláusula desaparece de documentos.js. */
try {
  const minutaSrc = readFileSync("ops/minutas-certificado.js", "utf8");
  const docsSrc = readFileSync("documentos.js", "utf8");

  /* Un literal de texto puede estar partido en varias cadenas unidas por `+`
     para no pasarse del ancho de línea. Se reconstruyen aquí, o media cláusula
     no se encontraría nunca. */
  const cadenas = (fuente) => {
    const out = [];
    const re = /"((?:[^"\\]|\\.)*)"(\s*\+\s*"(?:[^"\\]|\\.)*")*/g;
    for (const m of fuente.matchAll(re)) {
      const partes = [...m[0].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
      out.push(partes.join("").replace(/\\"/g, '"').replace(/\s+/g, " ").trim());
    }
    return out;
  };

  const enDocs = cadenas(docsSrc);
  const enMinuta = new Set(cadenas(minutaSrc));

  /* Las cláusulas juradas, por su arranque. Se busca el texto COMPLETO de cada
     una en documentos.js y se exige idéntico en la minuta. */
  const juradas = [
    "Que recibió a título de donación",
    "Tipo de entidad donataria:",
    "Para efectos de lo previsto en los artículos 125-1",
    "Ha sido reconocida como persona jurídica",
    "Ha cumplido con la obligación de presentar",
    "Maneja los ingresos por donaciones",
    "Se encuentra calificada y vigente",
    "Destina la totalidad de sus excedentes",
    "La donación aquí certificada constituye",
    "La donación no consistió en acciones",
    "La información aquí certificada fue tomada",
    "El contenido de esta certificación se entiende rendido",
    "Se informa al donante que, conforme al artículo 257",
    "La presente certificación se expide en cumplimiento"
  ];

  /* Igualdad exacta, y si no, que el literal de documentos.js esté CONTENIDO en
     alguna cadena de la minuta. Lo segundo es por las cláusulas que interpolan
     un dato: el numeral II.2 termina en `+ ENTIDAD.vigilancia + "."`, así que su
     literal se corta en «…control de la » mientras la minuta lleva el nombre
     escrito. Sin esta rama el check gritaría por una diferencia que no existe. */
  const listaMinuta = [...enMinuta];
  const sinFuente = [], divergentes = [];
  for (const arranque of juradas) {
    const texto = enDocs.find((s) => s.startsWith(arranque));
    if (!texto) { sinFuente.push(arranque); continue; }
    if (enMinuta.has(texto)) continue;
    if (listaMinuta.some((s) => s.includes(texto))) continue;
    divergentes.push(arranque);
  }

  if (sinFuente.length) {
    err("el certificado de documentos.js ya no tiene estas cláusulas: «" + sinFuente.join("», «") +
        "» — si el articulado cambió a propósito, actualiza la lista del check #10");
  } else if (divergentes.length) {
    err("ops/minutas-certificado.js no dice lo mismo que documentos.js en: «" + divergentes.join("», «") +
        "» — el mismo texto legal en dos documentos que se contradicen");
  } else {
    ok("minutas y certificado dicen lo mismo (" + juradas.length + " cláusulas juradas)");
  }
} catch (e) { err("no se pudo comparar las minutas con el certificado: " + e.message); }

/* 11 · Trinquete del sistema visual (plan VISUAL, Fase 4).
   El sistema existe —más de 50 tokens— pero el CSS no lo usaba: 207 colores
   escritos a mano en 79 tonos distintos, y 211 tamaños de fuente sueltos en 26
   medidas, con medios puntos (13.5px, 14.5px, 16.5px…). Así es como aparecen un
   `#B4690E` fuera de paleta en el mapa y tres rojos de error distintos.

   No se puede exigir cero de golpe: la migración necesita triaje uno por uno
   —muchos de los `#fff` son legítimos, sobre superficies oscuras en los dos
   modos— y hacerla a ciegas rompería el modo noche sin que nadie lo note.

   Así que esto es un TRINQUETE, no un muro: fija el número actual como techo.
   No se puede empeorar, y cada tanda de migración baja el listón. Si migras,
   BAJA estas dos constantes: el check te dice el número exacto. */
const TECHO_COLORES = 142;
const TECHO_FUENTES = 210;
try {
  const css = readFileSync("styles.css", "utf8");
  /* Los bloques que DEFINEN tokens son justo donde los literales deben estar.
     Se reconoce cualquier regla cuyo selector mencione `:root` o
     `html[data-theme`, no solo las que empiezan por ahí: la hoja de impresión
     redefine su paleta con `:root, :root[data-theme="dark"] {`, y con la forma
     anterior ese bloque entero se contaba como fugas. */
  const defs = (css.match(/[^{}]+\{[^}]*\}/gs) || [])
    .filter(b => /:root|html\[data-theme/.test(b.slice(0, b.indexOf("{"))));
  let resto = css;
  for (const d of defs) resto = resto.replace(d, "");

  const colores = (resto.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || []).length;
  const fuentes = (resto.match(/font-size:\s*[0-9.]+px/g) || []).length;

  const reporta = (nombre, n, techo, ayuda) => {
    if (n > techo) {
      err(`${nombre}: ${n} en styles.css, y el techo es ${techo}. ` +
          `Usa los tokens de \`:root\` (${ayuda}). Si de verdad hace falta uno nuevo, ` +
          `defínelo como token y súbelo ahí, no lo escribas suelto.`);
    } else if (n < techo) {
      ok(`${nombre}: ${n} — BAJÓ del techo ${techo}. Actualiza TECHO_* en validate.mjs a ${n}`);
    } else {
      ok(`${nombre}: ${n}, en el techo`);
    }
  };
  reporta("colores literales fuera de los tokens", colores, TECHO_COLORES, "--g, --acc, --amber, --err…");
  reporta("tamaños de fuente sueltos", fuentes, TECHO_FUENTES, "--fs-body, --fs-h3, --fs-eyebrow…");
} catch (e) { err("no se pudo medir el sistema visual: " + e.message); }

process.exit(fail);
