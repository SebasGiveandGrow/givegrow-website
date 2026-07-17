# SESSION HANDOFF — Give&Grow International

> Última actualización: sesión "Etiqueta calculadora ¿persona o empresa? + modelo de trabajo reafirmado" (17 jul 2026)
> Responder SIEMPRE en español. Principio rector: **"evidencia, no promesas"**.

## Estado del proyecto
- Sitio bilingüe ES/EN, vanilla-JS SPA, Cloudflare Workers.
- Repo: `SebasGiveandGrow/givegrow-website` rama `main`. Dominio: thegiveandgrowproject.org
- Deploy vía GitHub Actions. Verificar con la API de Actions tras cada push.

## Cierre de tanda: etiqueta calculadora + MODELO DE TRABAJO reafirmado (17 jul 2026)
Commit `9c5bc3bb` (deploy Actions success). 4 archivos en un commit atómico (Trees API).
- **Etiqueta nueva sobre el toggle Persona/Empresa de la calculadora.** ES
  `"¿Aportas como persona o empresa?"` / EN `"Are you donating as an individual or a
  company?"` (clave nueva `calc.tipo.lbl`, paridad 682/682). Reusa el estilo de
  `.calc-dest-lbl` (selector compartido `.calc-dest-lbl,.calc-cap` en styles.css) → cero
  tokens nuevos; la tarjeta `.calc` es `--navy` con texto blanco en día Y noche (sin
  override), así que el contraste es idéntico en ambos modos. A11y: el toggle ahora es
  `role="group"` con `aria-labelledby="calc-tipo-lbl"`.
- **Copy PENDIENTE de decisión de Sebas.** Puse `"¿Aportas como persona o empresa?"`
  (institucional, aclara que cambia el cálculo del beneficio). Sebas pidió "algo como
  ¿Qué eres?". Alternativas de un renglón (editar `calc.tipo.lbl` ES/EN): `¿Persona o
  empresa?` · `Selecciona tu perfil` · `¿Qué eres?`. Cambio trivial cuando decida.
- Cache-bust actualizado: styles `d7794fd2`, app `4e1fd8b4`.

**MODELO DE TRABAJO (reafirmado por Sebas esta sesión) — leer y respetar:**
- El **proceso creativo (planes + lluvia de ideas) se hace en el chat claude.ai**, pensando
  siempre en las capacidades de **Claude Code** (agente de escritorio), sus integraciones
  (MCP: Drive, Gmail, Calendar, Cloudflare, Canva, Slack, Wix, WordPress, Fathom) y los
  plugins/skills disponibles.
- **Sebas copia el plan en Claude Code de escritorio y lo ejecuta ahí.**
- **Luego Sebas y Claude (chat) auditan y supervisan** el resultado.
- Coherente con la sección "Claude Code adoptado — Opción A": Code trabaja en ramas
  `claude/<tema>`, PR, revisión, Sebas fusiona. Regla anti-pisotón: un solo actor escribe
  al repo a la vez.
- **Token:** para AUDITAR desde el chat basta SOLO LECTURA (Contents:Read). Solo pedir
  escritura si Sebas encarga una ejecución puntual desde el chat (como fue esta tanda de la
  etiqueta, hecha por excepción con token de escritura de sesión).
- PENDIENTE Sebas: sign-off visual de la etiqueta (desktop + móvil, día + noche);
  decidir el texto final; revocar el token de escritura de esta sesión al cerrar.

## Cierre de tanda: logo Conciencia + Kore en mapa + ocultar 2 bloques
Commit `9dbaf72c` (deploy success). 7 archivos en un commit atómico.
- **Logo de Conciencia ALOJADO.** Sebas lo adjuntó por el chat (flujo previsto). Optimizado
  a /img/conciencia_logo.png (512px, PNG paleta 48 colores, 13KB, transparencia ok);
  partners.json logo path seteado (consent.logo ya era true). Ficha ya muestra el logo.
- **Fase 2b HECHA — Kore en el mapa.** gratitud.json: Kore con `direccion`
  ("Dg. 33 #32A Sur 34, Zona 9, Envigado, Antioquia") + `coords` {lat 6.1701, lng -75.5905}
  (ZONA APROX. de Envigado; la precisión real la da el enlace a Google Maps). app.js: el mapa
  ahora une partners + comercios activos con coords (marcador `company` ámbar, ya existía el
  CSS .gg-pin-company). Popup de comercio: enlace a ficha (`go('comercio/id')`) + Google Maps.
  Ficha de comercio: línea de dirección + "Cómo llegar" (Maps). i18n: quitado "próximamente"
  de map.leg.c; nuevas map.biz/com.maps (688/688).
- **OCULTAS por decisión de Sebas (comentadas en index.html, restaurables):**
  (1) bloque de stats de zona del inicio (5 Rutas / 8 Poblaciones / 100% Trazabilidad /
  2025) — "para el futuro"; (2) contadores de donaciones/entregas en vivo (#live-stats +
  live-note) — "hasta tener más datos". JS null-safe (updateLiveStats guarda); claves i18n
  (stat.*, live.*) conservadas en ambos diccionarios.

PENDIENTE de confirmar por Sebas: coords aprox. de Kore (Envigado) y de Conciencia
(Nueva Jerusalén); visual del cupón, del logo en ficha, y del mapa con el pin de Kore.

## Etapa 2 FUSIONADA por Sebas + auto-merge gateado configurado
- **PR #1 (tipografía E2) fusionado por Sebas** → en producción. Revisión chat funcionó:
  atrapó cache-bust faltante antes del merge.
- **Auto-merge nativo configurado** (commit ci.yml `99676d0d` + settings):
  (1) `.github/workflows/ci.yml`: job `validate` corre en cada PR → gate validate.mjs
  + chequeo AUTOMÁTICO de cache-bust (md5 real de styles/app vs declarado en index.html).
  (2) Repo: `allow_auto_merge=true`. (3) Protección de `main`: check `validate` requerido,
  `enforce_admins=FALSE` — decisión deliberada: mantiene vivos los push directos del dueño
  (automatización de inventario Apps Script y commits del chat); solo los PRs quedan gateados.
- **USO del auto-merge**: en el PR, botón "Enable auto-merge" (o Code: `gh pr merge --auto
  --squash`). Se fusiona SOLO cuando `validate` pasa. Merge a main → deploy automático.
- Flujo vigente: rutinario = auto-merge; sensible/visual = revisión chat + merge de Sebas
  (o Claude bajo orden explícita con token de escritura de la sesión).

## Claude Code adoptado — flujo Opción A configurado (commit `f4df5b8e`)
Sebas montará Claude Code (app de escritorio) para el trabajo visual. FLUJO ACORDADO:
Claude Code trabaja SIEMPRE en ramas `claude/<tema>` (nunca main) → push + PR → revisión
por Claude (chat claude.ai, vía API sobre la rama) → Sebas fusiona → Actions despliega.
- Config en repo: `CLAUDE.md` (memoria de proyecto: gate, cache-bust crítico por immutable,
  datos, seguridad, reglas de contenido/marca, preview local, continuidad),
  `.claude/settings.json` (comandos seguros pre-aprobados; push a main/force/rebase
  DENEGADOS), `.claude/skills/givegrow-design-system/` (sistema de diseño versionado).
- División de trabajo: Claude Code = visual/iterativo con preview local (v5 E2/E3,
  tarjetas→reglas); este chat = diagnóstico, revisión de ramas, datos, altas.
- Regla anti-pisotón: un solo actor escribe al repo a la vez.
- BENEFICIO CLAVE: se acaban los tokens de GitHub pegados en el chat (Code usa el Git
  local autenticado). Para revisión de ramas, este chat seguirá necesitando token de
  SOLO LECTURA (scope Contents:Read basta) — pedirlo así, ya no de escritura, salvo
  tareas que Sebas pida ejecutar desde el chat.

## Rediseño v5 Etapa 1 DESPLEGADO + auditoría de seguridad completa
Sebas: "quita Estado financiero 2025 y ejecuta directamente, no me muestres". Aprobó
desplegar a producción sin preview. Dos commits separados:
- **Seguridad `efed197a`** — auditoría XSS completa de TODOS los sinks innerHTML. Además de
  A1 (renderFicha/mapa, ya en prod), se hallaron y cerraron 3 huecos más: renderWall
  (muro: p.name/area/url), renderAliadas (grid fundaciones: id/logo/name/pob/area) y el
  <select> de la calculadora (optgroup p.name + option label + ids). trackNotFound ya
  escapaba input de usuario; almaFmt escapa <>& antes de formatear. Verificado que todo el
  trabajo previo (A1-A4, mini-calc, filtros mapa, Kore coords, Conciencia logo, calc clamp,
  menú B, Unbounded) está en main.
- **Etapa 1 `0d3aa121`** — "papel y familia" por cascada de tokens (día): --bg papel hueso
  #F3EFE6, --surface #FBF8F1, --ink cálido #191813, --ink-soft #47443B, --bd hairline cálido
  #DAD3C3; UNIFICACIÓN navy→verde profundo (--navy #0E2118 → calc/footer/ALMA/banda dejan el
  azul marino); radios --rl 18→13 y calc/alma 24→16. Modo noche INTACTO (su propio --navy
  verde). Whites hardcodeados = tiles de logo (legítimos). Reversible (token-level).
- **Transparencia real: YA cumple la regla** — no expone cifras de ingresos/gastos, es por
  principios ("publicaremos cifras solo cuando estén validadas") + obligaciones legales.
  No había dato sensible que quitar. La fila "Estado financiero 2025" era solo de la maqueta
  (ya eliminada).

PENDIENTE (crítico): **verificación visual de Sebas** de la Etapa 1 en producción, día y
noche — Claude NO puede renderizar. Si algo se ve mal, es revert de 1 commit o ajuste de 1
token. NO hecho a propósito (riesgo ciego): conversión tarjetas→reglas finas en secciones
piloto (Transparencia/Membresías) — es el siguiente increment, hacerlo tras su sign-off del
papel. E2 (escala tipográfica, cifra monumental) y E3 (foto a sangre, ledger, recorrido)
siguen pendientes.

## Maqueta v5 Etapa 1 aprobada en dirección + 2 reglas permanentes (Sebas)
- **Maqueta v5 Etapa 1**: entregada como HTML standalone (outputs/givegrow-v5-maqueta-
  etapa1.html) con toggle día/noche. Sebas: "Me gusta". Dirección aprobada (papel hueso día /
  verde-negro noche, navy→verde-tinta unificado, reglas finas en vez de tarjetas, escala
  editorial, cifra monumental de red, Transparencia libro mayor). Unbounded para títulos
  CONFIRMADA como display de marca. PENDIENTE: su "sí, despliega" para llevar Etapa 1 a
  producción (token funciona).
- **REGLA PERMANENTE — Transparencia sin datos financieros sensibles hasta el cierre 2025.**
  Decisión de Sebas: NO publicar ingresos/gastos/totales (ni ceros) antes del cierre anual.
  La sección Transparencia muestra solo lo verificable hoy (fundaciones/comercios/entregas)
  + "Estado financiero 2025: cierre en curso". El estado financiero completo se publica al
  cierre de 2025. Aplicar esto en el rediseño de la página real, no solo en la maqueta.
- **REGLA PERMANENTE — derechos de imagen.** Fotos subidas por LAS FUNDACIONES = propiedad
  de ellas, uso SOLO con su consentimiento (protección de imagen de menores, Ley 1581).
  Imágenes que SEBAS adjunta para construir la web = uso libre. Mantener la página muy
  visual apoyándose en fotografía; poblar bandas/galerías con imágenes de uso libre de Sebas
  + fotos de fundaciones ya consentidas. NUNCA meter rostros/menores en artefactos
  descargables sin consentimiento.

## DIAGNÓSTICO VISUAL "REDISEÑO v5" (acordado con Sebas, PENDIENTE de ejecutar)
Diagnóstico honesto: sitio bien construido pero genérico — identidad aprobada aplicada ~25%.
5 síntomas: (1) card-itis (todo en tarjetas redondeadas; el lenguaje editorial pide reglas
finas y aire); (2) modo día blanco-default (debe ser "papel institucional" hueso/crema);
(3) token navy heredado compite con verde-tinta (calculadora); (4) escala tipográfica
tímida (sin cifras monumentales, saltos cortos); (5) fotografía enjaulada en thumbnails
(pide bandas a sangre completa).

PLAN v5 EN 3 ETAPAS (cada una con sign-off visual de Sebas ANTES de la siguiente):
- E1 "Papel y familia": fondo día→hueso; navy→verde-tinta profundo (cascada de 1 variable);
  radios 24→12 (grandes a casi 0); bordes de tarjeta→reglas finas en 2-3 secciones piloto
  (Transparencia, Membresías). CSS casi puro, reversible, máximo efecto/esfuerzo.
- E2 "La voz": escala editorial real (titulares grandes, lead 20px, eyebrows sistema);
  UNA cifra monumental Unbounded por página (inicio: línea de red real como pieza
  tipográfica); momentos Fraunces itálica.
- E3 "Momentos firma": banda foto a sangre entre inicio y evidencia; Transparencia como
  LIBRO MAYOR (números tabulares, reglas, NIT/RTE con dignidad de sello — extender ADN del
  cupón/recibos); ascender el "Recorrido 7/12" del pie a elemento con presencia.
Ideas sueltas a madurar: sello institucional gráfico (NIT+RTE como estampilla); muro
físico de logos cuando haya 4-5 aliados.

TAREAS QUE ESPERAN EL OJO DE SEBAS (pospuestas por cansancio, retomar):
- Sign-off visual: Unbounded (H1 hero móvil, peso 700 vs 600, ¿migrar nlogo/precios/h3?);
  menú nuevo (día/noche, labels de grupos); cupón de beneficio; chips mini-calc de ficha;
  filtros y resumen del mapa; textarea aliados (aún de sesiones atrás).
- Recompresión top-5 fotos jornadas (con muestras antes/después).
- Coordenadas de Conciencia (zona aprox., confirmar punto).

## Auditoría de código + Bloques A/B/C (revisión + 2 ideas nuevas)
Commits `b17f0a86` (A) y `092a0bf1` (B+C), ambos success.

**AUDITORÍA (hallazgos y estado):**
- XSS latente CERRADO (A1): renderFicha escapaba 0 campos de partners.json (renderComercio
  escapaba 15 — inconsistencia); popups del mapa y label de hero.impact tampoco. Ahora TODO
  dato remoto pasa por escapeHtml. Importa porque el pipeline de alta automática nace de
  formularios públicos.
- DEUDA DECLARADA (no tarea): script-src 'unsafe-inline' en CSP; endurecer = migrar todos
  los onclick inline a addEventListener. Grande, no urgente.
- Limpieza (A2/A3): borrado img/jornadas/hero_futbol_1400.jpg (288KB huérfano); eliminadas
  10 claves i18n muertas verificadas (nav.g.hub/sumate, nav.alma, nav.conocenos, comm.*,
  grat.cat, grat.how.*, hub.ey) — stat.*/live.* SE CONSERVAN (secciones ocultas). También
  retirada ficha.imp.p (sustituida por la mini-calc). Paridad 681/681.
- Caché (A4): /app.js y /styles.css ahora immutable 1 año en _headers (seguro por
  hash-busting). OJO: si algún día se deploya app.js/styles.css SIN actualizar el hash en
  index.html, los usuarios verían versión vieja hasta 1 año — el hash-bump es OBLIGATORIO.
- Opcionales NO hechos: recompresión top-5 fotos jornadas (674–320KB; tocaría calidad,
  requiere ojo de Sebas).

**IDEA 3 HECHA (B): mini-calculadora de impacto en ficha de fundación.** Chips $10K/$20K/
$50K/$100K → convierte a TODAS las impactUnits de la fundación (solo muestra unidades con
n>=1). Inicializa en $20K. fichaImpCalc() en app.js; claves ficha.imp.calc/ficha.imp.min;
CSS .fimp-*. Conecta calculadora↔fundación (Conciencia luce sus raciones de COP 3.200).

**IDEA 2 HECHA (C): mapa como vista de red con filtros.** Capas Leaflet por tipo, chips
Toda la red/Fundaciones/Comercios (HUB SIEMPRE visible — decisión: es el centro de la red),
y línea-resumen honesta calculada de datos reales (map.sum: '{f} fundaciones, {c}
comercios, {h} HUB'). Contenedores #map-filters/#map-summary alrededor de #map-box.
Nota: los chips de filtro se pintan con t() al construir el mapa; si el usuario cambia de
idioma DESPUÉS de abrir el mapa, los chips tienen data-i18n así que setLang los repinta.

**DECISIONES DE SEBAS registradas:** idea 4 (recibos Wompi) espera confirmación de
pasarela; idea 5 (Heros Wall) anotada para el futuro (decisiones de diseño siguen
abiertas); idea 6 (PWA/manifest) EN PAUSA hasta tener logo real — acordado esperar.

PENDIENTE sign-off visual: chips de la ficha y del mapa (día/noche), línea-resumen,
y que el filtro Comercios muestre Kore + HUB correctamente.

## Fase 4 (menú Opción B) + fix calculadora — ROADMAP COMPLETO
Commit `4c34658b` (deploy success). Con esto, las 4 fases del roadmap están hechas.
- **Menú reestructurado por audiencia (Opción B), aprobado por Sebas.** Desktop:
  `HUB SOCIAL · Fundaciones · Empresas▾(Empresas/Gratitud/Quiero ser aliado) ·
   Membresías▾(Membresías/Calcular mi aporte→#donar/Rastrea tu donación→#rastrea) ·
   Nosotros▾(Origen/Impacto/Transparencia/FAQ/Contacto) · [Donar]`. HUB SOCIAL y
   Fundaciones visibles directos. ALMA SALE del nav (sigue accesible por su FAB + CTAs en
   Donar/FAQ). Drawer móvil espejado con headers mnav-g. Reusa claves i18n existentes
   (ally.t, track.t, membres.cta.btn); 688/688, sin claves nuevas. Rutas: aliado=#aliados,
   rastreo=#rastrea (NO #track). Claves nav.g.hub/nav.g.sumate/nav.alma quedan definidas
   pero sin uso (inofensivo). Nota: triggers "Empresas"/"Membresías" repiten el nombre de
   su primer ítem (patrón mega-menú); si molesta, relabelar.
- **Fix desborde calculadora.** `#calc-display` pasó de 42px fijo a
  `clamp(22px,7vw,42px)` + letter-spacing -.01em + white-space:nowrap. Con Unbounded
  (más ancha) los montos de 8 cifras ($20.000.000) se salían en móvil. Ahora escala.

ESTADO ROADMAP: Fase 1 (UX/contraste) ✓ · Fase 2 (ficha comercio: cupón ✓, mapa ✓, galería/
comunidad pendientes de fotos) · Fase 3 (Unbounded) ✓ · Fase 4 (menú) ✓.
Pendientes vivos: fotos de Kore (galería + comunidad) con consentimiento; textos reales de
beneficio de Kore; sign-off visual de Unbounded (peso titulares, nlogo/precios/h3); convenio
Kore firmado. Decisiones micro del menú abiertas por si Sebas quiere afinar.

## Kore coords exactas + Fase 3 (tipografía Unbounded)
- **Coords de Kore corregidas** (commit `24ae69de`). El pin estaba ~500m desviado (usé centro
  de Envigado). Vía Google Places (tool places_search): lat 6.174531, lng -75.584507,
  place_id ChIJQc4o40JWnA0RQQd0fAzbj3k. Dirección de texto ya era correcta.
- **Fase 3 DESPLEGADA (commit `61a54c84`) — Unbounded self-hosted.**
  - vendor/fonts/unbounded-latin.woff2 (variable 200–900, 50KB, OFL, vía npm @fontsource-
    variable/unbounded). Google Fonts sigue bloqueado por CSP; font-src 'self' cubre el self-host.
  - HALLAZGO: `--font-display` nunca estaba definido → .e404-code/.live-num/.bc-benefit
    heredaban Inter (no display). Ahora `--font-display:"Unbounded","Bricolage Grotesque",sans`.
  - Unbounded "CON MODERACIÓN" (regla del skill): SOLO h1/h2 (titulares) + #calc-display
    (cifra clave) + los que ya usaban --font-display. h3/h4 y piezas pequeñas (.nlogo wordmark,
    precios .tier-price b, pasos .step, #m-name, .pcard-body b) SIGUEN en Bricolage a propósito.
  - index.html: preload Unbounded en vez de Bricolage (H1 del hero es above-fold / LCP).
  - h1/h2 ajustados: line-height 1.08, letter-spacing -.01em (Unbounded es ancha; menos tracking
    negativo que Bricolage). PENDIENTE sign-off visual: Unbounded es display ancha → revisar que
    el H1 del hero no desborde en móvil, y decidir si nlogo/precios/h3 migran también y si el
    peso de titulares baja a 600. Bricolage sigue cargada (fallback + h3/h4).

## Fase 2 en curso + nota sobre logo de Conciencia (histórico)
- **Fase 2a DESPLEGADA (commit `a3c030ed`):** "cupón institucional" del beneficio en la
  ficha de comercio. `.benefit-coupon` (app.js render + styles.css): eyebrow, beneficio en
  tipografía display, nivel como sello (pill), divisor perforado, redención/condiciones en
  letra de documento. Tokens existentes, día/noche. Reemplaza la tarjeta plana
  `.card.ficha-impact`+`.grat-benefit`+`.grat-meta` SOLO en la ficha de comercio (esas
  clases siguen usándose en las mini-cards del grid, no se tocaron). Kore aún con textos de
  beneficio de ejemplo → el cupón queda listo para el contenido real.
- **Fase 2b PENDIENTE:** comercios en el mapa. gratitud.json NO tiene aún `direccion`/`coords`.
  Para comercios la dirección es PÚBLICA y deseada (distinto de fundaciones). Falta: añadir
  soporte de marcador `type:"company"` en el mapa (el código ya lo contempla), y `direccion`
  + `coords` de Kore (buscar dirección pública de Kore Makeup Academy, Envigado, o que la dé
  Sebas). Luego dirección visible en ficha + enlace a Google Maps.
- **LOGO de Conciencia — límite de herramientas:** el binario vive en Drive; moverlo al repo
  exige pasar ~146KB base64 por el contexto de Claude, lo que corrompería el PNG (no es
  fiable copiarlo a mano), y bash no puede alcanzar Drive (fuera del allowlist de red). Vía
  fiable: Sebas ADJUNTA el logo (y luego las fotos de Kore) en el chat → caen en
  /mnt/user-data/uploads y Claude los optimiza (WebP) y los aloja de punta a punta. Estado
  actual: consent.logo=true, logo=null, render protegido (sin imagen rota). Al recibir el
  archivo: subir /img/conciencia_logo.png y poner "logo":"/img/conciencia_logo.png".

## Alta de Fundación Conciencia al HUB (esta sesión)
Commit `6ab8194e` (deploy success). Tercera fundación de la red `partners.json`.
Datos tomados del formulario ANTERIOR "Aplicación al Hub Social (respuestas)"
(Drive id 1ZchdL8...), fila del 2026-07-09; Conciencia respondió antes del form nuevo.

- **Fundación Conciencia formación para la paz** (NIT 900229688-6). ESAL CONSTITUIDA
  (2008), Cámara de Comercio VIGENTE y RUT — estándar legal más fuerte que NDF
  ("en proceso de constitución").
- Rep. legal: Lina Marcela Cardona Arango. Contacto form: proyectosconciencia@gmail.com
  / fundacionconcienciaparalapaz@gmail.com. Web: fundacionconcienciaparalapaz.org.
  IG: @fundacion_conciencia. Referida por Andrea Lopera / Sebastián.
- Territorio: comedores en Nueva Jerusalén (Medellín) + Valencia y La Apartada (Córdoba).
- 2 unidades de impacto (calculadora): ración de almuerzo COP 3.200; mercado familiar
  mensual COP 150.000 (ambas "de facturas reales" según el form). La 3ª unidad del form
  venía ilegible ("50 Familias Terapia 350 NNA") → NO se usó (evidencia, no promesas).
- 3 programas: Uno Menos con Hambre / AgroConciencia / Aprender para Emprender.
- Cifras (450 directos, +9.000 raciones/mes) redactadas como REPORTADAS por la fundación,
  no verificadas en terreno aún.

PENDIENTES Conciencia:
- [ ] **Alojar el binario del logo.** Autorizaron logo (consent.logo=true) y el PNG está
      en Drive (id 10xcGvOnXxg2v3PQllJKR384OKd4Xth_U, ~107KB). NO se alojó aún para no
      corromperlo copiando ~146KB base64 a mano. Con logo:null + render protegido, la
      ficha NO muestra imagen rota. Al alojar: subir /img/conciencia_logo.png y poner
      "logo":"/img/conciencia_logo.png".
- [ ] **Confirmar coordenadas.** Puestas a NIVEL DE ZONA aprox. (lat 6.313, lng -75.585 =
      Nueva Jerusalén, borde NO Medellín–Bello, sobre barrio París). Confirmar/ajustar.
- [ ] Fotos: no adjuntaron; gallery vacía; minorsImageProtected "pendiente".
- [ ] Verificación en terreno de las cifras reportadas (opcional, según proceso HUB).

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
- i18n: dict ES en app.js; EN lazy desde /i18n/en.json. Paridad actual 682/682.
- Datos: partners.json (fundaciones), gratitud.json (comercios), inventario.json.
- Validación: `node scripts/validate.mjs` (paridad, sintaxis, tags, cobertura).

## VERIFICADO AL CIERRE
- Etiqueta `calc.tipo.lbl` en index.html (calc-cap + role=group/aria-labelledby): ✓
- ES en app.js + EN en en.json (paridad 682/682): ✓
- `.calc-dest-lbl,.calc-cap` en styles.css (reuso de estilo, día/noche ok): ✓
- validate.mjs: TODO OK (sintaxis, paridad, cobertura, JSON, JSON-LD, tags).
- Cache-bust actualizado: styles d7794fd2, app 4e1fd8b4.
- Deploy 9c5bc3bb Actions success.
- PENDIENTE Sebas: sign-off visual de la etiqueta (desktop+móvil, día+noche);
  decisión del texto final (ver alternativas en el cierre de tanda de arriba);
  revocar token de escritura de la sesión.
