-- Give&Grow · base privada · migración 0032
-- ============================================================================
-- Latidos del cron, incidentes y el tope diario por IP (auditoría de operación
-- del 28 sep 2026).
--
-- EL HUECO QUE CIERRA. El cron diario hace tres trabajos —el aviso del séptimo
-- día a las familias, el cobro mensual de las membresías y el resumen al
-- equipo— y cada uno terminaba en un `console.log`. Si un trabajo reventaba, o
-- si el cron dejaba de correr, lo único que quedaba era una línea en un log que
-- nadie abre. Lo mismo con las excepciones del Worker: el `catch` de arriba
-- respondía 500 y escribía en consola. Cero señal para una persona.
--
-- NINGUNA DE LAS TRES TABLAS GUARDA DATOS PERSONALES, y es a propósito:
--   · `latidos.detalle` es el resumen en números que ya salía al log.
--   · `incidentes.ruta` va sin query y con los tokens tachados, y `mensaje` va
--     truncado y con correos y números largos tachados (ver anotarIncidente).
--   · `topes_ip.huella` es sha256(día + IP), no la IP: no se puede cruzar entre
--     días y las filas se borran a los dos días.
--
-- ⚠️ SE APLICA A MANO ANTES DEL DESPLIEGUE, con el comando de CLAUDE.md:
--   npx wrangler d1 migrations apply givegrow-privado --remote
-- El paso «La base está migrada» de deploy.yml se niega a desplegar sin ella.
-- Y el código no se cae si falta: cada escritura va en su propio try.
--
-- SIN la línea `INSERT OR IGNORE INTO d1_migrations` que llevan la 0022–0027,
-- como la 0028–0031: `migrations apply` ya registra la migración, y si el
-- archivo la registra antes, su propio INSERT choca con el UNIQUE de `name`.

CREATE TABLE IF NOT EXISTS latidos (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  trabajo  TEXT NOT NULL,                 -- aviso-septimo-dia | cobro-mensual | resumen-diario | alerta-operacion
  ok       INTEGER NOT NULL,              -- 1 terminó, 0 lanzó excepción
  detalle  TEXT,                          -- el resumen en números, truncado
  en       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_latidos_trabajo ON latidos(trabajo, ok, en);

CREATE TABLE IF NOT EXISTS incidentes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  origen   TEXT NOT NULL,                 -- fetch | api | admin | cron:<trabajo> | cobro-mensual | wompi | tope-ip
  ruta     TEXT,
  mensaje  TEXT,
  en       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_incidentes_en ON incidentes(en);

-- Una fila por (huella de IP, puerta, día). El contador se sube con un UPSERT.
CREATE TABLE IF NOT EXISTS topes_ip (
  huella   TEXT NOT NULL,
  puerta   TEXT NOT NULL,                 -- caso | inscripcion | transferencia | baja-enlace
  dia      TEXT NOT NULL,                 -- YYYY-MM-DD en UTC, como el cupo de Resend
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (huella, puerta, dia)
);
