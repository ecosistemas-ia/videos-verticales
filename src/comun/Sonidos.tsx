// El sonido de un video: la voz de cada escena en su segundo, la música de fondo que baja cuando alguien habla y los
// efectos puntuales del estilo. Las subidas y bajadas de la música van en coseno, nunca lineales.

import type { ReactNode } from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import type { Golpe, PropsVideo } from './guion.ts';

/** Cuánto baja la música bajo la voz (multiplicador) y cuánto tarda la rampa, en segundos. */
const BAJO_LA_VOZ = 0.4;
const RAMPA_S = 0.25;
const ENTRADA_S = 0.6;
const SALIDA_S = 1.2;

function coseno(x: number): number {
  const q = Math.min(1, Math.max(0, x));
  return 0.5 - 0.5 * Math.cos(Math.PI * q);
}

/** Los tramos con voz, en segundos. */
function tramosDeVoz(props: PropsVideo): Array<[number, number]> {
  return props.escenas
    .filter((e) => e.voz !== null)
    .map((e) => {
      const inicio = e.inicio + (e.voz?.desfase ?? 0);
      return [inicio, inicio + (e.voz?.duracion ?? 0)];
    });
}

/** Volumen de la música en el segundo t (0..1 sobre el volumen del guion). */
export function nivelMusica(t: number, tramos: ReadonlyArray<[number, number]>, total: number): number {
  let bajada = 0;
  for (const [a, b] of tramos) {
    if (t >= a - RAMPA_S && t <= b + RAMPA_S) {
      const entrada = coseno((t - (a - RAMPA_S)) / RAMPA_S);
      const salida = coseno((b + RAMPA_S - t) / RAMPA_S);
      bajada = Math.max(bajada, Math.min(entrada, salida));
    }
  }
  const borde = Math.min(coseno(t / ENTRADA_S), coseno((total - t) / SALIDA_S));
  return borde * (1 - bajada * (1 - BAJO_LA_VOZ));
}

export function Sonidos({ props, golpes }: { props: PropsVideo; golpes: readonly Golpe[] }): ReactNode {
  const { fps } = useVideoConfig();
  const tramos = tramosDeVoz(props);
  const volumen = props.guion.volumen_musica;
  return (
    <>
      {props.musica !== null && (
        <Audio
          src={staticFile(props.musica)}
          loop
          volume={(f) => volumen * nivelMusica(f / fps, tramos, props.duracion)}
        />
      )}
      {props.escenas.map((e) =>
        e.voz === null ? null : (
          <Sequence key={`voz-${e.indice}`} from={Math.round((e.inicio + e.voz.desfase) * fps)} layout="none">
            <Audio src={staticFile(e.voz.archivo)} />
          </Sequence>
        ),
      )}
      {golpes.map((g, i) => {
        const archivo = props.efectos[g.efecto];
        if (archivo === undefined) return null;
        return (
          <Sequence key={`efecto-${i}`} from={Math.max(0, Math.round(g.segundo * fps))} durationInFrames={Math.max(1, Math.round((g.duracion ?? 3) * fps))} layout="none">
            <Audio src={staticFile(archivo)} volume={g.volumen ?? 0.5} />
          </Sequence>
        );
      })}
    </>
  );
}
