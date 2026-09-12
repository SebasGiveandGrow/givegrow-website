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
copiarlos **tal cual**. Se copió uno.

| registro | estado |
|---|---|
| DKIM (`resend._domainkey.notificaciones…`) | ✅ publicado |
| SPF (TXT en `notificaciones…`) | ❌ **no existe** |
| MX (rebotes) | ❌ **no existe** |

Verificado contra 1.1.1.1 y 8.8.8.8: el subdominio no devuelve ningún TXT.

### Qué significa hoy, sin dramatizarlo

**DMARC sigue pasando.** Se apoya en DKIM, que está alineado, y a este subdominio
le aplica el `sp=quarantine` del ápex —no el `p=reject`—, así que el modo de fallo
es «va a spam», no «lo rechazan».

**Pero se sostiene en una sola pata.** Si el DKIM se rompe —la llave se rota en
Resend, el registro se borra al tocar el DNS— **todo** el correo del sitio se va a
spam a la vez: recibos, certificados, el enlace del caso de una familia, los
avisos a ingenieros. Con SPF publicado harían falta dos fallos, no uno.

**Y sin MX no hay rebotes.** Resend no puede recibir la notificación de que una
dirección no existe, así que un correo mal escrito por un donante se queda en
`enviado` para siempre. Conviene tenerlo claro al leer el panel: **`enviado`
significa «Resend lo aceptó», no «llegó»**. La tabla `correos` solo conoce tres
resultados —`enviado`, `fallo`, `simulado`— y un rebote posterior no es ninguno
de los tres, así que la cola «Correos que no salieron» no puede verlo.

### Qué hacer, cuando se quiera

1. En Resend → Domains → `notificaciones.thegiveandgrowproject.org`, copiar el
   TXT de SPF y el MX que ahí aparecen, y publicarlos en el DNS.
2. Volver a comprobar:

```bash
dig +short TXT notificaciones.thegiveandgrowproject.org
dig +short MX  notificaciones.thegiveandgrowproject.org
```

Ninguna de las dos cosas es urgente: el correo funciona y los 15 envíos de la
base están en `enviado`. Queda escrito porque la diferencia entre «funciona» y
«funciona por un solo mecanismo» solo se nota el día que ese mecanismo falla.
