-- Give&Grow · base privada · migración 0006
-- ============================================================================
-- El carnet de miembro. El sitio lo prometía en ocho lugares y no existía en
-- ninguna línea de código — auditoría del 12 ago 2026.
--
-- DOS DECISIONES QUE GOBIERNAN ESTA TABLA:
--
-- 1 · SOLO PARA MEMBRESÍA RECURRENTE. Un aporte único no crea carnet, y los de
--     la brigada menos: esa campaña fuerza aporte único y esconde el nivel a
--     propósito, porque un carnet que da acceso a beneficios es justo lo que
--     puede volver falso el numeral 6 del certificado —«acto de mera
--     liberalidad, sin contraprestación alguna»—. La pregunta sigue abierta con
--     la contadora; el diseño no la ensancha.
--
-- 2 · EL CARNET ES UNA PÁGINA VERIFICABLE, NO UNA IMAGEN. Una tarjeta que se
--     descarga es una tarjeta que se falsifica: el comercio aliado no tendría
--     cómo saber si vale. Por eso el carnet vive en una URL que consulta la
--     base y dice VIGENTE o VENCIDO en el momento.

CREATE TABLE IF NOT EXISTS miembros (
  codigo        TEXT PRIMARY KEY,              -- MB-2026-000001, lo que se lee en la tarjeta
  -- La URL pública NO usa el código: es consecutivo y por lo tanto adivinable,
  -- y la tarjeta muestra el nombre de una persona. Mismo criterio que el token
  -- del recibo.
  token         TEXT NOT NULL UNIQUE,
  donante_id    INTEGER NOT NULL REFERENCES donantes(id),
  nivel         TEXT NOT NULL,                 -- semilla | retono | arbol | bosque
  desde         TEXT NOT NULL,
  -- Se extiende con cada aporte recurrente aprobado. Si el donante deja de
  -- aportar, el carnet vence solo: nadie tiene que acordarse de revocarlo.
  vigente_hasta TEXT NOT NULL,
  revocado_en     TEXT,
  revocado_motivo TEXT,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT
);

-- Un donante, un carnet. Renovar extiende el que hay; no se emite otro.
CREATE UNIQUE INDEX IF NOT EXISTS ux_miembros_donante ON miembros(donante_id);
CREATE INDEX IF NOT EXISTS ix_miembros_vigencia ON miembros(vigente_hasta);

CREATE TABLE IF NOT EXISTS numerador_miembro (
  anio   INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);
