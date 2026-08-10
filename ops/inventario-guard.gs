/**
 * Give&Grow — Guard del inventario (Apps Script)
 * ================================================================
 * PROBLEMA QUE RESUELVE
 * El script que publica `data/inventario.json` reescribe el campo `actualizado`
 * cada vez que corre su disparador, aunque no haya datos nuevos. Resultado
 * medido el 8 de agosto de 2026: **722 commits en 31 días**, y de los últimos 40
 * los 40 no cambiaban ni un dato. Cada commit dispara un despliegue completo del
 * sitio (942 corridas acumuladas) y ensucia el historial hasta volverlo inútil
 * para auditar cambios reales.
 *
 * QUÉ HACER CON ESTE ARCHIVO
 * Pegar estas tres funciones en el proyecto de Apps Script que publica el
 * inventario, y añadir UNA condición antes de commitear. Ejemplo de uso:
 *
 *     var jsonNuevo    = JSON.stringify(inventario, null, 1);
 *     var jsonEnGitHub = leerArchivoPublicado_();   // lo que ya está en main
 *
 *     if (!inventarioCambio_(jsonNuevo, jsonEnGitHub)) {
 *       Logger.log('Inventario sin cambios reales — no se commitea.');
 *       return;
 *     }
 *     // ... aquí sigue el commit como siempre
 *
 * Después de editar: Implementar → Administrar implementaciones → lápiz →
 * Versión "Versión nueva" → Implementar. Si no, sigue corriendo el código viejo.
 *
 * NOTA IMPORTANTE PARA EL FUTURO
 * Este script vive SOLO en Google, no está versionado en el repositorio, y sin
 * embargo hace push directo a `main` — que es justo lo que CLAUDE.md prohíbe a
 * cualquier cambio humano. Conviene traerlo a `ops/` completo. Y la solución de
 * fondo llega en la Fase 1 del plan: cuando el inventario viva en D1, cambiarlo
 * dejará de requerir un despliegue del sitio.
 *
 * Defensa en profundidad: el workflow `.github/workflows/deploy.yml` tiene un
 * guard equivalente del lado de GitHub, por si este no se instala o se revierte.
 */

/**
 * ¿Cambió el inventario, ignorando la marca de tiempo?
 * @param {string} jsonNuevo      El JSON que se está a punto de publicar.
 * @param {string} jsonPublicado  El JSON que ya está en el repositorio.
 * @return {boolean} true si hay que publicar.
 */
function inventarioCambio_(jsonNuevo, jsonPublicado) {
  if (!jsonPublicado) return true;              // no existe aún: publicar
  return huellaInventario_(jsonNuevo) !== huellaInventario_(jsonPublicado);
}

/**
 * Huella estable del inventario: sin `actualizado` y con las claves ordenadas,
 * para que un reordenamiento del JSON no se confunda con un cambio de datos.
 */
function huellaInventario_(txt) {
  var o;
  try { o = JSON.parse(txt); } catch (e) { return String(txt || ''); }
  delete o.actualizado;
  return JSON.stringify(ordenar_(o));
}

/** Ordena recursivamente las claves de objetos, preservando el orden de arreglos. */
function ordenar_(v) {
  if (Array.isArray(v)) return v.map(ordenar_);
  if (v && typeof v === 'object') {
    var out = {};
    Object.keys(v).sort().forEach(function (k) { out[k] = ordenar_(v[k]); });
    return out;
  }
  return v;
}
