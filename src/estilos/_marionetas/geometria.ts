// Matrices afines 2D para encadenar pivotes (cinemática directa): hombro → codo → mano. Con ellas se dibuja cada pieza
// en su sitio y se sabe dónde está una mano en la pantalla (para las varillas o para colgarle un objeto). Sin JSX.

import { rad } from './curvas.ts';

/** [a, b, c, d, e, f] como en SVG: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matriz = readonly [number, number, number, number, number, number];

export const IDENTIDAD: Matriz = [1, 0, 0, 1, 0, 0];

export function por(m: Matriz, n: Matriz): Matriz {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function mover(x: number, y: number): Matriz {
  return [1, 0, 0, 1, x, y];
}

/** Giro en grados; positivo = sentido de las agujas del reloj en pantalla (y hacia abajo). */
export function girar(grados: number): Matriz {
  const c = Math.cos(rad(grados));
  const s = Math.sin(rad(grados));
  return [c, s, -s, c, 0, 0];
}

export function escalar(sx: number, sy = sx): Matriz {
  return [sx, 0, 0, sy, 0, 0];
}

/** Encadena transformaciones de izquierda a derecha, como en el atributo transform de SVG. */
export function cadena(...ms: Matriz[]): Matriz {
  return ms.reduce((acc, m) => por(acc, m), IDENTIDAD);
}

export function aplicar(m: Matriz, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

export function aSvg(m: Matriz): string {
  return `matrix(${m.map((v) => Math.round(v * 10000) / 10000).join(' ')})`;
}
