// Lluvia en pantalla: rayas oblicuas que caen a distintas velocidades, en dos capas (cerca, más largas y claras; lejos,
// finas). Función pura del segundo t; con fuerza 0 no dibuja nada.

import type { ReactNode } from 'react';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import { hash } from './azar.ts';

export function Lluvia({ t, fuerza, color = '#DDE8F5' }: { t: number; fuerza: number; color?: string }): ReactNode {
  if (fuerza < 0.02) return null;
  const gotas: ReactNode[] = [];
  const n = Math.round(150 * fuerza);
  for (let k = 0; k < n; k++) {
    const cerca = k % 3 === 0;
    const largo = cerca ? 70 : 38;
    const vel = (cerca ? 2.1 : 1.4) + hash(k, 1.2) * 0.5;
    const q = (((t * vel + hash(k, 2.4)) % 1) + 1) % 1;
    const x0 = hash(k, 3.6) * (ANCHO + 300) - 150;
    const y = -100 + q * (ALTO + 200);
    const x = x0 - q * 160;
    gotas.push(<line key={k} x1={x} y1={y} x2={x - largo * 0.16} y2={y + largo} stroke={color} strokeWidth={cerca ? 3 : 1.8} strokeOpacity={(cerca ? 0.5 : 0.32) * fuerza} strokeLinecap="round" />);
  }
  return (
    <svg width={ANCHO} height={ALTO} style={{ position: 'absolute', inset: 0 }}>
      <rect width={ANCHO} height={ALTO} fill="#1A2230" fillOpacity={0.12 * fuerza} />
      {gotas}
    </svg>
  );
}
