# Give&Grow — Identidad Visual Institucional (referencia completa)

## La dirección aprobada

Sebas aprobó una dirección visual institucional que combina tres pilares, inspirada en charity:water, Médicos Sin Fronteras, Farm Africa y Ford Foundation:

1. **Fotografía real** — terreno, comunidades, trabajo de campo. Con consentimiento documentado.
2. **Transparencia financiera como diseño** — el registro, las cifras, los documentos públicos presentados con dignidad tipográfica.
3. **Estructura editorial** — jerarquía de publicación seria, no de landing de producto.

El ejemplo canónico entregado y aprobado es `givegrow-real-ejemplo.html` (usó contenido y marca reales del sitio). La tipografía Unbounded y el toggle día/noche están aprobados. El siguiente paso estratégico es aplicar esta dirección al sitio vivo.

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

## Fotografía y medios

- Solo medios con consentimiento documentado y fecha de consentimiento registrada (pendiente conocido: foto de fundación NDF).
- Personas retratadas con dignidad y agencia. Prohibido: poses de lástima, primeros planos de sufrimiento, imágenes generadas por IA de personas/comunidades.
- Formatos: optimizar peso (WebP/AVIF con fallback), lazy-loading fuera del viewport inicial, `alt` bilingüe descriptivo.
- El banner de fotos es un feature pendiente que requiere media consentida antes de implementarse.

## Voz de copy

- Registro: institucional cálido. Ni corporativo frío ni ONG lastimera ni startup entusiasta.
- Verbos activos, presente, primera persona plural con responsabilidad ("Centralizamos", "Acompañamos").
- Cada cifra publicada debe ser verificable; lo futuro se etiqueta explícitamente como futuro ("En construcción" ya se usa para ImpactOS — mantener esa honestidad).
- Los tres caminos de empresa se llaman exactamente: Padrinazgo de Impacto / Impact Journey / Alianza a medida.
- Los niveles de membresía: Semilla / Retoño / Árbol / Bosque. Esta metáfora orgánica es capital de marca — reutilizarla en piezas nuevas (ej. tiers del futuro Heros Wall) antes de inventar nomenclaturas nuevas.
- Errores y estados vacíos: explican qué pasó y qué hacer, sin disculpas vagas.
- TODO copy nuevo nace en ES y EN simultáneamente. La paridad bilingüe es innegociable.

## Piezas futuras ya diseñadas conceptualmente (no implementar sin luz verde)

- **Recibos de donación**: prototipo Wompi completo existe (estética ledger día/noche, numeración GG-YYYY-NNNNNN). Pendiente validación DIAN con contadora antes de comunicar beneficio fiscal.
- **Heros Wall**: tres niveles (anónimos con contador honesto / con nombre / destacados con logo), consentimiento de visibilidad por Ley 1581, tiers orgánicos sin montos individuales. Pendientes decisiones de Sebas sobre tiers visibles y frases de protagonistas.
