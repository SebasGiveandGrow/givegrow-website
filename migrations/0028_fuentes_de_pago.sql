-- 0028_fuentes_de_pago.sql — guardar CON QUE se cobra, sin guardar la tarjeta
--
-- POR QUE HACE FALTA. Hasta hoy el sitio solo sabe cobrar una vez: el donante
-- llega al checkout de Wompi, paga, y ahi termina. Para una membresia con debito
-- automatico hace falta lo contrario — cobrar despues, sin que la persona
-- intervenga— y eso en Wompi se llama FUENTE DE PAGO: un `payment_source_id`
-- que representa su tarjeta o su cuenta Nequi y con el que se puede cobrar.
--
-- No sirve `suscripciones` para esto, aunque se parezca. Una persona puede
-- registrar su metodo de pago y decidir el plan despues; puede cambiar de
-- tarjeta sin cambiar de plan; y una tarjeta vencida hay que poder detectarla
-- aunque no haya suscripcion activa. Son dos ciclos de vida distintos.
--
-- LO QUE NO SE GUARDA, Y ES LO MAS IMPORTANTE DE ESTE ARCHIVO.
-- Aqui NO entra el numero de la tarjeta, ni el CVC, ni nada que se le parezca.
-- Wompi tiene la certificacion PCI DSS justamente para que nosotros no tengamos
-- que guardar eso, y su propia documentacion lo dice sin rodeos: «no solo pones
-- en riesgo la informacion de tus usuarios sino que puedes enfrentar sanciones
-- economicas y problemas legales».
--
-- Lo que si se guarda son los cuatro ultimos digitos y la marca, que PCI permite
-- explicitamente y que hacen falta para algo concreto: que la persona reconozca
-- CUAL de sus tarjetas es, cuando tenga mas de una. Y la fecha de vencimiento,
-- que permite avisarle ANTES de que su membresia falle en silencio — que es el
-- modo de fallo tipico de un debito automatico.
--
-- Tampoco se guarda el token de tokenizacion (`tok_…`). Es de un solo uso y ya
-- se canjeo por el `payment_source_id`; conservarlo no aporta y suma superficie.

CREATE TABLE IF NOT EXISTS fuentes_pago (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,

  -- `proveedor` porque esta tabla nace sabiendo que PayPal ya existe y que
  -- manana puede haber otro. Misma decision que en `suscripciones`.
  proveedor       TEXT    NOT NULL DEFAULT 'wompi',

  -- El id que devuelve Wompi al crear la fuente. Es lo unico con lo que se
  -- puede cobrar, y es un numero, no un secreto: sin la llave privada no sirve.
  fuente_ref      TEXT    NOT NULL,

  -- CARD o NEQUI. Nequi no pasa por tokenizacion de tarjeta y por eso puede
  -- entrar antes de que Wompi apruebe la solicitud.
  tipo            TEXT    NOT NULL,

  -- Como lo reporta Wompi: AVAILABLE cuando sirve. Se guarda para no tener que
  -- preguntar antes de cada cobro.
  estado          TEXT    NOT NULL DEFAULT 'AVAILABLE',

  donante_id      INTEGER REFERENCES donantes(id),
  email           TEXT    NOT NULL,

  -- Solo para que la persona la reconozca. NUNCA el numero completo.
  marca           TEXT,
  ultimos_cuatro  TEXT,

  -- Para avisar antes de que venza, no para operar con ella.
  exp_mes         TEXT,
  exp_anio        TEXT,

  creada_en       TEXT    NOT NULL DEFAULT (datetime('now')),
  actualizada_en  TEXT    NOT NULL DEFAULT (datetime('now')),
  retirada_en     TEXT,
  retirada_motivo TEXT
);

-- Una misma fuente no se registra dos veces. Si alguien vuelve a pasar por el
-- formulario con la misma tarjeta, Wompi devuelve otro `payment_source_id`, asi
-- que esto no lo impide — pero si impide que un reintento nuestro duplique.
CREATE UNIQUE INDEX IF NOT EXISTS ux_fuentes_ref
  ON fuentes_pago(proveedor, fuente_ref);

-- La consulta real: «las fuentes vivas de esta persona», para el cobro y para
-- mostrarle cual tiene registrada.
CREATE INDEX IF NOT EXISTS ix_fuentes_email
  ON fuentes_pago(email, estado);

-- El aviso de vencimiento recorre por aqui.
CREATE INDEX IF NOT EXISTS ix_fuentes_vence
  ON fuentes_pago(exp_anio, exp_mes);
