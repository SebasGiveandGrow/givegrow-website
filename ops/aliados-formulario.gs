/**
 * Give&Grow — Formulario "Quiero ser aliado"
 * ================================================================
 * Recibe las solicitudes de alianza empresarial desde el sitio web,
 * las guarda en una hoja de cálculo y envía dos correos:
 *   1. A Sebas (contabilidad@) — notificación con el resumen.
 *   2. A la empresa — confirmación de recibido (NO envía el convenio;
 *      eso lo hace Sebas manualmente, por seguridad).
 *
 * Usa GmailApp (no MailApp) para evitar rebotes de correo dentro del
 * mismo dominio.
 *
 * IMPORTANTE: cada vez que edites este código, actualiza la implementacion:
 *   Implementar -> Administrar implementaciones -> lapiz -> 
 *   Version: "Version nueva" -> Implementar
 * Si no, la aplicacion web sigue usando el codigo anterior.
 */

var SHEET_ID = "1x9vF3PN1qGCX9h8ffXg_l6_9YILeSu4HLR91l2yJnlg";
var NOTIFY_EMAIL = "contabilidad@thegiveandgrowproject.org";
var TAB = "Solicitudes";

var HEADERS = [
  "Fecha", "Estado",
  "Razon social", "NIT/Doc", "Representante legal", "Cedula rep.",
  "Contacto (nombre y cargo)", "Correo", "Telefono", "Ciudad", "Direccion",
  "Web/Instagram",
  "A. Donacion", "B. RSE", "C. Gratitud", "D. Servicios", "E. Voluntariado", "F. Difusion",
  "Ficha beneficio (Gratitud)", "Nivel desde", "Condiciones", "Como se redime",
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

    var yes = function(v){ return v ? "Si" : ""; };
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

    var mods = [];
    if (d.modDonacion) mods.push("Donacion");
    if (d.modRse) mods.push("RSE");
    if (d.modGratitud) mods.push("Programa de Gratitud");
    if (d.modServicios) mods.push("Servicios");
    if (d.modVoluntariado) mods.push("Voluntariado");
    if (d.modDifusion) mods.push("Difusion");
    var resumen = "Nueva solicitud de alianza empresarial\n\n"
      + "Empresa: " + s(d.razon) + "\n"
      + "Contacto: " + s(d.contacto) + " - " + s(d.correo) + " - " + s(d.telefono) + "\n"
      + "Ciudad: " + s(d.ciudad) + "\n"
      + "Modalidades elegidas: " + (mods.join(", ") || "(ninguna marcada)") + "\n";
    if (d.modGratitud){
      resumen += "\nFicha del Beneficio (Gratitud):\n"
        + "  Beneficio: " + s(d.benBeneficio) + "\n"
        + "  Desde nivel: " + s(d.benNivel) + "\n"
        + "  Condiciones: " + s(d.benCondiciones) + "\n"
        + "  Redencion: " + s(d.benRedime) + "\n";
    }
    resumen += "\nSiguiente paso (manual): revisar, prellenar el Convenio Marco y enviarlo a "
      + s(d.correo) + " para firma.\n";
    try {
      GmailApp.sendEmail(NOTIFY_EMAIL, "Nueva solicitud de aliado: " + s(d.razon), resumen);
    } catch (err) {}

    try {
      GmailApp.sendEmail(d.correo,
        "Recibimos tu solicitud de alianza - Give&Grow International",
        "Hola,\n\nGracias por tu interes en aliarte con la Fundacion Give&Grow International. "
        + "Recibimos tu solicitud y pronto te enviaremos el Convenio Marco de Alianza para tu revision y firma.\n\n"
        + "Si eliges aparecer con tu marca, puedes responder a este correo adjuntando tu logotipo "
        + "en PNG con fondo transparente (minimo 400px).\n\n"
        + "Dar para crecer, crecer para dar mas.\n"
        + "Fundacion Give&Grow International - NIT 901.948.930-2\n"
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

function diagnosticoCorreo(){
  Logger.log("Cuota de correos restante hoy: " + MailApp.getRemainingDailyQuota());
  GmailApp.sendEmail("sebas@thegiveandgrowproject.org",
    "Prueba directa Give&Grow",
    "Si recibes esto, GmailApp funciona correctamente.");
  Logger.log("Correo enviado sin excepcion.");
}
