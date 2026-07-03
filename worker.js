/* Worker Give&Grow — rutas de compartir /f/<id>.
   Solo intercepta /f/* (run_worker_first en wrangler.toml); todo lo demás
   lo sirven los assets estáticos como siempre.
   Objetivo: que WhatsApp/Facebook/Twitter (que no ejecutan JS) reciban
   los metadatos OG propios de cada fundación al compartir su ficha. */

const ORIGIN = "https://www.thegiveandgrowproject.org";

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/f\/([a-z0-9-]+)\/?$/);
    if (m) {
      try {
        const r = await env.ASSETS.fetch(new URL("/data/partners.json", url.origin));
        const j = await r.json();
        const p = (j.partners || []).find(
          (x) => x.id === m[1] && x.type === "foundation" && (!x.consent || x.consent.name !== false)
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
    return env.ASSETS.fetch(request);
  }
};
