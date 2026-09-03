/* Crea en PayPal el producto y los cuatro planes de membresia internacional.
   Se corre UNA VEZ por entorno (sandbox y luego produccion) y escupe los ids de
   plan, que son lo que el Worker necesita.

   NO forma parte del sitio: es una herramienta de `ops/`, como las minutas o la
   guia en PDF.

   ── COMO SE CORRE ─────────────────────────────────────────────────────────────
   Las credenciales se leen de `.dev.vars`, el mismo archivo de la raiz donde
   `wrangler dev` guarda las llaves locales. No hay que escribirlas en la linea de
   comandos: ahi quedarian en el historial del shell.

   Comprueba que las llaves sirven, sin crear nada:

     node ops/paypal-plans.mjs

   Crea de verdad -hay que pedirlo explicitamente-:

     node ops/paypal-plans.mjs --crear

   Y para produccion, encima, PAYPAL_ENTORNO=live en `.dev.vars`.

   ⚠️ NODE NO LEE `.dev.vars` SOLO. Esa es la trampa que costo una vuelta el 2 sep
   2026: se puso `PAYPAL_CLIENT_ID` en `.dev.vars` y el script dijo «SIN
   CREDENCIALES», porque `.dev.vars` lo lee WRANGLER y este es un `node` pelado.
   Se lee a mano abajo (`leerDevVars`). Las variables de entorno de verdad, si
   existen, tienen prioridad.

   ── DOS DECISIONES DE SEGURIDAD, Y NO SON ADORNO ──────────────────────────────
   1. EL DEFECTO ES SANDBOX Y ES DRY-RUN. Crear planes de produccion por
      accidente deja basura en la cuenta real que despues hay que desactivar a
      mano. Que las dos cosas peligrosas exijan escribirlas es lo barato.
   2. `PayPal-Request-Id` ES DETERMINISTA, derivado del entorno y del nivel. Es la
      clave de idempotencia de PayPal, y protege el caso que de verdad ocurre: un
      reintento tras un error de red no deja dos planes cobrando lo mismo. Lo que
      NO hay que asumir es que proteja para siempre — la ventana de idempotencia
      la fija PayPal y no la controlamos. Antes de volver a correrlo semanas
      despues, mirar en el dashboard si el plan ya esta.

   ── LOS MONTOS NO SE INVENTAN AQUI ────────────────────────────────────────────
   Salen de lo que el sitio YA publica en las tarjetas de membresia
   (`membres.tN.price` y `.priceu` en app.js): $20.000 ≈ US$5, $50.000 ≈ US$15,
   $120.000 ≈ US$35, $250.000+ ≈ US$75. Si esas cambian, cambian aqui tambien —y
   el plan viejo hay que desactivarlo en PayPal, porque un plan no se edita de
   precio sin afectar a quien ya esta suscrito.

   ── LO QUE SEBAS DECIDIO, Y CON QUE NUMEROS ───────────────────────────────────
   Se ofrecen LOS CUATRO niveles, Semilla incluido, aunque la comision de PayPal
   Colombia (5,40% + USD 0,30, y 3,50% al convertir) se lleve el 14,5% de una
   cuota de US$5 frente al 9,1% de una de US$75. El razonamiento es el mismo que
   justifica PayPal en general: quien puede dar US$5 al mes desde el exterior no
   tiene otra puerta, y el 14,5% de algo es mejor que el 100% de nada.

     nivel     cuota    neto    se pierde
     Semilla   US$5     4,27    14,5%
     Retono    US$15    13,40   10,6%
     Arbol     US$35    31,66    9,5%
     Bosque    US$75    68,18    9,1%
*/

import fs from "node:fs";
import path from "node:path";

/* Lee `.dev.vars` de la raiz del repo. Formato CLAVE=valor, una por linea, con
   `#` para comentarios. No se interpreta nada mas -ni comillas ni continuaciones-
   porque el archivo es de wrangler y ese es su formato.

   Devuelve un objeto y NUNCA imprime un valor. */
function leerDevVars() {
  /* La raiz es el padre de ops/, calculado desde este archivo y no desde el
     directorio actual: asi el script funciona igual se corra desde donde se
     corra. */
  const raiz = path.resolve(new URL(".", import.meta.url).pathname, "..");
  const arch = path.join(raiz, ".dev.vars");
  const salida = { ruta: arch, existe: false, vars: {} };
  let texto;
  try { texto = fs.readFileSync(arch, "utf8"); } catch { return salida; }
  salida.existe = true;
  for (const linea of texto.split("\n")) {
    const t = linea.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    salida.vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return salida;
}

const DEV = leerDevVars();
/* El entorno de verdad manda sobre el archivo: asi se puede probar algo puntual
   sin editarlo. */
const conf = (n) => process.env[n] || DEV.vars[n] || "";

const CREAR = process.argv.includes("--crear");
const ENTORNO = conf("PAYPAL_ENTORNO") === "live" ? "live" : "sandbox";
const BASE = ENTORNO === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

/* Si PayPal rechaza la categoria, su lista valida esta en la doc de catalogos y
   este es el UNICO sitio donde hay que cambiarla. El script imprime el error
   textual del proveedor para que se vea cual acepta. */
const CATEGORIA = conf("PAYPAL_CATEGORIA") || "CHARITY";

const NIVELES = [
  { clave: "semilla", nombre: "Semilla", usd: "5.00",  cop: "$20.000" },
  { clave: "retono",  nombre: "Retoño",  usd: "15.00", cop: "$50.000" },
  { clave: "arbol",   nombre: "Árbol",   usd: "35.00", cop: "$120.000" },
  { clave: "bosque",  nombre: "Bosque",  usd: "75.00", cop: "$250.000+" }
];

const PRODUCTO = {
  name: "Membresía Give&Grow International",
  description: "Membresía mensual de apoyo a Fundación Give&Grow International (NIT 901.948.930-2).",
  type: "SERVICE",
  category: CATEGORIA,
  home_url: "https://www.thegiveandgrowproject.org/#membresias"
};

function planDe(nivel, productId) {
  return {
    product_id: productId,
    name: "Membresía " + nivel.nombre,
    description: "Aporte mensual de US$" + nivel.usd.replace(".00", "") +
                 " · equivale al nivel " + nivel.nombre + " (" + nivel.cop + " COP).",
    /* UN SOLO CICLO, `REGULAR`, y SIN `total_cycles`: asi PayPal lo trata como
       indefinido. Poner `total_cycles: 0` tambien funciona en algunas versiones,
       pero omitirlo es lo que muestra la doc y no depende de esa lectura. */
    billing_cycles: [{
      tenure_type: "REGULAR",
      sequence: 1,
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      pricing_scheme: { fixed_price: { value: nivel.usd, currency_code: "USD" } }
    }],
    payment_preferences: {
      /* Si un cobro falla, PayPal lo reintenta y lo suma al siguiente en vez de
         cancelar la membresia al primer tropiezo — una tarjeta vencida no debe
         costar un miembro. Tras 3 fallos si se suspende. */
      auto_bill_outstanding: true,
      payment_failure_threshold: 3,
      setup_fee: { value: "0.00", currency_code: "USD" }
    }
  };
}

async function token(id, secreto) {
  const r = await fetch(BASE + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(id + ":" + secreto).toString("base64"),
      "content-type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) {
    throw new Error("no se pudo autenticar (" + r.status + "): " + JSON.stringify(d).slice(0, 300));
  }
  return d.access_token;
}

async function crear(ruta, cuerpo, requestId, tk) {
  const r = await fetch(BASE + ruta, {
    method: "POST",
    headers: {
      authorization: "Bearer " + tk,
      "content-type": "application/json",
      accept: "application/json",
      /* La clave de idempotencia. Misma id = misma respuesta, no un duplicado. */
      "paypal-request-id": requestId
    },
    body: JSON.stringify(cuerpo)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(ruta + " respondio " + r.status + ": " + JSON.stringify(d).slice(0, 500));
  }
  return d;
}

async function main() {
  const id = conf("PAYPAL_CLIENT_ID");
  const secreto = conf("PAYPAL_SECRET");

  console.log("entorno: " + ENTORNO + "  (" + BASE + ")");
  console.log("categoria del producto: " + CATEGORIA);
  console.log("");

  if (!id || !secreto) {
    /* SE DICE POR QUE FALTAN, y se distinguen los tres casos. Un «faltan las
       credenciales» a secas obliga a adivinar cual de los tres es. */
    if (!DEV.existe) {
      console.log("NO ENCONTRE " + DEV.ruta);
      console.log("Ese archivo va en la RAIZ del repo, al lado de wrangler.toml.");
    } else if (!DEV.vars.PAYPAL_CLIENT_ID && !DEV.vars.PAYPAL_SECRET) {
      console.log("ENCONTRE " + DEV.ruta + " pero no tiene PAYPAL_CLIENT_ID ni PAYPAL_SECRET.");
      console.log("Agregale esas dos lineas al final, sin borrar las que ya estan.");
    } else {
      console.log("Falta una de las dos: " +
        (DEV.vars.PAYPAL_CLIENT_ID ? "" : "PAYPAL_CLIENT_ID ") +
        (DEV.vars.PAYPAL_SECRET ? "" : "PAYPAL_SECRET"));
    }
    console.log("");
    console.log("Mientras tanto, esto es lo que se crearia, y no se llamo a nadie.");
    console.log("");
    console.log("producto:");
    console.log(JSON.stringify(PRODUCTO, null, 2));
    for (const n of NIVELES) {
      console.log("");
      console.log("plan " + n.nombre + "  (request-id: " + ENTORNO + "-membresia-" + n.clave + ")");
      console.log(JSON.stringify(planDe(n, "PROD-EJEMPLO"), null, 2));
    }
    console.log("");
    console.log("Para crear: exporta PAYPAL_CLIENT_ID y PAYPAL_SECRET y agrega --crear.");
    return;
  }

  const tk = await token(id, secreto);
  console.log("autenticado.");

  if (!CREAR) {
    console.log("");
    console.log("DRY-RUN: credenciales validas y no se creo nada. Agrega --crear para hacerlo.");
    return;
  }

  const prod = await crear("/v1/catalogs/products", PRODUCTO,
                           ENTORNO + "-producto-membresia", tk);
  console.log("producto: " + prod.id);

  const ids = {};
  for (const n of NIVELES) {
    const p = await crear("/v1/billing/plans", planDe(n, prod.id),
                          ENTORNO + "-membresia-" + n.clave, tk);
    ids[n.clave] = p.id;
    console.log("plan " + n.nombre.padEnd(8) + " US$" + n.usd.padEnd(6) + " -> " + p.id);
  }

  /* DONDE VAN LOS IDS DEPENDE DEL ENTORNO, y decirlo mal cuesta caro: un id de
     sandbox en `wrangler.toml` es un plan que en produccion no existe, y el
     endpoint responderia «plan_no_configurado» sin que se vea por que.

       sandbox -> `.dev.vars`, que solo lo lee la vista previa local.
       live    -> `wrangler.toml`, en [vars]. No son secretos: son ids.
  */
  console.log("");
  if (ENTORNO === "live") {
    console.log("Pega esto en wrangler.toml, en [vars]:");
    console.log("");
    console.log('PAYPAL_PRODUCTO = "' + prod.id + '"');
    for (const n of NIVELES) {
      console.log("PAYPAL_PLAN_" + n.clave.toUpperCase() + ' = "' + ids[n.clave] + '"');
    }
  } else {
    console.log("Estos son ids de SANDBOX: van en .dev.vars, no en wrangler.toml.");
    console.log("Agregalos al final del archivo, sin borrar lo que ya tiene:");
    console.log("");
    console.log("PAYPAL_PRODUCTO=" + prod.id);
    for (const n of NIVELES) {
      console.log("PAYPAL_PLAN_" + n.clave.toUpperCase() + "=" + ids[n.clave]);
    }
  }
}

main().catch((e) => {
  console.error("");
  console.error("FALLO: " + e.message);
  console.error("");
  console.error("Si el error menciona la categoria del producto, la lista valida esta en");
  console.error("la doc de catalogos de PayPal y se cambia con PAYPAL_CATEGORIA=...");
  process.exit(1);
});
