// Hoja de fotogramas para revisar un video de un vistazo: 12 momentos en una imagen (hoja.jpg), con el segundo de cada
// uno. Uso: node scripts/hoja.ts videos/<carpeta>

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { APP } from './estilos.ts';
import { ffmpeg } from './ffmpeg.ts';

export async function hacerHoja(carpeta: string): Promise<string> {
  const video = join(carpeta, 'video.mp4');
  const dur = ffmpeg(['-i', video]).salida.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const segundos = dur === null ? 30 : Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
  const momentos = Array.from({ length: 12 }, (_, i) => ((i + 0.5) * segundos) / 12);
  const entradas = join(APP, 'src', 'entradas');
  mkdirSync(entradas, { recursive: true });
  const entrada = join(entradas, 'hoja.ts');
  writeFileSync(entrada, "// Generado por scripts/hoja.ts.\nimport { registerRoot } from 'remotion';\nimport { RaizHoja } from '../comun/Hoja.tsx';\nregisterRoot(RaizHoja);\n", 'utf-8');
  const serveUrl = await bundle({ entryPoint: entrada, publicDir: carpeta, enableCaching: false });
  const inputProps = { video: 'video.mp4', fotogramas: momentos.map((s) => Math.round(s * 30)), marcas: momentos.map((s) => `${s.toFixed(1)} s`) };
  const composition = await selectComposition({ serveUrl, id: 'hoja', inputProps });
  const salida = join(carpeta, 'hoja.jpg');
  // Doce fotogramas de un video largo pueden tardar con la máquina ocupada: margen de tres minutos.
  await renderStill({ composition, serveUrl, inputProps, frame: 0, output: salida, imageFormat: 'jpeg', jpegQuality: 85, timeoutInMilliseconds: 180_000 });
  return salida;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]).endsWith(join('scripts', 'hoja.ts'))) {
  const carpeta = process.argv[2];
  if (carpeta === undefined || !existsSync(join(resolve(carpeta), 'video.mp4'))) {
    console.error('Uso: node scripts/hoja.ts videos/<carpeta>   (hace falta video.mp4)');
    process.exit(1);
  }
  await hacerHoja(resolve(carpeta));
  console.log('✓ hoja.jpg (12 momentos del video)');
}
