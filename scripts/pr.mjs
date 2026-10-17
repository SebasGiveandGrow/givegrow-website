#!/usr/bin/env node
/* EL FLUJO DE UN PR, EN UN COMANDO.

   Hace en orden lo que CLAUDE.md pide a mano, y que a mano se olvidaba:
     1. rama `claude/*` (nunca main)
     2. cache-bust de app.js y styles.css (index.html, 404.html y STYLES_V)
     3. hidratar index.html desde el diccionario ES
     4. el gate (validate.mjs); si falla, no sigue
     5. commit de lo pendiente
     6. sitemap DESPUÉS del commit, y su propio commit
     7. `wrangler deploy --dry-run` si cambió worker.js o documentos.js
     8. push y PR (con o sin `automerge`)

   Uso:
     node scripts/pr.mjs "Título del PR" -m "Mensaje del commit" [opciones]
       --cuerpo archivo.md   cuerpo del PR (si no, se arma con los commits)
       --automerge           solo para lo interno; una página pública va SIN él
       --claude              añade el Co-Authored-By y la firma del PR
       --seco                hace 1–7 y NO publica (para revisar antes)

   Imprime solo lo que importa: la salida completa del gate o de wrangler
   aparece únicamente si fallan. Nació el 17 oct 2026: cada PR costaba 10–15
   pasos manuales, y los PR en rojo casi siempre eran el cache-bust o el
   sitemap olvidados. */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ENV = { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` };
const FIRMA_COMMIT = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const FIRMA_PR = "🤖 Generated with [Claude Code](https://claude.com/claude-code)";

function sh(cmd, args, { silencio = false } = {}) {
  const r = spawnSync(cmd, args, { env: ENV, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0 && !silencio) {
    console.error(`✘ ${cmd} ${args.join(" ")}\n${(r.stdout || "") + (r.stderr || "")}`.trimEnd());
    process.exit(1);
  }
  return (r.stdout || "").trim();
}
const paso = (t) => console.log(`· ${t}`);

/* ── argumentos ── */
const argv = process.argv.slice(2);
const opt = { automerge: false, claude: false, seco: false, mensaje: "", cuerpo: "", titulo: "" };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--automerge") opt.automerge = true;
  else if (a === "--claude") opt.claude = true;
  else if (a === "--seco") opt.seco = true;
  else if (a === "-m") opt.mensaje = argv[++i] ?? "";
  else if (a === "--cuerpo") opt.cuerpo = argv[++i] ?? "";
  else if (!opt.titulo) opt.titulo = a;
}
if (!opt.titulo) { console.error('Uso: node scripts/pr.mjs "Título" -m "Mensaje" [--automerge] [--claude] [--seco] [--cuerpo archivo]'); process.exit(2); }

/* 1. la rama */
const rama = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (!rama.startsWith("claude/")) { console.error(`✘ Estás en «${rama}». Los PR salen de una rama claude/<tema>, nunca de main.`); process.exit(1); }
sh("git", ["fetch", "origin", "main"]);

/* 2. cache-bust */
const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex").slice(0, 8);
const hApp = md5("app.js"), hCss = md5("styles.css");
let tocados = [];
for (const f of ["index.html", "404.html", "worker.js"]) {
  if (!existsSync(f)) continue;
  const antes = readFileSync(f, "utf8");
  const despues = antes
    .replace(/(\/app\.js\?v=)[0-9a-f]{8}/g, `$1${hApp}`)
    .replace(/(\/styles\.css\?v=)[0-9a-f]{8}/g, `$1${hCss}`)
    .replace(/(const STYLES_V = ")[0-9a-f]{8}(")/, `$1${hCss}$2`);
  if (despues !== antes) { writeFileSync(f, despues); tocados.push(f); }
}
paso(`cache-bust app.js?v=${hApp} styles.css?v=${hCss}${tocados.length ? " → actualizado en " + tocados.join(", ") : " (ya al día)"}`);

/* 3. hidratar */
sh("node", ["scripts/hydrate-i18n.mjs"]);
paso("index.html hidratado");

/* 4. el gate */
const gate = spawnSync("node", ["scripts/validate.mjs"], { env: ENV, encoding: "utf8", maxBuffer: 64 << 20 });
const lineas = ((gate.stdout || "") + (gate.stderr || "")).split("\n").filter(Boolean);
const malas = lineas.filter((l) => !/^\s*ok\b/i.test(l));
if (gate.status !== 0) { console.error("✘ El gate falló:\n" + malas.join("\n")); process.exit(1); }
paso(`gate: ${lineas.length - malas.length} ok${malas.length ? " · avisos:\n  " + malas.join("\n  ") : ""}`);

/* 5. commit de lo pendiente */
const conFirma = (m) => (opt.claude && !m.includes("Co-Authored-By") ? `${m}\n\n${FIRMA_COMMIT}` : m);
if (sh("git", ["status", "--porcelain"])) {
  if (!opt.mensaje) { console.error("✘ Hay cambios sin commitear y falta -m \"mensaje\"."); process.exit(1); }
  sh("git", ["add", "-A"]);
  const nombres = sh("git", ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
  sh("git", ["commit", "-q", "-m", conFirma(opt.mensaje)]);
  paso(`commit: ${nombres.length} archivo(s): ${nombres.slice(0, 8).join(", ")}${nombres.length > 8 ? "…" : ""}`);
}

/* 6. sitemap, después del commit */
sh("node", ["scripts/sitemap.mjs"]);
if (sh("git", ["status", "--porcelain", "sitemap.xml"])) {
  sh("git", ["add", "sitemap.xml"]);
  sh("git", ["commit", "-q", "-m", conFirma("sitemap: lastmod del commit anterior")]);
  paso("sitemap regenerado y commiteado");
} else paso("sitemap al día");

/* 7. el Worker compila */
const cambiados = sh("git", ["diff", "--name-only", "origin/main...HEAD"]).split("\n");
if (cambiados.some((f) => f === "worker.js" || f === "documentos.js")) {
  const out = mkdtempSync(join(tmpdir(), "gg-bundle-"));
  sh("npx", ["--yes", "wrangler", "deploy", "--dry-run", "--outdir", out]);
  paso("wrangler --dry-run: compila");
}

const commits = sh("git", ["log", "--format=- %s", "origin/main..HEAD"]);
if (!commits) { console.error("✘ No hay commits nuevos frente a main: nada que publicar."); process.exit(1); }
if (opt.seco) { paso("--seco: no se publica. Commits:\n" + commits); process.exit(0); }

/* 8. push y PR */
sh("git", ["push", "-q", "-u", "origin", rama]);
paso(`push de ${rama}`);
const existente = sh("gh", ["pr", "view", rama, "--json", "url", "--jq", ".url"], { silencio: true });
if (existente) { paso(`el PR ya existía: ${existente}`); process.exit(0); }
let cuerpo = opt.cuerpo ? readFileSync(opt.cuerpo, "utf8") : `## Cambios\n\n${commits}\n`;
if (opt.claude && !cuerpo.includes("Claude Code")) cuerpo += `\n${FIRMA_PR}\n`;
const archivoCuerpo = join(mkdtempSync(join(tmpdir(), "gg-pr-")), "cuerpo.md");
writeFileSync(archivoCuerpo, cuerpo);
const args = ["pr", "create", "--base", "main", "--head", rama, "--title", opt.titulo, "--body-file", archivoCuerpo];
if (opt.automerge) args.push("--label", "automerge");
console.log(`✔ PR${opt.automerge ? " (automerge)" : " (lo fusiona Sebas)"}: ${sh("gh", args)}`);
