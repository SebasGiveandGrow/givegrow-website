-- 0036_jornadas_voluntariado.sql — la jornada de voluntariado, de la ficha al cierre
--
-- POR QUE HACE FALTA. VOLUNTARIADO.md §7 le promete a cada quien algo que hasta
-- hoy no tenia donde vivir: al voluntario, un «certificado de voluntariado con
-- las horas efectivas»; a la empresa, la trazabilidad de la jornada «igual que
-- una donacion»; y MEDICION.md cuenta «jornadas realizadas» y «horas de
-- voluntariado efectivas» entre los outputs verificables, con «Registro de
-- jornada» como fuente. Ese registro no existia: el panel sabia quien se
-- inscribio y si ya hizo su Marco (`inscripciones.datos.pasos`, PR #518), pero
-- no QUE jornadas hubo, quien fue ni cuantas horas. Con la primera empresa a la
-- vuelta del Social Fest, la promesa tenia que dejar de ser un parrafo.
--
-- CUATRO TABLAS Y UN NUMERADOR, una por cada cosa que pasa en un momento
-- distinto:
--   · `jornadas`         la ficha de convocatoria y su estado.
--   · `participaciones`  quien fue y cuantas horas. Se escribe mientras la
--                        jornada esta abierta y se congela al cerrarla.
--   · `encuestas`        un enlace privado por actor (cada participante, la
--                        empresa, la fundacion) y su respuesta. Nace al cerrar.
--   · `reconocimientos`  el certificado de horas de cada participante: su
--                        numero, lo que dice (congelado) y si ya salio.
--
-- TODO LLEVA `IF NOT EXISTS` (no hay ningun ADD COLUMN), asi que reaplicarla
-- con el comando bueno es seguro. Aplicar SOLO con
--   npx wrangler d1 migrations apply givegrow-privado --remote
-- (no con `d1 execute --file`, que no la registra: ver CLAUDE.md). Va ANTES de
-- desplegar el codigo: el panel lee estas tablas al abrir el modulo
-- «Voluntariado», y sin ellas esa bandeja responde 500.
--
-- La 0033 sigue reservada y sin usar.

-- ---------------------------------------------------------------------------
-- La jornada. Las fechas y horas las escribe una PERSONA y ya estan en hora de
-- Colombia (AAAA-MM-DD y HH:MM): el panel no les resta cinco horas, igual que a
-- `fecha_visita` de las inspecciones.
--
-- `anfitriona` es el id de la fundacion en `data/partners.json` («ndf»), o
-- 'sede' cuando la jornada es en la sede de Give&Grow (la puerta
-- administrativa). Se guarda el id y no el nombre por lo mismo que la 0035: el
-- nombre se resuelve al mostrarlo. El certificado, en cambio, congela el nombre
-- del dia en que se emitio — ver `reconocimientos.datos`.
--
-- LA EMPRESA ES TEXTO LIBRE, con un enlace OPCIONAL a su solicitud de alianza
-- (`inscripciones` con tipo 'empresa'). Libre porque un grupo de amigos o un
-- colegio tambien convocan, y no tienen fila; el enlace, porque cuando existe
-- es de ahi de donde sale el correo para la encuesta de la empresa. SIN llave
-- foranea, a proposito: suprimir esa inscripcion (Ley 1581) no puede fallar
-- por una jornada que la menciona — la 0023 ya tiene esa cicatriz.
--
-- `marco_en` es la regla de VOLUNTARIADO.md §4: «sin sesion de Marco no hay
-- jornada». El servidor no deja marcar como realizada una jornada de las
-- puertas que pisan territorio (impact-journey, terreno) sin esta fecha.
--
-- `costos`: NADA de esto se cobra (VOLUNTARIADO.md, decision de Sebas). Si una
-- jornada tiene materiales, se acuerdan con la empresa y aqui queda escrito que
-- se acordo; no es una tarifa ni un precio.
--
-- LOS BENEFICIARIOS LOS REPORTA LA FUNDACION, no los contamos nosotros. Se
-- guardan con ese nombre en el panel («reportados por la fundacion») porque es
-- la regla de contribucion y no atribucion de MEDICION.md §1.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jornadas (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre               TEXT NOT NULL,
  descripcion          TEXT,
  rol                  TEXT,                 -- que hacen los voluntarios ese dia
  requisitos           TEXT,                 -- que se necesita para participar
  fecha                TEXT,                 -- AAAA-MM-DD, hora de Colombia
  hora_inicio          TEXT,                 -- HH:MM
  hora_fin             TEXT,                 -- HH:MM
  lugar                TEXT,
  formato              TEXT NOT NULL DEFAULT 'presencial', -- presencial | virtual | remoto | hibrido
  cupo_min             INTEGER,
  cupo_max             INTEGER,
  anfitriona           TEXT,                 -- id de partners.json, o 'sede'
  empresa              TEXT,                 -- empresa o grupo aliado, texto libre
  empresa_inscripcion  INTEGER,              -- inscripciones.id (tipo empresa), sin FK a proposito
  empresa_email        TEXT,                 -- a donde va su encuesta, si no sale de la inscripcion
  fundacion_email      TEXT,                 -- a donde va la encuesta de la anfitriona (opcional)
  coordinador          TEXT,                 -- voluntario coordinador responsable (nombre)
  puerta               TEXT NOT NULL,        -- impact-journey | terreno | administrativo | tecnico | emergencia
  estado               TEXT NOT NULL DEFAULT 'planeada', -- planeada | confirmada | realizada | cerrada | cancelada
  marco_en             TEXT,
  marco_por            TEXT,
  costos               TEXT,                 -- materiales y costos acordados con la empresa
  beneficiarios_directos   INTEGER,          -- reportados por la fundacion
  beneficiarios_indirectos INTEGER,          -- reportados por la fundacion
  beneficiarios_nota   TEXT,                 -- de donde sale la cifra (acta, lista, estimacion de la fundacion)
  cerrada_en           TEXT,
  cerrada_por          TEXT,
  creada_en            TEXT NOT NULL DEFAULT (datetime('now')),
  creada_por           TEXT,
  actualizada_en       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_jornadas_estado ON jornadas(estado, fecha);

-- ---------------------------------------------------------------------------
-- Quien fue. Lo preferido es ENLAZAR un voluntario que ya existe
-- (`inscripcion`): de ahi salen su idioma, su edad y su acudiente. Cuando no se
-- inscribio por el sitio —el equipo de una empresa llega en lista— se anota
-- con nombre, correo y CELULAR, que es obligatorio en todo el sitio desde el
-- 28 sep 2026.
--
-- Nombre, correo y celular se COPIAN aunque haya enlace: el certificado tiene
-- que poder salir aunque la inscripcion se archive. Y la supresion (Ley 1581)
-- los borra tambien aqui — `adminBorrarInscripcion` deja la fila anonima y
-- conserva solo las horas, que son un agregado y no un dato de nadie.
--
-- `menor`: 1 menor, 0 mayor, NULL «no se sabe». Al menor NUNCA se le escribe;
-- con NULL tampoco se le escribe a nadie hasta que una persona lo confirme.
-- El correo del acudiente solo existe si el registro del voluntario lo trae.
--
-- `pro_bono` marca las horas PROFESIONALES (asesoria, diseño, derecho…), que
-- MEDICION.md cuenta aparte como «capacidad transferida».
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participaciones (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  jornada          INTEGER NOT NULL REFERENCES jornadas(id),
  inscripcion      INTEGER,                  -- inscripciones.id (tipo voluntario), sin FK a proposito
  nombre           TEXT NOT NULL,
  email            TEXT,
  celular          TEXT,
  idioma           TEXT NOT NULL DEFAULT 'es', -- es | en
  menor            INTEGER,                  -- 1 | 0 | NULL (sin confirmar)
  acudiente_nombre TEXT,
  acudiente_email  TEXT,
  horas            REAL,                     -- horas EFECTIVAS; NULL = todavia sin anotar
  pro_bono         INTEGER NOT NULL DEFAULT 0,
  creada_en        TEXT NOT NULL DEFAULT (datetime('now')),
  creada_por       TEXT
);
CREATE INDEX IF NOT EXISTS ix_participaciones_jornada ON participaciones(jornada);
-- La misma persona inscrita no se anota dos veces en la misma jornada.
CREATE UNIQUE INDEX IF NOT EXISTS ux_participaciones_inscripcion
  ON participaciones(jornada, inscripcion) WHERE inscripcion IS NOT NULL;

-- ---------------------------------------------------------------------------
-- La encuesta de satisfaccion. UNA FILA POR ENLACE, y el enlace es el token:
-- 32 hex de `crypto.getRandomValues`, como la ficha de la fundacion y la
-- membresia. La pagina publica /encuesta/<token> no pide ningun dato personal:
-- quien responde ya esta identificado por el enlace que recibio.
--
-- UNA RESPUESTA POR TOKEN, y lo garantiza la base: se escribe con
-- `WHERE respondida_en IS NULL`, asi que dos envios a la vez no se pisan.
--
-- `satisfaccion` va en su columna (1–5) y no solo dentro del JSON porque es lo
-- que se promedia en el panel; el resto de las respuestas son abiertas y van en
-- `respuestas`, que cambiara de preguntas sin pedir otra migracion.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encuestas (
  token          TEXT PRIMARY KEY,
  jornada        INTEGER NOT NULL REFERENCES jornadas(id),
  actor          TEXT NOT NULL,              -- voluntario | empresa | fundacion
  participacion  INTEGER REFERENCES participaciones(id),
  idioma         TEXT NOT NULL DEFAULT 'es',
  satisfaccion   INTEGER,                    -- 1..5
  respuestas     TEXT,                       -- JSON
  respondida_en  TEXT,
  -- Cuando se le mando el enlace por correo a la empresa o a la fundacion. El
  -- del voluntario viaja dentro del correo de agradecimiento y no se anota
  -- aqui: lo dice `reconocimientos.enviado_en`.
  enviada_en     TEXT,
  creada_en      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_encuestas_jornada ON encuestas(jornada, actor);
-- Un enlace por participante, y uno solo para la empresa y otro para la
-- fundacion de cada jornada: cerrar dos veces no duplica encuestas.
CREATE UNIQUE INDEX IF NOT EXISTS ux_encuestas_participacion
  ON encuestas(participacion) WHERE participacion IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_encuestas_actor
  ON encuestas(jornada, actor) WHERE participacion IS NULL;

-- ---------------------------------------------------------------------------
-- El reconocimiento: el certificado de voluntariado y el correo que lo lleva.
--
-- NO ES UN CERTIFICADO DE DONACION y no lleva nada de su articulado: no
-- certifica dinero ni da beneficio tributario. Dice quien, que jornada, cuando,
-- con que fundacion y cuantas horas efectivas.
--
-- SE EMITE AL CERRAR LA JORNADA, para todos los que tienen horas: ahi se le da
-- numero (VC-AAAA-NNNNNN) y se CONGELA lo que dice en `datos`, con su huella.
-- Por eso el PDF que se descarga hoy y el que se descarga en un año dicen lo
-- mismo, aunque la fundacion cambie de nombre en partners.json — la misma
-- regla de `certificados.datos` (0003).
--
-- EL ENVIO ES IDEMPOTENTE: se reserva con `enviado_en` mientras sea NULL y
-- `enviado_a = 'enviando'`, igual que `enviarCertificadoFirmado`. Si el correo
-- no sale, se suelta la reserva y se puede reintentar; si salio, no sale dos
-- veces. `enviado_a` es a quien de verdad se le mando (el participante o su
-- acudiente), para que el panel lo diga.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconocimientos (
  participacion  INTEGER PRIMARY KEY REFERENCES participaciones(id),
  jornada        INTEGER NOT NULL REFERENCES jornadas(id),
  numero         TEXT NOT NULL UNIQUE,       -- VC-AAAA-NNNNNN
  datos          TEXT NOT NULL,              -- JSON congelado de lo que dice el certificado
  huella         TEXT NOT NULL,              -- sha256 de `datos`
  emitido_en     TEXT NOT NULL DEFAULT (datetime('now')),
  enviado_en     TEXT,
  enviado_a      TEXT,                       -- correo, o 'enviando' mientras se reserva
  enviado_por    TEXT
);
CREATE INDEX IF NOT EXISTS ix_reconocimientos_jornada ON reconocimientos(jornada);

-- Consecutivo propio, con la misma mecanica atomica de las otras series
-- (ON CONFLICT ... RETURNING): un certificado de horas no es ninguna de ellas.
CREATE TABLE IF NOT EXISTS numerador_voluntariado (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL
);
