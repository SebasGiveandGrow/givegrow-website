-- 0037_obligaciones_cumplidas.sql — que un vencimiento tributario o legal ya se atendio
--
-- POR QUE HACE FALTA. El 22 sep 2026 la Alcaldia de Medellin notifico que la
-- Fundacion nunca presento la declaracion de ICA del año gravable 2025. No
-- estaba en ninguna lista. Desde este PR el calendario de obligaciones vive en
-- la constante `OBLIGACIONES` de worker.js (DIAN, Medellin, Gobernacion,
-- Camara de Comercio y las de la propia Fundacion), y el panel lo muestra en
-- «Contabilidad › Vencimientos» y en «Hoy».
--
-- LAS FECHAS NO VAN AQUI, a proposito. Las fija un decreto o una resolucion
-- una vez al año y cambiarlas es un PR revisado con su fuente, no un clic. Lo
-- unico que es dato vivo es lo que guarda esta tabla: que UN vencimiento
-- concreto (clave + fecha) se atendio, por quien y cuando. Sin fila = pendiente.
--
-- DOS ESTADOS, y los dos sacan el vencimiento de «Hoy» y del correo diario:
--   · 'hecho'      se presento, se pago o se hizo.
--   · 'no_aplica'  ese periodo no aplicaba: un mes sin retenciones (el 350 no
--                  se presenta en ceros, art. 606 par. ET), un trimestre sin
--                  cambios de beneficiarios finales. Sin este estado, la
--                  retencion de cada mes sin retenciones se quedaria en rojo
--                  para siempre y el panel aprenderia a ignorarse.
--
-- `clave` es la de OBLIGACIONES y `fecha_vencimiento` una de sus fechas
-- (AAAA-MM-DD, dia civil de Colombia). No hay llave foranea porque la otra
-- mitad vive en el codigo: es el servidor quien rechaza una clave o una fecha
-- que el calendario no tiene. El UNIQUE es lo que hace la marca idempotente:
-- dos clics, o dos personas a la vez, no dejan dos filas.
--
-- `marcado_por` es el correo de la sesion de Access, como en el resto del
-- panel. `marcado_en` va en UTC, como todo lo que escribe `datetime('now')`;
-- el panel lo pasa a hora de Colombia al mostrarlo.
--
-- TODO LLEVA `IF NOT EXISTS`, asi que reaplicarla es seguro. Aplicar SOLO con
--   npx wrangler d1 migrations apply givegrow-privado --remote
-- (no con `d1 execute --file`, que no la registra: ver CLAUDE.md). Va ANTES de
-- desplegar el codigo. Si el codigo llegara primero, la portada NO se cae —el
-- calendario sale todo como pendiente y avisa que falta la migracion— pero
-- ninguna marca se puede guardar.
--
-- La 0033 sigue reservada y sin usar.

CREATE TABLE IF NOT EXISTS obligaciones_cumplidas (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  clave              TEXT NOT NULL,              -- OBLIGACIONES[].clave en worker.js
  fecha_vencimiento  TEXT NOT NULL,              -- AAAA-MM-DD, una de sus fechas
  estado             TEXT NOT NULL CHECK (estado IN ('hecho', 'no_aplica')),
  nota               TEXT,                       -- opcional: radicado, «sin retenciones en septiembre»…
  marcado_en         TEXT NOT NULL DEFAULT (datetime('now')),
  marcado_por        TEXT,                       -- correo de la sesion de Access
  UNIQUE (clave, fecha_vencimiento)
);
