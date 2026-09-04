/* Hidrata index.html con el texto ES del diccionario.
   Motivo: el sitio es una SPA que rellena los data-i18n en runtime. Sin esto,
   el HTML publicado sale hueco — crawlers, previews de enlace y modos lectura
   ven viñetas vacías y titulares desfasados. "Evidencia, no promesas" también
   aplica al archivo que se sirve.

   Uso:  node scripts/hydrate-i18n.mjs          (escribe)
         node scripts/hydrate-i18n.mjs --check  (solo reporta, no escribe) */

import { readFileSync, writeFileSync } from "node:fs";
import { esDict, escapeHtml, escapeAttr, decodeHtml, eachTextNode, eachAttrNode } from "./i18n-html.mjs";

const check = process.argv.includes("--check");
const es = esDict(readFileSync("app.js", "utf8"));
const html = readFileSync("index.html", "utf8");

const edits = [];
let filled = 0, fixed = 0, enAttr = 0, sinAttr = [];

eachTextNode(html, ({ key, openEnd, close, inner }) => {
  const want = es[key];
  if (want == null) return;                // clave inexistente: lo reporta validate.mjs
  // Comparación exacta, sin trim: hay claves cuyo espacio inicial es significativo
  // (p.ej. eco.alma = " — la interfaz…", que sigue a un <b> hermano).
  if (decodeHtml(inner) === want) return;
  inner.trim() ? fixed++ : filled++;
  edits.push({ start: openEnd, end: close, texto: escapeHtml(want) });
});

/* LOS ATRIBUTOS, que hasta hoy no hidrataba nadie. `eachTextNode` los omite —su
   destino no es el contenido— y nadie recogía el testigo, así que su valor
   escrito a mano podía discrepar del diccionario en silencio. Al escribir esto
   había TRES: el aria-label del botón de ALMA y los dos de la galería de una
   ficha, que en el HTML decían «Anterior» y «Siguiente» cuando el diccionario ya
   decía «Fotografía anterior» y «Fotografía siguiente». */
eachAttrNode(html, ({ key, attr, valueStart, valueEnd, value }) => {
  const want = es[key];
  if (want == null) return;
  if (value === null) { sinAttr.push(key + " [" + attr + "]"); return; }
  if (decodeHtml(value) === want) return;
  enAttr++;
  edits.push({ start: valueStart, end: valueEnd, texto: escapeAttr(want) });
});

/* Un atributo declarado en `data-i18n-attr` que NO está escrito en la etiqueta no
   se puede hidratar: no hay hueco donde poner el texto y añadirlo a ciegas es
   inventar markup. Se AVISA en vez de recogerlo y callar — que es exactamente el
   fallo silencioso que este archivo acaba de cerrar. Lo falla el gate. */
if (sinAttr.length) {
  console.error("aviso  " + sinAttr.length + " atributo(s) declarados en data-i18n-attr no existen " +
                "en su etiqueta y no se pueden hidratar: " + sinAttr.join(", "));
}

/* El FAQ del JSON-LD es un duplicado del diccionario que nada mantenía: no lleva
   atributos data-i18n, así que el hidratador lo ignoraba y se desfasaba en
   silencio. El 11 ago 2026 tenía OCHO respuestas viejas, una de ellas prometiendo
   "próximamente habilitaremos tarjeta y PSE vía Wompi" con Wompi ya en vivo — y
   Google lee ese bloque. Ahora se sincroniza desde el mismo diccionario. */
let ldSync = 0;
function sincronizarFaqJsonLd(texto) {
  return texto.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    (todo, cuerpo) => {
      let d;
      try { d = JSON.parse(cuerpo); } catch { return todo; }
      if (d["@type"] !== "FAQPage" || !Array.isArray(d.mainEntity)) return todo;

      /* Se empareja por la PREGUNTA, no por posición: si mañana se reordena el
         bloque o se añade una pregunta, esto sigue funcionando. */
      const porPregunta = new Map();
      for (const k of Object.keys(es)) {
        const m = k.match(/^faq\.q(\d+)$/);
        if (m && es["faq.a" + m[1]] != null) porPregunta.set(es[k].trim(), es["faq.a" + m[1]]);
      }
      let cambio = false;
      for (const q of d.mainEntity) {
        const esperado = porPregunta.get((q.name || "").trim());
        if (esperado == null) continue;
        const a = q.acceptedAnswer || (q.acceptedAnswer = { "@type": "Answer", text: "" });
        if ((a.text || "").trim() !== esperado.trim()) { a.text = esperado; cambio = true; ldSync++; }
      }
      return cambio
        ? '<script type="application/ld+json">' + JSON.stringify(d) + '</script>'
        : todo;
    }
  );
}

if (!edits.length) {
  const conLd = sincronizarFaqJsonLd(html);
  if (ldSync && !check) {
    writeFileSync("index.html", conLd);
    console.log(`ok     index.html hidratado: ${ldSync} respuesta(s) del JSON-LD sincronizada(s)`);
    process.exit(0);
  }
  if (ldSync && check) {
    console.error(`NO OK  JSON-LD del FAQ desfasado: ${ldSync} respuesta(s)`);
    console.error("       corrige con: node scripts/hydrate-i18n.mjs");
    process.exit(1);
  }
  console.log("ok     index.html ya está hidratado");
  process.exit(0);
}

if (check) {
  console.error(`NO OK  index.html desincronizado: ${filled} vacíos, ${fixed} desfasados` +
                (enAttr ? `, ${enAttr} en atributos` : ""));
  console.error("       corrige con: node scripts/hydrate-i18n.mjs");
  process.exit(1);
}

/* De atrás hacia adelante para no invalidar los offsets ya calculados. Se ORDENA
   antes: los de texto y los de atributo llegan en dos pasadas, así que ya no
   vienen en orden por sí solos. */
let out = html;
edits.sort((a, b) => b.start - a.start);
for (const e of edits) out = out.slice(0, e.start) + e.texto + out.slice(e.end);
out = sincronizarFaqJsonLd(out);
writeFileSync("index.html", out);
console.log(`ok     index.html hidratado: ${filled} vacíos rellenados, ${fixed} desfasados corregidos` +
            (enAttr ? `, ${enAttr} atributos` : "") +
            (ldSync ? `, ${ldSync} del JSON-LD sincronizadas` : ""));
