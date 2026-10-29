-- Give&Grow · base privada · migración 0052
-- ============================================================================
-- PORTAL DE FUNDACIONES (29 oct 2026, ítems 34–36 de la lista).
--
-- Una fundación del HUB entra a /portal con un enlace que le llega al correo
-- de su solicitud. No hay contraseñas que perder ni que robar. Desde ahí:
--   · ve en qué paso va su proceso;
--   · después de enviar el cuestionario, sigue editando su perfil, menos
--     las autorizaciones, que quedaron firmadas y no se reescriben;
--   · sube sus documentos legales y su logo.
-- Lo que cambia no se publica solo: queda «por revisar» en el panel.
--
-- Las llaves se guardan como sha256, nunca en claro: quien lea la base no
-- puede entrar con ellas.
-- ============================================================================

-- El enlace del correo: un solo uso, 30 minutos.
CREATE TABLE IF NOT EXISTS portal_enlaces (
  hash         TEXT PRIMARY KEY,
  inscripcion  INTEGER NOT NULL REFERENCES inscripciones(id),
  creado       TEXT NOT NULL DEFAULT (datetime('now')),
  expira       TEXT NOT NULL,
  usado_en     TEXT
);
CREATE INDEX IF NOT EXISTS ix_portal_enlaces_insc ON portal_enlaces(inscripcion, creado);

-- La sesión que deja el enlace: una cookie HttpOnly de 30 días.
CREATE TABLE IF NOT EXISTS portal_sesiones (
  hash         TEXT PRIMARY KEY,
  inscripcion  INTEGER NOT NULL REFERENCES inscripciones(id),
  creada       TEXT NOT NULL DEFAULT (datetime('now')),
  expira       TEXT NOT NULL,
  ultimo_uso   TEXT,
  cerrada_en   TEXT
);
CREATE INDEX IF NOT EXISTS ix_portal_sesiones_insc ON portal_sesiones(inscripcion);

-- El perfil vivo: las respuestas editables de la ficha, después de enviada.
-- `revisado_en` NULL = hay cambios que el equipo no ha visto.
CREATE TABLE IF NOT EXISTS perfil_fundacion (
  inscripcion   INTEGER PRIMARY KEY REFERENCES inscripciones(id),
  datos         TEXT NOT NULL,                 -- JSON, solo campos editables
  actualizado   TEXT NOT NULL DEFAULT (datetime('now')),
  revisado_en   TEXT,
  revisado_por  TEXT
);

-- Los documentos que sube la fundación. Nada se borra: se retira, y el archivo
-- se queda en R2 como soporte de lo que se revisó.
CREATE TABLE IF NOT EXISTS documentos_fundacion (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion   INTEGER NOT NULL REFERENCES inscripciones(id),
  tipo          TEXT NOT NULL CHECK (tipo IN ('rut', 'camara', 'estatutos', 'estados_financieros',
                                              'certificado_bancario', 'logo', 'otro')),
  clave         TEXT NOT NULL,                 -- en R2: fundaciones/<inscripcion>/...
  contenido     TEXT NOT NULL,                 -- application/pdf, image/png...
  bytes         INTEGER NOT NULL,
  nota          TEXT,                          -- «estados 2025», «RUT actualizado»
  subido        TEXT NOT NULL DEFAULT (datetime('now')),
  revisado_en   TEXT,
  revisado_por  TEXT,
  retirado_en   TEXT
);
CREATE INDEX IF NOT EXISTS ix_docs_fundacion ON documentos_fundacion(inscripcion, retirado_en);
