-- Give&Grow · base privada · migración 0005
-- ============================================================================
-- Fase 6 del ecosistema: la evidencia. Hasta hoy el sitio PROMETÍA «publicamos
-- el acta de cada entrega» y no tenía dónde registrarla. La página de la
-- brigada repite esa promesa, así que esto debe existir antes de la primera
-- entrega, no después.
--
-- QUÉ ES UNA ENTREGA AQUÍ: una jornada real en un lugar real, con su acta
-- firmada en papel. Lo que se guarda es el registro de esa acta y su foto —
-- el documento legal sigue siendo el papel que firma quien recibe.

-- ---------------------------------------------------------------------------
-- LA DECISIÓN QUE GOBIERNA ESTA TABLA: una entrega se asocia a un DESTINO, no
-- a un aporte.
--
-- Tentador sería decirle a cada donante «tu plata compró estas colchonetas».
-- Sería falso: el dinero es fungible y una jornada se paga con muchos aportes.
-- MEDICION.md ya fijó la doctrina —contribución, no atribución— y esta tabla la
-- respeta: quien aportó a `brigada-emergencia-2026-08` ve las entregas de esa
-- campaña, sin que se le invente una trazabilidad peso a peso que no existe.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entregas (
  numero       TEXT PRIMARY KEY,              -- AE-2026-000001
  destino_id   TEXT NOT NULL,                 -- campaña (brigada-…) o id de fundación
  sector       TEXT NOT NULL,                 -- Pereira, Cali, Chocó…
  lugar        TEXT,                          -- albergue o punto. NUNCA dirección de una familia
  fecha        TEXT NOT NULL,                 -- YYYY-MM-DD, la del acta en papel
  aliada       TEXT,                          -- fundación del territorio con la que se entregó
  familias     INTEGER,                       -- cuántas recibieron, según el acta
  resumen      TEXT NOT NULL,                 -- qué se entregó, por categorías
  -- ROL Y ENTIDAD de quien firma el acta ("coordinadora del albergue"), no el
  -- nombre de una persona beneficiaria. Los nombres de quienes reciben ayuda
  -- NO se publican: Ley 1581, y con menores hay protección reforzada.
  recibido_por TEXT,
  fotos        TEXT,                          -- JSON [{k:"clave R2", alt:"texto alternativo"}]
  publicada_en TEXT,                          -- NULL = borrador, no visible en el sitio
  creada_por   TEXT NOT NULL,                 -- correo de Access
  creada_en    TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en TEXT
);

-- El sitio consulta siempre por destino y solo lo publicado.
CREATE INDEX IF NOT EXISTS ix_entregas_destino ON entregas(destino_id, publicada_en);
CREATE INDEX IF NOT EXISTS ix_entregas_fecha ON entregas(fecha);

-- Consecutivo propio de actas, misma mecánica atómica que guías y certificados.
CREATE TABLE IF NOT EXISTS numerador_acta (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);
