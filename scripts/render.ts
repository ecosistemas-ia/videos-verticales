// Renderiza un video. Uso: node scripts/render.ts videos/<carpeta> [--fotograma <segundo>]
//   --fotograma 12.5   solo una imagen de ese segundo (fotograma.jpg), para revisar rápido
// Salida: video.mp4 y portada.jpg en la carpeta del video. Funciona igual en Windows y en Mac.

import { resolve } from 'node:path';
import { renderizar } from './renderizar.ts';

const args = process.argv.slice(2);
const carpetaArg = args.find((a) => !a.startsWith('--') && !/^\d+(\.\d+)?$/.test(a));
if (carpetaArg === undefined) {
  console.error('Uso: node scripts/render.ts videos/<carpeta> [--fotograma <segundo>]');
  process.exit(1);
}
const iFotograma = args.indexOf('--fotograma');
const fotograma = iFotograma >= 0 ? Number(args[iFotograma + 1]) : null;

const inicio = Date.now();
let ultimo = -1;
const props = await renderizar(resolve(carpetaArg), {
  fotograma,
  progreso: (p) => {
    const d = Math.floor(p * 10);
    if (d !== ultimo) {
      ultimo = d;
      process.stdout.write(`${d * 10}% `);
    }
  },
});
console.log(`· ${props.guion.estilo}: ${props.escenas.length} escenas, ${props.duracion.toFixed(1)} s`);
console.log(fotograma !== null ? `✓ fotograma.jpg (segundo ${fotograma})` : `\n✓ video.mp4 y portada.jpg en ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
