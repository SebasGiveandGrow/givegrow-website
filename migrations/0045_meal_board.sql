-- Give&Grow · base privada · migración 0045
-- ============================================================================
-- MEAL Y BOARD DE ASESORES (oct 2026).
--
-- El fundador lleva desde el panel el seguimiento de los indicadores (MEAL:
-- monitoreo, evaluación, rendición de cuentas y aprendizaje) y los documentos
-- que se le mandan al Board de Asesores.
--
-- GOBIERNO, dicho una vez aquí porque todo el módulo cuelga de esto: la
-- fundación NO tiene junta directiva. El máximo órgano de dirección es el que
-- definen los estatutos (hoy, el fundador), con Representante Legal y Revisora
-- Fiscal. El Board de Asesores (Junta de Asesores, ~5 personas) ASESORA y
-- RECOMIENDA: no aprueba ni dirige nada. El informe y la convocatoria lo dicen.
--
-- Cuatro tablas, todas con IF NOT EXISTS (reaplicarla con `migrations apply`
-- es seguro: ver la nota de la 0028 en CLAUDE.md), y ningún ALTER.
--
-- · mel_indicadores — la batería de indicadores. Se siembran los 12 del
--   BORRADOR (pendiente de que el fundador los valide: `validado_en` en NULL);
--   desde el panel se editan. `calculo` es la clave del cálculo que el sistema
--   sabe hacer con lo que ya hay en la base (`MEL_CALCULOS` en worker.js):
--   con él, el panel SUGIERE un valor y una persona decide si lo registra. El
--   sistema nunca guarda una medición solo. NULL = se mide a mano.
--
-- · mel_mediciones — cada valor medido, con su FUENTE (qué acta, registro o
--   inventario: obligatoria, es la regla «Evidencia, no promesas») y su fecha
--   de CORTE. `valor` es la cifra; `valor_texto`, lo cualitativo o lo que no
--   cabe en un número («12,5 t según inventario; actas en revisión»). Al menos
--   uno de los dos. `origen` dice si la persona aceptó un valor sugerido por el
--   sistema. No se borra: se anula, como todo lo que es registro en esta base.
--
-- · board_asesores — quién está en el Board. El correo es dato personal (Ley
--   1581): solo vive aquí y en la bitácora de `correos` cuando se le escribe,
--   como cualquier otro destinatario del sitio. Un asesor que sale no se borra:
--   se desactiva con su fecha `hasta`.
--
-- · board_envios — lo que se le mandó al Board: el informe trimestral o la
--   convocatoria a la reunión (`acta` queda reservado para cuando el acta de
--   la reunión se mande desde aquí). `destinatarios` es CUÁNTOS, no quiénes:
--   el detalle por persona está en `correos`. El PDF del informe que salió se
--   guarda en R2 (`MEDIA`), PRIVADO, con clave no adivinable, y se vuelve a
--   descargar tal cual se envió; solo desde /admin, tras Access. `datos` guarda
--   lo que se escribió en el panel (fecha, lugar y agenda de la convocatoria),
--   nunca el cuerpo del correo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS mel_indicadores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  numero       INTEGER NOT NULL,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('producto', 'resultado')),
  linea        TEXT NOT NULL CHECK (linea IN ('L1', 'L2', 'L3', 'L4', 'todas')),
  fuente       TEXT NOT NULL,
  frecuencia   TEXT NOT NULL CHECK (frecuencia IN ('mensual', 'trimestral', 'semestral', 'anual', 'por_evento')),
  unidad       TEXT,
  linea_base   TEXT,
  meta_2027    TEXT,
  calculo      TEXT,                        -- clave de MEL_CALCULOS; NULL = solo a mano
  activo       INTEGER NOT NULL DEFAULT 1,
  orden        INTEGER NOT NULL DEFAULT 0,
  validado_en  TEXT,                        -- NULL = borrador sin validar
  validado_por TEXT,
  actualizado  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_mel_indicadores_orden ON mel_indicadores (activo, orden, numero);

CREATE TABLE IF NOT EXISTS mel_mediciones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  indicador_id    INTEGER NOT NULL REFERENCES mel_indicadores(id),
  periodo         TEXT NOT NULL,            -- 2026-09 · 2026-T3 · 2026-S2 · 2026 · (por evento: texto corto)
  valor           REAL,
  valor_texto     TEXT,
  fuente_detalle  TEXT NOT NULL,            -- qué acta, registro o inventario
  corte           TEXT NOT NULL,            -- AAAA-MM-DD: hasta cuándo cuenta el dato
  nota            TEXT,
  origen          TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'sugerido')),
  registrado_por  TEXT,                     -- correo de la sesión de Access
  creado          TEXT NOT NULL DEFAULT (datetime('now')),
  anulado_en      TEXT,
  anulado_por     TEXT,
  anulado_motivo  TEXT,
  CHECK (valor IS NOT NULL OR (valor_texto IS NOT NULL AND valor_texto <> ''))
);
CREATE INDEX IF NOT EXISTS ix_mel_mediciones_ind ON mel_mediciones (indicador_id, corte);

CREATE TABLE IF NOT EXISTS board_asesores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  correo      TEXT NOT NULL,
  perfil      TEXT,                         -- en qué asesora: «finanzas sociales», «ingeniería»…
  activo      INTEGER NOT NULL DEFAULT 1,
  desde       TEXT,                         -- AAAA-MM-DD
  hasta       TEXT,                         -- AAAA-MM-DD, al desactivarlo
  creado_por  TEXT,
  creado      TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_board_asesores_correo ON board_asesores (lower(correo));

CREATE TABLE IF NOT EXISTS board_envios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo            TEXT NOT NULL CHECK (tipo IN ('informe_trimestral', 'convocatoria', 'acta')),
  periodo         TEXT NOT NULL,            -- 2026-T3
  asunto          TEXT NOT NULL,
  destinatarios   INTEGER NOT NULL DEFAULT 0,   -- cuántos, no quiénes
  enviados        INTEGER NOT NULL DEFAULT 0,
  fallidos        INTEGER NOT NULL DEFAULT 0,
  estado          TEXT NOT NULL DEFAULT 'enviando'
                  CHECK (estado IN ('enviando', 'enviado', 'parcial', 'fallido', 'simulado')),
  datos           TEXT,                     -- JSON: lo escrito en el panel (convocatoria) o el resumen del informe
  archivo_clave   TEXT,                     -- R2, privado: board/<id>/<token>.pdf
  archivo_bytes   INTEGER,
  archivo_sha256  TEXT,
  enviado_por     TEXT,
  creado          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_board_envios_tipo ON board_envios (tipo, periodo, creado);

-- LA BATERÍA SEMBRADA: el BORRADOR del 13 oct 2026, pendiente de validar.
-- Ids fijos e INSERT OR IGNORE: reaplicar la migración no la duplica ni pisa
-- lo que el fundador ya haya editado desde el panel.
INSERT OR IGNORE INTO mel_indicadores
  (id, numero, nombre, tipo, linea, fuente, frecuencia, unidad, linea_base, meta_2027, calculo, orden) VALUES
  (1, 1, 'Fundaciones con convenio de cooperación firmado', 'producto', 'L1',
     'Convenios archivados', 'trimestral', 'fundaciones', '?', 'propuesta: 8', 'convenios_firmados', 1),
  (2, 2, '% de fundaciones aliadas que suben un peldaño en la escalera de evidencia', 'resultado', 'L1',
     'Autoevaluación (plantilla B) verificada', 'anual', '%', 'sin línea base', '50 %', NULL, 2),
  (3, 3, 'Unidades entregadas con acta firmada', 'producto', 'L2',
     'Actas de entrega', 'mensual', 'unidades', '?', 'definir por unidad', NULL, 3),
  (4, 4, '% de aportes con rastreo completo publicado (aporte → acta)', 'producto', 'L2',
     'ImpactOS', 'trimestral', '%', '0 % (12 oct 2026)', '90 %', 'rastreo_completo', 4),
  (5, 5, 'Días promedio entre aporte y acta publicada', 'producto', 'L2',
     'ImpactOS', 'trimestral', 'días', 'sin línea base', '≤ 60 días', 'dias_aporte_acta', 5),
  (6, 6, '% de donantes que vuelven a aportar en 12 meses', 'resultado', 'L2',
     'ImpactOS', 'anual', '%', 'sin línea base', '30 %', 'donantes_recurrentes', 6),
  (7, 7, 'Horas de voluntariado efectivas', 'producto', 'L3',
     'Registro de jornada', 'trimestral', 'horas', '?', 'propuesta: 500 h', 'horas_voluntariado', 7),
  (8, 8, 'Empresas con al menos una jornada de Impact Journey', 'producto', 'L3',
     'Registro de jornada', 'semestral', 'empresas', '0 (12 oct 2026)', '3', 'empresas_impact_journey', 8),
  (9, 9, 'Toneladas de ayuda humanitaria entregadas con acta', 'producto', 'L4',
     'Actas de entrega + inventario', 'por_evento', 'toneladas', '12,5 t según inventario de carga; actas en revisión', '100 % con acta', NULL, 9),
  (10, 10, 'Casas con concepto técnico emitido (Mira Mi Casa)', 'producto', 'L4',
     'Triaje Mira Mi Casa', 'mensual', 'casas', '? (lanzamiento)', 'propuesta: 50', 'casas_con_concepto', 10),
  (11, 11, 'Viviendas en reconstrucción / terminadas', 'resultado', 'L4',
     'Acta de entrega de obra', 'mensual', 'viviendas', '3 en curso (13 oct 2026)', 'definir', NULL, 11),
  (12, 12, 'Quejas y retroalimentación respondidas a tiempo', 'resultado', 'todas',
     'Mecanismo de quejas (por construir)', 'trimestral', '%', 'sin mecanismo', '100 % en ≤ 15 días', NULL, 12);
