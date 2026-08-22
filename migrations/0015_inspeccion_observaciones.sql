-- ============================================================================
-- 0015 · OBSERVACIONES GENERALES Y RECOMENDACIONES
-- ============================================================================
-- Faltaban las dos, y la segunda no es un extra: la guía del AIS OBLIGA a
-- consignar las recomendaciones en el formulario y a explicárselas de viva voz
-- a los ocupantes. Hasta ahora el documento solo llevaba la recomendación FIJA
-- («se recomienda evaluación estructural detallada…»), igual para todas las
-- casas, y ninguna forma de decir lo que esta casa en concreto necesita.
--
--   · `observaciones` — texto libre de cierre. Los campos por ítem sirven para
--     lo que se ve en cada elemento; esto es para lo que no cae en ninguno: el
--     contexto, lo que dijo la familia, lo que el ingeniero quiere dejar dicho.
--
--   · `recomendaciones` — JSON. Las medidas concretas que se recomiendan, de la
--     LISTA QUE LA GUÍA AUTORIZA, más un texto libre. Se guarda como lista y no
--     como texto porque así se puede contar y filtrar: «cuántas casas de este
--     municipio necesitan evacuación» es la pregunta que va a importar el 24.
--
-- ⚠️ LO QUE LA GUÍA PROHÍBE, y queda fuera de la lista a propósito: recomendar
-- DEMOLER. Es textual — «en ningún caso los evaluadores deberán recomendar la
-- posible demolición»— y en su lugar se pide la visita de un experto señalando
-- la urgencia. Por eso «demoler» no es una opción del formulario: no se ofrece
-- lo que no se puede recomendar.
-- ============================================================================

ALTER TABLE inspecciones ADD COLUMN observaciones   TEXT;
ALTER TABLE inspecciones ADD COLUMN recomendaciones TEXT NOT NULL DEFAULT '{}';
