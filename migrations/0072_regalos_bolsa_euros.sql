-- Migración 0072 — la bolsa común de regalos y el cobro en euros
-- (27 nov 2026, pedidos de Sebas).
--
-- 1 · LA BOLSA COMÚN. Quien tiene menos del valor de un regalo completo aporta
--     lo que puede (desde $20.000, US$5 o 5 €) a una bolsa por moneda. No
--     aparta a ningún niño. Cuando la bolsa de una moneda alcanza el valor de un
--     regalo, el equipo lo financia desde /admin/regalos › Bolsa, y el dinero se
--     toma de los aportes en orden de llegada: los más viejos primero. Cada uso
--     queda en `regalo_bolsa_usos` y cada aportante cuyo dinero se usó recibe el
--     aviso de a qué niño fue.
--     Un aporte a la bolsa es un pedido más (`bolsa = 1`, sin ítems), así que usa
--     los mismos caminos de pago, el mismo seguimiento y los mismos correos.
--
-- 2 · EUROS. La página en francés cobra en euros con PayPal. Cada tipo de regalo
--     tiene un valor fijo y redondo en euros, igual que en dólares: no es una
--     conversión. `via` sigue siendo 'usd' para todo lo que no es peso (su CHECK
--     no se puede ampliar sin reconstruir la tabla); `moneda` dice cuál.

ALTER TABLE regalo_categorias ADD COLUMN valor_eur INTEGER;
-- Valores iniciales: el dólar redondeado a la baja al 0,9. Se ajustan en /admin.
UPDATE regalo_categorias SET valor_eur = CAST(valor_usd * 0.9 AS INTEGER)
  WHERE valor_eur IS NULL AND valor_usd IS NOT NULL;

ALTER TABLE regalo_pedidos ADD COLUMN moneda TEXT CHECK (moneda IN ('COP', 'USD', 'EUR'));
ALTER TABLE regalo_pedidos ADD COLUMN total_eur INTEGER;
ALTER TABLE regalo_pedidos ADD COLUMN bolsa INTEGER NOT NULL DEFAULT 0;
-- Cuánto de este aporte a la bolsa ya se usó para financiar regalos (en su moneda).
ALTER TABLE regalo_pedidos ADD COLUMN bolsa_usado INTEGER NOT NULL DEFAULT 0;

ALTER TABLE regalo_pedido_items ADD COLUMN valor_eur INTEGER;

CREATE TABLE IF NOT EXISTS regalo_bolsa_usos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  regalo_id   INTEGER NOT NULL REFERENCES regalos(id),
  pedido_ref  TEXT NOT NULL REFERENCES regalo_pedidos(ref),
  moneda      TEXT NOT NULL CHECK (moneda IN ('COP', 'USD', 'EUR')),
  monto       INTEGER NOT NULL CHECK (monto > 0),
  creado_por  TEXT,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_bolsa_usos_pedido ON regalo_bolsa_usos(pedido_ref);
CREATE INDEX IF NOT EXISTS ix_bolsa_usos_regalo ON regalo_bolsa_usos(regalo_id);
CREATE INDEX IF NOT EXISTS ix_regalo_pedidos_bolsa ON regalo_pedidos(bolsa, moneda, estado);
