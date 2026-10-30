-- Give&Grow · base privada · migración 0061
-- ============================================================================
-- EL BOLETÍN PARA DONANTES (ítem 46, 30 oct 2026).
--
-- Se redacta en el panel (Rendir cuentas › Boletín) y se manda SOLO a quien
-- autorizó recibir noticias (regalo_noticias, con baja_en en NULL). Nunca a
-- quien solo dejó su correo para otra cosa (interesados en apadrinar,
-- inscripciones, casos). Nunca lleva datos individuales de niños: el panel
-- rechaza un texto con un código de niño.
--
-- · boletines — el texto en ES (y en EN, opcional) y su estado.
-- · boletin_envios — a quién le salió cada boletín, uno por persona: un
--   segundo clic en «Enviar» no le escribe dos veces a nadie.
-- · noticias_bajas — el enlace de baja de cada persona (token aleatorio). Lo
--   lleva cada boletín; abrirlo muestra un botón, y el botón da de baja.
--
-- IF NOT EXISTS y ningún ALTER: reaplicarla es seguro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS boletines (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  asunto_es        TEXT NOT NULL,
  cuerpo_es        TEXT NOT NULL,
  asunto_en        TEXT,
  cuerpo_en        TEXT,
  estado           TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviando', 'enviado')),
  creado_por       TEXT,
  creado           TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado      TEXT NOT NULL DEFAULT (datetime('now')),
  primer_envio_en  TEXT,
  ultimo_envio_en  TEXT
);

CREATE TABLE IF NOT EXISTS boletin_envios (
  boletin_id  INTEGER NOT NULL REFERENCES boletines(id),
  email       TEXT NOT NULL,
  resultado   TEXT NOT NULL,
  enviado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (boletin_id, email)
);

CREATE TABLE IF NOT EXISTS noticias_bajas (
  token   TEXT PRIMARY KEY,
  email   TEXT NOT NULL UNIQUE,
  creado  TEXT NOT NULL DEFAULT (datetime('now'))
);
