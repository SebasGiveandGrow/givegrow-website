/* Validación pre-deploy Give&Grow — falla el build si algo se rompe. */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { esDict, decodeHtml, eachTextNode } from "./i18n-html.mjs";

let fail = 0;
const err = (m) => { console.error("NO OK  " + m); fail = 1; };
const ok  = (m) => console.log("ok     " + m);

/* 1 · Sintaxis JS */
try { execSync("node --check app.js"); ok("app.js sintaxis"); }
catch (e) { err("app.js sintaxis inválida"); }

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

/* 5 · Balance de tags */
let tagsOk = true;
for (const tag of ["main", "section", "div", "ul", "li", "span", "a", "button"]) {
  const o = (html.match(new RegExp("<" + tag + "[\\s>]", "g")) || []).length;
  const c = (html.match(new RegExp("</" + tag + ">", "g")) || []).length;
  if (o !== c) { err("tags <" + tag + "> desbalanceados: " + o + " abren / " + c + " cierran"); tagsOk = false; }
}
if (tagsOk) ok("balance de tags");

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
