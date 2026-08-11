-- Give&Grow · base privada · migración 0004
-- ============================================================================
-- Fase 5.1: que un certificado emitido no pueda quedarse en pie cuando deja de
-- tener respaldo.
--
-- El escenario que cierra: el donante paga con tarjeta, se le emite el
-- certificado, y después hace un contracargo. Wompi manda VOIDED, el aporte
-- pasa a `rechazada` — y hasta ahora el certificado seguía vigente,
-- respaldando un descuento del 25% sobre plata que se devolvió. El sistema no
-- puede anularlo solo (anular es un acto humano, con motivo), pero sí tiene que
-- marcarlo y avisar.
--
-- `revision_*` es automático y reversible: lo pone el webhook.
-- `anulado_*`  es humano y definitivo: lo pone una persona.
-- No son lo mismo y por eso no comparten columna.

ALTER TABLE certificados ADD COLUMN revision_en TEXT;
ALTER TABLE certificados ADD COLUMN revision_motivo TEXT;

-- ---------------------------------------------------------------------------
-- Lo que Wompi validó, guardado aparte de lo que se certificó.
--
-- El formulario de emisión deja corregir nombre y documento, y tiene que
-- dejarlo: Wompi no entrega domicilio y a veces el nombre llega incompleto.
-- Pero esa misma libertad permite emitir el certificado a nombre de otro —
-- donar como persona y pedirlo a nombre de la empresa, para que la empresa tome
-- el descuento. Eso es fraude tributario y hasta ahora no dejaba rastro.
--
-- No se prohíbe la corrección: se REGISTRA la divergencia y se exige motivo.
-- La diferencia entre un error de digitación y un cambio de beneficiario es
-- justamente que el primero se puede explicar.
-- ---------------------------------------------------------------------------
ALTER TABLE certificados ADD COLUMN wompi_identidad TEXT;   -- JSON: lo que validó la pasarela
ALTER TABLE certificados ADD COLUMN divergencia TEXT;       -- JSON: campos que se editaron
ALTER TABLE certificados ADD COLUMN divergencia_motivo TEXT;

CREATE INDEX IF NOT EXISTS ix_certificados_revision ON certificados(revision_en);
