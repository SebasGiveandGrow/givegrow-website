---
name: gg-pr
description: Abrir, publicar o verificar un PR del sitio de Give&Grow (givegrow-website) — cache-bust, hidratar, gate, sitemap, dry-run del Worker, push y PR en un comando; capturas de día/noche/celular; comprobar producción tras la fusión. Usar SIEMPRE antes de commitear o publicar un cambio en este repo, en vez de repetir los pasos de CLAUDE.md a mano.
---

# gg-pr: el flujo de un PR en tres comandos

Este skill reemplaza releer `CLAUDE.md` para recordar el orden. Las razones de cada
paso siguen en `CLAUDE.md`; aquí solo está qué correr.

## 1. Trabajar en un worktree, nunca en main

```bash
git fetch origin            # SIN -q: si falla, que se vea (el 17 oct un fetch mudo
                            # hizo que en-produccion.mjs diera «al día» contra un main viejo)
git worktree add ../gg-wt-<tema> -b claude/<tema> origin/main
ln -s ../givegrow-website/node_modules ../gg-wt-<tema>/node_modules
```

## 2. Antes de publicar: mirar

```bash
node ops/verificar.mjs <ruta> --sel "#seccion"        # 375 y 1280 px, día y noche
node ops/verificar.mjs <ruta> --sel "#seccion" --en   # lo mismo en inglés
```
Escribe una línea por captura (✔/✘, desborde, errores de consola) y guarda los
JPEG en `$TMPDIR/gg-verificar` (o `--salida`). Mirar al menos la de 375 px de noche.

## 3. Publicar

```bash
node scripts/pr.mjs "Título" -m "Mensaje del commit" --claude            # página pública: lo fusiona Sebas
node scripts/pr.mjs "Título" -m "Mensaje" --claude --automerge           # solo lo interno (scripts, docs de trabajo)
node scripts/pr.mjs "Título" -m "Mensaje" --claude --seco                # todo menos push/PR, para revisar
```
Hace: rama `claude/*` → cache-bust (index.html, 404.html, `STYLES_V`) → hidratar →
gate → commit → sitemap y su commit → `wrangler --dry-run` si cambió el Worker →
push → PR. Solo imprime avisos y fallos. Cuerpo propio: `--cuerpo archivo.md`.

## 4. Después de que Sebas fusiona

```bash
git -C ../givegrow-website fetch origin && node ops/en-produccion.mjs
```
`✔` = producción tiene todo `main`. `✘` → `gh workflow run "Deploy Give&Grow to Cloudflare" --ref main`.
Luego borrar el worktree: `unlink ../gg-wt-<tema>/node_modules && git worktree remove ../gg-wt-<tema>`.

## Lo que el script NO decide

- Si va con `--automerge`: lo que cambia una página pública va SIN él.
- Migraciones D1: se aplican a mano, antes del código, desde la rama del PR.
- Textos con cifras o promesas: «evidencia, no promesas» lo revisa una persona.
