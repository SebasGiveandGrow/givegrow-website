/**
 * alma-parche-red.js — Red viva para ALMA
 * ----------------------------------------------------------------------
 * Pegar en el Worker `givegrow-alma` (Cloudflare). Alimenta el system
 * prompt de ALMA con los datos reales de `data/partners.json` del sitio,
 * respetando `consent{}` y degradando a vacío si algo falla.
 *
 * INTEGRACIÓN (2 líneas en el handler del chat, antes de llamar al modelo):
 *
 *   const networkContext = await buildNetworkContext();          // línea 1
 *   const system = SYSTEM_PROMPT + networkContext;               // línea 2
 *
 * (Si el worker arma `messages` con un rol system, concatenar ahí.)
 * No requiere bindings ni variables nuevas: usa fetch público + caché edge.
 * Regenerado: 03/07/2026 sobre el esquema actual (gallery[], consent{}).
 */

const PARTNERS_URL = "https://www.thegiveandgrowproject.org/data/partners.json";
const CACHE_TTL_SECONDS = 3600; // 1 hora en el edge

/**
 * Devuelve un bloque de texto para anexar al system prompt de ALMA.
 * Si la red no está disponible, devuelve "" y ALMA sigue funcionando
 * con su prompt base (degradación silenciosa, sin romper el chat).
 */
export async function buildNetworkContext() {
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
      // Puerta de consentimiento: el hub propio está exento; para
      // fundaciones, el nombre solo se usa si consent.name !== false.
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
        const progs = pr.programs
          .map((g) => `${g.name}: ${es(g.desc)}`)
          .join(" | ");
        parts.push(`programas: ${progs}`);
      }
      if (pr.hub) parts.push(`relación con el Hub: ${es(pr.hub)}`);

      if (Array.isArray(p.impactUnits) && p.impactUnits.length) {
        const units = p.impactUnits
          .map((u) => `1 ${u.es} ≈ $${Number(u.cop).toLocaleString("es-CO")} COP`)
          .join("; ");
        parts.push(`unidad de impacto documentada: ${units}`);
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
      "- Responde SOLO con lo que aparece arriba. No inventes fundaciones, programas, cifras, logros ni fechas.",
      "- Si te preguntan algo de una aliada que no está en estos datos, dilo con honestidad: \"No tengo ese dato confirmado\" y sugiere el perfil en el sitio o el contacto de Give&Grow.",
      "- Las equivalencias de impacto son aproximadas: usa siempre \"≈\" o \"cerca de\", nunca las presentes como exactas.",
      "- No des datos de contacto personales de los líderes más allá del nombre.",
      "- Principio de la organización: evidencia, no promesas.",
      "=== FIN DE DATOS DE LA RED ===",
    ].join("\n");
  } catch {
    // Sin red no hay contexto, pero ALMA nunca se cae por esto.
    return "";
  }
}
