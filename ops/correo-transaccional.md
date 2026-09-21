# Correo transaccional — configuración

Lo que hace falta para que el donante reciba su número de guía por correo.
Hoy el código ya está, y **funciona sin credenciales**: sin llave configurada
simula el envío y lo registra en el log del Worker, sin romper el cobro.

---

## Por qué un subdominio y no el dominio principal

**Estado del dominio principal — ARREGLADO el 11 de agosto de 2026.**

Cuando se construyó esta capa, el dominio principal estaba roto: el SPF apuntaba
a un `include` que resolvía vacío, no había DKIM publicado, y el DMARC estaba en
`p=reject`. Todo correo que salía fallaba autenticación y la propia política del
dominio ordenaba rechazarlo (síntoma documentado en `ops/aliados-formulario.gs`,
error 550 5.7.26).

Ya no. Verificado con un informe de `verifier.port25.com`:

| Comprobación | Resultado |
|---|---|
| SPF | **pass**, y alineado (`smtp.mailfrom` = `From`) |
| DKIM | **pass**, y ALINEADO — `d=thegiveandgrowproject.org`, selector `google`, llave de 2048 bits |
| iprev | pass |

Que ambos estén **alineados** es lo que importa: DMARC ya no depende de una sola
pata, y el correo reenviado sobrevive (SPF se rompe al reenviar, DKIM no).

**Aun así el transaccional se queda en el subdominio**, y no por necesidad sino
por diseño: separa reputaciones. Un problema con el correo automático —un pico de
rebotes, una queja de spam— no arrastra al correo humano de la fundación, ni al
contrario.

**Un subdominio dedicado esquiva el problema:** `notificaciones.…` publica sus
propios registros, DMARC se evalúa sobre el dominio del remitente, y pasa —
aunque el principal siga mal. Además separa reputaciones: un problema del correo
automático no arrastra al correo humano de la fundación.

> ⚠️ **PERO HOY SOLO PUBLICA EL DKIM.** Comprobado por DNS el 12 sep 2026 contra
> 1.1.1.1 y 8.8.8.8: `notificaciones.thegiveandgrowproject.org` **no tiene NINGÚN
> registro TXT** —o sea, sin SPF— **ni MX**. El DKIM de Resend sí está. Ver
> «Lo que falta en el DNS» al final de este archivo.

> Esto **no** arregla `sebas@` ni `contabilidad@`. Ese arreglo sigue pendiente y
> es el mismo de siempre: publicar el DKIM de Workspace, corregir el SPF a
> `include:_spf.google.com`, y bajar DMARC a `p=none` hasta que ambos pasen.

---

## Pasos (los tres primeros son de Sebas)

### 1 · Crear la cuenta en Resend
`resend.com` → registrarse. El tramo gratuito son 100 correos/día y 3.000/mes,
de sobra para empezar. No pide tarjeta.

### 2 · Verificar el subdominio
En Resend: **Domains → Add Domain** → escribir exactamente:

```
notificaciones.thegiveandgrowproject.org
```

Resend entrega 2 o 3 registros DNS (un DKIM tipo TXT, un SPF tipo TXT y a veces
un MX para rebotes). Copiarlos **tal cual** en el DNS de GoDaddy y esperar la
verificación.

**Ojo con GoDaddy:** al pegar un registro para `resend._domainkey.notificaciones`,
GoDaddy añade solo el dominio base. Si el nombre queda duplicado
(`…notificaciones.thegiveandgrowproject.org.thegiveandgrowproject.org`), la
verificación nunca pasa. Verificar con:

```bash
dig +short TXT resend._domainkey.notificaciones.thegiveandgrowproject.org
```

### 3 · Crear la llave de API
En Resend: **API Keys → Create**. Permiso de solo envío basta.
**No pegar la llave en un chat.** Cargarla directo:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_API_KEY --env sandbox
```

### 4 · Variables de entorno (esto lo hago yo, va en wrangler.toml)

| Nombre | Para qué | Valor |
|---|---|---|
| `RESEND_API_KEY` | secreto | lo carga Sebas |
| `CORREO_DESDE` | remitente | `Give&Grow International <no-responder@notificaciones.thegiveandgrowproject.org>` |
| `CORREO_AVISOS` | aviso interno de cada aporte | un buzón que **sí reciba hoy**: el Gmail, no el dominio propio, mientras el DNS principal siga roto |

---

## Qué se envía hoy

| Correo | Cuándo | A quién |
|---|---|---|
| **Confirmación con número de guía** | al aprobarse el pago, **una sola vez** | al donante, en su idioma |
| **Aviso interno** | al aprobarse el pago | a `CORREO_AVISOS` |

El candado de "una sola vez" es `aportes.aprobada_en`: si ya tiene fecha, el
webhook es un reintento y no se reenvía nada. Sin ese candado, los tres
reintentos de Wompi serían tres correos idénticos al donante.

**Lo que NO se envía todavía:** recibo en PDF y certificado DIAN. Eso es la Fase 5
completa, y el certificado además espera la validación de la contadora.

---

## La regla que no se debe romper

**El correo nunca puede tumbar el cobro.** Si falta la llave, si Resend responde
error o si se cae la red, se registra y se sigue: el aporte queda aprobado igual.
Perder un pago confirmado por un fallo de correo sería indefendible, y es un
error fácil de introducir si alguien "mejora" el código quitando el try/catch o
poniendo el envío antes del UPDATE.

---

## Lo que falta en el DNS del subdominio (comprobado el 12 sep 2026)

El paso 2 de arriba dice que Resend entrega dos o tres registros y que hay que
copiarlos **tal cual**. Se copiaron los tres.

| registro | host | estado |
|---|---|---|
| DKIM | `resend._domainkey.notificaciones…` | ✅ publicado |
| SPF | `send.notificaciones…` | ✅ `v=spf1 include:amazonses.com ~all` |
| MX (rebotes) | `send.notificaciones…` | ✅ `10 feedback-smtp.sa-east-1.amazonses.com` |

> **⚠️ ESTA TABLA DECÍA QUE FALTABAN DOS, Y ERA FALSO (corregido el 15 sep 2026).**
> El error no estaba en el DNS sino en la consulta: se preguntaba por
> `notificaciones.thegiveandgrowproject.org`, y **Resend publica el SPF y el MX
> en `send.notificaciones.…`**, que es el dominio del Return-Path. Ahí estaban
> desde el principio. Si alguna nota vuelve a decir que el subdominio «no
> devuelve ningún TXT», es que está preguntando por el host de arriba.

### Qué significa hoy, sin dramatizarlo

**DMARC pasa por las dos patas.** DKIM alinea, y SPF también: el ápex lleva
`aspf=r`, y con alineación relajada `send.notificaciones.…` (Return-Path) y
`notificaciones.…` (`From:`) comparten dominio organizativo. Si el DKIM se
rompiera —llave rotada en Resend, registro borrado al tocar el DNS— el SPF
sostiene solo.

> **El 15 de septiembre de 2026 el ápex pasó de `sp=quarantine` a `sp=reject`**,
> una vez comprobado que las dos patas estaban publicadas. Antes, el modo de
> fallo de este subdominio era «va a spam»; ahora es «lo rechazan», igual que el
> dominio principal. Por eso la comprobación previa dejó de ser opcional: subir
> `sp` con una sola pata habría convertido un fallo de DKIM en correo rebotado
> en vez de correo en spam.

**Los rebotes sí llegan… a Resend.** El MX de `send.notificaciones.…` apunta a
`feedback-smtp.sa-east-1.amazonses.com`, así que Resend recibe la notificación de
que una dirección no existe. Lo que NO hay es camino de vuelta a la base: **no
existe ningún webhook de Resend hacia D1** —los únicos webhooks del Worker son
los de Wompi—, así que el rebote se queda en el panel de Resend.

Conviene tenerlo claro al leer el panel: **`enviado` significa «Resend lo
aceptó», no «llegó»**. La tabla `correos` solo conoce tres resultados —`enviado`,
`fallo`, `simulado`— y un rebote posterior no es ninguno de los tres, así que la
cola «Correos que no salieron» no puede verlo. Eso sigue igual de cierto que
antes; lo que cambia es el motivo, que no es la falta de MX.

### Cómo comprobarlo, y en qué host

Ya no hay nada que publicar. Lo que sí hay que hacer bien es **preguntar por el
host correcto**, que es donde se equivocó la versión anterior de este documento:

```bash
dig +short TXT resend._domainkey.notificaciones.thegiveandgrowproject.org
dig +short TXT send.notificaciones.thegiveandgrowproject.org
dig +short MX  send.notificaciones.thegiveandgrowproject.org
```

Los tres deben devolver algo. Si se pregunta por `notificaciones.…` a secas
—sin el `send.`— las dos últimas salen vacías, y eso **no** significa que
falten: significa que se está preguntando en el sitio equivocado.

> ⚠️ Ojo con zsh: si se mete esto en un bucle sobre una variable con varios
> hosts, zsh **no** divide por palabras y la consulta sale mal. Envolver en
> `bash -c '…'`.

~~Lo único que sigue abierto de esta zona es el `sp=quarantine` del ápex~~ —
**cerrado el 15 de septiembre de 2026.** El registro vivo es:

```
v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r; rua=…
```

Ya no queda nada abierto en esta zona. La comprobación de arriba sigue sirviendo
para lo de siempre: confirmar que las dos patas siguen en pie. Si alguna vez
falta el SPF de `send.notificaciones.…`, con `sp=reject` el correo del sitio no
va a spam — **rebota**, y entonces hay que bajar a `sp=quarantine` mientras se
republica.

---

## El techo de Resend, y quién lo puede reventar

El plan gratis son **100 correos/día, 3.000/mes y 10 por segundo**, y ese techo
es para **todo** el sistema: confirmaciones de aporte, enlaces de membresía,
bajas, los doce avisos internos y el aviso del séptimo día de Mira Mi Casa.
`pay-as-you-go` está **apagado**, así que pasarse no cuesta dinero: cuesta
correos que no salen.

**El único que puede reventarlo solo es el aviso del séptimo día**, porque es el
único que escribe a muchas personas de una vez y sin que nadie lo dispare. Mira
Mi Casa nació para un sismo: el día que importa es justo el día en que 150
familias cruzan el séptimo día a la vez.

**Tope: `AVISOS_POR_EJECUCION = 60`** en `worker.js`. Deja 40 al día para todo
lo demás.

**El tope aplaza, no descarta**, y esa es la parte que hay que no romper. La
consulta mira de 7 a `DIAS_ESPERA_TOPE` (21) días, no un solo día: quien no
entra hoy entra mañana. Con la ventana de un día que había antes, poner un tope
habría cambiado un fallo silencioso por otro — el que se quedaba fuera no volvía
a aparecer nunca.

**La idempotencia cuenta solo los envíos BUENOS.** `anotarCorreo` escribe también
los intentos fallidos, con su guía. Mientras la comprobación miraba cualquier
fila, un envío rechazado contaba como «ya salió» y esa familia no se reintentaba
jamás — y eso se juntaba con el techo de la peor manera posible: el día que el
cupo se agota, las familias que caen del lado malo del corte quedaban silenciadas
de forma permanente. Medido en el banco local antes de arreglarlo: con una fila
`fallo` sembrada, las otras 149 recibieron su aviso y esa se quedó en cero
reintentos. `'simulado'` sí cuenta como hecho: significa que falta la llave, y
reintentarlo cada día no manda nada. De eso informa `adminSalud`.

**El log del cron dice la verdad.** Antes el único número era `enviados` y se
incrementaba detrás del `await` sin mirar el resultado — y `enviarCorreo` no
lanza cuando Resend responde mal, devuelve `{ok:false}`. Un día de cupo agotado
quedaba escrito como 150 avisos enviados. Ahora salen `enviados`, `fallidos`,
`aplazados` y `tope`.

**Probarlo:**
```
npx wrangler dev --port 8796 --persist-to /tmp/gg-aviso --test-scheduled
PERSIST=/tmp/gg-aviso python3 ops/probar-aviso-espera.py
```
La batería siembra 150 familias, corre la tarea cuatro veces y comprueba que las
150 acaban avisadas, ninguna dos veces, y ninguna cero. Contra el código
anterior falla 5 de sus 11 comprobaciones, así que sirve para lo que dice servir.

**Si algún día hace falta subir el techo:** el plan Pro de Resend son 50.000/mes.
La decisión es de Sebas y cuesta dinero; mientras tanto el tope es la forma
honesta de no prometer más correo del que se puede mandar.

---

## El presupuesto diario, y quién gana cuando no alcanza

Poner tope al aviso del séptimo día resolvió al que podía reventar el plan solo.
No resolvió lo de fondo: **cuando el cupo se agota, los envíos empiezan a fallar
en el orden en que llegan** —o sea, al azar— y el único rastro es una fila
`fallo` que nadie mira. El recibo de alguien que acababa de donar podía perderse
para que saliera un aviso interno que el equipo ya veía en el panel.

**La regla: cuando queda poco, gana quien está fuera de la organización.** El
equipo tiene el panel. Una familia esperando un concepto, un donante esperando
su recibo o un ingeniero voluntario no tienen nada más.

```
CORREO_TOPE_DIA         = 95   (de los 100 del plan, con margen)
CORREO_RESERVA_PERSONAS = 25   (los últimos 25 son solo para personas)
```

| Enviados hoy | Interno | A una persona |
|---|---|---|
| 0–69 | sale | sale |
| 70–94 | `sin_cupo` | sale |
| 95+ | `sin_cupo` | `sin_cupo` |

**Se decide por DESTINATARIO, no por etiqueta.** Fue la primera idea y es la
equivocada: una lista de etiquetas «críticas» se queda vieja en cuanto alguien
añade la número 34 y se olvida de apuntarla, y el fallo sería silencioso justo
el día malo. Los buzones propios —`CORREO_AVISOS`, `CORREO_MMC`,
`CORREO_ALIANZAS`— están en la configuración y no se multiplican: lo que va a
uno de ellos es interno, y **todo lo demás cuenta como persona**, que es el lado
seguro.

**`sin_cupo` es un resultado propio, no un `fallo`.** Importa por dos razones:
se distingue de un error de Resend al mirar la tabla, y la idempotencia del
aviso del séptimo día solo cuenta `enviado` y `simulado` — así que **lo que hoy
no cupo se reintenta mañana** en vez de darse por hecho. Está probado que
componen bien.

**Un `fallo` no consume cupo**, porque en Resend tampoco lo consumió: la cuenta
mira solo los `enviado`.

**El presupuesto para el correo, no el trabajo.** Un caso se crea igual aunque
no salga ni un aviso; una donación se registra igual aunque no salga el recibo.
Y si la propia cuenta del presupuesto falla, no bloquea nada: es una red, no una
puerta.

**Probarlo:**
```
npx wrangler dev --port 8798 --persist-to /tmp/gg-cupo --test-scheduled \
    --var RESEND_API_KEY:re_llave_invalida_de_prueba \
    --var CORREO_AVISOS:equipo@ejemplo.invalid \
    --var CORREO_MMC:mmc@ejemplo.invalid
PERSIST=/tmp/gg-cupo python3 ops/probar-cupo-correo.py
```
Hace falta una llave FALSA: sin `RESEND_API_KEY` el Worker simula y no llega a
mirar el presupuesto. Con una inválida sí lo mira, y lo que pasa el filtro acaba
en `fallo` (401) en vez de `enviado` — que es justo la señal que distingue «pasó
el presupuesto» de «lo paró el presupuesto». Nada se entrega: Resend rechaza en
la autenticación.

**Si sube el volumen de verdad**, el plan Pro de Resend son 50.000/mes. Subir
`CORREO_TOPE_DIA` sin subir el plan solo mueve el punto donde empieza a fallar.
