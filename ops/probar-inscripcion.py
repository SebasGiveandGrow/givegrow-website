import json, os, urllib.request, urllib.error
BASE = os.environ.get("BASE", "http://localhost:8802")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
H = {"content-type": "application/json", "user-agent": UA}

def post(cuerpo):
    r = urllib.request.Request(BASE + "/api/inscripcion", data=json.dumps(cuerpo).encode(), headers=H, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=20) as x: return x.status, json.loads(x.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}

def linea(t, ok, extra=""):
    print(("  ✓ " if ok else "  ✗ ") + t + (("  " + extra) if extra else "")); return ok

base = {"tipo":"voluntario","nombre":"Ana Prueba","email":"ana@example.com",
        "nivel":"estructura","oficio":"Contabilidad","autoriza_datos":True}
todo = []

st, d = post(base)
todo.append(linea("inscripción válida se guarda", st == 200 and d.get("ok") and d.get("id"), f"http={st} id={d.get('id')}"))

# Cada validación debe rechazar ANTES de escribir.
for campo, valor, err in [("nombre","", "nombre_requerido"), ("email","no-es-correo","email_invalido"),
                          ("nivel","","nivel_requerido"), ("oficio","","oficio_requerido")]:
    c = dict(base); c[campo] = valor
    st, d = post(c)
    todo.append(linea(f"{campo} inválido rechazado", st == 400 and d.get("error") == err, f"http={st} {d.get('error')}"))

c = dict(base); c.pop("autoriza_datos")
st, d = post(c)
todo.append(linea("SIN autorización de datos no se guarda", st == 400 and d.get("error") == "autorizacion_requerida",
                  f"http={st} {d.get('error')}"))

c = dict(base); c["nivel"] = "inventado"
st, d = post(c)
todo.append(linea("nivel fuera de la lista rechazado", st == 400, f"http={st} {d.get('error')}"))

# Honeypot: responde ok pero NO debe crear fila (se comprueba por el id ausente).
c = dict(base); c["web2"] = "soy-un-bot"
st, d = post(c)
todo.append(linea("honeypot: finge éxito y no guarda", st == 200 and d.get("ok") and not d.get("id"),
                  f"http={st} id={d.get('id')}"))

c = dict(base); c["tipo"] = "otra_cosa"
st, d = post(c)
todo.append(linea("tipo no soportado rechazado", st == 400, f"http={st} {d.get('error')}"))

# Los protocolos se derivan del nivel y de la cámara, de forma independiente.
for nivel, captura, cuidado, imagen in [("hub",False,True,False), ("estructura",True,False,True),
                                        ("mixto",True,True,True), ("estructura",False,False,False)]:
    c = dict(base); c["nivel"] = nivel; c["captura"] = captura; c["email"] = f"{nivel}{captura}@example.com"
    st, d = post(c)
    todo.append(linea(f"nivel={nivel} captura={captura} → se acepta", st == 200, f"http={st}"))

print()
print(f"  {sum(todo)}/{len(todo)} pruebas en verde")
