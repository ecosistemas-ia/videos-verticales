// Tipos y medidas comunes del teatro de sombras: lo que devuelve cada figura o decorado (piezas ya colocadas en la
// pantalla, luces y varillas) y la geometría del escenario. Sin JSX.

import type { Matriz } from '../_marionetas/geometria.ts';

/** Una forma dibujada: su trazo en coordenadas propias y la matriz que la lleva a la pantalla. */
export interface Pieza {
  readonly d: string;
  readonly m: Matriz;
  /** sombra = silueta negra; llama = papel de color iluminado (fuego); brillo = luz pintada (luna, ventana); membrana = silueta translúcida. */
  readonly tipo?: 'sombra' | 'llama' | 'brillo' | 'membrana';
}

/** Una luz que aclara la pantalla alrededor de un punto (antorcha, hoguera, luna). */
export interface Luz {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** 0..1 */
  readonly fuerza: number;
  readonly color: string;
}

export interface Dibujo {
  readonly piezas: Pieza[];
  readonly luces: Luz[];
  /** Varillas: del punto de agarre hacia abajo, fuera de la pantalla. */
  readonly varillas: { x: number; y: number }[];
}

export function dibujoVacio(): Dibujo {
  return { piezas: [], luces: [], varillas: [] };
}

/** La pantalla de papel dentro del teatrito, en píxeles del video. */
export const PANTALLA = { x0: 34, y0: 150, x1: 1046, y1: 1290 } as const;
/** Donde pisan las figuras. */
export const SUELO = 1196;
/** El techo para las que vuelan (altura 1). */
export const CIELO = 330;

/** De una fracción del ancho (0..1, o fuera) a x en la pantalla; deja libre la franja derecha que tapan los botones. */
export function xPantalla(f: number): number {
  return 110 + f * 800;
}

/** De una altura (0 suelo, 1 arriba) a y en la pantalla. */
export function yAltura(a: number): number {
  return SUELO - a * (SUELO - CIELO);
}

/** Contexto de dibujo de una figura o un decorado. */
export interface Contexto {
  /** Segundo global del video (para lo que se mueve siempre: viento, llamas). */
  readonly t: number;
  readonly calados: boolean;
  readonly semilla: number;
}
