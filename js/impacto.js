/* ===== Give&Grow International - js/impacto.js =====
   LA PAGINA #impacto: la galeria de jornadas con su visor y el mapa de la red
   (que a su vez pide Leaflet a /vendor/ solo cuando se abre su pestaña). Vivia
   dentro de app.js y se mudo aqui el 13 oct 2026 para aligerar la primera carga.

   `IMG_BASE` y `fotoSrcset` se quedaron en app.js: las fichas tambien los usan.
   Script clasico, mismas globales; lo carga `cargarModulo("impacto")`.

   SI EDITAS ESTE ARCHIVO, su md5 (8 caracteres) va en `MODULOS_V` de app.js.
   El check #27 del gate lo exige. */
"use strict";

var GALLERY = [
  /* BRIGADA POR EL SISMO DEL 10 DE AGOSTO DE 2026 · van primero a propósito.
     No es orden de importancia: es la regla que el propio sitio publica en
     «Cómo medimos» —«preferimos la recencia al acumulado»— aplicada a la
     galería. La evidencia más reciente es la que dice si esto sigue vivo.

     LA FECHA DE CADA PIE ESTÁ VERIFICADA CONTRA EL EXIF DEL ARCHIVO, no contra
     el nombre de la carpeta de donde salió. Las carpetas del equipo en Drive
     decían «Marsella (viernes 21)», «El Aguila (sabado 22)» y «Manizales
     (domingo 23)», y el EXIF confirmó 2026:08:21, 2026:08:22 y 2026:08:23 en
     todas. Coincidieron. Si algún día se añaden más, se comprueba igual: un
     pie de foto con una fecha que el archivo desmiente es exactamente lo
     contrario de «evidencia, no promesas».

     LOS PIES DICEN SOLO LO QUE LA FOTO PRUEBA. «Muro colapsado», «apuntalado»
     y «bodega afectada» se ven. En la de Ansermanuevo se ve una casa con
     mampostería expuesta que PUEDE ser del sismo o puede ser obra sin
     terminar, así que dice «vivienda visitada», que es lo único verificable.
     Y en la de Manizales dice «revisión» sin decir de quién: los que aparecen
     con chaleco parecen autoridad municipal, y atribuirnos esa revisión sería
     falso. Es la misma línea que Mira Mi Casa sostiene al no declarar
     habitabilidad por fotos.

     LA DE MANIZALES ESTÁ RECORTADA A PROPÓSITO. En el original aparecía un
     NIÑO en el borde derecho. Sebas autorizó mostrar todas las fotos, y la
     autorización se respeta —por eso la foto entra—, pero CLAUDE.md da
     protección especial a menores bajo la Ley 1581 y esa autorización se dio
     sobre el conjunto, no sobre ese niño en particular. Se recortó el 22 %
     derecho: el menor sale del cuadro y la evidencia no se pierde — al
     contrario, se leen mejor las ventanas estalladas y los paneles de fachada
     desplazados. Si alguien recompone esta imagen desde el original, ese
     recorte hay que volver a hacerlo.

     SE MIRARON 33 Y ENTRARON 6. El material de origen es un carrete de cámara,
     no una galería: más de la mitad son tomas por el parabrisas, dentro del
     carro, fachadas sin nada legible o cielo. Tres que ya estaban convertidas
     se descartaron AL VERLAS AL TAMAÑO DE LA GRILLA, no antes: una tenía una
     cabeza desenfocada tapando el centro, otra el marco de la ventanilla
     ocupando un borde, y la tercera un techo de zinc comiéndose un tercio del
     cuadro. Rellenar con esas habría abaratado las que sí prueban algo. */
  {f:"jornadas/brigada_aguila_escombros.jpg", es:"Muro colapsado en El Águila, agosto 2026", en:"Collapsed wall in El Águila, August 2026"},
  {f:"jornadas/brigada_manizales_revision.jpg", es:"Revisión de un edificio afectado en Manizales", en:"Inspection of a damaged building in Manizales"},
  {f:"jornadas/brigada_aguila_apuntalado.jpg", es:"Edificio apuntalado en El Águila, agosto 2026", en:"Shored-up building in El Águila, August 2026"},
  {f:"jornadas/brigada_aguila_bodega.jpg", es:"Bodega afectada en El Águila, agosto 2026", en:"Damaged storehouse in El Águila, August 2026"},
  {f:"jornadas/brigada_ansermanuevo_vivienda.jpg", es:"Vivienda visitada en Ansermanuevo, agosto 2026", en:"Home visited in Ansermanuevo, August 2026"},
  {f:"jornadas/brigada_marsella_equipo.jpg", es:"Equipo en terreno, Marsella, agosto 2026", en:"Team in the field, Marsella, August 2026"},
  {f:"benef_01.jpg", es:"Comunidad acompañada en terreno", en:"Community accompanied in the field"},
  {f:"benef_03.jpg", es:"Impacto medible, personas reales", en:"Measurable impact, real people"},
  /* LAS DE LA GUAJIRA SON ANTERIORES A LA FUNDACIÓN (constituida el 11 abr 2025,
     sin operación ese año). Son trabajo de campo del fundador, y el pie lo dice:
     presentarlas como obra de la Fundación sería atribuirle lo que no hizo.
     Decisión de Sebas, 29 sep 2026. */
  {f:"campo_01.jpg", es:"Trabajo de campo del fundador en La Guajira, antes de constituir la Fundación", en:"The founder's field work in La Guajira, before the Foundation was constituted"},
  {f:"campo_04.jpg", es:"Acompañamiento continuo", en:"Continuous accompaniment"},
  {f:"jornadas/guajira_nina_naranja.webp", es:"La Guajira · enero de 2025 · trabajo de campo del fundador, antes de constituir la Fundación", en:"La Guajira · January 2025 · the founder's field work, before the Foundation was constituted"},
  {f:"jornadas/guajira_abuela.webp", es:"Tres generaciones bajo la enramada", en:"Three generations under the enramada"},
  {f:"jornadas/guajira_retrato_azul.webp", es:"Niñez wayuu, Alta Guajira", en:"Wayuu childhood, Alta Guajira"},
  {f:"jornadas/guajira_futbol.webp", es:"El juego también es acompañamiento", en:"Play is also accompaniment"},
  {f:"jornadas/guajira_sonrisa.webp", es:"Alegría documentada, no prometida", en:"Joy documented, not promised"},
  {f:"jornadas/guajira_hermanas.webp", es:"Hermanas en la jornada de enero", en:"Sisters at the January outreach"},
  {f:"jornadas/guajira_panoleta.webp", es:"Jornada de juguetes, La Guajira", en:"Toy drive day, La Guajira"},
  {f:"jornadas/guajira_atardecer.webp", es:"Atardecer en jornada comunitaria", en:"Sunset during a community day"},
  {f:"jornadas/guajira_bebe.webp", es:"Entrega de leche en jornada wayuu", en:"Milk delivery on a Wayuu outreach day"},
  {f:"jornadas/guajira_territorio.webp", es:"Territorio wayuu, Alta Guajira", en:"Wayuu territory, Alta Guajira"},
  {f:"jornadas/guajira_jornada.webp", es:"Equipo y comunidad, jornada wayuu", en:"Team and community, Wayuu outreach day"},
  {f:"jornadas/baile_flow_escenario.webp", es:"Flow Callejero en tarima (NDF)", en:"Flow Callejero on stage (NDF)"},
  {f:"jornadas/baile_presentacion.webp", es:"Presentación del Proyecto de Baile (NDF)", en:"Dance Project performance (NDF)"},
  {f:"jornadas/baile_grupo_estudio.webp", es:"Proyecto de Baile en el estudio (NDF)", en:"Dance Project at the studio (NDF)"},
  {f:"jornadas/mayores_manos.webp", es:"Visita a hogar de adultos mayores (2023)", en:"Visit to an elders’ home (2023)"},
  {f:"jornadas/mayores_alegria.webp", es:"La alegría también se entrega", en:"Joy is also delivered"}
];
var lbIndex = 0;
function initGallery(){
  var g = document.getElementById("gallery");
  if (!g || g.dataset.done) return;
  g.dataset.done = "1";
  GALLERY.forEach(function(item, i){
    var cap = item[lang] || item.es;
    // Miniatura ligera (400px) para la grilla; la imagen completa se carga en el lightbox.
    /* SIEMPRE .webp: las seis miniaturas que eran .jpg se convirtieron, y la
       carpeta ya no tiene ninguna. Si esto volviera a derivar la extensión del
       original, las de brigada pedirían un .jpg que ya no existe. */
    var thumb = item.f.indexOf("jornadas/")===0
      ? item.f.replace("jornadas/","jornadas/thumb/").replace(/\.[a-z]+$/i,".webp")
      : item.f;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gal-item";
    btn.setAttribute("aria-label", cap);
    var img = document.createElement("img");
    img.src = IMG_BASE + thumb;
    /* EL `sizes` DE ESTA REJILLA NO ES EL DE LA TIRA DE LAS FICHAS, y la
       diferencia importa: un `sizes` que le miente al navegador le hace elegir
       la variante equivocada con total confianza, sin avisar en ninguna parte.

       Hasta hoy los dos decian lo mismo porque `.gal-item` estaba declarado dos
       veces en styles.css sin acotar y la regla de la tira ganaba por orden de
       cascada, imponiendole a la rejilla su ancho de 300px. Ya no: cada bloque
       lleva su contenedor delante, y la celda vuelve a medir lo que dicta
       `.gallery`.

       De donde sale cada numero, leido de styles.css y comprobado midiendo:

         hasta 880px   el @media deja UNA columna, ancha como el `.wrap`
                       -> 100vw menos los 24px de padding de cada lado
         hasta 1120px  tres columnas dentro del `.wrap`, que todavia crece
                       -> (100vw - 48 de padding - 28 de los dos gap) / 3
         mas ancho     el `.wrap` topa en --maxw:1120px y la pista se congela
                       -> (1120 - 48 - 28) / 3 = 348px

       `fotoSrcset` solo ofrece 400w y 800w, asi que lo unico que decide de
       verdad es si el numero pasa de 400 (en pantalla 1x) o de 200 (en 2x).
       Por eso no vale redondear a "33vw": a 1440px eso pediria 475px y en 1x
       traeria la de 800 para dibujar 348. */
    var ss = fotoSrcset(item.f);
    if (ss){
      img.srcset = ss;
      img.sizes = "(max-width:880px) calc(100vw - 48px), "
                + "(max-width:1120px) calc((100vw - 76px) / 3), 348px";
    }
    img.alt = cap;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 400; img.height = 300;
    btn.appendChild(img);
    var capEl = document.createElement("span");
    capEl.className = "gal-cap";
    capEl.setAttribute("aria-hidden", "true");
    capEl.textContent = cap;
    btn.appendChild(capEl);
    btn.addEventListener("click", function(){ openGalleryLightbox(i); });
    g.appendChild(btn);
  });
}
/* LOS PIES DE FOTO SIGUEN AL IDIOMA (auditoría preevento, 12 oct 2026).
   `initGallery` arma la rejilla UNA vez, con el idioma de ese momento, y
   `applyLang` no la tocaba: quien abría #impacto en español y pasaba a inglés
   se quedaba con los once pies, los alt y los aria-label en español. Se
   reescriben en su sitio, sin rehacer las imágenes. */
function galeriaIdioma(){
  var g = document.getElementById("gallery");
  if (!g || !g.dataset.done) return;
  var items = g.querySelectorAll(".gal-item");
  for (var i = 0; i < items.length && i < GALLERY.length; i++){
    var cap = GALLERY[i][lang] || GALLERY[i].es;
    items[i].setAttribute("aria-label", cap);
    var im = items[i].querySelector("img"); if (im) im.alt = cap;
    var c = items[i].querySelector(".gal-cap"); if (c) c.textContent = cap;
  }
}
var lbTrigger = null;
function openGalleryLightbox(i){
  lbIndex = i;
  var item = GALLERY[i];
  var im = document.getElementById("lb-img");
  im.src = IMG_BASE + item.f;
  im.alt = item[lang] || item.es;
  document.getElementById("lb-cap").textContent = item[lang] || item.es;
  document.getElementById("lb-count").textContent = (i+1) + " / " + GALLERY.length;
  var lb = document.getElementById("lightbox");
  if (!lb.classList.contains("on")){
    lbTrigger = document.activeElement;       // recordar disparador para devolver el foco
    lb.classList.add("on");
    var x = lb.querySelector(".lb-x"); if (x) x.focus();
  }
}
function closeLightbox(){
  var lb = document.getElementById("lightbox");
  lb.classList.remove("on");
  if (lbTrigger && lbTrigger.focus){ lbTrigger.focus(); lbTrigger = null; }
}
function lbStep(d){ openGalleryLightbox((lbIndex + d + GALLERY.length) % GALLERY.length); }
document.addEventListener("keydown", function(e){
  var lb = document.getElementById("lightbox");
  if (!lb || !lb.classList.contains("on")) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") lbStep(-1);
  else if (e.key === "ArrowRight") lbStep(1);
  else if (e.key === "Tab"){                   // trampa de foco dentro del diálogo
    var foc = Array.prototype.filter.call(lb.querySelectorAll("button"), function(b){ return b.offsetParent !== null; });
    if (!foc.length) return;
    var first = foc[0], last = foc[foc.length-1], a = document.activeElement;
    if (e.shiftKey && a === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last){ e.preventDefault(); first.focus(); }
    else if (foc.indexOf(a) === -1){ e.preventDefault(); first.focus(); }
  }
});
document.addEventListener("click", function(e){
  var lb = document.getElementById("lightbox");
  if (lb && lb.classList.contains("on") && e.target === lb) closeLightbox();
});


/* Mapa día/noche: los tiles siguen el tema del sitio (v5 "mapa vivo") */
var GG_MAP=null, GG_TILE=null;
/* Lo que el mapa escribe con `t()` —leyenda, resumen y la ventanita de cada
   pin— no lleva `data-i18n`: sin guardarlo aquí, al cambiar de idioma se
   quedaba en el que tenía al abrirse. Lo repinta `mapaIdioma`. */
var GG_MAP_N=null, GG_MAP_LEYENDA=null, GG_MAP_PINES=[];
function ggTileUrl(){
  var dark = document.documentElement.getAttribute("data-theme")==="dark";
  return "https://{s}.basemaps.cartocdn.com/"+(dark?"dark_all":"light_all")+"/{z}/{x}/{y}{r}.png";
}
function ggMapTiles(){ if (GG_TILE) GG_TILE.setUrl(ggTileUrl()); }
function mapaPopup(pt){
  var area = pt.area ? (pt.area[lang]||pt.area.es||"") : (pt.areaKey ? t(pt.areaKey) : "");
  var html="<b>"+escapeHtml(pt.name)+"</b>"+(area?("<br>"+escapeHtml(area)):"");
  if (pt.type==="company"){
    if (pt.direccion) html += "<br>"+escapeHtml(pt.direccion);
    /* Los pines de empresa traían `ficha` solo si venían de Gratitud; una
       empresa aliada de partners.json con coordenadas enlazaba a «undefined».
       «Ver beneficio» solo para las de Gratitud, que son las que tienen uno:
       la ficha de una empresa aliada dice qué aporta, no un descuento. */
    html += '<br><a href="'+escapeHtml(pt.ficha || ("#empresa/"+encodeURIComponent(pt.id)))+'">'+t(pt.ficha ? "map.biz" : "map.ficha")+"</a>";
    if (pt.direccion) html += ' &middot; <a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(pt.direccion+", Colombia")+'" target="_blank" rel="noopener">'+t("com.maps")+"</a>";
  } else if (pt.url){
    html += '<br><a href="'+escapeHtml(pt.url)+'" target="_blank" rel="noopener">'+t("map.visit")+"</a>";
  }
  return html;
}
/* Los tres colores salen de los tokens y no escritos a mano: así la leyenda y
   los pines no pueden separarse, y el ámbar cambia con el modo noche igual que
   el resto del sitio. Mismas palabras que los filtros (`map.leg.*`). */
function mapaLeyenda(){
  if (!GG_MAP_LEYENDA) return;
  GG_MAP_LEYENDA.innerHTML='<span><i class="gg-dot" style="background:var(--gm)"></i>'+t("map.leg.f")+"</span>"
             +'<span><i class="gg-dot" style="background:var(--amber)"></i>'+t("map.leg.c")+"</span>"
             +'<span><i class="gg-dot" style="background:var(--g)"></i>'+t("map.leg.hub")+"</span>";
}
/* EL RESUMEN, contado de los datos reales y con la gramática de cada idioma:
   «1 fundación aliada», nunca «fundación(es)»; un grupo en cero no se nombra
   («reúne 0 empresas aliadas» se lee como un fallo, no como un dato), y el HUB
   va sin número porque es uno solo por definición. Mismos sustantivos que el
   filtro y la leyenda: «empresas aliadas», también para los comercios de
   Gratitud, que salen en esa misma red. */
function mapaResumen(){
  var el = document.getElementById("map-summary");
  if (!el || !GG_MAP_N) return;
  var n = GG_MAP_N, partes = [];
  var frase = function(c, k){ return c + " " + t("map.noun." + k + "." + (c === 1 ? "one" : "many")); };
  if (n.foundation) partes.push(frase(n.foundation, "f"));
  if (n.company) partes.push(frase(n.company, "c"));
  if (n.hub) partes.push(t("map.noun.h"));
  if (!partes.length){ el.textContent = ""; return; }
  var lista = partes.length === 1 ? partes[0]
    : partes.slice(0, -1).join(", ") + t("map.y") + partes[partes.length - 1];
  el.textContent = t("map.sum").replace("{lista}", lista);
}
function mapaIdioma(){
  mapaLeyenda();
  mapaResumen();
  for (var i=0;i<GG_MAP_PINES.length;i++) GG_MAP_PINES[i].mk.setPopupContent(mapaPopup(GG_MAP_PINES[i].pt));
}
function initMap(){
  var box = document.getElementById("map-box");
  if (!box || box.dataset.done) return;
  box.dataset.done = "1";
  function pin(tp){
    return L.divIcon({ className:"", html:'<span class="gg-pin gg-pin-'+tp+'"></span>', iconSize:[24,32], iconAnchor:[12,30], popupAnchor:[0,-26] });
  }
  function build(list){
    var map = L.map("map-box",{scrollWheelZoom:false}).setView([6.2442,-75.5812], 12);
    GG_MAP = map;
    GG_TILE = L.tileLayer(ggTileUrl(),
      {subdomains:"abcd", maxZoom:19, attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(map);
    var layers = { foundation:L.layerGroup(), company:L.layerGroup(), hub:L.layerGroup() };
    var counts = { foundation:0, company:0, hub:0 };
    var bounds=[];
    for (var i=0;i<list.length;i++){
      var pt=list[i];
      var lay = layers[pt.type] || layers.foundation;
      var mk = L.marker([pt.lat,pt.lng],{icon:pin(pt.type)}).addTo(lay).bindPopup(mapaPopup(pt));
      GG_MAP_PINES.push({ mk:mk, pt:pt });
      if (counts[pt.type]!=null) counts[pt.type]++;
      bounds.push([pt.lat,pt.lng]);
    }
    for (var ty in layers) layers[ty].addTo(map);
    if (bounds.length>1) map.fitBounds(bounds,{padding:[42,42]});
    var legend=L.control({position:"bottomleft"});
    legend.onAdd=function(){
      GG_MAP_LEYENDA=L.DomUtil.create("div","map-legend");
      mapaLeyenda();
      return GG_MAP_LEYENDA;
    };
    legend.addTo(map);
    /* Filtros de red + resumen honesto (calculado de los datos reales) */
    var fbox = document.getElementById("map-filters");
    if (fbox){
      var FILTERS = [
        {k:"all", key:"map.f.all"},
        {k:"foundation", key:"map.leg.f"},
        {k:"company", key:"map.leg.c"}
      ];
      fbox.innerHTML = FILTERS.map(function(f,fi){
        return '<button type="button" class="map-fchip'+(fi===0?' on':'')+'" data-k="'+f.k+'" data-i18n="'+f.key+'">'+t(f.key)+'</button>';
      }).join('');
      fbox.querySelectorAll(".map-fchip").forEach(function(b){
        b.addEventListener("click", function(){
          fbox.querySelectorAll(".map-fchip").forEach(function(x){ x.classList.toggle("on", x===b); });
          var k=b.dataset.k;
          for (var ty in layers){
            var show = (k==="all") || (ty===k) || (ty==="hub"); /* el HUB siempre visible: es el centro de la red */
            if (show) layers[ty].addTo(map); else map.removeLayer(layers[ty]);
          }
        });
      });
    }
    GG_MAP_N = counts;
    mapaResumen();
  }
  function start(){
    Promise.all([loadPartners(), loadGratitud()]).then(function(res){
      var list = (res[0] || []).slice();
      var comercios = (res[1] && res[1].comercios) || [];
      /* Una empresa puede estar en partners.json Y en Gratitud (su modalidad
         'gratitud'): con el mismo id es la misma, y se cuenta una vez. */
      var ya = {};
      for (var j=0;j<list.length;j++) if (list[j].id) ya[list[j].id] = true;
      for (var i=0;i<comercios.length;i++){
        var c = comercios[i];
        if (ya[c.id]) continue;
        if (c.status==="activa" && c.coords && typeof c.coords.lat==="number" && typeof c.coords.lng==="number"){
          list.push({ id:c.id, name:c.name, type:"company", lat:c.coords.lat, lng:c.coords.lng,
            area:{es:c.ciudad||"", en:c.ciudad||""}, ficha:"#comercio/"+c.id, direccion:c.direccion||"" });
        }
      }
      build(list);
    });
  }
  if (window.L){ start(); return; }
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/vendor/leaflet/leaflet.css";
  document.head.appendChild(css);
  var s = document.createElement("script");
  s.src = "/vendor/leaflet/leaflet.js";
  s.onload = start;
  document.body.appendChild(s);
}
