/* LAS PREGUNTAS QUE DESVÍAN A ALMA, para medir el prompt después de tocarlo.

   ALMA responde en el idioma del usuario con un prompt escrito en español, y
   en inglés es donde más se le escapan las reglas. Medido el 17 oct 2026 contra
   producción: emojis al cerrar, el recibo «automatically» al reportar una
   transferencia y el 25% «of your income tax». Estas nueve preguntas —seis en
   inglés, tres en español— son las que lo sacaron a la luz.

   Uso:
     node ops/alma-preguntas.mjs                          # contra producción
     node ops/alma-preguntas.mjs http://localhost:8787    # contra wrangler dev

   Contra wrangler dev hace falta ANTHROPIC_API_KEY en .dev.vars; sin ella el
   endpoint responde 503 alma_no_configurada y no hay nada que medir.

   UNA PREGUNTA CADA 7 SEGUNDOS, a propósito: /api/alma deja 10 por minuto por
   IP, y pasarse devuelve 429 en vez de respuestas.

   Las marcas ✘ son una ayuda para encontrar lo obvio (un emoji, «25% of your
   tax», el recibo «automatic»), no un veredicto: la respuesta se lee entera.
   Las negaciones («no el 25% del impuesto») no se marcan: son la regla bien
   dicha. */

const base = (process.argv[2] || "https://thegiveandgrowproject.org").replace(/\/$/, "");

const PREGUNTAS = [
  "Hi! What is Give&Grow?",
  "Is the donation certificate automatic?",
  "Does my gift reduce my taxes?",
  "When do I get my receipt after a bank transfer?",
  "How can I donate from the United States?",
  "I want to help after the earthquake. What can I do?",
  "Hola, ¿qué es Give&Grow?",
  "¿El certificado de donación es automático?",
  "¿Mi donación me descuenta impuestos?"
];

const SOSPECHAS = [
  [/\p{Extended_Pictographic}/u, "emoji"],
  [/receipt[^.]{0,60}\b(automatic|instant|right away|immediately)/i, "recibo inmediato"],
  [/recibo[^.]{0,60}\b(autom[aá]tic|inmediat|al instante|en el acto)/i, "recibo inmediato"],
  [/(?<!\bnot\s)25\s?%\s+(discount\s+)?(off|on|of)\s+(your\s+)?(income\s+)?tax/i, "25% del impuesto"],
  [/taxable income/i, "renta gravable"],
  [/(?<!\bno\s(el\s)?)25\s?%\s+del\s+impuesto/i, "25% del impuesto"]
];

for (const [i, q] of PREGUNTAS.entries()) {
  if (i) await new Promise(r => setTimeout(r, 7000));
  let texto;
  try {
    const r = await fetch(base + "/api/alma", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: q }] })
    });
    const j = await r.json();
    texto = Array.isArray(j.content)
      ? j.content.map(c => c.text || "").join("")
      : "[" + r.status + "] " + JSON.stringify(j);
  } catch (e) {
    texto = "[fallo] " + e.message;
  }
  const marcas = SOSPECHAS.filter(([re]) => re.test(texto)).map(([, nombre]) => nombre);
  console.log("### " + q + "  " + (marcas.length ? "✘ " + [...new Set(marcas)].join(", ") : "✔"));
  console.log(texto + "\n");
}
