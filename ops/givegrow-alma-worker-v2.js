/**
 * givegrow-alma — Worker endurecido (v2, julio 2026)
 * ============================================================
 * REEMPLAZA por completo el código del Worker `givegrow-alma`.
 *
 * Qué corrige frente a la versión anterior:
 *  1. El MODELO y MAX_TOKENS se fijan AQUÍ. Lo que mande el cliente se ignora.
 *     (Antes: cualquiera podía pedir modelos caros con tu API key.)
 *  2. El SYSTEM PROMPT vive AQUÍ. Lo que mande el cliente se ignora.
 *     (Antes: cualquiera podía usar tu Worker como proxy gratuito de Claude.)
 *  3. Solo acepta peticiones cuyo Origin sea el sitio oficial.
 *  4. Rate limiting por IP (ventana de 60s) + tope de tamaño de conversación.
 *  5. Valida la entrada: solo roles user/assistant, texto plano, con límites.
 *
 * Requisito (ya lo tienes si ALMA funciona hoy): el secreto ANTHROPIC_API_KEY
 * en Settings → Variables del Worker. No requiere bindings nuevos.
 *
 * Recomendación adicional (no código): en el dashboard de Cloudflare,
 * Security → WAF → Rate limiting rules, crear una regla sobre esta ruta
 * (p. ej. 30 req/min por IP). El límite en memoria de abajo ayuda, pero una
 * regla WAF protege incluso entre reinicios del Worker.
 */

/* ---------------- configuración fija (el cliente NO puede cambiarla) ---------------- */

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

const ALLOWED_ORIGINS = [
  "https://www.thegiveandgrowproject.org",
  "https://thegiveandgrowproject.org",
];

// Límites de entrada
const MAX_MESSAGES = 24;          // últimos N mensajes de la conversación
const MAX_CHARS_PER_MSG = 2000;   // caracteres por mensaje
const MAX_BODY_BYTES = 64 * 1024; // 64 KB de cuerpo máximo

// Rate limit en memoria por IP (por aislamiento del Worker)
const RL_WINDOW_MS = 60_000;
const RL_MAX_REQ = 10;
const rlMap = new Map();

/* ---------------- system prompt (fuente única, del lado del servidor) ---------------- */

const ALMA_SYS = `Eres ALMA (Asistente de Labor Misional y Alianzas), la IA de Fundación Give&Grow International. Respondes de forma clara, cálida y concisa. Máximo 3 párrafos por respuesta. No uses listas extensas. Responde en el idioma del usuario.

GIVE&GROW: Fundación colombiana ESAL (NIT 901.948.930-2, RTE Código 04 DIAN). Fundada el 19 de mayo de 2025 en Medellín. Fundador: Juan Sebastián Navarro Osorio, casi 4 años de trabajo en zonas de difícil acceso (La Guajira, Sierra Nevada, Medellín). Tagline: "Dar para crecer, crecer para dar más". Web: www.thegiveandgrowproject.org. Contacto: sebas@thegiveandgrowproject.org / +57 315 330 5028.

MISIÓN: Conectar generosidad con necesidad de forma estratégica y con trazabilidad completa. No reemplazamos fundaciones, las amplificamos.

IMPACTOS Y ALMA: ImpactOS es el sistema operativo de Give&Grow (la plataforma digital del ecosistema). ALMA es su interfaz inteligente. Give&Grow es el ecosistema completo. ALMA es a Give&Grow lo que Siri es al iPhone.

HUB SOCIAL: Centro operativo en Medellín. 5 rutas: R1 Alianzas con Fundaciones, R2 Gestión de Donaciones, R3 Social Grow, R4 Impact Journey, R5 Conexión Laboral. Proceso: visita de contexto, onboarding, gestión de necesidades, entrega con acta, reporte fotográfico al donante.

DONACIONES: Transferencia a Bancolombia Cuenta de Ahorros 31000009221 (NIT 901.948.930-2). Enviar comprobante a contabilidad@thegiveandgrowproject.org. El donante recibe en 24h confirmación, credencial digital y certificado tributario, más reportes fotográficos mensuales.

BENEFICIO TRIBUTARIO: 25% de descuento sobre el impuesto de renta a cargo (Art. 257 ET), en los términos y límites que contempla la ley. Ejemplo: 4.000.000 COP donados = hasta 1.000.000 COP menos de impuesto, según la situación tributaria del donante.

MEMBRESÍAS: Semilla, Retoño, Árbol y Bosque (niveles crecientes de aporte mensual), Temporal (donación única) y Honor (por invitación).

PROGRAMA DE GRATITUD: Red de empresas aliadas con descuentos exclusivos para todos los miembros activos. Categorías: gastronomía, moda, belleza, bienestar, odontología.

RSE EMPRESARIAL: 3 puertas cumplibles hoy: Padrinazgo de Impacto (presupuesto traducido a unidades reales con certificado y reporte), Impact Journey (voluntariado corporativo en doble vía, Ruta 4) y Alianza a medida (co-creación de programas). El aporte se define a la medida de cada empresa; invita a escribir para una propuesta personalizada.

POBLACIONES OBJETIVO: la misión busca impactar todo tipo de población vulnerable a través de las fundaciones del HUB. Las que hoy guían el objeto social: niñez en riesgo, comunidades indígenas, comunidades campesinas, personas en situación de calle, adultos mayores, animales en maltrato, personas en rehabilitación, personas privadas de la libertad. La cobertura real crece con cada aliada verificada.

Más de 25 fundaciones preaprobadas en la red de espera; la vinculación formal se confirma una a una con verificación. Hoy el muro muestra las aliadas ya verificadas.`;

/* ---------------- red viva (datos reales de partners.json, con consentimiento) ---------------- */

const PARTNERS_URL = "https://www.thegiveandgrowproject.org/data/partners.json";
const CACHE_TTL_SECONDS = 3600;

async function buildNetworkContext() {
  try {
    const res = await fetch(PARTNERS_URL, {
      cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const partners = Array.isArray(data?.partners) ? data.partners : [];
    if (!partners.length) return "";

    const lines = [];
    for (const p of partners) {
      const c = p.consent || {};
      if (p.type === "foundation" && c.name === false) continue;

      const es = (v) => (v && typeof v === "object" ? v.es : v) || "";
      const parts = [`- ${p.name} (${p.type === "hub" ? "hub" : "fundación aliada"})`];
      if (p.area) parts.push(`zona: ${es(p.area)}`);
      if (p.poblacion) parts.push(`población atendida: ${es(p.poblacion)}`);

      const pr = p.profile || {};
      if (pr.leader) parts.push(`líder: ${pr.leader}`);
      if (pr.years) parts.push(es(pr.years));
      if (pr.about) parts.push(`acerca de: ${es(pr.about)}`);
      if (Array.isArray(pr.programs) && pr.programs.length) {
        parts.push(`programas: ${pr.programs.map((g) => `${g.name}: ${es(g.desc)}`).join(" | ")}`);
      }
      if (pr.hub) parts.push(`relación con el Hub: ${es(pr.hub)}`);
      if (Array.isArray(p.impactUnits) && p.impactUnits.length) {
        parts.push(`unidad de impacto documentada: ${p.impactUnits
          .map((u) => `1 ${u.es} ≈ $${Number(u.cop).toLocaleString("es-CO")} COP`).join("; ")}`);
      }
      if (p.url) parts.push(`web: ${p.url}`);
      if (p.instagram) parts.push(`instagram: ${p.instagram}`);
      lines.push(parts.join(" · "));
    }
    if (!lines.length) return "";

    return [
      "",
      "=== RED DEL HUB SOCIAL (datos en vivo de thegiveandgrowproject.org) ===",
      "Estos son los ÚNICOS datos verificados sobre la red de aliadas:",
      ...lines,
      "",
      "Reglas estrictas sobre estos datos:",
      "- Solo afirma sobre aliadas lo que aparece arriba. Nada de inventar cifras ni fundaciones.",
      "- Si preguntan por una fundación que no está en la lista, di que aún no hace parte de la red verificada.",
    ].join("\n");
  } catch {
    return "";
  }
}

/* ---------------- utilidades ---------------- */

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (rlMap.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX_REQ) { rlMap.set(ip, arr); return true; }
  arr.push(now);
  rlMap.set(ip, arr);
  if (rlMap.size > 5000) rlMap.clear(); // higiene de memoria
  return false;
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    if (typeof m.content !== "string") continue;
    const content = m.content.slice(0, MAX_CHARS_PER_MSG);
    if (!content.trim()) continue;
    msgs.push({ role: m.role, content });
  }
  // La conversación debe empezar por el usuario y alternar razonablemente
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs.length ? msgs : null;
}

/* ---------------- handler ---------------- */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);

    // Preflight
    if (request.method === "OPTIONS") {
      if (!allowed) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") return jsonError("Método no permitido", 405, allowed ? origin : ALLOWED_ORIGINS[0]);

    // 1. Solo el sitio oficial puede llamar a ALMA
    if (!allowed) return jsonError("Origen no autorizado", 403, ALLOWED_ORIGINS[0]);

    // 2. Rate limit por IP
    const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
    if (rateLimited(ip)) {
      return jsonError("Has enviado demasiados mensajes seguidos. Espera un minuto e inténtalo de nuevo.", 429, origin);
    }

    // 3. Cuerpo acotado y bien formado
    const bodyText = await request.text();
    if (bodyText.length > MAX_BODY_BYTES) return jsonError("Solicitud demasiado grande", 413, origin);
    let body;
    try { body = JSON.parse(bodyText); } catch { return jsonError("JSON inválido", 400, origin); }

    // 4. Solo tomamos los mensajes; modelo, tokens y system se fijan aquí
    const messages = sanitizeMessages(body.messages);
    if (!messages) return jsonError("Conversación vacía o inválida", 400, origin);

    // 5. System prompt del servidor + red viva
    const system = ALMA_SYS + (await buildNetworkContext());

    // 6. Llamada a Anthropic con parámetros del SERVIDOR
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
