# Recibo y certificado de donación

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

## Antes de desplegar: la migración va PRIMERO

`migrations/0003_documentos.sql` añade la columna `aportes.token`, y
`/api/checkout` la escribe. **Si el código llega a producción antes que la
migración, el checkout falla y se caen las donaciones.**

```bash
npx wrangler d1 migrations apply givegrow-privado --remote
npx wrangler d1 migrations apply givegrow-privado-sandbox --env sandbox --remote
```

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
