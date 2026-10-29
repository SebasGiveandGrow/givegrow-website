-- Give&Grow · base privada · migración 0051
-- ============================================================================
-- EMBAJADORES DE REGALOS (28 oct 2026).
--
-- Un embajador es alguien que comparte la campaña con SU enlace:
-- /regalos?emb=CODIGO. El pedido que entra por ese enlace guarda el código, y
-- /admin/regalos › Embajadores cuenta cuántos pedidos PAGADOS y cuántos regalos
-- trajo cada uno. Sirve para agradecerle con datos y para saber qué canal
-- funciona.
--
-- Lo que NO hace, a propósito:
--   · No le muestra al embajador ni a nadie QUIÉN donó ni CUÁNTO: el conteo es
--     de pedidos y de regalos, nunca de donantes ni de pesos.
--   · No da comisión ni premio por monto. El honor no se compra.
--   · Un código desconocido o inactivo no rompe el pedido: se guarda NULL.
--
-- `nombre` es el de la persona o el grupo, como lo conoce el equipo; solo lo
-- ve /admin/regalos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS regalo_embajadores (
  codigo     TEXT PRIMARY KEY,                       -- A-Z, 0-9 y guion; 3 a 24
  nombre     TEXT NOT NULL,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  creado_por TEXT
);

ALTER TABLE regalo_pedidos ADD COLUMN embajador TEXT;
CREATE INDEX IF NOT EXISTS ix_regalo_pedidos_emb ON regalo_pedidos(embajador);
