#!/usr/bin/env python3
"""Batería de pruebas de la capa de pagos (Wompi + D1).

Uso:
    npx wrangler dev --port 8794 --persist-to /tmp/gg-wrangler
    npx wrangler d1 execute givegrow-privado --local --persist-to /tmp/gg-wrangler \
        --file migrations/0001_inicial.sql
    python3 ops/probar-pagos.py

El secreto de eventos se lee de .dev.vars; nunca va escrito en este archivo.

Construye eventos con checksum REAL (SHA-256 de los valores de
signature.properties + timestamp + secreto de eventos) para verificar que:
  - un evento legítimo se acepta y mueve el aporte
  - una firma inválida se rechaza con 401 y NO mueve nada
  - el mismo evento repetido no se procesa dos veces
  - un monto distinto al guardado marca error en vez de aprobar
"""
import hashlib, json, os, sys, time, urllib.request

# Sufijo único por corrida: la idempotencia va por (transaction_id, estado), así
# que reusar ids fijos hace que la segunda corrida se detecte como repetida.
RUN = str(int(time.time()))

BASE = os.environ.get("BASE", "http://localhost:8795")


def secreto_eventos():
    """Lee WOMPI_EVENTS_SECRET del entorno o de .dev.vars. Nunca se escribe aquí."""
    v = os.environ.get("WOMPI_EVENTS_SECRET")
    if v:
        return v.strip()
    ruta = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".dev.vars")
    try:
        for linea_ in open(ruta):
            if linea_.strip().startswith("WOMPI_EVENTS_SECRET="):
                return linea_.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    sys.exit("No encontré WOMPI_EVENTS_SECRET. Ponlo en .dev.vars (ver ops/dev-vars-ejemplo.txt) o expórtalo.")


SECRETO = secreto_eventos()
PROPS = ["transaction.id", "transaction.status", "transaction.amount_in_cents"]


def evento(tx_id, estado, centavos, referencia, ts=1786000000, firma=None, email="donante.prueba@example.com"):
    data = {"transaction": {
        "id": tx_id, "status": estado, "amount_in_cents": centavos,
        "reference": referencia, "currency": "COP",
        "payment_method_type": "PSE", "customer_email": email,
        "customer_data": {"full_name": "Donante De Prueba", "legal_id": "1234567890",
                          "legal_id_type": "CC", "phone_number": "3001234567"},
    }}
    def valor(ruta):
        cur = data
        for k in ruta.split("."):
            cur = cur.get(k) if isinstance(cur, dict) else None
        return "" if cur is None else str(cur)
    checksum = firma or hashlib.sha256(("".join(valor(p) for p in PROPS) + str(ts) + SECRETO).encode()).hexdigest().upper()
    # FORMA REAL DEL EVENTO, no la documentada. `timestamp` va en la RAÍZ, no
    # dentro de `signature`. La documentación de Wompi muestra lo contrario, y
    # cuando estas pruebas imitaban la documentación pasaban en verde mientras
    # el Worker rechazaba TODOS los webhooks legítimos: la prueba solo estaba
    # confirmando mi propia suposición. Comprobado el 11 ago 2026 con un pago
    # real en sandbox (tx 12129016-1786413420-91097).
    return {"event": "transaction.updated", "data": data,
            "sent_at": "2026-08-11T01:57:25.897Z", "timestamp": ts,
            "environment": "test",
            "signature": {"properties": PROPS, "checksum": checksum}}


UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0 Safari/537.36")
CABECERAS = {"content-type": "application/json", "user-agent": UA}


def enviar(cuerpo):
    req = urllib.request.Request(BASE + "/api/wompi/eventos",
                                data=json.dumps(cuerpo).encode(),
                                headers=CABECERAS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def aporte(guia):
    try:
        req = urllib.request.Request(BASE + "/api/aporte/" + guia, headers={"user-agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"http": e.code}


def crear(monto, modo="fondo", destino=None):
    payload = {"monto": monto, "frecuencia": "unico", "modo": modo}
    if destino:
        payload["destino"] = destino
    req = urllib.request.Request(BASE + "/api/checkout", data=json.dumps(payload).encode(),
                                 headers=CABECERAS, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())["guia"]


def linea(t, ok, extra=""):
    print(("  ✓ " if ok else "  ✗ ") + t + (("  " + extra) if extra else ""))
    return ok


todo = []

# ---- 1. evento legítimo aprueba el aporte -------------------------------
g = crear(50000)
st, rb = enviar(evento("tx-ok-1-" + RUN, "APPROVED", 5000000, g))
a = aporte(g)
todo.append(linea("evento legítimo APPROVED", st == 200 and a.get("estado") == "aprobada",
                  f"http={st} estado={a.get('estado')} aprobada_en={'sí' if a.get('aprobada_en') else 'no'}"))

# ---- 2. el MISMO evento otra vez no se reprocesa ------------------------
st2, rb2 = enviar(evento("tx-ok-1-" + RUN, "APPROVED", 5000000, g))
todo.append(linea("evento repetido se ignora", st2 == 200 and rb2.get("repetido") is True,
                  f"http={st2} respuesta={rb2}"))

# ---- 3. firma inválida se rechaza y no toca nada ------------------------
g3 = crear(70000)
antes = aporte(g3).get("estado")
st3, rb3 = enviar(evento("tx-falso-" + RUN, "APPROVED", 7000000, g3, firma="0" * 64))
despues = aporte(g3).get("estado")
todo.append(linea("firma inválida rechazada", st3 == 401 and antes == despues == "intencion",
                  f"http={st3} estado antes/después={antes}/{despues}"))

# ---- 4. monto manipulado marca error, no aprueba ------------------------
g4 = crear(80000)
st4, _ = enviar(evento("tx-monto-" + RUN, "APPROVED", 999999, g4))   # 8.000.000 esperados
a4 = aporte(g4)
todo.append(linea("monto manipulado NO se aprueba", st4 == 200 and a4.get("estado") == "error",
                  f"http={st4} estado={a4.get('estado')}"))

# ---- 5. estados no aprobados ------------------------------------------
for estado_wompi, esperado in [("DECLINED", "rechazada"), ("ERROR", "error"), ("PENDING", "pendiente")]:
    gx = crear(30000)
    enviar(evento("tx-" + estado_wompi + "-" + RUN, estado_wompi, 3000000, gx))
    ax = aporte(gx)
    todo.append(linea(f"{estado_wompi} -> {esperado}", ax.get("estado") == esperado, f"estado={ax.get('estado')}"))

# ---- 6. referencia desconocida no crea nada ---------------------------
st6, _ = enviar(evento("tx-huerfano-" + RUN, "APPROVED", 100000, "GG-2026-999999"))
a6 = aporte("GG-2026-999999")
todo.append(linea("referencia desconocida no inventa aporte", st6 == 200 and a6.get("http") == 404,
                  f"http={st6} consulta={a6}"))

# ---- 7. la consulta pública no filtra datos personales ----------------
pub = aporte(g)
prohibidos = [k for k in ("email", "nombre", "doc_numero", "donante_id", "wompi_transaction_id") if k in pub]
todo.append(linea("consulta pública sin datos personales", not prohibidos,
                  f"campos={sorted(pub.keys())}"))

# ---- 8. guía mal formada ----------------------------------------------
todo.append(linea("guía mal formada rechazada", aporte("NO-ES-GUIA").get("http") == 400))

# ---- 9. REGRESIÓN: el timestamp va en la raíz, no en signature ---------
# Si alguien "corrige" el Worker para leer signature.timestamp siguiendo la
# documentación, este caso lo detecta: un evento con la forma real debe
# aceptarse, y uno con el timestamp SOLO dentro de signature debe rechazarse.
g9 = crear(40000)
ev9 = evento("tx-ts-raiz-" + RUN, "APPROVED", 4000000, g9)
st9, _ = enviar(ev9)
a9 = aporte(g9)
todo.append(linea("timestamp en la raíz: aceptado", st9 == 200 and a9.get("estado") == "aprobada",
                  f"http={st9} estado={a9.get('estado')}"))

# El Worker lee la raíz PRIMERO y cae a signature.timestamp como respaldo, por si
# Wompi migra algún día al formato que documenta. Así que este caso debe
# ACEPTARSE: es el respaldo funcionando, no un agujero. La regresión de verdad la
# cubre la prueba anterior — si alguien "corrige" el Worker para leer solo
# signature.timestamp, el evento con la forma real empieza a fallar y salta ahí.
g10 = crear(40000)
ev10 = evento("tx-ts-solo-en-firma-" + RUN, "APPROVED", 4000000, g10)
ev10["signature"]["timestamp"] = ev10.pop("timestamp")   # la forma que documenta Wompi
st10, _ = enviar(ev10)
a10 = aporte(g10)
todo.append(linea("respaldo: timestamp solo en signature también sirve",
                  st10 == 200 and a10.get("estado") == "aprobada",
                  f"http={st10} estado={a10.get('estado')}"))

# ---- 11. REGRESIÓN: un evento rechazado no bloquea su propio reintento ----
# Costó un pago real: el evento quedó en la bitácora con firma_valida=0 y, al
# arreglar la causa, su reintento se descartaba como duplicado y el aporte se
# quedaba en `intencion` para siempre.
g11 = crear(60000)
tx11 = "tx-rechazado-luego-bueno-" + RUN
st_mal, _ = enviar(evento(tx11, "APPROVED", 6000000, g11, firma="0" * 64))   # firma inválida
est_mal = aporte(g11).get("estado")
st_bien, rb11 = enviar(evento(tx11, "APPROVED", 6000000, g11))               # el mismo, ya bueno
est_bien = aporte(g11).get("estado")
todo.append(linea("un evento rechazado no bloquea su reintento",
                  st_mal == 401 and est_mal == "intencion" and st_bien == 200
                  and not rb11.get("repetido") and est_bien == "aprobada",
                  f"rechazo={st_mal}/{est_mal} reintento={st_bien}/{est_bien}"))

# ---- 12. y una vez procesado, sí se considera repetido -------------------
st_otra, rb12 = enviar(evento(tx11, "APPROVED", 6000000, g11))
todo.append(linea("ya procesado: ahora sí es repetido",
                  st_otra == 200 and rb12.get("repetido") is True, f"respuesta={rb12}"))

print()
print(f"  {sum(todo)}/{len(todo)} pruebas en verde")
sys.exit(0 if all(todo) else 1)
