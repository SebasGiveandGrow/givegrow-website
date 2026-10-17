#!/usr/bin/env node
/* CAPTURAS DE DÍA, NOCHE Y CELULAR, SIN DEPENDENCIAS.

   CLAUDE.md pide revisar día Y noche antes de cada PR. Hasta el 17 oct 2026 eso
   se hacía con un driver que vivía en el scratchpad de cada sesión y se perdía
   con ella. Este vive en el repo: sirve la carpeta actual en un puerto local,
   abre Chrome sin ventana por el protocolo de DevTools (el WebSocket que trae
   Node, nada que instalar) y, por cada ancho y tema:
     · guarda una captura JPEG,
     · mide si la página se desborda a lo ancho,
     · y junta los errores de consola.

   Uso:
     node ops/verificar.mjs <ruta> [--sel "#id"] [--anchos 375,1280]
                            [--temas dia,noche] [--salida carpeta] [--en]
   <ruta> es el hash de la SPA (socialfest, transparencia…) o «/» para la
   portada. --sel desplaza la captura hasta ese elemento. --en la pinta en
   inglés. Sale con código 1 si algo se desborda o la consola tiene errores. */

import { createServer } from "node:http";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, normalize, extname, resolve } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };

const argv = process.argv.slice(2);
const opt = { ruta: "", sel: "", anchos: [375, 1280], temas: ["dia", "noche"], salida: "", en: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--sel") opt.sel = argv[++i];
  else if (a === "--anchos") opt.anchos = argv[++i].split(",").map(Number);
  else if (a === "--temas") opt.temas = argv[++i].split(",");
  else if (a === "--salida") opt.salida = argv[++i];
  else if (a === "--en") opt.en = true;
  else if (!opt.ruta) opt.ruta = a;
}
if (!opt.ruta) { console.error('Uso: node ops/verificar.mjs <ruta> [--sel "#id"] [--anchos 375,1280] [--temas dia,noche] [--salida dir] [--en]'); process.exit(2); }
if (!existsSync(CHROME)) { console.error(`✘ No encuentro Chrome en ${CHROME}`); process.exit(1); }

/* ── servidor estático de la carpeta actual (lo desconocido cae en index.html, como la SPA) ── */
const raiz = resolve(".");
const servidor = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = normalize(join(raiz, p));
  if (!f.startsWith(raiz)) { res.writeHead(403).end(); return; }
  let cuerpo, tipo = TIPOS[extname(f)] || "application/octet-stream";
  try { cuerpo = await readFile(f); }
  catch { cuerpo = await readFile(join(raiz, "index.html")); tipo = TIPOS[".html"]; }
  res.writeHead(200, { "content-type": tipo }).end(cuerpo);
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${servidor.address().port}`;

/* ── Chrome sin ventana ── */
const perfil = await mkdtemp(join(tmpdir(), "gg-chrome-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${perfil}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((ok, mal) => {
  let buf = "";
  const t = setTimeout(() => mal(new Error("Chrome no abrió DevTools en 15 s")), 15000);
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pendientes = new Map();
const oyentes = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) { const { ok, mal } = pendientes.get(m.id); pendientes.delete(m.id); m.error ? mal(new Error(m.error.message)) : ok(m.result); }
  else for (const f of oyentes) f(m);
});
const cdp = (method, params = {}, sessionId) => new Promise((ok, mal) => {
  const n = ++id; pendientes.set(n, { ok, mal }); ws.send(JSON.stringify({ id: n, method, params, sessionId }));
});
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const salida = opt.salida || join(tmpdir(), "gg-verificar");
await mkdir(salida, { recursive: true });
const nombreRuta = opt.ruta === "/" ? "portada" : opt.ruta.replace(/[^a-z0-9-]+/gi, "-");
let fallos = 0;

for (const ancho of opt.anchos) {
  for (const tema of opt.temas) {
    const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
    const { sessionId: s } = await cdp("Target.attachToTarget", { targetId, flatten: true });
    const errores = [];
    const oir = (m) => {
      if (m.sessionId !== s) return;
      if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description?.split("\n")[0] || m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errores.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    };
    oyentes.push(oir);
    await cdp("Runtime.enable", {}, s);
    await cdp("Page.enable", {}, s);
    await cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: 900, deviceScaleFactor: 1, mobile: ancho < 768 }, s);
    await cdp("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-color-scheme", value: tema === "noche" ? "dark" : "light" },
      { name: "prefers-reduced-motion", value: "reduce" }] }, s);
    const hash = opt.ruta === "/" ? "" : `#${opt.ruta}`;
    await cdp("Page.navigate", { url: `${base}/?v=${Date.now()}${opt.en ? "&lang=en" : ""}${hash}` }, s);
    await espera(1800);
    const { result } = await cdp("Runtime.evaluate", { returnByValue: true, awaitPromise: true, expression: `(async () => {
      document.documentElement.setAttribute("data-theme", ${JSON.stringify(tema === "noche" ? "dark" : "light")});
      ${opt.en ? `if (typeof setLang === "function") { try { setLang("en"); await new Promise(r => setTimeout(r, 1200)); } catch (e) {} }` : ""}
      document.querySelectorAll(".rv").forEach(e => e.classList.add("in"));
      const el = ${opt.sel ? `document.querySelector(${JSON.stringify(opt.sel)})` : "null"};
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70);
      await new Promise(r => setTimeout(r, 400));
      return { sel: ${opt.sel ? "!!el" : "true"}, ancho: document.documentElement.scrollWidth, vista: innerWidth };
    })()` }, s);
    const v = result.value || {};
    const { data } = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 70 }, s);
    const archivo = join(salida, `${nombreRuta}-${ancho}-${tema}${opt.en ? "-en" : ""}.jpg`);
    await writeFile(archivo, Buffer.from(data, "base64"));
    const desborda = v.ancho > v.vista;
    const problemas = [desborda && `desborda ${v.ancho - v.vista}px`, !v.sel && `no existe ${opt.sel}`, errores.length && `${errores.length} error(es): ${errores.slice(0, 2).join(" | ")}`].filter(Boolean);
    if (problemas.length) fallos++;
    console.log(`${problemas.length ? "✘" : "✔"} ${ancho}px ${tema}${problemas.length ? " — " + problemas.join(" · ") : ""} → ${archivo}`);
    oyentes.splice(oyentes.indexOf(oir), 1);
    await cdp("Target.closeTarget", { targetId });
  }
}

ws.close();
chrome.kill();
servidor.close();
process.exit(fallos ? 1 : 0);
