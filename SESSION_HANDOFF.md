# SESSION HANDOFF — estado vigente

> Actualizado: 27 oct 2026. **Este archivo se mantiene corto (menos de 8 KB).**
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

## Estado al 27 oct 2026

- **Producción al día con `main`.** Único PR abierto: #530 (términos de donación), espera revisión legal.
- **En producción desde el 17 oct:** canal de quejas (#606, 0046), certificado de horas (#604, 0047), teoría de cambio (#601), tira de confianza (#602), invitación de ALMA por página (#603), código por ruta (#584), regalos (#607–#609, 0048–0049), ALMA con indicadores medidos (#610–#612), SEO con 19 rutas indexables (#614), firma de correo (`ops/correo/`, imagen en `img/correo/`).
- **MEAL:** primeras mediciones del 2026-T3 registradas (17 oct). Indicador #1 = 1 hasta archivar los convenios de Conciencia y Ancla. #12 se calcula desde el canal de quejas.
- **Pendiente de Sebas:**
  - Cargar los 5 asesores en `/admin` › Board y enviar el informe T3.
  - Archivar los convenios de Conciencia y Ancla.
  - Canal de quejas: decidir punto focal y plazos.
  - Regalos: la campaña sigue en BORRADOR hasta tener valores, aliada de EE. UU., fechas, hojas de terreno y fotos (`ops/regalos.md`).
  - Search Console: reenviar el sitemap y pedir la indexación (pasos en #614). Revisar «Indexadas» hacia el 3 nov.
  - Contactos del Social Fest (papel + WhatsApp + inscritos `tipo='asistente'`): consolidar FUERA del repo.
- **SEO:** una ruta nueva va en `RUTAS_INDEXABLES` (worker.js), `RUTAS_PATH` (app.js) y `run_worker_first`; el check #28 del gate lo exige.
- **Siguiente en el sitio:** página de la campaña con Give to Colombia (espera sus datos); alta al HUB de las fundaciones del Amazonas.

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
