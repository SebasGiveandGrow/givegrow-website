# `/firma` — configuración de Cloudflare Access y de los dos firmantes

La pantalla donde el **Representante Legal** y la **Revisora Fiscal** firman los
certificados de donación. Ver `migrations/0026_firma_certificados.sql` para el
porqué del cambio y el PR #378 para lo que hace.

Como `/admin` y `/triaje`, no lleva autenticación propia: la protege **Cloudflare
Access**, con su **propia aplicación y su propia audiencia**. Esa separación es el
punto — la Revisora Fiscal entra a firmar certificados, no a ver donantes,
comprobantes bancarios ni casos de vivienda.

---

## ⚠️ EL ORDEN IMPORTA, y es al revés de lo que parece

**Los secretos van AL FINAL.** En cuanto existen `FIRMA_RL_EMAIL` y
`FIRMA_RF_EMAIL`, el flujo de firma se ENCIENDE: los certificados dejan de poder
enviarse hasta que estén las dos firmas.

Si los pones antes de que la Revisora Fiscal pueda entrar, los certificados se
quedan esperando una firma que nadie puede dar todavía. No se pierde nada —se
firman en cuanto entre— pero es un atasco evitable.

    1. aplicar la migración
    2. fusionar el PR
    3. crear la aplicación de Access y pasar su AUD
    4. comprobar que la Revisora Fiscal entra de verdad
    5. ENTONCES los dos secretos

Mientras tanto la pantalla `/firma` funciona y dice, con todas las letras, que la
firma no está configurada.

---

## 1 · Crear la aplicación

**dash.cloudflare.com → Zero Trust → Access → Applications → Add an application
→ Self-hosted.**

| Campo | Valor |
|---|---|
| Application name | `Firma de certificados Give&Grow` |
| Session duration | 24 horas, como el panel |
| Domain | `www.thegiveandgrowproject.org` |
| Path | `firma` |

Y dos rutas más, igual que hace el panel con las suyas:

- `firma.js`
- `api/firma`

> Sin `api/firma`, la página cargaría pero su cola y su botón de firmar
> quedarían sin la protección de Access. El Worker los rechazaría igual —verifica
> el token en cada endpoint— pero es mejor que Access también los cubra.

---

## 2 · La política

**Add a policy** → Action **Allow** → Include **Emails** → los dos correos: el
del Representante Legal y el de la Revisora Fiscal.

No hace falta nadie más. Quien no esté en la lista no llega ni al Worker.

---

## 3 · ⚠️ EL MÉTODO DE ACCESO — esto es lo que costó una jornada la última vez

Crear la aplicación y meter el correo **no basta**. Falta decidir CÓMO se
autentica esa persona.

Desde el **18 de junio de 2026** las organizaciones nuevas de Zero Trust nacen con
el proveedor de identidad **de Cloudflare** como único método, y el **PIN de un
solo uso ya NO se añade automáticamente**. Esta cuenta se creó después de ese
cambio.

Con «Cloudflare» como único método, **la Revisora Fiscal tendría que crearse una
cuenta de Cloudflare** para poder firmar. Eso es exactamente lo que pasó el 20 de
agosto de 2026 con la primera ingeniera voluntaria del triaje: correo correcto en
la política correcta, y aun así Cloudflare le pedía cuenta y contraseña.

**Habilitar el código por correo:**

**Zero Trust → Integrations → Identity providers → Add new identity provider →
One-time PIN.** No pide configuración.

`Integrations` es un menú distinto de `Access controls`.

Después, que ESTA aplicación lo acepte: en su sección **Authentication**, o marcar
**«Accept all available identity providers»**, o seleccionar el PIN además de
Cloudflare.

**Compruébalo antes de seguir**, y no desde tu sesión: pídele a ella que abra
`www.thegiveandgrowproject.org/firma` y confirme que le llega un código a su
correo y que ve la cola. Si no, los pasos que siguen la dejan fuera.

---

## 4 · Copiar el AUD

En la aplicación creada → **Overview** → **Application Audience (AUD) Tag**. Una
cadena hexadecimal larga.

Va en `wrangler.toml` junto a los otros dos, como `ACCESS_AUD_FIRMA`. **No es
secreto**: identifica la aplicación, no autoriza nada por sí solo — por eso los
otros dos AUD ya están versionados ahí.

---

## 5 · Los dos correos, que SÍ son secretos

```bash
cd ~/Documents/GitHub/givegrow-website
npx wrangler secret put FIRMA_RL_EMAIL
npx wrangler secret put FIRMA_RF_EMAIL
```

**El valor es el correo, escrito tal cual.** No hay nada que generar: wrangler
dice «Enter a secret value» porque es el mismo comando para todo, pero aquí lo
que espera es una dirección de correo y ya.

**Tiene que ser EXACTAMENTE el correo con el que esa persona entra a Access.** El
Worker compara este valor contra el `email` que Access pone dentro del token
firmado; si la Revisora Fiscal entra con un correo y aquí hay otro, la pantalla
le va a decir que no es firmante y no va a haber ninguna pista de por qué.

Son secretos y no variables porque son datos de contacto de personas reales y
**este repositorio es público** — la misma razón por la que `PAYPAL_IPN_CORREO`
tampoco está en `wrangler.toml`.

---

## Quién puede firmar qué

La audiencia decide **quién entra**; el correo decide **quién firma**. Son dos
cosas distintas a propósito.

- La audiencia del panel (`ACCESS_AUD`) también abre `/firma`, para que el equipo
  pueda ver la cola sin una segunda cuenta.
- Pero **mirar no es firmar**: el botón solo aparece para quien coincide con
  `FIRMA_RL_EMAIL` o `FIRMA_RF_EMAIL`, y el servidor lo vuelve a comprobar. Quien
  entre sin ser ninguno de los dos ve la cola y nada más.

---

## Cómo saber que está encendido

Abre `/firma`. Si arriba aparece un aviso que dice que la firma no está
configurada, faltan los secretos. Si no aparece, está encendido.

Y para comprobarlo de punta a punta: emite un certificado desde `/admin` pidiendo
enviarlo. Debe contestar que queda esperando firma y **no** mandarlo. El PDF
descargado debe salir con el sello diagonal **«SIN FIRMAR»**.
