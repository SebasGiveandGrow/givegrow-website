# La regla de rate-limit de Cloudflare

**Aplicada por Sebas el 7 sep 2026. Verificada contra producción el 7, el 8 y el 12.**

Este archivo existe porque la regla vive **solo en el dashboard de Cloudflare**.
No hay código que la describa, ni despliegue que la reponga si alguien la borra,
ni nada que avise si cambia. Sin este documento, la única forma de saber qué
protege es hacerse bloquear a propósito — que es exactamente como se levantó lo
que sigue.

## Qué hace

En el plan gratuito de Cloudflare la regla de rate-limit **no se puede
configurar**: los cuatro parámetros vienen fijos y son los únicos disponibles.

| | |
|---|---|
| cuenta por | IP |
| ventana | 10 segundos |
| acción | Block |
| duración del bloqueo | 10 segundos |

Lo único que se elige es **a qué rutas se aplica**, y ahí está todo el diseño.

## Las cinco rutas, y por qué esas

```
/api/alma            cuesta dinero por llamada (API de Anthropic)
/api/caso            cada POST quema un consecutivo que no se reinicia nunca
/api/transferencia   cada POST quema una guía y mete una fila en la cola de
                     verificación manual, que revisa una persona
/api/inscripcion     crea postulaciones que alguien tiene que mirar
/api/checkout        crea intenciones de pago
```

El criterio es uno solo: **rutas que CREAN algo permanente o que cuestan
dinero**. Nada de lectura entra, porque bloquear una lectura le rompe el sitio a
una familia sin evitar ningún daño.

**Comprobado otra vez el 12 sep 2026**, con el método de más abajo: la regla
sigue en pie y las cinco están dentro. Y lo que de verdad importaba comprobar
—que `/api/caso/<n>/medio` siga FUERA— también: durante el bloqueo contestó el
Worker con un 403 suyo. Fuera siguen igual `/api/trm`, `/api/casos/publicos` y
la portada.

## Lo que queda FUERA a propósito, y no se debe añadir

**`/api/caso/<n>/medio` — la subida de fotos.** Una familia sube sus fotos **de a
una y en serie**: veinte fotos son veinte POST seguidos. Si esa ruta entrara en
la regla, el sistema **bloquearía a la familia a mitad de su propio reporte**, y
el caso quedaría sin material — que es justo lo que hace que un ingeniero lo
devuelva como inevaluable. Es el error que más caro saldría y el más fácil de
cometer al «endurecer» la regla.

Fuera también, y por lo mismo: `/api/caso/<n>` (la familia consultando su caso),
`/api/aporte/<guía>` (el donante rastreando), `/api/casos/publicos`, `/api/trm` y
la portada.

⚠️ **La regla casa rutas EXACTAS, no prefijos.** Comprobado: `/api/caso` está
dentro y `/api/caso/CV-…/medio` está fuera, aunque uno sea prefijo del otro. Si
alguien la reescribe con `starts_with`, se lleva por delante la subida de fotos
sin darse cuenta.

## Cómo se comprueba, sin gastar nada

`/api/alma` rechaza un cuerpo que no sea JSON **antes** de llamar a Anthropic, así
que sirve de ariete gratis:

```bash
for i in $(seq 1 14); do
  curl -s -m 8 -X POST https://thegiveandgrowproject.org/api/alma \
    -H 'content-type: application/json' --data 'no-es-json' \
    -w '%{http_code} %{content_type}\n' -o /dev/null
done
```

Lo que se espera, y lo que salió el 8 sep 2026:

```
 1..10   400  application/json    {"error":"json_invalido"}   ← llega al Worker
11..14   429  text/plain          error code: 1015            ← lo para Cloudflare
```

**Las dos señales que distinguen quién bloqueó:** el Worker responde
**JSON**; Cloudflare responde **cualquier otra cosa**. Si ves un 429 con JSON,
ese es un freno del código (el tope de ALMA por isolate, o el de transferencias),
no la regla.

⚠️ **No te fíes de `text/plain`.** El 8 sep el bloqueo llegaba como `text/plain`
con el cuerpo `error code: 1015`, y así estaba escrito aquí. El 12 sep, pidiendo
lo mismo desde Node en vez de curl, **el mismo bloqueo llegó como `text/html`**
—la página de bloqueo de Cloudflare—. El tipo depende del cliente. Lo que no
cambia es que no es JSON: esa es la señal a la que hay que mirar. Un script que
busque `text/plain` da un falso «la regla no está» (pasó, escribiendo uno).

⚠️ **Y el ariete se gasta.** El tope de ALMA es del CÓDIGO y responde ANTES que
Cloudflare. En una segunda corrida seguida, las catorce peticiones pueden
devolver `429 {"error":"demasiados_mensajes"}` —JSON— sin que Cloudflare llegue
a intervenir, y parece que la regla desapareció. Además ese tope es **por
isolate**: dos peticiones del mismo bucle pueden caer en isolates distintos y
contestar una `400 json_invalido` y otra `429 demasiados_mensajes`. Si vas a
repetir la prueba, **espera un minuto entre corridas** y lee la tabla completa,
no una petición suelta.

Y para saber si una ruta está dentro sin desmontar nada: hazte bloquear con
`/api/alma` y, **mientras dure el bloqueo**, pide esa ruta una vez. Si devuelve
`1015`, está en la regla; si contesta el Worker, no lo está.

El bloqueo dura 10 segundos y se levanta solo. Verificado que durante el bloqueo
la portada sigue en 200 y el rastreo de un aporte también.

## Lo que esta regla NO resuelve

No frena a quien **rote direcciones IP**, que es el escenario del script decidido.
Para eso haría falta un plan de pago con reglas por otros campos. Queda dicho
aquí para que nadie lea este archivo y crea que el problema está cerrado: lo que
hay es un techo por IP, y es suficiente para lo que de verdad ocurre.
