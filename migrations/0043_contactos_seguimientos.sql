-- Give&Grow · base privada · migración 0043
-- ============================================================================
-- CONTACTOS, SEGUIMIENTOS Y CORREOS (Fase 4 del panel, oct 2026).
--
-- Decisiones del fundador que esto respeta (8 oct 2026):
--   · nadie más opera el panel: no hay roles ni «asignado a»;
--   · NO se escriben correos a mano desde el panel: el contacto sigue por
--     WhatsApp y Gmail, y el panel solo DEJA REGISTRO de que ocurrió.
--
-- Tres tablas, las tres con IF NOT EXISTS (reaplicarla con `migrations apply`
-- es seguro: ver la nota de la 0028 en CLAUDE.md), y ningún ALTER.
--
-- · contactos_vinculos — la decisión de una persona sobre dos fichas que el
--   panel cree que pueden ser la misma («posibles duplicados»): `unir` o
--   `distintos`. EL PANEL NUNCA UNE SOLO. Un mismo correo es la misma ficha
--   (es literalmente la misma dirección); un mismo documento, teléfono o
--   nombre es solo una sugerencia, y se guarda lo que la persona decidió para
--   no volver a preguntarlo. `a` y `b` son CLAVES DE CONTACTO —el correo en
--   minúsculas, o `tel:<dígitos>` / `doc:<dígitos>` cuando no hay correo—, en
--   orden (a < b), así que el par no se repite al revés. Deshacer = borrar la
--   fila. Ver `claveContacto` en worker.js.
--
-- · seguimientos — notas internas y registro de contacto de una ficha
--   (llamada, WhatsApp, correo desde Gmail, reunión…), con un «próximo paso»
--   opcional y su fecha. Los próximos pasos con fecha son la cola
--   `seguimientos_pendientes` de «Hoy». NUNCA se muestran fuera del panel.
--   Está pensada para que la Fase 5 (tareas) la extienda sin migrar datos:
--   `contacto` admite NULL (una tarea que no es de nadie) y `ref_tipo`/`ref_id`
--   la pegan a otra cosa (una inscripción, un aporte, una jornada). Hoy el
--   panel siempre escribe `contacto` y no escribe `ref_*`.
--   `contacto_nombre` es una copia del nombre al escribir la nota: «Hoy» lo
--   enseña sin reconstruir la ficha entera por cada fila.
--   No se borra: se anula, como todo lo que es registro en esta base.
--
-- · correos_resueltos — un correo que no salió (fallo, sin cupo) y que ya se
--   atendió: se REENVIÓ desde el panel (`reenvio_id` es la fila nueva que
--   escribió ese envío, salga como salga) o se resolvió A MANO (se le escribió
--   por Gmail o WhatsApp, con su nota). Las colas de correos de «Hoy» dejan de
--   contar lo resuelto; la fila original de `correos` no se toca, porque es la
--   bitácora de lo que pasó. Tabla aparte y no columnas nuevas en `correos`
--   para que esta migración no lleve ALTER (que en SQLite no admite IF NOT
--   EXISTS). Deshacer = borrar la fila.
--
-- EL CUERPO DE LOS CORREOS SIGUE SIN GUARDARSE, a propósito (Ley 1581): para
-- reenviar, el panel lo vuelve a armar con la misma plantilla y los datos de
-- hoy (`REENVIOS` en worker.js), y enseña la vista previa antes de enviar.
--
-- Y los índices que la búsqueda y la ficha necesitan: comparan el correo en
-- minúsculas (como ya hacía la 0017 con inscripciones), y el documento.
-- ============================================================================

CREATE TABLE IF NOT EXISTS contactos_vinculos (
  a          TEXT NOT NULL,                 -- clave de contacto (a < b)
  b          TEXT NOT NULL,
  decision   TEXT NOT NULL CHECK (decision IN ('unir', 'distintos')),
  motivo     TEXT,                          -- documento | telefono | nombre: por qué se sugirió
  por        TEXT,                          -- correo de la sesión de Access
  en         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (a, b)
);
CREATE INDEX IF NOT EXISTS ix_contactos_vinculos_b ON contactos_vinculos (b);

CREATE TABLE IF NOT EXISTS seguimientos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  contacto          TEXT,                   -- clave de contacto (ver arriba); NULL = de nadie (Fase 5)
  contacto_nombre   TEXT,                   -- copia para «Hoy», al escribir
  tipo              TEXT NOT NULL CHECK (tipo IN ('nota', 'llamada', 'whatsapp', 'correo', 'reunion', 'otro')),
  fecha             TEXT NOT NULL,          -- AAAA-MM-DD, día colombiano en que pasó
  resumen           TEXT NOT NULL,
  proximo           TEXT,                   -- el próximo paso, en palabras
  proximo_fecha     TEXT,                   -- AAAA-MM-DD; con fecha entra a «Hoy»
  proximo_hecho_en  TEXT,
  proximo_hecho_por TEXT,
  pospuesto         INTEGER NOT NULL DEFAULT 0,   -- cuántas veces se movió la fecha
  ref_tipo          TEXT,                   -- Fase 5: inscripcion | aporte | jornada | caso…
  ref_id            TEXT,
  creado_por        TEXT,
  creado_en         TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en    TEXT,
  anulado_en        TEXT,
  anulado_por       TEXT
);
CREATE INDEX IF NOT EXISTS ix_seguimientos_contacto ON seguimientos (contacto, fecha);
CREATE INDEX IF NOT EXISTS ix_seguimientos_proximo ON seguimientos (proximo_fecha)
  WHERE proximo_fecha IS NOT NULL AND proximo_hecho_en IS NULL AND anulado_en IS NULL;

CREATE TABLE IF NOT EXISTS correos_resueltos (
  correo_id   INTEGER PRIMARY KEY REFERENCES correos(id),
  como        TEXT NOT NULL CHECK (como IN ('reenviado', 'a_mano')),
  reenvio_id  INTEGER,                      -- la fila de `correos` que escribió el reenvío
  nota        TEXT,
  por         TEXT,
  en          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_correos_resueltos_reenvio ON correos_resueltos (reenvio_id);

CREATE INDEX IF NOT EXISTS ix_correos_para_lower ON correos (lower(para), intento_en);
CREATE INDEX IF NOT EXISTS ix_donantes_email_lower ON donantes (lower(email));
CREATE INDEX IF NOT EXISTS ix_donantes_doc ON donantes (doc_numero);
CREATE INDEX IF NOT EXISTS ix_participaciones_email_lower ON participaciones (lower(email));
CREATE INDEX IF NOT EXISTS ix_miembros_donante ON miembros (donante_id);
