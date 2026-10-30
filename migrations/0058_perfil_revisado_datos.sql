-- Give&Grow · base privada · migración 0058
-- ============================================================================
-- «REVISADO POR EL EQUIPO», CAMPO POR CAMPO, EN EL PORTAL (30 oct 2026).
--
-- Cuando el equipo toca «Marcar todo revisado» en el panel, se guarda aquí la
-- FOTO de lo que vio: el perfil completo, con lo que venía del cuestionario y
-- lo que la fundación editó. El portal compara cada campo con esa foto: si
-- sigue igual, lleva la marca «Revisado por el equipo»; si la fundación lo
-- cambia, la marca se apaga sola. No hace falta una tabla por campo.
--
-- NULL = el equipo no ha revisado este perfil desde que existe la columna.
-- ============================================================================

ALTER TABLE perfil_fundacion ADD COLUMN revisado_datos TEXT;
