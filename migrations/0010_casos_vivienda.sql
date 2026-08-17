-- Give&Grow · base privada · migración 0010
-- ============================================================================
-- Triage estructural de viviendas afectadas por el sismo del 10 de agosto.
--
-- QUÉ ES Y QUÉ NO ES. Hay más casas dañadas que ingenieros para visitarlas.
-- Esto NO es un dictamen de habitabilidad: por fotos no se determina, y la
-- declaratoria con efectos —evacuar, demoler— le corresponde a la autoridad
-- municipal (Ley 1523 de 2012). Lo que hace es PRIORIZAR: que un ingeniero
-- voluntario, viendo fotos, diga a quién hay que visitar primero y qué
-- recomendarle mientras tanto.
--
-- Que la distinción esté escrita aquí no es retórica: gobierna el esquema. Por
-- eso la columna se llama `clasificacion` y no `veredicto`, y por eso
-- `evaluaciones` admite varias por caso y una de sus salidas es «no puedo
-- evaluar con esto».

-- ============================================================================
-- casos
-- ============================================================================
-- LA DECISIÓN QUE MÁS PESA: la ubicación va PARTIDA EN DOS.
--
--   `sector`        → "Cali · comuna 18". Es lo ÚNICO publicable.
--   `direccion_ref` → la dirección exacta. NUNCA sale de /admin.
--
-- Es el mismo criterio de `partners.json`, donde las fundaciones van a nivel de
-- zona y nunca con dirección exacta, pero aquí el riesgo es mayor: publicar
-- «casa dañada y desocupada, en esta dirección» es un mapa para quien roba, y
-- pasa justo en zonas de desastre. Si alguna vez se construye el banco público,
-- que la separación esté en el ESQUEMA y no en la disciplina de quien programa
-- es lo que impide el accidente.
CREATE TABLE IF NOT EXISTS casos (
  numero          TEXT PRIMARY KEY,          -- CV-2026-000001. No se reinicia nunca.
  -- 128 bits. La familia consulta su caso con esto y sin crear cuenta, igual
  -- que el recibo de donación. Un caso inexistente y uno ajeno deben devolver
  -- el MISMO error, para no dejar un oráculo de qué casos existen.
  token           TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'recibido',
                  -- recibido | en_revision | clasificado | visitado | cerrado | descartado
  clasificacion   TEXT,                      -- NULL hasta que un ingeniero la ponga
                  -- urgente | programada | no_requiere | inevaluable

  sector          TEXT NOT NULL,             -- público
  direccion_ref   TEXT,                      -- privado, solo para ir a visitar

  -- CONTACTO. El teléfono es el identificador: en estas zonas mucha gente tiene
  -- WhatsApp y no correo. El correo es opcional DE VERDAD — si se exigiera,
  -- dejaría fuera justo a quien más lo necesita.
  contacto_nombre TEXT NOT NULL,
  contacto_tel    TEXT NOT NULL,
  contacto_email  TEXT,

  -- La casa, en preguntas que una familia puede responder sin saber de
  -- ingeniería. `anio_aprox` es TEXTO a propósito: «como hace 20 años» es una
  -- respuesta válida y forzar un número perdería el dato.
  material        TEXT,                      -- ladrillo|adobe|bahareque|prefabricado|madera|no_se
  pisos           INTEGER,
  anio_aprox      TEXT,
  danio_previo    INTEGER,                   -- ¿tenía grietas ANTES del sismo?
  habitada        INTEGER,
  heridos         INTEGER,
  filtra_agua     INTEGER,
  nota            TEXT,                      -- lo que la familia quiera contar

  -- DOS CONSENTIMIENTOS, Y SEPARADOS A PROPÓSITO (Ley 1581).
  -- Aceptar que un ingeniero revise tu caso y aceptar que tu casa aparezca en
  -- internet son decisiones distintas, y la segunda es la que de verdad le
  -- importa a la familia. Juntarlas en una casilla no sería consentimiento
  -- informado. `consent_publico` puede revocarse sin perder el caso.
  consent_eval    INTEGER NOT NULL DEFAULT 0,
  consent_publico INTEGER NOT NULL DEFAULT 0,
  consent_en      TEXT,

  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_casos_estado  ON casos(estado, creado_en);
CREATE INDEX IF NOT EXISTS ix_casos_sector  ON casos(sector);
CREATE INDEX IF NOT EXISTS ix_casos_tel     ON casos(contacto_tel);
-- Para el banco público del futuro: solo lo clasificado Y consentido.
CREATE INDEX IF NOT EXISTS ix_casos_publico ON casos(consent_publico, clasificacion);

-- ============================================================================
-- caso_medios — fotos y video
-- ============================================================================
-- Tabla aparte porque son varios por caso y porque el ingeniero necesita saber
-- QUÉ está viendo: una fachada y una grieta no se leen igual.
--
-- El archivo vive en R2, aquí solo su llave. Y el caso se crea ANTES de subir
-- nada: si la señal se cae en la foto cuatro, las tres primeras y todos los
-- datos ya están guardados. Es el patrón del comprobante bancario, que ya
-- funciona en producción — y en zona de desastre es la diferencia entre
-- recibir un caso y recibir un abandono.
CREATE TABLE IF NOT EXISTS caso_medios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  caso       TEXT NOT NULL REFERENCES casos(numero),
  r2_key     TEXT NOT NULL,
  clase      TEXT NOT NULL DEFAULT 'foto',   -- foto | video
  categoria  TEXT,                           -- conjunto | estructura | dano | entorno
  bytes      INTEGER,
  nota       TEXT,                           -- lo que la familia escriba de ese medio
  orden      INTEGER NOT NULL DEFAULT 0,
  subido_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_medios_caso ON caso_medios(caso, categoria, orden);

-- ============================================================================
-- evaluaciones
-- ============================================================================
-- VARIAS POR CASO, no una. Dos razones, y las dos importan:
--   · Si dos ingenieros coinciden, la clasificación pesa más.
--   · Si discrepan, eso es exactamente lo que hay que mirar ANTES de decirle a
--     una familia que no vuelva a dormir en su casa.
--
-- `inevaluable` es una salida de primera clase, con `falta` para decir qué foto
-- se necesita. Que un ingeniero pueda decir «con esto no puedo» es lo que evita
-- que firme por compromiso — y su matrícula va en el documento.
CREATE TABLE IF NOT EXISTS evaluaciones (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  caso          TEXT NOT NULL REFERENCES casos(numero),
  -- El correo lo entrega Cloudflare Access, no se escribe a mano: es la
  -- identidad ya verificada de quien entró.
  ing_email     TEXT NOT NULL,
  ing_nombre    TEXT NOT NULL,
  ing_matricula TEXT NOT NULL,
  clasificacion TEXT NOT NULL,               -- urgente|programada|no_requiere|inevaluable
  nota_tecnica  TEXT NOT NULL,
  recomendacion TEXT,                        -- qué hacer mientras tanto
  falta         TEXT,                        -- si es inevaluable: qué falta
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_eval_caso ON evaluaciones(caso, creado_en);
CREATE INDEX IF NOT EXISTS ix_eval_ing  ON evaluaciones(ing_email, creado_en);

-- ============================================================================
-- numerador propio
-- ============================================================================
-- Consecutivo aparte del de guías y del de actas. Misma regla que los otros y
-- por la misma razón: NO SE REINICIA NUNCA. Dos sistemas que numeran lo mismo
-- terminan emitiendo el mismo número para cosas distintas — ya pasó aquí entre
-- D1 y la hoja de cálculo con las guías de donación.
CREATE TABLE IF NOT EXISTS numerador_caso (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

-- Los INGENIEROS no llevan tabla: van en `inscripciones` con tipo 'ingeniero' y
-- sus datos (matrícula, especialidad, ciudad) en el JSON de `datos`. La tabla
-- se diseñó así desde la 0001 —«cuatro tipos, una tabla»— y admite un quinto
-- sin tocar el esquema. Aprobar a uno es añadir su correo en Cloudflare Access,
-- no crear una cuenta: cero contraseñas que guardar y cero que se filtren.
