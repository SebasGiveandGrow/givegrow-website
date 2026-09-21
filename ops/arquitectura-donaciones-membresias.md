# Arquitectura de donaciones, membresías y certificados

Plano de diseño para la integración con la pasarela de pago. Documento vivo.
Principio rector: **evidencia, no promesas.** Cada dato tiene un dueño y un propósito.
Estado de la pasarela: **Wompi pendiente de confirmación oficial** — este documento es el diseño listo para cuando se confirme.

## 1. Dos formatos de tracking, dos naturalezas

- **Donación única** — transacción que se cierra: recibida → en distribución → entregada → resultado. El aporta, se invierte, se reporta, se cierra el ciclo. Se construye PRIMERO (no depende de tokenización).
- **Membresía** (mensual/anual) — relación continua que se renueva: cada cobro se suma al impacto y alimenta una historia acumulada ("llevas N meses sosteniendo a…"). Tracking de continuidad, no de trazar cada peso a una entrega. Se enciende cuando Wompi esté confirmado.

## 2. Datos: quién los pide

### Los pide el sitio (la intención)
- Nivel o monto
- Frecuencia (mensual / anual / único)
- Fundación / proyecto (o fondo general) — define modo dirigida vs fondo
- Nota o dedicatoria (opcional, 280 car.)
- Consentimiento del muro (Hero's Wall) **con explicación breve al lado** — opciones: con nombre / anónimo / no aparecer; revocable (Ley 1581)
- Intención de certificado DIAN (sí/no)
- Celular (opcional)
- Ciudad (opcional)
- Redes sociales (opcional)

Texto propuesto del consentimiento del muro:
> El Hero's Wall es nuestro muro de reconocimiento a quienes hacen posible el impacto. Puedes aparecer con tu nombre, de forma anónima, o no aparecer — tú decides, y puedes cambiarlo cuando quieras.

### Los entrega Wompi (identidad y pago, ya validados)
- Nombre completo · correo · documento de identidad
- Medio de pago (tokenizado — nunca lo custodia la fundación)
- Monto, fecha y estado de cada cobro (vía webhook)

### Se unen en la base de datos privada (D1) por el token/ID de transacción
- Separada del inventario público (Ley 1581 habeas data)
- El muro y los reportes leen solo lo autorizado; documento y medio de pago nunca salen de la base privada

## 3. Métodos de pago por tipo de donación

- **Donación única:** tarjeta, PSE y Nequi (máxima cobertura). PSE es ideal para donación única: débito directo, sin comisión de tarjeta para el donante, transmite seriedad institucional.
- **Membresía recurrente:** tarjeta tokenizada como método principal de cobro automático (requiere 3D Secure en la afiliación inicial). Suscripción de cuentas Bancolombia como segunda opción. PSE NO sirve para cobro automático recurrente (requiere aprobación del donante en cada pago).

## 4. Panel de control automático (la ventaja de la pasarela)

Con Wompi, el webhook elimina el registro manual: cada suscripción y cada renovación crea/actualiza su fila sola. El panel muestra sin intervención: membresías activas, quiénes, por qué monto, renovadas vs fallidas. Contraste con transferencia a Bancolombia, donde el registro es manual.

## 5. Certificado de donación DIAN

**Habilitación:** la fundación está en Régimen Tributario Especial (RTE) y ya puede emitir certificados de donación que dan derecho al descuento tributario.

**Pendiente de validación con la contadora (no bloquea el diseño, sí la comunicación):**
- Texto exacto del certificado
- Porcentaje y tope efectivo que cada donante puede descontar (depende de su situación tributaria; hay límites legales sobre el total de descuentos). El 25% de la calculadora es una referencia, no una promesa individual.

**Ciclo de vida (diseño):**
1. Donante marca "quiero certificado"
2. Sistema arma el borrador con los datos ya capturados
3. **Revisión humana** (tú o la contadora) — se mantiene manual hasta que el proceso esté rodado
4. Emite y envía: PDF con número único (reusa el numerador atómico GG-YYYY-NNNNNN del motor de recibos)
5. Llega al correo y queda registrado

Automatizable ya: armado, numeración, envío, archivo. La revisión humana la suelta la contadora cuando confíe en el flujo. Capturar "quién solicita" desde hoy permite emisión en lote cuando se dé luz verde.

Comunicación mientras tanto: "puedes solicitar tu certificado de donación" (verdad con RTE), no "recibirás tu certificado automáticamente al instante" (aún no).

## 6. Orden de construcción

1. **Tracking de donación única** (ahora) — estados + guía + página pública "Rastrea tu donación". Caso de prueba: GG-2026-000001 (ya en inventario). No depende de Wompi.
2. Al confirmarse Wompi: conectar webhook → registro automático en D1 → recibo automático (motor ya construido) → estados del tracking.
3. Montar sobre lo anterior la lógica de ciclo continuo de la membresía.
4. Cuando la contadora valide: encender emisión de certificados (armado/numeración/envío ya listos).

## 7. Dar de baja la membresía

**El problema que resuelve.** El débito automático con Wompi se contrata en
treinta segundos. Hasta esta pantalla, cancelarlo dependía de que alguien del
equipo leyera un correo e hiciera un `UPDATE` a mano — y las páginas de pago ya
prometían en producción «puedes retirarlo cuando quieras». Esa asimetría entre
lo fácil que es empezar y lo difícil que es salir siempre juega en contra de
quien paga, y es de las primeras cosas que mira una auditoría de protección al
consumidor financiero.

**Cómo se identifica a la persona.** Con `suscripciones.token`: 128 bits
aleatorios en la URL, el mismo patrón del recibo (`aportes.token`) y del carnet
(`miembros.token`). No hay inicio de sesión para donantes y no conviene crearlo
por una pantalla: sería una contraseña más que custodiar bajo Ley 1581.

| Ruta | Qué hace |
|---|---|
| `GET /membresia/<token>` | Estado, nivel, mensualidad, último cobro, tarjeta (marca + 4 últimos) y el botón de baja. Sin un solo script: `script-src 'none'`. |
| `POST /api/pago/baja` | Cancela e **idempotente**: repetirla no da error. |
| `GET /membresia` | Para quien perdió el correo: pide el correo y reenvía el enlace. |
| `POST /api/pago/baja-enlace` | Envía el enlace. Con freno por IP (5 / 5 min). |

**La baja retira también el método de pago.** No es un extra: lo que la página
prometió fue poder *retirar el método de pago*. Dejar la fuente viva después de
una baja sería conservar la llave de cobro de alguien que acaba de pedir que
dejemos de cobrarle. Se retira solo si ninguna otra suscripción activa la usa.

**No cubre PayPal, y se dice en pantalla.** Esas suscripciones las cobra PayPal
desde su propio sistema: apagar nuestra fila dejaría el cobro corriendo y a la
persona creyendo lo contrario. Es el único modo de fallo peor que no tener la
página.

**Dos decisiones de privacidad que conviene no deshacer:**

- `/api/pago/baja-enlace` responde **exactamente lo mismo** haya membresía o no,
  sea el correo válido o no, y esté frenado o no. Cualquier diferencia
  convertiría la página en un buscador de miembros: se prueban correos y el que
  responda distinto está registrado. La batería lo comprueba comparando bytes.
- La anotación de auditoría lleva el id de la suscripción, **no el correo**: ese
  ya vive en `donantes` y repetirlo solo suma un sitio más que cuidar.

**Tema día/noche sin JavaScript.** Estas páginas se sirven con `script-src
'none'`, así que `themeByClock()` de app.js nunca corre: se quedarían en modo
día para siempre, como el carnet y el panel. `temaPorReloj()` calcula la hora
local del visitante con la zona horaria que Cloudflare deja en `request.cf` y
pinta `data-theme` en el servidor. Sin `cf` cae a Colombia.

**Probarlo:**
```
npx wrangler dev --port 8796 --persist-to /tmp/gg-baja
python3 ops/probar-baja.py
```
El banco local no tiene `RESEND_API_KEY`, así que `enviarCorreo` simula y la
batería **comprueba que quedó simulado**: una prueba que creyera estar simulando
mientras envía es el fallo que no se puede permitir en una ruta que escribe a
personas. El freno vive en memoria del isolate y sobrevive a la siembra, así que
la batería exige un `wrangler dev` recién arrancado y lo dice si no lo está.

**Lo que sigue faltando:** no hay pantalla de membresía que lleve a
`/pago/metodo` ni a `/api/pago/suscribir`, así que hoy nadie llega a este flujo
por su cuenta. `/pago/listo` enlaza a `/membresia` para que al menos haya una
puerta.
