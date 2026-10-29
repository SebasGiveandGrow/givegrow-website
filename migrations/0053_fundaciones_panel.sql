-- Give&Grow · base privada · migración 0053
-- ============================================================================
-- LA ZONA «FUNDACIONES» DEL PANEL Y LOS CORREOS AUTORIZADOS (29 oct 2026).
--
-- · portal_correos — más correos que pueden entrar a /portal por una
--   fundación, además del de su solicitud. Lo pidió Ancla: el correo de la
--   solicitud no es el único con el que entra su equipo.
--   Solo los agrega una persona desde el panel.
-- · inscripciones.red_id — el id de la fundación en data/partners.json
--   («ancla», «ndf»). Une la solicitud con las donaciones dirigidas a ella.
-- · portal_enlaces.email y portal_sesiones.email — con qué correo se entró.
--   Con varios correos por fundación, «entró alguien» deja de bastar.
--
-- ALTER TABLE ADD COLUMN no admite IF NOT EXISTS: la tabla de migraciones
-- evita que se corra dos veces.
-- ============================================================================

CREATE TABLE IF NOT EXISTS portal_correos (
  inscripcion   INTEGER NOT NULL REFERENCES inscripciones(id),
  email         TEXT NOT NULL,                 -- en minúsculas
  agregado      TEXT NOT NULL DEFAULT (datetime('now')),
  agregado_por  TEXT,
  PRIMARY KEY (inscripcion, email)
);
CREATE INDEX IF NOT EXISTS ix_portal_correos_email ON portal_correos(email);

ALTER TABLE inscripciones ADD COLUMN red_id TEXT;
ALTER TABLE portal_enlaces ADD COLUMN email TEXT;
ALTER TABLE portal_sesiones ADD COLUMN email TEXT;
