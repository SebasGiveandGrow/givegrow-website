# Give&Grow — Arquitectura Técnica y Checklist de Deploy

## Stack y restricciones duras

- **Frontend**: SPA en JavaScript vanilla. Sin frameworks, sin build step complejo. Leaflet 1.9.4 self-hosted para el mapa.
- **Hosting**: Cloudflare Workers, deploy desde `SebasGiveandGrow/givegrow-website`, rama `main`.
- **CSP estricto**: nada de unpkg, Google CDN, Google Fonts ni scripts externos. Todo asset (fuentes, librerías) vive self-hosted en `/vendor/`.
- **Seguridad**: HSTS activo. Cache-busting por hash en assets.
- **Datos públicos**: `partners.json` es la ÚNICA fuente de verdad de la red (mapa, muros, páginas de perfil, calculadora). Cualquier feature de red lee de ahí; nunca duplicar datos de aliados en otro lugar.
- **Datos privados**: base D1 separada (donantes, recibos) — separación arquitectónica obligatoria por Ley 1581 (habeas data). Nunca mezclar datos de donantes en `partners.json` ni en el frontend público.

## i18n

- ES es el idioma fuente, vive en el diccionario dentro de `app.js`.
- EN se carga lazy desde `/i18n/en.json`.
- Patrón de edición: ediciones al diccionario ES via regex de Python contra `app.js`; el EN se edita en su JSON. Ambos SIEMPRE en el mismo commit.
- Toda clave nueva debe existir en ambos idiomas antes de desplegar (validación de paridad).

## Navegación (estado vigente)

- Enlaces directos visibles: Fundaciones, Empresas, Membresías, Programa de Gratitud.
- Dropdowns señalizados: "El Hub" y "Nosotros" con `toggleDrop()` — click para abrir, click-fuera y ESC para cerrar.
- Breakpoint de navegación: 1024px. Desplegado en commit `0e1cf9b`.

## Patrón de deploy

**La fuente de verdad del flujo es `CLAUDE.md`, no este archivo.** Aquí solo va
lo imprescindible para no equivocarse de camino:

1. Rama `claude/<tema>`. **Nunca push directo a `main`.**
2. `node scripts/validate.mjs` antes de cada commit. Se lee por su **código de
   salida** (`echo $?`), no por grep: el gate escribe sus fallos como `NO OK`,
   que no cruza un patrón `fail|error`.
3. PR con la etiqueta `automerge` para el trabajo rutinario; **sin** la etiqueta
   cuando el cambio necesita el ojo de Sebas — típicamente cualquier cosa que
   altere cómo se ve una página pública.
4. El bot fusiona en cuanto el gate está verde y dispara el deploy. Nunca
   `gh pr merge --auto`.
5. Comprobar después que el código llegó: `node ops/en-produccion.mjs`.

> **Lo que decía antes este apartado, y por qué se borró.** Describía un flujo de
> la época del sandbox de claude.ai: pedirle a Sebas un token de GitHub,
> guardarlo en `/home/claude/.ghtoken` y commitear por la Trees API. Nada de eso
> aplica —hoy se trabaja con `git` y `gh` en la máquina de Sebas— y además le
> pedía a una sesión futura que manejara una credencial en disco, que es
> justamente lo que no se hace.

## Checklist pre-deploy (obligatorio, en orden)

1. Sintaxis: `node --check` en JS modificado; validación de HTML (tags balanceados).
2. Paridad i18n: toda clave ES tiene su par EN y viceversa.
3. `node scripts/validate.mjs` pasa localmente.
4. CSP: ningún recurso nuevo apunta a dominios externos; fuentes/librerías nuevas van a `/vendor/` con hash.
5. Accesibilidad mínima: contraste AA en ambos modos, focus visible en interactivos nuevos, `prefers-reduced-motion` respetado en animaciones nuevas.
6. Render check: **hay navegador propio** (el panel del escritorio). La
   verificación visual y las mediciones las hace Claude —anchos reales,
   `transferSize`, qué variante elige un `srcset`, contraste en día y noche— y
   se reportan medidas, no impresiones. A Sebas solo se le pide lo que el panel
   no alcanza: Safari en un iPhone real, y el aspecto de algo que cambia de
   apariencia y es decisión suya. Este punto decía lo contrario («Playwright
   bloqueado, la verificación la hace Sebas») y devolvía trabajo verificable.
7. Cache-bust: si se tocó `app.js` o `styles.css`, recalcular su md5 en
   `index.html` **al final de todo**. Si se tocó `index.html` o
   `data/partners.json`, regenerar `sitemap.xml` DESPUÉS de commitear —
   `--check` es un paso aparte del gate y cruzar la medianoche lo rompe solo.
8. Commit en la rama, con mensaje descriptivo. (Aquí decía «via Trees API»: ver
   la nota del apartado anterior.)

## Pendientes conocidos (no olvidar, no implementar sin luz verde)

Revisados contra el código el 18 sep 2026; cada uno dice cómo volver a
comprobarlo, para que la próxima revisión no dependa de creerle a esta lista.

- ~~Banner de fotos~~ — hay galería con consentimiento verificado en dos sitios:
  `#impacto` y la ficha de cada fundación. Se pinta solo si
  `consent.photos === true`.
- ~~Integración Wompi~~ — **viva en producción** desde agosto de 2026
  (`WOMPI_PUBLIC_KEY` empieza por `pub_prod_` en `wrangler.toml`). **MercadoPago
  no existe** y no se anuncia: cero apariciones en `index.html` y `app.js`.
- **Fecha de consentimiento de NDF: SIGUE PENDIENTE.** La foto ya no —
  `consent.photos` es `true`— pero `consent.date` es `null`. Es lo único que
  falta de ese bloque. Comprobar con:
  `python3 -c "import json;p=json.load(open('data/partners.json'));print([x['consent'] for x in p['partners'] if x['id']=='ndf'][0])"`
- Parche de red-en-vivo para ALMA — sigue respondiendo con texto fijo, no lee
  `partners.json`.
- ~~Verificación visual humana de la barra de navegación~~ — el breakpoint de
  1024px está en producción y verificado en el navegador.
