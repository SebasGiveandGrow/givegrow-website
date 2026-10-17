-- Give&Grow · base privada · migración 0046
-- ============================================================================
-- CANAL DE QUEJAS, SUGERENCIAS Y FELICITACIONES (oct 2026).
--
-- Es la INFRAESTRUCTURA del mecanismo del apartado 6 de SALVAGUARDA.md, y nada
-- más. Lo que decide la organización —el punto focal, los plazos, la política—
-- NO está aquí: el código lo lee de la configuración del Worker
-- (QUEJAS_PUNTO_FOCAL, QUEJAS_PLAZO_DIAS) y, mientras esté vacío, no lo inventa.
--
-- UNA tabla con dos RUTAS, y la separación es el corazón del mecanismo:
--   · ordinaria    — queja, sugerencia o felicitación. La ve la cola general
--                    de /admin › Quejas.
--   · confidencial — conductas inapropiadas, abuso, explotación, corrupción.
--                    NO entra a «Hoy» ni a la cola general; vive en su propia
--                    sección, que solo abre quien esté en QUEJAS_PUNTO_FOCAL.
--   El CHECK de abajo amarra las dos cosas: la categoría «conducta» va SIEMPRE
--   por la ruta confidencial, y la confidencial solo lleva esa categoría.
--
-- DATOS PERSONALES MÍNIMOS (Ley 1581):
--   · Se puede enviar SIN identificarse (`anonima` = 1, y entonces `nombre` y
--     `contacto` son NULL: el CHECK lo exige, no la buena voluntad del código).
--   · Si deja contacto, es UNO —correo o WhatsApp— y su autorización queda en
--     `consentimientos` con el número de la fila, no con el contacto.
--   · No se guarda la IP: el tope diario usa `topes_ip` (sha256 de día + IP).
--   · El formulario nunca pide datos de un menor de edad.
--
-- `codigo` es el número que se le da a quien envía (8 símbolos del alfabeto de
-- /verificar, sin 0/O ni 1/I/L): con él consulta en qué va, aunque haya sido
-- anónima. Es una llave: no se manda por correo ni se escribe en la auditoría.
--
-- ESTADOS: recibida → en_revision → respondida. «descartada» es para lo que no
-- es una solicitud (pruebas, spam) y no cuenta en el indicador #12; exige
-- motivo. Nada se borra.
--
-- `respuesta` es la nota INTERNA de qué se respondió o se hizo;
-- `respuesta_codigo` es lo que ve quien consulta con el código (opcional, y la
-- única forma de contestarle a quien no dejó contacto).
--
-- Con IF NOT EXISTS: reaplicarla con `migrations apply` es seguro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS quejas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo            TEXT NOT NULL UNIQUE,
  ruta              TEXT NOT NULL CHECK (ruta IN ('ordinaria', 'confidencial')),
  categoria         TEXT NOT NULL CHECK (categoria IN ('queja', 'sugerencia', 'felicitacion', 'conducta')),
  relacionado       TEXT,                       -- mmc · brigada · voluntariado · donaciones · hub · sitio · otro
  mensaje           TEXT NOT NULL,
  anonima           INTEGER NOT NULL DEFAULT 1,
  nombre            TEXT,
  contacto          TEXT,                       -- UN correo o UN WhatsApp, solo si no es anónima
  idioma            TEXT NOT NULL DEFAULT 'es',
  estado            TEXT NOT NULL DEFAULT 'recibida'
                    CHECK (estado IN ('recibida', 'en_revision', 'respondida', 'descartada')),
  creado            TEXT NOT NULL DEFAULT (datetime('now')),
  revision_en       TEXT,
  revision_por      TEXT,
  respondida_en     TEXT,
  respondida_por    TEXT,
  respuesta         TEXT,                       -- interna: qué se respondió o se hizo
  respuesta_medio   TEXT CHECK (respuesta_medio IS NULL OR respuesta_medio IN
                    ('correo', 'whatsapp', 'telefono', 'en_persona', 'codigo', 'sin_contacto')),
  respuesta_codigo  TEXT,                       -- la ve quien consulta con el código
  descartada_en     TEXT,
  descartada_por    TEXT,
  descarte_motivo   TEXT,
  actualizado       TEXT,
  CHECK ((categoria = 'conducta') = (ruta = 'confidencial')),
  CHECK (anonima = 0 OR (nombre IS NULL AND contacto IS NULL))
);
CREATE INDEX IF NOT EXISTS ix_quejas_ruta ON quejas (ruta, estado, creado);
CREATE INDEX IF NOT EXISTS ix_quejas_creado ON quejas (creado);

-- EL INDICADOR #12 YA TIENE DE DÓNDE SALIR. Solo si nadie lo cambió desde el
-- panel: un `calculo` o una `fuente` que el fundador ya editó no se pisa.
UPDATE mel_indicadores SET calculo = 'quejas_a_tiempo'
  WHERE id = 12 AND numero = 12 AND calculo IS NULL;
UPDATE mel_indicadores SET fuente = 'Canal de quejas (/admin › Quejas)', actualizado = datetime('now')
  WHERE id = 12 AND numero = 12 AND fuente = 'Mecanismo de quejas (por construir)';
