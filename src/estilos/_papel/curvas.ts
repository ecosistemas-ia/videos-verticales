// Curvas, animaciones y colores de los estilos de papel (surreal y relato). Portado de las curvas de MOTION: ningún
// movimiento va a velocidad constante y toda animación lleva su curva. Los colores se mezclan en OKLab, no en RGB.
// Sin JSX: lo pueden usar también las reglas.

import { Easing, interpolate } from 'remotion';
import type { EasingFunction } from 'remotion';

export const CURVAS = {
  /** Movimientos grandes: arranca y frena suave. */
  suave: Easing.bezier(0.65, 0, 0.35, 1),
  /** Respiración lenta de la cámara. */
  respira: Easing.bezier(0.37, 0, 0.63, 1),
  /** Entra rápido y frena: textos, tarjetas, círculos. */
  frena: Easing.bezier(0.16, 1, 0.3, 1),
  /** Acelera hasta el final: lo que sale volando. */
  acelera: Easing.bezier(0.7, 0, 0.84, 0),
  /** Sale acelerando. */
  salida: Easing.bezier(0.32, 0, 0.67, 0),
  /** Se posa frenando (cuadrática). */
  posa: Easing.out(Easing.quad),
} as const;

export type Curva = EasingFunction;

/** Un valor que va de `valores[0]` a `valores[1]` entre los fotogramas del tramo, con su curva; fuera, quieto. */
export function anima(f: number, tramo: readonly [number, number], valores: readonly [number, number], curva: Curva): number {
  if (tramo[1] <= tramo[0]) return f < tramo[0] ? valores[0] : valores[1];
  return interpolate(f, [tramo[0], tramo[1]], [valores[0], valores[1]], { easing: curva, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

export interface Etapa {
  readonly f: number;
  readonly v: number;
  /** Curva con la que se llega a esta etapa desde la anterior (por defecto, suave). */
  readonly curva?: Curva;
}

/** Una animación por etapas, en orden de fotograma. Antes de la primera y después de la última, quieta. */
export function animaEtapas(f: number, etapas: readonly Etapa[]): number {
  if (f <= etapas[0].f) return etapas[0].v;
  for (let i = 1; i < etapas.length; i++) {
    const a = etapas[i - 1];
    const b = etapas[i];
    if (f < b.f) return anima(f, [a.f, b.f], [a.v, b.v], b.curva ?? CURVAS.suave);
  }
  return etapas[etapas.length - 1].v;
}

/** Zoom entre dos escalas como lo ve el ojo: sobre el logaritmo (×1 → ×2 → ×4 a pasos iguales). */
export function escalaEntre(desde: number, hasta: number, q: number): number {
  return Math.exp(Math.log(desde) + (Math.log(hasta) - Math.log(desde)) * q);
}

/** Frenada exponencial de una escala: de `desde` a `hasta` en `duracion` segundos, con constante `tau`. */
export function frenada(t: number, desde: number, hasta: number, tau: number, duracion: number): number {
  const q = t >= duracion ? 1 : (1 - Math.exp(-Math.max(0, t) / tau)) / (1 - Math.exp(-duracion / tau));
  return escalaEntre(desde, hasta, q);
}

// ---------------------------------------------------------------------------------------------------------------------
// Colores en OKLab.

function lineal(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function gamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function deHex(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (m === null) throw new Error(`Color no válido «${color}»: hace falta #RRGGBB`);
  return [m[1], m[2], m[3]].map((h) => lineal(Number.parseInt(h, 16) / 255)) as [number, number, number];
}
function aOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function deOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/** Mezcla dos colores #RRGGBB en OKLab (q 0 → a, 1 → b). */
export function mezcla(a: string, b: string, q: number): string {
  const ca = aOklab(deHex(a));
  const cb = aOklab(deHex(b));
  const k = Math.min(1, Math.max(0, q));
  const m = deOklab([ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k]);
  return '#' + m.map((c) => Math.round(Math.min(1, Math.max(0, gamma(c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
