-- ============================================================================
-- 0016 · CERRAR UNA SEÑAL DE TERRENO QUE NO ESPERA
-- ============================================================================
-- La auditoría del 31 ago 2026 encontró que `requiere_esp` era una bandera SIN
-- SALIDA: el formulario la ponía en 1 y ninguna acción del panel ni de la API la
-- bajaba, ni registraba que alguien se hubiera hecho cargo. Lo mismo con las dos
-- recomendaciones que de verdad corren —`x4` («URGENTE: el peligro parece
-- inminente») y `e1` («Evacuar la vivienda»)—: quedaban dentro de un JSON que
-- había que abrir para verlas.
--
-- Y `/api/admin/salud` tenía CINCO colas de casos e inscripciones y NINGUNA de
-- inspecciones. Así que un ingeniero parado frente a una casa podía marcar
-- «peligro inminente» y eso no aparecía en ninguna lista de pendientes: esperaba
-- a que alguien abriera la bandeja por su cuenta y se fijara.
--
-- Una cola sin forma de vaciarse no es una cola, es un reproche permanente: a la
-- semana nadie la mira porque siempre dice lo mismo. De ahí estas tres columnas.
--
--   · `atendida_en`   — cuándo alguien se hizo cargo. NULL = sigue pendiente, y
--                       es lo único que la cola necesita mirar.
--   · `atendida_por`  — quién. Correo de la sesión de Access, no texto libre:
--                       esto es el registro de que una persona respondió a un
--                       aviso de peligro, y tiene que poder señalarse.
--   · `atendida_nota` — QUÉ SE HIZO, y es obligatoria en la API. «Atendido» a
--                       secas no sirve: dentro de un mes la pregunta va a ser
--                       qué pasó con esa casa, no si alguien pulsó un botón.
--
-- LO QUE ESTO NO ES: no cambia el concepto del ingeniero ni toca `requiere_esp`.
-- La conclusión la tomó quien estuvo en la casa y no se edita desde el panel —
-- misma regla que el PDF congelado. Marcar «atendida» dice «el equipo ya
-- respondió a esta señal», no «la señal era falsa».
--
-- ⚠️ SE APLICA A MANO Y ANTES DE QUE EL CÓDIGO LLEGUE A PRODUCCIÓN. Si el
-- Worker se despliega primero, la cola de salud consulta `atendida_en` contra
-- una columna que no existe y la respuesta entera de /api/admin/salud se cae —
-- no solo esa cola. Es aditiva y sobre columnas nuevas anulables, así que
-- aplicarla antes no rompe nada del código viejo: nadie las lee todavía.
-- ============================================================================

ALTER TABLE inspecciones ADD COLUMN atendida_en   TEXT;
ALTER TABLE inspecciones ADD COLUMN atendida_por  TEXT;
ALTER TABLE inspecciones ADD COLUMN atendida_nota TEXT;

-- Para la cola: sacar las pendientes sin escanear la tabla. `atendida_en`
-- primero porque es la condición que más filas descarta en cuanto el equipo
-- empiece a cerrar, y `recibido_en` al final porque la cola ordena por la más
-- vieja —el dato que dice cuánto lleva esperando una casa.
--
-- NO se indexa `requiere_esp` aquí: ya existe `ix_insp_esp` de la 0011. Y las
-- recomendaciones no se indexan porque viven en un JSON; la cola las mira con
-- `instr` sobre el texto del arreglo, que a esta escala es un escaneo corto y
-- honesto. Si algún día pesa, la salida es una columna calculada al INSERT —no
-- un índice sobre JSON— pero entonces habría que vigilar que no se desfase.
CREATE INDEX IF NOT EXISTS ix_insp_atendida ON inspecciones(atendida_en, recibido_en);
