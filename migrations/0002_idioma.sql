-- Give&Grow · base privada · migración 0002
-- ============================================================================
-- Guardar el idioma con el que el donante hizo su aporte.
--
-- Wompi no lo entrega, y sin esto el correo de confirmación saldría siempre en
-- español — incluido para quien navegó todo el sitio en inglés. El sitio nació
-- bilingüe por decisión de marca; el correo no puede ser la excepción.
--
-- Se captura en /api/checkout desde el idioma activo del sitio, que es el único
-- momento en que lo sabemos con certeza.

ALTER TABLE aportes ADD COLUMN idioma TEXT NOT NULL DEFAULT 'es';

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0002_idioma.sql');
