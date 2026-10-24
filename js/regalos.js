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
/* El moño del regalo envuelto (las tarjetas sin foto). */
var RG_MONO = '<span class="rg-mono" aria-hidden="true"><svg viewBox="0 0 48 30">' +
  '<path class="rg-cola" d="M20 15l-7 12M28 15l7 12"/>' +
  '<path class="rg-lazo" d="M24 14C18 2 5 1 5 8.5c0 6.5 11 7.5 19 5.5zM24 14c6-12 19-13 19-5.5 0 6.5-11 7.5-19 5.5z"/>' +
  '<circle class="rg-lazo" cx="24" cy="14" r="3.6"/></svg></span>';
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

/* LOS ÁRBOLES (pedido de Sebas, 24 oct 2026: «mejor un árbol de Navidad por
   cada zona que un cuadrado lleno de luces»). Cada árbol tiene EXACTAMENTE
   tantas luces como la meta de su zona —400, 200, 400—, así que el de Medellín
   es más pequeño: el tamaño también es un dato. Las filas crecen de dos en dos
   (1, 3, 5…) y lo que sobra o falta para llegar a la meta se reparte en las de
   abajo. Las luces se encienden repartidas por el árbol, siempre en el mismo
   orden para cada zona (no cambian de sitio al recargar): primero las
   entregadas, después las financiadas. La estrella se enciende cuando la zona
   llega a su meta. */
var RG_PASO = 10;
/* Tres pisos, como un pino: cada piso arranca más angosto que donde terminó
   el de arriba. Se busca el ancho cuya suma de luces se acerque más a la meta
   y la diferencia se reparte en las filas más anchas, así que el árbol tiene
   EXACTAMENTE meta luces. */
function rgFormaArbol(W){
  var R = Math.max(3, Math.round(W * 0.9)), r1 = Math.round(R * 0.3), r2 = Math.round(R * 0.33), r3 = R - r1 - r2;
  var tramos = [[1, W * 0.42, r1], [W * 0.24, W * 0.7, r2], [W * 0.44, W, r3]], filas = [];
  tramos.forEach(function(t){
    for (var i = 0; i < t[2]; i++) filas.push(Math.max(1, Math.round(t[0] + (t[1] - t[0]) * (t[2] > 1 ? i / (t[2] - 1) : 1))));
  });
  return filas;
}
function rgFilasArbol(meta){
  if (meta < 1) return [1];
  /* Una meta muy pequeña no alcanza para tres pisos: un triángulo simple. */
  if (meta < 12){ var t = [], n = 0; for (var q = 1; n < meta; q++){ t.push(Math.min(q, meta - n)); n += t[t.length - 1]; } return t; }
  var mejor = null, W, f, s;
  for (W = 3; W < 200; W++){
    f = rgFormaArbol(W); s = f.reduce(function(a, b){ return a + b; }, 0);
    if (!mejor || Math.abs(s - meta) < Math.abs(mejor.s - meta)) mejor = { f: f, s: s };
    if (s > meta * 1.3) break;
  }
  var filas = mejor.f.slice(), suma = mejor.s, orden = filas.map(function(w, i){ return i; })
    .sort(function(x, y){ return filas[y] - filas[x]; }), k = 0;
  while (suma !== meta && k < 100000){
    var i = orden[k % orden.length];
    if (suma < meta){ filas[i]++; suma++; } else if (filas[i] > 1){ filas[i]--; suma--; }
    k++;
  }
  return filas;
}
function rgOrden(total, semilla){
  var h = 2166136261, k, orden = [];
  for (k = 0; k < semilla.length; k++) h = Math.imul(h ^ semilla.charCodeAt(k), 16777619);
  for (k = 0; k < total; k++) orden.push(k);
  for (k = total - 1; k > 0; k--){
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ k; h = (h ^ (h >>> 13)) >>> 0;
    var x = h % (k + 1), t = orden[k]; orden[k] = orden[x]; orden[x] = t;
  }
  return orden;
}
function rgArbol(z, ent, fin){
  var filas = rgFilasArbol(Number(z.meta) || 0), ancho = Math.max.apply(null, filas), alto = filas.length;
  var dy = RG_PASO * 1.3, top = 30, cx = (ancho - 1) * RG_PASO / 2 + 12;
  var w = (ancho - 1) * RG_PASO + 24, h = top + (alto - 1) * dy + 34;
  var pos = [], f, c;
  for (f = 0; f < alto; f++) for (c = 0; c < filas[f]; c++) pos.push([cx + (c - (filas[f] - 1) / 2) * RG_PASO, top + f * dy]);
  var orden = rgOrden(pos.length, z.id), estado = new Array(pos.length);
  for (c = 0; c < orden.length; c++) estado[orden[c]] = c < ent ? "e" : c < fin ? "f" : "";
  var luces = pos.map(function(p, k){
    var s = estado[k];
    return '<circle class="rg-l' + (s ? ' is-' + s : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) +
      '" r="' + (s === "e" ? 3 : s === "f" ? 2.7 : 1.7) + '"/>';
  }).join("");
  /* La silueta: un verde muy suave detrás de cada piso. Un piso nuevo empieza
     donde una fila es más angosta que la anterior. */
  var pisos = [], ini = 0;
  for (f = 1; f <= alto; f++) if (f === alto || filas[f] < filas[f - 1]) { pisos.push([ini, f - 1]); ini = f; }
  var follaje = pisos.map(function(p){
    var y0 = top + p[0] * dy - dy * 0.8, y1 = top + p[1] * dy + dy * 0.55;
    var a0 = (filas[p[0]] - 1) / 2 * RG_PASO + 5, a1 = (filas[p[1]] - 1) / 2 * RG_PASO + 9;
    return '<path class="rg-follaje" d="M' + (cx - a0).toFixed(1) + ' ' + y0.toFixed(1) + 'L' + (cx + a0).toFixed(1) + ' ' + y0.toFixed(1) +
      'L' + (cx + a1).toFixed(1) + ' ' + y1.toFixed(1) + 'L' + (cx - a1).toFixed(1) + ' ' + y1.toFixed(1) + 'Z"/>';
  }).join("");
  var lleno = fin >= z.meta && z.meta > 0;
  var estrella = '<path class="rg-astro' + (lleno ? ' is-llena' : '') + '" transform="translate(' + cx.toFixed(1) +
    ' 14) scale(1.6)" d="M0-7l2 4.6 5 .5-3.8 3.3 1.1 4.9L0 2.8-4.3 5.3l1.1-4.9L-7-2.9l5-.5z"/>';
  var tronco = '<rect class="rg-tronco" x="' + (cx - 7).toFixed(1) + '" y="' + (top + (alto - 1) * dy + 10).toFixed(1) + '" width="14" height="14" rx="2"/>';
  return { svg: '<svg class="rg-arbol" viewBox="0 0 ' + w.toFixed(0) + ' ' + h.toFixed(0) + '" preserveAspectRatio="xMidYMax meet">' +
    tronco + follaje + luces + estrella + '</svg>', w: w };
}
function rgPintaZonas(){
  var d = RG.datos, caja = rgEl("rg-zonas");
  if (!caja) return;
  var borrador = !d.campana || d.campana.estado === "borrador";
  var loc = lang === "en" ? "en-US" : "es-CO";
  var arboles = (d.zonas || []).map(function(z){
    var meta = Number(z.meta) || 0;
    return rgArbol(z, Math.min(z.entregados, meta), Math.min(z.financiados, meta));
  });
  var mayor = Math.max.apply(null, arboles.map(function(a){ return a.w; }).concat([1]));
  caja.innerHTML = (d.zonas || []).map(function(z, k){
    var meta = Number(z.meta) || 0, ent = Math.min(z.entregados, meta), fin = Math.min(z.financiados, meta);
    var nombre = lang === "en" ? z.nombre_en : z.nombre_es;
    return '<div class="rg-zona">' +
      '<div class="rg-luces" role="img" style="--rg-ancho:' + (arboles[k].w / mayor * 100).toFixed(1) + '%" aria-label="' +
        rgEsc(nombre + ": " + t("rg.zona.aria").replace("{f}", fin).replace("{m}", meta)) + '">' + arboles[k].svg + '</div>' +
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
    : RG_MONO + '<span class="rg-ini" aria-hidden="true">' + rgEsc(String(r.nombre || "?").charAt(0)) + '</span>';
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
    cert_doc_numero: rgEl("rg-docnum").value.trim(), cert_ciudad: rgEl("rg-ciudad").value.trim(), muro: "no",
    carta: rgEl("rg-carta").value, firma: rgEl("rg-firma").value.trim(), noticias: rgEl("rg-noticias").checked
  };
  var btn = rgEl("rg-enviar");
  btn.disabled = true; RG.enviando = true;
  allyMsg(note, t("rg.enviando"), true);
  fetch("/api/regalos/pedido", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) })
    .then(function(r){ return r.json().then(function(j){ if (!r.ok) { var e = new Error(j.error || "http_" + r.status); e.datos = j; throw e; } return j; }); })
    .then(function(d){
      RG.lista = []; rgGuardaLista();
      var sigue = function(){
        if (d.via === "cop") {
          try { sessionStorage.setItem("gg_guia", d.guia); } catch (e) {}
          window.location.href = d.url;
          return;
        }
        RG.enviando = false; btn.disabled = false;
        rgPintaUsd(d);
      };
      /* El video sube ANTES de ir a pagar: después, el donante ya se fue a la
         pasarela. Si falla, el pago sigue igual y lo puede subir desde su
         enlace de seguimiento. */
      if (!RG.video) { sigue(); return; }
      rgSubirVideo(d.ref, d.token, RG.video, function(p){ allyMsg(note, t("rg.video.subiendo").replace("{p}", p), true); })
        .then(function(){ RG.video = null; sigue(); },
              function(){ allyMsg(note, t("rg.video.fallo"), false); setTimeout(sigue, 4000); });
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

/* ---------- la carta y el video ---------- */
function rgCartaCuenta(el){
  var n = el && el.parentNode && el.parentNode.querySelector(".rg-cuenta-c");
  if (n) n.textContent = el.value.length + " / 1200";
}
function rgTipoVideo(f){
  if (f.type) return f.type;
  var e = String(f.name || "").split(".").pop().toLowerCase();
  return { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" }[e] || "";
}
/* La duración la mide el navegador con los metadatos del archivo, sin
   reproducirlo. De 30 s a 1 min, con dos segundos de holgura en cada punta. */
function rgVideo(input){
  var f = input.files && input.files[0], caja = input.closest(".rg-video");
  var info = caja.querySelector(".rg-video-info"), quitar = caja.querySelector(".rg-quitar");
  input.value = "";
  if (!f) return;
  RG.video = null; quitar.hidden = true;
  var tipo = rgTipoVideo(f);
  if (["video/mp4", "video/quicktime", "video/webm"].indexOf(tipo) < 0) { info.textContent = t("rg.video.tipo"); return; }
  if (f.size > 90 * 1048576) { info.textContent = t("rg.video.pesado"); return; }
  info.textContent = t("rg.cargando");
  var v = document.createElement("video"), u = URL.createObjectURL(f);
  v.preload = "metadata"; v.muted = true;
  var medido = function(s){
    URL.revokeObjectURL(u);
    if (!isFinite(s) || !s) { info.textContent = t("rg.video.ilegible"); return; }
    if (s < 28 || s > 62) { info.textContent = t("rg.video.dur").replace("{s}", Math.round(s)); return; }
    RG.video = { file: f, tipo: tipo, seg: Math.round(s) };
    info.textContent = t("rg.video.listo").replace("{s}", Math.round(s)).replace("{mb}", (f.size / 1048576).toFixed(1));
    quitar.hidden = false;
  };
  v.onloadedmetadata = function(){
    if (isFinite(v.duration)) { medido(v.duration); return; }
    /* Los WebM que graba Chrome no traen la duración en la cabecera y el
       navegador dice Infinity. Pedirle un instante imposible lo obliga a
       recorrer el archivo y la duración aparece. */
    v.ondurationchange = function(){ if (isFinite(v.duration)) { v.ondurationchange = null; medido(v.duration); } };
    v.currentTime = 1e7;
  };
  v.onerror = function(){ URL.revokeObjectURL(u); info.textContent = t("rg.video.ilegible"); };
  v.src = u;
}
function rgVideoQuitar(btn){
  RG.video = null;
  var caja = btn.closest(".rg-video");
  caja.querySelector(".rg-video-info").textContent = t("rg.video.ayuda");
  btn.hidden = true;
}
/* Con XMLHttpRequest y no con fetch: fetch no informa el avance de una subida,
   y un minuto de video con mala señal puede tardar. */
function rgSubirVideo(ref, token, v, avance){
  return new Promise(function(ok, mal){
    var x = new XMLHttpRequest();
    x.open("PUT", "/api/regalos/pedido/" + encodeURIComponent(ref) + "/video?t=" + encodeURIComponent(token) + "&seg=" + v.seg);
    x.setRequestHeader("content-type", v.tipo);
    x.upload.onprogress = function(e){ if (e.lengthComputable) avance(Math.round(e.loaded * 100 / e.total)); };
    x.onload = function(){ x.status >= 200 && x.status < 300 ? ok() : mal(new Error("http_" + x.status)); };
    x.onerror = function(){ mal(new Error("red")); };
    x.send(v.file);
  });
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
  cuerpo.innerHTML = cab + '<div class="rg-seg-items">' + items + '</div>' + rgSegCarta(d);
}
function rgSegCarta(d){
  var m = d.mensaje, h = '<div class="rg-seg-carta"><h3 class="h-comp4">' + rgEsc(t("rg.carta.seg")) + '</h3>';
  if (m) {
    h += '<p class="rg-seg-estado is-' + rgEsc(m.estado) + '">' + rgEsc(t("rg.carta.e." + m.estado)) +
      (m.motivo ? ': ' + rgEsc(m.motivo) : '') + '</p>';
    if (m.carta) h += '<blockquote class="rg-seg-texto">' + rgEsc(m.carta) + (m.firma ? '<span class="rg-seg-firma">' + rgEsc(m.firma) + '</span>' : '') + '</blockquote>';
    if (m.video) h += '<p class="mu">' + rgEsc(t("rg.carta.convideo").replace("{s}", m.video_seg || "?")) + '</p>';
  } else {
    h += '<p class="mu">' + rgEsc(t(d.mensaje_editable ? "rg.carta.aun" : "rg.carta.no")) + '</p>';
  }
  if (d.mensaje_editable) {
    h += '<form class="ally-form rg-form" data-submit="rgSegGuardar(event)" novalidate>' +
      '<div class="field"><label for="rg-s-carta">' + rgEsc(t("rg.carta.txt")) + '</label>' +
      '<textarea id="rg-s-carta" rows="5" maxlength="1200" data-input="rgCartaCuenta(this)">' + rgEsc(m ? m.carta : "") + '</textarea>' +
      '<span class="rg-cuenta-c">' + (m ? m.carta.length : 0) + ' / 1200</span></div>' +
      '<div class="field"><label for="rg-s-firma">' + rgEsc(t("rg.carta.firma")) + '</label><input id="rg-s-firma" maxlength="80" value="' + rgEsc(m ? m.firma : "") + '"></div>' +
      '<div class="rg-video"><p class="rg-video-t">' + rgEsc(t(m && m.video ? "rg.video.cambiar" : "rg.video.t")) + '</p><div class="rg-video-acc">' +
      '<label class="btn btn-w rg-video-btn" for="rg-s-cam">' + rgEsc(t("rg.video.grabar")) + '</label>' +
      '<input type="file" id="rg-s-cam" class="sr-only" accept="video/*" capture="user" data-change="rgVideo(this)">' +
      '<label class="btn btn-w rg-video-btn" for="rg-s-arc">' + rgEsc(t("rg.video.subir")) + '</label>' +
      '<input type="file" id="rg-s-arc" class="sr-only" accept="video/mp4,video/quicktime,video/webm" data-change="rgVideo(this)">' +
      '<button type="button" class="rg-quitar" hidden data-act="rgVideoQuitar(this)">' + rgEsc(t("rg.video.quitar")) + '</button></div>' +
      '<p class="rg-video-info">' + rgEsc(t("rg.video.ayuda")) + '</p></div>' +
      (m && m.video ? '<label class="ally-check"><input type="checkbox" id="rg-s-sinvideo"> <span>' + rgEsc(t("rg.video.borrar")) + '</span></label>' : '') +
      '<button type="submit" class="btn btn-g">' + rgEsc(t("rg.carta.guardar")) + '</button>' +
      '<p class="rg-msg" id="rg-s-msg" role="status" aria-live="polite"></p></form>';
  }
  return h + '</div>';
}
function rgSegGuardar(ev){
  if (ev && ev.preventDefault) ev.preventDefault();
  var s = RG.seg, note = rgEl("rg-s-msg");
  if (!s || RG.enviando) return false;
  var sin = rgEl("rg-s-sinvideo");
  RG.enviando = true;
  allyMsg(note, t("rg.enviando.carta"), true);
  fetch("/api/regalos/pedido/" + encodeURIComponent(s.ref) + "/mensaje?t=" + encodeURIComponent(s.tk), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ carta: rgEl("rg-s-carta").value, firma: rgEl("rg-s-firma").value, quitar_video: !!(sin && sin.checked && !RG.video) })
  }).then(function(r){ if (!r.ok) throw new Error("http_" + r.status); })
    .then(function(){
      if (!RG.video) return;
      return rgSubirVideo(s.ref, s.tk, RG.video, function(p){ allyMsg(note, t("rg.video.subiendo").replace("{p}", p), true); });
    })
    .then(function(){ RG.enviando = false; RG.video = null; RG.segIntentos = 99; rgSeguimiento(s.ref, s.tk); },
          function(){ RG.enviando = false; allyMsg(note, t("rg.e.red"), false); });
  return false;
}
