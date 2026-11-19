-- Migración 0069 — la fundación edita su tarjeta del HUB desde su portal y
-- Sebas la aprueba (19 nov 2026, pedido de Sebas).
--
-- La tarjeta es lo que el público ve en la ficha de la fundación: la frase,
-- quiénes son, dónde trabajan, a quién acompañan y sus programas. Hasta hoy
-- salía SOLO de data/partners.json y cada cambio era un PR. Ahora la fundación
-- la propone en español desde su portal; el equipo la revisa en /admin,
-- escribe el inglés y, al aprobarla, el Worker la publica sola (la mezcla
-- sobre partners.json en `redPublica`, igual que las unidades de impacto de
-- la 0068).
--
-- · propuesta: lo último que envió la fundación (JSON, solo español).
-- · publicada: lo último que el equipo aprobó (JSON, español e inglés). Es lo
--   que sale en el sitio, también mientras una propuesta nueva espera
--   revisión: el sitio nunca muestra algo sin aprobar.
-- · estado: enviada (espera revisión) | aprobada | devuelta (con motivo).

CREATE TABLE IF NOT EXISTS tarjetas_fundacion (
  inscripcion   INTEGER PRIMARY KEY REFERENCES inscripciones(id),
  propuesta     TEXT,
  estado        TEXT NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada', 'aprobada', 'devuelta')),
  motivo        TEXT,
  publicada     TEXT,
  enviada_en    TEXT,
  revisada_en   TEXT,
  revisada_por  TEXT,
  actualizada   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_tarjetas_estado ON tarjetas_fundacion (estado);
