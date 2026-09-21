#!/usr/bin/env python3
"""Pruebas de la baja de membresía (/membresia y /api/pago/baja).

Uso:
    npx wrangler dev --port 8796 --persist-to /tmp/gg-baja
    python3 ops/probar-baja.py

NO manda correo: el banco local no tiene RESEND_API_KEY, así que `enviarCorreo`
simula y lo deja anotado en `correos` con resultado 'simulado'. Eso se comprueba
aquí abajo, porque una prueba que creyera estar simulando y estuviera enviando
es exactamente el fallo que no se puede permitir en una ruta que escribe a
personas reales.
"""
import json, os, re, subprocess, sys, urllib.error, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8796")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-baja")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TOK_A = "a" * 32            # suscripción sola: al darla de baja se retira la fuente
TOK_B = "b" * 32            # comparte fuente con TOK_C: NO se debe retirar
TOK_C = "c" * 32
TOK_EN = "e" * 32           # en inglés
NO_EXISTE = "f" * 32

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
        ["npx", "wrangler", "d1", "execute", "givegrow-privado", "--local",
         "--persist-to", PERSIST, "--json", "--command", cmd],
        cwd=RAIZ, capture_output=True, text=True)
    m = re.search(r"\[\s*\{.*", r.stdout, re.S)
    if not m:
        sys.exit("SQL falló: " + (r.stderr or r.stdout)[:400])
    return json.loads(m.group(0))[0]["results"]


def cabeceras(h):
    """En minúsculas. HTTP no distingue mayúsculas pero `dict()` sí, y esa
    diferencia fabricó tres fallos falsos la primera vez que corrió esto:
    el Worker manda `Location` y `Cache-Control`, la prueba los buscaba en
    minúscula y no los encontraba. El código estaba bien."""
    return {k.lower(): v for k, v in dict(h).items()}


def pedir(ruta, datos=None, seguir=False):
    url = BASE + ruta
    cuerpo = None
    if datos is not None:
        cuerpo = urllib.parse.urlencode(datos).encode()
    req = urllib.request.Request(url, data=cuerpo)
    if cuerpo:
        req.add_header("content-type", "application/x-www-form-urlencoded")

    class NoSigue(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    op = urllib.request.build_opener() if seguir else urllib.request.build_opener(NoSigue)
    try:
        r = op.open(req)
        return r.status, r.read().decode("utf-8", "replace"), cabeceras(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), cabeceras(e.headers)


def sembrar():
    sql("DELETE FROM suscripciones; DELETE FROM fuentes_pago; DELETE FROM donantes; "
        "DELETE FROM consentimientos; DELETE FROM correos;")
    sql("INSERT INTO donantes (nombre, email) VALUES "
        "('Prueba Uno','uno@ejemplo.invalid'), ('Prueba Dos','dos@ejemplo.invalid'), "
        "('Prueba Tres','tres@ejemplo.invalid')")
    sql("INSERT INTO fuentes_pago (proveedor, fuente_ref, tipo, estado, email, marca, ultimos_cuatro) VALUES "
        "('wompi','900001','CARD','AVAILABLE','uno@ejemplo.invalid','VISA','4242'), "
        "('wompi','900002','CARD','AVAILABLE','dos@ejemplo.invalid','MASTERCARD','1111'), "
        "('wompi','900003','CARD','AVAILABLE','tres@ejemplo.invalid','VISA','9999')")
    d = {r["email"]: r["id"] for r in sql("SELECT id, email FROM donantes")}
    f = {r["fuente_ref"]: r["id"] for r in sql("SELECT id, fuente_ref FROM fuentes_pago")}
    for sid, tok, correo, ref, idioma, monto in [
            ("w-uno", TOK_A, "uno@ejemplo.invalid", "900001", "es", 5000000),
            ("w-dos", TOK_B, "dos@ejemplo.invalid", "900002", "es", 12000000),
            ("w-tres", TOK_C, "dos@ejemplo.invalid", "900002", "es", 12000000),
            ("w-en", TOK_EN, "tres@ejemplo.invalid", "900003", "en", 25000000)]:
        sql("INSERT INTO suscripciones (id, proveedor, estado, nivel, monto_centavos, moneda, "
            "frecuencia, donante_id, idioma, fuente_id, token, creada_en, ultimo_cobro_en) VALUES "
            "('%s','wompi','activa','retono',%d,'COP','mensual',%d,'%s',%d,'%s','2026-09-01 10:00:00','2026-09-01 10:00:00')"
            % (sid, monto, d[correo], idioma, f[ref], tok))


print("== siembra ==")
sembrar()
linea(len(sql("SELECT id FROM suscripciones")) == 4, "4 suscripciones activas de prueba")

# EL FRENO SOBREVIVE A LA SIEMBRA, y eso hizo fallar la segunda corrida de esta
# batería con un fallo que no era del código. `BAJA_GOLPES` es un Map en memoria
# del isolate: borrar la base no lo toca, así que un `wrangler dev` reutilizado
# llega con el cupo de la IP ya gastado y el correo de recuperación no sale.
# Por diseño esa situación es INDISTINGUIBLE desde fuera —el freno responde la
# misma pantalla que todo lo demás, que es justo lo que se quiere—, así que no
# se puede detectar por HTTP: se comprueba aquí, por el efecto, y se dice qué
# hacer en vez de dejar un "NO OK" que parece un defecto.
pedir("/api/pago/baja-enlace", {"email": "tres@ejemplo.invalid", "lang": "es"})
if not sql("SELECT id FROM correos WHERE etiqueta = 'membresia_enlace'"):
    sys.exit("\nEl banco arrastra el freno de una corrida anterior (el Map vive en el\n"
             "isolate, no en la base). Reinicia `wrangler dev` y vuelve a correr esto.")
sql("DELETE FROM correos")

print("\n== la pantalla de la membresía ==")
s, h, cab = pedir("/membresia/" + TOK_A)
linea(s == 200, "GET /membresia/<token> responde 200 (fue %d)" % s)
linea("Tu membres" in h, "sale en español, que es el idioma de la suscripción")
linea("Activa" in h, "muestra el estado: Activa")
linea("$50.000" in h, "muestra el monto mensual real ($50.000)")
linea("VISA \u00b7\u00b7\u00b7\u00b7 4242" in h, "muestra la tarjeta como VISA ···· 4242")
linea("4242" in h and "900001" not in h, "NO filtra el payment_source_id de Wompi")
linea('action="/api/pago/baja"' in h, "trae el formulario de baja")
linea("<script" not in h, "la página no lleva un solo script")
csp = cab.get("content-security-policy", "")
linea("script-src 'none'" in csp, "la CSP le niega el JavaScript entero")
linea("form-action 'self'" in csp, "la CSP solo deja enviar el formulario a nuestro propio origen")
linea("no-store" in cab.get("cache-control", ""), "no se cachea: la URL ES la credencial")
linea("noindex" in cab.get("x-robots-tag", ""), "no se indexa")

print("\n== idioma ==")
s, h, _ = pedir("/membresia/" + TOK_EN)
linea("Your membership" in h, "la suscripción en inglés sale en inglés")
linea("Monthly" in h and "Mensual" not in h, "sin mezclar los dos idiomas")
s, h, _ = pedir("/membresia/" + TOK_A + "?lang=en")
linea("Your membership" in h, "?lang=en cambia el idioma de una suscripción en español")

print("\n== lo que no existe ==")
s, _, _ = pedir("/membresia/" + NO_EXISTE)
linea(s == 404, "un token que no existe da 404 (fue %d)" % s)
s, _, _ = pedir("/membresia/noesuntoken")
linea(s == 404, "un token con forma inválida da 404 (fue %d)" % s)
s, _, _ = pedir("/api/pago/baja")
linea(s == 405, "GET a /api/pago/baja da 405: cancelar NUNCA por GET (fue %d)" % s)

print("\n== la baja ==")
s, _, cab = pedir("/api/pago/baja", {"token": TOK_A, "lang": "es"})
linea(s == 303, "POST /api/pago/baja redirige con 303 (fue %d)" % s)
linea("baja=1" in cab.get("location", ""), "vuelve a la membresía con la baja hecha")
r = sql("SELECT estado, cancelada_en, cancelada_motivo FROM suscripciones WHERE token = '%s'" % TOK_A)[0]
linea(r["estado"] == "cancelada", "la suscripción queda 'cancelada' (quedó '%s')" % r["estado"])
linea(bool(r["cancelada_en"]), "queda anotado CUÁNDO")
linea(bool(r["cancelada_motivo"]), "queda anotado POR QUÉ: %s" % r["cancelada_motivo"])
fp = sql("SELECT retirada_en, retirada_motivo FROM fuentes_pago WHERE fuente_ref = '900001'")[0]
linea(bool(fp["retirada_en"]), "el método de pago queda retirado, que es lo que la página prometía")
aud = sql("SELECT detalle FROM consentimientos WHERE tipo = 'auditoria'")
linea(any("baja de membresia" in x["detalle"] for x in aud), "queda la anotación de auditoría")
linea(not any("@" in x["detalle"] for x in aud), "la anotación NO repite el correo de la persona")

print("\n== el correo de confirmación ==")
c = sql("SELECT etiqueta, resultado, para FROM correos WHERE etiqueta = 'membresia_baja'")
linea(len(c) == 1, "se dispara un correo de baja (%d)" % len(c))
linea(all(x["resultado"] == "simulado" for x in c),
      "y en el banco local queda SIMULADO: no salió nada a ninguna persona")

print("\n== ya cancelada ==")
s, h, _ = pedir("/membresia/" + TOK_A)
linea("Cancelada" in h, "la pantalla dice que está cancelada")
linea('action="/api/pago/baja"' not in h, "y ya no ofrece el botón de baja")
s, _, cab = pedir("/api/pago/baja", {"token": TOK_A, "lang": "es"})
linea(s == 303 and "baja=1" in cab.get("location", ""),
      "repetir la baja es idempotente: no da error por algo que ya salió bien")

print("\n== una fuente compartida por dos suscripciones ==")
s, _, _ = pedir("/api/pago/baja", {"token": TOK_B, "lang": "es"})
fp = sql("SELECT retirada_en FROM fuentes_pago WHERE fuente_ref = '900002'")[0]
linea(not fp["retirada_en"], "con otra suscripción viva usándola, la fuente NO se retira")
s, _, _ = pedir("/api/pago/baja", {"token": TOK_C, "lang": "es"})
fp = sql("SELECT retirada_en FROM fuentes_pago WHERE fuente_ref = '900002'")[0]
linea(bool(fp["retirada_en"]), "al caer la última, sí se retira")

print("\n== el cobro programado deja de verlas ==")
p = sql("SELECT id FROM suscripciones WHERE proveedor='wompi' AND estado='activa' AND fuente_id IS NOT NULL")
linea(len(p) == 1 and p[0]["id"] == "w-en",
      "solo queda cobrable la que no se dio de baja (%d)" % len(p))

print("\n== recuperar el enlace sin delatar a nadie ==")
s, h1, _ = pedir("/membresia")
linea(s == 200 and 'action="/api/pago/baja-enlace"' in h1, "GET /membresia da el formulario de recuperación")
s, hay, _ = pedir("/api/pago/baja-enlace", {"email": "tres@ejemplo.invalid", "lang": "es"})
s2, nohay, _ = pedir("/api/pago/baja-enlace", {"email": "nadie@ejemplo.invalid", "lang": "es"})
linea(hay == nohay, "un correo registrado y uno que no dan EXACTAMENTE la misma página")
s3, malo, _ = pedir("/api/pago/baja-enlace", {"email": "ni-siquiera-es-un-correo", "lang": "es"})
linea(malo == nohay, "y un correo con forma inválida, también: no hay forma de sondear quién es miembro")
c = sql("SELECT para, resultado FROM correos WHERE etiqueta = 'membresia_enlace'")
linea(len(c) == 1 and c[0]["para"] == "tres@ejemplo.invalid",
      "solo se escribió al que sí tiene membresía (%d correo/s)" % len(c))
linea(all(x["resultado"] == "simulado" for x in c), "y también quedó simulado")

print("\n== el freno ==")
antes = len(sql("SELECT id FROM correos WHERE etiqueta = 'membresia_enlace'"))
for _ in range(8):
    pedir("/api/pago/baja-enlace", {"email": "tres@ejemplo.invalid", "lang": "es"})
despues = len(sql("SELECT id FROM correos WHERE etiqueta = 'membresia_enlace'"))
nuevos = despues - antes
linea(nuevos <= 5, "8 intentos seguidos producen como mucho 5 correos (fueron %d)" % nuevos)
s, frenado, _ = pedir("/api/pago/baja-enlace", {"email": "tres@ejemplo.invalid", "lang": "es"})
linea(frenado == nohay, "el frenado ve la MISMA pantalla: el freno tampoco delata")

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
