-- 0020_paypal.sql — segundo proveedor de pago, y suscripciones
--
-- POR QUE COLUMNAS NUEVAS Y NO REUSAR LAS DE WOMPI. `aportes` tiene
-- `wompi_transaction_id` y `wompi_estado`, que son metadatos de UN proveedor.
-- Guardar ahi el id de una orden de PayPal funcionaria y seria una trampa para
-- quien lea la tabla en seis meses. Las nuevas son neutrales.
--
-- ES ADITIVA A PROPOSITO: no se renombra ni se borra nada. Las columnas de Wompi
-- siguen en su sitio y las 13 referencias del Worker siguen funcionando. Y la
-- logica central no se toca porque ya era neutral: `PAGADA` se define por
-- `estado IN ('aprobada','en_distribucion','entregada')`, no por el proveedor.
--
-- SE APLICA UNA SOLA VEZ Y NO ES IDEMPOTENTE: SQLite no tiene
-- `ADD COLUMN IF NOT EXISTS`, asi que una segunda pasada falla con «duplicate
-- column name». Es el estilo de las 19 migraciones anteriores -todas usan
-- `ALTER TABLE ... ADD COLUMN` a secas- y aqui se aplican a mano, una vez, ANTES
-- de que llegue el codigo que las necesita. Las dos tablas/indices si llevan
-- `IF NOT EXISTS`, que es lo que SQLite permite.
--
-- COMPROBADA contra una COPIA de la base local antes de commitear: 3 columnas
-- nuevas, la tabla con sus 18 campos, 2 indices, y CERO filas perdidas. El
-- backfill se probo con tres aportes que imitan los tres origenes reales:
--
--   GG-…901  aprobada   wompi_tx=tx-abc  ->  proveedor = 'wompi'
--   GG-…902  reportada  (transferencia)  ->  proveedor = NULL
--   GG-…903  intencion  (sin pagar)      ->  proveedor = NULL

ALTER TABLE aportes ADD COLUMN proveedor TEXT;
ALTER TABLE aportes ADD COLUMN proveedor_ref TEXT;
ALTER TABLE aportes ADD COLUMN suscripcion TEXT;

-- BACKFILL HONESTO. Solo se marca lo que se puede DEDUCIR de un dato existente:
-- si hay id de transaccion de Wompi, vino por Wompi. Lo demas queda en NULL en
-- vez de adivinar — un NULL dice «no se sabe», y eso es cierto; poner 'wompi' a
-- todo diria que una transferencia bancaria paso por la pasarela.
UPDATE aportes SET proveedor = 'wompi' WHERE wompi_transaction_id IS NOT NULL;

-- LA SUSCRIPCION ES OTRA COSA QUE UN APORTE, y por eso tabla propia. Un aporte
-- es un cobro; una suscripcion es el permiso que dio el donante para cobrarle
-- otra vez. Cada cobro mensual crea su PROPIA fila en `aportes` -con su guia,
-- su recibo y su trazabilidad, como cualquier otro- y apunta aqui.
CREATE TABLE IF NOT EXISTS suscripciones (
  id                 TEXT PRIMARY KEY,
  proveedor          TEXT NOT NULL DEFAULT 'paypal',
  plan_ref           TEXT NOT NULL,
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
  cancelada_motivo   TEXT
);

-- Para responder «cuantos cobros lleva esta suscripcion» sin recorrer la tabla.
CREATE INDEX IF NOT EXISTS idx_aportes_suscripcion ON aportes(suscripcion)
  WHERE suscripcion IS NOT NULL;

-- Para la bandeja del panel: las que esperan aprobacion y las activas.
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);
