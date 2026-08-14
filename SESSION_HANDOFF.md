# SESSION HANDOFF — Give&Grow International

> Última actualización: sesión "Brigada del terremoto" (11–12 ago 2026)
> Responder SIEMPRE en español. Principio rector: **"evidencia, no promesas"**.

## Estado del proyecto
- Sitio bilingüe ES/EN, vanilla-JS SPA, Cloudflare Workers.
- Repo: `SebasGiveandGrow/givegrow-website` rama `main`. Dominio: thegiveandgrowproject.org
- Deploy vía GitHub Actions. Verificar con la API de Actions tras cada push.

## ⚠️ OJO: hay TRES planes con fases numeradas — no confundirlos

Si Sebas dice solo "la siguiente fase", **preguntar de cuál de los tres**.

| Plan | Dónde vive | Estado |
|---|---|---|
| **ECOSISTEMA DIGITAL, 9 fases** (limpieza · D1 · Wompi · formularios · panel · documentos · evidencia · membresías · medir) | traspaso del 8–11 ago + este | **0, 1, 2, 3, 4, 5, 5.1, 6 y 8 hechas.** Fase 7 a medias: **carnet ✅**, falta el **débito automático** en Wompi. De la 8 quedó la mitad de «limpiar», que son decisiones tuyas, no código — ver su cierre de tanda |
| **VISUAL, 6 fases** (credibilidad · ImpactOS/ALMA · trazabilidad · sistema visual · logo "Sello Variable" · recibo público) | secciones de abajo de este archivo | Fases 1–2 hechas (PRs #36, #37). **Fase 3 cerrada**: el rastreo y la evidencia entraron con la brigada, y **Transparencia imprimible** con el PR #90. Del contador por recencia Sebas decidió **esperar**. **Siguiente: su Fase 4** (sistema visual) |
| **VOLUNTARIADO, 8 fases** | `PLAN_VOLUNTARIADO.md` | **Fases 1–7 hechas y en producción.** **Siguiente: su Fase 8** (sostenibilidad: SECOP/RUP, con la restricción de que nada se cobra) |

Y aparte, el **Social Fest 2026**: la postulación ya se envió (taller «Si no quedó
documentado, no ocurrió»). Avisan los seleccionados el **28 de agosto**. Si entra,
hay que producir los ocho materiales del taller — detalle en la memoria del
proyecto.

## 📣 LA BRIGADA TIENE FECHA: 24 al 28 de agosto de 2026

Cinco territorios en cinco días, entregas coordinadas con las fundaciones de
cada uno. **Y el foco de la campaña lo fijó Sebas el 12 de agosto: recibir
donaciones por transferencia, en especie, VOLUNTARIOS y CONTACTOS.** Las dos
últimas no se pedían en ninguna parte del sitio — ahora sí.

**El diagnóstico de comunicación que originó el cambio:** la página estaba
escrita como una justificación institucional, no como un llamado a actuar en una
emergencia. Explicaba muy bien por qué somos confiables y casi nunca decía qué
se necesita, para cuándo, ni qué hacer. El lead hablaba de nosotros («salimos con
siete personas…»), no de una petición.

Lo que se hizo: **invertir la jerarquía**. Bloque de estado arriba, con la cuenta
de días como único elemento firma, las cuatro peticiones en concreto, y el
argumento institucional intacto debajo. Más una sección nueva de **manos y
contactos**.

**El contador envejece solo, y eso es el punto:** tres fases —«Faltan N días»,
«En curso: día N de cinco», «Las cinco jornadas terminaron»— calculadas en hora
de Bogotá con una resta fija de UTC-5, porque Colombia no tiene horario de
verano. Verificado en los ocho bordes, incluido el que importa: a las 20:00 del
23 en Bogotá (ya 24 en UTC) sigue diciendo «Falta 1 día», y no anuncia la brigada
en terreno seis horas antes de que salga. **Nadie tiene que entrar a editar la
página el 24 ni el 29.**

**Honestidad que quedó escrita en la página:** el equipo de terreno está cerrado
en siete personas y se dice POR QUÉ no se puede sumar gente a terreno en doce
días —doble verificación más sesión de Marco—, en vez de invitar a algo que no se
puede cumplir. Las manos que se piden son de estructura, en Medellín.

**El tono de la petición, corregido (12 ago).** Sebas: «la forma en la que pides
el dinero es muy abrupta, muy poco humana». Tenía razón y el defecto era mío:
«Dinero» no es una petición, es una categoría de inventario, y las cuatro
descripciones eran puro mecanismo —la cuenta, la presentación, empacar, la
bodega— sin una palabra sobre para quién es. La página ya tenía la voz correcta
treinta centímetros más abajo, en las observaciones del inventario.

**La regla que quedó, y sirve para todo lo que se escriba de aquí en adelante:**
el calor no se agrega con adjetivos, se agrega **diciendo qué cambia y para
quién**. Cada petición ahora abre igual —«Con dinero», «Con insumos», «Con tus
manos», «Con una llamada»— y ese paralelismo es deliberado: quien no puede dar
plata no debe sentirse de segunda. Y la fricción se explica como cuidado del que
da («te lo pedimos para cuidar tu plata»), no como advertencia.

**Sigue sin haber costos del inventario**, y por eso sigue sin haber meta en pesos
ni equivalencias. Sebas lo confirmó: por ahora no los hay. La página pide sin
poder decir cuánto, y lo dice de frente en «No prometemos cifras que no tenemos».

## ⏭️ LO QUE ESPERA INSUMO DE SEBAS (no código)

1. **Cuántos brigadistas: 7 u 8.** Él dijo siete; el inventario está calculado
   para ocho (cascos, botas, sleeping bags, carnés, juegos de documentos).
   **Pidió expresamente no tocarlo — lo cierra él.**
2. ~~Direcciones de los centros de acopio~~ — **RESUELTO (12 ago).** Los dos
   están **en ENVIGADO, no en Medellín**: Esmeraldas Colombia (Carrera 48 # 37
   Sur 56, frente al rompoy de Viva Envigado) y Club Nativos (Sector El Salado).
   Publicados con su WhatsApp y su enlace de «Cómo llegar».
   **Sigue faltando el HORARIO de cada uno** — hoy la página lo resuelve
   diciendo la verdad: son sedes prestadas, no bodegas, y hay que escribir antes
   de ir para que no cargues el carro y encuentres la puerta cerrada.
3. **Avales de CMGRD** por ciudad, para quitar «zona por confirmar».
4. **Costos del inventario.** Sin ellos no hay meta en pesos ni equivalencias, y
   la calculadora lo dice en voz alta.
5. **Cédulas de los firmantes** (`ENTIDAD.repLegal.cc` y `.revisora.cc` en
   `documentos.js`). El bloque de firmas omite la línea mientras estén vacías.
6. **La contraprestación, con la contadora.** Sigue abierta. El carnet se diseñó
   para no ensancharla: solo membresía recurrente, nunca aportes de la brigada.

## ⚠️ DOS COSAS QUE SIGUEN A MEDIAS Y HAY QUE RECORDAR

**Los dos numeradores de guías.** Mitigado, no resuelto: el de D1 se adelantó a
999 y el libro de Sheets conserva los números bajos. Si el libro llegara alguna
vez a 999, vuelve la colisión. Detalle en `ops/documentos.md`.

**~~Las transferencias bancarias no crean registro~~ — CERRADO (PR #77).** El
donante las reporta en `#reportar`, recibe guía al instante y sube su
comprobante; una persona las confirma contra el extracto desde `/admin`. No se
tocó el significado de `aprobada`: se añadió `confirmacion` ('wompi' | 'manual')
para saber de dónde viene la certeza, y el certificado cita la referencia
BANCARIA y no un id de Wompi inexistente.

## 🧪 QUÉ HAY EN LA BASE DE PRODUCCIÓN (corte: 13 ago 2026, 20:00 UTC)

| | |
|---|---|
| `aportes` | **4.** `001001` en_distribucion ('conciliada') · `001002` aprobada ('wompi') · **`001003` REPORTADA, $400.000, esperando verificación** · `001004` intencion |
| `donantes` | **3** |
| `eventos_wompi` | **1**, con firma válida y procesado |
| `correos` | **0** — la tabla es nueva y aún no ha salido ningún correo desde que se desplegó |
| `certificados`, `miembros`, `inscripciones` | **0** |
| `entregas` | 0 vivas · 1 anulada |
| numeradores | guía **1004** · acta **1** · certificado sin estrenar |

### 🔴 LO PRIMERO AL RETOMAR: hay una donación real esperando
**`GG-2026-001003`, $400.000 al fondo general, transferencia reportada con
comprobante y referencia bancaria, y PIDE CERTIFICADO.** Lleva más de 30 horas
sin verificar. Es el primer donante que no es Sebas y la donación más grande que
ha entrado.

El sistema hizo lo suyo —guía al instante, comprobante guardado—; falta
contrastarla contra el extracto y confirmarla desde `/admin`. Hasta entonces no
le llega recibo ni certificado. *(Los datos de la persona están en la base y en
el panel; no se copian aquí porque este repositorio es público.)*

Es justo el caso para el que se construyó la cola «Esperando a una persona» de
la Fase 8, y funcionó: lo detectó.

**⚠️ Los numeradores NO se reinician, nunca.** Ver la razón más abajo.

### ✅ EL WEBHOOK FUNCIONA — probado con dinero real (12 ago 2026, 16:12 UTC)

Sebas configuró la URL de eventos y pagó $5.000 por el sitio para probarla. La
cadena completa, sin que nadie tocara el panel:

| | |
|---|---|
| `eventos_wompi` fila 4 | tx `1474268-1786551110-86008` · `transaction.updated` · APPROVED |
| firma | **`firma_valida = 1`** — el checksum reproduce el de Wompi |
| procesado | **1** |
| `GG-2026-001002` | `intencion` 16:11:03 → **`aprobada` 16:12:37** |
| confirmación | **`'wompi'`**, con `confirmado_por` en NULL: lo movió la máquina |
| donante | vinculado, y **deduplicado por correo** (mismo `donante_id 1` que 001001) |

**94 segundos de punta a punta.** Con esto queda verificado en producción lo
último que faltaba: checkout firmado → Wompi → webhook con firma válida →
aporte aprobado → donante. Y el `timestamp` de la raíz sigue siendo el correcto
(`timestamp_wompi = 1786551156`), así que la trampa de la documentación no
volvió.

**Los dos caminos coexisten y se distinguen en la base**, que era el punto de
`confirmacion`: `001001` dice `'conciliada'` (rescatada a mano cuando el webhook
estaba mudo) y `001002` dice `'wompi'`.

**Falta confirmar una sola cosa:** que el **recibo** haya llegado al correo del
donante. Es el último tramo de la Fase 5 sin ver con datos reales — ninguno de los
dos aportes pidió certificado (`quiere_certificado = 0`), así que el certificado
sigue sin estrenarse.

**Nota, y no es nuestra:** Wompi devuelve al donante a
`/gracias?id=…&env=undefined`. El Worker manda `redirect-url` limpio, sin
parámetros; el `env` lo añade Wompi y le sale `undefined`. La página solo lee
`id`, así que es inofensivo — pero si algún día se ve raro en un enlace
compartido, el origen es Wompi y no el sitio.

## 🔴 INCIDENTE: se cobró un pago real y la base no lo supo (12 ago 2026)

**Ocurrió de verdad, con dinero.** Sebas donó $5.000 por el sitio para probar:

| | |
|---|---|
| transacción | `1474268-1786544920-61767` |
| referencia | `GG-2026-001001` |
| estado en Wompi | **Aprobada**, finalizada 09:30 (14:30 UTC) |
| método | Transferencia Bancolombia |
| estado en D1 | **`intencion`** — media hora después seguía igual |

Confirmado en el correo «¡Pago exitoso!» de Wompi y en su panel. Y
`eventos_wompi` **no tenía una sola fila en su historia**: el webhook no ha
llegado nunca, ni con este pago ni con ninguno.

**Causa raíz: la URL de eventos no está configurada en el panel de Wompi.** El
endpoint está sano —un GET a `/api/wompi/eventos` responde `405` del Worker, no
lo traga el fallback de SPA—. Lo que falta es apuntarle a:

```
https://thegiveandgrowproject.org/api/wompi/eventos
```

**⏭️ MIENTRAS ESO NO SE ARREGLE, TODA DONACIÓN NUEVA SE QUEDA EN `intencion`:**
sin registro, sin recibo, y el donante viendo «estamos confirmando tu pago» para
siempre. Es lo primero que hay que verificar al retomar.

### El rescate: conciliar contra la API de Wompi
`POST /api/admin/aporte/<guia>/conciliar` + botón «Conciliar con Wompi» en el
panel, en los aportes en `intencion`, `pendiente` o `error`.

**No reimplementa nada:** le pregunta a Wompi por la transacción y le entrega la
respuesta a `aplicarEstado`, la MISMA función del webhook. Así hereda gratis el
control de monto contra manipulación, el guardián de reversas, la creación del
donante y el recibo. Un `UPDATE` a mano en la base habría dejado al donante sin
recibo y sin `donante_id` — por eso no se hizo así.

**Por qué no rompe «el webhook es la única fuente de verdad»:** esa regla existe
porque la REDIRECCIÓN del checkout la controla el navegador, y por lo tanto el
donante. Aquí no se le cree a nadie: el Worker abre él mismo la conexión a la API
de Wompi con la llave privada y lee el estado en la fuente. Es más fuerte que un
webhook firmado, no más débil. Lo que sí exige es que lo dispare una PERSONA,
igual que la verificación de transferencias.

**El candado que importa:** se comprueba que `data.reference` sea exactamente la
guía. Sin eso, quien entre al panel podría colgarle a cualquier guía el pago de
otra persona —y emitirle un certificado tributario por una plata que no puso—.
Si no coincide: 409 y **no se escribe nada**. Verificado.

`confirmacion` se marca `'conciliada'` (tercer valor, junto a `'wompi'` y
`'manual'`) ANTES de llamar a `aplicarEstado`, que solo escribe `'wompi'` si está
en NULL. Así queda escrito que el dato es de Wompi y el disparo fue de una
persona.

**Nota sobre la alarma de la Fase 8:** sigue encendida después de conciliar, y
está bien. `eventos_wompi` seguirá en 0 hasta que llegue un webhook de verdad, y
es exactamente lo que hay que seguir viendo.

## Cierre de tanda: piezas de campaña y Canva (13 ago 2026)

**El carrusel de la brigada vive en Canva y su fuente en una rama.** Diseño «Lo
que falta», **9 láminas a 1080×1350**, editable por Sebas.

**Cómo se llegó ahí, porque no es obvio:** la API de Canva **no puede cambiar la
familia tipográfica** — `format_text` no tiene ese parámetro. La única vía que
conserva Unbounded es `import-design-from-url` con HTML anotado con
`data-document-role="page"`, y eso exige una **URL pública HTTPS**. Como el repo
ya es público, la fuente vive en la rama **`pieza/carrusel-brigada`** (nunca en
`main`: `main` despliega) y Canva la importa desde el `raw` de GitHub. Detalle en
`piezas/LEEME.md`.

**Canva no acepta `.woff2`**, solo `.otf` o `.woff`, y subir la variable la
usaría en su peso por defecto (400) cuando el carrusel usa 700 — por eso en
`piezas/` hay instancias estáticas `Unbounded-Bold.woff` y `-Regular.woff`,
sacadas con fontTools. Unbounded es OFL.

**Verificado que la tipografía quedó bien**, midiendo y no a ojo: «Give&Grow
International» a 24 px mide **367,98 px** en el diseño y **368,00** en Unbounded
real (Inter daría 271,88). Ojo con las miniaturas de Canva: llegan cacheadas por
versión y me hicieron dar un diagnóstico equivocado antes de medir.

**Lo que aprendió la pieza sobre sí misma:**
- **La escala tipográfica de una pieza de feed no es la de una pantalla.** 1080 px
  se ven en un teléfono de ~390, así que un cuerpo de 24 px se ve a **8,6 px
  reales**. Se subió todo ×1,4: ahora el cuerpo va a 13,4 px reales.
- **El «qué donar» es el contenido, no el adorno.** La primera versión tenía las
  vías de pago y ninguna lista de insumos; la buena lleva las siete categorías
  del inventario con su observación y su «Trae:».
- **Todo el texto va como entidades HTML.** Un servidor sin charset declarado
  convirtió «Cómo» en «CÓ³mo»; en una pieza publicada un acento roto es fatal.

**De la investigación de referentes quedó un concepto en la lámina 5:** en
atención a desastres, las donaciones no solicitadas se llaman **«el segundo
desastre»** — llegan toneladas sin clasificar y el equipo tría cajas en vez de
atender familias. Eso **valida el «escríbenos antes de comprar»** y le da nombre.

## Cierre de tanda: ecosistema, Fase 8 — medir (12 ago 2026)

**«Medir» no tenía especificación en el repo**: vivía en el scratchpad de la
auditoría del 8 de agosto y solo sobrevivía la etiqueta «medir y limpiar». Así
que lo primero fue medir de verdad, contra la base de producción. El corte:

| | |
|---|---|
| `aportes` | **4, las cuatro en `intencion`.** Ninguna pagada, nunca. $2.725.000 |
| `eventos_wompi` | **0 — cero webhooks recibidos en la historia de la base** |
| `certificados` · `miembros` · `donantes` · `inscripciones` | **0** cada una |
| `entregas` | 1, **en borrador** (`AE-2026-000001`, ocupa el primer número) |
| numeradores | guía **1000**, acta 1, certificado sin estrenar |

**El hallazgo que gobierna la fase:** hay cuatro personas que abrieron el
checkout y **ni un solo evento de Wompi ha llegado nunca**. No existe evidencia
de que el cobro funcione en producción. El traspaso ya tenía la lección escrita
—«contra un tercero, probar contra el tercero», que costó un pago real— y aun
así nadie podía verlo, porque el panel no lo preguntaba.

Por eso la fase NO es un tablero de vanidad sobre cero datos, que sería justo el
teatro que la marca prohíbe. Es **el panel dejando de listar y empezando a
decir**: `GET /api/admin/salud` + sección «Salud del ecosistema» arriba de todo.

**Las cuatro cosas que responde:**
1. **El camino de la donación** — intenciones → declaradas → pagadas →
   piden certificado → certificados emitidos, con la tasa.
2. **Señales de Wompi** — recibidos, con firma inválida, sin procesar, y cuánto
   hace del último. Con la alarma en ámbar cuando hay intenciones y cero eventos.
3. **Esperando a una persona** — las cuatro colas con **la antigüedad del más
   viejo**, en ámbar a partir de tres días, y dónde se resuelve cada una.
4. **Intenciones abandonadas** — >48 h sin pagar y sin transacción.

**Las reglas de honestidad, que aquí no son estilo sino la marca:**
- **«Pagada» son solo `aprobada`, `en_distribucion` y `entregada`.** `reportada`
  NO cuenta: es una transferencia que el donante declaró y nadie contrastó
  todavía. Los estados van escritos uno por uno y no como `<> 'intencion'`
  precisamente para no ensanchar el significado que la Fase 5.1 cuidó.
- **Ninguna tasa con denominador cero** → `null` y el panel escribe «sin datos».
  Es MEDICION.md §5 aplicado a nosotros. (0 pagadas de 4 intenciones sí es 0 %:
  ahí el denominador existe y el 0 % es el dato.)
- **La antigüedad es el dato, no el conteo.** Una inscripción sin tocar hace
  nueve días y una de hace una hora se cuentan igual y no son lo mismo. `dias`
  es `null` cuando no hay nada esperando, no 0.
- **Nada de esto es público.** El contador público por recencia es la Fase 3 del
  plan VISUAL y sigue aplazado por decisión tuya.

**Verificado:** las cinco consultas corridas contra la base de producción (solo
SELECT) y sus números cuadran con el corte de arriba. El renderizador probado en
tres escenarios —producción hoy, base vacía del todo, y un ecosistema vivo con
firma inválida y colas de nueve días— con las etiquetas balanceadas en los tres,
«sin datos» apareciendo solo sin denominador, y el ámbar marcando ≥3 días.

**No pude ver el panel en vivo** (Access es fail-closed en local); se verifica en
producción tras fusionar.

### ⏭️ La mitad de «limpiar» son decisiones tuyas, no código
1. **Las 4 intenciones colgadas.** `GG-2026-000002` y `000003` las creó Claude
   probando el checkout. **`GG-2026-001000` es de hoy, $2.515.000, dirigida a la
   brigada, y quemó el número redondo** que este archivo reservaba para «la
   primera donación real». Borrarlas es una decisión: cada una consumió
   consecutivo y quien abrió el checkout podría volver a pagar.
2. **El acta `AE-2026-000001` sigue en borrador** y ocupa el primer número del
   consecutivo de actas. O se publica con su fecha real o se anula.
3. **Probar el cobro contra Wompi de punta a punta.** Es lo único que convierte
   el `0` de `eventos_wompi` en evidencia, y solo lo puedes hacer tú: un pago
   real, pequeño, y mirar que llegue el evento y salga el recibo.
4. Huérfanos de la auditoría que siguen ahí: `stats.json`, `prog_flow.png`,
   `ops/alma-parche-red.js`.

## Cierre de tanda: plan VISUAL, Fase 3 — Transparencia imprimible (12 ago 2026)

**No existía UNA sola regla `@media print` en el sitio.** Imprimir cualquier
página se llevaba el menú, los dos botones flotantes, la barra del recorrido y el
pie entero — y en modo noche, un rectángulo de tinta verde.

Nació con una razón concreta y con fecha: a quien se le pide una bodega, un
camión o entregar junto a nosotros para la brigada, lo primero que pregunta es
**quién es la entidad**. Esta hoja lo responde en carta, y **ninguno de sus datos
es financiero** — la regla de no publicar cifras hasta el cierre de 2025 queda
intacta. Prueba existencia y gobernanza, no dinero.

**Elemento firma: el sello** — NIT + Régimen Tributario Especial con borde, la
idea que estaba anotada como suelta desde julio. Vive **solo en el papel**: en
pantalla la página ya tiene su jerarquía y ahí sería decoración.

**Tres decisiones que hacen la diferencia en papel:**
- **La paleta de día siempre**, aunque la pantalla esté en noche. Imprimir verde
  profundo gasta tinta y se lee peor: el papel ya es el fondo.
- **Los enlaces muestran su URL** entre paréntesis. Un «Consultar en el RUES»
  impreso no lleva a ninguna parte. Los `mailto:` NO la muestran —saldría
  «(mailto:…)»— así que la dirección de contacto va una vez en el pie.
- **La hoja imprime su propia fecha**, y se recalcula en `beforeprint` porque una
  pestaña puede quedar abierta días. Una copia vieja se delata sola.
- **Tarjetas → reglas finas** y fuera los iconos: es la conversión que pide el
  plan v5, y en papel un marco redondeado no aporta nada.

### ⚠️ TINTA INVISIBLE — el fallo que casi se publica
Varias superficies del sitio son oscuras y pintan su texto en blanco (`.band`,
`.calc`, `.hero`, `.home-hub`, `.foto-banner`, `.path`, `.stats`, `.carnet`…).
Al forzar el papel a blanco, ese texto quedaba **blanco sobre blanco**: la
sección «Gobernanza y control» de Transparencia se imprimía **vacía, sin el
nombre de la Revisora Fiscal**, en un documento cuyo propósito es probar quién
responde.

**La lección de método:** el primer arreglo fue enumerar tres superficies a ojo y
se quedaron tres sueltas, que aparecieron al barrer ruta por ruta. La lista
definitiva salió de **barrer el CSS entero** buscando `color:#fff` y
`rgba(255,255,255,…)` a nivel de contenedor. Verificado después: **cero nodos de
tinta invisible en las 20 rutas del sitio.**

Si algún día se añade una sección oscura, hay que añadirla a esa lista — o su
texto se imprimirá en blanco y nadie lo notará, porque casi nadie imprime.

## ⚠️ El panel `/admin` estuvo caído 7 horas (12 ago 2026) — y el gate no lo veía

**Síntoma:** las cuatro tablas de `/admin` en «Cargando…» para siempre.
**Causa:** el `admin.js` servido no compilaba, así que no corría una sola línea.

`/admin.js` **no es un archivo del repo**: son ~490 líneas que `adminJS()`
devuelve como **template literal**. Dentro de un template, las secuencias de
escape se interpolan — y eso mordió **dos veces**:

- `\n` en el `window.prompt` de confirmar transferencias (PR #77) → salto de
  línea real dentro de una cadena entre comillas, sin cerrar.
- `/^https?:\/\//i` en la bandeja nueva (PR #79) → emitía `/^https?:///i`, con
  la expresión regular cerrada antes de tiempo.

**Dentro de `adminJS()` hay que escribir `\\n` y `\\/`.** Lo que se lee en
worker.js NO es lo que ejecuta el navegador.

**Por qué no lo atrapó nadie:** el check #1 valida la sintaxis de `worker.js`,
que compila perfectamente — el error solo existe en lo *emitido*. Y en local el
panel no se puede abrir: Access es fail-closed y devuelve 403 sin JWT, así que
«no pude verificar el panel» se volvió costumbre en tres tandas seguidas.

**Cerrado con el check #1b de `validate.mjs`**: extrae el literal de `adminJS()`,
lo **evalúa** (no lo lee como fuente) y corre `node --check` sobre el resultado.
Verificado que falla con cada uno de los dos bugs puestos de vuelta. Es el único
JS generado del repo — `grep "<script" worker.js` da una sola línea.

**La lección:** *código que se genera es código que hay que compilar.* Validar la
plantilla no es validar el producto.

## Cierre de tanda: ecosistema, Fase 3 — fundaciones y empresas (12 ago 2026)

Las **cuatro puertas de entrada del sitio terminan en la misma base y en el
mismo panel.** Ninguna en un tercero. Con esto la Fase 3 queda cerrada.

**Empresas** (`#aliados`): posteaba a un Apps Script que escribía una hoja. Ahora
`POST /api/inscripcion` con `tipo:"empresa"`. Se encontró de paso que **tres
campos se perdían en silencio**: el front enviaba `sector`, `aporta` e
`instagram` —los tres que arman la tarjeta de reciprocidad de `#empresas`— y
`HEADERS` de la hoja no tiene columna para ellos. Llegaban y se caían. Nadie lo
habría notado hasta querer publicar la primera empresa real.

**Fundaciones** (`#fundaciones`): «Quiero aplicar» sacaba del sitio a un Google
Form de 20–30 minutos con cargas de archivo que exigen cuenta de Google —
mientras el propio sitio, dos secciones más arriba, promete «Toma 10–15
minutos». Ahora hay formulario propio (`#fund-form`).

**La decisión que gobierna la fase: se pide solo lo que es TEXTO.** Identificación,
historia, misión, población, un programa. Fuera quedan costo con soporte
documental, logo, fotos y el consentimiento formal firmado — todo eso pide
archivos y, según el proceso de cinco pasos del propio sitio, va **después de la
visita de contexto**. `ops/cuestionario-fundaciones-hub.md` sigue siendo la
fuente de verdad del esquema de `partners.json` y pasó a ser lo que se envía en
el paso 4; su nota de cabecera dice qué secciones ya no hay que volver a
preguntar. **De este formulario no sale una ficha pública: sale una solicitud.**

**Detalles que conviene no perder:**
- **Sin migración.** `inscripciones.tipo` contemplaba `fundacion | empresa` desde
  la 0001 y `datos` es JSON. Cuatro tipos, una tabla.
- **Bandeja nueva «Quién quiere entrar»** en `/admin`, con los tres tipos. Los
  **voluntarios llevaban desde la Fase 3 entrando sin bandeja**: solo existía el
  contador del resumen, que dice cuántos hay y no quiénes son. La columna del
  medio resume distinto por tipo — del voluntario, si pisa territorio (dispara
  los dos protocolos); de la fundación, a cuántos llega y **cómo lleva la
  cuenta**, que es lo que decide si su cifra se publica exacta o con «≈»; de la
  empresa, la modalidad.
- **El mapeo intake → `modalidad[]` NO se automatiza**, a propósito: se guardan
  las seis casillas como las marcó la empresa y la traducción la hace una
  persona al aprobar. Traducirlo en el ingreso sería decidir cómo se publica a
  alguien antes de hablar con él.
- **Rastro de Ley 1581 al enviar, no al aprobar**: la autorización la dio quien
  aplica, no nosotros al revisar. Fila en `consentimientos` en los dos flujos.
- **`irAFormFund()` existe porque `go()` termina en `scrollTo(0,0)`** y el botón
  habría devuelto al aplicante al tope de una página de cinco secciones. Un
  ancla nativa tampoco servía: `#fund-form` no es ruta y el enrutador la
  resolvía como 404.
- Arreglado de paso: `input[type=url]` estaba fuera del selector de
  `.ally-form`, así que «Sitio web» tenía medio punto menos de borde que sus
  vecinos. Afectaba también al formulario de aliados.

**Verificado en local** (wrangler dev + D1 migrada): 11 casos por `curl` —alta
completa de los dos tipos, modalidad ausente, Gratitud sin beneficio,
autorizaciones incompletas, personería inventada, población vacía, declaración
de veracidad ausente, tipo desconocido— más el honeypot, que responde `ok` y
**no** inserta. Población basura (`<script>`) se filtra contra la lista blanca.
Envío real de los dos formularios desde el navegador, con sus mensajes de error
en cadena y el reseteo del formulario. Los cuatro correos se disparan. El
renderizador de la bandeja, corrido contra las filas reales, genera `<small>`
balanceados en los tres tipos.

**Lo que NO pude verificar y hay que mirar:**
- **El panel `/admin` en vivo.** Access es fail-closed y en local devuelve 403
  sin JWT: probé la consulta y el renderizador por separado, no la página.
- **El scroll de «Quiero aplicar»**: el navegador de la sesión tiene el viewport
  degenerado (`window.scrollTo` no mueve nada), así que confirmé que la función
  corre y que el foco aterriza en el primer campo, pero no vi el desplazamiento.
- **Sign-off visual** del formulario en día y noche, escritorio y móvil.

**Pendiente de Sebas, en Google (no es código):** retirar la implementación de
la aplicación web del Apps Script de aliados. Mientras siga publicada acepta
POST de cualquiera y escribe filas que ya nadie mira.

Cache-bust: styles `9187e7c8`, app `2187163b`.

## Cierre de tanda: la brigada del terremoto (11–12 ago 2026)

Un sismo de **magnitud 7,4** el 10 de agosto, epicentro cerca de San José del
Palmar (Chocó), 103 km de profundidad, según el Servicio Geológico Colombiano;
desastre nacional declarado. Give&Grow sale con siete personas a **Cali,
Pereira, Manizales, Armenia y Chocó**, más de 100 familias por sector, con
fundaciones del territorio (modalidad HUB). Contexto completo en la memoria
`givegrow-brigada-terremoto`.

**Las cifras de víctimas NO se publican, a propósito.** El 11 de agosto las
fuentes iban de 132 a más de 240 en horas. La página dice quién las publica y
por qué no las repetimos. Si alguien propone añadirlas, ese es el motivo.

### Lo que entró (PRs #63 a #75, todos en producción)
- **#63** `#donar` reordenado: el pago cierra la calculadora, lo demás se junta.
- **#64 y #65** Fase 5 y 5.1: recibo automático, certificado firmado a mano, y
  los tres huecos de integridad (reversa, identidad, sello de anulado).
- **#66 y #67** La brigada como destino propio en la calculadora, con enlace
  corto `#brigada`, aporte único forzado y sin nivel de membresía.
- **#68** La página de la campaña, con los hechos del sismo verificados.
- **#69 y #72** Fase 6: actas de entrega con foto en R2, y el candado de fecha
  futura que nació de la prueba real.
- **#70 y #71** Dos acopios (Give&Grow y Nativos), fuera la regla de la ropa
  usada, el enlace de pago de Wompi y la conciliación de «pagos sin aporte».
- **#73** Formulario de ofrecimientos en especie, sin migración.
- **#74** El rastreo lee D1 y muestra las entregas del destino.
- **#75** El carnet de miembro y la auditoría de promesas: el sitio prometía
  credencial y reporte fotográfico mensual sin una línea de código detrás.
- **#77** Reporte de transferencias bancarias con comprobante y verificación
  manual, sin romper el significado de `aprobada`.

### Las tres lecciones de esta tanda
1. **Una promesa publicada es una función pendiente.** El sitio prometía carnet
   y reporte fotográfico mensual sin una línea de código detrás, y prometía
   actas antes de tener dónde guardarlas. Auditar el diccionario contra el
   código encontró más deuda que leer el código solo.
2. **Un paso manual que tumba el cobro es un incidente que todavía no ocurrió.**
   La migración 0003 se perdió pese a estar escrita en tres sitios; hoy el
   despliegue se niega a salir si la base no está migrada.
3. **Dos sistemas que numeran lo mismo terminan chocando.** D1 y la hoja de
   cálculo emitieron las mismas tres guías para donaciones distintas. Nadie lo
   habría notado hasta que un donante rastreara la donación de otro.

## Cierre de tanda: ecosistema digital, Fase 5 — los documentos (11 ago 2026)

El recibo y el certificado de donación, en PDF, armados en el Worker con
`pdf-lib` — la **primera dependencia npm del repositorio**.

**La decisión que gobierna toda la fase** es que los dos documentos no son la
misma cosa con distinta plantilla:

- El **recibo** lo emite el sistema al confirmarse el pago, y puede hacerlo
  porque no afirma nada tributario. Lo dice en su propio cuerpo: «no es el
  certificado de donación para efectos tributarios».
- El **certificado** es una declaración *bajo la gravedad de juramento* que
  firman el Representante Legal y la Revisora Fiscal. Lo emite una PERSONA desde
  `/admin`. Automatizar la emisión sería automatizar el juramento de otro.

Automatizado: numerar, armar, congelar, archivar, enviar. Nunca: decidir que se
emite. Es exactamente el ciclo que ya pedía `ops/arquitectura-donaciones-membresias.md` §5.

**El texto del certificado lo suministró la contadora** y de paso cerró la
inconsistencia tributaria que estaba abierta: es **Art. 257, 25%**, con el límite
del 258 — o sea, lo que el SITIO decía. Los documentos del Drive que hablaban de
Art. 125 / 125% son los que están mal. No se editó el articulado; solo se
resolvieron sus variables de plantilla y se retiró la rama de «bienes en especie»
de los numerales 3 y 5, que no aplica a un pago por pasarela.

**Detalles que conviene no perder:**
- **El recibo exige token** (128 bits, creados en el checkout). La guía es
  consecutiva: sin token, contar desde `GG-2026-000001` sería cosechar nombres y
  dedicatorias. Token malo y guía inexistente devuelven **el mismo 403**, para no
  dejar un oráculo de qué guías existen.
- **El snapshot del certificado se congela al emitir** (`certificados.datos`). Si
  el donante corrige su nombre después, el PDF que ya tiene la DIAN no cambia.
- **No se borra, se anula**, con motivo. El consecutivo conserva el hueco.
- **La revisión humana es el formulario, no el botón**: Wompi no entrega
  domicilio, así que el panel abre los campos, quien emite completa, y sin
  nombre/documento/domicilio el endpoint responde 422.
- **Recibo por enlace, certificado por adjunto.** El recibo lo dispara el webhook
  de Wompi, que debe responder rápido; el certificado lo manda una persona.
- **Tipografía Helvetica, no Unbounded.** Las de marca son woff2 y pdf-lib no las
  lee; convertir y embeber costaría cientos de KB en el bundle del Worker.

**Lo que se encontró de paso:**
- `wrangler d1 migrations apply` **falla sobre una base limpia**: `0002_idioma.sql`
  inserta su propia fila en `d1_migrations` y el comando la inserta otra vez
  (`UNIQUE constraint failed`). La 0003 ya no lo hace.
- El gate solo comprobaba la sintaxis de `app.js`. `worker.js` nunca se validó, y
  ahora además importa. Se añadieron los tres archivos y un
  `wrangler deploy --dry-run` en `ci.yml`, que es lo único que ve el enlazado.

**Verificado en local** (wrangler dev + D1 real): recibo 200 con token, 403 con
token malo, 403 sin token, 403 en guía inexistente, 409 en aporte sin pagar;
cabeceras `private, no-store` y `noindex`; consecutivo `CD-` atómico (1,2,3);
índice de «un solo certificado vigente» bloqueando el duplicado y permitiendo la
reexpedición tras anular; `node_modules` NO se publica (los 200 de `/worker.js` y
compañía son el fallback de SPA sirviendo `index.html`, no los archivos);
23 casos de número-a-letras, incluidos «veintiún mil» y «un millón».
Bundle: 915 KB, 240 KB gzip.

## Cierre de tanda: ecosistema digital, Fases 0 a 4 (8–11 ago 2026)

Nació de una auditoría que Sebas pidió con una frase: que todos los procesos se
pudieran hacer automáticos desde el sitio. El diagnóstico fue que de once flujos
solo dos funcionaban solos y **ocho terminaban en él**. Lo que quedó construido:

- **Pago con Wompi de punta a punta** (PRs #50, #51): checkout firmado en el
  Worker → webhook idempotente como única fuente de verdad → página `/gracias`
  que dice «estamos confirmando tu pago» porque ningún método de Wompi es
  sincrónico. La guía `GG-YYYY-NNNNNN` **es** la `reference` de Wompi.
- **Base privada D1** con datos personales aislados en una sola tabla (#49).
- **Entorno de pruebas** con su propia base, para no poner producción en sandbox
  ni contaminar el ledger real (#52).
- **Correo transaccional** con Resend desde un subdominio propio, en el idioma del
  donante (#54, #56, #57).
- **Panel `/admin`** tras Cloudflare Access con verificación real de firma RS256,
  que **no puede mover estados de pago** a propósito (#55, #59).
- **Formulario de voluntariado**, que no existía: el botón «Quiero participar»
  llevaba al formulario de EMPRESAS (#61).
- **Dominio autenticado**: SPF y DKIM pasan y **alinean** (#60).

### Lo que se encontró de paso, y valía más que la tarea
- **Se publicaba el repositorio completo**: `/.git/HEAD`, `/.git/config` y
  `/.git/index` respondían con contenido real. El repo ya es público, así que no
  se filtró nada confidencial, pero era superficie innecesaria — y era la mayor
  parte de los 2.874 archivos de cada despliegue (el redespliegue bajó de 95 s a 5).
- **~700 despliegues fantasma al mes**: el inventario recommiteaba su marca de
  tiempo. 722 commits en 31 días, los últimos 40 sin un solo cambio de dato.
- **48 KB de notas internas públicas** (`SESSION_HANDOFF.md` entre ellas).
- **El FAQ del JSON-LD tenía 8 respuestas desfasadas** que Google leía, una
  prometiendo «próximamente habilitaremos tarjeta y PSE vía Wompi» con Wompi vivo.
- **El sitio anunciaba PSE y Nequi** y Wompi solo tiene `CARD` y
  `BANCOLOMBIA_TRANSFER` habilitados en producción.

### Las dos lecciones que conviene no reaprender
1. **Las pruebas sintéticas confirman tus propias suposiciones.** La batería de
   pagos pasaba 10/10 mientras producción rechazaba **todos** los webhooks: la
   documentación de Wompi pone el `timestamp` dentro de `signature` y el evento
   real lo trae en la raíz. Contra un tercero, probar **contra el tercero**.
2. **Idempotencia es «ya lo procesé», no «ya lo vi».** Un evento rechazado por ese
   bug bloqueaba su propio reintento después del arreglo, dejando el aporte en
   `intencion` para siempre. Costó un pago real de prueba.

## Cierre de tanda: plan de VOLUNTARIADO, Fase 7 — medición visible (ago 2026)

Publicó `MEDICION.md` en el sitio. Dos hogares, porque los pasos tenían dueños distintos:

- **`#impactos` · nueva fila "Anatomía de una jornada"** — segundo `.rec-ledger`, hermano del de
  donación (*lo que se acuerda antes* / *lo que queda al cerrar*). **Elemento firma de la fase**,
  con cero CSS nuevo.
- **Ruta nueva `#medicion` · "Hasta dónde podemos afirmar."** — dropdown *Nosotros*, nav móvil y
  footer. Contribución vs. atribución como par en Fraunces; **la escalera de tres peldaños**
  (elemento firma de la página); 7 reglas de publicación; plantilla de reporte como bloque-documento;
  tabla de mapeo ODS/GRI/ESG; cierre en `.band` pidiendo el psicólogo voluntario.

**Las dos decisiones que estaban abiertas, ya cerradas:**
- **Mapeo ODS/GRI/ESG → público**, como referencia, con la nota de que no auditamos el reporte de la
  empresa ni certificamos su cumplimiento.
- **Contador por recencia → espera.** No hay fuente de datos de jornadas; escribirlas a mano viola
  `MEDICION.md` §5. Su hogar es la **Fase 3 del plan VISUAL** (Transparencia imprimible). Lo que sí
  entró fue la *regla* como principio publicado.

**Detalles que conviene no perder:**
- El peldaño ③ (SROI) lleva numeral **hueco** (`-webkit-text-stroke`) y pastilla **punteada**: el
  estado se lee antes que el texto. El trazo va en `--mu` y no en `--bd` porque con `--bd`
  desaparecía en modo noche (~1.5:1) y con él el gesto entero.
- Regla dura respetada: **ni un ratio de SROI, ni ejemplos ilustrativos.**
- Trampa vivida: retoqué `styles.css` **después** del rebust y el navegador sirvió CSS viejo.
  Recalcular los hashes **al final de todo**, nunca a mitad.

## Cierre de tanda: plan de VOLUNTARIADO, Fases 1–6 (ago 2026)

Nació de **13 preguntas que Sebas trajo de un congreso de voluntariado corporativo**. Todo el plan,
las decisiones cerradas y los hallazgos viven en **`PLAN_VOLUNTARIADO.md`** — leerlo antes de seguir.
Documentos que produjo: `VOLUNTARIADO.md` (el programa), `METODOLOGIA_MIRA.md` (el marco pedagógico),
`MEDICION.md` (medición y ruta a SROI).

### Qué entró (PRs #40 a #44, todos en prod)
- **Fase 1 · sanear (#40):** `#empresas` afirmaba *"Ruta 4, ya operativa"* — sobre-anuncio: las
  jornadas ocurrieron con **donantes y aliados**, nunca con un equipo de empresa. Corregido también
  `hub.r4.p` ("Se activa en 2026" era falso) y la referencia rota "empleo (R4)" en `hub.r5.p`.
- **Fases 2–4 · definir (#42):** los tres documentos. Incluye el cambio de nombre de la metodología
  **ACPES → MIRA** (Marco · Inmersión · Reflexión · Anclaje), la ruta de 3 peldaños hacia SROI y la
  regla dura de **no publicar ratios de retorno social**.
- **Fase 5 · página `#voluntariado` (#43):** tres niveles, el método MIRA explicado completo y el
  **diagrama de doble vía** como elemento firma.
- **Fase 6 · `#hub-formacion` "La red ya forma" (#44):** los 6 programas formativos de la red, con
  el crédito a las fundaciones. Nuevo flag `formativo: true` en `profile.programs[]`.

### Decisiones de Sebas que gobiernan este trabajo
- **Tres niveles de voluntariado, y el nivel lo define el TERRENO, no el oficio**: con el HUB /
  con Give&Grow / **Mixto**. Dos protocolos con disparadores independientes: el **de cuidado** lo
  dispara pisar el territorio; el **de imagen**, la cámara (cualquier nivel, incluido un celular).
- **Nada se cobra** por ahora. **Sin mínimo de compromiso** (por eso la fase Marco es obligatoria).
- **No hay psicólogo** → la metodología **observa, no mide clínicamente**. Un psicólogo voluntario
  pro-bono es la llave del peldaño 2 de medición.
- **Registro cálido en lo público**: rechazó "la fundación aprueba y puede decir no" por apático.
  La fundación **no es un filtro, es la anfitriona**. En documentos internos sí va lenguaje técnico.
- **No hay SROI** y no se puede insinuar que sí.

### Pendiente de Sebas (no bloquea código)
- **Registrar marcas en SIC**: ya buscó **MIRA, GIVE&GROW e ImpactOS** y quiere registrarlos.
  Decidió hacerlo **al terminar todas las fases**.
- Datos de las 2 empresas a las que envió el formulario · inconsistencia tributaria (Art. 257/25%
  del sitio vs Art. 125/125% de los documentos del Drive, que corrige con un profesional) · buzón
  `privacidad@` · regla WAF para el worker de ALMA.

## Cierre de tanda: v5 FASE 2 — desinflar ImpactOS, liberar ALMA (31 jul 2026)

`#alma` era **la página más larga del sitio**: 7 secciones, 5.165px, 7,2 pantallas,
18 tarjetas y 8 sellos de "en construcción/desarrollo" contra 1 solo "Activo". 84 claves
i18n (11,5% del diccionario) describían software inexistente. Quedó en **1 sección,
1.169px, 1,6 pantallas** — de la página más larga a la más corta. Medido a 1280×720.

- **Ruta renombrada `#alma` → `#impactos`.** `#alma` sobrevive como alias en `go()`:
  aterriza en `#impactos`, corrige el hash y abre el panel. Ningún enlace externo se rompe.
  Añadida al menú "Nosotros" (escritorio y móvil); antes la página no estaba en el nav.
- **Tres bloques con reglas de 1px** (`.os-rows`/`.os-row`), sin tarjetas ni sellos:
  qué es · qué está vivo hoy (HUB SOCIAL, con enlace a `#hub`) · hacia dónde va.
  **Los 7 módulos sin construir se borraron por decisión de Sebas** — nombrar producto
  inexistente es la promesa que la marca prohíbe. Ese material va a dossier, no al sitio.
- **ALMA es panel lateral, no página.** `<aside id="alma-panel">` fuera de las `.page`,
  disponible en cualquier ruta. Papel (`--surface`), reglas de 1px, radio 2px, **cero
  sombra** (verificado: `box-shadow:none` en panel y botón). Cierra por ✕, scrim, Esc y
  retorno de foco al disparador; `aria-modal`, trampa de Tab, `prefers-reduced-motion`.
  Los chips se arman con `currentRoute`: abrirlo en Transparencia ofrece preguntas de
  trazabilidad. Contraste AA en ambos modos (mín. 5,71 día / 6,44 noche).
- **El disparador dejó de ser burbuja SaaS**: rectangular, radio 2px, sin brillo ni rebote.
- Los CTA "Hablar con ALMA" (`#donar`, `#faq`) pasaron de `<a href="#alma">` a
  `<button data-act="almaPanel(true)">`: abren el panel sin sacarte de la página.

**Dos bugs de fondo encontrados y corregidos:**
1. **El despachador `data-act` convertía `false` en la cadena `"false"` — que es
   verdadera.** Cualquier `data-act` con booleano hacía lo contrario de lo que decía.
   Ahora parsea `true`/`false` como booleanos. Era la razón de que el scrim no cerrara.
2. **7 claves ES duplicadas** en el diccionario (5 mías al migrar, más `nav.faq` y
   `a11y.skip` que venían de antes). En un literal JS gana la última, así que el valor
   nuevo quedaba silenciado. **Nuevo check #5b en `validate.mjs`** que falla el build.

Diccionario 731 → 676 claves. Paridad 676/676. Gate completo en verde.
Cache-bust: styles `227605f6`, app `494bd381`.

**Deuda anotada:** el botón de WhatsApp sigue siendo un círculo verde con brillo, ahora
incoherente al lado del disparador sobrio de ALMA. Y el naranja `#B4690E` sigue inline en
la leyenda del mapa. Ambos son Fase 4 (sistema visual).

## Cierre de tanda: v5 FASE 1 — correcciones de credibilidad (31 jul 2026)

**Hallazgo de fondo: `index.html` se publicaba como cascarón hueco.** De 644 nodos
`data-i18n` de texto, 297 estaban vacíos y 19 desfasados del diccionario ES. La SPA los
rellenaba en runtime, así que en el navegador todo se veía bien — pero crawlers, previews
de enlace, modos lectura y cualquier extractor de texto leían viñetas vacías, enlaces sin
etiqueta y titulares mal escritos. Los 5 síntomas que reportó Sebas eran ese único fallo.

- **`scripts/hydrate-i18n.mjs`** — escribe el texto ES dentro de cada `data-i18n` de
  index.html. Idempotente. `--check` reporta sin escribir. Lógica compartida en
  `scripts/i18n-html.mjs` (lee el dict evaluando el literal `es:{}`, no con regex).
- **`validate.mjs` check #6** — falla el build si el HTML difiere del diccionario ES.
  Antes el gate verificaba que la clave *existiera*, nunca que el texto *coincidiera*;
  por eso la deriva fue invisible. **Si editas textos en el dict ES, corre el hidratador
  antes de commitear** o el gate te frena.
- **Tildes ALMA/ImpactOS** corregidas (11 nodos) — venían del fallback estático, el
  diccionario siempre estuvo bien.
- **Deriva de copy corregida**, notablemente `stat.pobl`: el HTML decía "Poblaciones
  impactadas" (claim de impacto consumado) donde el dict dice "Poblaciones que buscamos
  alcanzar". Era un claim sin evidencia fosilizado en el archivo servido.
- **404 fuera del documento** — `<main id="page-e404">` era la primera página del HTML;
  ahora vive en `<template id="tpl-e404">` y lo monta `ensureE404()` en app.js al pedir
  una ruta inexistente. Verificado: no existe en el DOM hasta que hace falta, y monta
  hidratado en el idioma vigente.
- **Red duplicada resuelta** — el muro `#net-wall` de Impacto repetía el titular de
  `#hub` *y* los datos del mapa que tiene encima. Eliminado; queda un enlace al HUB
  (clave nueva `net.hub`). Arrastró `renderWall`, `netTypeKey`, `NET_COLORS`, las reglas
  `.net-card`/`.net-dot` y 6 claves i18n huérfanas.
- **Guiones de la calculadora** — `co-tax`, `co-net`, `calc-annual`, `m-sub` publicaban
  un `-` literal y `m-name` decía "Semilla" cuando el default es "Árbol". Ahora llevan
  el valor real del estado por defecto ($200.000/mes COP); `calcUpdate()` los recalcula
  igual. `co-impact` queda vacío a propósito: depende de partners.json.

Paridad i18n 729/729. Gate completo en verde. Cache-bust: styles `6453c986`, app `6b1c4412`.

**Deuda que quedó anotada, no resuelta:** el naranja `#B4690E` (fuera de paleta) sigue
en la leyenda y los pines del mapa, con los colores escritos inline en app.js. Es tema
de la Fase 4 (sistema visual), no de esta.

## Cierre de tanda: empresas aliadas, legal, ficha y fin de la auditoría (PRs #21–#34, ago 2026)

**El sitio quedó en punto de lanzamiento. Sin PRs abiertos.** QA de pre-lanzamiento: 0 enlaces
internos rotos (19 páginas), meta/OG/twitter/canonical/favicon completos, 0 errores de consola
(incl. mapa Leaflet), 0 imágenes sin `alt`, `prefers-reduced-motion` cubierto, formularios sanos.

### Qué entró
- **Cierre del plan de auditoría**: Bricolage→Unbounded (fuente huérfana de 131 KB eliminada),
  tramo a11y (labels `for`, tablist ARIA en pagos, `#lightbox` como dialog con foco, contrastes
  noche, `.sr-only`), SEO (`noindex` en vista 404, twitter cards, título de 404).
- **Empresas aliadas** (`#empresas`): muro alto con tarjeta de reciprocidad `.pcard-emp`
  (modalidad en ámbar + líneas Aporta/Recibe), misma fuente que fundaciones. Estado semilla
  honesto mientras no haya empresas verificadas.
- **Aliadas que aportan** (`#hub`): fundaciones que fortalecen el Hub en vez de recibir.
- **Formulario de aliados endurecido**: exige ≥1 modalidad, honeypot `#ally-website2`,
  condicionales obligatorias (Gratitud→beneficio, Servicios→detalle) y campos nuevos
  (sector, aporta, web/instagram separados) que alimentan la tarjeta.
- **`#privacidad`**: Política de Privacidad y Tratamiento de Datos bilingüe, publicada desde el
  documento del Drive; enlazada en footer y en el checkbox de datos. Sección de cookies
  **adaptada a la realidad del sitio** (Cloudflare sin cookies; el doc genérico mencionaba
  GA/Meta/LinkedIn que aquí no existen y la CSP bloquea).
- **ALMA**: el front envía solo `{messages}` (el worker fija modelo/system/max_tokens). Chip
  más humano. Worker v2 verificado en vivo: origin-locked, rate-limit, parámetros server-side.
- **Ficha de fundación**: `profile.tagline` bajo el nombre, nombres de directores retirados, y
  el CTA `donarA(unitId)` abre la calculadora con esa fundación **ya preseleccionada** (deja
  `calc.partnerId` → el draft queda `modo:"dirigida"`, base de recibos y trazabilidad).
- **Mapa**: conteo de la red con pluralización real y término "empresa aliada" (no "comercio").

### Modelo de datos (`data/partners.json` — leer su `_doc`)
- Fundaciones: `rol` = `['recibe']` y/o `['aporta']`; **sin `rol` se asume `['recibe']`**
  (retrocompatible). Una solo-aporta no aparece como beneficiaria.
- Empresas (`type:company`): `modalidad[]` (`padrinazgo|journey|alianza|gratitud`), `sector`,
  `aporta`, `recibe`.
- `profile.tagline{es,en}` opcional. `consent{}` gobierna logo y galería; `consent.grantedBy`
  conserva nombres a propósito (rastro Ley 1581) y **no se renderiza**.

### Trampas para la próxima sesión
1. **Cache-bust = conflicto recurrente.** Si dos ramas tocan `app.js`/`styles.css`, la segunda
   choca en el hash de `index.html`. **No resolver en el editor web de GitHub** (deja un hash
   que no corresponde al archivo fusionado). Resolver local: fusionar `main`, **recalcular**
   `md5 -q app.js | cut -c1-8` y usar ese valor. Ocurrió en #24, #30 y #33.
2. **El worker de ALMA no se despliega desde este repo** (worker aparte `givegrow-alma`; aquí
   se despliega `worker.js` = `givegrow-website`). `ops/givegrow-alma-worker-v2.js` es la fuente.
3. **"Compartamos con Colombia" sigue prohibido** en toda la comunicación. Se mencionó como
   ejemplo de aliada-que-aporta y **no se publicó**; confirmar antes de nombrarlo.
4. **La unidad "plato de comida" no se toca**: la frase del dossier es específica de ese
   programa; la comida siempre se necesita y lo que sobra en un lado se lleva a otro.

### Pendientes (esperan insumos, no código)
- Datos de las **2 empresas** a las que Sebas envió el formulario → cargar en `partners.json` y
  activar su presencia en `#gratitud` (filtro de una línea para modalidad `gratitud`).
- **Inconsistencia tributaria**: el sitio dice **Art. 257 / 25%** (consistente); documentos del
  Drive dicen **Art. 125 / 125%**. Sebas lo corrige **con un profesional** — no tocar los docs.
- Confirmar que el buzón **privacidad@thegiveandgrowproject.org** esté activo.
- **Regla WAF de rate-limit** para el worker de ALMA (dashboard Cloudflare).
- Logos → webp diferido (5 logos, ~176 KB, lazy; mejor en el pipeline `alta-automatica.gs`).
- Ideas grandes de UX **diferidas a propósito** hasta tener entregas reales que mostrar
  (rastreo como vitrina, tira de entregas trazadas, red en el home, tira de confianza).

## Cierre de tanda: etiqueta calculadora + MODELO DE TRABAJO reafirmado (17 jul 2026)
Commit `9c5bc3bb` (deploy Actions success). 4 archivos en un commit atómico (Trees API).
- **Etiqueta nueva sobre el toggle Persona/Empresa de la calculadora.** ES
  `"¿Aportas como persona o empresa?"` / EN `"Are you donating as an individual or a
  company?"` (clave nueva `calc.tipo.lbl`, paridad 682/682). Reusa el estilo de
  `.calc-dest-lbl` (selector compartido `.calc-dest-lbl,.calc-cap` en styles.css) → cero
  tokens nuevos; la tarjeta `.calc` es `--navy` con texto blanco en día Y noche (sin
  override), así que el contraste es idéntico en ambos modos. A11y: el toggle ahora es
  `role="group"` con `aria-labelledby="calc-tipo-lbl"`.
- **Copy PENDIENTE de decisión de Sebas.** Puse `"¿Aportas como persona o empresa?"`
  (institucional, aclara que cambia el cálculo del beneficio). Sebas pidió "algo como
  ¿Qué eres?". Alternativas de un renglón (editar `calc.tipo.lbl` ES/EN): `¿Persona o
  empresa?` · `Selecciona tu perfil` · `¿Qué eres?`. Cambio trivial cuando decida.
- Cache-bust actualizado: styles `d7794fd2`, app `4e1fd8b4`.

**MODELO DE TRABAJO (reafirmado por Sebas esta sesión) — leer y respetar:**
- El **proceso creativo (planes + lluvia de ideas) se hace en el chat claude.ai**, pensando
  siempre en las capacidades de **Claude Code** (agente de escritorio), sus integraciones
  (MCP: Drive, Gmail, Calendar, Cloudflare, Canva, Slack, Wix, WordPress, Fathom) y los
  plugins/skills disponibles.
- **Sebas copia el plan en Claude Code de escritorio y lo ejecuta ahí.**
- **Luego Sebas y Claude (chat) auditan y supervisan** el resultado.
- Coherente con la sección "Claude Code adoptado — Opción A": Code trabaja en ramas
  `claude/<tema>`, PR, revisión, Sebas fusiona. Regla anti-pisotón: un solo actor escribe
  al repo a la vez.
- **Token:** para AUDITAR desde el chat basta SOLO LECTURA (Contents:Read). Solo pedir
  escritura si Sebas encarga una ejecución puntual desde el chat (como fue esta tanda de la
  etiqueta, hecha por excepción con token de escritura de sesión).
- PENDIENTE Sebas: sign-off visual de la etiqueta (desktop + móvil, día + noche);
  decidir el texto final; revocar el token de escritura de esta sesión al cerrar.

## Cierre de tanda: logo Conciencia + Kore en mapa + ocultar 2 bloques
Commit `9dbaf72c` (deploy success). 7 archivos en un commit atómico.
- **Logo de Conciencia ALOJADO.** Sebas lo adjuntó por el chat (flujo previsto). Optimizado
  a /img/conciencia_logo.png (512px, PNG paleta 48 colores, 13KB, transparencia ok);
  partners.json logo path seteado (consent.logo ya era true). Ficha ya muestra el logo.
- **Fase 2b HECHA — Kore en el mapa.** gratitud.json: Kore con `direccion`
  ("Dg. 33 #32A Sur 34, Zona 9, Envigado, Antioquia") + `coords` {lat 6.1701, lng -75.5905}
  (ZONA APROX. de Envigado; la precisión real la da el enlace a Google Maps). app.js: el mapa
  ahora une partners + comercios activos con coords (marcador `company` ámbar, ya existía el
  CSS .gg-pin-company). Popup de comercio: enlace a ficha (`go('comercio/id')`) + Google Maps.
  Ficha de comercio: línea de dirección + "Cómo llegar" (Maps). i18n: quitado "próximamente"
  de map.leg.c; nuevas map.biz/com.maps (688/688).
- **OCULTAS por decisión de Sebas (comentadas en index.html, restaurables):**
  (1) bloque de stats de zona del inicio (5 Rutas / 8 Poblaciones / 100% Trazabilidad /
  2025) — "para el futuro"; (2) contadores de donaciones/entregas en vivo (#live-stats +
  live-note) — "hasta tener más datos". JS null-safe (updateLiveStats guarda); claves i18n
  (stat.*, live.*) conservadas en ambos diccionarios.

PENDIENTE de confirmar por Sebas: coords aprox. de Kore (Envigado) y de Conciencia
(Nueva Jerusalén); visual del cupón, del logo en ficha, y del mapa con el pin de Kore.

## Etapa 2 FUSIONADA por Sebas + auto-merge gateado configurado
- **PR #1 (tipografía E2) fusionado por Sebas** → en producción. Revisión chat funcionó:
  atrapó cache-bust faltante antes del merge.
- **Auto-merge nativo configurado** (commit ci.yml `99676d0d` + settings):
  (1) `.github/workflows/ci.yml`: job `validate` corre en cada PR → gate validate.mjs
  + chequeo AUTOMÁTICO de cache-bust (md5 real de styles/app vs declarado en index.html).
  (2) Repo: `allow_auto_merge=true`. (3) Protección de `main`: check `validate` requerido,
  `enforce_admins=FALSE` — decisión deliberada: mantiene vivos los push directos del dueño
  (automatización de inventario Apps Script y commits del chat); solo los PRs quedan gateados.
- **USO del auto-merge**: en el PR, botón "Enable auto-merge" (o Code: `gh pr merge --auto
  --squash`). Se fusiona SOLO cuando `validate` pasa. Merge a main → deploy automático.
- Flujo vigente: rutinario = auto-merge; sensible/visual = revisión chat + merge de Sebas
  (o Claude bajo orden explícita con token de escritura de la sesión).

## Claude Code adoptado — flujo Opción A configurado (commit `f4df5b8e`)
Sebas montará Claude Code (app de escritorio) para el trabajo visual. FLUJO ACORDADO:
Claude Code trabaja SIEMPRE en ramas `claude/<tema>` (nunca main) → push + PR → revisión
por Claude (chat claude.ai, vía API sobre la rama) → Sebas fusiona → Actions despliega.
- Config en repo: `CLAUDE.md` (memoria de proyecto: gate, cache-bust crítico por immutable,
  datos, seguridad, reglas de contenido/marca, preview local, continuidad),
  `.claude/settings.json` (comandos seguros pre-aprobados; push a main/force/rebase
  DENEGADOS), `.claude/skills/givegrow-design-system/` (sistema de diseño versionado).
- División de trabajo: Claude Code = visual/iterativo con preview local (v5 E2/E3,
  tarjetas→reglas); este chat = diagnóstico, revisión de ramas, datos, altas.
- Regla anti-pisotón: un solo actor escribe al repo a la vez.
- BENEFICIO CLAVE: se acaban los tokens de GitHub pegados en el chat (Code usa el Git
  local autenticado). Para revisión de ramas, este chat seguirá necesitando token de
  SOLO LECTURA (scope Contents:Read basta) — pedirlo así, ya no de escritura, salvo
  tareas que Sebas pida ejecutar desde el chat.

## Rediseño v5 Etapa 1 DESPLEGADO + auditoría de seguridad completa
Sebas: "quita Estado financiero 2025 y ejecuta directamente, no me muestres". Aprobó
desplegar a producción sin preview. Dos commits separados:
- **Seguridad `efed197a`** — auditoría XSS completa de TODOS los sinks innerHTML. Además de
  A1 (renderFicha/mapa, ya en prod), se hallaron y cerraron 3 huecos más: renderWall
  (muro: p.name/area/url), renderAliadas (grid fundaciones: id/logo/name/pob/area) y el
  <select> de la calculadora (optgroup p.name + option label + ids). trackNotFound ya
  escapaba input de usuario; almaFmt escapa <>& antes de formatear. Verificado que todo el
  trabajo previo (A1-A4, mini-calc, filtros mapa, Kore coords, Conciencia logo, calc clamp,
  menú B, Unbounded) está en main.
- **Etapa 1 `0d3aa121`** — "papel y familia" por cascada de tokens (día): --bg papel hueso
  #F3EFE6, --surface #FBF8F1, --ink cálido #191813, --ink-soft #47443B, --bd hairline cálido
  #DAD3C3; UNIFICACIÓN navy→verde profundo (--navy #0E2118 → calc/footer/ALMA/banda dejan el
  azul marino); radios --rl 18→13 y calc/alma 24→16. Modo noche INTACTO (su propio --navy
  verde). Whites hardcodeados = tiles de logo (legítimos). Reversible (token-level).
- **Transparencia real: YA cumple la regla** — no expone cifras de ingresos/gastos, es por
  principios ("publicaremos cifras solo cuando estén validadas") + obligaciones legales.
  No había dato sensible que quitar. La fila "Estado financiero 2025" era solo de la maqueta
  (ya eliminada).

PENDIENTE (crítico): **verificación visual de Sebas** de la Etapa 1 en producción, día y
noche — Claude NO puede renderizar. Si algo se ve mal, es revert de 1 commit o ajuste de 1
token. NO hecho a propósito (riesgo ciego): conversión tarjetas→reglas finas en secciones
piloto (Transparencia/Membresías) — es el siguiente increment, hacerlo tras su sign-off del
papel. E2 (escala tipográfica, cifra monumental) y E3 (foto a sangre, ledger, recorrido)
siguen pendientes.

## Maqueta v5 Etapa 1 aprobada en dirección + 2 reglas permanentes (Sebas)
- **Maqueta v5 Etapa 1**: entregada como HTML standalone (outputs/givegrow-v5-maqueta-
  etapa1.html) con toggle día/noche. Sebas: "Me gusta". Dirección aprobada (papel hueso día /
  verde-negro noche, navy→verde-tinta unificado, reglas finas en vez de tarjetas, escala
  editorial, cifra monumental de red, Transparencia libro mayor). Unbounded para títulos
  CONFIRMADA como display de marca. PENDIENTE: su "sí, despliega" para llevar Etapa 1 a
  producción (token funciona).
- **REGLA PERMANENTE — Transparencia sin datos financieros sensibles hasta el cierre 2025.**
  Decisión de Sebas: NO publicar ingresos/gastos/totales (ni ceros) antes del cierre anual.
  La sección Transparencia muestra solo lo verificable hoy (fundaciones/comercios/entregas)
  + "Estado financiero 2025: cierre en curso". El estado financiero completo se publica al
  cierre de 2025. Aplicar esto en el rediseño de la página real, no solo en la maqueta.
- **REGLA PERMANENTE — derechos de imagen.** Fotos subidas por LAS FUNDACIONES = propiedad
  de ellas, uso SOLO con su consentimiento (protección de imagen de menores, Ley 1581).
  Imágenes que SEBAS adjunta para construir la web = uso libre. Mantener la página muy
  visual apoyándose en fotografía; poblar bandas/galerías con imágenes de uso libre de Sebas
  + fotos de fundaciones ya consentidas. NUNCA meter rostros/menores en artefactos
  descargables sin consentimiento.

## DIAGNÓSTICO VISUAL "REDISEÑO v5" (acordado con Sebas, PENDIENTE de ejecutar)
Diagnóstico honesto: sitio bien construido pero genérico — identidad aprobada aplicada ~25%.
5 síntomas: (1) card-itis (todo en tarjetas redondeadas; el lenguaje editorial pide reglas
finas y aire); (2) modo día blanco-default (debe ser "papel institucional" hueso/crema);
(3) token navy heredado compite con verde-tinta (calculadora); (4) escala tipográfica
tímida (sin cifras monumentales, saltos cortos); (5) fotografía enjaulada en thumbnails
(pide bandas a sangre completa).

PLAN v5 EN 3 ETAPAS (cada una con sign-off visual de Sebas ANTES de la siguiente):
- E1 "Papel y familia": fondo día→hueso; navy→verde-tinta profundo (cascada de 1 variable);
  radios 24→12 (grandes a casi 0); bordes de tarjeta→reglas finas en 2-3 secciones piloto
  (Transparencia, Membresías). CSS casi puro, reversible, máximo efecto/esfuerzo.
- E2 "La voz": escala editorial real (titulares grandes, lead 20px, eyebrows sistema);
  UNA cifra monumental Unbounded por página (inicio: línea de red real como pieza
  tipográfica); momentos Fraunces itálica.
- E3 "Momentos firma": banda foto a sangre entre inicio y evidencia; Transparencia como
  LIBRO MAYOR (números tabulares, reglas, NIT/RTE con dignidad de sello — extender ADN del
  cupón/recibos); ascender el "Recorrido 7/12" del pie a elemento con presencia.
Ideas sueltas a madurar: sello institucional gráfico (NIT+RTE como estampilla); muro
físico de logos cuando haya 4-5 aliados.

TAREAS QUE ESPERAN EL OJO DE SEBAS (pospuestas por cansancio, retomar):
- Sign-off visual: Unbounded (H1 hero móvil, peso 700 vs 600, ¿migrar nlogo/precios/h3?);
  menú nuevo (día/noche, labels de grupos); cupón de beneficio; chips mini-calc de ficha;
  filtros y resumen del mapa; textarea aliados (aún de sesiones atrás).
- Recompresión top-5 fotos jornadas (con muestras antes/después).
- Coordenadas de Conciencia (zona aprox., confirmar punto).

## Auditoría de código + Bloques A/B/C (revisión + 2 ideas nuevas)
Commits `b17f0a86` (A) y `092a0bf1` (B+C), ambos success.

**AUDITORÍA (hallazgos y estado):**
- XSS latente CERRADO (A1): renderFicha escapaba 0 campos de partners.json (renderComercio
  escapaba 15 — inconsistencia); popups del mapa y label de hero.impact tampoco. Ahora TODO
  dato remoto pasa por escapeHtml. Importa porque el pipeline de alta automática nace de
  formularios públicos.
- DEUDA DECLARADA (no tarea): script-src 'unsafe-inline' en CSP; endurecer = migrar todos
  los onclick inline a addEventListener. Grande, no urgente.
- Limpieza (A2/A3): borrado img/jornadas/hero_futbol_1400.jpg (288KB huérfano); eliminadas
  10 claves i18n muertas verificadas (nav.g.hub/sumate, nav.alma, nav.conocenos, comm.*,
  grat.cat, grat.how.*, hub.ey) — stat.*/live.* SE CONSERVAN (secciones ocultas). También
  retirada ficha.imp.p (sustituida por la mini-calc). Paridad 681/681.
- Caché (A4): /app.js y /styles.css ahora immutable 1 año en _headers (seguro por
  hash-busting). OJO: si algún día se deploya app.js/styles.css SIN actualizar el hash en
  index.html, los usuarios verían versión vieja hasta 1 año — el hash-bump es OBLIGATORIO.
- Opcionales NO hechos: recompresión top-5 fotos jornadas (674–320KB; tocaría calidad,
  requiere ojo de Sebas).

**IDEA 3 HECHA (B): mini-calculadora de impacto en ficha de fundación.** Chips $10K/$20K/
$50K/$100K → convierte a TODAS las impactUnits de la fundación (solo muestra unidades con
n>=1). Inicializa en $20K. fichaImpCalc() en app.js; claves ficha.imp.calc/ficha.imp.min;
CSS .fimp-*. Conecta calculadora↔fundación (Conciencia luce sus raciones de COP 3.200).

**IDEA 2 HECHA (C): mapa como vista de red con filtros.** Capas Leaflet por tipo, chips
Toda la red/Fundaciones/Comercios (HUB SIEMPRE visible — decisión: es el centro de la red),
y línea-resumen honesta calculada de datos reales (map.sum: '{f} fundaciones, {c}
comercios, {h} HUB'). Contenedores #map-filters/#map-summary alrededor de #map-box.
Nota: los chips de filtro se pintan con t() al construir el mapa; si el usuario cambia de
idioma DESPUÉS de abrir el mapa, los chips tienen data-i18n así que setLang los repinta.

**DECISIONES DE SEBAS registradas:** idea 4 (recibos Wompi) espera confirmación de
pasarela; idea 5 (Heros Wall) anotada para el futuro (decisiones de diseño siguen
abiertas); idea 6 (PWA/manifest) EN PAUSA hasta tener logo real — acordado esperar.

PENDIENTE sign-off visual: chips de la ficha y del mapa (día/noche), línea-resumen,
y que el filtro Comercios muestre Kore + HUB correctamente.

## Fase 4 (menú Opción B) + fix calculadora — ROADMAP COMPLETO
Commit `4c34658b` (deploy success). Con esto, las 4 fases del roadmap están hechas.
- **Menú reestructurado por audiencia (Opción B), aprobado por Sebas.** Desktop:
  `HUB SOCIAL · Fundaciones · Empresas▾(Empresas/Gratitud/Quiero ser aliado) ·
   Membresías▾(Membresías/Calcular mi aporte→#donar/Rastrea tu donación→#rastrea) ·
   Nosotros▾(Origen/Impacto/Transparencia/FAQ/Contacto) · [Donar]`. HUB SOCIAL y
   Fundaciones visibles directos. ALMA SALE del nav (sigue accesible por su FAB + CTAs en
   Donar/FAQ). Drawer móvil espejado con headers mnav-g. Reusa claves i18n existentes
   (ally.t, track.t, membres.cta.btn); 688/688, sin claves nuevas. Rutas: aliado=#aliados,
   rastreo=#rastrea (NO #track). Claves nav.g.hub/nav.g.sumate/nav.alma quedan definidas
   pero sin uso (inofensivo). Nota: triggers "Empresas"/"Membresías" repiten el nombre de
   su primer ítem (patrón mega-menú); si molesta, relabelar.
- **Fix desborde calculadora.** `#calc-display` pasó de 42px fijo a
  `clamp(22px,7vw,42px)` + letter-spacing -.01em + white-space:nowrap. Con Unbounded
  (más ancha) los montos de 8 cifras ($20.000.000) se salían en móvil. Ahora escala.

ESTADO ROADMAP: Fase 1 (UX/contraste) ✓ · Fase 2 (ficha comercio: cupón ✓, mapa ✓, galería/
comunidad pendientes de fotos) · Fase 3 (Unbounded) ✓ · Fase 4 (menú) ✓.
Pendientes vivos: fotos de Kore (galería + comunidad) con consentimiento; textos reales de
beneficio de Kore; sign-off visual de Unbounded (peso titulares, nlogo/precios/h3); convenio
Kore firmado. Decisiones micro del menú abiertas por si Sebas quiere afinar.

## Kore coords exactas + Fase 3 (tipografía Unbounded)
- **Coords de Kore corregidas** (commit `24ae69de`). El pin estaba ~500m desviado (usé centro
  de Envigado). Vía Google Places (tool places_search): lat 6.174531, lng -75.584507,
  place_id ChIJQc4o40JWnA0RQQd0fAzbj3k. Dirección de texto ya era correcta.
- **Fase 3 DESPLEGADA (commit `61a54c84`) — Unbounded self-hosted.**
  - vendor/fonts/unbounded-latin.woff2 (variable 200–900, 50KB, OFL, vía npm @fontsource-
    variable/unbounded). Google Fonts sigue bloqueado por CSP; font-src 'self' cubre el self-host.
  - HALLAZGO: `--font-display` nunca estaba definido → .e404-code/.live-num/.bc-benefit
    heredaban Inter (no display). Ahora `--font-display:"Unbounded","Bricolage Grotesque",sans`.
  - Unbounded "CON MODERACIÓN" (regla del skill): SOLO h1/h2 (titulares) + #calc-display
    (cifra clave) + los que ya usaban --font-display. h3/h4 y piezas pequeñas (.nlogo wordmark,
    precios .tier-price b, pasos .step, #m-name, .pcard-body b) SIGUEN en Bricolage a propósito.
  - index.html: preload Unbounded en vez de Bricolage (H1 del hero es above-fold / LCP).
  - h1/h2 ajustados: line-height 1.08, letter-spacing -.01em (Unbounded es ancha; menos tracking
    negativo que Bricolage). PENDIENTE sign-off visual: Unbounded es display ancha → revisar que
    el H1 del hero no desborde en móvil, y decidir si nlogo/precios/h3 migran también y si el
    peso de titulares baja a 600. Bricolage sigue cargada (fallback + h3/h4).

## Fase 2 en curso + nota sobre logo de Conciencia (histórico)
- **Fase 2a DESPLEGADA (commit `a3c030ed`):** "cupón institucional" del beneficio en la
  ficha de comercio. `.benefit-coupon` (app.js render + styles.css): eyebrow, beneficio en
  tipografía display, nivel como sello (pill), divisor perforado, redención/condiciones en
  letra de documento. Tokens existentes, día/noche. Reemplaza la tarjeta plana
  `.card.ficha-impact`+`.grat-benefit`+`.grat-meta` SOLO en la ficha de comercio (esas
  clases siguen usándose en las mini-cards del grid, no se tocaron). Kore aún con textos de
  beneficio de ejemplo → el cupón queda listo para el contenido real.
- **Fase 2b PENDIENTE:** comercios en el mapa. gratitud.json NO tiene aún `direccion`/`coords`.
  Para comercios la dirección es PÚBLICA y deseada (distinto de fundaciones). Falta: añadir
  soporte de marcador `type:"company"` en el mapa (el código ya lo contempla), y `direccion`
  + `coords` de Kore (buscar dirección pública de Kore Makeup Academy, Envigado, o que la dé
  Sebas). Luego dirección visible en ficha + enlace a Google Maps.
- **LOGO de Conciencia — límite de herramientas:** el binario vive en Drive; moverlo al repo
  exige pasar ~146KB base64 por el contexto de Claude, lo que corrompería el PNG (no es
  fiable copiarlo a mano), y bash no puede alcanzar Drive (fuera del allowlist de red). Vía
  fiable: Sebas ADJUNTA el logo (y luego las fotos de Kore) en el chat → caen en
  /mnt/user-data/uploads y Claude los optimiza (WebP) y los aloja de punta a punta. Estado
  actual: consent.logo=true, logo=null, render protegido (sin imagen rota). Al recibir el
  archivo: subir /img/conciencia_logo.png y poner "logo":"/img/conciencia_logo.png".

## Alta de Fundación Conciencia al HUB (esta sesión)
Commit `6ab8194e` (deploy success). Tercera fundación de la red `partners.json`.
Datos tomados del formulario ANTERIOR "Aplicación al Hub Social (respuestas)"
(Drive id 1ZchdL8...), fila del 2026-07-09; Conciencia respondió antes del form nuevo.

- **Fundación Conciencia formación para la paz** (NIT 900229688-6). ESAL CONSTITUIDA
  (2008), Cámara de Comercio VIGENTE y RUT — estándar legal más fuerte que NDF
  ("en proceso de constitución").
- Rep. legal: Lina Marcela Cardona Arango. Contacto form: proyectosconciencia@gmail.com
  / fundacionconcienciaparalapaz@gmail.com. Web: fundacionconcienciaparalapaz.org.
  IG: @fundacion_conciencia. Referida por Andrea Lopera / Sebastián.
- Territorio: comedores en Nueva Jerusalén (Medellín) + Valencia y La Apartada (Córdoba).
- 2 unidades de impacto (calculadora): ración de almuerzo COP 3.200; mercado familiar
  mensual COP 150.000 (ambas "de facturas reales" según el form). La 3ª unidad del form
  venía ilegible ("50 Familias Terapia 350 NNA") → NO se usó (evidencia, no promesas).
- 3 programas: Uno Menos con Hambre / AgroConciencia / Aprender para Emprender.
- Cifras (450 directos, +9.000 raciones/mes) redactadas como REPORTADAS por la fundación,
  no verificadas en terreno aún.

PENDIENTES Conciencia:
- [ ] **Alojar el binario del logo.** Autorizaron logo (consent.logo=true) y el PNG está
      en Drive (id 10xcGvOnXxg2v3PQllJKR384OKd4Xth_U, ~107KB). NO se alojó aún para no
      corromperlo copiando ~146KB base64 a mano. Con logo:null + render protegido, la
      ficha NO muestra imagen rota. Al alojar: subir /img/conciencia_logo.png y poner
      "logo":"/img/conciencia_logo.png".
- [ ] **Confirmar coordenadas.** Puestas a NIVEL DE ZONA aprox. (lat 6.313, lng -75.585 =
      Nueva Jerusalén, borde NO Medellín–Bello, sobre barrio París). Confirmar/ajustar.
- [ ] Fotos: no adjuntaron; gallery vacía; minorsImageProtected "pendiente".
- [ ] Verificación en terreno de las cifras reportadas (opcional, según proceso HUB).

## Lo que se hizo en esta sesión (Fase 1 UX + roadmap)
Commit `089435e1` (Actions success). Lluvia de ideas con Sebas → plan de 4 fases.

**Fase 1 DESPLEGADA (arreglos sin assets):**
1. **Lightbox galería "Compruébalo tú mismo" avanzaba de 3 en 3 POR TECLADO.**
   Causa: 3 listeners `keydown` sobre `#lightbox` (app.js ~L852, ~L1196, ~L1613);
   dos duplicados + uno muerto mal condicionado (gateaba `#lightbox` pero llamaba
   `closeGalLb`). Fix: dejar SOLO el listener L1196 como autoridad; L852 conserva
   el Escape del dropdown, L1613 conserva el Escape del drawer móvil. Botones en
   pantalla siempre avanzaron de a 1. (Ficha lb `gal-lb` nunca tuvo teclado real;
   usa botones + Escape nativo de <dialog>. Mejora futura opcional.)
2. **Contraste modo DÍA (noche ya pasaba AA con holgura):** `--mu` #6B7280→#5C636F
   (fallaba 4.41 sobre crema; ahora ≥5.0 en blanco/crema/sand). `--amber`
   #C97200→#A84D00 (badge .tag.new sobre amberl: 3.24→5.13). Tokens de noche
   intactos. OJO: `--gn` NO se tocó — solo se usa sobre fondos oscuros (hero/calc/
   home-hub/footer); su "fallo sobre blanco" era hipotético, no real.
3. **Footer:** añadido `contabilidad@thegiveandgrowproject.org` en columna Entidad.

**ROADMAP acordado (fases siguientes):**
- **Fase 2 — Ficha de comercio enriquecida.** (a) "Cupón institucional" del
  beneficio (tipografía display, nivel orgánico Retoño→, cómo se redime, condiciones
  estilo ledger) = elemento firma de la ficha. (b) Comercios en el mapa Leaflet:
  el código YA soporta `type:"company"` (comentado, nunca usado); marcador propio +
  `direccion` y `coords` en gratitud.json; dirección EXACTA visible (un comercio
  quiere ser hallado; distinto de fundaciones que usan zona por privacidad). (c)
  Galería CURADA self-hosted en /img/gratitud/<id>/ — NO embeber Instagram (CSP
  estricta `default-src 'self'`; API IG frágil/deprecada). Enlace prominente a @IG sí.
  Sebas va a PEDIR las fotos a Kore. (d) Sección `comunidad` (campo ya reservado en
  gratitud.json): nace con contenido real, no vacía.
  → BLOQUEADO por fotos con consentimiento (Ley 1581: impacto/beneficiarios/menores
    exige consentimiento documentado; producto/local de Kore = permiso del negocio).
  → Flujo de imágenes acordado: Sebas las sube por el chat; Claude optimiza (WebP +
    thumbs), nombra por convención y despliega. Por foto: pie, sección, consentimiento.
  → Arrancar Fase 2 por cupón + mapa (no dependen de fotos) mientras Sebas reúne fotos.
- **Fase 3 — Identidad tipográfica: cargar Unbounded self-hosted** (hoy el sitio
  usa Bricolage Grotesque en display = etapa ANTERIOR de marca; Unbounded es la
  dirección institucional aprobada). Vía npm @fontsource/unbounda (Google Fonts
  bloqueado por CSP/red). Migrar roles display, sign-off visual por sección día/noche.
- **Fase 4 — Reestructura de menú (Opción B, por audiencia, HUB SOCIAL visible).**
  PENDIENTE visto bueno de Sebas del árbol. Propuesta (6→5 ítems + Donar):
  `HUB SOCIAL · Fundaciones · Empresas▾(Empresas/Gratitud/Aliado) ·
   Membresías▾(Membresías/Calcular aporte/Rastreo) · Nosotros▾(Origen/Impacto/
   Transparencia/FAQ/Contacto) · [Donar]`. Micro-decisiones abiertas: ¿Impacto en
  Nosotros o visible?; ALMA quitado del nav (tiene FAB) ¿ok?; nombre grupo donantes.
  Al construir: tocar nav desktop + hamburguesa móvil + i18n de grupos nuevos.

## Sesión anterior (campo descripción del negocio)
Commit `3e198d05` (Actions success). Objetivo: que las empresas den su PROPIA
descripción en el formulario de aliados (decisión previa: no inventarla nosotros).

1. **Campo "Descripción del negocio"** en formulario #aliados — DESPLEGADO.
   - `index.html`: `<textarea id="ally-desc">` a lo ancho, al final de "Datos de la
     empresa". Clave i18n `ally.f.desc`. Placeholder ES fijo (patrón del form: labels
     i18n, placeholders hardcoded ES — misma limitación de todos los campos).
   - `app.js`: `payload.descripcion = val("ally-desc")` + clave i18n ES.
   - `i18n/en.json`: `ally.f.desc` → paridad 686/686.
   - `styles.css`: regla `.ally-form textarea` con tokens existentes
     (--surface/--ink/--bd/--g) para sostener modo noche.
   - **Campo OPCIONAL** (sin `required`). Para hacerlo obligatorio: añadir `required`
     al `<textarea>` y sumar `ally-desc` al chequeo de allySubmit. Decisión de Sebas
     pendiente (se dejó opcional para no fricción; la ficha solo se arma para aliados
     activos del Programa de Gratitud, donde se puede exigir en ese momento).

2. **`ops/aliados-formulario.gs` sincronizado** con nueva columna + fix.
   - Columna "Descripcion del negocio" añadida al FINAL de HEADERS y de `row`
     (a propósito: insertarla en medio desalinearía las filas ya existentes, ej. Kore).
   - Descripción añadida al correo de notificación (bloque de empresa).
   - **DISCREPANCIA RESUELTA EN REPO:** la copia del repo tenía
     `NOTIFY_EMAIL = "contabilidad@..."` (estado PRE-fix DMARC). Se sincronizó a
     `fundaciongiveandgrow@gmail.com` para reflejar el script vivo. La copia del repo
     estaba desactualizada; ahora coincide con la corrección DMARC.

## Sesión anterior (aliados + Programa de Gratitud)
1. **Formulario "Quiero ser aliado"** (#aliados) — 100% OPERATIVO.
   - Apps Script en `ops/aliados-formulario.gs`. Escribe a la hoja "Empresas
     Aliadas — Give&Grow" (SHEET_ID 1x9vF3PN1qGCX9h8ffXg_l6_9YILeSu4HLR91l2yJnlg,
     pestaña "Solicitudes") + envía 2 correos.
   - **BUG RESUELTO (correo):** los correos a @thegiveandgrowproject.org
     REBOTABAN por política DMARC del dominio (error 550 5.7.26). Solución:
     NOTIFY_EMAIL apunta a **fundaciongiveandgrow@gmail.com** (Gmail externo,
     no aplica DMARC). Se usa GmailApp.sendEmail (getRemainingDailyQuota solo
     existe en MailApp). NO se tocó DNS.
   - **Cada edición del Apps Script requiere reimplementar**: Implementar →
     Administrar implementaciones → lápiz → Versión "nueva" → Implementar.
     Si no, la app web sigue con el código viejo.
   - 1ª empresa real registrada: Kore Makeup (korestudio05@..., @koremakeup).

2. **Programa de Gratitud — comercios aliados** (data-driven).
   - `data/gratitud.json` = fuente única. Un comercio aparece SOLO si
     `status === "activa"` (convenio firmado). "borrador" = preparado pero oculto.
   - Sección "Comercios aliados" en página #gratitud: grid de tarjetas
     (renderGratitudComercios) + estado vacío digno si no hay activos.
   - Tarjeta clickeable → ficha.

3. **Ficha de comercio** (#comercio/[id]) — INFORMATIVA (renderComercio).
   - Espejo de la ficha de fundación PERO rol opuesto: fundación=beneficiaria
     (invita a donar); empresa=aliada (invita a MEMBRESÍA, no a donar).
   - Cabecera+logo, about, beneficio para miembros, galería con lightbox
     (solo si consent.photos), redes, CTA "Quiero ser miembro" → #membresias.
   - Logo de comercios sobre fondo BLANCO (suelen ser oscuros); fundaciones #111.

4. **Botón "Ver comercios aliados"** en página Empresas → goComercios()
   (navega a #gratitud + scroll suave a #grat-comercios-sec).

5. **Kore Makeup Academy** = 1er comercio, VISIBLE (status "activa") por
   decisión de Sebas (aún no firma; "negocio de confianza, firma en breve").
   - Logo real en `img/partners/kore-makeup.png` (negro sobre blanco, 400x400).
   - **TEXTOS DEL BENEFICIO SON DE EJEMPLO** (inventados por Claude), ya
     públicos. PENDIENTE: reemplazar por los reales que dé Kore.

## PENDIENTES (prioridad)
- [ ] **ACCIÓN MANUAL — Apps Script aliados:** pegar el nuevo `ops/aliados-
      formulario.gs` en el editor de Apps Script y **publicar VERSIÓN NUEVA**
      (Implementar → Administrar implementaciones → lápiz → Versión nueva). Si no,
      la app web sigue con el código viejo y la columna/descripción NO se guardan.
- [ ] **ACCIÓN MANUAL — hoja de cálculo:** añadir a mano el encabezado
      "Descripcion del negocio" en la última columna de la pestaña "Solicitudes".
      El script NO reescribe encabezados en hoja con datos, así que la columna nueva
      llega sin título hasta que se ponga manualmente.
- [ ] **Confirmar visualmente** el textarea nuevo en #aliados (día y NOCHE).
- [ ] **Decisión Sebas:** ¿campo descripción obligatorio u opcional? (hoy opcional).
- [ ] **Verificar** que el `NOTIFY_EMAIL` del script vivo sí es el Gmail (se asumió
      por el handoff; la copia del repo estaba desactualizada y ya se corrigió).
- [ ] **Textos reales de Kore**: beneficio, nivelDesde, redime, condiciones
      (hoy son de ejemplo y están públicos). Editar en data/gratitud.json.
- [ ] **Convenio firmado de Kore** (dijo que firma en breve).
- [ ] **about + fotos de Kore**: los aporta la empresa. about/gallery vacíos.
      consent.photos=false hasta que autorice fotos.
- [ ] **Sección FUTURA "lo que hacen por la comunidad"** (experiencias/
      servicios/productos): campo `comunidad` reservado en gratitud.json.
      Diseñar a fondo con contenido real. NO implementar aún.
- [ ] Logos alternativos de Kore disponibles (Sebas los envió): blanco/negro
      (para fondos oscuros), café/taupe (variante cálida). Guardar si se quieren.
- [ ] Fase 4 (espera logo de marca Give&Grow real): logo nav/favicon/OG/JSON-LD,
      pieza OG 1200x630, íconos PWA PNG 192/512.
- [ ] Wompi (trámite Sebas) → webhook→D1→recibo→tracking.
- [ ] Validación contadora del texto del certificado DIAN.

## TRAMPAS CONOCIDAS (leer antes de trabajar)
- **git pull sobrescribe cambios no desplegados.** El Apps Script del
  inventario hace commits automáticos al repo. Un `git pull` puede borrar
  ediciones recién hechas. ESTA SESIÓN: el 404 de la ficha de comercio fue
  causado por esto — `page-comercio` desapareció de index.html tras un pull.
  → Patrón seguro: git fetch + GIT_AUTHOR/COMMITTER env + git merge FETCH_HEAD
    --no-edit + git push HEAD:main. NO rebase.
  → Tras cada pull, VERIFICAR que los cambios propios sobrevivieron.
- **Al depurar un 404 de página:** primero verificar que el elemento HTML
  `id="page-X"` EXISTE en index.html (grep -c). El enrutamiento puede estar
  bien y el bug ser el contenedor ausente.
- **Apps Script:** reimplementar versión nueva tras CADA edición del código.
- **Cache-bust:** actualizar hash de styles.css y app.js en index.html tras
  cada cambio (md5sum → sed). Ya está en el flujo de deploy.

## ARQUITECTURA CLAVE (app.js)
- Router: `go(id, fromPop)` (~805). Rutas dinámicas fundacion/[id] y
  comercio/[id] resueltas ANTES del fallback e404.
- Re-render por idioma en postLang (~757-759).
- renderFicha (fundaciones) / renderComercio (comercios) — espejos.
- Lightbox nativo: ensureLightbox()+paintLightbox()+showModal(), LB={list,ix}.
- i18n: dict ES en app.js; EN lazy desde /i18n/en.json. Paridad actual 903/903.
- Datos: partners.json (fundaciones), gratitud.json (comercios), inventario.json.
- Validación: `node scripts/validate.mjs` (paridad, sintaxis, tags, cobertura).

## VERIFICADO AL CIERRE
- Etiqueta `calc.tipo.lbl` en index.html (calc-cap + role=group/aria-labelledby): ✓
- ES en app.js + EN en en.json (paridad 682/682): ✓
- `.calc-dest-lbl,.calc-cap` en styles.css (reuso de estilo, día/noche ok): ✓
- validate.mjs: TODO OK (sintaxis, paridad, cobertura, JSON, JSON-LD, tags).
- Cache-bust actualizado: styles d7794fd2, app 4e1fd8b4.
- Deploy 9c5bc3bb Actions success.
- PENDIENTE Sebas: sign-off visual de la etiqueta (desktop+móvil, día+noche);
  decisión del texto final (ver alternativas en el cierre de tanda de arriba);
  revocar token de escritura de la sesión.
