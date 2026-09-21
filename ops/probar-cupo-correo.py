#!/usr/bin/env python3
"""Pruebas del presupuesto diario de correo.

Uso:
    npx wrangler dev --port 8798 --persist-to /tmp/gg-cupo --test-scheduled \
        --var RESEND_API_KEY:re_llave_invalida_de_prueba \
        --var CORREO_AVISOS:equipo@ejemplo.invalid \
        --var CORREO_MMC:mmc@ejemplo.invalid
    PERSIST=/tmp/gg-cupo python3 ops/probar-cupo-correo.py

HACE FALTA UNA LLAVE FALSA. Sin `RESEND_API_KEY` el Worker simula y no llega a
mirar el presupuesto, así que no habría nada que probar. Con una llave inválida
sí lo mira, y lo que pasa el filtro acaba en `fallo` (401 de Resend) en vez de
`enviado` — que es justo la señal que distingue «pasó el presupuesto» de «lo
paró el presupuesto». Nada se entrega: Resend rechaza en la autenticación.

QUÉ VIGILA. Cuando el cupo de Resend se agota, los envíos fallaban en el orden
en que llegaban —o sea, al azar— y el único rastro era una fila `fallo` que
nadie mira. El recibo de alguien que acababa de donar podía perderse para que
saliera un aviso interno que el equipo ya veía en el panel.
"""
import json, os, re, subprocess, sys, time, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8798")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-cupo")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOPE, RESERVA = 95, 25

okc = failc = 0


def linea(ok, texto):
    global okc, failc
    if ok:
        okc += 1
        print("ok     " + texto)
    else:
        failc += 1
        print("NO OK  " + texto)
    return bool(ok)


def sql(cmd):
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "givegrow-privado", "--local",
         "--persist-to", PERSIST, "--json", "--command", cmd],
        cwd=RAIZ, capture_output=True, text=True)
    m = re.search(r"\[\s*\{.*", r.stdout, re.S)
    if not m:
        sys.exit("SQL falló: " + (r.stderr or r.stdout)[:400])
    return json.loads(m.group(0))[0]["results"]


def limpiar(gastados, resultado="enviado"):
    sql("DELETE FROM correos; DELETE FROM casos;")
    if gastados:
        sql("INSERT INTO correos (etiqueta,para,asunto,resultado,intento_en) "
            "SELECT 'relleno','x@y.invalid','x','%s',datetime('now') FROM "
            "(WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i<%d) SELECT i FROM c)"
            % (resultado, gastados))


def caso(nombre, email=None):
    cuerpo = {"nombre": nombre, "tel": "3001234567", "sector": "Prueba", "consent_eval": True}
    if email:
        cuerpo["email"] = email
    req = urllib.request.Request(BASE + "/api/caso", data=json.dumps(cuerpo).encode(),
                                 headers={"content-type": "application/json"})
    codigo = urllib.request.urlopen(req).status
    time.sleep(4)
    return codigo


def res(etiqueta):
    r = sql("SELECT resultado FROM correos WHERE etiqueta='%s' ORDER BY id DESC LIMIT 1" % etiqueta)
    return r[0]["resultado"] if r else None


print("== un día normal: 0 enviados ==")
limpiar(0)
caso("Familia Normal", "normal@ejemplo.invalid")
linea(res("caso-recibido") != "sin_cupo", "el aviso interno pasa el presupuesto")
linea(res("caso-creado") != "sin_cupo", "el correo a la familia pasa el presupuesto")

print("\n== zona de reserva: %d enviados (tope %d, reserva %d) ==" % (TOPE - RESERVA + 5, TOPE, RESERVA))
limpiar(TOPE - RESERVA + 5)
caso("Familia Reserva", "reserva@ejemplo.invalid")
linea(res("caso-recibido") == "sin_cupo",
      "el aviso INTERNO se queda fuera: el equipo tiene el panel")
linea(res("caso-creado") == "fallo",
      "y el correo a la FAMILIA pasa igual, que es de quien se trata")

print("\n== cupo agotado: %d enviados ==" % TOPE)
limpiar(TOPE)
codigo = caso("Familia Llena", "llena@ejemplo.invalid")
linea(res("caso-recibido") == "sin_cupo" and res("caso-creado") == "sin_cupo",
      "no sale ninguno de los dos")
linea(codigo == 200 and sql("SELECT COUNT(*) n FROM casos")[0]["n"] == 1,
      "PERO EL CASO SE CREA IGUAL: el presupuesto para el correo, no el trabajo")

print("\n== los fallos NO consumen cupo ==")
limpiar(TOPE, resultado="fallo")
caso("Familia Fallos", "fallos@ejemplo.invalid")
linea(res("caso-creado") != "sin_cupo",
      "%d fallos previos no apagan el correo: en Resend no gastaron nada" % TOPE)

print("\n== 'sin_cupo' NO es 'ya avisado' ==")
print("   (si lo fuera, una familia que no cupo hoy no recibiría el aviso jamás)")
limpiar(0)
sql("INSERT INTO casos (numero, token, estado, contacto_nombre, contacto_tel, sector, "
    "contacto_email, creado_en) VALUES ('MMC-2026-000777','%032x','recibido','Familia 777','000',"
    "'Prueba','f777@ejemplo.invalid',datetime('now','-7 days','-2 hours'))" % 777)
sql("INSERT INTO correos (etiqueta,para,asunto,guia,resultado) VALUES "
    "('caso-espera','f777@ejemplo.invalid','x','MMC-2026-000777','sin_cupo')")
urllib.request.urlopen(BASE + "/cdn-cgi/handler/scheduled").read()
time.sleep(12)
linea(sql("SELECT COUNT(*) n FROM correos WHERE guia='MMC-2026-000777'")[0]["n"] == 2,
      "el aviso del séptimo día SÍ se reintenta al día siguiente")

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
