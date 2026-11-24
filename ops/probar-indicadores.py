#!/usr/bin/env python3
"""Pruebas de los indicadores de cada fundación (0057) en su portal.

Uso:   node ops/probar-dinero.mjs indicadores

Corre contra el banco (Access simulado), porque aprobar una medición es cosa
del panel.

QUÉ VIGILA (puntos 30 y 31 de la lista, 24 nov 2026):
  · un indicador con al menos una medición APROBADA no cambia de nombre, de
    unidad ni de frecuencia: eso reescribiría el sentido de cifras que el
    equipo ya verificó. La fuente, la línea base y la meta sí se editan;
  · retirar no borra nada, así que crear y retirar en bucle tiene un tope del
    total histórico (activos + retirados) por fundación;
  · y lo de siempre: crear, medir, retirar y el tope de activos.
"""
import datetime, hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-ind")
DB = os.environ.get("DB", "givegrow-privado")
CWD = os.environ.get("CWD", os.getcwd())
WRANGLER = os.environ.get("WRANGLER", "npx wrangler").split()
okc = failc = 0

# Los mismos números que worker.js (IND_TOPE, IND_TOPE_HISTORICO).
TOPE_ACTIVOS = 20
TOPE_HISTORICO = 60


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


def pedir(ruta, cuerpo=None, cookie=None, metodo=None):
    cab = {"content-type": "application/json", "Origin": BASE}
    if cookie:
        cab["Cookie"] = cookie
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 headers=cab, method=metodo)
    try:
        r = urllib.request.urlopen(req)
        cuerpo = r.read()
        return r.status, (json.loads(cuerpo) if cuerpo else {}), r.headers.get("Set-Cookie")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}"), None
        except Exception:
            return e.code, {}, None


def entrar(inscripcion, token):
    sql("INSERT INTO portal_enlaces (hash, inscripcion, expira, email) VALUES ('%s', %d, datetime('now','+1 day'), 'f%d@example.com')"
        % (hashlib.sha256(token.encode()).hexdigest(), inscripcion, inscripcion))
    st, d, sc = pedir("/api/portal/sesion", {"t": token})
    if not sc:
        sys.exit("No abrió sesión: %s %s" % (st, d))
    return sc.split(";")[0]


def guardar(cookie, **k):
    base = dict(accion="guardar", nombre="Niños que terminan el ciclo de formación", unidad="niños",
                frecuencia="mensual", fuente="Listas de asistencia de cada sesión")
    base.update(k)
    return pedir("/api/portal/indicadores", base, cookie)


def leer(cookie):
    st, d, _ = pedir("/api/portal/indicadores", None, cookie)
    return st, d


def fila(i):
    r = sql("SELECT nombre, unidad, frecuencia, fuente, linea_base, meta, meta_fecha, estado FROM indicadores_fundacion WHERE id = %d" % i)
    return r[0] if r else {}


# El periodo mensual anterior (ya empezó) y una fecha de corte dentro de él.
hoy = datetime.date.today()
mes_ant = (hoy.replace(day=1) - datetime.timedelta(days=1))
PERIODO = mes_ant.strftime("%Y-%m")
CORTE = mes_ant.replace(day=1).isoformat()

# --- siembra: tres fundaciones vinculadas
sql("DELETE FROM mediciones_fundacion; DELETE FROM indicadores_fundacion; DELETE FROM portal_sesiones; DELETE FROM portal_enlaces; "
    "DELETE FROM inscripciones WHERE id IN (951, 952, 953);")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, ciudad) VALUES "
    "(951, 'fundacion', 'vinculada', 'Mide', 'f951@example.com', 'Medellín'),"
    "(952, 'fundacion', 'vinculada', 'Retira mucho', 'f952@example.com', 'Bello'),"
    "(953, 'fundacion', 'vinculada', 'Otra', 'f953@example.com', 'Itagüí')")
mide, retira, otra = entrar(951, "1" * 32), entrar(952, "2" * 32), entrar(953, "3" * 32)

print("== 0. sin sesión no hay nada ==")
st, _, _ = pedir("/api/portal/indicadores")
linea(st == 401, "GET sin sesión responde 401 (http %s)" % st)

print("\n== 1. crear y renombrar mientras nada está aprobado ==")
st, d, _ = guardar(mide)
ind = d.get("id")
linea(st == 200 and ind, "crear un indicador (http %s)" % st)
st, d, _ = guardar(mide, id=ind, nombre="Niños que terminan el ciclo completo", unidad="estudiantes", frecuencia="trimestral")
f = fila(ind)
linea(st == 200 and f.get("nombre") == "Niños que terminan el ciclo completo" and f.get("unidad") == "estudiantes"
      and f.get("frecuencia") == "trimestral", "sin mediciones, cambiar nombre, unidad y frecuencia se puede (http %s)" % st)
st, d, _ = guardar(mide, id=ind, nombre="Niños que terminan el ciclo de formación", unidad="niños", frecuencia="mensual")
linea(st == 200, "y volver a dejarlo como estaba (http %s)" % st)
st, d, _ = guardar(otra, id=ind, nombre="Me lo apropio, de otra fundación")
linea(st == 404 and fila(ind).get("nombre") == "Niños que terminan el ciclo de formación",
      "otra fundación no edita un indicador ajeno (http %s)" % st)

print("\n== 2. medir: una medición ENVIADA todavía no bloquea ==")
st, d, _ = pedir("/api/portal/indicadores", {"accion": "medir", "indicador_id": ind, "periodo": PERIODO, "valor": "32",
                                             "fuente_detalle": "Lista de asistencia del mes", "corte": CORTE}, mide)
med = d.get("id")
linea(st == 200 and med, "enviar una medición (http %s %s)" % (st, d.get("ayuda", "")))
st, d = leer(mide)
x = [i for i in d.get("indicadores", []) if i["id"] == ind]
linea(st == 200 and x and x[0].get("bloqueado") is False, "el GET lo marca bloqueado = false (%s)" % (x and x[0].get("bloqueado")))
st, d, _ = guardar(mide, id=ind, nombre="Niños que terminan el ciclo de formación completo")
linea(st == 200, "con la medición solo enviada, renombrar sigue siendo posible (http %s)" % st)
st, d, _ = guardar(mide, id=ind, nombre="Niños que terminan el ciclo de formación")

print("\n== 3. el equipo aprueba y el indicador queda fijo ==")
ver = sql("SELECT actualizado FROM mediciones_fundacion WHERE id = %d" % med)[0]["actualizado"]
st, d, _ = pedir("/api/admin/medicion-fundacion/%d" % med, {"accion": "aprobar", "ver": ver, "fuente_revisada": True})
linea(st == 200, "el panel aprueba la medición (http %s %s)" % (st, d.get("error", "")))
st, d = leer(mide)
x = [i for i in d.get("indicadores", []) if i["id"] == ind]
linea(x and x[0].get("bloqueado") is True, "el GET lo marca bloqueado = true (%s)" % (x and x[0].get("bloqueado")))
antes = fila(ind)
for nombre, extra in [("el nombre", dict(nombre="Otra cosa que ya no es lo mismo")),
                      ("la unidad", dict(unidad="familias")),
                      ("quitar la unidad", dict(unidad="")),
                      ("la frecuencia", dict(frecuencia="anual"))]:
    st, d, _ = guardar(mide, id=ind, **extra)
    linea(st == 409 and d.get("error") == "indicador_con_mediciones_aprobadas" and "retíralo" in d.get("ayuda", ""),
          "cambiar %s responde 409 con ayuda (http %s %s)" % (nombre, st, d.get("error")))
linea(fila(ind) == antes, "y la fila no cambió en nada")
st, d, _ = guardar(mide, id=ind, nombre="  Niños   que terminan el ciclo de formación ", unidad=" niños ",
                   meta="40 niños", meta_fecha="2026-12-31")
f = fila(ind)
linea(st == 200 and f.get("meta") == "40 niños" and f.get("meta_fecha") == "2026-12-31"
      and f.get("nombre") == antes["nombre"],
      "cambiar la meta sí se puede, aunque el nombre llegue con espacios de más (http %s %s)" % (st, d.get("error", "")))
st, d, _ = guardar(mide, id=ind, fuente="Listas firmadas por el profesor", linea_base="18 niños en enero de 2026")
f = fila(ind)
linea(st == 200 and f.get("fuente") == "Listas firmadas por el profesor" and f.get("linea_base") == "18 niños en enero de 2026",
      "y también la fuente y la línea base (http %s)" % st)
st, d, _ = pedir("/api/portal/indicadores", {"accion": "medir", "indicador_id": ind, "periodo": PERIODO, "valor": "99",
                                             "fuente_detalle": "Otra lista distinta", "corte": CORTE}, mide)
linea(st == 409 and d.get("error") == "ya_aprobada", "la medición aprobada sigue sin reescribirse (http %s)" % st)

print("\n== 4. el panel solo alinea, no renombra ==")
st, d, _ = pedir("/api/admin/indicador-fundacion/%d" % ind, {"mel_indicador_id": None, "nombre": "Renombrado desde el panel"})
linea(st == 200 and fila(ind).get("nombre") == antes["nombre"], "alinear con el MEAL deja el nombre igual (http %s)" % st)

print("\n== 5. retirar: lo de siempre ==")
st, d, _ = pedir("/api/portal/indicadores", {"accion": "retirar", "id": ind}, mide)
linea(st == 200 and fila(ind).get("estado") == "retirado", "retirar responde bien (http %s)" % st)
quedan = sql("SELECT COUNT(*) AS n FROM mediciones_fundacion WHERE indicador_id = %d" % ind)[0]["n"]
linea(quedan == 1, "sus mediciones se quedan (%s)" % quedan)
st, d = leer(mide)
linea(not [i for i in d.get("indicadores", []) if i["id"] == ind], "y ya no sale en el portal")
st, d, _ = guardar(mide, id=ind, meta="50 niños")
linea(st == 404, "un retirado no se edita (http %s)" % st)

print("\n== 6. tope de activos ==")
creados = [guardar(mide, nombre="Indicador de prueba número %d" % k)[0] for k in range(TOPE_ACTIVOS)]
linea(all(c == 200 for c in creados), "caben %d activos" % TOPE_ACTIVOS)
st, d, _ = guardar(mide, nombre="Uno más de la cuenta")
linea(st == 409 and d.get("error") == "tope_alcanzado", "el %d.º responde 409 tope_alcanzado (http %s)" % (TOPE_ACTIVOS + 1, st))

print("\n== 7. tope histórico: crear y retirar en bucle ==")
sembrar = TOPE_HISTORICO - 3
sql("WITH RECURSIVE n(k) AS (SELECT 1 UNION ALL SELECT k + 1 FROM n WHERE k < %d) "
    "INSERT INTO indicadores_fundacion (inscripcion, nombre, frecuencia, fuente, estado) "
    "SELECT 952, 'Retirado de antes ' || k, 'mensual', 'Listas de asistencia', 'retirado' FROM n" % sembrar)
vueltas = []
for k in range(3):
    st, d, _ = guardar(retira, nombre="Indicador que va y viene %d" % k)
    st2, _, _ = pedir("/api/portal/indicadores", {"accion": "retirar", "id": d.get("id")}, retira)
    vueltas.append((st, st2))
linea(all(v == (200, 200) for v in vueltas), "con %d retirados, tres vueltas de crear y retirar pasan (%s)" % (sembrar, vueltas))
st, d, _ = guardar(retira, nombre="La vuelta que sobra")
linea(st == 409 and d.get("error") == "tope_historico" and "escríbenos" in d.get("ayuda", ""),
      "la siguiente responde 409 tope_historico y pide escribir al equipo (http %s %s)" % (st, d.get("error")))
total = sql("SELECT COUNT(*) AS n FROM indicadores_fundacion WHERE inscripcion = 952")[0]["n"]
linea(total == TOPE_HISTORICO, "no se borró nada: siguen los %d (%s)" % (TOPE_HISTORICO, total))
st, d = leer(retira)
linea(st == 200 and d.get("indicadores") == [], "y su portal sigue cargando, sin activos")
st, d, _ = guardar(otra, nombre="El de otra fundación")
linea(st == 200, "el tope es por fundación: la otra sigue creando (http %s)" % st)

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
