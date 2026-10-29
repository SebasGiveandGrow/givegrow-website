-- Give&Grow · base privada · migración 0054
-- ============================================================================
-- APADRINAMIENTO POR UNIDAD DE IMPACTO · FASE 1: EL CATÁLOGO (29 oct 2026).
--
-- La metodología (decisión de Sebas, 29 oct): la gente apadrina cada MES una
-- unidad de impacto verificable de una fundación del HUB —un niño en un
-- programa, un filtro de agua para una familia, una beca de baile o fútbol—.
-- Esta fase arma el catálogo y no cobra nada:
--   · la fundación propone sus unidades desde /portal;
--   · el equipo verifica el costo contra su soporte y las aprueba en el panel;
--   · las aprobadas salen en /apadrinamiento, con la calculadora.
-- El cobro mensual (fase 2) espera la conversación con el contador.
--
-- MODALIDAD: «cupo» (un lugar en el programa; el padrino recibe los avances
-- del grupo) o «identificado» (un niño con nombre de pila, solo con
-- autorización escrita de su acudiente). Ninguna permite contacto entre el
-- padrino y el niño.
--
-- Nada se borra: una unidad se retira o se pausa, con su rastro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS unidades_apadrinables (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion        INTEGER NOT NULL REFERENCES inscripciones(id),
  nombre_es          TEXT NOT NULL,              -- «Beca mensual de fútbol»
  nombre_en          TEXT,                       -- lo completa el equipo al aprobar
  programa           TEXT,                       -- «Fútbol por la Paz»
  descripcion_es     TEXT NOT NULL,
  descripcion_en     TEXT,
  incluye            TEXT,                       -- qué cubre el costo
  incluye_en         TEXT,
  evidencia          TEXT NOT NULL,              -- cómo lo reporta cada mes
  evidencia_en       TEXT,
  modalidad          TEXT NOT NULL CHECK (modalidad IN ('cupo', 'identificado')),
  costo_mensual_cop  INTEGER NOT NULL CHECK (costo_mensual_cop > 0),
  cupos              INTEGER CHECK (cupos IS NULL OR cupos > 0),   -- NULL = sin tope
  soporte_doc        INTEGER REFERENCES documentos_fundacion(id),
  estado             TEXT NOT NULL DEFAULT 'propuesta'
                     CHECK (estado IN ('propuesta', 'aprobada', 'pausada', 'rechazada', 'retirada')),
  motivo             TEXT,                       -- de rechazo o pausa
  creada             TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada        TEXT NOT NULL DEFAULT (datetime('now')),
  aprobada_en        TEXT,
  aprobada_por       TEXT
);
CREATE INDEX IF NOT EXISTS ix_unidades_estado ON unidades_apadrinables(estado, inscripcion);

-- Quien quiere apadrinar antes de que abra el cobro mensual. Su autorización
-- (Ley 1581) va a `consentimientos` con el número de la fila.
CREATE TABLE IF NOT EXISTS apadrinamiento_interes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL,
  email        TEXT NOT NULL,
  unidad_id    INTEGER REFERENCES unidades_apadrinables(id),
  cantidad     INTEGER NOT NULL DEFAULT 1 CHECK (cantidad BETWEEN 1 AND 50),
  idioma       TEXT NOT NULL DEFAULT 'es',
  creado       TEXT NOT NULL DEFAULT (datetime('now')),
  atendido_en  TEXT
);
CREATE INDEX IF NOT EXISTS ix_interes_creado ON apadrinamiento_interes(creado);
