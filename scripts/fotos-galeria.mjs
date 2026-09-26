#!/usr/bin/env node
/* ═══ FOTOS DE GALERÍA: los tres tamaños de una vez ═════════════════════════
   Uso:
     node scripts/fotos-galeria.mjs <foto> [<foto> …] [--nombre base] [--forzar]

   Una foto de galería no es un archivo: son TRES, y el gate falla si falta uno
   o si mide lo que no dice (checks 3.9 y 3.9b de validate.mjs):

     img/jornadas/<nombre>.webp         el original, para el visor grande
     img/jornadas/thumb/<nombre>.webp   400 px de ANCHO exactos
     img/jornadas/m/<nombre>.webp       800 px de ANCHO exactos

   Hacerlos a mano es donde se equivoca uno. Ya pasó: cinco fotos VERTICALES de
   la brigada se escalaron por el lado largo, y sus miniaturas anunciaban 400w
   midiendo 300 (18 sep 2026). Aquí se fija siempre el ANCHO (`-resize W 0`).

   Lo que hace además, y por qué:
   · QUITA LOS METADATOS. Una foto de celular trae la ubicación GPS en el EXIF, y
     una foto de terreno puede llevar dentro la dirección de una familia. El
     `.webp` sale sin nada de eso (`-metadata none`), aunque el original lo tenga.
   · RECHAZA LO QUE MIDE MENOS DE 800 px de ancho. Agrandarla daría un `m/` que
     promete 800w con el detalle de una miniatura: el gate lo aceptaría y la foto
     se vería blanda. Mejor pedir la original.
   · ACEPTA HEIC (el formato del iPhone): lo convierte con `sips` antes.
   · NO PISA NADA que ya exista, salvo con --forzar.

   Necesita `cwebp` (brew install webp) y `sips`, que viene con macOS.
   No es una dependencia del sitio: es una herramienta de quien carga fotos. */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const forzar = args.includes("--forzar");
const iNombre = args.indexOf("--nombre");
const nombreFijo = iNombre >= 0 ? args[iNombre + 1] : null;
const fotos = args.filter((a, i) => !a.startsWith("--") && !(iNombre >= 0 && i === iNombre + 1));

const salir = (msg) => { console.error("✗ " + msg); process.exit(1); };
if (!fotos.length) salir("Uso: node scripts/fotos-galeria.mjs <foto> [<foto> …] [--nombre base] [--forzar]");
if (nombreFijo && fotos.length > 1) salir("--nombre solo tiene sentido con una foto");

const hay = (bin) => { try { execFileSync("which", [bin], { stdio: "ignore" }); return true; } catch { return false; } };
if (!hay("cwebp")) salir("falta cwebp. Instálalo con:  brew install webp");
if (!hay("sips")) salir("falta sips (viene con macOS). Este script está pensado para el Mac de quien carga las fotos");

const medir = (ruta) => {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", ruta], { encoding: "utf8" });
  const w = +(/pixelWidth:\s*(\d+)/.exec(out) || [])[1];
  const h = +(/pixelHeight:\s*(\d+)/.exec(out) || [])[1];
  return { w, h };
};
/* Los nombres de la casa van en minúsculas con guion bajo: guajira_territorio,
   brigada_marsella_equipo. Sin tildes ni espacios: es parte de una URL. */
const aNombre = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const DIR = "img/jornadas";
for (const d of [DIR, DIR + "/thumb", DIR + "/m"]) mkdirSync(d, { recursive: true });

const temporal = mkdtempSync(join(tmpdir(), "gg-fotos-"));
const lineas = [];
let fallos = 0;

try {
  for (const origen of fotos) {
    if (!existsSync(origen)) { console.error("✗ no existe: " + origen); fallos++; continue; }
    const nombre = aNombre(nombreFijo || basename(origen, extname(origen)));
    if (!nombre) { console.error("✗ no pude sacar un nombre de " + origen + " · usa --nombre"); fallos++; continue; }

    const destinos = {
      original: `${DIR}/${nombre}.webp`,
      thumb: `${DIR}/thumb/${nombre}.webp`,
      m: `${DIR}/m/${nombre}.webp`
    };
    const yaEstan = Object.values(destinos).filter(existsSync);
    if (yaEstan.length && !forzar) {
      console.error("✗ " + nombre + ": ya existe " + yaEstan.join(", ") + " · usa otro --nombre, o --forzar si de verdad quieres reemplazarla");
      fallos++; continue;
    }

    /* HEIC → JPEG temporal: cwebp no lo lee. */
    let fuente = origen;
    if (/\.hei[cf]$/i.test(origen)) {
      fuente = join(temporal, nombre + ".jpg");
      execFileSync("sips", ["-s", "format", "jpeg", origen, "--out", fuente], { stdio: "ignore" });
    }

    const { w, h } = medir(fuente);
    if (!w || !h) { console.error("✗ " + origen + ": no pude leer sus medidas"); fallos++; continue; }
    if (w < 800) {
      console.error(`✗ ${origen}: mide ${w} px de ancho. El tamaño m/ tiene que medir 800 px exactos, y agrandarla daría una foto blanda que el gate no ve. Pide la foto original`);
      fallos++; continue;
    }

    const webp = (ancho, calidad, salida) => execFileSync("cwebp",
      ["-quiet", "-metadata", "none", "-q", String(calidad), ...(ancho ? ["-resize", String(ancho), "0"] : []), fuente, "-o", salida]);
    webp(w > 1600 ? 1600 : 0, 78, destinos.original);
    webp(400, 72, destinos.thumb);
    webp(800, 74, destinos.m);

    /* Se mide lo que salió, no lo que se pidió: es lo que el gate va a mirar. */
    const t = medir(destinos.thumb).w, mm = medir(destinos.m).w;
    if (t !== 400 || mm !== 800) { console.error(`✗ ${nombre}: salió thumb=${t} y m=${mm}; tenían que ser 400 y 800`); fallos++; continue; }

    const o = medir(destinos.original);
    console.log(`✓ ${nombre}  (${w}×${h}${w !== o.w ? " → " + o.w + "×" + o.h : ""}${h > w ? ", vertical" : ""}) · sin metadatos`);
    lineas.push(`{"src": "/${destinos.original}", "alt": {"es": "…", "en": "…"}}`);
  }
} finally {
  rmSync(temporal, { recursive: true, force: true });
}

if (lineas.length) {
  console.log("\nPara pegar en la gallery[] de la aliada (data/partners.json o data/gratitud.json):\n");
  console.log("  " + lineas.join(",\n  "));
  console.log(`
Antes de hacer commit:
  · escribe el alt en español e inglés: describe lo que se ve, no «foto de jornada»;
  · la aliada tiene que tener consent.photos: true (el gate lo exige);
  · nada de rostros de menores reconocibles como fondo de un panel de vidrio;
  · corre  node scripts/validate.mjs`);
}
process.exit(fallos ? 1 : 0);
