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

BASE = os.environ.get("BASE", "http://localhost:8794")


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
    return {"event": "transaction.updated", "data": data, "sent_at": "2026-08-10T23:00:00.000Z",
            "signature": {"properties": PROPS, "checksum": checksum, "timestamp": ts}}


def enviar(cuerpo):
    req = urllib.request.Request(BASE + "/api/wompi/eventos",
                                data=json.dumps(cuerpo).encode(),
                                headers={"content-type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def aporte(guia):
    try:
        with urllib.request.urlopen(BASE + "/api/aporte/" + guia, timeout=20) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"http": e.code}


def crear(monto, modo="fondo", destino=None):
    payload = {"monto": monto, "frecuencia": "unico", "modo": modo}
    if destino:
        payload["destino"] = destino
    req = urllib.request.Request(BASE + "/api/checkout", data=json.dumps(payload).encode(),
                                 headers={"content-type": "application/json"}, method="POST")
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

print()
print(f"  {sum(todo)}/{len(todo)} pruebas en verde")
sys.exit(0 if all(todo) else 1)
