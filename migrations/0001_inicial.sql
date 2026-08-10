-- Give&Grow · base privada (D1 `givegrow-privado`) · migración inicial
-- ============================================================================
-- SEPARACIÓN OBLIGATORIA (Ley 1581 de 2012, habeas data):
-- Esta base es PRIVADA y no se sirve nunca al navegador. Los datos públicos de
-- la red siguen en data/partners.json. Los datos personales del donante viven
-- SOLO en la tabla `donantes`; el resto de las tablas la referencian por id,
-- para que una consulta operativa no arrastre datos personales.
--
-- Aplicada el 10 de agosto de 2026 sobre la base e40b0794-37ab-4461-bf59-53b682095446.

-- ---------------------------------------------------------------------------
-- Numerador atómico de guías: GG-YYYY-NNNNNN
-- El número de guía es TAMBIÉN la `reference` que se envía a Wompi. Un solo
-- número: lo que el donante rastrea en #rastrea es lo que Wompi conoce.
-- Se incrementa con UPDATE ... RETURNING, que en D1 es atómico.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS numerador (
  anio      INTEGER PRIMARY KEY,
  ultimo    INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Donantes: la única tabla con datos personales.
-- Wompi entrega identidad ya validada; aquí solo se guarda lo mínimo para
-- emitir el certificado y poder responder a un derecho de habeas data.
-- NUNCA se guarda medio de pago: eso queda tokenizado en Wompi.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donantes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE,
  nombre         TEXT,
  doc_tipo       TEXT,             -- CC, CE, NIT, PP, TI, DNI, RG, OTHER
  doc_numero     TEXT,
  telefono       TEXT,
  ciudad         TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Aportes: una sola tabla con máquina de estados, en vez de "intenciones" y
-- "aportes" separadas. Dos tablas obligarían a sincronizarlas y ahí es donde
-- se pierden los registros.
--
-- estado:
--   intencion       se creó la referencia y se firmó, aún no se sabe nada
--   pendiente       Wompi reportó la transacción en curso
--   aprobada        pago confirmado por webhook
--   rechazada       declinada por el medio de pago
--   error           falló en Wompi
--   expirada        el checkout venció sin pagar
--   en_distribucion el HUB la recibió y la está gestionando
--   entregada       existe acta de entrega
--
-- `monto_centavos` es INTEGER a propósito: nunca coma flotante para dinero.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aportes (
  guia                 TEXT PRIMARY KEY,          -- GG-2026-000042, y reference en Wompi
  estado               TEXT NOT NULL DEFAULT 'intencion',
  monto_centavos       INTEGER NOT NULL,
  moneda               TEXT NOT NULL DEFAULT 'COP',
  modo                 TEXT NOT NULL DEFAULT 'fondo',   -- dirigida | fondo
  destino_id           TEXT,                            -- id de partners.json si es dirigida
  proyecto             TEXT,
  frecuencia           TEXT NOT NULL DEFAULT 'unico',   -- unico | mensual | anual
  quiere_certificado   INTEGER NOT NULL DEFAULT 0,
  consent_muro         TEXT NOT NULL DEFAULT 'no',      -- nombre | anonimo | no
  nota                 TEXT,
  donante_id           INTEGER REFERENCES donantes(id),
  wompi_transaction_id TEXT,
  wompi_estado         TEXT,
  metodo_pago          TEXT,                            -- CARD, PSE, NEQUI, ...
  aprobada_en          TEXT,
  entregada_en         TEXT,
  acta_url             TEXT,
  creada_en            TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_aportes_estado   ON aportes(estado);
CREATE INDEX IF NOT EXISTS ix_aportes_wompi    ON aportes(wompi_transaction_id);
CREATE INDEX IF NOT EXISTS ix_aportes_donante  ON aportes(donante_id);
CREATE INDEX IF NOT EXISTS ix_aportes_creada   ON aportes(creada_en);

-- ---------------------------------------------------------------------------
-- Eventos de Wompi: bitácora cruda + idempotencia.
-- La documentación advierte que el mismo evento puede llegar hasta cuatro
-- veces (reintentos a los 30 min, 3 h y 24 h). El UNIQUE sobre
-- (transaction_id, estado) hace que reprocesar sea inofensivo, sin impedir la
-- transición legítima PENDING -> APPROVED.
-- Se guarda el cuerpo completo para poder auditar una disputa.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos_wompi (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id  TEXT NOT NULL,
  evento          TEXT NOT NULL,
  estado          TEXT NOT NULL,
  guia            TEXT,
  checksum        TEXT,
  firma_valida    INTEGER NOT NULL DEFAULT 0,
  timestamp_wompi INTEGER,
  cuerpo          TEXT,
  procesado       INTEGER NOT NULL DEFAULT 0,
  recibido_en     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (transaction_id, estado)
);
CREATE INDEX IF NOT EXISTS ix_eventos_guia ON eventos_wompi(guia);

-- ---------------------------------------------------------------------------
-- Inscripciones: las tres puertas de entrada de la Fase 3 en una sola tabla.
-- `datos` es JSON porque cada tipo pide campos distintos y no vale la pena
-- una tabla por tipo; lo que sí se indexa es tipo, estado y correo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inscripciones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT NOT NULL,                  -- voluntario | fundacion | empresa
  estado      TEXT NOT NULL DEFAULT 'nueva',  -- nueva | en_revision | aceptada | archivada
  nombre      TEXT,
  email       TEXT,
  telefono    TEXT,
  ciudad      TEXT,
  datos       TEXT,                           -- JSON con lo propio de cada tipo
  nota_interna TEXT,
  creada_en   TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_inscripciones_tipo   ON inscripciones(tipo, estado);
CREATE INDEX IF NOT EXISTS ix_inscripciones_email  ON inscripciones(email);

-- ---------------------------------------------------------------------------
-- Consentimientos: rastro de Ley 1581. Revocable por diseño, y la revocación
-- no borra el rastro — se marca, porque el rastro es la prueba de que hubo
-- autorización mientras la hubo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consentimientos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sujeto      TEXT NOT NULL,                  -- email o donantes.id
  tipo        TEXT NOT NULL,                  -- datos | muro | comunicaciones
  detalle     TEXT,
  otorgado_en TEXT NOT NULL DEFAULT (datetime('now')),
  revocado_en TEXT
);
CREATE INDEX IF NOT EXISTS ix_consent_sujeto ON consentimientos(sujeto, tipo);

-- ---------------------------------------------------------------------------
-- Tabla de migraciones con el nombre y forma que usa wrangler, para que
-- `wrangler d1 migrations apply` no intente reaplicar esta.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS d1_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_inicial.sql');
