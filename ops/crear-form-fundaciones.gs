/**
 * crear-form-fundaciones.gs — Constructor del Google Form de ingreso al HUB
 * ----------------------------------------------------------------------------
 * Ejecuta la función crearFormularioFundaciones() UNA sola vez y crea el
 * formulario completo (7 secciones) en tu Google Drive, espejo del esquema
 * `data/partners.json`. Al terminar imprime en el log la URL de edición y la
 * URL pública para compartir.
 *
 * CÓMO USARLO:
 *  1. Ve a https://script.google.com  →  Nuevo proyecto.
 *  2. Borra el contenido y pega TODO este archivo.
 *  3. Selecciona la función `crearFormularioFundaciones` y pulsa Ejecutar.
 *  4. Autoriza los permisos (crear formularios en tu Drive).
 *  5. Abre "Ver → Registro de ejecución" para copiar las URLs.
 *
 * Regenerable: si algo no te gusta, borra el form creado y vuelve a ejecutar.
 * Fuente de verdad del contenido: ops/cuestionario-fundaciones-hub.md
 * Generado: 03/07/2026.
 */

function crearFormularioFundaciones() {
  var form = FormApp.create('Ingreso de fundaciones al HUB SOCIAL — Give&Grow International');

  form.setDescription(
    'Este formulario recoge la información de tu fundación para crear su perfil en ' +
    'thegiveandgrowproject.org. Publicamos solo lo que autorices, con datos reales y ' +
    'verificables. Tiempo estimado: 20–30 minutos. Puedes guardar y continuar después ' +
    '(requiere iniciar sesión con Google).'
  );
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(true);
  form.setAllowResponseEdits(true);
  form.setProgressBar(true);

  // Helpers ------------------------------------------------------------------
  function texto(titulo, ayuda, req) {
    var it = form.addTextItem().setTitle(titulo).setRequired(!!req);
    if (ayuda) it.setHelpText(ayuda);
    return it;
  }
  function parrafo(titulo, ayuda, req) {
    var it = form.addParagraphTextItem().setTitle(titulo).setRequired(!!req);
    if (ayuda) it.setHelpText(ayuda);
    return it;
  }
  function opcion(titulo, ops, ayuda, req) {
    var it = form.addMultipleChoiceItem().setTitle(titulo).setChoiceValues(ops).setRequired(!!req);
    if (ayuda) it.setHelpText(ayuda);
    return it;
  }
  function casillas(titulo, ops, ayuda, req) {
    var it = form.addCheckboxItem().setTitle(titulo).setChoiceValues(ops).setRequired(!!req);
    if (ayuda) it.setHelpText(ayuda);
    return it;
  }
  function seccion(titulo, ayuda) {
    var pb = form.addPageBreakItem().setTitle(titulo);
    if (ayuda) pb.setHelpText(ayuda);
    return pb;
  }
  function archivo(titulo, ayuda, maxFiles, req) {
    var it = form.addFileUploadItem().setTitle(titulo).setRequired(!!req);
    if (ayuda) it.setHelpText(ayuda);
    it.setMaxFiles(maxFiles || 2);
    return it;
  }

  // === SECCIÓN 1 · Identificación ==========================================
  seccion('1 · Identificación',
    'Datos básicos de la fundación y de contacto. Los de contacto son solo para ' +
    'coordinación interna del Hub; no se publican.');

  texto('1.1 Nombre completo y oficial de la fundación',
    'Tal como debe aparecer publicado. Ej.: Fundación Niños del Futuro.', true);
  texto('1.2 Nombre corto o sigla (si la usan)', null, false);
  texto('1.3 Nombre completo de la persona que lidera la fundación', null, true);
  texto('1.4 Cargo de esa persona', 'Ej.: Director y fundador', true);

  var anio = form.addTextItem().setTitle('1.5 ¿En qué año inició labores la fundación?').setRequired(true);
  anio.setValidation(FormApp.createTextValidation()
    .setHelpText('Escribe un año entre 1950 y 2026.')
    .requireNumberBetween(1950, 2026).build());

  opcion('1.6 ¿La fundación tiene personería jurídica?',
    ['Sí, con NIT', 'En trámite', 'No, es un proyecto comunitario de base'],
    'Cualquier respuesta es válida. Solo define cómo describimos la organización ' +
    '(su "insignia" en el perfil).', false);

  texto('1.7 Barrio o sector y ciudad donde trabaja principalmente',
    'Ej.: La Honda, Manrique, Medellín', true);
  texto('1.8 Dirección o punto de referencia de la sede o lugar de operación',
    'La usamos solo para ubicar el pin en el mapa. No publicamos la dirección exacta.', true);

  var email = form.addTextItem().setTitle('1.9 Correo electrónico de contacto').setRequired(true);
  email.setValidation(FormApp.createTextValidation()
    .setHelpText('Escribe un correo válido.').requireTextIsEmail().build());

  texto('1.10 Teléfono / WhatsApp de contacto',
    'Solo para coordinación interna del Hub; no se publica en el sitio.', true);

  // === SECCIÓN 2 · Historia y propósito ====================================
  seccion('2 · Historia y propósito');

  parrafo('2.1 Cuéntanos la historia de la fundación en un párrafo (5–8 líneas)',
    'Cómo nació, quién la lidera, a quién sirve y qué la hace única. Es la base del ' +
    '"Acerca de" del perfil (lo editamos contigo antes de publicar).', true);
  parrafo('2.2 ¿Cuál es la misión de la fundación, en una o dos frases?', null, true);
  texto('2.3 ¿Hace cuántos años trabaja la fundación en su territorio actual?',
    'Ej.: 5 años, desde 2019', true);
  parrafo('2.4 ¿Qué logro reciente los enorgullece más y cómo lo pueden evidenciar?',
    'Ej.: "En 2025 entregamos 24.000 almuerzos; tenemos registro fotográfico y planillas."', false);
  texto('2.5 Una frase corta que represente el espíritu de la fundación',
    'Para destacarla como cita en el perfil. Ej.: "Aquí ningún niño se queda sin almorzar." ' +
    'Se publica con comillas y atribución.', false);

  // === SECCIÓN 3 · Población y territorio ==================================
  seccion('3 · Población y territorio');

  casillas('3.1 ¿A quiénes atiende la fundación?',
    ['Niños y niñas', 'Adolescentes', 'Jóvenes', 'Madres cabeza de familia',
     'Adultos mayores', 'Familias', 'Población migrante', 'Personas con discapacidad'],
    'Puedes marcar varias. Si falta alguna, indícalo en la última pregunta de contacto.', true);

  texto('3.2 ¿Cuántas personas atienden de forma regular?',
    'El número real, aunque sea aproximado. Lo publicamos con "≈" si es estimado. ' +
    'Ej.: ≈130 niños y niñas.', true);

  opcion('3.3 ¿Cómo llevan la cuenta de esas personas?',
    ['Planillas de asistencia', 'Registro digital', 'Listados por programa',
     'Conteo aproximado', 'Otro'],
    'Nos dice qué cifras podemos publicar como exactas y cuáles como aproximadas.', true);

  // === SECCIÓN 4 · Programas ===============================================
  seccion('4 · Programas',
    'Describe hasta tres programas o actividades permanentes. Prioriza los que mejor ' +
    'representan su labor diaria. Solo el Programa 1 es obligatorio.');

  agregarBloquePrograma(form, 1, true);
  agregarBloquePrograma(form, 2, false);
  agregarBloquePrograma(form, 3, false);

  // === SECCIÓN 5 · Unidad de impacto y costos ==============================
  seccion('5 · Unidad de impacto y costos',
    'En la calculadora del sitio mostramos a cuánto equivale un aporte en unidades ' +
    'concretas (ej.: "Tu donación ≈ 12 platos de comida"). Necesitamos una unidad con ' +
    'costo real documentado.');

  texto('5.1 ¿Cuál es la unidad de impacto más representativa de su labor?',
    'En singular y plural. Ej.: "plato de comida / platos de comida", "kit escolar / kits escolares".', true);

  var costo = form.addTextItem().setTitle('5.2 ¿Cuánto cuesta producir o entregar UNA unidad, en pesos colombianos?').setRequired(true);
  costo.setValidation(FormApp.createTextValidation()
    .setHelpText('Escribe solo el número. Ej.: 4000').requireNumber().build());
  costo.setHelpText('El costo real y completo. Ej.: 4000.');

  opcion('5.3 ¿Cómo está documentado ese costo?',
    ['Facturas de compra recientes', 'Cuentas de mercado del último mes',
     'Presupuesto detallado', 'Cálculo propio'],
    'Sin soporte real no publicamos la unidad en la calculadora (evidencia, no promesas).', true);

  parrafo('5.3b Si quieres, explica cómo calculan ese costo', null, false);
  archivo('5.3c Adjunta un soporte del costo (factura, cuenta de mercado o presupuesto)',
    'Para nuestro archivo interno de evidencia; no se publica. PDF o imagen.', 3, false);

  parrafo('5.4 ¿Hay una segunda unidad de impacto que quieran ofrecer a los donantes?',
    'Mismo formato: unidad (singular/plural) + costo en COP + cómo se documenta.', false);

  // === SECCIÓN 6 · Presencia digital y material gráfico ====================
  seccion('6 · Presencia digital y material gráfico');

  var web = form.addTextItem().setTitle('6.1 Página web (si tienen)').setRequired(false);
  web.setValidation(FormApp.createTextValidation()
    .setHelpText('Debe ser una URL válida (https://...).').requireTextIsUrl().build());

  texto('6.2 Instagram (si tienen)',
    'Ej.: https://www.instagram.com/ninos.del.futuro', false);
  parrafo('6.3 Otras redes (Facebook, YouTube, TikTok)', null, false);

  archivo('6.4 Sube el logo de la fundación en la mejor resolución que tengan',
    'Ideal: fondo transparente (PNG) o fondo blanco, mínimo 480 px en su lado más corto. PNG/JPG/SVG.',
    2, true);

  opcion('6.5 ¿Tienen fotos de su trabajo que quieran mostrar en su perfil del sitio?',
    ['Sí, las enviaremos', 'Sí, están en nuestro Instagram (autorizamos tomarlas de ahí)', 'Aún no'],
    'Las fotos pasan por la autorización de la sección 7 antes de publicarse. Máximo 8, curadas.', false);

  // === SECCIÓN 7 · Autorizaciones (consentimiento informado) ===============
  seccion('7 · Autorizaciones (consentimiento informado)',
    'Publicamos únicamente lo que autorices aquí. Puedes autorizar unas cosas y otras no, ' +
    'y retirar cualquier autorización después escribiéndonos. Esta sección queda registrada ' +
    'como el consentimiento formal de tu fundación.');

  opcion('7.1 ¿Autorizan a Give&Grow a publicar el NOMBRE de la fundación en el sitio y sus materiales?',
    ['Sí, lo autorizamos', 'No'], null, true);
  opcion('7.2 ¿Autorizan la publicación del LOGO de la fundación?',
    ['Sí, lo autorizamos', 'No'], null, true);
  opcion('7.3 ¿Autorizan la publicación de FOTOGRAFÍAS de sus actividades en su perfil del sitio?',
    ['Sí, las que enviemos o aprobemos expresamente', 'No por ahora'], null, true);

  casillas('7.4 Protección de la imagen de menores de edad',
    ['Entendemos que la imagen de niños, niñas y adolescentes está protegida por la Ley 1098 de 2006.',
     'Declaramos que contamos con autorización escrita de los padres o acudientes de los menores que aparezcan en las fotos que enviemos, y podemos presentarla si se requiere.',
     'Aceptamos que Give&Grow descarte cualquier foto donde un menor sea identificable sin dicha autorización, o aplique difuminado/encuadre que impida identificarlo.'],
    'Si enviarás fotos donde aparezcan menores, las TRES casillas son obligatorias para poder ' +
    'publicarlas. Give&Grow verifica esto antes de publicar.', false);

  texto('7.5 Nombre completo de quien otorga estas autorizaciones', null, true);
  texto('7.6 Cargo y documento de identidad de quien autoriza',
    'Ej.: Director y representante — C.C. 00.000.000', true);

  form.addDateItem().setTitle('7.7 Fecha de la autorización').setRequired(true);

  casillas('7.8 Declaración final',
    ['Declaro que la información entregada es veraz, que las cifras reportadas corresponden a la ' +
     'realidad de la fundación y que estoy facultado(a) para otorgar estas autorizaciones en su nombre.'],
    null, true);

  // Salida -------------------------------------------------------------------
  var editUrl = form.getEditUrl();
  var pubUrl = form.getPublishedUrl();
  Logger.log('FORMULARIO CREADO CON ÉXITO');
  Logger.log('Editar:    ' + editUrl);
  Logger.log('Compartir: ' + pubUrl);
  Logger.log('ID:        ' + form.getId());
  return { editUrl: editUrl, publishedUrl: pubUrl, id: form.getId() };
}

/**
 * Bloque repetible de un programa (Sección 4). n = número, req = obligatorio.
 */
function agregarBloquePrograma(form, n, req) {
  var etiqueta = req ? '(obligatorio)' : '(opcional)';
  form.addSectionHeaderItem()
    .setTitle('Programa ' + n + ' ' + etiqueta);

  form.addTextItem()
    .setTitle('4.' + n + '.1 Nombre del programa')
    .setHelpText(n === 1 ? 'Ej.: Chefs del Futuro' : null)
    .setRequired(req);

  form.addParagraphTextItem()
    .setTitle('4.' + n + '.2 ¿Qué hace el programa y a cuántas personas llega?')
    .setHelpText('Con números reales y frecuencia. Ej.: "Cerca de 100 niños reciben almuerzo cada día, de lunes a viernes."')
    .setRequired(req);

  form.addMultipleChoiceItem()
    .setTitle('4.' + n + '.3 ¿Con qué frecuencia opera?')
    .setChoiceValues(['Diaria', 'Varias veces por semana', 'Semanal', 'Quincenal', 'Mensual', 'Por temporadas'])
    .setRequired(req);

  form.addCheckboxItem()
    .setTitle('4.' + n + '.4 ¿Qué evidencia tienen del funcionamiento del programa?')
    .setChoiceValues(['Registro fotográfico', 'Planillas de asistencia', 'Facturas o cuentas de mercado', 'Testimonios', 'Informes'])
    .setRequired(false);
}
