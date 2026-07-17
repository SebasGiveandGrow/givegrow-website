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

## Patrón de deploy (GitHub Trees API, commit atómico)

1. Sebas provee token de sesión → guardar en `/home/claude/.ghtoken`, `chmod 600`.
2. Fetch HEAD SHA de `main` → fetch base tree SHA.
3. Crear blobs de archivos modificados → crear tree con `base_tree` → crear commit → PATCH ref.
4. Al cierre de sesión: borrar el token del disco; Sebas lo revoca manualmente.
5. `scripts/validate.mjs` corre como gate de CI antes de cada deploy a Cloudflare — el commit debe pasarlo.

## Checklist pre-deploy (obligatorio, en orden)

1. Sintaxis: `node --check` en JS modificado; validación de HTML (tags balanceados).
2. Paridad i18n: toda clave ES tiene su par EN y viceversa.
3. `node scripts/validate.mjs` pasa localmente.
4. CSP: ningún recurso nuevo apunta a dominios externos; fuentes/librerías nuevas van a `/vendor/` con hash.
5. Accesibilidad mínima: contraste AA en ambos modos, focus visible en interactivos nuevos, `prefers-reduced-motion` respetado en animaciones nuevas.
6. Render check: sin navegador en sandbox (Playwright bloqueado), la verificación visual la hace Sebas — pedirle capturas desktop + móvil post-deploy y revisarlas como imágenes.
7. Commit atómico via Trees API con mensaje descriptivo.

## Pendientes conocidos (no olvidar, no implementar sin luz verde)

- Banner de fotos (requiere media consentida).
- Integraciones Wompi y MercadoPago (esperando confirmación oficial).
- Foto y fecha de consentimiento de fundación NDF.
- Parche de red-en-vivo para ALMA.
- Verificación visual humana de la barra de navegación nueva.
