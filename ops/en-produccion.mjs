/* QUÉ HAY DE VERDAD EN PRODUCCIÓN.

   CLAUDE.md pedía comparar el tip de `main` con esto:

     gh run list --workflow=deploy.yml --limit 1 --json headSha

   Y eso dejó de servir el día que se añadió el job `guard`. Un run del
   workflow sale **success** aunque el job `Deploy to Cloudflare Workers` haya
   quedado en **skipped**: el guard corre, decide que solo cambió la marca de
   tiempo del inventario, y el despliegue no ocurre. El run existe, está verde,
   y su `headSha` es el tip de `main`.

   O sea que la comprobación puede decir «coinciden, todo bien» mientras lo que
   se acaba de fusionar NO está en producción. Basta con que el deploy de un PR
   falle y que luego entre uno de los commits horarios del inventario: el último
   run pasa a ser el del guard, verde y en el tip, y nadie se entera.

   Es la familia de la cicatriz del PR #130 —«apariencia de éxito y nada
   avisando»— pero esta vez dentro de la comprobación que existe para atraparla.

   Medido el 14 sep 2026: 26 runs ese día, 0 despliegues de verdad, y la receta
   vieja devolvía el mismo SHA para `main` y para el último run.

   Lo que hace este script: busca hacia atrás el último run cuyo JOB de deploy
   terminó en success —no el último run— y dice cuánto le falta a producción.
   Los commits del inventario se cuentan aparte, porque quedarse atrás en esos
   es justo lo que el guard busca.

   Uso:  node ops/en-produccion.mjs
*/

import { execSync } from "node:child_process";

const sh = (c) => execSync(c, { encoding: "utf8" }).trim();
const TOPE = 120;   // runs hacia atrás antes de rendirse

const main = sh("git rev-parse origin/main");
const runs = JSON.parse(sh(
  `gh run list --workflow=deploy.yml --limit ${TOPE} --json databaseId,headSha,createdAt`
));

let real = null;
for (const r of runs) {
  const jobs = JSON.parse(sh(`gh run view ${r.databaseId} --json jobs`)).jobs || [];
  const dep = jobs.find((j) => /Deploy to Cloudflare/i.test(j.name));
  if (dep && dep.conclusion === "success") { real = { ...r, cuando: r.createdAt.slice(0, 16) }; break; }
}

if (!real) {
  console.log(`No hay ningún deploy real en los últimos ${TOPE} runs.`);
  console.log("O el guard lleva mucho saltando (normal si solo entra inventario),");
  console.log("o hace tiempo que no sale nada a producción. Mirar a mano.");
  process.exit(1);
}

const delante = sh(`git rev-list --count ${real.headSha}..origin/main`);
const codigo = Number(sh(
  `git log --format=%s ${real.headSha}..origin/main | grep -vc Inventario || true`
) || 0);

console.log(`main                 ${main.slice(0, 7)}`);
console.log(`en producción        ${real.headSha.slice(0, 7)}   (${real.cuando})`);
console.log(`commits por delante  ${delante}   de ellos SIN contar el inventario: ${codigo}`);

if (codigo > 0) {
  console.log(`\n✘ Hay ${codigo} commit(s) de código en main que NO están en producción.`);
  console.log('   gh workflow run "Deploy Give&Grow to Cloudflare" --ref main');
  process.exit(1);
}
console.log("\n✔ Producción tiene todo el código de main. Lo que falta es solo inventario,");
console.log("  que es exactamente lo que el guard debe dejar atrás.");
