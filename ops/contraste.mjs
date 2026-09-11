/* CONTRASTE DESDE EL CSS, sin navegador. Es el metodo que el propio proyecto
   dejo escrito: barrer el CSS entero buscando la familia, en vez de ir pantalla
   por pantalla. Y no depende de un panel que hoy me ha mentido cinco veces. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
/* Ruta relativa al propio archivo: corre igual desde la raiz o desde ops/. */
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(raiz, "styles.css"), "utf8");

/* --- las cuatro tablas de tokens: 2 marcas x 2 temas --- */
const bloque = (sel) => {
  const i = css.indexOf(sel + "{");
  if (i < 0) return {};
  const cuerpo = css.slice(i + sel.length + 1, css.indexOf("}", i));
  const o = {};
  for (const m of cuerpo.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/g)) o[m[1]] = m[2].trim();
  return o;
};
const base = { ...bloque(":root"), ...bloque("html") };
const tablas = {
  "fundacion/dia":  { ...base },
  "fundacion/noche":{ ...base, ...bloque('html[data-theme="dark"]') },
  "mmc/dia":        { ...base, ...bloque('html[data-marca="mmc"]') },
  "mmc/noche":      { ...base, ...bloque('html[data-theme="dark"]'), ...bloque('html[data-marca="mmc"]'), ...bloque('html[data-marca="mmc"][data-theme="dark"]') }
};

const hex = (v, t, prof = 0) => {
  if (!v || prof > 6) return null;
  v = v.trim();
  const mv = v.match(/^var\((--[a-z0-9-]+)(?:\s*,\s*([^)]+))?\)$/);
  if (mv) return hex(t[mv[1]] || mv[2], t, prof + 1);
  let m = v.match(/^#([0-9a-f]{6})$/i); if (m) return m[1];
  m = v.match(/^#([0-9a-f]{3})$/i); if (m) return m[1].split("").map(c=>c+c).join("");
  if (/^white$/i.test(v)) return "ffffff";
  if (/^black$/i.test(v)) return "000000";
  /* TRANSLUCIDO = NO SE PUEDE JUZGAR AQUI. `rgba(255,255,255,.06)` sobre una
     banda verde es blanco al 6% — tratarlo como blanco opaco daba ratio 1 y seis
     falsos positivos. Estaticamente no se sabe QUE hay detras, asi que se
     devuelve null y la pareja se salta en vez de inventar un fallo. Es la misma
     trampa del alfa que ya documente para el medidor del navegador. */
  m = v.match(/^rgba\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,/]+([\d.]+)\s*\)$/i);
  if (m && parseFloat(m[1]) < 1) return null;
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (m) return [1,2,3].map(i=>(+m[i]).toString(16).padStart(2,"0")).join("");
  return null;
};
const lum = (h) => { const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const ratio = (a,b) => { const l1=lum(a), l2=lum(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); };

/* --- reglas con color Y fondo declarados en el MISMO bloque: ahi la pareja es
       explicita y se puede juzgar sin saber donde vive el elemento --- */
const parejas = [];
for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const sel = m[1].trim().split("\n").pop().trim();
  if (sel.startsWith("@") || sel.startsWith("/*")) continue;
  const cuerpo = m[2];
  const col = cuerpo.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
  const bg  = cuerpo.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;!]+)/);
  if (!col || !bg) continue;
  const px = (cuerpo.match(/font-size\s*:\s*([^;]+)/) || [])[1] || "";
  parejas.push({ sel, color: col[1].trim(), fondo: bg[1].trim(), px });
}
console.log("reglas del CSS que declaran color Y fondo juntos: " + parejas.length + "\n");

let fallos = 0;
for (const [nombre, t] of Object.entries(tablas)) {
  const malas = [];
  for (const p of parejas) {
    /* si la regla es de una marca/tema concretos, solo se juzga en su contexto */
    if (/data-marca="mmc"/.test(p.sel) && !nombre.startsWith("mmc")) continue;
    if (/data-theme="dark"/.test(p.sel) && !nombre.endsWith("noche")) continue;
    /* SE APLICAN LOS OVERRIDE, o se marca como fallo lo que ya se arreglo.
       `.grat-logo-ph` tiene su `html[data-theme="dark"] .grat-logo-ph{color:var(--gn)}`
       desde la #317; sin mirarlo, este medidor lo denunciaba otra vez. Se busca
       una regla mas especifica del MISMO selector que redefina el color en este
       tema, y gana ella — que es lo que hace el navegador. */
    let colorEfectivo = p.color, fondoEfectivo = p.fondo;
    if (nombre.endsWith("noche")) {
      const esc = p.sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp('html\\[data-theme="dark"\\]\\s+' + esc + '\\s*\\{([^}]*)\\}');
      const ov = css.match(re);
      if (ov) {
        const c = ov[1].match(/(?:^|;)\s*color\s*:\s*([^;!]+)/);
        if (c) colorEfectivo = c[1].trim();
        /* Y EL FONDO TAMBIEN. Aqui estaba mi error: tomaba el color del override
           y el fondo de la regla base, o sea una pareja que no existe en ninguna
           pantalla. Asi «inventé» que el boton Enviar de ALMA daba 2.31 —
           #0F1613 sobre --g— cuando en la pantalla es #0F1613 sobre --acc, que
           son 8.7. Lo vi en una captura, no calculandolo. */
        const f2 = ov[1].match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;!]+)/);
        if (f2) fondoEfectivo = f2[1].trim();
      }
    }
    const f = hex(colorEfectivo, t), b = hex(fondoEfectivo, t);
    if (!f || !b) continue;
    const r = ratio(f, b);
    /* 3.0 si el tamaño declarado es grande; si no se sabe, se exige 4.5 */
    const grande = /clamp\(2|[3-9]\drem|3[2-9]px|[4-9]\dpx/.test(p.px);
    const min = grande ? 3 : 4.5;
    if (r < min) malas.push({ sel: p.sel.slice(0,52), r: +r.toFixed(2), min, f: "#"+f, b: "#"+b });
  }
  malas.sort((a,b)=>a.r-b.r);
  fallos += malas.length;
  console.log("── " + nombre + ": " + malas.length + " pareja(s) por debajo del minimo");
  for (const x of malas.slice(0,8)) console.log("   %s  %s sobre %s   %s < %s", x.sel.padEnd(52), x.f, x.b, x.r, x.min);
}
console.log("\ntotal: " + fallos);
