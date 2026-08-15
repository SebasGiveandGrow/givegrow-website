# Minutas del certificado de donación

Dos plantillas `.docx` para llenar a mano y firmar, cuando el certificado
automático del sitio no puede resolver el caso:

| Minuta | Cuándo se usa |
|---|---|
| **DINERO** | la donación entró en plata pero no por el checkout del sitio — transferencia directa, consignación, o un pago por el enlace de Wompi que quedó sin guía |
| **ESPECIE** | la donación fueron bienes. El certificado del sistema **no cubre especie** a propósito |

Si la donación entró por el sitio y quedó `aprobada`, **no se usa minuta**: el
certificado sale de `/admin`, numerado, firmado y archivado, y queda registrado
en la base. La minuta es la excepción, no el camino.

## Generarlas

```bash
npm i docx --no-save                          # no es dependencia del sitio
node ops/minutas-certificado.js ~/Desktop     # o el directorio que quieras
```

Los `.docx` **no se commitean**. El repositorio es público y un documento
editable, listo para llenar y firmar, de una declaración rendida bajo la
gravedad de juramento no tiene por qué estar ahí. Se versiona el generador; los
documentos viven en el Drive. (`ops/` está en `.assetsignore`, así que tampoco
se sirve desde el sitio.)

## La numeración: bloque 900001

D1 lleva el consecutivo del sistema desde `CD-2026-000001`. **Las minutas se
numeran desde `CD-2026-900001`**, en orden y sin saltos.

No es un capricho: dos sistemas que numeran lo mismo terminan emitiendo el mismo
número para documentos distintos. Ya pasó en esta fundación, entre D1 y la hoja
de cálculo, con las guías de donación — y nadie lo habría notado hasta que un
donante rastreara la donación de otro. Con el bloque aparte, el número dice solo
con verlo que ese certificado se expidió a mano.

## Antes de firmar el primero de cada año

Los numerales **III.2** y **III.4** no son fórmulas: son afirmaciones de hecho
que se rinden bajo juramento.

1. **III.2** — que esté presentada la declaración de renta del año gravable
   anterior al de la donación.
2. **III.4** — que la calificación en el Régimen Tributario Especial esté
   **vigente**. La permanencia exige la actualización anual del registro web
   ante la DIAN; sin ella, «vigente» no se sostiene.

Si alguna no se cumple, el certificado no se firma todavía.

## Especie: el valor lo soporta el donante

El parágrafo 1 del art. 125-2 del E.T. obliga a certificar **el menor entre el
valor comercial y el costo fiscal** del bien. La Fundación no estima ese valor:
sale de la factura o el soporte que aporte el donante, y va renglón por renglón
en el Anexo 1. **Un renglón sin soporte se saca del certificado.** Ropa y
enseres usados, por regla, no entran.

La minuta de especie además exige el número del **acta de recibido**
(`AE-2026-…`). Sin acta firmada no hay certificado: es lo que prueba la entrega.

## No se corrige: se anula

Igual que en el sistema. Si aparece un error después de firmar, el certificado
se anula con constancia del motivo y se expide uno nuevo con el número
siguiente. El número anulado conserva su hueco.

## Por qué el texto no se edita en el `.docx`

El articulado es el mismo que arma `documentos.js`, y el **check #10 de
`validate.mjs`** compara las dos fuentes cláusula por cláusula: la sección III
completa, la IV, el aviso del art. 257 y la cláusula de expedición. Si alguien
cambia una y no la otra, el build falla.

Existe porque ya ocurrió lo contrario: los documentos del Drive decían
Art. 125 / 125% mientras el sitio decía Art. 257 / 25%, y convivieron meses sin
que nadie lo notara. **Para cambiar el articulado hay que cambiarlo en los dos
archivos, y con la Revisora Fiscal.**
