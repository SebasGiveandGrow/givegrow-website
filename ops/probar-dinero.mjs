#!/usr/bin/env node
/* Corre SOLAS las baterías de los flujos de dinero, contra un Worker local
   recién armado. Existían desde hace meses (ops/probar-*.py) pero cada una
   pedía levantar wrangler a mano, aplicar migraciones y acordarse de correrla:
   en la práctica solo se corrían el día que se tocaba ese flujo.

   Uso:   node ops/probar-dinero.mjs                  (todas)
          node ops/probar-dinero.mjs pagos            (solo las que contengan «pagos»)
          node ops/probar-dinero.mjs --fragmento 2/3  (solo el fragmento 2 de 3)
          node ops/probar-dinero.mjs --listar 3       (muestra el reparto en 3; no corre nada)
          node ops/probar-dinero.mjs --ayuda

   FRAGMENTOS (24 nov 2026). En CI las baterías corren en paralelo, una pata
   de la matriz por fragmento (ver el job `dinero` de ci.yml). El reparto sale
   de aquí y no de ci.yml: una batería nueva añadida al final de BATERIAS cae
   sola en el fragmento menos cargado, sin tocar el workflow.

   Cada batería lleva `peso`: los segundos que tarda, medidos (servidor +
   batería). El reparto es el greedy de la más larga primero: se ordenan de
   mayor a menor peso (empate: la que va antes en el arreglo) y cada una va al
   fragmento con menos segundos acumulados (empate: el de número menor). Es
   determinista: el mismo arreglo da siempre el mismo reparto en todas las
   patas, y entre todas cubren cada batería exactamente una vez. Sin `peso`,
   una batería cuenta PESO_OMISION segundos; conviene medirla y ponérselo
   (este script imprime el tiempo de cada una al final).

   Qué hace, en orden:
     1. Base D1 LOCAL y vacía en una carpeta temporal. Nunca toca producción:
        todo `wrangler` de aquí lleva `--local`.
     2. Le aplica cada migración, archivo por archivo. NO con `migrations
        apply`: las migraciones se registran ellas mismas en `d1_migrations`
        (en producción se aplican a mano) y `apply` choca con UNIQUE.
     3. Si no hay `.dev.vars`, escribe uno con secretos DE PRUEBA al azar y lo
        borra al salir. Si ya hay uno, lo usa y no lo toca.
     4. Por cada batería: copia esa base, levanta `wrangler dev` con lo que la
        batería pide (cron de prueba, variables), la corre y lo apaga.
     5. Sale con 1 si alguna falló.
*/
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const PUERTO = process.env.PUERTO || "8795";
const BASE = "http://localhost:" + PUERTO;
const DB = "givegrow-privado";

/* Segundos que cuenta una batería sin `peso` al repartir en fragmentos: la
   mediana de lo medido el 24 nov 2026 (48 s), redondeada hacia abajo. */
const PESO_OMISION = 45;

/* Cada batería con los flags de `wrangler dev` que pide, y su `peso` (ver la
   cabecera): segundos medidos en local el 24 nov 2026, servidor + batería.
   Solo sirven para repartir en fragmentos; basta con que sean proporcionales.
   `tarjetas` (6 s medidos) va todavía sin peso y cuenta PESO_OMISION: es la
   última línea del arreglo y otros cambios añaden baterías justo detrás, así
   que se dejó intacta para que esos merges no choquen. */
const BATERIAS = [
  { nombre: "pagos", peso: 22, archivo: "ops/probar-pagos.py" },
  { nombre: "cobro-mensual", peso: 186, archivo: "ops/probar-cobro-mensual.py", flags: ["--test-scheduled"] },
  { nombre: "baja", peso: 89, archivo: "ops/probar-baja.py" },
  { nombre: "aviso-espera", peso: 117, archivo: "ops/probar-aviso-espera.py", flags: ["--test-scheduled"] },
  { nombre: "cupo-correo", peso: 68, archivo: "ops/probar-cupo-correo.py", flags: ["--test-scheduled",
      "--var", "RESEND_API_KEY:re_llave_invalida_de_prueba",
      "--var", "CORREO_AVISOS:equipo@ejemplo.invalid",
      "--var", "CORREO_MMC:mmc@ejemplo.invalid"] },
  { nombre: "inscripcion", peso: 4, archivo: "ops/probar-inscripcion.py" },
  /* `banco: true` = corre contra el BANCO: una copia del Worker con Access
     simulado (ver `armarBanco`). Para lo que vive detrás del panel. */
  { nombre: "entregas", peso: 69, archivo: "ops/probar-entregas.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "regalos-aliada", peso: 32, archivo: "ops/probar-regalos-aliada.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "aportes-fundacion", peso: 48, archivo: "ops/probar-aportes-fundacion.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "unidades-vivo", peso: 11, archivo: "ops/probar-unidades-vivo.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "tarjetas", archivo: "ops/probar-tarjetas.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "indicadores", archivo: "ops/probar-indicadores.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
];

const AYUDA = [
  "Uso: node ops/probar-dinero.mjs [filtro] [--fragmento i/n] [--listar [n]]",
  "",
  "  (sin nada)        corre todas las baterías",
  "  filtro            solo las que contengan ese texto en el nombre",
  "  --fragmento i/n   reparte las baterías en n fragmentos balanceados por",
  "                    peso (greedy, la más larga primero) y corre solo el i",
  "  --listar [n]      imprime el reparto en n fragmentos (por omisión, el n",
  "                    de --fragmento, o 3) y sale sin correr nada",
  "  --ayuda           este mensaje",
  "",
  "Una batería sin peso cuenta " + PESO_OMISION + " s. Baterías: " + BATERIAS.map((b) => b.nombre).join(", "),
].join("\n");

/* Argumentos. Se leen antes de tocar nada: --listar y --ayuda no escriben
   .dev.vars ni arman bases. Un número de fragmentos que no se entiende es un
   error con código 2, nunca un «entonces 3» callado. */
const TOPE_FRAGMENTOS = 100;    // más patas no tiene sentido, y repartir() reserva una casilla por fragmento
let filtro = "";
let fragmento = null;           // { i, n }
let listar = null;              // null = no listar; 0 = el n de --fragmento, o 3
function fallaArgs(msj) { console.error(msj + "\n\n" + AYUDA); process.exit(2); }
function leerFragmento(t) {
  const m = /^(\d+)\/(\d+)$/.exec(t || "");
  if (!m) fallaArgs("--fragmento espera i/n, por ejemplo 2/3; llegó «" + (t || "") + "»");
  const i = Number(m[1]), n = Number(m[2]);
  if (!(i >= 1 && i <= n && n <= TOPE_FRAGMENTOS)) {
    fallaArgs("--fragmento fuera de rango: «" + t + "» (1 ≤ i ≤ n ≤ " + TOPE_FRAGMENTOS + ")");
  }
  return { i, n };
}
function leerListar(t) {
  const n = /^\d+$/.test(t || "") ? Number(t) : NaN;
  if (!(n >= 1 && n <= TOPE_FRAGMENTOS)) {
    fallaArgs("--listar espera un número de fragmentos entre 1 y " + TOPE_FRAGMENTOS + "; llegó «" + (t || "") + "»");
  }
  return n;
}
{
  const args = process.argv.slice(2);
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === "--ayuda" || a === "--help" || a === "-h") { console.log(AYUDA); process.exit(0); }
    else if (a === "--fragmento") fragmento = leerFragmento(args[++k]);
    else if (a.startsWith("--fragmento=")) fragmento = leerFragmento(a.slice(12));
    // `--listar` solo toma el siguiente argumento si es un número: así
    // `--listar pagos` sigue entendiéndose como listar + filtro.
    else if (a === "--listar") listar = /^\d+$/.test(args[k + 1] || "") ? leerListar(args[++k]) : 0;
    else if (a.startsWith("--listar=")) listar = leerListar(a.slice(9));
    else if (a.startsWith("-")) fallaArgs("Opción desconocida: " + a);
    else if (filtro) fallaArgs("Solo se admite un filtro; llegaron «" + filtro + "» y «" + a + "»");
    else filtro = a;
  }
}

/* Reparto en n fragmentos: greedy de la más larga primero (ver la cabecera).
   Devuelve n arreglos de baterías, cada uno en el orden de BATERIAS. */
function peso(b) { return typeof b.peso === "number" && b.peso > 0 ? b.peso : PESO_OMISION; }
function repartir(n) {
  const carga = Array(n).fill(0);
  const toca = Array(n).fill(null).map(() => []);
  const orden = BATERIAS.map((b, k) => k).sort((x, y) => peso(BATERIAS[y]) - peso(BATERIAS[x]) || x - y);
  for (const k of orden) {
    let f = 0;
    for (let g = 1; g < n; g++) if (carga[g] < carga[f]) f = g;
    carga[f] += peso(BATERIAS[k]);
    toca[f].push(k);
  }
  return toca.map((ks) => ks.sort((x, y) => x - y).map((k) => BATERIAS[k]));
}
function describir(lista) {
  const total = lista.reduce((s, b) => s + peso(b), 0);
  return "~" + total + " s · " + (lista.length
    ? lista.map((b) => b.nombre + " " + peso(b) + (peso(b) === b.peso ? "" : "*")).join(", ")
    : "ninguna");
}

if (listar !== null) {
  const n = listar || (fragmento && fragmento.n) || 3;
  const total = BATERIAS.reduce((s, b) => s + peso(b), 0);
  console.log(BATERIAS.length + " baterías, ~" + total + " s en serie. Reparto en " + n + " fragmento(s):");
  repartir(n).forEach((l, k) => console.log("  " + (k + 1) + "/" + n + "  " + describir(l)));
  if (BATERIAS.some((b) => peso(b) !== b.peso)) console.log("  (* sin peso medido: cuenta " + PESO_OMISION + " s)");
  process.exit(0);
}

/* Qué se corre. El filtro se mira primero contra TODAS: un nombre que no
   existe es un error (código 2) en cualquier pata. El reparto se hace siempre
   sobre el arreglo entero, sin filtrar, así que con el mismo filtro las n
   patas cubren entre todas lo mismo que una sola corrida sin --fragmento. */
if (!BATERIAS.some((b) => b.nombre.includes(filtro))) {
  console.error("Ninguna batería coincide con «" + filtro + "». Hay: " + BATERIAS.map((b) => b.nombre).join(", "));
  process.exit(2);
}
let elegidas = BATERIAS;
if (fragmento) {
  elegidas = repartir(fragmento.n)[fragmento.i - 1];
  console.log("· fragmento " + fragmento.i + "/" + fragmento.n + ": " + describir(elegidas));
}
elegidas = elegidas.filter((b) => b.nombre.includes(filtro));
if (!elegidas.length) {
  // Solo pasa con --fragmento: hay más fragmentos que baterías, o las que
  // coinciden con el filtro cayeron todas en otras patas. Esta pata no tiene
  // nada que correr, y eso no es un fallo.
  console.log("✔ nada que correr en este fragmento" + (filtro ? " con el filtro «" + filtro + "»" : ""));
  process.exit(0);
}

/* UNA BASE POR BATERÍA. Las migraciones se aplican una vez a `plantilla` y cada
   batería arranca sobre una copia: así ninguna hereda filas de la anterior, y
   cada una puede pedir su propia forma de arrancar el servidor. */
const tInicio = Date.now();
const trabajo = mkdtempSync(join(tmpdir(), "gg-dinero-"));
const persist = join(trabajo, "plantilla");
const devVars = join(RAIZ, ".dev.vars");
let devVarsMio = false;
let servidor = null;

function apagar() {
  if (servidor && servidor.pid) {
    try { process.kill(-servidor.pid, "SIGTERM"); } catch (e) { /* ya no está */ }
  }
  servidor = null;
}
function limpiar() {
  apagar();
  if (devVarsMio) rmSync(devVars, { force: true });
  rmSync(trabajo, { recursive: true, force: true });
}
function salir(codigo) { limpiar(); process.exit(codigo); }
process.on("SIGINT", () => salir(130));
process.on("SIGTERM", () => salir(143));

function wrangler(args) {
  return spawnSync("npx", ["wrangler", ...args], { cwd: RAIZ, encoding: "utf8" });
}

// 3. Secretos de prueba, solo si no hay unos del desarrollador.
if (!existsSync(devVars)) {
  const al = () => randomBytes(16).toString("hex");
  writeFileSync(devVars, [
    "WOMPI_PUBLIC_KEY=pub_test_" + al(),
    "WOMPI_PRIVATE_KEY=prv_test_" + al(),
    "WOMPI_EVENTS_SECRET=test_events_" + al(),
    "WOMPI_INTEGRITY_SECRET=test_integrity_" + al(),
    "",
  ].join("\n"));
  devVarsMio = true;
}

// 2. Migraciones, una por una y en orden.
const migraciones = readdirSync(join(RAIZ, "migrations")).filter((f) => f.endsWith(".sql")).sort();
const tMig = Date.now();
process.stdout.write("· " + migraciones.length + " migraciones en una base local vacía… ");
for (const m of migraciones) {
  const r = wrangler(["d1", "execute", DB, "--local", "--persist-to", persist, "--file", join("migrations", m)]);
  if (r.status !== 0) {
    console.error("\n✘ falló " + m + "\n" + (r.stdout || "") + (r.stderr || ""));
    salir(1);
  }
}
const segMig = Math.round((Date.now() - tMig) / 1000);
console.log("listo (" + segMig + " s)");

/* EL BANCO: una copia del Worker a la que se le abre Access SOLO si llega la
   variable PRUEBA_ACCESS=si, que no existe en producción ni en wrangler.toml.
   El parche vive aquí y se aplica a una copia temporal: `worker.js` del repo
   no lleva ninguna puerta trasera, ni apagada.

   Los assets van en una carpeta mínima y no en la raíz del repo: con la raíz
   entera, wrangler se queda en «Starting local server…» desde un wrangler.toml
   que no está en ella. */
let banco = null;
function armarBanco() {
  if (banco) return banco;
  banco = join(trabajo, "banco");
  const sitio = join(banco, "sitio");
  mkdirSync(sitio, { recursive: true });
  const firma = "async function verificarAccess(request, env, audsValidos) {";
  const w = readFileSync(join(RAIZ, "worker.js"), "utf8");
  if (w.split(firma).length !== 2) {
    console.error("✘ no encontré la firma de verificarAccess en worker.js: el banco no se puede armar");
    salir(1);
  }
  writeFileSync(join(banco, "worker.js"), w.replace(firma, firma +
    '\n  if (env.PRUEBA_ACCESS === "si") return { ok: true, email: request.headers.get("x-prueba-email") || "prueba@local", equipo: true };'));
  for (const f of ["qr.js", "documentos.js", "package.json"]) cpSync(join(RAIZ, f), join(banco, f));
  cpSync(join(RAIZ, "data"), join(banco, "data"), { recursive: true });
  symlinkSync(join(RAIZ, "node_modules"), join(banco, "node_modules"));
  if (existsSync(devVars)) cpSync(devVars, join(banco, ".dev.vars"));
  for (const f of ["index.html", "404.html", "styles.css", "app.js", "favicon.svg", "favicon.ico", "robots.txt"]) {
    cpSync(join(RAIZ, f), join(sitio, f));
  }
  for (const d of ["vendor", "i18n", "data"]) cpSync(join(RAIZ, d), join(sitio, d), { recursive: true });
  // El wrangler.toml del repo sin el entorno sandbox ni el cron, y con los
  // assets apuntando a la carpeta mínima.
  let toml = readFileSync(join(RAIZ, "wrangler.toml"), "utf8");
  const corte = toml.indexOf("[env.sandbox]");
  if (corte !== -1) toml = toml.slice(0, corte);
  toml = toml.replace(/^directory\s*=.*$/m, 'directory = "./sitio"');
  writeFileSync(join(banco, "wrangler.toml"), toml);
  return banco;
}

// 4. Por cada batería: su copia de la base, su servidor, y a correr.
//    `detached` para poder matar al grupo entero: wrangler lanza workerd como
//    hijo y un SIGTERM al padre solo lo deja huérfano.
let registro = "";
function arrancar(dir, flags, cwd) {
  registro = "";
  servidor = spawn("npx", ["wrangler", "dev", "--port", PUERTO, "--persist-to", dir, ...flags], {
    cwd, detached: true, stdio: ["ignore", "pipe", "pipe"],
  });
  servidor.stdout.on("data", (d) => { registro += d; });
  servidor.stderr.on("data", (d) => { registro += d; });
}
async function responde(quiero) {
  const tope = Date.now() + 120000;
  while (Date.now() < tope) {
    if (quiero && servidor && servidor.exitCode !== null) return false;
    try {
      const r = await fetch(BASE + "/robots.txt", { signal: AbortSignal.timeout(3000) });
      if (quiero && r.ok) return true;
    } catch (e) { if (!quiero) return true; }
    await new Promise((s) => setTimeout(s, 1000));
  }
  return false;
}

let fallos = 0;
const tiempos = [];
for (const b of elegidas) {
  console.log("\n══ " + b.nombre + " (" + b.archivo + ")");
  const t0 = Date.now();
  const dir = join(trabajo, b.nombre);
  cpSync(persist, dir, { recursive: true });
  const cwd = b.banco ? armarBanco() : RAIZ;
  arrancar(dir, b.flags || [], cwd);
  if (!(await responde(true))) {
    console.error("✘ el Worker no respondió en 2 minutos\n" + registro.slice(-3000));
    salir(1);
  }
  const r = spawnSync("python3", [b.archivo], {
    cwd: RAIZ, stdio: "inherit",
    // DB y CWD los lee la batería de entregas para sus consultas a D1.
    env: { ...process.env, BASE, PERSIST: dir, DB, CWD: cwd },
  });
  if (r.status !== 0) { fallos++; console.log("✘ " + b.nombre + " salió con " + r.status); }
  apagar();
  await responde(false);        // que suelte el puerto antes de la siguiente
  const seg = Math.round((Date.now() - t0) / 1000);
  tiempos.push({ b, seg, ok: r.status === 0 });
  console.log("⏱ " + b.nombre + ": " + seg + " s");
}

// Tiempo de cada una, para mantener al día los `peso` de BATERIAS.
console.log("\nTiempos (servidor + batería; el `peso` de BATERIAS sale de aquí):");
for (const t of tiempos) {
  console.log("  " + (t.ok ? "✔" : "✘") + " " + t.b.nombre.padEnd(20) + String(t.seg).padStart(4) + " s   (peso " + peso(t.b) + ")");
}
console.log("    " + "migraciones".padEnd(20) + String(segMig).padStart(4) + " s");
console.log("    " + "total".padEnd(20) + String(Math.round((Date.now() - tInicio) / 1000)).padStart(4) + " s");

console.log(fallos ? "\n✘ " + fallos + " batería(s) con fallos" : "\n✔ " + elegidas.length + " batería(s) en verde");
salir(fallos ? 1 : 0);
