/* ---------- #regalos: la lista de deseos de diciembre (migración 0048) ----------
   Llega bajo demanda al entrar a la ruta (MODULOS_RUTA). Todo lo que pinta sale
   de /api/regalos, que elige columna por columna lo que es público: nombre de
   pila, edad, zona, el regalo y su valor. Aun así, cada dato pasa por
   escapeHtml antes de tocar el DOM.

   La lista de quien escoge vive en sessionStorage: sobrevive a recargar la
   página, no a cerrar la pestaña, y no sale del navegador hasta que se paga.
   Que un regalo siga libre lo decide el servidor al apartarlo, no esta lista. */
var RG = {
  datos: null, pidiendo: null, ver: 24, via: "cop", enviando: false,
  f: { zona: "", tipo: "", edad: "", genero: "", disp: "1" },
  lista: []
};
var RG_PAGINA = 24;
var RG_ANGOSTO = window.matchMedia("(max-width:820px)");
if (RG_ANGOSTO.addEventListener) RG_ANGOSTO.addEventListener("change", function(){ if (RG.datos) rgPintaZonas(); });
/* Ícono de regalo, line-art como todos los del sitio (DESIGN_SYSTEM.md, regla 2). */
var RG_ICONO = '<svg class="rg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-1.6-3.6-5.5-4-5.5-1.6 0 1.6 3.2 1.6 5.5 1.6zM12 8.5c1.6-3.6 5.5-4 5.5-1.6 0 1.6-3.2 1.6-5.5 1.6z"/></svg>';
var RG_EDADES = { "0-5": [0, 5], "6-9": [6, 9], "10-13": [10, 13], "14-17": [14, 17] };
try { RG.lista = JSON.parse(sessionStorage.getItem("gg_rg_lista") || "[]") || []; } catch (e) { RG.lista = []; }

function rgGuardaLista(){
  try { sessionStorage.setItem("gg_rg_lista", JSON.stringify(RG.lista)); } catch (e) {}
}
function rgEsc(s){ return escapeHtml(s == null ? "" : String(s)); }
function rgCOP(n){ return "$" + Number(n || 0).toLocaleString("es-CO"); }
function rgUSD(n){ return "US$" + Number(n || 0).toLocaleString("en-US"); }
function rgValor(r){ return RG.via === "usd" ? rgUSD(r.valor_usd) : rgCOP(r.valor_cop); }
function rgEdad(n){ return t(n === 1 ? "rg.anio" : "rg.anios").replace("{n}", n); }
function rgZona(id){
  var z = (RG.datos && RG.datos.zonas || []).filter(function(x){ return x.id === id; })[0];
  return z ? (lang === "en" ? z.nombre_en : z.nombre_es) + " · " + z.departamento : id;
}
function rgTipo(id){
  var k = (RG.datos && RG.datos.categorias || []).filter(function(x){ return x.id === id; })[0];
  return k ? (lang === "en" ? k.nombre_en : k.nombre_es) : id;
}
function rgDeseo(r){ return lang === "en" && r.deseo_en ? r.deseo_en : r.deseo_es; }
function rgFecha(iso){
  if (!iso) return "";
  var d = new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso.replace(" ", "T") + "Z");
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
}
function rgEl(id){ return document.getElementById(id); }

/* Al entrar a la ruta: los datos de nuevo (cambian mientras la gente paga) y,
   si el enlace trae ?rg= y ?rt=, el seguimiento de ese pedido. */
function rgEntrar(){
  var q = new URLSearchParams(location.search);
  var ref = q.get("rg"), tk = q.get("rt");
  if (ref && tk) rgSeguimiento(ref, tk);
  if (RG.datos) rgPinta();
  if (RG.pidiendo) return;
  RG.pidiendo = fetch("/api/regalos").then(function(r){ if (!r.ok) throw 0; return r.json(); })
    .then(function(d){ RG.datos = d; RG.pidiendo = null; rgLimpiaLista(); rgPinta(); })
    .catch(function(){
      RG.pidiendo = null;
      var c = rgEl("rg-cuenta");
      if (c) c.textContent = t("rg.e.red");
    });
}

/* Lo que estaba en la lista y ya no está libre (lo pagó otra persona mientras
   tanto) sale de la lista al volver a cargar. */
function rgLimpiaLista(){
  var libres = {};
  (RG.datos.regalos || []).forEach(function(r){ if (r.estado === "disponible") libres[r.codigo] = true; });
  var antes = RG.lista.length;
  RG.lista = RG.lista.filter(function(k){ return libres[k]; });
  if (RG.lista.length !== antes) rgGuardaLista();
}

function rgPinta(){
  var d = RG.datos;
  if (!d) return;
  rgPintaZonas();
  var c = d.campana;
  var abierta = !!(c && c.estado !== "borrador");
  rgEl("rg-pronto").hidden = abierta;
  rgEl("rg-catalogo").hidden = !abierta;
  rgEl("rg-cerrada").hidden = !(c && c.estado === "cerrada");
  if (!abierta) { rgEl("rg-pagar").hidden = true; rgEl("rg-barra").hidden = true; return; }
  /* En inglés, si hay aliada, el dólar va primero. */
  if (!RG.viaElegida) RG.via = lang === "en" && c.usd ? "usd" : "cop";
  rgPintaFiltros();
  rgPintaGrid();
  rgPintaLista();
}

/* Las luces: una por cada niño de la META de la zona, no por cada niño
   cargado. Primero las entregadas, después las financiadas y al final las que
   esperan. */
function rgPintaZonas(){
  var d = RG.datos, caja = rgEl("rg-zonas");
  if (!caja) return;
  var borrador = !d.campana || d.campana.estado === "borrador";
  var loc = lang === "en" ? "en-US" : "es-CO";
  /* En el celular, 40 por fila: con 20, las mil luces apiladas ocupaban más
     de una pantalla antes de llegar a los niños. */
  var cols = RG_ANGOSTO.matches ? 40 : 20;
  caja.innerHTML = (d.zonas || []).map(function(z){
    var meta = Number(z.meta) || 0, ent = Math.min(z.entregados, meta), fin = Math.min(z.financiados, meta);
    /* Se llena desde abajo, como un frasco: las filas se pintan al revés. */
    var celdas = [], filas = [], luces = "";
    for (var i = 0; i < meta; i++) celdas.push(i < ent ? '<i class="rg-l is-e"></i>' : i < fin ? '<i class="rg-l is-f"></i>' : '<i class="rg-l"></i>');
    for (var k = 0; k < celdas.length; k += cols) filas.push(celdas.slice(k, k + cols).join(""));
    luces = filas.reverse().join("");
    var nombre = lang === "en" ? z.nombre_en : z.nombre_es;
    return '<div class="rg-zona">' +
      '<div class="rg-luces" style="--rg-cols:' + cols + '" role="img" aria-label="' + rgEsc(nombre + ": " + t("rg.zona.aria").replace("{f}", fin).replace("{m}", meta)) + '">' + luces + '</div>' +
      '<p class="rg-zona-n">' + rgEsc(meta.toLocaleString(loc)) + '</p>' +
      '<p class="rg-zona-t">' + rgEsc(nombre) + ' <span>' + rgEsc(z.departamento) + '</span></p>' +
      '<p class="rg-zona-d">' + (borrador ? rgEsc(t("rg.zona.prep"))
        : rgEsc(t("rg.zona.fin").replace("{n}", fin.toLocaleString(loc))) + ' · ' + rgEsc(t("rg.zona.ent").replace("{n}", ent.toLocaleString(loc)))) + '</p>' +
      (z.fecha_entrega ? '<p class="rg-zona-d">' + rgEsc(t("rg.zona.fecha").replace("{f}", rgFecha(z.fecha_entrega))) + '</p>' : '') +
      '</div>';
  }).join("");
}

function rgChip(campo, valor, texto){
  var on = RG.f[campo] === valor;
  return '<button type="button" class="map-fchip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="rgFiltro(\'' +
    campo + '\',\'' + rgEsc(valor) + '\')">' + rgEsc(texto) + '</button>';
}
function rgPintaFiltros(){
  var d = RG.datos;
  var g = function(etq, chips){ return '<div class="rg-fgrupo" role="group" aria-label="' + rgEsc(etq) + '"><span class="rg-fetq">' + rgEsc(etq) + '</span>' + chips + '</div>'; };
  var zonas = rgChip("zona", "", t("rg.todas")) + (d.zonas || []).map(function(z){ return rgChip("zona", z.id, lang === "en" ? z.nombre_en : z.nombre_es); }).join("");
  var tipos = rgChip("tipo", "", t("rg.todos")) + (d.categorias || []).map(function(k){ return rgChip("tipo", k.id, lang === "en" ? k.nombre_en : k.nombre_es); }).join("");
  var edades = rgChip("edad", "", t("rg.todas")) + Object.keys(RG_EDADES).map(function(k){ return rgChip("edad", k, t("rg.edad.r").replace("{r}", k.replace("-", lang === "en" ? " to " : " a "))); }).join("");
  var generos = rgChip("genero", "", t("rg.todos")) + rgChip("genero", "nina", t("rg.genero.nina")) + rgChip("genero", "nino", t("rg.genero.nino"));
  var disp = rgChip("disp", "1", t("rg.f.disp")) + rgChip("disp", "", t("rg.f.todos"));
  rgEl("rg-filtros").innerHTML = g(t("rg.f.zona"), zonas) + g(t("rg.f.tipo"), tipos) + g(t("rg.f.edad"), edades) +
    g(t("rg.f.genero"), generos) + g(t("rg.f.estado"), disp);
}

function rgFiltrados(){
  var f = RG.f, e = RG_EDADES[f.edad];
  return (RG.datos.regalos || []).filter(function(r){
    if (f.zona && r.zona !== f.zona) return false;
    if (f.tipo && r.categoria !== f.tipo) return false;
    if (f.genero && r.genero !== f.genero) return false;
    if (e && (r.edad < e[0] || r.edad > e[1])) return false;
    if (f.disp && r.estado !== "disponible") return false;
    return true;
  });
}

function rgPintaGrid(){
  var lista = rgFiltrados(), total = (RG.datos.regalos || []).length;
  var recibe = RG.datos.campana && RG.datos.campana.recibe;
  rgEl("rg-cuenta").textContent = total
    ? t("rg.cuenta").replace("{n}", lista.length).replace("{t}", total)
    : t("rg.cargando");
  var grid = rgEl("rg-grid");
  if (total && !lista.length) {
    grid.innerHTML = '<p class="rg-vacio mu">' + rgEsc(t("rg.ninguno")) + '</p>';
  } else {
    grid.innerHTML = lista.slice(0, RG.ver).map(function(r){ return rgTarjeta(r, recibe); }).join("");
  }
  rgEl("rg-mas").hidden = lista.length <= RG.ver;
}

function rgTarjeta(r, recibe){
  var enLista = RG.lista.indexOf(r.codigo) >= 0;
  var libre = r.estado === "disponible";
  var foto = r.foto
    ? '<img src="/api/regalos/foto/' + encodeURIComponent(r.codigo) + '" alt="' + rgEsc(t("rg.foto.alt").replace("{n}", r.nombre)) + '" loading="lazy" decoding="async" width="320" height="240">'
    : '<span class="rg-ini" aria-hidden="true">' + rgEsc(String(r.nombre || "?").charAt(0)) + '</span>';
  var accion;
  if (libre && recibe) {
    accion = '<button type="button" class="btn ' + (enLista ? 'btn-g' : 'btn-o') + ' rg-add" aria-pressed="' + enLista +
      '" data-act="rgToggle(\'' + rgEsc(r.codigo) + '\')">' + RG_ICONO + rgEsc(t(enLista ? "rg.btn.en" : "rg.btn.add")) + '</button>';
  } else {
    accion = '<span class="tag' + (libre ? ' soon' : '') + '">' + rgEsc(t("rg.est." + (libre ? "cerrada" : r.estado))) + '</span>';
  }
  return '<article class="rg-card' + (libre ? '' : ' is-tomado') + (enLista ? ' is-en' : '') + '">' +
    '<div class="rg-foto">' + foto + '</div>' +
    '<div class="rg-cuerpo">' +
      '<p class="rg-para">' + rgEsc(t("rg.para")) + '</p>' +
      '<p class="rg-quien"><strong>' + rgEsc(r.nombre) + '</strong>, ' + rgEsc(rgEdad(r.edad)) + '</p>' +
      '<p class="rg-donde">' + rgEsc(rgZona(r.zona)) + '</p>' +
      '<p class="rg-deseo">' + rgEsc(t("rg.deseo").replace("{d}", rgDeseo(r))) + '</p>' +
      '<p class="rg-tipo">' + rgEsc(rgTipo(r.categoria)) + (r.talla ? ' · ' + rgEsc(t("rg.talla").replace("{t}", r.talla)) : '') + '</p>' +
      '<div class="rg-pie"><span class="rg-valor">' + rgEsc(rgValor(r)) + '</span>' + accion + '</div>' +
    '</div></article>';
}

function rgFiltro(campo, valor){
  if (!RG.f.hasOwnProperty(campo)) return;
  RG.f[campo] = valor == null ? "" : String(valor);
  RG.ver = RG_PAGINA;
  rgPintaFiltros();
  rgPintaGrid();
}
function rgMas(){ RG.ver += RG_PAGINA; rgPintaGrid(); }

function rgToggle(codigo){
  var i = RG.lista.indexOf(codigo);
  if (i >= 0) RG.lista.splice(i, 1);
  else {
    if (RG.lista.length >= 20) { rgAvisoBarra(t("rg.e.muchos")); return; }
    RG.lista.push(codigo);
  }
  rgGuardaLista();
  rgPintaGrid();
  rgPintaLista();
}
function rgQuitar(codigo){ rgToggle(codigo); }

function rgElegidos(){
  var por = {};
  (RG.datos && RG.datos.regalos || []).forEach(function(r){ por[r.codigo] = r; });
  return RG.lista.map(function(k){ return por[k]; }).filter(Boolean);
}
function rgTotal(sel){
  var s = 0;
  sel.forEach(function(r){ s += Number(RG.via === "usd" ? r.valor_usd : r.valor_cop) || 0; });
  return RG.via === "usd" ? rgUSD(s) : rgCOP(s);
}

function rgPintaLista(){
  var sel = rgElegidos(), c = RG.datos.campana || {};
  var recibe = !!c.recibe;
  rgEl("rg-pagar").hidden = !recibe || !sel.length;
  var barra = rgEl("rg-barra");
  barra.hidden = !recibe || !sel.length;
  rgEl("rg-barra-t").textContent = t(sel.length === 1 ? "rg.barra.1" : "rg.barra.n").replace("{n}", sel.length).replace("{total}", rgTotal(sel));
  rgEl("rg-lista").innerHTML = sel.map(function(r){
    return '<li><span><strong>' + rgEsc(r.nombre) + '</strong>, ' + rgEsc(rgEdad(r.edad)) + ' · ' + rgEsc(rgDeseo(r)) +
      '<br><span class="mu">' + rgEsc(rgZona(r.zona)) + ' · ' + rgEsc(r.codigo) + '</span></span>' +
      '<span class="rg-li-v">' + rgEsc(rgValor(r)) +
      ' <button type="button" class="rg-quitar" data-act="rgQuitar(\'' + rgEsc(r.codigo) + '\')" aria-label="' +
      rgEsc(t("rg.btn.quitar") + " " + r.nombre) + '">' + rgEsc(t("rg.btn.quitar")) + '</button></span></li>';
  }).join("");
  rgEl("rg-total").textContent = rgTotal(sel);
  /* La vía en dólares existe solo si /admin/regalos tiene la aliada configurada. */
  var usd = rgEl("rg-via-usd");
  if (usd) usd.hidden = !c.usd;
  if (!c.usd && RG.via === "usd") RG.via = "cop";
  Array.prototype.forEach.call(document.querySelectorAll('input[name="rg-via"]'), function(x){ x.checked = x.value === RG.via; });
  rgEl("rg-cert-caja").hidden = RG.via !== "cop";
  var nota = rgEl("rg-cert-usd");
  nota.hidden = RG.via !== "usd";
  nota.textContent = c.aliada_nombre ? t("rg.cert.usd").replace("{a}", c.aliada_nombre) : "";
}

function rgVia(v){
  RG.via = v === "usd" ? "usd" : "cop";
  RG.viaElegida = true;
  rgPintaGrid();
  rgPintaLista();
}
function rgCert(){ rgEl("rg-cert-datos").hidden = !rgEl("rg-cert").checked; }
function rgIrAPagar(){
  var s = rgEl("rg-pagar");
  if (s && !s.hidden) { s.scrollIntoView({ behavior: "smooth", block: "start" }); var n = rgEl("rg-nombre"); if (n) n.focus({ preventScroll: true }); }
}
function rgAvisoBarra(txt){
  var m = rgEl("rg-cuenta");
  if (m) m.textContent = txt;
}

function rgPagar(ev){
  if (ev && ev.preventDefault) ev.preventDefault();
  if (RG.enviando) return false;
  var note = rgEl("rg-msg");
  if (rgEl("rg-web2").value) return false;
  var sel = rgElegidos();
  if (!sel.length) { allyMsg(note, t("rg.e.vacio"), false); return false; }
  var nombre = rgEl("rg-nombre").value.trim(), email = rgEl("rg-email").value.trim();
  if (nombre.length < 2) { allyMal(note, "rg-nombre", "rg.e.nombre"); return false; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { allyMal(note, "rg-email", "rg.e.email"); return false; }
  var cert = RG.via === "cop" && rgEl("rg-cert").checked;
  if (cert && (rgEl("rg-docnum").value.trim().length < 3 || rgEl("rg-ciudad").value.trim().length < 2)) {
    allyMal(note, rgEl("rg-docnum").value.trim().length < 3 ? "rg-docnum" : "rg-ciudad", "rg.e.cert"); return false;
  }
  if (!rgEl("rg-priv").checked) { allyMal(note, "rg-priv", "rg.e.priv"); return false; }

  var cuerpo = {
    items: RG.lista.slice(), via: RG.via, nombre: nombre, email: email,
    telefono: rgEl("rg-tel").value.trim(), idioma: lang === "en" ? "en" : "es",
    certificado: cert, cert_doc_tipo: rgEl("rg-doctipo").value,
    cert_doc_numero: rgEl("rg-docnum").value.trim(), cert_ciudad: rgEl("rg-ciudad").value.trim(), muro: "no"
  };
  var btn = rgEl("rg-enviar");
  btn.disabled = true; RG.enviando = true;
  allyMsg(note, t("rg.enviando"), true);
  fetch("/api/regalos/pedido", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) })
    .then(function(r){ return r.json().then(function(j){ if (!r.ok) { var e = new Error(j.error || "http_" + r.status); e.datos = j; throw e; } return j; }); })
    .then(function(d){
      RG.lista = []; rgGuardaLista();
      if (d.via === "cop") {
        try { sessionStorage.setItem("gg_guia", d.guia); } catch (e) {}
        window.location.href = d.url;
        return;
      }
      RG.enviando = false; btn.disabled = false;
      rgPintaUsd(d);
    })
    .catch(function(e){
      RG.enviando = false; btn.disabled = false;
      var c = e && e.message, j = e && e.datos;
      if (c === "no_disponibles" && j && j.codigos) {
        RG.lista = RG.lista.filter(function(k){ return j.codigos.indexOf(k) < 0; });
        rgGuardaLista();
        (RG.datos.regalos || []).forEach(function(r){ if (j.codigos.indexOf(r.codigo) >= 0) r.estado = "apartado"; });
        rgPintaGrid(); rgPintaLista();
        allyMsg(note, t("rg.e.nodisp").replace("{n}", j.codigos.length), false);
        return;
      }
      var clave = { campana_cerrada: "rg.e.cerrada", demasiados_regalos: "rg.e.muchos", monto_invalido: "rg.e.monto",
        demasiados_intentos: "rg.e.intentos", certificado_datos_invalidos: "rg.e.cert", correo_invalido: "rg.e.email",
        usd_no_disponible: "rg.e.usd", pasarela_no_configurada: "rg.e.pasarela" }[c] || "rg.e.red";
      allyMsg(note, t(clave), false);
    });
  return false;
}

/* En dólares no hay pasarela nuestra: el dinero lo recibe la aliada. Se le
   deja al donante su número de pedido a la vista, porque es lo que tiene que
   escribir en la nota de la donación para que la emparejemos. */
function rgPintaUsd(d){
  rgEl("rg-pagar").hidden = true;
  rgEl("rg-barra").hidden = true;
  var s = rgEl("rg-usd");
  s.hidden = false;
  rgEl("rg-usd-ok").innerHTML =
    '<p class="rg-usd-t">' + rgEsc(t("rg.usd.ok.t")) + '</p>' +
    '<p>' + rgEsc(t("rg.usd.ok.p").replace("{usd}", rgUSD(d.total_usd)).replace("{a}", d.aliada).replace("{ref}", d.ref)) + '</p>' +
    '<p class="rg-ref">' + rgEsc(d.ref) + '</p>' +
    '<p class="rg-usd-acc"><a class="btn btn-g" href="' + rgEsc(d.url) + '" target="_blank" rel="noopener">' + rgEsc(t("rg.usd.ir").replace("{a}", d.aliada)) + '</a> ' +
    '<a class="btn btn-o" href="' + rgEsc(d.seguimiento) + '">' + rgEsc(t("rg.seg.ir")) + '</a></p>';
  s.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- el seguimiento de un pedido ---------- */
var RG_PASOS = ["financiado", "comprado", "despachado", "entregado"];
function rgSeguimiento(ref, tk){
  var sec = rgEl("rg-seguimiento"), cuerpo = rgEl("rg-seg-cuerpo");
  if (!sec || !cuerpo) return;
  sec.hidden = false;
  cuerpo.textContent = t("rg.cargando");
  fetch("/api/regalos/pedido/" + encodeURIComponent(ref) + "?t=" + encodeURIComponent(tk))
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if (!d) { cuerpo.textContent = t("rg.seg.no"); return; }
      RG.seg = { ref: ref, tk: tk, d: d };
      rgPintaSeg();
      /* Quien llega desde el correo viene a esto, no al catálogo: se le lleva
         ahí una sola vez, no en cada consulta de las que siguen. */
      if (!RG.segVisto) { RG.segVisto = true; sec.scrollIntoView({ block: "start" }); }
      /* Recién vuelto de pagar, el webhook puede tardar unos segundos. */
      if (d.estado === "pendiente" && d.via === "cop" && (RG.segIntentos || 0) < 8) {
        RG.segIntentos = (RG.segIntentos || 0) + 1;
        setTimeout(function(){ if (currentRoute === "regalos") rgSeguimiento(ref, tk); }, 4000);
      }
    })
    .catch(function(){ cuerpo.textContent = t("rg.e.red"); });
}
function rgPintaSeg(){
  if (!RG.seg) return;
  var d = RG.seg.d, cuerpo = rgEl("rg-seg-cuerpo");
  var estado = d.estado === "pendiente" && d.pago === "rechazada" ? "fallido" : d.estado;
  var total = d.via === "usd" ? rgUSD(d.total_usd) : rgCOP(d.total_cop);
  var cab = '<dl class="rec-list rg-seg-cab">' +
    '<div class="rec-item"><dt>' + rgEsc(t("rg.seg.pedido")) + '</dt><dd>' + rgEsc(d.ref) + '</dd></div>' +
    '<div class="rec-item"><dt>' + rgEsc(t("rg.seg.estado")) + '</dt><dd>' + rgEsc(t("rg.pe." + estado)) + '</dd></div>' +
    '<div class="rec-item"><dt>' + rgEsc(t("rg.total")) + '</dt><dd>' + rgEsc(total) + '</dd></div>' +
    (d.guia ? '<div class="rec-item"><dt>' + rgEsc(t("rg.seg.guia")) + '</dt><dd><a href="/?g=' + encodeURIComponent(d.guia) + '#rastrea">' + rgEsc(d.guia) + '</a></dd></div>' : '') +
    (d.aliada ? '<div class="rec-item"><dt>' + rgEsc(t("rg.seg.aliada")) + '</dt><dd>' + rgEsc(d.aliada) + '</dd></div>' : '') +
    '</dl>' +
    (d.aliada_url ? '<p><a class="btn btn-g" href="' + rgEsc(d.aliada_url) + '" target="_blank" rel="noopener">' + rgEsc(t("rg.usd.ir").replace("{a}", d.aliada)) + '</a></p>' : '');
  var items = (d.items || []).map(function(it){
    var nota = "";
    if (it.resultado === "sustituido") nota = '<p class="rg-seg-nota">' + rgEsc(t("rg.seg.sust")) + '</p>';
    if (it.estado === "sin_cupo") nota = '<p class="rg-seg-nota">' + rgEsc(t("rg.seg.sincupo")) + '</p>';
    var linea = RG_PASOS.map(function(p){
      var f = it[p + "_en"];
      return '<li class="' + (f ? 'is-on' : '') + '"><span>' + rgEsc(t("rg.paso." + p)) + '</span>' +
        (f ? '<span class="mu">' + rgEsc(rgFecha(f.slice(0, 10))) + (p === "entregado" && it.acta ? ' · ' + rgEsc(t("rg.seg.acta").replace("{a}", it.acta)) : '') + '</span>' : '') + '</li>';
    }).join("");
    return '<article class="rg-seg-item"><p class="rg-quien"><strong>' + rgEsc(it.nombre) + '</strong>, ' + rgEsc(rgEdad(it.edad)) +
      ' · ' + rgEsc(lang === "en" && it.deseo_en ? it.deseo_en : it.deseo_es) + '</p>' +
      '<p class="rg-donde">' + rgEsc((lang === "en" ? it.zona_en : it.zona_es) + " · " + it.departamento) + ' · ' + rgEsc(it.codigo) + '</p>' +
      nota + (it.estado === "sin_cupo" || it.estado === "apartado" ? '' : '<ol class="rg-linea">' + linea + '</ol>') + '</article>';
  }).join("");
  cuerpo.innerHTML = cab + '<div class="rg-seg-items">' + items + '</div>';
}
