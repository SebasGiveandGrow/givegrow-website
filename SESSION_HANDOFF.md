# SESSION HANDOFF — estado vigente

> Actualizado: 17 oct 2026. **Este archivo se mantiene corto (menos de 8 KB).**
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

## Estado al 17 oct 2026

- **Producción al día con `main`** (último: #599, /socialfest «después del evento»).
- **PR abiertos:**
  - Canal de quejas (`claude/canal-quejas`, migración 0046): SIN automerge. Aplicar la 0046 desde la rama ANTES de fusionar. Punto focal y plazo quedan como parámetros vacíos hasta que Sebas los decida.
  - #584: código por ruta. Esperaba a que pasara el Social Fest; hay que ponerlo al día con `main` antes de fusionarlo.
  - #530: términos de donación. Espera revisión legal.
- **Social Fest 2026 (14–16 oct, Ruta N) terminó.**
  - El taller «Si no quedó documentado, no ocurrió» tuvo 14 personas; los resultados están en /socialfest.
  - Falta consolidar los contactos: hojas de papel, WhatsApp y los inscritos en línea (`inscripciones.tipo = 'asistente'`). La base consolidada vive FUERA del repo: el repo es público.
- **Regalos de diciembre (24 oct 2026):** la base completa está en un PR (migración 0048, `/#regalos`, `/admin/regalos`). La campaña nace en borrador. Para abrirla solo faltan los datos: valores por tipo de regalo, la aliada de EE. UU., las fechas, las hojas de terreno y las fotos. Ver `ops/regalos.md`.
- **Siguiente en el sitio:**
  - Página de teoría de cambio (sale de `MEDICION.md`; el texto lo aprueba Sebas).
  - Página de la campaña con Give to Colombia (espera sus datos).
  - Alta al HUB de las fundaciones que Sebas visita en el Amazonas.

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
