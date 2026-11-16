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
     4. Levanta `wrangler dev`, espera a que responda y corre cada batería.
     5. Sale con 1 si alguna falló.
*/
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const PUERTO = process.env.PUERTO || "8795";
const BASE = "http://localhost:" + PUERTO;
const DB = "givegrow-privado";

/* Cada batería con lo que pide del servidor. Las que necesitan otra forma de
   arrancar (cron de prueba, Access simulado) se suman aquí cuando se adapten:
   mejor pocas que corren siempre que muchas que nadie mira. */
const BATERIAS = [
  { nombre: "pagos", archivo: "ops/probar-pagos.py" },
];

const filtro = process.argv[2] || "";
const elegidas = BATERIAS.filter((b) => b.nombre.includes(filtro));
if (!elegidas.length) {
  console.error("Ninguna batería coincide con «" + filtro + "». Hay: " + BATERIAS.map((b) => b.nombre).join(", "));
  process.exit(2);
}

const persist = mkdtempSync(join(tmpdir(), "gg-dinero-"));
const devVars = join(RAIZ, ".dev.vars");
let devVarsMio = false;
let servidor = null;

function limpiar() {
  if (servidor && servidor.pid) {
    try { process.kill(-servidor.pid, "SIGTERM"); } catch (e) { /* ya no está */ }
  }
  if (devVarsMio) rmSync(devVars, { force: true });
  rmSync(persist, { recursive: true, force: true });
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

// 4. El Worker. `detached` para poder matar al grupo entero: wrangler lanza
//    workerd como hijo y un SIGTERM al padre solo lo deja huérfano.
servidor = spawn("npx", ["wrangler", "dev", "--port", PUERTO, "--persist-to", persist], {
  cwd: RAIZ, detached: true, stdio: ["ignore", "pipe", "pipe"],
});
let registro = "";
servidor.stdout.on("data", (d) => { registro += d; });
servidor.stderr.on("data", (d) => { registro += d; });

async function esperar() {
  const tope = Date.now() + 120000;
  while (Date.now() < tope) {
    if (servidor.exitCode !== null) return false;
    try {
      const r = await fetch(BASE + "/robots.txt", { signal: AbortSignal.timeout(3000) });
      if (r.ok) return true;
    } catch (e) { /* aún no */ }
    await new Promise((s) => setTimeout(s, 1000));
  }
  return false;
}
process.stdout.write("· wrangler dev en " + BASE + "… ");
if (!(await esperar())) {
  console.error("\n✘ el Worker no respondió en 2 minutos\n" + registro.slice(-3000));
  salir(1);
}
console.log("responde");

let fallos = 0;
for (const b of elegidas) {
  console.log("\n══ " + b.nombre + " (" + b.archivo + ")");
  const r = spawnSync("python3", [b.archivo], {
    cwd: RAIZ, stdio: "inherit",
    env: { ...process.env, BASE, PERSIST: persist },
  });
  if (r.status !== 0) { fallos++; console.log("✘ " + b.nombre + " salió con " + r.status); }
}

console.log(fallos ? "\n✘ " + fallos + " batería(s) con fallos" : "\n✔ " + elegidas.length + " batería(s) en verde");
salir(fallos ? 1 : 0);
