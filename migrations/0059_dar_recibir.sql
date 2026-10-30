-- Give&Grow · base privada · migración 0059
-- ============================================================================
-- DAR Y RECIBIR (ítem 37, 30 oct 2026).
--
-- Cada fundación de la red dice en su portal lo que puede OFRECER a otras
-- (en especie, voluntariado, conocimiento, espacios) y lo que NECESITA. El
-- equipo lo ve todo junto en el panel (Acompañar la red › Dar y recibir) para
-- cruzar una fundación con otra, o con una empresa, y le deja una nota que la
-- fundación ve en su portal. NADA DE ESTO SE PUBLICA.
--
-- · tipo: ofrece | necesita.
-- · estado: activo | resuelto (se cubrió) | retirado (la fundación lo quitó).
--   No se borra: queda el registro de lo que la red se dio.
-- · visto_en: cuándo lo vio el equipo. NULL = nuevo, y sale en «Hoy».
--
-- IF NOT EXISTS y ningún ALTER: reaplicarla es seguro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS intercambios_fundacion (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion  INTEGER NOT NULL REFERENCES inscripciones(id),
  tipo         TEXT NOT NULL CHECK (tipo IN ('ofrece', 'necesita')),
  categoria    TEXT NOT NULL CHECK (categoria IN ('especie', 'voluntariado', 'conocimiento', 'espacio', 'otro')),
  titulo       TEXT NOT NULL,
  detalle      TEXT,
  cantidad     TEXT,                       -- «200 cuadernos», «dos tardes al mes»
  hasta        TEXT,                       -- AAAA-MM-DD, opcional
  estado       TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'resuelto', 'retirado')),
  nota_equipo  TEXT,                       -- la ve la fundación
  visto_en     TEXT,
  visto_por    TEXT,
  creado       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_intercambios_fundacion ON intercambios_fundacion (inscripcion, estado);
CREATE INDEX IF NOT EXISTS ix_intercambios_visto ON intercambios_fundacion (visto_en, estado);
