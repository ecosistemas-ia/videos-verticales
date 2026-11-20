// La hoja de fotogramas: 12 momentos de un video en una sola imagen, para revisarlo de un vistazo. Se hace con
// Remotion (OffthreadVideo) porque el ffmpeg incluido no trae los filtros fps ni tile.

import type { ReactNode } from 'react';
import { AbsoluteFill, Composition, OffthreadVideo, staticFile } from 'remotion';

export interface PropsHoja extends Record<string, unknown> {
  readonly video: string;
  readonly fotogramas: readonly number[];
  readonly marcas: readonly string[];
}

export const ANCHO_MINI = 270;
export const ALTO_MINI = 480;

function Hoja({ video, fotogramas, marcas }: PropsHoja): ReactNode {
  return (
    <AbsoluteFill style={{ backgroundColor: '#111', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
      {fotogramas.map((f, i) => (
        <div key={i} style={{ position: 'relative', width: ANCHO_MINI, height: ALTO_MINI }}>
          <OffthreadVideo src={staticFile(video)} trimBefore={f} muted style={{ width: ANCHO_MINI, height: ALTO_MINI }} />
          <div style={{ position: 'absolute', left: 6, top: 6, padding: '2px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', font: '600 16px sans-serif' }}>
            {marcas[i]}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

export function RaizHoja(): ReactNode {
  return (
    <Composition
      id="hoja"
      component={Hoja}
      width={ANCHO_MINI * 6}
      height={ALTO_MINI * 2}
      fps={30}
      durationInFrames={1}
      defaultProps={{ video: 'video.mp4', fotogramas: [], marcas: [] } as PropsHoja}
    />
  );
}
