/* Utilidades compartidas: leer el diccionario ES y recorrer los data-i18n de index.html.
   Lo usan hydrate-i18n.mjs (escribe) y validate.mjs (verifica). Una sola fuente de verdad
   para que el generador y el gate no puedan discrepar entre sí. */

/* Extrae el objeto es:{...} de app.js evaluándolo como literal JS.
   Evaluar (en vez de parsear con regex) respeta los escapes tal cual los escribió el autor. */
export function esDict(src) {
  const re = /\bes\s*:\s*\{/g;
  if (!re.exec(src)) throw new Error("no se encontró el bloque es:{ } en app.js");
  const start = re.lastIndex - 1;
  let i = re.lastIndex, depth = 1;
  for (; i < src.length && depth > 0; i++) {
    const c = src[i];
    if (c === '"') { while (src[++i] !== '"') if (src[i] === "\\") i++; }
    else if (c === "{") depth++;
    else if (c === "}") depth--;
  }
  return new Function("return " + src.slice(start, i))();
}

/* Texto plano -> contenido HTML seguro. En runtime applyLang usa textContent,
   así que estas entidades vuelven a decodificarse al mismo texto exacto. */
export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const ENTS = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", mdash: "—", ndash: "–", rarr: "→", larr: "←" };
export function decodeHtml(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(parseInt(e[1] === "x" || e[1] === "X" ? e.slice(2) : e.slice(1), e[1] === "x" || e[1] === "X" ? 16 : 10));
    return ENTS[e.toLowerCase()] ?? m;
  });
}

/* Recorre cada elemento con data-i18n cuyo contenido es texto traducible.
   Omite los data-i18n-attr: en esos el destino es un atributo, no el contenido.
   Verificado: ningún data-i18n de index.html contiene markup anidado, por eso
   basta con buscar el primer cierre del mismo tag. */
export function eachTextNode(html, fn) {
  const re = /<([a-z0-9]+)\b([^>]*?)\bdata-i18n="([^"]+)"([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const [full, tag, pre, key, post] = m;
    if (/data-i18n-attr/.test(pre + post)) continue;
    if (full.endsWith("/>")) continue;
    const openEnd = m.index + full.length;
    const close = html.indexOf("</" + tag + ">", openEnd);
    if (close < 0) continue;
    fn({ key, tag, openEnd, close, inner: html.slice(openEnd, close) });
  }
}

/* Texto plano -> VALOR DE ATRIBUTO seguro. No vale `escapeHtml`: un atributo va
   entre comillas dobles y hay claves con comillas dentro. */
export function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* El GEMELO de eachTextNode para el otro destino: los elementos cuyo data-i18n
   apunta a uno o varios ATRIBUTOS.

   Existe porque `eachTextNode` los omite —correctamente, su destino no es el
   contenido— y nadie recogia el testigo: ni el hidratador ni el gate los miraban,
   asi que su valor escrito a mano podia decir una cosa y el diccionario otra sin
   que nada lo notara. En marcha no se ve, porque applyLang los repinta; lo ve un
   rastreador, y un lector de pantalla en el rato anterior a que cargue el JS.

   `value` es null cuando el atributo ni siquiera esta escrito: eso no se puede
   arreglar moviendo texto, asi que se reporta en vez de inventarselo. */
export function eachAttrNode(html, fn) {
  const re = /<([a-z0-9]+)\b([^>]*?)\bdata-i18n="([^"]+)"([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const [full, tag, pre, key, post] = m;
    const lista = /data-i18n-attr="([^"]*)"/.exec(pre + post);
    if (!lista) continue;
    for (const attr of lista[1].split(",").map((a) => a.trim()).filter(Boolean)) {
      /* Se busca DENTRO de la etiqueta de apertura y con un espacio delante, para
         que `label` no case dentro de `aria-label`. */
      const ra = new RegExp('\\s' + attr.replace(/[-]/g, "\\-") + '="([^"]*)"');
      const ma = ra.exec(full);
      if (!ma) { fn({ key, tag, attr, valueStart: null, valueEnd: null, value: null }); continue; }
      const dentro = ma.index + ma[0].indexOf('="') + 2;
      fn({ key, tag, attr, valueStart: m.index + dentro, valueEnd: m.index + dentro + ma[1].length, value: ma[1] });
    }
  }
}
