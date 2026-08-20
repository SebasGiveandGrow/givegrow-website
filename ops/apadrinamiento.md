# Apadrinar la reparación de una casa — diseño y lo que falta decidir

Plano de diseño para cerrar el ciclo del triaje de viviendas: que un caso pueda
recibir un aporte con destinación específica y termine en un acta.
Principio rector: **evidencia, no promesas.**

**Estado: NO se puede recibir el primer peso todavía.** Este documento existe
para llevárselo a la contadora, no para implementarse tal cual. Las preguntas
de la sección 4 cambian el modelo de datos, así que construir antes de tenerlas
respondidas es construir dos veces.

---

## 1. Lo primero, porque decide todo lo demás

Todo este proyecto se diseñó para **no** asumir responsabilidad profesional. Por
eso no se dictamina habitabilidad: la declaratoria con efectos es de la autoridad
municipal (Ley 1523 de 2012), y firmar a distancia comprometería la matrícula del
ingeniero. La columna se llama `clasificacion` y no `veredicto` justamente por eso.

⚠️ **EL PUNTO DE PARTIDA SE MOVIÓ EL 19 AGO 2026, y hay que rehacer esta cuenta
con la contadora.** La fundación ya no dice solo «a quién visitar primero»: dice
**con qué materiales y en qué orden reparar**, y si hay señales para no
permanecer. Sigue sin ejecutar obra y sin dictaminar habitabilidad, pero
recomendar materiales es un paso hacia el lado caro.

**El apadrinamiento mueve a la fundación de «recomendamos con qué reparar» a
«respondemos por que una casa se repare».** El salto es MÁS CORTO de lo que este
documento describía —el punto de partida ya está más cerca—, y eso no lo abarata:
significa que parte de la exposición que el documento atribuía al apadrinamiento
ya se asumió sin la conversación. Es otra clase de exposición, y hay que entrar
en ella a propósito o no entrar.

Tres niveles, de menos a más:

| | Qué hace la fundación | Qué gana | Qué arriesga |
|---|---|---|---|
| **A · Conectar** | Publica el caso anonimizado y presenta al padrino. No toca la plata de la obra. | Exposición mínima. | **El dinero se sale del ledger.** No hay guía, ni acta, ni trazabilidad — que es justo la tesis del proyecto. |
| **B · Financiar materiales** | Recibe la donación, compra materiales y los entrega con acta. La obra la ejecuta quien la familia decida. | Trazabilidad completa reusando lo que ya existe. | La de una entrega en especie, que la fundación ya asume hoy. |
| **C · Ejecutar la obra** | Contrata mano de obra y coordina la reparación. | Lo máximo para la familia. | Responsabilidad civil por la obra, riesgos laborales, garantía. Exige pólizas y un profesional que firme. |

**Recomendación: B.** Reúsa toda la maquinaria que ya funciona —`aportes` →
`entregas` → acta con foto—, mantiene el ledger completo y no mete a la fundación
en una clase de responsabilidad para la que no está equipada. C puede venir
después, con un constructor aliado que firme la obra y con sus pólizas.

---

## 2. Lo que la anonimidad resuelve sin habérselo propuesto

`consent_publico` dice que el caso puede aparecer **«SIN mi nombre ni mi
dirección»**. Esa restricción nació de la Ley 1581, pero hace un segundo trabajo
que conviene ver:

Nadie estaría donando «para la casa del señor X». Estaría donando **al programa
de vivienda, para un caso identificado por su número y su sector**. Una donación
cuyo beneficiario es una persona natural identificada es donde el tratamiento
tributario se pone frágil; una destinada a un caso anónimo dentro del objeto
social de la ESAL, mucho menos.

> **No aflojar la anonimidad para hacer la campaña más emotiva.** Poner cara y
> nombre a la casa apadrinada es exactamente lo que la vuelve indefendible, y de
> paso rompe el consentimiento que la familia dio.

---

## 3. Qué queda igual y qué hay que inventar

**Ya existe y sirve tal cual:**

- `aportes` con su guía `GG-YYYY-NNNNNN`, su token, su recibo y su certificado.
- `entregas` con acta en papel firmada, su transcripción y su foto — el cierre.
- El panel para confirmar transferencias y emitir certificados.
- El caso, su clasificación y su informe.

**Lo que no encaja todavía:** `aportes.modo` admite `'dirigida'` con `destino_id`
apuntando a una fundación de `partners.json`. **Un caso no es un aliado.** Hay dos
salidas y la elección depende de la pregunta 2 de abajo:

- un `modo` nuevo (`'caso'`) con el número en `proyecto`, o
- que `destino_id` admita un `CV-YYYY-NNNNNN`.

No decidirlo ahora es deliberado: si el certificado tiene que nombrar el destino,
el campo tiene que existir en `documentos.js`, y eso lo dice la contadora.

---

## 4. Las preguntas para la contadora

Están redactadas para que se puedan responder con un sí, un no o una regla.

1. **¿Sigue siendo donación?** Un aporte destinado a un caso concreto —
   identificado solo por número y sector, sin nombre ni dirección — ¿es donación
   al objeto social de la ESAL, o una liberalidad a favor de un tercero? De esto
   depende si se puede emitir certificado del art. 257.

2. **Si se puede: ¿el certificado nombra el destino?** ¿Dice «caso CV-2026-…» o
   solo el monto? Hoy el PDF no tiene ese campo, y añadirlo toca el articulado
   que el check #10 vigila en dos archivos.

3. **¿Cómo se registra entre que entra y se gasta?** ¿Pasivo por recursos de
   terceros, o ingreso con destinación específica? Cambia el beneficio neto y la
   obligación de reinversión.

4. **Excedente y faltante — la política tiene que existir ANTES del primer peso.**
   Si se recaudan $10M para una obra de $8M, ¿los $2M se mueven a otro caso, se
   devuelven, o entran al fondo general? Si se recaudan $3M y la obra nunca se
   hace, ¿qué pasa? Escribirlo después de recibir es tarde: hay que publicarlo
   junto al botón.

5. **¿Hay tope** por familia o por año para lo que se le puede entregar a un
   mismo hogar?

6. **Contraprestación** — la conversación que ya está abierta y sin cerrar.
   ¿Reconocer públicamente al padrino de una casa cuenta como contraprestación?
   Si cuenta, ensancha justo el problema que el carnet se diseñó para no
   ensanchar (solo membresía recurrente, nunca aportes de la brigada).

7. **En especie.** Si una empresa dona el cemento para un caso concreto: el
   certificado del sistema no cubre especie y va por minuta. ¿Cambia algo el que
   esté destinado?

---

## 5. Qué se puede construir sin esperar respuestas

- **El banco público de casas, sin dinero de por medio.** Casos con
  `consent_publico` verificado, anonimizados, mostrando qué hay y qué falta. No
  promete nada, no toca contabilidad y construye el lado de la demanda. El
  índice `ix_casos_publico` existe desde la 0010 y nadie lo consume.
- Nada que mueva plata.

## 6. Lo que NO se debe hacer

- Abrir un checkout «apadrina esta casa» antes de tener las respuestas.
- Publicar un caso sin `consent_publico` verificado, o con cualquier dato que
  permita identificar la vivienda.
- **Prometer que una casa se va a reparar.** Hasta que haya acta firmada solo
  hay una intención — y esa distinción es la marca entera.
