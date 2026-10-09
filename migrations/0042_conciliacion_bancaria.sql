-- Give&Grow · base privada · migración 0042
-- ============================================================================
-- CONCILIACIÓN BANCARIA (Fase 3 del panel, oct 2026).
--
-- Decisión del fundador (8 oct 2026): **la cifra que manda es la del extracto
-- de Bancolombia.** Hasta aquí el panel solo sabía lo que decían las
-- pasarelas y los donantes; ninguna pantalla podía contestar «¿esto llegó de
-- verdad a la cuenta?». Una transferencia se confirmaba mirando el extracto en
-- otra pestaña, y Wompi y PayPal consignan en lotes, netos de comisión, así
-- que ni siquiera había un número contra el cual comparar un aporte.
--
-- Cuatro tablas:
--
-- · lotes_banco — cada archivo importado: quién, cuándo, qué periodo dice
--   cubrir y CÓMO se leyó (`mapeo`). El último mapeo de una cuenta es el que se
--   propone la próxima vez: el formato exacto del archivo de Bancolombia no está
--   confirmado y cambia según desde dónde se exporte, así que se recuerda en
--   vez de adivinarlo cada mes.
--
-- · movimientos_banco — una fila por renglón del extracto. `cuenta` es un
--   NOMBRE («Bancolombia ahorros»), nunca el número: el número de la cuenta no
--   le sirve a ninguna pantalla y es justo el dato que no debe acabar en un
--   respaldo o una captura. `hash` UNIQUE es lo que permite volver a importar
--   un archivo que se solapa con el anterior sin duplicar nada (ver
--   `huellaMovimiento` en worker.js). Los montos van en centavos, con signo
--   (crédito +, débito −), como todo el dinero de esta base: el extracto trae
--   decimales (rendimientos, GMF) y redondearlos al importar haría que el saldo
--   dejara de cuadrar.
--
-- · conciliaciones — qué explica cada movimiento. Muchos a muchos y con monto,
--   porque un abono de Wompi cubre varios aportes menos su comisión, y uno de
--   PayPal cubre aportes en DÓLARES con una cifra en pesos que solo el banco
--   sabe: esa cifra se guarda aquí y es la que el Resumen usa para PayPal en
--   pesos (no hay TRM que inventar). La suma de las filas de un movimiento
--   conciliado es exactamente su valor: la diferencia, si la hay, es una fila
--   `comision` o `ajuste` con su nota, nunca un hueco.
--
-- · pagos_sin_guia — lo que entró al banco y no tiene aporte: alguien consignó
--   sin reportarlo. Es el mismo concepto de «Pagos sin aporte» (que hasta hoy
--   solo veía los cobros de Wompi sin guía, leyendo `eventos_wompi`), ahora con
--   un registro escrito por una persona. NO crea un aporte, NO manda correo y
--   NO emite certificado: si el donante aparece y lo pide, eso sigue siendo un
--   paso a mano, revisado.
--
-- Todo con IF NOT EXISTS: reaplicarla con `migrations apply` es seguro (ver la
-- nota de la 0028 en CLAUDE.md).

CREATE TABLE IF NOT EXISTS lotes_banco (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta                TEXT NOT NULL,
  archivo               TEXT,
  mapeo                 TEXT,              -- JSON: columnas, fila de títulos, formato de fecha
  periodo_desde         TEXT,              -- AAAA-MM-DD que DICE cubrir el extracto
  periodo_hasta         TEXT,
  primera_fecha         TEXT,              -- y las que de verdad trae
  ultima_fecha          TEXT,
  filas                 INTEGER NOT NULL DEFAULT 0,
  nuevos                INTEGER NOT NULL DEFAULT 0,
  repetidos             INTEGER NOT NULL DEFAULT 0,
  errores               INTEGER NOT NULL DEFAULT 0,
  saldo_final_centavos  INTEGER,
  importado_por         TEXT,
  importado_en          TEXT NOT NULL DEFAULT (datetime('now')),
  deshecho_en           TEXT,              -- deshacer solo vale si nada se concilió
  deshecho_por          TEXT
);
CREATE INDEX IF NOT EXISTS idx_lotes_banco_periodo ON lotes_banco (cuenta, periodo_hasta);

CREATE TABLE IF NOT EXISTS movimientos_banco (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta          TEXT NOT NULL,
  fecha           TEXT NOT NULL,           -- AAAA-MM-DD del extracto (día colombiano)
  descripcion     TEXT NOT NULL DEFAULT '',
  referencia      TEXT,
  oficina         TEXT,
  valor_centavos  INTEGER NOT NULL,        -- crédito +, débito −
  saldo_centavos  INTEGER,
  hash            TEXT NOT NULL UNIQUE,
  lote_id         INTEGER NOT NULL REFERENCES lotes_banco(id),
  posicion        INTEGER,                 -- renglón dentro del archivo
  importado_en    TEXT NOT NULL DEFAULT (datetime('now')),
  estado          TEXT NOT NULL DEFAULT 'sin_conciliar'
                  CHECK (estado IN ('sin_conciliar','conciliado','ignorado')),
  motivo          TEXT,                    -- por qué se ignoró (gmf, rendimientos, traslado…)
  nota            TEXT,
  resuelto_por    TEXT,
  resuelto_en     TEXT
);
CREATE INDEX IF NOT EXISTS idx_mov_banco_estado ON movimientos_banco (estado, fecha);
CREATE INDEX IF NOT EXISTS idx_mov_banco_fecha ON movimientos_banco (cuenta, fecha);
CREATE INDEX IF NOT EXISTS idx_mov_banco_lote ON movimientos_banco (lote_id);

CREATE TABLE IF NOT EXISTS conciliaciones (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  movimiento_id          INTEGER NOT NULL REFERENCES movimientos_banco(id),
  tipo                   TEXT NOT NULL
                         CHECK (tipo IN ('aporte','egreso','wompi','ipn','pago_sin_guia','comision','ajuste')),
  ref                    TEXT,             -- guía, número de egreso, transacción, id… (NULL en comision/ajuste)
  monto_centavos         INTEGER NOT NULL, -- en PESOS y con el signo del movimiento
  moneda_origen          TEXT,             -- USD cuando lo enlazado era en dólares (PayPal)
  monto_origen_centavos  INTEGER,
  nota                   TEXT,
  creado_por             TEXT,
  creado_en              TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conciliaciones_mov ON conciliaciones (movimiento_id);
CREATE INDEX IF NOT EXISTS idx_conciliaciones_ref ON conciliaciones (tipo, ref);

CREATE TABLE IF NOT EXISTS pagos_sin_guia (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha           TEXT NOT NULL,
  monto_centavos  INTEGER NOT NULL,
  moneda          TEXT NOT NULL DEFAULT 'COP',
  medio           TEXT NOT NULL,           -- transferencia, consignacion, wompi_qr, paypal, otro
  nombre          TEXT,                    -- quien pagó, si se sabe
  destino_id      TEXT,
  proyecto        TEXT,
  nota            TEXT,
  movimiento_id   INTEGER REFERENCES movimientos_banco(id),
  creado_por      TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  anulado_en      TEXT,
  anulado_por     TEXT,
  anulado_motivo  TEXT
);
CREATE INDEX IF NOT EXISTS idx_pagos_sin_guia_fecha ON pagos_sin_guia (fecha);
