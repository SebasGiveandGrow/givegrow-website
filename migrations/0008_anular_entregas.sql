-- Give&Grow · base privada · migración 0008
-- ============================================================================
-- Anular un acta de entrega.
--
-- POR QUÉ ANULAR Y NO BORRAR — es la misma doctrina que ya rige los
-- certificados (migración 0004) y la razón es el consecutivo, no la nostalgia:
-- `AE-2026-000001` ya consumió su número del `numerador_acta`. Si la fila se
-- borra, el consecutivo salta de nada a `000002` y queda un hueco que nadie
-- puede explicar. Anulada con motivo, el hueco tiene una razón escrita.
--
-- QUÉ LO HIZO NECESARIO: la primera acta de la base es la PRUEBA del panel —
-- fechada el 25 de agosto (futuro), 109 familias, y con un archivo de logo como
-- «foto». No documenta nada que haya ocurrido, y no había forma de invalidarla:
-- el panel solo sabía publicar y despublicar.
--
-- Y hay un caso peor que ese, que es el que de verdad importa: **una acta ya
-- publicada con un error**. La página de la brigada las muestra a los donantes y
-- el rastreo las enseña como evidencia de su aporte. Despublicar la esconde sin
-- decir por qué; anularla deja constancia de que existió y de que no vale.

ALTER TABLE entregas ADD COLUMN anulada_en TEXT;
ALTER TABLE entregas ADD COLUMN anulada_motivo TEXT;
ALTER TABLE entregas ADD COLUMN anulada_por TEXT;

-- Las consultas públicas filtran por `publicada_en IS NOT NULL AND anulada_en IS
-- NULL`. El índice cubre ese par, que es el que se pregunta en cada carga de
-- `#brigada` y en cada rastreo de donante.
CREATE INDEX IF NOT EXISTS ix_entregas_visibles
  ON entregas(destino_id, publicada_en, anulada_en);
