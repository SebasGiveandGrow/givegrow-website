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


def pedir(ruta, cuerpo=None, cookie=None, metodo=None):
    cab = {"content-type": "application/json", "Origin": BASE}
    if cookie:
        cab["Cookie"] = cookie
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 headers=cab, method=metodo)
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
    "DELETE FROM inscripciones WHERE id IN (901, 902, 903, 905);")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, ciudad, datos) VALUES "
    "(901, 'fundacion', 'vinculada', 'Da', 'f901@example.com', 'Medellín', '{\"rol\":\"aporta\",\"aporta\":[\"dinero\",\"especie\"]}'),"
    "(902, 'fundacion', 'vinculada', 'Recibe', 'f902@example.com', 'Bello', '{}'),"
    "(903, 'fundacion', 'aceptada', 'Recién llegada', 'f903@example.com', 'Itagüí', '{\"rol\":\"aporta\",\"aporta\":[\"dinero\"]}'),"
    "(905, 'fundacion', 'vinculada', 'Otra que da', 'f905@example.com', 'Envigado', '{\"rol\":\"aporta\",\"aporta\":[\"especie\"]}')")
da, recibe, nueva, otra = entrar(901, "a" * 32), entrar(902, "b" * 32), entrar(903, "c" * 32), entrar(905, "d" * 32)

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
st, d, _ = g(tipo="dinero", titulo="Almuerzos escolares", cantidad="8.000.000", fecha="2026-06-10", recibe=902)
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
        ("a una no vinculada", dict(tipo="dinero", titulo="A la nueva", cantidad="5", fecha="2026-10-01", recibe=903), "recibe"),
        ("dinero con centavos", dict(tipo="dinero", titulo="Con centavos", cantidad="10,5", fecha="2026-10-01"), "cantidad"),
        ("cantidad ilegible", dict(tipo="dinero", titulo="Ilegible", cantidad="1.2.3", fecha="2026-10-01"), "cantidad")]:
    st, d, _ = g(**extra)
    linea(st == 400 and d.get("campo") == campo, "%s se rechaza por «%s»" % (nombre, campo))
st, d, _ = pedir("/api/portal/aportes", dict(accion="guardar", tipo="dinero", titulo="Desde quien recibe", cantidad="5",
                                             fecha="2026-10-01"), recibe)
linea(st == 403, "quien solo recibe no puede registrar aportes (http %s)" % st)
_, v, _ = pedir("/api/portal/aportes", None, da)
linea(len(v["dados"]) == 3 and v["totales"] == [], "los tres salen en la lista y NINGUNO suma todavía")
linea(any(x["cantidad"] == 8000000 for x in v["dados"]), "«8.000.000» se guarda como ocho millones, no como ocho")
st, d, _ = pedir("/api/portal/aportes", dict(accion="guardar", tipo="dinero", titulo="Sin vincular", cantidad="5",
                                             fecha="2026-10-01"), nueva)
linea(st == 403 and d.get("error") == "no_vinculada", "una fundación que aún no está vinculada no registra (http %s)" % st)
_, v, _ = pedir("/api/portal/aportes", None, nueva)
linea(v.get("red") == [] and v.get("puede_registrar") is False, "y no recibe el directorio de la red")
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
linea(st in (403, 404), "quien solo recibe no retira nada (http %s)" % st)
# Una que SÍ aporta intenta retirar un aporte de otra, todavía por confirmar:
# es el filtro `da = ?` el que lo impide, no el rol.
st, d, _ = g(tipo="dinero", titulo="Por confirmar de la 901", cantidad="5", fecha="2026-10-02")
ajeno = d.get("id")
st, _, _ = pedir("/api/portal/aportes", {"accion": "retirar", "id": ajeno}, otra)
fila = sql("SELECT estado FROM aportes_fundacion WHERE id = %d" % ajeno)
linea(st == 404 and fila and fila[0]["estado"] == "registrado",
      "otra fundación que aporta no retira el aporte de la 901 (http %s, sigue %s)" % (st, fila and fila[0]["estado"]))

print("\n== 5b. el panel no salta estados ==")
st, d, _ = pedir("/api/admin/aporte-fundacion/%d" % tres, {"estado": "confirmado"})
linea(st == 409, "confirmar uno que la fundación ya retiró responde 409 (http %s)" % st)
st, _, _ = pedir("/api/admin/aporte-fundacion/%d" % dos, {"estado": "confirmado"})
linea(st == 409, "devolver a «confirmado» uno ya entregado responde 409 (http %s)" % st)

print("\n== 6. el portal de empresa ==")
sql("DELETE FROM jornadas WHERE id IN (9101, 9102, 9103); DELETE FROM participaciones WHERE jornada IN (9101, 9102, 9103); "
    "DELETE FROM inscripciones WHERE id = 904;")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email) VALUES (904, 'empresa', 'vinculada', 'Empresa', 'f904@example.com')")
sql("INSERT INTO jornadas (id, nombre, fecha, anfitriona, empresa_inscripcion, puerta, estado, beneficiarios_directos) VALUES "
    "(9101, 'Hecha', '2026-06-14', 'sede', 904, 'impact-journey', 'cerrada', 40), "
    "(9102, 'Próxima', '2099-01-24', 'sede', 904, 'impact-journey', 'confirmada', NULL), "
    "(9103, 'Cancelada', '2026-07-01', 'sede', 904, 'impact-journey', 'cancelada', NULL)")
sql("INSERT INTO participaciones (jornada, nombre, email, horas) VALUES (9101, 'Ana', 'ana@example.com', 4), (9101, 'Beto', 'beto@example.com', 3.5), (9102, 'Caro', 'caro@example.com', NULL)")
empresa = entrar(904, "e" * 32)
_, yo, _ = pedir("/api/portal/yo", None, empresa)
linea(yo.get("tipo") == "empresa" and "perfil" not in yo, "la empresa entra y /yo no le trae nada de una fundación")
st, d, _ = pedir("/api/portal/empresa", None, empresa)
t = d.get("totales", {})
linea(st == 200 and t.get("horas") == 7.5 and t.get("personas") == 2 and t.get("realizadas") == 1 and t.get("jornadas") == 2,
      "suma solo lo realizado y deja fuera la cancelada (%s)" % t)
linea((d.get("proxima") or {}).get("nombre") == "Próxima", "la próxima jornada sale en «Lo que sigue»")
crudo = json.dumps(d, ensure_ascii=False)
linea("Ana" not in crudo and "ana@example.com" not in crudo and "Beto" not in crudo,
      "ningún nombre ni correo de quien fue")
malos = [r for r in ["/api/portal/intercambios", "/api/portal/aportes", "/api/portal/red", "/api/portal/recibido"]
         if pedir(r, None, empresa)[0] != 401]
linea(not malos, "los endpoints de fundación le responden 401 (%s)" % (malos or "todos"))
st, _, _ = pedir("/api/portal/empresa", None, da)
linea(st == 401, "y una fundación no ve el de empresa (http %s)" % st)
st, d, _ = pedir("/api/admin/portal/904", {"accion": "invitar"})
linea(st == 200 and d.get("para") == "f904@example.com", "el panel le manda el enlace a la empresa (http %s)" % st)
st, _, _ = pedir("/api/admin/portal/904", {"accion": "revisado"})
linea(st == 404, "«marcar revisado» sigue siendo solo de fundaciones (http %s)" % st)
linea(t.get("anfitrionas") == 0, "la sede de Give&Grow no cuenta como fundación anfitriona (%s)" % t.get("anfitrionas"))

print("\n== 6b. a qué portal entra un correo ==")
sql("DELETE FROM inscripciones WHERE id IN (906, 907, 908); DELETE FROM portal_enlaces WHERE inscripcion IN (906, 907, 908, 901)")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, datos) VALUES "
    "(906, 'empresa', 'aceptada', 'Lead del evento', 'lead@example.com', '{\"formato\":\"evento\"}'), "
    "(907, 'empresa', 'convenio', 'Lead que avanzó', 'avanzo@example.com', '{\"formato\":\"evento\"}'), "
    "(908, 'empresa', 'vinculada', 'Empresa con el correo de una fundación', 'f901@example.com', '{}')")
def enlaces(i):
    return sql("SELECT COUNT(*) AS n FROM portal_enlaces WHERE inscripcion = %d" % i)[0]["n"]
for correo in ["lead@example.com", "avanzo@example.com", "f901@example.com"]:
    pedir("/api/portal/entrar", {"email": correo})
linea(enlaces(906) == 0, "el lead de un evento que sigue «aceptada» no recibe enlace")
linea(enlaces(907) == 1, "el que avanzó a convenio sí")
linea(enlaces(901) == 1 and enlaces(908) == 0, "si el correo es de una fundación y de una empresa, entra a la fundación")
sql("DELETE FROM portal_enlaces WHERE inscripcion IN (906, 907, 908); DELETE FROM inscripciones WHERE id IN (906, 907, 908)")

print("\n== 7. suprimir (Ley 1581) ==")
st, d, _ = pedir("/api/admin/inscripcion/904", {"motivo": "prueba"}, metodo="DELETE")
quedan = sql("SELECT COUNT(*) AS n FROM inscripciones WHERE id = 904")[0]["n"]
linea(st == 200 and quedan == 0, "una empresa que ya recibió el enlace del portal se puede suprimir (http %s %s)" % (st, d.get("error", "")))
st, d, _ = pedir("/api/admin/inscripcion/902", {"motivo": "prueba"}, metodo="DELETE")
linea(st == 409 and d.get("error") == "con_datos_de_la_red",
      "una fundación con datos en su portal no se suprime de un clic: lo dice (http %s)" % st)
sql("DELETE FROM intercambios_fundacion WHERE responde_a IN (SELECT id FROM intercambios_fundacion WHERE inscripcion = 902); "
    "DELETE FROM intercambios_fundacion WHERE inscripcion = 902")
st, d, _ = pedir("/api/admin/inscripcion/902", {"motivo": "prueba"}, metodo="DELETE")
huerf = sql("SELECT COUNT(*) AS n FROM aportes_fundacion WHERE recibe IS NULL AND da = 901 AND titulo = 'Mercados'")[0]["n"]
linea(st == 200 and huerf == 1,
      "y sin ellos sí, aunque otra la haya nombrado: el aporte queda sin destinataria (http %s %s)" % (st, d.get("error", "")))

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
