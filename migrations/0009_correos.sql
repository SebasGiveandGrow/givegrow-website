-- Give&Grow · base privada · migración 0009
-- ============================================================================
-- Rastro de correo transaccional.
--
-- EL HUECO QUE CIERRA: el Worker manda QUINCE tipos de correo —el recibo al
-- donante, el acuse al voluntario, el de especie, la solicitud de alianza, la
-- aplicación de fundación, el carnet, el reporte de transferencia y los avisos
-- internos— y solo UNO dejaba constancia de haberse enviado: el certificado,
-- con sus `enviado_en` y `enviado_a` de la 0003.
--
-- Los otros catorce mandaban y olvidaban. Y como el correo NUNCA puede tumbar el
-- cobro —regla dura y correcta—, un fallo de Resend se iba a un `console.error`
-- que nadie lee. O sea: invisible.
--
-- Lo que se vuelve respondible con esta tabla:
--   · «No me llegó el recibo» → ¿se envió?, ¿cuándo?, ¿a qué dirección?, ¿con
--     qué id de Resend para buscarlo en sus registros?
--   · ¿Está fallando el correo AHORA? La brigada del 24 al 28 de agosto va a
--     generar el mayor volumen de correo de la historia del sitio.
--   · ¿Se ha enviado alguna vez algo de verdad? Si falta RESEND_API_KEY el
--     código simula el envío EN SILENCIO, a propósito, para poder construir la
--     capa antes de tener la cuenta. Con `resultado = 'simulado'` en producción,
--     eso se ve en el panel en vez de descubrirse por un reclamo.

CREATE TABLE IF NOT EXISTS correos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  etiqueta     TEXT NOT NULL,              -- aporte-aprobado | carnet | aviso-aliado…
  para         TEXT NOT NULL,
  asunto       TEXT,
  -- Guía del aporte cuando el correo habla de uno. Es lo que permite contestar
  -- «¿le llegó el recibo de esta donación?» sin buscar por correo del donante.
  guia         TEXT,
  -- enviado   → Resend aceptó, y `proveedor_id` es su id
  -- fallo     → Resend respondió error, o la petición se cayó
  -- simulado  → no hay RESEND_API_KEY: NO se envió nada
  resultado    TEXT NOT NULL,
  proveedor_id TEXT,
  error        TEXT,
  intento_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- NO se guarda el CUERPO del correo, y es una decisión: el cuerpo repite datos
-- personales que ya viven en `donantes` e `inscripciones` (nombres, dedicatorias,
-- teléfonos) y duplicarlos en una tabla más solo amplía la superficie sin
-- responder ninguna pregunta que el asunto y la etiqueta no respondan. Ley 1581,
-- principio de minimización.

CREATE INDEX IF NOT EXISTS ix_correos_guia      ON correos(guia);
CREATE INDEX IF NOT EXISTS ix_correos_para      ON correos(para);
CREATE INDEX IF NOT EXISTS ix_correos_resultado ON correos(resultado, intento_en);
