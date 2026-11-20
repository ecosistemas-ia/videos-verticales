// Curvas y colores del estilo, portados de MOTION (src/comune/curve.ts, plantilla M3). Regla del original: nada de
// movimiento lineal sin motivo; cada animación pasa por una curva. La velocidad constante existe solo con su nombre
// (aVelocidadConstante) y su motivo escrito. Los colores se mezclan en OKLab, no en RGB.
// Sin JSX: lo puede cargar Node.

import { Easing, interpolate, spring } from 'remotion';
import type { EasingFunction } from 'remotion';

export const CURVAS = {
  /** Movimientos grandes: arranca y frena suave. */
  suave: Easing.bezier(0.65, 0, 0.35, 1),
  /** El respiro lento de una figura. */
  respiro: Easing.bezier(0.37, 0, 0.63, 1),
  /** Entra rápido y frena: tarjetas, títulos, etiquetas. */
  frena: Easing.bezier(0.16, 1, 0.3, 1),
  /** Acelera hasta el final: una salida hacia abajo. */
  acelera: Easing.bezier(0.7, 0, 0.84, 0),
  /** Sale acelerando: algo que se va. */
  salida: Easing.bezier(0.32, 0, 0.67, 0),
  /** Se posa frenando (cuadrática): la figura que llega grande y desenfocada. */
  posa: Easing.out(Easing.quad),
} as const;

/** Un valor de `valores[0]` a `valores[1]` entre los fotogramas del tramo, con la curva dada; fuera, quieto. */
export function animar(fotograma: number, tramo: readonly [number, number], valores: readonly [number, number], curva: EasingFunction): number {
  if (tramo[1] <= tramo[0]) return fotograma < tramo[0] ? valores[0] : valores[1];
  return interpolate(fotograma, [tramo[0], tramo[1]], [valores[0], valores[1]], {
    easing: curva,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Velocidad constante, solo donde la técnica la pide: el motivo es obligatorio y queda en el código. */
export function aVelocidadConstante(fotograma: number, tramo: readonly [number, number], valores: readonly [number, number], motivo: string): number {
  if (motivo.trim().length < 8) throw new Error('aVelocidadConstante: escribe el motivo');
  return animar(fotograma, tramo, valores, Easing.linear);
}

/** Un resorte de 0 a 1 (con un pequeño rebote si la amortiguación es baja) que arranca en el fotograma `desde`. */
export function resorte(fotograma: number, fps: number, desde: number, opciones: { readonly amortiguacion?: number; readonly rigidez?: number } = {}): number {
  return spring({ frame: fotograma - desde, fps, config: { damping: opciones.amortiguacion ?? 16, stiffness: opciones.rigidez ?? 140, mass: 1 } });
}

// ---------------------------------------------------------------------------------------------------------------------
// Colores mezclados en OKLab.

function lineal(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function gamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function deHex(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (m === null) throw new Error(`color no válido «${color}»: hace falta #RRGGBB`);
  return [m[1], m[2], m[3]].map((h) => lineal(Number.parseInt(h, 16) / 255)) as [number, number, number];
}
function aOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function deOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** El color entre `a` (cuota 0) y `b` (cuota 1), mezclado en OKLab; sale como #RRGGBB. */
export function mezclarColores(a: string, b: string, cuota: number): string {
  const ca = aOklab(deHex(a));
  const cb = aOklab(deHex(b));
  const q = Math.min(1, Math.max(0, cuota));
  const mezcla = deOklab([ca[0] + (cb[0] - ca[0]) * q, ca[1] + (cb[1] - ca[1]) * q, ca[2] + (cb[2] - ca[2]) * q]);
  return (
    '#' +
    mezcla
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, gamma(c))) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

/** #RRGGBB → «r,g,b» para rgba(). */
export function rgb(color: string): string {
  const n = Number.parseInt(color.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
