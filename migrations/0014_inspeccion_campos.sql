-- ============================================================================
-- 0014 · FAMILIA, FINCA, COORDENADAS Y FOTOS
-- ============================================================================
-- Cambios pedidos tras ver el formulario funcionando:
--
--   · `familia` — el encabezado del papel decía «Proyecto / Campaña» y en terreno
--     lo que identifica una visita es de QUIÉN es la casa. Se añade en vez de
--     renombrar `proyecto`: son datos distintos y `proyecto` puede volver a
--     servir para la jornada. Ojo con lo que NO es: `propietario` es quien firma
--     y da la autorización; `familia` es cómo se conoce la casa («los Gutiérrez»).
--
--   · `finca` — en vereda la dirección no existe y el nombre del predio es lo
--     único que permite volver.
--
--   · `lat`/`lon`/`gps_precision` — las toma el teléfono, que es lo que resuelve
--     el problema anterior de verdad: en vereda no hay nomenclatura, y sin
--     coordenadas nadie encuentra la casa dos días después.
--
--     ⚠️ SON PRIVADAS, y esto no es un detalle de estilo. La 0010 partió la
--     ubicación en dos a propósito —`sector` público, `direccion_ref` privada—
--     porque publicar «casa dañada y desocupada, en esta posición» es un mapa
--     para quien roba. Unas coordenadas son MÁS precisas que la dirección, así
--     que nunca pueden salir en el banco público ni en un endpoint sin sesión.
--
--     El GPS funciona SIN INTERNET: es la única pieza de este formulario que se
--     puede capturar en la vereda sin señal y sin depender de nada.
--
--   · `fotos` — JSON con las claves de R2. Los ingenieros pidieron poder subir
--     fotos desde el formulario, sobre todo cuando hay señal. No van a
--     `caso_medios` porque esa tabla exige un `caso` y una inspección puede
--     nacer suelta; y no van en columnas porque su número varía.
-- ============================================================================

ALTER TABLE inspecciones ADD COLUMN familia        TEXT;
ALTER TABLE inspecciones ADD COLUMN finca          TEXT;
ALTER TABLE inspecciones ADD COLUMN lat            REAL;
ALTER TABLE inspecciones ADD COLUMN lon            REAL;
ALTER TABLE inspecciones ADD COLUMN gps_precision  REAL;
ALTER TABLE inspecciones ADD COLUMN fotos          TEXT NOT NULL DEFAULT '[]';
