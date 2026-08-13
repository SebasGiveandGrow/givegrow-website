# Piezas de campaña — fuente para importar a Canva

Esta carpeta NO es parte del sitio. Vive en una rama (`pieza/…`), **nunca en
`main`**, por dos razones: `main` despliega a producción y esto no es una página
del sitio, y el importador de Canva necesita una URL pública HTTPS — la del
`raw` de GitHub sobre esta rama.

`carrusel-brigada.html` lleva las tipografías de marca incrustadas como data URI
y cada lámina anotada con `data-document-role="page"`, que es lo que le dice a
Canva que eso es una página del diseño.
