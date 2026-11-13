# Regalos de diciembre — cómo se opera

Página pública: `/regalos`. Pantalla del equipo: `/admin/regalos` (con Access,
en el mismo dominio que el panel). Tablas: `migrations/0048_regalos.sql`.

La campaña nace en **borrador**: la página dice «muy pronto» y no muestra a
ningún niño hasta que alguien la abra desde `/admin/regalos › Campaña y valores`.

## Lo que hay que llenar (sin tocar código)

1. **Valor por tipo de regalo**, en pesos y en dólares. Un regalo no se publica
   mientras su tipo no tenga los dos valores. Los dólares son números redondos,
   no una conversión de la TRM.
2. **Fundación aliada de EE. UU.**: nombre y enlace de donación. Si su pasarela
   acepta la referencia o el monto en la URL, se escriben `{ref}` y `{usd}`
   donde van. Sin aliada, la página no ofrece pagar en dólares.
3. **Fecha de entrega** de cada zona y **último día para donar**.
4. **La hoja de terreno**: la que reciben las fundaciones («Regalos de
   diciembre 2026 · Formato para fundaciones», en Google Sheets) tiene las
   mismas columnas que la plantilla de `Cargar la hoja`. Se descarga la
   pestaña «Niños» como CSV. Primero se revisa (no guarda nada) y después se
   guardan las filas sanas. Una fila repetida no entra dos veces, y la fila de
   ejemplo de la hoja se rechaza sola.
   - `numero` es el número de la fundación (1, 2, 3…), único en la zona. Con él
     nombran la foto y la autorización. Es obligatorio si la columna existe.
   - `asentimiento_nino`: si al niño se le explicó y estuvo de acuerdo. Con
     «no» el niño se guarda pero no se publica, aunque el acudiente haya firmado.
5. **Foto y autorización firmada** de cada niño: una por una desde la fila, o
   todas en lote en `Cargar la hoja › 3`, tal como las manda la fundación:
   `uribia-12.jpg` (foto) y `uribia-12-autorizacion.pdf` (o .jpg). También sirve
   el código del sistema (`URI-0012.jpg`). Tildes, espacios y guiones bajos dan
   igual (`Medellín_3-Autorización.pdf`). Lo que no corresponde a ningún niño se
   lista al final sin subirse.
6. **Publicar**: filtrar, seleccionar y aplicar «Publicar». Lo que no cumple
   (sin autorización de datos, sin asentimiento del niño, sin valor, sin talla
   en ropa o calzado) se queda en borrador y la pantalla dice por qué.
7. **Abrir la campaña.**

## Las reglas que no hay que romper

- Nombre completo, acudiente, teléfono y comunidad **nunca** salen de
  `/admin/regalos`. La página pública solo ve nombre de pila, edad, zona, el
  regalo y su valor.
- La foto se publica **solo** con `autoriza_foto` marcado (lo que firmó el
  acudiente). Se guarda sin metadatos.
- «Entregado» exige el número del acta (`AE-…`), creada en `/admin › Entregas`.
- Un pedido en pesos lo confirma Wompi; uno en dólares lo confirma una persona
  en `Pedidos` cuando la aliada reporta la donación con el número `RG-…`.
- Si un regalo ya lo había pagado otro cuando llegó un pago, la plata va a otro
  niño de la misma zona y se le avisa al donante. Si no queda ninguno, el
  pedido queda con «sin cupo», llega un aviso a `CORREO_AVISOS` y lo resuelve
  una persona (con «Financiar con fondo o empresa»).
- Con la campaña **cerrada** la página no muestra ni una ficha ni una foto (lo
  promete la autorización del acudiente): solo los árboles y el seguimiento de
  cada donante.

## Al terminar: borrar los datos personales (0062)

La Política de Privacidad (v1.3) promete eliminar los datos de los niños y sus
acudientes, las cartas y los videos **a más tardar seis meses después de la
última entrega**. Las actas de entrega se conservan.

`Campaña y valores › Datos personales al terminar` muestra la fecha límite,
calculada sobre la última entrega. El botón aparece solo con la campaña cerrada
y pide escribir `ELIMINAR`: borra de R2 las fotos, las autorizaciones y los
videos, borra cartas y firmas, y deja de cada niño solo el código, la edad, el
género, la zona, el regalo y su recorrido (lo que sostienen las actas y el
informe). Queda en la bitácora. No se deshace, no se puede correr dos veces y
una campaña borrada ya no se puede volver a abrir.

## El recorrido

`publicado → financiado → comprado → despachado → entregado`. La lista de compras
(`Lista de compras (CSV)`) trae lo financiado que falta comprar, por zona, tipo
y talla. Los correos al donante salen al financiarse, al despacharse y al
entregarse: uno por pedido, nunca uno por regalo. «Comprado» no manda correo:
con mil regalos el cupo diario de correo (1600) se guarda para lo que el
donante espera saber.

## La última milla: empacar y entregar (30 oct 2026)

En la lista de niños, con los niños **seleccionados** (los filtros y «Seleccionar
los filtrados» ayudan):

- **Etiquetas para empacar**: una por regalo financiado que todavía no se
  entrega, dos por fila, para recortar y pegar en el paquete. Llevan el código
  grande, el nombre de pila, la edad, la zona y la comunidad, el regalo con su
  talla, y si va con carta o video aprobados.
- **Planilla de entrega**: una hoja por comunidad, con el nombre completo del
  niño, el regalo, el acudiente y la casilla para su firma o huella, más quién
  entregó. Arriba: fecha, lugar, responsable y número del acta `AE-`. Es el
  soporte del acta: se archiva en la fundación y **no se fotografía para redes**.
- Lo que no tiene un regalo financiado sin entregar se queda fuera, y la pantalla
  dice cuántos.
- Después de la entrega: crear el acta en `/admin › Entregas` y marcar
  «Entregado» por lote con su número.

## Cartas, videos y noticias (0049)

- El donante puede dejar **una carta y un video** (de 30 s a 1 min, hasta 90 MB)
  por pedido. Se graban desde el teléfono o se suben, al pagar o después desde
  el enlace de seguimiento, mientras ningún regalo del pedido se haya entregado.
- **Nada se entrega sin revisar.** En `/admin/regalos › Cartas y videos` se
  aprueba o se rechaza. Rechazar pide decir por qué: el motivo le llega al
  donante para corregirlo. Cambiar la carta o el video la vuelve a poner en
  «por revisar».
- «Imprimir cartas aprobadas» saca una hoja por regalo financiado. La lista de
  compras marca qué regalos llevan carta o video.
- El video nunca se publica: solo lo sirve `/admin`, y el equipo lo muestra en
  la entrega (se puede descargar desde la tarjeta).
- **Noticias:** la casilla nace desmarcada (Ley 1581). Quien la marca queda en
  «Correos que autorizaron noticias (CSV)». Al escribirles, cada correo tiene
  que decir cómo retirar la autorización.

## Embajadores (0051)

- En `/admin/regalos › Embajadores` se crea uno con su nombre (el código sale
  solo, o se escribe). Su enlace es `/regalos?emb=CODIGO`.
- El pedido que entra por ese enlace guarda el código, aunque la persona
  navegue por el sitio antes de pagar (se recuerda en la pestaña).
- La pantalla cuenta **pedidos pagados y regalos** por embajador. Nunca
  muestra quién donó ni cuánto, y no hay premio por monto.
- Desactivar uno no rompe su enlace: Regalos abre igual, pero ya no cuenta.
  El código no se cambia, porque ya está en lo que la persona compartió.

## Lo que empuja la meta (bloque 2, nov 2026)

Salen de la investigación de mejoras del 24 oct 2026. Ninguno necesita datos
nuevos: leen la meta, la fecha de cierre y la de publicación que ya existen.

- **«Faltan N luces»** bajo cada árbol, y **los días que quedan** arriba, con
  el último día para donar de `Campaña y valores`. El servidor los cuenta en
  hora de Colombia (`quedan_dias`, 0 = hoy es el último).
- **Compartir**: cada tarjeta libre y la campaña entera. En el celular abre el
  menú del sistema; en el computador, WhatsApp Web. El texto dice edad, zona y
  deseo, **nunca el nombre**; el enlace (`/regalos?n=URI-0001`) abre esa
  tarjeta primero. Si ya la tomó otra persona, la página lo dice y muestra los
  que siguen esperando en su zona. La vista previa es la de la campaña, sin fotos.
- **«Regala a quien más lleva esperando»**: entre los libres que cumplen los
  filtros puestos, el que se publicó primero; el mismo día, el de más edad.
- **Las reglas si algo cambia** (pago doble, niño que ya no puede recibir,
  regalo más barato, zona sin nadie esperando) están en «Cómo funciona», a la
  vista desde antes de abrir.
- **La membresía se pide en el correo de «entregado»**, no al pagar: llega con
  el acta en la mano. Una invitación sin cifras.


## Regalos en especie por zona (0064, 12 nov 2026)

Cuando llegan regalos que no son de un niño en particular (los 250 que Sebas
consiguió para La Guajira), se anotan en `/admin/regalos › Zonas › En especie`.
Cuentan como financiados: encienden luces del árbol y bajan el «faltan N luces»,
y bajo el árbol sale «250 ya donados en especie». No tienen ficha, pedido ni
donante en la página, y no cuentan como entregados: la entrega se prueba con su
propia acta en `/admin › Entregas`. Va de 0 a la meta de la zona.

## Encuadrar las fotos en el rostro (`ops/encuadrar-fotos.swift`)

Las fundaciones mandan fotos de cuerpo entero y la tarjeta las recorta en 4:3
por el medio: se pierde la cabeza. Antes de subir una tanda, encuadrarlas:

```bash
swiftc -O -o /tmp/encuadrar ops/encuadrar-fotos.swift
/tmp/encuadrar ~/Descargas/fotos-zona /tmp/fotos-listas --hoja /tmp/hoja.jpg
```

Busca la cara con Vision de macOS (en el equipo, nada sale), recorta en 4:3 de
la cabeza al pecho y arma una hoja de contactos para revisarlas antes de
subirlas por `Cargar la hoja › 3`. Lee JPG, PNG y HEIC. Si no encuentra cara,
deja la franja de arriba y lo dice: revisar esas en la hoja. Las fotos ya
publicadas se reemplazan en R2 con la misma clave (`foto_key`), sin tocar la base.

## La campaña dentro del sitio de la aliada (Positive Potential, 12 nov 2026)

Positive Potential (EE. UU., 501(c)(3)) recibe los dólares en
`positivepotential.org/donate` y le da el recibo para impuestos a quien se lo
pida directamente. Su formulario no tiene nota ni referencia: los pedidos en
dólares se asocian **por el correo del donante**. La aliada avisa a Sebas cada
movimiento o al menos una vez al día, y una persona confirma el pedido en
`Pedidos`.

Además muestra la campaña completa en su sitio: `/regalos?incrustado=1` dentro
de un marco (bloque listo para pegar en `ops/regalos-incrustar.html`). Ahí la
página va sin menú, pie ni botones flotantes, le avisa su altura al sitio y el
pago en pesos se abre en una pestaña nueva. Solo los dominios de
`REGALOS_MARCOS` (worker.js, y la misma lista en js/regalos.js) pueden
mostrarla. Los datos bancarios de la aliada no se publican: no hacen falta para
`/donate` y a la vista invitan al fraude.
