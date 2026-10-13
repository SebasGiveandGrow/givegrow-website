/* ===== Give&Grow International - js/mmc.js =====
   MIRA MI CASA: el formulario de la familia (#vivienda), la cola de subida de
   fotos, el banco publico (#casas), la fila del triaje y la postulacion de
   ingenieros (#ingenieros), el apadrinamiento (#apadrinar) y la pagina del caso
   (/caso/<n>). Vivia dentro de app.js y se mudo aqui el 13 oct 2026 para que la
   portada no descargue ~59 KB que solo usa quien entra a esas rutas.

   NO ES UN MODULO ES: es un script clasico, igual que app.js. Todo lo que
   define queda global como antes, y lo carga `cargarModulo("mmc")` de app.js
   al entrar a una de sus rutas o al pulsar uno de sus botones (ver
   `MODULOS_RUTA` y `ACT_DIFERIDAS` alli). Los textos siguen en el diccionario
   de app.js.

   SI EDITAS ESTE ARCHIVO, su md5 (8 caracteres) va en `MODULOS_V` de app.js
   —y entonces cambia app.js, y con el su `?v=` de index.html—. El check #27
   del gate lo exige. */
"use strict";

/* ===== Triage estructural de viviendas =====
   El caso se crea al terminar el paso 4 y las fotos suben DESPUÉS, de a una,
   contra el token que devuelve el servidor. Por eso el paso 3 solo acumula
   archivos en memoria hasta que hay caso: subir antes obligaría a crear el
   registro sin consentimiento, que es justo lo que no puede pasar. */
var CV = { caso:null, token:null, enlace:null, cola:[], total:0, hechas:0, fallidas:0 };
var CV_CATS = ["conjunto", "estructura", "dano", "entorno"];

function cvPaso(n){
  if (n === 3 && !cvValidarDatos()) return;
  ["cv-p1","cv-p2","cv-p3","cv-p4","cv-ok"].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = "none";
  });
  var destino = document.getElementById(n === 5 ? "cv-ok" : "cv-p" + n);
  if (destino) destino.style.display = "";
  if (n === 3) cvPintarCats();
  window.scrollTo(0, 0);
}

/* QUÉ FALTA, DÓNDE, Y CON EL CURSOR YA PUESTO AHÍ.
   Antes esto era `alert(t("cv.err.campos"))` — el único `alert()` de todo
   app.js— con un texto que listaba los TRES campos siempre: «Faltan datos: tu
   nombre, tu WhatsApp y el barrio». Si solo faltaba el teléfono, la persona
   tenía que revisar los tres.

   Tres cosas cambian, y la segunda es la que más importa:

     · se dice cuál falta, no la lista entera;
     · EL FOCO SE MUEVE al campo. Para quien usa lector de pantalla eso es la
       diferencia entre saber y adivinar; y para cualquiera en un teléfono, el
       campo entra en pantalla solo;
     · el aviso va a una región viva con `role="alert"` en el propio paso 2, en
       vez de un diálogo nativo que hay que cerrar.

   `aria-invalid` se pone y se QUITA: dejarlo puesto haría que el lector de
   pantalla siguiera anunciando el campo como inválido después de corregirlo.

   El orden de comprobación es el de la pantalla —nombre, WhatsApp, barrio— para
   que el salto del foco no vaya hacia atrás. */
function cvValidarDatos(){
  var v = function(id){ var e = document.getElementById(id); return e ? e.value.trim() : ""; };
  var msg = document.getElementById("cv-msg2");
  var limpiar = function(){
    ["cv-nombre","cv-tel","cv-sector"].forEach(function(id){
      var e = document.getElementById(id); if (e) e.removeAttribute("aria-invalid");
    });
    if (msg){ msg.textContent = ""; msg.style.color = ""; }
  };
  limpiar();

  var falta = null;
  if (!v("cv-nombre")) falta = ["cv-nombre", "cv.err.nombre"];
  else if (v("cv-tel").replace(/\D/g,"").length < 7) falta = ["cv-tel", "cv.err.tel"];
  else if (!v("cv-sector")) falta = ["cv-sector", "cv.err.sector"];
  if (!falta) return true;

  var campo = document.getElementById(falta[0]);
  if (campo){ campo.setAttribute("aria-invalid", "true"); }
  /* `var(--err)` Y NO LA CLASE `.err`, y esto se midió. La regla del sitio es
     `.pay-now-msg.err{color:#f0857a}` — ACOTADA a ese elemento, así que un
     `classList.add("err")` aquí no pintaba nada y el aviso salía del gris de
     `.mu`, indistinguible de una ayuda. Y ese salmón tampoco serviría: da 2.41:1
     sobre el papel del formulario, por debajo del 4.5 de AA. Donde sí se usa
     —sobre el azul oscuro del bloque de pago— da 6.50:1 y está bien.
     El token es consciente del tema y da 7.92:1 en modo día. */
  if (msg){ msg.textContent = t(falta[1]); msg.style.color = "var(--err)"; }
  /* El foco al final: si se moviera antes de escribir el mensaje, algunos
     lectores anunciarían el campo y se comerían el aviso. */
  if (campo) campo.focus();
  return false;
}

/* Una tarjeta por categoría, con su ayuda y su contador. Se arma en JS y no en
   el HTML para que las cuatro compartan comportamiento y el día que los
   ingenieros cambien la lista se toque un solo sitio. */
function cvPintarCats(){
  var cont = document.getElementById("cv-cats");
  if (!cont || cont.dataset.listo) return;
  var html = "";
  for (var i = 0; i < CV_CATS.length; i++){
    var c = CV_CATS[i];
    html += '<div class="ally-check" style="display:block">'
         +  '<b>' + escapeHtml(t("cv.cat." + c)) + '</b>'
         +  '<small style="display:block;color:var(--mu);margin:4px 0 10px">' + escapeHtml(t("cv.cat." + c + ".h")) + '</small>'
         +  '<label class="btn btn-o" style="display:inline-block;cursor:pointer">'
         +  '<span>' + escapeHtml(t("cv.add")) + '</span>'
         +  '<input type="file" accept="image/*,video/*" multiple '
         +  'data-cat="' + c + '" style="position:absolute;left:-9999px">'
         +  '</label> <span class="mu" id="cv-n-' + c + '">0</span>'
         +  '</div>';
  }
  cont.innerHTML = html;
  cont.dataset.listo = "1";
  cont.querySelectorAll("input[type=file]").forEach(function(inp){
    inp.addEventListener("change", function(){ cvArchivos(inp); });
  });
}

function cvArchivos(inp){
  var cat = inp.getAttribute("data-cat");
  for (var i = 0; i < inp.files.length; i++) CV.cola.push({ file: inp.files[i], cat: cat });
  var n = CV.cola.filter(function(x){ return x.cat === cat; }).length;
  var et = document.getElementById("cv-n-" + cat);
  if (et) et.textContent = n;
  inp.value = "";
}

function cvEnviar(){
  var msg = document.getElementById("cv-msg");
  if (!document.getElementById("cv-c1").checked){
    if (msg){ msg.textContent = t("cv.err.consent"); msg.style.color = "var(--err)"; }
    return;
  }
  if (!cvValidarDatos()) return;

  /* SIN FOTOS EL CASO NACE INEVALUABLE, y nadie se lo había dicho a la familia:
     el paso 3 se podía pasar de largo con la cola vacía y el servidor tampoco
     exige medios. Se avisa y se deja decidir — puede ser que de verdad no pueda
     tomarlas ahora, y en ese caso su caso igual debe entrar. */
  if (!CV.cola.length && !window.confirm(t("cv.err.sinfotos"))) return;

  /* EL BOTÓN SE BLOQUEA, y no es cosmético: sin esto un segundo toque —lo que
     hace cualquiera cuando la señal es mala y no sabe si se envió— creaba DOS
     casos, quemaba dos consecutivos que no se reinician nunca, y repartía las
     fotos entre los dos. Ninguno de los dos quedaba evaluable. */
  var btn = document.querySelector('[data-act="cvEnviar()"]');
  if (btn) btn.disabled = true;
  var soltar = function(){ if (btn) btn.disabled = false; };

  if (msg){ msg.textContent = t("cv.enviando"); msg.style.color = "var(--mu)"; }

  var val = function(id){ var e = document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e = document.getElementById(id); return !!(e && e.checked); };

  fetch("/api/caso", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nombre: val("cv-nombre"), tel: val("cv-tel"), email: val("cv-email"),
      sector: val("cv-sector"), direccion: val("cv-dir"),
      material: val("cv-material"), pisos: parseInt(val("cv-pisos"), 10) || 1,
      anio: val("cv-anio"), nota: val("cv-nota"),
      danio_previo: chk("cv-previo"), habitada: chk("cv-habitada"),
      heridos: chk("cv-heridos"), filtra_agua: chk("cv-filtra"),
      consent_eval: true, consent_publico: chk("cv-c2"),
      web2: val("cv-web2")
    })
  }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
   .then(function(res){
    var d = res.d || {};
    /* ANTES ERA `throw 0`, y eso colapsaba TODOS los errores del servidor en un
       solo mensaje: «revisa los datos e intenta otra vez». Es el peor consejo
       posible en los dos casos que más van a ocurrir hoy:

         · 429 demasiados_intentos → hay que ESPERAR, no reintentar. El servidor
           manda un `ayuda` bien escrito que el cliente tiraba a la basura.
         · 400 email_invalido → el correo es OPCIONAL, así que nadie sospecha de
           él; la familia queda trancada sin ninguna pista.

       Y el honeypot devuelve {ok:true, numero:null}: eso NO es un error del
       usuario, es un caso descartado a propósito, y merece su propio silencio. */
    if (!d.ok || !d.numero){
      var texto = t("cv.err.envio");
      /* EL HONEYPOT devuelve {ok:true, numero:null} y caía aquí con «revisa los
         datos e intenta otra vez» — el peor consejo posible, porque los datos
         están bien y no hay nada que revisar. El campo está bien escondido
         (tabindex -1, autocomplete off, aria-hidden, fuera de pantalla), así que
         que lo rellene una persona es improbable; pero si pasa, que tenga una
         salida en vez de un callejón. */
      if (d.ok && !d.numero && !d.error) texto = t("cv.err.raro");
      else if (d.error === "demasiados_intentos") texto = d.ayuda || t("cv.err.espera");
      else if (d.error === "email_invalido")  texto = t("cv.err.correo");
      else if (d.ayuda)                       texto = d.ayuda;
      if (msg){ msg.textContent = texto; msg.style.color = "var(--err)"; }
      soltar();
      return;
    }
    CV.caso = d.numero; CV.token = d.token;
    var num = document.getElementById("cv-num");
    if (num) num.textContent = d.numero;
    /* EL ENLACE, no solo el número. El token es lo que permite consultar el
       caso y abrir el informe, y sin él la familia se queda sin poder ver su
       propio documento — lo descubrió la primera prueba real.

       Apunta a la PÁGINA del caso y no al PDF. El PDF no existe hasta que un
       ingeniero evalúe, así que hasta entonces ese enlace no abría nada; y
       cuando el ingeniero pide más fotos, un PDF es justo lo que no sirve para
       mandárselas. La página funciona en los dos momentos. */
    CV.enlace = origenTriaje() + "/caso/" + encodeURIComponent(d.numero) +
                "?t=" + encodeURIComponent(d.token);
    var lnk = document.getElementById("cv-enlace");
    if (lnk) { lnk.textContent = CV.enlace; lnk.href = CV.enlace; }
    /* El mismo enlace, listo para reenviar. Sin número en `wa.me`: así abre el
       selector de contactos en vez de un chat con la fundación, y «Enviarme a
       mí» —que es lo que dice el texto— queda a un toque. */
    var wa = document.getElementById("cv-wa");
    if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(t("cv.wa.texto") + " " + CV.enlace);
    /* Y EL TELÉFONO SE LO GUARDA. Este es el único instante en toda la vida del
       caso en que el navegador tiene el token: si no se guarda aquí, la única
       copia es la pantalla que la familia está mirando. */
    mmcCasoGuardar(d.numero, CV.enlace);
    cvPaso(5);
    cvSubirCola();
  }).catch(function(){
    if (msg){ msg.textContent = t("cv.err.envio"); msg.style.color = "var(--err)"; }
    soltar();
  });
}

/* ===== Preparar el archivo ANTES de subirlo =====
   Lo que arregla: un teléfono de hoy saca fotos de 3 a 5 MB. Con veinte
   archivos por caso, una familia podía estar subiendo 40 u 80 MB por la red de
   una zona a la que se le acaba de caer media torre. Suben de a una y en serie
   —que es lo correcto—, así que eso son diez minutos con la pantalla abierta,
   y cada corte obliga a empezar ese archivo otra vez.

   1600 px de lado largo NO es un recorte al criterio del ingeniero: una grieta
   fotografiada con una moneda al lado se lee perfectamente a ese tamaño, y es
   lo que la guía pide mirar. Lo que se tira es resolución que nadie iba a usar.

   LAS REGLAS, reescritas en la auditoría del 28 sep 2026:

   1. TODA FOTO PASA POR EL CANVAS, aunque ya sea pequeña. Antes, si la versión
      comprimida pesaba más, se subía el original — y el original lleva el EXIF,
      con las coordenadas GPS de la casa. La dirección de la familia es lo único
      que el sitio promete no publicar nunca, y el ingeniero no la ve; no puede
      llegarle metida dentro de una foto. Redibujar en el canvas descarta el EXIF
      entero.
   2. Si el canvas NO puede —navegador viejo, archivo raro, sin memoria— el
      original solo sale si el servidor lo acepta, y si es JPEG se le arrancan
      antes sus bloques EXIF (`quitarExifJpeg`). Lo que el servidor va a rechazar
      se para AQUÍ, con su motivo, en vez de gastar los datos de la familia en
      subirlo para oír un «no» que antes nadie le traducía.
   3. HEIC: el iPhone lo guarda así. Safari lo sabe dibujar y sale como JPEG;
      Chrome no, y ahí se le dice a la familia qué hacer en vez de callar.
   4. `imageOrientation:"from-image"` no es opcional. Sin eso, las fotos
      tomadas en vertical llegan giradas 90°, porque el dato de rotación vive
      en el EXIF y el canvas lo descarta al dibujar.
   5. Los VIDEOS no se tocan: comprimir video en el navegador es caro, lento y
      se come la batería. Y pueden llevar la ubicación, así que el formulario lo
      advierte al lado del botón. */

var FOTO_LADO = 1600;
var FOTO_CALIDAD = 0.8;
/* Lo mismo que acepta `TIPOS_MEDIO` en worker.js, con sus mismos topes en MB.
   Si uno cambia, el otro también: la pantalla no puede dejar pasar lo que el
   servidor va a rechazar. */
var MEDIO_TIPOS = { "image/jpeg": 8, "image/png": 8, "image/webp": 8, "video/mp4": 60, "video/quicktime": 60 };

function esHeic(f){
  return /image\/hei[cf]/i.test((f && f.type) || "") || /\.hei[cf]$/i.test((f && f.name) || "");
}
function tipoDe(f){
  if (f.type) return f.type;
  /* Algunos Android entregan el archivo sin tipo. Sin él la cabecera sale vacía
     y el servidor lo rechaza con un 415 que la familia no entendería. */
  if (/\.mp4$/i.test(f.name || "")) return "video/mp4";
  if (/\.mov$/i.test(f.name || "")) return "video/quicktime";
  if (/\.jpe?g$/i.test(f.name || "")) return "image/jpeg";
  return "";
}
function rechazoLocal(clave, mb){
  var e = new Error(clave); e.motivo = clave; e.mb = mb; return e;
}

function redibujarFoto(file){
  if (typeof createImageBitmap !== "function" || !document.createElement("canvas").toBlob) {
    return Promise.reject(new Error("sin canvas"));
  }
  return createImageBitmap(file, { imageOrientation: "from-image" })
    /* Hay Safari que no acepta el segundo argumento: se intenta sin él antes de
       rendirse, porque ahí la orientación ya la aplica el propio navegador. */
    .catch(function(){ return createImageBitmap(file); })
    .then(function(img){
      var lado = Math.max(img.width, img.height);
      var escala = lado > FOTO_LADO ? FOTO_LADO / lado : 1;
      var w = Math.round(img.width * escala), h = Math.round(img.height * escala);
      var cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      if (img.close) img.close();
      return new Promise(function(res, rej){
        cv.toBlob(function(blob){ if (blob && blob.size) res(blob); else rej(new Error("toBlob vacio")); },
                  "image/jpeg", FOTO_CALIDAD);
      });
    });
}

/* Último recurso para un JPEG que el canvas no pudo redibujar: se copian sus
   segmentos saltando los APP1 (EXIF y XMP, que es donde viaja el GPS). La
   imagen en sí no se toca: desde el inicio del barrido se copia tal cual. */
function quitarExifJpeg(file){
  if (!file.arrayBuffer) return Promise.resolve(file);
  return file.arrayBuffer().then(function(buf){
    var b = new Uint8Array(buf);
    if (b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) return file;
    var partes = [b.subarray(0, 2)], i = 2;
    while (i + 4 <= b.length && b[i] === 0xFF){
      var m = b[i + 1];
      if (m === 0xDA) break;                       /* empieza la imagen: se copia todo */
      var largo = (b[i + 2] << 8) + b[i + 3];
      if (largo < 2 || i + 2 + largo > b.length) return file;   /* raro: mejor no tocar */
      if (m !== 0xE1) partes.push(b.subarray(i, i + 2 + largo));
      i += 2 + largo;
    }
    partes.push(b.subarray(i));
    return new Blob(partes, { type: "image/jpeg" });
  }).catch(function(){ return file; });
}

function prepararArchivo(file){
  var tipo = tipoDe(file);
  if (tipo.indexOf("video/") === 0){
    if (!MEDIO_TIPOS[tipo]) return Promise.reject(rechazoLocal("tipo"));
    if (file.size > MEDIO_TIPOS[tipo] * 1048576) return Promise.reject(rechazoLocal("grande", MEDIO_TIPOS[tipo]));
    return Promise.resolve(file.type ? file : new Blob([file], { type: tipo }));
  }
  return redibujarFoto(file).catch(function(){
    if (esHeic(file)) throw rechazoLocal("heic");
    if (!MEDIO_TIPOS[tipo]) throw rechazoLocal("tipo");
    if (file.size > MEDIO_TIPOS[tipo] * 1048576) throw rechazoLocal("grande", MEDIO_TIPOS[tipo]);
    return tipo === "image/jpeg" ? quitarExifJpeg(file) : file;
  });
}

/* Una sola función de subida para las DOS pantallas que suben fotos: la del
   formulario y la de «mi caso». Devuelve también el `status`, que es lo que
   distingue «el servidor dijo que no» de «el servidor no estaba». */
function subirMedio(caso, token, item){
  return prepararArchivo(item.file).then(function(archivo){
    var url = "/api/caso/" + encodeURIComponent(caso) + "/medio?t=" + encodeURIComponent(token)
            + (item.cat ? "&cat=" + encodeURIComponent(item.cat) : "");
    return fetch(url, {
      method: "POST",
      headers: { "content-type": archivo.type || tipoDe(item.file) },
      body: archivo
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, status: r.status, d: d }; }); });
  });
}

/* Qué se le dice a la familia de un archivo que no entró, con la razón que dio
   el servidor —o la que vimos antes de subirlo— y lo que puede hacer. Antes los
   rechazos solo se contaban: «guardamos 3 de 5», sin decir cuáles ni por qué,
   y la clave `cv.err.grande` existía sin que nada la usara. */
function motivoSubida(item, clave, mb){
  var nombre = (item.file && item.file.name) || t("cv.err.archivo");
  var txt = clave === "heic"    ? t("cv.err.heic")
          : clave === "grande"  ? t("cv.err.grande").replace("{mb}", mb || "")
          : clave === "tipo"    ? t("cv.err.tipo")
          : clave === "nofoto"  ? t("cv.err.nofoto")
          : clave === "tope"    ? t("mc.add.tope")
          : clave === "cerrado" ? t("cv.err.cerrado")
          : t("cv.err.subir");
  return nombre + ": " + txt;
}
function motivoServidor(item, res){
  var d = res.d || {};
  if (res.status === 413 || d.error === "archivo_muy_grande") return motivoSubida(item, "grande", d.max_mb);
  if (res.status === 415 || d.error === "tipo_no_permitido") return motivoSubida(item, esHeic(item.file) ? "heic" : "tipo");
  if (d.error === "archivo_no_es_foto") return motivoSubida(item, "nofoto");
  if (d.error === "demasiados_medios") return motivoSubida(item, "tope");
  if (d.error === "caso_terminado") return motivoSubida(item, "cerrado");
  return motivoSubida(item, "");
}
/* Lo que se arregla solo esperando: el servidor caído, el tope de peticiones.
   Todo lo demás es un «no» sobre el archivo, y reintentarlo no lo cambia. */
function esPasajero(res){ return !res || !res.status || res.status >= 500 || res.status === 429 || res.status === 408; }

/* ===== LA COLA DE SUBIDA, compartida por las dos pantallas =====
   REESCRITA EN LA AUDITORÍA DEL 28 SEP 2026. La anterior reintentaba UNA vez a
   los 1,2 s y después daba el archivo por perdido: en una vereda donde la señal
   va y viene cada pocos minutos, eso descartaba casi todo lo que no subiera al
   primer intento, y la familia tenía que volver a elegir las fotos una a una.

   Ahora un fallo de RED no saca el archivo de la cola nunca: se reintenta con
   espera creciente (2, 4, 8… hasta 60 s), y además en el acto cuando vuelve la
   conexión (`online`) o cuando la familia vuelve a la pestaña
   (`visibilitychange`), que es lo que hace quien salió a buscar señal. Mientras
   quede algo, un botón «Reintentar ahora» y el aviso del navegador al cerrar la
   página. Lo que el servidor RECHAZA por lo que el archivo es sí sale, con su
   motivo escrito.

   `st` es el estado de cada pantalla (CV o MC) y `ui` lo que cada una pinta. */
var SUBIDAS = [];

function subidaEmpezar(st, ui){
  st.ui = ui;
  st.total = st.cola.length; st.hechas = 0; st.fallidas = 0; st.motivos = []; st.fallosRed = 0;
  if (SUBIDAS.indexOf(st) < 0) SUBIDAS.push(st);
  subidaPaso(st);
}

function subidaPaso(st){
  if (st.corriendo || !st.ui) return;
  if (st.espera){ clearTimeout(st.espera); st.espera = null; }
  subidaBoton(st, false);
  if (!st.cola.length){ st.ui.fin(st); return; }

  var item = st.cola[0];            /* NO se saca hasta que se guarda o se rechaza */
  st.corriendo = true;
  st.ui.prog(st.ui.textoProg(st.hechas + st.fallidas + 1, st.total));

  subirMedio(st.caso, st.token, item)
    .then(function(res){
      st.corriendo = false;
      if (res.ok){ st.cola.shift(); st.hechas++; st.fallosRed = 0; subidaPaso(st); return; }
      if (esPasajero(res)){ subidaEsperar(st); return; }
      st.cola.shift(); st.fallidas++; st.motivos.push(motivoServidor(item, res));
      subidaPaso(st);
    })
    .catch(function(e){
      st.corriendo = false;
      if (e && e.motivo){
        st.cola.shift(); st.fallidas++; st.motivos.push(motivoSubida(item, e.motivo, e.mb));
        subidaPaso(st);
        return;
      }
      subidaEsperar(st);
    });
}

function subidaEsperar(st){
  st.fallosRed = (st.fallosRed || 0) + 1;
  var ms = Math.min(60000, 2000 * Math.pow(2, st.fallosRed - 1));
  st.ui.prog(t("cv.sub.espera").replace("{n}", st.cola.length), "var(--amber)");
  subidaBoton(st, true);
  st.espera = setTimeout(function(){ st.espera = null; subidaPaso(st); }, ms);
}

function subidaBoton(st, ver){
  var b = st.ui && document.getElementById(st.ui.boton);
  if (b) b.hidden = !ver;
}

/* Lo que queda por subir en cualquiera de las dos pantallas. */
function subidaPendiente(){
  for (var i = 0; i < SUBIDAS.length; i++) if (SUBIDAS[i].cola.length && SUBIDAS[i].ui) return true;
  return false;
}
function subidaYa(){
  for (var i = 0; i < SUBIDAS.length; i++){
    var st = SUBIDAS[i];
    if (st.cola.length && st.ui && !st.corriendo){ st.fallosRed = 0; subidaPaso(st); }
  }
}
window.addEventListener("online", subidaYa);
document.addEventListener("visibilitychange", function(){ if (document.visibilityState === "visible") subidaYa(); });
window.addEventListener("beforeunload", function(ev){
  if (!subidaPendiente()) return;
  /* El texto lo pone el navegador; pedir la confirmación es lo único que se puede. */
  ev.preventDefault();
  ev.returnValue = "";
});

function cvProg(txt, color){
  var e = document.getElementById("cv-sub");
  if (!e) return;
  e.textContent = txt;
  e.style.color = color || "var(--mu)";
}

/* El formulario: al terminar dice la verdad —cuántas llegaron y por qué no
   las otras— y SOLO ENTONCES enseña el botón de WhatsApp. Tocarlo abre otra
   aplicación, y en un teléfono con poca memoria el sistema puede matar la
   pestaña que estaba subiendo: con el botón a la vista a mitad de la subida,
   la familia perdía justo las fotos que faltaban. */
function cvSubirCola(){
  if (!CV.caso) return;
  var wa = document.getElementById("cv-wa");
  if (wa) wa.hidden = true;
  subidaEmpezar(CV, {
    boton: "cv-reintentar",
    prog: cvProg,
    textoProg: function(n, tt){ return t("cv.sub.prog").replace("{n}", n).replace("{t}", tt); },
    fin: function(st){
      if (!st.total)             cvProg("");
      else if (!st.fallidas)     cvProg(t("cv.sub.ok").replace("{t}", st.total), "var(--ok)");
      else if (st.hechas)        cvProg(t("cv.sub.parcial").replace("{n}", st.hechas).replace("{t}", st.total), "var(--amber)");
      else                       cvProg(t("cv.sub.nada"), "var(--err)");
      var mot = document.getElementById("cv-sub-mot");
      if (mot) mot.textContent = st.motivos.join("\n");
      if (wa) wa.hidden = false;
    }
  });
}
function cvReintentar(){ CV.fallosRed = 0; subidaPaso(CV); }


/* ===== LA FILA DEL TRIAJE, EN LA PÁGINA DE INGENIEROS =====
   ==========================================================================
   Cuatro estados y los cuatro se dicen, porque «no hay nada» y «no lo pude
   comprobar» no son lo mismo — que es la regla de esta casa y la que ya
   gobierna el mensaje de los comercios aliados y el del inglés que no carga.

   LA FILA VACÍA NO SE ESCONDE. Tentaba —un cero no recluta— pero ahí el número
   honesto es el que más vale: es la prueba de que el aviso automático funciona.
   El servidor escribe a los ingenieros verificados EXACTAMENTE cuando la fila
   pasa de vacía a tener un caso, y decirlo aquí convierte el cero en una
   promesa comprobable en vez de en un silencio. */
function filaPinta(estado, d){
  var c = document.getElementById("ing-fila");
  if (!c) return;
  c.textContent = "";
  c.setAttribute("data-estado", estado);

  if (estado === "cargando"){
    var p0 = document.createElement("p");
    p0.className = "mmc-fila-nota";
    p0.textContent = t("ing.fila.cargando");
    c.appendChild(p0);
    return;
  }
  if (estado === "falla"){
    var p1 = document.createElement("p");
    p1.className = "mmc-fila-nota";
    p1.textContent = t("ing.fila.falla");
    c.appendChild(p1);
    return;
  }

  var et = document.createElement("span");
  et.className = "mmc-fila-et";
  et.textContent = t("ing.fila.ey");
  c.appendChild(et);

  if (estado === "vacia"){
    var p2 = document.createElement("p");
    p2.className = "mmc-fila-t";
    p2.textContent = t("ing.fila.vacia.t");
    c.appendChild(p2);
    var p3 = document.createElement("p");
    p3.className = "mmc-fila-nota";
    p3.textContent = t("ing.fila.vacia.p");
    c.appendChild(p3);
    return;
  }

  var n = document.createElement("p");
  n.className = "mmc-fila-n";
  n.textContent = String(d.esperando);
  c.appendChild(n);
  var q = document.createElement("p");
  q.className = "mmc-fila-t";
  q.textContent = d.esperando === 1 ? t("ing.fila.uno") : t("ing.fila.varios");
  c.appendChild(q);
  var nota = document.createElement("p");
  nota.className = "mmc-fila-nota";
  /* Los días solo se dicen si hay algo que decir. «Lleva 0 días esperando»
     suena a sistema y no informa: entró hoy, y eso ya lo dice el cero. */
  nota.textContent = (d.espera_dias > 0)
    ? t("ing.fila.espera").replace("{d}", String(d.espera_dias))
    : t("ing.fila.hoy");
  c.appendChild(nota);
}

var FILA_PEDIDA = false;
var FILA_DATO = null;
function filaCargar(){
  if (FILA_PEDIDA) return;
  FILA_PEDIDA = true;
  filaPinta("cargando");
  fetch("/api/casos/fila")
    .then(function(r){ if (!r.ok) throw 0; return r.json(); })
    .then(function(d){
      FILA_DATO = d;
      filaPinta(d.esperando > 0 ? "hay" : "vacia", d);
    })
    .catch(function(){
      /* Se suelta el cerrojo: si fue un parpadeo de red, volver a la página lo
         reintenta. Es el mismo criterio que `pedirIngles`. */
      FILA_PEDIDA = false;
      FILA_DATO = null;
      filaPinta("falla");
    });
}


var BC_CL = ["urgente", "programada", "no_requiere"];

var BC_DESDE = 0;
function bcPaso(d){ BC_DESDE = Math.max(0, Number(d) || 0); bcPinta(); }
function bcPinta(){
  var tot = document.getElementById("bc-totales");
  var lis = document.getElementById("bc-lista");
  if (!tot || !lis) return;

  /* NO PUDE CONSULTAR ≠ NO HAY NADA, y hasta hoy la pantalla decía lo segundo
     cuando pasaba lo primero. Había DOS caminos al mismo engaño:

       · si la red falla, el `catch` pintaba «Todavía no hay casos públicos»;
       · si el servidor responde 503 o 500 —`base_no_configurada`,
         `error_interno`— el JSON parsea bien pero SIN `casos`, así que ni
         llegaba al `catch`: los cuatro contadores salían en cero y la lista
         decía que no hay casos públicos.

     Es exactamente lo que el propio proyecto prohíbe. El panel lo dice con
     todas las letras: «donde falta el dato dice sin datos, no 0 %» (regla de
     MEDICION.md §5). Y aquí duele más que en el panel, porque `#casas` es la
     página que abre alguien de fuera para decidir si esto es real: afirmar «no
     hay casas revisadas» cuando la verdad es «no pude consultar» es peor que no
     decir nada.

     Con cero casos de verdad el mensaje vacío SÍ es correcto y se queda: que
     algo no haya pasado todavía es información. Lo que cambia es que ahora se
     distingue de un fallo. */
  var falla = function(){
    /* Sin cifras inventadas: la fila de contadores se vacía en vez de mostrar
       cuatro ceros que nadie contó. */
    tot.innerHTML = "";
    lis.innerHTML = '<p class="mu">' + escapeHtml(t("bc.falla")) + "</p>";
  };

  fetch("/api/casos/publicos?desde=" + BC_DESDE).then(function(r){
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }).then(function(d){
    /* La forma de la respuesta es la prueba de que se consultó de verdad: un
       error de la API llega como `{error:…}` y parsea igual de bien. */
    if (!d || d.error || !Array.isArray(d.casos) || !d.totales) throw new Error("respuesta sin datos");
    var T = d.totales || {};
    /* Los totales cuentan todo lo revisado; la tabla solo lo que se puede
       mostrar. Que los dos números se vean juntos es el punto: si difieren
       mucho, se ve que hay más trabajo del que la lista alcanza a enseñar. */
    var cajas = [
      [T.revisados, t("bc.n.revisados")],
      [T.urgentes, t("bc.n.urgentes")],
      [T.visitados, t("bc.n.visitados")],
      [T.publicables, t("bc.n.publicas")]
    ];
    tot.innerHTML = cajas.map(function(c){
      return '<div class="eco-item"><span class="figure-xl" style="font-size:34px">' + (c[0] || 0) +
             '</span><span class="figure-lab">' + escapeHtml(c[1]) + "</span></div>";
    }).join("");

    var l = d.casos || [];
    if (!l.length){ lis.innerHTML = '<p class="mu">' + escapeHtml(t("bc.vacio")) + "</p>"; return; }

    var h = '<div class="med-tw"><table class="med-tbl"><thead><tr>'
          + "<th scope=\"col\">" + escapeHtml(t("bc.tabla.caso")) + "</th>"
          + "<th scope=\"col\">" + escapeHtml(t("bc.tabla.donde")) + "</th>"
          + "<th scope=\"col\">" + escapeHtml(t("bc.tabla.casa")) + "</th>"
          + "<th scope=\"col\">" + escapeHtml(t("bc.tabla.pri")) + "</th>"
          + "</tr></thead><tbody>";
    for (var i = 0; i < l.length; i++){
      var c = l[i];
      var casa = [];
      if (c.material) casa.push(t("cv.mat." + c.material) || c.material);
      if (c.pisos) casa.push(c.pisos + " " + t(c.pisos === 1 ? "bc.piso" : "bc.pisos"));
      h += "<tr><td>" + escapeHtml(c.numero) + "</td>"
        +  "<td>" + escapeHtml(c.sector) + "</td>"
        +  "<td>" + escapeHtml(casa.join(" · ") || "—") + "</td>"
        +  "<td><strong>" + escapeHtml(BC_CL.indexOf(c.clasificacion) > -1
             ? t("bc.cl." + c.clasificacion) : c.clasificacion) + "</strong></td></tr>";
    }
    /* SI SE RECORTO, SE DICE. El servidor manda a lo sumo `tope` filas, y
       `publicables` es el total de verdad. Cuando no coinciden, la tabla esta
       ensenando una parte y callarlo seria afirmar que eso es todo — lo mismo que
       ya se corrigio en esta pantalla cuando no podia consultar.

       El texto informa en vez de alarmar: dice de cuantas se ensenan cuantas y
       que van ordenadas por urgencia, asi que lo que no aparece es lo menos
       urgente -y eso es verdad, porque la consulta ordena por gravedad-.

       Y esta redactado para que NINGUN numero rompa la gramatica. Los dos
       primeros intentos si la rompian: «Faltan 1 casas por mostrar» y «se
       ensenan las 1 mas urgentes». Con el tope real en 300 casi nunca se veria,
       pero depender de que un tope no valga 1 no es una razon. */
    var pub = (d.totales && d.totales.publicables) || 0;
    var vistos = typeof d.mostrados === "number" ? d.mostrados : l.length;
    /* ANTES ESTO SOLO AVISABA: «se enseñan 300 de N, las que no aparecen son las
       menos urgentes». Era cierto y no servía — de la casa 301 en adelante no
       había forma de llegar, y este es el registro PÚBLICO de casas revisadas:
       la de alguien que autorizó que se publicara. Ahora se pagina. */
    var desde = d.desde || 0;
    var hay = (desde + l.length) < pub;
    if (desde > 0 || hay){
      h += '<tr><td colspan="4" class="mu">'
        +  escapeHtml(t("bc.pagina").replace("{a}", desde + 1).replace("{b}", desde + l.length).replace("{t}", pub))
        +  " "
        +  (desde > 0 ? '<button type="button" class="copy" data-act="bcPaso(' + Math.max(0, desde - (d.tope || 300)) + ')">'
             + escapeHtml(t("bc.ant")) + "</button> " : "")
        +  (hay ? '<button type="button" class="copy" data-act="bcPaso(' + (desde + (d.tope || 300)) + ')">'
             + escapeHtml(t("bc.mas")) + " " + Math.min(d.tope || 300, pub - desde - l.length) + "</button>" : "")
        +  "</td></tr>";
    }

    lis.innerHTML = h + "</tbody></table></div>";
      /* AQUI y no solo en `go`: la tabla se pinta cuando vuelve la promesa, o
         sea despues de que la navegacion ya paso. Sin esta llamada la caja del
         banco -la unica publica que desborda de verdad- se quedaba sin marcar. */
      cajasDesplazables();
  }).catch(falla);
}


/* `aviso` se pinta DESPUÉS de rearmar el cuerpo, no antes. Al terminar una
   subida hay que hacer las dos cosas —refrescar el conteo y confirmar— y el
   repintado destruye el elemento del mensaje: escribirlo primero lo borraba, y
   la familia se quedaba sin saber si sus fotos habían llegado. En una zona con
   mala señal eso es exactamente lo que no puede pasar. */
function mcPinta(aviso, color){
  var cont = document.getElementById("mc-cuerpo");
  var tit = document.getElementById("mc-num");
  if (!cont) return;
  if (tit) tit.textContent = MC.caso || "";
  cont.innerHTML = '<p class="mu">' + escapeHtml(t("mc.cargando")) + "</p>";

  fetch("/api/caso/" + encodeURIComponent(MC.caso) + "?t=" + encodeURIComponent(MC.token))
    .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
    .then(function(res){
      /* Un caso inexistente y uno ajeno dan el MISMO mensaje, igual que en el
         servidor: distinguirlos dejaría un oráculo de qué casos existen. */
      if (!res.ok || !res.d || res.d.error){
        /* EL ENLACE QUE NO ABRE ES EL MOMENTO EN QUE MÁS FALTA HACE UNA SALIDA,
           y esta página no tenía ninguna: ni un botón, ni un enlace, solo la
           frase. La recuperación existe desde hace dos cambios —la banda del
           caso guardado y la línea de «escríbenos y te lo devolvemos»— pero
           vivían en «Revisa tu casa», que es justo donde esta persona NO está.

           Se pintan las dos, y en este orden: primero lo que el teléfono pueda
           saber solo —si aquí hay otro caso guardado, ese es probablemente el
           suyo y está a un toque—, y después el camino por WhatsApp para quien
           no tenga nada. */
        cont.innerHTML = '<p class="lead">' + escapeHtml(t("mc.err")) + "</p>"
          + '<div class="mmc-mio" data-mi-caso hidden></div>'
          + '<p class="mu mmc-perdido" style="max-width:52ch;margin-top:18px">'
          +   '<span>' + escapeHtml(t("mmc.perdido.t")) + "</span> "
          +   '<a id="mmc-perdido-wa" target="_blank" rel="noopener" href="'
          +   escapeHtml("https://wa.me/573153305028?text=" + encodeURIComponent(t("mmc.perdido.texto")))
          +   '">' + escapeHtml(t("mmc.perdido.wa")) + "</a></p>";
        mmcMiCaso();
        return;
      }
      var d = res.d;
      /* LLEGÓ AQUÍ CON UN TOKEN QUE EL SERVIDOR ACEPTÓ, así que este enlace es
         bueno: se guarda. Cubre a quien abre el caso desde su propio WhatsApp
         semanas después y no vuelve a tocar el mensaje — a partir de ahí el
         teléfono se lo sabe. Es lo mismo que hace `cvEnviar` al crearlo, en el
         otro momento en que el token pasa por el navegador. */
      mmcCasoGuardar(MC.caso, location.origin + location.pathname + location.search);
      MC.tope = d.tope_medios || 20;
      MC.queda = d.cupo ? d.cupo.queda : null;
      var h = "";

      /* «Dónde» y no «Estado». La etiqueta decía Estado y el valor era
         `d.sector`, así que a una familia de «Barrio X» su propia página le
         decía «Estado: Barrio X». Se corrige la ETIQUETA y no el valor porque
         el estado de verdad ya se cuenta en prosa justo debajo —si lo ha visto
         un ingeniero, cuánto llevas esperando, cuántos casos hay sin abrir— y
         poner ahí el enum crudo (`recibido`) lo repetiría y sonaría a sistema.
         Se usa la misma palabra que la columna del banco público. */
      h += '<p><strong>' + escapeHtml(t("mc.donde")) + ":</strong> "
        +  escapeHtml(d.sector || "") + " · " + escapeHtml(t("mc.fotos")) + ": " + (d.medios || 0) + "</p>";

      /* TRES DECISIONES INDEPENDIENTES, NO UNA CADENA.

         Antes esto era `if (falta) … else if (clasificación) … else …`, y la
         condición del primer brazo era solo que el campo tuviera texto. Pero el
         formulario del triaje manda «qué falta» con CUALQUIER clasificación, así
         que a un caso `urgente` cuyo ingeniero además escribió algo ahí se le
         enseñaba «necesitamos un par de fotos más» y NUNCA el veredicto, ni la
         recomendación, ni el enlace al informe. La familia esperaba semanas para
         leer una petición de fotos en lugar de la respuesta que ya existía.

         El PDF se blindó el 20 ago con `falta && clasificacion === "inevaluable"`
         y el correo también, pero esta pantalla se quedó fuera: el comentario de
         `documentos.js` afirma que «la PANTALLA de la familia ya lo hacía bien»,
         y no era cierto. Eran dos superficies del mismo dato en desacuerdo, que
         es exactamente la clase de fallo que ese arreglo decía haber cerrado.

         Ahora el concepto se pinta siempre que exista, y la petición de fotos
         solo cuando de verdad hay una pendiente — eso lo decide el servidor en
         `falta_pendiente`, mirando si la evaluación más reciente es la que no
         pudo evaluar. Pueden salir las dos a la vez: si hay veredicto y además
         hacen falta fotos, la familia merece leer las dos cosas, y el veredicto
         va primero porque es a lo que vino. */
      var tieneConcepto = !!(d.evaluado && d.clasificacion);
      var falta = d.falta_pendiente;
      /* UN CASO TERMINADO NO ESPERA NADA (auditoría del 28 sep 2026). La página
         miraba el estado solo al final, para esconder el formulario, así que un
         caso cerrado seguía diciendo arriba «todavía no lo ha revisado un
         ingeniero · hay 12 casos sin abrir» y abajo «este caso está cerrado». Se
         contradecía a sí misma, y la parte de arriba es la que se lee. El estado
         se mira PRIMERO y decide qué tarjeta de espera sale — ninguna, si ya
         terminó —. El concepto, si lo hubo, se sigue enseñando: es suyo. */
      var terminado = d.estado === "cerrado" || d.estado === "descartado";
      var pideFotos = !!falta && !terminado;

      if (terminado){
        var fin = d.estado === "cerrado" ? "cerrado" : "descartado";
        h += '<div class="card" style="margin-top:22px;text-align:left">'
          +  "<h3>" + escapeHtml(t("mc.fin." + fin + ".t")) + "</h3>"
          +  "<p>" + escapeHtml(t("mc.fin." + fin + ".p")) + "</p>"
          +  (fin === "descartado" && d.duplicado_de
              ? '<p style="margin-top:8px;font-weight:700">' + escapeHtml(t("mc.fin.dup").replace("{n}", d.duplicado_de)) + "</p>"
              : "")
          +  "</div>";
      } else if (d.estado === "visitado"){
        h += '<div class="card" style="margin-top:22px;text-align:left">'
          +  "<h3>" + escapeHtml(t("mc.fin.visitado.t")) + "</h3>"
          +  "<p>" + escapeHtml(t("mc.fin.visitado.p")) + "</p></div>";
      }

      if (tieneConcepto){
        h += '<div class="card" style="margin-top:22px;text-align:left">'
          +  "<h3>" + escapeHtml(t("mc.res.t")) + "</h3>"
          +  '<p style="margin-top:6px;font-weight:700">'
          +  escapeHtml(t("mc.cl." + d.clasificacion) || d.clasificacion) + "</p>"
          /* La prioridad NO es una cita (auditoría del 28 sep 2026), y con
             prioridad alta se dice a quién acudir, que no somos nosotros. */
          +  '<p class="mu" style="margin-top:4px">' + escapeHtml(t("mc.cl.nota")) + "</p>"
          +  (d.clasificacion === "urgente"
              ? '<p style="margin-top:8px;font-weight:600">' + escapeHtml(t("mc.cl.urge")) + "</p>"
              : "")
          +  (d.ultima && d.ultima.recomendacion
              ? "<p style='margin-top:8px'>" + escapeHtml(t("mc.res.reco")) + " "
                + escapeHtml(d.ultima.recomendacion) + "</p>"
              : "")
          +  '<p class="mu" style="margin-top:10px">' + escapeHtml(t("mc.aviso")) + "</p>"
          +  '<p style="margin-top:14px"><a class="btn btn-o" href="/api/caso/'
          +  encodeURIComponent(MC.caso) + "/informe.pdf?t=" + encodeURIComponent(MC.token)
          +  '">' + escapeHtml(t("mc.informe")) + "</a></p></div>";
      }

      if (pideFotos){
        h += '<div class="card" style="margin-top:22px;text-align:left">'
          +  "<h3>" + escapeHtml(t("mc.falta.t")) + "</h3>"
          +  "<p>" + escapeHtml(t("mc.falta.p")) + "</p>"
          +  '<p style="margin-top:8px;font-weight:700">' + escapeHtml(falta) + "</p></div>";
      }

      /* AQUÍ NO SE COMPRUEBA `d.evaluado`, Y ES A PROPÓSITO. El barrido marcó que
         esta tarjeta dice «Todavía no lo ha revisado un ingeniero» sin mirar ese
         campo, y sería una mentira si un caso llegara aquí ya evaluado. No puede:
         el servidor EXIGE `falta` cuando la clasificación es `inevaluable`
         (`falta_requerido`, 422), así que toda evaluación deja o una clasificación
         firme —y entonces `tieneConcepto`— o una petición de fotos —y entonces
         `pideFotos`—. Las dos ramas de arriba cubren todo lo evaluado.

         Queda escrito para el día que alguien haga `falta` opcional: ese día este
         estado se vuelve alcanzable y esta tarjeta empieza a mentir. */
      /* YA LO REVISARON, FALTA COMPROBAR LA MATRICULA. Va antes de la tarjeta de
         espera porque esa dice «todavia no lo ha revisado un ingeniero», y aqui
         si lo hicieron: lo que falta es que alguien confirme su matricula en el
         COPNIA. Decirle lo primero seria mentirle, y ademas le quitaria el unico
         dato que explica por que sigue esperando. */
      if (terminado || d.estado === "visitado"){
        /* Ya dicho arriba: aquí no hay espera que contar. */
      } else if (!tieneConcepto && !pideFotos && d.esperando_respaldo){
        h += '<div class="card" style="margin-top:22px;text-align:left">'
          +  "<h3>" + escapeHtml(t("mc.respaldo.t")) + "</h3>"
          +  "<p>" + escapeHtml(t("mc.respaldo.p")) + "</p></div>";
      } else if (!tieneConcepto && !pideFotos){
        /* La espera, contada con hechos y sin fecha prometida. Los días que
           lleva y cuántos hay delante: el segundo dato explica el primero
           mejor que cualquier disculpa, y los dos son verificables. */
        /* Singular y plural de verdad, no «1 día(s)»: esto lo lee una familia
           con la casa rota, y esa notación la escribe un formulario, no una
           persona que te está respondiendo. */
        var esp = d.dias <= 0 ? t("mc.espera.hoy")
                : d.dias === 1 ? t("mc.espera.dia")
                : t("mc.espera.dias").replace("{d}", d.dias);
        var cola = d.en_cola > 1
          ? t("mc.espera.cola").replace("{n}", d.en_cola)
          : (d.en_cola === 1 ? t("mc.espera.solo") : "");
        h += '<div class="card" style="margin-top:22px;text-align:left">'
          +  "<h3>" + escapeHtml(t("mc.sin.t")) + "</h3>"
          +  "<p>" + escapeHtml(t("mc.sin.p")) + "</p>"
          +  '<p style="margin-top:10px;font-weight:600">' + escapeHtml(esp) + "</p>"
          +  (cola ? '<p class="mu" style="margin-top:6px">' + escapeHtml(cola) + "</p>" : "")
          +  '<p class="mu" style="margin-top:6px">' + escapeHtml(t("mc.espera.sin")) + "</p></div>";
      }

      /* EL CUPO LO DICE EL SERVIDOR, no se deduce aquí. Antes se comparaba el
         TOTAL de medios contra el tope, y ese total incluye las fotos que sube el
         equipo en la visita: la familia veía «llegaste al máximo» por archivos que
         no subió ella. Y si un ingeniero le había PEDIDO una foto, el formulario
         desaparecía justo cuando más falta hacía.

         `d.cupo` viene del mismo ayudante que valida la subida, así que la
         pantalla no puede ofrecer un hueco que el servidor rechace ni esconder uno
         que sí existe. El respaldo al cálculo viejo es para un navegador con un
         app.js viejo hablando con la API nueva. */
      var queda = d.cupo ? d.cupo.queda : Math.max(0, MC.tope - (d.medios || 0));
      if (terminado){
        if (d.estado === "cerrado") h += '<p class="mu" style="margin-top:22px">' + escapeHtml(t("mc.cerrado")) + "</p>";
      } else if (queda <= 0){
        h += '<p class="mu" style="margin-top:22px">' + escapeHtml(t("mc.add.tope")) + "</p>";
      } else {
        h += mcFormFotos();
      }
      cont.innerHTML = h;
      if (document.getElementById("mc-cats")) mcPintaCats();
      /* EL COLOR SE PASA, no se supone. Estaba fijo en verde, así que un aviso
         de «solo llegaron 2 de 5» o de «no llegó ninguna» se pintaba con el
         color de que todo salió bien. */
      if (aviso){
        var m = document.getElementById("mc-msg");
        if (m){ m.textContent = aviso; m.style.color = color || "var(--ok)"; }
      }
    })
    .catch(function(){
      /* CATCH SÍ HABÍA; lo que decía estaba mal. Aquí solo se llega cuando la
         petición NO se pudo hacer o su respuesta no era JSON —red caída, señal
         que se va, una página de error por delante—. El caso inexistente o
         ajeno no entra por aquí: ese lo atiende el `if` de arriba con su propio
         mensaje.

         Y el mensaje que había era `mc.err`: «Ese enlace no abre ningún caso,
         revisa que lo hayas copiado completo». A una familia con el enlace BIEN
         y la señal mal eso la manda a buscar un problema que no existe, y a
         sospechar que su caso se perdió. En zona de desastre ese es el caso
         frecuente, no el raro. */
      cont.innerHTML = '<p class="lead">' + escapeHtml(t("mc.err.red")) + "</p>";
    });
}

function mcFormFotos(){
  return '<div style="margin-top:34px">'
    +  "<h3>" + escapeHtml(t("mc.add.t")) + "</h3>"
    +  '<p class="mu" style="margin-top:8px">' + escapeHtml(t("mc.add.p")) + "</p>"
    +  '<p style="margin-top:10px;font-weight:700">' + escapeHtml(t("mc.add.seg")) + "</p>"
    +  '<div id="mc-cats" style="margin-top:18px;display:flex;flex-direction:column;gap:16px"></div>'
    +  '<p class="mu" style="margin-top:14px">' + escapeHtml(t("cv.video.h")) + "</p>"
    +  '<button type="button" class="btn btn-g" style="margin-top:18px" data-act="mcEnviar()">'
    +  escapeHtml(t("mc.add.enviar")) + "</button>"
    +  '<p id="mc-msg" role="status" aria-live="polite" class="mu" style="margin-top:12px;white-space:pre-line"></p>'
    /* Solo se ve mientras hay archivos esperando señal: ver `subidaEsperar`. */
    +  '<button type="button" class="btn btn-o" id="mc-reintentar" hidden style="margin-top:10px" data-act="mcReintentar()">'
    +  escapeHtml(t("cv.sub.reintentar")) + "</button></div>";
}

/* Las MISMAS cuatro categorías del formulario, leídas de la misma constante.
   El día que los ingenieros cambien la lista se toca un solo sitio — que es
   justo lo que va a pasar cuando respondan la guía fotográfica. */
function mcPintaCats(){
  var cont = document.getElementById("mc-cats");
  var html = "";
  for (var i = 0; i < CV_CATS.length; i++){
    var c = CV_CATS[i];
    html += '<div class="ally-check" style="display:block">'
         +  "<b>" + escapeHtml(t("cv.cat." + c)) + "</b>"
         +  '<small style="display:block;color:var(--mu);margin:4px 0 10px">' + escapeHtml(t("cv.cat." + c + ".h")) + "</small>"
         +  '<label class="btn btn-o" style="display:inline-block;cursor:pointer">'
         +  "<span>" + escapeHtml(t("cv.add")) + "</span>"
         +  '<input type="file" accept="image/*,video/*" multiple '
         +  'data-cat="' + c + '" style="position:absolute;left:-9999px">'
         +  "</label> <span class=\"mu\" id=\"mc-n-" + c + '">0</span>'
         +  "</div>";
  }
  cont.innerHTML = html;
  cont.querySelectorAll("input[type=file]").forEach(function(inp){
    inp.addEventListener("change", function(){ mcArchivos(inp); });
  });
}

function mcArchivos(inp){
  var cat = inp.getAttribute("data-cat");
  for (var i = 0; i < inp.files.length; i++) MC.cola.push({ file: inp.files[i], cat: cat });
  var n = MC.cola.filter(function(x){ return x.cat === cat; }).length;
  var et = document.getElementById("mc-n-" + cat);
  if (et) et.textContent = n;
  inp.value = "";
}

function mcEnviar(){
  var msg = document.getElementById("mc-msg");
  if (!MC.cola.length){
    if (msg){ msg.textContent = t("mc.add.nada"); msg.style.color = "var(--err)"; }
    return;
  }
  /* SI NO CABEN, SE DICE ANTES DE SUBIR. Dejar que sobren y las rechace el
     servidor una por una gasta datos y batería de alguien que quizá esté con una
     barra de señal — y el cierre honesto diría «guardamos 4 de 8» sin explicar
     por qué. Mejor decirlo cuando todavía se puede elegir. */
  if (MC.queda != null && MC.cola.length > MC.queda){
    if (msg){
      msg.textContent = t("mc.add.pasa").replace("{n}", MC.cola.length).replace("{q}", MC.queda);
      msg.style.color = "var(--amber)";
    }
    return;
  }

  /* Se reinician EN CADA TANDA. `mcPinta` vuelve a dibujar la página al
     terminar, así que puede haber una segunda subida en la misma visita y los
     contadores de la anterior mentirían. */
  /* SI YA HAY UNA TANDA ESPERANDO SEÑAL, lo nuevo se suma a ella en vez de
     reiniciar los contadores: reiniciarlos a mitad haría que el cierre dijera
     «guardamos 2 de 3» cuando fueron 5 de 6. */
  if (MC.ui && (MC.corriendo || MC.espera)){
    MC.total = MC.hechas + MC.fallidas + MC.cola.length;
    subidaPaso(MC);
    return;
  }
  if (msg){ msg.textContent = t("mc.add.subiendo"); msg.style.color = "var(--mu)"; }
  mcSubirCola();
}

/* De a una y en serie, por la misma razón que al crear el caso: con señal mala,
   varias subidas en paralelo se pisan y fallan todas. Al terminar se repinta la
   página, así el contador de fotos dice la verdad sin recargar.

   REESCRITA EL 31 AGO 2026. Tenía LOS MISMOS TRES DEFECTOS que `cvSubirCola`
   documenta como corregidos el 20 de agosto — el arreglo se hizo en un bucle y
   no en el otro, y este es el que usa la familia cuando un ingeniero le PIDE una
   foto concreta. O sea: el peor momento para perderla.

   1. `MC.cola.shift()` iba ANTES de intentar la subida, así que un fallo de red
      borraba el archivo de la única copia que existía, y sin reintento.
   2. El único error que miraba lo mandaba a `console.warn` — la consola que la
      familia no tiene. Los 413, 415, 409 y 500 del servidor no se miraban.
   3. No contaba nada, y el `.catch()` se comía los fallos, así que al terminar
      SIEMPRE pintaba «Listo, ya las tenemos. Un ingeniero las va a ver.» aunque
      no hubiera llegado ni una. Es exactamente la mentira que el otro bucle dejó
      de decir.

   Mismo contrato que `cvSubirCola`, a propósito: si algún día cambia el trato con
   la familia, que cambie en los dos o en ninguno. */
/* «Mi caso» usa la MISMA cola que el formulario (`subidaEmpezar`), a propósito:
   el 31 ago ya se corrigió aquí un bucle que se había quedado atrás del otro, y
   con una sola cola eso no puede volver a pasar. Al terminar se repinta la
   página, así el contador de fotos dice la verdad sin recargar, y los motivos
   de lo que no entró van en el mismo aviso. */
function mcProg(txt, color){
  var e = document.getElementById("mc-msg");
  if (!e) return;
  e.textContent = txt;
  e.style.color = color || "var(--mu)";
}

function mcSubirCola(){
  if (!MC.caso) return;
  subidaEmpezar(MC, {
    boton: "mc-reintentar",
    prog: mcProg,
    textoProg: function(n, tt){ return t("mc.sub.prog").replace("{n}", n).replace("{t}", tt); },
    fin: function(st){
      var mot = st.motivos.length ? "\n" + st.motivos.join("\n") : "";
      if (!st.total)          mcPinta();
      else if (!st.fallidas)  mcPinta(t("mc.add.ok"), "var(--ok)");
      else if (st.hechas)     mcPinta(t("mc.sub.parcial").replace("{n}", st.hechas).replace("{t}", st.total) + mot, "var(--amber)");
      else                    mcPinta(t("mc.sub.nada") + mot, "var(--err)");
    }
  });
}
function mcReintentar(){ MC.fallosRed = 0; subidaPaso(MC); }

function cvCopiar(){
  if (!CV.enlace) return;
  var btn = document.querySelector('[data-act="cvCopiar()"]');
  try {
    navigator.clipboard.writeText(CV.enlace);
    if (btn) btn.textContent = t("cv.ok.copiado");
  } catch (e) { /* sin portapapeles: el número está a la vista */ }
}


/* ---------- postulación de ingenieros al triaje ----------
   Mismo patrón que el formulario de voluntariado, con una diferencia que
   importa: la casilla de alcance es obligatoria y NO es la de Ley 1581. Quien
   crea que va a dictaminar habitabilidad por fotos tiene que toparse con eso
   antes de escribir su matrícula. El servidor la exige igual, porque una
   validación que solo vive en el navegador no valida nada. */
function ingEsp(){
  var sel = document.getElementById("inf-esp");
  var campo = document.getElementById("inf-otra-f");
  if (sel && campo) campo.style.display = sel.value === "otra" ? "" : "none";
}

/* Igual que `ingEsp()`: el campo de organización solo aparece si hace falta.
   Un campo visible y vacío invita a rellenarlo con cualquier cosa. */
function apQuien(){
  var sel = document.getElementById("apf-quien");
  var caja = document.getElementById("apf-org-f");
  if (!sel || !caja) return;
  caja.style.display = sel.value === "empresa" ? "" : "none";
  if (sel.value !== "empresa"){ var o = document.getElementById("apf-org"); if (o) o.value = ""; }
}

function apSubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("apf-note");
  var btn = document.getElementById("apf-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  /* Honeypot: éxito aparente, cero envío. No se le enseña al bot qué lo delató. */
  if (val("apf-web2")){ document.getElementById("apf").reset(); apQuien(); return allyMsg(note, t("ap.ok"), true); }

  if (!val("apf-nombre")) return allyMal(note, "apf-nombre", "ap.err.nombre");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("apf-email"))) return allyMal(note, "apf-email", "ap.err.email");
  if (!telOk(val("apf-tel"))) return allyMal(note, "apf-tel", "form.err.tel");
  if (!val("apf-detalle")) return allyMal(note, "apf-detalle", "ap.err.detalle");
  if (!chk("apf-concepto")) return allyMal(note, "apf-concepto", "ap.err.concepto");
  if (!chk("apf-datos")) return allyMal(note, "apf-datos", "ap.err.datos");

  btn.disabled = true;
  allyMsg(note, t("ap.sending"), true);

  fetch("/api/inscripcion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "apadrinamiento",
      nombre: val("apf-nombre"),
      email: val("apf-email"),
      telefono: val("apf-tel"),
      ciudad: val("apf-ciudad"),
      quien: val("apf-quien"),
      organizacion: val("apf-org"),
      aporte: val("apf-aporte"),
      detalle: val("apf-detalle"),
      alcance: val("apf-alcance"),
      sector: val("apf-sector"),
      acepta_concepto: true,
      autoriza_datos: true,
      web2: val("apf-web2"),
      idioma: (typeof lang !== "undefined" && lang === "en") ? "en" : "es"
    })
  }).then(formRespuesta)
    .then(function(){
      document.getElementById("apf").reset(); apQuien();
      btn.disabled = false;
      allyMsg(note, t("ap.ok"), true);
    })
    .catch(function(err){ btn.disabled = false; formFallo(note, err, AP_ERRS, "ap.err.send"); });
  return false;
}

function ingSubmit(ev){
  ev.preventDefault();
  var note = document.getElementById("inf-note");
  var btn = document.getElementById("inf-btn");
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var chk = function(id){ var e=document.getElementById(id); return e ? e.checked : false; };

  /* Honeypot: éxito aparente, cero envío. No se le enseña al bot qué lo delató. */
  if (val("inf-web2")){ document.getElementById("inf").reset(); ingEsp(); return allyMsg(note, t("ing.ok"), true); }

  if (!val("inf-nombre")) return allyMal(note, "inf-nombre", "ing.err.nombre");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("inf-email"))) return allyMal(note, "inf-email", "ing.err.email");
  if (!telOk(val("inf-tel"))) return allyMal(note, "inf-tel", "form.err.tel");
  if (!val("inf-ciudad")) return allyMal(note, "inf-ciudad", "ing.err.ciudad");
  if (!val("inf-mat")) return allyMal(note, "inf-mat", "ing.err.matricula");
  if (!val("inf-esp")) return allyMal(note, "inf-esp", "ing.err.esp");
  if (!chk("inf-alcance")) return allyMal(note, "inf-alcance", "ing.err.alcance");
  if (!chk("inf-datos")) return allyMal(note, "inf-datos", "ing.err.datos");

  btn.disabled = true;
  allyMsg(note, t("ing.sending"), true);

  fetch("/api/inscripcion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tipo: "ingeniero",
      nombre: val("inf-nombre"),
      email: val("inf-email"),
      telefono: val("inf-tel"),
      ciudad: val("inf-ciudad"),
      matricula: val("inf-mat"),
      especialidad: val("inf-esp"),
      especialidad_otra: val("inf-otra"),
      posgrado: val("inf-posgrado"),
      diplomados: val("inf-diplomados"),
      otros_saberes: val("inf-otros"),
      experiencia: val("inf-exp"),
      disponibilidad: val("inf-disp"),
      mensaje: val("inf-msg"),
      acepta_triaje: true,
      autoriza_datos: true,
      web2: val("inf-web2"),
      idioma: (typeof lang !== "undefined" && lang === "en") ? "en" : "es"
    })
  }).then(formRespuesta)
    .then(function(){
      document.getElementById("inf").reset(); ingEsp();
      btn.disabled = false;
      allyMsg(note, t("ing.ok"), true);
    })
    .catch(function(err){ btn.disabled = false; formFallo(note, err, ING_ERRS, "ing.err.send"); });
  return false;
}
