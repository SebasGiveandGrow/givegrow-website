-- Give&Grow · base privada · migración 0039
-- ============================================================================
-- El código con el que un COMERCIO comprueba un carnet por su cuenta.
--
-- POR QUÉ HACE FALTA. La 0006 dejó escrito que «el carnet es una página
-- verificable, no una imagen», y la página sí consulta la base en el momento.
-- Pero quien la mira en la caja es el comercio, y lo que ve es la pantalla del
-- celular DEL MIEMBRO: una captura de ayer, o una página falsa con el mismo
-- diseño, se ven idénticas. El comercio no tenía ninguna forma de comprobar por
-- su lado. Ahora escanea el QR del carnet con SU celular, o escribe el código
-- en /verificar, y la respuesta le llega del sitio de la fundación y no de la
-- pantalla que le enseñan.
--
-- POR QUÉ UN CÓDIGO NUEVO Y NO UNO DE LOS DOS QUE YA HAY:
--
--   · el `token` es la CREDENCIAL del miembro —quien lo tiene abre su carnet con
--     su nombre completo—, y un QR que se le pone delante a cada cajero no
--     puede llevar la llave entera;
--   · el `codigo` (MB-2026-000001) es consecutivo: si sirviera para consultar,
--     bastaría contar de uno en uno para listar a todos los miembros.
--
-- `verif` es aleatorio, de 8 caracteres de un alfabeto sin los que se confunden
-- al dictarlos o leerlos en una pantalla rayada (sin 0/O, 1/I/L): 31^8, unos
-- 850 mil millones de combinaciones, con tope de consultas por IP encima. Y lo
-- que devuelve es poco a propósito: vigente o no, nivel, fechas y el nombre
-- ENMASCARADO («Sebastián N.»). Es lo justo para cotejar con un documento de
-- identidad, y no alcanza para armar una lista de quién es miembro.
--
-- LAS FILAS QUE YA EXISTEN reciben su código aquí mismo, con `random()` de
-- SQLite sobre el mismo alfabeto, para que ningún carnet vigente quede sin QR
-- entre la migración y su primera visita. El Worker igual lo genera si
-- encuentra uno vacío (`verifDeMiembro`): esa red queda por si alguna fila
-- entra por otro camino.
--
-- SIN `IF NOT EXISTS` en el ALTER porque SQLite no lo admite; el índice sí lo
-- lleva. El índice es ÚNICO porque el código identifica un carnet: dos iguales
-- y el comercio vería el estado de otra persona.

ALTER TABLE miembros ADD COLUMN verif TEXT;

UPDATE miembros SET verif =
    substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
 || substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (abs(random()) % 31) + 1, 1)
WHERE verif IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_miembros_verif ON miembros(verif);
