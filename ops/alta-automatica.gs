/**
 * alta-automatica.gs — Motor de alta de fundaciones
 * ----------------------------------------------------------------------------
 * Convierte cada respuesta del formulario de ingreso en un BORRADOR de objeto
 * para `data/partners.json` y abre un Pull Request en GitHub para revisión.
 *
 * DISEÑO (deliberado):
 *  - El PR crea `ops/altas/<id>.json` (carpeta interna, excluida de assets).
 *    NUNCA escribe directamente en `data/partners.json`: la fuente única de la
 *    red solo se toca con revisión humana (traducción EN, consent, evidencia).
 *  - Los campos `en` quedan vacíos ("") a propósito: paridad i18n es tarea de
 *    revisión, no de máquina.
 *  - El bloque `_revision` lista pendientes y datos internos (contacto). Se
 *    elimina al integrar el objeto definitivo en partners.json.
 *
 * INSTALACIÓN (una sola vez, en el MISMO proyecto de Apps Script del form):
 *  1. Pega este archivo como archivo nuevo (Archivo → + → Secuencia de comandos).
 *  2. Configuración del proyecto (engranaje) → Propiedades de la secuencia →
 *     Añadir propiedad:  GITHUB_TOKEN = <token fine-grained>
 *     Permisos mínimos del token: SOLO este repo, Contents: Read&Write,
 *     Pull requests: Read&Write. Nada más.
 *  3. Ejecuta `instalarDisparador()` una vez (autoriza los permisos).
 *  4. Prueba: envía una respuesta de prueba al form y ejecuta
 *     `probarConUltimaRespuesta()` — debe imprimir la URL del PR en el log.
 *     (Con el disparador instalado, las respuestas reales lo harán solas.)
 *
 * Generado: 03/07/2026. Espejo de: ops/cuestionario-fundaciones-hub.md
 */

var FORM_ID = '1sKH4p4zQtyx31fp2lsNSO0gofaEslXe3WXNQ5stZmVU';
var REPO = 'SebasGiveandGrow/givegrow-website';
var RAMA_BASE = 'main';
var CORREO_AVISO = Session.getEffectiveUser().getEmail();

// === Puntos de entrada ======================================================

function instalarDisparador() {
  var existentes = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'alRecibirRespuesta';
  });
  if (existentes.length) {
    Logger.log('El disparador ya estaba instalado.');
    return;
  }
  ScriptApp.newTrigger('alRecibirRespuesta')
    .forForm(FORM_ID)
    .onFormSubmit()
    .create();
  Logger.log('Disparador instalado: cada respuesta nueva abrirá un PR.');
}

function alRecibirRespuesta(e) {
  try {
    procesarRespuesta(e.response);
  } catch (err) {
    MailApp.sendEmail(CORREO_AVISO,
      '[Give&Grow] Error en alta automática',
      'Falló el procesamiento de una respuesta del formulario:\n\n' + err +
      '\n\nRevisa la respuesta en el form y ejecuta probarConUltimaRespuesta() ' +
      'desde el editor para ver el detalle.');
    throw err;
  }
}

function probarConUltimaRespuesta() {
  var respuestas = FormApp.openById(FORM_ID).getResponses();
  if (!respuestas.length) { Logger.log('El formulario no tiene respuestas aún.'); return; }
  procesarRespuesta(respuestas[respuestas.length - 1]);
}

// === Núcleo =================================================================

function procesarRespuesta(respuesta) {
  var R = leerRespuestas(respuesta);
  var borrador = construirBorrador(R, respuesta);
  var pr = abrirPullRequest(borrador);
  Logger.log('PR creado: ' + pr.html_url);
  MailApp.sendEmail(CORREO_AVISO,
    '[Give&Grow] Nueva fundación para revisar: ' + borrador.name,
    'Llegó una respuesta del formulario de ingreso.\n\n' +
    'Fundación: ' + borrador.name + '\n' +
    'Líder: ' + (borrador.profile.leader || '—') + '\n' +
    'Pendientes de revisión: ' + borrador._revision.pendientes.length + '\n\n' +
    'Pull Request: ' + pr.html_url + '\n\n' +
    'El PR contiene el borrador JSON y la lista de verificación. ' +
    'Nada se publica hasta que lo apruebes e integres en partners.json.');
  return pr;
}

/** Indexa las respuestas por el prefijo numérico del título ("1.1", "4.2.3", "5.3b"). */
function leerRespuestas(respuesta) {
  var R = { _email: respuesta.getRespondentEmail() || '' };
  respuesta.getItemResponses().forEach(function (ir) {
    var titulo = ir.getItem().getTitle();
    var m = titulo.match(/^(\d+(?:\.\d+)*[a-z]?)\s/);
    if (m) R[m[1]] = ir.getResponse();
  });
  return R;
}

function construirBorrador(R, respuesta) {
  var nombre = limpiar(R['1.1']);
  var id = slug(limpiar(R['1.2']) || nombre);
  var pendientes = [];

  // Geolocalización aproximada del barrio (nunca la dirección exacta).
  var lat = null, lng = null;
  try {
    var geo = Maps.newGeocoder().setRegion('co').geocode(limpiar(R['1.7']) + ', Colombia');
    if (geo.status === 'OK' && geo.results.length) {
      lat = redondear(geo.results[0].geometry.location.lat);
      lng = redondear(geo.results[0].geometry.location.lng);
    }
  } catch (e) { /* sin geocoder no se bloquea el alta */ }
  if (lat === null) pendientes.push('Geocodificar lat/lng desde: "' + limpiar(R['1.7']) + '" (aprox. al barrio)');

  // Unidad de impacto: "singular / plural"
  var unidad = parseUnidad(R['5.1'], R['5.2'], id);
  var costoDocumentado = limpiar(R['5.3']) !== 'Cálculo propio' || !!limpiar(R['5.3b']);
  if (!costoDocumentado) pendientes.push('Costo de la unidad sin soporte declarado: NO publicar en la calculadora hasta tener evidencia (5.3c)');
  if (limpiar(R['5.4'])) pendientes.push('Posible segunda unidad de impacto (5.4): "' + limpiar(R['5.4']) + '" — estructurar a mano');

  // Consentimientos
  var si = function (v) { return String(v || '').indexOf('Sí') === 0; };
  var menores = Array.isArray(R['7.4']) ? R['7.4'].length : 0;
  var consent = {
    name: si(R['7.1']),
    logo: si(R['7.2']),
    photos: si(R['7.3']),
    minorsImageProtected: menores === 3 ? true : 'pendiente',
    grantedBy: limpiar(R['7.5']),
    date: fechaISO(R['7.7']),
    source: 'Cuestionario de ingreso al Hub, respuesta ' + respuesta.getId()
  };
  if (!consent.name) pendientes.push('SIN autorización de nombre (7.1 = No): NO crear perfil público. Contactar a la fundación.');
  if (consent.photos && consent.minorsImageProtected !== true) {
    pendientes.push('Autorizó fotos pero la declaración de menores (7.4) está incompleta: verificar antes de publicar cualquier foto con menores identificables.');
  }
  pendientes.push('Cargo y documento de quien autoriza (7.6) va al archivo interno, NO al JSON público: "' + limpiar(R['7.6']) + '"');

  // Insignia según personería (1.6)
  var badge = { es: 'Proyecto comunitario de base', en: '' };
  if (String(R['1.6'] || '').indexOf('Sí, con NIT') === 0) badge.es = 'Fundación constituida';
  else if (String(R['1.6'] || '').indexOf('En trámite') === 0) badge.es = 'Fundación en constitución';

  // Programas 1-3
  var programs = [];
  [1, 2, 3].forEach(function (n) {
    var nom = limpiar(R['4.' + n + '.1']);
    if (!nom) return;
    var desc = limpiar(R['4.' + n + '.2']);
    var evid = Array.isArray(R['4.' + n + '.4']) ? R['4.' + n + '.4'] : [];
    if (!evid.length) pendientes.push('Programa "' + nom + '" sin evidencia declarada (4.' + n + '.4): publicar cifras con "≈" o sin números');
    programs.push({ name: nom, desc: { es: desc, en: '' } });
  });

  // Años en territorio: redondeo hacia abajo (evidencia, no promesas)
  var anios = aniosEnTerritorio(R['2.3'], R['1.5']);

  pendientes.push('Traducir TODOS los campos en:"" al inglés (paridad i18n)');
  pendientes.push('Redacción editorial de profile.about sobre la historia (2.1) y misión (2.2); aprobar con la fundación antes de publicar');
  pendientes.push('Redactar profile.hub (conexión con las Rutas del modelo)');
  pendientes.push('Logo: obtener desde "' + limpiar(R['6.4']) + '", optimizar y subir a /img/' + id + '_logo.<ext> (publicar solo si consent.logo)');
  pendientes.push('Verificar cifra de población (3.2, conteo: ' + limpiar(R['3.3']) + '): usar "≈" salvo registro exacto');

  var borrador = {
    id: id,
    name: nombre,
    type: 'foundation',
    lat: lat, lng: lng,
    area: { es: limpiar(R['1.7']), en: '' },
    url: limpiar(R['6.1']) || undefined,
    instagram: normalizarInstagram(R['6.2']),
    impactUnits: unidad ? [unidad] : [],
    logo: '',
    gallery: [],
    consent: consent,
    poblacion: { es: conAprox(R['3.2'], R['3.3']), en: '' },
    profile: {
      badge: badge,
      leader: limpiar(R['1.3']),
      years: { es: anios, en: '' },
      about: { es: limpiar(R['2.1']), en: '' },
      quote: limpiar(R['2.5']) ? { es: '' + limpiar(R['2.5']) + ' — ' + limpiar(R['1.3']), en: '' } : undefined,
      programs: programs,
      hub: { es: '', en: '' }
    },
    _revision: {
      pendientes: pendientes,
      contactoInterno: { email: limpiar(R['1.9']) || R._email, telefono: limpiar(R['1.10']) },
      mision: limpiar(R['2.2']),
      logroEvidenciable: limpiar(R['2.4']),
      poblacionesAtendidas: Array.isArray(R['3.1']) ? R['3.1'] : [],
      otrasRedes: limpiar(R['6.3']),
      fotosDisponibles: limpiar(R['6.5']),
      cargoYDocumento: limpiar(R['7.6']),
      respuestaFormId: respuesta.getId(),
      recibido: new Date().toISOString()
    }
  };
  return JSON.parse(JSON.stringify(borrador)); // elimina undefined
}

// === GitHub =================================================================

function abrirPullRequest(borrador) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Falta GITHUB_TOKEN en Propiedades de la secuencia de comandos.');

  var marca = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyyMMdd-HHmm');
  var rama = 'alta/' + borrador.id + '-' + marca;
  var ruta = 'ops/altas/' + borrador.id + '.json';

  var baseSha = gh(token, 'GET', '/git/ref/heads/' + RAMA_BASE).object.sha;
  gh(token, 'POST', '/git/refs', { ref: 'refs/heads/' + rama, sha: baseSha });

  var contenido = JSON.stringify(borrador, null, 2) + '\n';
  gh(token, 'PUT', '/contents/' + ruta, {
    message: 'Alta (borrador): ' + borrador.name,
    content: Utilities.base64Encode(contenido, Utilities.Charset.UTF_8),
    branch: rama
  });

  var cuerpo =
    '## Alta de fundación: ' + borrador.name + '\n\n' +
    'Borrador generado automáticamente desde el formulario de ingreso. ' +
    '**Nada se publica al hacer merge de este PR** (la carpeta `ops/` está fuera de los assets): ' +
    'el merge solo archiva el borrador; la publicación real es integrar el objeto revisado en `data/partners.json`.\n\n' +
    '### Lista de verificación (evidencia, no promesas)\n' +
    borrador._revision.pendientes.map(function (p) { return '- [ ] ' + p; }).join('\n') + '\n\n' +
    '### Al integrar en partners.json\n' +
    '- [ ] Eliminar el bloque `_revision` completo\n' +
    '- [ ] `node scripts/validate.mjs` en verde\n' +
    '- [ ] Verificar pin, muro, mini-tarjeta, ficha `#fundacion/' + borrador.id + '` y `/f/' + borrador.id + '`\n' +
    '- [ ] Aprobación final de la fundación (captura por WhatsApp) archivada\n';

  return gh(token, 'POST', '/pulls', {
    title: 'Alta: ' + borrador.name,
    head: rama,
    base: RAMA_BASE,
    body: cuerpo
  });
}

function gh(token, metodo, ruta, payload) {
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + ruta, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    contentType: 'application/json',
    payload: payload ? JSON.stringify(payload) : undefined,
    muteHttpExceptions: true
  });
  var codigo = res.getResponseCode();
  if (codigo >= 300) throw new Error('GitHub ' + metodo + ' ' + ruta + ' → ' + codigo + ': ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText() || '{}');
}

// === Utilidades =============================================================

function limpiar(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function slug(nombre) {
  return limpiar(nombre).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\bfundacion\b/g, '').trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').slice(0, 3).join('-') || 'fundacion-' + Date.now();
}

function redondear(n) { return Math.round(n * 10000) / 10000; }

function parseUnidad(u51, u52, id) {
  var partes = limpiar(u51).split('/').map(function (s) { return s.trim(); });
  var cop = parseInt(String(u52).replace(/[^0-9]/g, ''), 10);
  if (!partes[0] || !cop) return null;
  return {
    id: id + '-' + slug(partes[0]).split('-')[0],
    cop: cop,
    es: partes[0],
    esPl: partes[1] || partes[0] + 's',
    en: '', enPl: ''
  };
}

function conAprox(v32, v33) {
  var v = limpiar(v32);
  if (!v) return '';
  var exacto = String(v33 || '').indexOf('Conteo aproximado') === -1 &&
               (String(v33 || '').indexOf('Planillas') === 0 || String(v33 || '').indexOf('Registro digital') === 0);
  if (v.indexOf('≈') === 0 || exacto) return v;
  return '≈' + v;
}

function aniosEnTerritorio(v23, v15) {
  var n = parseInt(limpiar(v23).replace(/[^0-9]/g, ''), 10);
  if (!n && v15) n = new Date().getFullYear() - parseInt(v15, 10);
  return n > 0 ? n + '+ años en territorio' : '';
}

function normalizarInstagram(v) {
  var s = limpiar(v);
  if (!s) return undefined;
  if (s.indexOf('http') === 0) return s;
  return 'https://www.instagram.com/' + s.replace(/^@/, '');
}

function fechaISO(v) {
  if (!v) return null;
  try { return Utilities.formatDate(new Date(v), 'America/Bogota', 'yyyy-MM-dd'); }
  catch (e) { return null; }
}
