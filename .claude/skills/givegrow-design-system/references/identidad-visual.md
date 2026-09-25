# Give&Grow — Identidad Visual Institucional (referencia completa)

## La dirección aprobada

Sebas aprobó una dirección visual institucional que combina tres pilares, inspirada en charity:water, Médicos Sin Fronteras, Farm Africa y Ford Foundation:

1. **Fotografía real** — terreno, comunidades, trabajo de campo. Con consentimiento documentado.
2. **Transparencia financiera como diseño** — el registro, las cifras, los documentos públicos presentados con dignidad tipográfica.
3. **Estructura editorial** — jerarquía de publicación seria, no de landing de producto.

El ejemplo canónico entregado y aprobado es `givegrow-real-ejemplo.html` (usó contenido y marca reales del sitio). La tipografía Unbounded y el toggle día/noche están aprobados.

**Ya está aplicada al sitio vivo** (Etapa 1 del rediseño v5 en producción); esta línea decía «el siguiente paso estratégico es aplicar esta dirección», que era cierto cuando se escribió y dejó de serlo. Las etapas 2 y 3 siguen abiertas — ver `CLAUDE.md`, sección CONTINUIDAD.

## Qué tomar de cada benchmark

- **charity:water**: la fotografía a sangre completa como apertura emocional; la promesa de trazabilidad ("prueba tu impacto") convertida en experiencia de producto; cifras grandes con contexto verificable debajo.
- **Médicos Sin Fronteras**: urgencia sin sensacionalismo; rojo/color usado como señal, no como decoración; la organización habla con autoridad de quien está en terreno.
- **Farm Africa**: calidez de territorio rural sin paternalismo; las personas retratadas con agencia y dignidad, nunca como víctimas.
- **Ford Foundation**: gravedad editorial; tipografía como voz institucional; ensayos y posiciones largas tratadas como material de primera clase; paleta contenida.

De Give&Grow mismo: el verde `#1F5C38` como raíz, el lema "Dar para crecer, crecer para dar más", y el principio rector "evidencia, no promesas" que ya es el titular de la sección de Impacto.

## Modo día / noche

- El toggle es parte de la identidad, no un gadget. Transición sobria (200–300ms, ease), sin flashes.
- **Día**: papel institucional — fondos de blanco cálido/hueso, tinta casi negra, verde institucional pleno.
- **Noche**: documento leído de noche — fondo verde-tinta muy profundo o gris-verde oscuro (nunca #000 puro), texto hueso, el verde institucional se aclara lo justo para mantener contraste AA.
- Ambos modos con contraste WCAG AA mínimo en todo texto. Verificar especialmente los acentos verdes sobre fondos oscuros.
- Persistir preferencia del usuario; respetar `prefers-color-scheme` como default inicial.

## Vidrio (glassmorphism con regla)

Aprobado por Sebas el 25 sep 2026. Antes el skill lo prohibía; su palabra manda.

**La regla: «Lo que se mira a través es vidrio. Lo que se firma es papel.»** El vidrio es una ventana al territorio: va sobre la fotografía de terreno o sobre el mapa de la red, y deja ver lo que hay detrás mientras sostiene un dato. Los documentos que alguien firma —acta de entrega, certificado de donación, registro de Transparencia— son papel: su valor está en ser sólidos.

- **Solo sobre foto o mapa.** Sobre un color plano el desenfoque no tiene qué desenfocar y se ve como una caja gris: ese componente es papel. Única excepción: la barra de navegación, porque el contenido pasa por debajo.
- **Un vidrio protagonista por pantalla.** Es el elemento firma de esa zona.
- **Contraste medido sobre la zona más clara de la foto**, no sobre el papel: el medidor de siempre no ve la imagen. Si no llega a 4,5:1 (3:1 en texto grande), sube el tinte o el panel se mueve a la zona oscura.
- **Dos respaldos obligatorios, opacos:** `@supports not (backdrop-filter…)` y `prefers-reduced-transparency: reduce` → `var(--ink-deep)`.
- **Siempre con `-webkit-backdrop-filter`** (iOS 17 o anterior). El check #19 del gate lo exige.
- **Nunca** en listas largas ni sobre texto corrido, ni con degradados decorativos fabricados para tener algo detrás, ni sobre fotos con rostros de menores identificables. Máximo dos capas con blur visibles a la vez.
- **Sin sombra difusa**: lo que lo hace vidrio es el filo de luz de 1 px arriba.

Tokens (en `styles.css`, `:root`): `--vidrio-tinta` (verde-tinta al 52 %), `--vidrio-blur` (18px), `--vidrio-filo`, `--vidrio-luz`, y `--brote` (#9CCBA9) para el texto claro de marca encima. Componente: `.vidrio`. Primer uso: la credencial del hero (`.hero-cred`), solo desde 1000 px. Plan de las piezas siguientes (Rastrea, calculadora de Donar, mapa, galería): artefacto «Vidrio y papel».

## Fotografía y medios

- Solo medios con consentimiento documentado y fecha de consentimiento registrada. **Pendiente vigente al 18 sep 2026: la FECHA de NDF** (`consent.date` sigue en `null`). La foto ya no es pendiente: `consent.photos` es `true` y su galería está publicada.
- Personas retratadas con dignidad y agencia. Prohibido: poses de lástima, primeros planos de sufrimiento, imágenes generadas por IA de personas/comunidades.
- Formatos: optimizar peso (WebP/AVIF con fallback), lazy-loading fuera del viewport inicial, `alt` bilingüe descriptivo.
- ~~El banner de fotos es un feature pendiente~~ — hecho: hay galería con consentimiento verificado en `#impacto` y en la ficha de cada fundación, y solo se pinta si `consent.photos === true`.

## Voz de copy

- Registro: institucional cálido. Ni corporativo frío ni ONG lastimera ni startup entusiasta.
- Verbos activos, presente, primera persona plural con responsabilidad ("Centralizamos", "Acompañamos").
- Cada cifra publicada debe ser verificable; lo futuro se etiqueta explícitamente como futuro ("En construcción" ya se usa para ImpactOS — mantener esa honestidad).
- Los tres caminos de empresa se llaman exactamente: Padrinazgo de Impacto / Impact Journey / Alianza a medida.
- Los niveles de membresía: Semilla / Retoño / Árbol / Bosque. Esta metáfora orgánica es capital de marca — reutilizarla en piezas nuevas (ej. tiers del futuro Heros Wall) antes de inventar nomenclaturas nuevas.
- Errores y estados vacíos: explican qué pasó y qué hacer, sin disculpas vagas.
- TODO copy nuevo nace en ES y EN simultáneamente. La paridad bilingüe es innegociable.

## Piezas futuras ya diseñadas conceptualmente (no implementar sin luz verde)

- ~~**Recibos de donación**: prototipo~~ — **están en producción** desde la Fase 5: `documentos.js` los arma con `pdf-lib` y el recibo sale solo. Lo que sigue necesitando persona es el **certificado**, que firma la Revisora Fiscal bajo gravedad de juramento desde `/admin`; su articulado vive en dos archivos y el check #10 del gate falla si divergen.
- **Heros Wall**: tres niveles (anónimos con contador honesto / con nombre / destacados con logo), consentimiento de visibilidad por Ley 1581, tiers orgánicos sin montos individuales. Pendientes decisiones de Sebas sobre tiers visibles y frases de protagonistas.
