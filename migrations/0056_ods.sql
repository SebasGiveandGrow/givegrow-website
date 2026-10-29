-- Give&Grow · base privada · migración 0056
-- ============================================================================
-- OBJETIVOS DE DESARROLLO SOSTENIBLE (29 oct 2026, ítem 41 de la lista).
--
-- · ods_fundacion — los ODS que una fundación declara que trabaja, marcados
--   desde su portal. Es una DECLARACIÓN de la fundación, no una medición: el
--   sitio lo dirá así cuando se publique el mapa (ítem 47).
-- · unidades_apadrinables.ods — los ODS a los que aporta cada unidad, como
--   lista «4,5». Se publica con la unidad, que pasa por revisión del equipo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ods_fundacion (
  inscripcion  INTEGER NOT NULL REFERENCES inscripciones(id),
  ods          INTEGER NOT NULL CHECK (ods BETWEEN 1 AND 17),
  marcado      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (inscripcion, ods)
);

ALTER TABLE unidades_apadrinables ADD COLUMN ods TEXT;
