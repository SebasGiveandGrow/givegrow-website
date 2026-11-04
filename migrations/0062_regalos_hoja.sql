-- Give&Grow · base privada · migración 0062
-- ============================================================================
-- REGALOS: LO QUE PIDE LA HOJA DE LAS FUNDACIONES (nov 2026).
--
-- La hoja que reciben las fundaciones («Regalos de diciembre 2026 · Formato
-- para fundaciones») trae dos columnas que la plataforma no guardaba, y la
-- autorización del acudiente promete algo que la página no cumplía:
--
-- · numero_local — el número de fila de la fundación (1, 2, 3… sin repetir en
--   la zona). Con él nombran la foto y la autorización: `uribia-12.jpg`,
--   `uribia-12-autorizacion.pdf`. El código público (URI-0012) lo pone la
--   plataforma y la fundación no lo conoce al tomar las fotos, así que la
--   subida en lote reconoce los archivos por zona y número. Único por zona.
--
-- · asentimiento — si al niño se le explicó y estuvo de acuerdo (1), si no
--   (0), o sin dato (NULL: filas cargadas antes de esta migración o con una
--   hoja sin la columna). La ley pide escuchar al menor, no solo a su
--   acudiente: con 0 el niño no se publica aunque el acudiente haya firmado.
--
-- · regalo_campanas.datos_eliminados_en — cuándo se borraron los datos
--   personales de la campaña. La Política de Privacidad (v1.3) dice que los
--   datos de los niños y sus acudientes, las cartas y los videos se eliminan a
--   más tardar seis meses después de la última entrega, salvo las actas.
--
-- Son ALTER y no tablas nuevas porque son atributos del mismo niño y de la
-- misma campaña. Reaplicarla fallaría en el ALTER: se aplica una sola vez con
-- `migrations apply`, que la registra.
-- ============================================================================

ALTER TABLE regalo_ninos ADD COLUMN numero_local INTEGER;
ALTER TABLE regalo_ninos ADD COLUMN asentimiento INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS ux_regalo_ninos_numero
  ON regalo_ninos(zona_id, numero_local) WHERE numero_local IS NOT NULL;

ALTER TABLE regalo_campanas ADD COLUMN datos_eliminados_en TEXT;
