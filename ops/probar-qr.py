#!/usr/bin/env python3
"""Comprueba que los QR que genera `qr.js` SE LEAN de verdad.

Uso:
    python3 -m venv /tmp/qrv
    /tmp/qrv/bin/pip install opencv-python-headless numpy
    REF=/tmp/qrv/bin/python python3 ops/probar-qr.py

POR QUÉ LA PRUEBA ES DECODIFICAR Y NO COMPARAR.
La primera versión de esta batería comparaba la matriz módulo a módulo contra
otro generador. Sirvió —encontró dos fallos reales— pero es una prueba
demasiado estricta: la norma deja libertad en el relleno tras el terminador y
en qué máscara elegir cuando dos puntúan parecido, así que dos generadores
correctos NO tienen por qué dar la misma matriz. Comparar así produce fallos
que no son fallos.

Lo que importa es una sola cosa: **que un lector lea lo que escribimos**. Eso es
lo que hace un teléfono apuntando a un recibo, y es lo que se comprueba aquí,
con un decodificador real y a dos tamaños distintos.

DOS FALLOS QUE ENCONTRÓ Y QUE SE VEÍAN PERFECTOS:
  1. El separador del buscador se pintaba oscuro cuando caía alineado con el
     borde del patrón: la condición no miraba primero si la casilla estaba
     DENTRO del 7x7.
  2. Desde la versión 7 faltaban dos de los seis patrones de alineación —los
     centrados en la fila 6 y la columna 6, que cruzan la línea de tiempo—
     porque se omitían por «esta casilla ya tiene valor» en vez de por
     posición. La v6 se leía y de la v7 en adelante NO se leía ninguna.

Ninguno de los dos se ve mirando el código generado. Por eso existe esto.

El decodificador vive en un entorno virtual desechable y NO es dependencia del
repo: la regla sigue siendo que `pdf-lib` es la única.
"""
import json, os, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.environ.get("REF", "/tmp/qrv/bin/python")

CASOS = [
    "https://www.thegiveandgrowproject.org/?g=GG-2026-000001",
    "https://www.thegiveandgrowproject.org/?g=GG-2026-999999",
    "GG-2026-000001",
    "A",
    "https://miramicasa.org/caso/MMC-2026-000042",
    "Fundación Give&Grow International · NIT 901.948.930-2",
    "áéíóú ñ Ñ ¿? ¡! — ·",
    "0123456789" * 3,
    "x" * 62,    # v4
    "y" * 106,   # v6 — la última sin información de versión
    "z" * 122,   # v7 — la primera CON información de versión
    "k" * 152,   # v8 — dos grupos de bloques
    "j" * 180,   # v9
    "w" * 213,   # v10 — el tope
]

DECODIFICA = r"""
import sys, json
import numpy as np, cv2
datos = json.load(sys.stdin)
det = cv2.QRCodeDetector()
salida = []
for caso in datos:
    m = np.array(caso["m"], dtype=np.uint8)
    lado = m.shape[0]
    leidos = {}
    for esc, borde in ((8, 4), (3, 4)):
        im = np.ones((lado + 2 * borde, lado + 2 * borde), dtype=np.uint8) * 255
        im[borde:borde + lado, borde:borde + lado] = np.where(m == 1, 0, 255)
        im = np.kron(im, np.ones((esc, esc), dtype=np.uint8))
        txt, _, _ = det.detectAndDecode(im)
        leidos[str(esc)] = txt
    salida.append(leidos)
print(json.dumps(salida))
"""

okc = failc = 0


def linea(ok, texto):
    global okc, failc
    if ok:
        okc += 1
        print("ok     " + texto)
    else:
        failc += 1
        print("NO OK  " + texto)


def genera(textos):
    js = (
        "import {qrMatriz} from '" + os.path.join(RAIZ, "qr.js") + "';"
        "const ts=JSON.parse(process.argv[1]);"
        "console.log(JSON.stringify(ts.map(t=>{const r=qrMatriz(t);"
        "return {v:r.version,lado:r.lado,m:r.modulos.map(f=>f.map(x=>x?1:0))};})));"
    )
    r = subprocess.run(["node", "--input-type=module", "-e", js, json.dumps(textos)],
                       capture_output=True, text=True, cwd=RAIZ)
    if r.returncode != 0:
        sys.exit("qr.js falló:\n" + r.stderr[:600])
    return json.loads(r.stdout)


print("== se leen, que es lo único que importa ==")
codigos = genera(CASOS)
r = subprocess.run([REF, "-c", DECODIFICA], input=json.dumps(codigos),
                   capture_output=True, text=True)
if r.returncode != 0:
    sys.exit("El decodificador falló. ¿Está el entorno con opencv?\n" + r.stderr[:600])
leidos = json.loads(r.stdout)

for texto, cod, got in zip(CASOS, codigos, leidos):
    etq = (texto[:34] + "…") if len(texto) > 34 else texto
    bien8 = got["8"] == texto
    bien3 = got["3"] == texto
    linea(bien8, "v%-2d %-36s se lee entero" % (cod["v"], etq))
    if bien8:
        linea(bien3, "v%-2d %-36s y también a 3 px por módulo" % (cod["v"], etq))

print("\n== todas las versiones que decimos soportar, cubiertas ==")
vistas = sorted({c["v"] for c in codigos})
# Las versiones estructuralmente distintas: la 1 (mínima), la 6 (última sin
# información de versión), la 7 (primera con ella y con alineaciones sobre la
# línea de tiempo) y la 8 y la 10 (dos grupos de bloques).
CLAVE = {1, 4, 6, 7, 8, 9, 10}
linea(CLAVE <= set(vistas),
      "cubiertas las versiones que cambian de estructura: " + ", ".join("v%d" % v for v in sorted(vistas)))
linea(all(c["lado"] == 17 + c["v"] * 4 for c in codigos),
      "el lado de cada matriz corresponde a su versión")

print("\n== lo que debe fallar, falla ==")
js = ("import {qrMatriz} from '" + os.path.join(RAIZ, "qr.js") + "';"
      "try{qrMatriz('x'.repeat(400));console.log('SIN ERROR');}"
      "catch(e){console.log(e.message);}")
msg = subprocess.run(["node", "--input-type=module", "-e", js],
                     capture_output=True, text=True, cwd=RAIZ).stdout.strip()
linea("no cabe" in msg, "un texto que no cabe lanza un error claro, no un QR ilegible: " + msg[:60])

print("\n== el SVG ==")
js = ("import {qrSvg} from '" + os.path.join(RAIZ, "qr.js") + "';"
      "console.log(qrSvg('https://www.thegiveandgrowproject.org/?g=GG-2026-000001'));")
svg = subprocess.run(["node", "--input-type=module", "-e", js],
                     capture_output=True, text=True, cwd=RAIZ).stdout.strip()
linea(svg.startswith("<svg") and svg.endswith("</svg>"), "sale bien formado")
linea(svg.count("<path") == 1, "un solo <path>, no un rectángulo por módulo")
linea('viewBox="0 0 41 41"' in svg, "la zona de silencio de 4 módulos entra en el viewBox")
linea("<script" not in svg.lower() and "onload" not in svg.lower(), "no lleva script ni manejadores")
# 5 KB no es estética: sin fusionar los trazos el mismo SVG pesa 7.938 bytes,
# así que este umbral atrapa que alguien deshaga la fusión.
linea(len(svg) < 5000, "los trazos siguen fusionados: %d bytes (sin fusionar serían 7.938)" % len(svg))

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
