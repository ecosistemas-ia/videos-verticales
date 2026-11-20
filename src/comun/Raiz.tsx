// La raíz de Remotion para UN estilo: una composición 9:16 a 30 fps con id = el del estilo. scripts/render.ts genera
// una entrada por estilo (src/entradas/<id>.ts) que llama a crearRaiz; así un estilo a medio hacer no rompe a los
// demás. La duración sale de props.duracion (scripts/preparar.ts).

import type { ComponentType, ReactNode } from 'react';
import { Composition } from 'remotion';
import { ALTO, ANCHO, FPS, type PropsVideo } from './guion.ts';
import type { ReglasEstilo } from './reglas.ts';
import { conLoComun } from './Video.tsx';

const VACIO: PropsVideo = {
  guion: {
    estilo: '',
    titulo: '',
    subtitulos: 'ninguno',
    musica: null,
    volumen_musica: 0.16,
    efectos: false,
    marca: { nombre: '', acento: '#C8F031' },
    ajustes: {},
    escenas: [{}],
    fuentes: [],
  },
  ajustes: {},
  escenas: [],
  duracion: 1,
  musica: null,
  efectos: {},
};

export function crearRaiz(estilos: ReadonlyArray<{ reglas: ReglasEstilo; Estilo: ComponentType<PropsVideo> }>): () => ReactNode {
  return function Raiz(): ReactNode {
    return (
      <>
        {estilos.map(({ reglas, Estilo }) => (
          <Composition
            key={reglas.id}
            id={reglas.id}
            component={conLoComun(Estilo, reglas)}
            width={ANCHO}
            height={ALTO}
            fps={FPS}
            durationInFrames={FPS}
            defaultProps={{ ...VACIO, ajustes: (reglas.esquemaAjustes.safeParse({}).data ?? {}) as Record<string, unknown> }}
            calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.ceil(props.duracion * FPS)) })}
          />
        ))}
      </>
    );
  };
}
