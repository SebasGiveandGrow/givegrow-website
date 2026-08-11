-- Give&Grow · base privada · migración 0003
-- ============================================================================
-- Fase 5 del ecosistema: los documentos. Dos piezas distintas, y la diferencia
-- entre ellas es jurídica, no de formato:
--
--   RECIBO      lo emite el sistema solo, al confirmarse el pago. No afirma
--               nada tributario: dice qué llegó, cuándo y con qué guía.
--   CERTIFICADO es una declaración BAJO LA GRAVEDAD DE JURAMENTO que firman el
--               Representante Legal y la Revisora Fiscal (art. 125-3 ET y
--               num. 2 del art. 1.2.1.4.3 del Decreto 1625 de 2016). No puede
--               salir solo: lo emite una persona desde /admin.

-- ---------------------------------------------------------------------------
-- Token de acceso al recibo.
--
-- La guía es CONSECUTIVA (GG-2026-000042), así que adivinar la siguiente es
-- trivial. Hoy eso es tolerable porque /api/aporte devuelve solo lo que puede
-- ser público, pero el recibo lleva el nombre del donante y su dedicatoria.
-- Con un token de 128 bits el enlace del correo es el único camino.
--
-- Nullable y luego relleno, porque SQLite no acepta DEFAULT no constante en
-- ALTER TABLE. randomblob() usa el CSPRNG de SQLite, no un rand() cualquiera.
-- ---------------------------------------------------------------------------
ALTER TABLE aportes ADD COLUMN token TEXT;
UPDATE aportes SET token = lower(hex(randomblob(16))) WHERE token IS NULL;
CREATE INDEX IF NOT EXISTS ix_aportes_token ON aportes(token);

-- ---------------------------------------------------------------------------
-- Numerador de certificados: CD-YYYY-NNNNNN, propio y aparte del de guías.
--
-- Comparten mecánica (UPDATE ... RETURNING, atómico en D1) pero no serie: un
-- certificado se expide sobre un aporte ya aprobado y solo si el donante lo
-- pidió, así que numerarlos con la guía dejaría huecos en un consecutivo que la
-- DIAN puede pedir completo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS numerador_cert (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Certificados emitidos.
--
-- `datos` congela el contenido al momento de emitir. NO es duplicación
-- perezosa: si mañana el donante corrige su nombre en `donantes`, el PDF que ya
-- está en manos de la DIAN no puede cambiar de contenido al volver a
-- descargarlo. Lo que se certificó bajo juramento es lo que se certificó.
--
-- Un certificado no se borra: se ANULA, dejando motivo y fecha. El consecutivo
-- conserva el hueco a propósito — un número que desaparece es peor que un
-- número anulado.
--
-- UNIQUE sobre guia: un aporte, un certificado vigente. Reexpedir exige anular
-- el anterior, que es justo la fricción que debe tener.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificados (
  numero         TEXT PRIMARY KEY,              -- CD-2026-000001
  guia           TEXT NOT NULL REFERENCES aportes(guia),
  datos          TEXT NOT NULL,                 -- JSON congelado al emitir
  emitido_por    TEXT NOT NULL,                 -- correo de quien lo emitió (Access)
  emitido_en     TEXT NOT NULL DEFAULT (datetime('now')),
  enviado_en     TEXT,
  enviado_a      TEXT,
  anulado_en     TEXT,
  anulado_motivo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_certificados_guia_vigente
  ON certificados(guia) WHERE anulado_en IS NULL;
CREATE INDEX IF NOT EXISTS ix_certificados_emitido ON certificados(emitido_en);

-- NO se inserta la fila en `d1_migrations`: eso lo hace `wrangler d1 migrations
-- apply` por su cuenta, y hacerlo aquí rompe el comando. 0002 sí lo hace, y por
-- eso un `migrations apply` sobre una base limpia falla con «UNIQUE constraint
-- failed: d1_migrations.name» — verificado el 11 ago 2026 al montar la base
-- local de esta fase. Las dos primeras migraciones se aplicaron a mano con
-- `d1 execute`, donde ese INSERT sí hacía falta; desde esta, el comando manda.
