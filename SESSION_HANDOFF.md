# Informe de Cierre de Sesión — Give&Grow

_Última actualización: 02/07/2026. Sitio: https://www.thegiveandgrowproject.org — repo `SebasGiveandGrow/givegrow-website` (rama `main`)._

## 1. Completado y desplegado en esta sesión (14 commits, CI + Cloudflare en verde)

**Contenido y conversión**
- `b2be9b87` Logo real de NDF en tarjeta · `ac7b5350` Calculadora con aporte único · `f2fc82fc` contabilidad@ + pluralización de impacto · `a9bec272` FAQ del HUB · `468e55fb` pulido de auditoría (responsive, a11y, sin "Medellín" en marketing)
- `b8e3a621` **Membresías**: precios COP+USD (20k/50k/120k/250k), beneficios escalonados honestos (sin Hope Market/sorteos = fase 2), Gratitud desde Retoño como beneficio voluntario de terceros, umbrales de calculadora en COP, política de cancelación (contabilidad@)
- `5df764e1` **Fondos** en Transparencia (híbrido + compromiso ≥80/≤10/≤10 etiquetado como compromiso, pendiente aval consejo/Manuela) · 5 rutas con ejemplos reales/futuros · Origen con hitos documentados (19-may-2025 Cámara; 2026 aliadas+Impact Journey) · FAQ a 10 preguntas (visible+JSON-LD) · sección "Pago seguro" lista para Wompi

**Infraestructura, seguridad y datos**
- `c94394a9` Fix números duplicados en pasos (`.step-n` oculto) + HSTS + CSP report-only
- `7b4d3df9` Mapa rediseñado (CARTO Positron, pines CSS por tipo, leyenda, fitBounds) + **Leaflet auto-alojado** en `/vendor/leaflet` + **CSP en firme** sin unpkg
- `05afae10` **`data/partners.json` fuente única** (mapa + calculadora) + transición nativa de idioma (View Transitions) + skeleton del mapa + **cache-busting por hash** + fix Instagram (`instagram.com/ninos.del.futuro`)
- `fceed867` **Fuentes variable auto-alojadas** (`/vendor/fonts`, cero Google CDN; CSP style/font = 'self') + **EN perezoso** (`/i18n/en.json`, app.js −32%) + muro "La red" + timeline scroll-driven en Origen + `scripts/validate.mjs`
- `0dbd9aee` **Gate de CI**: validate.mjs corre en Actions antes de cada deploy
- `e4e8f508` Iconos SVG draw-on-hover + 5 rutas como recorrido horizontal + chip de impacto en hero + stats bento + "Rutas del modelo"
- `5766a80a` **Nav 3 grupos** (El Hub/Súmate/Nosotros) + botón Donar fijo + drawer agrupado + FAQ al menú + **mini-tarjetas de aliadas** + **ficha dinámica `#fundacion/<id>`** (perfil NDF completo desde partners.json) + mesh gradient en CTAs

## 2. Pendientes (próxima sesión)
1. **Tarjeta aliada**: mejorar proporción/visual del logo en `.pcard-logo` (hoy 56px crop; usar `object-fit:contain` + padding).
2. **Imágenes de Instagram en la ficha**: la API de IG requiere cuenta business + app review (frágil). Recomendado: galería curada auto-alojada (`gallery[]` en partners.json) con consentimiento — mismo resultado, cero dependencia.
3. **Cuestionario de fundaciones**: Google Form espejo del esquema `profile{}` de partners.json (líder, año, zona, población, programas+cifras, unidad de impacto+costo real, links, logo, fotos con consentimiento firmado).
4. Capa fotográfica (usuario subirá fotos elegidas AL CHAT — Drive no da preview/transfer viable de binarios grandes). Carpeta Drive: "Fotos Diseño Web CLAUDE" (35 fotos + 13 videos).
5. Modo oscuro (tokens ya decididos: fondo #0F1613, superficie #1A231D, texto #EFEDE6, primario #6FB08D) — sesión dedicada.
6. **#14** delegación de eventos (~70 onclick inline → data-action) para retirar `'unsafe-inline'` del CSP.
7. ROUTE_META + OG por ficha; ALMA alimentada por partners.json; selector de impacto (#11) al existir 2ª unidad.
8. Wompi: al aprobar la cuenta, usuario envía **llave pública** + links/planes por nivel → cablear botones + dominios Wompi al CSP.
9. Aval de Manuela/consejo: % de fondos y encuadre Art. 257 de Gratitud.

## 3. Prompt para el nuevo chat
> Continúo el sitio de Give&Grow (SPA en Cloudflare Workers, repo `SebasGiveandGrow/givegrow-website`). Lee primero `SESSION_HANDOFF.md`, `.clauderules` y `DESIGN_SYSTEM.md` en la raíz. Arquitectura: `index.html` + `app.js` (ES embebido) + `/i18n/en.json` (EN perezoso) + `data/partners.json` (fuente única de la red) + `/vendor` (Leaflet y fuentes auto-alojadas). Valida con `node scripts/validate.mjs` y render headless Playwright antes de cada deploy (Trees API, versionado por hash). Reglas de oro: paridad i18n exacta, cero emojis (SVG line-art), "evidencia, no promesas", CSP en firme (no añadir orígenes sin editar `_headers`).
