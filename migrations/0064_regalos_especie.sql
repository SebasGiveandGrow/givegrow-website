-- Give&Grow · base privada · migración 0064
-- ============================================================================
-- REGALOS EN ESPECIE POR ZONA (12 nov 2026).
--
-- Sebas consiguió 250 regalos para La Guajira que no son de un niño en
-- particular: llegan en especie y se reparten allá. Cuentan para la meta de la
-- zona —el árbol de Uribia arranca con esas luces encendidas— pero no tienen
-- ficha, ni pedido, ni donante en la página.
--
-- · regalo_zonas.en_especie — cuántos regalos de la meta ya están cubiertos
--   así. Se suma a los financiados de la zona; se edita en /admin/regalos ›
--   Zonas. Es un número, no filas: no hay a quién asignarlos uno por uno.
--
-- Reaplicarla fallaría en el ALTER: se aplica una sola vez con
-- `migrations apply`, que la registra.
-- ============================================================================

ALTER TABLE regalo_zonas ADD COLUMN en_especie INTEGER NOT NULL DEFAULT 0;
