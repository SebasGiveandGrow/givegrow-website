-- ============================================================================
-- 0019 · QUÉ CASA RECIBIÓ MATERIALES
-- ============================================================================
-- `entregas` y `casos` no se conocían. La auditoría del 31 ago lo marcó como el
-- hueco estructural de la fase que viene, y lo es: lo siguiente de Mira Mi Casa
-- es LLEVAR MATERIALES A CASAS YA EVALUADAS, y hoy no hay dónde escribir que se
-- llevaron.
--
-- POR QUÉ UNA TABLA PUENTE Y NO UNA COLUMNA. Dos razones, y la segunda es la que
-- decide:
--
--   1. Es muchos-a-muchos de verdad. Una entrega cubre varias casas —la de
--      Manizales del 25 de agosto llegó a 109 familias— y una casa puede recibir
--      en más de una entrega: primero lo urgente, después el resto.
--
--   2. PRIVACIDAD POR CONSTRUCCIÓN. `entregas` es un registro PUBLICABLE
--      —`publicada_en`, y `apiEntregas` lo sirve al sitio— y su esquema dice
--      literalmente «lugar: albergue o punto. NUNCA dirección de una familia».
--      Un caso, en cambio, tiene dirección y familia. Con el vínculo en su propia
--      tabla, ningún endpoint público lo alcanza: `apiEntregas` enumera sus
--      columnas una por una y no hace JOIN con nada, así que el día que alguien
--      escriba un `SELECT *` sobre `entregas` seguirá sin poder filtrarlo. Con una
--      columna, esa garantía dependería de que nadie se equivoque.
--
-- ⚠️ LAS CLAVES FORÁNEAS SE IMPONEN. Comprobado el 31 ago 2026: D1 SÍ las aplica
-- —`FOREIGN KEY constraint failed`— y eso ya se tragó visitas enteras en
-- `inspecciones` antes de arreglarlo. Aquí es lo CORRECTO que fallen: esto se
-- escribe desde el panel, con el número delante, no desde un teléfono en un patio
-- donde un dígito mal no puede costar el dato. Pero el endpoint comprueba los dos
-- números ANTES de insertar y devuelve un 409 con su motivo, en vez de dejar que
-- un 500 llegue a la pantalla.
--
-- LO QUE ESTA TABLA NO HACE: no mueve el estado del caso. Entregar materiales no
-- es cerrar un caso —puede faltar la mitad de lo que necesita— y `CASO_DESTINOS`
-- no tiene un estado para esto. Si algún día hace falta, se decide entonces.
--
-- `nota` es para lo que no cabe en el vínculo: «solo cemento, falta la teja».
-- ============================================================================

CREATE TABLE IF NOT EXISTS entrega_casos (
  entrega     TEXT NOT NULL REFERENCES entregas(numero),
  caso        TEXT NOT NULL REFERENCES casos(numero),
  nota        TEXT,
  anotado_por TEXT NOT NULL,
  anotado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entrega, caso)
);

-- La clave primaria ya indexa (entrega, caso), que sirve para «qué casas cubrió
-- esta entrega». Falta el otro sentido, que es el que va a usar la cola: «¿esta
-- casa ya recibió algo?».
CREATE INDEX IF NOT EXISTS ix_entrega_casos_caso ON entrega_casos(caso);
