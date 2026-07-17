# Give&Grow International — Guía del proyecto para Claude Code

Sitio de Fundación Give&Grow International (ESAL, NIT 901.948.930-2, Medellín).
SPA bilingüe (ES/EN) en https://thegiveandgrowproject.org — vanilla JS, sin frameworks.
Deploy: GitHub Actions → Cloudflare Workers, automático al llegar a `main`.

## FLUJO DE TRABAJO OBLIGATORIO (Opción A)

1. **NUNCA hacer push directo a `main`.** Todo cambio va en una rama `claude/<tema>`
   (ej. `claude/v5-etapa2-tipografia`).
2. **Flujo rutinario (auto-merge gateado):** push de la rama → abrir PR con la
   etiqueta `automerge`:
   ```bash
   gh pr create --label automerge --title "…" --body "…"
   ```
   El job `automerge` de `.github/workflows/ci.yml` fusiona (squash) **solo cuando
   el gate `validate` pasa** y luego dispara el deploy explícitamente. Nada humano
   toca `main`.
3. **PR que necesita revisión de Claude:** créalo **sin** la etiqueta `automerge`.
   Queda abierto; Claude lo revisa en el chat y recién ahí se le añade la etiqueta
   (o se fusiona) tras el visto bueno.
4. **NUNCA usar `gh pr merge --auto`.** Con la cuenta dueña (`SebasGiveandGrow`) ese
   merge **bypassea la protección de rama** (`enforce_admins=false`) y puede colar
   un merge sin gate en verde. La fusión SIEMPRE la hace el bot vía la etiqueta.
5. `main` despliega solo a producción — por eso está protegido por este flujo.

> Por diseño de GitHub, un push hecho con `GITHUB_TOKEN` (el merge del bot) **no
> dispara** otros workflows; por eso el job `automerge` invoca el deploy con
> `gh workflow run` y `deploy.yml` expone `workflow_dispatch:`.

## GATE OBLIGATORIO ANTES DE CADA COMMIT

```bash
node scripts/validate.mjs
```
Debe pasar TODO: sintaxis JS, JSON válidos, paridad i18n ES/EN, cobertura data-i18n,
balance de tags. Si falla, no se commitea.

**Nota operativa (esta máquina):** `node` y `gh` viven en `/opt/homebrew/bin` y el
shell no interactivo NO los tiene en el PATH. Exporta antes de correr el gate:
```bash
export PATH="/opt/homebrew/bin:$PATH"
```
Sin esto, `validate.mjs` da un falso negativo: su subproceso `node --check app.js`
no encuentra `node` y reporta "app.js sintaxis inválida" aunque el archivo esté bien.

## REGLA CRÍTICA: cache-bust de assets

`/app.js` y `/styles.css` se sirven con `Cache-Control: immutable` (1 año).
**Si editas app.js o styles.css, DEBES actualizar su hash en index.html:**
```bash
md5sum styles.css | cut -c1-8   # → reemplazar en <link ... ?v=HASH>
md5sum app.js | cut -c1-8       # → reemplazar en <script ... ?v=HASH>
```
Olvidarlo = los usuarios ven la versión vieja hasta 1 año.

## ARQUITECTURA DE DATOS

- `data/partners.json` — fuente única de la red (fundaciones, comercios, hub).
  Leer su campo `_doc` antes de editar. Coordenadas de FUNDACIONES a nivel de
  zona/barrio, nunca direcciones exactas. Comercios sí llevan dirección pública.
- `data/gratitud.json` — comercios del Programa de Gratitud. Un comercio solo
  aparece públicamente si `status === "activa"` (convenio firmado).
- `inventario.json` — lo escribe la automatización de Apps Script; el sitio aún
  no lo consume del todo. NO confundir con partners.json.
- i18n: diccionario ES embebido en `app.js`; EN en `i18n/en.json` (lazy fetch).
  Toda clave nueva va en AMBOS. La paridad la verifica el gate.

## SEGURIDAD (no negociable)

- **Todo dato de JSON remoto que entre al DOM pasa por `escapeHtml()`** (nombres,
  áreas, URLs, labels). Los JSON nacen de formularios públicos vía pipeline de
  Apps Script: sin escape = XSS.
- CSP estricta en `_headers` (`default-src 'self'`): NO añadir CDNs, scripts
  externos, ni embeds de terceros (Instagram incluido). Fuentes y librerías se
  self-hostean en `/vendor/`.
- Deuda declarada (no tarea): migrar onclick inline a addEventListener para
  quitar 'unsafe-inline'. No emprender sin plan aprobado.

## REGLAS DE CONTENIDO Y MARCA

- **"Evidencia, no promesas"**: nada de cifras no verificables ni promesas sin
  respaldo. Cifras reportadas por terceros se redactan como "reportadas".
- **Transparencia SIN datos financieros** (ingresos/gastos/totales, ni ceros)
  hasta el cierre del año 2025. Decisión de Sebas.
- **Derechos de imagen**: fotos subidas por las fundaciones = de ellas, solo con
  consentimiento registrado en `consent{}` (menores: protección especial, Ley
  1581). Imágenes que Sebas aporta para la web = uso libre.
- **Identidad visual**: leer `.claude/skills/givegrow-design-system/` ANTES de
  cualquier CSS o dirección visual. Unbounded = display de marca (h1/h2, cifras
  clave, con moderación). Día = papel hueso; noche = verde profundo. No crear
  tokens nuevos sin aprobación. No reintroducir azul navy.
- Secciones comentadas en index.html (stats de zona, contadores en vivo) están
  OCULTAS a propósito, restaurables: no borrarlas ni descomentarlas sin orden.

## VISTA PREVIA LOCAL

```bash
npx wrangler dev          # sitio completo con Worker
# o para vista rápida estática:
python3 -m http.server 8080
```
Revisar SIEMPRE en modo día Y noche (toggle en el nav) antes de abrir PR.

## CONTINUIDAD

- `SESSION_HANDOFF.md` = memoria histórica de decisiones (leerlo al retomar
  trabajo grande; actualizarlo al cerrar).
- Estado del rediseño v5: Etapa 1 (papel/familia) en producción. Pendientes:
  tarjetas→reglas finas (piloto Transparencia/Membresías), Etapa 2 (escala
  tipográfica, cifra monumental), Etapa 3 (foto a sangre, ledger, recorrido).
