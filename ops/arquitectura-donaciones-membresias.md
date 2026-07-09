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
