// Lo que lee la voz en cada escena, según las reglas del estilo del guion. Lo usa la herramienta de voz.
// Uso: node scripts/textos.ts videos/<carpeta>   → JSON en una línea: ["texto de la escena 1", null, ...]

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cargarReglas } from './estilos.ts';

const carpeta = process.argv[2];
if (carpeta === undefined) {
  console.error('Uso: node scripts/textos.ts videos/<carpeta>');
  process.exit(1);
}
const guion = JSON.parse(readFileSync(join(resolve(carpeta), 'guion.json'), 'utf-8')) as { estilo: string; escenas: unknown[] };
const reglas = await cargarReglas(guion.estilo);
const textos = guion.escenas.map((bruta, i) => {
  const r = reglas.esquemaEscena.safeParse(bruta);
  if (!r.success) {
    console.error(`La escena ${i + 1} no cumple el esquema del estilo ${guion.estilo}: valida antes con node scripts/preparar.ts`);
    process.exit(1);
  }
  const texto = reglas.textoVoz(r.data).trim();
  return texto === '' ? null : texto;
});
process.stdout.write(JSON.stringify(textos));
