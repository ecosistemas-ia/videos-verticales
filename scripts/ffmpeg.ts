// ffmpeg sin instalar nada: el que trae Remotion, llamado por su línea de comandos (`remotion ffmpeg`) con Node.
// Así funciona igual en Windows y en Mac, sin shell y sin depender del ffmpeg del sistema. Es una versión reducida:
// tiene loudnorm, volume, scale y crop, pero no fps, tile ni ebur128 (la hoja de fotogramas se hace con Remotion).

import { spawnSync } from 'node:child_process';
import { renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { APP } from './estilos.ts';

const CLI = join(APP, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');

export function ffmpeg(args: readonly string[]): { ok: boolean; salida: string } {
  const r = spawnSync(process.execPath, [CLI, 'ffmpeg', '-hide_banner', ...args], { cwd: APP, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** Mide la sonoridad del audio (sin el video, que esta versión de ffmpeg no sabe descartar en una salida nula). */
function medir(mp4: string, objetivo: string): Record<string, string> | null {
  const r = ffmpeg(['-i', mp4, '-vn', '-af', `loudnorm=${objetivo}:print_format=json`, '-f', 'null', '-']);
  const json = r.salida.slice(r.salida.lastIndexOf('{'), r.salida.lastIndexOf('}') + 1);
  if (!r.ok || json.length < 2) return null;
  return JSON.parse(json) as Record<string, string>;
}

/** Sonoridad para redes: −14 LUFS integrados, pico real −2 dBTP, en dos pasadas (medir y aplicar en lineal). */
export function normalizarAudio(mp4: string): { antes: number; despues: number } | null {
  const objetivo = 'I=-14:TP=-2:LRA=11'; // −2 dBTP: el AAC sube un poco los picos al codificar
  const m = medir(mp4, objetivo);
  if (m === null) return null;
  if (!Number.isFinite(Number(m.input_i)) || Number(m.input_i) < -70) return null; // video sin sonido
  const filtro =
    `loudnorm=${objetivo}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const temporal = mp4.replace(/\.mp4$/, '.normalizando.mp4');
  const r = ffmpeg(['-y', '-i', mp4, '-c:v', 'copy', '-af', filtro, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', temporal]);
  if (!r.ok) {
    rmSync(temporal, { force: true });
    return null;
  }
  renameSync(temporal, mp4);
  const comprobada = medir(mp4, objetivo);
  return { antes: Number(m.input_i), despues: comprobada === null ? NaN : Number(comprobada.input_i) };
}
