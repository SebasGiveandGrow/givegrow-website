-- Give&Grow · base privada · migración 0040
-- ============================================================================
-- El carnet DE HONOR. Decisión del fundador, 8 oct 2026: hay personas que hacen
-- posible la fundación y sus beneficios sin pagar una membresía —quien la
-- fundó, quienes la acompañaron desde el principio, quienes coordinan
-- voluntariado, aliados, embajadores, la Junta de Asesores—, y la fundación
-- quiere reconocerlas con el mismo carnet verificable, con acceso al Programa
-- de Gratitud.
--
-- POR QUÉ COLUMNAS EN `miembros` Y NO UNA TABLA APARTE. La 0006 dejó una regla
-- que se queda: «un donante, un carnet» (ux_miembros_donante). Si la distinción
-- viviera en otra tabla con su propio carnet, quien ya paga una membresía —el
-- fundador mismo, MB-2026-000001— tendría DOS carnets, dos QR y dos
-- respuestas en /verificar. Aquí la distinción es una propiedad del carnet que
-- la persona ya tiene, o del que se le abre si no tenía ninguno.
--
-- LA PERSONA QUE SOLO ES DE HONOR entra a `donantes` con su nombre, correo y,
-- si lo autorizó, su documento, sin ningún aporte; y su fila de `miembros`
-- lleva nivel = 'honor'. No es NULL porque la columna es NOT NULL desde la 0006
-- y cambiarlo exige reconstruir la tabla entera; un valor que no es ninguno de
-- los cuatro niveles basta para que el Worker sepa que esa vigencia pagada no
-- cuenta (`estadoCarnet`, el único sitio que decide si un carnet vale).
-- Su `vigente_hasta` es el día de emisión: nunca pagó, y si un día empieza a
-- pagar `carnetTrasAporte` la extiende como a cualquiera.
--
-- LA VIGENCIA DE LA DISTINCIÓN es independiente de la pagada:
--   · `distincion_hasta` NULL = permanente (fundador, pionero);
--   · con fecha = de rol (las demás), 12 meses que se renuevan desde el panel.
-- Un carnet vale si no está revocado Y (la membresía pagada sigue viva O la
-- distinción sigue viva). Revocar el carnet apaga las dos cosas: una
-- distinción no salva un carnet que el equipo revocó.
--
-- QUITAR UNA DISTINCIÓN vacía estas columnas y deja el motivo en
-- `consentimientos` (tipo 'auditoria'), igual que la revocación.
--
-- SIN `IF NOT EXISTS` en los ALTER porque SQLite no lo admite (mismo caso que
-- la 0039). Ninguna fila existente cambia: todas quedan sin distinción.

ALTER TABLE miembros ADD COLUMN distincion          TEXT;   -- fundador | pionero | coordinador_voluntario | aliado_red | embajador | junta_asesores
ALTER TABLE miembros ADD COLUMN distincion_contexto TEXT;   -- una línea libre: «Brigada Sismo 2026»
ALTER TABLE miembros ADD COLUMN distincion_desde    TEXT;
ALTER TABLE miembros ADD COLUMN distincion_hasta    TEXT;   -- NULL = permanente
ALTER TABLE miembros ADD COLUMN distincion_por      TEXT;   -- correo de quien la otorgó en el panel

CREATE INDEX IF NOT EXISTS ix_miembros_distincion ON miembros(distincion, distincion_hasta);
