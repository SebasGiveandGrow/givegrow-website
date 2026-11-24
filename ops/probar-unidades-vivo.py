#!/usr/bin/env python3
"""Pruebas de las unidades de impacto que salen solas al sitio (0068).

Uso:   node ops/probar-dinero.mjs unidades-vivo

QUÉ VIGILA. Desde el 19 nov 2026 (decisión de Sebas) verificar una unidad en
/admin la publica: el Worker sirve /data/partners.json con las unidades
verificadas mezcladas sobre el archivo. Lo que no puede pasar:
  · que salga una unidad sin verificar, o de una fundación sin vínculo;
  · que una verificada cambie el id de una que ya existía (las membresías y
    las actas guardan ese id como destino);
  · que «qué incluye» salga solo en español;
  · que una unidad editada por la fundación siga en el sitio sin revisión.
"""
import hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-uv")
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


def unidades(red_id):
    st, d, _ = pedir("/data/partners.json")
    p = [x for x in d.get("partners", []) if x.get("id") == red_id]
    return st, (p[0].get("impactUnits", []) if p else None)


# --- siembra: NDF vinculada (está en partners.json), otra sin vínculo
sql("INSERT INTO inscripciones (id, tipo, estado, nombre, email, red_id) VALUES "
    "(931, 'fundacion', 'vinculada', 'NDF', 'u931@example.com', 'ndf'), "
    "(932, 'fundacion', 'visitada', 'Sin red', 'u932@example.com', NULL)")
sql("INSERT INTO documentos_fundacion (id, inscripcion, tipo, clave, contenido, bytes) VALUES "
    "(91, 931, 'otro', 'x/91.pdf', 'application/pdf', 10), (92, 932, 'otro', 'x/92.pdf', 'application/pdf', 10)")
# 1: reemplaza a ndf-plato · 2: nueva · 3: por revisar · 4: de la fundación sin vínculo · 5: sin «qué incluye», por verificar
sql("INSERT INTO unidades_impacto (id, inscripcion, proyecto, nombre_es, nombre_es_pl, nombre_en, nombre_en_pl, costo_cop, incluye, incluye_en, soporte_doc, estado, unidad_red, revisado_en) VALUES "
    "(1, 931, 'Chefs del Futuro', 'plato de comida', 'platos de comida', 'meal', 'meals', 4500, 'Arroz, proteína y fruta', 'Rice, protein and fruit', 91, 'aprobada', 'ndf-plato', datetime('now')), "
    "(2, 931, 'Huerta', 'kit de huerta', 'kits de huerta', 'garden kit', 'garden kits', 60000, NULL, NULL, 91, 'aprobada', NULL, datetime('now')), "
    "(3, 931, NULL, 'clase de música', 'clases de música', NULL, NULL, 20000, 'Instructor', NULL, 91, 'propuesta', NULL, NULL), "
    "(4, 932, NULL, 'mercado', 'mercados', 'grocery box', 'grocery boxes', 90000, NULL, NULL, 92, 'aprobada', NULL, datetime('now')), "
    "(5, 931, 'Becas', 'beca de un mes', 'becas de un mes', NULL, NULL, 300000, 'Matrícula y transporte', NULL, 91, 'propuesta', NULL, NULL)")

# --- lo público
st, us = unidades("ndf")
linea(st == 200 and us is not None, "/data/partners.json responde y trae a NDF")
ids = [u["id"] for u in us or []]
plato = [u for u in us or [] if u["id"] == "ndf-plato"]
linea(len(plato) == 1 and plato[0]["cop"] == 4500, "la verificada que reemplaza a ndf-plato conserva el id y trae el costo nuevo")
linea(plato and plato[0].get("incluye") == {"es": "Arroz, proteína y fruta", "en": "Rice, protein and fruit"}, "«qué incluye» sale en los dos idiomas")
linea(plato and plato[0].get("project") == "Chefs del Futuro" and plato[0].get("verificada") is True, "conserva el programa y se marca verificada")
linea("ndf-kit-de-huerta" in ids, "la verificada nueva se suma con el id de la fundación y su nombre")
linea("ndf-borboletas" in ids, "las del archivo que nadie reemplazó siguen")
linea(not any("musica" in i for i in ids), "la que está por revisar NO sale")
linea(ids.count("ndf-plato") == 1, "no hay ids repetidos")
st, d, _ = pedir("/data/partners.json")
linea(not any(u.get("es") == "mercado" for p in d.get("partners", []) for u in (p.get("impactUnits") or [])),
      "la verificada de una fundación sin vínculo con la red NO sale")
st, _, _ = pedir("/data/partners.json", metodo="HEAD")
linea(st == 200, "HEAD /data/partners.json responde 200")

# --- verificar desde /admin
st, d, _ = pedir("/api/admin/unidades-impacto")
linea(st == 200 and "ndf" in (d.get("archivo") or {}), "el panel recibe las unidades que ya estaban en el archivo, por fundación")
u5 = [u for u in d.get("unidades", []) if u["id"] == 5]
ver = u5[0]["ver"] if u5 else ""
st, d, _ = pedir("/api/admin/unidad-impacto/5", {"accion": "aprobar", "ver": ver, "costo_verificado": True,
                                                  "nombre_en": "one-month scholarship", "nombre_en_pl": "one-month scholarships"})
linea(st == 400 and d.get("campo") == "incluye_en", "verificar sin el inglés de «qué incluye» se rechaza")
st, d, _ = pedir("/api/admin/unidad-impacto/5", {"accion": "aprobar", "ver": ver, "costo_verificado": True,
                                                  "nombre_en": "one-month scholarship", "nombre_en_pl": "one-month scholarships",
                                                  "incluye_en": "Tuition and transport", "unidad_red": "ndf-beca"})
linea(st == 400 and d.get("campo") == "tema", "verificar sin tema se rechaza (0071)")
st, d, _ = pedir("/api/admin/unidad-impacto/5", {"accion": "aprobar", "ver": ver, "costo_verificado": True,
                                                  "nombre_en": "one-month scholarship", "nombre_en_pl": "one-month scholarships",
                                                  "incluye_en": "Tuition and transport", "unidad_red": "ndf-beca", "tema": "deportes"})
linea(st == 400 and d.get("campo") == "tema", "un tema que no existe se rechaza")
st, d, _ = pedir("/api/admin/unidad-impacto/5", {"accion": "aprobar", "ver": ver, "costo_verificado": True,
                                                  "nombre_en": "one-month scholarship", "nombre_en_pl": "one-month scholarships",
                                                  "incluye_en": "Tuition and transport", "unidad_red": "ndf-beca", "tema": "educacion"})
linea(st == 200, "verificar con el inglés, el tema y reemplazando a ndf-beca responde 200")
st, us = unidades("ndf")
beca = [u for u in us or [] if u["id"] == "ndf-beca"]
linea(beca and beca[0]["cop"] == 300000 and beca[0].get("incluye", {}).get("en") == "Tuition and transport",
      "al minuto (en el mismo isolate, al instante) ndf-beca ya sale con lo verificado")
linea(beca and beca[0].get("tema") == "educacion", "y sale con el tema que eligió el equipo")
plato = [u for u in us or [] if u["id"] == "ndf-plato"]
linea(plato and plato[0].get("tema") == "alimentacion", "una verificada sin tema hereda el de la unidad del archivo que reemplaza")
st, d, _ = pedir("/api/admin/unidades-impacto")
linea(st == 200 and (d.get("temas") or {}).get("agua") == "Agua", "el panel recibe la lista de temas para el selector")
st, d, _ = pedir("/api/admin/unidad-impacto/3", {"accion": "aprobar", "ver": "x", "costo_verificado": True,
                                                  "nombre_en": "music class", "nombre_en_pl": "music classes",
                                                  "incluye_en": "Teacher", "unidad_red": "NO VALE", "tema": "educacion"})
linea(st == 400 and d.get("campo") == "unidad_red", "un id de unidad mal formado se rechaza")

# --- la fundación edita una verificada: vuelve a revisión y deja de salir
cookie = entrar(931, "931a" * 8)
st, d, _ = pedir("/api/portal/unidades-impacto", {"accion": "guardar", "id": 2, "proyecto": "Huerta", "nombre_es": "kit de huerta",
                                                  "nombre_es_pl": "kits de huerta", "costo_cop": 80000, "incluye": "", "soporte_doc": 91}, cookie)
linea(st == 200, "la fundación edita su unidad verificada")
st, us = unidades("ndf")
linea("ndf-kit-de-huerta" not in [u["id"] for u in us or []], "la editada deja de salir hasta que el equipo la vuelva a verificar")

print("\n%d ok, %d fallas" % (okc, failc))
sys.exit(1 if failc else 0)
