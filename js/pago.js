/* ===== Give&Grow International - js/pago.js =====
   EL PAGO: la salida a Wompi y a PayPal desde #donar (`irAPagar`), el
   certificado, el retorno /gracias y la membresia internacional por PayPal de
   #membresias (`miCalcula`, `miSubmit`). Vivia dentro de app.js y se mudo aqui
   el 13 oct 2026 para aligerar la primera carga.

   Lo que la calculadora necesita en TODAS las paginas (`PAGO_VIA`,
   `setPagoVia`, `payRecNote`, `calcUpdate`) se quedo en app.js: corre al
   arrancar. Script clasico, mismas globales; lo carga `cargarModulo("pago")`.

   SI EDITAS ESTE ARCHIVO, su md5 (8 caracteres) va en `MODULOS_V` de app.js.
   El check #27 del gate lo exige. */
"use strict";

/* CUANTO SE LE VA A COBRAR EN DOLARES, con la TRM oficial. `calc.val` esta
   siempre en COP; el aporte anual se divide por 12 porque la suscripcion de
   PayPal cobra MENSUAL — es la misma cuenta que ya hace `carnetTrasAporte` en el
   servidor para decidir el nivel. */
function pagoUsdMensual(){
  var cop = Math.round(Number(calc.val) || 0);
  if (calc.freq === "a") cop = Math.round(cop / 12);
  if (!(USD_RATE > 0)) return 0;
  return Math.round((cop / USD_RATE) * 100) / 100;
}

function irAPagarPaypal(){
  var msg = document.getElementById("pay-msg");
  var aviso = function(txt, err){
    if (!msg) return;
    msg.style.display = "";
    msg.className = "pay-now-msg" + (err ? " err" : "");
    msg.textContent = txt;
  };

  /* Sin TRM no se convierte NADA. Cobrar en dolares un monto calculado con una
     tasa inventada es justo lo que se acaba de arreglar. */
  if (!TRM_INFO){ aviso(t("pay.pp.sintrm"), true); return; }

  /* UN APORTE UNICO NO ES UNA SUSCRIPCION. Para eso esta el enlace alojado de
     PayPal, que acepta el monto que la persona escriba alli. */
  if (calc.freq === "u"){ aviso(t("pay.pp.unico"), false); location.href = PAYPAL_ENLACE; return; }

  var usd = pagoUsdMensual();
  if (!(usd >= 5)){ aviso(t("pay.pp.min").replace("{cop}", fmtCOP(5 * USD_RATE)), true); return; }
  if (usd > 2000){ aviso(t("pay.pp.max"), true); return; }

  /* NO SE CREA LA SUSCRIPCION AQUI, y la razon es concreta: PayPal necesita
     correo -ahi va el recibo de cada mes- y la calculadora NO lo pide. Wompi si
     puede, porque recoge los datos en su propia pagina.

     Asi que la calculadora decide el MONTO y el formulario de membresia recoge lo
     que PayPal necesita. Se lleva alla con el monto ya puesto, en vez de duplicar
     aqui los campos y la casilla de Ley 1581. */
  var campo = document.getElementById("mif-monto");
  if (campo){ campo.value = usd.toFixed(2); }
  /* Y EL PROGRAMA que se eligio en la calculadora, si el selector de PayPal lo
     tiene. La brigada no puede llegar aqui —con ella la calculadora fuerza
     aporte unico—, y si algo que no esta llegara, el selector se queda en el
     fondo general en vez de quedar en blanco. */
  var dsel = document.getElementById("mif-destino");
  if (dsel){
    dsel.value = calc.projectId || "general";
    if (dsel.value !== (calc.projectId || "general")) dsel.value = "general";
  }
  go("membresias");
  setTimeout(function(){
    var sec = document.getElementById("membres-intl");
    if (sec) sec.scrollIntoView({ block: "start" });
    try { miCalcula(); } catch(e){}
    var n = document.getElementById("mif-nombre");
    if (n) n.focus();
  }, 60);
}
/* La casilla del certificado abre sus tres campos; sin marcarla no se ve un
   formulario de mas. */
function payCert(){
  var si = document.getElementById("pay-cert-si");
  var f = document.getElementById("pay-cert-f");
  if (f) f.style.display = (si && si.checked) ? "" : "none";
  if (si && si.checked){ var n = document.getElementById("pay-cert-num"); if (n) n.focus(); }
}
/* Lo que viaja al servidor si se pidio certificado, o null si no. Misma regla
   que valida el servidor: documento de 3 a 25 letras o numeros, y ciudad. */
function payCertDatos(){
  var si = document.getElementById("pay-cert-si");
  if (!si || !si.checked) return null;
  var tipo = (document.getElementById("pay-cert-tipo") || {}).value || "CC";
  var num = ((document.getElementById("pay-cert-num") || {}).value || "").trim();
  var ciudad = ((document.getElementById("pay-cert-ciudad") || {}).value || "").trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z.\- ]{2,24}$/.test(num) || ciudad.length < 2) return false;
  return { tipo: tipo, num: num, ciudad: ciudad };
}
function irAPagar(){
  var btn = document.getElementById("pay-go");
  var msg = document.getElementById("pay-msg");
  if (!btn || btn.disabled) return;
  if (PAGO_VIA === "paypal") return irAPagarPaypal();

  var monto = Math.round(Number(calc.val) || 0);   // calc.val siempre está en COP
  if (!(monto >= 5000 && monto <= 20000000)){
    if (msg){ msg.style.display=""; msg.className="pay-now-msg err"; msg.textContent = t("pay.now.err"); }
    return;
  }

  /* MENSUAL ES LA MEMBRESIA DE VERDAD (auditoria del 28 sep 2026). Por aqui
     se cobraba una vez y se prometia un debito «cuando lo habilitemos», con el
     debito ya habilitado en /pago/metodo. Se lleva alla con el monto puesto:
     esa pagina registra la tarjeta en la ventana de Wompi y crea la
     membresia, con su propia casilla de certificado. */
  if (calc.freq === "m"){
    /* Y CON EL DESTINO. Hasta el 30 sep 2026 viajaba solo el monto: quien
       elegia Borboletas en la calculadora y marcaba «mensual» terminaba con una
       membresia al fondo general sin que nada se lo dijera. El id es el mismo
       valor del <option>, que es lo que /pago/metodo valida contra
       partners.json. La brigada no llega aqui: fuerza aporte unico. */
    var q = "monto=" + encodeURIComponent(String(monto));
    if (calc.projectId && calc.projectId !== "general" && !esBrigada(calc.projectId)) {
      q += "&destino=" + encodeURIComponent(calc.projectId);
    }
    if (lang === "en") q += "&lang=en";
    window.location.href = "/pago/metodo?" + q;
    return;
  }

  var cert = payCertDatos();
  if (cert === false){
    if (msg){ msg.style.display=""; msg.className="pay-now-msg err"; msg.textContent = t("pay.cert.err"); }
    var cn = document.getElementById("pay-cert-num"); if (cn) cn.focus();
    return;
  }

  btn.disabled = true;
  if (msg){ msg.style.display=""; msg.className="pay-now-msg"; msg.textContent = t("pay.now.wait"); }

  var frecMap = { m:"mensual", a:"anual", u:"unico" };
  /* La brigada es una donación DIRIGIDA aunque no tenga fundación detrás: sin
     esto caía en `fondo` y el aporte se habría contado como fondo general. */
  /* Un destino que no es aliada —la brigada, Mira Mi Casa— es igualmente una
     donación DIRIGIDA. Sin esto caía en `fondo` y el aporte se habría contado
     como fondo general. */
  var noAliada = destinoNoAliado(calc.projectId);
  var cuerpo = {
    monto: monto,
    frecuencia: frecMap[calc.freq] || "unico",
    modo: (noAliada || calc.partnerId) ? "dirigida" : "fondo",
    destino: noAliada || calc.partnerId || null,
    /* `proyecto` es DESCRIPTIVO: es lo que el donante lee en su recibo y lo que
       cita el certificado. Antes viajaba el id de la unidad, así que el recibo
       decía «ndf-plato» en vez del nombre del programa. */
    proyecto: etiquetaDestino(),
    nota: calc.note || null,
    idioma: (typeof lang !== "undefined" && lang === "en") ? "en" : "es"
  };
  if (cert){
    cuerpo.certificado = true;
    cuerpo.cert_doc_tipo = cert.tipo;
    cuerpo.cert_doc_numero = cert.num;
    cuerpo.cert_ciudad = cert.ciudad;
  }

  fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo)
  }).then(function(r){ return r.ok ? r.json() : r.json().then(function(j){ throw new Error(j.error||"http_"+r.status); }); })
    .then(function(d){
      if (!d || !d.url) throw new Error("sin_url");
      /* La guía queda guardada por si el retorno llega sin identificador. */
      try { sessionStorage.setItem("gg_guia", d.guia); } catch(e){}
      window.location.href = d.url;
    })
    .catch(function(e){
      btn.disabled = false;
      /* SE DICE QUE FALLO CUANDO EL SERVIDOR LO SABE, que es la norma que el
         camino de PayPal ya sigue en `miSubmit`. Este mandaba a TODOS al mismo
         «no pudimos abrir la pasarela… vuelve a intentarlo», y con la pasarela
         sin configurar eso es un consejo falso: reintentar no va a funcionar
         nunca, y quien esta donando se queda dando vueltas en vez de irse a la
         transferencia, que si funciona.

         Solo se traducen los dos que pueden pasar de verdad. `destino_requerido`
         es inalcanzable desde la calculadora —si hay destino dirigido, siempre
         viaja el id— y `json_invalido` y `metodo_no_permitido` no los produce
         este formulario: esos caen al mensaje general, que es lo correcto para
         algo que, si ocurre, es un fallo nuestro y no una decision del donante. */
      var codigo = e && e.message;
      var texto = codigo === "pasarela_no_configurada" ? t("pay.now.cerrado")
                : codigo === "monto_invalido"          ? t("pay.now.monto")
                : codigo === "certificado_datos_invalidos" ? t("pay.cert.err")
                : t("pay.now.err");
      if (msg){ msg.style.display=""; msg.className="pay-now-msg err"; msg.textContent = texto; }
    });
}


/* ---------- retorno del checkout: /gracias ----------
   Wompi vuelve con SU id, no con nuestra guía. El Worker traduce uno en otra y
   devuelve NUESTRO estado, que es el que trae el webhook. */
var GRACIAS = { id:null, guia:null, intentos:0, timer:null };
/* La membresia de PayPal que vuelve por `?sub=`: lo que respondio el servidor
   (`d`), si ya se pidio, y cuantas veces. Se guarda para repintarla al cambiar
   de idioma sin volver a preguntar: la respuesta trae el programa en los dos. */
var GRACIAS_SUB = { d:null, pedido:false, intentos:0 };

/* LOS MENSAJES FIJOS DE ESTA PANTALLA, y viven aparte porque hay que volver a
   ponerlos.

   `gracias-t` y `gracias-p` llevan `data-i18n`, y `applyLang` los repinta con el
   texto del diccionario. Como `setLang` es ASINCRONO, ese repintado ocurre
   DESPUES de `graciasArranca` y borraba lo que acababa de escribirse: la pantalla
   volvia a decir «Estamos confirmando tu pago». Por eso se llama en los dos
   sitios (el contador de la brigada hacía lo mismo hasta que se retiró, 29 sep 2026).

   Devuelve true si el caso ya quedo resuelto aqui, para que quien llama no siga
   con la consulta del aporte unico. */
function graciasFijo(){
  var st = document.getElementById("gracias-t");
  var sp = document.getElementById("gracias-p");

  /* DOS REGRESOS SIN CONSULTA. La membresia trae `?sub=` -nuestro `custom_id`- y
     la donacion del boton de PayPal trae `?donacion=paypal`. Ninguno de los dos
     se puede consultar: el primer cobro de una suscripcion tarda, y la donacion
     del boton alojado no tiene guia nuestra porque PayPal no acepta que le
     pasemos una referencia por donante.

     La deteccion es por SUBCADENA y no con URLSearchParams a proposito: PayPal
     pega sus propios parametros al volver y no siempre respeta el `&`, asi que
     `?donacion=paypal?tx=...` es posible y `get("donacion")` devolveria
     «paypal?tx=...». */
  var clave = new URLSearchParams(location.search).get("sub") ? "sub"
            : location.search.indexOf("donacion=paypal") >= 0 ? "pp"
            : null;
  if (!clave) return false;

  if (st) st.textContent = t("gracias." + clave + ".t");
  if (sp) sp.textContent = t("gracias." + clave + ".p");

  /* «Rastrear mi aporte» no lleva a ninguna parte cuando no hay guia que
     rastrear. Un boton que no puede cumplir es peor que no tenerlo. */
  var tr = document.getElementById("gracias-track");
  if (tr) tr.style.display = (clave === "pp") ? "none" : "";

  /* EL PROGRAMA DE LA MEMBRESIA, que esta pantalla no decia. Se pide UNA vez
     —`graciasFijo` corre tambien en cada cambio de idioma— y despues solo se
     repinta lo que ya llego. */
  if (clave === "sub"){
    graciasSubPinta();
    if (!GRACIAS_SUB.pedido){ GRACIAS_SUB.pedido = true; graciasSubConsulta(); }
  }
  return true;
}

/* LOS DOS IDENTIFICADORES, sacados por patron y no con URLSearchParams por lo
   mismo que arriba: PayPal pega los suyos al volver y no siempre respeta el
   `&`. `sub` es nuestro `custom_id`; `subscription_id` lo pone PayPal. El
   servidor exige los dos y comprueba con PayPal que son la misma suscripcion:
   el programa sale de la fila, nunca de esta URL (ver `apiPaypalMembresia`). */
function graciasSubConsulta(){
  var ms = location.search.match(/[?&]sub=(GG-SUB-[a-f0-9]{12})/);
  var mi = location.search.match(/subscription_id=(I-[A-Z0-9]{6,30})/);
  if (!ms || !mi || location.pathname.replace(/\/$/, "") !== "/gracias") return;
  fetch("/api/paypal/membresia?sub=" + encodeURIComponent(ms[1]) + "&id=" + encodeURIComponent(mi[1]))
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      /* Sin respuesta la pantalla se queda como estaba: el mensaje general es
         cierto por si solo, y un «—» en el programa no le diria nada a nadie. */
      if (!d || !d.programa) return;
      GRACIAS_SUB.d = d;
      graciasSubPinta();
      /* El primer cobro llega por el webhook, a veces en segundos. Se vuelve a
         mirar unas pocas veces mientras siga pendiente —el cruce con PayPal ya
         quedo hecho en el servidor, asi que esto solo lee la base— y luego se
         deja: el mensaje ya dice que no es inmediato. */
      GRACIAS_SUB.intentos++;
      if (d.estado === "aprobacion_pendiente" && GRACIAS_SUB.intentos < 6) setTimeout(graciasSubConsulta, 5000);
    })
    .catch(function(){});
}

function graciasSubPinta(){
  var caja = document.getElementById("gracias-sub");
  var d = GRACIAS_SUB.d;
  if (!caja || !d) return;
  caja.style.display = "";
  caja.classList.add("in");
  var prog = document.getElementById("gr-sub-programa");
  if (prog) prog.textContent = (lang === "en" ? d.programa.en : d.programa.es) || t("membres.cta.dest.general");
  var clave = { aprobacion_pendiente:"pendiente", activa:"activa", suspendida:"suspendida",
                cancelada:"cerrada", expirada:"cerrada" }[d.estado] || "otra";
  var pill = { activa:"is-on", suspendida:"is-none", cerrada:"is-none" }[clave] || "is-wip";
  var ee = document.getElementById("gr-sub-estado");
  if (ee){
    ee.textContent = "";
    var s = document.createElement("span");
    s.className = "med-step-s " + pill;
    s.textContent = t("gracias.sub.e." + clave);
    ee.appendChild(s);
  }
}

function graciasArranca(){
  var q = new URLSearchParams(location.search);

  /* UNA MEMBRESIA NO ES UN APORTE UNICO, y esta pantalla estaba escrita solo para
     lo segundo. Quien vuelve de aprobar una suscripcion de PayPal trae `?sub=`
     -nuestro `custom_id`, que ponemos en el `return_url`- y no trae `?id=`.

     Sin esto leia «Estamos confirmando tu pago» y se quedaba consultando un
     aporte que no existe: el primer cobro de una suscripcion no es inmediato y
     puede tardar. Decirle la verdad -quedo registrada, el cobro lo confirma
     PayPal y le avisamos- es lo que corresponde.

     No se consulta nada al servidor: el `custom_id` es NUESTRO y no identifica a
     nadie, asi que no hay que exponer una consulta publica por suscripcion. */
  if (graciasFijo()) return;

  GRACIAS.id = q.get("id");
  try { GRACIAS.guia = sessionStorage.getItem("gg_guia"); } catch(e){}
  GRACIAS.intentos = 0;
  graciasConsulta();
}

function graciasConsulta(){
  var url = GRACIAS.id ? ("/api/gracias?id=" + encodeURIComponent(GRACIAS.id))
          : GRACIAS.guia ? ("/api/aporte/" + encodeURIComponent(GRACIAS.guia)) : null;
  if (!url){ graciasPerdida(); return; }

  fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    if (!d){ graciasPerdida(); return; }
    graciasPinta(d);
    var cerrado = ["aprobada","rechazada","error","en_distribucion","entregada"].indexOf(d.estado) >= 0;
    GRACIAS.intentos++;
    /* Diez intentos cada 3 s ≈ 30 s. Pasado eso no se insiste: se le dice al
       donante qué hacer con su guía en vez de dejarlo mirando una rueda. */
    if (!cerrado && GRACIAS.intentos < 10){
      GRACIAS.timer = setTimeout(graciasConsulta, 3000);
    } else if (!cerrado){
      var nota = document.getElementById("gracias-nota");
      if (nota){ nota.style.display=""; nota.textContent = t("gracias.slow"); }
    }
  }).catch(function(){ graciasPerdida(); });
}

function graciasPinta(d){
  var led = document.getElementById("gracias-ledger");
  if (led) led.style.display = "";
  var set = function(id, txt){ var e=document.getElementById(id); if(e) e.textContent = txt; };

  set("gr-guia", d.guia || "—");
  /* «Rastrear mi aporte» CON LA GUIA PUESTA (auditoria del 28 sep 2026). Iba a
     un «#rastrea» pelado y el donante tenia que copiar a mano el numero que
     tenia en pantalla. `?g=` es lo que ya lee el arranque para el QR del
     recibo: abre el rastreo y lo busca solo. Solo con una guia de forma valida. */
  var tr = document.getElementById("gracias-track");
  if (tr && /^GG-\d{4}-\d{6}$/.test(String(d.guia || ""))) tr.setAttribute("href", "/?g=" + encodeURIComponent(d.guia) + "#rastrea");
  /* UN MONTO AUSENTE ES «—», NO «$0». Mientras el pago no esta confirmado el
     servidor ya no publica la cifra, y `(d.monto_centavos||0)` la habria pintado
     como cero: decirle «$0 COP» a alguien que acaba de pagar es peor que no
     decirle nada. */
  set("gr-monto", d.monto_centavos == null
    ? "—"
    : (d.moneda === "COP" ? fmtCOP(d.monto_centavos/100) : fmtUSD(d.monto_centavos/100)) + " " + (d.moneda||""));

  var destino = t("gracias.fondo");
  if (d.modo === "dirigida" && d.destino){
    var lista = PARTNERS_DATA || PARTNERS_FALLBACK || [];
    var p = lista.filter(function(x){ return x.id === d.destino; })[0];
    destino = p ? p.name : d.destino;
  }
  set("gr-destino", destino);

  var etiqueta = { aprobada:"gracias.e.aprobada", rechazada:"gracias.e.rechazada", error:"gracias.e.error" }[d.estado] || "gracias.e.confirmando";
  var pill = { aprobada:"is-on", rechazada:"is-none", error:"is-none" }[d.estado] || "is-wip";
  var ee = document.getElementById("gr-estado");
  if (ee){
    ee.textContent = "";
    var s = document.createElement("span");
    s.className = "med-step-s " + pill;
    s.textContent = t(etiqueta);
    ee.appendChild(s);
  }

  var tt = document.getElementById("gracias-t");
  var pp = document.getElementById("gracias-p");
  /* Los tres caminos se escriben SIEMPRE, incluido el de confirmando. Si el
     último se omite, el render deja de depender solo de los datos y empieza a
     depender de lo que se pintó antes: basta una consulta que vuelva a
     "pendiente" para que el título siga diciendo "Confirmado". */
  if (d.estado === "aprobada" || d.estado === "en_distribucion" || d.estado === "entregada"){
    if (tt) tt.textContent = t("gracias.ok.t");
    if (pp) pp.textContent = t("gracias.ok.p");
  } else if (d.estado === "rechazada" || d.estado === "error"){
    if (tt) tt.textContent = t("gracias.no.t");
    if (pp) pp.textContent = t("gracias.no.p");
  } else {
    if (tt) tt.textContent = t("gracias.t");
    if (pp) pp.textContent = t("gracias.lead");
  }
}

function graciasPerdida(){
  var tt = document.getElementById("gracias-t");
  var pp = document.getElementById("gracias-p");
  if (tt) tt.textContent = t("gracias.lost.t");
  if (pp) pp.textContent = t("gracias.lost.p");
}


/* ---------- membresía internacional por PayPal ----------
   El monto es LIBRE y el nivel se deduce, igual que hace `TIERS` con los pesos:
   este sitio nunca tuvo precios fijos, tuvo umbrales. Los umbrales en dolares son
   los equivalentes que ya publican las tarjetas de membresia.

   Se calcula tambien LO QUE LLEGA, y no es un adorno: PayPal Colombia cobra
   5,40% + USD 0,30 al recibir del exterior y 3,50% al convertir a pesos. En un
   aporte de US$5 eso es el 14,5%. Quien esta a punto de comprometerse a un cobro
   MENSUAL tiene derecho a ver ese numero antes, y ocultarlo seria exactamente lo
   que «evidencia, no promesas» prohibe. */
/* Se guarda la CLAVE del diccionario y no el nombre: las tarjetas de membresia
   traducen los niveles (Semilla/Seed, Retoño/Sprout...) y esta linea decia
   «Retoño tier» en la pagina en ingles. Una sola fuente para los cuatro nombres. */
var MI_NIVELES = [
  { clave: "membres.t1.t", desde: 5 },
  { clave: "membres.t2.t", desde: 15 },
  { clave: "membres.t3.t", desde: 35 },
  { clave: "membres.t4.t", desde: 75 }
];

function miNivel(usd){
  var n = MI_NIVELES[0];
  for (var i = 0; i < MI_NIVELES.length; i++){ if (usd >= MI_NIVELES[i].desde) n = MI_NIVELES[i]; }
  return t(n.clave);
}

/* La misma cuenta que la pagina de comisiones de PayPal Colombia, en el mismo
   orden: primero la transaccion, despues la conversion sobre lo que quedo. */
function miNeto(usd){
  var tras = usd - (usd * 0.054 + 0.30);
  return tras - tras * 0.035;
}

/* EL INVERSO EXACTO de miNeto: cuanto hay que cobrar para que lleguen `neto`.
   Despejado de la misma formula, en el mismo orden —
     neto = (bruto - (0,054·bruto + 0,30)) · 0,965
     bruto = (neto / 0,965 + 0,30) / 0,946
   Se redondea HACIA ARRIBA al centavo: si cae, llega un centavo menos de lo que
   la persona quiso dar, y el sentido de la casilla era justo lo contrario. */
function miBruto(neto){
  return Math.ceil(((neto / 0.965 + 0.30) / 0.946) * 100) / 100;
}

function miCubre(){
  var c = document.getElementById("mif-cubre");
  return !!(c && c.checked);
}

/* LO QUE PAYPAL VA A COBRAR, que es lo unico que se le manda al servidor: la
   suscripcion se crea por el monto que se cobra, no por el que se quiso dar.
   El nivel tambien sale de aqui — quien cubre la comision esta dando mas. */
function miCargo(usd){
  return miCubre() ? miBruto(usd) : usd;
}

function miCalcula(){
  var e = document.getElementById("mif-monto");
  var out = document.getElementById("mif-calc");
  if (!e || !out) return;
  var usd = Math.round(Number(e.value) * 100) / 100;
  if (!(usd >= 5)){ out.textContent = t("mi.calc.min"); return; }
  if (usd > 2000){ out.textContent = t("mi.calc.max"); return; }

  /* El tope de PayPal aplica a LO QUE SE COBRA, no a lo que se quiso dar: con la
     comision sumada, US$2.000 se sale de la ventana. */
  var cargo = miCargo(usd);
  if (cargo > 2000){ out.textContent = t("mi.calc.max.cubre"); return; }

  if (miCubre()){
    out.textContent = t("mi.calc.cubre")
      .replace("{nivel}", miNivel(cargo))
      .replace("{cargo}", "$" + cargo.toFixed(2))
      .replace("{neto}", "$" + miNeto(cargo).toFixed(2));
    return;
  }
  var neto = miNeto(usd);
  out.textContent = t("mi.calc")
    .replace("{nivel}", miNivel(usd))
    .replace("{neto}", "$" + neto.toFixed(2))
    .replace("{pct}", ((usd - neto) / usd * 100).toFixed(1));
}

function miSubmit(ev){
  if (ev && ev.preventDefault) ev.preventDefault();
  var val = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ""; };
  var note = document.getElementById("mif-note");
  var btn = document.getElementById("mif-btn");

  /* Honeypot: exito aparente y cero envio, igual que los otros siete. */
  if (val("mif-web2")){ document.getElementById("mif").reset(); return allyMsg(note, t("mi.ok"), true); }

  var usd = Math.round(Number(val("mif-monto")) * 100) / 100;
  if (!(usd >= 5)) return allyMal(note, "mif-monto", "mi.err.min");
  if (usd > 2000) return allyMal(note, "mif-monto", "mi.err.max");
  var cargo = miCargo(usd);
  if (cargo > 2000) return allyMal(note, "mif-monto", "mi.err.max.cubre");
  if (!val("mif-nombre")) return allyMal(note, "mif-nombre", "mi.err.nombre");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("mif-email"))) return allyMal(note, "mif-email", "mi.err.email");
  if (!telOk(val("mif-tel"))) return allyMal(note, "mif-tel", "form.err.tel");
  var ok = document.getElementById("mif-datos");
  if (!ok || !ok.checked) return allyMal(note, ok || "mif-datos", "mi.err.datos");

  btn.disabled = true;
  allyMsg(note, t("mi.enviando"), true);
  fetch("/api/paypal/suscripcion", {
    method: "POST", headers: {"content-type":"application/json"},
    /* `destino` es el value del <option> —un id de programa o «general»—, nunca
       su texto. El Worker lo valida contra la lista cerrada. */
    body: JSON.stringify({ monto: cargo, nombre: val("mif-nombre"), email: val("mif-email"), telefono: val("mif-tel"),
                           idioma: lang, autoriza_datos: true, destino: val("mif-destino") || "general" })
  }).then(function(r){ return r.json(); }).then(function(d){
    /* SE VA A PAYPAL, no se dibuja nada de PayPal aqui: la CSP prohibe su SDK,
       su boton y su iframe, y esa es tambien la forma segura — nadie de fuera
       ejecuta codigo en la pagina donde alguien escribe sus datos. */
    if (d && d.ok && d.url){ location.href = d.url; return; }
    btn.disabled = false;
    /* Se dice QUE fallo cuando el servidor lo sabe, en vez de un «algo salio
       mal» que no deja hacer nada. */
    var texto = d && d.error === "monto_muy_bajo"  ? t("mi.err.min")
              : d && d.error === "monto_muy_alto"  ? t("mi.err.max")
              : d && d.error === "email_invalido"  ? t("mi.err.email")
              : d && d.error === "telefono_requerido" ? t("form.err.tel")
              : d && d.error === "paypal_no_configurado" ? t("mi.err.cerrado")
              : t("mi.err.envio");
    allyMsg(note, texto, false);
  }).catch(function(){
    btn.disabled = false;
    allyMsg(note, t("mi.err.envio"), false);
  });
  return false;
}
