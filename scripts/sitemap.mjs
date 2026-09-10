/* ============================================================================
   scripts/sitemap.mjs — REGENERA sitemap.xml CON LASTMOD DE VERDAD
   ============================================================================
   El propio sitemap.xml lleva escrita la regla: «Los lastmod salen de git
   (último commit del archivo que genera cada página), no a mano: un lastmod
   inventado Google lo ignora».

   Y estaban a mano. Medido el 10 sep 2026 contra producción: el sitemap decía
   2026-09-01 para las dos raíces cuando `index.html` se había tocado el 09, y
   2026-08-05 para las fundaciones cuando `partners.json` cambió el 04 de
   septiembre. Un mes de desfase en la fecha que Google usa para decidir si vale
   la pena volver.

   Y no es cosmético para ESTE sitio: Mira Mi Casa responde a un sismo. Un
   lastmod que nunca se mueve mientras la página sí es exactamente el patrón que
   enseña a un buscador a ignorar el dato.

   MODOS
     node scripts/sitemap.mjs            escribe sitemap.xml
     node scripts/sitemap.mjs --check    no escribe; sale 1 si difiere

   OJO CON LA PROFUNDIDAD DEL CHECKOUT. `git log` necesita historia: con
   `fetch-depth: 1` devuelve el único commit que hay y TODAS las fechas salen
   iguales — el check pasaría en verde diciendo una mentira distinta. Por eso el
   modo `--check` se niega a opinar si el repositorio está superficial, en vez de
   aprobar a ciegas. Es la razón por la que esto no se automatizó antes.
   ========================================================================= */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const APEX = "https://www.thegiveandgrowproject.org";
const MMC = "https://miramicasa.thegiveandgrowproject.org";

/* Cada URL con LA FUENTE que la genera. Si mañana una página nace de otro
   archivo, se cambia aquí y la fecha la pone git. */
const PAGINAS = [
  { loc: APEX + "/", fuentes: ["index.html", "app.js", "styles.css"], freq: "weekly", pri: "1.0" },
  { loc: MMC + "/",  fuentes: ["index.html", "app.js", "styles.css"], freq: "weekly", pri: "0.9" }
];

/* WORKER.JS NO ES FUENTE DE NINGUNA, y lo probe antes de decidirlo: incluyendolo
   las cuatro URLs saltaban a la fecha del ultimo cambio del Worker, o sea que un
   refactor de un endpoint de pagos "modificaba" el perfil de una fundacion. Eso
   es el fallo simetrico del que se viene a arreglar: un lastmod que se mueve
   cuando la pagina no cambio enseña a ignorarlo igual de rapido que uno que no se
   mueve nunca. Se listan las fuentes del CONTENIDO que alguien ve. */

const superficial = () => {
  try { return execSync("git rev-parse --is-shallow-repository", { encoding: "utf8" }).trim() === "true"; }
  catch { return true; }
};

const ultimoCommit = (ruta) => {
  const d = execSync("git log -1 --format=%ad --date=short -- " + JSON.stringify(ruta),
                     { encoding: "utf8" }).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("sin fecha de git para " + ruta);
  return d;
};

/* De varias fuentes, la MÁS RECIENTE: la página cambió cuando cambió cualquiera
   de las piezas que la componen. */
const fechaDe = (fuentes) => fuentes.map(ultimoCommit).sort().pop();

/* Las fundaciones salen de partners.json, y solo las que tienen su perfil
   público — la misma regla 1 que aplica `rutaCompartir`, para no listar una URL
   que responde 302. */
const fundaciones = () => {
  const j = JSON.parse(readFileSync("data/partners.json", "utf8"));
  return (j.partners || [])
    .filter((p) => p.type === "foundation" && p.consent && p.consent.name === true)
    .map((p) => ({ loc: APEX + "/f/" + p.id, fuentes: ["data/partners.json"],
                   freq: "monthly", pri: "0.8" }));
};

const armar = () => {
  const urls = [...PAGINAS, ...fundaciones()].map((p) => {
    const lastmod = fechaDe(p.fuentes);
    return ["  <url>", "    <loc>" + p.loc + "</loc>",
            "    <lastmod>" + lastmod + "</lastmod>",
            "    <changefreq>" + p.freq + "</changefreq>",
            "    <priority>" + p.pri + "</priority>", "  </url>"].join("\n");
  });
  const cabeza = readFileSync("sitemap.xml", "utf8").split("<urlset")[0];
  return cabeza + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
       + urls.join("\n") + "\n</urlset>\n";
};

const comprobar = process.argv.includes("--check");
if (comprobar && superficial()) {
  console.log("sitemap: repositorio superficial (fetch-depth 1) — no se comprueba, " +
              "porque con un solo commit todas las fechas saldrian iguales y el check " +
              "aprobaria una mentira. Usa fetch-depth: 0 para que valga.");
  process.exit(0);
}

const nuevo = armar();
if (comprobar) {
  const actual = readFileSync("sitemap.xml", "utf8");
  if (actual === nuevo) { console.log("sitemap: los lastmod coinciden con git"); process.exit(0); }
  console.error("sitemap: DESACTUALIZADO. Corre `node scripts/sitemap.mjs` y committea.");
  const dif = (a, b) => a.split("\n").filter((l, i) => l !== b.split("\n")[i]);
  console.error("  lineas que difieren:\n" + dif(actual, nuevo).slice(0, 12).map((l) => "  - " + l.trim()).join("\n"));
  console.error("  deberian ser:\n" + dif(nuevo, actual).slice(0, 12).map((l) => "  + " + l.trim()).join("\n"));
  process.exit(1);
}
writeFileSync("sitemap.xml", nuevo);
console.log("sitemap.xml regenerado con los lastmod de git");
