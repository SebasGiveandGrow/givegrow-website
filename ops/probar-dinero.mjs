#!/usr/bin/env node
/* Corre SOLAS las baterías de los flujos de dinero, contra un Worker local
   recién armado. Existían desde hace meses (ops/probar-*.py) pero cada una
   pedía levantar wrangler a mano, aplicar migraciones y acordarse de correrla:
   en la práctica solo se corrían el día que se tocaba ese flujo.

   Uso:   node ops/probar-dinero.mjs            (todas)
          node ops/probar-dinero.mjs pagos      (solo las que contengan «pagos»)

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

/* Cada batería con los flags de `wrangler dev` que pide. */
const BATERIAS = [
  { nombre: "pagos", archivo: "ops/probar-pagos.py" },
  { nombre: "cobro-mensual", archivo: "ops/probar-cobro-mensual.py", flags: ["--test-scheduled"] },
  { nombre: "baja", archivo: "ops/probar-baja.py" },
  { nombre: "aviso-espera", archivo: "ops/probar-aviso-espera.py", flags: ["--test-scheduled"] },
  { nombre: "cupo-correo", archivo: "ops/probar-cupo-correo.py", flags: ["--test-scheduled",
      "--var", "RESEND_API_KEY:re_llave_invalida_de_prueba",
      "--var", "CORREO_AVISOS:equipo@ejemplo.invalid",
      "--var", "CORREO_MMC:mmc@ejemplo.invalid"] },
  { nombre: "inscripcion", archivo: "ops/probar-inscripcion.py" },
  /* `banco: true` = corre contra el BANCO: una copia del Worker con Access
     simulado (ver `armarBanco`). Para lo que vive detrás del panel. */
  { nombre: "entregas", archivo: "ops/probar-entregas.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "regalos-aliada", archivo: "ops/probar-regalos-aliada.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "aportes-fundacion", archivo: "ops/probar-aportes-fundacion.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "unidades-vivo", archivo: "ops/probar-unidades-vivo.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "tarjetas", archivo: "ops/probar-tarjetas.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "indicadores", archivo: "ops/probar-indicadores.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
  { nombre: "tema-portal", archivo: "ops/probar-tema-portal.py", banco: true, flags: ["--var", "PRUEBA_ACCESS:si"] },
];

const filtro = process.argv[2] || "";
const elegidas = BATERIAS.filter((b) => b.nombre.includes(filtro));
if (!elegidas.length) {
  console.error("Ninguna batería coincide con «" + filtro + "». Hay: " + BATERIAS.map((b) => b.nombre).join(", "));
  process.exit(2);
}

/* UNA BASE POR BATERÍA. Las migraciones se aplican una vez a `plantilla` y cada
   batería arranca sobre una copia: así ninguna hereda filas de la anterior, y
   cada una puede pedir su propia forma de arrancar el servidor. */
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
process.stdout.write("· " + migraciones.length + " migraciones en una base local vacía… ");
for (const m of migraciones) {
  const r = wrangler(["d1", "execute", DB, "--local", "--persist-to", persist, "--file", join("migrations", m)]);
  if (r.status !== 0) {
    console.error("\n✘ falló " + m + "\n" + (r.stdout || "") + (r.stderr || ""));
    salir(1);
  }
}
console.log("listo");

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
for (const b of elegidas) {
  console.log("\n══ " + b.nombre + " (" + b.archivo + ")");
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
}

console.log(fallos ? "\n✘ " + fallos + " batería(s) con fallos" : "\n✔ " + elegidas.length + " batería(s) en verde");
salir(fallos ? 1 : 0);
