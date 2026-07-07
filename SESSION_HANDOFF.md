# Informe de Cierre de Sesión — Give&Grow

_Última actualización: 07/07/2026 (sesión: comunicación alineada al libro blanco + barra de menú). Sitio: https://www.thegiveandgrowproject.org — repo `SebasGiveandGrow/givegrow-website` (rama `main`)._

## 1. Completado y desplegado en esta sesión (1 commit, CI + Cloudflare en verde)

Commit `0e1cf9b` — revisión completa de comunicación contra el Libro Blanco (documento madre creado en otro chat, subido por Sebas) + navegación. Archivos: `index.html`, `app.js`, `i18n/en.json`, `styles.css`. Nota: `i18n/en.json` quedó re-serializado con indentación (antes 1 línea) → el diff es grande pero es cosmético; verificado 527→528 claves, sin corrupción.

**Comunicación (decisiones de Sebas registradas):**
- **Poblaciones — reencuadre a alcance-objetivo abierto.** El sitio afirmaba "8 Poblaciones impactadas" (hecho consumado, contradecía el estado real con 1 sola aliada). Ahora: contador "Poblaciones que buscamos alcanzar"; título de sección "Las poblaciones que queremos alcanzar"; nueva clave `hub.pob.note` que expresa la visión de Sebas: la misión apunta a impactar TODO tipo de población vulnerable a través de las fundaciones del HUB; la cobertura real crece con cada aliada verificada. El número 8 se mantiene (son las del objeto social).
- **Relato de origen** reemplazado por la versión potente del libro blanco ("Todo empezó con una tonelada de comida…"). `origen.t`, `origen.p1`, `origen.p2`. Fecha de constitución mantenida como la del sitio (19 mayo 2025), más específica que el libro blanco.
- **Empresas — 3 puertas alineadas al libro blanco:** Padrinazgo de Impacto / Impact Journey / Alianza a medida (100% cumplibles hoy). **Eliminada la promesa "reportes GRI"** (estándar internacional no cumplible aún). `emp.p1/p2/p3`.
- **Precios USD de membresía corregidos** a los del libro blanco: Semilla US$5, Retoño US$15, Árbol US$35, Bosque US$75+ (antes 5/12/29/60). COP sin cambios.
- **Asignación de fondos — suavizada a cualitativo (decisión de Sebas).** El sitio publicaba 80/10/10; el libro blanco pide no difundir cifras hasta validación de Revisoría. Ahora los 3 puntos (`transp.funds.a/b/c`) son cualitativos ("la mayor parte a la misión", "una parte acotada a operación", "administración al mínimo") y la nota dice que se publicarán cifras precisas solo cuando la Revisora Fiscal y el consejo las validen.
- **"25 fundaciones preaprobadas"** — Sebas confirma que tiene respaldo pero la vinculación depende de factores; reformulado a "red de espera, vinculación confirmada una a una con verificación" (`fund.lead`, `faq.a5`).
- **"Compartamos con Colombia" retirado** por ahora (Sebas: aún no es aliada formal). Eliminado de las 4 apariciones: `fund.lead`, `faq.a5` y el system prompt de ALMA (ES+EN). Verificado 0 apariciones en prod.
- **ALMA sincronizada:** su `ALMA_SYS` (system prompt embebido en app.js, ~línea 1179) se actualizó con TODOS los cambios anteriores para que el asistente no diga cosas distintas a la web. **Importante: al cambiar comunicación en el sitio, actualizar también `ALMA_SYS`.**
- **Beneficio tributario 25% (Art. 257 ET): INTACTO por decisión explícita de Sebas** — se queda en info y calculadora tal cual.

**Navegación (barra de menú visible):**
- Antes: 3 grupos desplegables (El Hub / Súmate / Nosotros) que escondían las 12 secciones y no señalaban que eran desplegables.
- Ahora en desktop: **El Hub** (grupo ▾) · **Fundaciones** · **Empresas** · **Membresías** · **Programa de Gratitud** · **Nosotros** (grupo ▾) · botón Donar. Las 4 secciones de conversión quedan visibles directas.
- Grupos convertidos a `<button class="ndrop-t">` con flecha ▾ que rota (`aria-expanded`), abren por **clic o hover** (mejor en táctil). Nueva función `toggleDrop()` en app.js (cierra otros, clic-fuera y ESC cierran). CSS: `.ndrop-t`, flecha `::after`, `.ndrop.open`.
- **Breakpoint de nav bajado a 1024px** (media query nuevo solo para `.nlinks`/`.burger`, sin tocar los grids que siguen en 880px) para que las 4 secciones + 2 grupos no se apiñen en pantallas medianas.
- Menú móvil (`#nav-mobile`) sin cambios: conserva los 3 grupos, que ahí funcionan. `nav.g.sumate` sigue vivo solo en el móvil.

**Verificación:** `validate.mjs` en verde (paridad i18n 528/528, sintaxis, tags, JSON-LD). Marcadores confirmados en prod vía raw.githubusercontent. **Playwright/Chromium sigue bloqueado en el sandbox** (red) → se entregó a Sebas un mockup fiel de la barra (herramienta de visualización) en lugar de captura real; falta su vistazo humano en computador y móvil (Ctrl+Shift+R).

## 2. Pendientes (próxima sesión)
1. **Verificación visual humana de Sebas**: barra de menú en desktop (como el mockup) y hamburguesa en móvil.
2. **BANNER CON FOTOS (idea de Sebas para futuro)**: banner/carrusel con fotos e información en el sitio. Requiere material con consentimiento (fotos de NDF pendientes, o material propio de campo). Definir ubicación (¿hero? ¿franja de evidencia entre secciones?). Anotado como iniciativa, no iniciada.
3. **Wompi y MercadoPago**: Sebas espera confirmación oficial de ambos para añadirlos. Al llegar: llave pública → cablear botones del bloque "Cómo aportar" → dominios al CSP. OJO: el sitio ya lista "MercadoPago" y "PayPal" junto a Bancolombia en el bloque de pago; revisar que lo listado coincida con lo realmente operativo.
4. **Alta de fundaciones (pipeline ya montado la sesión previa)**: housekeeping del alta de prueba (borrar respuesta de prueba + PR/rama `alta/...`); primera alta real end-to-end cuando entre una fundación.
5. **NDF**: verificar `/f/ndf` por WhatsApp; subir fotos autorizadas AL CHAT → WebP 200–400 KB → `/img/ndf/` → `gallery[]` + `consent.photos:true` + fecha; registrar `consent.date` (hoy null).
6. **Parche ALMA** (`ops/alma-parche-red.js`): pegar en worker `givegrow-alma` para que responda con datos en vivo de partners.json.
7. **Otras alineaciones libro blanco (menores, opcionales)**: proceso de fundaciones (sitio 5 pasos, libro blanco 3 — se dejó el de 5, más informativo); membresías honoríficas/anuales con más detalle si se desea.
8. **Higiene**: `SESSION_HANDOFF.md`, `.clauderules`, `DESIGN_SYSTEM.md` se sirven como assets públicos — considerar añadirlos a `.assetsignore`.
9. Modo oscuro (tokens `--dm-*` inertes); #14 delegación de eventos para retirar `'unsafe-inline'` del CSP.

## 3. Arquitectura / notas técnicas
- **`ALMA_SYS` en app.js (~L1179)** es un espejo manual de la comunicación del sitio. No se auto-sincroniza: al cambiar copy de negocio, actualizarlo a mano.
- **Ediciones i18n**: cada clave existe en ES (dict embebido en app.js) y EN (`i18n/en.json`); paridad exacta obligatoria (validate.mjs la exige). Claves nuevas van a ambos. Método usado: script Python con regex `"clave":"valor"` respetando escapes, reemplazo 1:1 verificado.
- **Deploy**: GitHub Trees API (fetch HEAD→base tree→blobs→tree con base_tree→commit→PATCH ref) desde sandbox con `urllib`. Token en `/home/claude/.ghtoken` (chmod 600), NO persiste entre sesiones.
- **Sandbox**: Chromium/Playwright no instala (CDN bloqueado). Alternativa: validate.mjs + verificación de contenido en prod vía raw.githubusercontent + mockup de la herramienta de visualización para cambios de barra/UI. Los cambios visuales requieren vistazo humano de Sebas.
- **`ops/`** (interno, fuera de assets): cuestionario, `crear-form-fundaciones.gs`, `alta-automatica.gs`, `alma-parche-red.js`, borradores `ops/altas/`.

## 4. Prompt para el nuevo chat
> Continúo el sitio de Give&Grow (SPA en Cloudflare Workers, repo `SebasGiveandGrow/givegrow-website`). Lee primero `SESSION_HANDOFF.md`, `.clauderules` y `DESIGN_SYSTEM.md` en la raíz. Arquitectura: `index.html` + `app.js` (ES embebido + `ALMA_SYS`, el system prompt de ALMA que hay que sincronizar a mano con la comunicación del sitio) + `/i18n/en.json` (EN perezoso) + `data/partners.json` (fuente única de la red, con `gallery[]` y `consent{}`) + `worker.js` (rutas `/f/<id>`) + `/vendor` + `ops/` (interno). El alta de fundaciones llega como PR automático (revisar, traducir EN, verificar consent/evidencia, integrar a mano). La comunicación del sitio se rige por el Libro Blanco (documento madre) con estados evidencia/promesa. Valida con `node scripts/validate.mjs` antes de cada deploy (Trees API, versionado por hash); confirma Actions en verde. Reglas de oro: paridad i18n exacta, cero emojis (SVG line-art), "evidencia, no promesas", consentimiento en `consent{}` antes de publicar material de terceros, CSP en firme. Pendientes calientes: banner con fotos (futuro), Wompi/MercadoPago (esperando confirmación), fotos de NDF, verificación visual humana.
