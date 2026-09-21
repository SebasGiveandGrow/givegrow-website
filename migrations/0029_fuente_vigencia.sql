-- 0029_fuente_vigencia.sql — corregir lo que la 0028 dio por hecho
--
-- LO QUE LA 0028 PROMETIO Y NO SE PUEDE CUMPLIR. Esa migracion creo las
-- columnas `exp_mes` y `exp_anio` con esta justificacion escrita:
--
--   «Para avisar antes de que venza, no para operar con ella. […] permite
--    avisarle ANTES de que su membresia falle en silencio — que es el modo de
--    fallo tipico de un debito automatico.»
--
-- Era una suposicion, no un hecho. Wompi NO devuelve la fecha de vencimiento de
-- la tarjeta al crear ni al consultar una fuente de pago. Comprobado el 21 sep
-- 2026 consultando la fuente 377915 de sandbox, que devolvio exactamente esto:
--
--   public_data: { bin, last_four, card_holder, validity_ends_at, type }
--
-- No hay `exp_month` ni `exp_year`. Las dos columnas se quedaron vacias en la
-- primera prueba real y se iban a quedar vacias siempre.
--
-- QUE SI HAY, Y NO ES LO MISMO. `validity_ends_at` vino con 2032 — seis anios
-- justos desde el registro. No es el vencimiento de la TARJETA: es la vigencia
-- de la FUENTE DE PAGO. Guardarla como si fuera lo primero habria sido peor que
-- no tener nada: un aviso que nunca dispara y la falsa tranquilidad de creer
-- que el caso esta cubierto.
--
-- ENTONCES EL AVISO DE VENCIMIENTO NO EXISTE, y conviene decirlo aqui para que
-- nadie lo vuelva a dar por hecho leyendo la 0028. Una tarjeta vencida se va a
-- descubrir cuando el cobro la rechace, no antes. Si algun dia hace falta
-- avisar con antelacion, la fecha hay que pedirsela a la persona o sacarla del
-- rechazo de Wompi — no de aqui.
--
-- LA MARCA SI SE PUEDE, Y SIN GUARDAR MAS DE LA CUENTA. `public_data.bin` trae
-- los seis primeros digitos. De ahi se deduce VISA / MASTERCARD / AMEX en el
-- codigo, y se guarda solo el resultado. El BIN NO se guarda: PCI permite
-- conservar los seis primeros junto con los cuatro ultimos, pero no hace falta
-- para nada una vez deducida la marca, y lo que no se guarda no se filtra.
--
-- `card_holder` tampoco se guarda. Llega en la respuesta —en la prueba venia el
-- nombre real de quien registro— pero «VISA terminada en 4242» ya identifica la
-- tarjeta sin sumar un dato personal mas al que cuidar bajo Ley 1581.
--
-- SE USA ALTER Y NO SE RECREA LA TABLA. Hoy esta vacia en produccion y recrearla
-- seria mas limpio de leer, pero un DROP de una tabla de metodos de pago es una
-- operacion que no debe existir en el historial: el dia que alguien reaplique
-- migraciones sobre una base con datos, ese DROP se los lleva. D1 admite
-- DROP COLUMN — comprobado antes de escribir esto.

-- EL INDICE PRIMERO, o SQLite no deja. La 0028 creo `ix_fuentes_vence` sobre
-- (exp_anio, exp_mes) y un DROP COLUMN sobre una columna indexada falla con
-- «error in index ix_fuentes_vence after drop column». Comprobado aplicando
-- esta migracion sobre una base limpia antes de entregarla.
--
-- Y NO se crea uno nuevo sobre `vigencia_hasta`. Aquel existia para recorrer el
-- aviso de vencimiento; ese aviso no existe, asi que un indice para el seria
-- mantener la ficcion en otro sitio.
DROP INDEX IF EXISTS ix_fuentes_vence;

ALTER TABLE fuentes_pago DROP COLUMN exp_mes;
ALTER TABLE fuentes_pago DROP COLUMN exp_anio;

-- Vigencia de la FUENTE, no de la tarjeta. Se guarda porque la fuente sí caduca
-- y conviene saber cuando, pero el nombre dice lo que es para que nadie la
-- confunda con lo otro.
ALTER TABLE fuentes_pago ADD COLUMN vigencia_hasta TEXT;
