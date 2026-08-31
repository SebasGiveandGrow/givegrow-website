-- ============================================================================
-- 0018 · QUE EL INGENIERO PUEDA VER SU PROPIO TRABAJO
-- ============================================================================
-- La 0010 creó `ix_eval_ing ON evaluaciones(ing_email, creado_en)` con una
-- intención clara y ninguna consulta detrás: la auditoría del 31 ago lo encontró
-- MUERTO, y su nota decía que se activaría «el día que se escriba la pantalla de
-- mis evaluaciones». Este es ese día.
--
-- Y hace falta un índice NUEVO, no sirve el que ya está: los correos se comparan
-- en minúsculas —`lower(ing_email) = lower(?)`, igual que hace
-- `triageMisInspecciones` con el suyo— porque un correo es insensible a la caja y
-- comparar tal cual dejaría fuera al ingeniero que un día escriba su correo con
-- una mayúscula. SQLite no puede usar un índice sobre la columna cuando la
-- consulta la envuelve en una función, exactamente el caso de la 0017.
--
-- POR QUÉ SE DEJA EL VIEJO. `ix_eval_ing` sigue sirviendo a cualquier consulta
-- que compare el correo tal cual, y borrarlo no hace falta para esto. Pero queda
-- dicho: mientras nadie escriba esa consulta, sigue siendo un índice que solo
-- cuesta escritura. Es la clase de cosa que se decide con datos, no de una vez.
--
-- `creado_en` va como segunda columna porque la pantalla ordena por fecha
-- descendente: así el índice resuelve el filtro Y el orden, sin B-tree temporal.
--
-- ⚠️ SE APLICA A MANO Y ANTES DE QUE EL CÓDIGO LLEGUE A PRODUCCIÓN, aunque como
-- la 0017 el orden da igual: crear un índice no cambia ningún resultado, solo el
-- camino. Si el Worker llegara primero, la consulta funcionaría igual y más lenta.
-- ============================================================================

CREATE INDEX IF NOT EXISTS ix_eval_ing_lower
  ON evaluaciones(lower(ing_email), creado_en);
