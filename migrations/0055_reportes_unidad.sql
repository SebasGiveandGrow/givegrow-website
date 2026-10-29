-- Give&Grow · base privada · migración 0055
-- ============================================================================
-- APADRINAMIENTO · FASE 3: EL REPORTE MENSUAL VERIFICABLE (29 oct 2026).
--
-- Cada mes, por cada unidad publicada, la fundación reporta desde /portal
-- cuántas entregó y adjunta la evidencia que se comprometió a mostrar (la de
-- `unidades_apadrinables.evidencia`). El equipo lo revisa en el panel:
--   · aprobado → sale en la tarjeta pública de la unidad como «último reporte
--     verificado», y en la fase 2 será lo que reciba cada padrino;
--   · devuelto → con un motivo que la fundación ve, y lo corrige.
--
-- Un reporte aprobado no se reescribe: es lo que se le mostró al público. Si
-- estaba mal, se habla con la fundación y se corrige el del mes siguiente.
-- La evidencia es un documento de `documentos_fundacion` (fotos sin menores
-- identificables, listas, actas): privado, solo lo abre el panel.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reportes_unidad (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  unidad_id      INTEGER NOT NULL REFERENCES unidades_apadrinables(id),
  periodo        TEXT NOT NULL CHECK (periodo GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  entregadas     INTEGER NOT NULL CHECK (entregadas >= 0),
  nota           TEXT,                          -- qué pasó este mes, en palabras
  evidencia_doc  INTEGER NOT NULL REFERENCES documentos_fundacion(id),
  estado         TEXT NOT NULL DEFAULT 'enviado' CHECK (estado IN ('enviado', 'aprobado', 'devuelto')),
  motivo         TEXT,
  creado         TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado    TEXT NOT NULL DEFAULT (datetime('now')),
  revisado_en    TEXT,
  revisado_por   TEXT,
  UNIQUE (unidad_id, periodo)
);
CREATE INDEX IF NOT EXISTS ix_reportes_estado ON reportes_unidad(estado, actualizado);
