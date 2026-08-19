# Guía fotográfica del triaje — borrador para que un ingeniero lo corrija

Lo que hoy le pedimos a una familia, lo que hoy puede responder un ingeniero, y
las decisiones que solo un profesional puede cerrar.

**Este documento está escrito para ser CORREGIDO, no aprobado.** Todo lo que
dice es provisional y salió de programar, no de peritar. Reaccionar a algo
concreto es mucho más rápido que inventar desde cero — por eso va con
respuestas puestas aunque sean malas.

**Qué desbloquea:** las categorías viven en un solo sitio (`CV_CATS` en `app.js`,
`CATEGORIAS_MEDIO` en `worker.js`) y las clasificaciones en otro
(`CLASIFICACIONES`). Cambiarlas es barato. Lo que no es barato es cambiarlas
después de que quinientas familias hayan subido fotos con las viejas.

---

## 1. Lo que hoy se le pide a la familia

Cuatro categorías, cada una con su ayuda tal como aparece en pantalla:

| Categoría | Lo que dice la pantalla |
|---|---|
| **La casa completa** | «De lejos, que se vea entera.» |
| **Esquinas y columnas** | «De arriba abajo.» |
| **Cada grieta** | «Dos fotos: una de lejos y otra de cerca, con una moneda al lado para el tamaño.» |
| **El terreno alrededor** | «Si hay grietas en el suelo o un talud cerca.» |

Y antes de todo eso, una pantalla de seguridad: no entrar si hay muros caídos,
techos hundidos o columnas partidas; no subirse al techo; no mover escombros;
salir si huele a gas; esperar si hay réplicas.

### Preguntas
1. **¿Sobra o falta alguna categoría?** ¿Hay una foto que casi siempre necesitas
   y que hoy no se pide?
2. **¿Cuál es el MÍNIMO** por debajo del cual un caso no es evaluable y no vale
   la pena ni abrirlo?
3. **La moneda como referencia de escala: ¿sirve?** ¿O hay que pedir
   explícitamente el ANCHO de la grieta, y en qué unidad?
4. **¿El video sirve para algo?** Hoy se acepta hasta 60 MB. Si no lo usas, lo
   quitamos: cuesta batería, datos y tiempo a una familia con mala señal.

---

## 2. Lo que hoy se le pregunta a la familia

Material de los muros (ladrillo · adobe · bahareque · prefabricado · madera · no
sé), número de pisos, año aproximado, si tenía grietas **antes** del sismo, si
está habitada ahora, si hubo heridos, si le entra agua cuando llueve, y un campo
libre.

### Preguntas
5. **¿Qué falta que cambie tu lectura?** Candidatos que se descartaron por no
   saber si importan: si la casa está en ladera, si hubo relleno, si es
   esquinera, si le agregaron un piso después de construida, cuántas familias
   viven adentro.
6. ¿Alguna de las que ya están **no sirve** y solo alarga el formulario?

---

## 3. Las clasificaciones — hoy son cuatro y son provisionales

    urgente       · visita urgente
    programada    · entra en la ruta de los próximos días
    no_requiere   · no requiere visita por ahora
    inevaluable   · con este material no se puede evaluar (obliga a decir qué falta)

### Preguntas
7. **¿Son las cuatro correctas?**
8. **¿Falta un nivel por encima de `urgente`?** Hoy el sistema puede decir
   «visítenla ya» pero no «no entren». Lo más cerca es el campo de
   recomendación, que es texto libre. Si hace falta un nivel de peligro
   inminente, hay que diseñarlo con cuidado: se acerca peligrosamente al
   dictamen que este proyecto NO da.
9. **¿Qué NO estás dispuesta a firmar a distancia?** Esta es la pregunta que
   define el producto entero. La respuesta se convierte en texto de pantalla.

---

## 4. Dos reglas que ya se programaron y conviene que las revise

**Cuando dos ingenieros discrepan, gana la clasificación MÁS GRAVE** — no la más
reciente. El razonamiento fue: visitar una casa que no hacía falta es un viaje
perdido; no visitar una que sí, es lo que el proyecto existe para evitar.

10. ¿Está de acuerdo, o escalar sin una tercera opinión genera urgencia falsa y
    quema el tiempo de la brigada?

**Un caso `urgente` con una sola opinión entra a una cola que pide confirmación.**

11. ¿Dos opiniones bastan para mover una brigada, o para un `urgente` deberían
    ser siempre dos desde el principio?

---

## 5. Lo que se le puede pedir a ella, aparte de responder

- **Que se postule y quede aprobada** en `#ingenieros`, y que evalúe el caso
  real que hay en producción. Media hora con la pantalla vale más que este
  documento entero.
- **Que diga cuántos colegas cree que se pueden sumar y por dónde** —
  universidad, COPNIA, sociedad de ingenieros, gremio.
- **Que revise el texto de alcance** de `#ingenieros`: si a ella le suena
  defensivo o poco serio, a sus colegas también.

---

## 6. Dónde aterrizan las respuestas

| Respuesta | Qué se toca |
|---|---|
| Categorías de foto | `CV_CATS` en `app.js` y `CATEGORIAS_MEDIO` en `worker.js`, más sus textos i18n ES/EN |
| Mínimo evaluable | Texto de la pantalla de fotos; posible aviso antes de enviar |
| Preguntas de la casa | Formulario `#vivienda`, esquema `casos` (**esto sí sería migración**) |
| Clasificaciones | `CLASIFICACIONES` y `TRIAJE_ET` en `worker.js`, PDF del informe, correos |
| Regla de discrepancia | `resolverClasificacion` en `worker.js` |

Solo una de las cinco filas exige migración. Las demás son texto y constantes.
