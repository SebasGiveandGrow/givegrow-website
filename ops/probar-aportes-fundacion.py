#!/usr/bin/env python3
"""Pruebas del registro de aportes entre fundaciones (0066) y de las
necesidades visibles en la red (0065).

Uso:   node ops/probar-dinero.mjs aportes-fundacion

Corre contra el banco (Access simulado), porque confirmar un aporte es cosa
del panel.

QUÉ VIGILA. La regla del registro es «evidencia, no promesas»: lo que una
fundación escribe es una declaración y NO suma hasta que el equipo lo confirma.
Y la de las necesidades es una promesa escrita en el portal: solo se le muestra
a otra fundación lo que su dueña marcó, y nunca un dato de contacto.
"""
import hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-apf")
DB = os.environ.get("DB", "givegrow-privado")
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
        WRANGLER + ["d1", "execute", DB, "--local", "--persist-to", PERSIST, "--json", "--command", cmd],
        cwd=CWD, capture_output=True, text=True)
    m = re.search(r"\[\s*\{.*", r.stdout, re.S)
    if not m:
        sys.exit("SQL falló: " + (r.stderr or r.stdout)[:500])
    return json.loads(m.group(0))[0]["results"]


def pedir(ruta, cuerpo=None, cookie=None):
    cab = {"content-type": "application/json", "Origin": BASE}
    if cookie:
        cab["Cookie"] = cookie
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 headers=cab)
    try:
        r = urllib.request.urlopen(req)
        return r.status, json.loads(r.read() or b"{}"), r.headers.get("Set-Cookie")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}"), None
        except Exception:
            return e.code, {}, None


def entrar(inscripcion, token):
    """La cookie de sesión es Secure: se copia a mano del Set-Cookie."""
    sql("INSERT INTO portal_enlaces (hash, inscripcion, expira, email) VALUES ('%s', %d, datetime('now','+1 day'), 'f%d@example.com')"
        % (hashlib.sha256(token.encode()).hexdigest(), inscripcion, inscripcion))
    st, d, sc = pedir("/api/portal/sesion", {"t": token})
    if not sc:
        sys.exit("No abrió sesión: %s %s" % (st, d))
    return sc.split(";")[0]


sql("DELETE FROM aportes_fundacion; DELETE FROM intercambios_fundacion; DELETE FROM portal_sesiones; DELETE FROM portal_enlaces; "
    "DELETE FROM inscripciones WHERE id IN (901, 902, 903);")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, ciudad, datos) VALUES "
    "(901, 'fundacion', 'vinculada', 'Da', 'f901@example.com', 'Medellín', '{\"rol\":\"aporta\",\"aporta\":[\"dinero\",\"especie\"]}'),"
    "(902, 'fundacion', 'vinculada', 'Recibe', 'f902@example.com', 'Bello', '{}'),"
    "(903, 'fundacion', 'aceptada', 'Recién llegada', 'f903@example.com', 'Itagüí', '{\"rol\":\"aporta\",\"aporta\":[\"dinero\"]}')")
da, recibe, nueva = entrar(901, "a" * 32), entrar(902, "b" * 32), entrar(903, "c" * 32)

print("== 1. una necesidad solo se ve con permiso ==")
pedir("/api/portal/intercambios", {"accion": "guardar", "tipo": "necesita", "categoria": "especie",
                                   "titulo": "Sin permiso"}, recibe)
st, d, _ = pedir("/api/portal/intercambios", {"accion": "guardar", "tipo": "necesita", "categoria": "especie",
                                              "titulo": "Kits escolares", "visible_red": True}, recibe)
visible = d.get("id")
_, r, _ = pedir("/api/portal/red", None, da)
tit = [n["titulo"] for n in r.get("necesidades", [])]
linea(tit == ["Kits escolares"], "la que aporta ve solo la marcada (%s)" % tit)
linea(all(not re.search(r"@|tel|correo|email", " ".join(n.keys())) for n in r.get("necesidades", [])),
      "y sin ningún dato de contacto entre los campos")
_, r, _ = pedir("/api/portal/red", None, recibe)
linea(r.get("disponible") is False, "quien solo recibe no tiene esa lista")
_, r, _ = pedir("/api/portal/red", None, nueva)
linea(r.get("disponible") is False, "una fundación que aún no está vinculada tampoco")
st, d, _ = pedir("/api/portal/intercambios", {"accion": "guardar", "tipo": "ofrece", "categoria": "espacio",
                                              "titulo": "Un salón", "visible_red": True}, recibe)
fila = sql("SELECT visible_red FROM intercambios_fundacion WHERE id = %d" % d["id"])
linea(fila and fila[0]["visible_red"] == 0, "una OFERTA no se puede marcar visible aunque el cliente lo mande")

print("\n== 2. «puedo ofrecer esto» avisa al equipo, una sola vez ==")
st1, d1, _ = pedir("/api/portal/red", {"id": visible}, da)
st2, d2, _ = pedir("/api/portal/red", {"id": visible}, da)
linea(st1 == 200 and d1.get("id") and d2.get("repetida") is True and d2.get("id") == d1.get("id"),
      "responder dos veces deja una sola oferta")
oculta = sql("SELECT id FROM intercambios_fundacion WHERE titulo = 'Sin permiso'")[0]["id"]
st, _, _ = pedir("/api/portal/red", {"id": oculta}, da)
linea(st == 404, "no se puede responder a una necesidad sin permiso (http %s)" % st)

print("\n== 3. registrar un aporte: lo declarado no suma ==")
g = lambda **k: pedir("/api/portal/aportes", dict(accion="guardar", **k), da)
st, d, _ = g(tipo="dinero", titulo="Almuerzos escolares", cantidad="8000000", fecha="2026-06-10", recibe=902)
uno = d.get("id")
linea(st == 200 and uno, "un aporte en dinero se registra")
st, d, _ = g(tipo="especie", titulo="Mercados", cantidad="480", unidad="kilos", fecha="2026-09-02", recibe=902)
dos = d.get("id")
st, d, _ = g(tipo="especie", titulo="Sin destino", cantidad="3", unidad="unidades", fecha="2026-09-02")
tres = d.get("id")
for nombre, extra, campo in [
        ("especie sin unidad", dict(tipo="especie", titulo="Cuadernos", cantidad="10", fecha="2026-10-01"), "unidad"),
        ("cantidad cero", dict(tipo="dinero", titulo="Nada de nada", cantidad="0", fecha="2026-10-01"), "cantidad"),
        ("fecha futura", dict(tipo="dinero", titulo="Promesa futura", cantidad="5", fecha="2099-01-01"), "fecha"),
        ("a sí misma", dict(tipo="dinero", titulo="A mí misma", cantidad="5", fecha="2026-10-01", recibe=901), "recibe"),
        ("a una no vinculada", dict(tipo="dinero", titulo="A la nueva", cantidad="5", fecha="2026-10-01", recibe=903), "recibe")]:
    st, d, _ = g(**extra)
    linea(st == 400 and d.get("campo") == campo, "%s se rechaza por «%s»" % (nombre, campo))
st, d, _ = pedir("/api/portal/aportes", dict(accion="guardar", tipo="dinero", titulo="Desde quien recibe", cantidad="5",
                                             fecha="2026-10-01"), recibe)
linea(st == 403, "quien solo recibe no puede registrar aportes (http %s)" % st)
_, v, _ = pedir("/api/portal/aportes", None, da)
linea(len(v["dados"]) == 3 and v["totales"] == [], "los tres salen en la lista y NINGUNO suma todavía")
_, v, _ = pedir("/api/portal/aportes", None, recibe)
linea(v["recibidos"] == [], "la que recibe no ve nada mientras no se confirme")

print("\n== 4. el equipo confirma ==")
st, d, _ = pedir("/api/admin/aportes-fundacion")
linea(st == 200 and len(d.get("aportes", [])) == 3, "el panel los ve los tres")
st, d, _ = pedir("/api/admin/aporte-fundacion/%d" % tres, {"estado": "confirmado"})
linea(st == 409 and d.get("error") == "sin_destinataria", "uno sin destinataria no se puede confirmar")
st, _, _ = pedir("/api/admin/aporte-fundacion/%d" % uno, {"estado": "confirmado"})
st2, _, _ = pedir("/api/admin/aporte-fundacion/%d" % dos, {"estado": "confirmado"})
st3, _, _ = pedir("/api/admin/aporte-fundacion/%d" % dos, {"estado": "entregado"})
linea(st == 200 and st2 == 200 and st3 == 200, "confirmar y marcar entregado responden bien")
_, v, _ = pedir("/api/portal/aportes", None, da)
tot = sorted((t["tipo"], t["unidad"], t["cantidad"]) for t in v["totales"])
linea(tot == [("dinero", "pesos", 8000000), ("especie", "kilos", 480)],
      "ahora suman, cada tipo en su unidad y sin mezclarse (%s)" % tot)
_, v, _ = pedir("/api/portal/aportes", None, recibe)
linea(sorted(x["titulo"] for x in v["recibidos"]) == ["Almuerzos escolares", "Mercados"],
      "y la que recibe ve los dos, con el nombre de quien dio")

print("\n== 5. retirar ==")
st, _, _ = pedir("/api/portal/aportes", {"accion": "retirar", "id": uno}, da)
linea(st == 404, "uno ya confirmado no lo retira la fundación (http %s)" % st)
st, _, _ = pedir("/api/portal/aportes", {"accion": "retirar", "id": tres}, da)
linea(st == 200, "uno por confirmar sí")
st, _, _ = pedir("/api/portal/aportes", {"accion": "retirar", "id": dos}, recibe)
linea(st in (403, 404), "y nadie retira el aporte de otra fundación (http %s)" % st)

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
