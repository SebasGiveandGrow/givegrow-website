-- Give&Grow · base privada · migración 0007
-- ============================================================================
-- Transferencias bancarias reportadas por el donante.
--
-- EL HUECO QUE CIERRA: la transferencia es el PRIMER medio de pago que muestra
-- la página de la brigada y el que usan las empresas, y no producía nada — ni
-- guía, ni recibo, ni rastreo, ni ruta al certificado. Terminaba en un correo a
-- contabilidad@ que alguien tenía que procesar a mano.
--
-- LA DECISIÓN QUE GOBIERNA ESTA MIGRACIÓN: no se toca el significado de
-- `aprobada`. Hoy quiere decir «la pasarela confirmó que el dinero entró», y de
-- eso depende que se pueda emitir un certificado que se firma bajo juramento.
-- Una transferencia también acaba en `aprobada` —el dinero entró igual— pero se
-- registra CÓMO se confirmó y QUIÉN lo hizo. El estado no pierde su garantía:
-- gana una procedencia.
--
-- Estado nuevo intermedio:
--   reportada   el donante dice que transfirió. NO es dinero en el banco: no da
--               recibo, no da certificado y no aparece como recibida en el
--               rastreo. Espera verificación humana contra el extracto.

ALTER TABLE aportes ADD COLUMN confirmacion TEXT;      -- NULL | wompi | manual
ALTER TABLE aportes ADD COLUMN confirmado_por TEXT;    -- correo de Access, si fue manual
ALTER TABLE aportes ADD COLUMN confirmado_en TEXT;

-- Número del comprobante bancario. El numeral 5 del certificado dice «mediante
-- transferencia electrónica No. …»: para un pago por pasarela ese número es el
-- id de Wompi, pero para una transferencia real es ESTE, y citar el de Wompi
-- sería falso en un documento juramentado.
ALTER TABLE aportes ADD COLUMN referencia_pago TEXT;

-- Clave en R2 del comprobante que sube el donante. Es lo que se contrasta con
-- el extracto; sin él, confirmar es creerle a un formulario.
ALTER TABLE aportes ADD COLUMN comprobante TEXT;

-- Lo que ya está confirmado por la pasarela queda marcado como tal, para que la
-- distinción sirva desde el primer día y no solo hacia adelante.
UPDATE aportes SET confirmacion = 'wompi'
 WHERE confirmacion IS NULL AND wompi_transaction_id IS NOT NULL AND wompi_transaction_id <> '';

CREATE INDEX IF NOT EXISTS ix_aportes_estado ON aportes(estado);
