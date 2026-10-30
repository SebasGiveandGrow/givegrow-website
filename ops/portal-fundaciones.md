# Portal de fundaciones — guía de operación

Cómo se atiende desde `/admin` lo que las fundaciones hacen en `/portal`. Es la
guía del día a día. El porqué de cada regla está en los comentarios de
`worker.js`, que es la fuente de verdad: si esta guía y el código discrepan,
manda el código y se corrige esta guía.

---

## 1. Quién entra y cómo

- **Entra una fundación con solicitud en estado** `aceptada`, `visitada`,
  `convenio` o `vinculada` (`PORTAL_ESTADOS`). Si la solicitud se archiva o
  vuelve atrás, el portal le dice que no tiene acceso.
- **Sin contraseña.** La fundación escribe su correo en `/portal` y recibe un
  enlace de un solo uso que vence en **30 minutos**. Al abrirlo y tocar
  «Entrar», queda con sesión en ese navegador **30 días**.
- **Qué correos sirven:**
  - el de la solicitud;
  - los **correos autorizados** que el equipo añade en Admin › Acompañar la red ›
    Fundaciones › (la fundación) › Acceso al portal.

  Un correo que no está en ninguno de los dos recibe la misma respuesta que uno
  que sí está, pero no le llega nada. Así nadie puede averiguar qué correos
  tienen solicitud.
- **Quitar un correo autorizado lo saca.** Su sesión deja de valer en la
  siguiente petición, y los enlaces que tuviera sin usar dejan de abrir.
  Cambiar el correo de la solicitud hace lo mismo con el correo viejo. Esto
  llega con el #640.
- **Topes:** 5 enlaces por hora por fundación y 10 intentos de entrada por IP
  al día. Si una fundación dice «no me llega el enlace», casi siempre es el
  tope o el filtro de spam.
- **Mandarle el enlace desde el panel:** Admin › Atender › Solicitudes a la red › (la
  solicitud) › Portal… › **«Enviar enlace del portal»**. Va al correo de la
  solicitud.

## 2. Lo que la fundación hace en su portal, y dónde se revisa

| Pestaña del portal | Qué hace la fundación | Dónde se revisa en `/admin` |
| --- | --- | --- |
| Resumen | Ve en qué paso va, lo que sigue y lo que ha recibido (donaciones dirigidas, actas, jornadas). | Nada que revisar: solo lee. |
| Perfil | Lo edita después de enviar el cuestionario. Los ODS van aquí. | Atender › Solicitudes a la red › Portal…: el panel muestra **antes y ahora** por pregunta. «Marcar todo revisado». |
| Documentos | Sube RUT, Cámara, estatutos, estados financieros, certificación bancaria, logo y otros (PDF o foto, hasta 5 MB, máximo 30). | Atender › Solicitudes a la red › Portal…: cada documento se descarga desde ahí. «Marcar todo revisado». |
| Apadrinamiento | Propone unidades y reporta cada mes lo entregado. | Revisar y aprobar › Apadrinamiento. Ver `ops/apadrinamiento-unidades.md`. |
| Indicadores | Define sus indicadores y reporta cada periodo el valor con fuente y corte (#641). | Revisar y aprobar › Indicadores de la red. Ver la sección 4. |

**Nada de lo que la fundación edita en el portal cambia el sitio público solo.**
El sitio sale de `data/partners.json`. Si un cambio del perfil tiene que verse
en la web, se pasa a mano a ese archivo con un PR.

## 3. Cómo leer «Hoy»

Lo del portal entra en «Hoy» con estas filas. Cada una lleva a su sección.

| Fila de «Hoy» | Qué significa | Sube a Urgente a los |
| --- | --- | --- |
| Portal de fundaciones: cambios por revisar | Un perfil editado o un documento subido sin marcar como revisado. | 7 días |
| Unidades de apadrinamiento por revisar | Una unidad propuesta o editada: verificar costo y aprobar o devolver. | 7 días |
| Reportes mensuales de apadrinamiento por revisar | Lo entregado en el mes, con su evidencia. | 7 días |
| Unidades sin el reporte del mes pasado | Desde el día 10, unidades publicadas que no reportaron el mes anterior. Hay que escribirle a la fundación. | — |
| Mediciones de las fundaciones por revisar | Un valor de un indicador de la fundación (#641). | 14 días |

## 4. Indicadores de la red (MEAL)

Llega con el #641; la migración 0057 ya está aplicada.

- **Quién define qué:** la fundación decide qué mide, cada cuánto, de dónde
  sale el dato, la línea base y la meta. **Una medición** es el valor de un
  periodo con la fuente de ese periodo y la fecha de corte; la evidencia es
  opcional.
- **Marcar revisada:** abrir la medición, mirar la fuente (y la evidencia si
  la adjuntó), marcar la casilla. **Devolver** pide un motivo, que la fundación
  ve en su portal; puede corregir y reenviar.
- **Una medición revisada no se reescribe.** Si hay que corregirla, la
  fundación escribe al equipo.
- **Alinear con el MEAL:** en la tabla de indicadores, el selector «Aporta al
  MEAL» dice a cuál de los indicadores de Give&Grow suma. Lo decide el equipo;
  la fundación no lo ve. Queda en la auditoría.
- **Nada de esto se publica.** Si algún día un valor va a salir al público, se
  le pregunta antes a la fundación: no basta con que esté revisado.

## 5. Si la fundación cambió algo mientras lo revisabas

Pasa con unidades, reportes y mediciones. Llega con el #640 y, para las
mediciones, con el #641.

El panel aprueba **la versión que tienes en pantalla**. Si la fundación la
editó o la reenvió después de que abriste el cajón, el botón responde «La
fundación la cambió mientras la revisabas». Cierra el cajón, vuelve a abrirlo y
revisa la versión nueva. No es un error: es lo que impide publicar algo que
nadie miró.

## 6. Lo que NO se hace desde aquí

- **Cobrar el apadrinamiento.** Es la fase 2 y espera la conversación con el
  contador (`preguntas-contador-apadrinamiento.md`, fuera del repo).
- **Publicar en la web** lo que la fundación escribe. Pasa por
  `partners.json`.
- **Ver datos de otra fundación desde un portal.** Cada sesión ve solo lo suyo,
  y el servidor lo comprueba en cada petición.
