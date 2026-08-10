/* Huella estable de data/inventario.json.
   Ignora el campo "actualizado" y ordena las claves, para poder distinguir un
   cambio real de datos de un simple recalculado de la marca de tiempo.

   Lo usa el guard de .github/workflows/deploy.yml:
     git show <ref>:data/inventario.json | node scripts/inventario-huella.mjs

   Salidas especiales, para que quien llame decida desplegar por seguridad:
     __vacio__     no llegó nada por stdin (el archivo no existía en esa ref)
     __ilegible__  llegó algo que no es JSON válido                            */

let raw = "";
process.stdin.setEncoding("utf8");
for await (const trozo of process.stdin) raw += trozo;

if (!raw.trim()) { console.log("__vacio__"); process.exit(0); }

let obj;
try { obj = JSON.parse(raw); }
catch { console.log("__ilegible__"); process.exit(0); }

if (obj && typeof obj === "object" && !Array.isArray(obj)) delete obj.actualizado;

const ordenar = (v) =>
  Array.isArray(v) ? v.map(ordenar)
  : (v && typeof v === "object")
    ? Object.keys(v).sort().reduce((acc, k) => { acc[k] = ordenar(v[k]); return acc; }, {})
    : v;

console.log(JSON.stringify(ordenar(obj)));
