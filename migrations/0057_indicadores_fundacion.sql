-- Give&Grow · base privada · migración 0057
-- ============================================================================
-- LOS INDICADORES DE CADA FUNDACIÓN (ítem 39, 29 oct 2026).
--
-- Cada fundación de la red define en su portal los indicadores con que mide
-- su propio trabajo, y reporta cada periodo el valor con su FUENTE y su fecha
-- de CORTE: la misma regla del MEAL de Give&Grow (0045), «Evidencia, no
-- promesas». El equipo revisa cada medición desde el panel (MEAL y Board ›
-- Indicadores de la red) y puede alinear el indicador con uno de los de
-- Give&Grow (`mel_indicador_id`), que es lo que después deja sumar la red.
--
-- NADA DE ESTO SE PUBLICA. Es seguimiento de la alianza. Si algún día un
-- valor sale al público, se le pregunta antes a la fundación: no basta con
-- que esté aprobado.
--
-- · indicadores_fundacion — la batería de la fundación. `frecuencia` decide
--   la forma del periodo (mensual 2026-09 · trimestral 2026-T3 · semestral
--   2026-S2 · anual 2026). Un indicador no se borra: se retira, y sus
--   mediciones se quedan.
--
-- · mediciones_fundacion — una por indicador y periodo (UNIQUE). `valor` es
--   la cifra; `valor_texto`, lo cualitativo. Al menos uno de los dos. La
--   evidencia (`evidencia_doc`, de documentos_fundacion) es opcional: la
--   fuente escrita no. Una medición aprobada no se reescribe: si hay que
--   corregirla, la fundación escribe al equipo.
--
-- IF NOT EXISTS en todo y ningún ALTER: reaplicarla es seguro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS indicadores_fundacion (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion      INTEGER NOT NULL REFERENCES inscripciones(id),
  nombre           TEXT NOT NULL,
  unidad           TEXT,                     -- niños, familias, %, horas…
  frecuencia       TEXT NOT NULL CHECK (frecuencia IN ('mensual', 'trimestral', 'semestral', 'anual')),
  fuente           TEXT NOT NULL,            -- de dónde sale el dato, en general
  linea_base       TEXT,
  meta             TEXT,
  meta_fecha       TEXT,                     -- AAAA-MM-DD: para cuándo es la meta
  mel_indicador_id INTEGER REFERENCES mel_indicadores(id),  -- lo pone el equipo
  estado           TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'retirado')),
  creado           TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_indicadores_fundacion ON indicadores_fundacion (inscripcion, estado);

CREATE TABLE IF NOT EXISTS mediciones_fundacion (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  indicador_id    INTEGER NOT NULL REFERENCES indicadores_fundacion(id),
  periodo         TEXT NOT NULL,
  valor           REAL,
  valor_texto     TEXT,
  fuente_detalle  TEXT NOT NULL,             -- qué lista, acta o registro de ESTE periodo
  corte           TEXT NOT NULL,             -- AAAA-MM-DD: hasta cuándo cuenta el dato
  evidencia_doc   INTEGER REFERENCES documentos_fundacion(id),
  nota            TEXT,
  estado          TEXT NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada', 'aprobada', 'devuelta')),
  motivo          TEXT,
  revisado_en     TEXT,
  revisado_por    TEXT,
  creado          TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado     TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (valor IS NOT NULL OR valor_texto IS NOT NULL),
  UNIQUE (indicador_id, periodo)
);
CREATE INDEX IF NOT EXISTS ix_mediciones_fundacion_estado ON mediciones_fundacion (estado, actualizado);
