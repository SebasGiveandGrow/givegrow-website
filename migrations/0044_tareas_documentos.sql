-- Give&Grow · base privada · migración 0044
-- ============================================================================
-- TAREAS Y DOCUMENTOS DE LA FUNDACIÓN (Fase 5 del panel, oct 2026).
--
-- Decisiones del fundador que esto respeta (8 oct 2026): opera el panel solo
-- (no hay roles ni «asignado a»), en el escritorio, y quiere que el panel sea
-- la plataforma administrativa entera. El panel no escribe correos a mano.
--
-- Dos tablas, las dos con IF NOT EXISTS (reaplicarla con `migrations apply`
-- es seguro: ver la nota de la 0028 en CLAUDE.md), y ningún ALTER.
--
-- · tareas — lo que hay que hacer, sea o no con alguien. NO se extiende
--   `seguimientos` (0043), y es a propósito: un seguimiento es el REGISTRO de
--   algo que ya pasó (su `fecha` no puede ser de mañana, su `tipo` es llamada,
--   WhatsApp, reunión…) con un próximo paso colgado; una tarea es algo por
--   hacer, con prioridad, área y repetición. Meter las dos cosas en la misma
--   fila obligaba a un ALTER por columna (prioridad, área, estado, repetición),
--   y SQLite no admite ALTER … IF NOT EXISTS. Los próximos pasos de las fichas
--   siguen donde estaban y la pantalla de Tareas los enseña al lado, con su
--   «Hecho» y su «Posponer» de siempre.
--   En «Hoy» son DOS colas de dos tablas —`seguimientos_pendientes` y
--   `tareas_pendientes`—, así que nada se cuenta dos veces.
--   `ref_tipo`/`ref_id` la pegan a otra cosa del panel: una ficha de contacto
--   (su clave), un aporte (GG-), un caso (CV-), un vencimiento del calendario
--   (`clave|AAAA-MM-DD` de OBLIGACIONES), un movimiento del extracto o un
--   documento. `ref_nombre` es una copia para la lista, como `contacto_nombre`
--   en la 0043. La repetición crea la SIGUIENTE al marcar «Hecha»
--   (`siguiente_id`), con el día de `dia_ancla` para que una tarea del 31 no
--   vaya derivando al 28. Deshacer el «Hecha» quita la siguiente si nadie la
--   ha tocado. No se borra: se cancela.
--
-- · documentos — el archivo de la fundación: estatutos, RUT, certificado de la
--   Cámara de Comercio, actas, estados financieros, informe de gestión,
--   registro web del RTE, pólizas, contratos, políticas, lo presentado ante la
--   DIAN… con su fecha de expedición y de VENCIMIENTO. Los documentos que
--   SIEMPRE tiene que haber («acta de asamblea 2026») no son filas: los dice el
--   código (`documentosEsperados` en worker.js) y una fila con el mismo `tipo`
--   y `periodo` llena el hueco; `no_aplica = 1` lo cierra sin archivo.
--   El archivo vive en R2 (`MEDIA`), PRIVADO, con una clave no adivinable, y
--   solo se descarga desde /admin, tras Access. `publico` es SOLO informativo
--   («este documento se puede enseñar»): no publica nada. `ob_clave`/`ob_fecha`
--   lo atan a un vencimiento del calendario («lo que se presentó»: el PDF de
--   la renta 110). Los convenios firmados en línea NO se copian aquí: la
--   pantalla los lee de `convenio_formularios` (0038). No se borra: se anula.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tareas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo          TEXT NOT NULL,
  detalle         TEXT,
  fecha_limite    TEXT,                     -- AAAA-MM-DD, día colombiano; NULL = sin fecha
  prioridad       TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('alta', 'normal')),
  area            TEXT NOT NULL DEFAULT 'otro'
                  CHECK (area IN ('finanzas', 'alianzas', 'personas', 'mmc', 'legal', 'otro')),
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'hecha', 'cancelada')),
  recurrencia     TEXT NOT NULL DEFAULT 'ninguna' CHECK (recurrencia IN ('ninguna', 'mensual', 'anual')),
  dia_ancla       INTEGER,                  -- el día del mes en que se repite (1–31)
  ref_tipo        TEXT CHECK (ref_tipo IS NULL OR ref_tipo IN
                  ('contacto', 'aporte', 'caso', 'obligacion', 'movimiento', 'documento')),
  ref_id          TEXT,
  ref_nombre      TEXT,                     -- copia para la lista, al escribir
  origen_id       INTEGER,                  -- la tarea de la que nació por repetición
  siguiente_id    INTEGER,                  -- la que creó al marcarse «Hecha»
  pospuesta       INTEGER NOT NULL DEFAULT 0,
  hecha_en        TEXT,
  hecha_por       TEXT,
  cancelada_en    TEXT,
  cancelada_por   TEXT,
  cancelada_nota  TEXT,
  creado_por      TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT
);
CREATE INDEX IF NOT EXISTS ix_tareas_pendientes ON tareas (fecha_limite) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS ix_tareas_ref ON tareas (ref_tipo, ref_id);

CREATE TABLE IF NOT EXISTS documentos (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo               TEXT NOT NULL CHECK (tipo IN ('estatutos', 'rut', 'camara', 'acta', 'estados_financieros',
                     'informe_gestion', 'rte', 'convenio', 'poliza', 'contrato', 'politica', 'presentacion', 'otro')),
  titulo             TEXT NOT NULL,
  periodo            TEXT,                  -- AAAA: el año que cubre (acta 2026, estados financieros 2025…)
  entidad            TEXT,                  -- quien lo expide o ante quien se presenta
  fecha_expedicion   TEXT,                  -- AAAA-MM-DD
  fecha_vencimiento  TEXT,                  -- AAAA-MM-DD; NULL = sin fecha
  publico            INTEGER NOT NULL DEFAULT 0,   -- solo informativo: NO publica nada
  no_aplica          INTEGER NOT NULL DEFAULT 0,   -- cierra un documento esperado sin archivo
  nota               TEXT,
  ob_clave           TEXT,                  -- vencimiento del calendario al que respalda
  ob_fecha           TEXT,
  archivo_clave      TEXT,                  -- R2, privado: documentos/<id>/<token>.<ext>
  archivo_tipo       TEXT,
  archivo_bytes      INTEGER,
  archivo_sha256     TEXT,
  archivo_en         TEXT,
  archivo_por        TEXT,
  creado_por         TEXT,
  creado_en          TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en     TEXT,
  anulado_en         TEXT,
  anulado_por        TEXT,
  anulado_motivo     TEXT
);
CREATE INDEX IF NOT EXISTS ix_documentos_tipo ON documentos (tipo, periodo);
CREATE INDEX IF NOT EXISTS ix_documentos_vence ON documentos (fecha_vencimiento) WHERE anulado_en IS NULL;
CREATE INDEX IF NOT EXISTS ix_documentos_ob ON documentos (ob_clave, ob_fecha) WHERE ob_clave IS NOT NULL;
