-- Give&Grow · base privada · migración 0060
-- ============================================================================
-- LOS COSTOS POR UNIDAD DE IMPACTO (ítem 38, 30 oct 2026, opción A de Sebas).
--
-- La calculadora pública ya acepta varias unidades por fundación: salen de
-- `impactUnits` en data/partners.json, que sigue siendo LA FUENTE. Lo que
-- faltaba era que la fundación las propusiera y las actualizara ella misma.
--
-- El camino: la fundación propone cada unidad en su portal, con el soporte del
-- costo → el equipo la verifica en la Bandeja de revisión y escribe el inglés
-- → el panel arma el bloque `impactUnits` listo para pegar en partners.json, y
-- eso entra al sitio con un PR. Ninguna cifra sale al sitio sin pasar por el
-- equipo y por un PR. Esta tabla NO se lee desde ninguna página pública.
--
-- · nombre_es / nombre_es_pl: «plato de comida» / «platos de comida», como
--   los usa la calculadora («tu aporte equivale a 40 platos de comida»).
-- · estado: propuesta | aprobada | devuelta | retirada. Editar una aprobada la
--   vuelve propuesta: el costo pudo cambiar.
--
-- IF NOT EXISTS y ningún ALTER: reaplicarla es seguro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS unidades_impacto (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion   INTEGER NOT NULL REFERENCES inscripciones(id),
  proyecto      TEXT,
  nombre_es     TEXT NOT NULL,
  nombre_es_pl  TEXT NOT NULL,
  nombre_en     TEXT,                       -- lo escribe el equipo al aprobar
  nombre_en_pl  TEXT,
  costo_cop     INTEGER NOT NULL CHECK (costo_cop > 0),
  incluye       TEXT,
  soporte_doc   INTEGER REFERENCES documentos_fundacion(id),
  estado        TEXT NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta', 'aprobada', 'devuelta', 'retirada')),
  motivo        TEXT,
  revisado_en   TEXT,
  revisado_por  TEXT,
  creada        TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_unidades_impacto ON unidades_impacto (inscripcion, estado);
