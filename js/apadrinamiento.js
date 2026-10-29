/* ---------- #apadrinamiento: el catálogo de unidades (migración 0054) ----------
   Llega bajo demanda al entrar a la ruta (MODULOS_RUTA). Todo lo que pinta sale
   de /api/apadrinamiento: solo unidades APROBADAS, de fundaciones de la red,
   con el costo verificado. Los textos de la unidad los escribió una fundación,
   así que cada dato pasa por escapeHtml antes de tocar el DOM.

   Fase 1: no se cobra. «Quiero apadrinar» lleva al formulario de aviso con la
   unidad ya elegida, y el aviso lo guarda /api/apadrinamiento/interes. */
var APU = { datos: null, pidiendo: null, enviando: false, ods: null };

function apuEl(id){ return document.getElementById(id); }
function apuPesos(n){ return "$" + Math.round(Number(n) || 0).toLocaleString(lang === "en" ? "en-US" : "es-CO"); }
function apuTxt(o){ return o ? (o[lang] || o.es || "") : ""; }

/* Al entrar a la ruta: los datos una sola vez por visita. */
function apuEntrar(){
  if (APU.datos) { apuPinta(); return; }
  if (APU.pidiendo) return;
  APU.pidiendo = fetch("/api/apadrinamiento").then(function(r){ if (!r.ok) throw 0; return r.json(); })
    .then(function(d){ APU.datos = d.unidades || []; APU.ods = d.ods_nombres || null; APU.pidiendo = null; apuPinta(); })
    .catch(function(){
      APU.pidiendo = null;
      var l = apuEl("apu-lista");
      if (l) l.innerHTML = '<p class="mu">' + escapeHtml(t("apu.error")) + "</p>";
    });
}

function apuPinta(){
  var l = apuEl("apu-lista");
  if (!l || !APU.datos) return;
  var U = APU.datos;
  if (!U.length) {
    l.innerHTML = '<p class="apu-vacio">' + escapeHtml(t("apu.vacio")) + "</p>";
  } else {
    l.innerHTML = U.map(function(u){
      var mod = u.modalidad === "identificado" ? t("apu.ident") : t("apu.cupo");
      return '<article class="apu-u" data-apu="' + u.id + '">' +
        '<p class="apu-u-de">' + escapeHtml(t("apu.de").replace("{f}", u.fundacion.nombre)) + (u.programa ? " · " + escapeHtml(u.programa) : "") + "</p>" +
        '<h3 class="apu-u-t">' + escapeHtml(apuTxt(u.nombre)) + "</h3>" +
        '<p class="apu-u-costo"><strong>' + apuPesos(u.costo_mensual_cop) + "</strong> " + escapeHtml(t("apu.mes")) + "</p>" +
        apuVerificado(u.ultimo_reporte, u.cupos) +
        '<p class="apu-u-chips"><span class="apu-chip">' + escapeHtml(mod) + "</span>" +
          (u.cupos ? '<span class="apu-chip">' + escapeHtml(t("apu.cupos").replace("{n}", u.cupos)) + "</span>" : "") + "</p>" +
        apuOds(u.ods) +
        '<p class="apu-u-desc">' + escapeHtml(apuTxt(u.descripcion)) + "</p>" +
        (u.incluye ? '<p class="apu-u-dato"><span>' + escapeHtml(t("apu.incluye")) + "</span>" + escapeHtml(apuTxt(u.incluye)) + "</p>" : "") +
        '<p class="apu-u-dato"><span>' + escapeHtml(t("apu.evid")) + "</span>" + escapeHtml(apuTxt(u.evidencia)) + "</p>" +
        '<p class="apu-u-alc" id="apu-alc-' + u.id + '" aria-live="polite"></p>' +
        '<button type="button" class="btn btn-g apu-u-btn" data-apu-quiero="' + u.id + '">' + escapeHtml(t("apu.btn")) + "</button>" +
        "</article>";
    }).join("");
  }
  /* El selector del aviso: las mismas unidades, en el idioma de la pantalla. */
  var sel = apuEl("apu-unidad");
  if (sel) {
    var actual = sel.value;
    sel.innerHTML = '<option value="">' + escapeHtml(t("apu.f.unidad.cual")) + "</option>" + U.map(function(u){
      return '<option value="' + u.id + '">' + escapeHtml(apuTxt(u.nombre)) + " · " + escapeHtml(u.fundacion.nombre) + "</option>";
    }).join("");
    sel.value = actual;
  }
  apuCalcula();
}

/* EL ÚLTIMO REPORTE VERIFICADO (0055): lo que la fundación reportó del mes y
   el equipo aprobó tras ver la evidencia. Una unidad nueva lo dice tal cual. */
function apuVerificado(r, cupos){
  if (!r) return '<p class="apu-u-ver nuevo">' + escapeHtml(t("apu.ver.no")) + "</p>";
  var x = String(r.periodo).split("-");
  var mes = new Date(Date.UTC(Number(x[0]), Number(x[1]) - 1, 15)).toLocaleDateString(lang === "en" ? "en-US" : "es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
  return '<p class="apu-u-ver">' + escapeHtml(t("apu.ver").replace("{m}", mes).replace("{n}", r.entregadas + (cupos ? " / " + cupos : ""))) + "</p>";
}

/* LOS ODS DE LA UNIDAD (0056): número y nombre oficial en el idioma de la
   pantalla. Los declara la fundación y pasan por la revisión de la unidad. */
function apuOds(lista){
  if (!lista || !lista.length || !APU.ods) return "";
  var nom = APU.ods[lang === "en" ? "en" : "es"] || APU.ods.es;
  return '<p class="apu-u-ods"><span class="apu-u-ods-t">' + escapeHtml(t("apu.ods")) + "</span>" + lista.map(function(n){
    return '<span class="apu-ods">' + n + " · " + escapeHtml(nom[n - 1] || "") + "</span>";
  }).join("") + "</p>";
}

/* LA CALCULADORA: con este monto al mes, cuántas unidades completas de cada
   una. Sin redondear hacia arriba: «alcanza para 2» tiene que ser verdad. */
function apuCalcula(){
  var i = apuEl("apu-monto");
  if (!i || !APU.datos) return;
  var monto = Number(String(i.value || "").replace(/[^0-9]/g, ""));
  APU.datos.forEach(function(u){
    var p = apuEl("apu-alc-" + u.id);
    if (!p) return;
    if (!monto) { p.textContent = ""; return; }
    var n = Math.floor(monto / u.costo_mensual_cop);
    p.textContent = n === 0 ? t("apu.calc.no") : n === 1 ? t("apu.calc.n1") : t("apu.calc.nn").replace("{n}", n);
    p.className = "apu-u-alc" + (n ? " si" : "");
  });
}

/* «Quiero apadrinar» deja la unidad elegida en el formulario de aviso y baja
   hasta él. Es un botón y no un enlace «#apu-interes»: en esta SPA cada «#»
   es una ruta, y el enlace llevaba a «Página no encontrada». */
document.addEventListener("click", function(ev){
  var a = ev.target.closest && ev.target.closest("[data-apu-quiero]");
  if (!a) return;
  var sel = apuEl("apu-unidad");
  if (sel) sel.value = a.getAttribute("data-apu-quiero");
  var monto = Number(String((apuEl("apu-monto") || {}).value || "").replace(/[^0-9]/g, ""));
  var u = (APU.datos || []).filter(function(x){ return String(x.id) === a.getAttribute("data-apu-quiero"); })[0];
  if (u && monto >= u.costo_mensual_cop && apuEl("apu-cant")) apuEl("apu-cant").value = Math.min(50, Math.floor(monto / u.costo_mensual_cop));
  var f = apuEl("apu-interes");
  if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
  var n = apuEl("apu-nombre");
  if (n) setTimeout(function(){ n.focus({ preventScroll: true }); }, 400);
});

function apuInteres(ev){
  if (ev && ev.preventDefault) ev.preventDefault();
  if (APU.enviando) return false;
  var note = apuEl("apu-msg");
  if (apuEl("apu-web2").value) return false;
  var nombre = apuEl("apu-nombre").value.trim(), email = apuEl("apu-email").value.trim();
  if (nombre.length < 2) { allyMal(note, "apu-nombre", "apu.e.nombre"); return false; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { allyMal(note, "apu-email", "apu.e.email"); return false; }
  if (!apuEl("apu-priv").checked) { allyMal(note, "apu-priv", "apu.e.priv"); return false; }
  var btn = apuEl("apu-enviar");
  APU.enviando = true; btn.disabled = true;
  allyMsg(note, t("apu.enviando"), true);
  fetch("/api/apadrinamiento/interes", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: nombre, email: email, unidad_id: apuEl("apu-unidad").value || null,
      cantidad: Number(apuEl("apu-cant").value) || 1, autoriza: true, idioma: lang === "en" ? "en" : "es" }) })
    .then(function(r){ APU.enviando = false; btn.disabled = false;
      if (r.status === 429) { allyMsg(note, t("apu.e.muchos"), false); return; }
      if (!r.ok) { allyMsg(note, t("apu.e.red"), false); return; }
      apuEl("apu-form").reset();
      allyMsg(note, t("apu.ok"), true);
    })
    .catch(function(){ APU.enviando = false; btn.disabled = false; allyMsg(note, t("apu.e.red"), false); });
  return false;
}
