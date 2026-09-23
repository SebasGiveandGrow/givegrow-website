/* qr.js — generador de códigos QR, escrito aquí y sin dependencias.
   ==========================================================================

   POR QUÉ ESTÁ ESCRITO A MANO Y NO ES UN PAQUETE DE npm.
   La regla del proyecto es que `pdf-lib` sea la ÚNICA dependencia, y no por
   purismo: cada paquete nuevo es código de terceros que entra al Worker que
   mueve el dinero y los datos personales de la red. Un generador de QR es un
   algoritmo cerrado, publicado en la norma ISO/IEC 18004 y que no cambia nunca
   — exactamente la clase de cosa que conviene tener escrita y entendida en casa
   antes que actualizada por otro. Son trescientas líneas que no se vuelven a
   tocar.

   QUÉ CUBRE, Y QUÉ NO.
   Modo BYTE (UTF-8), nivel de corrección M, versiones 1 a 10. Con eso caben
   213 caracteres, y la URL de rastreo de un aporte son unos 54. NO cubre los
   modos numérico ni alfanumérico —que darían un QR algo más pequeño para texto
   puramente numérico— ni las versiones 11 a 40. Si algún día hace falta más,
   está el sitio donde ampliarlo; mientras tanto, menos código es menos que
   pueda estar mal.

   POR QUÉ NIVEL M. Recupera el 15% del código dañado. Es el estándar para
   impresión: L (7%) se lee mal en un papel con un pliegue o un sello encima, y
   H (30%) hace el código bastante más grande para una ganancia que no se nota
   en un recibo que se mira en pantalla o se imprime limpio.

   CÓMO SE COMPRUEBA QUE ESTÁ BIEN. No se comprueba «a ojo»: un QR que se ve
   bien puede estar mal y no leer. `ops/probar-qr.py` genera el mismo texto con
   una implementación de referencia y compara MÓDULO A MÓDULO la matriz entera,
   sobre decenas de cadenas y todas las versiones que este archivo soporta. Esa
   referencia vive en el scratchpad y NO es dependencia del repo. */

/* ------------------------------------------------------------------ tablas */

/* Por versión (1..10) y nivel M: [palabras de corrección por bloque,
   bloques del grupo 1, palabras de datos por bloque del grupo 1,
   bloques del grupo 2, palabras de datos por bloque del grupo 2].
   Sale de la tabla 9 de la norma. Un error aquí lo caza la comparación con la
   referencia en el primer intento, que es justo para lo que está. */
const BLOQUES_M = {
  1:  [10, 1, 16, 0, 0],
  2:  [16, 1, 28, 0, 0],
  3:  [26, 1, 44, 0, 0],
  4:  [18, 2, 32, 0, 0],
  5:  [24, 2, 43, 0, 0],
  6:  [16, 4, 27, 0, 0],
  7:  [18, 4, 31, 0, 0],
  8:  [22, 2, 38, 2, 39],
  9:  [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44]
};

/* Centros de los patrones de alineación. La versión 1 no lleva ninguno. */
const ALINEACION = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};

/* La información de versión solo se dibuja desde la 7. Son los valores ya
   calculados con su BCH, tal como los publica la norma. */
const INFO_VERSION = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };

/* --------------------------------------------------- aritmética de Galois */

/* Reed-Solomon trabaja en GF(256). Las dos tablas se construyen una vez al
   cargar el módulo: son 512 entradas y evitan repetir el mismo bucle en cada
   multiplicación. */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function tablasGalois() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    /* 0x11D es el polinomio primitivo que fija la norma. */
    if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function mul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/* El polinomio generador de grado `grado`, que es (x-2^0)(x-2^1)... */
function generador(grado) {
  let g = [1];
  for (let i = 0; i < grado; i++) {
    const nuevo = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      nuevo[j] ^= g[j];
      nuevo[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = nuevo;
  }
  return g;
}

/* Las palabras de corrección de un bloque: el resto de dividir el mensaje por
   el generador. */
function correccion(datos, cuantas) {
  const g = generador(cuantas);
  const resto = new Array(datos.length + cuantas).fill(0);
  for (let i = 0; i < datos.length; i++) resto[i] = datos[i];
  for (let i = 0; i < datos.length; i++) {
    const coef = resto[i];
    if (coef === 0) continue;
    for (let j = 0; j < g.length; j++) resto[i + j] ^= mul(g[j], coef);
  }
  return resto.slice(datos.length);
}

/* ------------------------------------------------------ datos y versión */

function aBytesUtf8(texto) {
  return Array.from(new TextEncoder().encode(String(texto)));
}

/* Palabras de datos que caben en una versión, nivel M. */
function capacidadDatos(version) {
  const [ec, b1, d1, b2, d2] = BLOQUES_M[version];
  return b1 * d1 + b2 * d2;
}

function versionMinima(nBytes) {
  for (let v = 1; v <= 10; v++) {
    /* 4 bits de modo + el contador + los datos + 4 bits de terminador.
       El contador son 8 bits hasta la versión 9 y 16 desde la 10. */
    const bitsContador = v <= 9 ? 8 : 16;
    const bitsNecesarios = 4 + bitsContador + nBytes * 8;
    if (bitsNecesarios <= capacidadDatos(v) * 8) return v;
  }
  return null;
}

function palabrasDeDatos(bytes, version) {
  const bitsContador = version <= 9 ? 8 : 16;
  const bits = [];
  const empuja = (valor, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };

  empuja(0b0100, 4);                 // modo byte
  empuja(bytes.length, bitsContador);
  for (const b of bytes) empuja(b, 8);

  const capacidadBits = capacidadDatos(version) * 8;
  /* Terminador: hasta cuatro ceros, y solo si sobra sitio. */
  for (let i = 0; i < 4 && bits.length < capacidadBits; i++) bits.push(0);
  /* Se completa el byte en curso. */
  while (bits.length % 8 !== 0) bits.push(0);

  const palabras = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    palabras.push(b);
  }
  /* Relleno alternando 236 y 17, que es lo que manda la norma. */
  const relleno = [0xEC, 0x11];
  let k = 0;
  while (palabras.length < capacidadDatos(version)) palabras.push(relleno[k++ % 2]);
  return palabras;
}

/* Los bloques se INTERCALAN: primera palabra de cada bloque, segunda de cada
   bloque, y así. Es lo que hace que una mancha en el papel reparta su daño
   entre todos los bloques en vez de destruir uno entero. */
function palabrasFinales(bytes, version) {
  const [ec, b1, d1, b2, d2] = BLOQUES_M[version];
  const datos = palabrasDeDatos(bytes, version);

  const bloques = [];
  let p = 0;
  for (let i = 0; i < b1; i++) { bloques.push(datos.slice(p, p + d1)); p += d1; }
  for (let i = 0; i < b2; i++) { bloques.push(datos.slice(p, p + d2)); p += d2; }
  const bloquesEc = bloques.map((b) => correccion(b, ec));

  const salida = [];
  const maxDatos = Math.max(d1, d2 || 0);
  for (let i = 0; i < maxDatos; i++) {
    for (const b of bloques) if (i < b.length) salida.push(b[i]);
  }
  for (let i = 0; i < ec; i++) {
    for (const b of bloquesEc) salida.push(b[i]);
  }
  return salida;
}

/* ------------------------------------------------------------- la matriz */

function nuevaMatriz(lado) {
  const m = [];
  for (let i = 0; i < lado; i++) m.push(new Array(lado).fill(null));
  return m;
}

function ponerBuscador(m, fila, col) {
  for (let i = -1; i <= 7; i++) {
    for (let j = -1; j <= 7; j++) {
      const r = fila + i, c = col + j;
      if (r < 0 || c < 0 || r >= m.length || c >= m.length) continue;
      /* PRIMERO hay que saber si la casilla cae DENTRO del 7x7 del buscador.
         El anillo de i=-1/7 y j=-1/7 es el SEPARADOR y siempre va claro. Sin
         esta comprobacion, `i === 0` daba verdadero tambien para (0,7) —que es
         separador— y el buscador se salia por su propio borde. Comprobado
         contra la referencia: 12 modulos mal en un QR de version 1. */
      const dentro = i >= 0 && i <= 6 && j >= 0 && j <= 6;
      const borde = dentro && (i === 0 || i === 6 || j === 0 || j === 6);
      const centro = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      m[r][c] = dentro && (borde || centro);
    }
  }
}

function ponerAlineacion(m, version) {
  const centros = ALINEACION[version];
  const lado = m.length;
  for (const r of centros) {
    for (const c of centros) {
      /* SE OMITEN LOS TRES QUE CAEN SOBRE UN BUSCADOR, y se comprueba POR
         POSICIÓN, no por «esta casilla ya tiene valor».

         La primera versión preguntaba `if (m[r][c] !== null) continue`, que
         parece lo mismo y no lo es: desde la versión 7 hay patrones de
         alineación centrados EN la fila 6 y en la columna 6 —(6,22) y (22,6)
         en la v7— que cruzan la línea de tiempo y por tanto ya tenían valor.
         Se saltaban, y el código quedaba sin dos de sus seis alineaciones.

         Se veía perfecto. Ningún lector lo leía: comprobado con un
         decodificador real, la v6 se leía y de la v7 en adelante no se leía
         ninguna. */
      const enBuscador =
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= lado - 9) ||
        (r >= lado - 9 && c <= 8);
      if (enBuscador) continue;
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1;
        }
      }
    }
  }
}

function ponerFijos(m, version) {
  const lado = m.length;
  ponerBuscador(m, 0, 0);
  ponerBuscador(m, 0, lado - 7);
  ponerBuscador(m, lado - 7, 0);
  /* Los tiempos: la fila y la columna 6, alternando. */
  for (let i = 8; i < lado - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }
  ponerAlineacion(m, version);
  /* El módulo oscuro, que siempre está encendido. */
  m[lado - 8][8] = true;
}

/* Las casillas que se reservan para el formato, para que el recorrido de datos
   las salte. Se marcan con `false` y luego se sobrescriben con su valor real. */
function reservarFormato(m) {
  const lado = m.length;
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = false;
    if (m[i][8] === null) m[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][lado - 1 - i] === null) m[8][lado - 1 - i] = false;
    if (m[lado - 1 - i][8] === null) m[lado - 1 - i][8] = false;
  }
}

function reservarVersion(m, version) {
  if (version < 7) return;
  const lado = m.length;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      m[lado - 11 + j][i] = false;
      m[i][lado - 11 + j] = false;
    }
  }
}

/* El recorrido en zigzag: dos columnas a la vez, de derecha a izquierda,
   subiendo y bajando. La columna 6 se salta entera porque es de tiempo. */
function ponerDatos(m, palabras, ocupada) {
  const lado = m.length;
  const bits = [];
  for (const p of palabras) for (let i = 7; i >= 0; i--) bits.push((p >> i) & 1);

  let n = 0, subiendo = true;
  for (let col = lado - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let paso = 0; paso < lado; paso++) {
      const fila = subiendo ? lado - 1 - paso : paso;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (ocupada[fila][c]) continue;
        m[fila][c] = n < bits.length ? bits[n] === 1 : false;
        n++;
      }
    }
    subiendo = !subiendo;
  }
}

const MASCARAS = [
  (i, j) => (i + j) % 2 === 0,
  (i, j) => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => ((((i * j) % 2) + ((i * j) % 3)) % 2) === 0,
  (i, j) => ((((i + j) % 2) + ((i * j) % 3)) % 2) === 0
];

/* Las cuatro penalizaciones de la norma. Se elige la máscara que menos suma:
   el objetivo es que no queden zonas grandes de un solo color ni patrones que
   se confundan con un buscador. */
function penalizacion(m) {
  const lado = m.length;
  let total = 0;

  /* 1 · cinco o más del mismo color seguidos. */
  for (let i = 0; i < lado; i++) {
    for (const eje of [0, 1]) {
      let run = 1;
      for (let j = 1; j < lado; j++) {
        const a = eje ? m[j][i] : m[i][j];
        const b = eje ? m[j - 1][i] : m[i][j - 1];
        if (a === b) { run++; } else { if (run >= 5) total += run - 2; run = 1; }
      }
      if (run >= 5) total += run - 2;
    }
  }

  /* 2 · cada bloque 2×2 del mismo color. */
  for (let i = 0; i < lado - 1; i++) {
    for (let j = 0; j < lado - 1; j++) {
      const v = m[i][j];
      if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) total += 3;
    }
  }

  /* 3 · el patrón 1:1:3:1:1 con cuatro claros a un lado, que es el que se
     puede confundir con un buscador. */
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  const coincide = (get, i, j, patron) => {
    for (let k = 0; k < 11; k++) if (get(i, j + k) !== patron[k]) return false;
    return true;
  };
  for (let i = 0; i < lado; i++) {
    for (let j = 0; j + 10 < lado; j++) {
      if (coincide((a, b) => m[a][b], i, j, p1)) total += 40;
      if (coincide((a, b) => m[a][b], i, j, p2)) total += 40;
      if (coincide((a, b) => m[b][a], i, j, p1)) total += 40;
      if (coincide((a, b) => m[b][a], i, j, p2)) total += 40;
    }
  }

  /* 4 · el desequilibrio entre oscuros y claros. */
  let oscuros = 0;
  for (let i = 0; i < lado; i++) for (let j = 0; j < lado; j++) if (m[i][j]) oscuros++;
  const porcentaje = (oscuros * 100) / (lado * lado);
  total += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;

  return total;
}

/* BCH(15,5) del formato, más el XOR que fija la norma para que el formato
   nunca salga todo a cero. */
function bitsFormato(mascara) {
  /* Nivel M son los bits 00. */
  const datos = (0b00 << 3) | mascara;
  let v = datos << 10;
  for (let i = 4; i >= 0; i--) {
    if (v & (1 << (i + 10))) v ^= 0x537 << i;
  }
  return ((datos << 10) | v) ^ 0x5412;
}

function ponerFormato(m, mascara) {
  const lado = m.length;
  const bits = bitsFormato(mascara);
  const bit = (i) => ((bits >> i) & 1) === 1;

  /* LA PRIMERA COPIA VA POR LA COLUMNA 8 Y LUEGO DOBLA POR LA FILA, no al
     reves. La primera version tenia las dos copias TRANSPUESTAS: el QR se veia
     perfecto y ningun lector lo habria leido, porque el formato es lo primero
     que se decodifica. Solo lo caza comparar la matriz contra una referencia.
     La fila 6 y la columna 6 se saltan porque son de tiempo. */
  for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
  m[7][8] = bit(6);
  m[8][8] = bit(7);
  m[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) m[8][14 - i] = bit(i);

  /* La segunda copia hace el camino contrario, y NO toca el modulo oscuro de
     (lado-8, 8): por eso son 8 modulos en la fila y 7 en la columna. */
  for (let i = 0; i <= 7; i++) m[8][lado - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) m[lado - 15 + i][8] = bit(i);
}

function ponerVersion(m, version) {
  if (version < 7) return;
  const lado = m.length;
  const bits = INFO_VERSION[version];
  for (let i = 0; i < 18; i++) {
    const b = ((bits >> i) & 1) === 1;
    const fila = Math.floor(i / 3);
    const col = i % 3;
    m[lado - 11 + col][fila] = b;
    m[fila][lado - 11 + col] = b;
  }
}

/* ---------------------------------------------------------------- público */

/* Devuelve { lado, modulos } donde `modulos[f][c]` es true si va oscuro.
   NO incluye la zona de silencio: la pone quien dibuja, porque en un PDF y en
   un SVG se resuelve distinto. */
export function qrMatriz(texto) {
  const bytes = aBytesUtf8(texto);
  const version = versionMinima(bytes.length);
  if (!version) {
    throw new Error("qr: el texto no cabe en las versiones 1 a 10 (" + bytes.length + " bytes)");
  }

  const lado = 17 + version * 4;
  const palabras = palabrasFinales(bytes, version);

  /* La plantilla con los patrones fijos sirve además de mapa de ocupación:
     lo que ya tiene valor aquí es lo que el recorrido de datos debe saltar. */
  const base = nuevaMatriz(lado);
  ponerFijos(base, version);
  reservarFormato(base);
  reservarVersion(base, version);
  const ocupada = base.map((f) => f.map((v) => v !== null));

  let mejor = null, mejorPena = Infinity, mejorMascara = 0;
  for (let mascara = 0; mascara < 8; mascara++) {
    const m = base.map((f) => f.slice());
    ponerDatos(m, palabras, ocupada);
    /* La máscara se aplica SOLO a lo que no es patrón fijo ni formato. */
    for (let i = 0; i < lado; i++) {
      for (let j = 0; j < lado; j++) {
        if (!ocupada[i][j] && MASCARAS[mascara](i, j)) m[i][j] = !m[i][j];
      }
    }
    ponerFormato(m, mascara);
    ponerVersion(m, version);
    const pena = penalizacion(m);
    if (pena < mejorPena) { mejorPena = pena; mejor = m; mejorMascara = mascara; }
  }

  return { lado, version, mascara: mejorMascara, modulos: mejor.map((f) => f.map((v) => v === true)) };
}

/* El mismo QR como SVG, para una página web. `borde` son módulos de zona de
   silencio: la norma pide 4 y por debajo de eso muchos lectores fallan.

   UN SOLO `<path>` Y NO UN RECTÁNGULO POR MÓDULO: un QR de versión 4 son 1.089
   módulos, y como rectángulos sueltos el SVG pesa unas veinte veces más y el
   navegador dibuja mil nodos en vez de uno. */
export function qrSvg(texto, opciones) {
  const o = opciones || {};
  const borde = o.borde == null ? 4 : o.borde;
  const color = o.color || "#1A1D21";
  const fondo = o.fondo || "#FFFFFF";
  const { lado, modulos } = qrMatriz(texto);
  const total = lado + borde * 2;

  /* Los módulos oscuros seguidos de una fila se dibujan como UN solo trazo
     ancho, no uno por módulo. En un QR de versión 4 son unos 490 módulos: de
     uno en uno el SVG pesa 7,9 KB y así baja a menos de la mitad, con el mismo
     dibujo exacto. */
  let d = "";
  for (let i = 0; i < lado; i++) {
    let j = 0;
    while (j < lado) {
      if (!modulos[i][j]) { j++; continue; }
      let n = 1;
      while (j + n < lado && modulos[i][j + n]) n++;
      d += "M" + (j + borde) + " " + (i + borde) + "h" + n + "v1h-" + n + "z";
      j += n;
    }
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + total + '"'
    + ' shape-rendering="crispEdges" role="img" aria-label="' + (o.alt || "Código QR") + '">'
    + '<rect width="' + total + '" height="' + total + '" fill="' + fondo + '"/>'
    + '<path d="' + d + '" fill="' + color + '"/>'
    + "</svg>";
}
