-- 0027_auditoria_de_casos.sql — el ultimo movimiento, sin leer toda la auditoria
--
-- LO QUE PASA. La bandeja de casos del panel calcula «ultimo movimiento» con:
--
--   SELECT detalle FROM consentimientos
--   WHERE tipo = 'auditoria' AND detalle LIKE 'caso %' ORDER BY id ASC
--
-- Eso es un SCAN de `consentimientos` entera en cada carga de la pantalla que
-- el equipo mas mira. El unico indice que hay es `ix_consent_sujeto (sujeto,
-- tipo)`, y no sirve: la consulta no filtra por `sujeto`, que es su primera
-- columna.
--
-- POR QUE EMPEORA SOLO. `consentimientos` es la tabla que mas rapido crece del
-- sistema: TREINTA sitios distintos del Worker escriben `tipo='auditoria'` —
-- movimientos de casos, pero tambien certificados firmados, egresos anulados,
-- entregas publicadas, fotos subidas, matriculas verificadas, correcciones—. De
-- todo eso, la bandeja solo necesita lo que empieza por «caso ». O sea que la
-- proporcion de basura leida crece con cada funcion nueva que se audite.
--
-- Medido con 15.000 filas de auditoria de las que 3.000 son de casos:
--
--   sin indice   SCAN consentimientos           15.000 filas leidas
--   con indice   SCAN ... USING INDEX ix_pa      3.000 entradas
--
-- Y sin B-TREE TEMPORAL: el indice esta ordenado por `id`, que es justo el
-- ORDER BY de la consulta.
--
-- ES UN INDICE PARCIAL, y por eso sale barato: solo guarda las filas que
-- cumplen su WHERE, asi que ocupa lo que ocupan los movimientos de casos y no
-- lo que ocupa la auditoria entera. SQLite acepta `LIKE` con patron literal en
-- el predicado de un indice parcial — comprobado, no es teoria.
--
-- NO HAY QUE TOCAR NI UNA LINEA DE CODIGO. La consulta de arriba ya esta
-- escrita con esa forma exacta; el indice la reconoce tal cual. Si alguien
-- cambia el `LIKE 'caso %'` por otra cosa, el indice deja de aplicar en
-- silencio y vuelve el escaneo — por eso queda dicho aqui.
--
-- SE APLICA A MANO Y ANTES del despliegue, como todas. Es solo un indice: no
-- cambia ni una fila y se puede revertir con DROP INDEX.

CREATE INDEX IF NOT EXISTS ix_consent_auditoria_caso
  ON consentimientos(id)
  WHERE tipo = 'auditoria' AND detalle LIKE 'caso %';

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0027_auditoria_de_casos.sql');
