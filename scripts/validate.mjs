/* Validación pre-deploy Give&Grow — falla el build si algo se rompe. */

/* ═══ ANTES DE ESCRIBIR UN GUARDIÁN NUEVO, LEE ESTO ═══════════════════════════
   El 16 de septiembre de 2026 se auditaron SIETE de los guardianes de este
   archivo y de `ops/`, preguntándole a cada uno lo mismo: ¿lo que mira es lo
   que su mensaje da a entender? Los siete se ampliaron. Ninguno mentía —todos
   describían con precisión lo que hacían— pero CINCO tenían el MISMO hueco:

     contraste        miraba styles.css, no los <style> del Worker
     tokens de color  miraba los var() de worker.js, no los de styles.css
     data-*           miraba 4 pantallas de 6, y una leyendo 4 caracteres
     cobertura i18n   miraba data-i18n del HTML, no las 215 claves que pide el JS
     balance de tags  miraba index.html, no las 10 plantillas del Worker
     desbordes de PDF miraba 3 documentos de 4
     sistema visual   miraba styles.css, no los 30.000 chars de CSS del Worker

   LA CAUSA es una sola y conviene nombrarla: este proyecto nació como un sitio
   estático con `index.html` y `styles.css`, y el Worker creció después hasta
   ser la mitad del sistema —diez páginas generadas, siete bloques <style>, su
   propio JS—. Los guardianes se escribieron mirando donde estaba el código
   entonces, y ahí se quedaron. El código se movió; ellos no.

   ASÍ QUE, AL AÑADIR UN CHECK, PREGÚNTATE LAS TRES:

     1 · ¿Vale también para lo que el Worker GENERA? Casi siempre sí.
     2 · Si lleva una lista escrita a mano, ¿qué pasa cuando alguien añada el
         elemento siguiente y no la actualice? Los cinco de arriba fallaron por
         esto. El check #8b se cuenta a sí mismo para no repetirlo: compara el
         número de plantillas reales contra el largo de su propia lista, y a la
         primera corrida encontró una que yo no había visto.
     3 · ¿Sabes que puede FALLAR? Escribe el caso malo y ejecútalo. Un guardián
         que nadie ha visto suspender no se ha probado — y el que pasa en verde
         no se vuelve a mirar nunca. De ahí venían los siete.
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { esDict, decodeHtml, eachTextNode, eachAttrNode } from "./i18n-html.mjs";

let fail = 0;
const err = (m) => { console.error("NO OK  " + m); fail = 1; };
const ok  = (m) => console.log("ok     " + m);

/* 1 · Sintaxis JS
   No solo app.js: worker.js y documentos.js también se despliegan, y un error de
   sintaxis ahí no rompe el sitio en local —donde nadie los ejecuta al validar—
   sino el Worker entero en producción. `--check` sobre un módulo ES no resuelve
   los imports, así que no necesita node_modules: comprueba forma, no enlaces.
   Del enlazado se encarga el `--dry-run` de wrangler en ci.yml. */
for (const f of ["app.js", "worker.js", "documentos.js"]) {
  try { execSync(`node --check --input-type=module < ${f}`, { shell: "/bin/sh" }); ok(f + " sintaxis"); }
  catch (e) { err(f + " sintaxis inválida"); }
}

/* 1a · LAS BARRAS QUE SE PIERDEN DENTRO DE UNA PLANTILLA.
   El check #1b de abajo compila lo EMITIDO y atrapa lo que rompe la sintaxis.
   Esto atrapa lo que NO la rompe y cambia el significado.

   Dentro de una plantilla, `\d` no es un escape valido de JS y la barra
   DESAPARECE: `\d` vale "d". Asi que una expresion regular escrita con una sola
   barra llega al navegador convertida en otra cosa, sintacticamente perfecta:

     /[+-]\d\d:?\d\d$/   ->  /[+-]dd:?dd$/     ya no son digitos
     /\.xml$/i           ->  /.xml$/i          el punto es cualquier caracter

   Encontrados SIETE el 16 sep 2026, todos en la plantilla del panel: los cuatro
   de la deteccion de zona horaria de `enCO` y tres de validacion de archivo. Con
   la segunda rota, un archivo llamado `facturaxml` —sin extension— pasaba el
   control de tipo. Comprobado: /.xml$/i lo acepta, /\.xml$/i no.

   El proyecto ya documentaba la trampa —«dentro de las plantillas hay que
   escribir \\n y \\/»— y no tenia quien la vigilara. El techo es CERO. */
{
  const fuenteWorker = readFileSync("worker.js", "utf8");
  const VALIDAS = new Set(["n", "t", "r", "b", "f", "v", "0", "'", '"', "\\", "`", "$", "x", "u", "\n"]);
  const malas = [];
  let dentro = false, i = 0;
  while (i < fuenteWorker.length) {
    const c = fuenteWorker[i];
    if (dentro) {
      if (c === "\\") {
        const sig = fuenteWorker[i + 1] || "";
        if (!VALIDAS.has(sig)) {
          malas.push("\\" + sig + " (worker.js:" + (fuenteWorker.slice(0, i).split("\n").length) + ")");
        }
        i += 2; continue;
      }
      if (c === "`") dentro = false;
    } else if (c === "`") dentro = true;
    i++;
  }
  if (malas.length) {
    err("check #1a: " + malas.length + " escape(s) dentro de una plantilla pierden la barra y cambian " +
        "el significado sin romper la sintaxis — duplicalas: " + [...new Set(malas)].join(", "));
  } else {
    ok("ningun escape pierde la barra dentro de las plantillas");
  }
}

/* 1c · LAS SEIS COPIAS DE `esc` TIENEN QUE COMPORTARSE IGUAL.
   `esc` esta definida SEIS veces en worker.js —una por ambito: el modulo y cada
   plantilla, que no pueden importar nada— y esa duplicacion es forzosa. Lo que
   no puede pasar es que discrepen: es la funcion que impide que un dato ajeno se
   convierta en HTML.

   Y discrepar no es teorico. El 16 sep 2026 se encontraron CUATRO variantes: las
   seis escapaban los mismos cinco caracteres —el negativo importante, no habia
   agujero— pero la del modulo usaba `String(s || "")` y convertia el CERO en
   cadena vacia, contra la regla del propio proyecto de que el cero se muestra.
   Ese mismo dia, tres copias de `enCO` divergian en una barra y una llegaba al
   navegador con la regex rota (PR #430).

   NO SE COMPARA EL TEXTO sino el COMPORTAMIENTO: el formato difiere
   legitimamente entre una flecha y un `function`, y lo que importa es la salida.
   Dos usan `document` —no existe en Node— asi que se les da un doble que
   reproduce lo que hace el navegador al serializar un nodo de texto: escapa
   & < > y NO las comillas, que es justo por lo que esas copias las añaden
   aparte. */
try {
  const fuente = readFileSync("worker.js", "utf8");
  const cuerpoFn = (desde) => {
    const a = fuente.indexOf("{", desde);
    let d = 0, k = a;
    while (k < fuente.length) {
      if (fuente[k] === "{") d++;
      else if (fuente[k] === "}") { d--; if (!d) return fuente.slice(desde, k + 1); }
      k++;
    }
    return "";
  };
  const copias = [];
  for (const m of fuente.matchAll(/\bfunction esc\s*\(/g)) {
    copias.push({ linea: fuente.slice(0, m.index).split("\n").length, src: cuerpoFn(m.index) });
  }
  if (copias.length < 2) {
    err("check #1c: esperaba varias copias de `esc` en worker.js y encontre " + copias.length);
  } else {
    /* El doble del navegador: textContent -> innerHTML escapa & < > y nada mas. */
    const documentoFalso = {
      createElement: () => ({
        set textContent(v) { this._t = String(v); },
        get innerHTML() { return this._t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
      })
    };
    const BATERIA = ["hola", "<b>x</b>", "a\"b'c", "a&b", 0, false, "", null, undefined, NaN, 42, "<script>", "&amp;"];
    const salidas = copias.map((c) => {
      const fn = new Function("document", c.src + "; return esc;")(documentoFalso);
      return BATERIA.map((v) => { try { return String(fn(v)); } catch (e) { return "ERROR:" + e.message; } }).join("\u0001");
    });
    const distintas = [...new Set(salidas)];
    if (distintas.length > 1) {
      const grupos = distintas.map((d) => copias.filter((_, i) => salidas[i] === d).map((c) => c.linea).join("+"));
      err("check #1c: las " + copias.length + " copias de `esc` NO se comportan igual — " +
          distintas.length + " variantes: " + grupos.join(" vs ") +
          ". Es la funcion que impide que un dato ajeno se vuelva HTML; no puede depender de en que pantalla estes.");
    } else {
      ok("las " + copias.length + " copias de `esc` se comportan igual (" + BATERIA.length + " entradas)");
    }
  }
} catch (e) { err("no se pudieron comparar las copias de `esc`: " + e.message); }

/* 1b · Sintaxis del JS que worker.js GENERA.
   El panel `/admin` no es un archivo del repo: son ~485 líneas que `adminJS()`
   devuelve como template literal y el navegador ejecuta. El check #1 valida
   worker.js —que compila perfectamente— y nunca miraba lo emitido.

   El 12 ago 2026 eso costó el panel entero durante siete horas: un `\n` dentro
   del template se interpoló y dejó un salto de línea real dentro de una cadena
   entre comillas. El admin.js servido no compilaba, así que las CUATRO tablas
   se quedaban en «Cargando…» y no había forma de notarlo desde el gate. Access
   es fail-closed, así que en local el panel devuelve 403 y tampoco se ve ahí.

   Se valida lo EMITIDO, no el código fuente del template: hay que evaluar el
   literal para que las secuencias de escape queden como quedan en producción. */
const workerSrc = readFileSync("worker.js", "utf8");
/* `fichaJS` entra el 4 sep 2026, con el cuestionario del HUB. La lista es
   MANUAL y eso es su punto flaco: un emisor nuevo que no se agregue aqui queda
   sin vigilar, y es justo donde viven las dos trampas de worker.js —comillas
   invertidas dentro de la plantilla y saltos de linea sin escapar—. Al escribir
   `fichaJS` pise la primera otra vez, en un comentario; el gate la caza SOLO si
   la funcion esta en esta lista. */
for (const [nombre, fn] of [["adminJS()", "adminJS"], ["triageJS()", "triageJS"], ["rutaJS()", "rutaJS"], ["inspeccionJS()", "inspeccionJS"], ["inspeccionSW()", "inspeccionSW"], ["fichaJS()", "fichaJS"]]) {
  try {
    const i = workerSrc.indexOf("function " + fn + "()");
    if (i === -1) throw new Error("no se encontró " + nombre);
    const ini = workerSrc.indexOf("`", i);
    /* Cierre real del literal: la primera comilla invertida sin escapar. */
    let j = ini + 1;
    for (; j < workerSrc.length; j++) {
      if (workerSrc[j] === "\\") { j++; continue; }
      if (workerSrc[j] === "`") break;
    }
    const literal = workerSrc.slice(ini, j + 1);
    if (literal.includes("${")) throw new Error(nombre + " tiene interpolaciones; este check asume que no");
    const emitido = new Function("return " + literal)();
    /* stdio en pipe: si no, el stderr de node se cuela crudo en la salida del
       gate antes del NO OK y el mensaje real queda enterrado. */
    execSync("node --check", { input: emitido, stdio: ["pipe", "pipe", "pipe"] });
    ok(nombre + " emite JS válido (" + emitido.split("\n").length + " líneas)");

    /* Y que cada bandeja se pida al arrancar. `cargarReportadas` existía, su
       endpoint respondía 200 y su tabla se quedaba en «Cargando…» para siempre:
       solo se llamaba desde los botones de confirmar, nunca en el arranque.
       Las llamadas de arranque son las únicas en columna 0; las de dentro de
       una función van indentadas. */
    /* LAS PANTALLAS DE EMERGENCIA TAMBIÉN, aunque con una regla más débil.

       Hasta el 31 ago 2026 esta línea era `if (fn !== "adminJS") continue;`, así
       que la regla de «toda bandeja llega a pedirse» cubría SOLO el panel.
       triageJS, rutaJS e inspeccionJS —las pantallas de las que dependen las
       personas en terreno, sin señal— pasaban únicamente por `node --check`.
       Era el hueco más caro del gate: el defecto original de `cargarReportadas`
       podía repetirse ahí sin que nada avisara.

       No tienen ARRANQUE ni BANDEJAS, y montárselos significaría refactorizar el
       formulario de terreno, que no se toca sin probarlo en un teléfono. Así que
       aquí se comprueba lo que SÍ se puede comprobar sin tocar nada: que ninguna
       función `cargar*`/`pintar*` esté definida y no se mencione en ningún otro
       sitio. Eso caza el caso de código muerto —definida y nunca llamada— que es
       el primo hermano del defecto original.

       LO QUE ESTA REGLA NO CAZA, y conviene saberlo: una función llamada SOLO
       desde un botón que nadie pulsa. Para eso hace falta la lista explícita de
       arranque, y eso es una tarea con teléfono delante. Comprobado el 31 ago:
       hoy ninguna de las tres tiene huérfanas. */
    if (fn !== "adminJS") {
      if (fn === "inspeccionSW" || fn === "fichaJS") continue;
      const defs = [...emitido.matchAll(/^function (cargar\w*|pintar\w*)\s*\(/gm)].map(m => m[1]);
      const sueltas = defs.filter(f => {
        const veces = [...emitido.matchAll(new RegExp("\\b" + f + "\\b", "g"))].length;
        return veces <= 1;   /* solo su propia definición */
      });
      if (sueltas.length) {
        err(nombre + ": " + sueltas.join(", ") + " está definida y nadie la llama — su pantalla se queda en «Cargando…»");
      } else {
        ok(nombre + " no deja funciones sueltas (" + defs.length + " revisadas)");
      }
      continue;
    }
    /* Desde la carga perezosa, «se pide al arrancar» ya no es la única forma
       válida: una bandeja puede estar registrada en BANDEJAS y pedirse cuando
       su tabla se acerca a la pantalla. El invariante NO cambia —toda bandeja
       tiene que llegar a pedirse— y por eso se comprueban las dos vías en vez
       de aflojar la regla. Aflojarla habría devuelto el fallo original: una
       tabla en «Cargando…» para siempre y nada avisando. */
    const definidas = [...emitido.matchAll(/^function (cargar\w*)\s*\(/gm)].map(m => m[1]);
    /* SE LEEN DOS LISTAS, no las llamadas.

       Antes el arranque se detectaba buscando `cargarX();` en la columna 0, y
       eso era falso: un salto de línea dentro de un manejador de clic dejó
       `cargarInspecciones();` en columna 0 pero DENTRO de una función, el gate
       lo contó como arranque, y esa bandeja llevaba tiempo quedándose en
       «Cargando…» en cada carga limpia. El check que existía para atrapar ese
       fallo exacto lo estaba tapando.

       Leyendo ARRANQUE y BANDEJAS no hay que adivinar dónde empieza una
       sentencia: son datos, y una coma fuera de sitio la caza `node --check`. */
    const arranque = new Set(
      ((emitido.match(/var ARRANQUE\s*=\s*\[([^\]]*)\]/) || [])[1] || "")
        .split(",").map(x => x.trim()).filter(Boolean)
    );
    const registro  = new Set(
      [...emitido.matchAll(/^\s*"[a-z0-9-]+":\s*(cargar\w*)\s*,?$/gm)].map(m => m[1])
    );
    const huerfanas = definidas.filter(f => !arranque.has(f) && !registro.has(f));
    if (huerfanas.length) {
      err(nombre + ": " + huerfanas.join(", ") + " no se pide ni al arrancar ni por BANDEJAS — su tabla se queda en «Cargando…»");
    } else if (arranque.size && !/ARRANQUE\.forEach/.test(emitido)) {
      err(nombre + ": ARRANQUE tiene " + arranque.size + " funciones y nadie la recorre");
    } else if (registro.size && !/armarBandejas\(\);/.test(emitido)) {
      /* El registro sin su observador es peor que no tenerlo: parece que las
         bandejas están cubiertas y ninguna se pide nunca. */
      err(nombre + ": BANDEJAS tiene " + registro.size + " bandejas y armarBandejas() no se llama al arrancar");
    } else {
      ok(nombre + " pide sus " + definidas.length + " bandejas (" + arranque.size +
         " al arrancar, " + registro.size + " al acercarse)");
    }
  } catch (e) {
    err(nombre + " emite JS INVÁLIDO — el panel no cargaría: " + (e.stderr ? String(e.stderr).split("\n")[1] || e.message : e.message));
  }
}

/* 1d · Todo «Cargando…» tiene quien lo rellene.

   Los checks 1b y 1c miran si el código es válido. Este mira el SÍNTOMA que la
   persona ve: una tabla que dice «Cargando…» para siempre. Fue así como se
   descubrió el defecto de `cargarReportadas` —no lo encontró una revisión, lo
   encontró alguien mirando una pantalla— y es el estado en el que un ingeniero
   sin señal se queda sin saber si el problema es el sistema o su conexión.

   La comprobación es directa: si el HTML generado deja un elemento con «Cargando»
   o «Consultando» dentro, el JS de esa misma pantalla tiene que escribir en ese
   id. Si nadie lo escribe, ese texto es permanente.

   ⚠️ ES UNA LISTA DE PALABRAS, y esa es su limitación: un marcador que diga
   «Un momento…» se le escapa. «Consultando» se añadió el 31 ago porque el bloque
   nuevo de /triaje lo usaba y el check no lo vio — o sea que la limitación no es
   teórica, ya mordió una vez. Si aparece un tercer verbo, va aquí.

   Se lee el TEXTO CRUDO de las dos funciones, sin evaluar: así entra también
   `inspeccionHTML`, que recibe argumentos e interpola, y que es justo la
   pantalla del formulario de terreno. Comprobado el 31 ago 2026: los seis
   marcadores que existen hoy tienen quien los rellene. */
/* Se extrae LA PLANTILLA, no el cuerpo de la función, y con el mismo barrido
   balanceado del check 1c. Buscar el cierre con `\n}\n` no vale: dentro de estas
   plantillas hay JS y HTML emitido con llaves en columna 0, así que el cuerpo se
   cortaba a mitad y el check daba falsos positivos —me pasó escribiéndolo—. */
const literalDe = (nombre) => {
  const i = workerSrc.indexOf("function " + nombre + "(");
  if (i === -1) return null;
  const ini = workerSrc.indexOf("`", i);
  if (ini === -1) return null;
  let k = ini + 1;
  while (k < workerSrc.length) {
    const ch = workerSrc[k];
    if (ch === "\\") { k += 2; continue; }
    if (ch === "$" && workerSrc[k + 1] === "{") {
      let d = 1; k += 2;
      while (k < workerSrc.length && d > 0) {
        if (workerSrc[k] === "{") d++;
        else if (workerSrc[k] === "}") d--;
        k++;
      }
      continue;
    }
    if (ch === "`") return workerSrc.slice(ini + 1, k);
    k++;
  }
  return null;
};
for (const [htmlFn, jsFn] of [["paginaAdmin", "adminJS"], ["paginaTriage", "triageJS"],
                              ["paginaRuta", "rutaJS"], ["inspeccionHTML", "inspeccionJS"]]) {
  const h = literalDe(htmlFn), j = literalDe(jsFn);
  if (!h || !j) { err("1d: no encontré " + (h ? jsFn : htmlFn)); continue; }
  /* UNA ETIQUETA NO BASTA, y por eso este check llevaba tiempo sin ver nada.

     La versión anterior toleraba `(?:<[^>]+>\s*)?` — UNA etiqueta intermedia—.
     Sirve para `<div id="salud"><p>Cargando…</p></div>`, que tiene una. No sirve
     para una TABLA, que tiene dos: `<tbody id="x"><tr><td>Cargando…`.

     O sea que el check nacido de una TABLA atascada en «Cargando…» no podía
     casar con una tabla. Comprobado el 11 sep 2026 metiendo un tbody huérfano
     con ese texto literal: el gate pasaba en verde.

     Con `*` en vez de `?` entra cualquier anidamiento. */
  const ids = [...new Set(
    [...h.matchAll(/id="([a-zA-Z0-9_-]+)"[^>]*>\s*(?:<[^>]+>\s*)*[^<]*(?:[Cc]argando|[Cc]onsultando|[Ss]e pide)/g)].map(m => m[1])
  )];

  /* Y ADEMÁS, LA REGLA ESTRUCTURAL, que no depende del vocabulario.

     La de arriba es una lista de palabras y su propio comentario ya avisaba de
     que «Un momento…» se le escapa. Lo que de verdad define el problema no es lo
     que el marcador diga: es que un `<tbody>` SIEMPRE lleva filas que vienen de
     datos. Si nadie lo escribe, esa tabla enseña su marcador para siempre, diga
     lo que diga.

     Los trece tbody del panel decían «Se pide al bajar hasta aquí» y «Se pide al
     abrir el módulo» —dos textos deliberados, de la carga diferida— y ninguno de
     los dos estaba en la lista. Trece tablas de datos sin vigilar. */
  const cuerpos = [...new Set([...h.matchAll(/<tbody id="([a-zA-Z0-9_-]+)"/g)].map(m => m[1]))];

  const escribe = (id) => new RegExp('(?:el|getElementById)\\(\\s*"' + id + '"\\s*\\)').test(j);
  const sinDueno = [...new Set(ids.concat(cuerpos))].filter((id) => !escribe(id));
  if (sinDueno.length) {
    err(htmlFn + ": #" + sinDueno.join(", #") + " se queda con su texto de espera — " + jsFn + "() nunca lo escribe");
  } else {
    ok(htmlFn + " · " + ids.length + " marcador(es) y " + cuerpos.length + " tabla(s) tienen quien los rellene");
  }
}

/* 1c · Las páginas HTML que el Worker GENERA no se truncan.
   El check #1b cubre el JS emitido y tenía un punto ciego: los templates de
   HTML. El 12 ago 2026 una comilla invertida dentro de un comentario HTML del
   panel cerró su template a mitad de camino y se perdieron las cinco tablas.
   `node --check worker.js` pasó en verde igualmente, porque una plantilla
   seguida de un punto —`...`.med-tbl— es sintaxis válida por accidente: se lee
   como un acceso a propiedad menos un identificador.

   La comprobación es tonta y por eso funciona: si un template empieza en
   <!doctype html>, su valor tiene que terminar en </html>. Un cierre temprano
   lo rompe siempre. */
for (const [i, m] of [...workerSrc.matchAll(/return `<!doctype html>/g)].entries()) {
  const ini = workerSrc.indexOf("`", m.index);
  let j = ini + 1;
  for (; j < workerSrc.length; j++) {
    if (workerSrc[j] === "\\") { j++; continue; }
    if (workerSrc[j] === "`") break;
  }
  const linea = workerSrc.slice(0, ini).split("\n").length;
  /* No se evalúa: estos templates interpolan valores y montar un entorno falso
     para cada uno sería más frágil que lo que se quiere comprobar. Se mira el
     TEXTO: dónde cierra la plantilla y qué hay justo antes.
     El escáner salta los ${…} con balance de llaves, porque dentro puede haber
     comillas invertidas legítimas que no cierran nada. */
  let k = ini + 1, cierre = -1;
  while (k < workerSrc.length) {
    const ch = workerSrc[k];
    if (ch === "\\") { k += 2; continue; }
    if (ch === "$" && workerSrc[k + 1] === "{") {
      let d = 1; k += 2;
      while (k < workerSrc.length && d > 0) {
        if (workerSrc[k] === "{") d++;
        else if (workerSrc[k] === "}") d--;
        k++;
      }
      continue;
    }
    if (ch === "`") { cierre = k; break; }
    k++;
  }
  if (cierre === -1) { err("plantilla HTML de worker.js:" + linea + " no cierra nunca"); continue; }
  const cuerpo = workerSrc.slice(ini + 1, cierre).trimEnd();
  if (!cuerpo.toLowerCase().endsWith("</html>")) {
    err("plantilla HTML de worker.js:" + linea + " se corta antes de </html> — termina en «" +
        cuerpo.slice(-46).replace(/\s+/g, " ") + "». Casi siempre es una comilla invertida suelta dentro del template.");
  } else {
    ok("plantilla HTML de worker.js:" + linea + " cierra en </html> (" + cuerpo.length + " chars)");
  }
}

const src  = readFileSync("app.js", "utf8");
const html = readFileSync("index.html", "utf8");

/* 2 · Paridad i18n: ES (app.js) vs EN (i18n/en.json) */
function esKeys() {
  const re = /\bes\s*:\s*\{/g; re.exec(src);
  let i = re.lastIndex, d = 1; const st = i;
  for (; i < src.length && d > 0; i++) { const c = src[i]; if (c === "{") d++; else if (c === "}") d--; }
  return new Set([...src.slice(st, i - 1).matchAll(/"([^"]+)"\s*:/g)].map(x => x[1]));
}
const es = esKeys();
let en = new Set();
try { en = new Set(Object.keys(JSON.parse(readFileSync("i18n/en.json", "utf8")))); ok("i18n/en.json válido (" + en.size + " claves)"); }
catch (e) { err("i18n/en.json inválido o ausente"); }
const soloEs = [...es].filter(k => !en.has(k));
const soloEn = [...en].filter(k => !es.has(k));
if (soloEs.length || soloEn.length) err("paridad i18n rota — solo ES: [" + soloEs.join(", ") + "] solo EN: [" + soloEn.join(", ") + "]");
else ok("paridad i18n " + es.size + "/" + en.size);

/* 3 · Cobertura data-i18n */
const used = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(x => x[1]);
const missing = [...new Set(used)].filter(k => !es.has(k));
if (missing.length) err("data-i18n sin clave: " + missing.join(", "));
else ok("cobertura data-i18n (" + new Set(used).size + " claves usadas)");

/* 3a · JERARQUIA DE ENCABEZADOS, con trinquete.
   Quien navega con lector de pantalla salta de encabezado en encabezado y usa
   el NIVEL como indice: un `h1` seguido de un `h3` deja un hueco en el esquema y
   el oyente no sabe si se perdio una seccion.

   Hoy 14 de las 29 paginas del SPA lo rompen —casi todas `h1 -> h3`, y dos peor:
   `donar` salta a `h4` e `inicio` tiene ademas `h2 -> h4`—. Arreglarlo NO es un
   cambio de accesibilidad sino de DISEÑO: `h2` y `h3` no se ven igual, asi que
   bajar el nivel cambia la pagina. Esa decision es de Sebas y esta en su lista.

   Mientras tanto, el techo es el numero de HOY: las 14 que hay pueden quedarse,
   y una pagina NUEVA nace con el esquema bien. Es el mismo trato que el
   contraste y los colores literales.

   Si se arregla alguna, este check lo dice y hay que BAJAR el numero. */
/* EN CERO desde el 16 sep 2026, y el trinquete pasa a ser una prohibición: ya
   no queda ninguna página con saltos, así que cualquier número por encima de 0
   es una regresión y no una deuda heredada. El arreglo de las 14 está en
   styles.css bajo «ENCABEZADO DE COMPONENTE»: el nivel lo fija el esquema del
   documento y la apariencia la fija `.h-comp3` / `.h-comp4`. Antes estaban
   atados, y por eso una tarjeta tenía que escribirse `h3` aunque el h2 no
   existiera. Es WCAG 1.3.1 y es lo primero que reporta una auditoría
   automática de accesibilidad. */
const TECHO_ENCABEZADOS = 0;
{
  const limpio = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const pg = [...limpio.matchAll(/<\w+[^>]*\bid="page-([^"]+)"/g)].map((m) => [m[1], m.index]);
  pg.push(["(fin)", limpio.length]);
  const rotas = [];
  for (let k = 0; k < pg.length - 1; k++) {
    const [nombre, ini] = pg[k], fin = pg[k + 1][1];
    const hs = [...limpio.slice(ini, fin).matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    if (!hs.length) continue;
    const mal = [];
    let prev = null;
    for (const niv of hs) {
      if (prev !== null && niv > prev + 1) mal.push("h" + prev + "→h" + niv);
      prev = niv;
    }
    if (hs[0] !== 1) mal.unshift("empieza en h" + hs[0]);
    if (mal.length) rotas.push(nombre + " (" + mal[0] + ")");
  }
  if (rotas.length > TECHO_ENCABEZADOS) {
    err("jerarquía de encabezados: " + rotas.length + " páginas con saltos de nivel y el techo es " +
        TECHO_ENCABEZADOS + ". Una página nueva nace con el esquema bien: h1 → h2 → h3, sin saltar. " +
        "Las que sobran: " + rotas.slice(TECHO_ENCABEZADOS).join(", "));
  } else if (rotas.length < TECHO_ENCABEZADOS) {
    ok("jerarquía de encabezados: " + rotas.length + " páginas con saltos — BAJÓ del techo " +
       TECHO_ENCABEZADOS + ". Actualiza TECHO_ENCABEZADOS en validate.mjs a " + rotas.length);
  } else {
    ok("jerarquía de encabezados: " + rotas.length + " páginas con saltos, en el techo");
  }
}

/* 3b · LAS CLAVES QUE PIDE EL JS, que nadie miraba.
   El check de arriba cubre `data-i18n="…"`, y eso solo existe en index.html.
   Pero `app.js` pide 218 claves mas con `t("…")` y ninguna se comprobaba.

   Importa por como termina `t`:

     function t(k){ return (I18N[lang] && I18N[lang][k]) || (I18N.es[k]) || k; }

   Si la clave no existe DEVUELVE LA CLAVE. O sea que un error de dedo no rompe
   nada: pinta `cv.err.nuevo` en la pantalla, en medio del texto, y sigue.

   DOS COSAS QUE HAY QUE SALTARSE, y las dos me mordieron al escribir esto:

   · LOS COMENTARIOS. `cv.err.campos` aparece una sola vez en app.js, dentro de
     un comentario que cuenta como era el codigo antes. Sin quitarlos, este
     check denuncia historia.
   · LOS PREFIJOS de composicion dinamica —`t("bc.cl." + x)`— que se leen como
     una clave acabada en punto. Para esos no se exige la clave exacta sino que
     EXISTA ALGUNA que empiece asi: un prefijo del que no cuelga nada tampoco
     sirve de nada. */
try {
  const limpio = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/[^\n]*/gm, "");
  const pedidas = [...new Set([...limpio.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]))];
  const huerfanas = [], prefijosVacios = [];
  for (const k of pedidas) {
    if (k.endsWith(".")) {
      if (![...es].some((d) => d.startsWith(k))) prefijosVacios.push(k);
    } else if (!es.has(k)) {
      huerfanas.push(k);
    }
  }
  if (huerfanas.length) {
    err("check #3b: app.js pide " + huerfanas.length + " clave(s) i18n que NO existen; `t()` devuelve la " +
        "clave tal cual, asi que se pintan en la pantalla: " + huerfanas.join(", "));
  }
  if (prefijosVacios.length) {
    err("check #3b: prefijo(s) de clave dinamica sin ninguna clave detras: " + prefijosVacios.join(", "));
  }
  if (!huerfanas.length && !prefijosVacios.length) {
    ok("claves i18n que pide app.js: " + pedidas.length + " y todas existen");
  }
} catch (e) { err("no se pudieron verificar las claves i18n de app.js: " + e.message); }

/* 3.9 · CADA FOTO DE LA GALERÍA EXISTE, Y SU MINIATURA TAMBIÉN
   Este check nació de un fallo que NO SE VE. `[assets] directory = "."` con el
   fallback del SPA hace que una ruta de imagen inexistente responda 200 con
   `text/html` —el index.html entero— en vez de 404. Comprobado el 1 sep 2026:
   /img/jornadas/thumb/brigada_marsella_derrumbe.jpg devolvía
   «200 text/html» después de borrar el archivo. Así que el navegador recibe
   HTML donde esperaba un JPEG: sale el icono de imagen rota, sin 404 en la
   consola y sin nada en los logs del Worker. Un dedazo en un nombre de archivo
   no lo atrapa nadie hasta que alguien mira la galería con sus propios ojos.

   Y una foto de jornada tiene TRES archivos, no dos: el original para el visor
   grande, `thumb/` de 400px y `m/` de 800px, que es lo que `srcset` ofrece al
   navegador. Olvidar cualquiera de los dos pequeños es el error fácil, porque
   el lightbox seguiría viéndose bien y nadie se enteraría.

   SIEMPRE .webp en los dos tamaños pequeños, aunque el original sea .jpg — que
   es justo lo que este chequeo dejó pasar al revés: derivaba la miniatura
   conservando la extensión del original, y cuando las seis de brigada pasaron a
   webp el gate pidió unos .jpg que ya no existían. El chequeo tiene que
   reflejar lo que hace `fotoSrcset` en app.js, no lo que hacía antes.

   Se cubren las DOS galerías: el array GALLERY de app.js y las `gallery[]` de
   partners.json, que desde que existe `fotoSrcset` dependen de los mismos tres
   archivos. Antes solo se miraba la primera.

   Se leen de sus propias fuentes en vez de mantener una lista aparte: una lista
   aparte es otra cosa que se desincroniza. */
let raicesJornada = [];
{
  const bloque = src.slice(src.indexOf("var GALLERY = ["), src.indexOf("var lbIndex"));
  const rutas = [...bloque.matchAll(/\{f:"([^"]+)"/g)].map((m) => m[1]);
  /* Las de las fichas llegan con ruta absoluta (/img/jornadas/x.webp); se
     normalizan a la misma forma relativa que usa GALLERY. */
  let deFichas = [];
  try {
    const pj = JSON.parse(readFileSync("data/partners.json", "utf8"));
    for (const p of pj.partners || []) {
      for (const g of p.gallery || []) deFichas.push(String(g.src || "").replace(/^\/img\//, ""));
    }
  } catch { err("galería: no se pudo leer data/partners.json"); }

  if (!rutas.length) err("galería: no se pudo leer GALLERY de app.js");
  else {
    let faltan = 0;
    const todas = [...new Set([...rutas, ...deFichas])].filter(Boolean);
    for (const f of todas) {
      const esperadas = ["img/" + f];
      const m = /^jornadas\/(.+)\.[a-z]+$/i.exec(f);
      if (m) esperadas.push("img/jornadas/thumb/" + m[1] + ".webp",
                            "img/jornadas/m/" + m[1] + ".webp");
      if (m) raicesJornada.push(m[1]);
      for (const ruta of esperadas) {
        if (!existsSync(ruta)) { err("galería: falta " + ruta); faltan++; }
      }
    }
    if (!faltan) ok("galería: " + todas.length + " fotos (" + rutas.length + " de evidencia + "
                    + deFichas.length + " de fichas), con sus tres tamaños");
  }
}

/* 3.9b · EL DESCRIPTOR `w` DICE EL ANCHO QUE EL ARCHIVO MIDE DE VERDAD
   Un `srcset` no es una lista de opciones: es una lista de PROMESAS. El `400w`
   de una candidata le jura al navegador que ese archivo tiene 400 píxeles de
   ancho, y el navegador elige con eso y sin abrir nada. Si la promesa es falsa
   elige mal con total confianza — el mismo modo de fallo que el PR #471 nombró
   para el `sizes` («un sizes que le miente al navegador es peor que no
   tenerlo»), pero del otro lado de la coma.

   Medido el 18 sep 2026: CINCO de las 23 miniaturas de jornada anunciaban 400w
   y no medían 400.

       brigada_manizales_revision   234
       brigada_aguila_apuntalado    300
       brigada_aguila_bodega        300
       brigada_aguila_escombros     300
       brigada_marsella_equipo      300

   Son las cinco fotos VERTICALES de la brigada: su `thumb/` se generó
   escalando el LADO LARGO a 400, que en una vertical es la altura, así que el
   ancho quedó corto. Las de `m/` estaban bien porque se hicieron con
   `cwebp -resize 800 0`, que fija el ancho. Se regeneraron igual.

   El check 3.9 no podía verlo: comprueba que el archivo EXISTA. Y existía. En
   pantalla tampoco se ve — la foto sale algo blanda, no rota, y ni el visor ni
   la rejilla se quejan.

   MIRA LAS DOS FUENTES DE DESCRIPTORES QUE HAY, no una:

   1 · Los que arma `fotoSrcset` en app.js. Las carpetas y sus números se leen
       del TEXTO de la propia función, no de una lista escrita aquí: si algún
       día aparece un `l/` de 1200, este check lo sigue solo. Es la misma razón
       que da 3.9 para leer las rutas de sus fuentes.
   2 · Los `srcset`/`imagesrcset` literales de index.html — el hero de fútbol,
       el banner del atardecer y los dos `<picture>` de brigada que añadió el
       PR #473. Son promesas idénticas y tampoco las miraba nadie. Hoy las
       nueve son ciertas; el check existe por la décima.

   EL ANCHO SE LEE DE LA CABECERA DEL ARCHIVO, no con `sips`: el gate corre en
   `ubuntu-latest` y allí no hay `sips` ni `cwebp`. Se parsean las tres formas
   de WebP (VP8 con pérdida, VP8L sin pérdida, VP8X extendido) y el SOF de
   JPEG, para que anunciar un `.jpg` no abra un hueco por el que el check
   pase de largo. Contrastado contra `sips` en los 85 webp y los 18 jpg del
   repositorio: cero discrepancias. */
function anchoDeImagen(ruta){
  let b; try { b = readFileSync(ruta); } catch { return null; }
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP"){
    const tipo = b.toString("ascii", 12, 16);
    /* VP8 : 3 bytes de frame tag, el sync 0x9d 0x01 0x2a, y el ancho en 14 bits. */
    if (tipo === "VP8 ") return (b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a)
      ? (b.readUInt16LE(26) & 0x3fff) : null;
    /* VP8L: firma 0x2f y luego ancho-1 en los 14 bits bajos. */
    if (tipo === "VP8L") return b[20] === 0x2f ? ((b.readUInt32LE(21) & 0x3fff) + 1) : null;
    /* VP8X: ancho-1 del lienzo, 24 bits little-endian. */
    if (tipo === "VP8X") return (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
    return null;
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8){
    let i = 2;
    while (i < b.length - 9){
      if (b[i] !== 0xff){ i++; continue; }
      const marca = b[i + 1];
      /* Marcas sin longitud: relleno, SOI y los reinicios. */
      if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)){ i += 2; continue; }
      /* SOF0..SOF15 menos DHT (c4), JPG (c8) y DAC (cc): ancho tras alto. */
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc)
        return b.readUInt16BE(i + 7);
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
{
  /* Cada promesa es {ruta, w, donde}. */
  const promesas = [];

  /* 1 · las que arma fotoSrcset, leídas de su propio cuerpo. */
  const cuerpo = src.slice(src.indexOf("function fotoSrcset("));
  const fin = cuerpo.indexOf("\nvar GALLERY");
  const variantes = [...(fin > 0 ? cuerpo.slice(0, fin) : cuerpo)
    .matchAll(/jornadas\/([a-z0-9_-]+)\/"[^"]*"\.webp\s+(\d+)w/gi)]
    .map((m) => ({ dir: m[1], w: +m[2] }));
  if (!variantes.length) err("3.9b: no pude leer ninguna variante de fotoSrcset en app.js");
  else for (const raiz of raicesJornada) {
    for (const v of variantes) promesas.push({
      ruta: "img/jornadas/" + v.dir + "/" + raiz + ".webp", w: v.w, donde: "fotoSrcset",
    });
  }

  /* 2 · los srcset/imagesrcset escritos a mano en index.html. */
  for (const m of html.matchAll(/\b(?:image)?srcset="([^"]+)"/gi)) {
    for (const cand of m[1].split(",")) {
      const c = /^\s*(\S+)\s+(\d+)w\s*$/.exec(cand);
      if (c) promesas.push({ ruta: c[1].replace(/^\//, ""), w: +c[2], donde: "index.html" });
    }
  }

  let mentiras = 0, ilegibles = 0;
  for (const p of promesas) {
    if (!existsSync(p.ruta)) continue;   /* la existencia ya la vigila 3.9 */
    const real = anchoDeImagen(p.ruta);
    if (real === null) {
      err("3.9b: no pude leer el ancho de " + p.ruta + " (" + p.donde + "), así que su "
          + "descriptor " + p.w + "w no lo comprueba nadie");
      ilegibles++;
    } else if (real !== p.w) {
      err("3.9b: " + p.ruta + " anuncia " + p.w + "w (" + p.donde + ") pero mide " + real
          + "px — el navegador elige esa candidata creyendo que trae " + p.w);
      mentiras++;
    }
  }
  if (!mentiras && !ilegibles && promesas.length) {
    ok("descriptores w: " + promesas.length + " promesas (" + variantes.length + " variantes × "
       + raicesJornada.length + " fotos + literales de index.html) y todas dicen el ancho real");
  }
}

/* 4 · JSONs */
try { JSON.parse(readFileSync("data/partners.json", "utf8")); ok("data/partners.json válido"); }
catch (e) { err("data/partners.json inválido"); }
let ld = 0;
for (const b of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  ld++;
  try { JSON.parse(b[1]); } catch (e) { err("JSON-LD #" + ld + " inválido"); }
}
ok("JSON-LD (" + ld + " bloques)");

/* 4a · EL BLOQUE DE IDENTIDAD EXISTE, Y SU NIT ES EL DE VERDAD.

   El check de arriba cuenta bloques y valida su sintaxis, pero NUNCA exige que
   haya ninguno. Comprobado el 11 sep 2026 borrando el bloque NGO: el gate pasó
   en verde. El FAQ sí está protegido —el check 4b lo compara contra el
   diccionario y falla si no está— así que el único sin guardián era justo el de
   la identidad: nombre, dirección, fecha de constitución y taxID.

   Ese bloque es lo que un buscador lee para saber QUIÉN es esta fundación.
   Perderlo no rompe nada visible: simplemente se deja de existir como entidad
   identificada, y nadie se entera.

   Y EL NIT ESTÁ ESCRITO EN 34 SITIOS. Hoy los 34 coinciden, pero nada lo
   obligaba: corregir uno dejaría a los otros 33 diciendo otra cosa, y entre
   ellos está `ENTIDAD.nit`, que es el que se imprime en el certificado de
   donación que el donante le enseña a la DIAN.

   Es la misma cicatriz del articulado del certificado —Art. 125 en un archivo y
   Art. 257 en otro durante meses— y se cierra igual: una fuente, y el gate
   comparando contra ella.

   La fuente es `ENTIDAD.nit` de documentos.js, porque es la que va impresa en un
   documento firmado bajo juramento. Se comparan solo los DÍGITOS: el JSON-LD lo
   escribe sin puntos a propósito —es un campo para máquinas— y eso es correcto. */
try {
  const digitos = (t) => String(t || "").replace(/[^0-9]/g, "");
  /* LOS NUEVE DÍGITOS SIEMPRE; EL DV SOLO SI VIENE. «901948930» y
     «901.948.930-2» son el mismo NIT escrito de dos formas legítimas —el campo
     para máquinas del JSON-LD suele ir sin puntos— y exigir el dígito de
     verificación habría marcado como error una de las dos. Lo que no puede
     variar son los nueve dígitos, y el DV cuando está escrito. */
  const mismoNit = (a, b) => a.slice(0, 9) === b.slice(0, 9) &&
    (a.length < 10 || b.length < 10 || a[9] === b[9]);
  const docs = readFileSync("documentos.js", "utf8");
  const mNit = docs.match(/nit:\s*"([^"]+)"/);
  if (!mNit) err("4a: no encontré ENTIDAD.nit en documentos.js");
  else {
    const canon = digitos(mNit[1]);

    let ngo = null;
    for (const b of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { const d = JSON.parse(b[1]); if (d["@type"] && d["@type"] !== "FAQPage") ngo = d; } catch (e) { /* ya lo reporta 4 */ }
    }
    if (!ngo) {
      err("4a: falta el bloque JSON-LD de identidad (@type NGO) — sin él la fundación " +
          "deja de existir como entidad identificada para los buscadores");
    } else if (!mismoNit(digitos(ngo.taxID), canon)) {
      err("4a: el taxID del JSON-LD (" + ngo.taxID + ") no es el NIT de ENTIDAD (" + mNit[1] + ")");
    } else {
      /* Y el resto de los sitios donde está escrito. Un NIT que difiere en UN
         sitio es un NIT que alguien va a copiar del sitio equivocado. */
      const fuentes = ["app.js", "index.html", "i18n/en.json", "documentos.js", "worker.js"];
      const malos = [];
      for (const f of fuentes) {
        let t = ""; try { t = readFileSync(f, "utf8"); } catch (e) { continue; }
        /* SOLO DONDE SE DICE QUE ES UN NIT. Cualquier número de nueve cifras
           no vale: la primera versión de esta regla marcó el «999.999.999.999»
           de un comentario sobre el tope de la pasarela. Lo que interesa no es
           un número con esa forma, es un sitio que AFIRMA un NIT. */
        for (const m of t.matchAll(/(?:NIT|taxID"?\s*:\s*"?|nit:\s*")[^0-9]{0,6}(\d[\d.\s]{9,14}\d)/gi)) {
          if (!mismoNit(digitos(m[1]), canon)) malos.push(f + ": " + m[1].trim());
        }
      }
      if (malos.length) {
        err("4a: hay NIT que no coinciden con ENTIDAD.nit — " + [...new Set(malos)].slice(0, 4).join(" · "));
      } else {
        ok("identidad: el bloque NGO está y su NIT coincide con el del certificado");
      }
    }
  }
} catch (e) { err("4a: no se pudo comprobar la identidad: " + e.message); }

/* 4b · El FAQ del JSON-LD es un DUPLICADO del diccionario, y los duplicados se
   desfasan. `hydrate-i18n.mjs` no lo toca porque no tiene atributos data-i18n,
   así que nada lo vigilaba: el 11 ago 2026 el bloque seguía prometiendo "próximamente
   habilitaremos tarjeta y PSE vía Wompi" semanas después de que Wompi estuviera vivo.
   Google lee ese bloque, así que un texto viejo ahí es desinformación publicada. */
{
  const dict = esDict(src);
  const faqs = [];
  for (const b of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let d; try { d = JSON.parse(b[1]); } catch { continue; }
    if (d["@type"] !== "FAQPage") continue;
    for (const q of (d.mainEntity || [])) {
      faqs.push({ p: (q.name || "").trim(), r: ((q.acceptedAnswer || {}).text || "").trim() });
    }
  }
  const preguntas = Object.keys(dict).filter(k => /^faq\.q\d+$/.test(k));
  const desfasados = [];
  const ausentes = [];
  for (const kq of preguntas) {
    const ka = kq.replace(".q", ".a");
    if (!dict[ka]) continue;
    const enJson = faqs.find(f => f.p === dict[kq].trim());
    /* Antes esto era `continue`, y ahí estaba el hueco: el check cazaba una
       respuesta DESFASADA pero callaba ante una pregunta AUSENTE. Una pregunta
       del FAQ que no llega al JSON-LD simplemente no existe para Google, y el
       gate decía «coincide». Lo destapó añadir las cinco de la emergencia
       (20 ago 2026): si me hubiera olvidado del bloque, habría pasado en verde.
       Si algún día hay una pregunta que a propósito no debe ir al JSON-LD, la
       salida es una lista blanca explícita, no volver a este `continue`. */
    if (!enJson) { ausentes.push(kq); continue; }
    if (enJson.r !== dict[ka].trim()) desfasados.push(ka);
  }
  if (ausentes.length) {
    err("preguntas del FAQ que NO están en el JSON-LD: " + ausentes.join(", ") +
        " — Google no las ve; añádelas al bloque FAQPage de index.html");
  }
  if (desfasados.length) {
    err("JSON-LD del FAQ desfasado del diccionario ES en: " + desfasados.join(", ") +
        " — el bloque es un duplicado a mano y hay que actualizarlo junto al dict");
  } else if (!ausentes.length) {
    ok("JSON-LD del FAQ coincide con el diccionario (" + faqs.length + " respuestas)");
  }
}

/* 5 · Balance de tags

   VIGILABA OCHO ETIQUETAS de las cuarenta y seis que esta página usa. Borrar un
   </footer>, un </form>, un </table> o un </h2> pasaba en verde — comprobado el
   11 sep 2026 quitando el </footer>: el gate no dijo nada.

   Y CONTABA DENTRO DE LOS COMENTARIOS. `index.html` tiene un comentario que
   menciona «<template>» al explicar por qué el 404 vive en uno, y eso bastaba
   para que esa etiqueta saliera descuadrada 2/1. O sea que la lista corta tapaba
   además un falso positivo: si alguien hubiera escrito «<div>» en un comentario,
   el check habría fallado sin que nada estuviera mal.

   Se quitan comentarios, <script> y <style> antes de contar —dentro de un script
   hay texto entre comillas que puede parecer una etiqueta, y el bloque JSON-LD
   es exactamente eso— y se vigilan todas las que se cierran.

   NO ENTRAN LAS VACÍAS (img, br, input, meta, link, hr, source): no llevan
   cierre, así que contarlas daría siempre desbalance. */
const htmlLimpio = html
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "");
const TAGS_CERRADAS = [
  "main", "section", "div", "ul", "ol", "li", "span", "a", "button",
  "footer", "header", "nav", "p", "form", "label", "fieldset", "legend",
  "table", "thead", "tbody", "tr", "td", "th",
  "article", "aside", "figure", "figcaption", "details", "summary",
  "select", "option", "textarea", "picture", "video", "blockquote",
  "dl", "dt", "dd", "strong", "em", "small", "b", "i", "code", "pre",
  "time", "address", "template",
  "h1", "h2", "h3", "h4", "h5", "h6"
];
let tagsOk = true, tagsVistas = 0;
for (const tag of TAGS_CERRADAS) {
  const o = (htmlLimpio.match(new RegExp("<" + tag + "[\\s>]", "g")) || []).length;
  const c = (htmlLimpio.match(new RegExp("</" + tag + ">", "g")) || []).length;
  if (!o && !c) continue;
  tagsVistas++;
  if (o !== c) { err("tags <" + tag + "> desbalanceados: " + o + " abren / " + c + " cierran"); tagsOk = false; }
}
if (tagsOk) ok("balance de tags (" + tagsVistas + " etiquetas vigiladas)");

/* 8b · Y EL MISMO BALANCE EN LAS PLANTILLAS DEL WORKER.
   El check de arriba corre sobre index.html. Las paginas que el Worker GENERA
   —panel, triaje, terreno, ruta, firma, ficha, carnet, correo, compartir— solo
   se comprobaban con «termina en </html>». Un </div> que falte en el panel, que
   son 36.000 caracteres generados, no lo veia nadie.

   SOLO LAS QUE SON UNA PLANTILLA LITERAL, y el limite es honesto: worker.js
   tambien arma HTML CONCATENANDO cadenas —`'<tr' + (nula ? ' style=…' : '') +
   '>'`— y ahi contar etiquetas no funciona. Medido sobre el archivo entero
   daban tres desbalances (div 162/160, label 55/53, tr 61/64) y los tres eran
   artefactos: hay exactamente tres `'<tr' +` concatenados, que abren sin que
   `<tr[\s>]` los vea y cierran donde si se ve. Un guardian que falla por
   no-razones se acaba silenciando, que es peor que no tenerlo.

   Quedan fuera dos paginas construidas asi: la de «Access no configurado» del
   router y el popup `verFicha`. Las dos son pequeñas y de tags contados.

   LA LISTA SE VIGILA A SI MISMA. Hoy he encontrado CINCO guardianes que cubrian
   menos de lo que parecia, todos por una lista escrita a mano que se quedo
   corta al crecer el sistema. Asi que se cuentan los `<!doctype` que viven
   DENTRO de una plantilla literal y se comparan con el largo de la lista:
   añadir una decima sin registrarla SUSPENDE. */
const PLANTILLAS = [
  "plantillaCorreo", "paginaTriage", "inspeccionHTML", "paginaFirma",
  "paginaCarnet", "paginaFicha", "paginaRuta", "paginaAdmin", "sharePage",
  /* Vive DENTRO de la plantilla de adminJS: es el popup que abre el panel. */
  "verFicha"
];
try {
  /* `<!doctype` dentro de comillas invertidas, recorriendo con estado. */
  let enPlantilla = 0, dentro = false;
  for (let k = 0; k < workerSrc.length; k++) {
    const c = workerSrc[k];
    if (dentro) {
      if (c === "\\") { k++; continue; }
      if (c === "`") { dentro = false; continue; }
      if (c === "<" && /^<!doctype/i.test(workerSrc.slice(k, k + 9))) enPlantilla++;
    } else if (c === "`") dentro = true;
  }
  if (enPlantilla !== PLANTILLAS.length) {
    err("check #8b: worker.js tiene " + enPlantilla + " plantillas HTML literales y la lista registra " +
        PLANTILLAS.length + ". Si añadiste una, ponla en PLANTILLAS o nadie le mira el balance.");
  }
  const cuerpoDe = (nombre) => {
    let i = workerSrc.indexOf("function " + nombre + "(");
    if (i < 0) i = workerSrc.indexOf("const " + nombre + " = ");
    if (i < 0) return "";
    let j = i + 10, dentro2 = false;
    while (j < workerSrc.length) {
      const c = workerSrc[j];
      if (dentro2) {
        if (c === "\\") { j += 2; continue; }
        if (c === "`") dentro2 = false;
      } else if (c === "`") { dentro2 = true; }
      else if (c === "\n" && /^(?:async function |function |const [A-Za-z_$][\w$]* = `)/.test(workerSrc.slice(j + 1, j + 40))) break;
      j++;
    }
    return workerSrc.slice(i, j);
  };
  let malas = 0;
  for (const nombre of PLANTILLAS) {
    const cuerpo = cuerpoDe(nombre);
    if (!cuerpo) { err("check #8b: no encontre la plantilla " + nombre); malas++; continue; }
    const limpio = cuerpo
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");
    const rotas = [];
    for (const tag of TAGS_CERRADAS) {
      const a = (limpio.match(new RegExp("<" + tag + "[\\s>]", "g")) || []).length;
      const c = (limpio.match(new RegExp("</" + tag + ">", "g")) || []).length;
      if (a !== c) rotas.push("<" + tag + "> " + a + "/" + c);
    }
    if (rotas.length) { err("check #8b · " + nombre + ": tags desbalanceados — " + rotas.join(", ")); malas++; }
  }
  if (!malas && enPlantilla === PLANTILLAS.length) {
    ok("balance de tags en las " + PLANTILLAS.length + " plantillas literales del Worker");
  }
} catch (e) { err("no se pudo verificar el balance de las plantillas del Worker: " + e.message); }

/* 5b · Claves ES duplicadas — en un literal JS gana la última, así que un duplicado
   silencia el valor que creíste haber puesto. Difícil de ver a ojo en 676 claves. */
{
  const blk = src.slice(src.indexOf("var I18N"), src.indexOf("function t("));
  const cuenta = {};
  for (const m of blk.matchAll(/"([a-zA-Z0-9_.\-]+)"\s*:/g)) cuenta[m[1]] = (cuenta[m[1]] || 0) + 1;
  const dup = Object.keys(cuenta).filter(k => cuenta[k] > 1);
  if (dup.length) err("claves ES duplicadas (gana la última): " + dup.join(", "));
  else ok("sin claves ES duplicadas");
}

/* 6 · index.html hidratado — el HTML servido debe decir lo mismo que el diccionario ES.
   Sin esto la SPA publica un cascarón hueco: crawlers, previews de enlace y modos
   lectura ven viñetas vacías y titulares desfasados. Regenerar con:
   node scripts/hydrate-i18n.mjs */
try {
  const dict = esDict(src);
  let vacios = 0, desfasados = 0;
  const ejemplos = [];
  eachTextNode(html, ({ key, inner }) => {
    const want = dict[key];
    if (want == null || decodeHtml(inner) === want) return;
    inner.trim() ? desfasados++ : vacios++;
    if (ejemplos.length < 5) ejemplos.push(key);
  });
  /* Y LOS ATRIBUTOS, que este check no miraba. `eachTextNode` los omite porque su
     destino no es el contenido, y nadie recogía el testigo: un aria-label o un alt
     escrito a mano podía decir una cosa y el diccionario otra sin que nada lo
     notara. En marcha no se ve —applyLang los repinta— pero un rastreador sí, y un
     lector de pantalla en el rato anterior a que cargue el JS también. Al escribir
     esto había tres desfasados, dos de ellos aria-label de una galería. */
  let enAttr = 0, ausentes = [];
  eachAttrNode(html, ({ key, attr, value }) => {
    const want = dict[key];
    if (want == null) return;
    if (value === null) { ausentes.push(key + " [" + attr + "]"); return; }
    if (decodeHtml(value) === want) return;
    enAttr++;
    if (ejemplos.length < 5) ejemplos.push(key + " [" + attr + "]");
  });
  if (ausentes.length) {
    err("index.html declara data-i18n-attr para " + ausentes.length + " atributo(s) que NO están " +
        "escritos en la etiqueta, así que antes de que cargue el JS no existen: " + ausentes.join(", "));
  }
  if (vacios || desfasados || enAttr) {
    err("index.html desincronizado del diccionario ES: " + vacios + " vacíos, " + desfasados +
        " desfasados" + (enAttr ? ", " + enAttr + " en atributos" : "") +
        " (" + ejemplos.join(", ") + "…) — corrige con: node scripts/hydrate-i18n.mjs");
  } else ok("index.html hidratado (texto y atributos)");
} catch (e) { err("no se pudo verificar la hidratación: " + e.message); }

/* 10 · Las minutas dicen lo mismo que el certificado del sistema.
   `ops/minutas-certificado.js` genera los .docx que se llenan a mano cuando una
   donación no pasó por el sitio o fue en especie. Su articulado es el MISMO que
   arma `documentos.js` — y ahí está el peligro: son dos copias del mismo texto
   legal en archivos distintos, que es exactamente la forma en que el Drive y el
   sitio terminaron diciendo cosas contrarias sobre el mismo artículo (Art. 125 /
   125% contra Art. 257 / 25%) durante meses, sin que nadie lo notara.

   Se comparan solo las cláusulas que son idénticas por definición en los dos
   documentos: la sección III completa, la IV, el aviso del art. 257 y la
   cláusula de expedición. Las que llevan datos del aporte (numerales II.1 a
   II.6) no se comparan: en el PDF se interpolan y en la minuta son campos en
   blanco, así que divergen a propósito.

   Falla en las dos direcciones: si el texto cambia en documentos.js y no en la
   minuta, y si la cláusula desaparece de documentos.js. */
try {
  const minutaSrc = readFileSync("ops/minutas-certificado.js", "utf8");
  const docsSrc = readFileSync("documentos.js", "utf8");

  /* Un literal de texto puede estar partido en varias cadenas unidas por `+`
     para no pasarse del ancho de línea. Se reconstruyen aquí, o media cláusula
     no se encontraría nunca. */
  const cadenas = (fuente) => {
    const out = [];
    const re = /"((?:[^"\\]|\\.)*)"(\s*\+\s*"(?:[^"\\]|\\.)*")*/g;
    for (const m of fuente.matchAll(re)) {
      const partes = [...m[0].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
      out.push(partes.join("").replace(/\\"/g, '"').replace(/\s+/g, " ").trim());
    }
    return out;
  };

  const enDocs = cadenas(docsSrc);
  const enMinuta = new Set(cadenas(minutaSrc));

  /* Las cláusulas juradas, por su arranque. Se busca el texto COMPLETO de cada
     una en documentos.js y se exige idéntico en la minuta. */
  const juradas = [
    "Que recibió a título de donación",
    "Tipo de entidad donataria:",
    "Para efectos de lo previsto en los artículos 125-1",
    "Ha sido reconocida como persona jurídica",
    "Ha cumplido con la obligación de presentar",
    "Maneja los ingresos por donaciones",
    "Se encuentra calificada y vigente",
    "Destina la totalidad de sus excedentes",
    "La donación aquí certificada constituye",
    "La donación no consistió en acciones",
    "La información aquí certificada fue tomada",
    "El contenido de esta certificación se entiende rendido",
    "Se informa al donante que, conforme al artículo 257",
    "La presente certificación se expide en cumplimiento"
  ];

  /* Igualdad exacta, y si no, que el literal de documentos.js esté CONTENIDO en
     alguna cadena de la minuta. Lo segundo es por las cláusulas que interpolan
     un dato: el numeral II.2 termina en `+ ENTIDAD.vigilancia + "."`, así que su
     literal se corta en «…control de la » mientras la minuta lleva el nombre
     escrito. Sin esta rama el check gritaría por una diferencia que no existe. */
  const listaMinuta = [...enMinuta];
  const sinFuente = [], divergentes = [];
  for (const arranque of juradas) {
    const texto = enDocs.find((s) => s.startsWith(arranque));
    if (!texto) { sinFuente.push(arranque); continue; }
    if (enMinuta.has(texto)) continue;
    if (listaMinuta.some((s) => s.includes(texto))) continue;
    divergentes.push(arranque);
  }

  if (sinFuente.length) {
    err("el certificado de documentos.js ya no tiene estas cláusulas: «" + sinFuente.join("», «") +
        "» — si el articulado cambió a propósito, actualiza la lista del check #10");
  } else if (divergentes.length) {
    err("ops/minutas-certificado.js no dice lo mismo que documentos.js en: «" + divergentes.join("», «") +
        "» — el mismo texto legal en dos documentos que se contradicen");
  } else {
    ok("minutas y certificado dicen lo mismo (" + juradas.length + " cláusulas juradas)");
  }
} catch (e) { err("no se pudo comparar las minutas con el certificado: " + e.message); }

/* 11 · Trinquete del sistema visual (plan VISUAL, Fase 4).
   El sistema existe —más de 50 tokens— pero el CSS no lo usaba: 207 colores
   escritos a mano en 79 tonos distintos, y 211 tamaños de fuente sueltos en 26
   medidas, con medios puntos (13.5px, 14.5px, 16.5px…). Así es como aparecen un
   `#B4690E` fuera de paleta en el mapa y tres rojos de error distintos.

   No se puede exigir cero de golpe: la migración necesita triaje uno por uno
   —muchos de los `#fff` son legítimos, sobre superficies oscuras en los dos
   modos— y hacerla a ciegas rompería el modo noche sin que nadie lo note.

   Así que esto es un TRINQUETE, no un muro: fija el número actual como techo.
   No se puede empeorar, y cada tanda de migración baja el listón. Si migras,
   BAJA estas dos constantes: el check te dice el número exacto. */
/* 72 -> 73 el 12 sep 2026: se definio el token `--ok` tambien dentro del
   bloque `@media print`, que fuerza la paleta de dia. Ese bloque es una
   DEFINICION de tokens como las otras, pero el filtro de arriba no lo
   reconoce —su selector va dentro de la at-rule— asi que sus literales
   cuentan, igual que ya contaban los de `--g`, `--acc` y `--amber` que
   estan a su lado. Subir el trinquete es lo correcto aqui: el numero no
   empeoro por una fuga, sino por un token mas. */
const TECHO_COLORES = 68;   // 72 → 68 el 25 sep 2026: la Fase 2 quitó los rellenos rgba de los pasos de la portada
const TECHO_FUENTES = 21;
/* Y LOS DEL WORKER, que este trinquete nunca habia contado. Sus siete bloques
   <style> son 30.000 caracteres de CSS —el panel, el triaje, terreno, ruta,
   firma, la ficha y el carnet— y el sistema de tokens les aplica igual.

   Techos separados a proposito: mezclarlos con los de styles.css borraria de
   donde viene cada fuga, y son dos sitios que se tocan en momentos distintos.

   Es el mismo hueco que tenia el medidor de contraste hasta el PR #415: miraba
   styles.css y no lo que el Worker pinta. */
const TECHO_COLORES_WK = 33;
const TECHO_FUENTES_WK = 83;
try {
  const css = readFileSync("styles.css", "utf8");
  /* Los bloques que DEFINEN tokens son justo donde los literales deben estar.
     Se reconoce cualquier regla cuyo selector mencione `:root`, `html[data-theme`
     o `data-marca`, no solo las que empiezan por ahí: la hoja de impresión
     redefine su paleta con `:root, :root[data-theme="dark"] {`, y con la forma
     anterior ese bloque entero se contaba como fugas.

     `data-marca` entró el 19 ago con la piel de Mira Mi Casa, que redefine los
     mismos tokens del sistema para el subdominio. Sus bloques son definiciones
     igual que los otros dos, y sin esto el trinquete los contaba como 52 fugas
     nuevas — que era la respuesta correcta a la pregunta equivocada. */
  const defs = (css.match(/[^{}]+\{[^}]*\}/gs) || [])
    .filter(b => /:root|html\[data-theme|data-marca/.test(b.slice(0, b.indexOf("{"))));
  let resto = css;
  for (const d of defs) resto = resto.replace(d, "");

  const colores = (resto.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || []).length;
  const fuentes = (resto.match(/font-size:\s*[0-9.]+px/g) || []).length;

  const reportaWk = (nombre, n, techo) => {
    if (n > techo) {
      err(nombre + ": " + n + " y el techo es " + techo + ". El sistema de tokens vale igual " +
          "en las pantallas que genera el Worker; usa `var(--…)` en vez de escribirlo suelto.");
    } else if (n < techo) {
      ok(nombre + ": " + n + " — BAJÓ del techo " + techo + ". Actualiza TECHO_*_WK en validate.mjs a " + n);
    } else {
      ok(nombre + ": " + n + ", en el techo");
    }
  };
  const reporta = (nombre, n, techo, ayuda) => {
    if (n > techo) {
      err(`${nombre}: ${n} en styles.css, y el techo es ${techo}. ` +
          `Usa los tokens de \`:root\` (${ayuda}). Si de verdad hace falta uno nuevo, ` +
          `defínelo como token y súbelo ahí, no lo escribas suelto.`);
    } else if (n < techo) {
      ok(`${nombre}: ${n} — BAJÓ del techo ${techo}. Actualiza TECHO_* en validate.mjs a ${n}`);
    } else {
      ok(`${nombre}: ${n}, en el techo`);
    }
  };
  reporta("colores literales fuera de los tokens", colores, TECHO_COLORES, "--g, --acc, --amber, --err…");
  reporta("tamaños de fuente sueltos", fuentes, TECHO_FUENTES, "--fs-body, --fs-h3, --fs-eyebrow…");

  /* LO MISMO EN LOS <style> DEL WORKER. Se juntan los siete y se les quita sus
     propias definiciones de tokens, igual que arriba con styles.css. */
  const cssWk = (workerSrc.match(/<style>([\s\S]*?)<\/style>/g) || [])
    .map((b) => b.replace(/^<style>/, "").replace(/<\/style>$/, "")).join("\n");
  const defsWk = (cssWk.match(/[^{}]+\{[^}]*\}/gs) || [])
    .filter((b) => /:root|html\[data-theme|data-marca/.test(b.slice(0, b.indexOf("{"))));
  let restoWk = cssWk;
  for (const d of defsWk) restoWk = restoWk.replace(d, "");
  const coloresWk = (restoWk.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || []).length;
  const fuentesWk = (restoWk.match(/font-size:\s*[0-9.]+px/g) || []).length;
  reportaWk("colores literales en los <style> del Worker", coloresWk, TECHO_COLORES_WK);
  reportaWk("tamaños de fuente sueltos en los <style> del Worker", fuentesWk, TECHO_FUENTES_WK);
} catch (e) { err("no se pudo medir el sistema visual: " + e.message); }

/* 12 · LA WHITELIST `ACT_FNS` CUBRE TODO LO QUE EL HTML INVOCA.
   ---------------------------------------------------------------------------
   La CSP prohíbe `onclick`, así que los eventos van por delegación: los
   atributos `data-act` / `data-input` / `data-change` / `data-submit` /
   `data-enter` nombran una función y el despachador SOLO invoca las que estén
   registradas en `ACT_FNS`. Sin `eval`, y eso es deliberado.

   El precio de ese diseño es que una función NO registrada falla EN SILENCIO:
   se hace clic y no pasa nada, sin error en consola. Pasó de verdad el 3 de
   septiembre de 2026 — `miSubmit` y `miCalcula` se quedaron fuera y el botón
   «Continuar a PayPal» de la membresía internacional no hacía nada. Lo reportó
   Sebas usando el sitio, que es la peor forma de enterarse.

   Este check lo habría atrapado antes de salir. Mira los DOS sitios donde vive
   HTML: `index.html` y las plantillas que `app.js` genera en runtime. */
try {
  /* `src` y `html` ya se leyeron arriba (app.js e index.html): se reusan en vez
     de volver a tocar el disco. */
  const app = src;
  const i = app.indexOf("var ACT_FNS = {");
  if (i < 0) throw new Error("no encontré `var ACT_FNS = {` en app.js");
  const bloque = app.slice(i, app.indexOf("};", i));
  const registradas = new Set([...bloque.matchAll(/(\w+)\s*:/g)].map(m => m[1]));

  const usadas = new Map();
  for (const [nombre, txt] of [["index.html", html], ["app.js", app]]) {
    for (const m of txt.matchAll(/data-(?:act|input|change|submit|enter)=\\?["']([^"']+)/g)) {
      for (const f of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) {
        if (!usadas.has(f[1])) usadas.set(f[1], new Set());
        usadas.get(f[1]).add(nombre);
      }
    }
  }

  const huerfanas = [...usadas.keys()].filter(f => !registradas.has(f));
  if (huerfanas.length) {
    err("botones muertos — el HTML invoca " + huerfanas.length + " función(es) que NO están en ACT_FNS, " +
        "así que el clic no hace nada y NO sale error: " +
        huerfanas.map(f => f + "() [" + [...usadas.get(f)].join(", ") + "]").join(", ") +
        ". Regístralas en ACT_FNS de app.js.");
  } else {
    ok("ACT_FNS cubre las " + usadas.size + " funciones que invoca el HTML");
  }
} catch (e) { err("no se pudo verificar ACT_FNS: " + e.message); }

/* CHECK #13 — TOKENS DE COLOR QUE NO EXISTEN.
   Nace de una cicatriz escrita en worker.js: el panel usó `var(--ok)` dos veces
   porque otras pantallas del Worker lo declaran, pero el panel enlaza
   /styles.css y ahí --ok NO existe. No pintó nada y no dio error: CSS descarta
   en silencio una custom property indefinida. Se descubrió mirando la pantalla.

   Hoy quedaba otro igual, `--amber-bg`, vivo solo por su valor de respaldo.

   LIMITACIÓN, dicha en voz alta: esto no sabe QUÉ página emite cada `var()`, así
   que acepta un token declarado en cualquier <style> de worker.js. O sea que
   atrapa el token que no existe en ningún sitio —el caso de --amber-bg— pero no
   el que existe en otra página, que fue justo el caso de --ok. Para eso haría
   falta atribuir cada uso a su plantilla; se deja escrito en vez de fingir que
   está cubierto. */
try {
  const hoja = readFileSync("styles.css", "utf8");
  const declarados = new Set([
    ...[...hoja.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]),
    ...[...workerSrc.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]),
  ]);

  const huerfanos = new Map();
  for (const m of workerSrc.matchAll(/var\((--[a-z0-9-]+)\s*(,)?/g)) {
    if (declarados.has(m[1])) continue;
    const linea = workerSrc.slice(0, m.index).split("\n").length;
    if (!huerfanos.has(m[1])) huerfanos.set(m[1], { lineas: [], respaldo: !!m[2] });
    huerfanos.get(m[1]).lineas.push(linea);
    if (!m[2]) huerfanos.get(m[1]).respaldo = false;
  }

  if (huerfanos.size) {
    err("worker.js usa " + huerfanos.size + " token(s) de color que NO declara ni " +
        "styles.css ni el propio worker.js. CSS los descarta en silencio: " +
        [...huerfanos].map(([t, d]) =>
          t + " (línea " + d.lineas[0] + (d.respaldo ? ", solo pinta por su respaldo" : ", no pinta nada")
        + ")").join(", "));
  } else {
    ok("los tokens de color de worker.js existen (" +
       [...workerSrc.matchAll(/var\(--[a-z0-9-]+/g)].length + " usos)");
  }
} catch (e) { err("no se pudo verificar los tokens de worker.js: " + e.message); }

/* CHECK #13b — Y LOS DEL PROPIO `styles.css`, que era el hueco.
   El check de arriba comprueba los `var()` de worker.js contra los tokens
   declarados en los DOS archivos. Su mensaje de error nombra bien el peligro
   —«CSS los descarta en silencio»— y dejaba sin vigilar el archivo GRANDE: un
   `var(--acento-nuevo)` mal escrito en styles.css, sin fallback, hace que el
   navegador tire la declaracion entera sin decir nada. Ni consola, ni error de
   build, ni nada: el color simplemente no se aplica.

   DOS CATEGORIAS, y solo una es un fallo:

   · SIN fallback  -> la declaracion se pierde. Es un bug y suspende siempre.
     Hoy hay CERO, asi que el techo es cero.
   · CON fallback  -> funciona, pero el token esta MUERTO: el valor real es
     siempre el de respaldo. No suspende; se nombra para que no se esconda.
     Hoy son tres —`--bg2` una vez y `--mono` dos—, y llevan asi desde antes
     de este check. */
try {
  const hoja = readFileSync("styles.css", "utf8");
  const declarados = new Set([
    ...[...hoja.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]),
    ...[...workerSrc.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1])
  ]);
  const conFb = [], sinFb = [];
  for (const m of hoja.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,)?/g)) {
    if (declarados.has(m[1])) continue;
    const linea = hoja.slice(0, m.index).split("\n").length;
    (m[2] ? conFb : sinFb).push(m[1] + " (styles.css:" + linea + ")");
  }
  if (sinFb.length) {
    err("check #13b: " + sinFb.length + " var() de styles.css apunta(n) a un token que NO existe y SIN " +
        "fallback, asi que el navegador descarta la declaracion en silencio: " + sinFb.join(", "));
  } else if (conFb.length) {
    ok("var() de styles.css: ninguno roto · " + conFb.length + " apunta(n) a un token muerto pero con " +
       "fallback, que es el valor real: " + conFb.join(", "));
  } else {
    ok("var() de styles.css: todos apuntan a un token declarado");
  }
} catch (e) { err("no se pudieron verificar los tokens de styles.css: " + e.message); }

/* CHECK #14 — LA REGLA 1 DEL CONSENTIMIENTO, OBLIGADA POR EL BUILD.
   «Sin `consent.name === true` no hay perfil» está escrita en worker.js y la
   respetaba el generador del objeto de partners.json… y nadie más. Quedaban dos
   puertas por las que el nombre de una fundación podía publicarse sin que
   constara su autorización:

     · una entrada añadida a mano a `partners.json` sin bloque `consent`;
     · `PARTNERS_FALLBACK` en app.js, que traía una fundación real escrita a
       mano, fuera del sistema de consentimiento. Ahí lo que fallaba no era
       publicar de más hoy, sino la REVOCACIÓN: sacar a alguien de
       `partners.json` no lo sacaba del respaldo.

   Este check cierra las dos. El `hub` es Give&Grow: no necesita autorización de
   un tercero para nombrarse a sí misma. */
try {
  const datos = JSON.parse(readFileSync("data/partners.json", "utf8"));
  const malos = (datos.partners || []).filter(
    (p) => p.type !== "hub" && !(p.consent && p.consent.name === true)
  );
  if (malos.length) {
    err("partners.json publica " + malos.length + " aliada(s) sin `consent.name === true`, " +
        "que es la regla 1 del cuestionario: " + malos.map((p) => p.name || p.id).join(", ") +
        ". Sin autorización registrada no se publica el nombre.");
  } else {
    ok("consentimiento: las " + (datos.partners || []).length + " entradas de partners.json cumplen la regla 1");
  }

  /* Y el respaldo de app.js, que no pasa por partners.json ni por su consent. */
  const i = src.indexOf("var PARTNERS_FALLBACK = [");
  if (i < 0) throw new Error("no encontré PARTNERS_FALLBACK en app.js");
  const fin = src.indexOf("];", i);
  const respaldo = new Function("return " + src.slice(i + "var PARTNERS_FALLBACK = ".length, fin + 1))();
  const ajenos = respaldo.filter((p) => p.type !== "hub");
  if (ajenos.length) {
    err("PARTNERS_FALLBACK de app.js trae " + ajenos.length + " entrada(s) que NO son del hub: " +
        ajenos.map((p) => p.name).join(", ") + ". Ese respaldo se pinta cuando partners.json no carga, " +
        "y vive fuera del sistema de consentimiento: quien esté ahí sigue publicándose aunque se le " +
        "retire la autorización y se le saque de partners.json.");
  } else {
    ok("el respaldo de aliadas solo lleva lo propio de Give&Grow (" + respaldo.length + ")");
  }
} catch (e) { err("no se pudo verificar el consentimiento de las aliadas: " + e.message); }

/* CHECK #15 — LOS `data-*` DEL PANEL Y DEL TRIAJE, QUE NADIE VIGILABA.
   ---------------------------------------------------------------------------
   El check #12 protege el sitio público: `ACT_FNS` es una lista blanca y el
   gate comprueba que cubra todo lo que el HTML invoca, porque «un botón muerto
   no hace nada y NO sale error».

   Las pantallas del Worker no usan `ACT_FNS`. Cablean sus botones con
   `data-*` leídos por delegadores de clic —el panel tiene 34 atributos
   repartidos en cinco delegadores— y hasta hoy NADA los cruzaba. Un
   `data-anular` emitido y un delegador que lee `data-anul` es exactamente el
   mismo fallo silencioso, en el sitio donde se anulan certificados y se borran
   fotos de familias.

   Se cuentan como «leído» las cuatro formas reales que usa este archivo:
   `getAttribute`, `hasAttribute`, cualquier `[data-x` dentro de un selector
   —eso cubre `closest("[data-x]")` y los compuestos tipo
   `.ecaso[data-para="…"]`— y `dataset.enCamello`. Y también el CSS, porque
   `data-label` existe solo para `td::before{content:attr(data-label)}`.

   LIMITACIÓN, dicha en voz alta: esto casa por NOMBRE de atributo, no por
   pareja emisor–lector. Un `data-cert` emitido en una tabla y leído por el
   delegador de otra pasa el check. Atrapa el error de dedo, que es el que
   ocurre; no atrapa el de cableado cruzado. */
try {
  const src = readFileSync("worker.js", "utf8");
  const css = readFileSync("styles.css", "utf8");

  /* Saca la plantilla de una función, respetando las comillas invertidas
     escapadas — que en este archivo las hay. */
  /* SE LEE LA FUNCION ENTERA, y no su primera plantilla. Antes esto cogia la
     primera cadena entre comillas invertidas y paraba. Medido:

       paginaFicha      funcion  6.700 chars -> leia      4
       inspeccionHTML   funcion 54.703 chars -> leia 14.187

     Cuatro caracteres. El check decia «los data-* de ficha tienen quien los
     lea» habiendo leido nada. Un guardian que informa sobre lo que no vio es
     peor que no tenerlo.

     Y juntar todas las plantillas tampoco bastaba: `paginaFicha` arma su HTML
     CONCATENANDO CADENAS con comillas simples, asi que ahi no hay plantillas que
     juntar. Leyendo el cuerpo entero da igual como se construya el HTML — y el
     texto de mas es inofensivo, porque este check solo busca atributos `data-*`
     y quien los lee.

     EL FINAL NO SE BUSCA CON UN indexOf. `\nfunction ` aparece DENTRO de las
     plantillas, porque el JS que emiten define funciones: con eso el corte caia
     antes de empezar y no se encontraba ni una. Hay que recorrer sabiendo
     cuando se esta dentro de una plantilla y cuando fuera. */
  const plantilla = (nombre) => {
    let i = src.indexOf("function " + nombre + "(");
    if (i < 0) i = src.indexOf("const " + nombre + " = `");
    if (i < 0) return "";

    let j = i + 10, dentro = false;
    while (j < src.length) {
      const c = src[j];
      if (dentro) {
        if (c === "\\") { j += 2; continue; }
        if (c === "`") dentro = false;
      } else if (c === "`") {
        dentro = true;
      } else if (c === "\n" && /^(?:async function |function |const [A-Za-z_$][\w$]* = `)/.test(src.slice(j + 1, j + 40))) {
        break;
      }
      j++;
    }
    return src.slice(i, j);
  };

  const camello = (a) => a.replace(/^data-/, "").replace(/-([a-z])/g, (m, c) => c.toUpperCase());

  const pantallas = [
    { nombre: "panel", html: plantilla("paginaAdmin"), js: plantilla("adminJS") },
    { nombre: "triaje", html: plantilla("paginaTriage"), js: plantilla("triageJS") },
    { nombre: "terreno", html: plantilla("inspeccionHTML"), js: plantilla("inspeccionJS") },
    { nombre: "ruta", html: plantilla("paginaRuta"), js: plantilla("rutaJS") },
    /* AÑADIDAS EL 16 SEP 2026. El Worker genera SEIS pantallas con JS y este
       check cruzaba cuatro. Faltaban la ficha de fundacion y —mas grave— la de
       FIRMA, que es la mas nueva del sistema y donde un `data-*` que nadie lee
       significa un boton que no firma y no avisa. */
    { nombre: "ficha", html: plantilla("paginaFicha"), js: plantilla("fichaJS") },
    { nombre: "firma", html: plantilla("paginaFirma"), js: plantilla("firmaJS") }
  ];

  /* ------------------------------------------------------------------
     CHECK #17 · el «ir a» de cada cola del panel lleva a algún sitio

     Cada alerta del panel trae un destino para que quien la lee pueda ir a
     arreglarla de un clic. Si ese ancla no existe, el enlace no hace nada y no
     sale ningún error: la alerta te dice que hay trabajo y te deja en el mismo
     sitio.

     Nació de encontrar TRES rotos a la vez el 23 sep 2026: `#sec-casos` —que no
     existe, la sección se llama `sec-casas`— usado por dos colas, y una tercera
     que copió el mismo destino roto de la primera. Un ancla mala se propaga
     copiando la cola de al lado, que es exactamente lo que pasó.
     ------------------------------------------------------------------ */
  {
    const ids = new Set([...src.matchAll(/id=\\?"(sec-[a-z]+)\\?"/g)].map((m) => m[1]));
    const rotos = [];
    for (const m of src.matchAll(/enCola\(\s*"([a-z_]+)"/g)) {
      const trozo = src.slice(m.index, m.index + 1600);
      const d = trozo.match(/,\s*\d+,\s*"(#sec-[a-z]+)"\s*\)/);
      if (d && !ids.has(d[1].slice(1))) rotos.push(m[1] + " → " + d[1]);
    }
    if (rotos.length) {
      err("check #17 · el «ir a» de " + rotos.length + " cola(s) del panel apunta a un ancla que NO existe, " +
          "así que el enlace no hace nada y no sale error: " + rotos.join(", ") +
          ". Las secciones reales son: " + [...ids].sort().join(", "));
    } else {
      ok("el «ir a» de cada cola del panel lleva a una sección que existe (" + ids.size + " secciones)");
    }
  }

  /* ------------------------------------------------------------------
     CHECK #18 · toda cola del panel tiene nombre y módulo

     Una cola sale del servidor con una clave (`correos_sin_cupo`) y el panel la
     dibuja con dos tablas escritas a mano: `COLA_ES` le pone el nombre que lee
     una persona y `COLA_MOD` dice de qué pestaña es. Las dos fallan CALLADAS y
     de distinta forma:

     · sin `COLA_ES`, el respaldo es «COLA_ES[clave] || clave», así que la alerta
       sale a pantalla con el nombre de la variable. Se ve, pero no dice qué hacer.
     · sin `COLA_MOD`, `pintarContadores` hace «if (!m) return;» y la cola NO
       suma en ninguna insignia — tampoco en la de «hoy», que es el total. O sea
       que la alerta existe y la consola dice que no hay nada pendiente.

     El propio comentario de `COLA_MOD` cuenta que esto ya pasó una vez: «siete
     de diecisiete no se contaban». Volvió a pasar el 23 sep 2026 con las TRES
     colas más nuevas del sistema —las que se añadieron justo para hacer visible
     lo que fallaba en silencio—, y se encontró a mano. Añadir una cola es tocar
     tres sitios y el tercero no se nota: por eso lo mira el gate.
     ------------------------------------------------------------------ */
  {
    const claves = [...src.matchAll(/enCola\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
    const tabla = (nombre) => {
      const i = src.indexOf("var " + nombre + " = {");
      if (i < 0) return null;
      const j = src.indexOf("\n};", i);
      return new Set([...src.slice(i, j).matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]));
    };
    const es = tabla("COLA_ES"), mod = tabla("COLA_MOD");
    if (!es || !mod) {
      err("check #18: no encontré COLA_ES o COLA_MOD en el panel");
    } else {
      const sinNombre = claves.filter((c) => !es.has(c));
      const sinModulo = claves.filter((c) => !mod.has(c));
      if (sinNombre.length) {
        err("check #18 · " + sinNombre.length + " cola(s) sin entrada en COLA_ES: " + sinNombre.join(", ") +
            " · salen a pantalla con la clave cruda en vez de un nombre que diga qué hacer");
      }
      if (sinModulo.length) {
        err("check #18 · " + sinModulo.length + " cola(s) sin entrada en COLA_MOD: " + sinModulo.join(", ") +
            " · no suman en NINGUNA insignia, ni en la de «hoy»: la alerta existe y el panel dice que no hay nada");
      }
      /* Al revés también: una entrada que sobra es una cola que se borró del
         servidor y dejó su nombre atrás. No rompe nada, pero es la pista de que
         estas tablas se quedaron desalineadas. */
      const sobran = [...es].filter((c) => !claves.includes(c))
        .concat([...mod].filter((c) => !claves.includes(c)));
      if (sobran.length) {
        err("check #18 · COLA_ES/COLA_MOD nombran cola(s) que el servidor ya no emite: " +
            [...new Set(sobran)].join(", "));
      }
      if (!sinNombre.length && !sinModulo.length && !sobran.length) {
        ok("las " + claves.length + " colas del panel tienen nombre y módulo");
      }
    }
  }

  /* ------------------------------------------------------------------
     CHECK #19 · el verde neón no vuelve, y ningún vidrio va sin prefijo

     El 25 sep 2026 se retiró `--gn`, que era el green-400 de Tailwind: el
     acento ácido que la guía de marca identifica como firma de diseño hecho por
     IA. Lo reemplaza `--brote`. Un verde así vuelve solo, copiando un color de
     un ejemplo o de otra página, y nadie lo nota hasta que alguien lo mira de
     noche: por eso el gate lo busca en todo lo que pinta el sitio.

     Y cada `backdrop-filter` va con su `-webkit-`. Sin él, en iPhone con iOS 17
     o anterior el vidrio no desenfoca y el texto queda sobre la foto a secas.
     Antes de este check había CUATRO desenfoques y tres iban sin prefijo.
     ------------------------------------------------------------------ */
  {
    const fuentes = ["styles.css", "app.js", "index.html", "worker.js", "documentos.js"];
    const neon = [];
    for (const f of fuentes) {
      let t = "";
      try { t = readFileSync(f, "utf8"); } catch { continue; }
      const lineas = t.split("\n");
      lineas.forEach((l, i) => {
        if (/#4ade80\b|rgba?\(\s*74\s*,\s*222\s*,\s*128/i.test(l) || /var\(--gn\)/.test(l)) neon.push(f + ":" + (i + 1));
      });
    }
    if (neon.length) {
      err("check #19 · volvió el verde neón (green-400 de Tailwind o var(--gn)) en " + neon.join(", ") +
          " · usa var(--brote), el verde claro de marca para superficies oscuras");
    } else {
      ok("sin rastro del verde neón en " + fuentes.length + " archivos");
    }

    const hoja = readFileSync("styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const sinPrefijo = [];
    for (const m of hoja.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const cuerpo = m[2];
      if (/(^|[^-])backdrop-filter\s*:/.test(cuerpo) && !/-webkit-backdrop-filter\s*:/.test(cuerpo)) {
        sinPrefijo.push(m[1].trim().split("\n").pop().slice(0, 60));
      }
    }
    if (sinPrefijo.length) {
      err("check #19 · " + sinPrefijo.length + " regla(s) con backdrop-filter y sin -webkit-backdrop-filter: " +
          sinPrefijo.join(" | ") + " · en iOS 17 o anterior ese vidrio no desenfoca");
    } else {
      ok("todo backdrop-filter lleva su -webkit-");
    }
  }

  /* ------------------------------------------------------------------
     CHECK #20 · toda clase que pinta el sitio tiene quien la lea

     Nació de un fallo del 25 sep 2026, a mitad de la Fase 3 del plan «Vidrio y
     papel»: un script renombró la clase de la foto de Rastrea en index.html y
     falló ANTES de escribir styles.css. La página se quedaba sin estilos de
     foto —ni posición, ni recorte, ni velo— y este gate pasaba en verde, porque
     nada miraba si una clase del HTML tenía alguna regla. Se encontró midiendo.

     Dos direcciones, con dos rigores distintos:

     · ESTRICTA: una clase usada en index.html o escrita por app.js tiene que
       aparecer en algún selector de CSS o en una consulta del JS
       (querySelector, closest, classList.contains…). Si no, casi siempre es un
       nombre que cambió de un lado y no del otro. Los prefijos que el JS
       completa («track-badge-» + estado) valen si alguna regla empieza por
       ellos. Y hay clases que son SOLO NOMBRE —heredan su estilo del
       contenedor—: van en la lista de abajo, cada una con su motivo, para que
       añadir una sea una decisión y no un descuido.

     · TRINQUETE: una regla de CSS cuya clase no usa nadie es CSS muerto. Aquí
       hay excepciones legítimas —las secciones ocultas a propósito de
       index.html (CLAUDE.md pide no borrarlas), las páginas que genera
       worker.js con /styles.css, las clases que pone Leaflet— y por eso no es
       estricta: el número solo puede bajar.
     ------------------------------------------------------------------ */
  {
    const SOLO_NOMBRE = {
      "ally-note": "línea de estado de los formularios: hereda del contenedor, el JS escribe el texto",
      "cv-paso": "cada paso del flujo del caso: se muestra y oculta por id",
      "eco-item": "una cifra de la tira del ecosistema: la maqueta la pone .eco-row",
      "ev-fecha": "la fecha del acta: hereda de .ev-cab (versalitas, tenue)",
      "mmc-perdido": "aviso de caso perdido: lleva .mu y estilo en línea"
    };
    const TECHO_CSS_MUERTO = 9;

    const html = readFileSync("index.html", "utf8");
    const js = readFileSync("app.js", "utf8");
    let worker = "";
    try { worker = readFileSync("worker.js", "utf8"); } catch { /* sin worker, sin páginas generadas */ }
    const hoja = readFileSync("styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const htmlVivo = html.replace(/<!--[\s\S]*?-->/g, "");

    const clasesDe = (t) => {
      const out = new Set();
      for (const m of t.matchAll(/class=\\?["']([^"']*)["']/g)) {
        for (const c of m[1].split(/\s+/)) if (/^[a-zA-Z][\w-]*$/.test(c)) out.add(c);
      }
      return out;
    };
    const usadas = new Set([...clasesDe(htmlVivo), ...clasesDe(js)]);
    for (const m of js.matchAll(/classList\.(?:add|toggle|remove)\(\s*["']([\w-]+)/g)) usadas.add(m[1]);

    const estilosHtml = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
    const selectores = [...(hoja + "\n" + estilosHtml).matchAll(/([^{}]+)\{/g)].map((m) => m[1]).join(" ");
    const conRegla = new Set([...selectores.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
    const ganchos = new Set();
    for (const re of [/(?:querySelector(?:All)?|closest|matches)\(\s*["'][^"']*?\.([\w-]+)/g,
                      /classList\.contains\(\s*["']([\w-]+)/g,
                      /getElementsByClassName\(\s*["']([\w-]+)/g]) {
      for (const m of js.matchAll(re)) ganchos.add(m[1]);
    }
    const esPrefijoConRegla = (c) => c.endsWith("-") && [...conRegla].some((r) => r.startsWith(c));

    const huerfanas = [...usadas].filter((c) =>
      !conRegla.has(c) && !ganchos.has(c) && !esPrefijoConRegla(c) && !(c in SOLO_NOMBRE)).sort();
    if (huerfanas.length) {
      err("check #20 · " + huerfanas.length + " clase(s) en el HTML o el JS sin NINGUNA regla ni gancho: " +
          huerfanas.join(", ") + " · casi siempre es un nombre que cambió en un lado y no en el otro. " +
          "Si de verdad solo es un nombre, añádela a SOLO_NOMBRE en validate.mjs con su motivo.");
    } else {
      ok("las " + usadas.size + " clases del sitio tienen regla, gancho o motivo escrito");
    }
    const sobranMotivos = Object.keys(SOLO_NOMBRE).filter((c) => !usadas.has(c) || conRegla.has(c));
    if (sobranMotivos.length) {
      err("check #20 · SOLO_NOMBRE lista clase(s) que ya no hacen falta ahí (no se usan, o ya tienen regla): " +
          sobranMotivos.join(", "));
    }

    /* El trinquete. «Usada» aquí es más amplio: cuenta el HTML entero con sus
       secciones ocultas, worker.js, y los prefijos que el JS completa. */
    const todoTexto = html + "\n" + js + "\n" + worker;
    const usadasAmplio = new Set([...clasesDe(html), ...clasesDe(js), ...clasesDe(worker), ...usadas]);
    const prefijosJS = [...todoTexto.matchAll(/["'\s]([a-z][\w-]*-)["']\s*\+/g)].map((m) => m[1]);
    const muertas = [...conRegla].filter((c) =>
      !usadasAmplio.has(c) && !ganchos.has(c) && !c.startsWith("leaflet-") &&
      !prefijosJS.some((p) => c.startsWith(p)) &&
      !new RegExp("[\"'`\\s.]" + c.replace(/[-]/g, "\\-") + "[\"'`\\s]").test(todoTexto)).sort();
    if (muertas.length > TECHO_CSS_MUERTO) {
      err("check #20 · CSS muerto: " + muertas.length + " clase(s) con regla que nadie usa, y el techo es " +
          TECHO_CSS_MUERTO + ". Las nuevas: revisa si renombraste una clase en el HTML y dejaste la regla vieja. " +
          "Lista: " + muertas.join(", "));
    } else if (muertas.length < TECHO_CSS_MUERTO) {
      ok("CSS muerto: " + muertas.length + " — BAJÓ del techo " + TECHO_CSS_MUERTO + ". Actualiza TECHO_CSS_MUERTO a " + muertas.length);
    } else {
      ok("CSS muerto: " + muertas.length + ", en el techo (" + muertas.join(", ") + ")");
    }
  }

  /* ------------------------------------------------------------------
     CHECK #21 · cada script en línea tiene su hash en la CSP

     La CSP de `_headers` no permite 'unsafe-inline': cada <script> en línea de
     index.html entra solo si su sha256 exacto está en script-src. Cambiar UNA
     letra del script cambia el hash, y el navegador lo bloquea sin decírselo a
     nadie —solo a la consola de quien la abra—.

     Pasó el 16 sep 2026 (#446): se editó el script que fija el tema antes del
     primer pintado —para darle a Mira Mi Casa su color de barra nocturno— y el
     hash no se actualizó. Nueve días bloqueado en producción: el tema lo ponía
     app.js después, así que de noche la página cargaba un instante en claro, y
     Mira Mi Casa nunca tuvo su color de barra. Se encontró por casualidad,
     leyendo la consola en otra verificación.

     Y al revés: un hash en la CSP que ya no corresponde a ningún script es un
     permiso huérfano. No rompe nada hoy, pero autoriza código que no existe.
     ------------------------------------------------------------------ */
  {
    const { createHash } = await import("node:crypto");
    const html = readFileSync("index.html", "utf8");
    const cab = readFileSync("_headers", "utf8");
    const linea = cab.split("\n").find((l) => /Content-Security-Policy:/i.test(l)) || "";
    const scriptSrc = (linea.match(/script-src([^;]*)/) || [, ""])[1];
    const permitidos = new Set([...scriptSrc.matchAll(/'sha256-([^']+)'/g)].map((m) => m[1]));
    const ejecutables = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter((m) => !/type=["']?application\/(ld\+)?json/i.test(m[1]));
    const hashes = ejecutables.map((m) => ({
      h: createHash("sha256").update(m[2], "utf8").digest("base64"),
      inicio: m[2].trim().slice(0, 50).replace(/\s+/g, " ")
    }));
    const bloqueados = hashes.filter((x) => !permitidos.has(x.h));
    if (!linea) {
      err("check #21: no encontré la línea Content-Security-Policy en _headers");
    } else if (bloqueados.length) {
      err("check #21 · " + bloqueados.length + " script(s) en línea de index.html que la CSP BLOQUEA (su hash no está en script-src): " +
          bloqueados.map((x) => "«" + x.inicio + "…» → 'sha256-" + x.h + "'").join(" · ") +
          " · pon ese hash en _headers; el navegador no avisa a nadie");
    } else {
      ok("los " + hashes.length + " scripts en línea de index.html tienen su hash en la CSP");
    }
    const vivos = new Set(hashes.map((x) => x.h));
    const huerfanos = [...permitidos].filter((h) => !vivos.has(h));
    if (huerfanos.length) {
      err("check #21 · la CSP autoriza " + huerfanos.length + " hash(es) que no son de ningún script de index.html: " +
          huerfanos.map((h) => h.slice(0, 12) + "…").join(", ") + " · es un permiso para código que ya no existe; quítalo");
    }
  }

  for (const p of pantallas) {
    if (!p.js) { err("check #15: no encontré la plantilla JS de " + p.nombre); continue; }
    const texto = p.html + "\n" + p.js;
    const emitidos = new Set([...texto.matchAll(/(data-[a-z0-9-]+)\s*=/g)].map((m) => m[1]));
    const huerfanos = [...emitidos].filter((a) => {
      const leeJS = new RegExp(
        "(?:get|has)Attribute\\(\"" + a + "\"\\)" +
        "|\\[" + a + "[\\]=]" +
        "|dataset\\." + camello(a) + "\\b"
      );
      if (leeJS.test(p.js)) return false;
      /* El CSS también cuenta: attr(data-x) y [data-x…]. */
      if (css.includes("attr(" + a + ")") || css.includes("[" + a)) return false;
      if (texto.includes("attr(" + a + ")")) return false;
      return true;
    });
    if (huerfanos.length) {
      err("check #15 · " + p.nombre + ": " + huerfanos.join(", ") +
          " se emite(n) en el HTML y nadie los lee — el clic no hace nada y NO sale error");
    } else {
      ok("los data-* de " + p.nombre + " tienen quien los lea (" + emitidos.size + ")");
    }
  }
} catch (e) { err("no se pudieron cruzar los data-* de las pantallas del Worker: " + e.message); }

/* ── check #16 · LA SUCESIÓN DE FIRMANTES SE AÑADE, NO SE SOBRESCRIBE ──────
   `ENTIDAD.repLegal` y `ENTIDAD.revisora` son listas con `desde` porque el PDF
   se redibuja en cada descarga: si fueran una sola persona, rotar el revisor
   fiscal reescribiría el nombre impreso en TODOS los certificados ya firmados,
   encima de su fecha de firma y de una huella que seguiría validando. El
   porqué completo está en `ops/firma-certificados.md`.

   Esto vigila la FORMA, que es lo que se puede ver desde fuera: que sigan
   siendo listas, que estén ordenadas, que solo la fundacional pueda ir sin
   fecha, y que toda revisora lleve su tarjeta profesional —el art. 3 de la Ley
   43 de 1990 pide la T.P., no la cédula—.

   LO QUE ESTE CHECK NO PUEDE VER: que alguien edite EN SITIO el nombre de una
   entrada existente en vez de añadir una nueva. Eso no lo distingue ningún
   análisis estático del archivo; lo dice el comentario de `documentos.js` y lo
   dice aquí, y es cuanto se puede hacer sin comparar contra el histórico. */
try {
  const doc = readFileSync("documentos.js", "utf8");
  const bloque = doc.slice(doc.indexOf("const ENTIDAD"), doc.indexOf("const VERDE"));
  for (const quien of ["repLegal", "revisora"]) {
    const m = bloque.match(new RegExp(quien + ":\\s*\\[([\\s\\S]*?)\\n  \\]"));
    if (!m) {
      err("check #16: ENTIDAD." + quien + " ya no es una lista. Volver a una sola persona reabre " +
          "el hueco entero: ver ops/firma-certificados.md");
      continue;
    }
    const entradas = [...m[1].matchAll(/desde:\s*(null|"(\d{4}-\d{2}-\d{2})")/g)].map((x) => x[2] || null);
    if (!entradas.length) { err("check #16: ENTIDAD." + quien + " está vacía"); continue; }
    const sinFecha = entradas.filter((d) => d === null).length;
    if (sinFecha > 1) err("check #16: ENTIDAD." + quien + " tiene " + sinFecha + " entradas sin `desde`. " +
                          "Solo la fundacional puede ir sin fecha; las demás dicen desde cuándo.");
    if (entradas.length > 1 && entradas[0] !== null && !entradas[0]) err("check #16: la primera entrada de " + quien + " no es válida");
    const fechas = entradas.filter(Boolean);
    for (let i = 1; i < fechas.length; i++) {
      if (fechas[i] <= fechas[i - 1]) {
        err("check #16: ENTIDAD." + quien + " está desordenada (" + fechas[i - 1] + " antes de " + fechas[i] +
            "). La lista va de la más antigua a la más reciente.");
      }
    }
    if (quien === "revisora") {
      const conTp = [...m[1].matchAll(/tp:\s*"/g)].length;
      if (conTp !== entradas.length) {
        err("check #16: " + entradas.length + " revisora(s) y solo " + conTp + " con tarjeta profesional. " +
            "El certificado imprime la T.P. y con ella se consulta la Junta Central de Contadores.");
      }
    }
    ok("sucesión de " + quien + ": " + entradas.length + " entrada(s), en orden");
  }
} catch (e) { err("no se pudo revisar la sucesión de firmantes: " + e.message); }

process.exit(fail);
