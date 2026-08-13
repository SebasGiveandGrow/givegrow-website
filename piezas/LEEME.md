# Piezas de campaña — fuente para importar a Canva

Esta carpeta NO es parte del sitio. Vive en una rama (`pieza/…`), **nunca en
`main`**, por dos razones: `main` despliega a producción y esto no es una página
del sitio, y el importador de Canva necesita una URL pública HTTPS — la del
`raw` de GitHub sobre esta rama.

`carrusel-brigada.html` lleva las tipografías de marca incrustadas como data URI
y cada lámina anotada con `data-document-role="page"`, que es lo que le dice a
Canva que eso es una página del diseño.

## Tipografía para Canva

`Unbounded-Bold.woff` y `Unbounded-Regular.woff` son instancias ESTÁTICAS de la
variable de marca (`vendor/fonts/unbounded-latin.woff2`), sacadas con fontTools.

Dos razones de por qué están aquí y en este formato:
- **Canva no acepta `.woff2`**, solo `.otf` o `.woff`. El repo solo tiene woff2.
- Subir la **variable** haría que Canva la usara en su peso por defecto (400),
  y el carrusel usa **700**. De ahí la instancia Bold.

Unbounded es OFL, así que redistribuirla en este repo es legítimo.

### Cómo aplicarla al diseño importado
1. Inicio → **Brand Hub** → pestaña **Brand Kit**.
2. En **Brand fonts** → **Upload a font** → subir `Unbounded-Bold.woff`.
3. Abrir el diseño, seleccionar el fondo, barra inferior → **Styles**, y aplicar
   el estilo de texto del Brand Kit. Eso actualiza el texto de todas las páginas.
