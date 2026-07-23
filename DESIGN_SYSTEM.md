# DESIGN_SYSTEM — Give&Grow

Guía de diseño y convenciones técnicas del sitio (`index.html` + `app.js` + `styles.css`).
Estas reglas son vinculantes: cualquier trabajo nuevo debe respetarlas.

## Identidad
- Tagline (INTOCABLE): **"Dar para crecer, crecer para dar más."**
- Nombre canónico del centro operativo: **HUB SOCIAL** (nunca "Compassion Hub").
- Colores: `--g` verde #1F5C38, `--navy` #0A1628, acento verde claro #9be3b6. Vars: `--gl/--bd/--mu/--rl/--r/--shadow/--shadow-lg/--ease`.
- Tipografías: **Unbounded** (display — títulos h1/h2 y cifras clave, con moderación), **Inter** (cuerpo, UI, h3/h4), **Fraunces** italic (acento editorial). Bricolage Grotesque quedó retirada (etapa anterior de marca).

## Reglas de diseño (nuevas / confirmadas)
1. **Cero emojis en todo el sitio.** Sin excepción. Todo ícono es SVG line-art.
2. **Íconos = SVG line-art**: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, `class="ic-svg"`. Badge contenedor `.ic` de 46px, radio 12; el SVG a 24px. Íconos botánicos (seed/sprout/tree/forest) para los niveles de membresía.
3. **Sistema de tarjetas unificado**: `.card` con badge `.ic`, sombra `var(--shadow)` en reposo. Enlaces dentro de tarjeta con `.card-link` (verde, negrita, con flecha `→`).
4. **Patrón de pasos**: `.steps > .step > .step-n` (círculo verde numerado). El número vive SOLO en `.step-n`; **no** repetirlo en el título (evitar doble numeración).
5. **Ritmo de secciones**: alternar fondos blanco / `.cream` / `.band` (navy) para dar cadencia visual.
6. **Chips**: listas de etiquetas (poblaciones, categorías) como `.eco-row > .eco-chip`.
7. Fotografía de comunidad al frente (no el fundador). Imágenes reales, nunca bancos de fotos.

## Reglas de contenido
- **"Evidencia, no promesas."** Nunca inventar métricas, testimonios ni logos. Donde no haya contenido real, usar **estado vacío honesto** ("próximamente"), nunca contenido ficticio.
- **Consentimiento obligatorio** antes de publicar logo/nombre/descripción/fotos de cualquier tercero. Verificar en el registro del formulario (columna "Documentación y Compromisos") que ambas autorizaciones (marca + imagen) estén otorgadas.
- **NIT 000** = proyecto en proceso de constitución → no presentarlo como ESAL formal.

## i18n (regla crítica)
- Diccionario `I18N { es:{…}, en:{…} }` en `app.js`; función `t(key)`; `setLang()` aplica sobre todos los `[data-i18n]` (y `[data-i18n-attr]` para atributos como `alt`).
- **Paridad exacta ES = EN** siempre (misma cantidad de claves, mismos nombres). Nunca dejar una clave en un idioma sin su par.
- Cada `data-i18n` del HTML debe existir en ambos idiomas.

## Calculadora de impacto
- Equivalencias vía `IMPACT_UNITS` en `app.js`. Cada item: `{es, en, cop}` (costo en COP de UNA unidad).
- Vacío → la línea "Tu impacto" queda oculta. Con datos reales → se enciende sola en `calcUpdate()`.
- Siempre mostrar **"≈ aprox."** y la fuente. Solo cargar costos **defendibles** (basados en facturas/compras reales).

## Deploy y verificación (obligatorio)
- Deploy vía **GitHub Trees API** (commit atómico, preservando `base_tree`).
- **Nunca** tumbar el sitio. Verificar render **antes y después** de cada deploy.
- Antes de desplegar: `node --check app.js`; conteo de paridad i18n; balance de tags (`main/section/div/svg`); render **headless Playwright** (forzar `.rv` → `.in` para captura completa); sin `pageerror`.
- **Bump** de `?v=YYYYMMDDx` en `app.js` y `styles.css` en cada cambio de assets (cache-busting).
- Verificar contra `raw.githubusercontent.com/<commit>/<path>` (más fresco que caché de fetch).
