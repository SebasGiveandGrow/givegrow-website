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

   3. Los DOCUMENTOS (Fase 5). El recibo lo emite el sistema; el certificado de
      donación lo emite una PERSONA desde /admin, porque va firmado bajo la
      gravedad de juramento. El armado vive en documentos.js.
*/

import { recibo, certificado, informeTriage } from "./documentos.js";

const ORIGIN = "https://www.thegiveandgrowproject.org";

/* El origen del TRIAJE, que ya no es el mismo. Existe como constante aparte y
   no como un cambio de `ORIGIN` a propósito: `ORIGIN` lo usan el recibo, el
   carnet y las tarjetas de compartir, que son de la FUNDACIÓN. Tocarlo mandaría
   los recibos de donación al subdominio del triaje.

   Sin `www`: el subdominio responde en su nombre exacto. */
const ORIGIN_MMC = "https://miramicasa.thegiveandgrowproject.org";

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

/* `audsValidos` es una LISTA porque hay DOS aplicaciones de Access sobre el
   mismo dominio y NO son intercambiables:

     ACCESS_AUD          el panel  → donantes, aportes, comprobantes bancarios
     ACCESS_AUD_TRIAGE   el triage → casos de vivienda y sus fotos

   Un ingeniero voluntario recibe un token de la segunda. Si el guardián
   comparara contra un solo AUD, o los ingenieros no podrían entrar a lo suyo,
   o —peor— el mismo token les abriría el panel completo. Cada zona declara qué
   audiencias acepta, y el panel NUNCA acepta la del triage. */
async function verificarAccess(request, env, audsValidos) {
  const team = env.ACCESS_TEAM_DOMAIN;
  const aceptados = (audsValidos && audsValidos.length ? audsValidos : [env.ACCESS_AUD]).filter(Boolean);
  if (!team || !aceptados.length) return { ok: false, motivo: "no_configurado" };

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
  if (!auds.some((a) => aceptados.includes(a))) return { ok: false, motivo: "aud_no_coincide" };
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

/* Consecutivo propio para certificados: CD-YYYY-NNNNNN. Misma mecánica atómica
   que la guía, serie aparte — ver el porqué en migrations/0003_documentos.sql. */
async function siguienteCertificado(env, anio) {
  const { results } = await env.DB.prepare(
    "INSERT INTO numerador_cert (anio, ultimo) VALUES (?, 1) " +
    "ON CONFLICT(anio) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo"
  ).bind(anio).all();
  const n = results && results[0] ? results[0].ultimo : null;
  if (!n) throw new Error("numerador de certificados no devolvió consecutivo");
  return "CD-" + anio + "-" + String(n).padStart(6, "0");
}

/* Consecutivo de actas de entrega: AE-YYYY-NNNNNN. */
async function siguienteActa(env, anio) {
  const { results } = await env.DB.prepare(
    "INSERT INTO numerador_acta (anio, ultimo) VALUES (?, 1) " +
    "ON CONFLICT(anio) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo"
  ).bind(anio).all();
  const n = results && results[0] ? results[0].ultimo : null;
  if (!n) throw new Error("numerador de actas no devolvió consecutivo");
  return "AE-" + anio + "-" + String(n).padStart(6, "0");
}

/* Token de 128 bits para el enlace del recibo. La guía es consecutiva y por lo
   tanto adivinable; el recibo lleva nombre y dedicatoria, así que no puede
   depender solo de ella. */
function tokenNuevo() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
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
  /* `quiereCert` y no `certificado`: ese nombre ya es el de la función que arma
     el PDF, importada arriba, y sombrearla dentro de esta función es pedir un
     error el día que alguien la invoque aquí. */
  const quiereCert = cuerpo.certificado ? 1 : 0;
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
    "frecuencia, quiere_certificado, consent_muro, nota, idioma, token) " +
    "VALUES (?, 'intencion', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(guia, centavos, moneda, modo, destino, proyecto, frecuencia, quiereCert, muro, nota, idioma, tokenNuevo()).run();

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

/* Anotar el intento en `correos`. Nunca lanza: el rastro no puede ser más
   importante que la operación que describe. Si la base falla, se registra en los
   logs y el correo sigue su camino — al revés, un donante perdería su recibo
   porque no se pudo escribir la bitácora del recibo, que es absurdo. */
async function anotarCorreo(env, fila) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "INSERT INTO correos (etiqueta, para, asunto, guia, resultado, proveedor_id, error) " +
      "VALUES (?,?,?,?,?,?,?)"
    ).bind(
      String(fila.etiqueta || "sin-etiqueta"), String(fila.para || "?"),
      fila.asunto ? String(fila.asunto).slice(0, 200) : null,
      fila.guia ? String(fila.guia) : null,
      fila.resultado, fila.proveedor_id || null,
      fila.error ? String(fila.error).slice(0, 300) : null
    ).run();
  } catch (e) {
    console.error("no se pudo anotar el correo", fila.etiqueta, e && e.message);
  }
}

async function enviarCorreo(env, { para, asunto, texto, html, etiqueta, adjuntos, guia }) {
  const llave = env.RESEND_API_KEY;
  const desde = env.CORREO_DESDE || CORREO_DESDE_DEF;
  const base = { etiqueta, para, asunto, guia };

  /* Sin credencial no se falla: se simula. Pero AHORA queda escrito como
     `simulado`, que es distinto de `enviado`: si esto aparece en producción,
     significa que no se envió nada y hay que configurar la llave. Antes esa
     diferencia solo existía en un console.log que nadie mira. */
  if (!llave) {
    console.log("correo simulado", etiqueta || "", "->", para, "|", asunto);
    await anotarCorreo(env, { ...base, resultado: "simulado" });
    return { ok: true, simulado: true };
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + llave, "content-type": "application/json" },
      body: JSON.stringify({
        from: desde, to: [para], subject: asunto, text: texto, html,
        ...(adjuntos && adjuntos.length ? { attachments: adjuntos } : {})
      })
    });
    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 300);
      console.error("correo falló", etiqueta || "", r.status, detalle);
      await anotarCorreo(env, { ...base, resultado: "fallo", error: "HTTP " + r.status + " · " + detalle });
      return { ok: false, http: r.status };
    }
    /* El ÉXITO también se anota, con el id que devuelve Resend. Sin esto, la
       ausencia de errores era la única señal de que un correo salió — y «no veo
       errores» no es lo mismo que «sé que se envió». Con el id se busca el envío
       en los registros de Resend y se le puede responder a un donante que dice
       no haber recibido nada. */
    let id = null;
    try { id = (await r.json()).id || null; } catch (e) { /* da igual */ }
    console.log("correo enviado", etiqueta || "", "->", para, "| id:", id);
    await anotarCorreo(env, { ...base, resultado: "enviado", proveedor_id: id });
    return { ok: true, id };
  } catch (e) {
    console.error("correo excepción", etiqueta || "", e && e.message);
    await anotarCorreo(env, { ...base, resultado: "fallo", error: String(e && e.message) });
    return { ok: false, error: String(e && e.message) };
  }
}

function fmtPesos(centavos) {
  const pesos = Math.round(Number(centavos || 0) / 100);
  return "$" + pesos.toLocaleString("es-CO");
}

/* Envoltura sobria, sin imágenes ni columnas: un correo institucional que se lee
   igual en cualquier cliente y no se rompe si se bloquean las imágenes. */
function plantillaCorreo({ titulo, parrafos, filas, cierre, boton }) {
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
${boton ? `<p style="margin:20px 0 0"><a href="${esc(boton.url)}" style="display:inline-block;background:#1F5C38;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px">${esc(boton.texto)}</a></p>` : ""}
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

  /* El recibo va como ENLACE y no como adjunto: este correo lo dispara el
     webhook de Wompi, y armar un PDF ahí dentro le sumaría trabajo a la ruta
     que debe responder rápido. El enlace, además, sirve para siempre: el
     donante que borra el correo puede volver por él. El certificado sí viaja
     adjunto, pero lo manda una persona y la latencia da igual. */
  const urlRecibo = aporte.token ? ORIGIN + "/api/recibo/" + guia + ".pdf?t=" + aporte.token : null;
  const boton = urlRecibo ? { url: urlRecibo, texto: en ? "Download your receipt" : "Descargar tu recibo" } : null;

  const cierre = en
    ? "This message is automatic. Your receipt is not the tax certificate: if you asked for a donation certificate, we send it separately once it is reviewed and signed."
    : "Este mensaje es automático. El recibo no es el certificado tributario: si pediste certificado de donación, te lo enviamos aparte cuando quede revisado y firmado.";

  const texto = [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n")];
  if (urlRecibo) texto.push("", (en ? "Your receipt: " : "Tu recibo: ") + urlRecibo);
  texto.push("", cierre);

  return enviarCorreo(env, {
    para: email,
    asunto,
    texto: texto.join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas, cierre, boton }),
    etiqueta: "aporte-aprobado", guia: aporte.guia
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
    "SELECT guia, monto_centavos, moneda, estado, idioma, modo, destino_id, proyecto, frecuencia, " +
    "nota, metodo_pago, quiere_certificado, aprobada_en, token, creada_en FROM aportes WHERE guia = ?"
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

  /* --- guardián de reversas -------------------------------------------------
     Va ANTES del corte de abajo, y esa posición es el punto entero: un aporte
     ya entregado no cambia de estado por un webhook tardío, pero si le
     devolvieron la plata al donante, su certificado dejó de tener respaldo
     igual. Justo el caso más grave es el que el corte se saltaba.

     El sistema NO anula: anular es un acto humano y lleva motivo. Marca el
     certificado, lo sella en el PDF y avisa. La decisión sigue siendo de una
     persona. */
  if (["rechazada", "error"].includes(nuevo) && fila.aprobada_en) {
    try { await revisarCertificadoPorReversa(env, guia, estado); }
    catch (e) { console.error("guardián de reversa", guia, e && e.message); }
  }

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

  /* Deja constancia de QUIÉN dio la certeza. Una transferencia también acaba en
     `aprobada`, y sin esto no habría forma de distinguir lo que confirmó la
     pasarela de lo que confirmó una persona. */
  await env.DB.prepare("UPDATE aportes SET confirmacion = 'wompi' WHERE guia = ? AND confirmacion IS NULL")
    .bind(guia).run();

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
        quiere_certificado: fila.quiere_certificado,
        token: fila.token
      };
      await correoAporteAprobado(env, datos, d && d.email, d && d.nombre);
      await correoAvisoInterno(env, datos, d && d.email, d && d.nombre);
      /* La membresía se crea o se renueva aquí, con el pago ya confirmado.
         Solo se avisa la primera vez: una renovación no necesita anunciarse. */
      const carnet = await carnetTrasAporte(env, Object.assign({}, datos, { destino_id: fila.destino_id }), donanteId);
      if (carnet && carnet.nuevo) await correoCarnet(env, d && d.email, d && d.nombre, carnet, fila.idioma);
    } catch (e) {
      console.error("correo tras aprobar", guia, e && e.message);
    }
  }
}

/* Marca en revisión el certificado de un aporte cuyo pago se cayó después de
   aprobarse — contracargo, reversa o anulación en la pasarela. Idempotente: si
   ya estaba en revisión no vuelve a avisar, porque Wompi reintenta sus eventos
   hasta cuatro veces y tres correos idénticos entrenan a ignorarlos. */
async function revisarCertificadoPorReversa(env, guia, estadoWompi) {
  const c = await env.DB.prepare(
    "SELECT numero, revision_en FROM certificados WHERE guia = ? AND anulado_en IS NULL"
  ).bind(guia).first();
  if (!c || c.revision_en) return;

  const motivo = "El pago pasó a " + estadoWompi + " en Wompi después de haberse aprobado.";
  await env.DB.prepare(
    "UPDATE certificados SET revision_en = datetime('now'), revision_motivo = ? WHERE numero = ?"
  ).bind(motivo, c.numero).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES ('sistema', 'auditoria', ?)"
  ).bind("certificado " + c.numero + " EN REVISIÓN: " + motivo).run();

  /* Esto no puede quedarse en un log que nadie mira: hay un certificado
     tributario circulando sin respaldo y alguien tiene que decidir qué hacer. */
  const para = env.CORREO_AVISOS;
  if (!para) return;
  const titulo = "Certificado sin respaldo: " + c.numero;
  const filas = [["Certificado", c.numero], ["Aporte", guia], ["Estado en Wompi", estadoWompi]];
  await enviarCorreo(env, {
    para,
    asunto: "ATENCIÓN · " + titulo,
    texto: [titulo, "", motivo, "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({
      titulo,
      parrafos: [
        motivo,
        "El certificado quedó marcado EN REVISIÓN: el PDF sale sellado y advierte que no sirve como soporte tributario.",
        "Decide en /admin si se anula. El sistema no lo anula solo, porque anular lleva motivo y es un acto tuyo."
      ],
      filas
    }),
    etiqueta: "certificado-sin-respaldo", guia
  });
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
   GET /api/recibo/<guia>.pdf?t=<token>
   ========================================================================
   El recibo de aporte, generado al vuelo. No se guarda: se puede reconstruir
   entero desde la base, y un PDF archivado es un dato personal más que
   custodiar sin necesidad.

   El token es obligatorio y se compara en tiempo constante. Sin él bastaría
   contar de GG-2026-000001 en adelante para cosechar nombres y dedicatorias.
   ======================================================================== */

/* Estados en los que el recibo tiene sentido. Una intención sin pagar no tiene
   nada que recibir. */
const ESTADOS_CON_RECIBO = ["aprobada", "en_distribucion", "entregada"];

async function apiRecibo(env, guia, token) {
  const g = String(guia || "").toUpperCase();
  if (!/^GG-\d{4}-\d{6}$/.test(g)) return json({ error: "guia_invalida" }, 400);
  if (!/^[a-f0-9]{32}$/.test(String(token || ""))) return json({ error: "token_invalido" }, 403);

  const a = await env.DB.prepare(
    "SELECT guia, estado, monto_centavos, moneda, modo, destino_id, proyecto, frecuencia, " +
    "nota, idioma, metodo_pago, creada_en, aprobada_en, token FROM aportes WHERE guia = ?"
  ).bind(g).first();

  /* Mismo 403 exista o no la guía: distinguirlos convertiría este endpoint en un
     oráculo para saber qué guías están emitidas. */
  if (!a || !a.token || !igualesSeguro(a.token, String(token))) {
    return json({ error: "no_autorizado" }, 403);
  }
  if (!ESTADOS_CON_RECIBO.includes(a.estado)) {
    return json({ error: "aporte_sin_confirmar", estado: a.estado }, 409);
  }

  const bytes = await recibo(a, new Date().toISOString().replace("T", " "));
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="recibo-' + g + '.pdf"',
      /* Privado y sin caché compartida: lleva datos personales. */
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
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
   POST /api/inscripcion
   La primera puerta de entrada propia del sitio. Hasta hoy, quien quería ser
   voluntario solo tenía un `mailto:` — y el botón "Quiero participar" de
   #voluntariado llevaba, por error, al formulario de EMPRESAS.

   El modelo de VOLUNTARIADO.md manda sobre la forma de este endpoint:
   · Tres niveles, y el nivel lo define EL TERRENO, no el oficio.
   · Dos protocolos con disparadores INDEPENDIENTES: el de cuidado lo dispara
     pisar el territorio; el de imagen lo dispara la cámara, en cualquier nivel.
     Por eso `captura` es una pregunta aparte del nivel y no se deduce de él:
     amarrarla al nivel dejaría fuera al voluntario de estructura que llega con
     el celular a documentar.
   ======================================================================== */

const NIVELES = ["hub", "estructura", "mixto"];

async function apiInscripcion(request, env, url) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  /* Honeypot: si el campo trampa viene lleno es un bot. Se responde ok para no
     enseñarle qué lo delató, y no se guarda nada. */
  if (c.web2) return json({ ok: true });

  /* Los otros CUATRO tipos entran por el mismo endpoint y a la misma tabla:
     comparten el honeypot, el consentimiento de Ley 1581 y el patrón de correo.
     `inscripciones.tipo` ya estaba pensado para varios tipos y `datos` guarda lo
     propio de cada uno — no hacía falta tabla nueva, y por lo tanto tampoco una
     migración más. Con estas, las CINCO puertas de entrada del sitio terminan
     en la misma base y en el mismo panel; ninguna en un tercero. */
  if (c.tipo === "especie")   return await apiOfrecimiento(env, c);
  if (c.tipo === "ingeniero") return await apiIngeniero(env, c);
  if (c.tipo === "empresa")   return await apiAliado(env, c);
  if (c.tipo === "fundacion") return await apiFundacion(env, c);

  const tipo = c.tipo === "voluntario" ? "voluntario" : null;
  if (!tipo) return json({ error: "tipo_no_soportado" }, 400);

  const limpio = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const nombre = limpio(c.nombre, 120);
  const email  = limpio(c.email, 200);
  const nivel  = NIVELES.includes(c.nivel) ? c.nivel : null;
  const oficio = limpio(c.oficio, 160);

  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);
  if (!nivel) return json({ error: "nivel_requerido", opciones: NIVELES }, 400);
  if (!oficio) return json({ error: "oficio_requerido" }, 400);
  /* Sin autorización de datos no se guarda NADA. Es Ley 1581, no una casilla
     decorativa: guardar primero y pedir permiso después invertiría el orden. */
  if (!c.autoriza_datos) return json({ error: "autorizacion_requerida" }, 400);

  const pisaTerritorio = nivel === "hub" || nivel === "mixto";
  const datos = {
    nivel,
    oficio,
    disponibilidad: limpio(c.disponibilidad, 280),
    mensaje: limpio(c.mensaje, 600),
    captura: !!c.captura,
    /* Se guardan los protocolos que quedan disparados, no para el voluntario
       sino para quien lo reciba: son la lista de lo que hay que cumplir antes. */
    protocolo_cuidado: pisaTerritorio,
    protocolo_imagen: !!c.captura,
    /* De dónde salió la inscripción. Sin esto, quien se ofrece para el acopio de
       la brigada llega indistinguible de quien se apunta al programa de todo el
       año, y son dos conversaciones distintas con dos urgencias distintas. */
    origen: limpio(c.origen, 60),
    idioma: c.idioma === "en" ? "en" : "es"
  };

  const ins = await env.DB.prepare(
    "INSERT INTO inscripciones (tipo, estado, nombre, email, telefono, ciudad, datos) " +
    "VALUES (?, 'nueva', ?, ?, ?, ?, ?)"
  ).bind(tipo, nombre, email, limpio(c.telefono, 40) || null, limpio(c.ciudad, 80) || null,
         JSON.stringify(datos)).run();

  /* El correo no puede tumbar la inscripción: si falla, la persona ya quedó
     registrada y eso es lo que importa. Misma regla que en los aportes. */
  try {
    await correoInscripcionVoluntario(env, { nombre, email, ...datos });
    await correoAvisoInscripcion(env, { nombre, email, telefono: limpio(c.telefono, 40), ...datos });
  } catch (e) {
    console.error("correo inscripción", e && e.message);
  }

  return json({ ok: true, id: ins.meta ? ins.meta.last_row_id : null });
}

/* Acuse al voluntario. El tono lo fija una decisión de marca que no se debe
   suavizar: la fundación NO es un filtro, es la anfitriona que conoce a su
   comunidad. Nada de "evaluaremos tu solicitud". */
async function correoInscripcionVoluntario(env, v) {
  const en = v.idioma === "en";
  const titulo = en ? "We got your details. Welcome." : "Recibimos tus datos. Bienvenido.";

  const nivelTexto = {
    hub:        en ? "In the field, alongside a partner foundation" : "En terreno, junto a una fundación aliada",
    estructura: en ? "In the structure, without setting foot in the field" : "En la estructura, sin pisar territorio",
    mixto:      en ? "Mixed: part structure, part field" : "Mixto: parte estructura, parte terreno"
  }[v.nivel];

  const parrafos = en ? [
    "Thank you for offering your time and your trade. Someone from Give&Grow will write to you to get to know you and to figure out together where you fit best.",
    v.protocolo_cuidado
      ? "Since you would be in the field, two things happen first: our own vetting, and the partner foundation's — they know their community and they decide when a visit adds something. And before any journey there is a Marco session, which is not a formality: it is the only moment we have to prepare."
      : "Your contribution happens outside the field, so it moves faster: we only need to get to know you and find where your trade fits.",
    v.protocolo_imagen
      ? "You told us you plan to photograph or record. That has its own protocol, and one rule that never bends: consent comes before the camera. The foundation and the families decide, never the person visiting."
      : "",
    "Nothing about this is charged, in either direction."
  ] : [
    "Gracias por ofrecer tu tiempo y tu oficio. Alguien de Give&Grow te escribe para conocerte y para ver juntos dónde encajas mejor.",
    v.protocolo_cuidado
      ? "Como estarías en terreno, primero pasan dos cosas: nuestra verificación y la de la fundación aliada — ellos conocen a su comunidad y deciden cuándo una visita suma. Y antes de cualquier jornada hay una sesión de Marco, que no es un trámite: es el único momento que tenemos para prepararnos."
      : "Tu aporte ocurre fuera del territorio, así que el camino es más corto: solo necesitamos conocerte y encontrar dónde encaja tu oficio.",
    v.protocolo_imagen
      ? "Nos dijiste que piensas fotografiar o grabar. Eso tiene su propio protocolo, y una regla que no se negocia: el consentimiento va primero que la cámara. Lo deciden la fundación y las familias, nunca quien visita."
      : "",
    "Nada de esto se cobra, en ninguna dirección."
  ];

  const filas = en
    ? [["How you want to take part", nivelTexto], ["Your trade", v.oficio]]
    : [["Cómo quieres participar", nivelTexto], ["Tu oficio", v.oficio]];

  return enviarCorreo(env, {
    para: v.email,
    asunto: en ? "Welcome to Give&Grow volunteering" : "Bienvenido al voluntariado de Give&Grow",
    texto: [titulo, "", ...parrafos.filter(Boolean), "", filas.map(([k, x]) => k + ": " + x).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos: parrafos.filter(Boolean), filas }),
    etiqueta: "inscripcion-voluntario"
  });
}

/* Aviso interno: lo que hay que saber para responderle, y los protocolos que
   quedaron disparados. */
async function correoAvisoInscripcion(env, v) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const nivel = { hub: "Con el HUB (terreno)", estructura: "Con Give&Grow (estructura)", mixto: "Mixto" }[v.nivel];
  const filas = [
    ["Nombre", v.nombre],
    ["Correo", v.email],
    ["Teléfono", v.telefono || "(no dejó)"],
    ...(v.origen ? [["Viene de", "la campaña " + v.origen + " — responder con esa urgencia"]] : []),
    ["Nivel", nivel],
    ["Oficio", v.oficio],
    ["Disponibilidad", v.disponibilidad || "(no dijo)"],
    ["Protocolo de cuidado", v.protocolo_cuidado ? "SÍ — pisa territorio, requiere doble verificación y Marco" : "no aplica"],
    ["Protocolo de imagen", v.protocolo_imagen ? "SÍ — va a fotografiar o grabar" : "no aplica"]
  ];
  return enviarCorreo(env, {
    para,
    asunto: "Nuevo voluntario: " + v.nombre,
    texto: filas.map(([k, x]) => k + ": " + x).join("\n") + (v.mensaje ? "\n\nMensaje:\n" + v.mensaje : ""),
    html: plantillaCorreo({
      titulo: "Nuevo voluntario: " + v.nombre,
      parrafos: v.mensaje ? ["Lo que escribió: «" + v.mensaje + "»"] : ["Sin mensaje."],
      filas,
      cierre: "Está en el panel, en inscripciones por revisar."
    }),
    etiqueta: "aviso-inscripcion"
  });
}

/* ========================================================================
   POSTULACIÓN DE INGENIEROS VOLUNTARIOS (triaje estructural)
   ========================================================================
   Hasta hoy la única forma de sumar un ingeniero era que alguien le pidiera el
   correo y lo pegara a mano en Cloudflare Access. No había dónde postularse, ni
   registro de quién es, ni de qué matrícula dijo tener.

   NO LLEVA TABLA NUEVA. Entra por `inscripciones` con `tipo = 'ingeniero'` y lo
   propio suyo —matrícula, especialidad, experiencia— en el JSON de `datos`. La
   0001 se diseñó así («cuatro tipos, una tabla») y la 0010 lo dejó escrito: el
   quinto tipo no exige migración. Y por lo tanto la bandeja «Quién quiere
   entrar» del panel ya sabe mostrarlo.

   APROBAR SIGUE SIENDO MANUAL, A PROPÓSITO. Hay que verificar que la matrícula
   exista en el registro público del COPNIA, y eso no se automatiza desde aquí:
   un ingeniero mal verificado firma un documento que una familia va a leer para
   decidir si sigue durmiendo en su casa. Aceptar en el panel significa
   «seguimos», y el acceso se da añadiendo el correo en Access — sin contraseña
   que guardar y sin cuenta que se filtre.

   SIN REGLA POR DOMINIO DE CORREO: Sebas confirmó que el ingeniero puede ser de
   universidad, de empresa o particular. Filtrar por dominio dejaría fuera justo
   al voluntario independiente. Cada uno se aprueba individualmente.
   ======================================================================== */

/* Provisionales, igual que las categorías de foto: la lista definitiva sale de
   la guía que están respondiendo los ingenieros. `otra` existe para no perder a
   quien no se reconozca en ninguna. */
const ESPECIALIDADES_ING = ["estructural", "civil", "geotecnia", "arquitectura", "otra"];

async function apiIngeniero(env, c) {
  const limpio = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const nombre    = limpio(c.nombre, 120);
  const email     = limpio(c.email, 200);
  const matricula = limpio(c.matricula, 60);
  const ciudad    = limpio(c.ciudad, 80);
  const esp = ESPECIALIDADES_ING.includes(c.especialidad) ? c.especialidad : null;

  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);
  /* La matrícula no se valida de forma aquí: el COPNIA tiene varios formatos
     históricos y rechazar por patrón dejaría fuera a un ingeniero real. Lo que
     no se puede es dejarla vacía — es lo que una persona va a ir a verificar. */
  if (!matricula) return json({ error: "matricula_requerida" }, 400);
  if (!esp) return json({ error: "especialidad_requerida", opciones: ESPECIALIDADES_ING }, 400);
  if (!ciudad) return json({ error: "ciudad_requerida" }, 400);

  /* Las dos casillas son condición para guardar, y no son la misma cosa.
     `acepta_triaje` es el corazón del proyecto: quien crea que va a dictaminar
     habitabilidad por fotos entendió mal y hay que decírselo ANTES, no después
     de que firme. `autoriza_datos` es Ley 1581. */
  if (!c.acepta_triaje) return json({ error: "alcance_requerido" }, 400);
  if (!c.autoriza_datos) return json({ error: "autorizacion_requerida" }, 400);

  const datos = {
    matricula,
    especialidad: esp,
    especialidad_otra: esp === "otra" ? limpio(c.especialidad_otra, 120) : "",
    experiencia: limpio(c.experiencia, 40),
    disponibilidad: limpio(c.disponibilidad, 200),
    mensaje: limpio(c.mensaje, 600),
    acepta_triaje: true,
    /* Se guarda que la matrícula está SIN verificar. El día que alguien la
       verifique, que quede claro que hasta entonces era un dato declarado por
       quien se postula, no un hecho comprobado. */
    matricula_verificada: false,
    idioma: c.idioma === "en" ? "en" : "es"
  };

  const ins = await env.DB.prepare(
    "INSERT INTO inscripciones (tipo, estado, nombre, email, telefono, ciudad, datos) " +
    "VALUES ('ingeniero', 'nueva', ?, ?, ?, ?, ?)"
  ).bind(nombre, email, limpio(c.telefono, 40) || null, ciudad, JSON.stringify(datos)).run();

  /* El correo no puede tumbar la postulación: si falla, la persona ya quedó
     registrada. Misma regla que en aportes, inscripciones y ofrecimientos. */
  try {
    await correoIngeniero(env, { nombre, email, ...datos });
    await correoAvisoIngeniero(env, { nombre, email, ciudad, telefono: limpio(c.telefono, 40), ...datos });
  } catch (e) {
    console.error("correo ingeniero", e && e.message);
  }

  return json({ ok: true, id: ins.meta ? ins.meta.last_row_id : null });
}

const ESP_ING_ES = { estructural: "Ingeniería estructural", civil: "Ingeniería civil",
  geotecnia: "Geotecnia", arquitectura: "Arquitectura", otra: "Otra" };
const ESP_ING_EN = { estructural: "Structural engineering", civil: "Civil engineering",
  geotecnia: "Geotechnics", arquitectura: "Architecture", otra: "Other" };

/* Acuse al ingeniero. Su trabajo es UNO: que no confunda postularse con tener
   acceso. Entre lo uno y lo otro hay una persona verificando su matrícula, y
   decirlo de frente es más respetuoso que un «pronto te contactamos». */
async function correoIngeniero(env, i) {
  const en = i.idioma === "en";
  const titulo = en ? "We got your application. Thank you." : "Recibimos tu postulación. Gracias.";
  const parrafos = en ? [
    "Someone from Give&Grow will check your professional licence in COPNIA's public register before opening access. That check is done by a person and it is the reason this is not instant.",
    "Once approved you will get access at this same email address: no account, no password. You request a code, it arrives in your inbox, and you are in.",
    "A reminder of what you would be doing, because it is what makes this defensible: you give an OPINION at a distance. You say whether there are signs not to stay in the house or in part of it, what precautions to take and which materials to repair it with, and you order the visit queue. You do not declare a house habitable — that cannot be done from photos, and the declaration with legal effects belongs to the municipal authority.",
    "Nothing about this is charged, in either direction."
  ] : [
    "Alguien de Give&Grow va a verificar tu matrícula en el registro público del COPNIA antes de abrirte el acceso. Esa comprobación la hace una persona y es la razón de que esto no sea inmediato.",
    "Cuando quede aprobada, entras con este mismo correo: sin cuenta y sin contraseña. Pides un código, te llega al buzón y entras.",
    "Un recordatorio de lo que harías, porque es lo que hace defendible el proyecto: das un CONCEPTO a distancia. Dices si hay señales para no permanecer en la casa o en una parte de ella, qué precauciones tomar y con qué materiales conviene repararla, y ordenas la fila de visitas. No declaras habitable una casa — eso no se determina por fotos, y la declaratoria con efectos es de la autoridad municipal.",
    "Nada de esto se cobra, en ninguna dirección."
  ];
  const mapa = en ? ESP_ING_EN : ESP_ING_ES;
  const filas = en
    ? [["Licence you declared", i.matricula], ["Field", mapa[i.especialidad] || i.especialidad]]
    : [["Matrícula que declaraste", i.matricula], ["Especialidad", mapa[i.especialidad] || i.especialidad]];

  return enviarCorreo(env, {
    para: i.email,
    asunto: en ? "Your application to the structural triage" : "Tu postulación al triaje estructural",
    texto: [titulo, "", ...parrafos, "", filas.map(([k, x]) => k + ": " + x).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas }),
    etiqueta: "postulacion-ingeniero"
  });
}

/* Aviso interno: lo que hace falta para ir a verificar la matrícula y decidir,
   sin tener que abrir el panel para saber si vale la pena abrirlo. */
async function correoAvisoIngeniero(env, i) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const filas = [
    ["Nombre", i.nombre],
    ["Correo", i.email],
    ["Teléfono", i.telefono || "(no dejó)"],
    ["Ciudad", i.ciudad],
    ["Matrícula", i.matricula + " — SIN VERIFICAR"],
    ["Especialidad", (ESP_ING_ES[i.especialidad] || i.especialidad) +
      (i.especialidad_otra ? " · " + i.especialidad_otra : "")],
    ["Experiencia", i.experiencia || "(no dijo)"],
    ["Disponibilidad", i.disponibilidad || "(no dijo)"]
  ];
  return enviarCorreo(env, {
    para,
    asunto: "Ingeniero se postula al triaje: " + i.nombre,
    texto: filas.map(([k, x]) => k + ": " + x).join("\n") + (i.mensaje ? "\n\nMensaje:\n" + i.mensaje : ""),
    html: plantillaCorreo({
      titulo: "Ingeniero se postula al triaje: " + i.nombre,
      parrafos: [
        "Antes de aprobarlo hay que buscar esa matrícula en el registro público del COPNIA. Es el único filtro que tiene el proyecto.",
        i.mensaje ? "Lo que escribió: «" + i.mensaje + "»" : "Sin mensaje."
      ],
      filas,
      cierre: "Aceptarlo en el panel no le abre el triaje: el acceso se da añadiendo su correo en Cloudflare Access."
    }),
    etiqueta: "aviso-ingeniero"
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

/* ========================================================================
   GET /api/admin/salud  —  Fase 8: medir
   ========================================================================
   El panel sabía LISTAR y no sabía DECIR. Ocho tablas con filas y ninguna
   respuesta a las tres preguntas que importan: ¿el cobro funciona?, ¿qué lleva
   días esperando a una persona?, ¿dónde se cae la donación?

   LO QUE ESTA CONSULTA ENCONTRÓ EL DÍA QUE SE ESCRIBIÓ (12 ago 2026) y es la
   razón de que exista: cuatro intenciones de aporte, **cero pagos aprobados y
   cero webhooks recibidos en la historia de la base**. O sea: no hay una sola
   prueba de que el cobro funcione en producción. El traspaso ya había dejado la
   lección —«contra un tercero, probar contra el tercero»— y aun así nadie podía
   ver que la evidencia no existía, porque el panel no lo preguntaba.

   TRES REGLAS DE HONESTIDAD, que aquí no son estilo sino la marca:

   1 · **El cero se muestra y se nombra.** Nunca se esconde una fila porque esté
       en cero: que `certificados = 0` es información, y el día que sea 1 hay que
       poder ver el cambio.
   2 · **Ninguna tasa con denominador cero.** «0 %» de cero intenciones se lee
       como fracaso y no es nada: se devuelve `null` y el panel escribe
       «sin datos». Es la misma regla que MEDICION.md §5 aplicada a nosotros.
   3 · **Nada de esto es publicable.** Vive tras Access. El contador público por
       recencia es otra cosa (Fase 3 del plan VISUAL) y sigue aplazado.

   Y una regla de forma: **la antigüedad es el dato, no el conteo.** Una
   inscripción sin tocar hace nueve días y una de hace una hora se cuentan igual
   y no son lo mismo. Todo lo que espera a una persona viaja con sus días.
   ======================================================================== */
async function adminSalud(env) {
  const uno = async (sql) => (await env.DB.prepare(sql).first()) || {};

  /* Embudo. Se mide sobre `aportes` y no sobre los eventos de Wompi porque el
     aporte es nuestro registro: si Wompi cobró y no hay aporte, eso es la
     bandeja de «pagos sin aporte», que es otro problema y ya tiene su vista. */
  /* «Pagada» son SOLO los tres estados en que el dinero está en la cuenta.
     `reportada` NO cuenta: es una transferencia que el donante declaró y que
     nadie ha contrastado contra el extracto todavía, y meterla aquí ensancharía
     el significado de `aprobada` que la Fase 5.1 cuidó a propósito. `rechazada`
     tampoco, obviamente. Por eso los estados van escritos uno por uno y no como
     `<> 'intencion'`: la lista corta miente menos. */
  const PAGADA = "estado IN ('aprobada','en_distribucion','entregada')";
  const emb = await uno(
    "SELECT COUNT(*) AS intenciones, " +
    "SUM(CASE WHEN " + PAGADA + " THEN 1 ELSE 0 END) AS pagadas, " +
    "SUM(CASE WHEN estado = 'reportada' THEN 1 ELSE 0 END) AS declaradas, " +
    "SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) AS rechazadas, " +
    "SUM(CASE WHEN quiere_certificado = 1 AND " + PAGADA + " THEN 1 ELSE 0 END) AS piden_cert, " +
    "COALESCE(SUM(CASE WHEN estado = 'intencion' THEN monto_centavos ELSE 0 END), 0) AS centavos_sin_pagar " +
    "FROM aportes"
  );
  const certs = await uno("SELECT COUNT(*) AS emitidos FROM certificados WHERE anulado_en IS NULL");

  /* Webhooks. `firma_valida = 0` es el caso que hay que ver de inmediato: o
     alguien está golpeando el endpoint, o volvió el bug del `timestamp`. */
  const wh = await uno(
    "SELECT COUNT(*) AS recibidos, " +
    "SUM(CASE WHEN firma_valida = 1 THEN 1 ELSE 0 END) AS firma_ok, " +
    "SUM(CASE WHEN procesado = 1 THEN 1 ELSE 0 END) AS procesados, " +
    "MAX(recibido_en) AS ultimo " +
    "FROM eventos_wompi"
  );

  /* Todo lo que depende de que una persona actúe, con la antigüedad de lo más
     viejo. `dias` es NULL cuando no hay nada esperando, no 0: son cosas
     distintas y el panel las escribe distinto. */
  const cola = [];
  const enCola = async (clave, sql, comoSeArregla) => {
    const r = await uno(sql);
    cola.push({
      clave, n: r.n || 0,
      dias: r.n ? Math.floor((Date.now() - Date.parse((r.masViejo || "").replace(" ", "T") + "Z")) / 86400000) : null,
      arreglo: comoSeArregla
    });
  };
  /* Sin los ingenieros: tienen su propia cola, con su propio «cómo se arregla»
     —buscar la matrícula en el COPNIA—, y contarlos dos veces inflaba el panel
     justo en el número que sirve para decidir a qué dedicarle la tarde. */
  await enCola("inscripciones_sin_tocar",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM inscripciones " +
    "WHERE estado = 'nueva' AND tipo <> 'ingeniero'",
    "Bandeja «Quién quiere entrar» · a alguien le prometimos que le escribíamos");
  await enCola("transferencias_sin_verificar",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM aportes WHERE estado = 'reportada'",
    "Bandeja «Transferencias» · sin verificar no hay recibo ni certificado");
  await enCola("certificados_por_emitir",
    "SELECT COUNT(*) AS n, MIN(aprobada_en) AS masViejo FROM aportes a WHERE a.quiere_certificado = 1 " +
    "AND a." + PAGADA + " AND NOT EXISTS " +
    "(SELECT 1 FROM certificados c WHERE c.guia = a.guia AND c.anulado_en IS NULL)",
    "Lista de aportes · los firma la Revisora Fiscal, no el sistema");
  await enCola("correos_fallidos",
    "SELECT COUNT(*) AS n, MIN(intento_en) AS masViejo FROM correos WHERE resultado = 'fallo'",
    "Reenviar a mano y revisar Resend · a esa persona el sitio le prometió un correo que no salió");
  await enCola("entregas_en_borrador",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM entregas " +
    "WHERE publicada_en IS NULL AND anulada_en IS NULL",
    "Bandeja «Entregas» · el acta existe y todavía no la ve nadie");

  /* ── Las cuatro del triaje de viviendas ────────────────────────────────
     La plataforma entera era INVISIBLE para este panel: vigilaba donaciones,
     correos y entregas, y ni una sola cola de casos. Un caso podía quedarse
     meses sin que nadie lo mirara y el único que se enteraba era la familia,
     leyendo «todavía no lo ha revisado un ingeniero» en su pantalla.

     Es justo lo que este panel existe para impedir, y ahora importa más que
     nunca: la brigada visita cinco territorios y todavía no hay ingenieros
     aprobados. */
  await enCola("casos_sin_evaluar",
    "SELECT COUNT(*) AS n, MIN(creado_en) AS masViejo FROM casos " +
    "WHERE estado IN ('recibido','en_revision') " +
    "AND NOT EXISTS (SELECT 1 FROM evaluaciones e WHERE e.caso = casos.numero)",
    "Pantalla /triaje · una familia mandó fotos de su casa y nadie las ha abierto");
  /* La peor de las cinco, y por eso va con su propio texto: el sistema dijo
     «vayan ya» y nadie fue. Que exista esta fila es media razón de esta tanda. */
  await enCola("urgentes_sin_visitar",
    "SELECT COUNT(*) AS n, MIN(creado_en) AS masViejo FROM casos " +
    "WHERE clasificacion = 'urgente' AND estado NOT IN ('visitado','cerrado','descartado')",
    "Pantalla /ruta · un ingeniero dijo que era urgente y todavía no ha ido nadie");
  await enCola("casos_esperando_fotos",
    "SELECT COUNT(*) AS n, MIN(creado_en) AS masViejo FROM casos c " +
    "WHERE c.estado = 'en_revision' AND EXISTS (SELECT 1 FROM evaluaciones e " +
    "WHERE e.caso = c.numero AND e.clasificacion = 'inevaluable')",
    "Se le pidió material a la familia y no ha llegado · quizá haya que llamarla");
  /* Antes contaba solo `estado = 'nueva'`, y ese era el hueco: un ingeniero
     movido a «en revisión» o incluso aceptado SIN comprobar su matrícula
     desaparecía de la alarma, que es exactamente el caso peligroso. Ahora
     cuenta lo que de verdad falta: la matrícula sin verificar. */
  await enCola("ingenieros_sin_verificar",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM inscripciones " +
    "WHERE tipo = 'ingeniero' AND estado <> 'archivada' " +
    "AND COALESCE(json_extract(datos, '$.matricula_verificada'), 0) <> 1",
    "Consultar su matrícula en el registro público del COPNIA y marcarla en la bandeja");

  /* Y la cola nueva: conceptos que no pueden salir solos. Mientras estén aquí,
     la familia NO ha recibido respuesta — es la cola más urgente de las de
     personas, porque del otro lado alguien mandó fotos de su casa rota. */
  await enCola("conceptos_sin_respaldo",
    "SELECT COUNT(*) AS n, MIN(c.creado_en) AS masViejo FROM casos c " +
    "WHERE c.estado = 'clasificado' AND " + SIN_RESPALDO,
    "Un voluntario ya dio su concepto pero su matrícula no está verificada · falta un segundo par de ojos en /triaje");

  /* Intenciones abandonadas: más de 48 h en `intencion` y sin transacción de
     Wompi. No se tocan solas —borrar el registro de alguien que quizá vuelva a
     pagar sería peor que dejarlo— pero hay que poder verlas: cada una quemó un
     número de guía del consecutivo. */
  const ab = await uno(
    "SELECT COUNT(*) AS n, COALESCE(SUM(monto_centavos),0) AS centavos FROM aportes " +
    "WHERE estado = 'intencion' AND wompi_transaction_id IS NULL " +
    "AND creada_en < datetime('now','-48 hours')"
  );

  /* Correo. `simulado` es el dato que más importa aquí y no es un fallo: es que
     falta `RESEND_API_KEY` y el sistema lo está simulando en silencio, a
     propósito, para poder construir la capa antes de tener la cuenta. En
     producción eso significa que NADIE recibió nada. */
  const co = await uno(
    "SELECT COUNT(*) AS total, " +
    "SUM(CASE WHEN resultado = 'enviado'  THEN 1 ELSE 0 END) AS enviados, " +
    "SUM(CASE WHEN resultado = 'fallo'    THEN 1 ELSE 0 END) AS fallidos, " +
    "SUM(CASE WHEN resultado = 'simulado' THEN 1 ELSE 0 END) AS simulados, " +
    "MAX(intento_en) AS ultimo FROM correos"
  );

  const intenciones = emb.intenciones || 0;
  const pagadas = emb.pagadas || 0;
  return json({
    corte: new Date().toISOString(),
    embudo: {
      intenciones,
      declaradas: emb.declaradas || 0,
      pagadas,
      rechazadas: emb.rechazadas || 0,
      /* Regla 2: sin denominador no hay tasa. */
      conversion: intenciones ? Math.round((pagadas / intenciones) * 1000) / 10 : null,
      piden_certificado: emb.piden_cert || 0,
      certificados_emitidos: certs.emitidos || 0,
      centavos_sin_pagar: emb.centavos_sin_pagar || 0
    },
    webhooks: {
      recibidos: wh.recibidos || 0,
      firma_invalida: (wh.recibidos || 0) - (wh.firma_ok || 0),
      sin_procesar: (wh.firma_ok || 0) - (wh.procesados || 0),
      ultimo: wh.ultimo || null,
      /* La alarma que motivó la fase: hay gente intentando pagar y no ha
         llegado un solo evento. Si esto sale en true, el cobro no está
         probado en producción — no importa qué diga la batería de pruebas. */
      sin_evidencia_de_cobro: intenciones > 0 && (wh.recibidos || 0) === 0
    },
    correo: {
      total: co.total || 0,
      enviados: co.enviados || 0,
      fallidos: co.fallidos || 0,
      simulados: co.simulados || 0,
      ultimo: co.ultimo || null,
      /* La alarma: hay correos anotados y NINGUNO salió de verdad. Casi siempre
         es la llave de Resend sin configurar. */
      nada_salio: (co.total || 0) > 0 && (co.enviados || 0) === 0
    },
    cola,
    abandonadas: { n: ab.n || 0, centavos: ab.centavos || 0 }
  });
}

async function adminAportes(env, url) {
  const estado = url.searchParams.get("estado");
  const limite = Math.min(Math.max(Number(url.searchParams.get("limite")) || 50, 1), 200);
  const where = estado ? " WHERE a.estado = ?" : "";
  const sql =
    "SELECT a.guia, a.estado, a.monto_centavos, a.moneda, a.modo, a.destino_id, a.frecuencia, " +
    "a.quiere_certificado, a.consent_muro, a.idioma, a.nota, a.metodo_pago, a.creada_en, " +
    "a.aprobada_en, a.entregada_en, d.nombre AS donante, d.email AS correo, " +
    "d.doc_tipo AS doc_tipo, d.doc_numero AS doc_numero, d.ciudad AS ciudad, a.token, " +
    /* El certificado vigente viaja con la fila para que el panel sepa, sin una
       segunda consulta, si el botón debe decir "Emitir" o "Ver" — y si el que
       hay quedó sin respaldo tras una reversa. */
    "(SELECT c.numero FROM certificados c WHERE c.guia = a.guia AND c.anulado_en IS NULL) AS certificado, " +
    "(SELECT c.revision_en FROM certificados c WHERE c.guia = a.guia AND c.anulado_en IS NULL) AS cert_revision, " +
    /* El último intento de mandarle el recibo. Es lo que permite contestar «no me
       llegó» sin salir del panel: si dice `fallo` o `simulado`, no llegó y ya
       sabemos por qué. */
    "(SELECT co.resultado FROM correos co WHERE co.guia = a.guia AND co.etiqueta = 'aporte-aprobado' " +
    "ORDER BY co.id DESC LIMIT 1) AS recibo_correo " +
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

/* ========================================================================
   POST /api/admin/aporte/<guia>/conciliar   { transaccion }
   ========================================================================
   RESCATAR UN PAGO QUE OCURRIÓ Y NO LLEGÓ.

   El 12 de agosto de 2026 pasó de verdad: un aporte de $5.000 se cobró
   —transacción 1474268-1786544920-61767, referencia GG-2026-001001, APPROVED en
   el panel de Wompi y con su correo de «¡Pago exitoso!»— y la base lo tenía en
   `intencion`. Media hora después seguía igual. El webhook nunca llegó: la URL
   de eventos no estaba configurada en Wompi y `eventos_wompi` no tenía una sola
   fila en su historia. Resultado: dinero recibido, sin registro, sin recibo, y
   el donante viendo «estamos confirmando tu pago» para siempre.

   LA DECISIÓN QUE GOBIERNA ESTE ENDPOINT: **no reimplementa nada.** Le pregunta
   a Wompi por la transacción y le entrega la respuesta a `aplicarEstado`, que es
   la MISMA función que usa el webhook. Así el rescate hereda gratis el control
   de monto contra manipulación, el guardián de reversas, la creación del
   donante y el recibo. Un parche a mano en la base habría dejado al donante sin
   recibo y sin `donante_id`, que es justo lo que hay que evitar.

   POR QUÉ ESTO NO ROMPE «EL WEBHOOK ES LA ÚNICA FUENTE DE VERDAD»: esa regla
   existe porque la REDIRECCIÓN del checkout la controla el navegador y por lo
   tanto el donante. Aquí no se le cree a nadie: el Worker abre él mismo una
   conexión a la API de Wompi con la llave privada y lee el estado en la fuente.
   Es más fuerte que un webhook firmado, no más débil. Lo que sí exige es que
   una PERSONA lo dispare, igual que la verificación de transferencias.

   EL CANDADO QUE IMPORTA: se comprueba que `data.reference` sea exactamente la
   guía. Sin eso, quien tenga acceso al panel podría colgar el pago de alguien
   más a cualquier guía —y emitirle un certificado tributario por una plata que
   no puso—. Si no coincide, 409 y no se toca nada.
   ======================================================================== */
async function adminConciliarWompi(request, env, guia, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!env.WOMPI_PRIVATE_KEY) return json({ error: "wompi_no_configurado" }, 503);

  let c = {};
  try { c = await request.json(); } catch { /* se valida abajo */ }
  const txId = String(c.transaccion == null ? "" : c.transaccion).trim().slice(0, 120);
  if (!txId) {
    return json({ error: "transaccion_requerida",
      ayuda: "Pega el número de transacción de Wompi (lo trae el correo de «Pago exitoso» y el panel de Wompi)." }, 400);
  }

  const fila = await env.DB.prepare(
    "SELECT guia, estado, monto_centavos, confirmacion FROM aportes WHERE guia = ?"
  ).bind(guia).first();
  if (!fila) return json({ error: "no_encontrada" }, 404);

  /* Un aporte ya aprobado no se reconcilia: o el webhook llegó, o alguien ya lo
     rescató. Repetirlo volvería a mandar el recibo. */
  if (["aprobada", "en_distribucion", "entregada"].includes(fila.estado)) {
    return json({ error: "ya_aprobada", estado: fila.estado,
      ayuda: "Este aporte ya está confirmado. No hace falta conciliarlo." }, 409);
  }

  /* Se le pregunta a Wompi, en su API, con la llave privada. */
  const amb = ambienteWompi(env.WOMPI_PUBLIC_KEY);
  let tx;
  try {
    const r = await fetch(amb.api + "/transactions/" + encodeURIComponent(txId), {
      headers: { authorization: "Bearer " + env.WOMPI_PRIVATE_KEY }
    });
    if (!r.ok) {
      return json({ error: "wompi_no_responde", http: r.status,
        ayuda: r.status === 404
          ? "Wompi no conoce esa transacción. Revisa el número: se copia completo, con los guiones."
          : "Wompi respondió " + r.status + ". Inténtalo de nuevo en un momento." }, 502);
    }
    const j = await r.json();
    tx = j && j.data;
  } catch (e) {
    console.error("conciliar", guia, e && e.message);
    return json({ error: "wompi_inalcanzable" }, 502);
  }
  if (!tx || !tx.status) return json({ error: "respuesta_incompleta" }, 502);

  /* EL CANDADO. La transacción tiene que ser la de ESTA guía, según Wompi. */
  const ref = tx.reference ? String(tx.reference) : "";
  if (ref !== guia) {
    return json({ error: "referencia_no_coincide", referencia_en_wompi: ref, guia,
      ayuda: "Esa transacción pertenece a otra guía. No se tocó nada." }, 409);
  }

  /* Marca de dónde vino la certeza ANTES de aplicar el estado: `aplicarEstado`
     escribe 'wompi' solo si `confirmacion` está en NULL, así que ponerla aquí la
     preserva. Importa para saber después que este pago se rescató a mano porque
     el webhook estaba caído — el dato es de Wompi, el disparo fue de una
     persona, y las dos cosas quedan escritas. */
  await env.DB.prepare(
    "UPDATE aportes SET confirmacion='conciliada', confirmado_por=?, confirmado_en=datetime('now') " +
    "WHERE guia=? AND confirmacion IS NULL"
  ).bind(quien || "?", guia).run();

  /* La misma función del webhook. Ella decide el estado, valida el monto,
     dispara el guardián de reversas, crea el donante y manda el recibo. */
  await aplicarEstado(env, guia, tx, String(tx.status));

  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?",
    "aporte " + guia + " conciliado a mano contra la API de Wompi · tx " + txId + " · " + String(tx.status)).run();

  const despues = await env.DB.prepare(
    "SELECT guia, estado, wompi_estado, wompi_transaction_id, metodo_pago, confirmacion, donante_id " +
    "FROM aportes WHERE guia = ?"
  ).bind(guia).first();
  return json({ ok: true, wompi_estado: String(tx.status), aporte: despues });
}

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

/* ========================================================================
   CERTIFICADOS · /api/admin/certificado/...
   ========================================================================
   Aquí está la línea que divide esta fase. El recibo lo emite una máquina; el
   certificado lo emite una PERSONA, porque el documento dice «certifica bajo la
   gravedad de juramento» y lleva la firma de la Revisora Fiscal. Automatizar la
   emisión sería automatizar un juramento ajeno.

   Lo que sí está automatizado: numerar, armar, congelar, archivar y enviar.
   Lo que nunca lo estará: decidir que se emite.
   ======================================================================== */

/* Frase del numeral 6 del certificado. Se arma desde el destino real del aporte
   y no de un texto libre: el numeral declara a qué se destinó el dinero, y eso
   ya está en la base. */
function destinacionDe(a) {
  if (a.modo === "dirigida") {
    const p = a.proyecto || a.destino_id;
    /* Las campañas propias van con el prefijo `brigada-` en `destino_id` — ver
       la constante BRIGADA en app.js. No son «un programa» de una fundación
       aliada, y el numeral 6 del certificado declara a qué se destinó el
       dinero: llamarlo programa sería inexacto en un documento juramentado. */
    if (String(a.destino_id || "").startsWith("brigada-")) {
      return "la " + (p || "brigada de atención a emergencia");
    }
    if (p) return "el programa " + p;
  }
  return "el fondo general del HUB SOCIAL";
}

function limpiar(v, n) { return String(v == null ? "" : v).trim().slice(0, n); }

async function adminEmitirCertificado(request, env, guia, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let cuerpo = {};
  try { cuerpo = await request.json(); } catch { /* cuerpo opcional */ }

  const a = await env.DB.prepare(
    "SELECT a.guia, a.estado, a.monto_centavos, a.modo, a.destino_id, a.proyecto, " +
    "a.quiere_certificado, a.aprobada_en, a.wompi_transaction_id, a.donante_id, " +
    "a.confirmacion, a.referencia_pago, " +
    "d.nombre AS nombre, d.email AS email, d.doc_tipo AS doc_tipo, d.doc_numero AS doc_numero, " +
    "d.ciudad AS ciudad FROM aportes a LEFT JOIN donantes d ON d.id = a.donante_id WHERE a.guia = ?"
  ).bind(guia).first();
  if (!a) return json({ error: "no_encontrada" }, 404);

  /* Un certificado sobre un aporte que no se aprobó certificaría dinero que no
     entró. Es la única validación que no admite override desde el panel. */
  if (!ESTADOS_CON_RECIBO.includes(a.estado)) {
    return json({ error: "aporte_no_aprobado", estado: a.estado }, 409);
  }

  const yaHay = await env.DB.prepare(
    "SELECT numero FROM certificados WHERE guia = ? AND anulado_en IS NULL"
  ).bind(guia).first();
  if (yaHay) return json({ error: "ya_emitido", numero: yaHay.numero }, 409);

  /* Los datos del donante llegan de Wompi, que no entrega domicilio y a veces
     tampoco documento. El panel puede completarlos: ESO es la revisión humana
     que pide ops/arquitectura-donaciones-membresias.md §5, no un botón de
     "aprobar" sin mirar. Lo que se corrija aquí se guarda también en `donantes`,
     porque si faltaba para este certificado faltará para el siguiente. */
  const nombre    = limpiar(cuerpo.nombre, 200)    || limpiar(a.nombre, 200);
  const docTipo   = limpiar(cuerpo.doc_tipo, 10)   || limpiar(a.doc_tipo, 10) || "CC";
  const docNumero = limpiar(cuerpo.doc_numero, 40) || limpiar(a.doc_numero, 40);
  const ciudad    = limpiar(cuerpo.ciudad, 120)    || limpiar(a.ciudad, 120);

  const faltan = [];
  if (!nombre)    faltan.push("nombre");
  if (!docNumero) faltan.push("doc_numero");
  if (!ciudad)    faltan.push("ciudad");
  if (faltan.length) {
    return json({
      error: "datos_incompletos", faltan,
      ayuda: "El certificado identifica al donante ante la DIAN: no puede salir con campos vacíos.",
      actual: { nombre: a.nombre, doc_tipo: a.doc_tipo, doc_numero: a.doc_numero, ciudad: a.ciudad }
    }, 422);
  }

  /* --- divergencia frente a la identidad que validó la pasarela -------------
     Corregir un nombre incompleto es legítimo y hay que permitirlo. Cambiar el
     beneficiario del certificado —donar como persona y emitirlo a nombre de la
     empresa, para que la empresa tome el descuento del 25%— es fraude
     tributario, y desde el formulario se ven exactamente iguales.

     No se prohíbe: se exige MOTIVO y se deja rastro. Un error de digitación se
     explica en una línea; un cambio de beneficiario no. El domicilio no cuenta
     como divergencia porque Wompi sencillamente no lo entrega. */
  const divergencia = [];
  if (a.nombre && nombre !== a.nombre) divergencia.push({ campo: "nombre", wompi: a.nombre, emitido: nombre });
  if (a.doc_numero && docNumero !== a.doc_numero) divergencia.push({ campo: "doc_numero", wompi: a.doc_numero, emitido: docNumero });
  if (a.doc_tipo && docTipo !== a.doc_tipo) divergencia.push({ campo: "doc_tipo", wompi: a.doc_tipo, emitido: docTipo });

  const motivoCambio = limpiar(cuerpo.motivo_cambio, 280);
  if (divergencia.length && !motivoCambio) {
    return json({
      error: "divergencia_sin_motivo",
      divergencia,
      ayuda: "Estás emitiendo el certificado a nombre distinto del que validó la pasarela. " +
             "Explica por qué: el descuento tributario le corresponde a quien donó."
    }, 422);
  }

  if (a.donante_id) {
    await env.DB.prepare(
      "UPDATE donantes SET nombre=?, doc_tipo=?, doc_numero=?, ciudad=?, actualizado_en=datetime('now') WHERE id=?"
    ).bind(nombre, docTipo, docNumero, ciudad, a.donante_id).run();
  }

  const anio = Number(String(a.aprobada_en || "").slice(0, 4)) || new Date().getUTCFullYear();
  const numero = await siguienteCertificado(env, anio);

  /* El snapshot se congela AQUÍ. Volver a descargar el certificado dentro de un
     año debe devolver exactamente el mismo papel, aunque el donante haya
     corregido su nombre entretanto. */
  const datos = {
    numero, guia: a.guia,
    donante_nombre: nombre, doc_tipo: docTipo, doc_numero: docNumero, donante_ciudad: ciudad,
    monto_centavos: a.monto_centavos,
    fecha_donacion: a.aprobada_en,
    /* El numeral 5 dice «mediante transferencia electrónica No. …». Para un pago
       por pasarela ese número es el id de Wompi; para una transferencia real es
       el del comprobante bancario, y citar un id de Wompi inexistente sería
       falso en un documento que se firma bajo juramento. */
    transaccion: (a.confirmacion === "manual" ? a.referencia_pago : a.wompi_transaction_id) || "",
    destinacion: destinacionDe(a),
    emitido_en: new Date().toISOString().replace("T", " ").slice(0, 19)
  };

  await env.DB.prepare(
    "INSERT INTO certificados (numero, guia, datos, emitido_por, emitido_en, " +
    "wompi_identidad, divergencia, divergencia_motivo) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(
    numero, a.guia, JSON.stringify(datos), quien || "?", datos.emitido_en,
    JSON.stringify({ nombre: a.nombre, doc_tipo: a.doc_tipo, doc_numero: a.doc_numero }),
    divergencia.length ? JSON.stringify(divergencia) : null,
    divergencia.length ? motivoCambio : null
  ).run();

  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(
    quien || "?",
    "certificado " + numero + " emitido sobre " + a.guia +
    (divergencia.length
      ? " · DIVERGE de la identidad de Wompi en " + divergencia.map((d) => d.campo).join(", ") + ": " + motivoCambio
      : "")
  ).run();

  /* Enviarlo es un paso aparte y explícito: emitir y mandar no son lo mismo, y
     quien emite puede querer revisar el PDF antes de que salga. */
  let envio = null;
  if (cuerpo.enviar && a.email) {
    envio = await correoCertificado(env, datos, a.email);
    if (envio && envio.ok) {
      await env.DB.prepare(
        "UPDATE certificados SET enviado_en=datetime('now'), enviado_a=? WHERE numero=?"
      ).bind(a.email, numero).run();
    }
  }

  return json({ ok: true, numero, enviado: !!(envio && envio.ok), correo: a.email || null });
}

async function adminCertificadoPdf(env, numero) {
  const c = await env.DB.prepare(
    "SELECT numero, datos, anulado_en, anulado_motivo, revision_en, revision_motivo " +
    "FROM certificados WHERE numero = ?"
  ).bind(numero).first();
  if (!c) return json({ error: "no_encontrado" }, 404);

  /* El snapshot congela el CONTENIDO, no el ESTADO. Un certificado anulado que
     se vuelve a descargar limpio es un documento falso circulando con nuestra
     firma, así que el estado se le añade encima al armarlo. */
  const datos = Object.assign(JSON.parse(c.datos), {
    anulado_en: c.anulado_en, anulado_motivo: c.anulado_motivo,
    revision_en: c.revision_en, revision_motivo: c.revision_motivo
  });
  const bytes = await certificado(datos, datos.emitido_en);
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="' + c.numero + '.pdf"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

async function adminAnularCertificado(request, env, numero, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let cuerpo = {};
  try { cuerpo = await request.json(); } catch { /* opcional */ }
  const motivo = limpiar(cuerpo.motivo, 280);
  if (!motivo) return json({ error: "motivo_requerido" }, 400);

  const c = await env.DB.prepare("SELECT numero, anulado_en FROM certificados WHERE numero=?").bind(numero).first();
  if (!c) return json({ error: "no_encontrado" }, 404);
  if (c.anulado_en) return json({ error: "ya_anulado" }, 409);

  /* No se borra: se anula. El consecutivo conserva el hueco a propósito — un
     número que desaparece es peor que un número anulado con motivo. */
  await env.DB.prepare(
    "UPDATE certificados SET anulado_en=datetime('now'), anulado_motivo=? WHERE numero=?"
  ).bind(motivo, numero).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "certificado " + numero + " ANULADO: " + motivo).run();

  return json({ ok: true, numero });
}

/* El certificado sí viaja ADJUNTO: es el papel que el donante archiva para su
   declaración, y un enlace que caduca o se pierde no sirve para eso. */
async function correoCertificado(env, datos, email) {
  const titulo = "Tu certificado de donación";
  const parrafos = [
    "Adjuntamos tu certificado de donación " + datos.numero + ", correspondiente al aporte " + datos.guia + ".",
    "Está firmado por el Representante Legal y la Revisora Fiscal de la Fundación y sirve como soporte del descuento tributario del artículo 257 del Estatuto Tributario.",
    "La procedencia y el monto efectivo del descuento dependen de tu situación tributaria: consúltalo con tu asesor."
  ];
  const filas = [
    ["Certificado", datos.numero],
    ["Aporte", datos.guia],
    ["Valor", fmtPesos(datos.monto_centavos) + " COP"],
    ["Fecha de la donación", fechaLargaISO(datos.fecha_donacion)]
  ];
  const bytes = await certificado(datos, datos.emitido_en);
  return enviarCorreo(env, {
    para: email,
    asunto: titulo + " · " + datos.numero,
    texto: [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas }),
    etiqueta: "certificado", guia: datos.guia,
    adjuntos: [{ filename: datos.numero + ".pdf", content: bytesABase64(bytes) }]
  });
}

/* Resend pide el adjunto en base64. `btoa` no acepta bytes sueltos por encima de
   0x7F, así que se pasa por latin-1 en trozos: de una sola vez, un PDF de dos
   páginas revienta el límite de argumentos de String.fromCharCode. */
function bytesABase64(bytes) {
  let bin = "";
  const paso = 0x8000;
  for (let i = 0; i < bytes.length; i += paso) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + paso));
  }
  return btoa(bin);
}

const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fechaLargaISO(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return Number(m[3]) + " de " + MESES_ES[Number(m[2]) - 1] + " de " + m[1];
}

/* ========================================================================
   TRANSFERENCIAS REPORTADAS
   ========================================================================
   La transferencia es el primer medio de pago que muestra la página de la
   brigada y el que usan las empresas, y no producía nada: ni guía, ni recibo,
   ni rastreo, ni ruta al certificado. Terminaba en un correo a contabilidad@.

   No se toca el significado de `aprobada`. Sigue queriendo decir «el dinero
   entró», que es de lo que depende poder firmar un certificado bajo juramento.
   Lo que se añade es de dónde viene esa certeza: `confirmacion` vale 'wompi'
   cuando la dio la pasarela y 'manual' cuando una persona la contrastó contra
   el extracto, con su nombre y la fecha.

   El estado intermedio es `reportada`: el donante dice que transfirió. Eso no
   es dinero en el banco, así que no da recibo, no da certificado y en el
   rastreo no aparece como recibida.
   ======================================================================== */

const MAX_COMPROBANTE = 5 * 1024 * 1024;
const TIPOS_COMPROBANTE = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"
};

async function apiReportarTransferencia(request, env, url) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  /* Honeypot: éxito aparente y cero registro, igual que en los otros formularios. */
  if (c.web2) return json({ ok: true, guia: null });

  const monto = c.monto;
  if (typeof monto !== "number" || !Number.isInteger(monto) || monto < MONTO_MIN || monto > MONTO_MAX) {
    return json({ error: "monto_invalido", min: MONTO_MIN, max: MONTO_MAX }, 400);
  }
  const nombre = limpiar(c.nombre, 200);
  const email  = limpiar(c.email, 200);
  const fecha  = limpiar(c.fecha, 10);
  const refer  = limpiar(c.referencia, 80);

  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ error: "fecha_invalida" }, 400);
  /* Una transferencia con fecha futura no ocurrió. Mismo criterio que las actas. */
  if (fechaEnFuturo(fecha)) return json({ error: "fecha_futura" }, 422);
  if (!c.autoriza_datos) return json({ error: "autorizacion_requerida" }, 400);

  const modo    = c.modo === "dirigida" ? "dirigida" : "fondo";
  const destino = modo === "dirigida" ? limpiar(c.destino, 60) : null;
  if (modo === "dirigida" && !destino) return json({ error: "destino_requerido" }, 400);

  const donanteId = await donantePorCorreo(env, email, nombre);
  const guia = await siguienteGuia(env, new Date().getUTCFullYear());
  const token = tokenNuevo();

  await env.DB.prepare(
    "INSERT INTO aportes (guia, estado, monto_centavos, moneda, modo, destino_id, proyecto, " +
    "frecuencia, quiere_certificado, nota, idioma, token, donante_id, metodo_pago, referencia_pago) " +
    "VALUES (?, 'reportada', ?, 'COP', ?, ?, ?, 'unico', ?, ?, ?, ?, ?, 'TRANSFERENCIA', ?)"
  ).bind(
    guia, monto * 100, modo, destino, limpiar(c.proyecto, 120) || null,
    c.certificado ? 1 : 0, limpiar(c.nota, 280) || null,
    c.idioma === "en" ? "en" : "es", token, donanteId, refer || null
  ).run();

  try {
    await correoTransferenciaReportada(env, { guia, monto, email, nombre, fecha, refer, idioma: c.idioma });
    await correoAvisoTransferencia(env, { guia, monto, email, nombre, fecha, refer, destino });
  } catch (e) { console.error("correo transferencia", e && e.message); }

  /* El token vuelve al navegador SOLO para que pueda subir su comprobante en el
     paso siguiente. Es el mismo que abre su recibo cuando se confirme. */
  return json({ ok: true, guia, token });
}

/* Un donante que transfiere no pasa por Wompi, así que su fila en `donantes` la
   creamos aquí — con lo mínimo, igual que hace guardarDonante con lo de la
   pasarela. */
async function donantePorCorreo(env, email, nombre) {
  await env.DB.prepare(
    "INSERT INTO donantes (email, nombre) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET " +
    "nombre = COALESCE(excluded.nombre, nombre), actualizado_en = datetime('now')"
  ).bind(email, nombre || null).run();
  const f = await env.DB.prepare("SELECT id FROM donantes WHERE email = ?").bind(email).first();
  return f ? f.id : null;
}

/* POST /api/comprobante/<guia>?t=<token> — el soporte de la transferencia.
   Solo sobre un aporte REPORTADO y con su token: sin eso, sería una carga
   pública abierta contra el bucket. */
async function apiComprobante(request, env, guia, token) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);
  if (!/^[a-f0-9]{32}$/.test(String(token || ""))) return json({ error: "no_autorizado" }, 403);

  const a = await env.DB.prepare(
    "SELECT guia, estado, token, comprobante FROM aportes WHERE guia = ?"
  ).bind(guia).first();
  if (!a || !a.token || !igualesSeguro(a.token, String(token))) return json({ error: "no_autorizado" }, 403);
  if (a.estado !== "reportada") return json({ error: "estado_no_permite", estado: a.estado }, 409);
  if (a.comprobante) return json({ error: "ya_tiene_comprobante" }, 409);

  const tipo = String(request.headers.get("content-type") || "").split(";")[0].trim();
  const ext = TIPOS_COMPROBANTE[tipo];
  if (!ext) return json({ error: "tipo_no_permitido", permitidos: Object.keys(TIPOS_COMPROBANTE) }, 415);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: "archivo_vacio" }, 400);
  if (bytes.length > MAX_COMPROBANTE) return json({ error: "archivo_muy_grande", max_mb: 5 }, 413);

  const clave = "comprobantes/" + guia + "/" + tokenNuevo().slice(0, 8) + "." + ext;
  await env.MEDIA.put(clave, bytes, { httpMetadata: { contentType: tipo } });
  await env.DB.prepare(
    "UPDATE aportes SET comprobante = ?, actualizada_en = datetime('now') WHERE guia = ?"
  ).bind(clave, guia).run();
  return json({ ok: true });
}

/* ========================================================================
   TRIAGE ESTRUCTURAL DE VIVIENDAS
   ========================================================================
   NO es un dictamen de habitabilidad: por fotos no se determina, y la
   declaratoria con efectos —evacuar, demoler— le corresponde a la autoridad
   municipal (Ley 1523 de 2012). Esto da un CONCEPTO —permanencia, precauciones y
   materiales— y de paso prioriza a qué casa se va primero (19 ago 2026).

   El caso se crea ANTES de subir un solo archivo y devuelve su token. Si la
   señal se cae en la foto cuatro, las tres primeras y todos los datos ya están
   guardados. En zona de desastre esa es la diferencia entre recibir un caso y
   recibir un abandono — es el mismo patrón del reporte de transferencia y su
   comprobante, que ya funciona en producción.
   ======================================================================== */

/* Consecutivo propio: CV-YYYY-NNNNNN. Mecánica atómica idéntica a la de guías,
   y misma regla dura: NO SE REINICIA NUNCA. */
async function siguienteCaso(env, anio) {
  const { results } = await env.DB.prepare(
    "INSERT INTO numerador_caso (anio, ultimo) VALUES (?, 1) " +
    "ON CONFLICT(anio) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo"
  ).bind(anio).all();
  const n = results && results[0] ? results[0].ultimo : null;
  if (!n) throw new Error("numerador de casos no devolvió consecutivo");
  return "CV-" + anio + "-" + String(n).padStart(6, "0");
}

const MATERIALES = ["ladrillo", "adobe", "bahareque", "prefabricado", "madera", "no_se"];

/* Los teléfonos se comparan por sus DÍGITOS, no por la cadena. «315 000 0000» y
   «3150000000» son el mismo número, y una familia los escribe indistintamente
   —o los dos, si envía dos veces—. Comparando el texto crudo, el freno se
   saltaba solo y el aviso de duplicado no cruzaba nada.

   Se normaliza al COMPARAR y no al guardar: en la ficha se muestra lo que la
   persona escribió, que es como lo reconoce cuando el equipo la llama. */
const TEL_DIGITOS = (col) =>
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(" + col + ",' ',''),'-',''),'(',''),')',''),'.','')";
const CATEGORIAS_MEDIO = ["conjunto", "estructura", "dano", "entorno"];
/* El tope del video NO lo pone la plataforma sino la conexión de la familia:
   un video de 30 s de un teléfono moderno pesa decenas de megas y en zona de
   desastre no sube. Se limita por diseño y el formulario lo dice antes de
   grabar, que es cuando sirve saberlo. */
const TIPOS_MEDIO = {
  "image/jpeg": { ext: "jpg", clase: "foto",  max: 8 * 1024 * 1024 },
  "image/png":  { ext: "png", clase: "foto",  max: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", clase: "foto", max: 8 * 1024 * 1024 },
  "video/mp4":  { ext: "mp4", clase: "video", max: 60 * 1024 * 1024 },
  "video/quicktime": { ext: "mov", clase: "video", max: 60 * 1024 * 1024 }
};
const MAX_MEDIOS = 20;

/* POST /api/caso — crea el caso. Devuelve número y token. */
async function apiCasoCrear(request, env) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  /* Honeypot, igual que en los otros formularios: éxito aparente, cero registro. */
  if (c.web2) return json({ ok: true, numero: null });

  const nombre = limpiar(c.nombre, 200);
  const tel    = limpiar(c.tel, 40);
  const sector = limpiar(c.sector, 160);
  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  /* El TELÉFONO es el identificador, no el correo: en estas zonas mucha gente
     tiene WhatsApp y no correo, y exigirlo dejaría fuera a quien más lo
     necesita. Se piden 7 dígitos como mínimo real, sin formato impuesto. */
  if ((tel.match(/\d/g) || []).length < 7) return json({ error: "telefono_invalido" }, 400);
  if (!sector) return json({ error: "sector_requerido" }, 400);

  const email = limpiar(c.email, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);

  /* Sin esta autorización no hay caso: es la que permite que un ingeniero mire
     las fotos. La de publicación es OTRA y es opcional — ver migración 0010. */
  if (!c.consent_eval) return json({ error: "autorizacion_requerida" }, 400);

  const material = MATERIALES.includes(c.material) ? c.material : null;
  const pisos = Number.isInteger(c.pisos) && c.pisos > 0 && c.pisos < 20 ? c.pisos : null;

  /* FRENO POR TELÉFONO, y solo por teléfono.
     El numerador de casos NO se reinicia nunca —es la regla dura del proyecto—
     así que cada POST a este endpoint público quema un número para siempre. Sin
     ningún freno, un script deja la bandeja inservible justo durante la brigada.

     Y sin embargo un tope GLOBAL sería peor que el problema: una avalancha de
     casos después de una réplica es exactamente lo que este sistema existe para
     recibir, y un límite por hora la cortaría. Por eso el freno es por teléfono:
     no puede bloquear a otra familia, y ataja el caso que de verdad pasa —el
     doble envío de quien no está seguro de si se envió.

     ⚠️ Esto NO detiene a alguien que rote números. Ese caso se ataja en la
     regla de rate-limit de Cloudflare, que es configuración y no código; queda
     anotado en el traspaso. */
  const recientes = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM casos WHERE " + TEL_DIGITOS("contacto_tel") + " = ? " +
    "AND creado_en > datetime('now','-10 minutes')"
  ).bind(tel.replace(/\D/g, "")).first();
  if (recientes && recientes.n >= 3) {
    return json({ error: "demasiados_intentos",
                  ayuda: "Ya recibimos varios casos desde este número hace un momento. " +
                         "Espera unos minutos; si ya enviaste el tuyo, revisa el enlace que te dimos." }, 429);
  }

  const numero = await siguienteCaso(env, new Date().getUTCFullYear());
  const token = tokenNuevo();

  await env.DB.prepare(
    "INSERT INTO casos (numero, token, sector, direccion_ref, contacto_nombre, contacto_tel, " +
    "contacto_email, material, pisos, anio_aprox, danio_previo, habitada, heridos, filtra_agua, " +
    "nota, consent_eval, consent_publico, consent_en) " +
    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,datetime('now'))"
  ).bind(
    numero, token, sector, limpiar(c.direccion, 240) || null,
    nombre, tel, email || null,
    material, pisos, limpiar(c.anio, 40) || null,
    c.danio_previo ? 1 : 0, c.habitada ? 1 : 0, c.heridos ? 1 : 0, c.filtra_agua ? 1 : 0,
    limpiar(c.nota, 600) || null,
    c.consent_publico ? 1 : 0
  ).run();

  try { await correoAvisoCaso(env, { numero, nombre, tel, sector, email }); }
  catch (e) { console.error("correo caso", numero, e && e.message); }

  return json({ ok: true, numero, token });
}

/* POST /api/caso/<numero>/medio?t=<token>&cat=<categoria> — una foto o video.
   Uno por petición, a propósito: con mala señal, subir siete archivos en una
   sola llamada significa perderlos los siete cuando falla. */
async function apiCasoMedio(request, env, numero, token, url) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);

  const caso = await env.DB.prepare(
    "SELECT numero, token, estado FROM casos WHERE numero = ?"
  ).bind(numero).first();
  /* Mismo 403 para caso inexistente y token equivocado: si se distinguieran,
     quedaría un oráculo de qué casos existen. Igual que el recibo. */
  if (!caso || !token || caso.token !== token) return json({ error: "no_autorizado" }, 403);

  const cuantos = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM caso_medios WHERE caso = ?"
  ).bind(numero).first();
  if (cuantos && cuantos.n >= MAX_MEDIOS) return json({ error: "demasiados_medios", max: MAX_MEDIOS }, 409);

  const tipo = String(request.headers.get("content-type") || "").split(";")[0].trim();
  const spec = TIPOS_MEDIO[tipo];
  if (!spec) return json({ error: "tipo_no_permitido", permitidos: Object.keys(TIPOS_MEDIO) }, 415);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: "archivo_vacio" }, 400);
  if (bytes.length > spec.max) {
    return json({
      error: "archivo_muy_grande", clase: spec.clase,
      max_mb: Math.round(spec.max / 1024 / 1024),
      ayuda: spec.clase === "video" ? "Graba un video más corto, de unos 30 segundos." : null
    }, 413);
  }

  const cat = CATEGORIAS_MEDIO.includes(url.searchParams.get("cat")) ? url.searchParams.get("cat") : null;
  const clave = "casos/" + numero + "/" + tokenNuevo().slice(0, 8) + "." + spec.ext;
  await env.MEDIA.put(clave, bytes, { httpMetadata: { contentType: tipo } });
  await env.DB.prepare(
    "INSERT INTO caso_medios (caso, r2_key, clase, categoria, bytes, nota, orden) " +
    "VALUES (?,?,?,?,?,?, (SELECT COUNT(*) FROM caso_medios WHERE caso = ?))"
  ).bind(numero, clave, spec.clase, cat, bytes.length,
         limpiar(url.searchParams.get("nota"), 200) || null, numero).run();
  await env.DB.prepare("UPDATE casos SET actualizado_en = datetime('now') WHERE numero = ?").bind(numero).run();

  return json({ ok: true, clase: spec.clase });
}

/* GET /api/caso/<numero>?t=<token> — lo que la familia puede ver de su caso.
   Nunca devuelve la dirección exacta ni las notas técnicas internas. */
async function apiCasoEstado(env, numero, token) {
  const c = await env.DB.prepare(
    "SELECT numero, token, estado, clasificacion, sector, creado_en FROM casos WHERE numero = ?"
  ).bind(numero).first();
  if (!c || !token || c.token !== token) return json({ error: "no_autorizado" }, 403);
  const m = await env.DB.prepare("SELECT COUNT(*) AS n FROM caso_medios WHERE caso = ?").bind(numero).first();

  /* Lo que el ingeniero dijo, para que la familia lo lea en su página y no solo
     en un correo que pudo no llegarle — el correo es opcional de verdad, así
     que no puede ser el único sitio donde vive la respuesta.

     `falta` es lo que convierte esta pantalla en útil: si un ingeniero marcó
     `inevaluable`, aquí dice QUÉ foto se necesita, justo encima del botón para
     subirla. Antes el sistema sabía pedir lo que faltaba y no sabía recibirlo. */
  const e = await evaluacionVigente(env, numero, c.clasificacion);

  /* CUÁNTO LLEVA ESPERANDO, y cuántos hay delante en su misma situación.
     Su pantalla decía «un ingeniero lo va a revisar» sin plazo ni señal, y una
     espera sin información se siente como abandono — sobre todo después de un
     sismo, y sobre todo si ya te acostumbraste a que nadie responde.

     No se promete una fecha: no la hay, y prometerla sería justo lo que la
     marca prohíbe. Se dan los dos hechos verificables que sí existen: los días
     que lleva y cuántos casos siguen sin abrir. El segundo explica el primero
     mejor que cualquier disculpa. */
  const espera = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM casos WHERE estado IN ('recibido','en_revision') " +
    "AND NOT EXISTS (SELECT 1 FROM evaluaciones e WHERE e.caso = casos.numero)"
  ).first();

  return json({
    numero: c.numero, estado: c.estado, clasificacion: c.clasificacion,
    sector: c.sector, medios: (m && m.n) || 0, creado_en: c.creado_en,
    dias: Math.floor((Date.now() - Date.parse(String(c.creado_en).replace(" ", "T") + "Z")) / 86400000),
    en_cola: (espera && espera.n) || 0,
    /* `evaluado` y `clasificacion` no son lo mismo: un caso `inevaluable`
       vuelve a `en_revision` con la clasificación en NULL, y aun así ya lo miró
       alguien. Sin este campo, la pantalla no sabría distinguir «nadie lo ha
       visto todavía» de «lo vieron y no les alcanzó». */
    evaluado: !!e,
    ultima: e ? { clasificacion: e.clasificacion, recomendacion: e.recomendacion,
                  falta: e.falta, creado_en: e.creado_en } : null,
    tope_medios: MAX_MEDIOS
  });
}

async function correoAvisoCaso(env, x) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const titulo = "Caso de vivienda: " + x.numero;
  const filas = [
    ["Caso", x.numero], ["Sector", x.sector],
    ["Contacto", x.nombre], ["Teléfono", x.tel], ["Correo", x.email || "(no dio)"]
  ];
  return enviarCorreo(env, {
    para, asunto: titulo,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n"),
    html: plantillaCorreo({
      titulo,
      parrafos: ["Entró un caso nuevo para triage estructural. Todavía no lo ha visto ningún ingeniero.",
                 "Recuerda: el concepto orienta y prioriza; no determina si la casa es habitable."],
      filas
    }),
    etiqueta: "caso-recibido"
  });
}



/* ========================================================================
   /triage — la pantalla del ingeniero voluntario
   ========================================================================
   Se genera desde el Worker, igual que el panel, y por la misma razón: vive
   tras Access y no puede ser un archivo estático servido a cualquiera.

   ⚠ Dentro de estas plantillas hay que escribir \\n y \\/ — lo que se lee aquí
   NO es lo que ejecuta el navegador. Este JS evita a propósito los saltos
   escapados y las expresiones regulares, para no repetir las siete horas que
   costó esa trampa en el panel. El check #1b del gate valida lo EMITIDO.
   ======================================================================== */
function paginaTriage() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Triaje estructural</title>
<style>
  :root{--g:#1F5C38;--ink:#191813;--mu:#5C636F;--bd:#DAD3C3;--bg:#F3EFE6;--surface:#FBF8F1;
        --urg:#8C2F1E;--prog:#9A6B12;--no:#1F5C38;--amber:#A84D00}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55}
  .wrap{max-width:1000px;margin:0 auto;padding:28px 20px 80px}
  h1{font-size:24px;margin-bottom:4px}
  .sub{color:var(--mu);font-size:14px;margin-bottom:6px}
  .aviso{background:var(--surface);border:1px solid var(--bd);border-left:3px solid var(--g);
         padding:14px 16px;border-radius:8px;margin:18px 0;font-size:14px}
  .fila{background:var(--surface);border:1px solid var(--bd);border-radius:10px;padding:14px 16px;margin-bottom:10px;
        display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  .fila b{font-family:ui-monospace,Menlo,monospace;font-size:14px}
  .fila .meta{color:var(--mu);font-size:13px;flex:1;min-width:200px}
  .btn{background:var(--g);color:#fff;border:0;border-radius:999px;padding:9px 18px;font-size:14px;
       font-weight:600;cursor:pointer}
  .btn.o{background:transparent;color:var(--g);border:1px solid var(--g)}
  .pill{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
        padding:3px 9px;border-radius:999px;border:1px solid currentColor}
  .p-urgente{color:var(--urg)} .p-programada{color:var(--prog)} .p-no_requiere{color:var(--no)}
  .p-inevaluable{color:var(--mu)}
  .p-discrepa{color:var(--amber);border-color:var(--amber)}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 4px}
  .tab{border:1px solid var(--bd);background:var(--surface);border-radius:999px;
       padding:8px 15px;font-size:14px;cursor:pointer;color:var(--ink);font-family:inherit}
  .tab.on{background:var(--g);color:#fff;border-color:var(--g);font-weight:600}
  .tab span{font-weight:700}
  .ficha{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:20px;margin-top:16px}
  .dato{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd);font-size:14px}
  .dato span:first-child{color:var(--mu);min-width:150px}
  .fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:16px 0}
  .fotos a{display:block;border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:#fff}
  .fotos img{width:100%;height:130px;object-fit:cover;display:block}
  .fotos small{display:block;padding:5px 8px;color:var(--mu);font-size:11px}
  label{display:block;font-size:13px;font-weight:600;margin:14px 0 5px}
  input,textarea,select{width:100%;padding:10px 12px;border:1px solid var(--bd);border-radius:8px;
                        font:inherit;font-size:15px;background:#fff;color:var(--ink)}
  .msg{margin-top:12px;font-size:14px}
  .cargando{color:var(--mu);font-size:14px;padding:20px 0}
</style>
</head>
<body>
<div class="wrap">
  <h1>Triaje estructural</h1>
  <p class="sub" id="quien">Cargando sesión...</p>
  <div class="aviso">
    <b>Esto no es un dictamen de habitabilidad.</b> Por fotos no se determina, y la declaratoria
    con efectos le corresponde a la autoridad municipal. Lo que das aqui es un <b>concepto a
    distancia</b>: si hay señales para no permanecer, qué precauciones tomar y con qué reparar —
    más el orden de la fila de visitas. Recomendar que no se use una parte de la casa mientras se
    revisa es una <b>precaución</b>, no una declaratoria. Si el material no alcanza, marca
    <b>No puedo evaluar</b> y di qué falta.
  </div>
  <div class="tabs" id="tabs">
    <button class="tab on" data-cola="pendientes">Sin revisar</button>
    <button class="tab" data-cola="confirmar">Piden confirmación <span id="n-conf"></span></button>
    <button class="tab" data-cola="clasificados">Ya clasificados</button>
  </div>
  <div id="lista"><p class="cargando">Cargando casos...</p></div>
  <div id="ficha"></div>
</div>
<script src="/triaje.js"></script>
</body>
</html>`;
}

function triageJS() {
  return `
var CASO = null;
function esc(s){
  /* ESCAPA TAMBIÉN LAS COMILLAS, y esa es la corrección.
     Antes usaba textContent -> innerHTML, que escapa & < > y NADA MÁS. Basta
     para texto, pero este panel mete valores dentro de atributos —campo() los
     pone en value="..."— y ahí una comilla doble cierra el atributo y abre uno
     nuevo. Comprobado el 19 ago: un caso creado desde el formulario PÚBLICO,
     sin autenticarse, inyectaba un atributo propio en el input de la ficha. Con
     un manejador de evento en vez de un data- eso es JavaScript ejecutándose
     dentro de una sesión de Access, con acceso a donantes y comprobantes. */
  return String(s == null ? "" : s).replace(/[&<>"\']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "\'":"&#39;" }[c];
  });
}
function el(id){ return document.getElementById(id); }

fetch("/api/admin/quien").then(function(r){ return r.json(); }).then(function(d){
  el("quien").textContent = d.email ? ("Sesión de " + d.email) : "Sesión activa";
});

var COLA = "pendientes";

var VACIO = {
  pendientes: "No hay casos esperando. Gracias.",
  confirmar: "Nada pendiente de confirmar. Cuando un caso urgente tenga una sola opinión, o dos ingenieros no coincidan, aparece aquí.",
  clasificados: "Todavía no hay casos clasificados."
};
var CABEZA = {
  pendientes: "caso(s) esperando, del más antiguo al más reciente.",
  confirmar: "caso(s) donde un segundo par de ojos cambia algo: urgentes con una sola opinión, y los que están en desacuerdo. Sobre un urgente se va a mover una brigada.",
  clasificados: "caso(s) ya clasificados."
};

function cargarCola(){
  fetch("/api/triage/casos?estado=" + encodeURIComponent(COLA)).then(function(r){ return r.json(); }).then(function(d){
    var n = el("n-conf");
    if (n) n.textContent = d.porConfirmar ? "(" + d.porConfirmar + ")" : "";
    var c = d.casos || [];
    if (!c.length){ el("lista").innerHTML = "<p class='cargando'>" + VACIO[COLA] + "</p>"; return; }
    var h = "<p class='sub'>" + c.length + " " + CABEZA[COLA] + "</p>";
    for (var i = 0; i < c.length; i++){
      var x = c[i];
      h += "<div class='fila'><b>" + esc(x.numero) + "</b>"
        +  "<span class='meta'>" + esc(x.sector) + " &middot; " + esc(x.material || "material sin especificar")
        +  " &middot; " + (x.pisos || "?") + " piso(s) &middot; " + x.medios + " foto(s)"
        +  (x.danio_previo ? " &middot; tenía grietas antes" : "")
        +  (x.heridos ? " &middot; hubo heridos" : "")
        +  (x.firmes ? " &middot; " + x.firmes + " opinión(es)" : "")
        +  "</span>"
        +  (x.discrepa ? "<span class='pill p-discrepa'>en discrepancia</span>" : "")
        +  (x.clasificacion ? "<span class='pill p-" + esc(x.clasificacion) + "'>" + esc(x.clasificacion) + "</span>" : "")
        +  "<button class='btn' data-abrir='" + esc(x.numero) + "'>Abrir</button></div>";
    }
    el("lista").innerHTML = h;
  });
}

function abrir(numero){
  fetch("/api/triage/caso/" + encodeURIComponent(numero)).then(function(r){ return r.json(); }).then(function(d){
    if (!d.caso) return;
    CASO = d.caso.numero;
    var c = d.caso, h = "<div class='ficha'><h2 style='font-size:19px'>" + esc(c.numero) + "</h2>";
    var datos = [["Sector", c.sector], ["Muros", c.material], ["Pisos", c.pisos],
                 ["Año aprox", c.anio_aprox], ["Grietas antes del sismo", c.danio_previo ? "Sí" : "No"],
                 ["Habitada ahora", c.habitada ? "Sí" : "No"], ["Hubo heridos", c.heridos ? "Sí" : "No"],
                 ["Entra agua", c.filtra_agua ? "Sí" : "No"], ["Cuenta la familia", c.nota]];
    for (var i = 0; i < datos.length; i++){
      if (datos[i][1] === null || datos[i][1] === undefined || datos[i][1] === "") continue;
      h += "<div class='dato'><span>" + esc(datos[i][0]) + "</span><span>" + esc(datos[i][1]) + "</span></div>";
    }
    var m = d.medios || [];
    h += "<div class='fotos'>";
    for (var j = 0; j < m.length; j++){
      var src = "/api/triage/medio/" + m[j].id;
      h += "<a href='" + src + "' target='_blank' rel='noopener'>";
      h += m[j].clase === "video"
         ? "<video src='" + src + "' style='width:100%;height:130px;object-fit:cover' muted></video>"
         : "<img src='" + src + "' alt='' loading='lazy'>";
      h += "<small>" + esc(m[j].categoria || m[j].clase) + "</small></a>";
    }
    h += "</div>";
    var ev = d.evaluaciones || [];
    for (var k = 0; k < ev.length; k++){
      h += "<div class='dato'><span>Ya evaluó</span><span>" + esc(ev[k].ing_nombre) + " (" + esc(ev[k].ing_matricula)
        +  ") &rarr; " + esc(ev[k].clasificacion) + "</span></div>";
    }
    h += "<label>Tu clasificación</label><select id='t-clas'>"
      +  "<option value='urgente'>Visita urgente</option>"
      +  "<option value='programada'>Visita programada</option>"
      +  "<option value='no_requiere'>No requiere visita</option>"
      +  "<option value='inevaluable'>No puedo evaluar con esto</option></select>"
      +  "<label>Tu nombre</label><input id='t-nombre'>"
      +  "<label>Tu matrícula profesional</label><input id='t-mat'>"
      +  "<label>Nota técnica</label><textarea id='t-nota' rows='4'></textarea>"
      +  "<label>Concepto para la familia (OBLIGATORIO, salvo si no puedes evaluar): si hay señales para no permanecer en la casa o en una parte, qué precauciones tomar, y con qué materiales y en qué orden reparar. Es lo que el sitio le prometió y lo único que va a recibir.</label><textarea id='t-rec' rows='5'></textarea>"
      +  "<label>Si no puedes evaluar: qué falta</label><input id='t-falta'>"
      +  "<p><button class='btn' id='t-enviar' style='margin-top:14px'>Guardar evaluación</button></p>"
      +  "<p class='msg' id='t-msg'></p></div>";
    el("ficha").innerHTML = h;
    el("ficha").scrollIntoView({ block: "start" });
  });
}

function enviar(){
  var msg = el("t-msg");
  msg.textContent = "Guardando...";
  fetch("/api/triage/caso/" + encodeURIComponent(CASO) + "/evaluar", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clasificacion: el("t-clas").value, nombre: el("t-nombre").value,
      matricula: el("t-mat").value, nota_tecnica: el("t-nota").value,
      recomendacion: el("t-rec").value, falta: el("t-falta").value
    })
  }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
    .then(function(res){
      if (!res.ok){
        var e = res.d || {};
        msg.textContent = e.faltan ? ("Falta: " + e.faltan.join(", "))
                        : (e.ayuda || e.error || "No se pudo guardar");
        msg.style.color = "#8C2F1E";
        return;
      }
      msg.textContent = "Guardado. Gracias.";
      msg.style.color = "#1F5C38";
      el("ficha").innerHTML = "";
      cargarCola();
    })
    .catch(function(){ msg.textContent = "No se pudo guardar"; msg.style.color = "#8C2F1E"; });
}

document.addEventListener("click", function(ev){
  var t = ev.target.closest ? ev.target.closest("[data-cola]") : null;
  if (t){
    COLA = t.getAttribute("data-cola");
    var tt = document.querySelectorAll(".tab");
    for (var i = 0; i < tt.length; i++) tt[i].classList.remove("on");
    t.classList.add("on");
    el("ficha").innerHTML = "";
    cargarCola();
    return;
  }
  var a = ev.target.closest ? ev.target.closest("[data-abrir]") : null;
  if (a){ abrir(a.getAttribute("data-abrir")); return; }
  if (ev.target && ev.target.id === "t-enviar"){ enviar(); }
});

cargarCola();
`;
}

/* ========================================================================
   LA COLA DE LOS INGENIEROS
   ========================================================================
   Vive tras el mismo Access que el panel, pero con endpoints propios y
   acotados: un ingeniero voluntario ve casos y fotos, NUNCA donantes, aportes
   ni datos financieros. Y tampoco la dirección exacta — para clasificar por
   urgencia no hace falta saber dónde queda la casa, y no pedirla es la forma
   más simple de que no se filtre.
   ======================================================================== */

const CLASIFICACIONES = ["urgente", "programada", "no_requiere", "inevaluable"];

/* GET /api/triage/casos?estado=… — la cola. Por defecto, lo que nadie ha visto,
   y del más viejo al más nuevo: en una emergencia el orden es la antigüedad, no
   la novedad. */
/* ¿EL CORREO QUE FIRMA TIENE MATRÍCULA VERIFICADA? (20 ago 2026)
   La verificación es un hecho comprobado a mano contra el registro público del
   COPNIA, y vive en el JSON de `inscripciones.datos` — SIN columna nueva y sin
   migración, el mismo patrón que usó el motivo de cierre de casos. Se cruza por
   correo porque es lo único que comparten `evaluaciones` e `inscripciones`.

   NO HAY PUERTA DE ATRÁS, y es deliberado: quien no tenga una inscripción de
   ingeniero verificada cuenta como sin verificar, incluido el equipo. Si alguien
   del equipo va a firmar un concepto, se postula en «Ingenieros voluntarios»
   como cualquiera y se le verifica la matrícula. Una excepción para nosotros
   sería justo la que nadie audita. */
const MATRICULA_OK = (col) =>
  "EXISTS (SELECT 1 FROM inscripciones i WHERE i.tipo = 'ingeniero' " +
  "AND lower(i.email) = lower(" + col + ") " +
  "AND json_extract(i.datos, '$.matricula_verificada') = 1)";

/* Un caso SIN RESPALDO: tiene opinión firme, pero ninguna de un ingeniero con
   matrícula verificada. Es lo que no puede llegar solo a una familia. */
const SIN_RESPALDO =
  "(" + "(SELECT COUNT(*) FROM evaluaciones e WHERE e.caso = c.numero " +
  "AND e.clasificacion <> 'inevaluable') > 0 " +
  "AND NOT EXISTS (SELECT 1 FROM evaluaciones e2 WHERE e2.caso = c.numero " +
  "AND e2.clasificacion <> 'inevaluable' AND " + MATRICULA_OK("e2.ing_email") + "))";

/* Cuántas opiniones FIRMES tiene un caso. Las `inevaluable` no cuentan: no
   opinan sobre la casa, dicen que faltan fotos. */
const FIRMES = "(SELECT COUNT(*) FROM evaluaciones e WHERE e.caso = c.numero " +
               "AND e.clasificacion <> 'inevaluable')";
/* Discrepan si hay más de una clasificación distinta entre las firmes. */
const DISCREPA = "((SELECT COUNT(DISTINCT e.clasificacion) FROM evaluaciones e " +
                 "WHERE e.caso = c.numero AND e.clasificacion <> 'inevaluable') > 1)";

async function triageCasos(env, url) {
  const estado = url.searchParams.get("estado") || "pendientes";
  const filtro = estado === "todos" ? "" :
    estado === "clasificados" ? "WHERE c.estado = 'clasificado'" :
    /* PIDEN CONFIRMACIÓN: urgentes con una sola opinión, y los que ya están en
       desacuerdo. Son los dos casos donde un segundo par de ojos cambia algo —
       sobre un urgente se va a mover una brigada, y una discrepancia parada no
       se resuelve sola. El esquema permitía la segunda opinión desde la 0010 y
       nada la pedía nunca. */
    estado === "confirmar" ? "WHERE (c.clasificacion = 'urgente' AND " + FIRMES + " = 1) OR " + DISCREPA + " OR " + SIN_RESPALDO :
    "WHERE c.estado IN ('recibido','en_revision')";
  const r = await env.DB.prepare(
    "SELECT c.numero, c.estado, c.clasificacion, c.sector, c.material, c.pisos, " +
    "c.danio_previo, c.habitada, c.heridos, c.creado_en, " +
    "(SELECT COUNT(*) FROM caso_medios m WHERE m.caso = c.numero) AS medios, " +
    "(SELECT COUNT(*) FROM evaluaciones e WHERE e.caso = c.numero) AS evaluaciones, " +
    DISCREPA + " AS discrepa, " + FIRMES + " AS firmes, " + SIN_RESPALDO + " AS sin_respaldo " +
    "FROM casos c " + filtro + " ORDER BY c.creado_en ASC LIMIT 200"
  ).all();

  /* Cuántos piden confirmación, siempre — así la pestaña puede decirlo sin que
     el ingeniero tenga que entrar a mirar si hay algo. */
  const p = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM casos c WHERE (c.clasificacion = 'urgente' AND " + FIRMES + " = 1) OR " + DISCREPA
  ).first();
  return json({ casos: r.results || [], porConfirmar: (p && p.n) || 0 });
}

/* GET /api/triage/caso/<n> — la ficha: lo que el ingeniero necesita para
   decidir, y nada más. Sin nombre, sin teléfono, sin dirección. */
async function triageFicha(env, numero) {
  const c = await env.DB.prepare(
    "SELECT numero, estado, clasificacion, sector, material, pisos, anio_aprox, " +
    "danio_previo, habitada, heridos, filtra_agua, nota, creado_en " +
    "FROM casos WHERE numero = ?"
  ).bind(numero).first();
  if (!c) return json({ error: "no_encontrado" }, 404);
  const m = await env.DB.prepare(
    "SELECT id, clase, categoria, bytes, nota FROM caso_medios WHERE caso = ? ORDER BY categoria, orden"
  ).bind(numero).all();
  const e = await env.DB.prepare(
    "SELECT ing_nombre, ing_matricula, clasificacion, nota_tecnica, recomendacion, falta, creado_en " +
    "FROM evaluaciones WHERE caso = ? ORDER BY creado_en"
  ).bind(numero).all();
  return json({ caso: c, medios: m.results || [], evaluaciones: e.results || [] });
}

/* GET /api/triage/medio/<id> — la foto. Se sirve por id y no por su llave de
   R2: así la llave no viaja al navegador y nadie puede pedir un objeto
   arbitrario del bucket, donde también viven comprobantes bancarios. */
async function triageMedio(env, id) {
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);
  const m = await env.DB.prepare("SELECT r2_key FROM caso_medios WHERE id = ?").bind(id).first();
  if (!m) return json({ error: "no_encontrado" }, 404);
  const obj = await env.MEDIA.get(m.r2_key);
  if (!obj) return json({ error: "no_encontrado" }, 404);
  return new Response(obj.body, {
    headers: {
      "content-type": (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

/* POST /api/triage/caso/<n>/evaluar — la nota técnica.
   El correo del ingeniero lo pone Access, no el formulario: es identidad ya
   verificada. La matrícula sí la escribe él, porque va firmada en lo que se le
   entrega a la familia. */
async function triageEvaluar(request, env, numero, email) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const caso = await env.DB.prepare(
    "SELECT numero, estado, contacto_email, token, sector FROM casos WHERE numero = ?"
  ).bind(numero).first();
  if (!caso) return json({ error: "no_encontrado" }, 404);

  const clasificacion = String(c.clasificacion || "");
  if (!CLASIFICACIONES.includes(clasificacion)) {
    return json({ error: "clasificacion_invalida", permitidas: CLASIFICACIONES }, 422);
  }
  const nombre = limpiar(c.nombre, 200);
  const matricula = limpiar(c.matricula, 60);
  const nota = limpiar(c.nota_tecnica, 2000);
  /* Sin nombre, matrícula y nota no se guarda. Una clasificación anónima o sin
     sustento no le sirve a nadie: ni a la familia, que recibe un documento, ni
     al ingeniero, que responde por lo que firma. */
  const faltan = [];
  if (!nombre) faltan.push("nombre");
  if (!matricula) faltan.push("matricula");
  if (!nota) faltan.push("nota_tecnica");
  if (faltan.length) return json({ error: "datos_incompletos", faltan }, 422);

  /* `inevaluable` EXIGE decir qué falta. Si no, el caso se queda parado sin que
     la familia sepa qué mandar, que es la peor salida posible. */
  const falta = limpiar(c.falta, 500);
  if (clasificacion === "inevaluable" && !falta) {
    return json({ error: "falta_requerido", ayuda: "Di qué foto o dato hace falta para poder evaluar." }, 422);
  }

  /* Y EL CONCEPTO ES OBLIGATORIO EN TODAS LAS DEMÁS, por simetría exacta con el
     de arriba. Desde el 19 ago 2026 el sitio le promete a la familia que va a
     recibir precauciones y materiales — no una prioridad de visita. Este campo
     es lo único que cumple esa promesa: si queda vacío, la pantalla de la
     familia, el correo y el PDF se limitan a NO pintarlo, así que la persona
     lee «esto es un concepto a distancia» y debajo no hay concepto ninguno.

     Es la misma clase de defecto que la auditoría de agosto marcó en severidad
     alta: una promesa publicada sin una función detrás. La diferencia es que
     esta la introduje yo al cambiar el copy sin cerrar el campo.

     `no_requiere` lo exige IGUAL, y es el caso donde más importa: si no va a ir
     nadie, este texto es lo único que la familia va a recibir en su vida sobre
     su casa. `inevaluable` queda fuera porque ahí la respuesta es `falta`. */
  const recomendacion = limpiar(c.recomendacion, 1000);
  if (clasificacion !== "inevaluable" && !recomendacion) {
    return json({
      error: "recomendacion_requerida",
      ayuda: "Escribe el concepto para la familia: si hay señales para no permanecer, qué precauciones tomar y con qué materiales reparar. Es lo que el sitio le prometió y lo único que va a recibir."
    }, 422);
  }

  await env.DB.prepare(
    "INSERT INTO evaluaciones (caso, ing_email, ing_nombre, ing_matricula, clasificacion, " +
    "nota_tecnica, recomendacion, falta) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(numero, email || "?", nombre, matricula, clasificacion, nota,
         recomendacion || null, falta || null).run();

  /* El caso pasa a `clasificado`, salvo que sea inevaluable: ahí vuelve a
     `en_revision` para que se le pida material a la familia y no se dé por
     cerrado. */
  const nuevoEstado = clasificacion === "inevaluable" ? "en_revision" : "clasificado";

  /* Con qué se queda el caso lo deciden TODAS sus evaluaciones, no la última en
     llegar. Gana la más grave, y si hay desacuerdo queda marcado — ver la regla
     completa junto a `resolverClasificacion`. */
  const veredicto = await resolverClasificacion(env, numero);
  await env.DB.prepare(
    "UPDATE casos SET estado = ?, clasificacion = ?, actualizado_en = datetime('now') WHERE numero = ?"
  ).bind(nuevoEstado, clasificacion === "inevaluable" ? null : veredicto.clasificacion, numero).run();

  /* Aviso a la familia, SOLO si dejó correo —es opcional a propósito— y SOLO si
     los ingenieros coinciden. Con dos opiniones distintas recibiría dos
     respuestas contradictorias sobre su propia casa en dos días; ahí el aviso
     va al equipo. Va después de escribir: el correo no puede tumbar una
     evaluación ya guardada, misma regla dura que en el cobro. */
  /* ¿EL VEREDICTO LO RESPALDA UNA MATRÍCULA VERIFICADA? (20 ago 2026)
     Si no, el concepto NO sale solo a la familia: entra a «Piden confirmación»
     y espera un segundo par de ojos. La razón no es desconfianza del voluntario
     —su trabajo se guarda igual y cuenta— es que el sitio le promete a la
     familia un concepto firmado con matrícula, y una matrícula que nadie
     comprobó todavía no es eso.

     Esto es lo que permite que cien ingenieros empiecen el mismo día sin que
     alguien tenga que verificar cien matrículas antes: la verificación pasa de
     ser un muro a ser una cola que se drena, y mientras se drena nada sin
     comprobar toca a una familia sin acompañamiento.

     Se reusa la supresión que ya existía para la discrepancia, por la misma
     razón de fondo: hay respuestas que es peor mandar que no mandar. */
  const respaldo = await env.DB.prepare(
    "SELECT EXISTS (SELECT 1 FROM evaluaciones e WHERE e.caso = ? " +
    "AND e.clasificacion <> 'inevaluable' AND " + MATRICULA_OK("e.ing_email") + ") AS ok"
  ).bind(numero).first();
  const conRespaldo = !!(respaldo && respaldo.ok);

  try {
    if (veredicto.discrepa) {
      const ops = await env.DB.prepare(
        "SELECT DISTINCT clasificacion FROM evaluaciones WHERE caso = ? AND clasificacion <> 'inevaluable'"
      ).bind(numero).all();
      await correoDiscrepancia(env, {
        numero, sector: caso.sector, clasificacion: veredicto.clasificacion,
        opiniones: (ops.results || []).map((o) => TRIAJE_ET[o.clasificacion] || o.clasificacion)
      });
    } else if (!conRespaldo && clasificacion !== "inevaluable") {
      /* Sin respaldo NO se le escribe a la familia, pero el equipo tiene que
         enterarse o el caso se queda parado para siempre — que sería peor que
         el problema original. Reusa el aviso de discrepancia, que es
         exactamente el mismo mecanismo: «esto necesita otro par de ojos». */
      await correoDiscrepancia(env, {
        numero, sector: caso.sector, clasificacion: veredicto.clasificacion,
        opiniones: ["concepto sin matrícula verificada — falta confirmar"]
      });
    } else if (caso.contacto_email) {
      await correoCasoClasificado(env, {
        numero, token: caso.token, clasificacion, recomendacion,
        falta, email: caso.contacto_email
      });
    }
  } catch (e) { console.error("correo caso clasificado", numero, e && e.message); }

  return json({ ok: true, numero, estado: nuevoEstado,
                clasificacion: nuevoEstado === "clasificado" ? veredicto.clasificacion : null,
                discrepa: veredicto.discrepa, con_respaldo: conRespaldo });
}

/* ========================================================================
   CUANDO DOS INGENIEROS NO COINCIDEN
   ========================================================================
   `evaluaciones` admite varias por caso desde la 0010, y su comentario dice por
   qué: «si dos coinciden, la clasificación pesa más; si discrepan, eso es
   exactamente lo que hay que mirar ANTES de decirle a una familia que no vuelva
   a dormir en su casa». Estaba escrito y nada lo usaba: la última evaluación
   sobrescribía la anterior en silencio, así que un segundo ingeniero podía
   bajar un caso de urgente a no_requiere y nadie se enteraba.

   DOS REGLAS, Y LAS DOS TIENEN LA MISMA RAZÓN DETRÁS.

   1. GANA LA MÁS GRAVE, no la más reciente. En una emergencia los dos errores
      no cuestan lo mismo: visitar una casa que no hacía falta es un viaje
      perdido; no visitar una que sí, es lo que este proyecto existe para
      evitar. Mientras haya desacuerdo, el caso se queda arriba.

   2. SI DISCREPAN, A LA FAMILIA NO SE LE ESCRIBE. Hoy cada evaluación le manda
      un correo; con dos opiniones distintas, la familia recibiría en dos días
      «visita urgente» y «no requiere visita». Eso no es transparencia, es
      ruido, y sobre su casa. El aviso va al equipo, que resuelve, y la familia
      recibe una sola respuesta cuando haya una.
   ======================================================================== */

const SEVERIDAD = { urgente: 0, programada: 1, no_requiere: 2 };

/* Mira TODAS las evaluaciones firmes del caso —las `inevaluable` no opinan
   sobre la casa, dicen que faltan fotos— y devuelve con qué se queda. */
async function resolverClasificacion(env, numero) {
  const r = await env.DB.prepare(
    "SELECT clasificacion, COUNT(*) AS n FROM evaluaciones " +
    "WHERE caso = ? AND clasificacion <> 'inevaluable' GROUP BY clasificacion"
  ).bind(numero).all();
  const filas = r.results || [];
  if (!filas.length) return { clasificacion: null, discrepa: false, firmes: 0 };

  let severa = filas[0].clasificacion, firmes = 0;
  for (const f of filas) {
    firmes += f.n;
    if ((SEVERIDAD[f.clasificacion] ?? 9) < (SEVERIDAD[severa] ?? 9)) severa = f.clasificacion;
  }
  return { clasificacion: severa, discrepa: filas.length > 1, firmes };
}

/* LA EVALUACIÓN QUE MANDA, que no es la más reciente.
   Desde que el caso se queda con la clasificación MÁS GRAVE, tomar la última
   evaluación para el informe y para la pantalla de la familia los hacía
   divergir — y justo cuando hay desacuerdo, que es cuando más importa.

   Medido en el ensayo del 19 ago: el caso decía `urgente` y su PDF decía
   «Visita programada», firmado por el ingeniero que NO tomó esa decisión, y la
   recomendación de seguridad —«no usen el cuarto del patio»— desaparecía de los
   dos sitios. Un documento que se contradice con el sistema que lo emite no
   sirve para nada, y el que se queda sin la advertencia es peligroso.

   Se toma la más reciente CUYA CLASIFICACIÓN ES LA DEL CASO. Así el veredicto,
   las observaciones y la firma vienen todos del mismo ingeniero — atribuirle a
   alguien una conclusión que no firmó sería peor que el error original. */
async function evaluacionVigente(env, numero, clasificacion) {
  if (clasificacion) {
    const e = await env.DB.prepare(
      "SELECT ing_nombre, ing_matricula, clasificacion, nota_tecnica, recomendacion, falta, creado_en " +
      "FROM evaluaciones WHERE caso = ? AND clasificacion = ? ORDER BY creado_en DESC LIMIT 1"
    ).bind(numero, clasificacion).first();
    if (e) return e;
  }
  /* Sin clasificación en el caso —`inevaluable`, que la deja en NULL— manda la
     última, que es la que dice qué falta. */
  return await env.DB.prepare(
    "SELECT ing_nombre, ing_matricula, clasificacion, nota_tecnica, recomendacion, falta, creado_en " +
    "FROM evaluaciones WHERE caso = ? ORDER BY creado_en DESC LIMIT 1"
  ).bind(numero).first();
}

/* Aviso al equipo. No lleva el detalle técnico de cada evaluación a propósito:
   quien tenga que resolver esto abre la ficha y las lee enteras. Lo que este
   correo tiene que lograr es que alguien la abra. */
async function correoDiscrepancia(env, x) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const filas = [
    ["Caso", x.numero],
    ["Sector", x.sector || "—"],
    ["Opiniones", x.opiniones.join(" · ")],
    ["Quedó en", TRIAJE_ET[x.clasificacion] || x.clasificacion]
  ];
  return enviarCorreo(env, {
    para,
    asunto: "Dos ingenieros discrepan: " + x.numero,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n"),
    html: plantillaCorreo({
      titulo: "Dos ingenieros discrepan: " + x.numero,
      parrafos: [
        "Dos evaluaciones de este caso no coinciden. Mientras tanto el caso se queda con la MÁS GRAVE, que es lo prudente, pero eso no resuelve nada por sí solo.",
        "A la familia NO se le ha escrito. Con dos opiniones distintas recibiría dos respuestas contradictorias sobre su propia casa; se le escribe cuando haya una sola.",
        "Abre la ficha y lee las notas técnicas completas: casi siempre la diferencia está en qué vio cada uno, no en el criterio."
      ],
      filas,
      cierre: "Está en el panel, en «Casas por revisar», marcado en discrepancia."
    }),
    etiqueta: "discrepancia-triaje", guia: x.numero
  });
}

/* El aviso va en español y no bilingüe: esta plataforma atiende a familias en
   Colombia y el caso no guarda idioma. Si algún día hace falta, se añade el
   campo, no se adivina. */
const TRIAJE_ET = {
  urgente: "Visita urgente",
  programada: "Visita programada",
  no_requiere: "No requiere visita por ahora",
  inevaluable: "No se pudo evaluar con las fotos enviadas"
};

async function correoCasoClasificado(env, x) {
  const inev = x.clasificacion === "inevaluable";
  const titulo = inev ? "Necesitamos un par de fotos más" : "Un ingeniero ya revisó tu caso";
  /* A la PÁGINA del caso, no al PDF. Cuando el ingeniero pide más fotos, este
     correo es el que se lo dice — y mandarlo a un PDF es mandarlo a un sitio
     donde no puede responder. La página sirve para las dos cosas: leer el
     resultado y agregar lo que falta. */
  const url = ORIGIN_MMC + "/caso/" + x.numero + "?t=" + x.token;

  const parrafos = inev ? [
    "Un ingeniero voluntario miró tu caso, pero con las fotos que enviaste no puede formarse un criterio.",
    "Esto es lo que hace falta: " + (x.falta || "más fotografías de los daños."),
    "Recuerda: no entres a la casa si ves muros caídos, techos hundidos o columnas partidas. Ninguna foto vale un accidente."
  ] : [
    "Un ingeniero voluntario revisó las fotos de tu casa y ya hay un concepto.",
    x.recomendacion ? "Qué hacer, y con qué reparar: " + x.recomendacion : null,
    "Esto no reemplaza una visita ni la declaratoria de tu municipio: es un concepto hecho a distancia, sobre las fotos que enviaste.",
    "Buscaremos gestionar ayuda para todas las casas que podamos, y no podemos comprometerla casa por casa."
  ].filter(Boolean);

  const filas = [
    ["Tu caso", x.numero],
    ["Resultado", TRIAJE_ET[x.clasificacion] || x.clasificacion]
  ];

  return enviarCorreo(env, {
    para: x.email,
    asunto: titulo + " · " + x.numero,
    texto: [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n"), "", "Tu concepto: " + url].join("\n"),
    html: plantillaCorreo({
      titulo, parrafos, filas,
      /* El botón dice lo que toca hacer, no siempre lo mismo. Si el ingeniero
         pidió más fotos, «Ver mi informe» manda a leer un documento que no
         existe todavía; lo que hay que hacer es subirlas. */
      boton: { url, texto: inev ? "Agregar las fotos que faltan" : "Ver mi concepto" },
      cierre: "Este mensaje es automático. Guarda el enlace: desde ahí puedes volver a abrir tu concepto cuando quieras."
    }),
    etiqueta: "caso-clasificado", guia: x.numero
  });
}


/* GET /api/caso/<n>/informe.pdf?t=<token> — el informe para la familia.
   Solo existe cuando un ingeniero ya evaluó: antes no hay nada que decir, y
   entregar un papel vacío sería peor que no entregarlo. Se toma la evaluación
   MÁS RECIENTE; si hubo dos y discrepan, eso lo resuelve una persona antes de
   que el informe salga, no el PDF. */
async function apiCasoInforme(env, numero, token) {
  const c = await env.DB.prepare(
    "SELECT numero, token, estado, clasificacion, sector, material, pisos, anio_aprox, " +
    "danio_previo, habitada FROM casos WHERE numero = ?"
  ).bind(numero).first();
  if (!c || !token || c.token !== token) return json({ error: "no_autorizado" }, 403);

  const e = await evaluacionVigente(env, numero, c.clasificacion);
  if (!e) return json({ error: "sin_evaluacion", ayuda: "Todavía ningún ingeniero ha revisado este caso." }, 409);

  const m = await env.DB.prepare("SELECT COUNT(*) AS n FROM caso_medios WHERE caso = ?").bind(numero).first();
  const hoy = new Date().toISOString().slice(0, 10);
  const bytes = await informeTriage({
    numero: c.numero, sector: c.sector, material: c.material, pisos: c.pisos,
    anio_aprox: c.anio_aprox, danio_previo: c.danio_previo, habitada: c.habitada,
    medios: (m && m.n) || 0,
    clasificacion: e.clasificacion, nota_tecnica: e.nota_tecnica,
    recomendacion: e.recomendacion, falta: e.falta,
    ing_nombre: e.ing_nombre, ing_matricula: e.ing_matricula, evaluado_en: e.creado_en
  }, hoy);

  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="informe-' + numero + '.pdf"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}


/* GET /api/admin/casos — la bandeja del EQUIPO, no la del ingeniero.
   La diferencia es deliberada: `/triaje` oculta contacto y dirección porque
   para dar el concepto no hacen falta; aquí SÍ están, porque son lo que
   permite ir a visitar. Cada quien ve lo que su trabajo necesita y nada más. */
async function adminCasos(env) {
  const r = await env.DB.prepare(
    "SELECT c.numero, c.estado, c.clasificacion, c.sector, c.direccion_ref, " +
    "c.contacto_nombre, c.contacto_tel, c.contacto_email, c.material, c.pisos, " +
    "c.danio_previo, c.habitada, c.heridos, c.consent_publico, c.creado_en, " +
    "(SELECT COUNT(*) FROM caso_medios m WHERE m.caso = c.numero) AS medios, " +
    "(SELECT e.ing_nombre FROM evaluaciones e WHERE e.caso = c.numero ORDER BY e.creado_en DESC LIMIT 1) AS ing, " +
    "(SELECT e.recomendacion FROM evaluaciones e WHERE e.caso = c.numero ORDER BY e.creado_en DESC LIMIT 1) AS reco, " +
    /* El último movimiento sale del registro de auditoría, que es donde
       `adminMoverCaso` deja el motivo del cierre o del descarte. Sin esto, un
       caso cerrado se ve igual que uno abandonado. El prefijo tiene que
       coincidir con el que allí se escribe. */
    "(SELECT a.detalle FROM consentimientos a WHERE a.tipo = 'auditoria' " +
    " AND a.detalle LIKE 'caso ' || c.numero || ' %' ORDER BY a.id DESC LIMIT 1) AS ultimo, " +
    "((SELECT COUNT(DISTINCT e.clasificacion) FROM evaluaciones e " +
    "  WHERE e.caso = c.numero AND e.clasificacion <> 'inevaluable') > 1) AS discrepa " +
    "FROM casos c ORDER BY " +
    /* Lo terminado se hunde al fondo. Antes no hacía falta porque nada
       terminaba nunca; ahora sí, y una bandeja que mezcla lo cerrado con lo
       urgente deja de servir para lo único que sirve: saber qué falta. */
    "CASE WHEN c.estado IN ('cerrado','descartado') THEN 1 ELSE 0 END, " +
    /* Urgentes primero, y dentro de cada grupo el más viejo antes: en una
       emergencia el orden es la gravedad y luego la espera, nunca la novedad. */
    "CASE c.clasificacion WHEN 'urgente' THEN 0 WHEN 'programada' THEN 1 " +
    "WHEN 'no_requiere' THEN 3 ELSE 2 END, c.creado_en ASC LIMIT 200"
  ).all();

  /* POSIBLE DUPLICADO, y se calcula AQUÍ y no en SQL.
     La familia que no está segura de si se envió manda el caso otra vez, y en
     la bandeja aparecen dos casas donde hay una — así se va dos veces a la
     misma puerta durante una brigada de cinco días. Decirlo en el formulario
     habría sido peor: quien enviara un caso con un teléfono adivinado se
     enteraría de que ese número reportó, que es justo el dato que la Ley 1581
     protege. Aquí no se filtra nada: lo ve el equipo, detrás de Access.

     POR QUÉ SALIÓ DE SQL: estaba como subconsulta correlacionada que
     normalizaba los DOS lados con cinco REPLACE anidados, así que el índice
     `ix_casos_tel` no se podía usar y hacía un escaneo completo POR FILA.
     Medido con 600 casos: 165 ms contra 0 ms sin ella, y crece de forma
     cuadrática — justo en la pantalla que el equipo más va a mirar cuando la
     brigada traiga volumen. Aquí es UN escaneo y un mapa: lineal, y sin
     migración. */
  const tel = await env.DB.prepare("SELECT numero, contacto_tel FROM casos").all();
  const porTelefono = new Map();
  for (const f of tel.results || []) {
    const k = String(f.contacto_tel || "").replace(/\D/g, "");
    if (!k) continue;
    if (!porTelefono.has(k)) porTelefono.set(k, []);
    porTelefono.get(k).push(f.numero);
  }
  const casos = (r.results || []).map((c) => {
    const k = String(c.contacto_tel || "").replace(/\D/g, "");
    const otros = (porTelefono.get(k) || []).filter((n) => n !== c.numero);
    return { ...c, dup: otros.length ? otros[0] : null };
  });
  return json({ casos });
}

/* ========================================================================
   POST /api/admin/caso/<n>/estado — mover un caso, y poder cerrarlo
   ========================================================================
   `visitado`, `cerrado` y `descartado` estaban en el esquema desde la 0010 y
   NADA los escribía: un caso entraba a la bandeja y no salía nunca. Con la
   brigada visitando cinco territorios, «Casas por revisar» iba a crecer sin que
   nada saliera de ella, hasta volverse ilegible justo cuando más se necesita.

   POR QUÉ ESTO NO ES UNA MIGRACIÓN. El motivo del cierre no se guarda en
   `casos` sino en el registro de auditoría que ya usan las inscripciones y las
   entregas. No hace falta columna nueva —y por lo tanto no hay que aplicar una
   migración a mano en producción antes de desplegar, que es donde este proyecto
   ya se tropezó (7403 en `d1 migrations apply`)—, y a cambio queda algo mejor
   que una columna: el rastro completo, con quién y cuándo, y no solo el último.

   EL MOTIVO ES OBLIGATORIO para cerrar y para descartar. Un caso que desaparece
   de la lista sin decir por qué es indistinguible de un caso perdido, y aquí
   del otro lado hay una familia que mandó fotos de su casa rota. Marcar
   `visitado` no lo pide: ahí lo que pasó es evidente.

   REABRIR ES PARTE DEL DISEÑO, no una concesión. El descarte es un juicio
   humano hecho a las carreras en medio de una emergencia; si no se puede
   deshacer, el error se vuelve permanente. Vuelve a `en_revision`, nunca a
   `recibido`: ya lo miró alguien, y decir lo contrario sería falso. */

const CASO_ACTIVOS = ["recibido", "en_revision", "clasificado", "visitado"];
const CASO_DESTINOS = {
  /* destino: desde qué estados se puede, y si exige motivo */
  /* `visitado` PIDE nota, y ese cambio es el punto de toda esta tanda: era un
     estado sin contenido. La brigada podía recorrer cinco territorios y no
     quedar registrado qué encontró en ninguna puerta. Lo que se escribe aquí es
     la única evidencia de que se estuvo. */
  visitado:    { desde: ["recibido", "en_revision", "clasificado"], motivo: true },
  cerrado:     { desde: CASO_ACTIVOS, motivo: true },
  descartado:  { desde: CASO_ACTIVOS, motivo: true },
  en_revision: { desde: ["cerrado", "descartado"], motivo: false }
};

async function adminMoverCaso(request, env, numero, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const nuevo = String(c.estado || "");
  const regla = CASO_DESTINOS[nuevo];
  if (!regla) return json({ error: "estado_no_permitido", permitidos: Object.keys(CASO_DESTINOS) }, 400);

  const caso = await env.DB.prepare("SELECT numero, estado FROM casos WHERE numero = ?").bind(numero).first();
  if (!caso) return json({ error: "no_encontrado" }, 404);
  if (caso.estado === nuevo) return json({ error: "sin_cambio", estado: caso.estado }, 409);
  /* La transición se valida en el servidor y no solo en los botones del panel:
     los botones son una comodidad, no un control. */
  if (!regla.desde.includes(caso.estado)) {
    return json({ error: "transicion_invalida", desde: caso.estado, a: nuevo, permitidas: regla.desde }, 409);
  }

  const motivo = String(c.motivo == null ? "" : c.motivo).trim().slice(0, 500);
  if (regla.motivo && !motivo) {
    return json({ error: "motivo_requerido",
                  ayuda: "Di qué pasó con el caso. Sin eso, mañana nadie sabe si se atendió o se perdió." }, 422);
  }

  await env.DB.prepare(
    "UPDATE casos SET estado = ?, actualizado_en = datetime('now') WHERE numero = ?"
  ).bind(nuevo, numero).run();

  /* El prefijo «caso <numero>» no es cosmético: es por lo que la bandeja
     recupera el último movimiento sin una tabla más. Si cambia aquí, cambia en
     la subconsulta de `adminCasos`. */
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "caso " + numero + " " + caso.estado + " -> " + nuevo +
         (motivo ? " · " + motivo : "")).run();

  return json({ ok: true, numero, estado: nuevo, anterior: caso.estado });
}

/* ========================================================================
   POST /api/admin/caso/<n>/medio — la foto de la visita
   ========================================================================
   Hasta ahora, todo lo que entraba a `caso_medios` lo subía la familia con su
   token. El equipo que va a terreno no tenía por dónde: podría usar el token de
   la familia —hoy la ficha lo muestra— pero eso mezclaría en el mismo registro
   lo que mandó la casa y lo que vio el equipo, y son dos cosas distintas.

   Va con `categoria = 'visita'`, que NO está en la lista pública: una familia no
   puede etiquetar una foto suya como evidencia de visita ni por accidente.

   Sin esto, `visitado` era un estado sin contenido — la brigada podía recorrer
   cinco territorios y no quedar ni una prueba de que estuvo. Para un proyecto
   cuyo lema es «evidencia, no promesas», ese era el hueco grande.
   ======================================================================== */

/* La pública se queda como estaba: `visita` solo la puede poner el equipo. */
const CATEGORIA_VISITA = "visita";

async function adminSubirMedio(request, env, numero, url, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);

  const caso = await env.DB.prepare("SELECT numero FROM casos WHERE numero = ?").bind(numero).first();
  if (!caso) return json({ error: "no_encontrado" }, 404);

  const cuantos = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM caso_medios WHERE caso = ?"
  ).bind(numero).first();
  if (cuantos && cuantos.n >= MAX_MEDIOS) return json({ error: "demasiados_archivos", max: MAX_MEDIOS }, 409);

  const tipo = String(request.headers.get("content-type") || "").split(";")[0].trim();
  const spec = TIPOS_MEDIO[tipo];
  if (!spec) return json({ error: "tipo_no_permitido", permitidos: Object.keys(TIPOS_MEDIO) }, 415);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: "archivo_vacio" }, 400);
  if (bytes.length > spec.max) {
    return json({ error: "archivo_muy_grande", max_mb: Math.round(spec.max / 1048576) }, 413);
  }

  const clave = "casos/" + numero + "/" + tokenNuevo().slice(0, 8) + "." + spec.ext;
  await env.MEDIA.put(clave, bytes, { httpMetadata: { contentType: tipo } });
  await env.DB.prepare(
    "INSERT INTO caso_medios (caso, r2_key, clase, categoria, bytes, nota, orden) " +
    "VALUES (?,?,?,?,?,?, (SELECT COUNT(*) FROM caso_medios WHERE caso = ?))"
  ).bind(numero, clave, spec.clase, CATEGORIA_VISITA, bytes.length,
         limpiar(url.searchParams.get("nota"), 200) || null, numero).run();
  await env.DB.prepare("UPDATE casos SET actualizado_en = datetime('now') WHERE numero = ?").bind(numero).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "caso " + numero + " foto de visita añadida").run();

  return json({ ok: true, clase: spec.clase });
}

/* ========================================================================
   GET /api/admin/ruta — lo que hay que visitar, para llevar en el bolsillo
   ========================================================================
   La bandeja del panel es una tabla de escritorio y sirve para decidir. Esto es
   lo otro: el equipo en la calle, con una mano en el volante, que necesita
   saber a qué puerta va ahora y cómo llamar antes de tocarla.

   Trae SOLO lo vivo. Lo cerrado y lo descartado no son una parada — y en una
   pantalla de teléfono cada fila que sobra es una que hay que pasar de largo.
   ======================================================================== */
async function adminRuta(env, url) {
  const sector = limpiar(url.searchParams.get("sector"), 160);
  const filtro = sector ? " AND c.sector = ?" : "";
  const q = env.DB.prepare(
    "SELECT c.numero, c.estado, c.clasificacion, c.sector, c.direccion_ref, " +
    "c.contacto_nombre, c.contacto_tel, c.habitada, c.heridos, c.creado_en, " +
    "(SELECT e.recomendacion FROM evaluaciones e WHERE e.caso = c.numero " +
    " ORDER BY e.creado_en DESC LIMIT 1) AS reco " +
    "FROM casos c WHERE c.estado NOT IN ('cerrado','descartado')" + filtro + " ORDER BY " +
    /* Urgente primero, y dentro de cada grupo el más viejo antes. Lo ya visitado
       se hunde: sigue en la lista porque falta cerrarlo, pero no es una parada. */
    "CASE WHEN c.estado = 'visitado' THEN 1 ELSE 0 END, " +
    "CASE c.clasificacion WHEN 'urgente' THEN 0 WHEN 'programada' THEN 1 " +
    "WHEN 'no_requiere' THEN 3 ELSE 2 END, c.creado_en ASC LIMIT 300"
  );
  const r = await (sector ? q.bind(sector) : q).all();

  /* Los sectores salen de los casos vivos, no de una lista fija: el día que la
     brigada entre a un barrio nuevo, aparece solo. */
  const s = await env.DB.prepare(
    "SELECT sector, COUNT(*) AS n FROM casos WHERE estado NOT IN ('cerrado','descartado') " +
    "GROUP BY sector ORDER BY n DESC LIMIT 40"
  ).all();

  return json({ casos: r.results || [], sectores: s.results || [] });
}

/* ========================================================================
   GET /api/casos/publicos — el banco público de casas
   ========================================================================
   `consent_publico` y su índice `ix_casos_publico` existen desde la 0010 y nada
   los consumía. Esto es lo primero que los usa, y es la única evidencia pública
   que el programa de vivienda ha podido dar hasta ahora.

   QUÉ SALE Y QUÉ NO, y la lista corta importa más que la larga:

   · SALE el número, el sector, la clasificación, el material y los pisos. El
     sector es lo único publicable por diseño de la 0010 —zona, nunca dirección.
   · NO SALEN LAS FOTOS. Ninguna. Una fachada ES una dirección: quien conozca el
     barrio identifica la casa en dos segundos, y la familia autorizó aparecer
     «SIN mi nombre ni mi dirección». Publicar la foto sería incumplir eso
     mientras se dice que se cumple.
   · NO SALE `nota`, el campo libre donde la familia cuenta lo que quiera. Ahí
     puede haber un apellido, una referencia o el nombre de un vecino. No se
     puede auditar texto libre a mano cada vez.
   · NO SALEN contacto ni `direccion_ref`, obviamente.

   Solo casos YA CLASIFICADOS: publicar uno que ningún ingeniero ha mirado sería
   presentar como hallazgo lo que todavía es una solicitud sin revisar.
   ======================================================================== */
async function apiCasosPublicos(env) {
  const r = await env.DB.prepare(
    "SELECT numero, sector, clasificacion, material, pisos, creado_en FROM casos " +
    "WHERE consent_publico = 1 AND clasificacion IS NOT NULL " +
    "AND estado NOT IN ('cerrado','descartado') ORDER BY " +
    "CASE clasificacion WHEN 'urgente' THEN 0 WHEN 'programada' THEN 1 ELSE 2 END, " +
    "creado_en ASC LIMIT 300"
  ).all();

  /* Los totales cuentan TODO lo clasificado, con consentimiento o sin él: son
     el tamaño real de lo revisado, y ese número no identifica a nadie. Si solo
     contaran lo publicable, el sitio estaría diciendo que revisó menos casas de
     las que revisó — y eso también es faltar a la verdad. */
  const t = await env.DB.prepare(
    "SELECT COUNT(*) AS revisados, " +
    "SUM(CASE WHEN clasificacion = 'urgente' THEN 1 ELSE 0 END) AS urgentes, " +
    "SUM(CASE WHEN estado = 'visitado' THEN 1 ELSE 0 END) AS visitados " +
    "FROM casos WHERE clasificacion IS NOT NULL AND estado <> 'descartado'"
  ).first();

  return json({
    casos: r.results || [],
    totales: {
      revisados: (t && t.revisados) || 0,
      urgentes: (t && t.urgentes) || 0,
      visitados: (t && t.visitados) || 0,
      publicables: (r.results || []).length
    }
  });
}

/* ========================================================================
   GET /api/admin/caso/<n> — la ficha completa, para corregirla y curarla
   ========================================================================
   La bandeja es una tabla y sirve para decidir a dónde ir. Esto es lo otro:
   abrir un caso, ver lo que la familia escribió y lo que subió, y poder
   arreglarlo. Trae también el historial, que es el registro de auditoría
   filtrado por este caso — quién lo movió, cuándo y por qué.
   ======================================================================== */
async function adminCasoFicha(env, numero) {
  /* Las columnas van enumeradas y no `SELECT *` por una en concreto: `token`.
     Es la llave de la familia, y que viaje al panel tiene que ser una decisión
     y no un descuido de la consulta. Viaja A PROPÓSITO: hoy, si una familia
     pierde su enlace, no hay forma de devolvérselo —el número de caso solo no
     abre nada— y el equipo se queda sin poder ayudar a quien ya confió. El
     panel está detrás de Access, y quien entra ahí ya ve el teléfono y la
     dirección, que es información más delicada que esta. */
  const c = await env.DB.prepare(
    "SELECT numero, token, estado, clasificacion, sector, direccion_ref, contacto_nombre, " +
    "contacto_tel, contacto_email, material, pisos, anio_aprox, danio_previo, habitada, " +
    "heridos, filtra_agua, nota, consent_eval, consent_publico, consent_en, creado_en, " +
    "actualizado_en FROM casos WHERE numero = ?"
  ).bind(numero).first();
  if (!c) return json({ error: "no_encontrado" }, 404);

  const m = await env.DB.prepare(
    "SELECT id, clase, categoria, bytes, nota, orden, subido_en FROM caso_medios " +
    "WHERE caso = ? ORDER BY categoria, orden"
  ).bind(numero).all();
  const e = await env.DB.prepare(
    "SELECT ing_nombre, ing_matricula, clasificacion, nota_tecnica, recomendacion, falta, creado_en " +
    "FROM evaluaciones WHERE caso = ? ORDER BY creado_en DESC"
  ).bind(numero).all();
  const h = await env.DB.prepare(
    "SELECT sujeto, detalle, otorgado_en FROM consentimientos " +
    "WHERE tipo = 'auditoria' AND detalle LIKE 'caso ' || ? || ' %' ORDER BY id DESC LIMIT 30"
  ).bind(numero).all();

  /* El enlace lo arma el SERVIDOR y no el panel, y no es una preferencia de
     estilo: desde la migración su origen es el subdominio del triaje y no el del
     panel, así que `location.origin` del navegador ya no sirve. Armarlo aquí
     deja el dominio escrito UNA sola vez, en `ORIGIN_MMC` — y el gate no puede
     validar `adminJS()` si se le mete una interpolación, así que la alternativa
     habría sido un segundo literal del mismo dominio esperando a divergir. */
  const enlace = ORIGIN_MMC + "/caso/" + c.numero + "?t=" + (c.token || "");

  return json({ caso: c, enlace, medios: m.results || [], evaluaciones: e.results || [], historial: h.results || [] });
}

/* ========================================================================
   POST /api/admin/caso/<n>/corregir — arreglar lo que la familia escribió mal
   ========================================================================
   Un sector mal escrito, un teléfono con un dígito de menos o una dirección a
   medias no son detalles: son la diferencia entre encontrar la casa y no
   encontrarla. La familia llenó el formulario desde un celular, en una zona de
   desastre, y a veces con la casa rota detrás. Que ese error fuera permanente
   era el defecto.

   DOS REGLAS QUE NO SE DEBEN AFLOJAR:

   1. `consent_publico` SOLO SE PUEDE REVOCAR, nunca conceder. Que alguien del
      equipo pueda marcar «la familia autoriza publicar» es fabricar un
      consentimiento, y la Ley 1581 pide justo lo contrario. Si la familia
      cambia de opinión hacia el sí, vuelve a decirlo ella. Hacia el no, basta
      con que lo pida — por eso la 0010 lo dejó revocable.

   2. La auditoría guarda QUÉ CAMPOS cambiaron, NO sus valores. Escribir el
      teléfono viejo y el nuevo metería datos personales en una tabla que no es
      la suya y que nadie limpia. Los nombres de los campos dan la misma
      rendición de cuentas sin arrastrar la PII detrás. */

const CASO_TEXTO = {
  sector: 160, direccion_ref: 240, contacto_nombre: 200, contacto_tel: 40,
  contacto_email: 200, anio_aprox: 40, nota: 600
};
const CASO_BOOL = ["danio_previo", "habitada", "heridos", "filtra_agua"];

async function adminCorregirCaso(request, env, numero, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const caso = await env.DB.prepare("SELECT * FROM casos WHERE numero = ?").bind(numero).first();
  if (!caso) return json({ error: "no_encontrado" }, 404);

  const sets = [], vals = [], cambiados = [];

  for (const [campo, largo] of Object.entries(CASO_TEXTO)) {
    if (!(campo in c)) continue;
    const v = limpiar(c[campo], largo) || null;
    if (v === (caso[campo] || null)) continue;
    /* Estos tres son lo que identifica a la familia y lo que permite llegar:
       vaciarlos deja un caso al que nadie puede volver. */
    if (!v && (campo === "sector" || campo === "contacto_nombre" || campo === "contacto_tel")) {
      return json({ error: "campo_requerido", campo }, 422);
    }
    sets.push(campo + " = ?"); vals.push(v); cambiados.push(campo);
  }
  if ("contacto_email" in c && c.contacto_email &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpiar(c.contacto_email, 200))) {
    return json({ error: "email_invalido" }, 422);
  }
  if ("material" in c) {
    const v = MATERIALES.includes(c.material) ? c.material : null;
    if (v !== (caso.material || null)) { sets.push("material = ?"); vals.push(v); cambiados.push("material"); }
  }
  if ("pisos" in c) {
    const n = Number(c.pisos);
    const v = Number.isInteger(n) && n > 0 && n < 20 ? n : null;
    if (v !== (caso.pisos == null ? null : caso.pisos)) { sets.push("pisos = ?"); vals.push(v); cambiados.push("pisos"); }
  }
  for (const campo of CASO_BOOL) {
    if (!(campo in c)) continue;
    const v = c[campo] ? 1 : 0;
    if (v === caso[campo]) continue;
    sets.push(campo + " = ?"); vals.push(v); cambiados.push(campo);
  }
  /* Solo hacia el no. Ver la regla 1 de arriba. */
  if ("consent_publico" in c && !c.consent_publico && caso.consent_publico) {
    sets.push("consent_publico = 0"); cambiados.push("consent_publico REVOCADO");
  }

  if (!sets.length) return json({ error: "sin_cambios" }, 409);

  await env.DB.prepare(
    "UPDATE casos SET " + sets.join(", ") + ", actualizado_en = datetime('now') WHERE numero = ?"
  ).bind(...vals, numero).run();

  const motivo = limpiar(c.motivo, 300);
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "caso " + numero + " corregido: " + cambiados.join(", ") +
         (motivo ? " · " + motivo : "")).run();

  return json({ ok: true, numero, cambiados });
}

/* ========================================================================
   POST /api/admin/caso/<n>/medio/<id>/borrar — quitar una foto, de verdad
   ========================================================================
   EL SISTEMA LE PROMETE A LA FAMILIA QUE SU CASO NO SALE CON PERSONAS DENTRO, y
   hasta hoy no tenía cómo cumplirlo: nada borraba de `caso_medios` y nada
   tocaba el R2. Si alguien subía por error una foto con su hija dentro, ahí se
   quedaba. Una promesa sin mecanismo no es una promesa.

   SE BORRA DE VERDAD, no se marca como borrado. Un borrado blando que deja el
   objeto en el bucket no cumple lo que se pidió: la familia no está pidiendo
   que la foto se oculte, está pidiendo que no exista. Por eso va primero el R2
   y después la fila — al revés, un fallo a mitad dejaría el archivo huérfano en
   el bucket sin nada que lo apunte, que es el peor de los dos órdenes.

   El motivo es obligatorio y queda en la auditoría; el contenido de la foto,
   nunca. Y no se impide borrar la última: si tiene que irse, se va. El caso se
   quedará sin material y un ingeniero dirá que no puede evaluarlo, que es
   exactamente lo que debe pasar. */
async function adminBorrarMedio(request, env, numero, id, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);
  let c = {};
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const motivo = limpiar(c.motivo, 300);
  if (!motivo) {
    return json({ error: "motivo_requerido",
                  ayuda: "Di por qué se quita. Es lo que prueba que fue una decisión y no un accidente." }, 422);
  }

  /* Se exige que la foto sea DE ESE CASO. Sin el cruce, un id suelto borraría
     la foto de cualquier otra familia. */
  const m = await env.DB.prepare(
    "SELECT id, r2_key FROM caso_medios WHERE id = ? AND caso = ?"
  ).bind(id, numero).first();
  if (!m) return json({ error: "no_encontrado" }, 404);

  await env.MEDIA.delete(m.r2_key);
  await env.DB.prepare("DELETE FROM caso_medios WHERE id = ?").bind(id).run();
  await env.DB.prepare("UPDATE casos SET actualizado_en = datetime('now') WHERE numero = ?").bind(numero).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "caso " + numero + " foto #" + id + " BORRADA · " + motivo).run();

  return json({ ok: true, numero, id });
}


/* GET /api/admin/comprobante/<guia> — solo tras Access. El comprobante lleva
   datos bancarios del donante y nunca es público. */
async function adminComprobante(env, guia) {
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);
  const a = await env.DB.prepare("SELECT comprobante FROM aportes WHERE guia = ?").bind(guia).first();
  if (!a || !a.comprobante) return json({ error: "no_encontrado" }, 404);
  const obj = await env.MEDIA.get(a.comprobante);
  if (!obj) return json({ error: "no_encontrado" }, 404);
  return new Response(obj.body, {
    headers: {
      "content-type": (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

async function adminReportadas(env) {
  const r = await env.DB.prepare(
    "SELECT a.guia, a.monto_centavos, a.modo, a.destino_id, a.proyecto, a.quiere_certificado, " +
    "a.referencia_pago, a.comprobante, a.creada_en, d.nombre, d.email " +
    "FROM aportes a LEFT JOIN donantes d ON d.id = a.donante_id " +
    "WHERE a.estado = 'reportada' ORDER BY a.creada_en DESC LIMIT 100"
  ).all();
  return json({ reportadas: r.results || [] });
}

/* Confirmar es contrastar contra el extracto y dejarlo firmado con nombre. Por
   eso pide la referencia bancaria: es la que cita el numeral 5 del certificado,
   y citar un id de Wompi que no existe sería falso en un documento juramentado. */
async function adminConfirmarTransferencia(request, env, guia, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { /* opcional */ }

  const a = await env.DB.prepare(
    "SELECT guia, estado, monto_centavos, modo, destino_id, frecuencia, idioma, token, donante_id " +
    "FROM aportes WHERE guia = ?"
  ).bind(guia).first();
  if (!a) return json({ error: "no_encontrada" }, 404);
  if (a.estado !== "reportada") return json({ error: "estado_no_permite", estado: a.estado }, 409);

  if (c.descartar) {
    const motivo = limpiar(c.motivo, 280) || "sin motivo";
    await env.DB.prepare(
      "UPDATE aportes SET estado = 'rechazada', wompi_estado = ?, actualizada_en = datetime('now') WHERE guia = ?"
    ).bind("DESCARTADA_MANUAL: " + motivo, guia).run();
    await env.DB.prepare(
      "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
    ).bind(quien || "?", "transferencia " + guia + " DESCARTADA: " + motivo).run();
    return json({ ok: true, guia, estado: "rechazada" });
  }

  const refer = limpiar(c.referencia, 80);
  if (!refer) {
    return json({
      error: "referencia_requerida",
      ayuda: "Escribe el número del comprobante bancario: es el que cita el certificado, y no puede ser un id de Wompi que no existe."
    }, 422);
  }

  await env.DB.prepare(
    "UPDATE aportes SET estado = 'aprobada', confirmacion = 'manual', confirmado_por = ?, " +
    "confirmado_en = datetime('now'), referencia_pago = ?, aprobada_en = datetime('now'), " +
    "actualizada_en = datetime('now') WHERE guia = ?"
  ).bind(quien || "?", refer, guia).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "transferencia " + guia + " CONFIRMADA contra extracto · ref " + refer).run();

  /* Ahora sí hay dinero: el donante recibe lo mismo que quien paga por la
     pasarela — su recibo con la guía. */
  try {
    const d = await env.DB.prepare("SELECT nombre, email FROM donantes WHERE id = ?").bind(a.donante_id).first();
    await correoAporteAprobado(env, {
      guia: a.guia, monto_centavos: a.monto_centavos, idioma: a.idioma,
      modo: a.modo, destino_id: a.destino_id, frecuencia: a.frecuencia, token: a.token
    }, d && d.email, d && d.nombre);
  } catch (e) { console.error("correo tras confirmar", guia, e && e.message); }

  return json({ ok: true, guia, estado: "aprobada" });
}

async function correoTransferenciaReportada(env, x) {
  const en = x.idioma === "en";
  const titulo = en ? "We got your transfer report" : "Recibimos el reporte de tu transferencia";
  const parrafos = en ? [
    "Thank you. Your tracking number is below — keep it.",
    "This is not confirmed yet: we check every transfer against the bank statement before recording it as received. As soon as we do, your receipt arrives automatically.",
    "If you have not uploaded the proof of transfer yet, replying to this email with it speeds things up."
  ] : [
    "Gracias. Abajo está tu número de guía: guárdalo.",
    "Todavía no está confirmada: contrastamos cada transferencia contra el extracto antes de registrarla como recibida. Apenas lo hagamos, tu recibo te llega automáticamente.",
    "Si aún no subiste el comprobante, responder este correo con él acelera la verificación."
  ];
  const filas = en
    ? [["Tracking number", x.guia], ["Amount", fmtPesos(x.monto * 100) + " COP"], ["Transfer date", x.fecha]]
    : [["Número de guía", x.guia], ["Monto", fmtPesos(x.monto * 100) + " COP"], ["Fecha de la transferencia", x.fecha]];
  return enviarCorreo(env, {
    para: x.email, asunto: titulo + " · " + x.guia,
    texto: [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas }),
    etiqueta: "transferencia-reportada", guia: x.guia
  });
}

async function correoAvisoTransferencia(env, x) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const titulo = "Transferencia reportada: " + x.guia;
  const filas = [
    ["Guía", x.guia], ["Monto", fmtPesos(x.monto * 100) + " COP"],
    ["Fecha que reporta", x.fecha], ["Referencia", x.refer || "(no dio)"],
    ["Destino", x.destino || "Fondo general"],
    ["Donante", x.nombre], ["Correo", x.email]
  ];
  return enviarCorreo(env, {
    para, asunto: titulo,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n"),
    html: plantillaCorreo({
      titulo,
      parrafos: ["Alguien reporta que transfirió. NO está confirmada: contrástala contra el extracto y confírmala en /admin.",
                 "Hasta que la confirmes no hay recibo ni certificado, y el donante ya sabe que es así."],
      filas
    }),
    etiqueta: "aviso-transferencia"
  });
}

/* ========================================================================
   CARNET DE MIEMBRO
   ========================================================================
   El sitio lo prometía en ocho lugares y no existía. Ahora existe, con dos
   reglas que lo definen:

   · SOLO membresía recurrente. Un aporte único no lo crea, y los de la brigada
     menos — esa campaña fuerza aporte único y esconde el nivel a propósito.
   · Es una PÁGINA VERIFICABLE, no una imagen. Una tarjeta descargable es una
     tarjeta falsificable: el comercio aliado no tendría cómo saber si vale.
     Esta consulta la base y dice VIGENTE o VENCIDO en el momento.
   ======================================================================== */

/* Los mismos umbrales y nombres que muestra la calculadora (TIERS en app.js).
   Si cambian allá, cambian aquí: son la misma promesa vista desde dos lados. */
const NIVELES_MB = [
  { id: "semilla", min: 0,      es: "Semilla", en: "Seed" },
  { id: "retono",  min: 50000,  es: "Retoño",  en: "Sprout" },
  { id: "arbol",   min: 120000, es: "Árbol",   en: "Tree" },
  { id: "bosque",  min: 250000, es: "Bosque",  en: "Forest" }
];
function nivelPorMensual(cop) {
  let n = NIVELES_MB[0];
  for (const x of NIVELES_MB) if (cop >= x.min) n = x;
  return n;
}
function nivelDe(id) { return NIVELES_MB.find((x) => x.id === id) || NIVELES_MB[0]; }

async function siguienteMiembro(env, anio) {
  const { results } = await env.DB.prepare(
    "INSERT INTO numerador_miembro (anio, ultimo) VALUES (?, 1) " +
    "ON CONFLICT(anio) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo"
  ).bind(anio).all();
  const n = results && results[0] ? results[0].ultimo : null;
  if (!n) throw new Error("numerador de miembros no devolvió consecutivo");
  return "MB-" + anio + "-" + String(n).padStart(6, "0");
}

function sumarDias(dias) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/* Crea o RENUEVA el carnet tras un aporte recurrente aprobado.
   La vigencia lleva holgura sobre el ciclo —35 días para el mensual, 395 para
   el anual— porque el cobro no cae siempre el mismo día y un carnet que vence
   la víspera de la renovación deja a alguien sin beneficio en la caja de un
   comercio aliado, que es el peor lugar para descubrirlo. */
async function carnetTrasAporte(env, aporte, donanteId) {
  if (!donanteId) return null;
  if (aporte.frecuencia !== "mensual" && aporte.frecuencia !== "anual") return null;
  /* Las campañas propias no dan membresía: son operaciones puntuales y su
     certificado declara que no hubo contraprestación. */
  if (String(aporte.destino_id || "").startsWith("brigada-")) return null;

  const cop = Math.round(Number(aporte.monto_centavos) / 100);
  const mensual = aporte.frecuencia === "anual" ? Math.round(cop / 12) : cop;
  const nivel = nivelPorMensual(mensual);
  const hasta = sumarDias(aporte.frecuencia === "anual" ? 395 : 35);

  const ya = await env.DB.prepare(
    "SELECT codigo, token, nivel, vigente_hasta FROM miembros WHERE donante_id = ?"
  ).bind(donanteId).first();

  if (ya) {
    /* Renovar nunca baja de nivel por un aporte suelto más pequeño: el nivel se
       queda en el más alto alcanzado mientras la membresía siga viva. */
    const actual = NIVELES_MB.findIndex((x) => x.id === ya.nivel);
    const nuevo = NIVELES_MB.findIndex((x) => x.id === nivel.id);
    const nivelFinal = nuevo > actual ? nivel.id : ya.nivel;
    const hastaFinal = hasta > ya.vigente_hasta ? hasta : ya.vigente_hasta;
    await env.DB.prepare(
      "UPDATE miembros SET nivel = ?, vigente_hasta = ?, revocado_en = NULL, " +
      "revocado_motivo = NULL, actualizado_en = datetime('now') WHERE codigo = ?"
    ).bind(nivelFinal, hastaFinal, ya.codigo).run();
    return { codigo: ya.codigo, token: ya.token, nivel: nivelFinal, vigente_hasta: hastaFinal, nuevo: false };
  }

  const codigo = await siguienteMiembro(env, new Date().getUTCFullYear());
  const token = tokenNuevo();
  await env.DB.prepare(
    "INSERT INTO miembros (codigo, token, donante_id, nivel, desde, vigente_hasta) " +
    "VALUES (?,?,?,?,date('now'),?)"
  ).bind(codigo, token, donanteId, nivel.id, hasta).run();
  return { codigo, token, nivel: nivel.id, vigente_hasta: hasta, nuevo: true };
}

/* GET /carnet/<token> — la tarjeta. Página propia servida por el Worker, no la
   SPA: tiene que abrir rápido en el celular de quien atiende una caja, sin
   depender de que cargue una aplicación entera. */
async function rutaCarnet(env, token) {
  if (!/^[a-f0-9]{32}$/.test(String(token || ""))) return new Response("No encontrado", { status: 404 });
  const m = await env.DB.prepare(
    "SELECT m.codigo, m.nivel, m.desde, m.vigente_hasta, m.revocado_en, d.nombre " +
    "FROM miembros m JOIN donantes d ON d.id = m.donante_id WHERE m.token = ?"
  ).bind(token).first();
  if (!m) return new Response("No encontrado", { status: 404 });

  const hoy = new Date().toISOString().slice(0, 10);
  const vigente = !m.revocado_en && m.vigente_hasta >= hoy;
  const n = nivelDe(m.nivel);

  return new Response(paginaCarnet({
    nombre: m.nombre || "Miembro", codigo: m.codigo, nivel: n.es,
    desde: m.desde, hasta: m.vigente_hasta, vigente
  }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      /* Sin caché: el estado se consulta en el momento, que es el punto. */
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

function paginaCarnet(c) {
  const estado = c.vigente ? "Vigente" : "No vigente";
  const color = c.vigente ? "#4ade80" : "#E8A24C";
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Carnet de miembro · ${esc(c.codigo)} · Give&Grow</title>
<link rel="stylesheet" href="/styles.css">
</head><body style="background:#0E2118;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px">
<main class="carnet">
  <div class="carnet-top">
    <span class="carnet-amp">&amp;</span>
    <span class="carnet-marca">Fundación<br>Give&amp;Grow</span>
  </div>
  <p class="carnet-nivel">${esc(c.nivel)}</p>
  <h1 class="carnet-nombre">${esc(c.nombre)}</h1>
  <dl class="carnet-datos">
    <div><dt>Carnet</dt><dd>${esc(c.codigo)}</dd></div>
    <div><dt>Miembro desde</dt><dd>${esc(c.desde)}</dd></div>
    <div><dt>Vigente hasta</dt><dd>${esc(c.hasta)}</dd></div>
  </dl>
  <p class="carnet-estado" style="color:${color};border-color:${color}">${estado}</p>
  <p class="carnet-pie">Programa de Gratitud · Presenta esta pantalla en los comercios aliados.
  El estado se consulta en el momento: esta página no sirve como captura.</p>
  <p class="carnet-nit">NIT 901.948.930-2 · thegiveandgrowproject.org</p>
</main>
</body></html>`;
}

/* ---- panel ---- */

async function adminMiembros(env) {
  const r = await env.DB.prepare(
    "SELECT m.codigo, m.token, m.nivel, m.desde, m.vigente_hasta, m.revocado_en, " +
    "d.nombre, d.email FROM miembros m JOIN donantes d ON d.id = m.donante_id " +
    "ORDER BY m.creado_en DESC LIMIT 200"
  ).all();
  return json({ miembros: r.results || [] });
}

async function adminRevocarMiembro(request, env, codigo, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { /* opcional */ }
  const motivo = limpiar(c.motivo, 280);
  if (!motivo) return json({ error: "motivo_requerido" }, 400);
  const m = await env.DB.prepare("SELECT codigo FROM miembros WHERE codigo = ?").bind(codigo).first();
  if (!m) return json({ error: "no_encontrado" }, 404);
  await env.DB.prepare(
    "UPDATE miembros SET revocado_en = datetime('now'), revocado_motivo = ? WHERE codigo = ?"
  ).bind(motivo, codigo).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "carnet " + codigo + " revocado: " + motivo).run();
  return json({ ok: true, codigo });
}

/* Correo con el enlace del carnet. Solo la PRIMERA vez: una renovación no
   necesita anunciarse, y un correo mensual idéntico se aprende a ignorar. */
async function correoCarnet(env, email, nombre, carnet, idioma) {
  if (!email) return { ok: true, sinCorreo: true };
  const en = idioma === "en";
  const url = ORIGIN + "/carnet/" + carnet.token;
  const n = nivelDe(carnet.nivel);
  const titulo = en ? "Your member card" : "Tu carnet de miembro";
  const parrafos = en ? [
    "Your membership is active. This is your card: open the link and show that screen at partner businesses.",
    "It is a live page, not an image — it states whether it is valid at the moment it is opened, so nobody has to take your word for it.",
    "It renews on its own with each contribution. If you stop giving, it simply expires."
  ] : [
    "Tu membresía quedó activa. Este es tu carnet: abre el enlace y muestra esa pantalla en los comercios aliados.",
    "Es una página viva, no una imagen: dice si está vigente en el momento en que se abre, así nadie tiene que creerte de palabra.",
    "Se renueva solo con cada aporte. Si dejas de aportar, simplemente vence."
  ];
  const filas = en
    ? [["Card", carnet.codigo], ["Level", n.en], ["Valid until", carnet.vigente_hasta]]
    : [["Carnet", carnet.codigo], ["Nivel", n.es], ["Vigente hasta", carnet.vigente_hasta]];
  return enviarCorreo(env, {
    para: email, asunto: titulo + " · " + carnet.codigo,
    texto: [titulo, "", ...parrafos, "", url, "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas, boton: { url, texto: en ? "Open my card" : "Abrir mi carnet" } }),
    etiqueta: "carnet"
  });
}

/* ========================================================================
   Ofrecimientos en especie
   ========================================================================
   Hasta hoy esto terminaba en un WhatsApp: un mensaje suelto que alguien tiene
   que leer, responder y recordar. Con dos números publicados y una emergencia
   encima, es donde se pierden los ofrecimientos.

   El formulario no existe para reemplazar el chat —el chat sigue ahí— sino para
   que quede registro de quién ofreció qué, y para poder decirle a tiempo «eso
   no, esto sí». La propia página lo advierte: comprar sin coordinar suele
   terminar en insumos que no se pueden entregar.
   ======================================================================== */

const CATEGORIAS_ESPECIE = [
  "agua", "alimento", "higiene", "panales", "descanso", "energia", "brigada", "otra"
];

async function apiOfrecimiento(env, c) {
  const limpio = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const nombre    = limpio(c.nombre, 120);
  const email     = limpio(c.email, 200);
  const categoria = CATEGORIAS_ESPECIE.includes(c.categoria) ? c.categoria : null;
  const detalle   = limpio(c.detalle, 400);

  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);
  if (!categoria) return json({ error: "categoria_requerida", opciones: CATEGORIAS_ESPECIE }, 400);
  if (!detalle) return json({ error: "detalle_requerido" }, 400);
  /* Sin autorización no se guarda NADA. Ley 1581, no una casilla decorativa. */
  if (!c.autoriza_datos) return json({ error: "autorizacion_requerida" }, 400);

  const datos = {
    campana: limpio(c.campana, 60) || "brigada-emergencia-2026-08",
    categoria,
    detalle,
    cantidad: limpio(c.cantidad, 120),
    disponible: limpio(c.disponible, 200),
    quien: c.quien === "empresa" ? "empresa" : "persona",
    idioma: c.idioma === "en" ? "en" : "es"
  };

  const ins = await env.DB.prepare(
    "INSERT INTO inscripciones (tipo, estado, nombre, email, telefono, ciudad, datos) " +
    "VALUES ('especie', 'nueva', ?, ?, ?, ?, ?)"
  ).bind(nombre, email, limpio(c.telefono, 40) || null, limpio(c.ciudad, 80) || null,
         JSON.stringify(datos)).run();

  /* El correo no puede tumbar el registro: si falla, el ofrecimiento ya quedó
     guardado y eso es lo que importa. Misma regla que en aportes e inscripciones. */
  try {
    await correoOfrecimiento(env, { nombre, email, ciudad: limpio(c.ciudad, 80), ...datos });
    await correoAvisoOfrecimiento(env, { nombre, email, telefono: limpio(c.telefono, 40), ciudad: limpio(c.ciudad, 80), ...datos });
  } catch (e) {
    console.error("correo ofrecimiento", e && e.message);
  }

  return json({ ok: true, id: ins.meta ? ins.meta.last_row_id : null });
}

const ETIQUETA_CAT = {
  es: { agua:"Agua segura", alimento:"Comida que no necesita cocina", higiene:"Higiene y dignidad",
        panales:"Pañales, de bebé y de adulto", descanso:"Dormir sin piso frío",
        energia:"Luz y carga de celular", brigada:"Lo que sostiene a la brigada", otra:"Otra cosa" },
  en: { agua:"Safe water", alimento:"Food that needs no kitchen", higiene:"Hygiene and dignity",
        panales:"Nappies, for babies and adults", descanso:"Sleeping off a cold floor",
        energia:"Light and phone charging", brigada:"What keeps the brigade going", otra:"Something else" }
};

/* Acuse a quien ofrece. Su trabajo real es UNO: que no compre todavía. Es el
   error más caro y más frecuente de la donación espontánea. */
async function correoOfrecimiento(env, o) {
  const en = o.idioma === "en";
  const cat = (ETIQUETA_CAT[en ? "en" : "es"] || ETIQUETA_CAT.es)[o.categoria] || o.categoria;
  const titulo = en ? "We got your offer. Please do not buy anything yet."
                    : "Recibimos tu ofrecimiento. No compres nada todavía.";
  const parrafos = en ? [
    "Thank you. Before you spend a peso, we will write to you to confirm what is actually missing today and in what format it can be handed over.",
    "The inventory changes daily and what is left over in one sector is missing in another. Buying without coordinating usually ends in supplies that cannot be delivered — and that helps nobody.",
    "If you already have it, even better: we will arrange collection at the nearest drop-off point."
  ] : [
    "Gracias. Antes de que gastes un peso, te escribimos para confirmarte qué falta hoy de verdad y en qué presentación se puede entregar.",
    "El inventario cambia todos los días y lo que sobra en un sector falta en otro. Comprar sin coordinar suele terminar en insumos que no se pueden entregar, y eso no le sirve a nadie.",
    "Si ya lo tienes, mejor todavía: coordinamos la recolección en el centro de acopio más cercano."
  ];
  const filas = en
    ? [["Category", cat], ["What you are offering", o.detalle], ["Quantity", o.cantidad || "—"], ["City", o.ciudad || "—"]]
    : [["Categoría", cat], ["Qué ofreces", o.detalle], ["Cantidad", o.cantidad || "—"], ["Ciudad", o.ciudad || "—"]];

  return enviarCorreo(env, {
    para: o.email, asunto: titulo,
    texto: [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas }),
    etiqueta: "ofrecimiento-especie"
  });
}

async function correoAvisoOfrecimiento(env, o) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const titulo = "Ofrecimiento en especie: " + (ETIQUETA_CAT.es[o.categoria] || o.categoria);
  const filas = [
    ["Categoría", ETIQUETA_CAT.es[o.categoria] || o.categoria],
    ["Qué", o.detalle],
    ["Cantidad", o.cantidad || "(no dice)"],
    ["Cuándo/cómo", o.disponible || "(no dice)"],
    ["Quién", o.quien === "empresa" ? "Empresa" : "Persona"],
    ["Nombre", o.nombre],
    ["Correo", o.email],
    ["Teléfono", o.telefono || "(no dejó)"],
    ["Ciudad", o.ciudad || "(no dice)"]
  ];
  return enviarCorreo(env, {
    para, asunto: titulo + " · " + o.nombre,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n"),
    html: plantillaCorreo({
      titulo,
      parrafos: ["Alguien ofreció insumos por el formulario de la brigada. Ya está en /admin.",
                 "Conviene responder antes de que compre: el acuse le pidió esperar."],
      filas
    }),
    etiqueta: "aviso-ofrecimiento"
  });
}

/* ========================================================================
   Solicitud de alianza empresarial  ·  tipo = "empresa"
   ========================================================================
   Hasta hoy este formulario posteaba a un Apps Script (`ALLY_ENDPOINT`) que
   escribía una fila en una hoja de cálculo. Tres razones para traerlo:

   1 · TRES CAMPOS SE PERDÍAN EN SILENCIO. El front ya enviaba `sector`,
       `aporta` e `instagram` —los tres alimentan la tarjeta de reciprocidad de
       `#empresas`— y la hoja no tiene columna para ellos: llegaban y se caían.
       Nadie lo habría notado hasta querer publicar la primera empresa real.
   2 · El acuse salía desde un Gmail externo, no desde el dominio, porque en su
       momento el propio rebotaba. Eso se arregló el 11 de agosto (SPF y DKIM
       alinean); el script quedó apuntando al Gmail por inercia.
   3 · Una solicitud en una hoja no está en `/admin`, así que no tiene estado ni
       queda en el resumen. La primera empresa aliada es un pendiente vivo.

   El mapeo intake → modalidad pública NO se automatiza aquí, y es a propósito:
   se guardan las seis casillas como las marcó la empresa, y la traducción a
   `modalidad[]` de `partners.json` la hace una persona al aprobar. Traducir en
   el ingreso sería decidir cómo se publica a alguien antes de hablar con él.
   ======================================================================== */

const MODALIDADES_ALIADO = [
  ["modDonacion",     "Donación"],
  ["modRse",          "RSE"],
  ["modGratitud",     "Programa de Gratitud"],
  ["modServicios",    "Servicios"],
  ["modVoluntariado", "Voluntariado corporativo"],
  ["modDifusion",     "Difusión"]
];

async function apiAliado(env, c) {
  const limpio = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const razon = limpio(c.razon, 160);
  const email = limpio(c.correo, 200);

  if (!razon) return json({ error: "razon_requerida" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);

  const mods = MODALIDADES_ALIADO.filter(([k]) => !!c[k]).map(([k]) => k);
  if (!mods.length) return json({ error: "modalidad_requerida" }, 400);

  /* Las condicionales se validan también aquí, no solo en el navegador: marcar
     Gratitud sin decir qué beneficio deja una solicitud que no se puede
     responder, y el cliente es opcional para cualquiera que sepa hacer un POST. */
  const benBeneficio = limpio(c.benBeneficio, 200);
  const servDetalle  = limpio(c.servDetalle, 300);
  if (c.modGratitud && !benBeneficio) return json({ error: "beneficio_requerido" }, 400);
  if (c.modServicios && !servDetalle) return json({ error: "servicio_requerido" }, 400);

  /* Las tres autorizaciones son la condición para guardar. La de datos es Ley
     1581; la de marca y la de licitud son lo que permite publicar la alianza y
     lo que la fundación necesita declarar recibido. Sin ellas no se guarda. */
  if (!c.autMarca || !c.autDatos || !c.autLicitud) {
    return json({ error: "autorizacion_requerida" }, 400);
  }

  const datos = {
    nit: limpio(c.nit, 40),
    representante: limpio(c.representante, 120),
    cedula: limpio(c.cedula, 40),
    contacto: limpio(c.contacto, 160),
    direccion: limpio(c.direccion, 200),
    sector: limpio(c.sector, 80),
    web: limpio(c.web, 200),
    instagram: limpio(c.instagram, 120),
    descripcion: limpio(c.descripcion, 900),
    aporta: limpio(c.aporta, 90),
    modalidades: mods,
    benBeneficio,
    benNivel: limpio(c.benNivel, 120),
    benCondiciones: limpio(c.benCondiciones, 300),
    benRedime: limpio(c.benRedime, 200),
    servDetalle,
    autMarca: true, autDatos: true, autLicitud: true,
    idioma: c.idioma === "en" ? "en" : "es"
  };

  const ins = await env.DB.prepare(
    "INSERT INTO inscripciones (tipo, estado, nombre, email, telefono, ciudad, datos) " +
    "VALUES ('empresa', 'nueva', ?, ?, ?, ?, ?)"
  ).bind(razon, email, limpio(c.telefono, 40) || null, limpio(c.ciudad, 80) || null,
         JSON.stringify(datos)).run();

  /* El rastro de Ley 1581 se deja aquí y no al aprobar: la autorización la dio
     la empresa al enviar, no nosotros al revisarla. */
  try {
    await env.DB.prepare(
      "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'marca_y_datos', ?)"
    ).bind(email, "solicitud de alianza #" + (ins.meta ? ins.meta.last_row_id : "?") + " · " + razon).run();
  } catch (e) {
    console.error("consentimiento aliado", e && e.message);
  }

  /* El correo no puede tumbar la solicitud: si falla, ya quedó registrada.
     Misma regla que en aportes, inscripciones y ofrecimientos. */
  try {
    await correoAliado(env, { razon, email, ...datos });
    await correoAvisoAliado(env, { razon, email, telefono: limpio(c.telefono, 40), ciudad: limpio(c.ciudad, 80), ...datos });
  } catch (e) {
    console.error("correo aliado", e && e.message);
  }

  return json({ ok: true, id: ins.meta ? ins.meta.last_row_id : null });
}

const ETIQUETA_MOD = {
  es: { modDonacion:"Donación", modRse:"RSE", modGratitud:"Programa de Gratitud",
        modServicios:"Servicios", modVoluntariado:"Voluntariado corporativo", modDifusion:"Difusión" },
  en: { modDonacion:"Donation", modRse:"CSR", modGratitud:"Gratitude Programme",
        modServicios:"Services", modVoluntariado:"Corporate volunteering", modDifusion:"Outreach" }
};

/* Acuse a la empresa. Su trabajo es UNO: dejar claro que enviar no es aliarse.
   La página ya lo dice en su letra pequeña y el correo no lo puede contradecir —
   la alianza se perfecciona con la firma del Convenio Marco, que manda una
   persona. Prometer aquí «ya eres aliado» sería la promesa que la marca prohíbe. */
async function correoAliado(env, a) {
  const en = a.idioma === "en";
  const mapa = ETIQUETA_MOD[en ? "en" : "es"];
  const titulo = en ? "We got your alliance request." : "Recibimos tu solicitud de alianza.";
  const parrafos = en ? [
    "Thank you. Someone from Give&Grow will read it and write to you — a real person, not an autoresponder.",
    "Sending this form does not make the alliance official. The alliance is formalised when the Framework Agreement is signed; we will send it to you to review, and nothing is charged in either direction.",
    a.modGratitud || (a.modalidades || []).includes("modGratitud")
      ? "You told us you want to join the Gratitude Programme. Your business only appears publicly once the agreement is signed — never before."
      : ""
  ] : [
    "Gracias. Alguien de Give&Grow la lee y te escribe — una persona real, no un autorespondedor.",
    "Enviar este formulario no constituye la alianza. La alianza se perfecciona con la firma del Convenio Marco, que te enviamos para revisar, y nada se cobra en ninguna dirección.",
    (a.modalidades || []).includes("modGratitud")
      ? "Nos dijiste que quieres entrar al Programa de Gratitud. Tu negocio aparece públicamente solo cuando el convenio esté firmado — nunca antes."
      : ""
  ];
  const filas = [
    [en ? "Organisation" : "Empresa", a.razon],
    [en ? "How you want to support" : "Cómo quieres apoyar",
     (a.modalidades || []).map(k => mapa[k] || k).join(", ")]
  ];
  if (a.aporta) filas.push([en ? "What you contribute" : "Qué aportas", a.aporta]);

  return enviarCorreo(env, {
    para: a.email,
    asunto: en ? "Your alliance request with Give&Grow" : "Tu solicitud de alianza con Give&Grow",
    texto: [titulo, "", ...parrafos.filter(Boolean), "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos: parrafos.filter(Boolean), filas }),
    etiqueta: "solicitud-aliado"
  });
}

/* Aviso interno: lo que hace falta para responder y para armar la ficha si se
   aprueba. Incluye los tres campos que la hoja de cálculo perdía. */
async function correoAvisoAliado(env, a) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const filas = [
    ["Empresa", a.razon],
    ["NIT/Doc", a.nit || "(no dejó)"],
    ["Representante legal", a.representante || "(no dejó)"],
    ["Contacto", a.contacto || "(no dejó)"],
    ["Correo", a.email],
    ["Teléfono", a.telefono || "(no dejó)"],
    ["Ciudad", a.ciudad || "(no dice)"],
    ["Sector", a.sector || "(no dice)"],
    ["Qué aporta", a.aporta || "(no dice)"],
    ["Web", a.web || "—"],
    ["Instagram", a.instagram || "—"],
    ["Modalidades", (a.modalidades || []).map(k => ETIQUETA_MOD.es[k] || k).join(", ")]
  ];
  if (a.benBeneficio) {
    filas.push(["Beneficio ofrecido", a.benBeneficio]);
    filas.push(["Desde nivel", a.benNivel || "(no dice)"]);
    filas.push(["Cómo se redime", a.benRedime || "(no dice)"]);
    filas.push(["Condiciones", a.benCondiciones || "(no dice)"]);
  }
  if (a.servDetalle) filas.push(["Servicio ofrecido", a.servDetalle]);

  return enviarCorreo(env, {
    para,
    asunto: "Solicitud de alianza: " + a.razon,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n") +
           (a.descripcion ? "\n\nDescripción del negocio:\n" + a.descripcion : ""),
    html: plantillaCorreo({
      titulo: "Solicitud de alianza: " + a.razon,
      parrafos: a.descripcion ? ["Cómo se describen: «" + a.descripcion + "»"] : ["Sin descripción del negocio."],
      filas,
      cierre: "Está en el panel, en solicitudes por revisar. El Convenio Marco lo envías tú."
    }),
    etiqueta: "aviso-aliado"
  });
}

/* ========================================================================
   Aplicación de fundaciones al HUB SOCIAL  ·  tipo = "fundacion"
   ========================================================================
   Hasta hoy el botón «Quiero aplicar» sacaba a la fundación del sitio hacia un
   Google Form de 20–30 minutos, con cargas de archivo que exigen cuenta de
   Google. Dos secciones más arriba, el propio sitio promete «Toma 10–15
   minutos». Además, la respuesta caía en un Drive: sin estado, sin acuse y
   fuera de `/admin`.

   QUÉ PIDE ESTE FORMULARIO Y QUÉ NO, Y POR QUÉ:
   pide lo que es TEXTO —quiénes son, qué hacen, a cuántos llegan, un programa—
   que es exactamente lo que hace falta para decidir el paso 2 del proceso
   publicado, «Revisamos». Deja fuera el costo con soporte documental, el logo,
   las fotos y el consentimiento formal firmado: todo eso pide archivos y,
   según el proceso de cinco pasos del propio sitio, va DESPUÉS de la visita de
   contexto. El cuestionario largo (`ops/cuestionario-fundaciones-hub.md`) sigue
   siendo la fuente de verdad del esquema de `partners.json` y es lo que se
   envía en el paso 4, cuando ya hubo una conversación.

   La consecuencia que hay que respetar: de aquí NO sale una ficha pública. Sale
   una solicitud. La regla 1 del cuestionario —sin `consent.name === true` no hay
   perfil— sigue intacta, y este formulario ni siquiera pregunta eso.
   ======================================================================== */

const PERSONERIAS = ["nit", "tramite", "base"];
const POBLACIONES_FUND = [
  "ninos", "adolescentes", "jovenes", "madres", "mayores",
  "familias", "migrante", "discapacidad", "otra"
];

async function apiFundacion(env, c) {
  const limpio = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const nombre = limpio(c.nombre, 160);
  const email  = limpio(c.email, 200);
  const lider  = limpio(c.lider, 120);
  const zona   = limpio(c.zona, 160);
  const historia = limpio(c.historia, 1500);
  const mision   = limpio(c.mision, 600);
  const atiende  = limpio(c.atiende, 160);

  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);
  if (!lider) return json({ error: "lider_requerido" }, 400);
  if (!zona) return json({ error: "zona_requerida" }, 400);
  if (!historia) return json({ error: "historia_requerida" }, 400);
  if (!mision) return json({ error: "mision_requerida" }, 400);
  if (!atiende) return json({ error: "atiende_requerido" }, 400);

  const personeria = PERSONERIAS.includes(c.personeria) ? c.personeria : null;
  if (!personeria) return json({ error: "personeria_requerida", opciones: PERSONERIAS }, 400);

  const poblacion = Array.isArray(c.poblacion)
    ? c.poblacion.filter(p => POBLACIONES_FUND.includes(p)) : [];
  if (!poblacion.length) return json({ error: "poblacion_requerida", opciones: POBLACIONES_FUND }, 400);

  /* Ley 1581 y declaración de veracidad. Sin las dos no se guarda nada: pedirle
     a una fundación que declare cifras reales y guardarlas antes de que lo
     declare sería quedarnos con el dato y no con la responsabilidad. */
  if (!c.autoriza_datos) return json({ error: "autorizacion_requerida" }, 400);
  if (!c.declara_veraz)  return json({ error: "declaracion_requerida" }, 400);

  const datos = {
    sigla: limpio(c.sigla, 60),
    lider,
    cargo: limpio(c.cargo, 120),
    anio: limpio(c.anio, 8),
    personeria,
    zona,
    historia,
    mision,
    poblacion,
    poblacion_otra: limpio(c.poblacion_otra, 120),
    atiende,
    /* Cómo llevan la cuenta decide si la cifra se publica exacta o con «≈».
       Es la pregunta 3.3 del cuestionario y la razón por la que sobrevive aquí:
       sin ella, cualquier número que nos den se vuelve un claim sin respaldo. */
    conteo: limpio(c.conteo, 160),
    programa: limpio(c.programa, 160),
    programa_desc: limpio(c.programa_desc, 900),
    evidencia: limpio(c.evidencia, 400),
    web: limpio(c.web, 200),
    instagram: limpio(c.instagram, 120),
    idioma: c.idioma === "en" ? "en" : "es"
  };

  const ins = await env.DB.prepare(
    "INSERT INTO inscripciones (tipo, estado, nombre, email, telefono, ciudad, datos) " +
    "VALUES ('fundacion', 'nueva', ?, ?, ?, ?, ?)"
  ).bind(nombre, email, limpio(c.telefono, 40) || null, limpio(c.ciudad, 80) || null,
         JSON.stringify(datos)).run();

  try {
    await env.DB.prepare(
      "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'datos', ?)"
    ).bind(email, "aplicación al HUB #" + (ins.meta ? ins.meta.last_row_id : "?") + " · " + nombre).run();
  } catch (e) {
    console.error("consentimiento fundación", e && e.message);
  }

  try {
    await correoFundacion(env, { nombre, email, ...datos });
    await correoAvisoFundacion(env, { nombre, email, telefono: limpio(c.telefono, 40), ciudad: limpio(c.ciudad, 80), ...datos });
  } catch (e) {
    console.error("correo fundación", e && e.message);
  }

  return json({ ok: true, id: ins.meta ? ins.meta.last_row_id : null });
}

/* Acuse a la fundación. Dice los cinco pasos con sus nombres y, sobre todo,
   dice que aplicar no es entrar. La página lo promete gratuito y sin
   intermediarios opacos; el correo repite las dos cosas porque es lo que la
   fundación necesita poder mostrarle a su junta. */
async function correoFundacion(env, f) {
  const en = f.idioma === "en";
  const titulo = en ? "We got your application to the HUB SOCIAL."
                    : "Recibimos tu aplicación al HUB SOCIAL.";
  const parrafos = en ? [
    "Thank you. Someone from Give&Grow reads it and writes back to you. Applying is not joining: what follows is a review of your information, a context visit at your territory, and only then a cooperation agreement.",
    "Nothing is charged, ever, in either direction. The only thing we ask in return is traceability: that every bit of support arrives documented to whoever needs it.",
    "We did not ask you for your logo, your photos or your cost figures yet — those come after we meet, together with the image-rights authorisations. Children's images are protected by Law 1098 and we do not publish anything without written consent."
  ] : [
    "Gracias. Alguien de Give&Grow la lee y te responde. Aplicar no es entrar: lo que sigue es la revisión de tu información, una visita de contexto en tu territorio y solo entonces un convenio de cooperación.",
    "Nada se cobra, nunca, en ninguna dirección. Lo único que pedimos a cambio es trazabilidad: que cada apoyo llegue documentado a quien lo necesita.",
    "Todavía no te pedimos el logo, las fotos ni las cifras de costos — eso viene después de conocernos, junto con las autorizaciones de derechos de imagen. La imagen de los menores está protegida por la Ley 1098 y no publicamos nada sin consentimiento escrito."
  ];
  const filas = en
    ? [["Foundation", f.nombre], ["Who leads it", f.lider], ["Territory", f.zona]]
    : [["Fundación", f.nombre], ["Quién la lidera", f.lider], ["Territorio", f.zona]];

  return enviarCorreo(env, {
    para: f.email,
    asunto: en ? "Your application to the HUB SOCIAL" : "Tu aplicación al HUB SOCIAL",
    texto: [titulo, "", ...parrafos, "", filas.map(([k, v]) => k + ": " + v).join("\n")].join("\n"),
    html: plantillaCorreo({ titulo, parrafos, filas }),
    etiqueta: "aplicacion-fundacion"
  });
}

const ETIQUETA_POB = {
  ninos:"Niños y niñas", adolescentes:"Adolescentes", jovenes:"Jóvenes",
  madres:"Madres cabeza de familia", mayores:"Adultos mayores", familias:"Familias",
  migrante:"Población migrante", discapacidad:"Personas con discapacidad", otra:"Otra"
};
const ETIQUETA_PERS = {
  nit: "Sí, con NIT", tramite: "En trámite", base: "Proyecto comunitario de base"
};

async function correoAvisoFundacion(env, f) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  const pob = (f.poblacion || []).map(p => ETIQUETA_POB[p] || p).join(", ") +
              (f.poblacion_otra ? " · " + f.poblacion_otra : "");
  const filas = [
    ["Fundación", f.nombre + (f.sigla ? " (" + f.sigla + ")" : "")],
    ["Lidera", f.lider + (f.cargo ? " · " + f.cargo : "")],
    ["Correo", f.email],
    ["Teléfono", f.telefono || "(no dejó)"],
    ["Personería", ETIQUETA_PERS[f.personeria] || f.personeria],
    ["Desde", f.anio || "(no dice)"],
    ["Territorio", f.zona],
    ["Ciudad", f.ciudad || "(no dice)"],
    ["Atiende a", pob],
    ["Cuántas personas", f.atiende],
    ["Cómo llevan la cuenta", f.conteo || "(no dice)"],
    ["Programa", f.programa || "(no dice)"],
    ["Evidencia declarada", f.evidencia || "(no dice)"],
    ["Web", f.web || "—"],
    ["Instagram", f.instagram || "—"]
  ];
  return enviarCorreo(env, {
    para,
    asunto: "Aplicación al HUB: " + f.nombre,
    texto: filas.map(([k, v]) => k + ": " + v).join("\n") +
           "\n\nHistoria:\n" + f.historia + "\n\nMisión:\n" + f.mision +
           (f.programa_desc ? "\n\nPrograma:\n" + f.programa_desc : ""),
    html: plantillaCorreo({
      titulo: "Aplicación al HUB: " + f.nombre,
      parrafos: ["Misión: «" + f.mision + "»",
                 "Historia: " + f.historia,
                 f.programa_desc ? "Programa: " + f.programa_desc : ""].filter(Boolean),
      filas,
      cierre: "Está en el panel. Lo que sigue es revisar y, si encaja, la visita de contexto. " +
              "El logo, las fotos y los costos con soporte se piden después, con el cuestionario largo."
    }),
    etiqueta: "aviso-fundacion"
  });
}

/* Los ofrecimientos comparten tabla con las inscripciones, así que el panel los
   filtra por tipo en vez de tener su propia consulta. */
async function adminOfrecimientos(env) {
  const r = await env.DB.prepare(
    "SELECT id, estado, nombre, email, telefono, ciudad, datos, creada_en " +
    "FROM inscripciones WHERE tipo = 'especie' ORDER BY creada_en DESC LIMIT 100"
  ).all();
  return json({ ofrecimientos: r.results || [] });
}

/* Las otras tres puertas —voluntarios, fundaciones y empresas— comparten una
   sola bandeja: los tres son «alguien quiere entrar» y el flujo de estados es
   idéntico. Los ofrecimientos siguen aparte porque su urgencia es distinta (hay
   que contestarles antes de que compren) y su tabla muestra otras columnas.

   Los voluntarios llevaban desde la Fase 3 entrando a la base sin bandeja: solo
   existía el contador del resumen, que dice cuántos hay y no quiénes son. */
async function adminInscripciones(env) {
  const r = await env.DB.prepare(
    "SELECT id, tipo, estado, nombre, email, telefono, ciudad, datos, creada_en " +
    "FROM inscripciones WHERE tipo IN ('voluntario','fundacion','empresa','ingeniero') " +
    "ORDER BY creada_en DESC LIMIT 200"
  ).all();
  return json({ inscripciones: r.results || [] });
}

/* POST /api/admin/inscripcion/<id>/matricula — «vi su matrícula en el COPNIA».
   NO es lo mismo que aceptar la inscripción, y por eso es un botón aparte:
   aceptar es una decisión del equipo, verificar es un HECHO comprobado contra
   un registro público. Fundirlos haría que aceptar a alguien simpático le
   abriera la firma de conceptos.

   Sin columna nueva: se mezcla en el JSON de `datos`, y queda el rastro de
   quién y cuándo en el registro de auditoría — el mismo sitio donde ya viven
   los movimientos de casos, entregas e inscripciones. Cero migraciones, que en
   esta cuenta son justo donde el proyecto se tropieza. */
async function adminVerificarMatricula(request, env, id, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { /* cuerpo vacío = verificar */ }
  const verificada = c.verificada !== false;

  const fila = await env.DB.prepare(
    "SELECT id, tipo, nombre, email, datos FROM inscripciones WHERE id = ?"
  ).bind(id).first();
  if (!fila) return json({ error: "no_encontrada" }, 404);
  if (fila.tipo !== "ingeniero") return json({ error: "no_es_ingeniero" }, 409);

  let datos = {};
  try { datos = JSON.parse(fila.datos || "{}"); } catch { datos = {}; }
  if (verificada) {
    datos.matricula_verificada = 1;
    datos.matricula_verificada_por = quien || "?";
    datos.matricula_verificada_en = new Date().toISOString().slice(0, 19).replace("T", " ");
  } else {
    delete datos.matricula_verificada;
    delete datos.matricula_verificada_por;
    delete datos.matricula_verificada_en;
  }

  await env.DB.prepare("UPDATE inscripciones SET datos = ? WHERE id = ?")
    .bind(JSON.stringify(datos), id).run();

  try {
    await env.DB.prepare(
      "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
    ).bind(String(fila.email || "?"),
      "inscripcion " + id + " matricula " + (verificada ? "VERIFICADA" : "verificacion RETIRADA") +
      " (matricula " + (datos.matricula || "sin dato") + ") por " + (quien || "?")).run();
  } catch (e) { console.error("auditoria matricula", id, e && e.message); }

  return json({ ok: true, id, verificada });
}

const ESTADOS_INSCRIPCION = ["nueva", "en_revision", "aceptada", "archivada"];

async function adminMoverInscripcion(request, env, id, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }
  const nuevo = String(c.estado || "");
  if (!ESTADOS_INSCRIPCION.includes(nuevo)) {
    return json({ error: "estado_no_permitido", permitidos: ESTADOS_INSCRIPCION }, 400);
  }
  const f = await env.DB.prepare("SELECT id FROM inscripciones WHERE id = ?").bind(id).first();
  if (!f) return json({ error: "no_encontrada" }, 404);

  await env.DB.prepare(
    "UPDATE inscripciones SET estado = ?, actualizada_en = datetime('now') WHERE id = ?"
  ).bind(nuevo, id).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "inscripción " + id + " -> " + nuevo).run();
  return json({ ok: true, id, estado: nuevo });
}

/* ========================================================================
   PAGOS SIN APORTE
   ========================================================================
   El enlace de pago propio de Wompi (el QR de la brigada) cobra a la misma
   cuenta pero NO pasa por /api/checkout, así que su `reference` no existe en
   `aportes`: no hay guía, ni recibo, ni certificado emitible.

   Lo que sí ocurre es que el webhook está configurado a nivel de cuenta, así
   que esos pagos SÍ entran a `eventos_wompi` con firma válida. Esta vista los
   saca a la superficie para poder conciliarlos, en vez de dejarlos como una
   diferencia contra el extracto de Wompi que alguien tiene que descubrir.
   ======================================================================== */

async function adminPagosSueltos(env) {
  const r = await env.DB.prepare(
    "SELECT e.transaction_id, e.guia AS referencia, e.estado, e.recibido_en, e.cuerpo " +
    "FROM eventos_wompi e LEFT JOIN aportes a ON a.guia = e.guia " +
    "WHERE e.firma_valida = 1 AND e.estado = 'APPROVED' AND a.guia IS NULL " +
    "ORDER BY e.recibido_en DESC LIMIT 100"
  ).all();

  /* Del cuerpo crudo se extrae solo lo necesario para conciliar. Aunque el
     panel esté tras Access, mandar el JSON completo de la pasarela al navegador
     es más dato personal del que hace falta para esta pantalla. */
  const filas = (r.results || []).map((e) => {
    let tx = {};
    try { tx = (JSON.parse(e.cuerpo || "{}").data || {}).transaction || {}; } catch (x) { /* nada */ }
    return {
      transaction_id: e.transaction_id,
      referencia: e.referencia,
      recibido_en: e.recibido_en,
      monto_centavos: Number(tx.amount_in_cents) || null,
      moneda: tx.currency || null,
      metodo: tx.payment_method_type || null,
      correo: tx.customer_email || null,
      nombre: (tx.customer_data && tx.customer_data.full_name) || null
    };
  });
  return json({ pagos: filas });
}

/* ========================================================================
   ENTREGAS · la evidencia (Fase 6)
   ========================================================================
   El sitio prometía «publicamos el acta de cada entrega» sin tener dónde
   registrarla. Esto es ese registro.

   El documento legal sigue siendo el ACTA EN PAPEL que firma quien recibe. Aquí
   se guarda su transcripción y su foto: el sitio no reemplaza la firma, la
   publica.

   Una entrega se asocia a un DESTINO, no a un aporte — ver el porqué en
   migrations/0005_entregas.sql. Es contribución, no atribución.
   ======================================================================== */

/* Un acta registra algo que YA ocurrió. Una fecha futura no es un matiz: es una
   entrega que no ha pasado, publicada como si sí. Ocurrió en la prueba del panel
   del 12 ago 2026 — se publicó una jornada fechada dos semanas adelante y el
   sitio la mostró como real durante unos minutos. La fecha se compara en UTC
   contra el día de hoy, con un día de holgura para que un acta firmada de noche
   en Colombia (UTC-5) no se rechace por el cambio de día. */
function fechaEnFuturo(fecha) {
  const hoy = new Date();
  hoy.setUTCDate(hoy.getUTCDate() + 1);
  return String(fecha) > hoy.toISOString().slice(0, 10);
}

const MAX_FOTO = 8 * 1024 * 1024;
const TIPOS_FOTO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/* Lo que puede ver cualquiera. Deliberadamente NO incluye `creada_por` (correo
   interno) ni nada que identifique a una familia. */
function entregaPublica(e) {
  let fotos = [];
  try { fotos = JSON.parse(e.fotos || "[]"); } catch (x) { /* fotos corruptas: se omiten */ }
  return {
    numero: e.numero, sector: e.sector, lugar: e.lugar, fecha: e.fecha,
    aliada: e.aliada, familias: e.familias, resumen: e.resumen,
    recibido_por: e.recibido_por,
    fotos: fotos.map((f) => ({ url: "/evidencia/" + e.numero + "/" + f.k, alt: f.alt || "" }))
  };
}

async function apiEntregas(env, url) {
  const destino = String(url.searchParams.get("destino") || "").slice(0, 60);
  const limite = Math.min(Math.max(Number(url.searchParams.get("limite")) || 20, 1), 50);
  let sql = "SELECT numero, destino_id, sector, lugar, fecha, aliada, familias, resumen, " +
            "recibido_por, fotos FROM entregas WHERE publicada_en IS NOT NULL AND anulada_en IS NULL";
  const args = [];
  if (destino) { sql += " AND destino_id = ?"; args.push(destino); }
  sql += " ORDER BY fecha DESC, numero DESC LIMIT " + limite;
  const q = args.length ? env.DB.prepare(sql).bind(...args) : env.DB.prepare(sql);
  const r = await q.all();
  return json({ entregas: (r.results || []).map(entregaPublica) });
}

/* GET /evidencia/<numero>/<archivo>
   Sirve la foto desde R2 SOLO si su entrega está publicada. La clave es
   difícil de adivinar, pero eso es oscuridad, no control: si una entrega se
   despublica, sus fotos tienen que dejar de responder. */
async function rutaEvidencia(env, numero, archivo) {
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);
  if (!/^AE-\d{4}-\d{6}$/.test(numero) || !/^[a-z0-9._-]{1,80}$/i.test(archivo)) {
    return json({ error: "ruta_invalida" }, 400);
  }
  const e = await env.DB.prepare(
    "SELECT fotos FROM entregas WHERE numero = ? AND publicada_en IS NOT NULL AND anulada_en IS NULL"
  ).bind(numero).first();
  if (!e) return json({ error: "no_encontrada" }, 404);

  let fotos = [];
  try { fotos = JSON.parse(e.fotos || "[]"); } catch (x) { /* nada */ }
  if (!fotos.some((f) => f.k === archivo)) return json({ error: "no_encontrada" }, 404);

  const obj = await env.MEDIA.get("entregas/" + numero + "/" + archivo);
  if (!obj) return json({ error: "no_encontrada" }, 404);
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata && obj.httpMetadata.contentType || "application/octet-stream",
      /* La clave nunca cambia de contenido: si se reemplaza la foto, cambia el
         nombre del archivo. Por eso puede cachearse de verdad. */
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}

/* ---- panel ---- */

async function adminEntregas(env) {
  const r = await env.DB.prepare(
    "SELECT numero, destino_id, sector, lugar, fecha, aliada, familias, resumen, " +
    "recibido_por, fotos, publicada_en, creada_por, anulada_en, anulada_motivo, anulada_por " +
    "FROM entregas ORDER BY fecha DESC, numero DESC LIMIT 100"
  ).all();
  return json({ entregas: r.results || [] });
}

/* POST /api/admin/entrega/<numero>/anular  —  { motivo }
   ========================================================================
   Anular y no borrar, por el consecutivo: el número ya se consumió, y un hueco
   sin explicación en una serie de actas es exactamente lo que un auditor
   pregunta. Con motivo escrito, el hueco tiene razón.

   Es irreversible a propósito. Despublicar es reversible porque es una decisión
   de calendario —«todavía no»—; anular es un juicio sobre el documento, y un
   botón que lo deshace invita a usarlo como interruptor. Si un acta anulada
   describía algo que sí ocurrió, se registra de nuevo con su número siguiente y
   la anulada queda como el rastro de que hubo un error.

   Lo que NO hace: borrar la foto de R2. La clave sigue apuntada en `fotos` y el
   archivo queda, porque `/evidencia/...` ya exige que la entrega esté visible —
   con la fila anulada la foto deja de servirse sola. Borrar el objeto sería
   destruir la única copia de algo que quizá haya que volver a mirar. */
async function adminAnularEntrega(request, env, numero, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { /* el motivo se valida abajo */ }

  const motivo = String(c.motivo == null ? "" : c.motivo).trim().slice(0, 300);
  /* Sin motivo no se anula. Es la misma regla del certificado: lo que explica el
     hueco del consecutivo es el motivo, así que un motivo vacío deja el hueco
     igual de inexplicable que si se hubiera borrado la fila. */
  if (motivo.length < 4) {
    return json({ error: "motivo_requerido", ayuda: "Escribe por qué se anula: es lo que explica el hueco en el consecutivo de actas." }, 400);
  }

  const e = await env.DB.prepare(
    "SELECT numero, anulada_en FROM entregas WHERE numero = ?"
  ).bind(numero).first();
  if (!e) return json({ error: "no_encontrada" }, 404);
  if (e.anulada_en) return json({ error: "ya_anulada", anulada_en: e.anulada_en }, 409);

  /* Se despublica en el mismo movimiento. Dejarla anulada Y publicada sería un
     estado que ninguna consulta pública contempla, y bastaría con que alguien
     olvidara el segundo paso para que un acta inválida siguiera a la vista. */
  await env.DB.prepare(
    "UPDATE entregas SET anulada_en = datetime('now'), anulada_motivo = ?, anulada_por = ?, " +
    "publicada_en = NULL, actualizada_en = datetime('now') WHERE numero = ?"
  ).bind(motivo, quien || "?", numero).run();

  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "acta " + numero + " anulada: " + motivo).run();

  return json({ ok: true, numero, anulada: true });
}

async function adminCrearEntrega(request, env, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const destino = limpiar(c.destino_id, 60);
  const sector  = limpiar(c.sector, 80);
  const fecha   = limpiar(c.fecha, 10);
  const resumen = limpiar(c.resumen, 1200);

  const faltan = [];
  if (!destino) faltan.push("destino_id");
  if (!sector)  faltan.push("sector");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) faltan.push("fecha");
  if (!resumen) faltan.push("resumen");
  if (faltan.length) return json({ error: "datos_incompletos", faltan }, 422);

  if (fechaEnFuturo(fecha)) {
    return json({
      error: "fecha_futura", fecha,
      ayuda: "El acta registra una entrega que ya ocurrió. Si la jornada es futura, todavía no hay acta que registrar."
    }, 422);
  }

  const numero = await siguienteActa(env, Number(fecha.slice(0, 4)));
  await env.DB.prepare(
    "INSERT INTO entregas (numero, destino_id, sector, lugar, fecha, aliada, familias, " +
    "resumen, recibido_por, fotos, creada_por) VALUES (?,?,?,?,?,?,?,?,?,'[]',?)"
  ).bind(
    numero, destino, sector, limpiar(c.lugar, 160), fecha, limpiar(c.aliada, 160),
    Number(c.familias) > 0 ? Math.round(Number(c.familias)) : null,
    resumen, limpiar(c.recibido_por, 160), quien || "?"
  ).run();

  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "entrega " + numero + " creada · " + sector + " · " + fecha).run();

  return json({ ok: true, numero });
}

async function adminSubirFoto(request, env, numero, url) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!env.MEDIA) return json({ error: "media_no_configurado" }, 503);

  const e = await env.DB.prepare("SELECT numero, fotos FROM entregas WHERE numero = ?").bind(numero).first();
  if (!e) return json({ error: "no_encontrada" }, 404);

  const tipo = String(request.headers.get("content-type") || "").split(";")[0].trim();
  const ext = TIPOS_FOTO[tipo];
  if (!ext) return json({ error: "tipo_no_permitido", permitidos: Object.keys(TIPOS_FOTO) }, 415);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: "archivo_vacio" }, 400);
  if (bytes.length > MAX_FOTO) return json({ error: "archivo_muy_grande", max_mb: 8 }, 413);

  let fotos = [];
  try { fotos = JSON.parse(e.fotos || "[]"); } catch (x) { /* nada */ }
  /* El nombre lo pone el servidor: un nombre de archivo que llegue del cliente
     es una ruta que llega del cliente. */
  const archivo = (fotos.length + 1) + "-" + tokenNuevo().slice(0, 8) + "." + ext;

  await env.MEDIA.put("entregas/" + numero + "/" + archivo, bytes, {
    httpMetadata: { contentType: tipo }
  });
  fotos.push({ k: archivo, alt: limpiar(url.searchParams.get("alt"), 200) });
  await env.DB.prepare(
    "UPDATE entregas SET fotos = ?, actualizada_en = datetime('now') WHERE numero = ?"
  ).bind(JSON.stringify(fotos), numero).run();

  return json({ ok: true, archivo, total: fotos.length });
}

/* Publicar es un acto aparte de registrar: se registra en caliente, en terreno,
   y se publica cuando alguien revisó que no haya un dato que no deba salir. */
async function adminPublicarEntrega(request, env, numero, quien) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c = {};
  try { c = await request.json(); } catch { /* opcional */ }
  const publicar = c.publicar !== false;

  const e = await env.DB.prepare(
    "SELECT numero, fecha, fotos, publicada_en, anulada_en FROM entregas WHERE numero = ?"
  ).bind(numero).first();
  if (!e) return json({ error: "no_encontrada" }, 404);

  /* Un acta anulada no vuelve. Si describía algo que sí ocurrió, se registra de
     nuevo con su número siguiente: el consecutivo cuenta actas emitidas, no
     intentos, y resucitar la anulada borraría el rastro del error. */
  if (publicar && e.anulada_en) {
    return json({
      error: "anulada", anulada_en: e.anulada_en,
      ayuda: "Esta acta está anulada y no se puede volver a publicar. Si la entrega sí ocurrió, regístrala de nuevo: tomará el número siguiente."
    }, 409);
  }

  /* Se comprueba también AQUÍ y no solo al crear: las filas registradas antes de
     esta validación siguen en la base, y publicar es el momento en que el dato
     se vuelve una afirmación pública. */
  if (publicar && fechaEnFuturo(e.fecha)) {
    return json({
      error: "fecha_futura", fecha: e.fecha,
      ayuda: "Esta entrega está fechada en el futuro. Corrige la fecha antes de publicarla: el sitio estaría afirmando algo que todavía no ocurrió."
    }, 422);
  }

  /* Una entrega sin una sola foto no es evidencia, es una afirmación. El sitio
     entero se apoya en «evidencia, no promesas»: publicarla vacía sería romper
     justo la regla que la campaña anuncia. */
  if (publicar) {
    let fotos = [];
    try { fotos = JSON.parse(e.fotos || "[]"); } catch (x) { /* nada */ }
    if (!fotos.length) {
      return json({
        error: "sin_evidencia",
        ayuda: "Sube al menos la foto del acta firmada antes de publicar."
      }, 422);
    }
  }

  await env.DB.prepare(
    "UPDATE entregas SET publicada_en = " + (publicar ? "datetime('now')" : "NULL") +
    ", actualizada_en = datetime('now') WHERE numero = ?"
  ).bind(numero).run();
  await env.DB.prepare(
    "INSERT INTO consentimientos (sujeto, tipo, detalle) VALUES (?, 'auditoria', ?)"
  ).bind(quien || "?", "entrega " + numero + (publicar ? " PUBLICADA" : " despublicada")).run();

  return json({ ok: true, numero, publicada: publicar });
}

/* ========================================================================
   /ruta — la bandeja en el bolsillo
   ========================================================================
   Se genera desde el Worker, como el panel y el triaje, y por la misma razón:
   muestra teléfono y dirección, así que no puede ser un archivo estático.

   ⚠ ACCESO: va con la audiencia del PANEL y NUNCA con la del triaje. Un
   ingeniero voluntario no puede ver de quién es la casa ni dónde queda —esa
   asimetría es deliberada desde la 0010— y esta pantalla es exactamente lo que
   él no debe ver.

   ⚠ Dentro de esta plantilla hay que escribir \\n y \\/ : lo que se lee aquí no
   es lo que ejecuta el navegador. Se evitan a propósito las expresiones
   regulares y los saltos escapados. El check #1b del gate valida lo EMITIDO.
   ======================================================================== */
function paginaRuta() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Ruta del día</title>
<style>
  /* Móvil primero de verdad: esto se usa de pie, en la calle, con una mano.
     Tipos grandes, blancos de toque de 44px y nada que requiera precisión. */
  :root{--g:#1F5C38;--ink:#191813;--mu:#5C636F;--bd:#DAD3C3;--bg:#F3EFE6;--surface:#FBF8F1;
        --urg:#8C2F1E;--prog:#9A6B12;--ok:#1F5C38;--amber:#A84D00}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);
       line-height:1.5;font-size:16px}
  .wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px}
  h1{font-size:21px;margin-bottom:2px}
  .sub{color:var(--mu);font-size:13.5px;margin-bottom:14px}
  .secs{display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:14px}
  .sec{flex:0 0 auto;border:1px solid var(--bd);background:var(--surface);border-radius:999px;
       padding:9px 15px;font-size:14px;cursor:pointer;white-space:nowrap;color:var(--ink)}
  .sec.on{background:var(--g);color:#fff;border-color:var(--g);font-weight:600}
  .caso{background:var(--surface);border:1px solid var(--bd);border-radius:12px;
        padding:14px 15px;margin-bottom:12px}
  .caso.visitado{opacity:.6}
  .cab{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}
  .num{font-family:ui-monospace,Menlo,monospace;font-size:13.5px;color:var(--mu)}
  .pill{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
        padding:3px 9px;border-radius:999px;border:1px solid currentColor}
  .p-urgente{color:var(--urg)} .p-programada{color:var(--prog)}
  .p-no_requiere{color:var(--ok)} .p-inevaluable{color:var(--mu)} .p-sin{color:var(--mu)}
  .quien{font-size:17px;font-weight:600}
  .donde{font-size:14.5px;margin-top:2px}
  .avisos{font-size:13px;color:var(--amber);font-weight:600;margin-top:4px}
  .reco{font-size:13.5px;color:var(--mu);margin-top:7px;border-left:2px solid var(--bd);padding-left:10px}
  /* 44px de alto mínimo: es el blanco de toque que no falla con guantes o prisa. */
  .acc{display:flex;gap:9px;margin-top:12px;flex-wrap:wrap}
  .b{flex:1 1 auto;min-height:44px;display:flex;align-items:center;justify-content:center;
     border-radius:10px;border:1px solid var(--g);color:var(--g);background:transparent;
     font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;padding:0 14px}
  .b.full{background:var(--g);color:#fff}
  .b.hecho{border-color:var(--bd);color:var(--mu)}
  .vacio{color:var(--mu);font-size:15px;padding:26px 0;text-align:center}
  .aviso{background:var(--surface);border:1px solid var(--bd);border-left:3px solid var(--g);
         padding:13px 15px;border-radius:10px;margin-bottom:16px;font-size:13.5px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Ruta del día</h1>
  <p class="sub" id="quien">Cargando…</p>
  <div class="aviso"><strong>Marcar «visitada» pide contar qué encontraste.</strong>
  Es lo único que va a quedar de que estuviste ahí, y lo que va a leer quien
  pregunte dentro de un mes. La foto es opcional pero vale por diez líneas.</div>
  <div class="secs" id="secs"></div>
  <div id="lista"><p class="vacio">Cargando casos…</p></div>
</div>
<script src="/admin/ruta.js"></script>
</body>
</html>`;
}

function rutaJS() {
  return `
var SECTOR = "";

function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
  });
}

var ET = { urgente:"Urgente", programada:"Programada",
           no_requiere:"No requiere", inevaluable:"Sin evaluar bien" };

fetch("/api/admin/quien").then(function(r){ return r.json(); }).then(function(d){
  var e = document.getElementById("quien");
  if (e) e.textContent = "Sesión de " + (d.email || "?") + " · solo el equipo ve esta pantalla";
});

function cargarRuta(){
  var u = "/api/admin/ruta" + (SECTOR ? "?sector=" + encodeURIComponent(SECTOR) : "");
  fetch(u).then(function(r){ return r.json(); }).then(function(d){
    pintarSectores(d.sectores || []);
    pintarCasos(d.casos || []);
  });
}

function pintarSectores(l){
  var c = document.getElementById("secs"); if (!c) return;
  var h = '<button class="sec' + (SECTOR ? "" : " on") + '" data-sec="">Todos</button>';
  for (var i = 0; i < l.length; i++){
    h += '<button class="sec' + (SECTOR === l[i].sector ? " on" : "") + '" data-sec="' +
         esc(l[i].sector) + '">' + esc(l[i].sector) + " · " + l[i].n + "</button>";
  }
  c.innerHTML = h;
}

function pintarCasos(l){
  var c = document.getElementById("lista"); if (!c) return;
  if (!l.length){ c.innerHTML = '<p class="vacio">Nada por visitar aquí. Buen trabajo.</p>'; return; }
  var h = "";
  for (var i = 0; i < l.length; i++){
    var x = l[i];
    var visitado = x.estado === "visitado";
    var avisos = [];
    if (x.heridos) avisos.push("hubo heridos");
    if (!x.habitada) avisos.push("desocupada");
    /* El teléfono va sin espacios en el enlace y con ellos a la vista: uno lo
       marca el sistema, el otro lo lee una persona. */
    var tel = String(x.contacto_tel || "").replace(/[^0-9+]/g, "");
    h += '<div class="caso' + (visitado ? " visitado" : "") + '">' +
      '<div class="cab"><span class="num">' + esc(x.numero) + "</span>" +
      '<span class="pill p-' + esc(x.clasificacion || "sin") + '">' +
      esc(x.clasificacion ? (ET[x.clasificacion] || x.clasificacion) : "sin evaluar") + "</span>" +
      (visitado ? '<span class="pill p-no_requiere">visitada</span>' : "") + "</div>" +
      '<div class="quien">' + esc(x.contacto_nombre) + "</div>" +
      '<div class="donde">' + esc(x.direccion_ref || "sin dirección") + "</div>" +
      '<div class="donde" style="color:var(--mu);font-size:13.5px">' + esc(x.sector) + "</div>" +
      (avisos.length ? '<div class="avisos">' + esc(avisos.join(" · ")) + "</div>" : "") +
      (x.reco ? '<div class="reco">' + esc(x.reco) + "</div>" : "") +
      '<div class="acc">' +
        '<a class="b" href="tel:' + esc(tel) + '">Llamar</a>' +
        '<a class="b" href="https://wa.me/' + esc(tel.replace("+","")) + '" target="_blank" rel="noopener">WhatsApp</a>' +
        (visitado
          ? '<span class="b hecho">Ya visitada</span>'
          : '<button class="b full" data-visita="' + esc(x.numero) + '">Visitada…</button>') +
      "</div>" +
      '<label class="b" style="margin-top:9px;display:flex;cursor:pointer">Añadir foto de la visita' +
      '<input type="file" accept="image/*" capture="environment" data-foto="' + esc(x.numero) + '"' +
      ' style="position:absolute;left:-9999px"></label>' +
      '<p class="reco" data-msg="' + esc(x.numero) + '" style="display:none"></p>' +
      "</div>";
  }
  c.innerHTML = h;
}

/* Compresión propia, y sí, es una segunda copia de la del sitio. Esta página
   es autocontenida y la sirve el Worker: no carga app.js ni debería, así que la
   alternativa era subir crudo desde un celular con datos móviles en terreno —
   exactamente el problema que acabamos de arreglar del otro lado.
   Si algo falla, se sube el original.
   (Y sin comillas invertidas en este comentario: cerrarían el template. El
   check #1b acaba de atrapármelo escribiéndolo.) */
function comprimirEnRuta(file){
  if (!file || file.type.indexOf("image/") !== 0) return Promise.resolve(file);
  if (typeof createImageBitmap !== "function") return Promise.resolve(file);
  return createImageBitmap(file, { imageOrientation: "from-image" }).then(function(img){
    var lado = Math.max(img.width, img.height);
    var k = lado > 1600 ? 1600 / lado : 1;
    var cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    if (img.close) img.close();
    return new Promise(function(res){
      cv.toBlob(function(b){ res(b && b.size < file.size ? b : file); }, "image/jpeg", 0.8);
    });
  }).catch(function(){ return file; });
}

document.addEventListener("change", function(e){
  var inp = e.target.closest("[data-foto]");
  if (!inp || !inp.files || !inp.files.length) return;
  var num = inp.getAttribute("data-foto");
  var msg = document.querySelector('[data-msg="' + num + '"]');
  if (msg){ msg.style.display = ""; msg.textContent = "Subiendo la foto…"; }
  comprimirEnRuta(inp.files[0]).then(function(archivo){
    return fetch("/api/admin/caso/" + encodeURIComponent(num) + "/medio", {
      method: "POST", headers: { "content-type": archivo.type || "image/jpeg" }, body: archivo
    });
  }).then(function(r){ return r.json(); }).then(function(d){
    if (msg) msg.textContent = d && d.error ? "No se pudo subir: " + d.error : "Foto guardada.";
  }).catch(function(){ if (msg) msg.textContent = "No se pudo subir la foto."; });
  inp.value = "";
});

document.addEventListener("click", function(e){
  var s = e.target.closest("[data-sec]");
  if (s){ SECTOR = s.getAttribute("data-sec"); cargarRuta(); return; }

  var v = e.target.closest("[data-visita]");
  if (!v) return;
  var num = v.getAttribute("data-visita");
  /* \\\\n y no \\n: esto vive dentro del template literal de rutaJS(). */
  var nota = window.prompt("Visita a " + num +
    ".\\\\n\\\\n¿Qué encontraste? Es lo único que va a quedar de que estuviste ahí:");
  if (!nota) return;
  v.disabled = true; v.textContent = "…";
  fetch("/api/admin/caso/" + encodeURIComponent(num) + "/estado", {
    method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ estado: "visitado", motivo: nota })
  }).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.error){ window.alert("No se guardó: " + d.error + (d.ayuda ? "\\\\n\\\\n" + d.ayuda : "")); }
    cargarRuta();
  }).catch(function(){ cargarRuta(); });
});

cargarRuta();
`;
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

<h2 class="h-sec" style="margin:8px 0 6px;font-size:26px">Salud del ecosistema</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Lo que las listas de abajo
no dicen: dónde se cae la donación, si el cobro está dando señales de vida, y qué lleva días
esperando a que una persona haga algo. <strong>El cero se muestra como cero</strong> — que algo no
haya pasado todavía es información, no un hueco que tapar. Y no hay porcentajes sin denominador:
donde falta el dato dice «sin datos», no «0 %».</p>
<div id="salud"><p class="mu">Cargando…</p></div>

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
<th scope="col">Destino</th><th scope="col">Donante</th><th scope="col">Recibo</th>
<th scope="col">Certificado</th><th scope="col">Creada</th><th scope="col">Acción</th>
</tr></thead><tbody id="filas"><tr><td colspan="9">Cargando…</td></tr></tbody>
</table></div>

<div id="dlg" style="display:none;margin-top:24px"></div>

<h2 class="h-sec" style="margin:48px 0 6px;font-size:26px">Transferencias por verificar</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Alguien dice que transfirió.
<strong>Eso no es dinero en el banco:</strong> contrasta contra el extracto antes de confirmar. Hasta
que lo hagas no hay recibo ni certificado, y el donante ya sabe que es así. Al confirmar se pide el
número del comprobante porque <strong>es el que cita el certificado</strong>.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Guía</th><th scope="col">Monto</th><th scope="col">Destino</th>
<th scope="col">Donante</th><th scope="col">Ref.</th><th scope="col">Comprobante</th>
<th scope="col">Cert.</th><th scope="col">Acción</th>
</tr></thead><tbody id="t-filas"><tr><td colspan="8">Cargando…</td></tr></tbody>
</table></div>

<h2 class="h-sec" style="margin:48px 0 6px;font-size:26px">Quién quiere entrar</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Voluntarios, fundaciones que
aplican al HUB, empresas que piden alianza e ingenieros que se postulan al triaje. <strong>Ninguna de
estas cuatro cosas es un alta:</strong> la fundación entra con el convenio de cooperación después de
la visita de contexto, y la empresa con la firma del Convenio Marco. Aceptar aquí significa
«seguimos», no «ya está publicado».</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px"><strong>Con un ingeniero hay
un paso más, y este panel no lo hace:</strong> primero se busca su matrícula en el registro público
del COPNIA, y solo después se le abre el triaje añadiendo su correo en Cloudflare Access. Aceptarlo
aquí no le da acceso a nada. Su matrícula es un dato que él declaró, no uno comprobado.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Tipo</th><th scope="col">Quién</th><th scope="col">Lo que hay que saber</th>
<th scope="col">Contacto</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col">Acción</th>
</tr></thead><tbody id="i-filas"><tr><td colspan="7">Cargando…</td></tr></tbody>
</table></div>

<h2 class="h-sec" style="margin:48px 0 6px;font-size:26px">Casas por revisar</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Triaje estructural. Los
ingenieros clasifican sin ver de quién es la casa ni dónde queda; <strong>aquí sí están el contacto
y la dirección</strong>, que es lo que permite ir a visitar. Ordenadas por urgencia y, dentro de
cada grupo, por antigüedad; lo cerrado se hunde al fondo.</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Si dos casos comparten
teléfono aparece el aviso <strong>«mismo teléfono que…»</strong>. Casi siempre es la misma familia
que envió dos veces porque no estaba segura: <strong>revísalos antes de salir</strong>, o se va dos
veces a la misma puerta. A veces son dos casas de verdad —un arriendo, un familiar— y entonces no
hay nada que hacer.</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Cerrar y descartar
<strong>piden motivo, y no es un trámite</strong>: un caso que se va de la lista sin decir por qué
es indistinguible de uno perdido, y del otro lado hay una familia que mandó fotos de su casa. Queda
en el registro con tu correo y la fecha. <strong>Descartar no borra nada</strong> —es para
duplicados y pruebas— y todo se puede reabrir.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Caso</th><th scope="col">Prioridad</th><th scope="col">Dónde</th>
<th scope="col">Contacto</th><th scope="col">La casa</th><th scope="col">Estado</th>
<th scope="col">Acción</th>
</tr></thead><tbody id="cs-filas"><tr><td colspan="7">Cargando…</td></tr></tbody>
</table></div>
<div id="cs-dlg" style="display:none;margin-top:20px"></div>

<h2 class="h-sec" style="margin:48px 0 6px;font-size:26px">Ofrecimientos en especie</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Lo que llega por el formulario
de la brigada. <strong>El acuse les pidió NO comprar todavía</strong>, así que conviene responder
antes de que lo hagan: el inventario cambia todos los días.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Qué</th><th scope="col">Cantidad</th><th scope="col">Cuándo</th>
<th scope="col">Quién</th><th scope="col">Ciudad</th><th scope="col">Estado</th><th scope="col">Acción</th>
</tr></thead><tbody id="o-filas"><tr><td colspan="7">Cargando…</td></tr></tbody>
</table></div>

<h2 class="h-sec" style="margin:48px 0 6px;font-size:26px">Pagos sin aporte</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Pagos aprobados que entraron
por el <strong>enlace directo de Wompi</strong> (el QR de la brigada) y no por el checkout del sitio.
Cobraron a la misma cuenta, pero no tienen guía, ni recibo, ni certificado emitible: si alguno pide
certificado, hay que crearle el registro a mano. Si esta lista está vacía, todo lo cobrado está
trazado.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Referencia</th><th scope="col">Monto</th><th scope="col">Método</th>
<th scope="col">Donante</th><th scope="col">Recibido</th>
</tr></thead><tbody id="p-filas"><tr><td colspan="5">Cargando…</td></tr></tbody>
</table></div>

<h2 class="h-sec" style="margin:48px 0 6px;font-size:26px">Entregas</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:18px">El documento legal es el
acta EN PAPEL que firma quien recibe. Aquí se registra su transcripción y se sube su foto.
<strong>Nunca se publican nombres de personas beneficiarias</strong> — en «recibido por» va el rol
y la entidad, no una persona atendida. Una entrega no se puede publicar sin al menos una foto.</p>

<div class="card" style="max-width:640px;text-align:left;margin-bottom:20px">
  <h3 style="margin-bottom:12px">Registrar una entrega</h3>
  <div id="e-campos"></div>
  <p id="e-error" class="mu" style="color:#c0392b;font-size:13px;display:none"></p>
  <button class="btn btn-g" id="e-crear">Registrar</button>
</div>

<!-- eco-stack: en pantalla angosta esta tabla deja de ser tabla y se apila.
     Es la única del panel que se usa EN TERRENO, desde un celular, después de
     una entrega — y era la que peor se comportaba: 633px de contenido en una
     ventana de 327, con «+foto», «Publicar» y «Anular» fuera de pantalla y de
     26px de alto. La clase va solo aquí y no en med-tbl porque esa tabla
     también la usa la página pública de medición. -->
<div class="med-tw"><table class="med-tbl eco-stack">
<thead><tr>
<th scope="col">Acta</th><th scope="col">Fecha</th><th scope="col">Sector</th>
<th scope="col">Aliada</th><th scope="col">Familias</th><th scope="col">Fotos</th>
<th scope="col">Estado</th><th scope="col">Acción</th>
</tr></thead><tbody id="e-filas"><tr><td colspan="8">Cargando…</td></tr></tbody>
</table></div>

<p class="mu" style="margin-top:18px;font-size:13px;max-width:70ch">Los estados de pago los mueve el webhook de Wompi, nunca este panel. Aquí solo se marca lo que ocurre en terreno: distribución y entrega.</p>
<p class="mu" style="margin-top:8px;font-size:13px;max-width:70ch">El <strong>recibo</strong> lo emite el sistema al confirmarse el pago. El <strong>certificado</strong> no: lo firman el Representante Legal y la Revisora Fiscal bajo la gravedad de juramento, así que sale de aquí, revisado, y nunca solo.</p>
</div></section></main>
<script src="/admin.js"></script>
</body></html>`;
}

function adminJS() {
  return `"use strict";
var FILTRO = "";
var FILAS = {};
function pesos(c){ return "$" + Math.round((c||0)/100).toLocaleString("es-CO"); }
function esc(s){
  /* ESCAPA TAMBIÉN LAS COMILLAS, y esa es la corrección.
     Antes usaba textContent -> innerHTML, que escapa & < > y NADA MÁS. Basta
     para texto, pero este panel mete valores dentro de atributos —campo() los
     pone en value="..."— y ahí una comilla doble cierra el atributo y abre uno
     nuevo. Comprobado el 19 ago: un caso creado desde el formulario PÚBLICO,
     sin autenticarse, inyectaba un atributo propio en el input de la ficha. Con
     un manejador de evento en vez de un data- eso es JavaScript ejecutándose
     dentro de una sesión de Access, con acceso a donantes y comprobantes. */
  return String(s == null ? "" : s).replace(/[&<>"\']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "\'":"&#39;" }[c];
  });
}

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
  /* Conciliar solo donde tiene sentido: un aporte que se quedó sin confirmar.
     Es el rescate para cuando el pago ocurrió y el webhook no llegó — pasó el 12
     de agosto con GG-2026-001001, cobrada en Wompi y sin confirmar aquí. */
  if (["intencion", "pendiente", "error"].indexOf(a.estado) >= 0) {
    return '<button class="copy" data-conc="' + esc(a.guia) + '">Conciliar con Wompi</button>';
  }
  return "";
}

var APROBADOS = ["aprobada", "en_distribucion", "entregada"];

/* Columna de certificado. Tres estados y ninguno ambiguo: ya emitido (con
   enlace al PDF), pedido y emitible (botón), o nada. El botón NO emite de
   golpe: abre la revisión, que es el punto entero de esta pieza. */
function celdaCert(a){
  if (a.certificado){
    var enlace = '<a href="/api/admin/certificado/' + esc(a.certificado) + '.pdf" target="_blank" rel="noopener">' + esc(a.certificado) + '</a>';
    /* Un certificado en revisión perdió su respaldo: el pago se cayó después de
       emitirlo. Tiene que gritar en la lista, no esconderse tras un número que
       se ve igual que los sanos. */
    if (a.cert_revision){
      return enlace + '<br><strong style="color:#A84D00">sin respaldo</strong>' +
        '<br><button class="copy" data-anular="' + esc(a.certificado) + '">Anular…</button>';
    }
    return enlace + '<br><button class="copy" data-anular="' + esc(a.certificado) + '">Anular…</button>';
  }
  if (a.quiere_certificado && APROBADOS.indexOf(a.estado) >= 0){
    return '<button class="copy" data-cert="' + esc(a.guia) + '">Emitir…</button>';
  }
  return a.quiere_certificado ? "pedido" : "—";
}

function pintarFilas(l){
  var tb = document.getElementById("filas");
  if (!l.length){ tb.innerHTML = '<tr><td colspan="9">Nada con ese filtro.</td></tr>'; return; }
  FILAS = {};
  tb.innerHTML = l.map(function(a){
    FILAS[a.guia] = a;
    var recibo = (APROBADOS.indexOf(a.estado) >= 0 && a.token)
      ? '<a href="/api/recibo/' + esc(a.guia) + '.pdf?t=' + esc(a.token) + '" target="_blank" rel="noopener">PDF</a>' : "—";
    /* Que el PDF exista no significa que al donante le haya llegado. Debajo del
       enlace va lo que pasó con SU correo: sin esto, «no me llegó el recibo» no
       tenía respuesta desde el panel. */
    if (a.recibo_correo === "enviado")       recibo += '<br><small>correo enviado</small>';
    else if (a.recibo_correo === "fallo")    recibo += '<br><small style="color:#A84D00"><strong>correo falló</strong></small>';
    else if (a.recibo_correo === "simulado") recibo += '<br><small style="color:#A84D00"><strong>no se envió</strong></small>';
    else if (APROBADOS.indexOf(a.estado) >= 0) recibo += '<br><small>correo sin registro</small>';
    return "<tr>" +
      "<td>" + esc(a.guia) + "</td>" +
      "<td>" + esc(a.estado) + "</td>" +
      "<td>" + pesos(a.monto_centavos) + "</td>" +
      "<td>" + esc(a.modo === "dirigida" ? (a.destino_id||"?") : "Fondo general") + "</td>" +
      "<td>" + esc(a.donante || "—") + (a.correo ? "<br><small>" + esc(a.correo) + "</small>" : "") + "</td>" +
      "<td>" + recibo + "</td>" +
      "<td>" + celdaCert(a) + "</td>" +
      "<td>" + esc((a.creada_en||"").slice(0,16)) + "</td>" +
      "<td>" + accion(a) + "</td>" +
    "</tr>";
  }).join("");
}

/* ---- revisión previa a emitir -------------------------------------------
   Wompi no entrega domicilio y a veces tampoco documento, y el certificado
   identifica al donante ante la DIAN. Este formulario es donde una persona
   completa y confirma esos datos: no es un trámite, es la revisión que el
   documento exige. Lo que se corrija aquí se guarda también en el donante. */
function abrirCert(guia){
  var a = FILAS[guia] || {};
  var caja = document.getElementById("dlg");
  caja.innerHTML =
    '<div class="card" style="max-width:520px;margin:0 auto;text-align:left">' +
      '<h3 style="margin-bottom:4px">Emitir certificado</h3>' +
      '<p class="mu" style="font-size:13px;margin-bottom:16px">Aporte ' + esc(guia) + ' · ' + pesos(a.monto_centavos) +
        '. Firman el Representante Legal y la Revisora Fiscal: revisa los datos antes de emitir.</p>' +
      campo("c-nombre", "Nombre o razón social", a.donante) +
      campo("c-doc", "Documento (NIT o C.C.)", a.doc_numero) +
      campo("c-ciudad", "Domicilio del donante", a.ciudad) +
      /* Solo aparece si el emisor se aparta de lo que validó Wompi. Pedirlo
         siempre lo convertiría en un campo que se rellena en automático. */
      '<div id="c-div" style="display:none;border-left:3px solid #A84D00;padding-left:12px;margin:12px 0">' +
        '<p style="font-size:13px;margin-bottom:8px"><strong>Cambiaste la identidad que validó la pasarela.</strong> ' +
        'El descuento tributario le corresponde a quien donó: explica por qué.</p>' +
        campo("c-motivo", "Motivo del cambio", "") +
      '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:14px 0;font-size:14px">' +
        '<input type="checkbox" id="c-enviar"' + (a.correo ? " checked" : " disabled") + '> ' +
        (a.correo ? "Enviarlo a " + esc(a.correo) : "Sin correo del donante: solo se emite") +
      '</label>' +
      '<p id="c-error" class="mu" style="color:#c0392b;font-size:13px;display:none"></p>' +
      '<div style="display:flex;gap:10px;margin-top:8px">' +
        '<button class="btn btn-g" id="c-ok" data-emitir="' + esc(guia) + '">Emitir</button>' +
        '<button class="btn btn-w" id="c-no">Cancelar</button>' +
      '</div>' +
    '</div>';
  caja.style.display = "block";
}
function campo(id, etiqueta, valor){
  return '<label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">' + esc(etiqueta) +
    '<input id="' + id + '" value="' + esc(valor || "") + '" ' +
    'style="display:block;width:100%;margin-top:4px;padding:9px 11px;border:1px solid var(--bd);border-radius:10px;font:inherit;font-weight:400;background:var(--surface);color:var(--ink)"></label>';
}
function cerrarCert(){
  var caja = document.getElementById("dlg");
  caja.style.display = "none"; caja.innerHTML = "";
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
  var c = e.target.closest("[data-cert]");
  if (c){ abrirCert(c.getAttribute("data-cert")); return; }

  /* Anular exige motivo y se queda escrito en el PDF: el papel viaja solo y
     quien lo tenga en la mano debe poder ver que ya no vale. */
  var an = e.target.closest("[data-anular]");
  if (an){
    var num = an.getAttribute("data-anular");
    var motivo = window.prompt("Anular " + num + ". ¿Motivo? Queda impreso en el certificado.");
    if (!motivo) return;
    an.disabled = true; an.textContent = "…";
    fetch("/api/admin/certificado/" + encodeURIComponent(num) + "/anular", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ motivo: motivo })
    }).then(function(r){ return r.json(); }).then(function(){ cargar(); })
      .catch(function(){ an.disabled = false; an.textContent = "Reintentar"; });
    return;
  }

  if (e.target.id === "c-no"){ cerrarCert(); return; }

  var ok = e.target.closest("[data-emitir]");
  if (ok){
    var err = document.getElementById("c-error");
    err.style.display = "none";
    ok.disabled = true; ok.textContent = "Emitiendo…";
    var env = document.getElementById("c-enviar");
    fetch("/api/admin/certificado/" + encodeURIComponent(ok.getAttribute("data-emitir")), {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({
        nombre: document.getElementById("c-nombre").value,
        doc_numero: document.getElementById("c-doc").value,
        ciudad: document.getElementById("c-ciudad").value,
        motivo_cambio: (document.getElementById("c-motivo") || {}).value || "",
        enviar: !!(env && env.checked && !env.disabled)
      })
    }).then(function(r){ return r.json().then(function(d){ return { http: r.status, d: d }; }); })
      .then(function(res){
        if (res.http !== 200){
          /* El error se muestra en el formulario y NO se cierra: quien emite
             tiene que ver qué faltó, no adivinarlo tras un diálogo que se fue. */
          if (res.d.error === "divergencia_sin_motivo"){
            document.getElementById("c-div").style.display = "block";
            err.textContent = "Cambiaste " + res.d.divergencia.map(function(x){ return x.campo; }).join(", ") +
              " respecto de lo que validó la pasarela. Escribe el motivo y vuelve a emitir.";
          } else {
            err.textContent = res.d.faltan
              ? "Faltan datos obligatorios: " + res.d.faltan.join(", ") + "."
              : ("No se pudo emitir (" + (res.d.error || res.http) + ").");
          }
          err.style.display = "block";
          ok.disabled = false; ok.textContent = "Emitir";
          return;
        }
        cerrarCert();
        cargar();
        window.open("/api/admin/certificado/" + encodeURIComponent(res.d.numero) + ".pdf", "_blank", "noopener");
      })
      .catch(function(){ ok.disabled = false; ok.textContent = "Reintentar"; });
    return;
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

  /* Conciliar contra la API de Wompi. Se pide el número de transacción y no se
     busca por referencia a propósito: el número lo trae el correo de «Pago
     exitoso» y el panel de Wompi, y obligar a copiarlo es lo que permite que el
     Worker verifique que la transacción es de ESTA guía antes de tocar nada. */
  var cn = e.target.closest("[data-conc]");
  if (cn){
    var g3 = cn.getAttribute("data-conc");
    var tx = window.prompt("Conciliar " + g3 + " contra la API de Wompi.\\n\\nNúmero de transacción (lo trae el correo de «Pago exitoso» y el panel de Wompi):");
    if (!tx) return;
    cn.disabled = true; cn.textContent = "…";
    fetch("/api/admin/aporte/" + encodeURIComponent(g3) + "/conciliar", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ transaccion: tx })
    }).then(function(r){ return r.json(); }).then(function(d){
      if (d.ayuda) alert(d.ayuda);
      else if (d.error) alert("No se pudo conciliar: " + d.error);
      else alert("Wompi dice: " + d.wompi_estado + ". El aporte quedó en «" + (d.aporte && d.aporte.estado) + "».");
      cargar(); cargarSalud();
    }).catch(function(){ cn.disabled = false; cn.textContent = "Reintentar"; });
  }
});

/* ---------------- transferencias por verificar ---------------- */
function cargarReportadas(){
  fetch("/api/admin/reportadas").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("t-filas"); if (!tb) return;
    var l = d.reportadas || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="8">Ninguna esperando verificación.</td></tr>'; return; }
    tb.innerHTML = l.map(function(a){
      return "<tr>" +
        "<td>" + esc(a.guia) + "<br><small>" + esc((a.creada_en||"").slice(0,16)) + "</small></td>" +
        "<td>" + pesos(a.monto_centavos) + "</td>" +
        "<td>" + esc(a.modo === "dirigida" ? (a.proyecto || a.destino_id || "?") : "Fondo general") + "</td>" +
        "<td>" + esc(a.nombre || "—") + (a.email ? "<br><small>" + esc(a.email) + "</small>" : "") + "</td>" +
        "<td>" + esc(a.referencia_pago || "—") + "</td>" +
        "<td>" + (a.comprobante
          ? '<a href="/api/admin/comprobante/' + esc(a.guia) + '" target="_blank" rel="noopener">ver</a>'
          : '<strong style="color:#A84D00">sin subir</strong>') + "</td>" +
        "<td>" + (a.quiere_certificado ? "sí" : "—") + "</td>" +
        '<td><button class="copy" data-conf="' + esc(a.guia) + '">Confirmar…</button> ' +
        '<button class="copy" data-desc="' + esc(a.guia) + '">Descartar</button></td>' +
      "</tr>";
    }).join("");
  });
}

document.addEventListener("click", function(e){
  var cf = e.target.closest("[data-conf]");
  if (cf){
    var g = cf.getAttribute("data-conf");
    /* \\n y no \n: esto vive dentro del template literal de adminJS(), así que un
       \n se interpolaría aquí y el admin.js emitido quedaría con un salto de
       línea real dentro de una cadena entre comillas — sin cerrar. */
    var ref = window.prompt("Confirmar " + g + " contra el extracto.\\n\\nNúmero del comprobante bancario (lo cita el certificado):");
    if (!ref) return;
    cf.disabled = true; cf.textContent = "…";
    fetch("/api/admin/transferencia/" + encodeURIComponent(g) + "/confirmar", {
      method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ referencia: ref })
    }).then(function(r){ return r.json(); })
      .then(function(d){ if (d.ayuda) alert(d.ayuda); cargarReportadas(); cargar(); })
      .catch(function(){ cargarReportadas(); });
    return;
  }
  var ds = e.target.closest("[data-desc]");
  if (ds){
    var g2 = ds.getAttribute("data-desc");
    var motivo = window.prompt("Descartar " + g2 + ". ¿Motivo? Queda en la auditoría.");
    if (!motivo) return;
    ds.disabled = true; ds.textContent = "…";
    fetch("/api/admin/transferencia/" + encodeURIComponent(g2) + "/confirmar", {
      method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ descartar:true, motivo: motivo })
    }).then(function(r){ return r.json(); }).then(function(){ cargarReportadas(); cargar(); })
      .catch(function(){ cargarReportadas(); });
  }
});

/* ---------------- salud del ecosistema (Fase 8) ----------------
   El renderizador respeta las tres reglas del endpoint: el cero se escribe, la
   tasa sin denominador dice «sin datos», y la antigüedad se lee antes que el
   conteo — porque lo que importa de una cola no es cuántos hay sino desde
   cuándo esperan. */
var COLA_ES = {
  inscripciones_sin_tocar: "Inscripciones sin tocar",
  transferencias_sin_verificar: "Transferencias sin verificar",
  certificados_por_emitir: "Certificados por emitir",
  correos_fallidos: "Correos que no salieron",
  entregas_en_borrador: "Entregas en borrador",
  casos_sin_evaluar: "Casas que nadie ha abierto",
  urgentes_sin_visitar: "Urgentes sin visitar",
  casos_esperando_fotos: "Esperando fotos de la familia",
  ingenieros_sin_verificar: "Matrículas sin verificar",
  conceptos_sin_respaldo: "Conceptos esperando confirmación"
};

function pasoEmbudo(etiqueta, n, nota){
  return '<div class="eco-chip"><strong>' + esc(String(n)) + '</strong> ' + esc(etiqueta) +
         (nota ? ' <small>' + esc(nota) + '</small>' : '') + '</div>';
}

/* Días como texto humano. Un nulo no es 0: uno significa «nada esperando» y el
   otro «llegó hoy», y confundirlos es justo lo que hace inútil una alarma. */
function antiguedad(d){
  if (d === null || d === undefined) return "";
  if (d === 0) return "hoy";
  if (d === 1) return "hace 1 día";
  return "hace " + d + " días";
}

function cargarSalud(){
  fetch("/api/admin/salud").then(function(r){ return r.json(); }).then(function(d){
    var box = document.getElementById("salud"); if (!box) return;
    var h = "";

    /* 1 · La alarma primero, si la hay. Va arriba porque es lo único de esta
       sección que puede significar «el sitio está cobrando y no lo sabemos». */
    if (d.webhooks && d.webhooks.sin_evidencia_de_cobro){
      h += '<p style="border-left:3px solid #A84D00;padding:10px 14px;margin:0 0 18px;font-size:14px">' +
        '<strong>El cobro no está probado en producción.</strong> Hay ' +
        esc(String((d.embudo && d.embudo.intenciones) || 0)) +
        ' intenciones de aporte y <strong>cero</strong> eventos de Wompi recibidos en la historia de la base. ' +
        'Mientras no llegue un evento real no hay evidencia de que el webhook funcione — y la batería de pruebas ' +
        'no cuenta: ya pasó 10 de 10 mientras producción rechazaba todo.' +
        '</p>';
    }

    /* 2 · Embudo. */
    var e = d.embudo || {};
    h += '<h3 style="font-size:15px;margin:0 0 8px">El camino de la donación</h3><div class="eco-row" style="justify-content:flex-start;margin-bottom:6px">';
    h += pasoEmbudo("intenciones", e.intenciones);
    if (e.declaradas) h += pasoEmbudo("transferencias declaradas", e.declaradas, "sin verificar");
    h += pasoEmbudo("pagadas", e.pagadas, e.conversion === null ? "sin datos" : e.conversion + "% de las intenciones");
    if (e.rechazadas) h += pasoEmbudo("rechazadas", e.rechazadas);
    h += pasoEmbudo("piden certificado", e.piden_certificado);
    h += pasoEmbudo("certificados emitidos", e.certificados_emitidos);
    h += '</div><p class="mu" style="font-size:12.5px;margin:0 0 20px">«Pagadas» son solo los estados en que el dinero está en la cuenta — una transferencia declarada y sin contrastar no cuenta.' +
      (e.centavos_sin_pagar ? ' Hay ' + pesos(e.centavos_sin_pagar) + ' en intenciones que nunca se pagaron.' : '') + '</p>';

    /* 3 · Webhooks. */
    var w = d.webhooks || {};
    h += '<h3 style="font-size:15px;margin:0 0 8px">Señales de Wompi</h3><div class="eco-row" style="justify-content:flex-start;margin-bottom:6px">';
    h += pasoEmbudo("eventos recibidos", w.recibidos, w.ultimo ? "último " + String(w.ultimo).slice(0,16) : "nunca");
    h += pasoEmbudo("con firma inválida", w.firma_invalida, w.firma_invalida ? "revisar YA" : "");
    h += pasoEmbudo("sin procesar", w.sin_procesar);
    h += '</div><p class="mu" style="font-size:12.5px;margin:0 0 20px">Una firma inválida es o alguien golpeando el endpoint, o que volvió el bug del <code>timestamp</code>. «Sin procesar» con firma buena es un aporte que se quedó a medias.</p>';

    /* 3b · Correo. La alarma va primero por la misma razón que la de Wompi: si
       nada salió, el sitio lleva prometiendo acuses que nadie recibió. */
    var co = d.correo || {};
    h += '<h3 style="font-size:15px;margin:0 0 8px">Correo que sale del sitio</h3>';
    if (co.nada_salio){
      h += '<p style="border-left:3px solid #A84D00;padding:10px 14px;margin:0 0 12px;font-size:14px">' +
        '<strong>Ningún correo ha salido de verdad.</strong> Hay ' + esc(String(co.total)) +
        ' anotados y ' + esc(String(co.simulados)) + ' quedaron en «simulado», que es lo que hace el sistema ' +
        'cuando falta la llave de Resend: se registra y no se envía. Quien donó, se ofreció o aplicó ' +
        'no recibió nada.</p>';
    }
    h += '<div class="eco-row" style="justify-content:flex-start;margin-bottom:6px">';
    h += pasoEmbudo("enviados", co.enviados, co.ultimo ? "último " + String(co.ultimo).slice(0,16) : "nunca");
    h += pasoEmbudo("fallaron", co.fallidos, co.fallidos ? "revisar" : "");
    h += pasoEmbudo("sin enviar (simulados)", co.simulados);
    h += '</div><p class="mu" style="font-size:12.5px;margin:0 0 20px">El correo nunca tumba un cobro: si Resend falla, el aporte queda igual y el fallo se anota aquí. Por eso hay que mirarlo — nadie se va a quejar de un acuse que no sabe que existía.</p>';

    /* 4 · Lo que espera a una persona. */
    h += '<h3 style="font-size:15px;margin:0 0 8px">Esperando a una persona</h3>';
    var cola = d.cola || [];
    var pend = cola.filter(function(c){ return c.n > 0; });
    if (!pend.length){
      h += '<p class="mu" style="font-size:13.5px;margin:0 0 20px">Nada pendiente: ninguna de las cuatro colas tiene algo esperando.</p>';
    } else {
      h += '<div class="med-tw"><table class="med-tbl"><thead><tr><th scope="col">Qué</th><th scope="col">Cuántos</th><th scope="col">El más viejo</th><th scope="col">Dónde se resuelve</th></tr></thead><tbody>';
      h += pend.map(function(c){
        var viejo = antiguedad(c.dias);
        var urgente = c.dias !== null && c.dias >= 3;
        return "<tr><td><strong>" + esc(COLA_ES[c.clave] || c.clave) + "</strong></td>" +
          "<td>" + c.n + "</td>" +
          "<td>" + (urgente ? '<strong style="color:#A84D00">' + esc(viejo) + "</strong>" : esc(viejo)) + "</td>" +
          "<td><small>" + esc(c.arreglo) + "</small></td></tr>";
      }).join("");
      h += '</tbody></table></div>';
      h += '<p class="mu" style="font-size:12.5px;margin:6px 0 20px">En ámbar, lo que lleva tres días o más. A la gente de estas colas se le prometió por correo que alguien le escribía.</p>';
    }

    /* 5 · Intenciones abandonadas. */
    var ab = d.abandonadas || {};
    h += '<h3 style="font-size:15px;margin:0 0 8px">Intenciones abandonadas</h3>';
    h += '<p class="mu" style="font-size:13.5px;margin:0">' +
      (ab.n
        ? "<strong>" + ab.n + "</strong> llevan más de 48 horas sin pagarse y sin transacción de Wompi (" + pesos(ab.centavos) + "). No se borran solas: cada una quemó un número de guía, y quien abrió el checkout puede volver a pagar. Borrarlas es una decisión, no una limpieza."
        : "Ninguna: todo lo que se abrió a pagar o se pagó o es reciente.") + '</p>';

    h += '<p class="mu" style="font-size:12px;margin:20px 0 0">Corte: ' + esc(String(d.corte || "").replace("T"," ").slice(0,16)) + ' UTC. Nada de esta sección es público.</p>';
    box.innerHTML = h;
  }).catch(function(){
    var box = document.getElementById("salud");
    if (box) box.innerHTML = '<p class="mu">No se pudo leer la salud del ecosistema.</p>';
  });
}

/* ---------------- quién quiere entrar ---------------- */
var TIPO_ES = { voluntario:"Voluntario", fundacion:"Fundación", empresa:"Empresa", ingeniero:"Ingeniero" };
var POB_ES = { ninos:"niños", adolescentes:"adolescentes", jovenes:"jóvenes",
  madres:"madres cabeza de familia", mayores:"adultos mayores", familias:"familias",
  migrante:"migrantes", discapacidad:"personas con discapacidad", otra:"otra" };
var MOD_ES = { modDonacion:"Donación", modRse:"RSE", modGratitud:"Gratitud",
  modServicios:"Servicios", modVoluntariado:"Voluntariado", modDifusion:"Difusión" };
var NIVEL_ES = { hub:"terreno con el HUB", estructura:"estructura", mixto:"mixto" };
var ESP_ING = { estructural:"Ing. estructural", civil:"Ing. civil", geotecnia:"Geotecnia",
  arquitectura:"Arquitectura", otra:"Otra especialidad" };

/* Lo que se resume en la columna del medio es DISTINTO por tipo, y a propósito:
   de un voluntario lo primero es si pisa territorio (dispara dos protocolos); de
   una fundación, a cuántos llega y cómo lleva la cuenta (decide si su cifra se
   publica exacta o con «≈»); de una empresa, qué modalidad pidió. */
function resumenInscripcion(tipo, x){
  if (tipo === "voluntario"){
    var p = [esc(x.oficio || "?") + " · " + esc(NIVEL_ES[x.nivel] || x.nivel || "?")];
    if (x.protocolo_cuidado) p.push("<strong>protocolo de cuidado</strong>");
    if (x.protocolo_imagen) p.push("<strong>protocolo de imagen</strong>");
    if (x.origen) p.push('<strong style="color:#A84D00">' + esc(x.origen) + "</strong>");
    return p.join(" · ");
  }
  if (tipo === "ingeniero"){
    /* La matrícula va primero y en grande porque es lo ÚNICO que hay que ir a
       verificar antes de aprobar. Y se dice que está sin verificar hasta que
       alguien la busque en el COPNIA: un dato declarado no es un hecho. */
    var g = ['<strong>Matrícula ' + esc(x.matricula || "?") + '</strong>'];
    g.push(esc(ESP_ING[x.especialidad] || x.especialidad || "?")
      + (x.especialidad_otra ? " · " + esc(x.especialidad_otra) : ""));
    var men = [];
    if (x.experiencia) men.push(esc(x.experiencia) + " de experiencia");
    if (x.disponibilidad) men.push(esc(x.disponibilidad));
    if (!x.matricula_verificada) men.push('<strong style="color:#A84D00">verificar en COPNIA</strong>');
    return g.join("<br>") + (men.length ? "<br><small>" + men.join(" · ") + "</small>" : "");
  }
  if (tipo === "fundacion"){
    var menor = ["cuenta: " + esc(x.conteo || "no dice")];
    if (x.programa) menor.push("programa: " + esc(x.programa));
    return esc(x.atiende || "?") + " — " +
      (x.poblacion || []).map(function(k){ return esc(POB_ES[k] || k); }).join(", ") +
      "<br><small>" + menor.join(" · ") + "</small>";
  }
  var m = (x.modalidades || []).map(function(k){ return esc(MOD_ES[k] || k); }).join(", ");
  var extra = [];
  if (x.sector) extra.push(esc(x.sector));
  if (x.aporta) extra.push(esc(x.aporta));
  return m + (extra.length ? "<br><small>" + extra.join(" · ") + "</small>" : "");
}

function cargarInscripciones(){
  fetch("/api/admin/inscripciones").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("i-filas"); if (!tb) return;
    var l = d.inscripciones || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="7">Todavía no ha aplicado nadie.</td></tr>'; return; }
    tb.innerHTML = l.map(function(i){
      var x = {}; try { x = JSON.parse(i.datos||"{}"); } catch(e){}
      var siguiente = i.estado === "nueva" ? ["en_revision","En revisión"]
                    : i.estado === "en_revision" ? ["aceptada","Seguimos"]
                    : i.estado === "aceptada" ? ["archivada","Archivar"] : null;
      /* La web la escribe quien aplica, así que solo se vuelve enlace si es
         http(s). Una URL con esquema javascript: escapada sigue ejecutándose al
         hacer clic, y este panel lo abre una persona con sesión de Access. */
      var enlaces = [];
      if (/^https?:\\/\\//i.test(x.web || "")) {
        enlaces.push('<a href="' + esc(x.web) + '" target="_blank" rel="noopener">web</a>');
      } else if (x.web) { enlaces.push(esc(x.web)); }
      if (x.instagram) enlaces.push(esc(x.instagram));
      return "<tr>" +
        "<td>" + esc(TIPO_ES[i.tipo] || i.tipo) + "</td>" +
        "<td><strong>" + esc(i.nombre||"") + "</strong>" +
          (x.lider ? "<br><small>" + esc(x.lider) + (x.cargo ? " · " + esc(x.cargo) : "") + "</small>" : "") +
          (x.contacto ? "<br><small>" + esc(x.contacto) + "</small>" : "") + "</td>" +
        "<td>" + resumenInscripcion(i.tipo, x) + "</td>" +
        "<td>" + esc(i.email||"") + (i.telefono ? "<br><small>" + esc(i.telefono) + "</small>" : "") +
          (i.ciudad ? "<br><small>" + esc(i.ciudad) + "</small>" : "") +
          (enlaces.length ? "<br><small>" + enlaces.join(" · ") + "</small>" : "") + "</td>" +
        "<td>" + esc((i.creada_en||"").slice(0,10)) + "</td>" +
        "<td>" + esc(i.estado) + (i.tipo === "ingeniero" ? "<br>" + selloMatricula(x) : "") + "</td>" +
        "<td>" + (siguiente ? '<button class="copy" data-ins="' + i.id + '" data-e="' + siguiente[0] + '">' + siguiente[1] + '</button>' : "—") +
          (i.tipo === "ingeniero" ? accionesMatricula(i, x) : "") + "</td>" +
      "</tr>";
    }).join("");
  });
}

/* ---------------- ofrecimientos en especie ---------------- */
var CAT_ES = { agua:"Agua segura", alimento:"Comida sin cocina", higiene:"Higiene y dignidad",
  panales:"Pañales", descanso:"Descanso", energia:"Luz y carga", brigada:"Equipo de brigada", otra:"Otra" };

function cargarCasos(){
  fetch("/api/admin/casos").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("cs-filas"); if (!tb) return;
    var l = d.casos || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="7">Todavía no hay casos.</td></tr>'; return; }
    var ET = { urgente:"Visita urgente", programada:"Visita programada",
               no_requiere:"No requiere visita", inevaluable:"No se pudo evaluar" };
    var EST = { recibido:"Recibido", en_revision:"En revisión", clasificado:"Clasificado",
                visitado:"Visitado", cerrado:"Cerrado", descartado:"Descartado" };
    tb.innerHTML = l.map(function(c){
      var pr = c.clasificacion
        ? '<strong>' + esc(ET[c.clasificacion] || c.clasificacion) + '</strong>'
          + (c.ing ? '<br><small>por ' + esc(c.ing) + '</small>' : '')
        : '<small>sin evaluar</small>';
      /* Dos ingenieros no coinciden. Se muestra la MÁS GRAVE, que es lo
         prudente, pero eso no resuelve nada: alguien tiene que leer las dos
         notas antes de mover una brigada por esta casa. */
      if (c.discrepa) pr += '<br><small style="color:#A84D00"><strong>en discrepancia</strong></small>';
      var casa = esc(c.material || "?") + " · " + (c.pisos || "?") + " piso(s) · " + c.medios + " foto(s)"
        + (c.danio_previo ? '<br><small>tenía grietas antes</small>' : '')
        + (c.heridos ? '<br><small>hubo heridos</small>' : '')
        + (c.habitada ? '' : '<br><small>desocupada</small>');
      /* El motivo del cierre vive en el registro de auditoría; aquí se muestra
         sin el prefijo técnico, que ya lo dice la columna de estado. */
      var mov = "";
      if (c.ultimo){
        var i = String(c.ultimo).indexOf(" · ");
        if (i > -1) mov = '<br><small>' + esc(String(c.ultimo).slice(i + 3, i + 83)) + '</small>';
      }
      var fin = c.estado === "cerrado" || c.estado === "descartado";
      var acc = '<button class="copy" data-abrir="' + esc(c.numero) + '">Abrir</button> ' + (fin
        ? '<button class="copy" data-caso="' + esc(c.numero) + '" data-ce="en_revision">Reabrir</button>'
        : (c.estado === "visitado" ? "" :
            '<button class="copy" data-caso="' + esc(c.numero) + '" data-ce="visitado">Visitada</button> ') +
          '<button class="copy" data-caso="' + esc(c.numero) + '" data-ce="cerrado">Cerrar…</button> ' +
          '<button class="copy" data-caso="' + esc(c.numero) + '" data-ce="descartado">Descartar…</button>');
      return "<tr" + (fin ? ' style="opacity:.55"' : "") + ">" +
        "<td><strong>" + esc(c.numero) + "</strong><br><small>" + esc((c.creado_en||"").slice(0,10)) + "</small>" +
          (c.dup ? '<br><small style="color:#A84D00"><strong>mismo teléfono que ' + esc(c.dup) + "</strong></small>" : "") + "</td>" +
        "<td>" + pr + "</td>" +
        "<td>" + esc(c.sector) + (c.direccion_ref ? "<br><small>" + esc(c.direccion_ref) + "</small>" : "") + "</td>" +
        "<td>" + esc(c.contacto_nombre) + "<br><small>" + esc(c.contacto_tel) +
          (c.contacto_email ? " · " + esc(c.contacto_email) : "") + "</small></td>" +
        "<td>" + casa + "</td>" +
        "<td>" + esc(EST[c.estado] || c.estado) + (c.consent_publico ? '<br><small>autoriza publicar</small>' : "") +
          (c.reco ? '<br><small>' + esc(c.reco.slice(0,60)) + '</small>' : "") + mov + "</td>" +
        "<td>" + acc + "</td>" +
        "</tr>";
    }).join("");
  });
}
/* ---------------- ficha de un caso: corregirlo y curar sus fotos ----------------
   No se llama cargarAlgo a propósito: no es una bandeja que se pida al
   arrancar, sino una ficha que se abre sobre una fila. */
var MAT_ES = { ladrillo:"Ladrillo o bloque", adobe:"Adobe o tapia", bahareque:"Bahareque",
  prefabricado:"Prefabricado", madera:"Madera", no_se:"No sé" };
var CAT_MED = { conjunto:"Conjunto", estructura:"Estructura", dano:"El daño", entorno:"Entorno" };
var CASO_ABIERTO = null;

function casilla(id, etiqueta, marcada){
  return '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:13px">' +
    '<input type="checkbox" id="' + id + '"' + (marcada ? " checked" : "") + '> ' + esc(etiqueta) + '</label>';
}

function abrirCaso(numero){
  var caja = document.getElementById("cs-dlg");
  caja.style.display = "block";
  caja.innerHTML = '<p class="mu">Abriendo ' + esc(numero) + '…</p>';
  fetch("/api/admin/caso/" + encodeURIComponent(numero)).then(function(r){ return r.json(); }).then(function(d){
    if (d.error){ caja.innerHTML = '<p class="mu">No se pudo abrir: ' + esc(d.error) + "</p>"; return; }
    CASO_ABIERTO = numero;
    var c = d.caso || {};

    var mat = '<label style="display:block;margin-bottom:10px;font-size:13px;font-weight:600">Muros' +
      '<select id="f-material" style="display:block;width:100%;margin-top:4px;padding:9px 11px;border:1px solid var(--bd);border-radius:10px;font:inherit;font-weight:400;background:var(--surface);color:var(--ink)">';
    ["ladrillo","adobe","bahareque","prefabricado","madera","no_se"].forEach(function(k){
      mat += '<option value="' + k + '"' + (c.material === k ? " selected" : "") + ">" + esc(MAT_ES[k]) + "</option>";
    });
    mat += "</select></label>";

    /* Las fotos se sirven por el endpoint del triaje, que acepta la audiencia
       del panel: no hace falta una ruta de medios propia para el equipo. */
    var fotos = (d.medios || []).map(function(m){
      var src = "/api/triage/medio/" + m.id;
      var cuerpo = m.clase === "video"
        ? '<div style="height:120px;display:flex;align-items:center;justify-content:center;background:var(--surface-2,var(--surface));border-radius:8px">vídeo</div>'
        : '<a href="' + src + '" target="_blank" rel="noopener"><img src="' + src + '" alt="" ' +
          'style="width:100%;height:120px;object-fit:cover;border-radius:8px;display:block"></a>';
      return '<div style="width:160px">' + cuerpo +
        '<small style="display:block;margin:6px 0 4px">' + esc(CAT_MED[m.categoria] || m.categoria || "sin categoría") + "</small>" +
        '<button class="copy" data-medio="' + m.id + '">Quitar…</button></div>';
    }).join("");
    if (!fotos) fotos = '<p class="mu" style="font-size:13px">Este caso no tiene fotos. Un ingeniero no va a poder evaluarlo.</p>';

    var evals = (d.evaluaciones || []).map(function(e){
      return '<li style="margin-bottom:10px"><strong>' + esc(e.clasificacion) + "</strong> · " +
        esc(e.ing_nombre) + " (mat. " + esc(e.ing_matricula) + ") · " + esc((e.creado_en||"").slice(0,10)) +
        "<br><small>" + esc(e.nota_tecnica || "") + "</small>" +
        (e.falta ? "<br><small><strong>Falta:</strong> " + esc(e.falta) + "</small>" : "") + "</li>";
    }).join("");

    var hist = (d.historial || []).map(function(h){
      return "<li><small>" + esc((h.otorgado_en||"").slice(0,16)) + " · " + esc(h.sujeto) + " — " +
        esc(String(h.detalle).replace("caso " + numero + " ", "")) + "</small></li>";
    }).join("");

    caja.innerHTML =
      '<div class="card" style="max-width:760px;text-align:left">' +
        '<h3 style="margin-bottom:4px">' + esc(numero) + "</h3>" +
        '<p class="mu" style="font-size:13px;margin-bottom:16px">Corrige lo que la familia escribió mal — un teléfono ' +
        'con un dígito de menos o una dirección a medias es la diferencia entre encontrar la casa y no encontrarla. ' +
        '<strong>Los cambios quedan en el historial</strong> con tu correo, y se guarda qué campos tocaste, nunca los valores.</p>' +
        campo("f-sector", "Sector (lo único publicable)", c.sector) +
        campo("f-direccion_ref", "Dirección exacta (nunca se publica)", c.direccion_ref) +
        campo("f-contacto_nombre", "Nombre", c.contacto_nombre) +
        campo("f-contacto_tel", "Teléfono", c.contacto_tel) +
        campo("f-contacto_email", "Correo (opcional)", c.contacto_email) +
        mat +
        campo("f-pisos", "Pisos", c.pisos) +
        campo("f-anio_aprox", "Año aproximado", c.anio_aprox) +
        casilla("f-danio_previo", "Tenía grietas antes del sismo", c.danio_previo) +
        casilla("f-habitada", "Vive alguien ahí", c.habitada) +
        casilla("f-heridos", "Hubo heridos", c.heridos) +
        casilla("f-filtra_agua", "Le entra agua", c.filtra_agua) +
        campo("f-nota", "Lo que contó la familia", c.nota) +
        /* Solo aparece si está concedido, y solo se puede quitar. Marcarlo
           desde aquí sería fabricar un consentimiento que la familia no dio. */
        (c.consent_publico
          ? '<div style="border-left:3px solid #A84D00;padding-left:12px;margin:12px 0">' +
            '<p style="font-size:13px;margin-bottom:8px"><strong>La familia autorizó que su caso aparezca en público</strong> ' +
            '(sin nombre ni dirección). Desde aquí solo se puede RETIRAR: concederlo tiene que decirlo ella.</p>' +
            casilla("f-revocar", "Retirar esa autorización", false) + "</div>"
          : '<p class="mu" style="font-size:13px;margin:12px 0">La familia NO autorizó que su caso aparezca en público. ' +
            'Eso no se puede conceder desde el panel.</p>') +
        campo("f-motivo", "Motivo del cambio (opcional, queda en el historial)", "") +
        /* El enlace de la familia. Si lo perdió, este es el único sitio desde
           donde se le puede devolver: el número de caso solo no abre nada. */
        '<p class="mu" style="font-size:13px;margin:12px 0 4px"><strong>Enlace de la familia</strong> — ' +
        'si lo perdió, es lo único que se lo devuelve. Mándaselo por WhatsApp; no lo publiques.</p>' +
        '<p style="font-size:12px;word-break:break-all;margin-bottom:14px">' +
        esc(d.enlace || "") + "</p>" +
        '<p id="f-error" class="mu" style="color:#c0392b;font-size:13px;display:none"></p>' +
        '<div style="display:flex;gap:10px;margin:8px 0 22px">' +
          '<button class="btn btn-g" id="f-ok" data-guardar="' + esc(numero) + '">Guardar</button>' +
          '<button class="btn btn-w" id="f-no">Cerrar</button>' +
        "</div>" +

        '<h4 style="margin-bottom:4px">Fotos</h4>' +
        '<p class="mu" style="font-size:13px;margin-bottom:12px">Quitar una foto la borra <strong>de verdad</strong>, ' +
        'también del almacenamiento. Es lo que cumple la promesa de que el caso no sale con personas dentro — ' +
        'y por eso pide motivo y no se puede deshacer.</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:22px">' + fotos + "</div>" +

        (evals ? '<h4 style="margin-bottom:8px">Evaluaciones</h4><ul style="margin:0 0 22px 16px">' + evals + "</ul>" : "") +
        (hist ? '<h4 style="margin-bottom:8px">Historial</h4><ul style="margin:0 0 4px 16px">' + hist + "</ul>" : "") +
      "</div>";
  });
}

function cerrarCaso(){
  var caja = document.getElementById("cs-dlg");
  caja.style.display = "none"; caja.innerHTML = ""; CASO_ABIERTO = null;
}

function guardarCaso(numero){
  var v = function(id){ var e = document.getElementById(id); return e ? e.value.trim() : ""; };
  var k = function(id){ var e = document.getElementById(id); return e ? e.checked : false; };
  var err = document.getElementById("f-error");
  var cuerpo = {
    sector: v("f-sector"), direccion_ref: v("f-direccion_ref"),
    contacto_nombre: v("f-contacto_nombre"), contacto_tel: v("f-contacto_tel"),
    contacto_email: v("f-contacto_email"),
    material: v("f-material"), pisos: v("f-pisos"), anio_aprox: v("f-anio_aprox"),
    danio_previo: k("f-danio_previo"), habitada: k("f-habitada"),
    heridos: k("f-heridos"), filtra_agua: k("f-filtra_agua"),
    nota: v("f-nota"), motivo: v("f-motivo")
  };
  /* Solo se manda el campo cuando se pide retirarlo: si fuera siempre, un
     guardado normal borraría el consentimiento sin que nadie lo pidiera. */
  if (k("f-revocar")) cuerpo.consent_publico = false;

  var btn = document.getElementById("f-ok");
  btn.disabled = true; btn.textContent = "Guardando…";
  fetch("/api/admin/caso/" + encodeURIComponent(numero) + "/corregir", {
    method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify(cuerpo)
  }).then(function(r){ return r.json(); }).then(function(d){
    btn.disabled = false; btn.textContent = "Guardar";
    if (d.error){
      err.style.display = "block";
      err.textContent = d.error === "sin_cambios" ? "No cambiaste nada." :
        (d.error + (d.campo ? " (" + d.campo + ")" : ""));
      return;
    }
    cargarCasos(); abrirCaso(numero);
  }).catch(function(){
    btn.disabled = false; btn.textContent = "Guardar";
    err.style.display = "block"; err.textContent = "No se pudo guardar.";
  });
}

/* ---------------- matrícula del COPNIA ----------------
   La consulta pública del COPNIA es un POST con token anti-CSRF de ASP.NET, así
   que NO se puede prellenar con un enlace — lo comprobé en su formulario el 20
   de agosto de 2026. Falsificar ese token contra un servicio del Estado no se
   hace. Así que lo que se automatiza es todo lo demás: el enlace exacto, la
   matrícula en un clic al portapapeles, y el nombre del campo donde va pegada,
   para que verificar sea cosa de treinta segundos y lo pueda hacer CUALQUIERA
   con acceso al panel, no solo el dueño de la cuenta. */
var COPNIA_URL = "https://tramites.copnia.gov.co/Copnia_Microsite/CertificateOfGoodStanding/CertificateOfGoodStandingStart";

function selloMatricula(x){
  if (!x.matricula) return '<small style="color:var(--err)">sin matrícula</small>';
  if (x.matricula_verificada === 1 || x.matricula_verificada === true) {
    return '<small style="color:var(--g)"><strong>matrícula verificada</strong>'
         + (x.matricula_verificada_en ? "<br>" + esc(String(x.matricula_verificada_en).slice(0,10)) : "")
         + (x.matricula_verificada_por ? "<br>" + esc(x.matricula_verificada_por) : "")
         + "</small>";
  }
  return '<small style="color:var(--amber)"><strong>sin verificar</strong><br>su concepto no sale solo</small>';
}

function accionesMatricula(i, x){
  if (!x.matricula) return "";
  var ver = (x.matricula_verificada === 1 || x.matricula_verificada === true);
  return '<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:flex-start">'
       + '<a href="' + COPNIA_URL + '" target="_blank" rel="noopener">Consultar en el COPNIA</a>'
       + '<button class="copy" data-mat="' + esc(x.matricula) + '">Copiar matrícula ' + esc(x.matricula) + '</button>'
       + '<small class="mu">Pégala en «Número de Matrícula»</small>'
       + '<button class="copy" data-mver="' + i.id + '" data-v="' + (ver ? "0" : "1") + '">'
       + (ver ? "Quitar verificación" : "Marcar verificada") + '</button>'
       + '</div>';
}

function cargarOfrecimientos(){
  fetch("/api/admin/ofrecimientos").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("o-filas"); if (!tb) return;
    var l = d.ofrecimientos || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="7">Todavía no hay ofrecimientos.</td></tr>'; return; }
    tb.innerHTML = l.map(function(o){
      var x = {}; try { x = JSON.parse(o.datos||"{}"); } catch(e){}
      var siguiente = o.estado === "nueva" ? ["en_revision","Contactado"]
                    : o.estado === "en_revision" ? ["aceptada","Recibido"]
                    : o.estado === "aceptada" ? ["archivada","Archivar"] : null;
      return "<tr>" +
        "<td><strong>" + esc(CAT_ES[x.categoria] || x.categoria || "?") + "</strong><br><small>" + esc(x.detalle||"") + "</small></td>" +
        "<td>" + esc(x.cantidad || "—") + "</td>" +
        "<td>" + esc(x.disponible || "—") + "</td>" +
        "<td>" + esc(o.nombre||"") + "<br><small>" + esc(o.email||"") + (o.telefono ? " · " + esc(o.telefono) : "") +
          (x.quien === "empresa" ? " · empresa" : "") + "</small></td>" +
        "<td>" + esc(o.ciudad || "—") + "</td>" +
        "<td>" + esc(o.estado) + "</td>" +
        "<td>" + (siguiente ? '<button class="copy" data-ins="' + o.id + '" data-e="' + siguiente[0] + '">' + siguiente[1] + '</button>' : "—") + "</td>" +
      "</tr>";
    }).join("");
  });
}

document.addEventListener("click", function(e){
  /* Mover un caso de vivienda. Cerrar y descartar PIDEN motivo: un caso que se
     va de la lista sin decir por qué es indistinguible de uno perdido, y del
     otro lado hay una familia que mandó fotos de su casa. El servidor lo exige
     igual — esto solo evita el viaje. */
  var ab = e.target.closest("[data-abrir]");
  if (ab){ abrirCaso(ab.getAttribute("data-abrir")); return; }
  if (e.target.id === "f-no"){ cerrarCaso(); return; }
  var gu = e.target.closest("[data-guardar]");
  if (gu){ guardarCaso(gu.getAttribute("data-guardar")); return; }

  /* Borrar una foto es lo único de este panel que NO se puede deshacer: el
     objeto se va del bucket. Por eso pide motivo y lo dice antes. */
  var bm = e.target.closest("[data-medio]");
  if (bm && CASO_ABIERTO){
    var razon = window.prompt("Quitar esta foto de " + CASO_ABIERTO +
      ".\\n\\nSe borra de verdad, también del almacenamiento, y no se puede deshacer." +
      "\\n\\n¿Por qué se quita? (por ejemplo: salen personas)");
    if (!razon) return;
    bm.disabled = true; bm.textContent = "…";
    fetch("/api/admin/caso/" + encodeURIComponent(CASO_ABIERTO) + "/medio/" +
          encodeURIComponent(bm.getAttribute("data-medio")) + "/borrar", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ motivo: razon })
    }).then(function(r){ return r.json(); }).then(function(d){
      if (d && d.error) window.alert("No se quitó: " + d.error + (d.ayuda ? "\\n\\n" + d.ayuda : ""));
      abrirCaso(CASO_ABIERTO); cargarCasos();
    }).catch(function(){ abrirCaso(CASO_ABIERTO); });
    return;
  }

  var cs = e.target.closest("[data-caso]");
  if (cs){
    var num = cs.getAttribute("data-caso");
    var dest = cs.getAttribute("data-ce");
    var motivo = "";
    if (dest === "cerrado" || dest === "descartado"){
      /* \\n y no \n: esto vive dentro del template literal de adminJS(). */
      motivo = window.prompt((dest === "cerrado" ? "Cerrar " : "Descartar ") + num +
        ".\\n\\n¿Qué pasó con el caso? Queda en el registro y es lo que va a leer quien pregunte mañana:");
      if (!motivo) return;
    }
    cs.disabled = true; cs.textContent = "…";
    fetch("/api/admin/caso/" + encodeURIComponent(num) + "/estado", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ estado: dest, motivo: motivo })
    }).then(function(r){ return r.json(); }).then(function(d){
      if (d && d.error) window.alert("No se movió: " + d.error + (d.ayuda ? "\\n\\n" + d.ayuda : ""));
      cargarCasos();
    }).catch(function(){ cargarCasos(); });
    return;
  }
  /* Copiar la matrícula: es el paso que evita teclear mal un número de siete
     cifras en el formulario del COPNIA y verificar a la persona equivocada. */
  var cm = e.target.closest("[data-mat]");
  if (cm) {
    var m = cm.getAttribute("data-mat");
    navigator.clipboard.writeText(m).then(function(){
      cm.textContent = "Copiada: " + m;
    }).catch(function(){
      cm.textContent = m + " (cópiala a mano)";
    });
    return;
  }

  var mv = e.target.closest("[data-mver]");
  if (mv) {
    var quiere = mv.getAttribute("data-v") === "1";
    if (quiere && !confirm("¿Viste su matrícula vigente en el registro del COPNIA? Con esto sus conceptos empiezan a salir solos a las familias.")) return;
    mv.disabled = true;
    fetch("/api/admin/inscripcion/" + encodeURIComponent(mv.getAttribute("data-mver")) + "/matricula", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ verificada: quiere })
    }).then(function(r){ return r.json(); }).then(function(){
      cargarInscripciones(); cargarSalud();
    }).catch(function(){ mv.disabled = false; mv.textContent = "No se pudo"; });
    return;
  }

  var b = e.target.closest("[data-ins]");
  if (!b) return;
  b.disabled = true; b.textContent = "…";
  fetch("/api/admin/inscripcion/" + encodeURIComponent(b.getAttribute("data-ins")) + "/estado", {
    method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ estado: b.getAttribute("data-e") })
  }).then(function(r){ return r.json(); }).then(function(){ cargarOfrecimientos();
cargarInscripciones(); cargarReportadas(); cargar(); })
    .catch(function(){ cargarOfrecimientos(); cargarInscripciones(); });
});

/* ---------------- pagos sin aporte ---------------- */
function cargarSueltos(){
  fetch("/api/admin/pagos-sueltos").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("p-filas"); if (!tb) return;
    var l = d.pagos || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="5">Ninguno: todo lo cobrado tiene su aporte.</td></tr>'; return; }
    tb.innerHTML = l.map(function(p){
      return "<tr>" +
        "<td>" + esc(p.referencia || p.transaction_id) + "</td>" +
        "<td>" + (p.monto_centavos ? pesos(p.monto_centavos) : "—") + "</td>" +
        "<td>" + esc(p.metodo || "—") + "</td>" +
        "<td>" + esc(p.nombre || "—") + (p.correo ? "<br><small>" + esc(p.correo) + "</small>" : "") + "</td>" +
        "<td>" + esc((p.recibido_en||"").slice(0,16)) + "</td>" +
      "</tr>";
    }).join("");
  });
}

/* ---------------- entregas ---------------- */
var E_CAMPOS = [
  ["e-destino","Destino","brigada-emergencia-2026-08"],
  ["e-sector","Sector (ciudad)",""],
  ["e-fecha","Fecha del acta (AAAA-MM-DD)",""],
  ["e-lugar","Lugar (albergue o punto)",""],
  ["e-aliada","Fundación aliada del territorio",""],
  ["e-familias","Familias que recibieron",""],
  ["e-recibido","Recibido por (ROL y entidad, no una persona atendida)",""],
  ["e-resumen","Qué se entregó, por categorías",""]
];
function pintarCampos(){
  var c = document.getElementById("e-campos"); if (!c) return;
  c.innerHTML = E_CAMPOS.map(function(f){ return campo(f[0], f[1], f[2]); }).join("");
}

function pintarEntregas(l){
  var tb = document.getElementById("e-filas"); if (!tb) return;
  if (!l.length){ tb.innerHTML = '<tr><td colspan="8">Todavía no hay entregas registradas.</td></tr>'; return; }
  tb.innerHTML = l.map(function(e){
    var nf = 0; try { nf = JSON.parse(e.fotos||"[]").length; } catch(x){}
    var pub = !!e.publicada_en;
    var nula = !!e.anulada_en;
    /* Una acta anulada se queda a la vista, en gris y con su motivo: el número
       sigue gastado y el panel tiene que poder explicar por qué. Lo único que
       pierde son los botones — no se publica ni se le suben fotos. */
    /* Una etiqueta data-label en cada celda: en pantalla angosta la cabecera se esconde y
       cada dato lleva su etiqueta delante. Sin esto, apilar la tabla dejaría
       ocho valores sueltos sin decir qué es cada uno. */
    return '<tr' + (nula ? ' style="opacity:.55"' : '') + ">" +
      '<td data-label="Acta">' + esc(e.numero) + "</td>" +
      '<td data-label="Fecha">' + esc(e.fecha) + "</td>" +
      '<td data-label="Sector">' + esc(e.sector) + "</td>" +
      '<td data-label="Aliada">' + esc(e.aliada || "—") + "</td>" +
      '<td data-label="Familias">' + (e.familias == null ? "—" : e.familias) + "</td>" +
      '<td data-label="Fotos">' + nf + (nula ? "" : ' <label class="copy toca" style="cursor:pointer">+ foto' +
        '<input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" data-foto="' + esc(e.numero) + '"></label>') + "</td>" +
      '<td data-label="Estado">' + (nula
        ? "anulada<br><small>" + esc(e.anulada_motivo || "") + "</small>"
        : (pub ? "publicada" : '<strong style="color:#A84D00">borrador</strong>')) + "</td>" +
      '<td data-label="Acción">' + (nula ? "—" :
        '<button class="copy toca" data-pub="' + esc(e.numero) + '" data-v="' + (pub ? "0" : "1") + '">' +
        (pub ? "Despublicar" : "Publicar") + "</button>" +
        ' <button class="copy toca" data-anu="' + esc(e.numero) + '">Anular</button>') + "</td>" +
    "</tr>";
  }).join("");
}

function cargarEntregas(){
  fetch("/api/admin/entregas").then(function(r){ return r.json(); })
    .then(function(d){ pintarEntregas(d.entregas || []); });
}

document.addEventListener("change", function(e){
  var inp = e.target.closest("[data-foto]");
  if (!inp || !inp.files || !inp.files[0]) return;
  var f = inp.files[0];
  /* El cuerpo va crudo con su content-type: sin multipart no hay que parsear
     nada en el Worker, y el nombre del archivo lo pone el servidor. */
  fetch("/api/admin/entrega/" + encodeURIComponent(inp.getAttribute("data-foto")) + "/foto?alt=" +
        encodeURIComponent(f.name.replace(/\.[a-z0-9]+$/i,"")), {
    method: "POST", headers: {"content-type": f.type}, body: f
  }).then(function(r){ return r.json(); })
    .then(function(d){ if (d.error) alert("No se pudo subir: " + d.error); cargarEntregas(); })
    .catch(function(){ alert("No se pudo subir la foto."); });
});

document.addEventListener("click", function(e){
  if (e.target.id === "e-crear"){
    var b = e.target, err = document.getElementById("e-error");
    err.style.display = "none"; b.disabled = true; b.textContent = "Registrando…";
    function v(id){ var el = document.getElementById(id); return el ? el.value : ""; }
    fetch("/api/admin/entrega", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({
        destino_id: v("e-destino"), sector: v("e-sector"), fecha: v("e-fecha"),
        lugar: v("e-lugar"), aliada: v("e-aliada"), familias: v("e-familias"),
        recibido_por: v("e-recibido"), resumen: v("e-resumen")
      })
    }).then(function(r){ return r.json().then(function(d){ return {http:r.status, d:d}; }); })
      .then(function(res){
        b.disabled = false; b.textContent = "Registrar";
        if (res.http !== 200){
          err.textContent = res.d.faltan ? ("Faltan datos: " + res.d.faltan.join(", ") + ".")
                        : (res.d.ayuda || ("No se pudo registrar (" + (res.d.error||res.http) + ")."));
          err.style.display = "block"; return;
        }
        pintarCampos(); cargarEntregas();
      })
      .catch(function(){ b.disabled = false; b.textContent = "Reintentar"; });
    return;
  }
  var pb = e.target.closest("[data-pub]");
  if (pb){
    var quiere = pb.getAttribute("data-v") === "1";
    pb.disabled = true; pb.textContent = "…";
    fetch("/api/admin/entrega/" + encodeURIComponent(pb.getAttribute("data-pub")) + "/publicar", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ publicar: quiere })
    }).then(function(r){ return r.json(); })
      .then(function(d){ if (d.ayuda) alert(d.ayuda); cargarEntregas(); })
      .catch(function(){ cargarEntregas(); });
  }

  /* Anular pide motivo y avisa que no se deshace. Dos frenos y no uno porque el
     botón vive al lado de «Despublicar», que sí es reversible. */
  var an = e.target.closest("[data-anu]");
  if (an){
    var num = an.getAttribute("data-anu");
    var motivo = window.prompt("Anular " + num + " — no se puede deshacer.\\n\\n¿Por qué se anula? (queda escrito y explica el hueco en el consecutivo)");
    if (!motivo) return;
    an.disabled = true; an.textContent = "…";
    fetch("/api/admin/entrega/" + encodeURIComponent(num) + "/anular", {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ motivo: motivo })
    }).then(function(r){ return r.json(); })
      .then(function(d){ if (d.ayuda) alert(d.ayuda); else if (d.error) alert("No se pudo anular: " + d.error);
        cargarEntregas(); cargarSalud(); })
      .catch(function(){ cargarEntregas(); });
  }
});

pintarCampos();
cargarEntregas();
cargarSueltos();
cargarCasos();
cargarOfrecimientos();
cargarInscripciones();
/* Faltaba: la bandeja de transferencias solo se refrescaba DESPUÉS de confirmar
   o descartar una, así que en una carga limpia se quedaba en «Cargando…» para
   siempre. Estuvo tapado mientras el archivo entero no compilaba. */
cargarReportadas();
cargarSalud();

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

/* ========================================================================
   MIRA MI CASA — la misma plataforma, con su propia marca
   ========================================================================
   El triaje de viviendas atiende a familias damnificadas, no a donantes. Que
   llegue con la nav de una fundación —HUB SOCIAL, Membresías, Donar— es pedirle
   a alguien con la casa rota que se ubique en un ecosistema que no le importa.

   CÓMO, Y POR QUÉ ASÍ. No es un sitio nuevo ni una hoja de estilos nueva: es el
   MISMO Worker y el MISMO index.html, marcados con `data-marca="mmc"` cuando el
   Host es el subdominio. A partir de ahí manda el CSS, que redefine los tokens
   que el sistema ya usa — así cada componente escrito (.card, .btn-g, .steps)
   se pinta con la marca nueva sin duplicar una línea.

   LA PROPIEDAD QUE IMPORTA: el sitio principal no puede romperse por esto. No
   porque se haya tenido cuidado, sino por construcción — sin el atributo, que
   solo se inyecta para ese hostname, no aplica ni una regla.

   Se usa HTMLRewriter y no un replace sobre el texto: viene en la plataforma,
   trabaja sobre el flujo sin cargarlo en memoria, y no se equivoca de `<html>`
   si algún día aparece esa cadena dentro del documento. */
const HOST_MMC = /^(miramicasa|mira-mi-casa)\./i;

function marcarMarca(respuesta, host) {
  if (!HOST_MMC.test(host)) return respuesta;
  const tipo = respuesta.headers.get("content-type") || "";
  if (!tipo.includes("text/html")) return respuesta;
  return new HTMLRewriter()
    .on("html", { element(e) { e.setAttribute("data-marca", "mmc"); } })
    /* EL CANONICAL, que es estático en el HTML y apunta al dominio de la
       fundación. Servido tal cual desde el subdominio le dice a Google «la
       versión buena de esta página está allá» — o sea, justo lo contrario de lo
       que la migración quiere: que el triaje se indexe aquí.

       Se reescribe aquí y no en `index.html` porque el archivo es UNO y lo
       comparten las dos marcas. Es el mismo sitio que ya inyecta `data-marca`,
       o sea el mismo recorrido del documento y ningún coste nuevo.

       Al ORIGEN y no a la ruta, igual que en el ápex: es una SPA de hash, así
       que la portada es la canónica de todas. Y así ninguna página de caso
       —cuya URL lleva el token de la familia— puede acabar publicada en un
       `canonical` que un crawler siga. */
    .on('link[rel="canonical"]', { element(e) { e.setAttribute("href", ORIGIN_MMC); } })
    /* Lo mismo para `og:url`: sin esto, un enlace del triaje compartido por
       WhatsApp se previsualiza como el sitio de la fundación. */
    .on('meta[property="og:url"]', { element(e) { e.setAttribute("content", ORIGIN_MMC); } })
    .transform(respuesta);
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
    /* Igual que arriba: se envuelve la respuesta entera en vez de tocar cada
       rama. Fuera del subdominio devuelve exactamente lo que recibió. */
    return marcarMarca(await this.ruteo(request, env, url, ruta), url.hostname);
  },

  async ruteo(request, env, url, ruta) {

    const compartir = ruta.match(/^\/f\/([a-z0-9-]+)\/?$/);
    if (compartir) return rutaCompartir(env, url, compartir[1]);

    /* El carnet. Fuera de /api/ porque es una página que se abre y se muestra,
       no una respuesta que se consume. */
    const car = ruta.match(/^\/carnet\/([a-f0-9]{32})\/?$/i);
    if (car) {
      if (!env.DB) return json({ error: "base_no_configurada" }, 503);
      try { return await rutaCarnet(env, car[1].toLowerCase()); }
      catch (e) { console.error("carnet", e && e.message); return json({ error: "error_interno" }, 500); }
    }

    /* Fotos de las actas y las jornadas. Fuera de /api/ a propósito: son
       imágenes que se enlazan desde el sitio y se comparten, no una API. */
    const evi = ruta.match(/^\/evidencia\/(AE-\d{4}-\d{6})\/([A-Za-z0-9._-]+)$/);
    if (evi) {
      if (!env.DB) return json({ error: "base_no_configurada" }, 503);
      try { return await rutaEvidencia(env, evi[1].toUpperCase(), evi[2]); }
      catch (e) { console.error("evidencia", ruta, e && e.message); return json({ error: "error_interno" }, 500); }
    }

    /* La ruta vieja de la pantalla de terreno sigue viva y redirige. Va ANTES
       del guardián y no dentro: una redirección no necesita sesión, y puesta
       dentro no se alcanzaba nunca —el guardián ya no reconoce `/ruta`, así que
       caía al comodín de la SPA y devolvía la portada pública—. Si alguien
       guardó el enlace en el teléfono, que no se encuentre con eso en mitad de
       una jornada. */
    if (ruta === "/ruta" || ruta === "/ruta.js") {
      return Response.redirect(new URL("/admin" + ruta, url).toString(), 301);
    }

    /* EL TRIAJE VIVE EN MIRA MI CASA. `/caso/<n>?t=` es la página de la familia
       y la única ruta de PATH del triaje, así que es la única que el Worker
       puede mudar — las de hash (`#vivienda`, `#ingenieros`, `#casas`) no las ve
       nunca y las mueve `app.js`.

       Por qué 301 y no borrar la ruta: los enlaces ya repartidos son del ápex,
       incluido el que se le pasó a la ingeniera el 19 por la mañana. Del otro
       lado hay una familia que mandó fotos de su casa rota; que su enlace deje
       de abrir no es una regresión de SEO, es dejarla sin su caso.

       Va ANTES del guardián de Access, igual que el de `/ruta`: una redirección
       no necesita sesión, y metida dentro no se alcanzaría nunca.

       Se preserva la QUERY porque ahí viaja el token, que es lo que abre el
       caso. `new URL(ruta + search)` la conserva; solo con `ruta` se perdería y
       la familia aterrizaría en una página que no puede mostrarle nada.

       No aplica en el subdominio (sería un bucle) ni en `workers.dev`, donde el
       entorno de pruebas sirve las dos marcas y saltar a producción convertiría
       una prueba en una visita al sitio real. */
    if (ruta.startsWith("/caso/") && !HOST_MMC.test(url.hostname) && !/\.workers\.dev$/i.test(url.hostname)) {
      return Response.redirect(ORIGIN_MMC + ruta + url.search, 301);
    }

    /* --- Panel interno: TODO detrás de Access, y fail-closed --- */
    /* `/api/triage/` entra por el MISMO guardián que el panel: hereda la
       verificación real de firma RS256 y el fail-closed. Los ingenieros
       voluntarios se aprueban añadiendo su correo en Cloudflare Access, no
       creando cuentas: cero contraseñas que guardar y cero que se filtren. */
    if (ruta === "/admin" || ruta === "/admin.js" || ruta.startsWith("/admin/") || ruta.startsWith("/api/admin/") || ruta.startsWith("/api/triage/") || ruta === "/triaje" || ruta === "/triaje.js" || ruta === "/triage" || ruta === "/triage.js") {
      if (!env.DB) return json({ error: "base_no_configurada" }, 503);

      /* El sitio responde en el ápex Y en www, sin redirigir entre ellos, pero
         Cloudflare Access limita cuántos hostnames puede cubrir una aplicación
         (se alcanzó el máximo con cuatro entradas). La aplicación quedó sobre el
         ápex, así que una petición al panel por `www` llegaría aquí SIN pasar por
         Access: la salvaría el fail-closed, pero el panel no funcionaría.

         Se resuelve donde no cuesta un slot: el panel canoniza al ápex. No es un
         atajo de seguridad —quien llegue por www sigue sin token y sería
         rechazado igual—, es que el enlace correcto lleve al sitio correcto.

         Solo aplica a las rutas del panel, y nunca cuando el host ya es el ápex,
         para no crear un bucle. */
      if (/^www\./i.test(url.hostname)) {
        const destino = new URL(url.toString());
        destino.hostname = url.hostname.replace(/^www\./i, "");
        return Response.redirect(destino.toString(), 302);
      }

      /* Qué audiencias acepta CADA zona. El panel exige la suya y solo la suya:
         un token de la aplicación del triage no abre donantes ni comprobantes.
         El triage acepta la suya y también la del panel, para que el equipo
         entre a revisar sin necesitar una segunda cuenta. */
      /* `/ruta` NO está aquí a propósito: enseña teléfono y dirección, que es
         justo lo que un ingeniero voluntario no puede ver. Entra solo con la
         audiencia del panel, igual que /admin. */
      const esTriage = ruta === "/triaje" || ruta === "/triaje.js" || ruta === "/triage" || ruta === "/triage.js" || ruta.startsWith("/api/triage/");
      const audsZona = esTriage
        ? [env.ACCESS_AUD_TRIAGE, env.ACCESS_AUD]
        : [env.ACCESS_AUD];
      const sesion = await verificarAccess(request, env, audsZona);
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
        /* --- triage estructural: la cola de los ingenieros --- */
        /* La ruta canónica es en ESPAÑOL: `/triaje`. El sitio entero está en
           español y esa es la palabra correcta — la ruta en inglés era un
           descuido mío, y el primero que la escribió a mano escribió «triaje»
           y aterrizó en la portada pública sin entender por qué. `/triage`
           sobrevive como alias que redirige, para no romper lo ya enlazado. */
        if (ruta === "/triage")    return Response.redirect(new URL("/triaje", url).toString(), 301);
        if (ruta === "/triage.js") return Response.redirect(new URL("/triaje.js", url).toString(), 301);
        if (ruta === "/triaje") {
          return new Response(paginaTriage(), {
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" }
          });
        }
        if (ruta === "/triaje.js") {
          return new Response(triageJS(), {
            headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" }
          });
        }
        if (ruta === "/api/triage/casos")   return await triageCasos(env, url);
        const tf = ruta.match(/^\/api\/triage\/caso\/(CV-\d{4}-\d{6})$/i);
        if (tf) return await triageFicha(env, tf[1].toUpperCase());
        const tev = ruta.match(/^\/api\/triage\/caso\/(CV-\d{4}-\d{6})\/evaluar$/i);
        if (tev) return await triageEvaluar(request, env, tev[1].toUpperCase(), sesion.email);
        const tm = ruta.match(/^\/api\/triage\/medio\/(\d+)$/);
        if (tm) return await triageMedio(env, Number(tm[1]));
        if (ruta === "/api/admin/resumen")  return await adminResumen(env);
        if (ruta === "/api/admin/salud")    return await adminSalud(env);
        if (ruta === "/api/admin/casos")    return await adminCasos(env);
        if (ruta === "/api/admin/ruta")     return await adminRuta(env, url);
        /* `/admin/ruta` y no `/ruta`, y la razón es de Access, no de estética.
           Medido en producción el 19 ago: `/admin` devolvía 302 al login de
           Access y `/ruta` devolvía 403 `sin_token` del propio Worker. Es
           decir: Access NUNCA interceptaba /ruta, así que nunca emitía el token
           que el guardián exige, y la pantalla era inalcanzable para todo el
           mundo — segura, pero inservible, y es la pantalla de la brigada.

           Lo obvio sería añadir /ruta a la aplicación de Access, pero esa
           aplicación ya está en su tope de entradas (ver más abajo la nota del
           ápex y www). Colgándola de /admin/ queda cubierta por la entrada que
           YA existe: cero cupos nuevos, y nadie puede volver a olvidarlo porque
           cualquier ruta interna futura hereda la misma cobertura. */
        if (ruta === "/admin/ruta") {
          return new Response(paginaRuta(), {
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
          });
        }
        if (ruta === "/admin/ruta.js") {
          return new Response(rutaJS(), {
            headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }
          });
        }
        /* El número va en la ruta con su forma exacta, igual que el aporte:
           cualquier otra cosa ni siquiera entra a la función. */
        const mc = ruta.match(/^\/api\/admin\/caso\/(CV-\d{4}-\d{6})\/estado$/i);
        if (mc) return await adminMoverCaso(request, env, mc[1].toUpperCase(), sesion.email);
        const cco = ruta.match(/^\/api\/admin\/caso\/(CV-\d{4}-\d{6})\/corregir$/i);
        if (cco) return await adminCorregirCaso(request, env, cco[1].toUpperCase(), sesion.email);
        const cme = ruta.match(/^\/api\/admin\/caso\/(CV-\d{4}-\d{6})\/medio$/i);
        if (cme) return await adminSubirMedio(request, env, cme[1].toUpperCase(), url, sesion.email);
        const cbo = ruta.match(/^\/api\/admin\/caso\/(CV-\d{4}-\d{6})\/medio\/(\d{1,9})\/borrar$/i);
        if (cbo) return await adminBorrarMedio(request, env, cbo[1].toUpperCase(), Number(cbo[2]), sesion.email);
        const cfi = ruta.match(/^\/api\/admin\/caso\/(CV-\d{4}-\d{6})$/i);
        if (cfi) return await adminCasoFicha(env, cfi[1].toUpperCase());
        if (ruta === "/api/admin/aportes")  return await adminAportes(env, url);
        const mv = ruta.match(/^\/api\/admin\/aporte\/([A-Za-z0-9-]+)\/estado$/);
        if (mv) return await adminMoverEstado(request, env, mv[1].toUpperCase(), sesion.email);
        const cw = ruta.match(/^\/api\/admin\/aporte\/([A-Za-z0-9-]+)\/conciliar$/);
        if (cw) return await adminConciliarWompi(request, env, cw[1].toUpperCase(), sesion.email);

        /* Certificados. El PDF también vive detrás de Access: es un documento
           con nombre y cédula del donante, no un archivo público. */
        const ce = ruta.match(/^\/api\/admin\/certificado\/(GG-\d{4}-\d{6})$/i);
        if (ce) return await adminEmitirCertificado(request, env, ce[1].toUpperCase(), sesion.email);
        const cp = ruta.match(/^\/api\/admin\/certificado\/(CD-\d{4}-\d{6})\.pdf$/i);
        if (cp) return await adminCertificadoPdf(env, cp[1].toUpperCase());
        const ca = ruta.match(/^\/api\/admin\/certificado\/(CD-\d{4}-\d{6})\/anular$/i);
        if (ca) return await adminAnularCertificado(request, env, ca[1].toUpperCase(), sesion.email);

        /* Entregas (Fase 6). El borrador y sus fotos viven tras Access hasta que
           alguien las publica: en terreno se registra rápido y se revisa después. */
        if (ruta === "/api/admin/pagos-sueltos") return await adminPagosSueltos(env);
        if (ruta === "/api/admin/ofrecimientos") return await adminOfrecimientos(env);
        if (ruta === "/api/admin/inscripciones") return await adminInscripciones(env);
        if (ruta === "/api/admin/miembros") return await adminMiembros(env);
        if (ruta === "/api/admin/reportadas") return await adminReportadas(env);
        const rc = ruta.match(/^\/api\/admin\/comprobante\/(GG-\d{4}-\d{6})$/i);
        if (rc) return await adminComprobante(env, rc[1].toUpperCase());
        const rt = ruta.match(/^\/api\/admin\/transferencia\/(GG-\d{4}-\d{6})\/confirmar$/i);
        if (rt) return await adminConfirmarTransferencia(request, env, rt[1].toUpperCase(), sesion.email);
        const mr = ruta.match(/^\/api\/admin\/miembro\/(MB-\d{4}-\d{6})\/revocar$/i);
        if (mr) return await adminRevocarMiembro(request, env, mr[1].toUpperCase(), sesion.email);
        const mi = ruta.match(/^\/api\/admin\/inscripcion\/(\d+)\/estado$/);
        if (mi) return await adminMoverInscripcion(request, env, Number(mi[1]), sesion.email);
        const mm = ruta.match(/^\/api\/admin\/inscripcion\/(\d+)\/matricula$/);
        if (mm) return await adminVerificarMatricula(request, env, Number(mm[1]), sesion.email);
        if (ruta === "/api/admin/entregas") return await adminEntregas(env);
        if (ruta === "/api/admin/entrega")  return await adminCrearEntrega(request, env, sesion.email);
        const ef = ruta.match(/^\/api\/admin\/entrega\/(AE-\d{4}-\d{6})\/foto$/i);
        if (ef) return await adminSubirFoto(request, env, ef[1].toUpperCase(), url);
        const ep = ruta.match(/^\/api\/admin\/entrega\/(AE-\d{4}-\d{6})\/publicar$/i);
        if (ep) return await adminPublicarEntrega(request, env, ep[1].toUpperCase(), sesion.email);
        const ea = ruta.match(/^\/api\/admin\/entrega\/(AE-\d{4}-\d{6})\/anular$/i);
        if (ea) return await adminAnularEntrega(request, env, ea[1].toUpperCase(), sesion.email);

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
        if (ruta === "/api/inscripcion")    return await apiInscripcion(request, env, url);
        const aporte = ruta.match(/^\/api\/aporte\/([A-Za-z0-9-]+)$/);
        if (aporte)                         return await apiAporte(env, aporte[1]);
        const rec = ruta.match(/^\/api\/recibo\/(GG-\d{4}-\d{6})\.pdf$/i);
        if (rec)                            return await apiRecibo(env, rec[1], url.searchParams.get("t"));
        if (ruta === "/api/entregas")       return await apiEntregas(env, url);
        if (ruta === "/api/transferencia")  return await apiReportarTransferencia(request, env, url);
        const comp = ruta.match(/^\/api\/comprobante\/(GG-\d{4}-\d{6})$/i);
        if (comp) return await apiComprobante(request, env, comp[1].toUpperCase(), url.searchParams.get("t"));
        /* Triage estructural de viviendas */
        if (ruta === "/api/caso")           return await apiCasoCrear(request, env);
        if (ruta === "/api/casos/publicos") return await apiCasosPublicos(env);
        const cmed = ruta.match(/^\/api\/caso\/(CV-\d{4}-\d{6})\/medio$/i);
        if (cmed) return await apiCasoMedio(request, env, cmed[1].toUpperCase(), url.searchParams.get("t"), url);
        const cinf = ruta.match(/^\/api\/caso\/(CV-\d{4}-\d{6})\/informe\.pdf$/i);
        if (cinf) return await apiCasoInforme(env, cinf[1].toUpperCase(), url.searchParams.get("t"));
        const cest = ruta.match(/^\/api\/caso\/(CV-\d{4}-\d{6})$/i);
        if (cest) return await apiCasoEstado(env, cest[1].toUpperCase(), url.searchParams.get("t"));
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
