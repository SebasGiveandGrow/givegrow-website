---
name: givegrow-design-system
description: Sistema de diseño e identidad visual de Fundación Give&Grow International (thegiveandgrowproject.org). Usar SIEMPRE que se trabaje en cualquier aspecto visual, de UX, frontend, copy o estructura del sitio de Give&Grow — incluyendo nuevas secciones, rediseños, componentes, landing pages, prototipos, el modo día/noche, el Heros Wall, recibos, ALMA, o cualquier HTML/CSS/JS del repo givegrow-website. También usar cuando el usuario (Sebas) pida propuestas visuales "más innovadoras", "más llamativas" o "institucionales", aunque no mencione el sitio explícitamente. Este skill define el techo creativo y los límites de marca — consultarlo ANTES de escribir cualquier línea de CSS o proponer cualquier dirección visual.
---

# Give&Grow — Sistema de Diseño Institucional

Trabaja como el director de diseño de una fundación institucional seria, no como un desarrollador de startups. El cliente ya rechazó propuestas que "se sienten hechas por IA". El estándar de comparación es: charity:water, Médicos Sin Fronteras, Farm Africa, Ford Foundation. Si un diseño podría ser la landing de una app fintech, está mal.

## Identidad en una frase

**"Evidencia, no promesas."** Todo lo visual debe transmitir verificabilidad, gravedad institucional y calidez humana real (fotografía de terreno con consentimiento), nunca hype ni decoración vacía.

## Contexto de la organización

- Fundación Give&Grow International — ESAL colombiana, Régimen Tributario Especial, NIT 901.948.930-2, Medellín.
- Misión: puente entre fundaciones donantes institucionales y organizaciones de base, con impacto trazable.
- Audiencia: donantes institucionales, empresas (RSE), fundaciones aliadas. NO consumidores de app.
- Sitio: SPA bilingüe (ES/EN) en thegiveandgrowproject.org, Cloudflare Workers, repo `SebasGiveandGrow/givegrow-website`.
- Lema: "Dar para crecer, crecer para dar más."

## Tokens de marca

**Color**
- Verde institucional: `#1F5C38` (confirmado como theme-color en producción). Es el ancla de la paleta.
- Antes de tocar CSS en una sesión nueva: verificar los tokens vigentes leyendo el CSS real del repo o del sitio en producción. Este documento da la dirección; el código vivo da el estado exacto.
- La paleta debe leerse como institución financieramente seria con raíz en territorio colombiano: verdes profundos, neutros cálidos de papel/documento, tinta oscura. Acentos con moderación.
- PROHIBIDO: gradientes llamativos multicolor, neones, glassmorphism, el terracota `#D97757` (tell de diseño-IA), acid green sobre negro.

**Tipografía**
- Display institucional: **Unbounded** (aprobada por Sebas para la dirección institucional). Usar con moderación y peso intencional — titulares, cifras clave, momentos de identidad.
- Cuerpo: **Inter**. Editorial/serif de apoyo: **Fraunces**. También disponible: Bricolage Grotesque (etapa anterior de la marca; no introducirla en piezas nuevas de la dirección institucional sin confirmación).
- TODAS las fuentes son self-hosted en `/vendor/` (fuentes variables). Nunca Google Fonts ni CDNs externos — el CSP lo bloquea y es decisión de arquitectura.
- La tipografía carga la personalidad: escala clara, pesos intencionales, tracking cuidado. Titulares que se sienten de informe anual de fundación seria, no de pitch deck.

**Estructura**
- Lenguaje editorial: jerarquía tipo publicación (eyebrows en mayúsculas pequeñas, reglas finas, columnas con aire), estructura de "ledger" para lo financiero/transparencia.
- La transparencia financiera ES material de diseño: cifras, NIT, registros, documentos públicos se presentan con dignidad tipográfica, no escondidos en el footer.
- Numeraciones (1/2/3/4) solo donde hay proceso real secuencial (ya existen en "El recorrido", proceso de vinculación, etc.) — no como decoración.

**Modo día/noche**
- Aprobado como parte de la dirección institucional. Ambos modos deben sostener la misma gravedad: el modo noche no es "dark mode de app", es la versión nocturna de un documento institucional (tintas invertidas con calidez, no negro puro con neón).

**Fotografía**
- Solo fotografía real de terreno con consentimiento documentado (Ley 1581). Nunca stock genérico, nunca imágenes generadas por IA de personas o comunidades.
- La foto es el héroe emocional; el diseño la enmarca con sobriedad.

## Cómo elevar lo "innovador y llamativo" sin romper la identidad

La innovación permitida es la de las mejores fundaciones del mundo, no la de las startups:
- **Un solo elemento firma por sección/pieza** — gasta la audacia en un lugar (una cifra monumental en Unbounded, una transición de modo día/noche memorable, un mapa vivo de la red, un muro de aliados con presencia física). Todo lo demás, quieto y disciplinado.
- **Motion con propósito**: revelados al scroll sobrios, micro-interacciones que confirman (hover en tarjetas de fundaciones, contador honesto), una secuencia orquestada mejor que efectos dispersos. Respetar `prefers-reduced-motion` siempre.
- **Datos como espectáculo digno**: la trazabilidad y las cifras verificables son el "wow" de Give&Grow. Visualizarlas bien (mapa Leaflet de la red, ledger de transparencia, calculadora de donación) es más llamativo y más honesto que cualquier gradiente.
- **Regla de Chanel**: antes de entregar, quitar un accesorio.

## Anti-patrones (rechazar de plano)

- Estética de template IA: cream + serif + terracota; negro + acento ácido; broadsheet genérico.
- Emojis en UI institucional. Bordes redondeados excesivos tipo app. Sombras difusas de dashboard SaaS.
- Copy promocional o superlativo sin evidencia ("revolucionario", "el mejor", cifras no validadas por Revisoría Fiscal).
- Cualquier claim de destino de fondos con porcentajes específicos no validados — usar lenguaje cualitativo hasta validación fiscal.
- Mencionar "Compartamos con Colombia" (removido de toda la comunicación).
- Elementos que solo existen en un idioma: toda pieza nueva nace bilingüe ES/EN o no nace.

## Proceso de trabajo (obligatorio)

1. **Antes de diseñar**: leer `references/identidad-visual.md` para la dirección completa y benchmarks. Verificar tokens vigentes contra el código real.
2. **Plan primero**: paleta nombrada (4–6 hex), roles tipográficos, concepto de layout en una frase + wireframe ASCII, y el elemento firma. Autocriticar contra la pregunta: "¿esto podría confundirse con una startup o con un template de IA?" Si sí, revisar.
3. **Prototipo antes que opciones**: Sebas evalúa viendo prototipos y corrige después — entregar UNA propuesta opinionada y bien ejecutada, con caveats honestos, no un menú de opciones neutras.
4. **Antes de desplegar**: leer `references/arquitectura-tecnica.md` y cumplir el checklist completo (paridad i18n, validate.mjs, CSP, tags balanceados).

## Referencias del skill

- `references/identidad-visual.md` — dirección institucional completa, análisis de benchmarks, reglas de modo día/noche, voz de copy. Leer antes de cualquier trabajo de diseño nuevo.
- `references/arquitectura-tecnica.md` — stack, restricciones CSP, patrón i18n, single source of truth, patrón de deploy y checklist pre-deploy. Leer antes de tocar código o desplegar.
