/**
 * Give&Grow — Formulario "Quiero ser aliado"
 * ================================================================
 * Recibe las solicitudes de alianza empresarial desde el sitio web,
 * las guarda en una hoja de cálculo y envía dos correos:
 *   1. A Sebas (contabilidad@) — notificación con el resumen.
 *   2. A la empresa — confirmación de recibido (NO envía el convenio;
 *      eso lo hace Sebas manualmente, por seguridad).
 *
 * Mapea exactamente el Anexo No. 1 del Convenio Marco de Alianza.
 *
 * INSTALACIÓN (una sola vez):
 *  1. Crea una Hoja de cálculo nueva en Drive llamada "Empresas Aliadas — Give&Grow".
 *  2. Extensiones → Apps Script. Borra todo y pega este archivo.
 *  3. Arriba, reemplaza SHEET_ID por el id de tu hoja (está en su URL).
 *  4. Implementar → Nueva implementación → tipo "Aplicación web".
 *       - Ejecutar como: Yo (tu cuenta)
 *       - Quién tiene acceso: Cualquier usuario
 *  5. Copia la URL que termina en /exec y pásasela a Claude.
 *  6. La primera vez pedirá autorización: acéptala.
 */

var SHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_HOJA";
var NOTIFY_EMAIL = "contabilidad@thegiveandgrowproject.org";
var TAB = "Solicitudes";

var HEADERS = [
  "Fecha", "Estado",
  "Razón social", "NIT/Doc", "Representante legal", "Cédula rep.",
  "Contacto (nombre y cargo)", "Correo", "Teléfono", "Ciudad", "Dirección",
  "Web/Instagram",
  "A. Donación", "B. RSE", "C. Gratitud", "D. Servicios", "E. Voluntariado", "F. Difusión",
  "Ficha beneficio (Gratitud)", "Nivel desde", "Condiciones", "Cómo se redime",
  "Detalle servicio (D)",
  "Autoriza marca", "Autoriza datos (1581)", "Declara licitud"
];

function doPost(e){
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) {
    return json({ ok:false, error:"busy" });
  }
  try {
    var d = JSON.parse(e.postData.contents || "{}");

    // Validación mínima: razón social, correo y las 3 autorizaciones.
    if (!d.razon || !d.correo || !d.autMarca || !d.autDatos || !d.autLicitud){
      return json({ ok:false, error:"missing_required" });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.correo)){
      return json({ ok:false, error:"bad_email" });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
    if (sh.getLastRow() === 0){
      sh.appendRow(HEADERS);
      sh.getRange(1,1,1,HEADERS.length).setFontWeight("bold").setBackground("#1F5C38").setFontColor("#fff");
      sh.setFrozenRows(1);
    }

    var yes = function(v){ return v ? "Sí" : ""; };
    var row = [
      new Date(), "recibida",
      s(d.razon), s(d.nit), s(d.representante), s(d.cedula),
      s(d.contacto), s(d.correo), s(d.telefono), s(d.ciudad), s(d.direccion),
      s(d.web),
      yes(d.modDonacion), yes(d.modRse), yes(d.modGratitud), yes(d.modServicios), yes(d.modVoluntariado), yes(d.modDifusion),
      s(d.benBeneficio), s(d.benNivel), s(d.benCondiciones), s(d.benRedime),
      s(d.servDetalle),
      yes(d.autMarca), yes(d.autDatos), yes(d.autLicitud)
    ];
    sh.appendRow(row);

    // Correo de notificación a Sebas
    var mods = [];
    if (d.modDonacion) mods.push("Donación");
    if (d.modRse) mods.push("RSE");
    if (d.modGratitud) mods.push("Programa de Gratitud");
    if (d.modServicios) mods.push("Servicios");
    if (d.modVoluntariado) mods.push("Voluntariado");
    if (d.modDifusion) mods.push("Difusión");
    var resumen = "Nueva solicitud de alianza empresarial\n\n"
      + "Empresa: " + s(d.razon) + "\n"
      + "Contacto: " + s(d.contacto) + " · " + s(d.correo) + " · " + s(d.telefono) + "\n"
      + "Ciudad: " + s(d.ciudad) + "\n"
      + "Modalidades elegidas: " + (mods.join(", ") || "(ninguna marcada)") + "\n";
    if (d.modGratitud){
      resumen += "\nFicha del Beneficio (Gratitud):\n"
        + "  Beneficio: " + s(d.benBeneficio) + "\n"
        + "  Desde nivel: " + s(d.benNivel) + "\n"
        + "  Condiciones: " + s(d.benCondiciones) + "\n"
        + "  Redención: " + s(d.benRedime) + "\n";
    }
    resumen += "\nSiguiente paso (manual): revisar, prellenar el Convenio Marco y enviarlo a "
      + s(d.correo) + " para firma.\n";
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, "Nueva solicitud de aliado: " + s(d.razon), resumen);
    } catch (err) {}

    // Correo de confirmación a la empresa (NO adjunta el convenio)
    try {
      MailApp.sendEmail(d.correo,
        "Recibimos tu solicitud de alianza — Give&Grow International",
        "Hola,\n\nGracias por tu interés en aliarte con la Fundación Give&Grow International. "
        + "Recibimos tu solicitud y pronto te enviaremos el Convenio Marco de Alianza para tu revisión y firma.\n\n"
        + "Si eliges aparecer con tu marca, puedes responder a este correo adjuntando tu logotipo "
        + "en PNG con fondo transparente (mínimo 400px).\n\n"
        + "Dar para crecer, crecer para dar más.\n"
        + "Fundación Give&Grow International · NIT 901.948.930-2\n"
        + "www.thegiveandgrowproject.org");
    } catch (err) {}

    return json({ ok:true });
  } catch (err) {
    return json({ ok:false, error:String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(){ return json({ ok:true, service:"aliados", ts:new Date().toISOString() }); }
function s(v){ return (v==null) ? "" : String(v).slice(0,1000); }
function json(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
