-- ============================================================================
-- 0013 · EL local_id ES ÚNICO, y lo hace cumplir la BASE
-- ============================================================================
-- La idempotencia de /api/triage/inspeccion era un SELECT seguido de un INSERT,
-- que es exactamente el patrón que NO resiste concurrencia: dos peticiones con
-- el mismo `local_id` corren el SELECT antes de que la otra inserte, ninguna ve
-- la fila de la otra, y las dos insertan.
--
-- Y era alcanzable de verdad, no en teoría: en el cliente `vaciarCola()` se
-- llama desde el botón «Enviar» Y desde el evento `online`. Tocar el botón justo
-- cuando vuelve la señal lanza dos vaciados sobre la MISMA cola, y los dos
-- postean el mismo registro. Resultado: dos inspecciones para una sola visita,
-- dos consecutivos quemados, dos PDF y la casa duplicada en el panel.
--
-- El arreglo del cliente (una bandera de reentrada) evita el caso común. Este
-- índice cierra el caso de verdad, porque no depende de que el cliente se porte
-- bien: dos pestañas, dos teléfonos con la cola copiada, o un reintento de red
-- que llega dos veces al servidor.
--
-- Es un índice sobre EXPRESIÓN, que SQLite admite. El `_local_id` vive dentro
-- del JSON de `respuestas` por la razón que dice la 0011: la lista de ítems va a
-- cambiar y no queríamos una columna por cada ajuste. La unicidad se puede
-- exigir igual sin sacarlo de ahí.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_insp_local_id
  ON inspecciones(json_extract(respuestas, '$._local_id'));
