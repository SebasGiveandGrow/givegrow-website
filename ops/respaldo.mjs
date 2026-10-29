#!/usr/bin/env node
/* RESPALDO CIFRADO DE LA BASE (D1) Y LAS FOTOS (R2), FUERA DE CLOUDFLARE.
   ===========================================================================
   Hasta oct 2026 todo lo privado —donantes, aportes, casos de Mira Mi Casa,
   niños de Regalos— vivía en UN solo lugar: la cuenta de Cloudflare. Una cuenta
   perdida, un borrado por error o un cobro rechazado se lo llevaban todo. Esto
   saca una copia a la Mac (o al disco que se elija) y la cifra.

   CIFRADO CON LA LLAVE PÚBLICA. La Mac que respalda solo tiene la pública:
   puede cifrar, nunca descifrar. La privada (con su contraseña) vive en otro
   lado —una memoria USB, el gestor de contraseñas— y solo hace falta para
   restaurar. Si alguien se roba la Mac, se lleva archivos que no puede abrir.

   Formato de cada archivo .gge:
     "GGE1" · 2 bytes (largo de la llave envuelta) · la llave AES-256 envuelta
     con RSA-OAEP/SHA-256 · IV de 12 bytes · el contenido en AES-256-GCM ·
     la etiqueta GCM de 16 bytes al final.

   Uso (detalle en ops/respaldo.md):
     node ops/respaldo.mjs llaves --privada /Volumes/USB/gg-respaldo-privada.pem
     node ops/respaldo.mjs respaldar [--destino DIR]
     node ops/respaldo.mjs restaurar <carpeta-del-día> --privada RUTA [--destino DIR]

   Configuración, en ~/.config/givegrow/respaldo.env (permisos 600, NUNCA en el repo):
     GG_RESPALDO_DESTINO   carpeta donde quedan los respaldos (por defecto ~/Respaldos/GiveGrow)
     R2_ACCOUNT_ID         la cuenta de Cloudflare
     R2_ACCESS_KEY_ID      token de R2 de SOLO LECTURA sobre givegrow-media
     R2_SECRET_ACCESS_KEY
   Sin las tres de R2, respalda solo la base y lo dice. */

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { finished, pipeline } from "node:stream/promises";

const RAIZ = path.dirname(path.dirname(new URL(import.meta.url).pathname));
/* GG_RESPALDO_CONF_DIR solo para probar sin tocar la configuración real. */
const CONF_DIR = process.env.GG_RESPALDO_CONF_DIR || path.join(os.homedir(), ".config", "givegrow");
const CONF = path.join(CONF_DIR, "respaldo.env");
const PUBLICA = path.join(CONF_DIR, "respaldo-publica.pem");
const BASE = "givegrow-privado";
const BUCKET = "givegrow-media";
const MAGIA = Buffer.from("GGE1");

function leerConf() {
  const env = {};
  if (fs.existsSync(CONF)) {
    for (const l of fs.readFileSync(CONF, "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(GG_RESPALDO_|R2_)/.test(k))) };
}
function arg(nombre) {
  const i = process.argv.indexOf(nombre);
  return i > -1 ? process.argv[i + 1] : null;
}
function fallar(msg) {
  console.error("✘ " + msg);
  /* El aviso que se ve aunque nadie esté mirando la terminal (launchd). */
  if (process.platform === "darwin" && process.env.GG_RESPALDO_AVISO !== "no") {
    spawnSync("osascript", ["-e", 'display notification "' + msg.replace(/["\\]/g, "") + '" with title "Respaldo Give&Grow falló" sound name "Basso"']);
  }
  process.exit(1);
}
function correr(cmd, args, op = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: op.cwd || RAIZ, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(cmd + " " + args.slice(0, 3).join(" ") + " falló: " + String(r.stderr || r.stdout || r.error).trim().slice(-400));
  return r.stdout;
}

/* ---------------------------------------------------------------- cifrar */
async function cifrar(entrada, salida, publicaPem) {
  const llave = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const envuelta = crypto.publicEncrypt({ key: publicaPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, llave);
  const largo = Buffer.alloc(2); largo.writeUInt16BE(envuelta.length);
  const out = fs.createWriteStream(salida, { mode: 0o600 });
  out.write(Buffer.concat([MAGIA, largo, envuelta, iv]));
  const c = crypto.createCipheriv("aes-256-gcm", llave, iv);
  for await (const trozo of fs.createReadStream(entrada)) {
    if (!out.write(c.update(trozo))) await once(out, "drain");
  }
  out.write(c.final());
  out.end(c.getAuthTag());
  await finished(out);
  llave.fill(0);
}
async function descifrar(entrada, salida, privadaPem, frase) {
  const tam = fs.statSync(entrada).size;
  const fd = fs.openSync(entrada, "r");
  const cab = Buffer.alloc(6); fs.readSync(fd, cab, 0, 6, 0);
  if (!cab.subarray(0, 4).equals(MAGIA)) fallar(entrada + " no es un respaldo GGE1.");
  const n = cab.readUInt16BE(4);
  const envuelta = Buffer.alloc(n); fs.readSync(fd, envuelta, 0, n, 6);
  const iv = Buffer.alloc(12); fs.readSync(fd, iv, 0, 12, 6 + n);
  const tag = Buffer.alloc(16); fs.readSync(fd, tag, 0, 16, tam - 16);
  fs.closeSync(fd);
  let llave;
  try {
    llave = crypto.privateDecrypt({ key: privadaPem, passphrase: frase, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, envuelta);
  } catch {
    throw new Error("No se pudo abrir la llave privada: la contraseña no es la suya, o esa llave no es la de este respaldo.");
  }
  const d = crypto.createDecipheriv("aes-256-gcm", llave, iv);
  d.setAuthTag(tag);
  try {
    await pipeline(fs.createReadStream(entrada, { start: 6 + n + 12, end: tam - 17 }), d, fs.createWriteStream(salida, { mode: 0o600 }));
  } catch {
    fs.rmSync(salida, { force: true });
    throw new Error(path.basename(entrada) + " está dañado o fue alterado: no pasa la comprobación de integridad.");
  }
}

/* ---------------------------------------------------------------- llaves */
async function llaves() {
  const privada = arg("--privada");
  if (!privada) fallar("Di dónde guardar la llave privada: --privada /Volumes/TU-USB/gg-respaldo-privada.pem (fuera de esta Mac).");
  if (fs.existsSync(PUBLICA)) fallar("Ya hay una llave pública en " + PUBLICA + ". Si de verdad quieres otra, muévela primero: los respaldos viejos siguen necesitando SU privada.");
  const frase = process.env.GG_RESPALDO_FRASE || await preguntarOculto("Contraseña para la llave privada (mínimo 12 caracteres): ");
  if (frase.length < 12) fallar("La contraseña tiene que tener al menos 12 caracteres.");
  if (!process.env.GG_RESPALDO_FRASE && (await preguntarOculto("Repítela: ")) !== frase) fallar("Las dos contraseñas no coinciden.");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem", cipher: "aes-256-cbc", passphrase: frase }
  });
  fs.mkdirSync(CONF_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(privada, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLICA, publicKey, { mode: 0o644 });
  console.log("✔ Llave privada (con tu contraseña): " + privada);
  console.log("✔ Llave pública (la que usa el respaldo): " + PUBLICA);
  console.log("  Guarda la privada y su contraseña en dos sitios distintos. Sin las dos, ningún respaldo se puede abrir.");
}
function preguntarOculto(texto) {
  return new Promise((ok) => {
    process.stdout.write(texto);
    const entrada = process.stdin;
    let s = "";
    entrada.setRawMode && entrada.setRawMode(true);
    entrada.resume(); entrada.setEncoding("utf8");
    const al = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        entrada.setRawMode && entrada.setRawMode(false); entrada.pause(); entrada.removeListener("data", al);
        process.stdout.write("\n"); ok(s);
      } else if (ch === "\u0003") process.exit(1);
      else if (ch === "\u007f") s = s.slice(0, -1);
      else s += ch;
    };
    entrada.on("data", al);
  });
}

/* -------------------------------------------------------------------- R2 */
function r2(conf, ruta, query, salida) {
  const url = "https://" + conf.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com/" + BUCKET + ruta + (query ? "?" + query : "");
  const args = ["-sS", "--fail", "--aws-sigv4", "aws:amz:auto:s3", "--user", conf.R2_ACCESS_KEY_ID + ":" + conf.R2_SECRET_ACCESS_KEY, url];
  if (salida) args.push("-o", salida);
  return correr("curl", args);
}
function listarR2(conf) {
  const objetos = [];
  let token = null;
  do {
    const q = "list-type=2&max-keys=1000" + (token ? "&continuation-token=" + encodeURIComponent(token) : "");
    const xml = r2(conf, "", q);
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const k = (m[1].match(/<Key>([\s\S]*?)<\/Key>/) || [])[1];
      const e = (m[1].match(/<ETag>([\s\S]*?)<\/ETag>/) || [])[1] || "";
      if (k) objetos.push({ key: k.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"), etag: e.replace(/&quot;|"/g, "") });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1] : null;
  } while (token);
  return objetos;
}

/* ------------------------------------------------------------- respaldar */
async function respaldar() {
  const conf = leerConf();
  if (!fs.existsSync(PUBLICA)) fallar("Falta la llave pública en " + PUBLICA + ". Corre primero: node ops/respaldo.mjs llaves --privada <ruta fuera de esta Mac>");
  const publica = fs.readFileSync(PUBLICA, "utf8");
  const destino = arg("--destino") || conf.GG_RESPALDO_DESTINO || path.join(os.homedir(), "Respaldos", "GiveGrow");
  if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true, mode: 0o700 });
  const dia = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  const carpeta = path.join(destino, dia);
  fs.mkdirSync(carpeta, { mode: 0o700 });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gg-respaldo-"));
  fs.chmodSync(tmp, 0o700);
  const resumen = { formato: "GGE1", hecho: new Date().toISOString(), base: {}, r2: { nuevos: 0, total: 0, omitido: null } };
  try {
    /* 1. La base completa. */
    const sql = path.join(tmp, "d1.sql");
    const local = process.argv.includes("--local");
    /* `--local` es solo para probar: lee .wrangler/state del repo. */
    correr("npx", ["wrangler", "d1", "export", BASE, local ? "--local" : "--remote", "--output", sql]);
    const texto = fs.readFileSync(sql, "utf8");
    for (const m of texto.matchAll(/^INSERT INTO "?([A-Za-z0-9_]+)"?/gm)) resumen.base[m[1]] = (resumen.base[m[1]] || 0) + 1;
    await cifrar(sql, path.join(carpeta, "d1.sql.gge"), publica);
    fs.rmSync(sql);

    /* 2. Las fotos y documentos de R2: solo lo NUEVO desde el último respaldo.
       Lo ya respaldado se reconoce por un hash de (llave + etag) en
       r2-vistos.txt: dice «esto ya está», pero no qué es. */
    if (!(conf.R2_ACCOUNT_ID && conf.R2_ACCESS_KEY_ID && conf.R2_SECRET_ACCESS_KEY)) {
      resumen.r2.omitido = "sin credenciales de R2 en " + CONF;
      console.log("· R2 omitido: faltan R2_ACCOUNT_ID, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en " + CONF);
    } else {
      const vistosArch = path.join(destino, "r2-vistos.txt");
      const vistos = new Set(fs.existsSync(vistosArch) ? fs.readFileSync(vistosArch, "utf8").split("\n").filter(Boolean) : []);
      const h = (o) => crypto.createHash("sha256").update(o.key + "\0" + o.etag).digest("hex");
      const todos = listarR2(conf);
      const nuevos = todos.filter((o) => !vistos.has(h(o)));
      resumen.r2.total = todos.length; resumen.r2.nuevos = nuevos.length;
      if (nuevos.length) {
        const dir = path.join(tmp, "r2");
        nuevos.forEach((o, i) => {
          const f = path.join(dir, String(i).padStart(6, "0"));
          fs.mkdirSync(dir, { recursive: true });
          r2(conf, "/" + o.key.split("/").map(encodeURIComponent).join("/"), null, f);
        });
        fs.writeFileSync(path.join(dir, "indice.json"), JSON.stringify(nuevos.map((o, i) => ({ archivo: String(i).padStart(6, "0"), key: o.key, etag: o.etag }))));
        const tar = path.join(tmp, "r2.tar");
        correr("tar", ["-cf", tar, "-C", tmp, "r2"]);
        await cifrar(tar, path.join(carpeta, "r2-nuevos.tar.gge"), publica);
        fs.appendFileSync(vistosArch, nuevos.map(h).join("\n") + "\n", { mode: 0o600 });
      }
    }
    fs.writeFileSync(path.join(carpeta, "resumen.json"), JSON.stringify(resumen, null, 2));
    fs.writeFileSync(path.join(destino, "ultimo-ok.txt"), resumen.hecho + "\n");
    const filas = Object.values(resumen.base).reduce((a, b) => a + b, 0);
    console.log("✔ Respaldo en " + carpeta + ": " + Object.keys(resumen.base).length + " tablas, " + filas + " filas" +
      (resumen.r2.omitido ? "; R2 omitido." : "; R2: " + resumen.r2.nuevos + " archivo(s) nuevo(s) de " + resumen.r2.total + "."));
  } catch (e) {
    fs.rmSync(carpeta, { recursive: true, force: true });
    fallar(String(e && e.message || e));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------- restaurar
   LA PRUEBA DE QUE EL RESPALDO SIRVE. Descifra, carga la base en una D1
   LOCAL desechable y compara fila por fila contra lo que dijo el respaldo.
   Nunca toca la base de producción. */
async function restaurar() {
  const carpeta = process.argv[3];
  const privada = arg("--privada");
  if (!carpeta || !fs.existsSync(path.join(carpeta, "d1.sql.gge"))) fallar("Di la carpeta de un respaldo (la que tiene d1.sql.gge).");
  if (!privada || !fs.existsSync(privada)) fallar("Di dónde está la llave privada: --privada RUTA");
  const frase = process.env.GG_RESPALDO_FRASE || await preguntarOculto("Contraseña de la llave privada: ");
  const destino = arg("--destino") || fs.mkdtempSync(path.join(os.tmpdir(), "gg-restaurado-"));
  fs.mkdirSync(destino, { recursive: true, mode: 0o700 });
  const pem = fs.readFileSync(privada, "utf8");
  const sql = path.join(destino, "d1.sql");
  await descifrar(path.join(carpeta, "d1.sql.gge"), sql, pem, frase);
  if (fs.existsSync(path.join(carpeta, "r2-nuevos.tar.gge"))) {
    const tar = path.join(destino, "r2-nuevos.tar");
    await descifrar(path.join(carpeta, "r2-nuevos.tar.gge"), tar, pem, frase);
    correr("tar", ["-xf", tar, "-C", destino]);
    fs.rmSync(tar);
    console.log("✔ R2: " + JSON.parse(fs.readFileSync(path.join(destino, "r2", "indice.json"), "utf8")).length + " archivo(s) en " + path.join(destino, "r2"));
  }
  const estado = path.join(destino, "d1-local");
  correr("npx", ["wrangler", "d1", "execute", BASE, "--local", "--persist-to", estado, "--file", sql, "--yes"]);
  const esperado = JSON.parse(fs.readFileSync(path.join(carpeta, "resumen.json"), "utf8")).base;
  const malas = [];
  for (const [t, n] of Object.entries(esperado)) {
    const out = correr("npx", ["wrangler", "d1", "execute", BASE, "--local", "--persist-to", estado, "--json", "--command", 'SELECT COUNT(*) AS n FROM "' + t + '"']);
    const real = JSON.parse(out)[0].results[0].n;
    if (real !== n) malas.push(t + ": " + real + " de " + n);
  }
  if (malas.length) fallar("La restauración no cuadra: " + malas.join("; "));
  console.log("✔ Restaurado y cuadrado: " + Object.keys(esperado).length + " tablas con las mismas filas que dijo el respaldo. Base local en " + estado);
  console.log("  Esto son datos personales descifrados: borra " + destino + " cuando termines.");
}

const orden = process.argv[2];
const ORDENES = { llaves, respaldar, restaurar };
if (ORDENES[orden]) {
  try { await ORDENES[orden](); } catch (e) { fallar(String(e && e.message || e)); }
} else { console.log("Uso: node ops/respaldo.mjs llaves|respaldar|restaurar — ver ops/respaldo.md"); process.exit(orden ? 1 : 0); }
