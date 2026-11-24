-- Migración 0071 — el tema de cada unidad de impacto (23 nov 2026, pedido de Sebas).
--
-- Desde el 20 nov la calculadora y la red de #hub se filtran por tema
-- (alimentacion · educacion · agua · emergencias). Las unidades del archivo
-- llevan `tema` en data/partners.json; las que se verifican en /admin no
-- tenían dónde guardarlo y salían solo en «Todos». Ahora el equipo elige el
-- tema al verificarlas, y `mezclarUnidadesVerificadas` lo publica.
--
-- NULL = sin tema: hereda el de la unidad del archivo que reemplaza, si hay.

ALTER TABLE unidades_impacto ADD COLUMN tema TEXT;
