-- Give&Grow · base privada · migración 0047
-- ============================================================================
-- EL CERTIFICADO DE HORAS LO EMITE UNA PERSONA, y se puede verificar y anular.
--
-- POR QUÉ HACE FALTA. La 0036 dejó el certificado de voluntariado
-- (`reconocimientos`) emitiéndose SOLO al cerrar la jornada, para todos los que
-- tenían horas. Tres huecos, medidos el 17 oct 2026 al cargar a mano las 120 h
-- reportadas de la brigada (indicador MEAL #7):
--   · nadie respondía por cada papel: no quedaba quién lo emitió;
--   · se emitía a nombre de un menor aunque su acudiente no hubiera autorizado;
--   · no había cómo comprobarlo ni cómo retirarlo si salía mal.
--
-- LO QUE AÑADE, todo en la fila del certificado que ya existe:
--   · `emitido_por`  correo de quien pulsó «Emitir certificado de horas» en
--                    /admin. NULL = emitido por el cierre automático de antes
--                    de esta migración.
--   · `verif`        el código de /verificar: 8 símbolos del mismo alfabeto que
--                    el carnet (0039), sin 0/O ni 1/I/L. NO es el número VC-…
--                    porque ese es consecutivo y se recorre contando: con él
--                    cualquiera vería los nombres de todos los voluntarios.
--   · `anulado_en`, `anulado_por`, `anulado_motivo`  la anulación. El motivo
--                    NO sale en /verificar (es asunto entre la fundación y la
--                    persona, como la revocación del carnet): solo «Anulado».
--
-- MÍNIMOS DATOS. Nada nuevo de la persona: ni cédula ni contacto. Lo que
-- /verificar enseña sale de `datos`, que ya existía.
--
-- SIN `IF NOT EXISTS` en los ALTER porque SQLite no lo admite (mismo caso que la
-- 0039 y la 0040). El índice sí lo lleva. Los certificados que ya existan
-- reciben su código aquí mismo, con la fórmula de la 0039; en producción, al
-- 17 oct 2026, no había ninguno (no hay jornadas registradas).
--
-- Aplicar DESDE LA RAMA DEL PR y antes de desplegar (el panel y /verificar leen
-- estas columnas):
--   npx wrangler d1 migrations apply givegrow-privado --remote
-- (no con `d1 execute --file`, que no la registra: ver CLAUDE.md).

ALTER TABLE reconocimientos ADD COLUMN emitido_por    TEXT;
ALTER TABLE reconocimientos ADD COLUMN verif          TEXT;
ALTER TABLE reconocimientos ADD COLUMN anulado_en     TEXT;
ALTER TABLE reconocimientos ADD COLUMN anulado_por    TEXT;
ALTER TABLE reconocimientos ADD COLUMN anulado_motivo TEXT;

UPDATE reconocimientos SET verif =
    substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
WHERE verif IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_reconocimientos_verif ON reconocimientos(verif);
