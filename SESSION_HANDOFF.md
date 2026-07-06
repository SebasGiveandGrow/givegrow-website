# Informe de Cierre de Sesión — Give&Grow

_Última actualización: 06/07/2026 (sesión: pipeline de alta de fundaciones). Sitio: https://www.thegiveandgrowproject.org — repo `SebasGiveandGrow/givegrow-website` (rama `main`)._

## 1. Completado y desplegado en esta sesión (5 commits, CI + Cloudflare en verde)

- `9dc2894` **Entregables al repo**: `ops/cuestionario-fundaciones-hub.md` (Form completo + tabla de mapeo respuesta→JSON + reglas de publicación + checklist post-alta) y `ops/alma-parche-red.js` regenerados desde el esquema vigente. **Carpeta `ops/` añadida a `.assetsignore`** — documentación interna versionada pero NO servida como asset público.
- `28a6b21` **`ops/crear-form-fundaciones.gs`**: constructor del Google Form (Apps Script, ejecución única). Crea las 7 secciones con obligatorias, validaciones (año/email/URL/número) y consentimientos.
- `94a0cbd` **Fix de API**: `FormApp.addFileUploadItem()` NO existe (la carga de archivos no se puede crear por código). Preguntas 5.3c (soporte de costo) y 6.4 (logo) piden enlace Drive/Dropbox o "lo enviaré por WhatsApp"; opción de convertirlas a "Subir archivo" a mano. `.gs` y `.md` sincronizados.
- `fc8fe7c` **Botón "Quiero aplicar"** (sección Fundaciones, `fund.btn`) apunta al formulario nuevo; URL del form viejo eliminada del sitio (0 apariciones). Los CTAs "Unirme al Hub"/"Aplicar al Hub" canalizan a esa sección.
- `328303e` **`ops/alta-automatica.gs`** — motor de alta: respuesta del Form → borrador JSON (geocodifica el barrio vía `Maps.newGeocoder`, estructura `impactUnits`, mapea `consent{}`, "≈" condicional según tipo de conteo, campos `en:""` vacíos a propósito) → rama `alta/<id>-<fecha>` → archivo `ops/altas/<id>.json` → **Pull Request con checklist de revisión** → correo de aviso. Lógica probada con respuesta simulada (test en Node con stubs de servicios Google).

**Hecho por Sebas fuera del repo (confirmado):**
- **Formulario creado y operativo.** ID `1sKH4p4zQtyx31fp2lsNSO0gofaEslXe3WXNQ5stZmVU`. Compartir: `https://docs.google.com/forms/d/e/1FAIpQLSeB6kFMrVoCV8tAzgalvFyEMe4JY69KGM16ZkcjZYO_PCMihQ/viewform`. Exige inicio de sesión Google (recopila email + 1 respuesta + edición); si es barrera para alguna fundación: Configuración → Respuestas → desactivar "Limitar a 1 respuesta".
- **Motor instalado**: `alta-automatica.gs` pegado en el mismo proyecto, `GITHUB_TOKEN` dedicado en Propiedades de la secuencia (fine-grained, solo este repo, Contents RW + Pull requests RW), disparador `onFormSubmit` instalado y **flujo del PR probado con éxito**.

## 2. Pendientes (próxima sesión)
1. **Housekeeping del alta de prueba**: borrar la respuesta de prueba del Form y cerrar/borrar el PR y la rama `alta/...` de prueba si quedaron abiertos.
2. **Primera alta real end-to-end**: cuando entre una fundación → revisar PR en `ops/altas/` → traducir EN → verificar consent/evidencia → integrar objeto (sin `_revision`) en `data/partners.json` → validar → deploy → verificar pin/muro/ficha/`/f/<id>`.
3. **Verificación manual de Sebas (sigue pendiente)**: abrir `https://www.thegiveandgrowproject.org/f/ndf` y compartirlo por WhatsApp (debe salir la tarjeta de NDF con logo).
4. **Fotos de NDF**: subirlas AL CHAT (autorizadas) → WebP 200–400 KB → `/img/ndf/` → `gallery[]` con alt bilingüe → `consent.photos: true` + fecha. Carpeta Drive: "Fotos Diseño Web CLAUDE".
5. **Registrar `consent.date` de NDF** (hoy `null` a propósito).
6. **Parche de ALMA** (`ops/alma-parche-red.js`): pegarlo en el worker `givegrow-alma` o traer su código al chat. A futuro: ALMA a repo con CI.
7. **Form viejo**: desactivar "Aceptar respuestas" para que todo entre por el nuevo. Opcional: añadir a mano "Subir archivo" nativo en 5.3c/6.4 e imagen de cabecera con la identidad.
8. **Higiene detectada**: `SESSION_HANDOFF.md`, `.clauderules` y `DESIGN_SYSTEM.md` se sirven públicamente como assets — considerar añadirlos a `.assetsignore` (decisión de Sebas: son inocuos pero internos).
9. Modo oscuro (sesión dedicada; tokens `--dm-*` inertes en `styles.css`).
10. **#14** delegación de eventos (~70 onclick → data-action) para retirar `'unsafe-inline'` del CSP.
11. Selector de impacto (#11): el cuestionario ya pide 2ª unidad (5.4); el motor la deja en pendientes para estructurar a mano.
12. Wompi (al aprobar cuenta) y aval de Manuela/consejo (% fondos, Art. 257 Gratitud).

## 3. Arquitectura (delta de esta sesión)
- **`ops/` es la carpeta interna del repo**: versionada, excluida de assets (`.assetsignore`: `worker.js`, `node_modules`, `ops`). Ahí viven cuestionario, scripts de Apps Script y los borradores de alta (`ops/altas/`).
- **Pipeline de alta**: Form (espejo del esquema) → Apps Script en el proyecto del form (mapeo por prefijo numérico de título: "1.1", "4.2.3", "7.4" — robusto a retoques de redacción, NO renumerar preguntas sin actualizar el script) → PR con borrador. **Regla dura: nada escribe automáticamente en `data/partners.json`**; merge del PR de alta no publica nada (ops/ fuera de assets); la publicación es la integración manual revisada.
- Token de GitHub del motor: vive SOLO en Script Properties (`GITHUB_TOKEN`), permisos mínimos. No confundir con los tokens temporales de sesión (esos se revocan al cierre).
- **Limitación del sandbox detectada**: Playwright no pudo descargar Chromium (red del sandbox bloquea el CDN). Verificación alternativa usada: `validate.mjs` + parser HTML (integridad de anclas/tags) + verificación del contenido desplegado vía `raw.githubusercontent.com` post-deploy. Reintentar Playwright en próximas sesiones; si sigue bloqueado, cambios visuales requieren captura manual de Sebas.

## 4. Prompt para el nuevo chat
> Continúo el sitio de Give&Grow (SPA en Cloudflare Workers, repo `SebasGiveandGrow/givegrow-website`). Lee primero `SESSION_HANDOFF.md`, `.clauderules` y `DESIGN_SYSTEM.md` en la raíz. Arquitectura: `index.html` + `app.js` (ES embebido) + `/i18n/en.json` (EN perezoso) + `data/partners.json` (fuente única de la red, con `gallery[]` y `consent{}`) + `worker.js` (rutas `/f/<id>`) + `/vendor` (Leaflet y fuentes auto-alojadas) + `ops/` (interno, fuera de assets: cuestionario, scripts de alta, borradores en `ops/altas/`). El alta de fundaciones llega como PR automático con borrador JSON: revisar, traducir EN, verificar consent/evidencia e integrar a mano en `partners.json`. Valida con `node scripts/validate.mjs` (y render headless si el sandbox lo permite) antes de cada deploy (Trees API, versionado por hash); confirma Actions en verde después. Reglas de oro: paridad i18n exacta, cero emojis (SVG line-art), "evidencia, no promesas", consentimiento registrado en `consent{}` antes de publicar material de terceros, CSP en firme.
