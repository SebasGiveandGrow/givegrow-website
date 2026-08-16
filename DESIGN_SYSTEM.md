# DESIGN_SYSTEM — Give&Grow

Guía de diseño y convenciones técnicas del sitio (`index.html` + `app.js` + `styles.css`).
Estas reglas son vinculantes: cualquier trabajo nuevo debe respetarlas.

## Identidad
- Tagline (INTOCABLE): **"Dar para crecer, crecer para dar más."**
- Nombre canónico del centro operativo: **HUB SOCIAL** (nunca "Compassion Hub").
- Color raíz: `--g` verde institucional **#1F5C38**. El acento legible es `--acc`, que **cambia con el modo** (#1F5C38 de día, #6FB08D de noche) — para TEXTO en superficie oscura se usa `--acc`, nunca `--g`.
- ~~`--navy` #0A1628 y el acento #9be3b6~~ **no existen** (verificado: cero apariciones). El azul navy quedó retirado de la marca y no se reintroduce.
- Tipografías: **Unbounded** (display — títulos h1/h2 y cifras clave, con moderación), **Inter** (cuerpo, UI, h3/h4), **Fraunces** italic (acento editorial). Bricolage Grotesque quedó retirada (etapa anterior de marca).

## Reglas de diseño (nuevas / confirmadas)
1. **Cero emojis en todo el sitio.** Sin excepción. Todo ícono es SVG line-art.
2. **Íconos = SVG line-art**: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, `class="ic-svg"`. Badge contenedor `.ic` de 46px, radio 12; el SVG a 24px. Íconos botánicos (seed/sprout/tree/forest) para los niveles de membresía.
3. **Sistema de tarjetas unificado**: `.card` con badge `.ic`, sombra `var(--shadow)` en reposo. Enlaces dentro de tarjeta con `.card-link` (verde, negrita, con flecha `→`).
4. **Patrón de pasos**: `.steps > .step > .step-n` (círculo verde numerado). El número vive SOLO en `.step-n`; **no** repetirlo en el título (evitar doble numeración).
5. **Ritmo de secciones**: alternar fondos claro / `.cream` (`--surface-2`) / `.band` (`--ink-deep`, verde-tinta profundo — **no** navy) para dar cadencia visual.
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

## Sistema de tokens (plan VISUAL, Fase 4)

**Ningún color ni tamaño se escribe a mano.** Si no está en la escala, no existe;
y si de verdad hace falta uno nuevo, se define como token en `:root` y se usa
desde ahí. El **check #11 de `validate.mjs`** lo vigila con un trinquete: fija el
número actual de literales como techo, falla si sube, y cuando baja dice a
cuánto ponerlo.

**Tinta sobre superficie oscura** — seis pasos, y el componente elige por lo que
la cosa ES, no por la opacidad que quede bien:

| token | valor | para qué |
|---|---|---|
| `--on-dark` | `#fff` | texto principal |
| `--on-dark-2` | .85 | texto secundario |
| `--on-dark-3` | .70 | texto de apoyo |
| `--on-dark-4` | .55 | texto tenue y líneas marcadas |
| `--on-dark-line` | .16 | líneas y separadores |
| `--on-dark-fill` / `-2` | .12 / .07 | superficies sutiles |

`--on-dark` vale `#111` dentro de `@media print`: así cualquier sección oscura
que se añada se imprime legible sola, sin depender de la lista de contenedores.

**Otros tokens de color:** `--err` (rojo de error, con su variante de noche),
`--amber` (atención), `--logo-bg` (fondo blanco fijo para logotipos ajenos, que
NO es `--on-dark`: son ideas distintas), `--wa-marca` (verde de WhatsApp,
acotado a su botón).

**Escala tipográfica.** Grande con `clamp()`: `--fs-display / h1 / h2 / h3 / h4 /
lead / body`. Pequeña, siete pasos fijos: `--fs-11` a `--fs-17`, con
`--fs-eyebrow` (12) y `--fs-control` (13) como nombres de rol. **Sin medios
puntos**: los 72 que había eran deriva de ajustar a ojo.

**Radios:** `--r` (12px) para campos y bloques, `999px` para píldoras y botones,
`50%` para circulares. **Sombras:** `--shadow`, `--shadow-lg` y `--fab-shadow`
(dos capas, con su versión de noche).

## Deploy y verificación (obligatorio)
- Deploy vía **GitHub Actions** al llegar a `main`. Rama `claude/<tema>` → PR
  **sin** `automerge` → lo fusiona Sebas. Nunca push directo a `main`.
- Gate obligatorio antes de commitear: **`node scripts/validate.mjs`** (21
  comprobaciones). Exportar antes `PATH="/opt/homebrew/bin:$PATH"`.
- **Cache-bust por hash, no por fecha:** `md5 -q styles.css | cut -c1-8` y lo
  mismo con `app.js`, y ese valor va en el `?v=` de `index.html`. **Recalcularlo
  al final de todo**, nunca a mitad: retocar el CSS después del rebust hace que
  el navegador sirva la versión vieja.
- Si se tocan textos ES: `node scripts/hydrate-i18n.mjs` antes de commitear.
- Revisar **siempre en día Y noche** antes de abrir PR.
