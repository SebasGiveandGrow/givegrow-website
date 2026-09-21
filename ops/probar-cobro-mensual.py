#!/usr/bin/env python3
"""Pruebas del cobro mensual de la membresía (Wompi + fuente de pago).

Uso:
    npx wrangler dev --port 8797 --persist-to /tmp/gg-cobro --test-scheduled
    PERSIST=/tmp/gg-cobro python3 ops/probar-cobro-mensual.py

QUÉ VIGILA. Este es el único código del proyecto que mueve dinero SOLO, sin que
nadie mire. Tenía dos fallos, y los dos eran del mismo tipo que los del aviso
del séptimo día: el sistema creía que iba bien.

  1. DOBLE COBRO. `ultimo_cobro_en` solo se escribe cuando el cobro termina
     bien. Si el fetch reventaba DESPUÉS de que Wompi creara la transacción, la
     suscripción se quedaba con la fecha vieja y al día siguiente el cron
     cobraba otra vez, con guía nueva. Dos cobros el mismo mes.

  2. UN RECHAZO POR WEBHOOK NO CONTABA. El tope de tres rechazos vivía dentro de
     la rama de fallo inmediato, y con tarjeta eso casi nunca ocurre: Wompi
     acepta con 201 y deja PENDING; el rechazo llega después. Así que `r.ok`
     era true, se contaba como cobro bueno, y el contador de rechazos no se
     consultaba nunca. Una tarjeta caída mes tras mes no suspendía nada.

EL MECANISMO DEL ARREGLO es la unicidad de `reference` en Wompi: reintentar con
la MISMA guía no puede cobrar dos veces. O Wompi nunca la recibió y el cobro
sale, o ya la tiene y responde 422, que es como nos enteramos.

Esa rama —la de la referencia duplicada— NO se prueba aquí porque depende de que
Wompi tenga esa referencia guardada, que es estado de su lado y no del nuestro.
Se comprobó a mano el 21 sep 2026 contra el sandbox, reintentando GG-2026-000001:

    cobro mensual {"revisadas":1,"creados":0,"yaEstaban":1,"fallidos":0}
    cobro ya estaba en la pasarela w-doble GG-2026-000001
    -> aportes: 1 (no se creó otro) · ultimo_cobro_en al día · estado activa

OJO: las pruebas de abajo SÍ llaman al sandbox de Wompi con la fuente de pago
falsa 999999, que Wompi rechaza con «No existe la fuente de pago». Eso es lo
buscado: lo que se mide es cuántas FILAS se crean de nuestro lado, y esas se
escriben antes de la llamada.
"""
import json, os, re, subprocess, sys, time, urllib.request

BASE = os.environ.get("BASE", "http://localhost:8797")
PERSIST = os.environ.get("PERSIST", "/tmp/gg-cobro")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = "w-cobro"

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


def uno(cmd, col):
    r = sql(cmd)
    return r[0][col] if r else None


def cron():
    urllib.request.urlopen(BASE + "/cdn-cgi/handler/scheduled").read()
    time.sleep(12)


def base():
    """Suscripción activa, con la última fecha de cobro vencida hace 40 días."""
    sql("DELETE FROM aportes; DELETE FROM suscripciones; DELETE FROM fuentes_pago; DELETE FROM donantes;")
    sql("INSERT INTO donantes (nombre,email) VALUES ('Prueba Cobro','cobro@ejemplo.invalid')")
    sql("INSERT INTO fuentes_pago (proveedor,fuente_ref,tipo,estado,email,marca,ultimos_cuatro) "
        "VALUES ('wompi','999999','CARD','AVAILABLE','cobro@ejemplo.invalid','VISA','4242')")
    d = uno("SELECT id FROM donantes LIMIT 1", "id")
    f = uno("SELECT id FROM fuentes_pago LIMIT 1", "id")
    sql("INSERT INTO suscripciones (id,proveedor,estado,nivel,monto_centavos,moneda,frecuencia,"
        "donante_id,idioma,fuente_id,token,creada_en,ultimo_cobro_en) VALUES "
        "('%s','wompi','activa','retono',5000000,'COP','mensual',%d,'es',%d,"
        "'cccccccccccccccccccccccccccccccc','2026-08-01 10:00:00',datetime('now','-40 days'))"
        % (SUB, d, f))


def aporte(guia, estado, dias, wompi=None):
    sql("INSERT INTO aportes (guia,estado,monto_centavos,moneda,modo,frecuencia,idioma,token,"
        "proveedor,suscripcion,donante_id,wompi_estado,creada_en) VALUES "
        "('%s','%s',5000000,'COP','fondo','mensual','es','t-%s','wompi','%s',"
        "(SELECT id FROM donantes LIMIT 1),%s,datetime('now','-%d days'))"
        % (guia, estado, guia, SUB, ("'" + wompi + "'") if wompi else "NULL", dias))


def filas():
    return uno("SELECT COUNT(*) n FROM aportes WHERE suscripcion='%s'" % SUB, "n")


print("== un intento SIN RESOLVER del día anterior ==")
print("   (el fetch reventó; Wompi pudo haber creado la transacción o no)")
base()
aporte("GG-2026-000900", "intencion", 1, "sin_respuesta")
cron()
linea(filas() == 1,
      "NO se crea un segundo aporte: el cobro se reintenta, no se duplica (filas=%s)" % filas())
linea(uno("SELECT COUNT(DISTINCT guia) n FROM aportes WHERE suscripcion='%s'" % SUB, "n") == 1
      and uno("SELECT guia FROM aportes WHERE suscripcion='%s' LIMIT 1" % SUB, "guia") == "GG-2026-000900",
      "el reintento reusa la MISMA guía, que es lo que hace imposible el doble cobro")

print("\n== un cobro YA APROBADO de este periodo ==")
print("   (el webhook lo aprobó, pero la suscripción se quedó sin fecha)")
base()
aporte("GG-2026-000910", "aprobada", 3)
cron()
linea(filas() == 1, "no se vuelve a cobrar algo que ya se cobró (filas=%s)" % filas())
linea(uno("SELECT ultimo_cobro_en FROM suscripciones WHERE id='%s'" % SUB, "ultimo_cobro_en") is not None
      and uno("SELECT julianday('now')-julianday(ultimo_cobro_en) d FROM suscripciones WHERE id='%s'" % SUB, "d") < 1,
      "y la suscripción se pone al día sola, para no volver a intentarlo mañana")

print("\n== una tarjeta RECHAZADA sí se reintenta ==")
base()
aporte("GG-2026-000920", "rechazada", 3)
cron()
linea(filas() == 2, "se crea un cobro nuevo, con guía nueva (filas=%s)" % filas())

print("\n== tres rechazos, vengan de donde vengan ==")
print("   (los pone el webhook, así que el código viejo nunca los contaba)")
base()
aporte("GG-2026-000801", "rechazada", 70)
aporte("GG-2026-000802", "rechazada", 40)
aporte("GG-2026-000803", "rechazada", 10)
cron()
linea(uno("SELECT estado FROM suscripciones WHERE id='%s'" % SUB, "estado") == "suspendida",
      "la suscripción queda suspendida")
linea(uno("SELECT cancelada_motivo FROM suscripciones WHERE id='%s'" % SUB, "cancelada_motivo")
      == "tres cobros rechazados",
      "y queda anotado por qué")
linea(filas() == 3, "y NO se intenta un cuarto cobro (filas=%s)" % filas())

print("\n== una suscripción cancelada no se cobra ==")
base()
sql("UPDATE suscripciones SET estado='cancelada' WHERE id='%s'" % SUB)
cron()
linea(filas() == 0, "cero intentos sobre una membresía dada de baja (filas=%s)" % filas())

print("\n== resumen ==")
print("%d ok · %d fallos" % (okc, failc))
sys.exit(1 if failc else 0)
