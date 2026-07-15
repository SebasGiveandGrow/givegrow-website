# SESSION HANDOFF — Give&Grow International

> Última actualización: sesión "Fase 1 UX + roadmap tarjetas/menú" (jul 2026)
> Responder SIEMPRE en español. Principio rector: **"evidencia, no promesas"**.

## Estado del proyecto
- Sitio bilingüe ES/EN, vanilla-JS SPA, Cloudflare Workers.
- Repo: `SebasGiveandGrow/givegrow-website` rama `main`. Dominio: thegiveandgrowproject.org
- Deploy vía GitHub Actions. Verificar con la API de Actions tras cada push.

## Lo que se hizo en esta sesión (Fase 1 UX + roadmap)
Commit `089435e1` (Actions success). Lluvia de ideas con Sebas → plan de 4 fases.

**Fase 1 DESPLEGADA (arreglos sin assets):**
1. **Lightbox galería "Compruébalo tú mismo" avanzaba de 3 en 3 POR TECLADO.**
   Causa: 3 listeners `keydown` sobre `#lightbox` (app.js ~L852, ~L1196, ~L1613);
   dos duplicados + uno muerto mal condicionado (gateaba `#lightbox` pero llamaba
   `closeGalLb`). Fix: dejar SOLO el listener L1196 como autoridad; L852 conserva
   el Escape del dropdown, L1613 conserva el Escape del drawer móvil. Botones en
   pantalla siempre avanzaron de a 1. (Ficha lb `gal-lb` nunca tuvo teclado real;
   usa botones + Escape nativo de <dialog>. Mejora futura opcional.)
2. **Contraste modo DÍA (noche ya pasaba AA con holgura):** `--mu` #6B7280→#5C636F
   (fallaba 4.41 sobre crema; ahora ≥5.0 en blanco/crema/sand). `--amber`
   #C97200→#A84D00 (badge .tag.new sobre amberl: 3.24→5.13). Tokens de noche
   intactos. OJO: `--gn` NO se tocó — solo se usa sobre fondos oscuros (hero/calc/
   home-hub/footer); su "fallo sobre blanco" era hipotético, no real.
3. **Footer:** añadido `contabilidad@thegiveandgrowproject.org` en columna Entidad.

**ROADMAP acordado (fases siguientes):**
- **Fase 2 — Ficha de comercio enriquecida.** (a) "Cupón institucional" del
  beneficio (tipografía display, nivel orgánico Retoño→, cómo se redime, condiciones
  estilo ledger) = elemento firma de la ficha. (b) Comercios en el mapa Leaflet:
  el código YA soporta `type:"company"` (comentado, nunca usado); marcador propio +
  `direccion` y `coords` en gratitud.json; dirección EXACTA visible (un comercio
  quiere ser hallado; distinto de fundaciones que usan zona por privacidad). (c)
  Galería CURADA self-hosted en /img/gratitud/<id>/ — NO embeber Instagram (CSP
  estricta `default-src 'self'`; API IG frágil/deprecada). Enlace prominente a @IG sí.
  Sebas va a PEDIR las fotos a Kore. (d) Sección `comunidad` (campo ya reservado en
  gratitud.json): nace con contenido real, no vacía.
  → BLOQUEADO por fotos con consentimiento (Ley 1581: impacto/beneficiarios/menores
    exige consentimiento documentado; producto/local de Kore = permiso del negocio).
  → Flujo de imágenes acordado: Sebas las sube por el chat; Claude optimiza (WebP +
    thumbs), nombra por convención y despliega. Por foto: pie, sección, consentimiento.
  → Arrancar Fase 2 por cupón + mapa (no dependen de fotos) mientras Sebas reúne fotos.
- **Fase 3 — Identidad tipográfica: cargar Unbounded self-hosted** (hoy el sitio
  usa Bricolage Grotesque en display = etapa ANTERIOR de marca; Unbounded es la
  dirección institucional aprobada). Vía npm @fontsource/unbounda (Google Fonts
  bloqueado por CSP/red). Migrar roles display, sign-off visual por sección día/noche.
- **Fase 4 — Reestructura de menú (Opción B, por audiencia, HUB SOCIAL visible).**
  PENDIENTE visto bueno de Sebas del árbol. Propuesta (6→5 ítems + Donar):
  `HUB SOCIAL · Fundaciones · Empresas▾(Empresas/Gratitud/Aliado) ·
   Membresías▾(Membresías/Calcular aporte/Rastreo) · Nosotros▾(Origen/Impacto/
   Transparencia/FAQ/Contacto) · [Donar]`. Micro-decisiones abiertas: ¿Impacto en
  Nosotros o visible?; ALMA quitado del nav (tiene FAB) ¿ok?; nombre grupo donantes.
  Al construir: tocar nav desktop + hamburguesa móvil + i18n de grupos nuevos.

## Sesión anterior (campo descripción del negocio)
Commit `3e198d05` (Actions success). Objetivo: que las empresas den su PROPIA
descripción en el formulario de aliados (decisión previa: no inventarla nosotros).

1. **Campo "Descripción del negocio"** en formulario #aliados — DESPLEGADO.
   - `index.html`: `<textarea id="ally-desc">` a lo ancho, al final de "Datos de la
     empresa". Clave i18n `ally.f.desc`. Placeholder ES fijo (patrón del form: labels
     i18n, placeholders hardcoded ES — misma limitación de todos los campos).
   - `app.js`: `payload.descripcion = val("ally-desc")` + clave i18n ES.
   - `i18n/en.json`: `ally.f.desc` → paridad 686/686.
   - `styles.css`: regla `.ally-form textarea` con tokens existentes
     (--surface/--ink/--bd/--g) para sostener modo noche.
   - **Campo OPCIONAL** (sin `required`). Para hacerlo obligatorio: añadir `required`
     al `<textarea>` y sumar `ally-desc` al chequeo de allySubmit. Decisión de Sebas
     pendiente (se dejó opcional para no fricción; la ficha solo se arma para aliados
     activos del Programa de Gratitud, donde se puede exigir en ese momento).

2. **`ops/aliados-formulario.gs` sincronizado** con nueva columna + fix.
   - Columna "Descripcion del negocio" añadida al FINAL de HEADERS y de `row`
     (a propósito: insertarla en medio desalinearía las filas ya existentes, ej. Kore).
   - Descripción añadida al correo de notificación (bloque de empresa).
   - **DISCREPANCIA RESUELTA EN REPO:** la copia del repo tenía
     `NOTIFY_EMAIL = "contabilidad@..."` (estado PRE-fix DMARC). Se sincronizó a
     `fundaciongiveandgrow@gmail.com` para reflejar el script vivo. La copia del repo
     estaba desactualizada; ahora coincide con la corrección DMARC.

## Sesión anterior (aliados + Programa de Gratitud)
1. **Formulario "Quiero ser aliado"** (#aliados) — 100% OPERATIVO.
   - Apps Script en `ops/aliados-formulario.gs`. Escribe a la hoja "Empresas
     Aliadas — Give&Grow" (SHEET_ID 1x9vF3PN1qGCX9h8ffXg_l6_9YILeSu4HLR91l2yJnlg,
     pestaña "Solicitudes") + envía 2 correos.
   - **BUG RESUELTO (correo):** los correos a @thegiveandgrowproject.org
     REBOTABAN por política DMARC del dominio (error 550 5.7.26). Solución:
     NOTIFY_EMAIL apunta a **fundaciongiveandgrow@gmail.com** (Gmail externo,
     no aplica DMARC). Se usa GmailApp.sendEmail (getRemainingDailyQuota solo
     existe en MailApp). NO se tocó DNS.
   - **Cada edición del Apps Script requiere reimplementar**: Implementar →
     Administrar implementaciones → lápiz → Versión "nueva" → Implementar.
     Si no, la app web sigue con el código viejo.
   - 1ª empresa real registrada: Kore Makeup (korestudio05@..., @koremakeup).

2. **Programa de Gratitud — comercios aliados** (data-driven).
   - `data/gratitud.json` = fuente única. Un comercio aparece SOLO si
     `status === "activa"` (convenio firmado). "borrador" = preparado pero oculto.
   - Sección "Comercios aliados" en página #gratitud: grid de tarjetas
     (renderGratitudComercios) + estado vacío digno si no hay activos.
   - Tarjeta clickeable → ficha.

3. **Ficha de comercio** (#comercio/[id]) — INFORMATIVA (renderComercio).
   - Espejo de la ficha de fundación PERO rol opuesto: fundación=beneficiaria
     (invita a donar); empresa=aliada (invita a MEMBRESÍA, no a donar).
   - Cabecera+logo, about, beneficio para miembros, galería con lightbox
     (solo si consent.photos), redes, CTA "Quiero ser miembro" → #membresias.
   - Logo de comercios sobre fondo BLANCO (suelen ser oscuros); fundaciones #111.

4. **Botón "Ver comercios aliados"** en página Empresas → goComercios()
   (navega a #gratitud + scroll suave a #grat-comercios-sec).

5. **Kore Makeup Academy** = 1er comercio, VISIBLE (status "activa") por
   decisión de Sebas (aún no firma; "negocio de confianza, firma en breve").
   - Logo real en `img/partners/kore-makeup.png` (negro sobre blanco, 400x400).
   - **TEXTOS DEL BENEFICIO SON DE EJEMPLO** (inventados por Claude), ya
     públicos. PENDIENTE: reemplazar por los reales que dé Kore.

## PENDIENTES (prioridad)
- [ ] **ACCIÓN MANUAL — Apps Script aliados:** pegar el nuevo `ops/aliados-
      formulario.gs` en el editor de Apps Script y **publicar VERSIÓN NUEVA**
      (Implementar → Administrar implementaciones → lápiz → Versión nueva). Si no,
      la app web sigue con el código viejo y la columna/descripción NO se guardan.
- [ ] **ACCIÓN MANUAL — hoja de cálculo:** añadir a mano el encabezado
      "Descripcion del negocio" en la última columna de la pestaña "Solicitudes".
      El script NO reescribe encabezados en hoja con datos, así que la columna nueva
      llega sin título hasta que se ponga manualmente.
- [ ] **Confirmar visualmente** el textarea nuevo en #aliados (día y NOCHE).
- [ ] **Decisión Sebas:** ¿campo descripción obligatorio u opcional? (hoy opcional).
- [ ] **Verificar** que el `NOTIFY_EMAIL` del script vivo sí es el Gmail (se asumió
      por el handoff; la copia del repo estaba desactualizada y ya se corrigió).
- [ ] **Textos reales de Kore**: beneficio, nivelDesde, redime, condiciones
      (hoy son de ejemplo y están públicos). Editar en data/gratitud.json.
- [ ] **Convenio firmado de Kore** (dijo que firma en breve).
- [ ] **about + fotos de Kore**: los aporta la empresa. about/gallery vacíos.
      consent.photos=false hasta que autorice fotos.
- [ ] **Sección FUTURA "lo que hacen por la comunidad"** (experiencias/
      servicios/productos): campo `comunidad` reservado en gratitud.json.
      Diseñar a fondo con contenido real. NO implementar aún.
- [ ] Logos alternativos de Kore disponibles (Sebas los envió): blanco/negro
      (para fondos oscuros), café/taupe (variante cálida). Guardar si se quieren.
- [ ] Fase 4 (espera logo de marca Give&Grow real): logo nav/favicon/OG/JSON-LD,
      pieza OG 1200x630, íconos PWA PNG 192/512.
- [ ] Wompi (trámite Sebas) → webhook→D1→recibo→tracking.
- [ ] Validación contadora del texto del certificado DIAN.

## TRAMPAS CONOCIDAS (leer antes de trabajar)
- **git pull sobrescribe cambios no desplegados.** El Apps Script del
  inventario hace commits automáticos al repo. Un `git pull` puede borrar
  ediciones recién hechas. ESTA SESIÓN: el 404 de la ficha de comercio fue
  causado por esto — `page-comercio` desapareció de index.html tras un pull.
  → Patrón seguro: git fetch + GIT_AUTHOR/COMMITTER env + git merge FETCH_HEAD
    --no-edit + git push HEAD:main. NO rebase.
  → Tras cada pull, VERIFICAR que los cambios propios sobrevivieron.
- **Al depurar un 404 de página:** primero verificar que el elemento HTML
  `id="page-X"` EXISTE en index.html (grep -c). El enrutamiento puede estar
  bien y el bug ser el contenedor ausente.
- **Apps Script:** reimplementar versión nueva tras CADA edición del código.
- **Cache-bust:** actualizar hash de styles.css y app.js en index.html tras
  cada cambio (md5sum → sed). Ya está en el flujo de deploy.

## ARQUITECTURA CLAVE (app.js)
- Router: `go(id, fromPop)` (~805). Rutas dinámicas fundacion/[id] y
  comercio/[id] resueltas ANTES del fallback e404.
- Re-render por idioma en postLang (~757-759).
- renderFicha (fundaciones) / renderComercio (comercios) — espejos.
- Lightbox nativo: ensureLightbox()+paintLightbox()+showModal(), LB={list,ix}.
- i18n: dict ES en app.js; EN lazy desde /i18n/en.json. Paridad actual 685/685.
- Datos: partners.json (fundaciones), gratitud.json (comercios), inventario.json.
- Validación: `node scripts/validate.mjs` (paridad, sintaxis, tags, cobertura).

## VERIFICADO AL CIERRE
- Campo ally-desc en index.html: ✓
- payload.descripcion + i18n ally.f.desc (ES): ✓
- ally.f.desc en en.json (paridad 686/686): ✓
- .ally-form textarea en styles.css (tokens, modo noche): ✓
- validate.mjs: TODO OK (sintaxis, paridad, cobertura, JSON, tags).
- Cache-bust actualizado: styles 0a072653, app 1c51e738.
- Deploy 3e198d05 Actions success.
- PENDIENTE Sebas: pegar+reimplementar .gs, encabezado manual en hoja,
  confirmación visual del textarea (día/noche), decisión obligatorio/opcional.
