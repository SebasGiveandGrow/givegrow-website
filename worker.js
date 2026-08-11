/* Worker Give&Grow
   ==========================================================================
   Dos responsabilidades:

   1. /f/<id>  — página de compartir con metadatos OG propios de cada fundación,
      para que WhatsApp/Facebook/X (que no ejecutan JS) reciban algo útil.

   2. /api/*   — la capa de pagos con Wompi y la base privada D1.

   Todo lo demás lo sirven los assets estáticos como siempre.
   `run_worker_first` en wrangler.toml declara qué rutas entran aquí primero;
   sin /api/* en esa lista, el fallback de SPA se tragaría los endpoints.

   DECISIONES QUE NO SE DEBEN REVERTIR SIN LEER LA DOCUMENTACIÓN DE WOMPI:

   · Web Checkout por REDIRECCIÓN, no el Widget. El widget exige cargar
     checkout.wompi.co/widget.js en nuestra página: violaría la CSP y le daría
     ejecución a un tercero justo donde el donante escribe sus datos.
   · La URL del checkout la construye este Worker y el navegador solo navega.
     Así el secreto de integridad nunca sale del servidor, y como es una
     navegación y no un envío de formulario, `form-action 'self'` no la bloquea.
     La CSP no se toca en una sola línea.
   · El WEBHOOK es la única fuente de verdad del pago. La documentación lo dice
     textualmente: «No uses la redirección como método de validación de tus
     transacciones, solo con fines informativos».
   · El ambiente se deduce del prefijo de la llave pública. Así es imposible
     que queden llaves de prueba apuntando a producción.
*/

const ORIGIN = "https://www.thegiveandgrowproject.org";

/* Límites del formulario público, en pesos. Coinciden con el deslizador de la
   calculadora: por debajo no cubre la comisión, por encima conviene hablar. */
const MONTO_MIN = 5000;
const MONTO_MAX = 20000000;

/* ========================================================================
   Utilidades
   ======================================================================== */

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function sha256Hex(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Comparación de longitud fija: no filtra en qué carácter falló el checksum. */
function igualesSeguro(a, b) {
  const x = String(a || ""), y = String(b || "");
  if (x.length !== y.length) return false;
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return dif === 0;
}

/* El prefijo de la llave pública decide el ambiente. Una sola fuente. */
function ambienteWompi(pub) {
  const esPrueba = String(pub || "").startsWith("pub_test_");
  return {
    api: esPrueba ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1",
    checkout: "https://checkout.wompi.co/p/",
    modo: esPrueba ? "sandbox" : "produccion"
  };
}

/* ========================================================================
   Guías: GG-YYYY-NNNNNN
   El mismo número es la `reference` de Wompi. Un solo número, una sola verdad.
   INSERT ... ON CONFLICT DO UPDATE ... RETURNING es atómico en D1, así que dos
   donantes simultáneos no pueden recibir la misma guía.
   ======================================================================== */

async function siguienteGuia(env, anio) {
  const { results } = await env.DB.prepare(
    "INSERT INTO numerador (anio, ultimo) VALUES (?, 1) " +
    "ON CONFLICT(anio) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo"
  ).bind(anio).all();
  const n = results && results[0] ? results[0].ultimo : null;
  if (!n) throw new Error("numerador no devolvió consecutivo");
  return "GG-" + anio + "-" + String(n).padStart(6, "0");
}

/* ========================================================================
   POST /api/checkout
   Guarda la intención, asigna la guía, firma y devuelve la URL de Wompi.
   ======================================================================== */

async function apiCheckout(request, env, url) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  let cuerpo;
  try { cuerpo = await request.json(); }
  catch { return json({ error: "json_invalido" }, 400); }

  /* --- validación: nada se guarda antes de que los datos sean sanos ---
     El monto tiene que llegar como NÚMERO, no como cadena. Con Number() de por
     medio, "50000" y " 50000 " pasaban: el rango los contenía, pero un contrato
     laxo es el terreno donde después crecen los errores difíciles. */
  const monto = cuerpo.monto;
  if (typeof monto !== "number" || !Number.isInteger(monto) || monto < MONTO_MIN || monto > MONTO_MAX) {
    return json({ error: "monto_invalido", min: MONTO_MIN, max: MONTO_MAX }, 400);
  }

  const frecuencia = ["unico", "mensual", "anual"].includes(cuerpo.frecuencia) ? cuerpo.frecuencia : "unico";
  const modo       = cuerpo.modo === "dirigida" ? "dirigida" : "fondo";
  const muro       = ["nombre", "anonimo", "no"].includes(cuerpo.muro) ? cuerpo.muro : "no";
  const destino    = modo === "dirigida" ? String(cuerpo.destino || "").slice(0, 60) : null;
  const proyecto   = cuerpo.proyecto ? String(cuerpo.proyecto).slice(0, 120) : null;
  const nota       = cuerpo.nota ? String(cuerpo.nota).slice(0, 280) : null;
  const certificado = cuerpo.certificado ? 1 : 0;

  if (modo === "dirigida" && !destino) return json({ error: "destino_requerido" }, 400);

  const pub = env.WOMPI_PUBLIC_KEY;
  const secretoIntegridad = env.WOMPI_INTEGRITY_SECRET;
  if (!pub || !secretoIntegridad) return json({ error: "pasarela_no_configurada" }, 503);

  const amb = ambienteWompi(pub);
  const centavos = monto * 100;         // Wompi cobra en centavos
  const moneda = "COP";                 // Wompi liquida en COP; el USD del sitio es solo referencia visual

  /* --- guía + intención --- */
  const guia = await siguienteGuia(env, new Date().getUTCFullYear());

  await env.DB.prepare(
    "INSERT INTO aportes (guia, estado, monto_centavos, moneda, modo, destino_id, proyecto, " +
    "frecuencia, quiere_certificado, consent_muro, nota) " +
    "VALUES (?, 'intencion', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(guia, centavos, moneda, modo, destino, proyecto, frecuencia, certificado, muro, nota).run();

  /* --- firma de integridad ---
     Orden verificado contra el ejemplo de la documentación:
     SHA-256(reference + amount-in-cents + currency + integrity-secret).
     Se omite `expiration-time` a propósito: es opcional y añadirlo mete la
     fecha en la cadena firmada, un punto de fallo más en la primera versión. */
  const firma = await sha256Hex(guia + centavos + moneda + secretoIntegridad);

  const p = new URLSearchParams();
  p.set("public-key", pub);
  p.set("currency", moneda);
  p.set("amount-in-cents", String(centavos));
  p.set("reference", guia);
  p.set("signature:integrity", firma);
  /* El destino de vuelta sigue el origen de la petición, no una constante: así
     el ciclo completo se puede probar en local contra el sandbox. En producción
     `url.origin` ES el dominio del sitio, porque el Worker solo lo sirve a él. */
  p.set("redirect-url", url.origin + "/gracias");

  return json({ guia, url: amb.checkout + "?" + p.toString(), modo: amb.modo });
}

/* ========================================================================
   POST /api/wompi/eventos   — el webhook
   Valida el checksum, es idempotente, y solo entonces mueve el aporte.
   ======================================================================== */

async function apiEventos(request, env) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  const crudo = await request.text();
  let ev;
  try { ev = JSON.parse(crudo); }
  catch { return json({ error: "json_invalido" }, 400); }

  const secreto = env.WOMPI_EVENTS_SECRET;
  if (!secreto) return json({ error: "eventos_no_configurados" }, 503);

  const firma = ev.signature || {};
  const props = Array.isArray(firma.properties) ? firma.properties : [];
  const tx = (ev.data && ev.data.transaction) || {};

  /* Checksum: valores de signature.properties en ORDEN, luego el timestamp,
     luego el secreto de eventos. Las propiedades vienen como rutas con punto
     ("transaction.status"), así que se resuelven sobre ev.data. */
  const valorDe = (ruta) => String(
    ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ev.data) ?? ""
  );
  const cadena = props.map(valorDe).join("") + String(firma.timestamp ?? "") + secreto;
  const calculado = await sha256Hex(cadena);
  const valida = igualesSeguro(calculado.toLowerCase(), String(firma.checksum || "").toLowerCase());

  /* Un evento con firma inválida NO viene de Wompi. Se deja constancia y se
     rechaza: responder 200 sería confirmarle a un atacante que lo aceptamos. */
  if (!valida) {
    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO eventos_wompi (transaction_id, evento, estado, guia, checksum, " +
        "firma_valida, timestamp_wompi, cuerpo) VALUES (?,?,?,?,?,0,?,?)"
      ).bind(
        String(tx.id || "sin-id"), String(ev.event || "?"), String(tx.status || "?"),
        tx.reference ? String(tx.reference) : null, String(firma.checksum || ""),
        firma.timestamp ?? null, crudo.slice(0, 8000)
      ).run();
    } catch { /* la bitácora no debe tapar la respuesta */ }
    return json({ error: "firma_invalida" }, 401);
  }

  const txId   = String(tx.id || "");
  const estado = String(tx.status || "");
  const guia   = tx.reference ? String(tx.reference) : null;
  if (!txId || !estado) return json({ error: "evento_incompleto" }, 400);

  /* Idempotencia: UNIQUE(transaction_id, estado). El mismo evento puede llegar
     hasta cuatro veces (reintentos a los 30 min, 3 h y 24 h). Si ya estaba,
     `changes` es 0 y no se vuelve a procesar. */
  const ins = await env.DB.prepare(
    "INSERT OR IGNORE INTO eventos_wompi (transaction_id, evento, estado, guia, checksum, " +
    "firma_valida, timestamp_wompi, cuerpo) VALUES (?,?,?,?,?,1,?,?)"
  ).bind(
    txId, String(ev.event || "transaction.updated"), estado, guia,
    String(firma.checksum || ""), firma.timestamp ?? null, crudo.slice(0, 8000)
  ).run();

  const yaProcesado = !ins.meta || ins.meta.changes === 0;
  if (yaProcesado) return json({ ok: true, repetido: true });

  if (guia) await aplicarEstado(env, guia, tx, estado);

  return json({ ok: true });
}

/* Traduce el estado de Wompi al del aporte y detecta manipulación del monto. */
async function aplicarEstado(env, guia, tx, estado) {
  const fila = await env.DB.prepare(
    "SELECT guia, monto_centavos, estado FROM aportes WHERE guia = ?"
  ).bind(guia).first();

  /* Referencia que no conocemos: se queda en la bitácora y no se inventa nada. */
  if (!fila) return;

  /* El monto que confirma Wompi tiene que ser el que guardamos ANTES de
     redirigir. Si no coincide, alguien tocó la URL: no se aprueba. */
  const montoWompi = Number(tx.amount_in_cents);
  if (Number.isFinite(montoWompi) && montoWompi !== Number(fila.monto_centavos)) {
    await env.DB.prepare(
      "UPDATE aportes SET estado='error', wompi_estado=?, wompi_transaction_id=?, " +
      "actualizada_en=datetime('now') WHERE guia=?"
    ).bind("MONTO_NO_COINCIDE:" + estado, String(tx.id || ""), guia).run();
    return;
  }

  const mapa = {
    APPROVED: "aprobada",
    DECLINED: "rechazada",
    VOIDED:   "rechazada",
    ERROR:    "error",
    PENDING:  "pendiente"
  };
  const nuevo = mapa[estado] || "pendiente";

  /* Un aporte ya entregado no vuelve atrás por un webhook tardío. */
  if (["en_distribucion", "entregada"].includes(fila.estado)) return;

  const donanteId = await guardarDonante(env, tx);

  await env.DB.prepare(
    "UPDATE aportes SET estado=?, wompi_estado=?, wompi_transaction_id=?, metodo_pago=?, " +
    "donante_id=COALESCE(?, donante_id), aprobada_en=CASE WHEN ?='aprobada' THEN datetime('now') ELSE aprobada_en END, " +
    "actualizada_en=datetime('now') WHERE guia=?"
  ).bind(
    nuevo, estado, String(tx.id || ""), tx.payment_method_type ? String(tx.payment_method_type) : null,
    donanteId, nuevo, guia
  ).run();
}

/* Los datos personales entran SOLO aquí (Ley 1581). Nunca el medio de pago:
   eso queda tokenizado en Wompi y no tiene por qué salir de allá. */
async function guardarDonante(env, tx) {
  const email = tx.customer_email ? String(tx.customer_email).slice(0, 200) : null;
  if (!email) return null;
  const d = tx.customer_data || {};
  await env.DB.prepare(
    "INSERT INTO donantes (email, nombre, telefono, doc_tipo, doc_numero) VALUES (?,?,?,?,?) " +
    "ON CONFLICT(email) DO UPDATE SET " +
    "nombre=COALESCE(excluded.nombre, nombre), telefono=COALESCE(excluded.telefono, telefono), " +
    "doc_tipo=COALESCE(excluded.doc_tipo, doc_tipo), doc_numero=COALESCE(excluded.doc_numero, doc_numero), " +
    "actualizado_en=datetime('now')"
  ).bind(
    email,
    d.full_name ? String(d.full_name).slice(0, 200) : null,
    d.phone_number ? String(d.phone_number).slice(0, 40) : null,
    d.legal_id_type ? String(d.legal_id_type).slice(0, 10) : null,
    d.legal_id ? String(d.legal_id).slice(0, 40) : null
  ).run();
  const f = await env.DB.prepare("SELECT id FROM donantes WHERE email=?").bind(email).first();
  return f ? f.id : null;
}

/* ========================================================================
   GET /api/aporte/<guia>
   Estado para la página de gracias y para #rastrea. Devuelve SOLO lo que
   puede ser público: ni correo, ni nombre, ni documento, ni id de Wompi.
   ======================================================================== */

async function apiAporte(env, guia) {
  const g = String(guia || "").toUpperCase();
  if (!/^GG-\d{4}-\d{6}$/.test(g)) return json({ error: "guia_invalida" }, 400);

  const f = await env.DB.prepare(
    "SELECT guia, estado, monto_centavos, moneda, modo, destino_id, proyecto, frecuencia, creada_en, aprobada_en " +
    "FROM aportes WHERE guia = ?"
  ).bind(g).first();

  if (!f) return json({ error: "no_encontrada" }, 404);
  return json({
    guia: f.guia, estado: f.estado, monto_centavos: f.monto_centavos, moneda: f.moneda,
    modo: f.modo, destino: f.destino_id, proyecto: f.proyecto, frecuencia: f.frecuencia,
    creada_en: f.creada_en, aprobada_en: f.aprobada_en
  });
}

/* ========================================================================
   /f/<id> — página de compartir (sin cambios de comportamiento)
   ======================================================================== */

function sharePage(p) {
  const pr = p.profile || {};
  const title = p.name + " · Give&Grow International";
  let desc = (pr.about && pr.about.es) || "";
  if (desc.length > 155) desc = desc.slice(0, 152).replace(/\s+\S*$/, "") + "…";
  const consent = p.consent || {};
  const showLogo = p.logo && consent.logo === true;
  const img = showLogo ? ORIGIN + p.logo : ORIGIN + "/img/og.jpg";
  const url = ORIGIN + "/f/" + p.id;
  const spa = "/#fundacion/" + p.id;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Give&amp;Grow International">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:locale" content="es_CO">
<meta name="twitter:card" content="summary">
<meta name="twitter:image" content="${esc(img)}">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0;url=${esc(spa)}">
</head>
<body>
<p><a href="${esc(spa)}">${esc(p.name)} — Give&amp;Grow International</a></p>
</body>
</html>`;
}

async function rutaCompartir(env, url, id) {
  try {
    const r = await env.ASSETS.fetch(new URL("/data/partners.json", url.origin));
    const j = await r.json();
    const p = (j.partners || []).find(
      (x) => x.id === id && x.type === "foundation" && (!x.consent || x.consent.name !== false)
    );
    if (p) {
      return new Response(sharePage(p), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=3600",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin"
        }
      });
    }
  } catch (e) { /* cae al redirect */ }
  return Response.redirect(url.origin + "/#hub", 302);
}

/* ========================================================================
   Router
   ======================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ruta = url.pathname;

    const compartir = ruta.match(/^\/f\/([a-z0-9-]+)\/?$/);
    if (compartir) return rutaCompartir(env, url, compartir[1]);

    if (ruta.startsWith("/api/")) {
      if (!env.DB) return json({ error: "base_no_configurada" }, 503);
      try {
        if (ruta === "/api/checkout")       return await apiCheckout(request, env, url);
        if (ruta === "/api/wompi/eventos")  return await apiEventos(request, env);
        const aporte = ruta.match(/^\/api\/aporte\/([A-Za-z0-9-]+)$/);
        if (aporte)                         return await apiAporte(env, aporte[1]);
        return json({ error: "no_encontrado" }, 404);
      } catch (e) {
        /* Nunca se filtra el detalle interno al cliente. */
        console.error("api", ruta, e && e.message);
        return json({ error: "error_interno" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
