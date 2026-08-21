-- ============================================================================
-- 0011 · INSPECCIÓN VISUAL PRELIMINAR DE VIVIENDA
-- ============================================================================
-- La visita en persona, que es OTRA COSA que el triaje. El triaje mira fotos a
-- distancia y ordena la fila; esto es lo que un ingeniero llena PARADO EN LA
-- CASA, con el habitante delante. De ahí las tres diferencias que gobiernan
-- este esquema:
--
--   · LLEVA DATOS PERSONALES A PROPÓSITO. El triaje le esconde al ingeniero el
--     contacto y la dirección porque para opinar sobre fotos no hacen falta.
--     Aquí sí: está en la puerta, ya sabe dónde está, y el documento tiene que
--     poder identificar la vivienda y a quién autorizó la visita.
--   · SE LLENA SIN INTERNET. En vereda sin luz ni señal. Por eso `creado_en`
--     (cuándo se llenó, en el teléfono) y `recibido_en` (cuándo llegó al
--     servidor) son COLUMNAS DISTINTAS: pueden separarse días, y confundirlas
--     haría que un reporte del martes pareciera del viernes.
--   · SE FIRMA. Y una vez firmado, su PDF es EVIDENCIA: se congela al generarlo
--     y no se regenera, la misma regla del certificado de donación. Si el
--     articulado o la plantilla cambian después, el documento que el habitante
--     firmó no cambia.
--
-- NO ES UN DICTAMEN, y el documento base lo dice mejor que cualquier comentario:
-- «reporte de observaciones — documento preliminar y no vinculante», «no
-- constituye certificación de sismo-resistencia ni garantía de habitabilidad»,
-- «este documento no autoriza ni prohíbe la ocupación del inmueble». El
-- concepto estructural definitivo va en documento aparte, firmado por un
-- ingeniero con matrícula. Por eso aquí no hay ninguna columna que diga
-- «habitable» ni «veredicto» — igual que en `casos` la columna se llama
-- `clasificacion` y no `veredicto`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inspecciones (
  numero        TEXT PRIMARY KEY,          -- IV-2026-000001

  -- Vínculo OPCIONAL con el triaje. En la brigada se van a visitar casas de
  -- veredas donde nadie llenó el formulario web, así que la inspección tiene
  -- que poder nacer sola. Cuando sí hay caso, se cruza.
  caso          TEXT REFERENCES casos(numero),

  -- Encabezado del documento
  proyecto      TEXT,
  casa_no       TEXT,                      -- el número que la brigada pinta en la puerta
  direccion     TEXT,
  municipio     TEXT NOT NULL,
  fecha_visita  TEXT NOT NULL,             -- la de la VISITA, no la del envío
  hora          TEXT,

  -- Quién observó. Su matrícula va al documento, así que se guarda con él.
  obs_nombre    TEXT NOT NULL,
  obs_cc        TEXT,
  obs_matricula TEXT,
  obs_email     TEXT,                      -- el de su sesión de Access

  -- Quién habita. Ley 1581: es dato personal y por eso esta tabla no se publica.
  propietario   TEXT,
  contacto      TEXT,

  -- LAS 26 RESPUESTAS EN JSON, y es deliberado. Son una lista que va a cambiar
  -- cuando los ingenieros la corrijan —ya pasó con las categorías de foto— y
  -- 26 columnas obligarían a una migración por cada ajuste. El catálogo vive en
  -- UN sitio del código y las dos pantallas lo leen de ahí.
  -- Forma: {"1.1":{"m":"RE|OBS|SO","obs":"texto","fotos":"3,4"}, …}
  respuestas    TEXT NOT NULL DEFAULT '{}',

  -- La casilla del pie del documento, que es su conclusión operativa.
  requiere_esp  INTEGER NOT NULL DEFAULT 0,

  -- El habitante autoriza la visita y declara entender que es preliminar. Sin
  -- esto el documento no se emite: es la única autorización que da.
  consent_hab   INTEGER NOT NULL DEFAULT 0,

  -- Firmas y PDF, en R2. D1 guarda filas, no archivos: las fotos ya viven en
  -- R2 desde la 0010 y esto sigue el mismo camino.
  firma_obs_key TEXT,
  firma_hab_key TEXT,
  pdf_key       TEXT,                      -- congelado al generarse

  -- Las dos fechas que no se pueden confundir (ver cabecera)
  creado_en     TEXT NOT NULL,             -- en el teléfono, offline
  recibido_en   TEXT NOT NULL DEFAULT (datetime('now')),
  dispositivo   TEXT                       -- para rastrear un envío raro
);

-- Por municipio y fecha: es como se va a mirar durante la brigada.
CREATE INDEX IF NOT EXISTS ix_insp_muni ON inspecciones(municipio, fecha_visita);
-- Para cruzar con el triaje sin escanear la tabla.
CREATE INDEX IF NOT EXISTS ix_insp_caso ON inspecciones(caso);
-- La cola de las que requieren revisión especializada, que es la que urge.
CREATE INDEX IF NOT EXISTS ix_insp_esp ON inspecciones(requiere_esp, recibido_en);

-- Consecutivo propio, con el MISMO patrón atómico de `numerador_caso`.
-- No se reinicia nunca, por la razón de siempre: dos documentos distintos con
-- el mismo número es peor que un hueco en la numeración.
CREATE TABLE IF NOT EXISTS numerador_inspeccion (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

-- Las FOTOS reusan `caso_medios` cuando la inspección está atada a un caso.
-- Cuando nace suelta no hay dónde colgarlas, así que van con su propia
-- referencia — y por eso `caso_medios.caso` no puede exigirse aquí. Se
-- resolvió en la 0010 dejando ese vínculo como TEXT: una inspección suelta
-- guarda sus medios con la clave de R2 en `respuestas`, referenciadas por el
-- «Foto Nº» que el propio documento de papel ya usaba.
