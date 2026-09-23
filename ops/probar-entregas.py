#!/usr/bin/env python3
"""Pruebas del enlace entre un aporte y su acta de entrega.

Uso (el Worker tiene que llevar el parche de Access del banco de pruebas —ver
`ops/piloto-triaje.md`— y correr con PRUEBA_ACCESS:si):

    npx wrangler dev --port 8797 --persist-to /tmp/gg-ent --var PRUEBA_ACCESS:si
    PERSIST=/tmp/gg-ent BASE=http://localhost:8797 python3 ops/probar-entregas.py

QUÉ VIGILA. El botón «Marcar entregada» del panel y la tabla `entregas` no se
conocían. El rastreo del donante decía entonces dos cosas a la vez: la insignia
«Entregada» con los tres pasos completos y, justo debajo, «todavía no hay
entregas publicadas para este destino». Medido contra producción el 23 sep 2026,
llevaba 27 días así con un aporte real (GG-2026-001007 → destino «conciencia»,
que no tiene ni una entrega).

Son DOS extremos del mismo enlace roto y se prueban los dos:
  · el aporte quedó «entregada» y no hay acta que enseñarle;
  · el acta se publicó con un destino que ningún aporte tiene, así que no le
    aparece a nadie.
"""
import json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-ent")
DB = os.environ.get("DB", "gg-prueba-entregas")
CWD = os.environ.get("CWD", os.getcwd())
WRANGLER = os.environ.get("WRANGLER", "npx wrangler").split()

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
        WRANGLER + ["d1", "execute", DB, "--local", "--persist-to", PERSIST,
                    "--json", "--command", cmd],
        cwd=CWD, capture_output=True, text=True)
    m = re.search(r"\[\s*\{.*", r.stdout, re.S)
    if not m:
        sys.exit("SQL falló: " + (r.stderr or r.stdout)[:500])
    return json.loads(m.group(0))[0]["results"]


def pedir(ruta, cuerpo=None, metodo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        BASE + ruta, data=datos, method=metodo or ("POST" if datos is not None else "GET"),
        headers={"content-type": "application/json"})
    try:
        r = urllib.request.urlopen(req)
        return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        cuerpo = e.read()
        try:
            return e.code, json.loads(cuerpo or b"{}")
        except Exception:
            return e.code, {"crudo": cuerpo[:200].decode("utf-8", "replace")}


def cola(clave):
    """La fila de esa cola en /api/admin/salud, o None si no está."""
    _, d = pedir("/api/admin/salud")
    for c in d.get("pendientes", d.get("cola", [])) or []:
        if c.get("clave") == clave:
            return c
    return None


def limpiar():
    sql("DELETE FROM aportes; DELETE FROM entregas; DELETE FROM entrega_casos; "
        "DELETE FROM numerador_acta;")


def aporte(guia, destino, estado="entregada", modo="dirigida"):
    sql("INSERT INTO aportes (guia, estado, monto_centavos, moneda, modo, destino_id, "
        "creada_en, aprobada_en, entregada_en) VALUES ('%s','%s',1000000,'COP','%s',%s,"
        "datetime('now','-30 days'), datetime('now','-29 days'), datetime('now','-27 days'))"
        % (guia, estado, modo, ("'" + destino + "'") if destino else "NULL"))


def acta(numero, destino, publicada=True, anulada=False):
    sql("INSERT INTO entregas (numero, destino_id, sector, fecha, resumen, fotos, "
        "creada_por, publicada_en, anulada_en) VALUES "
        "('%s','%s','Prueba', date('now','-2 days'),'colchonetas','[{\"k\":\"1-aaaa.jpg\"}]',"
        "'ana@example.org', %s, %s)"
        % (numero, destino,
           "datetime('now','-1 day')" if publicada else "NULL",
           "datetime('now')" if anulada else "NULL"))


# ---------------------------------------------------------------------------
print("== 1. el caso de producción: «entregada» y ni un acta ==")
limpiar()
aporte("GG-2026-000001", "conciencia")
c = cola("entregadas_sin_acta")
linea(c and c["n"] == 1, "la cola cuenta el aporte sin acta (n=%s)" % (c and c["n"]))
linea(c and c["dias"] is not None and c["dias"] >= 26,
      "y dice desde cuándo lleva así (%s días)" % (c and c["dias"]))
_, pub = pedir("/api/entregas?destino=conciencia")
linea(pub.get("entregas") == [],
      "el rastreo del donante confirma el hueco: /api/entregas?destino=conciencia está vacío")

print("\n== 2. con su acta publicada, la cola se vacía sola ==")
acta("AE-2026-000001", "conciencia")
c = cola("entregadas_sin_acta")
linea(c and c["n"] == 0, "n=0 en cuanto hay un acta publicada de ese destino")

print("\n== 3. un acta que no cuenta: despublicada, anulada, o de otro destino ==")
for etiqueta, borrar, poner in [
        ("en borrador", "AE-2026-000001", lambda: acta("AE-2026-000002", "conciencia", publicada=False)),
        ("anulada", "AE-2026-000002", lambda: acta("AE-2026-000003", "conciencia", anulada=True)),
        ("de otro destino", "AE-2026-000003", lambda: acta("AE-2026-000004", "ndf"))]:
    sql("DELETE FROM entregas WHERE numero='%s'" % borrar)
    poner()
    c = cola("entregadas_sin_acta")
    linea(c and c["n"] == 1, "un acta %s no tapa el hueco" % etiqueta)

print("\n== 4. la caja no rompe el enlace ==")
limpiar()
aporte("GG-2026-000002", "NDF")
acta("AE-2026-000005", "ndf")
c = cola("entregadas_sin_acta")
linea(c and c["n"] == 0, "«NDF» en el aporte y «ndf» en el acta siguen siendo el mismo destino")

print("\n== 5. fondo general: ve TODAS las actas, así que la pregunta es otra ==")
limpiar()
aporte("GG-2026-000003", None, modo="fondo")
c = cola("entregadas_sin_acta")
linea(c and c["n"] == 1, "sin ninguna acta publicada, el recuadro de evidencia sale vacío")
acta("AE-2026-000006", "loquesea")
c = cola("entregadas_sin_acta")
linea(c and c["n"] == 0,
      "con cualquier acta publicada ya tiene qué ver: su rastreo las pide sin filtro")

print("\n== 6. el aviso al marcar «entregada» ==")
limpiar()
aporte("GG-2026-000004", "conciencia", estado="en_distribucion")
http, d = pedir("/api/admin/aporte/GG-2026-000004/estado", {"estado": "entregada"})
linea(http == 200 and d.get("ok"), "se marca igual: una jornada puede estar hecha y el acta sin transcribir")
linea(bool(d.get("aviso")) and "conciencia" in (d.get("aviso") or ""),
      "y avisa, con el destino delante")
linea("Entregada" in (d.get("aviso") or ""),
      "el aviso dice QUÉ va a ver el donante, no un código de error")
print("       aviso: " + (d.get("aviso") or "(ninguno)")[:120])

print("\n== 7. con acta, no molesta ==")
limpiar()
aporte("GG-2026-000005", "conciencia", estado="en_distribucion")
acta("AE-2026-000007", "conciencia")
_, d = pedir("/api/admin/aporte/GG-2026-000005/estado", {"estado": "entregada"})
linea(d.get("aviso") is None, "sin aviso cuando el acta ya está publicada")

print("\n== 8. «a distribución» no pregunta por actas ==")
limpiar()
aporte("GG-2026-000006", "conciencia", estado="aprobada")
_, d = pedir("/api/admin/aporte/GG-2026-000006/estado", {"estado": "en_distribucion"})
linea(d.get("aviso") is None, "solo «entregada» afirma que llegó")

print("\n== 9. el otro extremo: un acta que no le aparece a nadie ==")
limpiar()
aporte("GG-2026-000007", "ndf", estado="aprobada")
acta("AE-2026-000008", "ndff")          # una letra de más
c = cola("actas_sin_donante")
linea(c and c["n"] == 1, "el acta con «ndff» sale en la cola (n=%s)" % (c and c["n"]))
sql("UPDATE entregas SET destino_id='ndf' WHERE numero='AE-2026-000008'")
c = cola("actas_sin_donante")
linea(c and c["n"] == 0, "y se va al corregir la letra")

print("\n== 10. el aviso al PUBLICAR, no solo al registrar ==")
limpiar()
aporte("GG-2026-000008", "ndf", estado="aprobada")
acta("AE-2026-000009", "ndff", publicada=False)
http, d = pedir("/api/admin/entrega/AE-2026-000009/publicar", {"publicar": True})
linea(http == 200 and d.get("publicada"), "se publica igual")
linea(bool(d.get("aviso")) and "ndff" in (d.get("aviso") or ""),
      "y avisa de que no va a aparecerle a nadie")
print("       aviso: " + (d.get("aviso") or "(ninguno)")[:120])

print("\n== 11. publicar una buena no avisa; despublicar tampoco ==")
limpiar()
aporte("GG-2026-000009", "ndf", estado="aprobada")
acta("AE-2026-000010", "ndf", publicada=False)
_, d = pedir("/api/admin/entrega/AE-2026-000010/publicar", {"publicar": True})
linea(d.get("aviso") is None, "destino que sí existe: sin aviso")
_, d = pedir("/api/admin/entrega/AE-2026-000010/publicar", {"publicar": False})
linea(d.get("aviso") is None, "despublicar no pregunta por donantes")

print("\n== 12. las dos colas tienen nombre y módulo en el panel ==")
panel = open(os.path.join(CWD, "worker.js"), encoding="utf-8").read() \
    if os.path.exists(os.path.join(CWD, "worker.js")) else ""
for clave in ("entregadas_sin_acta", "actas_sin_donante"):
    linea(panel.count(clave) >= 3,
          "«%s» está en enCola, COLA_ES y COLA_MOD (%d menciones)" % (clave, panel.count(clave)))

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
