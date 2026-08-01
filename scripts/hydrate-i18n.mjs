/* Hidrata index.html con el texto ES del diccionario.
   Motivo: el sitio es una SPA que rellena los data-i18n en runtime. Sin esto,
   el HTML publicado sale hueco — crawlers, previews de enlace y modos lectura
   ven viñetas vacías y titulares desfasados. "Evidencia, no promesas" también
   aplica al archivo que se sirve.

   Uso:  node scripts/hydrate-i18n.mjs          (escribe)
         node scripts/hydrate-i18n.mjs --check  (solo reporta, no escribe) */

import { readFileSync, writeFileSync } from "node:fs";
import { esDict, escapeHtml, decodeHtml, eachTextNode } from "./i18n-html.mjs";

const check = process.argv.includes("--check");
const es = esDict(readFileSync("app.js", "utf8"));
const html = readFileSync("index.html", "utf8");

const edits = [];
let filled = 0, fixed = 0;

eachTextNode(html, ({ key, openEnd, close, inner }) => {
  const want = es[key];
  if (want == null) return;                // clave inexistente: lo reporta validate.mjs
  // Comparación exacta, sin trim: hay claves cuyo espacio inicial es significativo
  // (p.ej. eco.alma = " — la interfaz…", que sigue a un <b> hermano).
  if (decodeHtml(inner) === want) return;
  inner.trim() ? fixed++ : filled++;
  edits.push({ openEnd, close, html: escapeHtml(want) });
});

if (!edits.length) {
  console.log("ok     index.html ya está hidratado");
  process.exit(0);
}

if (check) {
  console.error(`NO OK  index.html desincronizado: ${filled} vacíos, ${fixed} desfasados`);
  console.error("       corrige con: node scripts/hydrate-i18n.mjs");
  process.exit(1);
}

// Aplicar de atrás hacia adelante para no invalidar los offsets ya calculados.
let out = html;
for (let i = edits.length - 1; i >= 0; i--) {
  const e = edits[i];
  out = out.slice(0, e.openEnd) + e.html + out.slice(e.close);
}
writeFileSync("index.html", out);
console.log(`ok     index.html hidratado: ${filled} vacíos rellenados, ${fixed} desfasados corregidos`);
