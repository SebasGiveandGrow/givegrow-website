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

## Estado al 29 oct 2026

- **Producción al día con `main`.** Único PR abierto que no es de esta tanda: #530 (términos de donación), espera revisión legal.
- **Migraciones aplicadas hasta la 0056.**
- **En producción del 28 al 29 oct:**
  - **Regalos:** imagen propia al compartir y aviso de reasignación (#621–#623); embajadores (#626, 0051).
  - **Quejas:** enlace desde Mira Mi Casa y quejas anotadas a mano en el panel (#624, #625, 0050).
  - **Operación:** respaldo cifrado (`ops/respaldo.mjs`, #627; faltan las llaves de Sebas) y privacidad v1.3, vigente desde el 9 nov (#628).
  - **Panel:** informe «Por fundación» (#629).
  - **Portal de fundaciones `/portal`:** entrada con enlace al correo, perfil editable, documentos, diseño con el recorrido de 5 pasos, correos autorizados y la zona Admin › Alianzas › Fundaciones (#630–#632, 0052–0053). Después se le sumaron «lo que han recibido» (#635) y los ODS que declaran (#636, 0056).
  - **Apadrinamiento por unidad de impacto:** catálogo, portal, panel y `/apadrinamiento` (#633, 0054), y reporte mensual verificable (#634, 0055).
- **Ancla (manejo especial):**
  - Su ficha está cargada con datos verificados y vinculada a `ancla`, con un correo adicional autorizado.
  - Le falta llenar la dirección, la frecuencia de sus programas y el costo de su unidad de impacto.
  - Las autorizaciones 7.4 y 7.8 las marca solo ella.
- **Pendiente de Sebas:**
  - Reunión con el contador sobre el cobro del apadrinamiento (fase 2). Las preguntas están fuera del repo.
  - Sí explícito y punto focal para la fase 4 (niño identificado).
  - Llaves y token R2 del respaldo; PayPal (textos e IPN); convenios de Conciencia y Ancla.
  - Sueco y alemán: para después, con un revisor nativo.
- **La lista numerada (1–49) y el plan autónomo de 7 bloques** viven en la memoria de Claude (`givegrow-lista-28oct`, `givegrow-plan-autonomo`).
- **SEO:** una ruta nueva va en `RUTAS_INDEXABLES` (worker.js), `RUTAS_PATH` (app.js), `run_worker_first` y el sitemap; el check #28 del gate lo exige. Un módulo `js/` nuevo necesita un commit antes de que el sitemap tenga su fecha.

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
