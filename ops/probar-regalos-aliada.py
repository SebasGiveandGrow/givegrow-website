#!/usr/bin/env python3
"""Pruebas de la pestaña «Regalos» del portal de la aliada (0067).

Uso:   node ops/probar-dinero.mjs regalos-aliada

QUÉ VIGILA. La aliada de EE. UU. confirma desde su portal los pagos en
dólares, y eso financia regalos y le escribe al donante. Las decisiones de
Sebas (17 nov 2026) son la regla: de los niños, solo lo público; de los
donantes, solo los de dólares; solo la inscripción asignada como aliada.
"""
import hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-rga")
DB = os.environ.get("DB", "givegrow-privado")
CWD = os.environ.get("CWD", os.getcwd())
WRANGLER = os.environ.get("WRANGLER", "npx wrangler").split()
okc = failc = 0


def linea(ok, texto):
    global okc, failc
    if ok:
        okc += 1; print("ok     " + texto)
    else:
        failc += 1; print("NO OK  " + texto)


def sql(cmd):
    r = subprocess.run(WRANGLER + ["d1", "execute", DB, "--local", "--persist-to", PERSIST, "--json", "--command", cmd],
                       cwd=CWD, capture_output=True, text=True)
    m = re.search(r"\[\s*\{.*", r.stdout, re.S)
    if not m:
        sys.exit("SQL falló: " + (r.stderr or r.stdout)[:500])
    return json.loads(m.group(0))[0]["results"]


def pedir(ruta, cuerpo=None, cookie=None):
    cab = {"content-type": "application/json", "Origin": BASE}
    if cookie:
        cab["Cookie"] = cookie
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, headers=cab)
    try:
        r = urllib.request.urlopen(req)
        return r.status, json.loads(r.read() or b"{}"), r.headers.get("Set-Cookie")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}"), None
        except Exception:
            return e.code, {}, None


def entrar(inscripcion, token):
    sql("INSERT INTO portal_enlaces (hash, inscripcion, expira, email) VALUES ('%s', %d, datetime('now','+1 day'), 'r%d@example.com')"
        % (hashlib.sha256(token.encode()).hexdigest(), inscripcion, inscripcion))
    st, d, sc = pedir("/api/portal/sesion", {"t": token})
    if not sc:
        sys.exit("No abrió sesión: %s %s" % (st, d))
    return sc.split(";")[0]


# --- siembra: la campaña abierta, Leticia, tres niños, dos pedidos USD y uno COP
sql("UPDATE regalo_campanas SET estado = 'abierta', aliada_nombre = 'Aliada', aliada_inscripcion = 916 WHERE id = 'navidad-2026'; "
    "UPDATE regalo_categorias SET valor_cop = 80000, valor_usd = 20;")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email) VALUES "
    "(916, 'fundacion', 'visitada', 'Aliada', 'r916@example.com'), (917, 'fundacion', 'vinculada', 'Otra', 'r917@example.com')")
sql("INSERT INTO regalo_ninos (id, campana_id, zona_id, codigo, nombre, nombre_publico, edad, genero, comunidad, acudiente_nombre, acudiente_telefono, autoriza_datos, autoriza_foto, notas) VALUES "
    "(1, 'navidad-2026', 'leticia', 'LET-0001', 'Ana María Privado Pérez', 'Ana', 7, 'nina', 'Comunidad secreta', 'Acudiente Secreto', '3001112233', 1, 0, 'nota privada'), "
    "(2, 'navidad-2026', 'leticia', 'LET-0002', 'Beto Privado', 'Beto', 9, 'nino', 'Comunidad secreta', 'Acudiente Secreto', '3001112233', 1, 0, NULL), "
    "(3, 'navidad-2026', 'leticia', 'LET-0003', 'Caro Privado', 'Caro', 5, 'nina', 'Comunidad secreta', 'Acudiente Secreto', '3001112233', 1, 0, NULL)")
sql("INSERT INTO regalos (id, nino_id, campana_id, zona_id, codigo, categoria_id, deseo_es, estado) VALUES "
    "(1, 1, 'navidad-2026', 'leticia', 'LET-0001', 'juguete', 'Una muñeca', 'publicado'), "
    "(2, 2, 'navidad-2026', 'leticia', 'LET-0002', 'juguete', 'Un balón', 'publicado'), "
    "(3, 3, 'navidad-2026', 'leticia', 'LET-0003', 'juguete', 'Un libro', 'publicado')")
sql("INSERT INTO regalo_pedidos (ref, campana_id, token, via, estado, total_usd, total_cop, nombre, email) VALUES "
    "('RG-2026-000101', 'navidad-2026', 't1', 'usd', 'pendiente', 20, 80000, 'Donante Dólares', 'usd@example.com'), "
    "('RG-2026-000102', 'navidad-2026', 't2', 'usd', 'pendiente', 20, 80000, 'Otro Dólares', 'usd2@example.com'), "
    "('RG-2026-000103', 'navidad-2026', 't3', 'cop', 'pendiente', 20, 80000, 'Donante Pesos', 'cop@example.com')")
sql("INSERT INTO regalo_pedido_items (pedido_ref, regalo_id, valor_cop, valor_usd) VALUES "
    "('RG-2026-000101', 1, 80000, 20), ('RG-2026-000102', 2, 80000, 20), ('RG-2026-000103', 3, 80000, 20); "
    "UPDATE regalos SET reserva_ref = 'RG-2026-000101', reservado_hasta = datetime('now','+1 day') WHERE id = 1; "
    "UPDATE regalos SET reserva_ref = 'RG-2026-000102', reservado_hasta = datetime('now','+1 day') WHERE id = 2;")

aliada, otra = entrar(916, "a" * 32), entrar(917, "b" * 32)

print("== 1. solo la aliada ==")
_, yo, _ = pedir("/api/portal/yo", None, aliada)
linea(yo.get("aliada_regalos") is True, "a la aliada /yo le abre la pestaña")
_, yo2, _ = pedir("/api/portal/yo", None, otra)
linea(yo2.get("aliada_regalos") is False, "a otra fundación no")
st, _, _ = pedir("/api/portal/regalos", None, otra)
linea(st == 403, "y si la pide igual, 403 (http %s)" % st)
st, _, _ = pedir("/api/portal/regalos", {"accion": "confirmar", "ref": "RG-2026-000101"}, otra)
linea(st == 403, "tampoco puede confirmar (http %s)" % st)

print("\n== 2. lo que ve: solo lo público y solo dólares ==")
st, d, _ = pedir("/api/portal/regalos", None, aliada)
crudo = json.dumps(d, ensure_ascii=False)
linea(st == 200 and len(d.get("regalos", [])) == 3, "ve los tres regalos publicados")
linea(not any(x in crudo for x in ["Privado", "Comunidad secreta", "Acudiente Secreto", "3001112233", "nota privada"]),
      "ningún dato privado de los niños (nombre completo, comunidad, acudiente, teléfono, notas)")
refs = sorted(p["ref"] for p in d.get("pedidos", []))
linea(refs == ["RG-2026-000101", "RG-2026-000102"], "solo los pedidos en dólares (%s)" % refs)
linea("cop@example.com" not in crudo and "Donante Pesos" not in crudo, "ningún donante de pesos")
linea(any(p["email"] == "usd@example.com" for p in d["pedidos"]), "de los de dólares, nombre y correo")

print("\n== 3. confirmar y rechazar ==")
st, d, _ = pedir("/api/portal/regalos", {"accion": "confirmar", "ref": "RG-2026-000103"}, aliada)
linea(st == 404, "un pedido en pesos no lo confirma la aliada (http %s)" % st)
st, d, _ = pedir("/api/portal/regalos", {"accion": "confirmar", "ref": "RG-2026-000101"}, aliada)
r1 = sql("SELECT estado, via, pedido_ref FROM regalos WHERE id = 1")[0]
p1 = sql("SELECT estado, confirmado_por FROM regalo_pedidos WHERE ref = 'RG-2026-000101'")[0]
linea(st == 200 and r1["estado"] == "financiado" and r1["via"] == "usd" and p1["estado"] == "pagado",
      "confirmar financia el regalo (%s / %s)" % (r1["estado"], p1["estado"]))
linea("portal" in (p1["confirmado_por"] or ""), "y queda quién lo confirmó (%s)" % p1["confirmado_por"])
aud = sql("SELECT COUNT(*) AS n FROM consentimientos WHERE tipo = 'auditoria' AND detalle LIKE '%RG-2026-000101%'")[0]["n"]
linea(aud >= 1, "y en la auditoría")
st, d, _ = pedir("/api/portal/regalos", {"accion": "confirmar", "ref": "RG-2026-000101"}, aliada)
linea(st == 200 and d.get("ya") is True, "confirmar dos veces no hace nada")
st, d, _ = pedir("/api/portal/regalos", {"accion": "rechazar", "ref": "RG-2026-000102"}, aliada)
r2 = sql("SELECT estado, reserva_ref FROM regalos WHERE id = 2")[0]
p2 = sql("SELECT estado FROM regalo_pedidos WHERE ref = 'RG-2026-000102'")[0]
linea(st == 200 and p2["estado"] == "anulado" and r2["estado"] == "publicado" and r2["reserva_ref"] is None,
      "«No llegó» anula el pedido y suelta el regalo")
st, _, _ = pedir("/api/portal/regalos", {"accion": "rechazar", "ref": "RG-2026-000101"}, aliada)
linea(st == 409, "no se puede rechazar uno ya pagado (http %s)" % st)
st, _, _ = pedir("/api/portal/regalos", {"accion": "confirmar", "ref": "RG-2026-000102"}, aliada)
linea(st == 409, "ni confirmar uno anulado (http %s)" % st)

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
