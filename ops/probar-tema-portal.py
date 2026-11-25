#!/usr/bin/env python3
"""Pruebas del tema y el saludo del portal de una fundación desde /admin (0063).

Uso:   node ops/probar-dinero.mjs tema-portal

QUÉ VIGILA. Hasta el 24 nov 2026 el tema y el saludo del portal se asignaban
desde la consola de D1. Ahora salen de Alianzas › Fundaciones, con
POST /api/admin/fundacion/<id> { accion: "portal_tema", tema, saludo }. Lo que
no puede pasar:
  · que se guarde un tema que el portal no conoce (el panel diría una cosa y el
    portal mostraría otra);
  · que entre un saludo de más de 160 caracteres o con saltos de línea;
  · que un saludo vacío quede como cadena vacía en vez de NULL;
  · que se le ponga tema a algo que no es una fundación;
  · que el texto del saludo (puede llevar el nombre de una persona) termine en
    la bitácora;
  · que cambiar el tema o el saludo, que son cosméticos, mueva actualizada_en:
    de esa fecha cuenta la cola «Fundaciones detenidas», y la fundación saldría
    de «Hoy» aunque su proceso no hubiera avanzado;
  · que una palabra larga del saludo (un correo, una dirección web) se salga de
    su columna en la cabecera con tema, que recorta lo que sobra.
"""
import hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-tp")
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


def pedir(ruta, cuerpo=None, cookie=None, metodo=None, origen=None):
    cab = {"content-type": "application/json", "Origin": origen or BASE}
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
    sql("INSERT INTO portal_enlaces (hash, inscripcion, expira, email) VALUES ('%s', %d, datetime('now','+1 day'), 'u%d@example.com')"
        % (hashlib.sha256(token.encode()).hexdigest(), inscripcion, inscripcion))
    st, d, sc = pedir("/api/portal/sesion", {"t": token})
    if not sc:
        sys.exit("No abrió sesión: %s %s" % (st, d))
    return sc.split(";")[0]


def fila(i):
    r = sql("SELECT portal_tema, portal_saludo FROM inscripciones WHERE id = %d" % i)
    return (r[0]["portal_tema"], r[0]["portal_saludo"]) if r else None


def en_lista(i):
    st, d, _ = pedir("/api/admin/fundaciones")
    f = [x for x in d.get("fundaciones", []) if x.get("id") == i]
    return st, d, (f[0] if f else None)


def guardar(i, tema, saludo):
    return pedir("/api/admin/fundacion/%d" % i, {"accion": "portal_tema", "tema": tema, "saludo": saludo})


def actualizada(i):
    return sql("SELECT actualizada_en FROM inscripciones WHERE id = %d" % i)[0]["actualizada_en"]


def detenidas():
    """La cola «Fundaciones detenidas» de /api/admin/salud y los ids que trae."""
    st, d, _ = pedir("/api/admin/salud?items=1")
    c = ([x for x in d.get("cola") or [] if x.get("clave") == "fundaciones_detenidas"] or [{}])[0]
    return st, c, [x.get("id") for x in c.get("items") or []]


def pagina(ruta):
    try:
        with urllib.request.urlopen(BASE + ruta) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, ""


def reglas_css(html):
    """Las reglas del <style> de una página como [(selectores, declaraciones)],
    sin comentarios. Las de dentro de un @media salen sueltas."""
    m = re.search(r"<style[^>]*>(.*?)</style>", html, re.S)
    css = re.sub(r"/\*.*?\*/", "", m.group(1) if m else "", flags=re.S)
    return [([s.strip() for s in sel.split(",")], cuerpo) for sel, cuerpo in re.findall(r"([^{}]+)\{([^{}]*)\}", css)]


# --- siembra: una fundación con portal abierto y una empresa
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email) VALUES "
    "(941, 'fundacion', 'vinculada', 'Fundación Tema', 'u941@example.com'), "
    "(942, 'empresa', 'aceptada', 'Empresa Tema', 'u942@example.com')")

# --- lo que el panel recibe para pintar el control
st, d, f = en_lista(941)
temas = d.get("temas") or []
linea(st == 200 and any(t.get("id") == "adriatico" and t.get("nombre") for t in temas),
      "GET /api/admin/fundaciones trae la lista de temas (id y nombre legible)")
linea(f is not None and f.get("portal_tema") is None and f.get("portal_saludo") is None,
      "la fundación sin tema sale con tema y saludo en null")
st, d, _ = pedir("/api/admin/fundacion/941")
linea(st == 200 and d.get("portal_tema") is None and d.get("saludo_max") == 160 and any(t.get("id") == "adriatico" for t in d.get("temas") or []),
      "la ficha de la fundación trae tema, saludo, temas y el máximo del saludo")

# --- guardar un tema válido y un saludo
st, d, _ = guardar(941, "adriatico", "  Bienvenidas,\n equipo\tde la fundación.  ")
linea(st == 200 and d.get("tema") == "adriatico", "guardar el tema «adriatico» responde 200")
linea(d.get("saludo") == "Bienvenidas, equipo de la fundación.",
      "el saludo se recorta y los saltos de línea y tabuladores quedan en un espacio")
linea(fila(941) == ("adriatico", "Bienvenidas, equipo de la fundación."), "la base guarda el tema y el saludo")
au = sql("SELECT sujeto, detalle FROM consentimientos WHERE tipo = 'auditoria' AND detalle LIKE 'inscripcion 941 %' ORDER BY rowid DESC LIMIT 1")
linea(au and au[0]["sujeto"] == "prueba@local" and "tema adriatico" in au[0]["detalle"],
      "el cambio queda en la bitácora con quién lo hizo")
linea(au and "Bienvenidas" not in au[0]["detalle"], "la bitácora no copia el texto del saludo, solo su largo")

st, d, f = en_lista(941)
linea(f and f.get("portal_tema") == "adriatico" and f.get("portal_saludo") == "Bienvenidas, equipo de la fundación.",
      "el GET de fundaciones devuelve lo guardado")
st, d, _ = pedir("/api/admin/fundacion/941")
linea(d.get("portal_tema") == "adriatico" and d.get("portal_saludo") == "Bienvenidas, equipo de la fundación.",
      "la ficha de la fundación devuelve lo guardado")

cookie = entrar(941, "941a" * 8)
st, d, _ = pedir("/api/portal/yo", cookie=cookie)
linea(st == 200 and (d.get("tema") or {}).get("id") == "adriatico" and (d.get("tema") or {}).get("color"),
      "/api/portal/yo trae el tema con su color")
linea(d.get("saludo") == "Bienvenidas, equipo de la fundación.", "/api/portal/yo trae el saludo")

# --- lo que se rechaza
for malo, que in (("rosado", "un tema que no existe"), ("constructor", "un nombre heredado de Object («constructor»)"),
                  ("__proto__", "«__proto__»"), (5, "un número como tema")):
    st, d, _ = guardar(941, malo, "Hola")
    linea(st == 400 and d.get("campo") == "tema", "%s se rechaza con 400" % que)
linea(fila(941) == ("adriatico", "Bienvenidas, equipo de la fundación."), "un tema rechazado no toca lo guardado")

st, d, _ = guardar(941, "adriatico", "a" * 161)
linea(st == 400 and d.get("campo") == "saludo", "un saludo de 161 caracteres se rechaza con 400")
st, d, _ = guardar(941, "adriatico", ["no", "texto"])
linea(st == 400, "un saludo que no es texto se rechaza con 400")
linea(fila(941)[1] == "Bienvenidas, equipo de la fundación.", "un saludo rechazado no toca lo guardado")
st, d, _ = guardar(941, "adriatico", "b" * 160)
linea(st == 200 and fila(941)[1] == "b" * 160, "uno de 160 caracteres justos entra")

st, d, _ = guardar(99999, "adriatico", "Hola")
linea(st == 404, "una inscripción que no existe responde 404")
st, d, _ = guardar(942, "adriatico", "Hola")
linea(st == 404 and fila(942) == (None, None), "una inscripción que no es fundación responde 404 y no cambia")

st, d, _ = pedir("/api/admin/fundacion/941", {"accion": "portal_tema", "tema": None, "saludo": ""}, origen="https://otro.example")
linea(st == 403 and fila(941)[0] == "adriatico", "un POST de otro origen se rechaza (403) y no cambia nada")

# --- vaciar: vuelve a NULL
st, d, _ = guardar(941, None, "   \n\t  ")
linea(st == 200 and d.get("tema") is None and d.get("saludo") is None, "sin tema y con saludo en blanco responde 200")
linea(fila(941) == (None, None), "la base queda con NULL en los dos, no con cadena vacía")
st, d, _ = guardar(941, "", "")
linea(st == 200 and fila(941) == (None, None), "el tema \"\" del selector («Sin tema propio») también queda en NULL")
st, d, _ = pedir("/api/portal/yo", cookie=cookie)
linea(st == 200 and d.get("tema") is None and d.get("saludo") is None, "/api/portal/yo vuelve a salir sin tema ni saludo")
st, d, f = en_lista(941)
linea(f and f.get("portal_tema") is None and f.get("portal_saludo") is None, "y el GET de fundaciones también")

# --- el tema no reinicia el reloj de «Fundaciones detenidas»
# La cola cuenta desde actualizada_en: aceptada sin visita, más de 14 días. El
# equipo le pone un saludo a una fundación cuya visita se atrasó y, si eso
# moviera la fecha, la alerta se apagaba otros 14 días sin que nada avanzara.
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, creada_en, actualizada_en) VALUES "
    "(943, 'fundacion', 'aceptada', 'Fundación Quieta', 'u943@example.com', datetime('now','-30 days'), datetime('now','-20 days'))")
hace = actualizada(943)
st, c, ids = detenidas()
linea(st == 200 and 943 in ids and (c.get("dias") or 0) >= 20,
      "antes: la fundación aceptada hace 20 días sin visita sale en «Fundaciones detenidas»")
st, d, _ = guardar(943, "adriatico", "Hola, equipo.")
linea(st == 200 and fila(943) == ("adriatico", "Hola, equipo."), "ponerle tema y saludo responde 200 y se guarda")
linea(actualizada(943) == hace, "guardar el tema y el saludo no toca actualizada_en")
st, c, ids = detenidas()
linea(st == 200 and 943 in ids and (c.get("dias") or 0) >= 20,
      "y la fundación sigue en «Fundaciones detenidas» con sus 20 días")
st, d, _ = guardar(943, None, "")
linea(st == 200 and fila(943) == (None, None) and actualizada(943) == hace, "quitarle tema y saludo tampoco la toca")

# --- una palabra larga del saludo no se sale de su columna
# Con tema, el saludo va en una columna de ancho fijo (100% − 440 px; en
# celular, 100% − 130 px) dentro de una cabecera con overflow:hidden. Sin
# overflow-wrap, un correo o una dirección web en el saludo quedaba cortado en
# celular y en escritorio se montaba sobre los lirios. Aquí no hay navegador
# que mida: se comprueba la regla que lo evita en la hoja que sirve /portal.
st, html = pagina("/portal")
rs = reglas_css(html)
base = [cuerpo for sels, cuerpo in rs if sels == [".saludo"]]
linea(st == 200 and len(base) == 1 and re.search(r"overflow-wrap\s*:\s*(anywhere|break-word)", base[0]),
      "la regla base de .saludo del portal parte las palabras largas (overflow-wrap)")
otras = [cuerpo for sels, cuerpo in rs if any(s.endswith(".saludo") for s in sels)]
linea(len(otras) > 1 and not any(re.search(r"overflow-wrap\s*:\s*normal|word-break\s*:\s*keep-all|white-space\s*:\s*nowrap", x) for x in otras),
      "ninguna regla del saludo con tema lo deshace")

print("\n%d ok, %d fallas" % (okc, failc))
sys.exit(1 if failc else 0)
