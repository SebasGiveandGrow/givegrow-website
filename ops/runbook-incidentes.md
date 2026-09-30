# Runbook de incidentes

Qué hacer cuando algo del sitio se rompe. Nació de la auditoría de operación del
28 sep 2026: hasta entonces un 500, un cron caído o un secreto borrado solo
dejaban una línea en un log que nadie abría.

Todos los comandos se corren **dentro del repo** (sin `wrangler.toml` a la vista
fallan con «No configuration file found») y con el wrangler fijo del proyecto:
`npm ci` y después `npx wrangler …`.

---

## 1 · Dónde mirar primero

| Señal | Dónde |
|---|---|
| Correo **«Operación · …»** | Buzón de alianzas, a las ~9:00 (14:00 UTC). Solo llega si algo está mal. |
| Workflow **«Vigilante de producción»** en rojo | GitHub → Actions. Corre cada hora. |
| Deploy en rojo en **«Producción responde con la versión nueva»** | GitHub → Actions → el run del deploy. |
| Detalle de todo | `/admin` → «Salud del ecosistema» → bloque **Operación** |
| Registros del Worker | Cloudflare → Workers → `givegrow-website` → **Observability → Logs** (activado en `wrangler.toml`). En vivo: `npx wrangler tail` |
| ¿Está vivo y qué versión corre? | `curl -s https://thegiveandgrowproject.org/api/ping` |

`/api/ping` devuelve `{ok, version, desplegado, cron_al_dia}`. `ok:false` o un
503 = el Worker no llega a D1. `cron_al_dia:false` = alguna tarea diaria no tuvo
éxito en 26 h. `null` = todavía no hay latidos (normal justo tras aplicar la 0032).

---

## 2 · Qué significa cada línea del correo «Operación»

| Línea | Qué pasó | Qué hacer |
|---|---|---|
| **Registro de operación** | No se pudieron leer `latidos`/`incidentes`. | Casi siempre: falta aplicar `migrations/0032`. Ver §6. |
| **Errores del sitio en 24 h** | El Worker respondió 500 al menos una vez. Trae el último: origen, ruta y mensaje. | Salud → Operación lista los 10 últimos. Buscar la ruta en Observability → Logs. Si empezó tras un deploy: §3. |
| **Tarea programada sin éxito en 26 h** | `aviso-septimo-dia`, `cobro-mensual` o `resumen-diario` lanzó una excepción, o el cron no corrió. | Salud → Operación dice el último error. Si ninguna tarea corrió: Cloudflare → Workers → Settings → Triggers, que el cron `0 14 * * *` siga ahí. Para correrlo a mano no hay botón: se espera al día siguiente o se redespliega. |
| **Cobro sin evidencia** | Hay intenciones de aporte y cero eventos de Wompi en la historia. | Revisar en el panel de Wompi que los eventos apunten a `/api/wompi/eventos` de producción. |
| **Eventos de PayPal sin casa** | Entró o salió plata que no se atribuye a nadie, o una firma no cuadra. | Bandeja «Eventos de PayPal sin casa» en `/admin`. |
| **Firmas inválidas en 24 h** | Llegaron webhooks (Wompi o PayPal) con firma que no cuadra. | O alguien golpea el endpoint, o cambió un secreto (`WOMPI_EVENTS_SECRET`, `PAYPAL_WEBHOOK_ID`). |
| **Correos que fallaron en 24 h** | Resend rechazó o no respondió. | Reenviar a mano desde el panel; mirar el estado de Resend. |
| **Correos a PERSONAS sin cupo** | Se agotó el presupuesto diario (95) y un correo a alguien de fuera no salió. | **No se reintentan solos**: el cuerpo no se guarda (Ley 1581, migración 0009). Reenviar a mano con la etiqueta y la guía. `caso-espera` sí se reintenta solo al día siguiente. Si se repite, el plan de Resend se quedó corto. |
| **Configuración que falta** | Un secreto esperado está vacío. Solo se ve el NOMBRE. | `npx wrangler secret put NOMBRE`. Sin `WOMPI_PRIVATE_KEY` el cobro mensual no cobra a nadie; sin `RESEND_API_KEY` ningún correo sale (quedan «simulado»). |

---

## 3 · Deshacer un deploy (rollback)

```bash
npx wrangler deployments list          # qué versión estaba antes y cuándo
npx wrangler rollback <version-id> --message "motivo"
```

⚠️ **Solo es seguro volver a una versión desplegada DESPUÉS de la última
migración aplicada.** El rollback cambia el código, no la base: un Worker viejo
contra una base nueva puede escribir sin columnas que ahora son obligatorias, o
leer tablas con otra forma. Antes de elegir la versión, mirar la fecha de la
última migración (`npx wrangler d1 migrations list givegrow-privado --remote`
y `git log -1 --format=%ci -- migrations/`). Si la versión buena es anterior a
esa migración, **no se hace rollback**: se arregla hacia adelante con un PR.

Después del rollback, `main` sigue teniendo el código malo y el vigilante horario
va a decir que producción está atrás: eso es correcto. Se arregla con un PR que
revierta, no desactivando el vigilante.

---

## 4 · Restaurar la base (D1 Time Travel)

D1 guarda un historial continuo de la base (7 días en el plan gratuito, 30 en
el de pago). No hace falta haber sacado respaldo antes.

```bash
npx wrangler d1 time-travel info givegrow-privado                    # bookmark de ahora
npx wrangler d1 time-travel info givegrow-privado --timestamp=2026-09-28T13:00:00Z
npx wrangler d1 time-travel restore givegrow-privado --timestamp=2026-09-28T13:00:00Z
```

⚠️ **Restaurar BORRA todo lo que entró después** de ese momento: aportes,
casos de familias, inscripciones. Antes de restaurar:

1. Anotar el bookmark actual (`time-travel info` sin `--timestamp`): con él se
   puede deshacer la restauración.
2. Exportar la base actual (§5) para poder recuperar a mano lo que entró después.
3. Si el daño es de unas pocas filas, suele ser mejor corregirlas con SQL que
   restaurar la base entera.

---

## 5 · Respaldo semanal (manual, por ahora)

Cada lunes, en la máquina de Sebas y **fuera del repositorio**:

```bash
npx wrangler d1 export givegrow-privado --remote --output ~/Respaldos/givegrow-$(date +%F).sql
```

El archivo tiene **todos los datos personales** (donantes, familias, teléfonos,
documentos). Por eso:

- **No se commitea nunca** y no se sube a ningún servicio sin cifrar. Se guarda
  fuera del repo porque la carpeta del repo ES la de assets del Worker: un
  archivo ahí se publica en el próximo deploy (el PR #524 añade `respaldo-*` a
  `.assetsignore` como segunda red, no como la primera).
- **No se automatiza en GitHub Actions todavía**, a propósito: un artefacto de
  Actions de un repositorio público con la base en claro es una fuga esperando
  pasar.

**Siguiente paso propuesto (decide Sebas):** automatizarlo cifrado. Sebas crea un
par de llaves con [`age`](https://age-encryption.org) (`age-keygen -o clave.txt`),
guarda la **privada** fuera de línea (no en GitHub, no en Cloudflare) y pone la
**pública** como secreto de Actions. Un workflow semanal exporta, cifra con la
pública y guarda el `.age`; sin la llave privada ese archivo no sirve a nadie. Sin
esa llave creada por él, esto no se construye.

---

## 6 · Migraciones

```bash
npx wrangler d1 migrations apply givegrow-privado --remote
npx wrangler d1 migrations list  givegrow-privado --remote   # «No migrations to apply!»
```

Se aplican **antes** de fusionar el PR que las necesita. El deploy se niega a
salir si falta alguna, así que una migración olvidada se ve como un deploy rojo
en «La base está migrada», no como un sitio caído.

---

## 7 · Desplegar

- **Producción**: solo por GitHub Actions (`deploy.yml`), al fusionar a `main` o
  con `gh workflow run "Deploy Give&Grow to Cloudflare" --ref main`.
  `npm run deploy` se niega a correr fuera de CI.
- **Sandbox**: Actions → «Deploy sandbox (pruebas)» → Run workflow, eligiendo la
  rama. Aplica sus migraciones pendientes antes del código.
- Si un deploy falla en «Producción responde con la versión nueva»: el código
  SÍ subió, pero `/api/ping` no devolvió su versión en dos minutos. Mirar qué
  responde `/api/ping`; si es 503, el Worker nuevo no llega a D1 → §3.
