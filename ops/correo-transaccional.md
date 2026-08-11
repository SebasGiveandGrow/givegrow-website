# Correo transaccional — configuración

Lo que hace falta para que el donante reciba su número de guía por correo.
Hoy el código ya está, y **funciona sin credenciales**: sin llave configurada
simula el envío y lo registra en el log del Worker, sin romper el cobro.

---

## Por qué un subdominio y no el dominio principal

Medido el 8 y el 11 de agosto de 2026 sobre `thegiveandgrowproject.org`:

| Registro | Estado |
|---|---|
| SPF | `include:dc-aa8e722993._spfm.…` → **ese include resuelve vacío**, así que no autoriza a nadie |
| DKIM | **sin registro** en `google._domainkey` ni en 7 selectores comunes |
| DMARC | **`p=reject`** |

Con esa combinación, todo correo que salga del dominio principal falla
autenticación y su propia política ordena rechazarlo. Ya está documentado el
síntoma en `ops/aliados-formulario.gs` (error 550 5.7.26).

**Un subdominio dedicado esquiva el problema:** `notificaciones.…` publica su
propio DKIM y SPF, DMARC se evalúa sobre el dominio del remitente, y pasa —
aunque el principal siga mal. Además separa reputaciones: un problema del correo
automático no arrastra al correo humano de la fundación.

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
