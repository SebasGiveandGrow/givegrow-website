/* MOVER EL RASTRO DE CONSENTIMIENTO FUERA DEL ARCHIVO PÚBLICO
   ============================================================================
   `data/partners.json` se sirve tal cual en https://…/data/partners.json —HTTP
   200, cualquiera lo baja— y hasta hoy incluía `consent.grantedBy`: el NOMBRE
   de la persona que autorizó la publicación en cada fundación. Nadie lo
   renderiza, y CLAUDE.md lo dice así; pero no renderizar no lo hace privado
   cuando el archivo entero es público.

   El rastro NO se borra: es la prueba de que hubo autorización, que es
   justamente lo que exige la Ley 1581. Se MUEVE a `consentimientos`, la tabla
   privada que existe para eso y que no se sirve nunca al navegador.

   POR QUÉ ESTE SCRIPT Y NO UNA MIGRACIÓN: una migración se commitea, y este
   repositorio es PÚBLICO. Escribir los nombres en `migrations/` sería volver a
   publicarlos, con git history de regalo. Este script los lee del archivo que
   ya los tiene EN TU MÁQUINA y emite el SQL; nada de eso pasa por un commit.

   USO — dos pasos, en este orden:

     1) node ops/mover-grantedby.mjs            (imprime el SQL, no toca nada)
     2) node ops/mover-grantedby.mjs --aplicar  (lo ejecuta contra la base remota)

   Y DESPUÉS de que el paso 2 diga que quedó, se fusiona el PR que quita el
   campo del JSON. Al revés se pierde el rastro. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const APLICAR = process.argv.includes("--aplicar");
const d = JSON.parse(readFileSync("data/partners.json", "utf8"));
const items = Array.isArray(d) ? d : (d.partners || []);

const filas = [];
for (const p of items) {
  if (!p || typeof p !== "object") continue;
  const c = p.consent || {};
  if (!c.grantedBy) continue;
  filas.push({
    sujeto: "aliada " + p.id,
    detalle: "publicacion_web · autorizo: " + c.grantedBy +
             " · logo=" + (c.logo === true) + " · fotos=" + (c.photos === true) +
             (c.minorsImageProtected ? " · menores protegidos" : "") +
             (c.granted ? " · otorgado " + c.granted : "")
  });
}

if (!filas.length) {
  console.log("No hay ningun `grantedBy` en data/partners.json.");
  console.log("O ya se movio, o el PR que lo quita ya esta fusionado. Nada que hacer.");
  process.exit(0);
}

const esc = (s) => String(s).replace(/'/g, "''");
const sql = filas.map((f) =>
  "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES ('" +
  esc(f.sujeto) + "', 'datos', '" + esc(f.detalle) + "');"
).join("\n");

console.log(filas.length + " autorizacion(es) a mover:\n");
for (const f of filas) console.log("  " + f.sujeto);
console.log("");

if (!APLICAR) {
  /* EL ENSAYO NO IMPRIME EL NOMBRE, y esto lo aprendi de la peor forma: la
     primera version de este script lo escupia por stdout: o sea que un script
     escrito para sacar nombres de un sitio publico los publicaba en la salida
     de quien lo corriera. Un aviso de «no lo pegues en un chat» no es una
     proteccion; enmascararlo si.

     Se muestra la FORMA de la fila, no su contenido, que es lo unico que hace
     falta para saber si el SQL esta bien armado. */
  const oculto = (t) => t.replace(/autorizo: [^·\']+/g, "autorizo: <NOMBRE, no se imprime> ");
  console.log("Forma del SQL que se ejecutaria (los nombres van enmascarados):\n");
  console.log(oculto(sql));
  console.log("\nPara aplicarlo de verdad —ahi si van los nombres reales, a la base PRIVADA—:");
  console.log("  node ops/mover-grantedby.mjs --aplicar");
  process.exit(0);
}

/* Se pasa por --command y no por archivo: asi no queda un .sql con nombres
   tirado en el disco esperando que alguien lo commitee. */
const salida = execFileSync("npx", [
  "--yes", "wrangler", "d1", "execute", "givegrow-privado", "--remote", "--command", sql
], { encoding: "utf8" });
console.log(salida.split("\n").filter((l) => /success|changes|rows_written|error/i.test(l)).join("\n"));
console.log("\nListo. Comprueba con:");
console.log("  npx wrangler d1 execute givegrow-privado --remote --command \"SELECT sujeto, tipo FROM consentimientos WHERE sujeto LIKE 'aliada %'\"");
console.log("Y solo entonces fusiona el PR que quita `grantedBy` del JSON.");
