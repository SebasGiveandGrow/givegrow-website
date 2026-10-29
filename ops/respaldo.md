# Respaldo cifrado de la base y las fotos

Todo lo privado de Give&Grow vive en una sola cuenta de Cloudflare: donantes,
aportes, casos de Mira Mi Casa y niños de Regalos en la base D1, y fotos y actas
en R2. Si se pierde esa cuenta, se pierde todo. `ops/respaldo.mjs` saca una copia
cifrada fuera de Cloudflare, a la Mac o al disco que elijas.

**Cómo protege los datos.** Hay dos llaves:

- La **pública** queda en la Mac y solo sirve para cifrar.
- La **privada**, protegida con su contraseña, vive fuera de la Mac y es la única
  que abre los respaldos.

Si alguien se lleva la Mac, se lleva archivos que no puede abrir.

Probado el 28 oct 2026 con datos de prueba: respaldar → restaurar → las 16 tablas
cuadran fila por fila. Una contraseña equivocada o un archivo alterado se rechazan.
La parte de R2 no se ha probado todavía: falta el token del paso 2.

## Una sola vez

### 1. Las llaves (lo haces tú, porque la contraseña es tuya)

Conecta la memoria USB donde va a vivir la llave privada y corre:

```bash
cd ~/Documents/GitHub/givegrow-website
node ops/respaldo.mjs llaves --privada /Volumes/TU-USB/gg-respaldo-privada.pem
```

Te pide una contraseña de al menos 12 caracteres.

- Guárdala en tu gestor de contraseñas, **no** en la misma USB.
- Si pierdes la llave privada o la contraseña, ningún respaldo se puede abrir.
- Haz una segunda copia de la llave privada en otro sitio, por ejemplo la caja
  fuerte de la oficina.

### 2. El token de R2, de solo lectura (Cloudflare, clic por clic)

Sin esto se respalda la base, pero no las fotos.

1. Entra a https://dash.cloudflare.com y elige la cuenta de Give&Grow.
2. En el menú izquierdo: **R2 Object Storage**.
3. A la derecha: **Manage R2 API Tokens** (o «API» → «Manage API tokens»).
4. **Create API token**.
5. **Token name:** `respaldo-mac-solo-lectura`.
6. **Permissions:** **Object Read only**.
7. **Specify bucket(s):** «Apply to specific buckets only» → `givegrow-media`.
8. **TTL:** Forever (o un año, y te pongo el recordatorio).
9. **Create API Token**.
10. Cloudflare muestra tres cosas **una sola vez**: *Access Key ID*, *Secret
    Access Key* y, arriba, el *Account ID* (o la URL
    `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`). No me los pegues en el
    chat: van directo al archivo del paso 3.

### 3. El archivo de configuración (no va al repo)

```bash
mkdir -p ~/.config/givegrow && chmod 700 ~/.config/givegrow
nano ~/.config/givegrow/respaldo.env
```

Con estas líneas, cada una con su valor:

```
GG_RESPALDO_DESTINO=/Users/sebasnavarro03/Respaldos/GiveGrow
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

Guarda el archivo y ciérralo para que solo tú lo leas:

```bash
chmod 600 ~/.config/givegrow/respaldo.env
```

Si quieres la copia en un disco externo o en una carpeta sincronizada (Google
Drive para escritorio), pon esa ruta en `GG_RESPALDO_DESTINO`. Los archivos van
cifrados, así que una carpeta en la nube sirve.

### 4. El primer respaldo y la prueba de que sirve

```bash
node ops/respaldo.mjs respaldar
node ops/respaldo.mjs restaurar ~/Respaldos/GiveGrow/<carpeta-de-hoy> --privada /Volumes/TU-USB/gg-respaldo-privada.pem
```

`restaurar` descifra la copia en una carpeta temporal, la carga en una base
**local** y comprueba que cada tabla tenga las mismas filas. Nunca toca
producción. Al terminar dice qué carpeta borrar, porque ahí quedan datos
personales descifrados.

## Cada semana, sola

Esto deja la Mac corriendo el respaldo los lunes a las 9:00. Si la Mac estaba
apagada, corre al encenderla. Si falla, sale una notificación de macOS que dice
«Respaldo Give&Grow falló».

```bash
cat > ~/Library/LaunchAgents/org.givegrow.respaldo.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>org.givegrow.respaldo</string>
  <key>ProgramArguments</key><array>
    <string>/opt/homebrew/bin/node</string>
    <string>/Users/sebasnavarro03/Documents/GitHub/givegrow-website/ops/respaldo.mjs</string>
    <string>respaldar</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/sebasnavarro03/Documents/GitHub/givegrow-website</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>/Users/sebasnavarro03/Respaldos/GiveGrow/respaldo.log</string>
  <key>StandardErrorPath</key><string>/Users/sebasnavarro03/Respaldos/GiveGrow/respaldo.log</string>
</dict></plist>
EOF
launchctl load ~/Library/LaunchAgents/org.givegrow.respaldo.plist
```

Para probarlo sin esperar al lunes:

```bash
launchctl start org.givegrow.respaldo
```

## Qué queda en la carpeta

| Archivo | Qué es |
|---|---|
| `AAAA-MM-DD_HHMM/d1.sql.gge` | La base **completa** de ese día, cifrada. |
| `AAAA-MM-DD_HHMM/r2-nuevos.tar.gge` | Solo las fotos y los documentos **nuevos** desde el respaldo anterior, cifrados. Para tener todo R2 se restauran todas las carpetas. |
| `AAAA-MM-DD_HHMM/resumen.json` | Cuántas filas tenía cada tabla y cuántos archivos de R2 se copiaron. Sin datos personales. |
| `r2-vistos.txt` | Huellas (SHA-256) de lo que ya se copió. Dice «esto ya está», no qué es. |
| `ultimo-ok.txt` | Cuándo salió bien la última vez. |

Las bases viejas no se borran solas. Cada una es pequeña (unos 75 KB cifrada en
oct 2026). Cuando haga falta, se borran las de hace más de un año, pero **nunca**
una carpeta con `r2-nuevos.tar.gge`: esas no se repiten.

## Lo que NO cubre

- **Si la Mac no está encendida varias semanas,** no hay respaldo y nadie avisa:
  la notificación solo sale cuando el respaldo corre y falla. Mira
  `ultimo-ok.txt` de vez en cuando.
- **Los secretos del Worker** (llaves de Wompi, Resend, etc.) no están en D1 y
  este respaldo no los copia. Se recuperan desde cada proveedor; quién entra a
  cada uno está en la hoja de acceso de emergencia (ítem 18 de la lista).
- **El código** ya tiene su copia en GitHub.
