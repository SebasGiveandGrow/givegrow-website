# Panel `/admin` — configuración de Cloudflare Access

El panel muestra **datos personales de donantes** (nombre, correo, y a futuro
documento). Por eso no lleva autenticación propia: la protege **Cloudflare
Access**, que es gratis hasta 50 usuarios y da inicio de sesión con la cuenta de
Google Workspace de la fundación.

**Está fail-closed:** mientras no se configure, `/admin` responde 503 y no sirve
un solo dato. No hay ventana en la que el panel quede abierto.

---

## Por qué no basta con "comprobar que la cabecera exista"

Access inyecta la cabecera `Cf-Access-Jwt-Assertion` en las peticiones que
autoriza. La tentación es comprobar solo que esté presente — y sería un agujero:
si Access no estuviera delante del Worker, **cualquiera podría mandar esa
cabecera a mano** y entrar.

El Worker verifica de verdad:

1. Descarga las llaves públicas del equipo (`/cdn-cgi/access/certs`, en caché 1 h).
2. Verifica la **firma RS256** del token con la llave del `kid` correspondiente.
3. Comprueba que el **`aud`** sea el de esta aplicación — sin esto, un token
   válido de *otra* aplicación de Access del mismo equipo serviría para entrar.
4. Comprueba el emisor y la expiración.

---

## Pasos (todos en el panel de Cloudflare)

### 1 · Entrar a Zero Trust
`dash.cloudflare.com` → **Zero Trust**. Si es la primera vez, pide elegir un
nombre de equipo: queda como `<equipo>.cloudflareaccess.com`. Anótalo.
El plan **Free** cubre hasta 50 usuarios; no hace falta pagar nada.

### 2 · Crear la aplicación
**Access → Applications → Add an application → Self-hosted.**

| Campo | Valor |
|---|---|
| Application name | `Panel Give&Grow` |
| Session duration | 24 horas está bien |
| Domain | `www.thegiveandgrowproject.org` |
| Path | `admin` |

Añade una segunda ruta para el JS del panel y para su API:

- `admin.js`
- `api/admin`

> Si Access solo protege `admin` y no `api/admin`, la página cargaría pero sus
> datos quedarían sin proteger. El Worker los rechazaría igual —verifica el token
> en cada endpoint— pero es mejor que Access también los cubra.

### 3 · Política de acceso
**Add a policy** → Action: **Allow** → Include: **Emails** → `sebas@thegiveandgrowproject.org`
(y cualquier otro correo que deba entrar).

Con eso, quien no esté en la lista no llega ni al Worker.

### 4 · Copiar el AUD
En la aplicación creada → **Overview** → **Application Audience (AUD) Tag**.
Es una cadena hexadecimal larga. No es secreta, pero sí específica de esta
aplicación.

### 5 · Configurar las dos variables
Se las paso yo a `wrangler.toml`, o las pones tú desde
Cloudflare → Workers → `givegrow-website` → Settings → Variables:

```
ACCESS_TEAM_DOMAIN = <equipo>.cloudflareaccess.com
ACCESS_AUD         = <el AUD tag>
```

No son secretos: identifican la aplicación, no autorizan nada por sí solos.

---

## Cómo saber que quedó bien

| Comprobación | Esperado |
|---|---|
| Abrir `/admin` sin sesión | Access pide iniciar sesión con Google |
| Abrir `/admin` con la sesión de Sebas | el panel carga y dice «Sesión de sebas@…» |
| `curl https://www.thegiveandgrowproject.org/api/admin/aportes` | **403** `no_autorizado` |
| `curl` con una cabecera `Cf-Access-Jwt-Assertion: falsa` | **403** `firma_invalida` |

Esa última es la importante: es la que demuestra que la cabecera no se puede
falsificar.

---

## Qué hace el panel

- **Resumen**: aportes por estado con su monto, certificados por emitir,
  cuántos esperan débito automático, e inscripciones por revisar.
- **Tabla** de aportes con guía, estado, monto, destino, donante, si pidió
  certificado y fecha.
- **Dos acciones**: marcar *a distribución* y marcar *entregada*.

**Lo que el panel NO puede hacer, a propósito:** mover estados de pago. Eso lo
hace únicamente el webhook de Wompi. Si el panel pudiera marcar un aporte como
"aprobada" a mano, la trazabilidad dejaría de significar algo — y es justo lo que
el sitio le promete al donante.

Cada cambio manual deja rastro de quién lo hizo, en la tabla `consentimientos`
con tipo `auditoria`. Hoy el panel es de una sola persona; el día que sean dos,
«quién marcó esta entrega» es la primera pregunta.
