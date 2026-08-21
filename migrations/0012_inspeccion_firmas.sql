-- ============================================================================
-- 0012 · LAS FIRMAS DE LA INSPECCIÓN
-- ============================================================================
-- Dos columnas que la 0011 no previó, y las dos salen de leer el papel otra vez:
--
--   · `hab_cc` — el documento pide «Nombre y C.C.» BAJO LAS DOS FIRMAS, no solo
--     bajo la del ingeniero. Sin la cédula del habitante, la firma no identifica
--     a nadie: es un trazo. La 0011 guardaba su nombre y su contacto, pero no su
--     documento.
--
--   · `firma_hab_motivo` — porque la firma puede ser IMPOSIBLE y no por mala
--     voluntad. En una emergencia el habitante puede estar herido, no saber
--     escribir, o no estar. El papel no resuelve ese caso; el sistema tiene que,
--     y la salida NO es dejar la casilla vacía en silencio: es exigir que se diga
--     por qué. Es la misma regla que gobierna cerrar un caso, donde el motivo es
--     obligatorio porque «un caso que se va de la lista sin decir por qué es
--     indistinguible de uno perdido».
--
-- Van como ALTER porque la 0011 YA está aplicada en producción (verificado el
-- 21 ago 2026: la tabla existe y `migrations list` dice que no falta ninguna).
-- Corregir la 0011 en su sitio habría dejado la base y el archivo divergentes,
-- que es peor que un archivo más.
-- ============================================================================

ALTER TABLE inspecciones ADD COLUMN hab_cc TEXT;
ALTER TABLE inspecciones ADD COLUMN firma_hab_motivo TEXT;
