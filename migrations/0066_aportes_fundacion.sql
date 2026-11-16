-- Migración 0066 — el registro de aportes entre fundaciones (16 nov 2026).
--
-- Hasta hoy una fundación podía decir QUÉ puede dar (su rol y sus ofertas en
-- «Dar y recibir»), pero no existía el dato de lo que EFECTIVAMENTE dio: sin
-- él no hay rastreo ni informe de retorno. Decisión de Sebas del 16 nov.
--
-- Una fila = un aporte de una fundación (`da`) a otra de la red (`recibe`), o
-- a la red sin destinataria todavía (`recibe` NULL: el equipo la asigna).
--
-- LO QUE LA FUNDACIÓN ESCRIBE ES UNA DECLARACIÓN, no un hecho verificado: nace
-- en 'registrado'. El equipo lo pasa a 'confirmado' (lo cruzó con la otra
-- parte) y a 'entregado' (llegó). Solo lo confirmado o entregado cuenta en los
-- totales que ve la fundación. Evidencia, no promesas.
--
-- `cantidad` + `unidad`: cada tipo se mide en lo suyo (pesos, kilos, horas,
-- personas formadas…) y no se suman entre tipos. Para dinero la cantidad va en
-- pesos enteros. Es un dato operativo del portal: no es contabilidad ni
-- reemplaza el certificado de donación.

CREATE TABLE IF NOT EXISTS aportes_fundacion (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  da           INTEGER NOT NULL REFERENCES inscripciones(id),
  recibe       INTEGER REFERENCES inscripciones(id),
  intercambio  INTEGER REFERENCES intercambios_fundacion(id),
  tipo         TEXT NOT NULL CHECK (tipo IN ('dinero', 'especie', 'voluntariado', 'conocimiento', 'espacios', 'logistica', 'visibilidad')),
  titulo       TEXT NOT NULL,
  cantidad     REAL NOT NULL CHECK (cantidad > 0),
  unidad       TEXT NOT NULL,
  fecha        TEXT NOT NULL,              -- AAAA-MM-DD, cuándo se dio
  estado       TEXT NOT NULL DEFAULT 'registrado' CHECK (estado IN ('registrado', 'confirmado', 'entregado', 'anulado')),
  nota_equipo  TEXT,                       -- la ve la fundación que da
  revisado_por TEXT,
  revisado_en  TEXT,
  creado       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_aportes_fundacion_da ON aportes_fundacion (da, estado);
CREATE INDEX IF NOT EXISTS ix_aportes_fundacion_recibe ON aportes_fundacion (recibe, estado);
