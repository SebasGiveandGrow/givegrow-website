-- Migración 0068 — las unidades de impacto verificadas salen solas a la
-- calculadora, con lo que incluyen (19 nov 2026, pedido de Sebas).
--
-- Hasta hoy, verificar una unidad en /admin armaba un bloque para pegar en
-- data/partners.json y entraba con un PR: dos aprobaciones por cada cambio.
-- Sebas decidió (19 nov) que su clic en «Marcar verificada» la publica. El
-- Worker sirve /data/partners.json mezclando sobre el archivo las unidades
-- verificadas de las fundaciones vinculadas a la red.
--
-- · incluye_en: el inglés de «qué incluye», que escribe el equipo al
--   verificar (el español lo escribe la fundación en su portal).
-- · unidad_red: el id con el que la unidad sale en la calculadora. Si
--   corresponde a una unidad que ya estaba en partners.json, lleva ESE id,
--   porque las membresías y las actas de entrega lo guardan como destino.
--   NULL = unidad nueva: se arma con el id de la fundación y el nombre.

ALTER TABLE unidades_impacto ADD COLUMN incluye_en TEXT;
ALTER TABLE unidades_impacto ADD COLUMN unidad_red TEXT;
