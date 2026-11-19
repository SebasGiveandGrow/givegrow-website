#!/usr/bin/env python3
"""Pruebas de la tarjeta del HUB editada desde el portal (0069).

Uso:   node ops/probar-dinero.mjs tarjetas

QUÉ VIGILA. Desde el 19 nov 2026 (decisión de Sebas) la fundación cambia en
su portal lo que el público ve en su ficha, y la aprobación del equipo en
/admin lo publica sola. Lo que no puede pasar:
  · que salga algo sin aprobar (ni siquiera mientras espera revisión);
  · que salga solo en español;
  · que se cuele un correo o un teléfono en una página pública;
  · que un programa pierda su logo o su marca de formativo al editarse.
"""
import hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-tj")
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
    sql("INSERT INTO portal_enlaces (hash, inscripcion, expira, email) VALUES ('%s', %d, datetime('now','+1 day'), 'u%d@example.com')"
        % (hashlib.sha256(token.encode()).hexdigest(), inscripcion, inscripcion))
    st, d, sc = pedir("/api/portal/sesion", {"t": token})
    if not sc:
        sys.exit("No abrió sesión: %s %s" % (st, d))
    return sc.split(";")[0]


def ndf():
    st, d, _ = pedir("/data/partners.json")
    return [x for x in d.get("partners", []) if x.get("id") == "ndf"][0]


sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, red_id) VALUES (941, 'fundacion', 'vinculada', 'NDF', 'u941@example.com', 'ndf')")
cookie = entrar(941, "941b" * 8)
antes = ndf()

st, d, _ = pedir("/api/portal/tarjeta", cookie=cookie)
linea(st == 200 and d.get("red_id") == "ndf" and d["actual"]["tagline"]["es"] == antes["profile"]["tagline"]["es"],
      "el portal trae la tarjeta que hoy se ve en el sitio")

ABOUT = "Fundación comunitaria de La Honda que acompaña a niñas, niños y jóvenes con alimentación, educación, deporte y mentoría desde hace seis años."
buena = {"tagline": "Formamos líderes.", "about": ABOUT, "area": "La Honda, Medellín", "poblacion": "≈140 niñas y niños",
         "programs": [{"name": "Borboletas", "desc": "Grupo de baile para niñas y niños de 6 a 12 años, tres veces por semana."},
                      {"name": "Huerta", "desc": "Huerta comunitaria con las familias del barrio, los sábados."}]}
st, d, _ = pedir("/api/portal/tarjeta", {"accion": "enviar", "datos": dict(buena, about="Corto.")}, cookie)
linea(st == 400 and d.get("campo") == "about", "un «quiénes son» de una línea se rechaza")
st, d, _ = pedir("/api/portal/tarjeta", {"accion": "enviar", "datos": dict(buena, about=ABOUT + " Escríbenos a nadie@ejemplo.org")}, cookie)
linea(st == 400, "un correo en la tarjeta se rechaza")
st, d, _ = pedir("/api/portal/tarjeta", {"accion": "enviar", "datos": dict(buena, poblacion="Llámanos al 300 123 4567")}, cookie)
linea(st == 400, "un celular en la tarjeta se rechaza")
st, d, _ = pedir("/api/portal/tarjeta", {"accion": "enviar", "datos": dict(buena, programs=[])}, cookie)
linea(st == 400 and d.get("campo") == "prog-0", "sin programas se rechaza (borraría los que hoy se ven)")
st, d, _ = pedir("/api/portal/tarjeta", {"accion": "enviar", "datos": buena}, cookie)
linea(st == 200, "una tarjeta completa se envía")
st, d, _ = pedir("/api/portal/tarjeta", cookie=cookie)
linea(d.get("estado") == "enviada" and d["propuesta"]["area"] == "La Honda, Medellín", "queda por revisar, con lo que envió")
linea(ndf()["profile"]["about"]["es"] == antes["profile"]["about"]["es"], "mientras espera, el sitio sigue mostrando lo anterior")

st, d, _ = pedir("/api/admin/revisar")
linea(any(x.get("tipo") == "tarjeta" and x.get("id") == 941 for x in d.get("items", [])), "aparece en la Bandeja de revisión")
st, d, _ = pedir("/api/admin/tarjetas")
t = [x for x in d.get("tarjetas", []) if x["inscripcion"] == 941]
linea(st == 200 and t and t[0]["actual"]["nombre"], "el panel la lista con lo que hoy se ve")
ver = t[0]["ver"] if t else ""
EN = {"tagline": "We raise leaders.", "about": "Community foundation in La Honda supporting children and young people.",
      "area": "La Honda, Medellín", "poblacion": "≈140 children",
      "programs": ["Dance group for children aged 6 to 12, three times a week.", "Community garden with local families, on Saturdays."]}
st, d, _ = pedir("/api/admin/tarjeta/941", {"accion": "aprobar", "ver": ver, "en": dict(EN, about="")})
linea(st == 400 and d.get("campo") == "en-about", "aprobar sin el inglés de un campo se rechaza")
st, d, _ = pedir("/api/admin/tarjeta/941", {"accion": "aprobar", "ver": ver, "en": dict(EN, programs=EN["programs"][:1])})
linea(st == 400 and d.get("campo") == "en-prog-1", "aprobar sin el inglés de un programa se rechaza")
st, d, _ = pedir("/api/admin/tarjeta/941", {"accion": "aprobar", "ver": "2000-01-01 00:00:00", "en": EN})
linea(st == 409, "aprobar una versión vieja se rechaza")
st, d, _ = pedir("/api/admin/tarjeta/941", {"accion": "aprobar", "ver": ver, "en": EN})
linea(st == 200, "aprobar con el inglés responde 200")
p = ndf()
linea(p["profile"]["about"] == {"es": ABOUT, "en": EN["about"]}, "el sitio ya muestra «quiénes son» nuevo, en los dos idiomas")
linea(p["area"]["es"] == "La Honda, Medellín" and p["poblacion"]["en"] == "≈140 children", "y el territorio y la población")
bor = [g for g in p["profile"]["programs"] if g["name"] == "Borboletas"]
linea(bor and bor[0].get("logo") and bor[0].get("formativo") is True and bor[0]["desc"]["en"] == EN["programs"][0],
      "Borboletas conserva su logo y su marca de formativo, con la descripción nueva")
linea([g["name"] for g in p["profile"]["programs"]] == ["Borboletas", "Huerta"], "los programas son los que envió la fundación")
linea(p["name"] == antes["name"] and p.get("impactUnits") == antes.get("impactUnits"), "el nombre y las unidades no se tocan")

# una propuesta nueva no cambia lo publicado hasta aprobarla; devolver pide motivo
st, d, _ = pedir("/api/portal/tarjeta", {"accion": "enviar", "datos": dict(buena, tagline="Otra frase")}, cookie)
linea(ndf()["profile"]["tagline"]["es"] == "Formamos líderes.", "con otra propuesta en espera, sigue lo aprobado")
st, d, _ = pedir("/api/admin/tarjetas")
ver = [x for x in d["tarjetas"] if x["inscripcion"] == 941][0]["ver"]
st, d, _ = pedir("/api/admin/tarjeta/941", {"accion": "devolver", "ver": ver, "motivo": ""})
linea(st == 400, "devolver sin motivo se rechaza")
st, d, _ = pedir("/api/admin/tarjeta/941", {"accion": "devolver", "ver": ver, "motivo": "Confirmen la cifra de población."})
st2, d2, _ = pedir("/api/portal/tarjeta", cookie=cookie)
linea(st == 200 and d2.get("estado") == "devuelta" and "cifra" in (d2.get("motivo") or ""), "devuelta: la fundación ve el motivo")

print("\n%d ok, %d fallas" % (okc, failc))
sys.exit(1 if failc else 0)
