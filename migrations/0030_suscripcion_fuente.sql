-- 0030_suscripcion_fuente.sql — que `suscripciones` sirva para los dos proveedores
--
-- La tabla nacio para PayPal y lleva su forma puesta:
--
--   plan_ref  TEXT NOT NULL   -- el plan del proveedor
--   id        TEXT PRIMARY KEY -- el id que PayPal asigna (I-XXXX)
--
-- Con Wompi no hay plan: hay una FUENTE DE PAGO y somos nosotros quienes
-- decidimos cuando cobrar. Asi que `plan_ref` no tiene que poner, y el
-- NOT NULL bloquea la insercion — comprobado, falla con
-- «NOT NULL constraint failed: suscripciones.plan_ref».
--
-- DOS CAMBIOS:
--   1. `plan_ref` pasa a admitir NULL. Sigue siendo obligatorio en la practica
--      para PayPal, pero eso lo impone su flujo, no el esquema.
--   2. Entra `fuente_id`, FK real a `fuentes_pago`.
--
-- POR QUE `fuente_id` Y NO REUSAR `plan_ref`. Era lo tentador: un campo de
-- texto libre llamado «referencia del proveedor» donde cabria el
-- `payment_source_id`. Pero entonces la misma columna significaria «plan» para
-- unas filas y «metodo de pago» para otras, y la primera consulta que cruce las
-- dos se equivoca sin avisar. Una columna que significa dos cosas es una
-- columna que miente a la mitad de quien la lee.
--
-- POR QUE SE RECREA LA TABLA. SQLite no sabe quitar un NOT NULL con ALTER. Se
-- usa el procedimiento estandar —crear, COPIAR, borrar, renombrar— y no un
-- DROP a secas: hoy la tabla esta vacia en produccion, pero esta migracion
-- puede reaplicarse manana sobre una base con suscripciones vivas, y entonces
-- el INSERT...SELECT es lo unico que las salva.
--
-- `id` se queda TEXT: PayPal trae el suyo y Wompi genera uno propio en el
-- codigo. Cambiarlo a autoincremental romperia las filas de PayPal.

CREATE TABLE suscripciones_nueva (
  id                 TEXT PRIMARY KEY,
  proveedor          TEXT NOT NULL DEFAULT 'paypal',
  plan_ref           TEXT,
  estado             TEXT NOT NULL DEFAULT 'aprobacion_pendiente',
  nivel              TEXT,
  monto_centavos     INTEGER NOT NULL,
  moneda             TEXT NOT NULL DEFAULT 'USD',
  frecuencia         TEXT NOT NULL DEFAULT 'mensual',
  donante_id         INTEGER REFERENCES donantes(id),
  idioma             TEXT NOT NULL DEFAULT 'es',
  quiere_certificado INTEGER NOT NULL DEFAULT 0,
  consent_muro       TEXT NOT NULL DEFAULT 'no',
  cobros             INTEGER NOT NULL DEFAULT 0,
  ultimo_cobro_en    TEXT,
  creada_en          TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en     TEXT NOT NULL DEFAULT (datetime('now')),
  cancelada_en       TEXT,
  cancelada_motivo   TEXT,
  fuente_id          INTEGER REFERENCES fuentes_pago(id)
);

INSERT INTO suscripciones_nueva (
  id, proveedor, plan_ref, estado, nivel, monto_centavos, moneda, frecuencia,
  donante_id, idioma, quiere_certificado, consent_muro, cobros, ultimo_cobro_en,
  creada_en, actualizada_en, cancelada_en, cancelada_motivo
)
SELECT
  id, proveedor, plan_ref, estado, nivel, monto_centavos, moneda, frecuencia,
  donante_id, idioma, quiere_certificado, consent_muro, cobros, ultimo_cobro_en,
  creada_en, actualizada_en, cancelada_en, cancelada_motivo
FROM suscripciones;

DROP TABLE suscripciones;
ALTER TABLE suscripciones_nueva RENAME TO suscripciones;

-- El indice que ya existia se fue con la tabla vieja; se rehace.
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);

-- El cobro programado pregunta «cuales toca hoy», y eso recorre estado y fecha
-- del ultimo cobro. Sin indice es un barrido completo cada vez que corre.
CREATE INDEX IF NOT EXISTS ix_suscripciones_cobro ON suscripciones(estado, ultimo_cobro_en);
