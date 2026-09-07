-- REPARTO DE CASOS ENTRE INGENIEROS
-- =================================
-- Hasta hoy la cola devolvia LOS MISMOS 200 casos mas viejos a todo el mundo:
-- sin asignacion, sin reparto y sin paginacion. Con cien ingenieros, los cien
-- miraban las mismas doscientas filas y se pisaban; con mil casos, del 201 en
-- adelante eran invisibles para todos mientras la familia esperaba.
--
-- POR QUE «TOMAR Y SOLTAR» Y NO REPARTIR POR TERRITORIO: el sector de un caso
-- lo escribe la familia en un campo de TEXTO LIBRE («Barrio o sector»), no es
-- una de las cinco zonas de la brigada. Repartir por ahi seria apoyarse en un
-- dato que nadie normaliza. Tomar y soltar no depende de ninguna clasificacion.
--
-- LA TOMA CADUCA SOLA, y por eso no hace falta ningun proceso que limpie: la
-- cola pregunta por `tomado_en` con una ventana, asi que un caso que alguien
-- tomo y abandono vuelve al monton sin que nadie intervenga. Es la misma idea
-- que ya usa `RESPONDIO_TRAS_PEDIDO`: el estado se deduce de las fechas que ya
-- existen, no de una columna que alguien tenga que acordarse de poner al dia.

ALTER TABLE casos ADD COLUMN tomado_por TEXT;   -- correo del ingeniero que lo tiene
ALTER TABLE casos ADD COLUMN tomado_en  TEXT;   -- UTC, como todo en esta base

-- La cola filtra por «tomado por otro y todavia vigente», que lee las dos
-- columnas juntas; y «mis casos» filtra por correo. Un solo indice cubre ambas.
CREATE INDEX IF NOT EXISTS ix_casos_tomado ON casos(tomado_por, tomado_en);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0024_toma_de_casos.sql');
