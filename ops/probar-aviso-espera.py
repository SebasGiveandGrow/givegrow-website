#!/usr/bin/env python3
"""Pruebas del aviso del séptimo día (tarea programada de Mira Mi Casa).

Uso:
    npx wrangler dev --port 8796 --persist-to /tmp/gg-aviso --test-scheduled
    python3 ops/probar-aviso-espera.py

QUÉ VIGILA, Y POR QUÉ. Esta es la única ruta del sistema que le escribe sola a
familias que esperan un concepto sobre su casa después de un sismo. Tenía tres
fallos que solo se notaban con volumen, y los tres apuntaban al mismo día: aquel
en que llegan muchas de golpe, que es justo para el que existe Mira Mi Casa.

  1. Sin tope: 150 familias cruzando el séptimo día = 150 envíos seguidos, por
     encima del plan de Resend (100/día, 10/segundo).
  2. La idempotencia miraba CUALQUIER fila de `correos`, y `anotarCorreo`
     escribe también los intentos fallidos. Un envío rechazado contaba como
     «ya salió» y esa familia no se reintentaba nunca más.
  3. `enviados++` iba suelto detrás del await, y `enviarCorreo` no lanza cuando
     Resend responde mal: un día de cupo agotado quedaba escrito en el log como
     un día perfecto.

NO MANDA CORREO: sin RESEND_API_KEY el Worker simula, y la batería comprueba que
quedó simulado.
"""
import json, os, re, subprocess, sys, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8796")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-aviso")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAMILIAS = 150
TOPE = 60          # AVISOS_POR_EJECUCION en worker.js

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


def uno(cmd, col):
    r = sql(cmd)
    return r[0][col] if r else 0


def cron():
    """Dispara la tarea programada y espera a que termine de escribir."""
    urllib.request.urlopen(BASE + "/cdn-cgi/handler/scheduled").read()
    import time
    time.sleep(14)


def sembrar():
    sql("DELETE FROM casos; DELETE FROM correos;")
    filas = []
    for i in range(1, FAMILIAS + 1):
        filas.append(
            "('MMC-2026-%06d','%032x','recibido','Familia %d','000','sector %d',"
            "'fam%d@ejemplo.invalid',datetime('now','-7 days','-2 hours'))"
            % (i, i, i, i % 5, i))
    sql("INSERT INTO casos (numero, token, estado, contacto_nombre, contacto_tel, "
        "sector, contacto_email, creado_en) VALUES " + ",".join(filas))


print("== siembra: %d familias cruzando el séptimo día el mismo día ==" % FAMILIAS)
sembrar()
linea(uno("SELECT COUNT(*) n FROM casos", "n") == FAMILIAS,
      "%d casos en espera" % FAMILIAS)

# Una de ellas arrastra un intento FALLIDO previo. Es el estado que deja un día
# de cupo agotado, y el que silenciaba a esa familia para siempre.
sql("INSERT INTO correos (etiqueta, para, asunto, guia, resultado, error) VALUES "
    "('caso-espera','fam1@ejemplo.invalid','x','MMC-2026-000001','fallo','HTTP 429 · daily quota')")
print("   MMC-2026-000001 arrastra un intento fallido previo (cupo agotado)")

print("\n== tres días de tarea programada ==")
esperado = [TOPE, TOPE, FAMILIAS - 2 * TOPE]
for dia in (1, 2, 3):
    cron()
    buenos = uno("SELECT COUNT(*) n FROM correos WHERE etiqueta='caso-espera' "
                 "AND resultado IN ('enviado','simulado')", "n")
    print("   día %d · avisos buenos acumulados: %d" % (dia, buenos))
    linea(buenos <= TOPE * dia,
          "día %d respeta el tope de %d por ejecución" % (dia, TOPE))

print("\n== el resultado que importa ==")
linea(uno("SELECT COUNT(*) n FROM correos WHERE etiqueta='caso-espera' "
          "AND resultado IN ('enviado','simulado')", "n") == FAMILIAS,
      "las %d familias acaban avisadas: el tope APLAZA, no descarta" % FAMILIAS)

linea(uno("SELECT COUNT(*) n FROM correos WHERE guia='MMC-2026-000001' "
          "AND resultado IN ('enviado','simulado')", "n") == 1,
      "la que tenía un fallo previo SÍ se reintentó y recibió su aviso")

linea(uno("SELECT COUNT(*) n FROM (SELECT guia FROM correos WHERE etiqueta='caso-espera' "
          "AND resultado IN ('enviado','simulado') GROUP BY guia HAVING COUNT(*)>1)", "n") == 0,
      "ninguna familia recibe el aviso dos veces")

linea(uno("SELECT COUNT(*) n FROM casos c WHERE NOT EXISTS (SELECT 1 FROM correos e "
          "WHERE e.guia=c.numero AND e.etiqueta='caso-espera' "
          "AND e.resultado IN ('enviado','simulado'))", "n") == 0,
      "ninguna familia se queda sin aviso")

linea(uno("SELECT COUNT(*) n FROM correos WHERE etiqueta='caso-espera' "
          "AND resultado NOT IN ('simulado','fallo')", "n") == 0,
      "todo quedó SIMULADO: no salió un solo correo a ninguna persona")

print("\n== cuarto día: ya no hay nada que hacer ==")
antes = uno("SELECT COUNT(*) n FROM correos", "n")
cron()
linea(uno("SELECT COUNT(*) n FROM correos", "n") == antes,
      "con todas avisadas, la tarea no escribe nada nuevo")

print("\n== familias sin correo ==")
sql("UPDATE casos SET contacto_email = NULL WHERE numero IN ('MMC-2026-000010','MMC-2026-000011')")
sql("DELETE FROM correos")
cron()
linea(uno("SELECT COUNT(*) n FROM correos WHERE guia IN ('MMC-2026-000010','MMC-2026-000011')", "n") == 0,
      "a quien no dejó correo no se le intenta escribir")

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
