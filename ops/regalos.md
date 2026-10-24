# Regalos de diciembre — cómo se opera

Página pública: `/#regalos`. Pantalla del equipo: `/admin/regalos` (con Access,
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
4. **La hoja de terreno**: plantilla en `Cargar la hoja`. Una fila por niño,
   guardada como CSV. Primero se revisa (no guarda nada) y después se guardan
   las filas sanas. Una fila repetida no entra dos veces.
5. **Foto y autorización firmada** de cada niño: una por una desde la fila, o
   las fotos en lote, nombradas con el código (`URI-0001.jpg`).
6. **Publicar**: filtrar, seleccionar y aplicar «Publicar». Lo que no cumple
   (sin autorización de datos, sin valor, sin talla en ropa o calzado) se queda
   en borrador y la pantalla dice por qué.
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

## El recorrido

`publicado → financiado → comprado → despachado → entregado`. La lista de compras
(`Lista de compras (CSV)`) trae lo financiado que falta comprar, por zona, tipo
y talla. Los correos al donante salen al financiarse, al despacharse y al
entregarse: uno por pedido, nunca uno por regalo. «Comprado» no manda correo:
con mil regalos el cupo diario de correo (1600) se guarda para lo que el
donante espera saber.

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
