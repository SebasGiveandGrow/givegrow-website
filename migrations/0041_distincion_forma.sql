-- Give&Grow · base privada · migración 0041
-- ============================================================================
-- LA FORMA DEL TÍTULO DE LA DISTINCIÓN (carnet de honor, 0040).
--
-- La 0040 pintaba siempre la forma neutra «/a»: «Fundador/a», «Pionero/a».
-- En una tarjeta personal eso se lee raro —el carnet es de UNA persona—, así
-- que quien lo emite elige, por carnet, cómo se lee su distinción:
--   m = masculina («Fundador»), f = femenina («Fundadora»), n = neutra
--   («Fundador/a»). NULL se lee como n: los carnets emitidos antes de esta
--   migración siguen diciendo lo mismo que decían.
-- «Junta de Asesores» es igual en las tres, y en inglés todas son neutras.
--
-- Se guarda la ELECCIÓN y no el texto: el texto vive en `DISTINCIONES`
-- (worker.js), en un solo lugar, y lo arma `etiquetaDistincion`.
--
-- SIN `IF NOT EXISTS` en el ALTER porque SQLite no lo admite (como la 0039
-- y la 0040). Quitar la distinción vacía también esta columna.

ALTER TABLE miembros ADD COLUMN distincion_forma TEXT;   -- m | f | n (NULL = n)
