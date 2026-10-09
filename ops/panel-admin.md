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

## Dar acceso a un ingeniero SIN tocar el dashboard (desde el 29 ago 2026)

**Marcar «verificada» en `/admin` es el acto completo.** No hay que añadir su
correo a ninguna política: la política del triaje tiene una regla de **External
Evaluation** que le pregunta al sitio, y el sitio responde desde la base.

    la persona se postula  →  entra sola a `inscripciones`
    alguien comprueba su matrícula en el COPNIA
    marca «verificada» en /admin  →  YA PUEDE ENTRAR

**La regla exacta**, por si hay que auditarla: entra si su `matricula_verificada`
es 1 **y** su postulación no está `archivada` ni `rechazada`. Lo segundo importa:
**archivar a alguien le quita la entrada** sin que haya que acordarse de
desmarcar también el interruptor.

⚠️ **`estado` y `matricula_verificada` NO son lo mismo.** `estado` es el paso en
la bandeja (`nueva` → `en_revision` → `aceptada` → `archivada`) y **no abre nada**.
Quien mire `estado` para saber si alguien tiene acceso se va a equivocar: ya pasó.

### Cómo está montado, y qué NO hay que deshacer

| pieza | dónde |
|---|---|
| la clave privada | secreto `ACCESS_EVAL_JWK` del Worker (un JWK en JSON) |
| la pública | **se deriva** de la privada; no se guarda aparte |
| lo que Access llama | `https://thegiveandgrowproject.org/api/access/evaluar` |
| las claves | `https://thegiveandgrowproject.org/api/access/claves` |
| la política | **«Emails Triaje ING»**, con DOS Include |

1. **Las dos rutas son públicas a la fuerza.** Las llama Cloudflare, no un
   navegador con sesión. Detrás de Access serían un bloqueo mutuo.
2. **El Include de correos a mano SE QUEDA.** Los Include se combinan con OR. La
   documentación de Cloudflare no dice qué pasa si nuestro endpoint se cae, y su
   código de referencia responde 403 ante cualquier error — que la regla lee como
   «no pasa». Si lo nuestro falla, quien ya entraba sigue entrando.
3. **La clave vive en un secreto y no en KV**, al revés que el ejemplo de
   Cloudflare, que la genera al vuelo. Así ningún endpoint puede acuñar una clave
   nueva y dejar de coincidir con la que Access ya conoce.

### Si hay que rehacer la clave

Un solo comando desde el repo; la clave privada no toca el disco:

    node -e 'crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]).then(k=>crypto.subtle.exportKey("jwk",k.privateKey)).then(j=>process.stdout.write(JSON.stringify(j)))' | npx wrangler secret put ACCESS_EVAL_JWK

Y se comprueba que la pública ya se sirve — y que **no lleva la parte privada**:

    curl -s https://thegiveandgrowproject.org/api/access/claves

Debe devolver un JWKS con un solo `kid` y los campos `kty, n, e, alg, use`. Si
aparece una `d`, hay una fuga y hay que rehacer la clave.

### Comprobarlo sin molestar a nadie

Un token que no es de Access debe recibir una negativa **firmada**:

    curl -s -X POST -H "content-type: application/json" \
      -d '{"token":"basura"}' \
      https://thegiveandgrowproject.org/api/access/evaluar

Devuelve `{"token":"..."}` cuyo contenido es `success:false`. Que responda con un
token y no con un error es la señal de que la clave está cargada.

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

> Reescrita el 8 oct 2026 con la Fase 1 del panel (barra lateral, «Hoy» como
> bandeja de entrada, cajón lateral y vista previa de correos). La versión
> anterior describía siete pestañas que ya no existen.

**El armazón.** Una barra lateral fija, agrupada por área, y una barra superior
delgada con el buscador y la sesión. Se ve **una sección a la vez**, con su
cabecera —área, título, una línea de para qué sirve, lo que espera en ella y su
acción principal— y su propia dirección, que se puede guardar y que respeta el
botón de atrás. En el teléfono la barra lateral se abre con «Menú».

| área | entrada (dirección) | qué hay dentro |
|---|---|---|
| Inicio | Hoy (`#hoy`) | La bandeja de entrada: todas las colas, en tres franjas |
| Finanzas | Resumen (`#finanzas/resumen`) | El mes o el año: ingresos confirmados por medio, destino y tipo; egresos por categoría y centro; neto; donantes, membresías y certificados; mes a mes |
| | Banco (`#finanzas/banco`) | El extracto de Bancolombia importado: movimientos e importaciones · «Importar un extracto» |
| | Conciliar (`#finanzas/conciliar`) | Cada movimiento del extracto con lo que lo explica, con sugerencias |
| | Aportes (`#finanzas/aportes`) | Cifras de los aportes, franja de certificados y la lista |
| | Transferencias (`#finanzas/transferencias`) | Lo reportado por transferencia, para confirmar contra el extracto |
| | Pagos sin aporte (`#finanzas/pagos`) | Cobros de Wompi sin guía y pagos sin guía registrados desde el extracto |
| | Membresías y carnets (`#finanzas/membresias`) | Membresías de PayPal · carnets (también los de honor) · «Emitir carnet de honor» |
| | Vencimientos (`#finanzas/vencimientos`) | Obligaciones tributarias y legales |
| | Egresos (`#finanzas/egresos`) | Registrar egresos, soportes y la descarga para el contador |
| | Proveedores (`#finanzas/proveedores`) | A quién se le paga |
| | PayPal (`#finanzas/paypal`) | Donaciones del botón · avisos de PayPal sin registro |
| Alianzas | Red (`#alianzas/red`) | Quién quiere entrar: fundaciones, empresas, voluntarios, padrinos |
| | Ofrecimientos en especie (`#alianzas/ofrecimientos`) | Lo que llega por el formulario de la brigada |
| | Social Fest (`#alianzas/socialfest`) | La misma bandeja de Red, filtrada por lo que llegó del evento |
| Personas | Voluntariado (`#personas/voluntariado`) | Jornadas, de la convocatoria al cierre |
| | Ingenieros (`#personas/ingenieros`) | La bandeja de Red filtrada a ingenieros y su matrícula |
| Mira Mi Casa | Casas (`#mmc/casas`) · Inspecciones (`#mmc/inspecciones`) | Casos de vivienda · visitas en terreno y el respaldo de un teléfono |
| Entregas | Actas de entrega (`#entregas`) | Registrar, subir fotos, publicar |
| Sistema | Salud (`#sistema/salud`) | Embudo, señales de Wompi y del correo, operación del cron |

Las direcciones viejas (`#dinero`, `#conta/sec-vencimientos`, `#sec-aportes`…)
siguen abriendo su sección: las llevan correos ya enviados.

**«Hoy».** Las colas salen de `/api/admin/salud?items=1`. Cada una trae su
conteo, desde cuándo espera la más vieja, cómo se arregla, su **franja**
(`bandaDeCola`: Urgente, Hoy o Esta semana) y sus **cinco filas más viejas**,
que salen de la misma consulta que el número (`itemsDeCola` + `ITEMS_COLA`).
Dentro de cada franja manda el **peso** de la cola y después la fecha: ya no
sube primero todo lo vencido pesara lo que pesara. Donde el panel ya sabe
hacerlo, la acción está en la fila: confirmar una transferencia, emitir un
certificado, abrir un caso, «Ya la atendimos», marcar un vencimiento. Las
insignias de la barra lateral salen de esa misma respuesta (`COLA_MOD` dice de
qué sección es cada cola). El resumen diario por correo sigue igual: llama a
`adminSalud` sin filas.

**Un solo número.** «Certificados por emitir» sale de `CERT_POR_EMITIR` en
`worker.js`, que usan «Hoy», la franja de Aportes y el resumen. Antes eran tres
consultas y tres cifras.

**El cajón y los avisos.** Detalle y formularios se abren en un cajón lateral,
no en `window.prompt`. Al terminar sale un aviso «Hecho», con «Deshacer» solo
donde existe la acción contraria (vencimientos, «Ya la atendimos», cerrar o
descartar un caso, archivar y reabrir).

**Antes de un correo, el correo.** Toda acción que le escribe a alguien de
fuera pregunta primero a `/api/admin/previa`, que arma los correos con **las
mismas plantillas** sin enviarlos ni anotarlos, y el cajón enseña a quién, con
qué asunto y qué dice. Cubre: mover una fundación (Aceptar, Visita hecha,
Iniciar convenio, Marcar vinculada), confirmar una transferencia (el recibo),
emitir y enviar un certificado, firmarlo cuando con esa firma sale, verificar
una matrícula y reenviar su aviso, reenviar el enlace del convenio, cerrar o
descartar un caso y, desde la Fase 2, conciliar con Wompi, emitir un carnet de
honor, subir el texto del convenio, el agradecimiento de una jornada y sus
encuestas. Si la vista previa falla, no se confirma.

**Fase 2 (oct 2026): Finanzas completa.**

- **Una sola tabla para todo Finanzas** (`tablaArmar` en `adminJS`): buscador,
  filtros, columnas que ordenan, páginas de 25/50/100, cabecera fija, fila de
  totales, un vacío dicho con palabras, y la fila abre el cajón con el detalle
  entero. **Aportes filtra, ordena y pagina en el servidor** (es la única que
  crece sin techo: cada intento de pago es una fila) y sus totales son del filtro
  entero; las demás llegan enteras y se filtran en el navegador (egresos y
  proveedores hasta `TOPE_LIBRO` = 2000 filas; las bandejas, `TOPE_BANDEJA`, y la
  tabla avisa si se cortó).
- **Las tres reglas viven en una expresión SQL cada una**, en `worker.js`, y las
  usan la lista, sus totales, el CSV y el Resumen: `MEDIO_APORTE` (Wompi tarjeta,
  Wompi transferencia Bancolombia, Wompi otro, PayPal, transferencia directa),
  `TIPO_APORTE` (único; mensual o anual; membresía = atada a una suscripción con
  cobro automático) y `FECHA_APORTE` (la fecha del dinero en día colombiano: la
  del extracto, si no la de la aprobación, si no la de apertura). Los nombres de
  persona salen de `ETIQ_FINANZAS`.
- **Solo se suma lo confirmado** (`APORTE_CONFIRMADO`). Un intento sin pagar o
  una transferencia reportada se cuentan, nunca se suman. **Pesos y dólares van
  por separado y no se convierten**: hasta esta fase la cifra de «pagados» sumaba
  los centavos de dólar de PayPal como si fueran pesos.
- **Resumen** (`GET /api/admin/finanzas?anio=&mes=`, `mes=0` = el año): cada cifra
  dice de dónde sale. Lo que entró sin guía (pagos de Wompi sin aporte, el botón
  de PayPal) y las transferencias sin verificar se dicen aparte, no se mezclan.
  Son **cifras operativas, no estados financieros**, y la pantalla lo dice.
- **CSV de aportes** (`GET /api/admin/aportes.csv`) con los mismos filtros de la
  tabla, en el mismo formato que el de egresos (punto y coma, BOM, fórmulas
  neutralizadas). La columna «Confirmado» separa el dinero de lo que no lo es.
- **Formularios en el cajón**: «Registrar un egreso» y «Emitir carnet de honor»
  viven ocultos en `#pn-formas` y `cajonForma` los mueve al cajón (conservan sus
  ids); al cerrar vuelven.
- **Ya no queda ningún `prompt`/`confirm`/`alert` en el panel.** Lo reversible se
  confirma con `confirmarSimple`, lo que pide un texto con `pedirTexto`, lo que
  destruye con `confirmarPeligro`; copiar un enlace que el navegador no deja
  copiar lo enseña seleccionado en el cajón. La ficha del convenio en línea pasó
  de una ventana aparte al cajón ancho.
- **Cinco vistas previas más** en `/api/admin/previa`: `conciliar` (el recibo y
  el aviso interno que salen si Wompi confirma), `honor`, `convenio-texto` (solo
  la primera subida avisa), `reconocer` (agradecimiento y certificado de
  voluntariado) y `encuesta` (empresa o fundación). El correo de la encuesta salió
  a `correoEncuestaActor` para que la vista previa use la misma plantilla.

**Lo que destruye va en rojo.** Suprimir, Anular (certificado, acta, egreso),
Descartar una transferencia, quitar una foto o una distinción: botón rojo y un
cajón que dice qué se destruye y pide el motivo cuando el servidor lo exige.

Las bandejas se cargan al abrir su sección, nunca todas de golpe.

**Lo que el panel NO puede hacer, a propósito:** mover estados de pago. Los
únicos que admite a mano son `en_distribucion` y `entregada` —está escrito en
`ESTADOS_MANUALES`, comprobado el 14 sep 2026—. Marcar un aporte como `aprobada`
solo lo hace el webhook de la pasarela. Si el panel pudiera hacerlo, la
trazabilidad dejaría de significar algo, que es justo lo que el sitio le promete
al donante.

Cada cambio manual deja rastro de quién lo hizo, en la tabla `consentimientos`
con tipo `auditoria`. Hoy el panel es de una sola persona; el día que sean dos,
«quién marcó esta entrega» es la primera pregunta.

## Conciliar con el banco (Fase 3, oct 2026)

**Decisión del fundador (8 oct 2026): el extracto de Bancolombia es la cifra
que manda.** Lo que dicen Wompi, PayPal o el donante se compara con él, no al
revés. Para eso hay dos entradas nuevas en Finanzas, debajo de Resumen:
**Banco** (`#finanzas/banco`) y **Conciliar** (`#finanzas/conciliar`). Las
tablas viven en `migrations/0042_conciliacion_bancaria.sql`.

### 1 · Descargar el extracto de Bancolombia

> **Verifica estos pasos en tu Sucursal Virtual: el menú exacto puede ser
> distinto.** Están escritos de memoria de cómo suele verse, no copiados de la
> pantalla, y la interfaz de un banco cambia sin avisar.

1. Entra a la **Sucursal Virtual Empresas** (o Personas, según la cuenta) de
   Bancolombia.
2. Busca la cuenta de ahorros de la Fundación → **Movimientos** (a veces
   «Consultas → Movimientos de cuenta» o «Extractos»).
3. Elige el **periodo**: el mes entero (del 1 al último día).
4. **Descargar / Exportar** en **CSV** o «Texto». Si solo ofrece «Excel», sirve
   también: casi siempre es una tabla HTML con extensión `.xls`, y el panel la
   lee. Un `.xlsx` de verdad no: ábrelo en Excel y usa *Guardar como → CSV UTF-8*.
5. No edites el archivo antes de importarlo (Excel cambia fechas y números al
   guardarlo). Si tuviste que abrirlo, guárdalo como CSV.

### 2 · Importar

*Banco → Importar un extracto.* Pon un **nombre** para la cuenta («Bancolombia
ahorros»), **nunca su número**: el panel rechaza un nombre con seis dígitos
seguidos. Elige el archivo. Nada se guarda todavía:

- El panel detecta el separador (punto y coma, coma, tabulador o tabla HTML) y
  la codificación (UTF-8 o Latin-1), salta las líneas de encabezado del banco y
  **propone qué columna es qué** por sus títulos. Revísalas: fecha, descripción,
  referencia, oficina (opcional), el valor —una columna con signo, o débito y
  crédito por separado— y el saldo (opcional). Formato de fecha día/mes/año o
  mes/día/año; «Invertir el signo» si los cargos vienen positivos.
- Entiende los números como los escribe un banco colombiano: `1.234.567,89`,
  `-50.000`, `$ 1,234,567.89`, `(12.500)`, `50000.00`. Fechas `dd/mm/aaaa`,
  `aaaa-mm-dd` y `aaaammdd`.
- Enseña **«N nuevos · M ya estaban · K con error»**, los primeros renglones
  como van a quedar, los que tienen error (no se guardan) y si **el saldo
  cuadra renglón a renglón** con el valor. Si no cuadra, casi siempre es el
  signo al revés o débito y crédito cruzados: se arregla aquí, antes de guardar.
- Pide el **periodo que cubre el extracto** (propone el mes). Con él el Resumen
  sabe qué meses puede comparar con el banco, y se apaga el recordatorio.
- **Recuerda la elección por cuenta**: el mes siguiente, el mismo formato entra
  con las columnas ya puestas.

**Volver a importar no duplica.** Cada movimiento tiene una huella (cuenta,
fecha, valor, descripción normalizada, referencia, saldo y cuántas veces se
repite ese mismo renglón ese día). Un archivo que se solapa con el anterior
solo agrega lo nuevo. **Deshacer una importación** (columnas cruzadas, la cuenta
equivocada): desde su fila en «Importaciones», mientras nada de ella se haya
conciliado; si ya, primero se deshacen esas conciliaciones.

### 3 · Conciliar

*Conciliar* enseña los movimientos sin explicar, del más viejo al más nuevo,
con lo que **sugiere el servidor**:

| movimiento | se explica con | regla |
|---|---|---|
| abono | una transferencia directa confirmada | el mismo monto al peso, a ±3 días; suma si el nombre o la referencia aparecen en la descripción |
| abono | una transferencia **reportada** sin verificar | igual; aceptar abre «Confirmar transferencia» con el movimiento ya elegido y el recibo a la vista |
| abono | un **lote de Wompi** | los pagos aprobados de uno o varios días seguidos antes del abono; la diferencia es la comisión, y gana el grupo cuya comisión más se parece a la tarifa publicada (2,65 % + $700, más IVA) |
| abono que dice PAYPAL | los pagos de PayPal (en dólares) desde el último retiro | el banco da los pesos: esa cifra se reparte entre los pagos por sus dólares y es la cifra de PayPal en pesos, sin TRM inventada |
| cargo | un **egreso** | lo que salió de la cuenta (el neto, o el total si el banco pagó sin retenciones), a ±5 días; los cargos se reparten de una vez, por puntos |
| abono o cargo | **dejar fuera** | 4 por mil, cuota de manejo e IVA, rendimientos, traslados entre cuentas propias |

«Aceptar» guarda enseguida y sale un aviso con **Deshacer**. Abrir un
movimiento deja además:

- **Conciliar a mano:** buscar aportes, pagos sin aporte, donaciones del botón
  de PayPal o egresos, elegir varios, ver la diferencia que queda y asignarla a
  **Comisión de la pasarela** o **Ajuste** (con nota). Lo elegido más la
  diferencia tiene que ser exactamente el valor del movimiento, o no se guarda.
- **Dejarlo fuera** con su motivo (con «Otro motivo», la nota es obligatoria).
- **Registrar como pago sin guía** (solo abonos): un dinero que nadie reportó.
  Queda en «Pagos sin aporte» con quien pagó si se sabe, por dónde entró y su
  destino. **No crea un aporte, no envía ningún correo y no emite
  certificado.** Si quien pagó aparece y lo pide, eso sigue siendo a mano.
- **Deshacer**, desde el movimiento: vuelve a «sin conciliar» y, si de él salió
  un pago sin guía, ese registro se anula.

**Confirmar una transferencia** (Transferencias o «Hoy») busca en el extracto
importado un abono sin conciliar por el mismo monto a ±7 días. Si lo hay, «Usar
este» llena la fecha, el monto y la referencia con lo del extracto y lo deja
conciliado al confirmar. Si no, dice **«Aún no aparece en el extracto
importado»** y hasta dónde llega lo importado: no bloquea, porque el extracto
puede no estar importado todavía.

### 4 · Lo que se ve en el Resumen y en «Hoy»

**Resumen** añade, para el mes o el año, **«Según el banco»** (abonos, cargos y
saldo final del extracto) junto a **«Según el panel»** (aportes confirmados en
pesos y egresos netos), y desarma la diferencia: sin conciliar, dejados fuera,
comisiones, ajustes, lo que entró sin guía, PayPal en pesos y «otras
diferencias» (fechas de corte: un pago del 30 que Wompi consigna el 1). Si no
hay extracto importado para el periodo, lo dice en vez de enseñar ceros.

**«Hoy»** tiene dos colas nuevas: **Movimientos del banco sin conciliar**
(franja Hoy; plazo de 7 días desde que se importaron; cada fila con su
«Conciliar…») e **Importar el extracto del mes** (Esta semana, del día 3 de
cada mes hasta que haya un extracto que cubra el mes anterior; desde el 15 pasa
a Urgente). Vencidas, las dos van en un correo diario propio a
`CORREO_AVISOS` (contabilidad), no al de alianzas: `COLAS_PLAZO_BANCO`.

## Cerrar una señal de terreno (desde el 31 ago 2026)

Cuando un ingeniero vuelve de una casa puede dejar tres señales que **no
esperan**: «requiere revisión especializada», la recomendación `x4` («URGENTE: el
peligro parece inminente») y la `e1` («Evacuar la vivienda»). Antes esas banderas
se ponían en 1 y **nada las bajaba**: no había cola que las contara ni forma de
registrar que alguien se había hecho cargo.

Ahora salen en dos sitios:

- **«Salud del ecosistema» → `terreno_sin_atender`.** Es la cola con la
  prioridad más alta de todas, porque es la única donde del otro lado hay alguien
  que ya fue, ya vio, y dijo que corre.
- **«Inspecciones en terreno».** La fila trae el botón **«Ya la atendimos»**.

### Cómo se cierra

1. Pulsa «Ya la atendimos» en la fila.
2. **Escribe qué se hizo.** No es opcional, ni en la pantalla ni en el servidor.
   «Atendido» a secas no sirve: dentro de un mes la pregunta va a ser qué pasó
   con esa casa, no si alguien pulsó un botón.
3. La fila queda con la fecha, tu correo y la nota, y la cola baja.

Si te equivocaste, **«Reabrir»** la devuelve a la cola. Las dos cosas —cerrar y
reabrir— quedan en la auditoría con quién las hizo.

### Lo que esto NO hace, y es a propósito

**No toca el concepto del ingeniero.** `requiere_esp` y las recomendaciones se
quedan exactamente como las dejó quien estuvo en la casa, igual que el PDF
congelado. Marcar «atendida» dice *«el equipo ya respondió a esta señal»*, nunca
*«la señal era falsa»*. Por eso son columnas aparte (`atendida_en`,
`atendida_por`, `atendida_nota`) y no un `UPDATE` sobre las del ingeniero.

Y **no declara nada sobre la casa.** Declarar si una vivienda es habitable le
corresponde a la autoridad municipal, no a nosotros — cerrar la fila en el panel
no es un dictamen.

### Si la cola dice 0 y crees que no debería

La regla vive en **un solo sitio** del código, la constante `TERRENO_URGE` de
`worker.js`, y la bandeja del panel usa esa misma regla vía el campo `urge` que
manda la API. Si alguna vez el contador y la lista no coinciden, es que alguien
duplicó la regla: se arregla volviendo a la constante, no añadiendo una segunda
copia.

Ojo con una diferencia real: la insignia **«PELIGRO INMINENTE»** de la fila es
`x4` y solo `x4`. La cola cuenta las tres señales. No es una incoherencia — son
dos preguntas distintas, y las dos hacen falta.
