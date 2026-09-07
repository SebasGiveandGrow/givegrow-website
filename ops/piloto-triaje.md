# Piloto del triaje: la primera sesión con una ingeniera

Por el sistema **no ha pasado nunca un caso real**. El numerador de casos está en
2 y esas dos filas se borraron: fueron pruebas. Todo lo que sabemos de que
funciona viene de un ensayo con datos sembrados, y ese ensayo prueba la mecánica
— no prueba si alguien lo entiende.

Esta sesión existe para lo segundo. No es una demostración: es una prueba, y sale
bien si vuelve con problemas anotados.

## Antes de empezar (5 minutos, y hazlo con ella delante)

1. **Que se inscriba ella misma**, en `miramicasa.thegiveandgrowproject.org/#ingenieros`.
   No la inscribas tú: la mitad de lo que hay que aprender está en si el
   formulario se entiende sin nadie al lado.
2. **Verifica su matrícula** desde `/admin` → «Quién quiere entrar» → filtro
   **«Matrículas por verificar»**. El botón copia la matrícula y el enlace abre
   el COPNIA; el campo donde se pega se llama «Número de Matrícula».
3. **Pulsa «Avisarle que ya puede entrar»**. Le llega un correo con la dirección
   del triaje.

> ⚠️ **Que entre a Access con EL MISMO correo con el que se inscribió.** La regla
> compara el correo exacto. Si se inscribe con el del trabajo y en Access escribe
> el personal, Access la rechaza con su página genérica y sin ninguna pista de
> por qué. Es el fallo más probable de la sesión.

## La prueba (una hora)

### Tú haces de familia — desde tu teléfono, no desde el computador

Reporta **tres casas** en `#vivienda`, con fotos tomadas ahí mismo. Que sean
distintas a propósito:

| | qué probar |
|---|---|
| Casa A | con daño visible y varias fotos |
| Casa B | con **una sola foto y de cerca**, para que ella tenga que pedir más |
| Casa C | marca **«no autorizo publicar»**, para ver que no sale en el banco |

Cada una quema un consecutivo `CV-2026-…` que no se recupera. Son casos de
piloto, y está bien que existan.

Anota: cuánto tardó cada subida, si alguna foto falló, y si el teléfono te dejó
claro que no cerraras la página.

### Ella hace de ingeniera

1. Entra a `/triaje` y **toma** un caso. Comprueba que desaparece de tu vista si
   abres la cola en otra sesión.
2. Emite un concepto en la Casa A.
3. En la Casa B, marca **«no puedo evaluar»** y di qué falta. Exige nota técnica
   también aquí: es a propósito.
4. Vuelve a la pestaña **«Los que tomé»** y **suelta** uno sin evaluarlo.

### Y cierra el círculo

- Abre el enlace que te llegó como familia y mira el estado de cada casa.
- Descarga el informe en PDF de la Casa A.
- Mira el banco público (`#casas`): la Casa C **no** debe aparecer.

## Qué anotar mientras pasa

No busques fallos de programa — de esos ya barrimos. Busca lo otro:

- ¿Qué palabra tuvo que preguntarte ella?
- ¿En qué pantalla dudó, y cuántos segundos?
- ¿Qué esperaba encontrar y no estaba?
- ¿Qué hizo que no estaba previsto?
- ¿Qué le pareció innecesario?

Una frase textual suya vale más que una impresión tuya.

## Lo que ya está probado, y no hace falta volver a mirar

Con doce casos sembrados, de punta a punta: creación con fotos, la cola con dos
ingenieros a la vez —incluida la carrera por el mismo caso—, la liberación al
emitir, la paginación más allá del tope, el informe en PDF, el token de otra
familia rechazado, y el banco público filtrando por consentimiento.

Si algo de eso falla en la sesión, es un hallazgo grande: significa que el
entorno real difiere del ensayo.

## Después

Los casos del piloto son reales y se quedan. Si alguno no debe salir del banco
público, se cierra desde `/admin` — no se borra: borrar un caso deja un
consecutivo huérfano y el registro deja de cuadrar.
