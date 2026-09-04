-- 0023_ficha_fundacion.sql — el cuestionario largo del HUB, nativo y en D1
--
-- POR QUE NATIVO Y NO UN GOOGLE FORM. `ops/cuestionario-fundaciones-hub.md`
-- especifica un Google Form y `ops/crear-form-fundaciones.gs` lo crearia, pero
-- nadie lo ejecuto nunca: no habia ninguna URL de formulario en el repo, asi que
-- «automatizar el envio» era imposible — no habia que enviar. Decision de Sebas
-- el 4 de septiembre de 2026: hacerlo nativo.
--
-- Y hay una razon de peso ademas de la coherencia: un Google Form deja las
-- respuestas en una hoja de Google, no en D1. Es exactamente el patron que la
-- auditoria de agosto encontro roto — el Apps Script de aliados PERDIA `sector`,
-- `aporta` e `instagram` en silencio porque la hoja no tenia esas columnas. Un
-- cuestionario que alimenta `data/partners.json` no puede vivir donde los campos
-- se caen sin avisar.
--
-- CUANDO SE ABRE. Despues de la VISITA DE CONTEXTO, que es el paso 3 de los
-- cinco que el sitio publica — no al aceptar. Lo dice la cabecera del propio
-- cuestionario: pedir logo, fotos y costos antes de conocerse es pedirle
-- documentacion a alguien con quien todavia no se ha hablado. Por eso
-- `inscripciones` gana el estado `visitada` y es ESE el que abre la ficha.
--
-- EL TOKEN. La fundacion no tiene cuenta ni contraseña —crear una para llenar un
-- formulario una vez es una barrera, y este proyecto ya decidio que las puertas
-- se abren con enlace y token, como el caso de Mira Mi Casa o el comprobante de
-- una transferencia—. 32 hex de `crypto.getRandomValues`, UNICO, y sin el no se
-- lee ni se escribe nada.
--
-- LAS RESPUESTAS VAN EN JSON, y no en veinte columnas. El cuestionario tiene
-- siete secciones y va a cambiar: cada pregunta nueva seria una migracion. Lo que
-- SI se indexa es lo que se consulta —la inscripcion y el estado—, igual que hace
-- `inscripciones.datos` desde la 0001.
--
-- SE APLICA A MANO Y ANTES del codigo que la usa. Mientras no este aplicada, el
-- paso «La base esta migrada» de deploy.yml BLOQUEA el despliegue, y ese paso lee
-- `d1_migrations`: por eso este archivo se registra solo al final.

-- El enlace del cuestionario. Va en `inscripciones` y no en la ficha porque
-- existe ANTES que ella: se genera al marcar la visita, cuando todavia no hay
-- ninguna respuesta.
ALTER TABLE inscripciones ADD COLUMN token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_inscripciones_token
  ON inscripciones(token) WHERE token IS NOT NULL;

CREATE TABLE IF NOT EXISTS fichas_fundacion (
  inscripcion    INTEGER PRIMARY KEY REFERENCES inscripciones(id),
  estado         TEXT NOT NULL DEFAULT 'borrador',   -- borrador | enviada
  datos          TEXT,                                -- JSON con las respuestas
  creada_en      TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en TEXT NOT NULL DEFAULT (datetime('now')),
  enviada_en     TEXT
);

CREATE INDEX IF NOT EXISTS ix_fichas_estado ON fichas_fundacion(estado);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0023_ficha_fundacion.sql');
