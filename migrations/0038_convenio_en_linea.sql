-- 0038_convenio_en_linea.sql — el convenio del HUB se llena, se sube y se firma en linea
--
-- POR QUE HACE FALTA. Desde el PR #545 el paso 4 (convenio) tiene su lista del
-- Anexo 1 en el panel, pero la fundacion reunia los papeles por su cuenta, los
-- mandaba respondiendo un correo y firmaba en otra parte. Ahora entra a
-- /convenio/<token> y ahi mismo llena los formularios A (conocimiento del
-- aliado y origen licito), B (conflictos de interes) y C (datos personales),
-- acepta el convenio (D), sube los documentos del Anexo 1 y firma cada cosa con
-- un codigo de un solo uso que le llega al correo de su inscripcion.
--
-- CUATRO TABLAS, cada una por su motivo:
--
--   · convenio_enlaces   — el enlace privado (token de 128 bits PROPIO, no el del
--     cuestionario: un enlace viejo de la ficha no abre la firma de un
--     contrato) y el PDF del convenio que Give&Grow sube para ESA fundacion.
--   · convenio_formularios — una fila por formulario: el borrador mientras se
--     llena y, al firmar, la evidencia de la firma electronica (Ley 527 de 1999,
--     Decreto 2364 de 2012, hoy compilado en el Decreto 1074 de 2015): nombre
--     tecleado, documento, calidad, fecha UTC, el JSON canonico de lo firmado y
--     su SHA-256, la huella de la IP, el user agent y el correo verificado.
--   · convenio_archivos  — el indice de lo que la fundacion subio. Los bytes
--     viven en R2 (convenio/<id>/archivos/…) y NUNCA se sirven en publico: solo
--     /admin, detras de Access.
--   · convenio_codigos   — los codigos de 6 digitos. Se guarda su hash con sal,
--     no el codigo; valen 15 minutos y 5 intentos. El codigo queda atado al
--     CONTENIDO exacto que se va a firmar: lo que se firma es lo que se le
--     mostro a quien pidio el codigo, ni una coma mas.
--
-- LO FIRMADO NO SE REESCRIBE, y no solo porque el servidor no lo intente: el
-- trigger de abajo aborta cualquier UPDATE que toque la evidencia de una fila
-- firmada. Solo puede cambiar despues `comprobante_clave` (el PDF se genera
-- justo despues de firmar) y `conservado_en` (la marca de la supresion).
--
-- SIN LLAVES FORANEAS, a proposito. La supresion de una inscripcion (Ley 1581)
-- borra todo esto en el mismo batch, salvo una cosa: si la fundacion ya FIRMO
-- la aceptacion del convenio (D), sus documentos firmados se CONSERVAN como
-- evidencia del contrato (obligacion de conservar los mensajes de datos, Ley
-- 527 art. 12-13; art. 15 de la Ley 1581 deja fuera de la supresion lo que hay
-- deber legal o contractual de conservar). Con una llave foranea esas filas
-- impedirian borrar la inscripcion — la misma trampa que tuvo
-- `fichas_fundacion` hasta el 28 sep 2026. Los archivos subidos, los
-- borradores y los codigos se borran siempre.
--
-- NUMEROS DE DOCUMENTO: aqui SI, y solo aqui. El convenio los necesita (son
-- parte de lo que se firma) y viven en la base privada. Nunca en el repo, nunca
-- en `consentimientos`, nunca en una nota del panel.
--
-- TODO LLEVA `IF NOT EXISTS`, asi que reaplicarla es seguro. Aplicar SOLO con
--   npx wrangler d1 migrations apply givegrow-privado --remote
-- (no con `d1 execute --file`, que no la registra: ver CLAUDE.md). Va ANTES de
-- desplegar el codigo: sin ella /convenio/<token> responde 503 y el panel dice
-- que falta la migracion, pero nada mas se cae.
--
-- La 0033 sigue reservada y sin usar.

CREATE TABLE IF NOT EXISTS convenio_enlaces (
  inscripcion       INTEGER PRIMARY KEY,           -- inscripciones.id (sin FK: ver arriba)
  token             TEXT NOT NULL UNIQUE,          -- 32 hex, 128 bits
  creado_en         TEXT NOT NULL DEFAULT (datetime('now')),
  texto_clave       TEXT,                          -- R2: convenio/<id>/texto/convenio-<rand>.pdf
  texto_sha256      TEXT,                          -- huella del PDF: entra en lo que se firma en D
  texto_bytes       INTEGER,
  texto_subido_en   TEXT,
  texto_subido_por  TEXT                           -- correo de la sesion de Access
);

CREATE TABLE IF NOT EXISTS convenio_formularios (
  inscripcion        INTEGER NOT NULL,
  formulario         TEXT NOT NULL CHECK (formulario IN ('A', 'B', 'C', 'D')),
  estado             TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'firmado')),
  datos              TEXT,                         -- JSON: respuestas (borrador, y lo que se firmo)
  actualizado_en     TEXT NOT NULL DEFAULT (datetime('now')),
  -- La evidencia de la firma. Todo NULL mientras es borrador.
  contenido          TEXT,                         -- JSON canonico de texto + respuestas + firmante
  contenido_sha256   TEXT,
  firmante_nombre    TEXT,
  firmante_doc_tipo  TEXT,
  firmante_doc_num   TEXT,
  firmante_calidad   TEXT,                         -- representante legal / responsable del proyecto
  correo_verificado  TEXT,                         -- a donde llego el codigo que se tecleo
  firmado_en         TEXT,                         -- UTC
  ip_huella          TEXT,                         -- sha256(ip|inscripcion|formulario|firmado_en)
  user_agent         TEXT,
  comprobante_clave  TEXT,                         -- R2: convenio/<id>/firmados/<F>-<rand>.pdf
  conservado_en      TEXT,                         -- se suprimio la inscripcion y esto se conservo
  PRIMARY KEY (inscripcion, formulario)
);

-- LO FIRMADO NO CAMBIA. Un UPDATE sobre una fila firmada solo puede tocar
-- `comprobante_clave`, `conservado_en` y `actualizado_en`.
CREATE TRIGGER IF NOT EXISTS tr_convenio_firmado_inmutable
BEFORE UPDATE ON convenio_formularios
WHEN OLD.estado = 'firmado' AND (
  NEW.estado IS NOT OLD.estado OR NEW.datos IS NOT OLD.datos OR
  NEW.contenido IS NOT OLD.contenido OR NEW.contenido_sha256 IS NOT OLD.contenido_sha256 OR
  NEW.firmante_nombre IS NOT OLD.firmante_nombre OR NEW.firmante_doc_tipo IS NOT OLD.firmante_doc_tipo OR
  NEW.firmante_doc_num IS NOT OLD.firmante_doc_num OR NEW.firmante_calidad IS NOT OLD.firmante_calidad OR
  NEW.correo_verificado IS NOT OLD.correo_verificado OR NEW.firmado_en IS NOT OLD.firmado_en OR
  NEW.ip_huella IS NOT OLD.ip_huella OR NEW.user_agent IS NOT OLD.user_agent)
BEGIN
  SELECT RAISE(ABORT, 'convenio_firmado_inmutable');
END;

CREATE TABLE IF NOT EXISTS convenio_archivos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion   INTEGER NOT NULL,
  doc           TEXT NOT NULL,                     -- DOCS_CONVENIO[].id en worker.js
  clave         TEXT NOT NULL UNIQUE,              -- R2: convenio/<id>/archivos/<rand>-<doc>.<ext>
  tipo          TEXT NOT NULL,                     -- el que dicen los BYTES, no el navegador
  bytes         INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  subido_en     TEXT NOT NULL DEFAULT (datetime('now')),
  estado        TEXT NOT NULL DEFAULT 'subido' CHECK (estado IN ('subido', 'rechazado')),
  motivo        TEXT,                              -- por que se rechazo (lo ve la fundacion)
  revisado_por  TEXT,
  revisado_en   TEXT
);
CREATE INDEX IF NOT EXISTS ix_convenio_archivos_insc ON convenio_archivos(inscripcion, doc);

CREATE TABLE IF NOT EXISTS convenio_codigos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion       INTEGER NOT NULL,
  formulario        TEXT NOT NULL,
  sal               TEXT NOT NULL,
  codigo_hash       TEXT NOT NULL,                 -- sha256(sal|codigo)
  contenido         TEXT NOT NULL,                 -- lo que se firmara si el codigo es bueno
  contenido_sha256  TEXT NOT NULL,
  correo            TEXT NOT NULL,
  creado_en         TEXT NOT NULL DEFAULT (datetime('now')),
  expira_en         TEXT NOT NULL,
  intentos          INTEGER NOT NULL DEFAULT 0,
  usado_en          TEXT,
  anulado_en        TEXT                           -- lo reemplazo un codigo mas nuevo
);
CREATE INDEX IF NOT EXISTS ix_convenio_codigos ON convenio_codigos(inscripcion, formulario, creado_en);
