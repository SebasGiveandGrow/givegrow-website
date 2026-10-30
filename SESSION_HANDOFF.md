# SESSION HANDOFF — estado vigente

> Actualizado: 29 oct 2026. **Este archivo se mantiene corto (menos de 8 KB).**
> Lo que vino antes —jul a sep 2026, 225 KB, unos 60 000 tokens— está en
> `ops/historial/session-handoff-hasta-sep-2026.md`. Se consulta por sección
> (`grep -n "^## " …` y leer solo la que sirve), **nunca entero**: leerlo completo
> al arrancar una sesión era lo que más contexto gastaba antes de escribir una
> línea.
>
> Responder siempre en español. Principio rector: **«evidencia, no promesas»**.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Reglas del repo y el flujo de PR | `CLAUDE.md`, `.clauderules` |
| Identidad visual | `.claude/skills/givegrow-design-system/`, `DESIGN_SYSTEM.md` |
| Cómo se abre un PR, en un comando | `.claude/skills/gg-pr/` → `node scripts/pr.mjs` |
| Capturas de día, noche y celular | `node ops/verificar.mjs <ruta>` |
| ¿Producción tiene todo `main`? | `git fetch origin` (sin `-q`) y `node ops/en-produccion.mjs` |
| Plan de voluntariado (8 fases) | `PLAN_VOLUNTARIADO.md` — fases 1–7 hechas; sigue la 8 |
| Medición (MEAL) | `MEDICION.md`, módulo en `/admin` |
| Metodología MIRA y salvaguarda | `METODOLOGIA_MIRA.md`, `SALVAGUARDA.md` |
| Incidentes | `ops/runbook-incidentes.md` |

## Estado al 30 oct 2026 (tarde)

- **Producción al día con `main`.** Único PR abierto: #530 (términos de donación), espera revisión legal.
- **Migraciones aplicadas hasta la 0060.** La sesión de wrangler se renovó el 30 oct (`npx wrangler login`).
- **Portal de fundaciones `/portal`** (#630–#656):
  - entrada por enlace al correo, con las sesiones atadas a los correos autorizados;
  - el Perfil renovado: secciones con avance, borrador que se guarda solo, vista previa de la ficha y «Revisado por el equipo» en cada campo (#649–#653, 0058);
  - Documentos, Apadrinamiento (unidades y reporte mensual), Indicadores con fuente y corte (0057);
  - **Dar y recibir** (#655, 0059) y **costos por unidad de impacto** (#656, 0060). Estos costos se verifican en la bandeja y entran a la calculadora pegando el bloque en `partners.json`, que sigue siendo la única fuente.
  - Guías: `ops/portal-fundaciones.md` y `ops/apadrinamiento-unidades.md`.
- **Panel ordenado por tareas** (#645–#647): Atender, Revisar y aprobar (la **Bandeja de revisión** `#revisar` junta todo lo que espera una decisión), Cuidar el dinero, Acompañar la red y Rendir cuentas.
- **Voluntariado:** registro del Decreto 4290 con su CSV del mes (#642).
- **Sitio:** mapa de ODS de la red en /hub (#639).
- **Regalos de diciembre:**
  - Lista para la última milla: etiquetas para empacar y planilla de entrega con firma del acudiente (#654).
  - Hay una plantilla de Excel para las fundaciones (fuera del repo). Tiene las columnas exactas del importador.
  - **Para abrir el 9 nov falta TODO lo de la campaña** (medido el 30 oct): valores por tipo de regalo en pesos y dólares, la aliada de EE. UU., las fechas de entrega y el cierre, los niños (0 cargados) y los embajadores (0).
- **Ancla (manejo especial):**
  - Su ficha está cargada y vinculada a `ancla`.
  - Le faltan la dirección, la frecuencia de sus programas, el costo de su unidad y sus ODS.
- **Fundación de PRUEBA:** inscripción 14, con el correo de Sebas, para revisar el portal. No sale en el sitio. Borrarla cuando termine.
- **Pendiente de Sebas:**
  - el contador (cobro del apadrinamiento y tienda);
  - el sí y el punto focal para «niño identificado»;
  - si el documento del voluntario sigue siendo obligatorio;
  - llaves R2 del respaldo; PayPal (textos e IPN); convenios de Conciencia y Ancla;
  - sueco y alemán, con revisor nativo.
- **La lista numerada (1–49)** vive en la memoria de Claude (`givegrow-lista-28oct`).
- **SEO:** una ruta nueva va en `RUTAS_INDEXABLES` (worker.js), `RUTAS_PATH` (app.js), `run_worker_first` y el sitemap; el check #28 del gate lo exige.

## Decisiones vigentes (no reabrir sin Sebas)

- **DISCREPA queda fuera** hasta nuevo aviso.
- **Board de Asesores consultivo:** «previo concepto del Board de Asesores», nunca «aprueba».
- **Cifras financieras:** solo las de estados financieros firmados.
- **Impact Journey:** sin cuota de participación (no «sin costo»). Es piloto: todavía no se ha hecho con un equipo de empresa. La vuelta la vivió el fundador como voluntario (2025–2026).
- **Lo que cambia una página pública** va en un PR **sin** `automerge` y lo fusiona Sebas. Lo interno (scripts, docs de trabajo) puede ir con `automerge`.

## Al cerrar una tanda

Actualizar SOLO la sección «Estado» de arriba y, si hubo una decisión nueva,
«Decisiones vigentes». La historia larga de cómo se llegó a algo va en el PR y
en el commit, no aquí.
