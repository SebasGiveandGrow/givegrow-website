-- 0021_eventos_paypal.sql — la tabla que hace idempotente el webhook de PayPal
--
-- POR QUE HACE FALTA, y no es teoria: este proyecto tiene la cicatriz del 12 de
-- agosto de 2026 —«se cobro un pago real y la base no lo supo»— y la tabla
-- `eventos_wompi` existe justo por eso. PayPal reintenta la entrega de un webhook
-- que no responde 200, y en cada reintento manda EL MISMO `id` de evento. Sin una
-- clave unica sobre ese id, un reintento crearia un aporte duplicado: la familia
-- de un cobro mensual veria dos guias por el mismo dinero.
--
-- LA CLAVE ES EL `id` DEL EVENTO Y NO EL DE LA SUSCRIPCION. En Wompi el UNIQUE es
-- (transaction_id, estado) porque su mismo id transiciona PENDING -> APPROVED y
-- las dos cosas son legitimas. En PayPal cada cambio llega como un evento
-- DISTINTO con su propio id, asi que el id solo ya identifica «esto ya lo vi».
--
-- Se guarda el cuerpo completo, igual que en Wompi, para poder auditar una
-- disputa meses despues sin depender de que PayPal conserve el historial.
--
-- SE APLICA A MANO Y ANTES del codigo que la usa, como las 20 anteriores. Y ojo:
-- mientras no este aplicada, el paso «La base esta migrada» de deploy.yml
-- BLOQUEA todo despliegue — no es que rompa nada, es que no deja publicar. Se
-- aprende por las malas: paso con la 0020 el 2 sep.

CREATE TABLE IF NOT EXISTS eventos_paypal (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id     TEXT NOT NULL,
  tipo          TEXT NOT NULL,
  suscripcion   TEXT,
  recurso_id    TEXT,
  firma_valida  INTEGER NOT NULL DEFAULT 0,
  cuerpo        TEXT,
  procesado     INTEGER NOT NULL DEFAULT 0,
  resultado     TEXT,
  recibido_en   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (evento_id)
);

CREATE INDEX IF NOT EXISTS ix_eventos_paypal_susc ON eventos_paypal(suscripcion);
