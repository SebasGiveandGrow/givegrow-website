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

import { recibo, certificado, informeTriage, inspeccionPDF,
         INSPECCION_SECCIONES, INSPECCION_ALCANCE, INSPECCION_CONSENT,
         INSPECCION_AYUDA, INSPECCION_ANCHOS, INSPECCION_GLOSARIO,
         INSPECCION_LIMITES, INSPECCION_REGLA_VISTA, INSPECCION_RECOMENDA,
         INSPECCION_MENSAJE_COMUNIDAD } from "./documentos.js";

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
  /* CUÁL audiencia validó, no solo que alguna lo hiciera. La asimetría entre el
     panel y el triaje ya estaba en el esquema —el triaje acepta las dos, el
     panel solo la suya— pero la sesión no la exponía, así que un endpoint del
     triaje no podía saber si quien pregunta es del equipo o un voluntario. Sin
     ese dato, el PDF de la inspección se le servía a cualquiera. */
  const audEquipo = auds.includes(env.ACCESS_AUD);
  if (carga.iss !== "https://" + team) return { ok: false, motivo: "emisor_no_coincide" };
  const ahora = Math.floor(Date.now() / 1000);
  if (carga.exp && carga.exp < ahora) return { ok: false, motivo: "token_expirado" };
  if (carga.nbf && carga.nbf > ahora + 60) return { ok: false, motivo: "token_futuro" };

  return { ok: true, email: carga.email || carga.sub || "?", equipo: audEquipo };
}

/* ========================================================================
   EVALUACIÓN EXTERNA DE ACCESS — que habilitar a un ingeniero no dependa
   de que una persona edite una lista de correos a mano.

   EL PROBLEMA QUE RESUELVE. La postulación ya entra sola a `inscripciones`, y
   `/admin` ya tiene el interruptor que marca la matrícula como verificada, con
   quién y cuándo. Lo que NO era automático era lo único que de verdad abre la
   puerta: añadir el correo a la política de Cloudflare Access, a mano, en el
   dashboard. Si cien ingenieros se postulan un martes, cien ediciones.

   CÓMO. Access permite una regla de «External Evaluation»: llama a un endpoint
   nuestro y le pregunta si esta persona pasa. Con eso, MARCAR «verificada» EN
   `/admin` PASA A SER EL ACTO COMPLETO DE DAR ACCESO.

   EL CONTRATO no se dedujo de la documentación —que no lo detalla— sino del
   código de referencia de Cloudflare
   (github.com/cloudflare/workers-access-external-auth-example):

     entra   POST con cuerpo JSON  { token: "<jwt firmado por Access>" }
     sale    200 con               { token: "<jwt NUESTRO firmado>" }
             cuya carga es         { success, iat, exp, nonce }
     claves  GET que devuelve      { keys: [ { kid, kty, n, e, ... } ] }

   El `nonce` que llega hay que devolverlo IGUAL: es lo que ata la respuesta a
   la pregunta y evita que una respuesta vieja se reutilice.

   ⚠️ LAS DOS RUTAS TIENEN QUE SER PÚBLICAS, y no es un descuido: las llama
   Cloudflare, no un navegador con sesión. Ponerlas detrás de la política que
   ellas mismas alimentan sería un bloqueo mutuo — Access esperando nuestra
   respuesta para dejar pasar la petición con la que la pedimos.

   ⚠️ Y NO SUSTITUYEN A LA LISTA MANUAL, se suman. En Access los «Include» se
   combinan con OR. La documentación NO dice qué pasa si este endpoint se cae o
   tarda, y el código de referencia responde 403 ante cualquier error, lo que la
   regla lee como «no pasa». Con cinco territorios en terreno, dejar la entrada
   de los ingenieros colgando de un endpoint sin comportamiento de fallo
   documentado es exactamente el riesgo que no se debe tomar. Si esto falla,
   quien ya entraba sigue entrando.
   ======================================================================== */

/* El par de claves vive en UN secreto (`ACCESS_EVAL_JWK`, el JWK privado en
   JSON) y no en KV como el ejemplo de Cloudflare, que lo genera al vuelo en la
   primera llamada. Dos razones: este proyecto no tiene KV, y sobre todo que así
   NINGÚN endpoint puede acuñar una clave nueva — no hay carrera posible ni un
   camino por el que la clave se regenere sola y deje de coincidir con la que
   Access ya conoce.

   La pública se DERIVA de la privada tomando `n` y `e`. No se guarda aparte, y
   eso elimina de raíz la clase de fallo en la que las dos dejan de casar. */
let EVAL_LLAVE = null;

async function evalLlave(env) {
  if (EVAL_LLAVE) return EVAL_LLAVE;
  if (!env.ACCESS_EVAL_JWK) throw new Error("ACCESS_EVAL_JWK sin configurar");
  const jwk = JSON.parse(env.ACCESS_EVAL_JWK);
  if (!jwk.n || !jwk.e || !jwk.d) throw new Error("ACCESS_EVAL_JWK no es un JWK privado");
  const publica = { kty: jwk.kty || "RSA", n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" };
  /* El `kid` se deriva de la clave pública, así que es estable sin guardarlo. */
  const kid = (await sha256Hex(JSON.stringify(publica))).slice(0, 32);
  const priv = await crypto.subtle.importKey(
    "jwk", { ...jwk, alg: "RS256" }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  EVAL_LLAVE = { priv, publica: { kid, ...publica }, kid };
  return EVAL_LLAVE;
}

function bytesAB64url(b) {
  let bin = "";
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function textoAB64url(t) {
  return bytesAB64url(new TextEncoder().encode(t));
}

async function firmarEval(env, carga) {
  const { priv, kid } = await evalLlave(env);
  const trozo = textoAB64url(JSON.stringify({ alg: "RS256", kid }))
    + "." + textoAB64url(JSON.stringify(carga));
  const firma = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", priv, new TextEncoder().encode(trozo)
  ));
  return trozo + "." + bytesAB64url(firma);
}

/* GET /api/access/claves — el JWKS con el que Access verifica NUESTRA firma. */
async function accessClaves(env) {
  try {
    const { publica } = await evalLlave(env);
    return new Response(JSON.stringify({ keys: [publica] }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  } catch {
    /* Sin clave no se inventa un JWKS vacío que parezca válido: se dice que no
       está configurado, y la regla de Access evalúa a falso — que con la lista
       manual como segundo Include no deja a nadie fuera. */
    return json({ error: "no_configurado" }, 503);
  }
}

/* POST /api/access/evaluar — ¿este correo es de un ingeniero verificado? */
async function accessEvaluar(request, env) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const ahora = Math.floor(Date.now() / 1000);
  /* Se parte de NO. Cualquier camino que no llegue a comprobarlo todo termina
     en un «no pasa» firmado, no en un error ambiguo. */
  const carga = { success: false, iat: ahora, exp: ahora + 60 };

  try {
    const cuerpo = await request.json();
    const token = String((cuerpo && cuerpo.token) || "");
    const partes = token.split(".");
    if (partes.length !== 3) throw new Error("token_malformado");

    const cabecera = b64urlAJson(partes[0]);
    const claims = b64urlAJson(partes[1]);

    /* La firma se comprueba contra los certificados de NUESTRO equipo de
       Access, reutilizando el mismo cargador con caché que ya usa el panel. Sin
       esto el endpoint sería un oráculo abierto: cualquiera podría preguntarle
       si un correo cualquiera es un ingeniero verificado. */
    const team = env.ACCESS_TEAM_DOMAIN;
    if (!team) throw new Error("sin_team_domain");
    const llaves = await llavesAccess(team);
    const jwk = llaves.find((k) => k.kid === cabecera.kid);
    if (!jwk) throw new Error("kid_desconocido");
    const llave = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    const valida = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", llave, b64urlABytes(partes[2]),
      new TextEncoder().encode(partes[0] + "." + partes[1])
    );
    if (!valida) throw new Error("firma_invalida");

    /* EL NONCE SE COPIA AQUÍ, en cuanto la firma está comprobada y ANTES de
       mirar la caducidad o el emisor. Así un token auténtico pero vencido
       recibe un «no» bien formado en vez de una respuesta que Access descarta
       por no reconocerla: las dos deniegan, pero solo una se puede diagnosticar
       cuando algo vaya mal en terreno. De un token sin verificar no se copia
       nada. */
    if (claims.nonce) carga.nonce = claims.nonce;

    if (!claims.exp || claims.exp < ahora) throw new Error("token_expirado");
    if (claims.iss && claims.iss !== "https://" + team) throw new Error("emisor_no_coincide");

    /* `identity.email` es donde lo pone el código de referencia; `email` es
        donde lo pone el token de una aplicación normal de Access. Se aceptan
        los dos porque no está documentado cuál llega aquí, y equivocarse
        significa denegar a todo el mundo en silencio. */
    const correo = String(
      (claims.identity && claims.identity.email) || claims.email || ""
    ).trim().toLowerCase();
    if (!correo) throw new Error("sin_correo");

    /* LA REGLA. Matrícula verificada por una persona, y la postulación ni
       archivada ni rechazada: archivar a alguien tiene que revocarle la entrada
       sin obligar a acordarse de desmarcar también el interruptor. */
    const fila = await env.DB.prepare(
      "SELECT 1 AS s FROM inscripciones WHERE tipo = 'ingeniero' " +
      "AND LOWER(email) = ? " +
      "AND COALESCE(json_extract(datos, '$.matricula_verificada'), 0) = 1 " +
      "AND estado NOT IN ('archivada','rechazada') LIMIT 1"
    ).bind(correo).first();
    if (fila) carga.success = true;

    return new Response(JSON.stringify({ token: await firmarEval(env, carga) }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  } catch (e) {
    /* Se intenta responder un «no» FIRMADO incluso ante el error, porque es lo
       que Access sabe leer. Si ni eso se puede —falta la clave—, entonces sí un
       403, igual que el ejemplo de Cloudflare. */
    try {
      return new Response(JSON.stringify({ token: await firmarEval(env, carga) }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    } catch {
      return json({ success: false, error: "no_evaluable" }, 403);
    }
  }
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
  if (c.tipo === "apadrinamiento") return await apiApadrinamiento(env, c);
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
  /* `orden` y `destino` existen para la portada de decisiones.

     EL ORDEN NO ES POR CANTIDAD, y esa es la decisión. Cinco certificados
     pendientes no son más urgentes que una casa que un ingeniero marcó urgente
     y que nadie ha visitado. El criterio es QUIÉN ESPERA y QUÉ SE ROMPE si esto
     sigue igual: primero las familias en riesgo, después lo que destraba a esas
     familias, después el dinero y los papeles. Se escribe aquí, junto a la
     consulta, y no en el panel, porque es la misma clase de dato que el
     «cómo se arregla»: dice qué significa esta cola, no cómo se dibuja.

     `destino` es a dónde va quien decide atenderla. Cuando no hay pantalla
     —los correos fallidos se arreglan en Resend— se deja vacío en vez de
     inventar un enlace que no lleva a ninguna parte. */
  const enCola = async (clave, sql, comoSeArregla, orden, destino) => {
    const r = await uno(sql);
    cola.push({
      clave, n: r.n || 0,
      dias: r.n ? Math.floor((Date.now() - Date.parse((r.masViejo || "").replace(" ", "T") + "Z")) / 86400000) : null,
      arreglo: comoSeArregla,
      orden: orden, destino: destino || null
    });
  };
  /* Sin los ingenieros: tienen su propia cola, con su propio «cómo se arregla»
     —buscar la matrícula en el COPNIA—, y contarlos dos veces inflaba el panel
     justo en el número que sirve para decidir a qué dedicarle la tarde. */
  await enCola("inscripciones_sin_tocar",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM inscripciones " +
    "WHERE estado = 'nueva' AND tipo <> 'ingeniero'",
    "Bandeja «Quién quiere entrar» · a alguien le prometimos que le escribíamos", 90, "#sec-entrar");
  await enCola("transferencias_sin_verificar",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM aportes WHERE estado = 'reportada'",
    "Bandeja «Transferencias» · sin verificar no hay recibo ni certificado", 60, "#sec-transferencias");
  await enCola("certificados_por_emitir",
    "SELECT COUNT(*) AS n, MIN(aprobada_en) AS masViejo FROM aportes a WHERE a.quiere_certificado = 1 " +
    "AND a." + PAGADA + " AND NOT EXISTS " +
    "(SELECT 1 FROM certificados c WHERE c.guia = a.guia AND c.anulado_en IS NULL)",
    "Lista de aportes · los firma la Revisora Fiscal, no el sistema", 70, "#sec-salud");
  await enCola("correos_fallidos",
    "SELECT COUNT(*) AS n, MIN(intento_en) AS masViejo FROM correos WHERE resultado = 'fallo'",
    "Reenviar a mano y revisar Resend · a esa persona el sitio le prometió un correo que no salió", 95, null);
  await enCola("entregas_en_borrador",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM entregas " +
    "WHERE publicada_en IS NULL AND anulada_en IS NULL",
    "Bandeja «Entregas» · el acta existe y todavía no la ve nadie", 80, "#sec-entregas");

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
    "Pantalla /triaje · una familia mandó fotos de su casa y nadie las ha abierto", 20, "/triaje");
  /* La peor de las cinco, y por eso va con su propio texto: el sistema dijo
     «vayan ya» y nadie fue. Que exista esta fila es media razón de esta tanda. */
  await enCola("urgentes_sin_visitar",
    "SELECT COUNT(*) AS n, MIN(creado_en) AS masViejo FROM casos " +
    "WHERE clasificacion = 'urgente' AND estado NOT IN ('visitado','cerrado','descartado')",
    "Pantalla /ruta · un ingeniero dijo que era urgente y todavía no ha ido nadie", 10, "/admin/ruta");
  await enCola("casos_esperando_fotos",
    "SELECT COUNT(*) AS n, MIN(creado_en) AS masViejo FROM casos c " +
    "WHERE c.estado = 'en_revision' AND EXISTS (SELECT 1 FROM evaluaciones e " +
    "WHERE e.caso = c.numero AND e.clasificacion = 'inevaluable')",
    "Se le pidió material a la familia y no ha llegado · quizá haya que llamarla", 50, "#sec-casas");
  /* Antes contaba solo `estado = 'nueva'`, y ese era el hueco: un ingeniero
     movido a «en revisión» o incluso aceptado SIN comprobar su matrícula
     desaparecía de la alarma, que es exactamente el caso peligroso. Ahora
     cuenta lo que de verdad falta: la matrícula sin verificar. */
  await enCola("ingenieros_sin_verificar",
    "SELECT COUNT(*) AS n, MIN(creada_en) AS masViejo FROM inscripciones " +
    "WHERE tipo = 'ingeniero' AND estado <> 'archivada' " +
    "AND COALESCE(json_extract(datos, '$.matricula_verificada'), 0) <> 1",
    "Consultar su matrícula en el registro público del COPNIA y marcarla en la bandeja", 30, "#sec-entrar");

  /* Y la cola nueva: conceptos que no pueden salir solos. Mientras estén aquí,
     la familia NO ha recibido respuesta — es la cola más urgente de las de
     personas, porque del otro lado alguien mandó fotos de su casa rota. */
  await enCola("conceptos_sin_respaldo",
    "SELECT COUNT(*) AS n, MIN(c.creado_en) AS masViejo FROM casos c " +
    "WHERE c.estado = 'clasificado' AND " + SIN_RESPALDO,
    "Un voluntario ya dio su concepto pero su matrícula no está verificada · falta un segundo par de ojos en /triaje", 40, "#sec-entrar");

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
    /* Si la lista llegó al tope, se DICE. Un «200» a secas se lee como «hay
       200», y con eso el caso 201 no existe para nadie mientras la familia
       espera. */
    var truncada = d.total && d.tope && d.total > d.tope;
    var h = "<p class='sub'>" + (truncada
      ? c.length + " de " + d.total + " " + CABEZA[COLA]
        + " &middot; <b>faltan " + (d.total - c.length) + " por mostrar</b>, usa las pestañas para acotar"
      : c.length + " " + CABEZA[COLA]) + "</p>";
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

/* El tope de las listas de casos. Existe como constante y no como número
   suelto porque va acompañado SIEMPRE de su total: el día que alguien lo suba,
   lo que la pantalla dice sigue siendo verdad. */
const TOPE_COLA = 200;
const TOPE_INSPECCIONES = 300;

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
    "FROM casos c " + filtro + " ORDER BY c.creado_en ASC LIMIT " + TOPE_COLA
  ).all();

  /* EL TOTAL, con el MISMO filtro que la lista. Sin esto la cola termina en el
     caso 200 y parece que ahí se acaba: cinco territorios con más de cien
     familias cada uno pasan de doscientos, y el caso 201 sería invisible para
     todo el mundo mientras la familia espera. Es la misma clase de fallo que
     los borradores que nadie leía — una lista que termina en silencio parece
     completa. El filtro se reutiliza a propósito: un total calculado sobre otra
     condición miente de otra manera. */
  const tot = await env.DB.prepare("SELECT COUNT(*) AS n FROM casos c " + filtro).first();

  /* Cuántos piden confirmación, siempre — así la pestaña puede decirlo sin que
     el ingeniero tenga que entrar a mirar si hay algo. */
  const p = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM casos c WHERE (c.clasificacion = 'urgente' AND " + FIRMES + " = 1) OR " + DISCREPA
  ).first();
  return json({ casos: r.results || [], porConfirmar: (p && p.n) || 0,
                total: (tot && tot.n) || 0, tope: TOPE_COLA });
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
   INSPECCIÓN VISUAL PRELIMINAR — el sistema que funciona SIN SEÑAL
   ========================================================================
   Para qué existe: del 24 al 28 de agosto de 2026 la brigada entra a veredas
   SIN LUZ NI INTERNET. El triaje mira fotos a distancia; esto se llena parado
   en la casa, con el habitante delante, y puede tardar días en poder enviarse.

   ESTA ES LA PRIMERA CAPACIDAD OFFLINE DEL PROYECTO. Se construye como una
   rebanada vertical delgada —una sección de las ocho, de punta a punta— porque
   si el andamio falla hay que rehacerlo todo, y este repositorio tiene tres
   cicatrices de rutas nuevas que «parecían funcionar».

   LAS CUATRO COSAS QUE LO HACEN FUNCIONAR DE VERDAD, y ninguna es obvia:

   1. HAY QUE PRECARGAR ANTES DE PERDER LA SEÑAL. Un service worker solo guarda
      lo que se le pide. Si el formulario se abre por primera vez ya en la
      vereda, no hay nada en caché y no carga nada. Por eso hay un botón
      explícito de preparación que se usa CON internet, antes de salir, y que
      dice qué quedó listo.

   2. SIN `storage.persist()` EL SISTEMA OPERATIVO PUEDE BORRAR UN DÍA DE
      TRABAJO. Con los tamaños medidos en el caso real —4 fotos, 2,2 MB por
      casa— treinta casas son ~66 MB en IndexedDB, y iOS y Android desalojan ese
      almacenamiento cuando el teléfono se llena, sin avisar a nadie.

   3. EL CONSECUTIVO LO ASIGNA EL SERVIDOR. Dos ingenieros sin señal reclamarían
      los dos `IV-2026-000005`. El teléfono crea un `local_id` y el número real
      se pone al llegar.

   4. IDEMPOTENCIA, que es la lección que este proyecto ya pagó con Wompi: «ya
      lo procesé», no «ya lo vi». Con señal mala un envío puede LLEGAR y perderse
      su respuesta; el teléfono reintenta y crearía una inspección duplicada con
      otro consecutivo. El `local_id` es lo que deja al servidor reconocerla.

   Y UNA TRAMPA PROPIA DE ESTAR DETRÁS DE ACCESS: cuando la sesión expira,
   Cloudflare responde con el HTML del login, no con un error. Un envío que
   recibe HTML NO se puede tratar como éxito ni borrar de la cola — se reintenta
   después de volver a entrar. Se comprueba el content-type, no solo el estado.
   ======================================================================== */

/* El service worker. Se sirve desde /triaje/ para que su ámbito NO alcance el
   sitio público: un fallo aquí no puede romper la portada ni el formulario de
   las familias. */
function inspeccionSW() {
  return `const CACHE = "inspeccion-v1";
const ESENCIALES = ["/triaje/inspeccion", "/triaje/inspeccion.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) =>
    Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

/* Solo la pantalla y su JS. Los envíos NO se interceptan: los gobierna la cola
   de IndexedDB, que sabe reintentar. Un service worker que "ayude" con los POST
   es la forma más rápida de perder un formulario firmado. */
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (u.pathname !== "/triaje/inspeccion" && u.pathname !== "/triaje/inspeccion.js") return;
  e.respondWith(
    fetch(e.request).then((r) => {
      /* Detrás de Access, una sesión expirada devuelve el HTML del login. Eso NO
         se guarda en caché: sustituiría el formulario por una pantalla de
         entrada, justo cuando no hay señal para volver a entrar. */
      const ct = r.headers.get("content-type") || "";
      const esLogin = r.redirected || (u.pathname.endsWith(".js") && !ct.includes("javascript"));
      if (r.ok && !esLogin) {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
      }
      return r;
    }).catch(() => caches.match(e.request).then((c) => c || new Response(
      "Sin señal y sin copia guardada. Abre esta pantalla una vez con internet antes de salir.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    )))
  );
});
`;
}

/* POST /api/triage/inspeccion — recibe una inspección llenada en terreno.
   Idempotente por `local_id`: el mismo envío dos veces devuelve el MISMO
   número y no crea una segunda fila. */
/* Una firma llega como data URI desde el teléfono (`canvas.toDataURL`). Se
   valida y se convierte a bytes ANTES de tocar la base: un data URI mal formado
   o enorme no puede entrar a R2 ni dejar una fila a medias.

   Solo PNG, y comprobado por su firma de formato y no por lo que diga el
   prefijo: aceptar cualquier base64 sería aceptar un archivo arbitrario con
   nombre de firma. */
const FIRMA_MAX = 400 * 1024;   /* una firma real pesa 5–20 KB; 400 KB es techo de sobra */

function firmaABytes(dataUri) {
  if (typeof dataUri !== "string") return null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUri.trim());
  if (!m) return null;
  let bin;
  try { bin = atob(m[1]); } catch { return null; }
  if (!bin.length || bin.length > FIRMA_MAX) return null;
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (b[i] !== png[i]) return null;
  return b;
}

/* Los ids válidos y las marcas válidas, DERIVADOS del catálogo único. No se
   escriben a mano aquí: si los ingenieros corrigen la lista, esto la sigue. */
const INSP_IDS = new Set(INSPECCION_SECCIONES.flatMap((s) => s.items.map((i) => i.id)));
const INSP_MARCAS_OK = new Set(["RE", "OBS", "SO"]);

/* Las respuestas llegaban del teléfono y entraban tal cual a la base y al PDF,
   sin una sola comprobación, mientras TODOS los demás campos del handler pasan
   por `limpiar()`. Dos cosas malas salían de ahí:

     · Una marca desconocida —`{"m":"XX"}`— caía al último ramal del ternario del
       PDF y se imprimía como «[S/O]», o sea «sin observación aparente», sobre un
       muro que el ingeniero había marcado. El documento afirmaba lo contrario de
       lo observado y nadie lo notaba.
     · `obs` no tenía tope: megabytes de texto a D1 y al PDF.

   Se descarta lo que no reconoce, en vez de intentar adivinarlo: en un documento
   que alguien firma, un dato dudoso vale menos que su ausencia. */
function limpiarRespuestas(entrada) {
  const salida = {};
  if (!entrada || typeof entrada !== "object") return salida;
  let n = 0;
  for (const id of Object.keys(entrada)) {
    if (n >= INSP_IDS.size) break;          /* nunca más ítems que el catálogo */
    if (!INSP_IDS.has(id)) continue;
    const r = entrada[id];
    if (!r || typeof r !== "object") continue;
    const m = String(r.m || "").toUpperCase();
    if (!INSP_MARCAS_OK.has(m)) continue;   /* sin marca válida no es respuesta */
    salida[id] = { m, obs: limpiar(r.obs, 1200), fotos: limpiar(r.fotos, 60) };
    n++;
  }
  return salida;
}

/* La hora del teléfono, comprobada. El comentario de antes decía que una fecha
   «absurda» se sustituía por la del servidor, y era falso: `limpiar()` solo
   recorta, así que pasaba cualquier cadena —incluido «no soy una fecha», que la
   columna TEXT acepta y la bandeja del panel enseñaba cruda.

   Se exige el formato exacto y un rango con sentido: no antes del sismo (10 ago
   2026), no más de un día en el futuro. Un teléfono cuyo reloj se reinició en la
   vereda cae fuera y se usa la hora del servidor. */
function fechaTelefono(valor) {
  const t = limpiar(valor, 19);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) return null;
  const ms = Date.parse(t.replace(" ", "T") + "Z");
  if (!Number.isFinite(ms)) return null;
  const sismo = Date.parse("2026-08-10T00:00:00Z");
  if (ms < sismo || ms > Date.now() + 86400000) return null;
  return t;
}

async function triageInspeccionRecibir(request, env, email) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const localId = limpiar(c.local_id, 80);
  if (!localId) return json({ error: "local_id_requerido" }, 400);

  /* IDEMPOTENCIA ANTES DE CUALQUIER ESCRITURA. Si ya la recibimos, se devuelve
     su número y el teléfono la borra de su cola tranquilo. Sin esto, la señal
     mala multiplica inspecciones y quema consecutivos. */
  const ya = await env.DB.prepare(
    "SELECT numero FROM inspecciones WHERE json_extract(respuestas, '$._local_id') = ?"
  ).bind(localId).first();
  if (ya) return json({ ok: true, numero: ya.numero, repetida: true });

  const municipio = limpiar(c.municipio, 120);
  const fecha = limpiar(c.fecha_visita, 10);
  const obsNombre = limpiar(c.obs_nombre, 160);
  const faltan = [];
  const familia = limpiar(c.familia, 160);
  if (!familia)    faltan.push("familia");
  if (!municipio)  faltan.push("municipio");
  if (!fecha)      faltan.push("fecha_visita");
  if (!obsNombre)  faltan.push("obs_nombre");
  if (faltan.length) return json({ error: "datos_incompletos", faltan }, 422);

  /* EL CONSENTIMIENTO DEL HABITANTE NO ES OPCIONAL. Es la única autorización
     que da, y el documento se la enseña ANTES de firmar. Sin ella no hay
     inspección: se le habría entrado a su casa sin permiso registrado. */
  if (!c.consent_hab) return json({ error: "consent_habitante_requerido" }, 422);

  /* LAS FIRMAS. La del observador es obligatoria: es quien responde por lo que
     escribió, y su matrícula va al documento.

     La del habitante puede ser IMPOSIBLE y no por mala voluntad —herido, sin
     saber escribir, o ausente—, así que se admite su ausencia SOLO con un
     motivo escrito. Dejarla vacía en silencio haría que «no pudo firmar» y «no
     autorizó» quedaran como el mismo dato, y son opuestos. Es la regla que ya
     gobierna cerrar un caso: el motivo es obligatorio porque un caso que se va
     sin decir por qué es indistinguible de uno perdido. */
  const firmaObs = firmaABytes(c.firma_obs);
  if (!firmaObs) return json({ error: "firma_observador_requerida" }, 422);

  const firmaHab = firmaABytes(c.firma_hab);
  const motivoHab = limpiar(c.firma_hab_motivo, 300);
  if (!firmaHab && !motivoHab) {
    return json({ error: "firma_habitante_o_motivo",
                  ayuda: "Si el habitante no pudo firmar, escribe por qué. Un espacio en blanco no distingue «no pudo» de «no autorizó»." }, 422);
  }

  /* Las coordenadas se guardan solo si son NÚMEROS y caen en el planeta. Un
     teléfono que devuelve basura, o un envío manipulado, no puede poner una casa
     en medio del océano. Son PRIVADAS: nunca salen al banco público, igual que
     la dirección — ver la 0010, que partió la ubicación en dos por esa razón. */
  const num = (x, min, max) => {
    const n = Number(x);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const lat = num(c.lat, -90, 90);
  const lon = num(c.lon, -180, 180);
  const prec = num(c.gps_precision, 0, 100000);

  /* Las recomendaciones se filtran contra el catálogo, igual que las respuestas:
     un id que no existe se descarta en vez de guardarse. Y el texto libre lleva
     tope, porque es el único campo de esta pantalla sin uno. */
  const recoIds = new Set(INSPECCION_RECOMENDA.flatMap((g) => g.items.map((i) => i.id)));
  const reco = {
    marcadas: Array.isArray(c.recomendaciones && c.recomendaciones.marcadas)
      ? c.recomendaciones.marcadas.filter((x) => recoIds.has(String(x))).slice(0, recoIds.size)
      : [],
    texto: limpiar(c.recomendaciones && c.recomendaciones.texto, 1200)
  };

  const respuestas = limpiarRespuestas(c.respuestas);
  respuestas._local_id = localId;

  const numero = await siguienteInspeccion(env, new Date().getUTCFullYear());

  /* R2 ANTES DE LA FILA. Si la escritura del archivo falla, no queda una
     inspección apuntando a una firma que no existe — el documento se emitiría
     sin la evidencia que lo sostiene. Al revés se quema un consecutivo, y un
     hueco en la numeración es más barato que una firma perdida. */
  const claveObs = "inspecciones/" + numero + "/firma-observador.png";
  await env.MEDIA.put(claveObs, firmaObs, { httpMetadata: { contentType: "image/png" } });
  let claveHab = null;
  if (firmaHab) {
    claveHab = "inspecciones/" + numero + "/firma-habitante.png";
    await env.MEDIA.put(claveHab, firmaHab, { httpMetadata: { contentType: "image/png" } });
  }

  /* El SELECT de arriba ataja el caso normal, pero NO es atómico: dos
     peticiones con el mismo `local_id` pueden pasarlo las dos antes de que
     ninguna inserte. El índice único de la 0013 es lo que cierra esa ventana, y
     aquí se trata su choque como lo que es: no un error, sino la confirmación
     de que la inspección ya está guardada. Se devuelve su número y el teléfono
     la borra de su cola tranquilo. */
  try {
  await env.DB.prepare(
    "INSERT INTO inspecciones (numero, caso, proyecto, casa_no, direccion, municipio, " +
    "fecha_visita, hora, obs_nombre, obs_cc, obs_matricula, obs_email, propietario, contacto, " +
    "hab_cc, respuestas, requiere_esp, consent_hab, firma_obs_key, firma_hab_key, " +
    "firma_hab_motivo, creado_en, dispositivo, familia, finca, lat, lon, gps_precision, " +
    "observaciones, recomendaciones) " +
    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    numero, limpiar(c.caso, 20) || null, limpiar(c.proyecto, 120) || null,
    limpiar(c.casa_no, 40) || null, limpiar(c.direccion, 240) || null, municipio,
    fecha, limpiar(c.hora, 8) || null, obsNombre, limpiar(c.obs_cc, 40) || null,
    limpiar(c.obs_matricula, 60) || null, email || null,
    limpiar(c.propietario, 160) || null, limpiar(c.contacto, 80) || null,
    limpiar(c.hab_cc, 40) || null,
    JSON.stringify(respuestas), c.requiere_esp ? 1 : 0, 1,
    claveObs, claveHab, motivoHab || null,
    /* `creado_en` es la hora DEL TELÉFONO, cuando se llenó. Si no llega, no
       tiene el formato o cae fuera de rango, se usa la del servidor — pero
       jamás se sobreescribe una válida: la fecha del documento tiene que ser la
       de la visita. Ver `fechaTelefono`. */
    fechaTelefono(c.creado_en) || new Date().toISOString().slice(0, 19).replace("T", " "),
    limpiar(c.dispositivo, 120) || null,
    familia, limpiar(c.finca, 160) || null, lat, lon, prec,
    limpiar(c.observaciones, 3000) || null, JSON.stringify(reco)
  ).run();
  } catch (e) {
    const msg = String((e && e.message) || "");
    if (/UNIQUE|constraint/i.test(msg)) {
      const otra = await env.DB.prepare(
        "SELECT numero FROM inspecciones WHERE json_extract(respuestas, '$._local_id') = ?"
      ).bind(localId).first();
      if (otra) return json({ ok: true, numero: otra.numero, repetida: true });
    }
    throw e;
  }

  /* EL PDF SE GENERA AQUÍ Y SE CONGELA. Va DESPUÉS del INSERT a propósito: si
     armarlo fallara, lo que no se puede perder es la inspección —alguien la
     llenó en una casa y el habitante ya se despidió en la puerta—. Un documento
     que falta se puede volver a generar; una visita, no.

     Por eso el fallo se registra y no tumba la respuesta: el teléfono recibe su
     número y borra la inspección de su cola, que es lo correcto. */
  try {
    const bytes = await inspeccionPDF(
      {
        numero, caso: limpiar(c.caso, 20) || null, familia, finca: limpiar(c.finca, 160),
        lat, lon, gps_precision: prec, municipio, direccion: limpiar(c.direccion, 240),
        casa_no: limpiar(c.casa_no, 40), fecha_visita: fecha, hora: limpiar(c.hora, 8),
        propietario: limpiar(c.propietario, 160), contacto: limpiar(c.contacto, 80),
        obs_nombre: obsNombre, obs_cc: limpiar(c.obs_cc, 40), obs_matricula: limpiar(c.obs_matricula, 60),
        hab_cc: limpiar(c.hab_cc, 40), respuestas, requiere_esp: c.requiere_esp ? 1 : 0,
        observaciones: limpiar(c.observaciones, 3000), recomendaciones: JSON.stringify(reco),
        firma_hab_motivo: motivoHab || null
      },
      { obs: firmaObs, hab: firmaHab },
      new Date().toISOString().slice(0, 10)
    );
    const clavePdf = "inspecciones/" + numero + "/inspeccion.pdf";
    await env.MEDIA.put(clavePdf, bytes, { httpMetadata: { contentType: "application/pdf" } });
    await env.DB.prepare("UPDATE inspecciones SET pdf_key = ? WHERE numero = ?").bind(clavePdf, numero).run();
  } catch (e) {
    console.error("pdf inspeccion", numero, e && e.message);
  }

  return json({ ok: true, numero, repetida: false });
}

/* GET /api/triage/mis-inspecciones — lo que ESTE ingeniero mandó.
   Existe porque faltaba: el ingeniero enviaba, el contador de pendientes bajaba
   a cero, y ahí se acababa su información. Con varios en terreno, nadie podía
   confirmar que su trabajo llegó sin preguntarle a alguien con acceso al panel
   — y «no me llegan» era indistinguible de «no las estoy mirando donde están».

   MISMA REGLA DE PROPIEDAD QUE EL PDF: un ingeniero ve las que él firmó. El
   equipo (audiencia del panel) ve todas, porque su trabajo es coordinarlas.

   NO devuelve datos del habitante —ni nombre, ni contacto, ni cédula— aunque sea
   su propia inspección: para confirmar que llegó no hacen falta, y esta pantalla
   es la que el proyecto decidió mantener sin datos personales. */
async function triageMisInspecciones(env, sesion) {
  const email = String((sesion && sesion.email) || "");
  const equipo = !!(sesion && sesion.equipo);
  const r = await env.DB.prepare(
    "SELECT numero, familia, finca, municipio, fecha_visita, requiere_esp, pdf_key, " +
    "obs_email, respuestas, fotos, substr(recibido_en,1,16) AS recibido_en " +
    "FROM inspecciones " +
    (equipo ? "" : "WHERE lower(obs_email) = lower(?) ") +
    "ORDER BY recibido_en DESC LIMIT 100"
  ).bind(...(equipo ? [] : [email])).all();

  const filas = (r.results || []).map((v) => {
    let marcas = { RE: 0, OBS: 0, SO: 0 }, fotos = 0;
    try {
      const resp = JSON.parse(v.respuestas || "{}");
      for (const k of Object.keys(resp)) {
        if (k.charAt(0) === "_") continue;
        const m = resp[k] && resp[k].m;
        if (m && marcas[m] != null) marcas[m]++;
      }
    } catch { /* una fila con JSON roto no tumba la lista */ }
    try { const f = JSON.parse(v.fotos || "[]"); fotos = Array.isArray(f) ? f.length : 0; } catch { fotos = 0; }
    return {
      numero: v.numero, familia: v.familia, finca: v.finca, municipio: v.municipio,
      fecha_visita: v.fecha_visita, requiere_esp: v.requiere_esp, recibido_en: v.recibido_en,
      tiene_pdf: !!v.pdf_key, marcas, fotos,
      mia: String(v.obs_email || "").toLowerCase() === email.toLowerCase()
    };
  });
  return json({ inspecciones: filas, equipo });
}

/* POST /api/triage/inspeccion/<numero>/foto — una foto, una petición.
   En serie y de a una por la misma razón que en el formulario de la familia: con
   señal mala, siete subidas en paralelo se pisan y fallan todas.

   Solo el AUTOR de la inspección puede añadirle fotos, con la misma regla que
   gobierna su PDF. Y solo mientras el documento no se haya emitido: una vez
   congelado, añadir material cambiaría lo que la inspección dice sin cambiar el
   documento que la gente firmó. */
async function triageInspeccionFoto(request, env, numero, sesion) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const v = await env.DB.prepare(
    "SELECT numero, obs_email, fotos, pdf_key FROM inspecciones WHERE numero = ?"
  ).bind(numero).first();

  const suya = v && sesion && sesion.email &&
               String(v.obs_email || "").toLowerCase() === String(sesion.email).toLowerCase();
  if (!v || !((sesion && sesion.equipo) || suya)) return json({ error: "no_encontrada" }, 404);

  const tipo = String(request.headers.get("content-type") || "").split(";")[0].trim();
  const spec = TIPOS_MEDIO[tipo];
  if (!spec) return json({ error: "tipo_no_permitido", permitidos: Object.keys(TIPOS_MEDIO) }, 415);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: "archivo_vacio" }, 400);
  if (bytes.length > spec.max) {
    return json({ error: "archivo_muy_grande", max_mb: Math.round(spec.max / 1048576) }, 413);
  }

  let lista = [];
  try { lista = JSON.parse(v.fotos || "[]"); } catch { lista = []; }
  if (lista.length >= 20) return json({ error: "demasiadas_fotos", max: 20 }, 409);

  /* El número de la foto es su POSICIÓN, y es el que la persona anotó en
     «Foto N.º» de cada ítem. Por eso se añade al final y nunca se reordena. */
  const n = lista.length + 1;
  const clave = "inspecciones/" + numero + "/foto-" + String(n).padStart(2, "0") + "." + spec.ext;
  await env.MEDIA.put(clave, bytes, { httpMetadata: { contentType: tipo } });
  lista.push({ n, clave, bytes: bytes.length });
  await env.DB.prepare("UPDATE inspecciones SET fotos = ? WHERE numero = ?")
    .bind(JSON.stringify(lista), numero).run();
  return json({ ok: true, numero, foto: n });
}

/* POST /api/admin/inspeccion/<numero>/pdf — emitir el documento que faltó.
   El PDF se genera después del INSERT a propósito, para que un fallo al armarlo
   no pierda una visita. Pero antes NO había forma de emitirlo después: la
   familia había firmado algo que no existía como PDF y el único camino era
   reconstruirlo a mano contra la base.

   SOLO SI FALTA. Si ya hay uno, se responde 409 y no se toca: está congelado
   porque alguien lo firmó, y regenerarlo podría producir un documento distinto
   del que esa persona vio. Emitir el que falta no rompe esa regla; rehacer el
   que existe, sí. */
async function adminInspeccionEmitirPDF(request, env, numero) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const v = await env.DB.prepare("SELECT * FROM inspecciones WHERE numero = ?").bind(numero).first();
  if (!v) return json({ error: "no_encontrada" }, 404);
  if (v.pdf_key) {
    return json({ error: "ya_existe",
                  ayuda: "Este documento ya se emitió y está congelado. No se regenera: alguien lo firmó." }, 409);
  }

  /* Las firmas se recuperan de R2, que es donde quedaron aunque el PDF fallara
     — por eso se escriben ANTES de la fila. */
  const traer = async (clave) => {
    if (!clave) return null;
    const o = await env.MEDIA.get(clave);
    if (!o) return null;
    return new Uint8Array(await o.arrayBuffer());
  };
  const firmaObs = await traer(v.firma_obs_key);
  if (!firmaObs) {
    return json({ error: "sin_firma_del_observador",
                  ayuda: "No está su firma en el almacén, así que el documento no se puede emitir tal como se firmó." }, 409);
  }
  const firmaHab = await traer(v.firma_hab_key);

  let respuestas = {};
  try { respuestas = JSON.parse(v.respuestas || "{}"); } catch { respuestas = {}; }

  const bytes = await inspeccionPDF(
    { ...v, respuestas }, { obs: firmaObs, hab: firmaHab },
    new Date().toISOString().slice(0, 10)
  );
  const clave = "inspecciones/" + numero + "/inspeccion.pdf";
  await env.MEDIA.put(clave, bytes, { httpMetadata: { contentType: "application/pdf" } });
  await env.DB.prepare("UPDATE inspecciones SET pdf_key = ? WHERE numero = ?").bind(clave, numero).run();
  return json({ ok: true, numero, bytes: bytes.length });
}

/* GET /api/triage/inspeccion/<numero>.pdf — sirve el PDF CONGELADO desde R2.
   No lo regenera nunca: alguien lo firmó. Si falta, se dice que falta en vez de
   armar uno nuevo que podría no coincidir con el que se firmó. */
async function triageInspeccionPDF(env, numero, sesion) {
  const v = await env.DB.prepare("SELECT numero, pdf_key, obs_email FROM inspecciones WHERE numero = ?")
    .bind(numero).first();

  /* QUIÉN PUEDE VER ESTE DOCUMENTO. El equipo (audiencia del panel) ve todas:
     es su trabajo coordinar las visitas. Un ingeniero voluntario ve SOLO las que
     él firmó.

     Antes no había ninguna comprobación, y era un agujero de fondo: el PDF lleva
     nombre, cédula, dirección, contacto y la FIRMA del habitante, y los
     consecutivos son adivinables. Con cien voluntarios aprobados, cien personas
     podían bajarse los datos personales y la firma de todas las familias. Y
     contradecía la regla que el propio proyecto ya tenía escrita: el ingeniero
     no ve contacto ni dirección, por eso `/triaje` se los oculta.

     El MISMO 404 exista o no la inspección, y por la misma razón que el recibo
     de donación: distinguirlos convertiría esto en un oráculo para saber cuántas
     inspecciones hay y de quién. */
  const suya = v && sesion && sesion.email &&
               String(v.obs_email || "").toLowerCase() === String(sesion.email).toLowerCase();
  const puede = v && ((sesion && sesion.equipo) || suya);
  if (!puede) return json({ error: "no_encontrada" }, 404);
  if (!v.pdf_key) return json({ error: "pdf_no_generado", ayuda: "La inspección llegó pero su documento no se pudo armar. Avisa al equipo." }, 409);
  const obj = await env.MEDIA.get(v.pdf_key);
  if (!obj) return json({ error: "pdf_no_encontrado" }, 404);
  return new Response(obj.body, { headers: {
    "content-type": "application/pdf",
    "content-disposition": 'inline; filename="inspeccion-' + numero + '.pdf"',
    /* Lleva datos personales y firmas: privado y fuera de cachés compartidas. */
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow"
  }});
}

/* La pantalla. Se arma en el Worker igual que /triaje, así el catálogo de los
   26 ítems se inyecta desde `documentos.js` y no hay una segunda copia. */
/* El JS del formulario. Ojo con la plantilla: dentro de este literal las
   secuencias de escape se interpolan, así que hay que escribir \\n y \\/ — es
   la misma trampa que tumbó el panel siete horas el 12 de agosto, y el check
   #1b del gate compila lo que esto EMITE, no lo que se lee aquí. */
function inspeccionJS() {
  return `"use strict";
var DB = null, ACTUAL = null, SECS = [], AYUDA = {}, GUIA = {};

/* ---- IndexedDB. Sin librerías: el sitio es vanilla a propósito y esto tiene
   que caber en un teléfono viejo sin descargar nada. ---- */
function abrirDB(){
  return new Promise(function(res, rej){
    /* VERSIÓN 2: la 1 no tenía el almacén \`perfil\`. Añadir un almacén SIN subir\n       la versión no dispara \`onupgradeneeded\`, así que en un teléfono que ya\n       abrió la versión 1 el almacén no existiría y la transacción lanzaría.\n       Subir el número es lo único que ejecuta la migración local. */\n    var r = indexedDB.open("gg-inspecciones", 2);
    r.onupgradeneeded = function(){
      var d = r.result;
      if (!d.objectStoreNames.contains("borradores")) d.createObjectStore("borradores", { keyPath: "local_id" });
      if (!d.objectStoreNames.contains("cola"))       d.createObjectStore("cola", { keyPath: "local_id" });\n      /* Lo que NO cambia de casa en casa. Un ingeniero hace treinta en un día\n         y el municipio, su nombre y su matrícula son los mismos treinta veces\n         — y tras recargar la página se perdían. Lo encontré probando el\n         reinicio del teléfono, no leyendo el código. */\n      if (!d.objectStoreNames.contains("perfil"))     d.createObjectStore("perfil", { keyPath: "k" });
    };
    r.onsuccess = function(){ res(r.result); };
    r.onerror   = function(){ rej(r.error); };
  });
}
function tx(almacen, modo){ return DB.transaction(almacen, modo).objectStore(almacen); }
function poner(almacen, v){ return new Promise(function(res,rej){ var q=tx(almacen,"readwrite").put(v); q.onsuccess=function(){res()}; q.onerror=function(){rej(q.error)} }); }
function quitar(almacen, k){ return new Promise(function(res,rej){ var q=tx(almacen,"readwrite").delete(k); q.onsuccess=function(){res()}; q.onerror=function(){rej(q.error)} }); }
function todos(almacen){ return new Promise(function(res,rej){ var q=tx(almacen,"readonly").getAll(); q.onsuccess=function(){res(q.result||[])}; q.onerror=function(){rej(q.error)} }); }

function idNuevo(){
  /* Identificador del TELÉFONO, no consecutivo. El número real lo pone el
     servidor: dos ingenieros sin señal reclamarían el mismo. Y este id es lo
     que hace idempotente el reenvío cuando la respuesta se pierde. */
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "loc-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
}

function el(id){ return document.getElementById(id); }
function val(id){ var e = el(id); return e ? e.value.trim() : ""; }
function esc(t){ var d=document.createElement("div"); d.textContent=t==null?"":String(t); return d.innerHTML.replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

function aviso(txt, clase){
  var m = el("msg");
  m.textContent = txt;
  m.className = "aviso v " + (clase || "info");
}

/* ---- Pintar las secciones desde el catálogo del servidor ---- */
/* La referencia: lo que la guía del AIS aporta y que no cabe por ítem. Va ANTES
   de las 8 secciones porque son las tres cosas que cambian cómo se marca todo lo
   demás: el ancho de grieta según el material, la regla de la vista, y los
   límites de lo que una inspección visual puede decir. */
/* La confirmación que faltaba. Viene del SERVIDOR y no del teléfono a propósito:
   el contador de la barra dice lo que queda por enviar, y eso no es lo mismo que
   saber que algo llegó. Si aparece en esta lista, está guardado en la nube. */
function cargarMias(){
  var c = el("mias"); if (!c) return;
  c.innerHTML = '<p class="mu" style="font-size:13.5px">Consultando…</p>';
  fetch("/api/triage/mis-inspecciones").then(function(r){
    var ct = r.headers.get("content-type") || "";
    if (ct.indexOf("json") < 0) throw 0;   /* sesión caída: devuelve el login */
    return r.json();
  }).then(function(d){
    var l = d.inspecciones || [];
    if (!l.length){
      c.innerHTML = '<div class="ref"><p style="margin:0;font-size:13.5px">Todavía no ha llegado '
        + 'ninguna con tu correo. Si acabas de enviar, espera unos segundos y vuelve a consultar.</p></div>';
      return;
    }
    c.innerHTML = '<div class="ref"><p style="margin:0 0 10px;font-size:13.5px"><strong>'
      + l.length + (l.length === 1 ? " inspección" : " inspecciones") + " en el servidor"
      + (d.equipo ? " (ves todas porque entras con la cuenta del equipo)" : "") + ".</strong></p>"
      + l.map(function(v){
          var m = v.marcas || {};
          return '<div style="border-top:1px solid var(--bd);padding:9px 0;font-size:13.5px">'
            + "<strong>" + esc(v.numero) + "</strong>"
            + (v.requiere_esp ? ' <span style="color:var(--amb);font-weight:700">· revisión especializada</span>' : "")
            + "<br>" + esc(v.familia || "sin nombre de familia")
            + (v.finca ? " · " + esc(v.finca) : "")
            + "<br><small>" + esc(v.municipio || "-") + " · visita " + esc(v.fecha_visita || "-")
            + " · recibida " + esc(v.recibido_en || "-") + "</small>"
            + "<br><small>" + (m.RE || 0) + " RE · " + (m.OBS || 0) + " Obs · " + (m.SO || 0) + " S/O · "
            + (v.fotos || 0) + (v.fotos === 1 ? " foto" : " fotos") + " · "
            + (v.tiene_pdf
                ? '<a href="/api/triage/inspeccion/' + esc(v.numero) + '.pdf" target="_blank" rel="noopener">ver el documento</a>'
                : '<span style="color:var(--err)">documento pendiente</span>')
            + "</small></div>";
        }).join("") + "</div>";
  }).catch(function(){
    c.innerHTML = '<div class="ref"><p style="margin:0;font-size:13.5px">No se pudo consultar. '
      + "Si estás sin señal es normal: esta lista necesita internet. Si tienes señal, tu sesión "
      + "pudo caducar — vuelve a entrar.</p></div>";
  });
}

function pintarReferencia(){
  var c = el("referencia"); if (!c) return;
  var h = "";

  if (GUIA.reglaVista) {
    h += '<div class="ayuda" style="margin-bottom:12px">' + esc(GUIA.reglaVista) + "</div>";
  }

  if (GUIA.anchos && GUIA.anchos.length) {
    h += '<div class="ref"><h3>Ancho de grieta: NO es el mismo umbral en todos los materiales</h3>'
      +  '<table><thead><tr><th>Material</th><th>Leve</th><th>Moderado</th><th>Fuerte</th></tr></thead><tbody>';
    for (var i = 0; i < GUIA.anchos.length; i++){
      var a = GUIA.anchos[i];
      h += "<tr><td>" + esc(a.material) + "</td><td>" + esc(a.leve) + "</td><td>"
        +  esc(a.moderado) + "</td><td>" + esc(a.fuerte) + "</td></tr>";
    }
    h += "</tbody></table></div>";
  }

  if (GUIA.limites && GUIA.limites.length) {
    h += '<div class="ref"><h3>Cuatro límites de esta inspección</h3><ul>';
    for (var j = 0; j < GUIA.limites.length; j++) h += "<li>" + esc(GUIA.limites[j]) + "</li>";
    h += "</ul></div>";
  }

  if (GUIA.glosario && GUIA.glosario.length) {
    h += '<div class="ref"><h3>Palabras del formulario, explicadas</h3><dl>';
    for (var k = 0; k < GUIA.glosario.length; k++){
      var g = GUIA.glosario[k];
      /* Se MARCA lo que no viene de la guía. Presentar un término nuestro con la
         autoridad del AIS sería atribuirle algo que no dijo. */
      h += "<dt>" + esc(g.t)
        +  (g.fuente !== "AIS" ? ' <span class="propio">término nuestro</span>' : "")
        +  "</dt><dd>" + esc(g.d) + "</dd>";
    }
    h += "</dl></div>";
  }

  h += '<p style="font-size:12.5px;color:var(--mu);margin:10px 0 0">Lo anterior resume la '
    +  '<strong>Guía Técnica para la Inspección de Edificaciones Después de un Sismo</strong>, '
    +  'manual de campo del AIS y el IDIGER, 4.ª edición de 2018. Su escala oficial tiene cinco '
    +  'niveles de daño y cuatro categorías de habitabilidad con color; la nuestra es más simple a '
    +  'propósito y <strong>no clasifica habitabilidad</strong>.</p>';
  c.innerHTML = h;

  var m = el("mensaje-fam");
  if (m && GUIA.mensaje) {
    m.innerHTML = "<h3>Léele esto al habitante antes de que firme</h3>"
      + '<p style="font-size:13.5px;line-height:1.55;margin:0">' + esc(GUIA.mensaje) + "</p>";
  }
}

/* Las recomendaciones, agrupadas como las agrupa la guía. Casillas y no texto
   libre porque así se pueden CONTAR: «cuántas casas de este municipio necesitan
   evacuación» es la pregunta que va a importar el 24, y de un párrafo no sale. */
function pintarRecomienda(){
  var c = el("recomienda"); if (!c || !GUIA.recomienda) return;
  var h = "";
  for (var i = 0; i < GUIA.recomienda.length; i++){
    var g = GUIA.recomienda[i];
    h += '<div class="item"><b>' + esc(g.g) + "</b>";
    for (var j = 0; j < g.items.length; j++){
      var it = g.items[j];
      h += '<button type="button" class="btn o mini reco" data-reco="' + esc(it.id) + '"'
        +  ' aria-pressed="false" style="display:block;width:100%;text-align:left;margin:5px 0">'
        +  esc(it.t) + "</button>";
    }
    h += "</div>";
  }
  c.innerHTML = h;
}

function pintarSecciones(){
  var h = "";
  for (var i = 0; i < SECS.length; i++){
    var sec = SECS[i];
    h += "<h2>" + esc(sec.n + ". " + sec.titulo) + "</h2>";
    for (var j = 0; j < sec.items.length; j++){
      var it = sec.items[j];
      var ay = AYUDA[it.id];
      h += '<div class="item" data-id="' + esc(it.id) + '">'
        +    "<b>" + esc(it.id + "  " + it.t) + "</b>"
        /* La ayuda va PLEGADA: 19 explicaciones abiertas convertirían el
           formulario en un manual y nadie lo leería. Se abre la que hace falta,
           cuando hace falta. Los ítems que la guía del AIS no respalda no
           llevan botón, en vez de llevar una explicación inventada. */
        +    (ay ? '<button type="button" class="btn o mini ayuda-btn" style="margin-bottom:8px" data-ayuda="' + esc(it.id) + '">¿Qué estoy mirando?</button>'
                 + '<div class="ayuda" id="ay-' + esc(it.id) + '" style="display:none">' + esc(ay) + "</div>"
                 : "")
        +    '<div class="marcas">'
        +      '<button type="button" class="re" data-m="RE"  aria-pressed="false">RE</button>'
        +      '<button type="button"          data-m="OBS" aria-pressed="false">Obs</button>'
        +      '<button type="button"          data-m="SO"  aria-pressed="false">S/O</button>'
        +    "</div>"
        +    '<div class="detalle">'
        +      '<label>Observaciones</label><textarea data-campo="obs"></textarea>'
        +      '<label>Foto N.º (los que anotaste en la cámara)</label><input data-campo="fotos" inputmode="numeric" placeholder="3, 4">'
        +    "</div>"
        +  "</div>";
    }
  }
  el("secciones").innerHTML = h;
}

/* ---- Estado del borrador. SE GUARDA EN CADA CAMBIO, no al enviar: sin luz el
   teléfono se puede morir a mitad del formulario. ---- */
function leerFormulario(){
  var r = {};
  var items = document.querySelectorAll(".item[data-id]");
  for (var i = 0; i < items.length; i++){
    var nodo = items[i], id = nodo.getAttribute("data-id");
    var marcado = nodo.querySelector("[data-m][aria-pressed=true]");
    if (!marcado) continue;
    var obs = nodo.querySelector("[data-campo=obs]");
    var fot = nodo.querySelector("[data-campo=fotos]");
    r[id] = { m: marcado.getAttribute("data-m"), obs: obs ? obs.value.trim() : "", fotos: fot ? fot.value.trim() : "" };
  }
  var esp  = document.querySelector("[data-esp][aria-pressed=true]");
  var cons = document.querySelector("[data-cons][aria-pressed=true]");
  return {
    local_id: ACTUAL,
    familia: val("f-fam"), finca: val("f-finca"),
    lat: GPS.lat, lon: GPS.lon, gps_precision: GPS.precision,
    fotos: FOTOS.slice(),
    observaciones: val("f-obsgen"),
    recomendaciones: {
      marcadas: Array.prototype.slice.call(document.querySelectorAll('[data-reco][aria-pressed="true"]'))
        .map(function(b){ return b.getAttribute("data-reco"); }),
      texto: val("f-recotexto")
    },
    municipio: val("f-muni"), fecha_visita: val("f-fecha"), hora: val("f-hora"),
    casa_no: val("f-casa"), direccion: val("f-dir"), caso: val("f-caso"),
    obs_nombre: val("f-obs"), obs_matricula: val("f-mat"), obs_cc: val("f-cc"),
    propietario: val("f-prop"), contacto: val("f-cont"),
    respuestas: r,
    /* null, NO false, cuando nadie contestó. Guardar false hacía
       indistinguible «contestó NO» de «no contestó», y al reponer un borrador
       se habría marcado un NO que el ingeniero nunca dio. El servidor lo lee
       como booleano, así que null y false le llegan igual. */
    requiere_esp: esp ? esp.getAttribute("data-esp") === "1" : null,
    consent_hab: !!cons,
    hab_cc: val("f-habcc"),
    firma_obs: firmaDe("c-obs"),
    firma_hab: firmaDe("c-hab"),
    firma_hab_motivo: (el("b-nofirma") && el("b-nofirma").getAttribute("aria-pressed") === "true") ? val("f-nofirma") : "",
    creado_en: new Date().toISOString().slice(0,19).replace("T"," "),
    dispositivo: (navigator.userAgent || "").slice(0,120)
  };
}

/* ---- Fotos ----
   Se comprimen ANTES de guardarlas, y no por ahorrar red: por ahorrar
   ALMACENAMIENTO EN EL TELÉFONO. Una foto de un móvil de hoy pesa 4–12 MB; con
   treinta casas a cuatro fotos serían cientos de megas en IndexedDB, y iOS y
   Android desalojan ese almacén cuando el teléfono se llena. Comprimidas a
   1600 px de lado largo pesan 300–600 KB, que es lo medido en los casos reales
   de este proyecto.

   Se numeran en el orden en que entran, y ese número es el que la persona anota
   en «Foto N.º» de cada ítem — el papel ya había resuelto así el problema de
   asociar fotos con observaciones, y copiarlo evita una interfaz de arrastrar. */
var FOTOS = [];
var FOTO_LADO = 1600, FOTO_CALIDAD = 0.72;

function comprimirFotoInsp(file){
  return createImageBitmap(file, { imageOrientation: "from-image" }).then(function(bm){
    var esc = Math.min(1, FOTO_LADO / Math.max(bm.width, bm.height));
    var w = Math.round(bm.width * esc), h = Math.round(bm.height * esc);
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(bm, 0, 0, w, h);
    bm.close && bm.close();
    return new Promise(function(res){
      c.toBlob(function(b){ res(b || file); }, "image/jpeg", FOTO_CALIDAD);
    });
  }).catch(function(){
    /* Si el navegador no puede decodificarla (un HEIC en Chrome de Android), se
       guarda el original. Pesa más, pero perder la foto es peor: el servidor la
       rechazará y quedará contada como fallida, que es visible. */
    return file;
  });
}

function pintarFotos(){
  var l = el("fotos-lista"), e = el("fotos-est");
  if (!l || !e) return;
  var kb = FOTOS.reduce(function(a, f){ return a + (f.blob ? f.blob.size : 0); }, 0) / 1024;
  e.textContent = FOTOS.length
    ? FOTOS.length + (FOTOS.length === 1 ? " foto" : " fotos") + " · " + Math.round(kb) + " KB en el teléfono"
    : "Ninguna todavía.";
  l.innerHTML = FOTOS.map(function(f, i){
    return '<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--bd);'
         + 'border-radius:4px;padding:5px 8px;font-size:13px">N.º ' + (i + 1)
         + ' <button type="button" class="btn o mini" style="padding:2px 7px" data-quitafoto="' + i + '">quitar</button></span>';
  }).join("");
}

function agregarFotos(inp){
  var archivos = Array.prototype.slice.call(inp.files || []);
  inp.value = "";
  if (!archivos.length) return;
  var pendientes = archivos.length;
  el("fotos-est").textContent = "Preparando " + pendientes + "…";
  archivos.forEach(function(file){
    comprimirFotoInsp(file).then(function(blob){
      FOTOS.push({ blob: blob, tipo: blob.type || file.type || "image/jpeg" });
      if (--pendientes === 0){ pintarFotos(); guardarBorrador(); }
    });
  });
}

/* ---- Ubicación ----
   El GPS del teléfono NO necesita internet: el chip habla con los satélites. Es
   la única pieza de este formulario que funciona igual en la vereda que en la
   oficina, y resuelve el problema de verdad — en vereda no hay nomenclatura y
   una dirección escrita a mano no lleva a nadie de vuelta.

   NO se pide sola al abrir. Un permiso de ubicación que salta sin que nadie lo
   haya pedido se deniega por reflejo, y una vez denegado el navegador no lo
   vuelve a preguntar. Se pide cuando la persona toca el botón, que es cuando
   entiende para qué es. */
var GPS = { lat: null, lon: null, precision: null };
var CORREO = "";

function tomarGPS(){
  var e = el("gps-est");
  if (!navigator.geolocation){ e.textContent = "Este teléfono no da ubicación."; return; }
  e.textContent = "Buscando satélites… puede tardar hasta un minuto a cielo abierto.";
  navigator.geolocation.getCurrentPosition(function(pos){
    GPS.lat = pos.coords.latitude;
    GPS.lon = pos.coords.longitude;
    GPS.precision = pos.coords.accuracy;
    /* Se enseña la PRECISIÓN, no solo las coordenadas: 8 metros sirven para
       volver a la casa, 2.000 metros son el barrio y no valen para nada. Quien
       está en terreno tiene que poder decidir si vuelve a intentarlo. */
    e.textContent = "Tomada: " + GPS.lat.toFixed(5) + ", " + GPS.lon.toFixed(5)
      + " · precisión " + Math.round(GPS.precision) + " m"
      + (GPS.precision > 100 ? " — muy imprecisa, intenta a cielo abierto" : "");
    e.style.color = GPS.precision > 100 ? "var(--amb)" : "var(--ok)";
    guardarBorrador();
  }, function(err){
    e.style.color = "var(--amb)";
    e.textContent = err.code === 1
      ? "No diste permiso de ubicación. Puedes seguir sin ella, pero será más difícil volver a esta casa."
      : "No se pudo tomar la ubicación. Intenta a cielo abierto, lejos de muros.";
  }, { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 });
}

/* ---- Firmas en lienzo ----
   Eventos de PUNTERO y no de ratón ni de toque por separado: pointerdown/move/up
   cubren dedo, lápiz y ratón con un solo camino, y con setPointerCapture el
   trazo no se corta si el dedo sale del lienzo.

   Y el lienzo se dimensiona por devicePixelRatio: sin eso, en un teléfono de 3x
   la firma sale borrosa —y una firma borrosa en un documento que alguien firmó
   es justo lo que no sirve como evidencia. */
var FIRMAS = {};

function prepararLienzo(id){
  var c = el(id); if (!c) return;
  var r = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  var ancho = c.clientWidth || 300;
  c.width  = Math.round(ancho * r);
  c.height = Math.round(150 * r);
  var g = c.getContext("2d");
  g.scale(r, r);
  g.lineWidth = 2.2; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#082742";
  FIRMAS[id] = { g: g, trazos: 0, pintando: false };

  c.addEventListener("pointerdown", function(e){
    var f = FIRMAS[id];
    c.setPointerCapture(e.pointerId);
    f.pintando = true; f.trazos++;
    var p = punto(c, e);
    f.g.beginPath(); f.g.moveTo(p.x, p.y);
    e.preventDefault();
  });
  c.addEventListener("pointermove", function(e){
    var f = FIRMAS[id]; if (!f.pintando) return;
    var p = punto(c, e);
    f.g.lineTo(p.x, p.y); f.g.stroke();
    e.preventDefault();
  });
  var soltar = function(e){
    var f = FIRMAS[id]; if (!f.pintando) return;
    f.pintando = false; guardarBorrador();
    if (e && e.pointerId != null && c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
  };
  c.addEventListener("pointerup", soltar);
  c.addEventListener("pointercancel", soltar);
  c.addEventListener("pointerleave", soltar);
}

function punto(c, e){
  var b = c.getBoundingClientRect();
  return { x: e.clientX - b.left, y: e.clientY - b.top };
}

function limpiarLienzo(id){
  var c = el(id), f = FIRMAS[id]; if (!c || !f) return;
  var r = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  f.g.clearRect(0, 0, c.width / r, c.height / r);
  f.trazos = 0; guardarBorrador();
}

/* Devuelve null si NADIE trazó nada. Un lienzo en blanco convertido a PNG es un
   archivo válido de una firma inexistente: se guardaría como si alguien hubiera
   firmado. Se cuenta el trazo, no el pixel. */
function firmaDe(id){
  var f = FIRMAS[id];
  if (!f || !f.trazos) return "";
  return el(id).toDataURL("image/png");
}

var guardarPronto = null;
/* Mientras se repone un borrador NO se guarda. Reponer una firma exige cargar
   una imagen, que es asíncrono, y un guardado que cayera en esa ventana leería
   el lienzo todavía vacío y escribiría firma_obs en blanco: destruiría la firma
   que está rescatando. */
var RESTAURANDO = false;
function guardarBorrador(){
  if (RESTAURANDO) return;
  if (guardarPronto) clearTimeout(guardarPronto);
  guardarPronto = setTimeout(function(){
    var reg = leerFormulario();
    poner("borradores", reg);
    /* SOLO lo que no cambia de casa en casa. familia y finca NO entran aquí,
       y es la razón por la que no bastaba renombrar el campo anterior: si se
       quedaran pegados, la segunda casa heredaría el apellido de la primera y el
       documento diría que la inspección es de una familia que no es. */
    poner("perfil", { k: "fijos", municipio: reg.municipio, obs_nombre: reg.obs_nombre,
                      obs_matricula: reg.obs_matricula, obs_cc: reg.obs_cc })
      .then(estado);
  }, 400);
}

/* ---- La cola. Reintenta, y NO borra nada que no se haya confirmado. ---- */
/* DOS TRAMOS, y el orden importa: primero la inspección en JSON, después las
   fotos de a una.

   Los Blob NO sobreviven a JSON.stringify —se convertirían en {}— así que las
   fotos no pueden viajar en el mismo cuerpo. Y separarlas tiene una ventaja: si
   la señal se corta a mitad de las fotos, el reintento NO vuelve a crear la
   inspección (la idempotencia devuelve su mismo número) y solo sube las que
   faltan, porque cada una queda marcada en la cola en cuanto se guarda. Sin esa
   marca, cada reintento duplicaría las fotos ya subidas. */
function enviarFotos(reg, numero){
  var pend = (reg.fotos || []).filter(function(f){ return f && f.blob && !f.subida; });
  if (!pend.length) return Promise.resolve({ estado: "ok", numero: numero });
  var i = 0;
  function paso(){
    if (i >= pend.length) return Promise.resolve({ estado: "ok", numero: numero });
    var f = pend[i++];
    return fetch("/api/triage/inspeccion/" + encodeURIComponent(numero) + "/foto", {
      method: "POST", headers: { "content-type": f.tipo || "image/jpeg" }, body: f.blob
    }).then(function(r){
      var ct = r.headers.get("content-type") || "";
      if (ct.indexOf("json") < 0) return { estado: "sesion" };
      if (r.ok){
        f.subida = true;
        /* Se persiste el avance ANTES de seguir: si el teléfono se muere en la
           foto 3 de 5, al volver solo sube las dos que faltan. */
        return poner("cola", reg).then(paso);
      }
      /* Un rechazo por lo que la foto ES —tipo, tamaño, tope— no mejora
         reintentando. Se marca como resuelta para no atascar la cola, y el
         conteo del panel enseñará que llegaron menos de las que se tomaron. */
      if (r.status === 413 || r.status === 415 || r.status === 409){
        f.subida = true; f.rechazada = true;
        return poner("cola", reg).then(paso);
      }
      return { estado: "reintentar" };
    }).catch(function(){ return { estado: "reintentar" }; });
  }
  return paso();
}

function enviarUno(reg){
  /* Los blobs se quitan del cuerpo a mano: JSON.stringify los dejaría en {} y el
     servidor recibiría basura donde espera nada. */
  var cuerpo = {};
  for (var k in reg) if (k !== "fotos") cuerpo[k] = reg[k];
  cuerpo.fotos_tomadas = (reg.fotos || []).length;

  return fetch("/api/triage/inspeccion", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo)
  }).then(function(r){
    var ct = r.headers.get("content-type") || "";
    /* DETRÁS DE ACCESS UNA SESIÓN EXPIRADA DEVUELVE EL HTML DEL LOGIN, no un
       error. Tratarlo como éxito borraría de la cola una inspección firmada que
       nunca llegó. Se exige JSON, no solo un 200. */
    if (ct.indexOf("json") < 0) {
      return { estado: "sesion" };
    }
    return r.json().then(function(d){
      if (r.ok && d.ok){
        /* La inspección ya está a salvo. Las fotos van después, y si fallan el
           registro se queda en la cola para reintentarlas — no para volver a
           crear la inspección. */
        return enviarFotos(reg, d.numero).then(function(res){
          if (res.estado !== "ok") return res;
          return { estado: "ok", numero: d.numero, repetida: !!d.repetida };
        });
      }
      /* 422 y 400 son de los DATOS: reintentar no arregla nada y quedaría
         atascada para siempre. Se marca y se avisa. */
      if (r.status === 422 || r.status === 400) return { estado: "rechazada", d: d };
      return { estado: "reintentar" };
    });
  }).catch(function(){ return { estado: "reintentar" }; });
}

/* UNA SOLA CORRIDA A LA VEZ. Se llama desde el botón «Enviar» y desde el evento
   online: tocar el botón justo cuando vuelve la señal lanzaba DOS vaciados
   sobre la misma cola, y los dos posteaban el mismo registro. El servidor tiene
   su propio candado (índice único), pero dejar que el cliente dispare el choque
   es pedirle a la base que arregle lo que aquí sobra. */
var VACIANDO = false;
function vaciarCola(){
  if (VACIANDO) return Promise.resolve();
  VACIANDO = true;
  return todos("cola").then(function(l){
    if (!l.length) { VACIANDO = false; estado(); return; }
    var i = 0, enviadas = 0, repes = 0, malas = 0, sesionCaida = false, sinBorrar = 0;
    function paso(){
      if (i >= l.length){
        VACIANDO = false;
        estado();
        if (sesionCaida) aviso("Tu sesión caducó. Vuelve a entrar y toca Enviar otra vez: nada se perdió.", "mal");
        else if (malas)  aviso("Quedaron " + malas + " sin enviar por datos incompletos. Ábrelas y complétalas.", "mal");
        else if (sinBorrar) {
          /* Llegaron al servidor pero no se pudieron quitar del teléfono, así
             que el contador NO va a bajar. Se dice, porque un contador que no
             baja después de enviar es justo lo que hace pensar que no llegó. */
          aviso("Enviadas " + enviadas + ", pero " + sinBorrar + " siguen contando en el teléfono. "
            + "Ya están a salvo: si las envías otra vez el servidor las reconoce y no se duplican.", "info");
          cargarMias();
        }
        else if (enviadas || repes) { aviso("Enviadas " + enviadas + (repes ? " (" + repes + " ya estaban)" : "") + ".", "bien"); cargarMias(); }
        else aviso("Sin señal todavía. Quedan guardadas en el teléfono.", "info");
        return;
      }
      var reg = l[i++];
      enviarUno(reg).then(function(res){
        if (res.estado === "ok"){
          if (res.repetida) repes++; else enviadas++;
          /* SI EL BORRADO LOCAL FALLA, SE SIGUE. Antes "quitar" rechazaba sin
             manejador: "paso" no se volvía a llamar, VACIANDO se quedaba en
             true y la cola NO se vaciaba nunca más en lo que durara la pantalla.
             El síntoma en terreno habría sido el peor conocido —«toco Enviar y
             no pasa nada»— y la única salida, cerrar y reabrir sin saber por
             qué. La inspección ya está en el servidor; que se quede una vez más
             en la cola es inofensivo porque el envío es idempotente. */
          quitar("cola", reg.local_id).then(paso, function(){ sinBorrar++; paso(); });
          return;
        }
        if (res.estado === "sesion")   { sesionCaida = true; paso(); return; }
        if (res.estado === "rechazada"){ malas++; paso(); return; }
        paso();
      }, function(){
        /* "enviarUno" ya atrapa lo suyo y no debería rechazar. Esto es el
           cinturón: una sola promesa rota aquí congelaba toda la cola. */
        paso();
      });
    }
    paso();
  }).catch(function(){
    /* Leer la cola también puede fallar —el almacén se cierra si el navegador
       recicla la pestaña— y sin esto la bandera quedaba levantada para siempre. */
    VACIANDO = false;
    aviso("No se pudo leer la cola de este teléfono. NO borres nada: cierra esta pantalla y vuelve a abrirla.", "mal");
  });
}

function estado(){
  return todos("cola").then(function(c){
    el("n-pend").textContent = c.length;
    var partes = [];
    partes.push(navigator.onLine ? "Con señal" : "SIN SEÑAL — puedes seguir llenando");
    partes.push(c.length ? c.length + " por enviar" : "nada pendiente");
    el("est").textContent = partes.join(" · ");
    if (c.length && navigator.onLine) el("b-cola").disabled = false;
    return c.length;
  }).catch(function(){
    /* Antes se quedaba con el número viejo en pantalla, que es peor que no
       tener número: parece un dato y no lo es. */
    el("n-pend").textContent = "?";
    el("est").textContent = "No se pudo leer lo guardado en este teléfono.";
    return 0;
  });
}

/* ---- LOS BORRADORES, Y POR QUÉ ESTA PANTALLA TENÍA QUE EXISTIR ----
   guardarBorrador() escribía el registro COMPLETO —las 26 respuestas, las fotos
   y las DOS firmas— en cada cambio, y nada lo volvía a leer nunca: todos("cola")
   aparecía dos veces en el archivo y todos("borradores") ninguna. Un teléfono
   que se bloqueaba a mitad del formulario dejaba la inspección íntegra guardada
   y fuera de alcance, y el contador de la barra cuenta la COLA, así que marcaba
   0 y todo parecía perdido.

   Lo único que sí se reponía era el perfil —municipio, nombre, matrícula—, que
   es justo lo que hacía creer que el formulario se había acordado de todo.

   Encontrado el 22 de agosto de 2026 buscando inspecciones que los ingenieros
   habían llenado y que nunca llegaron. Estaban en los teléfonos. ---- */

/* Un borrador nace al primer tecleo, así que la mayoría son cascarones: el
   municipio y el nombre que el perfil acaba de reponer. Se listan solo los que
   tienen algo de LA CASA, o la lista se llenaría de ruido y el ingeniero no
   distinguiría lo que de verdad quedó a medias. */
function borradorVale(b){
  if (!b) return false;
  var n = b.respuestas ? Object.keys(b.respuestas).length : 0;
  return !!(b.familia || b.finca || b.direccion || b.propietario || n
            || (b.fotos && b.fotos.length) || b.firma_obs || b.observaciones);
}

function cargarBorradores(){
  var c = el("borr"); if (!c) return Promise.resolve(0);
  return todos("borradores").then(function(l){
    /* Se excluye la que está ABIERTA en pantalla. Si no, el número contaría la
       casa que el ingeniero está llenando en este momento y «sin terminar»
       pasaría a significar dos cosas a la vez: lo que se perdió de vista y lo
       que tiene delante. Al recargar, ACTUAL es un id nuevo y todas vuelven. */
    var u = l.filter(function(b){ return borradorVale(b) && b.local_id !== ACTUAL; });
    u.sort(function(a,b){ return String(b.creado_en||"").localeCompare(String(a.creado_en||"")); });
    if (el("n-borr")) el("n-borr").textContent = u.length;
    if (!u.length){
      c.innerHTML = '<p class="mu" style="font-size:13.5px">Nada a medias. Todo lo que llenaste '
        + 'ya pasó a la cola de envío.</p>';
      return 0;
    }
    c.innerHTML = '<div class="ref"><p style="margin:0 0 10px;font-size:13.5px"><strong>'
      + u.length + (u.length === 1 ? " inspección sin terminar" : " inspecciones sin terminar")
      + ' en este teléfono.</strong> Ábrela, revísala de arriba abajo y toca «Guardar inspección».</p>'
      + u.map(function(b){
          var n = b.respuestas ? Object.keys(b.respuestas).length : 0;
          var nf = (b.fotos && b.fotos.length) || 0;
          return '<div style="border-top:1px solid var(--bd);padding:10px 0;font-size:13.5px">'
            + "<strong>" + esc(b.familia || "sin nombre de familia") + "</strong>"
            + (b.finca ? " · " + esc(b.finca) : "")
            + "<br><small>" + esc(b.municipio || "-")
            + (b.direccion ? " · " + esc(b.direccion) : "")
            + " · " + esc(String(b.creado_en || "-").slice(0,16)) + "</small>"
            + "<br><small>" + n + (n === 1 ? " ítem marcado" : " ítems marcados")
            + " · " + nf + (nf === 1 ? " foto" : " fotos")
            + " · tu firma: " + (b.firma_obs ? "sí" : "NO")
            + " · la del habitante: "
            + (b.firma_hab ? "sí" : (b.firma_hab_motivo ? "no pudo firmar" : "NO"))
            + "</small><br>"
            + '<button type="button" class="btn mini" style="margin-top:8px" data-abreborr="'
            + esc(b.local_id) + '">Abrir y terminar</button> '
            + '<button type="button" class="btn o mini" style="margin-top:8px" data-tiraborr="'
            + esc(b.local_id) + '">Descartar</button>'
            + "</div>";
        }).join("") + "</div>";
    return u.length;
  }).catch(function(){
    c.innerHTML = '<p class="mu" style="font-size:13.5px">No se pudo leer lo guardado en este '
      + 'teléfono. NO borres nada y avisa al equipo.</p>';
    return 0;
  });
}

function abrirBorrador(id){
  var q = tx("borradores", "readonly").get(id);
  q.onsuccess = function(){
    if (!q.result){ aviso("Ese borrador ya no está en el teléfono.", "mal"); cargarBorradores(); return; }
    escribirFormulario(q.result);
    aviso("Recuperada. Revísala de arriba abajo y toca «Guardar inspección».", "bien");
    window.scrollTo(0, 0);
  };
  q.onerror = function(){ aviso("No se pudo abrir. NO borres nada y avisa al equipo.", "mal"); };
}

/* Se pregunta antes, y se dice que no hay vuelta atrás: es el único botón de
   esta pantalla que destruye trabajo de alguien. */
function tirarBorrador(id){
  if (!window.confirm("¿Descartar esta inspección a medias? No se puede recuperar.")) return;
  quitar("borradores", id).then(function(){
    aviso("Descartada.", "info");
    cargarBorradores();
  }).catch(function(){ aviso("No se pudo descartar.", "mal"); });
}

/* El inverso de leerFormulario(), campo por campo a propósito y no con un bucle
   sobre las claves: los nombres del registro y los del formulario no coinciden
   —familia es f-fam, direccion es f-dir— y un bucle «listo» dejaría campos sin
   reponer EN SILENCIO, que es exactamente la clase de error que esto arregla. */
function escribirFormulario(reg){
  RESTAURANDO = true;
  ACTUAL = reg.local_id || idNuevo();

  document.querySelectorAll("[aria-pressed=true]").forEach(function(x){ x.setAttribute("aria-pressed","false"); });
  document.querySelectorAll(".item.abierto").forEach(function(x){ x.classList.remove("abierto"); });
  document.querySelectorAll("[data-campo]").forEach(function(x){ x.value = ""; });

  var p = function(id, v){ var e = el(id); if (e) e.value = (v == null ? "" : String(v)); };
  p("f-fam",  reg.familia);       p("f-finca", reg.finca);
  p("f-muni", reg.municipio);     p("f-fecha", reg.fecha_visita);
  p("f-hora", reg.hora);          p("f-casa",  reg.casa_no);
  p("f-dir",  reg.direccion);     p("f-caso",  reg.caso);
  p("f-obs",  reg.obs_nombre);    p("f-mat",   reg.obs_matricula);
  p("f-cc",   reg.obs_cc);        p("f-prop",  reg.propietario);
  p("f-cont", reg.contacto);      p("f-habcc", reg.hab_cc);
  p("f-obsgen", reg.observaciones);
  p("f-obs2",   reg.obs_nombre);
  p("f-recotexto", reg.recomendaciones && reg.recomendaciones.texto);

  /* Las claves y las marcas se validan antes de entrar en un selector. Vienen
     del propio teléfono, pero es dato guardado y el selector es código: la misma
     regla que ya gobierna las respuestas en el servidor. */
  var r = reg.respuestas || {};
  Object.keys(r).forEach(function(k){
    if (!/^[0-9.]{1,12}$/.test(k)) return;
    var nodo = document.querySelector('.item[data-id="' + k + '"]'); if (!nodo) return;
    var m = r[k] && r[k].m;
    if (["RE","OBS","SO"].indexOf(m) < 0) return;
    var b = nodo.querySelector('[data-m="' + m + '"]');
    if (b) b.setAttribute("aria-pressed", "true");
    var o = nodo.querySelector("[data-campo=obs]");   if (o) o.value = r[k].obs   || "";
    var f = nodo.querySelector("[data-campo=fotos]"); if (f) f.value = r[k].fotos || "";
    nodo.classList.toggle("abierto", m !== "SO");
  });

  if (reg.requiere_esp === true || reg.requiere_esp === false){
    var esp = document.querySelector('[data-esp="' + (reg.requiere_esp ? "1" : "0") + '"]');
    if (esp) esp.setAttribute("aria-pressed", "true");
  }
  if (reg.consent_hab && el("b-cons")) el("b-cons").setAttribute("aria-pressed", "true");

  ((reg.recomendaciones && reg.recomendaciones.marcadas) || []).forEach(function(id){
    var limpio = String(id).replace(/[^A-Za-z0-9_-]/g, "");
    if (!limpio) return;
    var b = document.querySelector('[data-reco="' + limpio + '"]');
    if (b) b.setAttribute("aria-pressed", "true");
  });

  FOTOS = (reg.fotos || []).filter(function(f){ return f && f.blob; });
  pintarFotos();

  GPS = { lat: reg.lat == null ? null : reg.lat,
          lon: reg.lon == null ? null : reg.lon,
          precision: reg.gps_precision == null ? null : reg.gps_precision };
  if (el("gps-est")){
    if (GPS.lat == null || GPS.lon == null){
      el("gps-est").textContent = "Sin tomar."; el("gps-est").style.color = "var(--mu)";
    } else {
      el("gps-est").textContent = "Recuperada: " + Number(GPS.lat).toFixed(5) + ", "
        + Number(GPS.lon).toFixed(5)
        + (GPS.precision == null ? "" : " · precisión " + Math.round(GPS.precision) + " m");
      el("gps-est").style.color = "var(--ok)";
    }
  }

  var nof = el("b-nofirma");
  if (nof){
    var sinFirma = !reg.firma_hab && !!reg.firma_hab_motivo;
    nof.setAttribute("aria-pressed", sinFirma ? "true" : "false");
    el("caja-nofirma").style.display = sinFirma ? "block" : "none";
    p("f-nofirma", sinFirma ? reg.firma_hab_motivo : "");
  }

  limpiarLienzo("c-obs"); limpiarLienzo("c-hab");
  /* La bandera se baja SOLO cuando las dos imágenes terminaron, y también si
     fallan: dejarla arriba congelaría el autoguardado para el resto del día. */
  Promise.all([dibujarFirma("c-obs", reg.firma_obs), dibujarFirma("c-hab", reg.firma_hab)])
    .then(function(){ RESTAURANDO = false; });
}

/* ---- EL RESPALDO, Y PARA QUÉ SIRVE ----
   Lo guardado en el teléfono no se puede mirar ni mandar: vive en IndexedDB, que
   no es un archivo y no sale de ahí por WhatsApp. Mientras la única salida sea
   que el propio formulario logre enviarlo, cualquier fallo que no hayamos
   previsto vuelve a ser un callejón sin salida — y eso es justo lo que acabamos
   de vivir.

   Esto lo convierte en UN ARCHIVO que una persona puede mandar. Funciona sin
   señal: se baja al teléfono y se envía cuando haya. ---- */
function blobABase64(b){
  return new Promise(function(res, rej){
    var r = new FileReader();
    r.onload  = function(){ var t = String(r.result); res(t.slice(t.indexOf(",") + 1)); };
    r.onerror = function(){ rej(r.error); };
    r.readAsDataURL(b);
  });
}

/* Las fotos se convierten DE UNA EN UNA. Treinta casas con cuatro fotos son 120
   lecturas en paralelo, y un teléfono modesto se queda sin memoria a mitad y no
   baja nada. En serie tarda más y termina. */
function empacar(lista, donde){
  var salida = [], i = 0;
  function paso(){
    if (i >= lista.length) return Promise.resolve(salida);
    var reg = lista[i++];
    var fs = (reg.fotos || []).filter(function(f){ return f && f.blob; });
    var j = 0, fotos = [];
    function foto(){
      if (j >= fs.length) return Promise.resolve();
      var f = fs[j++];
      return blobABase64(f.blob).then(function(b64){
        fotos.push({ tipo: f.tipo || "image/jpeg", b64: b64 });
        return foto();
      }).catch(foto);
    }
    return foto().then(function(){
      var copia = {};
      for (var k in reg) if (k !== "fotos") copia[k] = reg[k];
      copia.fotos = fotos;
      copia._donde = donde;
      salida.push(copia);
      return paso();
    });
  }
  return paso();
}

function sinTildes(t){
  /* Los escapes van DOBLES: esto vive dentro de una plantilla, y escritos
     sencillos la plantilla los resolvía a los caracteres combinantes
     literales. Funcionaba, y es la clase de cosa que un editor rompe sin
     que nada avise. */
  return String(t || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
}

function respaldo(){
  var b = el("b-resp"); if (!b) return;
  b.disabled = true; b.textContent = "Empacando…";
  var soltar = function(){ b.disabled = false; b.textContent = "Bajar respaldo de todo"; };
  Promise.all([todos("borradores"), todos("cola")]).then(function(par){
    var brr = par[0].filter(borradorVale);
    if (!brr.length && !par[1].length){
      soltar();
      aviso("No hay nada que respaldar: el teléfono está vacío.", "info");
      return;
    }
    return empacar(brr, "borrador").then(function(a){
      return empacar(par[1], "cola").then(function(c){
        var doc = {
          respaldo: "inspecciones-mira-mi-casa", version: 1,
          generado_en: new Date().toISOString().slice(0,19).replace("T"," "),
          correo: CORREO,
          observador: val("f-obs"),
          dispositivo: (navigator.userAgent || "").slice(0,160),
          cola: c, borradores: a
        };
        var arch = new Blob([JSON.stringify(doc)], { type: "application/json" });
        var nombre = "respaldo-inspecciones-"
          + (sinTildes(val("f-obs")) || "sin-nombre").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          + "-" + new Date().toISOString().slice(0,10) + ".json";
        var u = URL.createObjectURL(arch);
        var a2 = document.createElement("a");
        a2.href = u; a2.download = nombre;
        document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
        setTimeout(function(){ URL.revokeObjectURL(u); }, 8000);
        soltar();
        var mb = arch.size / 1048576;
        /* Se avisa del tamaño porque las fotos pesan y WhatsApp tiene tope: es
           mejor saberlo aquí que descubrirlo cuando el envío falle y nadie
           entienda por qué. */
        aviso("Respaldo bajado: " + nombre + " · "
          + (mb >= 1 ? mb.toFixed(1) + " MB" : Math.round(arch.size / 1024) + " KB") + " · "
          + c.length + " por enviar y " + a.length + " a medias. Búscalo en Descargas."
          + (mb > 40 ? " OJO: pesa mucho para WhatsApp — avisa al equipo antes de mandarlo."
                     : " Mándalo al equipo por WhatsApp."), mb > 40 ? "info" : "bien");
      });
    });
  }).catch(function(){
    soltar();
    aviso("No se pudo armar el respaldo. NO borres nada y avisa al equipo.", "mal");
  });
}

/* Se repone el trazo Y el contador: firmaDe() cuenta TRAZOS, no pixeles, así que
   una firma dibujada sin subir el contador se guardaría como inexistente.
   Y se escala CONSERVANDO LA PROPORCIÓN, porque el lienzo puede tener otro ancho
   que cuando se firmó —otra orientación, otro teléfono— y estirarla deformaría
   la firma de una persona en el documento que esa persona firmó. */
function dibujarFirma(id, dato){
  return new Promise(function(res){
    var c = el(id), f = FIRMAS[id];
    if (!dato || !c || !f){ res(); return; }
    var im = new Image();
    im.onload = function(){
      var r = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      var aw = c.width / r, ah = c.height / r;
      var k = Math.min(aw / im.width, ah / im.height, 1);
      f.g.drawImage(im, 0, 0, im.width * k, im.height * k);
      f.trazos = 1;
      res();
    };
    im.onerror = function(){ res(); };
    im.src = dato;
  });
}

/* ---- Preparación explícita. Sin esto el formulario NO abre en la vereda:
   un service worker solo guarda lo que se le pidió. ---- */
function preparar(){
  var p = el("prep");
  if (!("serviceWorker" in navigator)) {
    p.className = "aviso mal v";
    p.textContent = "Este navegador no puede trabajar sin señal. Usa Chrome o Safari actualizados.";
    return;
  }
  navigator.serviceWorker.register("/triaje/inspeccion-sw.js", { scope: "/triaje/" }).then(function(){
    var pedir = (navigator.storage && navigator.storage.persist)
      ? navigator.storage.persist() : Promise.resolve(false);
    return pedir.then(function(duradero){
      var extra = duradero
        ? "El teléfono no va a borrar lo guardado."
        : "OJO: el sistema podría borrar lo guardado si el teléfono se llena. Envía en cuanto tengas señal.";
      p.className = "aviso bien v";
      p.textContent = "Listo para trabajar sin señal. " + extra;
    });
  }).catch(function(){
    p.className = "aviso mal v";
    p.textContent = "No se pudo preparar. Con internet, recarga esta pantalla e intenta otra vez.";
  });
}

function INSP_ARRANCA(paquete){
  var G = paquete || {};
  SECS  = G.secciones || [];
  CORREO = G.correo || "";
  AYUDA = G.ayuda || {};
  GUIA  = G;
  pintarReferencia();
  pintarRecomienda();
  pintarSecciones();
  ACTUAL = idNuevo();
  var f = el("f-fecha"); if (f && !f.value) f.value = new Date().toISOString().slice(0,10);
  prepararLienzo("c-obs"); prepararLienzo("c-hab");
  /* El nombre del observador se copia al pie de su firma. No se puede escribir
     ahí: son el mismo dato y dos casillas se separarían. */
  var refl = function(){ if (el("f-obs2")) el("f-obs2").value = val("f-obs"); };
  refl();
  if (el("f-obs")) el("f-obs").addEventListener("input", refl);
  /* Si el teléfono gira, el lienzo cambia de ancho y el trazo se deformaría.
     Se rehace vacío y se avisa, en vez de guardar una firma estirada. */
  window.addEventListener("orientationchange", function(){
    setTimeout(function(){
      prepararLienzo("c-obs"); prepararLienzo("c-hab");
      aviso("Giraste el teléfono: las firmas se borraron. Vuelve a firmar.", "info");
    }, 350);
  });

  abrirDB().then(function(d){
    DB = d;
    /* Se repone lo fijo ANTES de nada: si el teléfono se reinició en la vereda,
       reescribir municipio y matrícula treinta veces es lo que hace que alguien
       deje de usar la herramienta. */
    var g = tx("perfil", "readonly").get("fijos");
    g.onsuccess = function(){
      var f = g.result; if (!f) return;
      if (f.municipio     && !val("f-muni")) el("f-muni").value = f.municipio;
      if (f.obs_nombre    && !val("f-obs"))  el("f-obs").value  = f.obs_nombre;
      if (f.obs_matricula && !val("f-mat"))  el("f-mat").value  = f.obs_matricula;
      if (f.obs_cc        && !val("f-cc"))   el("f-cc").value   = f.obs_cc;
    };
    estado();
    /* Se listan SOLOS al abrir. Detrás de un botón, quien no sabe que perdió
       algo nunca lo tocaría — y es justo esa persona la que hay que avisar. */
    cargarBorradores();
    var p = el("prep");
    p.className = "aviso info v";
    p.textContent = navigator.serviceWorker && navigator.serviceWorker.controller
      ? "Preparado para trabajar sin señal."
      : "Toca «Preparar» ANTES de salir a zona sin señal.";
  }).catch(function(){
    aviso("Este navegador no deja guardar en el teléfono. No trabajes sin señal con él.", "mal");
  });

  document.addEventListener("click", function(e){
    var b = e.target.closest("button[data-m]");
    if (b){
      var caja = b.closest(".item");
      var hermanos = caja.querySelectorAll("button[data-m]");
      for (var i=0;i<hermanos.length;i++) hermanos[i].setAttribute("aria-pressed","false");
      b.setAttribute("aria-pressed","true");
      /* El detalle se abre solo si hay algo que contar. «Sin observación
         aparente» no necesita texto, y abrirlo invitaría a rellenar por
         rellenar — el papel tampoco lo pide. */
      caja.classList.toggle("abierto", b.getAttribute("data-m") !== "SO");
      guardarBorrador(); return;
    }
    var esp = e.target.closest("button[data-esp]");
    if (esp){
      var g = document.querySelectorAll("button[data-esp]");
      for (var k=0;k<g.length;k++) g[k].setAttribute("aria-pressed","false");
      esp.setAttribute("aria-pressed","true"); guardarBorrador(); return;
    }
    var cons = e.target.closest("button[data-cons]");
    if (cons){
      cons.setAttribute("aria-pressed", cons.getAttribute("aria-pressed") === "true" ? "false" : "true");
      guardarBorrador(); return;
    }
    var rc = e.target.closest("[data-reco]");
    if (rc){
      rc.setAttribute("aria-pressed", rc.getAttribute("aria-pressed") === "true" ? "false" : "true");
      guardarBorrador(); return;
    }
    var ab = e.target.closest("[data-ayuda]");
    if (ab){
      var caja = el("ay-" + ab.getAttribute("data-ayuda"));
      if (caja) caja.style.display = caja.style.display === "none" ? "block" : "none";
      return;
    }
    var lim = e.target.closest("[data-limpiar]");
    if (lim){ limpiarLienzo(lim.getAttribute("data-limpiar")); return; }
    var nf = e.target.closest("#b-nofirma");
    if (nf){
      var activo = nf.getAttribute("aria-pressed") !== "true";
      nf.setAttribute("aria-pressed", activo ? "true" : "false");
      el("caja-nofirma").style.display = activo ? "block" : "none";
      /* Si no pudo firmar, se borra lo que hubiera en su lienzo: dejar un trazo
         a medias junto a un motivo sería contradecirse en el documento. */
      if (activo) limpiarLienzo("c-hab");
      guardarBorrador(); return;
    }
    var qf = e.target.closest("[data-quitafoto]");
    if (qf){ FOTOS.splice(Number(qf.getAttribute("data-quitafoto")), 1); pintarFotos(); guardarBorrador(); return; }
    var abb = e.target.closest("[data-abreborr]");
    if (abb){ abrirBorrador(abb.getAttribute("data-abreborr")); return; }
    var tbb = e.target.closest("[data-tiraborr]");
    if (tbb){ tirarBorrador(tbb.getAttribute("data-tiraborr")); return; }
    if (e.target.closest("#b-borr")) { cargarBorradores(); return; }
    if (e.target.closest("#b-resp")) { respaldo(); return; }
    if (e.target.closest("#b-mias"))  { cargarMias(); return; }
    if (e.target.closest("#b-gps"))   { tomarGPS(); return; }
    if (e.target.closest("#b-prep"))  { preparar(); return; }
    if (e.target.closest("#b-cola"))  { aviso("Enviando…", "info"); vaciarCola(); return; }
    if (e.target.closest("#b-guardar")){ guardarInspeccion(); return; }
  });

  document.addEventListener("change", function(e){
    if (e.target.id === "f-fotos") agregarFotos(e.target);
  });
  document.addEventListener("input", function(e){
    if (e.target.matches("input,textarea")) guardarBorrador();
  });

  window.addEventListener("online",  function(){ estado(); vaciarCola(); });
  window.addEventListener("offline", estado);
}

function guardarInspeccion(){
  var reg = leerFormulario();
  var faltan = [];
  if (!reg.municipio)    faltan.push("municipio");
  if (!reg.fecha_visita) faltan.push("fecha de la visita");
  if (!reg.familia)      faltan.push("el nombre de la familia");
  if (!reg.obs_nombre)   faltan.push("tu nombre");
  if (faltan.length){ aviso("Falta: " + faltan.join(", ") + ".", "mal"); return; }
  if (!reg.consent_hab){ aviso("Falta la autorización del habitante. Léele el alcance y márcala.", "mal"); return; }
  if (!reg.firma_obs){ aviso("Falta tu firma. Eres quien responde por lo que escribiste.", "mal"); return; }
  if (!reg.firma_hab && !reg.firma_hab_motivo){
    aviso("Falta la firma del habitante. Si no pudo firmar, toca «No pudo firmar» y escribe por qué.", "mal"); return;
  }

  el("b-guardar").disabled = true;
  /* A LA COLA PRIMERO, y solo después se limpia la pantalla. Si se limpiara
     antes y la escritura fallara, la inspección se perdería con el habitante
     ya despedido en la puerta. */
  poner("cola", reg).then(function(){
    return quitar("borradores", reg.local_id);
  }).then(function(){
    ACTUAL = idNuevo();
    document.querySelectorAll("input,textarea").forEach(function(x){
      if (x.id === "f-muni" || x.id === "f-obs" || x.id === "f-mat" || x.id === "f-cc" || x.id === "f-fecha") return;
      x.value = "";
    });
    document.querySelectorAll("[aria-pressed=true]").forEach(function(x){ x.setAttribute("aria-pressed","false"); });
    document.querySelectorAll(".item.abierto").forEach(function(x){ x.classList.remove("abierto"); });
    limpiarLienzo("c-obs"); limpiarLienzo("c-hab");
    /* La ubicación es de ESTA casa: se borra con el resto. Dejarla pegada
       pondría las coordenadas de la casa anterior en la siguiente. */
    GPS = { lat: null, lon: null, precision: null };
    FOTOS = []; pintarFotos();
    document.querySelectorAll('[data-reco][aria-pressed="true"]').forEach(function(b){ b.setAttribute("aria-pressed","false"); });
    if (el("gps-est")){ el("gps-est").textContent = "Sin tomar."; el("gps-est").style.color = "var(--mu)"; }
    if (el("b-nofirma")){ el("b-nofirma").setAttribute("aria-pressed","false"); el("caja-nofirma").style.display="none"; }
    if (el("f-obs2")) el("f-obs2").value = val("f-obs");
    el("b-guardar").disabled = false;
    aviso("Guardada en el teléfono. " + (navigator.onLine ? "Enviando…" : "Se enviará sola cuando haya señal."), "bien");
    estado();
    /* La lista de lo que queda a medias se refresca AQUÍ. Sin esto el contador
       seguía marcando la que acabas de terminar, y una cuenta que no baja es lo
       que hizo perder la confianza en la anterior. */
    cargarBorradores();
    if (navigator.onLine) vaciarCola();
  }).catch(function(){
    el("b-guardar").disabled = false;
    aviso("NO se pudo guardar en el teléfono. No borres nada y avisa al equipo.", "mal");
  });
}
`;
}

function inspeccionHTML(seccionesJSON, alcance, consentTexto) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Inspección visual preliminar · Give&amp;Grow</title>
<style>
:root{--az:#0D3B66;--az2:#12507F;--tinta:#082742;--pap:#FBFAF7;--sup:#fff;
  --bd:#CBD5DD;--mu:#56697A;--amb:#B57500;--ok:#0F6B3F;--err:#B3261E}
*{box-sizing:border-box}
body{margin:0;background:var(--pap);color:var(--tinta);
  font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:680px;margin:0 auto;padding:16px 16px 96px}
h1{font-size:22px;line-height:1.2;margin:6px 0 4px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--az);
  margin:26px 0 8px;padding-bottom:6px;border-bottom:2px solid var(--az)}
.ey{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.alcance{background:var(--sup);border:1px solid var(--bd);border-left:3px solid var(--amb);
  border-radius:3px;padding:12px 14px;font-size:13.5px;line-height:1.5;color:#33475b;margin:14px 0}
label{display:block;font-size:13px;font-weight:600;margin:12px 0 4px}
input,textarea,select{width:100%;padding:11px 12px;border:1px solid var(--bd);
  border-radius:6px;font-size:16px;font-family:inherit;background:var(--sup);color:var(--tinta)}
textarea{min-height:64px;resize:vertical}
.item{border:1px solid var(--bd);border-radius:6px;background:var(--sup);padding:12px;margin:10px 0}
.item>b{display:block;font-size:14.5px;font-weight:600;line-height:1.4;margin-bottom:10px}
.marcas{display:flex;gap:6px}
.marcas button{flex:1;padding:10px 4px;border:1.5px solid var(--bd);border-radius:6px;
  background:var(--sup);font-size:12.5px;font-weight:700;cursor:pointer;color:var(--mu)}
.marcas button[aria-pressed=true]{background:var(--az);border-color:var(--az);color:#fff}
.marcas button.re[aria-pressed=true]{background:var(--amb);border-color:var(--amb);color:#fff}
.detalle{margin-top:10px;display:none}
.item.abierto .detalle{display:block}
/* La barra se APILA: en 375 px el estado y dos botones en una fila estrangulan
   el texto en tres líneas y encogen los botones justo donde se toca con una
   mano. El estado va arriba, ancho completo, y los botones debajo. */
.barra{position:fixed;left:0;right:0;bottom:0;background:var(--sup);
  border-top:1px solid var(--bd);padding:8px 12px 10px;display:flex;
  flex-direction:column;gap:7px}
.barra .est{font-size:12.5px;line-height:1.3;color:var(--mu);text-align:center}
.barra .fila{display:flex;gap:8px}
.barra .fila .btn{flex:1;white-space:nowrap}
.btn{padding:12px 16px;border-radius:6px;border:0;background:var(--az);color:#fff;
  font-size:15px;font-weight:700;cursor:pointer}
.btn.o{background:var(--sup);color:var(--az);border:1.5px solid var(--az)}
.btn:disabled{opacity:.5}
.pend{display:inline-block;min-width:22px;padding:1px 6px;border-radius:11px;
  background:var(--amb);color:#fff;font-weight:700;font-size:12px;text-align:center}
.aviso{padding:10px 12px;border-radius:6px;font-size:13.5px;margin:10px 0;display:none}
.aviso.v{display:block}
.aviso.bien{background:#E6F4EC;color:var(--ok)}
.aviso.mal{background:#FDECEA;color:var(--err)}
.aviso.info{background:#E7EFF6;color:var(--az)}
/* touch-action:none es lo que impide que el dedo haga scroll en vez de
   dibujar. Sin esa línea el lienzo es inservible en un teléfono. */
.firma{margin:8px 0;border:1px dashed var(--bd);border-radius:6px;background:#fff}
.firma canvas{display:block;width:100%;height:150px;touch-action:none;border-radius:6px}
.btn.mini{padding:8px 12px;font-size:13px}
.ayuda{background:#E7EFF6;border-left:3px solid var(--az);border-radius:3px;
  padding:11px 13px;margin:0 0 10px;font-size:13.5px;line-height:1.5;color:#22384d}
.ref{background:var(--sup);border:1px solid var(--bd);border-radius:6px;padding:14px;margin:12px 0}
.ref h3{margin:0 0 8px;font-size:14.5px}
.ref table{width:100%;border-collapse:collapse;font-size:13px}
.ref th,.ref td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--bd)}
.ref th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mu)}
.ref ul{margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.5}
.ref li{margin-bottom:7px}
.ref dt{font-weight:600;font-size:13.5px;margin-top:9px}
.ref dd{margin:2px 0 0;font-size:13px;color:#33475b;line-height:1.45}
.ref .propio{font-size:11px;color:var(--amb);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
</style></head><body>
<div class="wrap">
  <p class="ey">Give&amp;Grow International</p>
  <h1>Inspección visual preliminar de vivienda</h1>
  <p style="font-size:13.5px;color:var(--mu);margin:2px 0 0">Reporte de observaciones — documento preliminar y no vinculante</p>

  <div id="prep" class="aviso info v"></div>
  <button type="button" class="btn o" id="b-prep" style="width:100%">Preparar para trabajar sin señal</button>

  <div class="alcance"><b>Alcance y limitaciones.</b> ${alcance}</div>

  <h2>Identificación</h2>
  <label for="f-fam">Nombre de la familia *</label><input id="f-fam" autocomplete="off"
    placeholder="Los Guti&eacute;rrez">
  <label for="f-finca">Nombre de la finca o predio</label><input id="f-finca" autocomplete="off"
    placeholder="La Esperanza">
  <label for="f-muni">Municipio *</label><input id="f-muni" autocomplete="off">
  <label for="f-fecha">Fecha de la visita *</label><input id="f-fecha" type="date">
  <label for="f-hora">Hora</label><input id="f-hora" type="time">
  <label for="f-casa">Casa N.º (el que pinta la brigada)</label><input id="f-casa" autocomplete="off">
  <label for="f-dir">Dirección / vereda</label><input id="f-dir" autocomplete="off">
  <label for="f-caso">N.º de caso del triaje, si existe</label><input id="f-caso" placeholder="CV-2026-000123" autocomplete="off">

  <div class="item" style="margin-top:14px">
    <b>Ubicación GPS</b>
    <p style="font-size:13.5px;color:var(--mu);margin:0 0 10px">En vereda no hay nomenclatura,
    y sin coordenadas nadie encuentra la casa dos días después. <strong>El GPS funciona sin
    señal</strong>: es lo único de esta pantalla que no necesita internet.</p>
    <button type="button" class="btn o mini" id="b-gps">Tomar la ubicación</button>
    <p id="gps-est" style="font-size:13.5px;margin:10px 0 0;color:var(--mu)">Sin tomar.</p>
  </div>

  <h2>Quien observa</h2>
  <label for="f-obs">Nombre *</label><input id="f-obs" autocomplete="off">
  <label for="f-mat">Matrícula profesional</label><input id="f-mat" autocomplete="off">
  <label for="f-cc">Cédula</label><input id="f-cc" inputmode="numeric" autocomplete="off">

  <h2>Propietario o habitante</h2>
  <label for="f-prop">Nombre</label><input id="f-prop" autocomplete="off">
  <label for="f-cont">Contacto</label><input id="f-cont" inputmode="tel" autocomplete="off">

  <h2>Antes de empezar a marcar</h2>
  <div id="referencia"></div>

  <div id="secciones"></div>

  <h2>Conclusión</h2>
  <div class="item">
    <b>¿Se observaron elementos que requieren revisión especializada?</b>
    <div class="marcas">
      <button type="button" class="re" data-esp="1" aria-pressed="false">SÍ</button>
      <button type="button" data-esp="0" aria-pressed="false">NO</button>
    </div>
  </div>

  <h2>Observaciones y recomendaciones</h2>
  <p style="font-size:13px;color:var(--mu);margin:0 0 10px">La guía del AIS obliga a
  <strong>consignar las recomendaciones y explicárselas de viva voz</strong> a quien vive ahí.
  Marca las que apliquen: son las medidas que esa guía autoriza a recomendar.
  <strong>Demoler no está en la lista porque la guía lo prohíbe expresamente</strong> — para eso se
  pide la visita de un experto y se marca como urgente.</p>
  <div id="recomienda"></div>
  <div class="item">
    <label for="f-recotexto">Otra recomendación, con tus palabras</label>
    <textarea id="f-recotexto" placeholder="No usen el cuarto del patio hasta que lo revise un ingeniero"></textarea>
  </div>
  <div class="item">
    <label for="f-obsgen">Observaciones generales</label>
    <p style="font-size:13px;color:var(--mu);margin:0 0 8px">Lo que no cae en ningún ítem: el
    contexto, lo que contó la familia, lo que quieras dejar dicho.</p>
    <textarea id="f-obsgen" rows="4" placeholder="La familia dice que la grieta del patio apareció con la réplica del jueves…"></textarea>
  </div>

  <h2>Autorización del habitante</h2>
  <div class="item">
    <b style="font-weight:400;font-size:13.5px">${consentTexto}</b>
    <div class="marcas">
      <button type="button" id="b-cons" data-cons="1" aria-pressed="false">El habitante lo entendió y autoriza</button>
    </div>
  </div>

  <h2>Fotos</h2>
  <p style="font-size:13.5px;color:var(--mu);margin:0 0 10px">Se numeran solas, y ese número es el
  que anotas en «Foto N.º» de cada ítem — igual que en el papel. <strong>Se guardan en el teléfono y
  suben con la inspección</strong>, así que puedes tomarlas sin señal.</p>
  <div class="item">
    <label class="btn o mini" style="display:inline-block;cursor:pointer">
      <span>Agregar fotos</span>
      <input type="file" id="f-fotos" accept="image/*" multiple style="position:absolute;left:-9999px">
    </label>
    <p id="fotos-est" style="font-size:13.5px;margin:10px 0 0;color:var(--mu)">Ninguna todavía.</p>
    <div id="fotos-lista" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
  </div>

  <h2>Firmas</h2>
  <div class="ref" id="mensaje-fam"></div>
  <p style="font-size:13px;color:var(--mu);margin:0 0 10px">Se firma con el dedo.</p>

  <div class="item">
    <b>Quien realizó la observación</b>
    <label for="f-obs2">Nombre</label><input id="f-obs2" disabled>
    <div class="firma"><canvas id="c-obs" height="150"></canvas></div>
    <button type="button" class="btn o mini" data-limpiar="c-obs">Borrar y firmar de nuevo</button>
  </div>

  <div class="item">
    <b>Propietario / habitante</b>
    <label for="f-habcc">Cédula</label><input id="f-habcc" inputmode="numeric" autocomplete="off">
    <div class="firma"><canvas id="c-hab" height="150"></canvas></div>
    <button type="button" class="btn o mini" data-limpiar="c-hab">Borrar y firmar de nuevo</button>
    <div style="margin-top:12px">
      <button type="button" class="btn o mini" id="b-nofirma" aria-pressed="false">No pudo firmar</button>
      <div id="caja-nofirma" style="display:none;margin-top:8px">
        <label for="f-nofirma">¿Por qué? (obligatorio)</label>
        <textarea id="f-nofirma" placeholder="Está herido · no sabe escribir · no estaba en la casa"></textarea>
      </div>
    </div>
  </div>

  <div id="msg" class="aviso"></div>

  <h2>Sin terminar en este teléfono <span class="pend" id="n-borr">0</span></h2>
  <p style="font-size:13px;color:var(--mu);margin:0 0 10px">Esto vive en el teléfono, no en el
  servidor: es lo que quedó a medias porque se bloqueó la pantalla, se acabó la batería o te
  pasaste a otra aplicación. <strong>Las firmas y las fotos siguen ahí</strong>, así que no hay
  que volver a la casa: ábrela, revísala y guárdala.</p>
  <div id="borr"></div>
  <button type="button" class="btn o mini" id="b-borr" style="margin-top:10px">Volver a revisar el teléfono</button>

  <div class="ref" style="margin-top:16px">
    <p style="margin:0 0 8px;font-size:13.5px"><strong>Si algo se atasca, baja el respaldo.</strong>
    Lo guardado en el teléfono no se puede mirar ni mandar por WhatsApp: esto lo convierte en
    <strong>un archivo</strong> con todo —las que faltan por enviar, las que quedaron a medias, las
    firmas y las fotos— que el equipo puede cargar por su lado. <strong>Funciona sin señal:</strong>
    se baja ahora y lo mandas cuando tengas.</p>
    <button type="button" class="btn o mini" id="b-resp">Bajar respaldo de todo</button>
  </div>

  <h2>Las que ya enviaste</h2>
  <p style="font-size:13px;color:var(--mu);margin:0 0 10px">Esto viene del servidor, no del
  teléfono: si una inspección aparece aquí, <strong>llegó</strong>. Lo que sigue en el teléfono lo
  dice el contador de la barra de abajo.</p>
  <button type="button" class="btn o mini" id="b-mias">Ver las que llegaron</button>
  <div id="mias" style="margin-top:12px"></div>
</div>

<div class="barra">
  <span class="est" id="est">—</span>
  <div class="fila">
    <button type="button" class="btn o" id="b-cola">Enviar <span class="pend" id="n-pend">0</span></button>
    <button type="button" class="btn" id="b-guardar">Guardar inspección</button>
  </div>
</div>
<script src="/triaje/inspeccion.js"></script>
<script>INSP_ARRANCA(${seccionesJSON});</script>
</body></html>`;
}

async function siguienteInspeccion(env, anio) {
  const { results } = await env.DB.prepare(
    "INSERT INTO numerador_inspeccion (anio, ultimo) VALUES (?, 1) " +
    "ON CONFLICT(anio) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo"
  ).bind(anio).all();
  const n = results && results[0] ? results[0].ultimo : null;
  if (!n) throw new Error("numerador de inspecciones no devolvió consecutivo");
  return "IV-" + anio + "-" + String(n).padStart(6, "0");
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
    "WHEN 'no_requiere' THEN 3 ELSE 2 END, c.creado_en ASC LIMIT " + TOPE_COLA
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
  /* El total sale GRATIS: la consulta de teléfonos ya trajo todas las filas
     para el mapa de duplicados. Sin decirlo, la bandeja se corta en el caso 200
     y parece que ahí se acaban — con cinco territorios de más de cien familias
     eso pasa, y el caso 201 no existiría para nadie. */
  return json({ casos, total: (tel.results || []).length, tope: TOPE_COLA });
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
/* ========================================================================
   ALMA — la asistente, ahora DENTRO del repo.

   POR QUÉ SE MUEVE. Vivía en un Worker aparte que se actualizaba pegando código
   en el dashboard, y fue lo único del ecosistema que pasó un mes
   desincronizado: el endurecimiento estaba desplegado y el prompt NO, así que a
   una familia con la casa agrietada por el sismo le respondía que fuera a la
   alcaldía —justo la persona para la que se construyó Mira Mi Casa—. Un
   despliegue manual es un despliegue que se olvida.

   AL SER DEL MISMO ORIGEN SOBRA EL CORS ENTERO: no hay preflight, ni cabeceras
   de permiso, ni lista de orígenes que mantener.

   Y conviene decir la verdad sobre esa lista, porque se fue creyendo que
   protegía: la comprobación de `Origin` NUNCA detuvo a nadie decidido —basta
   mandar la cabecera con curl, comprobado hoy contra el worker viejo—. Lo que
   de verdad protege es que el MODELO, el MÁXIMO DE TOKENS y el SYSTEM se fijen
   aquí y que haya límite por IP. La comprobación se conserva solo como estorbo
   a que otro sitio empotre el chat, que es lo único para lo que servía.
   ======================================================================== */

const ALMA_MODELO = "claude-haiku-4-5";
const ALMA_MAX_TOKENS = 1024;
const ALMA_MAX_MENSAJES = 24;
const ALMA_MAX_CHARS = 2000;
const ALMA_MAX_CUERPO = 64 * 1024;

/* El límite vive en la memoria del isolate, así que es por isolate y no global.
   No es un control de abuso serio —para eso está la regla de rate limiting del
   WAF, que es configuración— pero ataja el caso real: alguien dando al botón. */
const ALMA_VENTANA_MS = 60000;
const ALMA_MAX_POR_VENTANA = 10;
const ALMA_GOLPES = new Map();

function almaLimitada(ip) {
  const ahora = Date.now();
  const previos = (ALMA_GOLPES.get(ip) || []).filter((t) => ahora - t < ALMA_VENTANA_MS);
  if (previos.length >= ALMA_MAX_POR_VENTANA) { ALMA_GOLPES.set(ip, previos); return true; }
  previos.push(ahora);
  ALMA_GOLPES.set(ip, previos);
  if (ALMA_GOLPES.size > 5000) ALMA_GOLPES.clear();
  return false;
}

const ALMA_SYS = `Eres ALMA (Asistente de Labor Misional y Alianzas), la IA de Fundación Give&Grow International. Respondes de forma clara, cálida y concisa. Máximo 3 párrafos por respuesta. No uses listas extensas. Responde en el idioma del usuario.

GIVE&GROW: Fundación colombiana ESAL (NIT 901.948.930-2, RTE Código 04 DIAN). Fundada el 19 de mayo de 2025 en Medellín. Fundador: Juan Sebastián Navarro Osorio, casi 4 años de trabajo en zonas de difícil acceso (La Guajira, Sierra Nevada, Medellín). Tagline: "Dar para crecer, crecer para dar más". Web: www.thegiveandgrowproject.org. Contacto: sebas@thegiveandgrowproject.org / +57 315 330 5028.

MISIÓN: Conectar generosidad con necesidad de forma estratégica y con trazabilidad completa. No reemplazamos fundaciones, las amplificamos.

IMPACTOS Y ALMA: ImpactOS es el sistema operativo de Give&Grow (la plataforma digital del ecosistema). ALMA es su interfaz inteligente. Give&Grow es el ecosistema completo. ALMA es a Give&Grow lo que Siri es al iPhone.

HUB SOCIAL: Centro operativo en Medellín. 5 rutas: R1 Alianzas con Fundaciones, R2 Gestión de Donaciones, R3 Social Grow, R4 Impact Journey, R5 Conexión Laboral. Proceso: visita de contexto, onboarding, gestión de necesidades, entrega con acta, reporte fotográfico al donante.

DONACIONES: Transferencia a Bancolombia Cuenta de Ahorros 31000009221 (NIT 901.948.930-2). Mejor aún: que la reporte en el sitio (#reportar), porque así recibe su número de guía al instante y sube ahí mismo el comprobante. Una persona la contrasta contra el extracto y entonces le llega el RECIBO.

DOS COSAS QUE NO DEBES PROMETER, porque el sitio dejó de prometerlas a propósito. NO existe reporte fotográfico mensual: no hay nada que lo envíe, y prometerlo fue un error que ya se corrigió. Lo que sí ocurre es que el acta de entrega y sus fotos quedan publicadas en el rastreo del aporte. Y el CERTIFICADO tributario NO es automático ni sale en 24h: es una declaración bajo la gravedad de juramento que firman el Representante Legal y la Revisora Fiscal, la emite una persona, solo si el donante lo pidió, y para emitirlo hacen falta su documento y su ciudad. El recibo sí es automático; el certificado es otra cosa. No los confundas.

BENEFICIO TRIBUTARIO: 25% de descuento sobre el impuesto de renta a cargo (Art. 257 ET), en los términos y límites que contempla la ley. Ejemplo: 4.000.000 COP donados = hasta 1.000.000 COP menos de impuesto, según la situación tributaria del donante.

MEMBRESÍAS: Semilla, Retoño, Árbol y Bosque (niveles crecientes de aporte mensual), Temporal (donación única) y Honor (por invitación).

PROGRAMA DE GRATITUD: Red de empresas aliadas con descuentos exclusivos para todos los miembros activos. Categorías: gastronomía, moda, belleza, bienestar, odontología.

RSE EMPRESARIAL: 3 puertas cumplibles hoy: Padrinazgo de Impacto (presupuesto traducido a unidades reales con certificado y reporte), Impact Journey (voluntariado corporativo en doble vía, Ruta 4) y Alianza a medida (co-creación de programas). El aporte se define a la medida de cada empresa; invita a escribir para una propuesta personalizada.

POBLACIONES OBJETIVO: la misión busca impactar todo tipo de población vulnerable a través de las fundaciones del HUB. Las que hoy guían el objeto social: niñez en riesgo, comunidades indígenas, comunidades campesinas, personas en situación de calle, adultos mayores, animales en maltrato, personas en rehabilitación, personas privadas de la libertad. La cobertura real crece con cada aliada verificada.

EMERGENCIA ABIERTA — SISMO DEL 10 DE AGOSTO DE 2026. Magnitud 7,4, epicentro cerca de San José del Palmar (Chocó), 103 km de profundidad, según el Servicio Geológico Colombiano. Desastre nacional declarado. NO des cifras de víctimas: en las primeras horas las fuentes iban de 132 a más de 240 y no repetimos números que no podemos verificar. Remite a las fuentes oficiales.

LA BRIGADA: del 24 al 28 de agosto de 2026, cinco territorios en cinco días — Cali, Pereira, Manizales, Armenia y Chocó — con las fundaciones de cada territorio. El equipo de terreno está CERRADO en siete personas y no se puede sumar gente a terreno: exige doble verificación y sesión de formación previa. Las manos que sí se necesitan son de estructura, en Medellín. Se piden cuatro cosas: dinero, insumos en especie, manos y contactos. Dos centros de acopio, los dos en ENVIGADO (no en Medellín): Esmeraldas Colombia (Carrera 48 # 37 Sur 56, frente al rompoy de Viva Envigado) y Club Nativos (Sector El Salado). Son sedes prestadas, no bodegas: hay que escribir ANTES de ir, o alguien carga el carro y encuentra la puerta cerrada. No hay meta en pesos porque todavía no hay costos del inventario, y no inventamos equivalencias.

MIRA MI CASA — la plataforma del triaje estructural. Vive en miramicasa.thegiveandgrowproject.org. Es la plataforma de "Cimientos que Unen", el proyecto, que es de Fundación Give&Grow International. Si alguien llegó por Instagram con el nombre del proyecto y aterrizó en otro nombre, explícale esa cadena: no es un cambiazo, y conviene decirlo porque el Ministerio de Vivienda está advirtiendo sobre estafas con nombres de programas de vivienda.

QUÉ HACE MIRA MI CASA: una familia sube fotos de su casa afectada y un ingeniero voluntario con matrícula del COPNIA le da un CONCEPTO a distancia — si hay señales para no permanecer en la casa o en una parte de ella, qué precauciones tomar mientras tanto, y con qué materiales y en qué orden conviene repararla. De paso se prioriza a qué casa se va primero. Entra por la página "Revisa tu casa" del sitio.

LOS LÍMITES DE MIRA MI CASA, Y ESTOS NO SE NEGOCIAN NI SE SUAVIZAN:
1. NO se declara habitabilidad. La declaratoria con efectos —evacuar, demoler— es de la autoridad municipal, Ley 1523 de 2012, nunca de un privado. Por fotos no se ve la cimentación, ni el suelo, ni si esa grieta es de un muro que carga.
2. Recomendar que no se use una parte de la casa mientras se revisa es una PRECAUCIÓN, no una declaratoria de inhabitabilidad. Son cosas distintas.
3. TÚ NO DAS EL CONCEPTO. No eres ingeniera y no evalúas casas. Si alguien te describe grietas, muros o daños y te pide una opinión estructural, dile con calidez que eso lo tiene que ver un ingeniero con matrícula, y mándalo a subir las fotos. No opines sobre si una casa se puede habitar, ni siquiera con matices o "podría ser". Ni una insinuación.
4. NO prometas visita, ni reparación, ni materiales para una casa concreta. La fundación va a buscar gestionar ayuda para todas las casas que pueda, y NO puede comprometerse casa por casa. Dilo así, de frente: es más honesto que una esperanza vaga.
5. NO hay fecha de respuesta y prometerla sería peor. La familia recibe un enlace donde ve en qué va su caso.
6. Si lo que describen es un peligro EN CURSO —muros caídos, techo hundido, gente adentro— eso no espera un concepto: que llamen a la línea de emergencias 123 y a su alcaldía. Dilo primero, antes que cualquier otra cosa.
7. Nunca pidas ni repitas la dirección exacta de una casa, ni datos personales. La plataforma separa a propósito el sector (público) de la dirección (privada), porque publicar "casa dañada y desocupada, en esta dirección" es un mapa para quien roba.

INGENIEROS: quien quiera ser voluntario se postula en la página "Ingenieros voluntarios" con su matrícula del COPNIA. Se verifica en el registro público del COPNIA y el acceso se da a mano; no es instantáneo. Puede ser correo de universidad, de empresa o particular.

Más de 25 fundaciones preaprobadas en la red de espera; la vinculación formal se confirma una a una con verificación. Hoy el muro muestra las aliadas ya verificadas.`;

/* La red viva sale de partners.json, que es un ASSET de este mismo Worker: se
   lee por el binding y no saliendo a internet a buscar nuestro propio archivo.
   Una fundación que retiró el consentimiento del nombre no entra. */
async function almaContextoRed(env, origen) {
  try {
    const r = await env.ASSETS.fetch(new URL("/data/partners.json", origen));
    if (!r.ok) return "";
    const data = await r.json();
    const partners = Array.isArray(data && data.partners) ? data.partners : [];
    const lineas = [];
    for (const p of partners) {
      const c = p.consent || {};
      if (p.type === "foundation" && c.name === false) continue;
      const es = (v) => (v && typeof v === "object" ? v.es : v) || "";
      const partes = ["- " + p.name + " (" + (p.type === "hub" ? "hub" : "fundación aliada") + ")"];
      if (p.area) partes.push("zona: " + es(p.area));
      if (p.poblacion) partes.push("población atendida: " + es(p.poblacion));
      const pr = p.profile || {};
      if (pr.leader) partes.push("líder: " + pr.leader);
      if (pr.years) partes.push(es(pr.years));
      if (pr.about) partes.push("acerca de: " + es(pr.about));
      if (Array.isArray(pr.programs) && pr.programs.length) {
        partes.push("programas: " + pr.programs.map((g) => g.name + ": " + es(g.desc)).join(" | "));
      }
      if (pr.hub) partes.push("relación con el Hub: " + es(pr.hub));
      if (Array.isArray(p.impactUnits) && p.impactUnits.length) {
        partes.push("unidad de impacto documentada: " + p.impactUnits
          .map((u) => "1 " + u.es + " ≈ $" + Number(u.cop).toLocaleString("es-CO") + " COP").join("; "));
      }
      if (p.url) partes.push("web: " + p.url);
      if (p.instagram) partes.push("instagram: " + p.instagram);
      lineas.push(partes.join(" · "));
    }
    if (!lineas.length) return "";
    return ["", "=== RED DEL HUB SOCIAL (datos en vivo de thegiveandgrowproject.org) ===",
      "Estos son los ÚNICOS datos verificados sobre la red de aliadas:", ...lineas, "",
      "Reglas estrictas sobre estos datos:",
      "- Solo afirma sobre aliadas lo que aparece arriba. Nada de inventar cifras ni fundaciones.",
      "- Si preguntan por una fundación que no está en la lista, di que aún no hace parte de la red verificada."
    ].join("\n");
  } catch { return ""; }
}

function almaMensajes(bruto) {
  if (!Array.isArray(bruto)) return null;
  const msgs = [];
  for (const m of bruto.slice(-ALMA_MAX_MENSAJES)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    if (typeof m.content !== "string") continue;
    const content = m.content.slice(0, ALMA_MAX_CHARS);
    if (!content.trim()) continue;
    msgs.push({ role: m.role, content });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs.length ? msgs : null;
}

/* POST /api/alma */
async function apiAlma(request, env, url) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  /* NO HAY LISTA DE ORÍGENES, y quitarla fue lo correcto.

     Venía del Worker aparte, donde hacía falta para el CORS. Aquí no protege
     nada: un llamador decidido manda la cabecera que quiera —comprobado con
     curl contra el worker viejo— y un navegador en OTRO origen ya no puede leer
     la respuesta, porque al ser mismo origen no mandamos Access-Control-Allow-
     Origin. Esa es la protección real, y es automática.

     Lo que sí hacía la lista era romper el desarrollo local: desde
     `wrangler dev` el Origin es localhost y ALMA respondía 403, así que no se
     podía probar sin tocar código. Un control que no protege y que estorba para
     probar es peor que no tenerlo.

     Lo que protege de verdad sigue en pie: el modelo, el tope de tokens y el
     system se fijan aquí, y hay límite por IP. */

  /* SIN LLAVE NO SE INVENTA NADA: se dice que no está configurada. Mientras el
     secreto no exista este endpoint es inerte, y el sitio sigue hablando con el
     Worker de siempre. */
  /* Se recorta el valor. Un secreto cargado por tubería se lleva el salto de
     línea final, y Anthropic responde «invalid x-api-key» sin decir por qué —
     que es media hora buscando en el sitio equivocado. Recortar aquí no arregla
     una llave mala, pero descarta la causa tonta para siempre. */
  const llaveAlma = String(env.ANTHROPIC_API_KEY || "").trim();
  if (!llaveAlma) {
    /* SIN `ayuda`, y es deliberado: el chat enseña ese campo tal cual a quien
       está preguntando, y «falta el secreto ANTHROPIC_API_KEY» es un detalle de
       nuestra cocina que no le dice nada a una familia y sí le cuenta de más a
       cualquiera. `ayuda` existe SOLO cuando el texto es para la persona —el
       límite de mensajes, por ejemplo—. Para quien opera, el código basta. */
    return json({ error: "alma_no_configurada" }, 503);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (almaLimitada(ip)) {
    return json({ error: "demasiados_mensajes",
                  ayuda: "Has enviado demasiados mensajes seguidos. Espera un minuto." }, 429);
  }

  const texto = await request.text();
  if (texto.length > ALMA_MAX_CUERPO) return json({ error: "cuerpo_demasiado_grande" }, 413);
  let cuerpo;
  try { cuerpo = JSON.parse(texto); } catch { return json({ error: "json_invalido" }, 400); }

  /* Del cliente se toman SOLO los mensajes. El modelo, el tope de tokens y el
     system son del servidor: es lo que impide que esto sea un proxy gratuito. */
  const mensajes = almaMensajes(cuerpo.messages);
  if (!mensajes) return json({ error: "conversacion_vacia" }, 400);

  const system = ALMA_SYS + (await almaContextoRed(env, url.origin));

  /* EL WORKSPACE, y por qué es condicional.

     Anthropic tiene dos clases de llave. Una creada DENTRO de un workspace ya
     sabe dónde actúa. Una personal o de cuenta de servicio sirve para varios,
     así que hay que decírselo en cada petición con `anthropic-workspace-id`; si
     no, responde 400 con «is required when authenticating with an
     identity-linked API key» — que fue exactamente lo que nos pasó.

     Se manda SOLO si está configurado, así que el mismo código sirve con las
     dos clases de llave y cambiar de una a otra no obliga a tocar nada.

     El id NO es un secreto —es un identificador, tipo wrkspc_01ABC…— así que
     vive en wrangler.toml, versionado y a la vista, y no en un secreto que
     nadie pueda leer después. */
  const cabecerasAlma = {
    "content-type": "application/json",
    "x-api-key": llaveAlma,
    "anthropic-version": "2023-06-01"
  };
  const espacioAlma = String(env.ANTHROPIC_WORKSPACE_ID || "").trim();
  if (espacioAlma) cabecerasAlma["anthropic-workspace-id"] = espacioAlma;

  const arriba = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: cabecerasAlma,
    body: JSON.stringify({ model: ALMA_MODELO, max_tokens: ALMA_MAX_TOKENS, system, messages: mensajes })
  });

  return new Response(await arriba.text(), {
    status: arriba.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

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

/* Los cinco territorios de la brigada. Existen como lista cerrada porque el
   sector es un dato que después ordena trabajo real, y un campo libre acabaría
   con «Pereira», «pereira» y «Risaralda» siendo tres cosas distintas.
   `cualquiera` está a propósito y es la opción honesta por omisión: la mayoría
   de quien quiere ayudar no tiene preferencia, y forzarle a elegir una ciudad
   inventa un dato que luego se lee como compromiso. */
const SECTORES_MMC = ["cali", "pereira", "manizales", "armenia", "choco", "cualquiera"];

/* Qué se puede ofrecer. `dinero` está en la lista, pero este formulario NO
   cobra: registra el ofrecimiento y una persona del equipo contacta. Cobrar
   aquí exigiría prometer a qué casa va, que es justo lo que no se puede
   prometer. */
const APORTES_APADRINA = ["materiales", "mano_obra", "transporte", "dinero", "otra"];

const ETIQUETA_APORTE = {
  es: { materiales: "Materiales de reparación", mano_obra: "Mano de obra",
        transporte: "Transporte de materiales", dinero: "Aporte en dinero", otra: "Otra forma" },
  en: { materiales: "Repair materials", mano_obra: "Labour",
        transporte: "Transport of materials", dinero: "Money", otra: "Other" }
};

const ETIQUETA_SECTOR = {
  cali: "Cali", pereira: "Pereira", manizales: "Manizales",
  armenia: "Armenia", choco: "Chocó", cualquiera: "Donde más se necesite"
};

/* POST /api/inscripcion con tipo=apadrinamiento — quien quiere aportar a la
   reparación de viviendas.

   REGISTRA UN OFRECIMIENTO, NO UNA TRANSACCIÓN, y esa es la decisión de fondo.
   No hay pasarela aquí y no la va a haber mientras el destino no se pueda
   nombrar: apadrinar NO reserva una casa concreta. Las casas las ordenan los
   conceptos de los ingenieros, y dejar elegir por foto pondría primero la casa
   más fotografiable, no la más urgente.

   Por eso `acepta_concepto` es obligatorio, igual que `acepta_triaje` en la
   postulación de ingenieros: quien crea que está comprando la reparación de una
   casa que eligió entendió mal, y hay que decírselo ANTES. */
async function apiApadrinamiento(env, c) {
  const limpio = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const nombre  = limpio(c.nombre, 120);
  const email   = limpio(c.email, 200);
  const aporte  = APORTES_APADRINA.includes(c.aporte) ? c.aporte : null;
  const detalle = limpio(c.detalle, 600);
  const sector  = SECTORES_MMC.includes(c.sector) ? c.sector : "cualquiera";

  if (!nombre) return json({ error: "nombre_requerido" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalido" }, 400);
  if (!aporte)  return json({ error: "aporte_requerido", opciones: APORTES_APADRINA }, 400);
  if (!detalle) return json({ error: "detalle_requerido" }, 400);
  if (!c.acepta_concepto) return json({ error: "concepto_requerido" }, 400);
  /* Sin autorización no se guarda NADA. Ley 1581, no una casilla decorativa. */
  if (!c.autoriza_datos) return json({ error: "autorizacion_requerida" }, 400);

  const datos = {
    aporte, detalle, sector,
    alcance: limpio(c.alcance, 200),
    quien: c.quien === "empresa" ? "empresa" : "persona",
    organizacion: limpio(c.organizacion, 160),
    acepta_concepto: true,
    idioma: c.idioma === "en" ? "en" : "es"
  };

  const ins = await env.DB.prepare(
    "INSERT INTO inscripciones (tipo, estado, nombre, email, telefono, ciudad, datos) " +
    "VALUES ('apadrinamiento', 'nueva', ?, ?, ?, ?, ?)"
  ).bind(nombre, email, limpio(c.telefono, 40) || null, limpio(c.ciudad, 80) || null,
         JSON.stringify(datos)).run();

  /* El correo no puede tumbar el registro: si falla, el ofrecimiento ya quedó
     guardado y eso es lo que importa. Misma regla que en aportes e inscripciones. */
  try {
    await correoApadrinamiento(env, { nombre, email, ...datos });
    await correoAvisoApadrinamiento(env, { nombre, email, telefono: limpio(c.telefono, 40),
                                           ciudad: limpio(c.ciudad, 80), ...datos });
  } catch (e) {
    console.error("correo apadrinamiento", e && e.message);
  }

  return json({ ok: true, id: ins.meta ? ins.meta.last_row_id : null });
}

async function correoApadrinamiento(env, a) {
  const en = a.idioma === "en";
  return await enviarCorreo(env, {
    para: a.email,
    asunto: en ? "We received your offer to help repair a home"
               : "Recibimos tu ofrecimiento para reparar una vivienda",
    etiqueta: "apadrinamiento",
    html: plantillaCorreo({
      titulo: en ? "Thank you. Here is what happens now." : "Gracias. Esto es lo que sigue.",
      parrafos: en ? [
        "Someone from the team will write to you to agree on the details. Nothing is charged from this form.",
        "One thing so there is no misunderstanding: sponsoring does not reserve a particular home. Which homes are attended is decided with the engineers' written opinions, because the need has an order and a photograph is not that order.",
        "What you do get back is evidence: every delivery we make is published with its record."
      ] : [
        "Alguien del equipo te va a escribir para acordar los detalles. Desde este formulario no se cobra nada.",
        "Una cosa para que no haya malentendido: apadrinar no reserva una casa concreta. Qué casas se atienden se decide con los conceptos escritos de los ingenieros, porque la necesidad tiene un orden y una fotografía no es ese orden.",
        "Lo que sí vuelve es evidencia: cada entrega que hacemos se publica con su acta."
      ],
      filas: [
        [en ? "What you offer" : "Qué ofreces", (ETIQUETA_APORTE[en ? "en" : "es"][a.aporte] || a.aporte)],
        [en ? "Details" : "Detalle", a.detalle],
        [en ? "Territory" : "Territorio", ETIQUETA_SECTOR[a.sector] || a.sector]
      ],
      cierre: en ? "Fundación Give&Grow International · NIT 901.948.930-2"
                 : "Fundación Give&Grow International · NIT 901.948.930-2"
    })
  });
}

async function correoAvisoApadrinamiento(env, a) {
  const para = env.CORREO_AVISOS;
  if (!para) return { ok: true, sinDestino: true };
  return await enviarCorreo(env, {
    para,
    asunto: "Apadrinamiento: " + (ETIQUETA_APORTE.es[a.aporte] || a.aporte)
            + " · " + (ETIQUETA_SECTOR[a.sector] || a.sector),
    etiqueta: "apadrinamiento-aviso",
    html: plantillaCorreo({
      titulo: "Alguien quiere aportar a la reparación de viviendas",
      filas: [
        ["Qué ofrece", ETIQUETA_APORTE.es[a.aporte] || a.aporte],
        ["Detalle", a.detalle],
        ["Alcance", a.alcance || "(no dice)"],
        ["Territorio", ETIQUETA_SECTOR[a.sector] || a.sector],
        ["Quién", a.quien === "empresa" ? "Empresa" : "Persona"],
        ["Organización", a.organizacion || "(no dice)"],
        ["Nombre", a.nombre],
        ["Correo", a.email],
        ["Teléfono", a.telefono || "(no dejó)"],
        ["Ciudad", a.ciudad || "(no dice)"]
      ],
      cierre: "Está en /admin, en la bandeja de postulaciones."
    })
  });
}

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
/* POST /api/admin/inspecciones/importar — el respaldo de un teléfono.

   LA SALIDA DE EMERGENCIA. Lo guardado en el teléfono vive en IndexedDB, que no
   es un archivo y no sale de ahí por WhatsApp: mientras la única salida sea que
   el propio formulario logre enviar, cualquier fallo que no hayamos previsto es
   un callejón sin salida. Eso ya pasó una vez.

   Reutiliza ENTERO el camino normal —triageInspeccionRecibir y luego
   triageInspeccionFoto— en vez de escribir su propio INSERT. Si validara
   distinto, el respaldo se convertiría en la puerta por la que entra lo que el
   formulario habría rechazado, y la idempotencia seguiría siendo la del índice
   único sobre _local_id solo por casualidad. Así lo es por construcción: cargar
   dos veces el mismo archivo no duplica nada. */
/* POR QUÉ NO ENTRÓ, EN CASTELLANO. El camino normal devuelve códigos —los lee
   el teléfono, que ya sabe qué hacer con cada uno—, pero este informe lo lee una
   persona mientras tiene a un ingeniero esperando al teléfono. «Falta la
   autorización del habitante» le dice qué pedirle; «consent_habitante_requerido»
   le hace adivinar. Se traduce aquí y no en el otro endpoint a propósito: el
   contrato con el teléfono no cambia. */
const RECHAZO_EN_CASTELLANO = {
  consent_habitante_requerido:
    "Falta la autorización del habitante. Quedó a medias: hay que terminarla en el teléfono o pasarla del papel.",
  firma_observador_requerida:
    "Falta la firma del ingeniero. Sin ella no hay documento: tiene que abrirla en su teléfono y firmarla.",
  firma_habitante_o_motivo:
    "Falta la firma del habitante o el motivo por el que no pudo firmar.",
  datos_incompletos:
    "Le faltan datos de identificación.",
  local_id_requerido:
    "El registro viene sin identificador. Es un archivo dañado: pide que lo bajen otra vez.",
  json_invalido:
    "El registro no se pudo leer. Probablemente el archivo llegó cortado por WhatsApp."
};

async function adminInspeccionesImportar(request, env) {
  if (request.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let c;
  try { c = await request.json(); } catch { return json({ error: "json_invalido" }, 400); }

  /* El correo lo escribe QUIEN CARGA, no el archivo. Es la atribución de un
     documento firmado —de quién responde por lo que dice— y un archivo que llegó
     por WhatsApp no puede decidirla solo. El panel enseña el que el respaldo
     trae, para copiarlo cuando sea el correcto. */
  const correo = String(c.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    return json({ error: "email_requerido",
                  ayuda: "Escribe el correo con el que ese ingeniero entra a Mira Mi Casa. Sin el correcto, no verá la inspección en «Las que ya enviaste»." }, 400);
  }

  const lote = (Array.isArray(c.cola) ? c.cola : [])
    .concat(Array.isArray(c.borradores) ? c.borradores : []);
  if (!lote.length) {
    return json({ error: "respaldo_vacio", ayuda: "El archivo no trae ninguna inspección." }, 400);
  }
  if (lote.length > 120) {
    return json({ error: "respaldo_demasiado_grande",
                  ayuda: "Trae " + lote.length + " inspecciones. Pide que se baje por partes." }, 413);
  }

  const base = new URL(request.url).origin;
  const sesion = { email: correo, equipo: true };
  const informe = [];

  for (const reg of lote) {
    const etiqueta = String((reg && reg.familia) || "sin nombre de familia").slice(0, 80);
    const fotos = Array.isArray(reg && reg.fotos) ? reg.fotos : [];
    const cuerpo = {};
    for (const k of Object.keys(reg || {})) if (k !== "fotos") cuerpo[k] = reg[k];
    cuerpo.fotos_tomadas = fotos.length;

    let d;
    try {
      const r = await triageInspeccionRecibir(new Request(base + "/api/triage/inspeccion", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo)
      }), env, correo);
      d = await r.json();
    } catch {
      informe.push({ familia: etiqueta, error: "no_se_pudo_procesar" });
      continue;
    }

    if (!d.ok) {
      /* Un borrador a medias cae aquí, y eso es lo correcto: se devuelve QUÉ le
         falta para que alguien lo termine en el teléfono o lo pase del papel.
         Aceptarlo a medias metería en la base un documento sin firma. */
      informe.push({ familia: etiqueta, error: d.error || "rechazada",
                     faltan: d.faltan || null,
                     ayuda: d.ayuda || RECHAZO_EN_CASTELLANO[d.error] || null });
      continue;
    }

    /* Si ya estaba, NO se vuelven a subir las fotos: el endpoint las añade a la
       lista de la inspección y volver a cargar el archivo las duplicaría. */
    if (d.repetida) {
      informe.push({ familia: etiqueta, numero: d.numero, repetida: true });
      continue;
    }

    let subidas = 0, fallidas = 0;
    for (const f of fotos) {
      const bytes = base64ABytes(f && f.b64);
      if (!bytes) { fallidas++; continue; }
      try {
        const rf = await triageInspeccionFoto(new Request(
          base + "/api/triage/inspeccion/" + encodeURIComponent(d.numero) + "/foto",
          { method: "POST", headers: { "content-type": String((f && f.tipo) || "image/jpeg") }, body: bytes }
        ), env, d.numero, sesion);
        if (rf.ok) subidas++; else fallidas++;
      } catch { fallidas++; }
    }
    informe.push({ familia: etiqueta, numero: d.numero, repetida: false,
                   fotos: { subidas, fallidas } });
  }

  return json({ ok: true, informe });
}

/* base64 sin el «data:» delante. Devuelve null en vez de lanzar: una foto
   ilegible no puede tumbar la carga de las otras veintinueve. */
function base64ABytes(t) {
  const s = String(t || "");
  if (!s || s.length > 12000000) return null;
  try {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.length ? u : null;
  } catch { return null; }
}

/* GET /api/admin/buscar?q= — UNA casilla en vez de ocho tablas.

   El panel tiene ocho bandejas y hasta ahora había que saber en cuál mirar: con
   un número en la mano —el que llegó por correo, el que dictó una familia por
   teléfono— tocaba adivinar si era de aportes, de casas o de inspecciones.

   NO ES UNA BÚSQUEDA DE TEXTO LIBRE, y es deliberado. Los consecutivos de este
   proyecto llevan su prefijo (GG, CV, IV, CD, AE, MB), así que el propio dato
   dice en qué tabla vive: se hace UNA consulta a la tabla correcta en vez de
   siete a todas. Y un buscador difuso sobre nombres y notas sería un escaneo de
   todo el panel para responder casi siempre lo mismo que el prefijo ya sabía.

   Lo que sí acepta además del número es un TELÉFONO, porque es lo único que una
   familia sabe de memoria cuando llama. */
const BUSCA_NUMERO = {
  GG: { sql: "SELECT a.guia AS numero, a.estado, a.creada_en AS cuando, d.nombre " +
             "FROM aportes a LEFT JOIN donantes d ON d.id = a.donante_id WHERE a.guia = ?",
        clase: "Aporte", destino: "#sec-salud" },
  CV: { sql: "SELECT numero, estado, creado_en AS cuando, contacto_nombre AS nombre, sector " +
             "FROM casos WHERE numero = ?",
        clase: "Caso de vivienda", destino: "#sec-casas" },
  IV: { sql: "SELECT numero, familia AS nombre, municipio AS sector, recibido_en AS cuando, " +
             "CASE WHEN requiere_esp = 1 THEN 'requiere revisión especializada' ELSE 'recibida' END AS estado " +
             "FROM inspecciones WHERE numero = ?",
        clase: "Inspección en terreno", destino: "#sec-inspecciones" },
  CD: { sql: "SELECT numero, guia AS sector, emitido_en AS cuando, " +
             "CASE WHEN anulado_en IS NULL THEN 'vigente' ELSE 'anulado' END AS estado " +
             "FROM certificados WHERE numero = ?",
        clase: "Certificado", destino: "#sec-salud" },
  AE: { sql: "SELECT numero, creada_en AS cuando, " +
             "CASE WHEN anulada_en IS NOT NULL THEN 'anulada' " +
             "WHEN publicada_en IS NULL THEN 'en borrador' ELSE 'publicada' END AS estado " +
             "FROM entregas WHERE numero = ?",
        clase: "Acta de entrega", destino: "#sec-entregas" },
  /* Los miembros no tienen bandeja propia en este panel, así que el resultado
     sale sin enlace en vez de mandar a una pantalla que no los enseña. */
  MB: { sql: "SELECT codigo AS numero, nivel AS estado, creado_en AS cuando FROM miembros WHERE codigo = ?",
        clase: "Membresía", destino: null }
};

async function adminBuscar(env, url) {
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 60);
  if (q.length < 3) return json({ q, tipo: "corto", resultados: [] });

  const num = q.toUpperCase().replace(/\s+/g, "");
  const m = /^(GG|CV|IV|CD|AE|MB)-(\d{4})-(\d{6})$/.exec(num);
  if (m) {
    const cfg = BUSCA_NUMERO[m[1]];
    const f = await env.DB.prepare(cfg.sql).bind(num).first();
    return json({ q, tipo: "numero", resultados: f ? [{
      clase: cfg.clase, numero: f.numero, estado: f.estado || null,
      nombre: f.nombre || null, sector: f.sector || null,
      cuando: f.cuando ? String(f.cuando).slice(0, 16) : null,
      destino: cfg.destino
    }] : [] });
  }

  const digitos = q.replace(/\D/g, "");
  if (digitos.length >= 7) {
    /* SE NORMALIZA LA COLUMNA, así que esto es UN escaneo por tabla y el índice
       de teléfono no entra. Es aceptable —lineal, tres tablas, con tope— y es
       muy distinto de lo que ya mordió esta pantalla: allí la normalización
       vivía en una subconsulta correlacionada y se ejecutaba UNA VEZ POR FILA,
       o sea cuadrática. Un escaneo no es el problema; un escaneo por fila sí. */
    const filas = [];
    const casos = await env.DB.prepare(
      "SELECT numero, estado, sector, contacto_nombre AS nombre, creado_en AS cuando FROM casos " +
      "WHERE " + TEL_DIGITOS("contacto_tel") + " = ? ORDER BY creado_en DESC LIMIT 20"
    ).bind(digitos).all();
    for (const f of casos.results || []) {
      filas.push({ clase: "Caso de vivienda", numero: f.numero, estado: f.estado,
                   nombre: f.nombre, sector: f.sector,
                   cuando: String(f.cuando || "").slice(0, 16), destino: "#sec-casas" });
    }
    const aportes = await env.DB.prepare(
      "SELECT a.guia AS numero, a.estado, a.creada_en AS cuando, d.nombre FROM aportes a " +
      "JOIN donantes d ON d.id = a.donante_id " +
      "WHERE " + TEL_DIGITOS("d.telefono") + " = ? ORDER BY a.creada_en DESC LIMIT 20"
    ).bind(digitos).all();
    for (const f of aportes.results || []) {
      filas.push({ clase: "Aporte", numero: f.numero, estado: f.estado, nombre: f.nombre,
                   sector: null, cuando: String(f.cuando || "").slice(0, 16), destino: "#sec-salud" });
    }
    const insc = await env.DB.prepare(
      "SELECT id, tipo, estado, nombre, creada_en AS cuando FROM inscripciones " +
      "WHERE " + TEL_DIGITOS("telefono") + " = ? ORDER BY creada_en DESC LIMIT 20"
    ).bind(digitos).all();
    for (const f of insc.results || []) {
      filas.push({ clase: "Quién quiere entrar (" + f.tipo + ")", numero: "#" + f.id,
                   estado: f.estado, nombre: f.nombre, sector: null,
                   cuando: String(f.cuando || "").slice(0, 16), destino: "#sec-entrar" });
    }
    return json({ q, tipo: "telefono", resultados: filas });
  }

  return json({ q, tipo: "no_reconocido", resultados: [] });
}

/* GET /api/admin/inspecciones — lo que la brigada necesita ver de un vistazo.
   NO devuelve las respuestas completas: 26 ítems por fila harían la carga
   pesada y la tabla ilegible, y para eso está el PDF. Sí devuelve las CUENTAS
   —cuántos RE, cuántas observaciones— porque es lo que decide a cuál entrar. */
async function adminInspecciones(env) {
  const r = await env.DB.prepare(
    "SELECT numero, caso, municipio, direccion, casa_no, fecha_visita, hora, " +
    "obs_nombre, obs_matricula, propietario, contacto, requiere_esp, " +
    "firma_hab_key, firma_hab_motivo, pdf_key, respuestas, familia, finca, recomendaciones, " +
    "substr(creado_en,1,16) AS creado_en, substr(recibido_en,1,16) AS recibido_en " +
    "FROM inspecciones ORDER BY requiere_esp DESC, recibido_en DESC LIMIT " + TOPE_INSPECCIONES
  ).all();

  const filas = (r.results || []).map((v) => {
    let marcas = { RE: 0, OBS: 0, SO: 0 };
    try {
      const resp = JSON.parse(v.respuestas || "{}");
      for (const k of Object.keys(resp)) {
        if (k.charAt(0) === "_") continue;          /* `_local_id` no es un ítem */
        const m = resp[k] && resp[k].m;
        if (m && marcas[m] != null) marcas[m]++;
      }
    } catch { /* una fila con JSON roto no puede tumbar la bandeja entera */ }
    /* SI ALGUIEN MARCÓ «peligro inminente», eso no puede quedar dentro de un PDF
       que hay que abrir: es lo único de esta bandeja que no espera. Se sube a la
       fila como una bandera. */
    let urgente = false, nReco = 0;
    try {
      const r = JSON.parse(v.recomendaciones || "{}");
      const m = Array.isArray(r.marcadas) ? r.marcadas : [];
      nReco = m.length + (r.texto ? 1 : 0);
      urgente = m.indexOf("x4") >= 0;
    } catch { /* una fila con JSON roto no tumba la bandeja */ }

    /* `respuestas` y `recomendaciones` NO viajan al panel: pesan y lo que se usa
       en la tabla son sus cuentas. */
    const { respuestas, recomendaciones, ...resto } = v;
    return { ...resto, marcas, urgente, nReco };
  });
  const tot = await env.DB.prepare("SELECT COUNT(*) AS n FROM inspecciones").first();
  return json({ inspecciones: filas, total: (tot && tot.n) || 0, tope: TOPE_INSPECCIONES });
}

async function adminInscripciones(env) {
  const r = await env.DB.prepare(
    "SELECT id, tipo, estado, nombre, email, telefono, ciudad, datos, creada_en " +
    "FROM inscripciones WHERE tipo IN ('voluntario','fundacion','empresa','ingeniero','apadrinamiento') " +
    "ORDER BY creada_en DESC LIMIT " + TOPE_COLA
  ).all();
  /* Importa aquí más que en ninguna otra: si cien ingenieros se postulan en un
     día, la bandeja no puede quedarse callada en el número doscientos. */
  const tot = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM inscripciones WHERE tipo IN ('voluntario','fundacion','empresa','ingeniero','apadrinamiento')"
  ).first();
  return json({ inscripciones: r.results || [], total: (tot && tot.n) || 0, tope: TOPE_COLA });
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
    /* Se pone en `false`, NO se borra la clave. El formulario la escribe en
       `false` a propósito —su comentario lo dice: que quede claro que hasta que
       alguien la compruebe es un dato DECLARADO por quien se postula, no un
       hecho—. Borrarla dejaría la postulación indistinguible de una anterior a
       que este campo existiera, y perdería esa distinción. */
    datos.matricula_verificada = false;
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
<style>
/* ---- Portada de decisiones ----
   VA AQUÍ Y NO EN styles.css, y es deliberado. El panel enlaza /styles.css SIN
   versión, y esa URL se sirve «Cache-Control: immutable» durante un año: un
   cambio de CSS para el panel puede no llegarle nunca al navegador que ya la
   tiene guardada. Esta página, en cambio, se sirve «no-store», así que lo que
   viaja aquí llega siempre. De paso, son bytes que no paga cada visitante del
   sitio público por una pantalla que nunca va a abrir.

   La jerarquía va al revés de una tabla porque esto es para ACTUAR: primero
   desde cuándo espera, después cuántos, y el «cómo se arregla» debajo del
   nombre. El único acento es el ámbar de lo que lleva tres días o más, para que
   ese ámbar signifique algo cuando aparezca. */
/* El buscador: una casilla, arriba de todo. Ancho de sobra porque lo que se
   pega dentro es un consecutivo largo y verlo entero evita el error de teclear
   uno y buscar otro. */
#buscador{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px}
#buscador label{font-size:var(--fs-13);font-weight:600;color:var(--mu)}
#buscador input{flex:1 1 22rem;min-width:0;padding:9px 12px;border:1px solid var(--bd);
  border-radius:7px;font:inherit;font-size:var(--fs-14);background:var(--surface);color:inherit}
#busca-res{margin:0 0 22px}
.bus-fila{display:grid;grid-template-columns:1fr auto;gap:6px 14px;align-items:baseline;
  padding:10px 0;border-top:1px solid var(--bd)}
.bus-fila:first-child{border-top:0}
.bus-q{font-size:var(--fs-15);font-weight:600}
.bus-q small{display:block;font-weight:400;color:var(--mu);font-size:var(--fs-13);margin-top:2px}
.bus-nada{font-size:var(--fs-14);color:var(--mu);margin:0}
@media (max-width:640px){ .bus-fila{grid-template-columns:1fr} }
.dec-caja{border:1px solid var(--bd);border-left:3px solid var(--acc);border-radius:10px;
  padding:18px 20px;margin:0 0 30px;background:var(--surface)}
.dec-t{font-size:var(--fs-h4);margin:0 0 14px;letter-spacing:.01em}
.dec-alarma{border-left:3px solid var(--amber);padding:9px 13px;margin:0 0 12px;
  font-size:var(--fs-14);background:var(--amberl)}
.dec-lista{list-style:none;margin:0;padding:0}
.dec-fila{display:grid;grid-template-columns:9.5rem 3rem 1fr auto;gap:14px;align-items:baseline;
  padding:11px 0;border-top:1px solid var(--bd)}
.dec-fila:first-child{border-top:0}
.dec-cuando{font-size:var(--fs-13);color:var(--mu);font-variant-numeric:tabular-nums}
.dec-viejo .dec-cuando{color:var(--amber);font-weight:600}
.dec-n{font-size:var(--fs-17);font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.dec-que{display:block;min-width:0}
.dec-que strong{display:block;font-size:var(--fs-15);font-weight:600}
.dec-que small{display:block;color:var(--mu);font-size:var(--fs-13);margin-top:2px}
.dec-ir{white-space:nowrap;font-size:var(--fs-13);font-weight:600;text-decoration:none;
  border:1px solid var(--bd);border-radius:6px;padding:5px 11px;color:var(--acc)}
.dec-ir:hover{border-color:var(--acc)}
.dec-sinir{color:var(--mu);font-weight:400;border-style:dashed}
.dec-sinir:hover{border-color:var(--bd)}
@media (max-width:640px){
  /* En móvil la rejilla de cuatro columnas aplasta el texto: se apila, y el
     conteo queda junto a la antigüedad, que es como se leería en voz alta. */
  .dec-fila{grid-template-columns:auto 1fr;gap:4px 12px}
  .dec-que,.dec-ir{grid-column:1 / -1}
  .dec-n{text-align:left}
  .dec-ir{justify-self:start;margin-top:6px}
}
</style>
</head><body>
<main class="page active"><section><div class="wrap">
<span class="ey">Interno</span>
<h1 class="h-sec" style="margin-bottom:6px">Panel de aportes</h1>
<p class="lead" id="quien" style="margin-bottom:26px">Cargando…</p>

<div id="resumen" class="eco-row" style="justify-content:flex-start;margin-bottom:26px"></div>

<form id="buscador">
  <label for="q">Buscar</label>
  <input id="q" type="search" autocomplete="off" spellcheck="false"
         placeholder="CV-2026-000012, GG-2026-000004, IV-2026-000001 o un teléfono">
  <button type="submit" class="copy">Buscar</button>
</form>
<div id="busca-res"></div>

<div id="decisiones"></div>

<h2 id="sec-salud" class="h-sec" style="margin:8px 0 6px;font-size:26px">Salud del ecosistema</h2>
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
</tr></thead><tbody id="filas"><tr><td colspan="9" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>

<div id="dlg" style="display:none;margin-top:24px"></div>

<h2 id="sec-transferencias" class="h-sec" style="margin:48px 0 6px;font-size:26px">Transferencias por verificar</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Alguien dice que transfirió.
<strong>Eso no es dinero en el banco:</strong> contrasta contra el extracto antes de confirmar. Hasta
que lo hagas no hay recibo ni certificado, y el donante ya sabe que es así. Al confirmar se pide el
número del comprobante porque <strong>es el que cita el certificado</strong>.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Guía</th><th scope="col">Monto</th><th scope="col">Destino</th>
<th scope="col">Donante</th><th scope="col">Ref.</th><th scope="col">Comprobante</th>
<th scope="col">Cert.</th><th scope="col">Acción</th>
</tr></thead><tbody id="t-filas"><tr><td colspan="8" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>

<h2 id="sec-entrar" class="h-sec" style="margin:48px 0 6px;font-size:26px">Quién quiere entrar</h2>
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
</tr></thead><tbody id="i-filas"><tr><td colspan="7" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>

<h2 id="sec-casas" class="h-sec" style="margin:48px 0 6px;font-size:26px">Casas por revisar</h2>
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
</tr></thead><tbody id="cs-filas"><tr><td colspan="7" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>
<div id="cs-dlg" style="display:none;margin-top:20px"></div>

<h2 id="sec-inspecciones" class="h-sec" style="margin:48px 0 6px;font-size:26px">Inspecciones en terreno</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">La visita en persona, que es
<strong>otra cosa</strong> que el triaje: el triaje mira fotos a distancia y ordena la fila; esto lo
llena un ingeniero parado en la casa, con el habitante delante. Se llena <strong>sin internet</strong>
y puede llegar días después, así que la fecha de la visita y la de recepción son distintas a
propósito.</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Ordenadas poniendo primero las
que <strong>requieren revisión especializada</strong>, que son las que hay que mirar hoy. La columna
<strong>RE / Obs</strong> dice cuántos elementos se marcaron de cada tipo — para saber a cuál entrar
sin abrir todos los PDF.</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Si dice <strong>«sin firma»</strong>
NO significa que no autorizara: significa que no pudo firmar, y al lado está el motivo que el
ingeniero escribió. Un espacio en blanco no distingue esas dos cosas, por eso el motivo es
obligatorio. Y el <strong>PDF está congelado</strong>: es el documento que esa persona firmó y no se
regenera nunca.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Inspección</th><th scope="col">Familia</th><th scope="col">Dónde</th><th scope="col">Visita</th>
<th scope="col">Quién observó</th><th scope="col">RE / Obs</th><th scope="col">Firma del habitante</th>
<th scope="col">Documento</th>
</tr></thead><tbody id="ins-filas"><tr><td colspan="8" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>

<div style="margin-top:18px;border:1px solid var(--bd);border-radius:8px;padding:15px">
<h3 style="margin:0 0 6px;font-size:17px">Cargar el respaldo de un teléfono</h3>
<p class="mu" style="font-size:13px;max-width:70ch;margin:0 0 9px">La salida de emergencia. Si el
formulario de un ingeniero no logra enviar, él baja un archivo desde su teléfono y se carga aquí.
Pasa por las <strong>mismas validaciones</strong> que el envío normal, así que lo que el formulario
habría rechazado se rechaza también, y <strong>cargar dos veces el mismo archivo no duplica nada</strong>.</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin:0 0 9px">Las que vengan <strong>a medias</strong>
saldrán rechazadas diciendo qué les falta. Esas hay que terminarlas en el teléfono o pasarlas del
papel: aceptarlas incompletas metería en la base un documento sin firma.</p>
<p class="mu" style="font-size:13px;max-width:70ch;margin:0 0 12px"><strong>El correo importa.</strong>
Es de quién responde por lo que el documento dice, y decide si esa persona la verá en «Las que ya
enviaste». Al elegir el archivo se rellena con el que el respaldo trae — cámbialo solo si sabes que
está mal.</p>
<label for="imp-correo" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px">Correo del ingeniero</label>
<input id="imp-correo" type="email" autocomplete="off" placeholder="ingeniera@ejemplo.com"
 style="width:100%;max-width:340px;padding:8px 10px;border:1px solid var(--bd);border-radius:5px;font:inherit;font-size:14px">
<div style="margin-top:10px"><input id="imp-arch" type="file" accept="application/json,.json" style="font-size:13px"></div>
<div id="imp-de" class="mu" style="font-size:13px;margin-top:8px"></div>
<button class="copy" id="b-imp" style="margin-top:10px">Cargar el respaldo</button>
<div id="imp-res" style="margin-top:12px"></div>
</div>

<h2 id="sec-ofrecimientos" class="h-sec" style="margin:48px 0 6px;font-size:26px">Ofrecimientos en especie</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Lo que llega por el formulario
de la brigada. <strong>El acuse les pidió NO comprar todavía</strong>, así que conviene responder
antes de que lo hagan: el inventario cambia todos los días.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Qué</th><th scope="col">Cantidad</th><th scope="col">Cuándo</th>
<th scope="col">Quién</th><th scope="col">Ciudad</th><th scope="col">Estado</th><th scope="col">Acción</th>
</tr></thead><tbody id="o-filas"><tr><td colspan="7" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>

<h2 id="sec-pagos" class="h-sec" style="margin:48px 0 6px;font-size:26px">Pagos sin aporte</h2>
<p class="mu" style="font-size:13px;max-width:70ch;margin-bottom:14px">Pagos aprobados que entraron
por el <strong>enlace directo de Wompi</strong> (el QR de la brigada) y no por el checkout del sitio.
Cobraron a la misma cuenta, pero no tienen guía, ni recibo, ni certificado emitible: si alguno pide
certificado, hay que crearle el registro a mano. Si esta lista está vacía, todo lo cobrado está
trazado.</p>
<div class="med-tw"><table class="med-tbl">
<thead><tr>
<th scope="col">Referencia</th><th scope="col">Monto</th><th scope="col">Método</th>
<th scope="col">Donante</th><th scope="col">Recibido</th>
</tr></thead><tbody id="p-filas"><tr><td colspan="5" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
</table></div>

<h2 id="sec-entregas" class="h-sec" style="margin:48px 0 6px;font-size:26px">Entregas</h2>
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
</tr></thead><tbody id="e-filas"><tr><td colspan="8" class="mu">Se pide al bajar hasta aquí.</td></tr></tbody>
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

/* Partida en dos porque tienen urgencias distintas: el resumen son las cifras
   que van junto al titulo y se ven al abrir; la lista de aportes es una tabla
   larga que casi siempre queda por debajo del pliegue. Antes viajaban juntas y
   la segunda se pedia siempre. */
function cargarResumen(){
  fetch("/api/admin/resumen").then(function(r){ return r.json(); }).then(pintarResumen);
}

function cargarAportes(){
  fetch("/api/admin/aportes?limite=100" + (FILTRO ? "&estado=" + encodeURIComponent(FILTRO) : ""))
    .then(function(r){ return r.json(); })
    .then(function(d){ pintarFilas(d.aportes || []); });
}

document.addEventListener("click", function(e){
  var t = e.target.closest("[data-estado]");
  if (t){
    document.querySelectorAll(".pay-tab").forEach(function(b){ b.classList.remove("on"); });
    t.classList.add("on"); FILTRO = t.getAttribute("data-estado"); cargarAportes(); return;
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
    }).then(function(r){ return r.json(); }).then(function(){ cargarResumen(); cargarAportes(); })
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
        cargarResumen(); cargarAportes();
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
    }).then(function(r){ return r.json(); }).then(function(){ cargarResumen(); cargarAportes(); })
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
      cargarResumen(); cargarAportes(); cargarSalud();
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
      .then(function(d){ if (d.ayuda) alert(d.ayuda); cargarReportadas(); cargarResumen(); cargarAportes(); })
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
    }).then(function(r){ return r.json(); }).then(function(){ cargarReportadas(); cargarResumen(); cargarAportes(); })
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

/* EL BUSCADOR. Busca AL ENVIAR y no al teclear, a propósito: una búsqueda por
   teléfono son tres escaneos de tabla, y dispararlos en cada pulsación es como
   se construye una pantalla lenta sin darse cuenta. Además un consecutivo se
   pega entero de una vez, así que teclear no es la forma en que este campo se
   usa de verdad. */
function pintarBusqueda(d){
  var caja = document.getElementById("busca-res"); if (!caja) return;
  if (d.tipo === "corto"){ caja.innerHTML = ""; return; }
  if (d.tipo === "no_reconocido"){
    caja.innerHTML = '<p class="bus-nada">No reconozco «' + esc(d.q) + '». '
      + 'Se busca por número completo —CV, GG, IV, CD, AE o MB— o por un teléfono.</p>';
    return;
  }
  var l = d.resultados || [];
  if (!l.length){
    caja.innerHTML = '<p class="bus-nada">Nada con «' + esc(d.q) + '»'
      + (d.tipo === "telefono" ? ": ningún caso, aporte ni postulación con ese teléfono." : ".") + '</p>';
    return;
  }
  caja.innerHTML = '<div class="dec-caja">' + l.map(function(x){
    return '<div class="bus-fila"><span class="bus-q">' + esc(x.clase) + " " + esc(x.numero)
      + "<small>"
      + [x.nombre, x.sector, x.estado, x.cuando].filter(Boolean).map(esc).join(" · ")
      + "</small></span>"
      + (x.destino ? '<a class="dec-ir" href="' + esc(x.destino) + '">Ir</a>'
                   : '<span class="dec-ir dec-sinir">sin bandeja</span>')
      + "</div>";
  }).join("") + "</div>";
}

function buscar(){
  var q = (document.getElementById("q") || {}).value || "";
  var caja = document.getElementById("busca-res");
  if (!q.trim()){ caja.innerHTML = ""; return; }
  caja.innerHTML = '<p class="bus-nada">Buscando…</p>';
  fetch("/api/admin/buscar?q=" + encodeURIComponent(q.trim()))
    .then(function(r){ return r.json(); })
    .then(pintarBusqueda)
    .catch(function(){
      caja.innerHTML = '<p class="bus-nada">No se pudo buscar. Revisa la conexión.</p>';
    });
}

document.addEventListener("submit", function(e){
  if (e.target && e.target.id === "buscador"){ e.preventDefault(); buscar(); }
});

/* LA PORTADA DE DECISIONES. Lo primero del panel deja de ser una tabla y pasa a
   ser lo que hay que hacer hoy.

   No calcula nada nuevo: /api/admin/salud ya devolvía las diez colas con su
   conteo, su antigüedad y su «cómo se arregla». Lo que faltaba era ponerlo
   arriba — el dato estaba a seis pantallazos de scroll, debajo del embudo y de
   las señales de Wompi, que son para entender y no para actuar.

   ORDEN POR URGENCIA, NO POR CANTIDAD: lo trae el endpoint en «orden», decidido
   junto a cada consulta. Y dentro de cada fila la ANTIGÜEDAD SE LEE ANTES QUE
   EL CONTEO, que es la regla que ya gobierna la tabla de abajo: de una cola no
   importa cuántos hay, importa desde cuándo esperan. */
function pintarDecisiones(d){
  var caja = document.getElementById("decisiones"); if (!caja) return;
  var h = "";

  /* Las alarmas van ARRIBA de todo y no son una cola: significan que el sitio
     le está prometiendo algo a alguien que no se está cumpliendo ahora mismo. */
  var alarmas = [];
  if (d.webhooks && d.webhooks.sin_evidencia_de_cobro){
    alarmas.push("El cobro no está probado en producción: cero eventos de Wompi en toda la historia de la base.");
  }
  if (d.correo && d.correo.nada_salio){
    alarmas.push("Ningún correo ha salido de verdad. Quien donó, se ofreció o aplicó no recibió nada.");
  }

  var pend = (d.cola || []).filter(function(c){ return c.n > 0; })
    .sort(function(a,b){ return (a.orden || 999) - (b.orden || 999); });

  if (!alarmas.length && !pend.length){
    caja.innerHTML = '<div class="dec-caja"><h2 class="dec-t">Nada esperando</h2>'
      + '<p class="mu" style="margin:0;font-size:13.5px">Las diez colas están en cero. '
      + 'Lo de abajo es para entender el sistema, no para actuar sobre él.</p></div>';
    return;
  }

  h += '<div class="dec-caja"><h2 class="dec-t">Lo que hay que hacer hoy</h2>';

  for (var i = 0; i < alarmas.length; i++){
    h += '<p class="dec-alarma">' + esc(alarmas[i]) + '</p>';
  }

  if (pend.length){
    h += '<ul class="dec-lista">';
    h += pend.map(function(c){
      /* El mismo umbral que la tabla de abajo: tres días o más se marca. */
      var viejo = c.dias !== null && c.dias >= 3;
      return '<li class="dec-fila' + (viejo ? " dec-viejo" : "") + '">'
        + '<span class="dec-cuando">' + esc(antiguedad(c.dias)) + '</span>'
        + '<span class="dec-n">' + esc(String(c.n)) + '</span>'
        + '<span class="dec-que"><strong>' + esc(COLA_ES[c.clave] || c.clave) + '</strong>'
        + '<small>' + esc(c.arreglo) + '</small></span>'
        + (c.destino
            ? '<a class="dec-ir" href="' + esc(c.destino) + '">Ir</a>'
            : '<span class="dec-ir dec-sinir">sin pantalla</span>')
        + '</li>';
    }).join("");
    h += '</ul>';
  }

  h += '</div>';
  caja.innerHTML = h;
}

function cargarSalud(){
  fetch("/api/admin/salud").then(function(r){ return r.json(); }).then(function(d){
    /* Se pinta con los MISMOS datos y sin una petición más: la portada y esta
       sección salen del mismo /api/admin/salud. */
    pintarDecisiones(d);
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
var TIPO_ES = { voluntario:"Voluntario", fundacion:"Fundación", empresa:"Empresa", ingeniero:"Ingeniero", apadrinamiento:"Apadrinamiento" };
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

/* EL AVISO DE TRUNCADO, y va al FINAL de la tabla a propósito: es donde el
   lector concluye «esto es todo», así que es donde engaña. Un tope callado hace
   que el caso 201 no exista para nadie mientras la familia espera — la misma
   clase de fallo que los borradores que ningún código leía. */
function filaTope(d, columnas, que){
  if (!d || !d.total || !d.tope || d.total <= d.tope) return "";
  var faltan = d.total - d.tope;
  return '<tr><td colspan="' + columnas + '" style="background:var(--amber-bg,#fff8e6);font-size:13px">'
    + "<strong>Faltan " + faltan + " " + que + " por mostrar</strong> · se enseñan "
    + d.tope + " de " + d.total + ". Usa los filtros para acotar."
    + "</td></tr>";
}

function cargarInscripciones(){
  fetch("/api/admin/inscripciones").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("i-filas"); if (!tb) return;
    var l = d.inscripciones || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="7">Todavía no ha aplicado nadie.</td></tr>'; return; }
    tb.innerHTML = filaTope(d, 7, "postulaciones") + l.map(function(i){
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
    tb.innerHTML = filaTope(d, 7, "casos") + l.map(function(c){
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

var RESPALDO = null;

function leerRespaldo(){
  var inp = document.getElementById("imp-arch");
  var f = inp && inp.files && inp.files[0];
  if (!f) return Promise.resolve(null);
  return new Promise(function(res, rej){
    var l = new FileReader();
    l.onload  = function(){ res(String(l.result)); };
    l.onerror = function(){ rej(l.error); };
    l.readAsText(f);
  }).then(function(t){
    var d = JSON.parse(t);
    if (d.respaldo !== "inspecciones-mira-mi-casa") throw new Error("no_es_un_respaldo");
    return d;
  });
}

function mirarRespaldo(){
  var de = document.getElementById("imp-de");
  document.getElementById("imp-res").innerHTML = "";
  RESPALDO = null;
  de.textContent = "Leyendo el archivo…";
  leerRespaldo().then(function(d){
    if (!d) { de.textContent = ""; return; }
    RESPALDO = d;
    var c = (d.cola || []).length, b = (d.borradores || []).length;
    if (d.correo && !document.getElementById("imp-correo").value) {
      document.getElementById("imp-correo").value = d.correo;
    }
    de.innerHTML = "El respaldo dice que salió de <strong>" + esc(d.observador || "sin nombre") + "</strong>"
      + (d.correo ? " (" + esc(d.correo) + ")" : ", <strong>sin correo dentro</strong>: escríbelo a mano")
      + ", el " + esc(d.generado_en || "-") + ". Trae <strong>" + c + "</strong> por enviar y <strong>"
      + b + "</strong> a medias.";
  }).catch(function(x){
    de.textContent = (x && x.message === "no_es_un_respaldo")
      ? "Ese archivo no es un respaldo de inspecciones."
      : "No se pudo leer el archivo. ¿Llegó completo por WhatsApp?";
  });
}

function importarRespaldo(){
  var b = document.getElementById("b-imp"), r = document.getElementById("imp-res");
  var correo = document.getElementById("imp-correo").value.trim();
  if (!RESPALDO){ r.innerHTML = '<p class="mu">Elige primero el archivo que te mandó el ingeniero.</p>'; return; }
  if (!correo){ r.innerHTML = '<p class="mu">Falta el correo del ingeniero.</p>'; return; }
  b.disabled = true; b.textContent = "Cargando…";
  r.innerHTML = '<p class="mu">Cargando. Con fotos puede tardar un rato: no cierres la pestaña.</p>';
  fetch("/api/admin/inspecciones/importar", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: correo, cola: RESPALDO.cola || [], borradores: RESPALDO.borradores || [] })
  }).then(function(x){ return x.json(); }).then(function(d){
    b.disabled = false; b.textContent = "Cargar el respaldo";
    if (!d.ok){ r.innerHTML = '<p style="color:var(--err)">' + esc(d.ayuda || d.error || "No se pudo cargar.") + '</p>'; return; }
    var l = d.informe || [];
    var bien = l.filter(function(x){ return x.numero && !x.repetida; }).length;
    var yaS = l.filter(function(x){ return x.repetida; }).length;
    var mal = l.filter(function(x){ return !x.numero; }).length;
    r.innerHTML = "<p><strong>" + bien + (bien === 1 ? " cargada" : " cargadas")
      + (yaS ? " · " + yaS + (yaS === 1 ? " ya estaba" : " ya estaban") : "")
      + (mal ? ' · <span style="color:var(--err)">' + mal + " sin cargar</span>" : "") + "</strong></p>"
      + l.map(function(x){
          if (x.numero) return '<div style="font-size:13px;padding:3px 0">' + esc(x.familia)
            + " → <strong>" + esc(x.numero) + "</strong>" + (x.repetida ? " (ya estaba)" : "")
            + (x.fotos && x.fotos.fallidas
                ? ' · <span style="color:var(--amber)">' + x.fotos.fallidas + " sin subir</span>" : "")
            + "</div>";
          return '<div style="font-size:13px;padding:3px 0;color:var(--err)">' + esc(x.familia) + " — "
            + esc(x.ayuda || x.error)
            + (x.faltan ? ": falta " + esc(x.faltan.join(", ")) : "") + "</div>";
        }).join("");
    cargarInspecciones();
  }).catch(function(){
    b.disabled = false; b.textContent = "Cargar el respaldo";
    r.innerHTML = '<p style="color:var(--err)">No se pudo cargar. Revisa la conexión y vuelve a intentar: '
      + 'lo que ya entró no se duplica.</p>';
  });
}

function cargarInspecciones(){
  fetch("/api/admin/inspecciones").then(function(r){ return r.json(); }).then(function(d){
    var tb = document.getElementById("ins-filas"); if (!tb) return;
    var l = d.inspecciones || [];
    if (!l.length){ tb.innerHTML = '<tr><td colspan="8">Todavía no ha llegado ninguna inspección de terreno.</td></tr>'; return; }
    tb.innerHTML = filaTope(d, 8, "inspecciones") + l.map(function(v){
      var m = v.marcas || {};
      /* El conteo de RE va en negrita cuando hay alguno: es el dato que decide
         si esta fila se mira hoy o mañana. */
      var cuentas = (m.RE ? "<strong>" + m.RE + " RE</strong>" : "0 RE")
                  + " · " + (m.OBS || 0) + " Obs · " + (m.SO || 0) + " S/O";

      /* «Sin firma» NO es «no autorizó». El motivo va al lado, siempre, porque
         sin él las dos cosas se leen igual. */
      var firma = v.firma_hab_key
        ? "firmó"
        : '<span style="color:var(--amber)">sin firma</span>'
          + (v.firma_hab_motivo ? "<br><small>" + esc(v.firma_hab_motivo) + "</small>"
                                : "<br><small>sin motivo registrado</small>");

      var doc = v.pdf_key
        ? '<a href="/api/triage/inspeccion/' + esc(v.numero) + '.pdf" target="_blank" rel="noopener">Ver PDF</a>'
        : '<span style="color:var(--err)">sin documento</span>'
          + '<br><button class="copy" data-inspdf="' + esc(v.numero) + '">Emitirlo</button>';

      /* Las dos fechas se enseñan JUNTAS cuando no coinciden: es lo que revela
         que el reporte se llenó sin señal y llegó después, y confundirlas haría
         parecer del viernes un recorrido del martes. */
      var visita = esc(v.fecha_visita || "-") + (v.hora ? " " + esc(v.hora) : "");
      var recib = (v.recibido_en || "").slice(0,10);
      if (recib && v.fecha_visita && recib !== v.fecha_visita) {
        visita += "<br><small>recibida el " + esc(recib) + "</small>";
      }

      return "<tr>" +
        "<td><strong>" + esc(v.numero) + "</strong>" +
          (v.caso ? "<br><small>" + esc(v.caso) + "</small>" : "") +
          (v.requiere_esp ? '<br><small style="color:var(--amber)"><strong>requiere revisión especializada</strong></small>' : "") +
          (v.urgente ? '<br><small style="color:var(--err)"><strong>PELIGRO INMINENTE — el ingeniero pidió priorizar</strong></small>' : "") + "</td>" +
        "<td>" + esc(v.familia || "-") +
          (v.finca ? "<br><small>" + esc(v.finca) + "</small>" : "") + "</td>" +
        "<td>" + esc(v.municipio || "-") +
          (v.casa_no ? "<br><small>casa " + esc(v.casa_no) + "</small>" : "") +
          (v.direccion ? "<br><small>" + esc(v.direccion) + "</small>" : "") + "</td>" +
        "<td>" + visita + "</td>" +
        "<td>" + esc(v.obs_nombre || "-") +
          (v.obs_matricula ? "<br><small>mat. " + esc(v.obs_matricula) + "</small>" : "") + "</td>" +
        "<td>" + cuentas + (v.nReco ? "<br><small>" + v.nReco + (v.nReco === 1 ? " recomendación" : " recomendaciones") + "</small>" : "") + "</td>" +
        "<td>" + firma + "</td>" +
        "<td>" + doc + "</td>" +
      "</tr>";
    }).join("");
  });
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
  if (e.target.closest("#b-imp")) { importarRespaldo(); return; }
  var ip = e.target.closest("[data-inspdf]");
  if (ip){
    ip.disabled = true; ip.textContent = "Emitiendo…";
    fetch("/api/admin/inspeccion/" + encodeURIComponent(ip.getAttribute("data-inspdf")) + "/pdf",
      { method: "POST" })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d.ok) { cargarInspecciones(); return; }
        ip.disabled = false; ip.textContent = d.ayuda ? "No se pudo" : "No se pudo";
        alert(d.ayuda || d.error || "No se pudo emitir el documento.");
      })
      .catch(function(){ ip.disabled = false; ip.textContent = "No se pudo"; });
    return;
  }

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
  }).then(function(r){ return r.json(); }).then(function(){ cargarOfrecimientos(); cargarReportadas(); cargarResumen(); cargarAportes(); })
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
  /* Al elegir el archivo se lee ANTES de cargar nada, por dos razones: rellenar
     el correo que el respaldo trae —teclearlo mal atribuye a otra persona un
     documento firmado— y decir qué hay dentro antes de mandarlo. */
  if (e.target.id === "imp-arch"){ mirarRespaldo(); return; }
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
/* Faltaba: la bandeja de transferencias solo se refrescaba DESPUÉS de confirmar
   o descartar una, así que en una carga limpia se quedaba en «Cargando…» para
   siempre. Estuvo tapado mientras el archivo entero no compilaba. */

fetch("/api/admin/quien").then(function(r){ return r.json(); })
  .then(function(d){ document.getElementById("quien").textContent = "Sesión de " + (d.email || "?") + "."; })
  .catch(function(){});
/* ---- LAS BANDEJAS SE PIDEN CUANDO SE VAN A VER ----

   Antes el panel disparaba ONCE peticiones al abrirlo y pintaba ocho tablas que
   casi nadie miraba en esa visita: entrabas a hacer una cosa y pagabas por las
   ocho. Ahora al abrir solo van tres —quien eres, el resumen del titulo y la
   salud, que es la que alimenta la portada de decisiones— y cada bandeja se
   pide cuando su tabla se acerca a la pantalla.

   SE OBSERVA LA TABLA Y NO LA SECCION, a proposito: la lista de aportes vive
   dentro de «Salud del ecosistema», que esta arriba del todo, asi que observar
   el encabezado la habria pedido siempre. Lo que decide es si vas a VER esa
   tabla, no en que seccion esta escrita.

   Y engancha con la portada: cuando tocas «Ir» y saltas a una seccion, el salto
   es instantaneo y no arrastra por las de en medio, asi que se pide esa y nada
   mas. */
var BANDEJAS = {
  "filas": cargarAportes,
  "t-filas": cargarReportadas,
  "i-filas": cargarInscripciones,
  "cs-filas": cargarCasos,
  "ins-filas": cargarInspecciones,
  "o-filas": cargarOfrecimientos,
  "p-filas": cargarSueltos,
  "e-filas": cargarEntregas
};

function armarBandejas(){
  var pedidas = {};
  var pedir = function(id){
    if (pedidas[id]) return;
    pedidas[id] = true;
    BANDEJAS[id]();
  };

  /* Sin IntersectionObserver se piden todas, o sea como estaba antes. Una carga
     pesada es peor que nada, pero una tabla que no llega NUNCA es mucho peor:
     es exactamente el fallo que el gate vigila desde que cargarReportadas se
     quedo en «Cargando…» para siempre. */
  if (!window.IntersectionObserver){
    Object.keys(BANDEJAS).forEach(pedir);
    return;
  }

  /* SE OBSERVA EL CONTENEDOR DE LA TABLA, no el tbody. Un tbody es
     display:table-row-group y no es un elemento del que quiera depender algo
     que, si falla, deja ocho tablas vacias sin que nada avise. El div .med-tw
     esta en el mismo sitio de la pagina y es una caja normal. Como ese div no
     tiene id propio, se guarda el vinculo elemento -> bandeja en un mapa.

     300px de margen: se pide antes de que la tabla asome, asi que en la
     practica nadie llega a leer el texto de espera. */
  var deQuien = new Map();
  var obs = new IntersectionObserver(function(entradas){
    for (var i = 0; i < entradas.length; i++){
      if (!entradas[i].isIntersecting) continue;
      obs.unobserve(entradas[i].target);
      pedir(deQuien.get(entradas[i].target));
    }
  }, { rootMargin: "300px 0px" });

  Object.keys(BANDEJAS).forEach(function(id){
    var el = document.getElementById(id);
    /* Si el contenedor no esta en el HTML, se pide igual: quedarse esperando a
       un elemento que no existe es como no pedirlo nunca. */
    if (!el) { pedir(id); return; }
    var caja = el.closest(".med-tw") || el;
    deQuien.set(caja, id);
    obs.observe(caja);
  });
}

/* EL ARRANQUE TAMBIEN ES UNA LISTA, y no por simetria.

   El gate comprobaba las llamadas de arranque buscandolas en la columna 0 del
   JS emitido, y eso resulto ser falso: un salto de linea dentro de un manejador
   de clic dejo "cargarInspecciones();" en columna 0 DENTRO de una funcion, el
   gate lo conto como arranque, y la bandeja de inspecciones llevaba tiempo
   quedandose en «Cargando…» en cada carga limpia. El check que existia para
   atrapar ese fallo exacto lo estaba tapando.

   Con el arranque y las bandejas como datos, el gate no tiene que adivinar
   donde empieza una sentencia: lee dos listas. */
var ARRANQUE = [cargarSalud, cargarResumen];
ARRANQUE.forEach(function(f){ f(); });
armarBandejas();
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

    /* EL TRIAJE NO EXISTE EN EL SUBDOMINIO, y hasta hoy eso era un callejón sin
       salida: `miramicasa.…/triaje` respondía 403 y ahí se acababa. La
       aplicación de Cloudflare Access cubre el ÁPEX y está en su tope de
       hostnames, así que la pantalla del ingeniero vive allá y no se puede
       mudar. Pero un 403 no se lo explica a nadie.

       Le pasó a `/ruta` por lo mismo y se resolvió igual: redirigir en vez de
       dejar morir el enlace. Va FUERA del guardián de Access —dentro nunca se
       alcanzaría— y conserva la ruta completa, así que
       `miramicasa.…/triaje/inspeccion` aterriza en el formulario del ápex y no
       en su portada.

       Importa hoy y no en abstracto: en terreno alguien va a escribir el
       subdominio, que es el nombre que la familia conoce, y toparse con un 403
       en mitad de una jornada sin señal buena no se recupera. */
    if (HOST_MMC.test(url.hostname) && (ruta === "/triaje" || ruta.startsWith("/triaje/") || ruta === "/triaje.js")) {
      /* AL ÁPEX Y NO A `ORIGIN`, que lleva www. Comprobado hoy: la aplicación de
         Access vive sobre el ápex; `www` responde con su propia redirección al
         ápex y solo entonces entra Access. Usar www funcionaría con DOS saltos y
         apoyándose en esa redirección intermedia — para la herramienta que
         alguien abre en la calle, con señal mala, prefiero un salto y ninguna
         dependencia de más. Se deriva de la misma constante para no tener dos
         cadenas de host que puedan separarse. */
      const apex = ORIGIN.replace("://www.", "://");
      return Response.redirect(new URL(ruta + url.search, apex).toString(), 301);
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
      /* 302 Y `no-store`, no 301. Esta URL lleva el token de la familia en la
         query —es lo único con lo que vuelve a su caso— y un 301 es cacheable
         para siempre: el navegador lo fija y una caché compartida puede
         guardarlo. Para una URL que carga un secreto, la redirección tiene que
         ser temporal y no almacenarse. Se construye a mano porque
         Response.redirect no admite cabeceras. */
      return new Response(null, {
        status: 302,
        headers: {
          location: ORIGIN_MMC + ruta + url.search,
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow"
        }
      });
    }

    /* --- Evaluación externa de Access: PÚBLICA a la fuerza ---
       Las llama Cloudflare, no un navegador con sesión, así que van ANTES del
       guardián. Detrás de él serían un bloqueo mutuo: Access esperando nuestra
       respuesta para dejar pasar la petición con la que se la pedimos.
       Su propia seguridad es el JWT firmado por Access que traen en el cuerpo,
       que se verifica contra los certificados del equipo. */
    if (ruta === "/api/alma")           return await apiAlma(request, env, url);
    if (ruta === "/api/access/claves")  return await accessClaves(env);
    if (ruta === "/api/access/evaluar") return await accessEvaluar(request, env);

    /* --- Panel interno: TODO detrás de Access, y fail-closed --- */
    /* `/api/triage/` entra por el MISMO guardián que el panel: hereda la
       verificación real de firma RS256 y el fail-closed. Los ingenieros
       voluntarios se aprueban añadiendo su correo en Cloudflare Access, no
       creando cuentas: cero contraseñas que guardar y cero que se filtren. */
    if (ruta === "/admin" || ruta === "/admin.js" || ruta.startsWith("/admin/") || ruta.startsWith("/api/admin/") || ruta.startsWith("/api/triage/") || ruta === "/triaje" || ruta === "/triaje.js" || ruta.startsWith("/triaje/") || ruta === "/triage" || ruta === "/triage.js") {
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
      /* Las SUBRUTAS de /triaje entran con la audiencia del triaje: la
         inspección en terreno la llena un ingeniero, no el equipo. Comprobado
         contra producción que Access cubre `/triaje/*` con esa audiencia
         (302 con su kid), así que no gastó un cupo nuevo de hostnames. */
      const esTriage = ruta === "/triaje" || ruta === "/triaje.js" || ruta.startsWith("/triaje/") || ruta === "/triage" || ruta === "/triage.js" || ruta.startsWith("/api/triage/");
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
        /* La inspección de terreno. Tres piezas: la pantalla, su JS y el
           service worker. El SW se sirve desde /triaje/ para que su ámbito no
           alcance el sitio público — un fallo aquí no puede romper la portada.

           ⚠️ `/triaje/*` tuvo que entrar en `run_worker_first` de
           wrangler.toml. Sin eso la capa de assets se traga la ruta y devuelve
           el index.html público con un 200: le pasó a /api/*, a /triaje y a
           /ruta. Tres cicatrices de lo mismo. */
        if (ruta === "/triaje/inspeccion") {
          const cuerpo = inspeccionHTML(
            JSON.stringify({
              secciones: INSPECCION_SECCIONES,
              ayuda: INSPECCION_AYUDA,
              anchos: INSPECCION_ANCHOS,
              glosario: INSPECCION_GLOSARIO,
              limites: INSPECCION_LIMITES,
              reglaVista: INSPECCION_REGLA_VISTA,
              recomienda: INSPECCION_RECOMENDA,
              mensaje: INSPECCION_MENSAJE_COMUNIDAD,
              /* Va en el paquete y no en un argumento nuevo para que el
                 respaldo diga de QUÉ cuenta salió: sin eso, un archivo que
                 llega por WhatsApp no se puede atribuir a nadie. */
              correo: sesion.email || ""
            }),
            esc(INSPECCION_ALCANCE),
            esc(INSPECCION_CONSENT)
          );
          return new Response(cuerpo, { headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-robots-tag": "noindex, nofollow"
          }});
        }
        if (ruta === "/triaje/inspeccion.js") {
          return new Response(inspeccionJS(), { headers: {
            "content-type": "text/javascript; charset=utf-8",
            "cache-control": "no-store"
          }});
        }
        if (ruta === "/triaje/inspeccion-sw.js") {
          return new Response(inspeccionSW(), { headers: {
            "content-type": "text/javascript; charset=utf-8",
            "cache-control": "no-store",
            /* Sin esto el navegador limita el ámbito del SW a su propia
               carpeta y no podría servir /triaje/inspeccion. */
            "service-worker-allowed": "/triaje/"
          }});
        }
        if (ruta === "/api/triage/mis-inspecciones") return await triageMisInspecciones(env, sesion);
        const mf = ruta.match(/^\/api\/triage\/inspeccion\/(IV-\d{4}-\d{6})\/foto$/);
        if (mf) return await triageInspeccionFoto(request, env, mf[1], sesion);
        const mp = ruta.match(/^\/api\/triage\/inspeccion\/(IV-\d{4}-\d{6})\.pdf$/);
        if (mp) return await triageInspeccionPDF(env, mp[1], sesion);
        if (ruta === "/api/triage/inspeccion") {
          return await triageInspeccionRecibir(request, env, sesion.email);
        }

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
        if (ruta === "/api/admin/buscar")   return await adminBuscar(env, url);
        if (ruta === "/api/admin/inspecciones/importar") return await adminInspeccionesImportar(request, env);
        if (ruta === "/api/admin/inspecciones") return await adminInspecciones(env);
        const mip = ruta.match(/^\/api\/admin\/inspeccion\/(IV-\d{4}-\d{6})\/pdf$/);
        if (mip) return await adminInspeccionEmitirPDF(request, env, mip[1]);
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
