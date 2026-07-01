# Informe de Cierre de Sesión — Give&Grow

_Última actualización: 27/06/2026. Sitio: https://www.thegiveandgrowproject.org — repo `SebasGiveandGrow/givegrow-website` (rama `main`)._

## 1. Resumen de Estado

### Completado y desplegado (todo en `main`, Actions en verde)
- **Empresas** desarrollada a fondo (por qué aliarte, 3 niveles, cómo funciona en 4 pasos, puente a Gratitud) — commit `473611e2`
- **Gratitud** desarrollada (dos caras miembro/comercio, 5 categorías en chips, 3 pasos, CTA doble) — `473611e2`
- **Impacto** reencuadrada honesta ("Evidencia, no promesas" + 3 pruebas; historias inventadas → estado honesto) — `4e36d541`
- **Inicio**: sección "¿Por dónde empiezo?" con 4 recorridos (donante/empresa/fundación/voluntario) — `1dff2eb5`
- **Calculadora** pulida: íconos SVG botánicos (último emoji eliminado) + andamiaje de equivalencias `IMPACT_UNITS` — `8a049cda`
- **Origen** enriquecida (foto de campo + línea de tiempo + CTA); **Hub** con poblaciones en chips — `14fe7ad7`
- **Fundaciones** ampliada (íconos + "El proceso" en 5 pasos + franja "sin costo") — `3b336b19`
- **Formulario Hub** finalizado y publicado; **primer registro recibido** (Niños del Futuro NDF)

### Pendiente inmediato (empezado, sin terminar): Integrar NDF al Hub
Datos verificados. **Consentimientos SÍ otorgados** (publicación de logo/nombre + uso de imagen). Falta:
- **Encender la calculadora** con el dato real: `IMPACT_UNITS=[{es:"plato de comida", en:"plate of food", cop:4000}]` (fuente: $4.000/plato, basado en facturas reales)
- **Localizar y hostear el logo** (carpeta "Niños del Futuro" en Drive; la columna Logo del form vino vacía) → commit a `/img/`
- **Construir la tarjeta de fundación** + sección "Fundaciones aliadas" en la página Hub (primer ladrillo del Heroes Wall)

### Pendiente de la lista (no iniciado)
- Enriquecer **FAQ** (hoy solo 5 preguntas)
- **Pulir detalles estéticos** (tarjetas "features" del Inicio: tag+ícono apretados; accesos del hero)
- Revisar a fondo **Transparencia** y **Membresías**

### Datos verificados de NDF (para la tarjeta)
- Nombre comercial: **Fundación Niños Del Futuro** · Director: Francisco Grijalba
- Medellín (Manrique, La Honda) · desde **2020** · sector **Niñez y adolescencia**
- IG **@ninosdelfuturo** · web **ninosdelfuturo.com** · color marca **Azul**
- Misión (ES): _"Brindar bienestar y educación a los niños y jóvenes de las comunidades más vulnerables."_
- Programas: **Chefs del Futuro** (~100 niños/día) y **Borboletas** (30 niños, 3×/sem)
- **NIT 000 / en proceso de constitución** → no publicar como ESAL formal
- La _frase corta_ la escribieron en inglés — crear versión ES.

## 2. Prompt para el nuevo chat

> Continúo el desarrollo del sitio de la Fundación Give&Grow International (SPA en Cloudflare Workers, repo `SebasGiveandGrow/givegrow-website`). El sitio es `index.html` + `app.js` + `styles.css`, i18n ES/EN con paridad (415/415 claves), deploy vía GitHub Trees API. Regla de oro: verificar render headless antes y después de cada deploy; nunca romper la paridad i18n; nada de emojis (solo íconos SVG line-art); "evidencia, no promesas" (no inventar métricas). Lee primero `SESSION_HANDOFF.md`, `DESIGN_SYSTEM.md` y `.clauderules` en la raíz del repo.
>
> **Tarea inmediata:** Integrar la primera fundación aliada, **Niños del Futuro (NDF)**, al Hub (datos y consentimientos ya verificados en la hoja de respuestas del formulario en Drive): (1) encender la calculadora agregando `IMPACT_UNITS=[{es:"plato de comida",en:"plate of food",cop:4000}]` en `app.js`; (2) traer el logo de NDF desde la carpeta "Niños del Futuro" en Drive y hostearlo en `/img/`; (3) crear una sección "Fundaciones aliadas" en la página Hub con la tarjeta de NDF (logo, nombre, frase, sector, ubicación, enlaces IG/web), diseñada para crecer (inicio del Heroes Wall).
>
> **Luego:** enriquecer FAQ, pulir detalles estéticos (tarjetas "features" del Inicio, accesos del hero), revisar a fondo Transparencia y Membresías.

## 3. Recursos clave (Drive / repo)
- Hoja de respuestas del formulario: `1ZchdL8zaJroqdrwGSlDo2LCNTeQkVTjBF6LaNTer3VY`
- Logo NDF: en carpeta **"Niños del Futuro"** (pendiente localizar fileId)
- Working dir de build: `/home/claude/build/` (espejo byte a byte de producción tras cada deploy)
- Último commit desplegado antes de este handoff: `3b336b19`

## 4. Archivos modificados en la sesión
- `index.html` — todas las páginas tocadas. Versión de assets actual: `?v=20260626i`
- `app.js` — i18n ES/EN (415/415), `renderPobChips()`, `initBlog()` honesto, `TIERS` con SVG, `IMPACT_UNITS` (vacío, listo para NDF), lógica de equivalencia en `calcUpdate()`
- `styles.css` — `.card-link`, `.origen-img`, `#m-ic .ic-svg`
