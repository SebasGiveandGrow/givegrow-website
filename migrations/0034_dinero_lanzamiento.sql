-- 0034_dinero_lanzamiento.sql — lo que la auditoria de dinero previa al
-- lanzamiento (28 sep 2026) encontro que la base no podia guardar.
--
-- SE APLICA ANTES DE DESPLEGAR EL CODIGO, como todas: el Worker escribe estas
-- cinco columnas desde el primer minuto, y el job «La base esta migrada» del
-- deploy se niega a desplegar si esta pendiente.
--
--   npx wrangler d1 migrations apply givegrow-privado --remote
--
-- Son cinco ALTER sin reescritura de tabla: todas admiten NULL y ninguna
-- cambia el significado de una columna existente.

-- ---------------------------------------------------------------------------
-- aportes.fecha_pago — EL DIA EN QUE EL DINERO SE MOVIO, segun el banco.
-- El formulario de transferencias pedia la fecha, la validaba… y la tiraba. El
-- certificado y el recibo salian con la fecha en que una persona CONFIRMO la
-- transferencia, que puede ser dias despues — y en la ultima semana de diciembre
-- eso cambia el ano gravable del donante. Se guarda la que reporta el donante y,
-- al confirmar, la que dice el extracto (que es la que manda). AAAA-MM-DD del
-- dia civil colombiano, sin hora: es la fecha del extracto, no un instante.
-- Solo la escriben las transferencias; en un pago por pasarela sigue mandando
-- `aprobada_en`, que es el instante en que la pasarela aprobo.
ALTER TABLE aportes ADD COLUMN fecha_pago TEXT;

-- ---------------------------------------------------------------------------
-- aportes.identidad_pasarela — la identidad que entrego la pasarela PARA ESTE
-- PAGO (JSON: nombre, doc_tipo, doc_numero), congelada al aprobarse.
-- El certificado comparaba contra la fila de `donantes`, que cualquier
-- formulario publico sin autenticacion podia reescribir con solo saber el correo
-- de alguien. Comparar contra una copia pegada al pago es lo que hace que el
-- control de divergencia signifique algo.
ALTER TABLE aportes ADD COLUMN identidad_pasarela TEXT;

-- ---------------------------------------------------------------------------
-- aportes.certificado_datos — lo que el donante escribio en la calculadora al
-- pedir su certificado (JSON: doc_tipo, doc_numero, ciudad). La calculadora de
-- /donar nunca mandaba la casilla, asi que un donante en linea no tenia como
-- pedir certificado. NO se copia a `donantes`: lo escribe un formulario sin
-- autenticacion. Solo rellena el formulario de emision, que revisa una persona.
ALTER TABLE aportes ADD COLUMN certificado_datos TEXT;

-- ---------------------------------------------------------------------------
-- suscripciones.cobrando_en — el candado del cobro mensual.
-- Dos ejecuciones del cron a la vez (Cloudflare no garantiza exactamente una)
-- leian la misma lista de «toca cobrar» y las dos cobraban. El candado se toma
-- con un UPDATE condicional por suscripcion, y caduca a la hora por si una
-- ejecucion muere con el candado puesto.
ALTER TABLE suscripciones ADD COLUMN cobrando_en TEXT;

-- ---------------------------------------------------------------------------
-- suscripciones.reintento_en — el reintento de un cobro mensual rechazado.
-- Con tarjeta el rechazo llega por webhook, DESPUES de que el cron ya escribio
-- `ultimo_cobro_en`: la suscripcion no volvia a intentarse hasta el mes
-- siguiente y nadie le decia nada al donante. Ahora el rechazo le escribe y deja
-- aqui la fecha de UN reintento, unos dias despues, dentro del mismo mes. Es una
-- columna aparte y no un `ultimo_cobro_en` falseado porque esa fecha se le
-- muestra al donante como «Ultimo cobro».
ALTER TABLE suscripciones ADD COLUMN reintento_en TEXT;
