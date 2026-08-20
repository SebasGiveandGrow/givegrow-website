# Panel `/admin` — configuración de Cloudflare Access

El panel muestra **datos personales de donantes** (nombre, correo, y a futuro
documento). Por eso no lleva autenticación propia: la protege **Cloudflare
Access**, que es gratis hasta 50 usuarios.

> ⚠️ **Corregido el 20 ago 2026.** Aquí decía «da inicio de sesión con la cuenta
> de Google Workspace de la fundación». **No hay ningún proveedor de Google
> configurado en esta cuenta** — comprobado ese día abriendo la pantalla de login
> real, que ofrecía un solo botón: «Cloudflare». Ver la sección de métodos de
> acceso más abajo.

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

## ⚠️ LOS MÉTODOS DE ACCESO: lo que costó una jornada de piloto

Crear la aplicación y meter un correo en su política **no basta**. Falta decidir
CÓMO se autentica esa persona, y el valor por defecto cambió.

**Lo que pasó el 20 de agosto de 2026.** Se le dio acceso al triaje a la primera
ingeniera voluntaria, con su correo en la política correcta, y aun así no podía
entrar: Cloudflare le pedía **cuenta y contraseña**. La causa no era la política
ni la URL. Era que la aplicación ofrecía **un solo método de acceso:
«Cloudflare»** — es decir, iniciar sesión con una cuenta de Cloudflare, que ella
no tenía ni tiene por qué tener.

**La razón, de la documentación de Cloudflare:** desde el **18 de junio de 2026**
las organizaciones nuevas de Zero Trust nacen con el **proveedor de identidad de
Cloudflare** como método por defecto, y **el PIN de un solo uso ya NO se añade
automáticamente**. Esta cuenta se creó después de ese cambio.

### Habilitar el código por correo

**Zero Trust → Integrations → Identity providers → Add new identity provider →
One-time PIN.** No pide configuración.

`Integrations` es un menú distinto de `Access controls`. Esta ruta sale de la
documentación de Cloudflare, no de memoria — y conviene tratarla como lo que es:
la interfaz de un tercero, que puede volver a cambiar.

Después, que la aplicación lo acepte: en su sección **Authentication**, o marcar
**«Accept all available identity providers»**, o seleccionar el PIN además de
Cloudflare.

### Por qué el PIN importa para este proyecto y no es un detalle

Con «Cloudflare» como único método, **cada ingeniero voluntario tendría que
crearse una cuenta de Cloudflare** para poder evaluar. Con cien voluntarios eso
es fricción que abandona sola, y el proyecto ya decidió que los ingenieros pueden
tener correo de cualquier tipo —universidad, empresa o particular—, así que
tampoco hay regla por dominio que los agrupe. El código por correo es lo único
que escala sin pedirle una cuenta a nadie.

Si alguien usa un correo con filtro corporativo, hay que permitir
`noreply@notify.cloudflare.com` en su lista blanca.

### Cómo comprobar qué métodos ofrece una aplicación

**Sin depender de ninguna ruta de la interfaz, que es lo que falla.** Se pide la
ruta protegida, se sigue el `location` a la pantalla de Access y se mira qué
botones ofrece bajo «Sign in with:».

```bash
curl -s -D- -o /dev/null https://thegiveandgrowproject.org/triaje \
  | grep -i '^location'
```

Ese `location` lleva a `<equipo>.cloudflareaccess.com/cdn-cgi/access/login/…` y
su `kid` es el AUD de la aplicación — sirve además para confirmar que la ruta la
protege la aplicación que crees. **Ábrelo en un navegador y cuenta los botones.**
La página los pinta con JavaScript, así que `curl` no los ve: no hay atajo de
línea de comandos, y buscarlo fue perder el tiempo.

Con un solo botón «Cloudflare», nadie sin cuenta de Cloudflare va a entrar.

---

## Las dos aplicaciones, y una trampa de las políticas

    Panel Give&Grow      → /admin      · donantes, aportes, comprobantes
    Triage estructural   → /triaje     · casos de vivienda y fotos

**Las políticas de Access son reutilizables y se comparten entre aplicaciones.**
El 20 de agosto se añadió el correo de la ingeniera a una política llamada
«Emails Sebas@» que estaba pegada **a las dos**, así que por un rato tuvo acceso
al panel de los donantes y del dinero. Se resolvió con una política propia
—«Emails Triaje ING»— usada por una sola aplicación.

**La regla:** antes de añadir a alguien, mirar en la política cuántas
aplicaciones la usan (`Used by applications`). Si dice más de una, no es la
política que buscas: hay que crear una nueva para esa aplicación.

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
