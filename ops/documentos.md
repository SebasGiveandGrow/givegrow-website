# Recibo, certificado y actas de entrega

Fase 5 del ecosistema digital. Dos documentos en PDF que se arman en el Worker
(`documentos.js`), no en el navegador: llevan nombre, cédula y domicilio del
donante, y esos datos no salen de la base privada.

## La línea que divide los dos

|  | Recibo | Certificado |
|---|---|---|
| Quién lo emite | el sistema, al confirmarse el pago | **una persona**, desde `/admin` |
| Qué afirma | qué llegó, cuándo, con qué guía | declaración **bajo la gravedad de juramento** |
| Quién firma | nadie | Representante Legal **y** Revisora Fiscal |
| Cómo llega | enlace en el correo de confirmación | adjunto, en su propio correo |
| Numeración | usa la guía `GG-YYYY-NNNNNN` | serie propia `CD-YYYY-NNNNNN` |

El recibo puede ser automático justamente porque **no afirma nada tributario**, y
lo dice en su propio cuerpo: «no es el certificado de donación para efectos
tributarios». El certificado no puede serlo nunca: automatizar su emisión sería
automatizar el juramento de otra persona.

Base legal del certificado: arts. 125-1, 125-2, 125-3, 257, 258, 364-3 y 771-2
del Estatuto Tributario, y num. 2 del art. 1.2.1.4.3 del Decreto 1625 de 2016.
El texto lo suministró la contadora de la Fundación. **No se edita sin ella.**

## Recibo

`GET /api/recibo/GG-YYYY-NNNNNN.pdf?t=<token>`

- El `token` es obligatorio: 128 bits por aporte, creados en `/api/checkout`. La
  guía es consecutiva y por lo tanto adivinable, y el recibo lleva el nombre del
  donante y su dedicatoria — sin token, contar de `GG-2026-000001` en adelante
  sería una cosecha de datos personales.
- Token equivocado y guía inexistente devuelven **el mismo 403**, para que el
  endpoint no sirva de oráculo de qué guías existen.
- Solo para aportes `aprobada`, `en_distribucion` o `entregada`. Una intención
  sin pagar no tiene nada que recibir (409).
- No se archiva: se reconstruye desde la base cuando se pide. Un PDF guardado es
  un dato personal más que custodiar sin necesidad.
- Va como **enlace** y no como adjunto porque lo dispara el webhook de Wompi, que
  debe responder rápido; además el enlace sirve para siempre.

## Certificado

Todo detrás de Cloudflare Access.

```
POST /api/admin/certificado/GG-YYYY-NNNNNN        emitir (cuerpo opcional)
GET  /api/admin/certificado/CD-YYYY-NNNNNN.pdf    descargar
POST /api/admin/certificado/CD-YYYY-NNNNNN/anular {motivo}
```

**La revisión humana es el formulario, no el botón.** Wompi no entrega domicilio
y a veces tampoco documento; el panel abre un formulario con lo que hay, quien
emite lo completa y confirma, y recién ahí se emite. Si falta nombre, documento
o domicilio, el endpoint responde `422 datos_incompletos` con la lista: un
certificado no puede identificar al donante ante la DIAN con campos vacíos. Lo
que se corrija ahí se guarda también en `donantes`.

**El snapshot se congela al emitir.** `certificados.datos` guarda el JSON exacto
del documento. Si mañana el donante corrige su nombre, el PDF que ya está en
manos de la DIAN sigue devolviendo lo mismo al volver a descargarlo.

**Un certificado no se borra: se anula**, con motivo y fecha. El consecutivo
conserva el hueco a propósito — un número que desaparece es peor que un número
anulado. Reexpedir exige anular primero (índice único sobre `guia` donde
`anulado_en IS NULL`).

## Integridad: los tres huecos que cierra la Fase 5.1

**1 · Reversa después de emitir.** El donante paga, recibe el certificado, y
después hace un contracargo. Wompi manda `VOIDED`, el aporte pasa a `rechazada`
— y el certificado seguía vigente respaldando un descuento del 25% sobre plata
devuelta. Ahora un guardián en el camino del webhook marca el certificado
`revision_en`, sella el PDF y avisa a `CORREO_AVISOS`.

El guardián corre **antes** del corte que impide que un aporte `entregada`
retroceda de estado, y esa posición es el punto: el caso más grave —plata
devuelta después de entregar— era justo el que el corte se saltaba.

El sistema **no anula**: anular lleva motivo y es un acto humano. Marca y avisa.
`revision_*` es automático y reversible; `anulado_*` es humano y definitivo. Por
eso no comparten columna.

**2 · Certificado a nombre de otro.** El formulario deja corregir nombre y
documento, y tiene que dejarlo. Pero esa libertad permite donar como persona y
emitir el certificado a nombre de la empresa, para que la empresa tome el
descuento: eso es fraude tributario y desde el formulario se ve igual que un
error de digitación. Ahora se guarda en `wompi_identidad` lo que validó la
pasarela, se registra la `divergencia`, y **se exige motivo** (`422
divergencia_sin_motivo`). No se prohíbe corregir: se deja rastro. Un error de
digitación se explica en una línea.

**3 · Un anulado se descargaba limpio.** El snapshot congela el CONTENIDO, no el
ESTADO. `adminCertificadoPdf` ahora le añade el estado encima al armarlo, y el
PDF sale con sello diagonal y una línea que dice desde cuándo y por qué. El
papel viaja solo: quien lo tenga en la mano debe poder saber que ya no vale.

### Lo que NO cierra ninguna de las dos fases

**La contraprestación.** El numeral 6 declara «acto de mera liberalidad… sin
contraprestación alguna, directa ni indirecta». Pero la membresía Tier 2 ofrece
«Acceso al Programa de Gratitud», que son beneficios reales de comercios
aliados. Si el donante recibe algo a cambio, esa declaración puede ser falsa —
y la firma la Revisora Fiscal bajo juramento. **Esto no lo arregla código.**
Consultar con la contadora antes de emitirle un certificado a cualquier miembro
con beneficios.

## Actas de entrega (Fase 6)

El sitio prometía «publicamos el acta de cada entrega» sin tener dónde
registrarla, y la página de la brigada repite esa promesa. Esto es ese registro.

**El documento legal sigue siendo el acta EN PAPEL** que firma quien recibe
(ítem 98 del inventario: preimpresas, original y copia). Aquí se guarda su
transcripción y su foto. El sitio no reemplaza la firma: la publica.

### Una entrega se asocia a un DESTINO, no a un aporte

Tentador sería decirle a cada donante «tu plata compró estas colchonetas». Sería
falso: el dinero es fungible y una jornada se paga con muchos aportes.
`MEDICION.md` ya fijó la doctrina —contribución, no atribución— y la tabla la
respeta. Quien aportó a `brigada-emergencia-2026-08` ve las entregas de esa
campaña, sin trazabilidad peso a peso inventada.

### Reglas que hace cumplir el código

- **No se publica sin foto.** `422 sin_evidencia`. Una entrega sin una sola
  imagen no es evidencia, es una afirmación — y publicarla rompería justo la
  regla que la campaña anuncia.
- **Registrar y publicar son actos distintos.** En terreno se registra rápido;
  se publica cuando alguien revisó que no salga un dato que no debe.
- **Las fotos solo responden si su entrega está publicada.** La clave en R2 es
  difícil de adivinar, pero eso es oscuridad, no control: al despublicar, las
  imágenes devuelven 404.
- **El nombre del archivo lo pone el servidor.** Un nombre que llega del cliente
  es una ruta que llega del cliente.
- **No se publica con fecha futura** (`422 fecha_futura`). Un acta registra algo
  que ya ocurrió; con fecha de mañana, por definición no lo es. Se comprueba al
  crear Y al publicar, porque publicar es el momento en que el dato se vuelve
  una afirmación pública y hay filas anteriores a esta validación. Un día de
  holgura, para que un acta firmada de noche en Colombia (UTC-5) no se rechace
  por el cambio de día en UTC.
- Tipos aceptados: JPEG, PNG y WebP, hasta 8 MB.

> **Ocurrió de verdad.** En la prueba del panel del 12 ago 2026 se publicó una
> jornada en Manizales fechada dos semanas adelante, y el sitio la mostró como
> real hasta que se despublicó. La validación nació de ahí.

### Privacidad

`recibido_por` guarda **rol y entidad** («coordinadora del albergue»), nunca el
nombre de una persona beneficiaria. Los nombres de quienes reciben ayuda no se
publican: Ley 1581, y con menores hay protección reforzada. El panel lo dice en
el formulario, pero es una regla humana — el código no puede distinguir un rol
de un nombre.

### Rutas

```
GET  /api/entregas?destino=…                    público, solo publicadas
GET  /evidencia/AE-YYYY-NNNNNN/<archivo>        público, solo si está publicada
GET  /api/admin/entregas                        panel
POST /api/admin/entrega                         crear (borrador)
POST /api/admin/entrega/AE-…/foto?alt=…         subir foto (cuerpo crudo)
POST /api/admin/entrega/AE-…/publicar {publicar}
```

R2: bucket `givegrow-media`, prefijo `entregas/<numero>/`. Estaba creado desde
junio de 2026 y vacío. `/evidencia/*` va en `run_worker_first`, si no el
fallback de SPA se lo traga.

**Pendiente:** el acta en PDF generada desde el registro. Hoy no hace falta
porque el papel firmado se fotografía y se publica; cuando se quiera un
documento propio, el motor de `documentos.js` ya está.

## ⚠️ Dos numeradores de guías: el libro y D1

Descubierto el 12 ago 2026. **Las mismas guías identificaban donaciones
distintas en dos sistemas:**

| Guía | `inventario.json` (hoja de cálculo) | D1 `aportes` |
|---|---|---|
| GG-2026-000001 | 8 jul · dinero · «Apoyo Programa Flow Callejero» | 11 ago · intención |
| GG-2026-000002 | 8 jul · especie · «3 cajas de ropa infantil» | 11 ago · intención |
| GG-2026-000003 | 9 jul · especie | 12 ago · intención |

El numerador de D1 arrancó en 1 sin saber que la automatización de Apps Script
ya había emitido 1–3 en julio. Como la guía es también la `reference` de Wompi y
la que cita el certificado, dos donaciones distintas podían compartir
identificador.

**Mitigación aplicada:** el numerador de D1 se adelantó a 999 en producción y en
sandbox. Desde entonces las donaciones hechas por el sitio son
`GG-2026-001000` en adelante, y el libro manual conserva los números bajos. Los
rangos no se cruzan y el origen se lee de un vistazo.

**No es la solución definitiva.** Lo correcto es que un solo numerador mande. El
de Apps Script vive en Google (`ops/alta-automatica.gs`) y no se puede cambiar
desde el repo; cambiar el formato de la guía tocaría regex, referencias de
Wompi, recibos y certificados. Si el libro manual llegara alguna vez a 999,
vuelve el problema.

## El rastreo lee D1 primero

`#rastrea` consultaba SOLO `inventario.json`, así que una donación hecha por el
sitio —que vive en D1— no aparecía. Y el recibo que recibe el donante le dice
justamente que vaya ahí con su guía.

Ahora consulta `/api/aporte/<guia>` primero y cae al libro si no hay nada. Con
una regla que importa: **D1 solo manda si el aporte está en un estado público**
(aprobada, en_distribucion, entregada). Una `intencion` es una guía emitida que
nunca se pagó; mostrarla como «Recibida» sería falso y además taparía la
donación real que el libro sí tiene con ese número.

Si la guía existe en D1 sin confirmar y no está en el libro, se dice tal cual:
«esa guía existe, pero su pago no está confirmado». A quien se le cayó el pago
le sirve más eso que un «no existe».

Y debajo del recorrido aparecen **las entregas del destino**, no las de ese
aporte: contribución, no atribución.

## Ofrecimientos en especie

Hasta la brigada, ofrecer insumos terminaba en un WhatsApp: un mensaje suelto
que alguien tiene que leer, responder y recordar. Con dos números publicados y
una emergencia encima, es donde se pierden los ofrecimientos.

`POST /api/inscripcion` con `tipo:"especie"`. **Mismo endpoint y misma tabla que
el voluntariado**: `inscripciones` ya tenía `tipo` y un blob `datos` pensados
para varios tipos, así que comparte el honeypot, el consentimiento de Ley 1581 y
el patrón de correo — y no hizo falta una migración más antes de que salga la
brigada.

El acuse tiene un solo trabajo real: **que no compre todavía**. Es el error más
caro y más frecuente de la donación espontánea, y la propia página lo advierte
—«comprar sin coordinar suele terminar en insumos que no se pueden entregar»—.
El aviso interno lo repite del otro lado: «conviene responder antes de que
compre».

Panel: `/api/admin/ofrecimientos` los lista, y
`POST /api/admin/inscripcion/<id>/estado` los mueve por los estados que ya
existían en la tabla — nueva → en_revision (contactado) → aceptada (recibido) →
archivada. No se inventaron estados nuevos en una columna compartida.

La categoría se valida contra una lista cerrada (las siete de la página más
«otra»): un campo libre ahí volvería inútil el filtro el primer día.

## Transferencias bancarias reportadas

Era el hueco más grande: la transferencia es el **primer medio de pago** que
muestra la página de la brigada y el que usan las empresas, y no producía nada —
ni guía, ni recibo, ni rastreo, ni ruta al certificado. Terminaba en un correo a
`contabilidad@` que alguien tenía que procesar a mano.

### No se tocó el significado de `aprobada`

Sigue queriendo decir **«el dinero entró»**, que es de lo que depende poder
firmar un certificado bajo juramento. Lo que se añadió es la **procedencia** de
esa certeza: `confirmacion` vale `'wompi'` cuando la dio la pasarela y
`'manual'` cuando una persona la contrastó contra el extracto, con
`confirmado_por` y `confirmado_en`. El estado no pierde su garantía: gana un
origen auditable.

El estado intermedio es **`reportada`**: el donante dice que transfirió. Eso no
es dinero en el banco, así que no da recibo (409), no da certificado y en el
rastreo no aparece como recibida — aparece con su propio mensaje, «estamos
verificando tu transferencia», que no es lo mismo que un pago fallido.

### El certificado cita la referencia BANCARIA

El numeral 5 dice «mediante transferencia electrónica No. …». Para un pago por
pasarela ese número es el id de Wompi; para una transferencia real es el del
comprobante, y por eso confirmar **exige** escribirlo. Citar un id de Wompi que
no existe sería falso en un documento juramentado.

### El comprobante

`POST /api/comprobante/<guia>?t=<token>`. Solo sobre un aporte `reportada`, con
su token, uno por aporte, ≤5 MB, imagen o PDF. Sin esas tres condiciones sería
una carga pública abierta contra el bucket. Se sirve **solo** tras Access
(`/api/admin/comprobante/<guia>`): lleva datos bancarios del donante.

### Rutas

```
POST /api/transferencia                              público, crea la guía
POST /api/comprobante/GG-…?t=<token>                 público con token
GET  /api/admin/reportadas                           bandeja de verificación
GET  /api/admin/comprobante/GG-…                     ver el soporte
POST /api/admin/transferencia/GG-…/confirmar {referencia|descartar,motivo}
```

## Pagos que entran por fuera del checkout

Sebas creó un **enlace de pago propio de Wompi** para la brigada
(`checkout.wompi.co/l/c5Ym2E`) y su QR impreso. Cobra a la misma cuenta pero NO
pasa por `/api/checkout`, así que su `reference` no existe en `aportes`: **no
hay guía, ni recibo, ni certificado emitible**.

Lo que sí ocurre: el webhook está configurado a nivel de cuenta en Wompi, de
modo que esos pagos entran igual a `eventos_wompi` con firma válida. Se quedan
ahí porque `aplicarEstado` no encuentra la fila y retorna.

Por eso el panel tiene **«Pagos sin aporte»** (`/api/admin/pagos-sueltos`):
lista los eventos aprobados con firma válida cuya referencia no tiene aporte.
Si esa lista está vacía, todo lo cobrado está trazado. Si alguien de esa lista
pide certificado, hay que crearle el registro a mano.

Del cuerpo crudo del evento se extrae solo monto, método, correo y nombre.
Aunque el panel esté tras Access, mandar el JSON completo de la pasarela al
navegador es más dato personal del que esa pantalla necesita.

En la página, ese enlace va **después** del checkout propio y **sin botón**: quien
llega por el QR nunca ve la página, y quien sí la ve merece saber que por ahí
pierde el rastreo y el certificado automático.

## Antes de desplegar: la migración va PRIMERO

`migrations/0003_documentos.sql` añade la columna `aportes.token`, y
`/api/checkout` la escribe. **Si el código llega a producción antes que la
migración, el checkout falla y se caen las donaciones.**

```bash
npx wrangler d1 migrations apply givegrow-privado --remote
npx wrangler d1 migrations apply givegrow-privado-sandbox --env sandbox --remote
```

**Esto ya se saltó una vez, el 11 ago 2026.** La 0003 no llegó a producción
—probablemente un `apply` sin `--remote`, que va a una base local— y el código
salió igual: `/api/checkout` fallaba al insertar `token` y **nadie pudo donar**
hasta que se aplicó a mano. Desde entonces `deploy.yml` corre
`wrangler d1 migrations list --remote` y **se niega a desplegar** si hay
pendientes. Un paso manual que tumba el cobro no es un paso manual: es un
incidente que todavía no ocurrió.

Ojo: `0002_idioma.sql` inserta su propia fila en `d1_migrations`, cosa que
`wrangler d1 migrations apply` también hace, así que ese comando falla sobre una
base **limpia** con `UNIQUE constraint failed: d1_migrations.name`. Las bases
reales ya tienen 0001 y 0002 aplicadas, así que aplicar solo la 0003 funciona.
Para montar una base desde cero, ejecutar los tres archivos con `d1 execute
--file` y saltarse el comando de migraciones.

## Dependencia nueva

`pdf-lib` es la **primera dependencia npm del repositorio**. Implica
`package.json`, `package-lock.json` y un `npm ci` antes de `wrangler deploy`.
El bundle del Worker quedó en 915 KB (240 KB gzip), muy por debajo del límite.

`ci.yml` corre `wrangler deploy --dry-run`: `node --check` ve la sintaxis pero no
el enlazado, y un import que no resuelve solo aparecería al desplegar.

## Tipografía

Las Standard 14 del PDF (Helvetica), no Unbounded ni Inter. Las de marca viven en
`/vendor` como woff2 y pdf-lib no lee woff2: habría que convertirlas, embeberlas
con fontkit y sumar cientos de KB. Un documento tributario se lee mejor con
tipografía de documento; la marca la cargan la estructura, el verde y el papel.

## Pendiente

- **Cédulas de los firmantes.** `ENTIDAD.repLegal.cc` y `ENTIDAD.revisora.cc`
  están vacías en `documentos.js` y el bloque de firmas omite la línea cuando lo
  están. La T.P. de la Revisora Fiscal sí está (244894-T, tomada de
  `#transparencia`).
- **Donaciones por transferencia bancaria.** El numeral 5 dice «transferencia
  electrónica No. …» con el id de Wompi. Un aporte que llegue por consignación
  directa a Bancolombia hoy no está en D1, así que no puede certificarse por
  aquí todavía.
