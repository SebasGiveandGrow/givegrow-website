-- 0022_eventos_ipn.sql — IPN: la unica forma de VER el boton de donaciones
--
-- POR QUE EXISTE. El boton de donaciones alojado de PayPal quedo con el mensual
-- habilitado (decision de Sebas, 3 sep 2026: va a haber gente que no sepa
-- hacerlo por otro medio). Pero a un boton alojado PayPal NO acepta que se le
-- pase monto ni referencia por donante —genera sus parametros y solo admite
-- variables que no afecten el cobro—, asi que ese camino no puede tener guia y
-- es CIEGO: se cobra plata cada mes y la base no se entera. Es la misma forma de
-- la cicatriz del 12 de agosto de 2026, que es por lo que existe `eventos_wompi`.
--
-- IPN no arregla la falta de guia; hace visible el cobro. Avisa que hubo uno, de
-- cuanto y de quien, para que una PERSONA lo registre desde /admin. Eso es todo
-- lo que se puede prometer aqui, y prometer mas seria inventar.
--
-- POR QUE NO SE REUSA `eventos_paypal`. Son dos protocolos distintos, no dos
-- sabores del mismo. El webhook trae JSON y se verifica con firma RS256 contra
-- `/v1/notifications/verify-webhook-signature`; IPN trae `x-www-form-urlencoded`
-- y se verifica DEVOLVIENDOLE a PayPal el cuerpo tal como llego. Mezclarlos en
-- una tabla obligaria a que cada consulta preguntara «¿de que protocolo era
-- esta fila?» para saber si su verificacion significa algo.
--
-- LA CLAVE, y por que es compuesta como en Wompi. Un `txn_id` transiciona
-- Pending -> Completed y las dos filas son legitimas, igual que PENDING ->
-- APPROVED alla. Y hay eventos SIN `txn_id` —`subscr_signup`, `subscr_cancel`—
-- que solo traen el id de la suscripcion; para esos la clave la arma el codigo
-- como `txn_type + ":" + subscr_id`. De ahi que `clave` sea una columna y no un
-- alias de `txn_id`: la calcula quien recibe, no el esquema.
--
-- SE APLICA A MANO Y ANTES del codigo que la usa, como las 21 anteriores.
-- Mientras no este aplicada, el paso «La base esta migrada» de deploy.yml
-- BLOQUEA el despliegue — y ese paso lee `d1_migrations`, no la existencia de la
-- tabla. Por eso este archivo se REGISTRA SOLO al final: `d1 execute --file` no
-- escribe esa fila (trampa que ya costo una vez) y asi el gate queda contento por
-- los dos caminos. Con `migrations apply` la escribe wrangler y el OR IGNORE la
-- deja pasar sin chocar.

CREATE TABLE IF NOT EXISTS eventos_ipn (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  clave          TEXT NOT NULL,          -- txn_id, o txn_type:subscr_id cuando no hay txn_id
  estado         TEXT NOT NULL,          -- payment_status, o txn_type cuando no hay estado de pago
  txn_type       TEXT,
  txn_id         TEXT,
  suscripcion    TEXT,                   -- subscr_id / recurring_payment_id
  monto_centavos INTEGER,
  moneda         TEXT,
  comision_centavos INTEGER,             -- mc_fee: lo que se llevo PayPal, para conciliar
  verificado     INTEGER NOT NULL DEFAULT 0,  -- 1 solo si el postback devolvio VERIFIED
  cuerpo         TEXT,                   -- crudo, para auditar una disputa meses despues
  procesado      INTEGER NOT NULL DEFAULT 0,
  resultado      TEXT,
  recibido_en    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (clave, estado)
);

CREATE INDEX IF NOT EXISTS ix_eventos_ipn_susc  ON eventos_ipn(suscripcion);
CREATE INDEX IF NOT EXISTS ix_eventos_ipn_fecha ON eventos_ipn(recibido_en);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0022_eventos_ipn.sql');
