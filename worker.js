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
   Autenticación del panel: JWT de Cloudflare Access
   ========================================================================
   El panel muestra datos personales de donantes (nombre, correo, documento),
   así que aquí NO se improvisa autenticación.

   Y no basta con comprobar que la cabecera `Cf-Access-Jwt-Assertion` exista:
   si Access no estuviera configurado delante del Worker, cualquiera podría
   mandarla a mano y entrar. Hay que VERIFICAR la firma contra las llaves
   públicas del equipo y comprobar el `aud` de la aplicación.

   Fail-closed: sin ACCESS_TEAM_DOMAIN y ACCESS_AUD configurados, el panel
   responde 503 y no sirve un solo dato.
   ======================================================================== */

let ACCESS_CERTS = { hasta: 0, llaves: null };

function b64urlABytes(s) {
  const b64 = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlAJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlABytes(s)));
}

async function llavesAccess(team) {
  const ahora = Date.now();
  if (ACCESS_CERTS.llaves && ACCESS_CERTS.hasta > ahora) return ACCESS_CERTS.llaves;
  const r = await fetch("https://" + team + "/cdn-cgi/access/certs");
  if (!r.ok) throw new Error("certs de Access no disponibles: " + r.status);
  const j = await r.json();
  ACCESS_CERTS = { llaves: j.keys || [], hasta: ahora + 60 * 60 * 1000 };  // 1 h
  return ACCESS_CERTS.llaves;
}

async function verificarAccess(request, env) {
  const team = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!team || !aud) return { ok: false, motivo: "no_configurado" };

  /* Access manda el JWT en la cabecera y, en navegación normal, también en la
     cookie CF_Authorization. Se acepta cualquiera de las dos. */
  let jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) {
    const cookies = request.headers.get("cookie") || "";
    const m = cookies.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    if (m) jwt = m[1];
  }
  if (!jwt) return { ok: false, motivo: "sin_token" };

  const partes = jwt.split(".");
  if (partes.length !== 3) return { ok: false, motivo: "token_malformado" };

  let cabecera, carga;
  try {
    cabecera = b64urlAJson(partes[0]);
    carga = b64urlAJson(partes[1]);
  } catch { return { ok: false, motivo: "token_ilegible" }; }

  try {
    const llaves = await llavesAccess(team);
    const jwk = llaves.find((k) => k.kid === cabecera.kid);
    if (!jwk) return { ok: false, motivo: "kid_desconocido" };

    const llave = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    const firmado = new TextEncoder().encode(partes[0] + "." + partes[1]);
    const valida = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", llave, b64urlABytes(partes[2]), firmado
    );
    if (!valida) return { ok: false, motivo: "firma_invalida" };
  } catch (e) {
    return { ok: false, motivo: "error_verificando" };
  }

  /* Comprobaciones de contenido: sin estas, un token válido de OTRA aplicación
     de Access del mismo equipo serviría para entrar aquí. */
  const auds = Array.isArray(carga.aud) ? carga.aud : [carga.aud];
  if (!auds.includes(aud)) return { ok: false, motivo: "aud_no_coincide" };
  if (carga.iss !== "https://" + team) return { ok: false, motivo: "emisor_no_coincide" };
  const ahora = Math.floor(Date.now() / 1000);
  if (carga.exp && carga.exp < ahora) return { ok: false, motivo: "token_expirado" };
  if (carga.nbf && carga.nbf > ahora + 60) return { ok: false, motivo: "token_futuro" };

  return { ok: true, email: carga.email || carga.sub || "?" };
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
  /* Único momento en que sabemos con certeza en qué idioma está el donante.
     Wompi no lo entrega, así que sin esto el correo saldría siempre en español. */
  const idioma     = cuerpo.idioma === "en" ? "en" : "es";

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
    "frecuencia, quiere_certificado, consent_muro, nota, idioma) " +
    "VALUES (?, 'intencion', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(guia, centavos, moneda, modo, destino, proyecto, frecuencia, certificado, muro, nota, idioma).run();

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
  /* Destino de vuelta. OJO — verificado el 10 ago 2026 contra el sandbox:
     Wompi responde 403 (CloudFront «Request blocked») si `redirect-url` apunta a
     http://localhost. Todas las demás combinaciones dan 200, incluido el mismo
     checkout sin redirect-url. Así que el origen de la petición solo se usa
     cuando es un https público; en local se cae al dominio de producción, que
     produce un checkout válido aunque el retorno aterrice en el sitio real.
     Un intento anterior de usar `url.origin` siempre rompía el pago en local. */
  const publico = url.protocol === "https:" && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);
  p.set("redirect-url", (publico ? url.origin : ORIGIN) + "/gracias");

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
     ("transaction.status"), así que se resuelven sobre ev.data.

     OJO — EL TIMESTAMP VA EN LA RAÍZ DEL EVENTO, NO DENTRO DE `signature`.
     La documentación de Wompi muestra el ejemplo con `signature.timestamp`, y
     eso está mal: el evento real trae `timestamp` al mismo nivel que `event`,
     `data` y `signature`. Leerlo del lugar documentado da undefined, la cadena
     se firma sin timestamp y TODOS los webhooks legítimos se rechazan.
     Comprobado el 11 ago 2026 con un pago real en sandbox
     (tx 12129016-1786413420-91097): con el timestamp de la raíz el checksum
     reproduce exactamente el de Wompi; sin él, no.
     Se lee la raíz primero y se cae a signature.timestamp por si algún día
     cambian al formato que documentan. */
  const ts = ev.timestamp ?? firma.timestamp ?? "";
  const valorDe = (ruta) => String(
    ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ev.data) ?? ""
  );
  const cadena = props.map(valorDe).join("") + String(ts) + secreto;
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
        (ts === "" ? null : ts), crudo.slice(0, 8000)
      ).run();
    } catch { /* la bitácora no debe tapar la respuesta */ }
    return json({ error: "firma_invalida" }, 401);
  }

  const txId   = String(tx.id || "");
  const estado = String(tx.status || "");
  const guia   = tx.reference ? String(tx.reference) : null;
  if (!txId || !estado) return json({ error: "evento_incompleto" }, 400);

  /* Idempotencia: UNIQUE(transaction_id, estado). El mismo evento puede llegar
     hasta cuatro veces (reintentos a los 30 min, 3 h y 24 h).

     OJO — la condición es "ya lo PROCESÉ", no "ya lo VI". Son distintas, y la
     diferencia costó un pago real: el evento del pago de prueba se registró con
     firma_valida=0 cuando lo rechazábamos por el bug del timestamp, y al
     corregir el bug su reintento se descartaba como duplicado, dejando el aporte
     en `intencion` para siempre. Un evento visto pero NO procesado —firma
     inválida, o un fallo a mitad de camino— tiene que poder procesarse cuando la
     causa se arregle. Si no, cualquier bug transitorio en la validación se
     convierte en una donación perdida en silencio. */
  const ins = await env.DB.prepare(
    "INSERT OR IGNORE INTO eventos_wompi (transaction_id, evento, estado, guia, checksum, " +
    "firma_valida, timestamp_wompi, cuerpo, procesado) VALUES (?,?,?,?,?,1,?,?,0)"
  ).bind(
    txId, String(ev.event || "transaction.updated"), estado, guia,
    String(firma.checksum || ""), (ts === "" ? null : ts), crudo.slice(0, 8000)
  ).run();

  let idEvento = ins.meta ? ins.meta.last_row_id : null;
  const eraNuevo = ins.meta && ins.meta.changes > 0;

  if (!eraNuevo) {
    const prev = await env.DB.prepare(
      "SELECT id, procesado FROM eventos_wompi WHERE transaction_id = ? AND estado = ?"
    ).bind(txId, estado).first();
    if (prev && prev.procesado) return json({ ok: true, repetido: true });
    if (!prev) return json({ ok: true, repetido: true });   // no debería pasar
    /* Estaba registrado pero sin procesar: se actualiza con los datos buenos y
       se procesa ahora. */
    idEvento = prev.id;
    await env.DB.prepare(
      "UPDATE eventos_wompi SET firma_valida=1, checksum=?, timestamp_wompi=?, cuerpo=?, guia=? WHERE id=?"
    ).bind(String(firma.checksum || ""), (ts === "" ? null : ts), crudo.slice(0, 8000), guia, idEvento).run();
  }

  if (guia) await aplicarEstado(env, guia, tx, estado);

  /* Se marca procesado SOLO después de mover el aporte. Si algo falla arriba, el
     reintento de Wompi vuelve a entrar por la rama de "visto pero no procesado". */
  if (idEvento) {
    await env.DB.prepare("UPDATE eventos_wompi SET procesado = 1 WHERE id = ?").bind(idEvento).run();
  }

  return json({ ok: true });
}

/* ========================================================================
   Correo transaccional
   ========================================================================
   Sale de un SUBDOMINIO propio (notificaciones.…) y no del dominio principal.
   Dos razones:

   1. El dominio principal tiene el SPF roto (su `include` resuelve vacío), no
      publica DKIM y su DMARC está en `p=reject`. Con un subdominio autenticado
      por su cuenta, el correo transaccional pasa aunque el principal siga mal.
   2. Separa reputaciones: un problema con el correo automático no arrastra al
      correo humano de la fundación, ni al contrario.

   REGLA DURA: el correo NUNCA puede tumbar el cobro. Si falta la llave, si
   Resend responde error o si se cae la red, se registra y se sigue. Un donante
   que pagó tiene que quedar aprobado aunque su correo no salga; lo contrario
   —perder el pago por un fallo de correo— es indefendible.
   ======================================================================== */

const CORREO_DESDE_DEF = "Give&Grow International <no-responder@notificaciones.thegiveandgrowproject.org>";

async function enviarCorreo(env, { para, asunto, texto, html, etiqueta }) {
  const llave = env.RESEND_API_KEY;
  const desde = env.CORREO_DESDE || CORREO_DESDE_DEF;

  /* Sin credencial no se falla: se simula y se deja constancia. Así la capa de
     correo se puede construir y probar antes de que exista la cuenta. */
  if (!llave) {
    console.log("correo simulado", etiqueta || "", "->", para, "|", asunto);
    return { ok: true, simulado: true };
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + llave, "content-type": "application/json" },
      body: JSON.stringify({ from: desde, to: [para], subject: asunto, text: texto, html })
    });
    if (!r.ok) {
      console.error("correo falló", etiqueta || "", r.status, (await r.text()).slice(0, 300));
      return { ok: false, http: r.status };
    }
    /* Registrar también el ÉXITO, con el id que devuelve Resend. Sin esto, la
       ausencia de errores era la única señal de que un correo salió — y "no veo
       errores" no es lo mismo que "sé que se envió". Con el id se puede buscar
       el envío en los registros de Resend y responderle a un donante que dice
       no haber recibido nada. */
    let id = null;
    try { id = (await r.json()).id || null; } catch (e) { /* da igual */ }
    console.log("correo enviado", etiqueta || "", "->", para, "| id:", id);
    return { ok: true, id };
  } catch (e) {
    console.error("correo excepción", etiqueta || "", e && e.message);
    return { ok: false, error: String(e && e.message) };
  }
}

function fmtPesos(centavos) {
  const pesos = Math.round(Number(centavos || 0) / 100);
  return "$" + pesos.toLocaleString("es-CO");
}

/* Envoltura sobria, sin imágenes ni columnas: un correo institucional que se lee
   igual en cualquier cliente y no se rompe si se bloquean las imágenes. */
function plantillaCorreo({ titulo, parrafos, filas, cierre }) {
  const p = (parrafos || []).map((x) =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3A3F45">${esc(x)}</p>`).join("");
  const f = (filas || []).map(([k, v]) =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #DAD3C3;font-size:14px;color:#5C636F">${esc(k)}</td>` +
    `<td style="padding:9px 0;border-bottom:1px solid #DAD3C3;font-size:14px;font-weight:600;color:#1A1D21;text-align:right">${esc(v)}</td></tr>`
  ).join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F3EFE6">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FBF8F1;border:1px solid #DAD3C3;border-radius:14px">
<tr><td style="padding:28px 30px">
<div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1F5C38;margin-bottom:10px">Give&amp;Grow International</div>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#1A1D21">${esc(titulo)}</h1>
${p}
${f ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0">${f}</table>` : ""}
${cierre ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#5C636F">${esc(cierre)}</p>` : ""}
<p style="margin:22px 0 0;font-size:12px;color:#5C636F">Fundación Give&amp;Grow International · NIT 901.948.930-2 · Medellín, Colombia</p>
</td></tr></table></body></html>`;
}

/* Confirmación al donante: lo único que de verdad necesita conservar es su
   número de guía, así que el correo existe sobre todo para dárselo por escrito.
   Antes de esto, quien cerraba la página de gracias lo perdía. */
async function correoAporteAprobado(env, aporte, email, nombre) {
  if (!email) return { ok: true, sinCorreo: true };
  const en = aporte.idioma === "en";
  const guia = aporte.guia;
  const enlace = ORIGIN + "/#rastrea";
  const monto = fmtPesos(aporte.monto_centavos) + " COP";

  const asunto = en
    ? `Your gift is confirmed · ${guia}`
    : `Tu aporte quedó confirmado · ${guia}`;

  const titulo = en ? "Confirmado. Gracias." : "Confirmado. Gracias.";
  const parrafos = en ? [
    "Your payment was confirmed and your gift is now recorded with its own tracking number.",
    "Keep that number: with it you can follow your gift from start to finish, and the delivery record will appear there once the partner foundation delivers.",
    "The work on the ground belongs to the partner foundation. We amplify it, record it and report it."
  ] : [
    "Tu pago quedó confirmado y tu aporte está registrado con su propio número de guía.",
    "Guarda ese número: con él puedes seguir tu aporte de principio a fin, y ahí aparecerá el acta cuando la fundación aliada haga la entrega.",
    "El trabajo en territorio es de la fundación aliada. Nosotros lo amplificamos, lo registramos y lo reportamos."
  ];
  const filas = en
    ? [["Tracking number", guia], ["Amount", monto], ["Follow it at", enlace]]
    : [["Número de guía", guia], ["Monto", monto], ["Síguelo en", enlace]];

  const cierre = en
    ? "This message is automatic. If you asked for a donation certificate, we will send it separately once it is reviewed."
    : "Este mensaje es automático. Si pediste certificado de donación, te lo enviamos aparte cuando quede revisado.";

  return enviarCorreo(env, {
    para: email,
    asunto,
    texto: [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n"), "", cierre].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas, cierre }),
    etiqueta: "aporte-aprobado"
  });
}

/* Aviso interno. Va a un buzón que hoy sí recibe (Gmail), porque el dominio
   principal rebota por su propio DMARC — ver ops/aliados-formulario.gs. */
async function correoAvisoInterno(env, aporte, email, nombre) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const titulo = "Nuevo aporte confirmado: " + aporte.guia;
  const filas = [
    ["Guía", aporte.guia],
    ["Monto", fmtPesos(aporte.monto_centavos) + " COP"],
    ["Destino", aporte.modo === "dirigida" ? (aporte.destino_id || "?") : "Fondo general"],
    ["Frecuencia", { unico: "Único", mensual: "Mensual", anual: "Anual" }[aporte.frecuencia] || aporte.frecuencia],
    ["Certificado", aporte.quiere_certificado ? "SÍ lo pidió" : "no"],
    ["Donante", nombre || "(sin nombre)"],
    ["Correo", email || "(sin correo)"]
  ];
  return enviarCorreo(env, {
    para,
    asunto: titulo,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n"),
    html: plantillaCorreo({
      titulo,
      parrafos: ["Aviso automático del sitio. El aporte ya quedó aprobado en la base."],
      filas
    }),
    etiqueta: "aviso-interno"
  });
}

/* Traduce el estado de Wompi al del aporte y detecta manipulación del monto. */
async function aplicarEstado(env, guia, tx, estado) {
  const fila = await env.DB.prepare(
    "SELECT guia, monto_centavos, estado, idioma, modo, destino_id, frecuencia, " +
    "quiere_certificado, aprobada_en FROM aportes WHERE guia = ?"
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

  /* Correo solo al aprobar, y solo la PRIMERA vez. `aprobada_en` es el candado:
     si ya tenía fecha de aprobación, este webhook es un reintento o un evento
     tardío y el donante ya recibió su guía. Sin ese candado, los tres reintentos
     de Wompi se convertirían en tres correos idénticos.

     Va envuelto en try/catch porque el correo NO puede tumbar el cobro: si algo
     falla aquí, el aporte ya quedó aprobado arriba y eso es lo que importa. El
     fallo queda en el log del Worker. */
  if (nuevo === "aprobada" && !fila.aprobada_en) {
    try {
      const d = await env.DB.prepare(
        "SELECT d.email AS email, d.nombre AS nombre FROM aportes a " +
        "LEFT JOIN donantes d ON d.id = a.donante_id WHERE a.guia = ?"
      ).bind(guia).first();
      const datos = {
        guia,
        monto_centavos: fila.monto_centavos,
        idioma: fila.idioma,
        modo: fila.modo,
        destino_id: fila.destino_id,
        frecuencia: fila.frecuencia,
        quiere_certificado: fila.quiere_certificado
      };
      await correoAporteAprobado(env, datos, d && d.email, d && d.nombre);
      await correoAvisoInterno(env, datos, d && d.email, d && d.nombre);
    } catch (e) {
      console.error("correo tras aprobar", guia, e && e.message);
    }
  }
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
   GET /api/gracias?id=<id de transacción de Wompi>
   Al volver del checkout, Wompi solo trae SU id en la URL — no nuestra guía.
   Este endpoint traduce uno en otra, en tres intentos de menor a mayor costo.

   Importante: devuelve NUESTRO estado, no el de Wompi. La documentación es
   explícita en que la redirección no sirve para validar; la verdad la trae el
   webhook. Si el webhook aún no llegó, el aporte sigue en `intencion` y la
   página dirá que está confirmando — que es exactamente la verdad.
   ======================================================================== */

async function apiGracias(env, url) {
  const id = String(url.searchParams.get("id") || "").slice(0, 120);
  if (!id) return json({ error: "id_requerido" }, 400);

  /* 1 · el webhook ya lo asoció */
  let f = await env.DB.prepare("SELECT guia FROM aportes WHERE wompi_transaction_id = ?").bind(id).first();
  let guia = f ? f.guia : null;

  /* 2 · está en la bitácora aunque el aporte no se haya movido */
  if (!guia) {
    const ev = await env.DB.prepare(
      "SELECT guia FROM eventos_wompi WHERE transaction_id = ? AND guia IS NOT NULL LIMIT 1"
    ).bind(id).first();
    if (ev) guia = ev.guia;
  }

  /* 3 · preguntarle a Wompi por la referencia. Es el camino que la propia
         documentación recomienda para el retorno del checkout. */
  if (!guia) {
    const amb = ambienteWompi(env.WOMPI_PUBLIC_KEY);
    try {
      const r = await fetch(amb.api + "/transactions/" + encodeURIComponent(id), {
        headers: env.WOMPI_PRIVATE_KEY ? { authorization: "Bearer " + env.WOMPI_PRIVATE_KEY } : {}
      });
      if (r.ok) {
        const j = await r.json();
        const ref = j && j.data && j.data.reference;
        if (ref) guia = String(ref);
      }
    } catch (e) { /* si Wompi no responde, se cae al 404 y la página lo dice */ }
  }

  if (!guia) return json({ error: "no_resuelta" }, 404);
  return apiAporte(env, guia);
}

/* ========================================================================
   PANEL /admin
   ========================================================================
   Para dejar de operar desde el correo: ver los aportes, su estado y quién
   pidió certificado, y mover el ciclo en terreno.

   La página y su JS los sirve el WORKER, no los assets, por dos razones: quedan
   detrás de Access, y así el JS del panel no vive en el bundle público.
   ======================================================================== */

async function adminResumen(env) {
  const porEstado = await env.DB.prepare(
    "SELECT estado, COUNT(*) AS n, COALESCE(SUM(monto_centavos),0) AS centavos " +
    "FROM aportes GROUP BY estado"
  ).all();
  const cert = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM aportes WHERE quiere_certificado = 1 AND estado = 'aprobada'"
  ).first();
  const recurrentes = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM aportes WHERE frecuencia <> 'unico' AND estado = 'aprobada'"
  ).first();
  const inscripciones = await env.DB.prepare(
    "SELECT tipo, COUNT(*) AS n FROM inscripciones WHERE estado = 'nueva' GROUP BY tipo"
  ).all();
  return json({
    por_estado: porEstado.results || [],
    certificados_pendientes: cert ? cert.n : 0,
    esperando_recurrencia: recurrentes ? recurrentes.n : 0,
    inscripciones_nuevas: inscripciones.results || []
  });
}

async function adminAportes(env, url) {
  const estado = url.searchParams.get("estado");
  const limite = Math.min(Math.max(Number(url.searchParams.get("limite")) || 50, 1), 200);
  const where = estado ? " WHERE a.estado = ?" : "";
  const sql =
    "SELECT a.guia, a.estado, a.monto_centavos, a.moneda, a.modo, a.destino_id, a.frecuencia, " +
    "a.quiere_certificado, a.consent_muro, a.idioma, a.nota, a.metodo_pago, a.creada_en, " +
    "a.aprobada_en, a.entregada_en, d.nombre AS donante, d.email AS correo " +
    "FROM aportes a LEFT JOIN donantes d ON d.id = a.donante_id" + where +
    " ORDER BY a.creada_en DESC LIMIT " + limite;
  const q = estado ? env.DB.prepare(sql).bind(estado) : env.DB.prepare(sql);
  const r = await q.all();
  return json({ aportes: r.results || [] });
}

/* Solo se permiten los dos pasos que ocurren en terreno. Los estados de pago los
   mueve el webhook y nadie más: si el panel pudiera marcar "aprobada" a mano, la
   trazabilidad dejaría de significar algo. */
const ESTADOS_MANUALES = ["en_distribucion", "entregada"];

async function adminMoverEstado(request, env, guia, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let cuerpo;
  try { cuerpo = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const nuevo = String(cuerpo.estado || "");
  if (!ESTADOS_MANUALES.includes(nuevo)) {
    return json({ error: "estado_no_permitido", permitidos: ESTADOS_MANUALES }, 400);
  }

  const fila = await env.DB.prepare("SELECT guia, estado FROM aportes WHERE guia = ?").bind(guia).first();
  if (!fila) return json({ error: "no_encontrada" }, 404);

  /* Un aporte que no llegó a aprobarse no puede pasar a distribución: sería
     mover en terreno algo que nadie pagó. */
  if (!["aprobada", "en_distribucion", "entregada"].includes(fila.estado)) {
    return json({ error: "aporte_no_aprobado", estado: fila.estado }, 409);
  }

  await env.DB.prepare(
    "UPDATE aportes SET estado = ?, entregada_en = CASE WHEN ? = 'entregada' THEN datetime('now') ELSE entregada_en END, " +
    "actualizada_en = datetime('now') WHERE guia = ?"
  ).bind(nuevo, nuevo, guia).run();

  /* Queda rastro de quién lo movió: el panel es de una sola persona hoy, pero el
     día que sean dos, "quién marcó esta entrega" es la primera pregunta. */
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "aporte " + guia + ": " + fila.estado + " -> " + nuevo).run();

  return json({ ok: true, guia, estado: nuevo });
}

function paginaAdmin() {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Panel · Give&Grow</title>
<link rel="stylesheet" href="/styles.css">
</head><body>
<main class="page active"><section><div class="wrap">
<span class="ey">Interno</span>
<h1 class="h-sec" style="margin-bottom:6px">Panel de aportes</h1>
<p class="lead" id="quien" style="margin-bottom:26px">Cargando…</p>

<div id="resumen" class="eco-row" style="justify-content:flex-start;margin-bottom:26px"></div>

<div class="pay-tabs" role="group" aria-label="Filtrar por estado" style="margin-bottom:18px">
  <button type="button" class="pay-tab on" data-estado="">Todos</button>
  <button type="button" class="pay-tab" data-estado="aprobada">Aprobados</button>
  <button type="button" class="pay-tab" data-estado="intencion">Sin pagar</button>
  <button type="button" class="pay-tab" data-estado="en_distribucion">En distribución</button>
  <button type="button" class="pay-tab" data-estado="entregada">Entregados</button>
</div>

<div class="med-tw"><table class="med-tbl" id="tabla">
<thead><tr>
<th scope="col">Guía</th><th scope="col">Estado</th><th scope="col">Monto</th>
<th scope="col">Destino</th><th scope="col">Donante</th><th scope="col">Cert.</th>
<th scope="col">Creada</th><th scope="col">Acción</th>
</tr></thead><tbody id="filas"><tr><td colspan="8">Cargando…</td></tr></tbody>
</table></div>

<p class="mu" style="margin-top:18px;font-size:13px;max-width:70ch">Los estados de pago los mueve el webhook de Wompi, nunca este panel. Aquí solo se marca lo que ocurre en terreno: distribución y entrega.</p>
</div></section></main>
<script src="/admin.js"></script>
</body></html>`;
}

function adminJS() {
  return `"use strict";
var FILTRO = "";
function pesos(c){ return "$" + Math.round((c||0)/100).toLocaleString("es-CO"); }
function esc(s){ var d=document.createElement("div"); d.textContent = s==null?"":String(s); return d.innerHTML; }

function pintarResumen(d){
  var box = document.getElementById("resumen");
  var chips = [];
  (d.por_estado||[]).forEach(function(x){
    chips.push('<span class="eco-chip">' + esc(x.estado) + ': ' + x.n + ' · ' + pesos(x.centavos) + '</span>');
  });
  if (d.certificados_pendientes) chips.push('<span class="eco-chip">certificados por emitir: ' + d.certificados_pendientes + '</span>');
  if (d.esperando_recurrencia) chips.push('<span class="eco-chip">esperan débito automático: ' + d.esperando_recurrencia + '</span>');
  (d.inscripciones_nuevas||[]).forEach(function(x){
    chips.push('<span class="eco-chip">' + esc(x.tipo) + ' por revisar: ' + x.n + '</span>');
  });
  box.innerHTML = chips.join("") || '<span class="eco-chip">sin datos todavía</span>';
}

function accion(a){
  if (a.estado === "aprobada") return '<button class="copy" data-guia="' + esc(a.guia) + '" data-a="en_distribucion">A distribución</button>';
  if (a.estado === "en_distribucion") return '<button class="copy" data-guia="' + esc(a.guia) + '" data-a="entregada">Marcar entregada</button>';
  return "";
}

function pintarFilas(l){
  var tb = document.getElementById("filas");
  if (!l.length){ tb.innerHTML = '<tr><td colspan="8">Nada con ese filtro.</td></tr>'; return; }
  tb.innerHTML = l.map(function(a){
    return "<tr>" +
      "<td>" + esc(a.guia) + "</td>" +
      "<td>" + esc(a.estado) + "</td>" +
      "<td>" + pesos(a.monto_centavos) + "</td>" +
      "<td>" + esc(a.modo === "dirigida" ? (a.destino_id||"?") : "Fondo general") + "</td>" +
      "<td>" + esc(a.donante || "—") + (a.correo ? "<br><small>" + esc(a.correo) + "</small>" : "") + "</td>" +
      "<td>" + (a.quiere_certificado ? "sí" : "—") + "</td>" +
      "<td>" + esc((a.creada_en||"").slice(0,16)) + "</td>" +
      "<td>" + accion(a) + "</td>" +
    "</tr>";
  }).join("");
}

function cargar(){
  fetch("/api/admin/resumen").then(function(r){ return r.json(); }).then(pintarResumen);
  fetch("/api/admin/aportes?limite=100" + (FILTRO ? "&estado=" + encodeURIComponent(FILTRO) : ""))
    .then(function(r){ return r.json(); })
    .then(function(d){ pintarFilas(d.aportes || []); });
}

document.addEventListener("click", function(e){
  var t = e.target.closest("[data-estado]");
  if (t){
    document.querySelectorAll(".pay-tab").forEach(function(b){ b.classList.remove("on"); });
    t.classList.add("on"); FILTRO = t.getAttribute("data-estado"); cargar(); return;
  }
  var b = e.target.closest("[data-guia]");
  if (b){
    b.disabled = true; b.textContent = "…";
    fetch("/api/admin/aporte/" + encodeURIComponent(b.getAttribute("data-guia")) + "/estado", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ estado: b.getAttribute("data-a") })
    }).then(function(r){ return r.json(); }).then(function(){ cargar(); })
      .catch(function(){ b.disabled = false; b.textContent = "Reintentar"; });
  }
});

fetch("/api/admin/quien").then(function(r){ return r.json(); })
  .then(function(d){ document.getElementById("quien").textContent = "Sesión de " + (d.email || "?") + "."; })
  .catch(function(){});
cargar();
`;
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

/* El entorno de pruebas vive en un subdominio de workers.dev y es una copia
   completa del sitio. Sin esto sería contenido duplicado indexable compitiendo
   con el dominio real, así que se marca noindex en TODA respuesta de ahí.
   Producción, con su dominio propio, no se ve afectada. */
function marcarPruebas(respuesta, host) {
  if (!/\.workers\.dev$/i.test(host)) return respuesta;
  const r = new Response(respuesta.body, respuesta);
  r.headers.set("x-robots-tag", "noindex, nofollow");
  return r;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ruta = url.pathname;
    const esPruebas = /\.workers\.dev$/i.test(url.hostname);
    if (esPruebas) {
      /* Se responde a través del marcador para no repetirlo en cada rama. */
      return marcarPruebas(await this.ruteo(request, env, url, ruta), url.hostname);
    }
    return this.ruteo(request, env, url, ruta);
  },

  async ruteo(request, env, url, ruta) {

    const compartir = ruta.match(/^\/f\/([a-z0-9-]+)\/?$/);
    if (compartir) return rutaCompartir(env, url, compartir[1]);

    /* --- Panel interno: TODO detrás de Access, y fail-closed --- */
    if (ruta === "/admin" || ruta === "/admin.js" || ruta.startsWith("/api/admin/")) {
      if (!env.DB) return json({ error: "base_no_configurada" }, 503);

      const sesion = await verificarAccess(request, env);
      if (!sesion.ok) {
        /* Sin Access configurado no se sirve nada: 503 y una explicación, no un
           panel abierto. Con Access configurado pero token inválido, 403. */
        const noConfig = sesion.motivo === "no_configurado";
        const cuerpo = {
          error: noConfig ? "panel_no_configurado" : "no_autorizado",
          motivo: sesion.motivo,
          ayuda: noConfig ? "Falta configurar Cloudflare Access — ver ops/panel-admin.md" : undefined
        };
        if (ruta === "/admin") {
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Panel</title>" +
            "<body style='font-family:system-ui;max-width:34em;margin:12vh auto;padding:0 1.5em;line-height:1.6'>" +
            "<h1 style='font-size:1.3em'>" + (noConfig ? "El panel todavía no está configurado" : "No autorizado") + "</h1>" +
            "<p>" + (noConfig
              ? "Falta crear la aplicación de Cloudflare Access que protege esta ruta. Instrucciones en <code>ops/panel-admin.md</code>."
              : "Tu sesión no es válida para esta aplicación (" + esc(sesion.motivo) + ").") + "</p>",
            { status: noConfig ? 503 : 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
          );
        }
        return json(cuerpo, noConfig ? 503 : 403);
      }

      try {
        if (ruta === "/admin") {
          return new Response(paginaAdmin(), {
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" }
          });
        }
        if (ruta === "/admin.js") {
          return new Response(adminJS(), {
            headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }
          });
        }
        if (ruta === "/api/admin/quien")    return json({ email: sesion.email });
        if (ruta === "/api/admin/resumen")  return await adminResumen(env);
        if (ruta === "/api/admin/aportes")  return await adminAportes(env, url);
        const mv = ruta.match(/^\/api\/admin\/aporte\/([A-Za-z0-9-]+)\/estado$/);
        if (mv) return await adminMoverEstado(request, env, mv[1].toUpperCase(), sesion.email);
        return json({ error: "no_encontrado" }, 404);
      } catch (e) {
        console.error("admin", ruta, e && e.message);
        return json({ error: "error_interno" }, 500);
      }
    }

    if (ruta.startsWith("/api/")) {
      if (!env.DB) return json({ error: "base_no_configurada" }, 503);
      try {
        if (ruta === "/api/checkout")       return await apiCheckout(request, env, url);
        if (ruta === "/api/wompi/eventos")  return await apiEventos(request, env);
        if (ruta === "/api/gracias")        return await apiGracias(env, url);
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
