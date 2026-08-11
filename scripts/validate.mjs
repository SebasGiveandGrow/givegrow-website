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

process.exit(fail);
