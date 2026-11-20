// El fondo, portado de MOTION (plantilla M3, Fondo.tsx) con las medidas del video de referencia:
//   - degradado: negro hasta el 42 % del alto y luego una subida que acelera hacia el carmesí;
//   - dos cuadrículas:
//       · «fina» en la apertura y la órbita: lado = ancho / 18,6, líneas al ~7 % y cruces «+» en una de cada dos
//         intersecciones que brillan (aparecen, giran hacia «×», cambian de tamaño);
//       · «ancha» desde el primer corte: lado = ancho / 8,6 (126 px), líneas más marcadas, sin cruces, y baja a
//         velocidad constante (0,48 lados por segundo);
//   - líneas y cruces más fuertes en el centro y que se apagan hacia los bordes (máscara radial).

import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import { aVelocidadConstante } from './curvas.ts';
import { etapasFondo } from './diseno.ts';
import { aleatorio } from './movimientos.tsx';

const REJILLA = {
  fina: { lado: 58, alfa: 0.075, alfaMayores: 0.055, grosor: 2 },
  ancha: { lado: 126, alfa: 0.24, grosor: 3, desenfoque: 1.2 },
  /** Lados por segundo que baja la cuadrícula ancha (el original: 40 px/s en 1080). */
  bajada: 0.478,
  cruz: { brazo: 5.5, grosor: 2.6, alfa: 0.48 },
} as const;

const MASCARA = 'radial-gradient(ellipse 75% 60% at 48% 47%, #000 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.06) 100%)';

function lineas(lado: number, alfa: number, grosor: number): string {
  const c = `rgba(255,255,255,${alfa})`;
  return `linear-gradient(to right, ${c} 0px, ${c} ${grosor}px, transparent ${grosor}px), linear-gradient(to bottom, ${c} 0px, ${c} ${grosor}px, transparent ${grosor}px)`;
}

export function Fondo({ fondoBajo, fotograma, fps, cambio, total }: { fondoBajo: string; fotograma: number; fps: number; cambio: number | null; total: number }): ReactNode {
  const degradado = `linear-gradient(180deg, ${etapasFondo(fondoBajo)
    .map((e) => `${e.color} ${(e.cuota * 100).toFixed(1)}%`)
    .join(', ')})`;
  const fina = cambio !== null && fotograma < cambio;
  return (
    <AbsoluteFill style={{ background: degradado }}>
      {fina ? <RejillaFina fotograma={fotograma} fps={fps} /> : <RejillaAncha fotograma={fotograma} fps={fps} desde={cambio ?? 0} total={total} />}
    </AbsoluteFill>
  );
}

function RejillaAncha({ fotograma, fps, desde, total }: { fotograma: number; fps: number; desde: number; total: number }): ReactNode {
  const { lado, alfa, grosor, desenfoque } = REJILLA.ancha;
  // 0,478 lados por segundo = 2 px por fotograma con lado 126 a 30 fps: líneas siempre nítidas.
  const pxPorFotograma = Math.round((REJILLA.bajada * lado) / fps);
  const bajado = aVelocidadConstante(fotograma, [desde, Math.max(desde + 1, total)], [0, pxPorFotograma * Math.max(1, total - desde)], 'la cuadrícula ancha baja a velocidad constante, como en el original');
  return (
    <AbsoluteFill
      style={{
        backgroundImage: lineas(lado, alfa, grosor),
        backgroundSize: `${lado}px ${lado}px`,
        backgroundPosition: `0px ${Math.round(lado / 2 + bajado)}px`,
        WebkitMaskImage: MASCARA,
        maskImage: MASCARA,
        filter: `blur(${desenfoque}px)`,
      }}
    />
  );
}

function RejillaFina({ fotograma, fps }: { fotograma: number; fps: number }): ReactNode {
  const { lado, alfa, alfaMayores, grosor } = REJILLA.fina;
  const x0 = (ANCHO / 2) % lado;
  const y0 = (ALTO / 2 + lado / 2) % lado;
  const t = fotograma / fps;
  const { brazo, grosor: g, alfa: alfaCruz } = REJILLA.cruz;
  const cruces: ReactNode[] = [];
  let i = 0;
  for (let y = y0 + lado; y < ALTO; y += lado * 2) {
    for (let x = x0 + lado; x < ANCHO; x += lado * 2) {
      i++;
      const fase = aleatorio(i * 7.3);
      const periodo = 1.3 + 1.4 * aleatorio(i * 3.1);
      const s = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / periodo + fase));
      const giro = 45 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t / (periodo * 1.7) + aleatorio(i * 5.9))));
      const escala = 0.55 + 0.6 * s;
      const opacidad = alfaCruz * (0.12 + 0.88 * s * s);
      cruces.push(
        <g key={i} transform={`translate(${x + grosor / 2} ${y + grosor / 2}) rotate(${giro.toFixed(1)}) scale(${escala.toFixed(3)})`} opacity={opacidad.toFixed(3)}>
          <rect x={-brazo} y={-g / 2} width={brazo * 2} height={g} rx={g / 2} fill="#FFFFFF" />
          <rect x={-g / 2} y={-brazo} width={g} height={brazo * 2} rx={g / 2} fill="#FFFFFF" />
        </g>,
      );
    }
  }
  return (
    <AbsoluteFill style={{ WebkitMaskImage: MASCARA, maskImage: MASCARA }}>
      <AbsoluteFill style={{ backgroundImage: lineas(lado, alfa, grosor), backgroundSize: `${lado}px ${lado}px`, backgroundPosition: `${x0}px ${y0}px` }} />
      <AbsoluteFill style={{ backgroundImage: lineas(lado * 2, alfaMayores, grosor), backgroundSize: `${lado * 2}px ${lado * 2}px`, backgroundPosition: `${x0 + lado}px ${y0 + lado}px` }} />
      <svg width={ANCHO} height={ALTO} style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }}>
        {cruces}
      </svg>
    </AbsoluteFill>
  );
}
