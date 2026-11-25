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

Y lo que dejó la revisión del mismo día:
  · si la fundación cambia el nombre, la unidad o la frecuencia mientras una
    medición espera revisión, el panel no la aprueba con la versión vieja
    (409 cambio_mientras_revisabas): al recargar ve el sentido nuevo, y con esa
    versión sí la aprueba. Sin esto, el bloqueo dejaba fija una cifra con un
    sentido que el equipo nunca vio;
  · en las carreras, el 409 dice la causa verdadera: el «Añadir» que pierde
    contra el tope histórico responde tope_historico (no «retira alguno»), y
    un renombre que pierde contra un retiro responde 404, no «ya tiene
    mediciones aprobadas».
"""
import datetime, hashlib, http.client, json, os, re, subprocess, sys, threading, urllib.error, urllib.parse, urllib.request

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


def cuerpo_guardar(**k):
    base = dict(accion="guardar", nombre="Niños que terminan el ciclo de formación", unidad="niños",
                frecuencia="mensual", fuente="Listas de asistencia de cada sesión")
    base.update(k)
    return base


def guardar(cookie, **k):
    return pedir("/api/portal/indicadores", cuerpo_guardar(**k), cookie)


def leer(cookie):
    st, d, _ = pedir("/api/portal/indicadores", None, cookie)
    return st, d


def fila(i):
    r = sql("SELECT nombre, unidad, frecuencia, fuente, linea_base, meta, meta_fecha, estado FROM indicadores_fundacion WHERE id = %d" % i)
    return r[0] if r else {}


def medir(cookie, ind, periodo, corte, valor="32"):
    st, d, _ = pedir("/api/portal/indicadores", {"accion": "medir", "indicador_id": ind, "periodo": periodo, "valor": valor,
                                                 "fuente_detalle": "Lista de asistencia del mes", "corte": corte}, cookie)
    return st, d


def panel(med):
    """La medición tal como la carga el panel (Indicadores de la red): con el
    nombre y la unidad del indicador, y la versión (`ver`) que manda al decidir."""
    st, d, _ = pedir("/api/admin/indicadores-red")
    x = [m for m in d.get("mediciones", []) if m.get("id") == med]
    return x[0] if x else {}


def decidir(med, ver, accion="aprobar", motivo=None):
    c = {"accion": accion, "ver": ver, "fuente_revisada": True}
    if motivo:
        c["motivo"] = motivo
    st, d, _ = pedir("/api/admin/medicion-fundacion/%d" % med, c)
    return st, d


def estado_med(med):
    r = sql("SELECT estado FROM mediciones_fundacion WHERE id = %d" % med)
    return r[0]["estado"] if r else None


def preparar(ruta, cuerpo, cookie):
    """Un POST con la conexión YA abierta: al soltarlo solo falta mandar los
    bytes, así varias salen de verdad juntas."""
    u = urllib.parse.urlparse(BASE)
    con = http.client.HTTPConnection(u.hostname, u.port, timeout=60)
    con.connect()
    datos = json.dumps(cuerpo).encode()

    def disparar():
        con.request("POST", ruta, body=datos, headers={"content-type": "application/json", "Origin": BASE, "Cookie": cookie})
        r = con.getresponse()
        b = r.read()
        con.close()
        try:
            return r.status, (json.loads(b) if b else {})
        except ValueError:
            return r.status, {}
    return disparar


def a_la_vez(*tareas):
    """Suelta las peticiones preparadas a la vez (hilos que salen de la misma
    barrera) y devuelve sus respuestas en el mismo orden."""
    salida = [None] * len(tareas)
    barrera = threading.Barrier(len(tareas))

    def correr(k, f):
        barrera.wait()
        salida[k] = f()
    hilos = [threading.Thread(target=correr, args=(k, f)) for k, f in enumerate(tareas)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()
    return salida


# El periodo mensual anterior (ya empezó) y una fecha de corte dentro de él;
# y el de antes, para una segunda medición del mismo indicador.
hoy = datetime.date.today()
mes_ant = (hoy.replace(day=1) - datetime.timedelta(days=1))
PERIODO = mes_ant.strftime("%Y-%m")
CORTE = mes_ant.replace(day=1).isoformat()
mes_ant2 = (mes_ant.replace(day=1) - datetime.timedelta(days=1))
PERIODO2 = mes_ant2.strftime("%Y-%m")
CORTE2 = mes_ant2.replace(day=1).isoformat()

# --- siembra: seis fundaciones vinculadas
sql("DELETE FROM mediciones_fundacion; DELETE FROM indicadores_fundacion; DELETE FROM portal_sesiones; DELETE FROM portal_enlaces; "
    "DELETE FROM inscripciones WHERE id IN (951, 952, 953, 954, 955, 956);")
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, ciudad) VALUES "
    "(951, 'fundacion', 'vinculada', 'Mide', 'f951@example.com', 'Medellín'),"
    "(952, 'fundacion', 'vinculada', 'Retira mucho', 'f952@example.com', 'Bello'),"
    "(953, 'fundacion', 'vinculada', 'Otra', 'f953@example.com', 'Itagüí'),"
    "(954, 'fundacion', 'vinculada', 'Cambia de sentido', 'f954@example.com', 'Envigado'),"
    "(955, 'fundacion', 'vinculada', 'Casi llena', 'f955@example.com', 'Sabaneta'),"
    "(956, 'fundacion', 'vinculada', 'Dos pestañas', 'f956@example.com', 'La Estrella')")
mide, retira, otra = entrar(951, "1" * 32), entrar(952, "2" * 32), entrar(953, "3" * 32)
cambia, llena, pestanas = entrar(954, "4" * 32), entrar(955, "5" * 32), entrar(956, "6" * 32)

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

print("\n== 8. cambiar el sentido mientras una medición espera: la aprobación se entera ==")
# La secuencia exacta de la revisión: «niños» con 32 enviado; el panel lo
# carga; la fundación lo guarda como «familias»; el equipo aprueba con la
# versión que vio.
NINOS, FAMILIAS = "Niños que terminan el ciclo de formación", "Familias con filtro de agua en uso"
st, d, _ = guardar(cambia, nombre=NINOS, unidad="niños")
ia = d.get("id")
st2, d2 = medir(cambia, ia, PERIODO, CORTE, valor="32")
ma = d2.get("id")
linea(st == 200 and st2 == 200 and ia and ma, "crear «%s» (niños) y enviar 32 (http %s, %s)" % (NINOS, st, st2))
p = panel(ma)
v0 = p.get("ver")
linea(p.get("indicador") == NINOS and p.get("unidad") == "niños" and p.get("valor") == 32 and v0,
      "el panel carga la medición: 32 niños, con su versión (%s)" % v0)
st, d, _ = guardar(cambia, id=ia, nombre=NINOS, unidad="niños", meta="40 niños", fuente="Listas firmadas por el profesor")
linea(st == 200 and panel(ma).get("ver") == v0,
      "cambiar la meta y la fuente no le cambia la versión: no tocan el sentido de la cifra (http %s)" % st)
st, d, _ = guardar(cambia, id=ia, nombre=FAMILIAS, unidad="familias")
linea(st == 200 and fila(ia).get("unidad") == "familias",
      "sin nada aprobado, la fundación lo guarda como «%s» (familias) (http %s)" % (FAMILIAS, st))
st, d = decidir(ma, v0)
linea(st == 409 and d.get("error") == "cambio_mientras_revisabas" and estado_med(ma) == "enviada",
      "aprobar con la versión que mostraba «niños» responde 409 cambio_mientras_revisabas y no aprueba (http %s %s)"
      % (st, d.get("error")))
st, d = leer(cambia)
x = [i for i in d.get("indicadores", []) if i["id"] == ia]
linea(x and x[0].get("bloqueado") is False, "y el indicador sigue sin bloquear (%s)" % (x and x[0].get("bloqueado")))
p = panel(ma)
v1 = p.get("ver")
linea(p.get("indicador") == FAMILIAS and p.get("unidad") == "familias" and v1 and v1 != v0,
      "al recargar, el panel ve «familias» y una versión nueva (%s → %s)" % (v0, v1))
st, d = decidir(ma, v1)
linea(st == 200 and estado_med(ma) == "aprobada",
      "con la versión nueva sí se aprueba (http %s %s)" % (st, d.get("error", "")))
st, d, _ = guardar(cambia, id=ia, nombre=NINOS, unidad="niños")
f = fila(ia)
linea(st == 409 and d.get("error") == "indicador_con_mediciones_aprobadas" and f.get("nombre") == FAMILIAS
      and f.get("unidad") == "familias",
      "aprobada, volver a «niños» responde 409: queda fijo con lo que el equipo vio (http %s)" % st)
st, d = medir(cambia, ia, PERIODO2, CORTE2, valor="35")
mb = d.get("id")
u0 = panel(mb).get("ver") if mb else None
st, d, _ = guardar(cambia, id=ia, nombre="Otra cosa que ya no se puede medir aquí", unidad="familias")
linea(st == 409 and u0 and panel(mb).get("ver") == u0,
      "un cambio rechazado no le toca la versión a la otra medición que espera (http %s)" % st)
# La frecuencia cuenta igual, y una medición DEVUELTA también se puede
# aprobar desde el panel: su versión cambia igual.
st, d, _ = guardar(cambia, nombre="Familias que reciben el mercado del mes", unidad="familias")
ib = d.get("id")
st, d = medir(cambia, ib, PERIODO, CORTE, valor="12")
mc = d.get("id")
st, d = decidir(mc, panel(mc).get("ver"), accion="devolver", motivo="Falta la lista firmada del mes")
w1 = panel(mc).get("ver")
linea(st == 200 and estado_med(mc) == "devuelta" and w1, "el panel devuelve otra medición (http %s)" % st)
st, d, _ = guardar(cambia, id=ib, nombre="Familias que reciben el mercado del mes", unidad="familias", frecuencia="trimestral")
w2 = panel(mc).get("ver")
st2, d2 = decidir(mc, w1)
linea(st == 200 and w2 and w2 != w1 and st2 == 409 and d2.get("error") == "cambio_mientras_revisabas"
      and estado_med(mc) == "devuelta",
      "cambiar solo la frecuencia también le cambia la versión, devuelta incluida (http %s; aprobar con la vieja: %s)"
      % (st, st2))

print("\n== 9. carreras: el 409 dice la causa verdadera ==")
# OJO: en el banco local, wrangler dev atiende estas peticiones una tras otra.
# Medido el 24 nov 2026 contra el código de antes del arreglo: 6 «Añadir» y
# 10 pares renombrar/retirar lanzados juntos, con la conexión ya abierta, y
# ninguno se intercaló. Aquí las pruebas «a la vez» vigilan el invariante;
# el camino de la carrera lo recorren igual las deterministas, porque el
# worker ya no decide con una lectura previa: decide la escritura, y cuando
# no escribe, mira por qué (el tope de la sección 7, el retirado de abajo).
#
# (a) 59 entre activos y retirados, y solo 3 activos: seis «Añadir» a la vez.
# Cabe uno; los otros cinco chocan con el tope HISTÓRICO, y «retira alguno»
# sería un consejo falso: retirar no baja ese total.
sql("WITH RECURSIVE n(k) AS (SELECT 1 UNION ALL SELECT k + 1 FROM n WHERE k < %d) "
    "INSERT INTO indicadores_fundacion (inscripcion, nombre, frecuencia, fuente, estado) "
    "SELECT 955, 'Sembrado ' || k, 'mensual', 'Listas de asistencia', CASE WHEN k <= 3 THEN 'activo' ELSE 'retirado' END FROM n"
    % (TOPE_HISTORICO - 1))
r = a_la_vez(*[preparar("/api/portal/indicadores", cuerpo_guardar(nombre="Añadido a la vez, número %d" % k), llena)
               for k in range(6)])
res = sorted((x[0], x[1].get("error", "")) for x in r)
total = sql("SELECT COUNT(*) AS n FROM indicadores_fundacion WHERE inscripcion = 955")[0]["n"]
linea(res == [(200, "")] + [(409, "tope_historico")] * 5 and total == TOPE_HISTORICO,
      "con 59 y 3 activos, de seis a la vez entra uno y los otros cinco dicen tope_historico (%s; total %s)" % (res, total))
# (b) Renombrar uno que ya no está activo es 404, no «ya tiene mediciones
# aprobadas»: no tiene ninguna. Es la misma rama que toma un renombre cuando
# otra pestaña lo retira entre la lectura y la escritura.
st, d, _ = guardar(pestanas, nombre="Indicador que se retira antes")
ir_ = d.get("id")
st2, _, _ = pedir("/api/portal/indicadores", {"accion": "retirar", "id": ir_}, pestanas)
st3, d3, _ = guardar(pestanas, id=ir_, nombre="Renombrado después de retirarlo")
linea(st == 200 and st2 == 200 and st3 == 404 and d3.get("error") == "no_encontrado"
      and fila(ir_).get("nombre") == "Indicador que se retira antes",
      "renombrar uno ya retirado responde 404 no_encontrado (http %s %s)" % (st3, d3.get("error")))
# Y lo mismo con las dos pestañas a la vez: una renombra, la otra retira. La
# única respuesta honesta es 200 (llegó antes) o 404 (ya no está activo).
vueltas = []
for k in range(10):
    st, d, _ = guardar(pestanas, nombre="Indicador de la vuelta %d" % k)
    ic = d.get("id")
    if st != 200 or not ic:
        vueltas.append((ic, k, st, "no se creó", 0))
        continue
    (st1, d1), (st2, _) = a_la_vez(
        preparar("/api/portal/indicadores", cuerpo_guardar(id=ic, nombre="Renombrado en la vuelta %d" % k), pestanas),
        preparar("/api/portal/indicadores", {"accion": "retirar", "id": ic}, pestanas))
    vueltas.append((ic, k, st1, d1.get("error", ""), st2))
filas = {x["id"]: x for x in sql("SELECT id, nombre, estado FROM indicadores_fundacion WHERE inscripcion = 956")}
linea(all(st1 in (200, 404) and st2 == 200 and filas.get(ic, {}).get("estado") == "retirado"
          and (filas.get(ic, {}).get("nombre") == "Renombrado en la vuelta %d" % k) == (st1 == 200)
          for ic, k, st1, _, st2 in vueltas),
      "renombrar contra retirar a la vez: 200 si llegó antes, 404 si no, nunca 409 (%s)" % [(v[2], v[3]) for v in vueltas])

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
