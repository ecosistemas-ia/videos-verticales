// La función de render, para scripts/render.ts (un video) y scripts/galeria.ts (las muestras de la galería).
// Empaqueta solo el estilo del guion, con la carpeta del video como carpeta pública, y renderiza con Chrome sin
// ventana, que Remotion descarga la primera vez. Funciona igual en Windows y en Mac.

import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import type { PropsVideo } from '../src/comun/guion.ts';
import { escribirEntrada } from './estilos.ts';
import { normalizarAudio } from './ffmpeg.ts';
import { preparar } from './preparar.ts';

export interface OpcionesRender {
  /** Solo una imagen de ese segundo (fotograma.jpg). */
  readonly fotograma?: number | null;
  /** 1 = 1080 × 1920; 0.5 = 540 × 960 (muestras). */
  readonly escala?: number;
  /** Nombre del video de salida dentro de la carpeta. */
  readonly salida?: string;
  /** Calidad h264 (más alto = más ligero). */
  readonly crf?: number;
  readonly progreso?: (fraccion: number) => void;
}

export async function renderizar(carpeta: string, opciones: OpcionesRender = {}): Promise<PropsVideo> {
  const props = await preparar(carpeta);
  await ensureBrowser();
  const entrada = escribirEntrada(props.guion.estilo, [props.guion.estilo]);
  // Sin caché de webpack: varios renders a la vez (de estilos distintos) no se pisan la caché compartida.
  const serveUrl = await bundle({ entryPoint: entrada, publicDir: carpeta, enableCaching: false });
  const composition = await selectComposition({ serveUrl, id: props.guion.estilo, inputProps: props });
  const escala = opciones.escala ?? 1;
  const comunes = { composition, serveUrl, inputProps: props, scale: escala, chromiumOptions: { gl: 'angle' as const } };

  if (opciones.fotograma !== undefined && opciones.fotograma !== null) {
    const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(opciones.fotograma * composition.fps)));
    await renderStill({ ...comunes, frame, output: join(carpeta, 'fotograma.jpg'), imageFormat: 'jpeg', jpegQuality: 90 });
    return props;
  }

  await renderMedia({
    ...comunes,
    codec: 'h264',
    outputLocation: join(carpeta, opciones.salida ?? 'video.mp4'),
    imageFormat: 'jpeg',
    jpegQuality: 92,
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    audioBitrate: '192k',
    crf: opciones.crf,
    onProgress: ({ progress }) => opciones.progreso?.(progress),
  });
  // Sonoridad para redes (−14 LUFS): la voz, la música y los efectos llegan con niveles distintos según el video.
  normalizarAudio(join(carpeta, opciones.salida ?? 'video.mp4'));
  // La portada: un momento con todo en pantalla (el 40 % del video).
  await renderStill({ ...comunes, frame: Math.floor(composition.durationInFrames * 0.4), output: join(carpeta, 'portada.jpg'), imageFormat: 'jpeg', jpegQuality: 88 });
  return props;
}
