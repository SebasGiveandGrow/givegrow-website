-- 0025_egresos.sql — la otra mitad del libro
--
-- ESTE PROYECTO TENIA MEDIA CONTABILIDAD. Todo lo que ENTRA esta trazado hasta
-- el detalle: guia, recibo, certificado, acta de entrega con fotos. Todo lo que
-- SALE no vivia en ningun sitio. Veinticinco tablas, y ni una de dinero saliendo.
--
-- Decision de Sebas el 11 de septiembre de 2026: el panel pasa a ser la central
-- de operacion y lleva tambien lo contable.
--
-- QUE ES Y QUE NO ES
--
-- NO es el libro oficial. Los libros bajo Regimen Tributario Especial, la
-- declaracion de renta, la exogena y la memoria economica son artefactos del
-- contador y llevan responsabilidad legal; intentar reemplazarlos pondria en
-- riesgo justo lo que hay que proteger, que es la calificacion en el RTE.
--
-- SI es la fuente de verdad que alimenta al contador, y el custodio del soporte.
-- Cada peso que sale, con su documento, su clasificacion y su centro de costo.
--
-- LO QUE MANDA EL RUT. Verificado contra el RUT actualizado (formulario
-- 141259255994, 30 jun 2026), casilla 53:
--
--   04  renta y complementarios, regimen especial
--   07  RETENCION EN LA FUENTE A TITULO DE RENTA  <- son agentes retenedores
--   14  informante de exogena
--   42  obligado a llevar contabilidad
--   55  informante de beneficiarios finales
--
-- No aparece la 48, asi que NO son responsables de IVA: el IVA de una factura
-- recibida es mayor valor del costo y no hay IVA descontable que llevar. Por eso
-- `iva_centavos` se guarda para poder informarlo, no para descontarlo.
--
-- Y la 07 es la que da forma a esta tabla: un egreso no es «factura y monto».
-- Necesita el CONCEPTO de retencion y la retencion practicada, porque de ahi
-- salen la declaracion mensual y el certificado anual al proveedor.
--
-- LAS TARIFAS NO VIVEN AQUI, A PROPOSITO. Cambian cada año y con ellas la UVT.
-- Se guarda lo que SE APLICO —concepto, base y pesos retenidos— y no la regla
-- con la que se aplico. El panel sugiere; quien firma decide. Una tarifa
-- congelada en una tabla es una tarifa que alguien va a creerse en 2028.
--
-- EL CAMPO QUE SOSTIENE EL RTE es `meritoria`. Un egreso solo es procedente si
-- va a la actividad meritoria, y esa pregunta hoy no se le hacia a nadie. Se
-- pregunta al registrar, no al cerrar el año, que es cuando ya no se acuerda
-- nadie.
--
-- Y `entrega` CIERRA LA CADENA. El sitio promete peso -> plato -> acta -> foto y
-- lo cumple desde el lado del ingreso. Poder decir «esta factura de mercado pago
-- el acta AE-2026-000004» la cierra por el otro extremo. Es opcional porque no
-- todo egreso entrega algo: el hosting tambien es un egreso.
--
-- LO QUE SE COMPRA EN LA VEREDA. Hay compras a quien no esta obligado a
-- facturar, y eso no es un descuido: en zona rural despues de un sismo es la
-- norma. La ley tiene su figura —el documento soporte en adquisiciones a no
-- obligados a facturar, Resolucion DIAN 000167 de 2021— y `soporte` lo
-- contempla. Tambien contempla `sin_soporte`, y eso es deliberado: un egreso sin
-- papel EXISTE, y esconderlo detras de un campo obligatorio solo consigue que se
-- registre mal o que no se registre. Que se vea es lo que permite arreglarlo.
--
-- CENTAVOS, como en `aportes.monto_centavos`. Enteros, sin coma flotante.
--
-- LA FECHA LA ESCRIBE UNA PERSONA y ya viene en su hora, igual que
-- `fecha_visita`: no pasa por la conversion de UTC. Los sellos de creacion si
-- son `datetime('now')` y por tanto UTC, como todo lo demas de esta base.
--
-- SE APLICA A MANO Y ANTES del codigo que la usa, como todas.

-- ---------------------------------------------------------------------------
-- A QUIEN SE LE PAGA
-- ---------------------------------------------------------------------------
-- Separado de `egresos` porque un proveedor se repite y sus datos se corrigen:
-- si viven en cada fila, una correccion deja veinte filas viejas mintiendo. Y
-- porque el certificado anual de retencion se expide POR PROVEEDOR.
CREATE TABLE IF NOT EXISTS proveedores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_doc       TEXT NOT NULL DEFAULT 'NIT',   -- NIT | CC | CE | PAS | NINGUNO
  documento      TEXT,                          -- sin puntos; NULL si NINGUNO
  dv             TEXT,                          -- digito de verificacion, solo NIT
  nombre         TEXT NOT NULL,                 -- razon social o nombre completo
  natural_       INTEGER NOT NULL DEFAULT 1,    -- 1 persona natural, 0 juridica
  -- Decide si hace falta emitir documento soporte. Es un dato del proveedor y
  -- no del egreso: quien no factura, no factura nunca.
  factura        INTEGER NOT NULL DEFAULT 1,    -- 1 obligado a facturar, 0 no
  email          TEXT,
  telefono       TEXT,
  ciudad         TEXT,
  nota           TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Un mismo documento no puede estar dos veces, pero SI puede faltar: al vendedor
-- de la vereda se le pide la cedula y a veces no la da. El indice parcial deja
-- entrar los sin documento y bloquea los duplicados de los que si lo tienen.
CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_doc
  ON proveedores(tipo_doc, documento) WHERE documento IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_proveedores_nombre ON proveedores(nombre);

-- ---------------------------------------------------------------------------
-- CADA PESO QUE SALE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS egresos (
  numero         TEXT PRIMARY KEY,              -- EG-2026-000001
  proveedor_id   INTEGER REFERENCES proveedores(id),
  fecha          TEXT NOT NULL,                 -- AAAA-MM-DD, la escribe una persona
  concepto       TEXT NOT NULL,                 -- que se compro, en palabras

  -- Los pesos. `total` es lo facturado; `neto` es lo que salio de la cuenta
  -- despues de retener. La diferencia entre los dos es lo que hay que declarar y
  -- pagarle a la DIAN, asi que conviene que las dos cifras esten y no se deduzca
  -- ninguna: una resta que alguien tiene que hacer de cabeza es una resta que
  -- algun dia sale mal.
  base_centavos  INTEGER NOT NULL DEFAULT 0,
  iva_centavos   INTEGER NOT NULL DEFAULT 0,    -- mayor valor del costo, no descontable
  total_centavos INTEGER NOT NULL DEFAULT 0,
  retefuente_centavos INTEGER NOT NULL DEFAULT 0,
  reteica_centavos    INTEGER NOT NULL DEFAULT 0,
  neto_centavos  INTEGER NOT NULL DEFAULT 0,
  -- El concepto con el que se retuvo. Texto y no codigo DIAN: los codigos de la
  -- exogena se mapean al exportar, y amarrar la captura a una tabla de codigos
  -- que cambia haria que corregir un codigo obligara a tocar filas viejas.
  concepto_ret   TEXT,                          -- compras | servicios | honorarios | arrendamientos | transporte | no_aplica

  -- El papel.
  soporte        TEXT NOT NULL DEFAULT 'sin_soporte',
                 -- factura_electronica | factura_manual | documento_soporte | sin_soporte
  soporte_numero TEXT,
  soporte_cufe   TEXT,                          -- solo factura electronica
  soporte_key    TEXT,                          -- el archivo en R2

  -- La clasificacion que sostiene el RTE.
  meritoria      INTEGER NOT NULL DEFAULT 1,    -- 1 egreso de la actividad meritoria
  centro         TEXT,                          -- id de fundacion, brigada-… o 'estructura'
  entrega        TEXT REFERENCES entregas(numero),

  medio_pago     TEXT,                          -- transferencia | efectivo | tarjeta | otro
  nota           TEXT,

  creado_por     TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),

  -- No se borra: se anula con motivo, igual que las actas de entrega y por la
  -- misma razon — lo que explica un hueco en el consecutivo es el motivo.
  anulado_en     TEXT,
  anulado_motivo TEXT,
  anulado_por    TEXT
);

CREATE INDEX IF NOT EXISTS ix_egresos_fecha     ON egresos(fecha DESC);
CREATE INDEX IF NOT EXISTS ix_egresos_proveedor ON egresos(proveedor_id);
CREATE INDEX IF NOT EXISTS ix_egresos_centro    ON egresos(centro);
CREATE INDEX IF NOT EXISTS ix_egresos_entrega   ON egresos(entrega) WHERE entrega IS NOT NULL;
-- Para la bandeja de «egresos sin papel», que es la unica que hay que trabajar.
CREATE INDEX IF NOT EXISTS ix_egresos_sinsoporte
  ON egresos(fecha DESC) WHERE soporte = 'sin_soporte' AND anulado_en IS NULL;

-- Consecutivo propio, misma mecanica atomica que guias, certificados y actas.
-- Serie aparte porque un egreso no es ninguna de las otras tres cosas.
CREATE TABLE IF NOT EXISTS numerador_egreso (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0025_egresos.sql');
