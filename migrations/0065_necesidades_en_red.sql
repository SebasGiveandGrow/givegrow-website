-- Migración 0065 — necesidades visibles entre fundaciones (16 nov 2026).
--
-- «Dar y recibir» nació con una promesa: nada se publica, el cruce lo hace el
-- equipo. Decisión de Sebas del 16 nov: una fundación que aporta puede ver lo
-- que otras necesitan, pero SOLO lo que cada fundación marque de aquí en
-- adelante, necesidad por necesidad.
--
-- `visible_red`: 1 = las fundaciones vinculadas que aportan ven esta necesidad
-- (nombre de la fundación, ciudad y lo escrito). Nace en 0 para todas las
-- filas que ya existen: lo que se escribió bajo la promesa vieja no se muestra
-- a nadie sin que su fundación lo marque.
--
-- `responde_a`: cuando una fundación dice «puedo ofrecer esto» sobre una
-- necesidad de otra, se le crea una oferta suya que apunta a esa necesidad. El
-- equipo la ve en su cola y hace el contacto: las fundaciones no reciben los
-- datos de contacto una de otra.

ALTER TABLE intercambios_fundacion ADD COLUMN visible_red INTEGER NOT NULL DEFAULT 0;
ALTER TABLE intercambios_fundacion ADD COLUMN responde_a INTEGER REFERENCES intercambios_fundacion(id);
CREATE INDEX IF NOT EXISTS ix_intercambios_red ON intercambios_fundacion (visible_red, tipo, estado);
