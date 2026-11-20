-- Migración 0070 — dos caminos más para pagar los regalos (19 nov 2026,
-- pedido de Sebas antes de enviar la página a Suecia).
--
-- Hasta hoy un pedido pagaba en pesos con Wompi (`via = 'cop'`) o en dólares
-- con la aliada de EE. UU. (`via = 'usd'`). Se suman:
--   · «Directamente al banco»: transferencia a la cuenta de Give&Grow, desde
--     Colombia o desde el exterior. Es en pesos (`via = 'cop'`) y entra a la
--     bandeja de transferencias por verificar: nadie la da por pagada sin
--     contrastarla contra el extracto.
--   · «Moneda internacional (PayPal)»: en dólares (`via = 'usd'`), con la API
--     de pedidos de PayPal. Cada pago lleva el número RG y se confirma solo.
--
-- `via` sigue diciendo la MONEDA y no se toca (cambiar su CHECK obliga a
-- reconstruir la tabla). `canal` dice POR DÓNDE: NULL es el camino de siempre
-- de esa moneda (Wompi en pesos, la aliada en dólares). Así la aliada sigue
-- viendo en su portal solo los pedidos que pasan por ella.

ALTER TABLE regalo_pedidos ADD COLUMN canal TEXT CHECK (canal IN ('banco', 'paypal'));
-- El id del pedido en PayPal, para capturarlo al volver y para reconocer el
-- webhook si el donante cierra la pestaña antes de volver.
ALTER TABLE regalo_pedidos ADD COLUMN paypal_order TEXT;
