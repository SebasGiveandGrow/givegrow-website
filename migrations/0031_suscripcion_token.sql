-- 0031_suscripcion_token.sql — la llave con la que alguien da de baja lo suyo
--
-- POR QUE HACE FALTA. `/pago/metodo` lleva escrito en produccion, desde hoy,
-- «Puedes retirarlo cuando quieras», y `/pago/listo` remata con «escribiendonos».
-- Hoy eso es literalmente cierto y practicamente falso: la unica forma de parar
-- un debito automatico es que una persona lea un correo y haga un UPDATE a mano.
-- Una membresia que se contrata en treinta segundos y se cancela escribiendo un
-- correo no es simetrica, y la asimetria siempre va en contra de quien paga.
--
-- POR QUE UN TOKEN Y NO UNA CUENTA. El sitio no tiene inicio de sesion para
-- donantes y no conviene que lo tenga por esto: una contrasena mas que cuidar,
-- bajo Ley 1581, para una sola pantalla. El proyecto ya resolvio este mismo
-- problema dos veces —el recibo (`aportes.token`) y el carnet (`miembros.token`)—
-- con 128 bits aleatorios en la URL. Se copia ese patron en vez de inventar otro.
--
-- POR QUE NO SIRVE `id`. Es `"w-" + tokenNuevo()`, o sea que YA es impredecible
-- para las filas de Wompi. Pero es la clave primaria: aparece en respuestas de
-- la API, en el panel y en los registros. Una clave que se ve en quince sitios
-- no puede ser ademas la que autoriza cancelar. Un campo aparte permite ademas
-- rotarlo el dia que haga falta sin tocar ninguna referencia.
--
-- ADMITE NULL A PROPOSITO. Las suscripciones de PayPal no llevan token y no
-- deben llevarlo: esas se cancelan en PayPal, que es quien cobra. Poner aqui un
-- boton de baja para ellas seria la peor clase de mentira — la que apaga
-- nuestra fila y deja el cobro corriendo. El indice UNIQUE de SQLite permite
-- cuantos NULL haga falta, asi que conviven sin trampa.

ALTER TABLE suscripciones ADD COLUMN token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_suscripciones_token ON suscripciones(token);
