// Lo que rodea a la maqueta, en coordenadas de pantalla: el fondo índigo con el halo del cielo, nubes que pasan (más
// densas con lluvia), polvo suspendido detrás, y delante discos desenfocados que se mueven más rápido que la cámara
// (paralaje), la neblina y la viñeta. Solo fusión normal, con la transparencia en el relleno: así cada fotograma sale
// igual en cualquier pestaña del render (lección del original).

import type { ReactNode } from 'react';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import { hash } from '../_mundo/azar.ts';
import type { EstadoMundo } from '../_mundo/esquemas.ts';
import { FONDOS, HALOS, mezclar, type NombreFondo } from './colores.ts';
import type { TomaIso } from './proyeccion.ts';

const mod = (a: number, b: number) => ((a % b) + b) % b;

export function Fondo({ t, estado, fondo, noche, lluvia, toma }: { t: number; estado: EstadoMundo; fondo: NombreFondo; noche: number; lluvia: number; toma: TomaIso }): ReactNode {
  const base = mezclar(FONDOS[fondo].fondo, FONDOS[fondo].fondoNoche, noche);
  const de = HALOS[estado.luz.de];
  const a = HALOS[estado.luz.a];
  const borde = mezclar(de[0], a[0], estado.luz.k);
  const centro = mezclar(de[1], a[1], estado.luz.k);
  // paralaje lento del fondo: se mueve un 6 % de lo que se mueve la cámara
  const px = -toma.fx * toma.s * 0.06;
  const py = -toma.fy * toma.s * 0.06;
  return (
    <g>
      <defs>
        <radialGradient id="iso-halo" cx="0.42" cy="0.3" r="0.72">
          <stop offset="0" stopColor={centro} stopOpacity={0.6 - 0.32 * lluvia} />
          <stop offset="0.55" stopColor={borde} stopOpacity={0.3} />
          <stop offset="1" stopColor={borde} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={ANCHO} height={ALTO} fill={base} />
      <rect x={-200 + px} y={-200 + py} width={ANCHO + 400} height={ALTO + 400} fill="url(#iso-halo)" />
      {/* polvo y estrellas lejanas */}
      {Array.from({ length: 40 }).map((_, k) => (
        <circle key={`e${k}`} cx={mod(hash(k, 1.3) * ANCHO + px * 0.5 + t * 3, ANCHO)} cy={mod(hash(k, 2.3) * ALTO * 0.6 + py * 0.5 - t * 2, ALTO * 0.6)} r={1 + hash(k, 3.3) * 1.8} fill="#FFFFFF" fillOpacity={(0.12 + 0.25 * noche) * (0.5 + 0.5 * Math.sin(t * 1.3 + k))} />
      ))}
      {/* nubes */}
      {Array.from({ length: 5 }).map((_, k) => {
        const x = mod(k * 330 + t * 16 + px * 2, 1500) - 220;
        const y = 300 + (k % 3) * 120 + (k % 2) * 60 + py * 2;
        return (
          <g key={`n${k}`}>
            <ellipse cx={x} cy={y} rx={170} ry={46} fill="#FFFFFF" fillOpacity={0.09 + 0.16 * lluvia} />
            <ellipse cx={x + 80} cy={y - 28} rx={100} ry={44} fill="#FFFFFF" fillOpacity={0.09 + 0.16 * lluvia} />
          </g>
        );
      })}
    </g>
  );
}

export function Delante({ t, noche, niebla, lluvia, toma, s0 }: { t: number; noche: number; niebla: number; lluvia: number; toma: TomaIso; s0: number }): ReactNode {
  // los discos de delante se mueven 1,6 veces lo que se mueve la cámara
  const zoom = toma.s / s0;
  const px = -toma.fx * toma.s * 0.25;
  const py = -toma.fy * toma.s * 0.25;
  const calido = mezclar('#FFB547', '#5AA9FF', noche);
  return (
    <g>
      <defs>
        <radialGradient id="iso-disco">
          <stop offset="0" stopColor={calido} stopOpacity={0.22} />
          <stop offset="0.7" stopColor={calido} stopOpacity={0.12} />
          <stop offset="1" stopColor={calido} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="iso-vineta" cx="0.5" cy="0.47" r="0.75">
          <stop offset="0.55" stopColor="#050816" stopOpacity={0} />
          <stop offset="1" stopColor="#050816" stopOpacity={0.55} />
        </radialGradient>
      </defs>
      {Array.from({ length: 6 }).map((_, k) => {
        const r = (60 + hash(k, 4.1) * 90) * (0.8 + 0.2 * zoom);
        const x = mod(hash(k, 5.1) * (ANCHO + 400) + px * 1.6 + Math.sin(t * 0.2 + k) * 40, ANCHO + 400) - 200;
        const y = mod(hash(k, 6.1) * (ALTO + 400) + py * 1.6 - t * 10, ALTO + 400) - 200;
        return <circle key={k} cx={x} cy={y} r={r} fill="url(#iso-disco)" />;
      })}
      {niebla > 0.01 && <rect x={0} y={0} width={ANCHO} height={ALTO} fill="#C9C3F0" fillOpacity={0.28 * niebla} />}
      {lluvia > 0.01 && <rect x={0} y={0} width={ANCHO} height={ALTO} fill="#0A0A2A" fillOpacity={0.22 * lluvia} />}
      <rect x={0} y={0} width={ANCHO} height={ALTO} fill="url(#iso-vineta)" />
    </g>
  );
}
