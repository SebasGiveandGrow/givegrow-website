# Apadrinamiento por unidades — guía de operación

La metodología del ítem 45: la gente apadrina cada mes **una unidad concreta**
que entrega una fundación de la red, como un niño en un programa, un filtro de
agua para una familia o una beca de baile o de fútbol. Cada unidad tiene un
costo mensual verificado y una evidencia mensual de que se entregó.

> **No confundir** con `ops/apadrinamiento.md`, que es el diseño (sin
> construir) para apadrinar la reparación de una casa de Mira Mi Casa. Son dos
> cosas distintas que comparten la palabra.

**Estado al 29 oct 2026:**

| Fase | Qué es | Estado |
| --- | --- | --- |
| 1 | Las fundaciones proponen unidades y el equipo las verifica y publica | En producción (0054) |
| 3 | El reporte mensual verificable | En producción (0055) |
| 2 | El cobro mensual | **Espera al contador.** No se cobra nada; quien quiere apadrinar deja su correo |
| 4 | Modalidad «niño identificado» | **Espera el sí explícito de Sebas y el punto focal de salvaguarda** |

---

## 1. Revisar una unidad

Una unidad se revisa en **Admin › Revisar y aprobar › Apadrinamiento** y se abre con
«Abrir».

**Aprobar y publicar** exige cuatro cosas, y el panel no deja seguir sin ellas:

1. **Que la fundación esté vinculada a la red.** Su solicitud tiene que tener
   el vínculo con `partners.json`, que se pone en Acompañar la red › Fundaciones ›
   Vínculo con la red. Sin eso no hay autorización para publicar su nombre.
2. **El costo verificado contra su soporte.** Se abre el soporte que adjuntó,
   se comprueba que el costo mensual sale de ahí y se marca la casilla. Sin
   soporte, se devuelve pidiéndolo.
3. **El inglés:** el nombre, la descripción, qué cubre y cómo se evidencia. El
   sitio es bilingüe, así que el equipo lo escribe.
4. **La modalidad.**
   - **Cupo** se puede aprobar.
   - **Niño identificado NO se aprueba todavía**: es la fase 4. Esa unidad se
     devuelve con el motivo «por ahora solo publicamos cupos».

Además de aprobar, una unidad se puede:

- **Devolver**, con un motivo que la fundación ve en su portal. Puede
  corregirla y reenviarla.
- **Pausar**: sale de la página sin perderse.
- **Volver a revisar**, cuando la fundación **edita una unidad publicada**: sale
  de la página hasta que se revise otra vez. Es a propósito: el costo pudo
  cambiar.

## 2. Revisar el reporte mensual

Cada mes, por cada unidad publicada o pausada, la fundación reporta cuántas
entregó, qué pasó y la evidencia.

- En el cajón están **la evidencia prometida al lado de la que llegó**. Hay que
  abrir la evidencia y compararla con la promesa y con el número.
- **Aprobar** exige marcar que se abrió la evidencia. Lo aprobado sale en
  `/apadrinamiento` como «Último reporte verificado · mes: N / cupos
  entregadas».
- **Devolver** pide un motivo, que la fundación ve.
- **Un reporte aprobado no se reescribe**: es lo que vio el público. Si hubo un
  error, se habla con la fundación y se deja constancia; no se edita la base a
  mano.
- **Ninguna foto con un menor identificable** sirve como evidencia pública. La
  evidencia no se publica, pero tampoco se pide así.

## 3. «Hoy»

| Fila | Qué hacer | Urgente a los |
| --- | --- | --- |
| Unidades de apadrinamiento por revisar | Verificar el costo y aprobar, devolver o pausar. | 7 días |
| Reportes mensuales de apadrinamiento por revisar | Abrir la evidencia y aprobar o devolver. | 7 días |
| Unidades sin el reporte del mes pasado | Sale desde el día 10. Escribirle a la fundación: sin reporte, la tarjeta pública sigue mostrando el último verificado, que se va quedando viejo. | — |

Cuando se fusione el #638, la fundación también recibe un correo al aprobarse o
devolverse su unidad o su reporte. Hasta entonces, solo lo ve si entra al
portal.

## 4. Quienes quieren apadrinar

En la misma sección, «Quieren apadrinar» lista a quienes dejaron su correo en
`/apadrinamiento`. Autorizaron que se les escriba **solo para avisarles cuando
abra el aporte mensual**. No se les escribe para nada más, ni se les pasa a
otra lista.

## 5. Lo que no se hace sin Sebas

- **Abrir el cobro (fase 2).** Las 21 preguntas para el contador están en
  `preguntas-contador-apadrinamiento.md`, fuera del repo.
- **Publicar una unidad «niño identificado» (fase 4).**
- **Cualquier cifra financiera pública** que no salga de un costo verificado
  con soporte.
