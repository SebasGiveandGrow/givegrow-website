-- Give&Grow · base privada · migración 0048
-- ============================================================================
-- REGALOS DE DICIEMBRE (oct 2026).
--
-- Una lista pública de deseos: cada niño pide un regalo, un donante lo escoge
-- (uno o varios), lo paga en pesos por Wompi o en dólares a través de la
-- fundación aliada de EE. UU., y sigue su recorrido hasta la entrega:
-- financiado → comprado → despachado → entregado.
--
-- LA REGLA QUE GOBIERNA TODO EL MÓDULO: son datos de MENORES (Ley 1581 art. 7,
-- Decreto 1377 de 2013 art. 12). Por eso hay dos tablas y no una:
--
-- · regalo_ninos es PRIVADA: nombre completo, acudiente, teléfono, comunidad y
--   la autorización firmada. Solo la lee /admin, tras Access. Ningún endpoint
--   público la consulta con SELECT *: el API público elige columna por columna.
--
-- · regalos es lo que se publica: nombre de pila, edad, zona, el regalo y su
--   valor. La foto SOLO sale si el acudiente marcó la casilla
--   (`autoriza_foto = 1`); sin ella, la tarjeta va sin foto. Decisión del
--   fundador (24 oct 2026): publicar la foto con autorización, asumiendo él ese
--   riesgo. La foto se guarda en R2 sin metadatos (el Worker quita el EXIF,
--   que puede traer la ubicación GPS de la casa).
--
-- Ningún canal entre donante y niño: el donante sigue el regalo por su
-- referencia, nunca recibe el contacto del acudiente.
--
-- Nueve tablas, todas con IF NOT EXISTS (reaplicarla con `migrations apply` es
-- seguro: ver la nota de la 0028 en CLAUDE.md), y ningún ALTER.
--
-- · regalo_campanas — la campaña (`navidad-2026`). `estado` decide si la página
--   pública existe: 'borrador' = la página dice «muy pronto» y el API no
--   entrega regalos; 'abierta' = se puede escoger y pagar; 'cerrada' = se ve el
--   recorrido pero ya no se paga. `aliada_*` es la fundación de EE. UU. que
--   recibe los dólares y emite allá el certificado: su enlace admite `{ref}` y
--   `{usd}`, que el Worker reemplaza si la pasarela de la aliada los acepta.
--
-- · regalo_zonas — las tres zonas y su META (cuántos niños), que es lo único
--   que la página promete. Uribia 400, Medellín 200, Leticia 400.
--
-- · regalo_categorias — tipo de regalo y su VALOR: un tope fijo por tipo, no el
--   precio de cada deseo, para que sea justo entre los niños. Nacen sin valor
--   (NULL): un regalo no se publica mientras su categoría no tenga valor en
--   pesos Y en dólares. Los dólares son números redondos por claridad, no una
--   conversión de la TRM (la misma decisión de las membresías, 3 sep 2026).
--
-- · regalo_ninos — privada, ver arriba. `codigo` (URI-0001) es lo único que
--   cruza a lo público: no dice nada del niño.
--
-- · regalos — el deseo publicable. `estado` es el recorrido; la RESERVA va
--   aparte (`reserva_ref` + `reservado_hasta`) porque no es un estado del
--   regalo sino un candado que vence solo: un regalo está disponible si está
--   'publicado' y no tiene reserva vigente. No hace falta un cron que libere.
--
-- · regalo_pedidos y regalo_pedido_items — lo que un donante escogió, con su
--   referencia pública (RG-2026-000001) y un token para el seguimiento. Un
--   pedido en pesos apunta a su aporte (`guia`), que es el que lleva el dinero,
--   el recibo y el certificado de siempre. Un pedido en dólares NO tiene aporte:
--   ese dinero lo recibe la aliada, y se confirma desde /admin cuando ella lo
--   reporta. Cada ítem guarda el valor con que se pagó (el de la categoría
--   puede cambiar después) y, si el regalo escogido ya lo había tomado otro
--   donante cuando llegó el pago, el regalo que lo reemplazó (`sustituto_id`):
--   la plata va a otro niño de la misma zona y se le avisa al donante.
--
-- · numerador_regalo — el consecutivo RG-AAAA-NNNNNN de los pedidos, con la
--   misma mecánica atómica de la guía, en serie aparte: un pedido en dólares
--   no es un aporte de la fundación y no puede gastar un número GG-.
--
-- · regalo_eventos — bitácora: cada cambio de estado, quién y cuándo. Lo que
--   el donante ve en su seguimiento sale de aquí y de las fechas de `regalos`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS regalo_campanas (
  id              TEXT PRIMARY KEY,                 -- navidad-2026
  nombre_es       TEXT NOT NULL,
  nombre_en       TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador', 'abierta', 'cerrada')),
  cierre          TEXT,                             -- AAAA-MM-DD, último día para donar
  aliada_nombre   TEXT,
  aliada_url      TEXT,                             -- admite {ref} y {usd}
  creada_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regalo_zonas (
  id              TEXT PRIMARY KEY,                 -- uribia | medellin | leticia
  campana_id      TEXT NOT NULL REFERENCES regalo_campanas(id),
  prefijo         TEXT NOT NULL UNIQUE,             -- URI | MED | LET (del código)
  nombre_es       TEXT NOT NULL,
  nombre_en       TEXT NOT NULL,
  departamento    TEXT NOT NULL,
  meta            INTEGER NOT NULL,
  fecha_entrega   TEXT,                             -- AAAA-MM-DD, cuando se sepa
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS regalo_categorias (
  id              TEXT PRIMARY KEY,                 -- juguete | ropa | ...
  nombre_es       TEXT NOT NULL,
  nombre_en       TEXT NOT NULL,
  valor_cop       INTEGER,                          -- pesos enteros; NULL = sin definir
  valor_usd       INTEGER,                          -- dólares enteros; NULL = sin definir
  con_talla       INTEGER NOT NULL DEFAULT 0,
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS regalo_ninos (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  campana_id            TEXT NOT NULL REFERENCES regalo_campanas(id),
  zona_id               TEXT NOT NULL REFERENCES regalo_zonas(id),
  codigo                TEXT NOT NULL UNIQUE,       -- URI-0001
  nombre                TEXT NOT NULL,              -- completo; PRIVADO
  nombre_publico        TEXT NOT NULL,              -- el de pila o la inicial
  edad                  INTEGER NOT NULL CHECK (edad BETWEEN 0 AND 17),
  genero                TEXT NOT NULL CHECK (genero IN ('nina', 'nino', 'otro')),
  comunidad             TEXT,                       -- barrio / ranchería; PRIVADO
  acudiente_nombre      TEXT NOT NULL,
  acudiente_parentesco  TEXT,
  acudiente_telefono    TEXT,
  autoriza_datos        INTEGER NOT NULL DEFAULT 0, -- sin esto no se publica nada
  autoriza_foto         INTEGER NOT NULL DEFAULT 0, -- sin esto no se publica la foto
  autorizacion_key      TEXT,                       -- R2: la autorización firmada
  foto_key              TEXT,                       -- R2: foto ya sin EXIF
  notas                 TEXT,                       -- PRIVADO
  creado_en             TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_regalo_ninos_zona ON regalo_ninos(zona_id);

CREATE TABLE IF NOT EXISTS regalos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nino_id          INTEGER NOT NULL REFERENCES regalo_ninos(id),
  campana_id       TEXT NOT NULL REFERENCES regalo_campanas(id),
  zona_id          TEXT NOT NULL REFERENCES regalo_zonas(id),
  codigo           TEXT NOT NULL UNIQUE,            -- = el del niño (un regalo por niño)
  categoria_id     TEXT NOT NULL REFERENCES regalo_categorias(id),
  deseo_es         TEXT NOT NULL,                   -- «Una muñeca», como lo pidió
  deseo_en         TEXT,                            -- traducción; sin ella, el ES
  talla            TEXT,
  estado           TEXT NOT NULL DEFAULT 'borrador'
                   CHECK (estado IN ('borrador', 'publicado', 'financiado', 'comprado',
                                     'despachado', 'entregado', 'retirado')),
  reserva_ref      TEXT,                            -- pedido que lo tiene apartado
  reservado_hasta  TEXT,                            -- UTC; vencida = libre
  pedido_ref       TEXT,                            -- pedido que lo financió
  via              TEXT CHECK (via IN ('cop', 'usd', 'fondo', 'empresa')),
  financiado_por   TEXT,                            -- empresa o fondo, si no hubo pedido
  publicado_en     TEXT,
  financiado_en    TEXT,
  comprado_en      TEXT,
  despachado_en    TEXT,
  entregado_en     TEXT,
  egreso           TEXT,                            -- EG-… de la compra (egresos.numero)
  entrega          TEXT,                            -- AE-… del acta (entregas.numero)
  evidencia        TEXT,                            -- nota libre: remisión, guía de envío
  creado_en        TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_regalos_estado  ON regalos(estado);
CREATE INDEX IF NOT EXISTS ix_regalos_zona    ON regalos(zona_id, estado);
CREATE INDEX IF NOT EXISTS ix_regalos_reserva ON regalos(reserva_ref);
CREATE INDEX IF NOT EXISTS ix_regalos_pedido  ON regalos(pedido_ref);

CREATE TABLE IF NOT EXISTS regalo_pedidos (
  ref              TEXT PRIMARY KEY,                -- RG-2026-000001
  campana_id       TEXT NOT NULL REFERENCES regalo_campanas(id),
  token            TEXT NOT NULL,                   -- para el seguimiento público
  via              TEXT NOT NULL CHECK (via IN ('cop', 'usd')),
  estado           TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'pagado', 'fallido', 'vencido', 'anulado')),
  total_cop        INTEGER,
  total_usd        INTEGER,
  guia             TEXT,                            -- aporte en pesos (Wompi); NULL en dólares
  nombre           TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefono         TEXT,
  idioma           TEXT NOT NULL DEFAULT 'es' CHECK (idioma IN ('es', 'en')),
  pagado_en        TEXT,
  confirmado_por   TEXT,                            -- quién confirmó el pago en dólares
  creado_en        TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_regalo_pedidos_guia   ON regalo_pedidos(guia);
CREATE INDEX IF NOT EXISTS ix_regalo_pedidos_estado ON regalo_pedidos(estado);

CREATE TABLE IF NOT EXISTS regalo_pedido_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_ref       TEXT NOT NULL REFERENCES regalo_pedidos(ref),
  regalo_id        INTEGER NOT NULL REFERENCES regalos(id),
  valor_cop        INTEGER,
  valor_usd        INTEGER,
  sustituto_id     INTEGER REFERENCES regalos(id),  -- si el escogido ya estaba tomado
  resultado        TEXT                             -- financiado | sustituido | sin_cupo
);
CREATE INDEX IF NOT EXISTS ix_regalo_items_pedido ON regalo_pedido_items(pedido_ref);

CREATE TABLE IF NOT EXISTS numerador_regalo (
  anio    INTEGER PRIMARY KEY,
  ultimo  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS regalo_eventos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  regalo_id   INTEGER REFERENCES regalos(id),
  pedido_ref  TEXT,
  tipo        TEXT NOT NULL,                        -- publicado | financiado | comprado | ...
  detalle     TEXT,
  autor       TEXT,                                 -- correo de Access, o 'sistema'
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_regalo_eventos_regalo ON regalo_eventos(regalo_id);
CREATE INDEX IF NOT EXISTS ix_regalo_eventos_pedido ON regalo_eventos(pedido_ref);

-- ---------------------------------------------------------------------------
-- Siembra: la campaña, sus tres zonas y los tipos de regalo SIN valor.
-- La campaña nace en 'borrador': nada se ve hasta que /admin la abra.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO regalo_campanas (id, nombre_es, nombre_en, estado)
VALUES ('navidad-2026', 'Regalos de diciembre 2026', 'December Gifts 2026', 'borrador');

INSERT OR IGNORE INTO regalo_zonas (id, campana_id, prefijo, nombre_es, nombre_en, departamento, meta, orden) VALUES
  ('uribia',   'navidad-2026', 'URI', 'Uribia',   'Uribia',   'La Guajira', 400, 1),
  ('medellin', 'navidad-2026', 'MED', 'Medellín', 'Medellín', 'Antioquia',  200, 2),
  ('leticia',  'navidad-2026', 'LET', 'Leticia',  'Leticia',  'Amazonas',   400, 3);

INSERT OR IGNORE INTO regalo_categorias (id, nombre_es, nombre_en, con_talla, orden) VALUES
  ('juguete',  'Juguete',          'Toy',             0, 1),
  ('ropa',     'Ropa',             'Clothing',        1, 2),
  ('calzado',  'Calzado',          'Shoes',           1, 3),
  ('escolar',  'Útiles escolares', 'School supplies', 0, 4),
  ('deporte',  'Deporte',          'Sports',          0, 5),
  ('libro',    'Libros',           'Books',           0, 6),
  ('otro',     'Otro',             'Other',           0, 7);
