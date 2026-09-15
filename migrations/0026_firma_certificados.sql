-- 0026_firma_certificados.sql — que la firma del certificado sea verdad
--
-- LO QUE PASABA. `adminEmitirCertificado` creaba el certificado y lo mandaba al
-- donante EN EL MISMO ACTO. El PDF imprime dos firmas —Representante Legal y
-- Revisora Fiscal— como texto, debajo de una frase que dice «certifica BAJO LA
-- GRAVEDAD DE JURAMENTO».
--
-- O sea que salia un documento jurado con el nombre de la Revisora Fiscal, y
-- ella podia no haberlo visto nunca. Eso no es un detalle de proceso: es lo unico
-- que el articulo 125-3 del Estatuto Tributario le pide al certificado, y lo que
-- el donante le va a mostrar a la DIAN.
--
-- Decision de Sebas el 11 de septiembre de 2026.
--
-- DOS FIRMAS, DOS ACTOS. El certificado lleva dos nombres, asi que lleva dos
-- firmas de verdad: el Representante Legal y la Revisora Fiscal firman por
-- separado, cada uno desde su sesion. Hasta que no estan las dos, el certificado
-- no sale al donante y el PDF va sellado «SIN FIRMAR» — un borrador que se
-- filtra tiene que verse como lo que es.
--
-- QUE SE GUARDA DE UNA FIRMA. No una imagen: una imagen pegada es un PNG que
-- cualquiera reutiliza y no prueba nada. Se guarda el ACTO — quien, cuando, y
-- una huella SHA-256 del contenido exacto que firmo. Si el contenido cambiara
-- despues, la huella deja de cuadrar y se nota.
--
-- Eso es firma electronica en el sentido de la Ley 527 de 1999 —mensaje de datos
-- mas un metodo confiable de identificacion, que aqui es Cloudflare Access— y es
-- lo que la norma pide. NO es firma digital certificada por una entidad
-- acreditada ante la ONAC; eso es otro nivel, cuesta, y el articulo 125-3 no lo
-- exige: pide que el certificado este «firmado por revisor fiscal o contador».
--
-- POR QUE COLUMNAS Y NO UNA TABLA APARTE. Son exactamente dos firmas por
-- certificado, no una lista: una tabla de firmas invitaria a que hubiera tres, y
-- tres firmas en este documento no significan nada. La forma del dato deberia
-- decir la verdad sobre lo que puede pasar.
--
-- SE APLICA A MANO Y ANTES del codigo que la usa, como todas.

ALTER TABLE certificados ADD COLUMN firma_rl_por    TEXT;
ALTER TABLE certificados ADD COLUMN firma_rl_en     TEXT;
ALTER TABLE certificados ADD COLUMN firma_rl_huella TEXT;

ALTER TABLE certificados ADD COLUMN firma_rf_por    TEXT;
ALTER TABLE certificados ADD COLUMN firma_rf_en     TEXT;
ALTER TABLE certificados ADD COLUMN firma_rf_huella TEXT;

-- La cola de firma: lo vigente que todavia le falta alguna. Parcial, porque es
-- la unica consulta que se hace sobre esto y no tiene sentido indexar el resto.
CREATE INDEX IF NOT EXISTS ix_certificados_por_firmar
  ON certificados(emitido_en)
  WHERE anulado_en IS NULL AND (firma_rl_en IS NULL OR firma_rf_en IS NULL);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0026_firma_certificados.sql');
