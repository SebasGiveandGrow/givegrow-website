-- Give&Grow · base privada · migración 0049
-- ============================================================================
-- REGALOS: LA CARTA, EL VIDEO Y LAS NOTICIAS (oct 2026).
--
-- Pedido de Sebas (24 oct 2026): que quien regala pueda mandar una carta o un
-- mensaje con el regalo, o grabar un video de 30 segundos a 1 minuto; y pedir
-- el correo para seguir contando lo que se hizo, agradecer e invitar a las
-- próximas actividades.
--
-- Dos tablas, con IF NOT EXISTS (reaplicarla con `migrations apply` es seguro:
-- ver la nota de la 0028 en CLAUDE.md), y ningún ALTER.
--
-- · regalo_mensajes — una carta y un video POR PEDIDO, que acompañan a cada
--   uno de sus regalos. Son palabras de un adulto para un niño, así que NADA
--   se entrega sin que una persona del equipo lo revise: `estado` nace en
--   'pendiente' y solo 'aprobado' se imprime o se muestra en la entrega.
--   Cambiar la carta o el video vuelve a ponerlo en 'pendiente'. Si se
--   rechaza, `motivo` dice por qué y al donante se le escribe para que lo
--   corrija. El video vive en R2, PRIVADO: nunca se publica ni se sirve fuera
--   de /admin.
--
-- · regalo_noticias — quién autorizó, con una casilla que nace DESMARCADA
--   (Ley 1581: la autorización para comunicaciones que no son del pedido tiene
--   que ser expresa), que le escribamos después: lo que se hizo, el
--   agradecimiento y las próximas actividades. Una fila por correo. Retirar la
--   autorización no borra la fila: se marca `baja_en`, que es el rastro de que
--   la pidió.
-- ============================================================================

CREATE TABLE IF NOT EXISTS regalo_mensajes (
  pedido_ref     TEXT PRIMARY KEY REFERENCES regalo_pedidos(ref),
  carta          TEXT,                             -- hasta 1200 caracteres
  firma          TEXT,                             -- cómo firma: «Familia Pérez»
  video_key      TEXT,                             -- R2, privado
  video_tipo     TEXT,
  video_bytes    INTEGER,
  video_seg      INTEGER,                          -- duración que midió el navegador
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo         TEXT,                             -- por qué se rechazó
  revisado_por   TEXT,
  revisado_en    TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_regalo_mensajes_estado ON regalo_mensajes(estado);

CREATE TABLE IF NOT EXISTS regalo_noticias (
  email          TEXT PRIMARY KEY,
  nombre         TEXT,
  idioma         TEXT NOT NULL DEFAULT 'es' CHECK (idioma IN ('es', 'en')),
  origen_ref     TEXT,                             -- el pedido en que lo autorizó
  consentido_en  TEXT NOT NULL DEFAULT (datetime('now')),
  baja_en        TEXT
);
