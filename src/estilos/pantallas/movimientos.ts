// Los movimientos del original, medidos fotograma a fotograma sobre el video de referencia de MOTION:
//   - palabraGris: la palabra entra al ~36 % del negro (gris claro), 14 px más abajo, y llega negra a su sitio en 8
//     fotogramas con una curva que frena;
//   - desdeDerecha / haciaIzquierda: los objetos entran por la derecha creciendo (×0,85 → 1, desenfocados los primeros
//     fotogramas) y salen por la izquierda antes de un corte;
//   - deGolpe: crece y se posa (×0,4 → ×1,06 → 1 en ~9 fotogramas): fichas, estrellas, personajes;
//   - las transiciones entre escenas: corte, desenfoque, empuje, zoom y blanco;
//   - sombraGrande: la sombra grande y suave bajo cada objeto, hacia abajo y a un lado, nunca hacia arriba.
// Nada de movimiento a velocidad constante: toda animación lleva su curva. Sin JSX.

import { Easing, interpolate } from 'remotion';
import type { EasingFunction } from 'remotion';

export const CURVAS = {
  /** Movimientos grandes: arranca y frena despacio. */
  suave: Easing.bezier(0.65, 0, 0.35, 1),
  /** El respiro lento de la cámara. */
  respiro: Easing.bezier(0.37, 0, 0.63, 1),
  /** Entra rápido y frena. */
  frena: Easing.bezier(0.16, 1, 0.3, 1),
  /** Acelera hasta el final: la escena que se va. */
  acelera: Easing.bezier(0.7, 0, 0.84, 0),
  /** Sale acelerando: un objeto que deja el cuadro. */
  salida: Easing.bezier(0.32, 0, 0.67, 0),
} as const;

/** Un valor de `valores[0]` a `valores[1]` entre dos fotogramas, con su curva; quieto fuera del tramo. */
export function anima(f: number, tramo: readonly [number, number], valores: readonly [number, number], curva: EasingFunction): number {
  if (tramo[1] <= tramo[0]) return f < tramo[0] ? valores[0] : valores[1];
  return interpolate(f, [tramo[0], tramo[1]], [valores[0], valores[1]], { easing: curva, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** Fotogramas que tarda una palabra en entrar. */
export const FOTOGRAMAS_PALABRA = 8;

/** Una palabra que entra en el fotograma `entra`: de gris claro a negro, subiendo 14 px. */
export function palabraGris(f: number, entra: number): { visible: boolean; opacidad: number; dy: number } {
  if (f < entra) return { visible: false, opacidad: 0, dy: 14 };
  const q = anima(f, [entra, entra + FOTOGRAMAS_PALABRA - 1], [0, 1], CURVAS.frena);
  return { visible: true, opacidad: 0.36 + 0.64 * q, dy: 14 * (1 - q) };
}

export interface EstadoObjeto {
  readonly visible: boolean;
  readonly opacidad: number;
  /** Desplazamiento en fracciones del ancho del cuadro. */
  readonly dx: number;
  /** Desplazamiento en fracciones del alto del cuadro. */
  readonly dy: number;
  readonly escala: number;
  /** Desenfoque en px. */
  readonly desenfoque: number;
}

export const QUIETO: EstadoObjeto = { visible: true, opacidad: 1, dx: 0, dy: 0, escala: 1, desenfoque: 0 };
const OCULTO: EstadoObjeto = { ...QUIETO, visible: false, opacidad: 0 };

/** Entra por la derecha creciendo, en `duracion` fotogramas. */
export function desdeDerecha(f: number, entra: number, duracion = 12, escalaDesde = 0.85): EstadoObjeto {
  if (f < entra) return OCULTO;
  const q = anima(f, [entra, entra + duracion], [0, 1], CURVAS.frena);
  const qs = anima(f, [entra, entra + 4], [0, 1], CURVAS.frena);
  return { visible: true, opacidad: Math.min(1, 0.5 + qs), dx: 0.15 * (1 - q), dy: 0, escala: escalaDesde + (1 - escalaDesde) * q, desenfoque: 9 * (1 - qs) };
}

/** Sube a su sitio (la ficha con nombres del original: ~1 s). */
export function desdeAbajo(f: number, entra: number, duracion = 24, subida = 0.063): EstadoObjeto {
  if (f < entra) return OCULTO;
  const q = anima(f, [entra, entra + duracion], [0, 1], CURVAS.frena);
  const qo = anima(f, [entra, entra + 5], [0, 1], CURVAS.frena);
  return { visible: true, opacidad: qo, dx: 0, dy: subida * (1 - q), escala: 1, desenfoque: 6 * (1 - qo) };
}

/** Crece y se posa de golpe: ×0,4 → ×1,06 → 1. */
export function deGolpe(f: number, entra: number): EstadoObjeto {
  if (f < entra) return OCULTO;
  const escala = f - entra < 5 ? anima(f, [entra, entra + 5], [0.4, 1.06], CURVAS.frena) : anima(f, [entra + 5, entra + 9], [1.06, 1], CURVAS.suave);
  return { ...QUIETO, opacidad: anima(f, [entra, entra + 2], [0, 1], CURVAS.frena), escala };
}

/** La salida por la izquierda antes del corte del fotograma `fin`: 6 fotogramas, desenfocada en los 3 últimos. */
export function haciaIzquierda(f: number, fin: number): { dx: number; desenfoque: number } {
  if (f < fin - 6) return { dx: 0, desenfoque: 0 };
  return { dx: -0.037 * anima(f, [fin - 6, fin], [0, 1], CURVAS.salida), desenfoque: anima(f, [fin - 3, fin], [0, 8], CURVAS.salida) };
}

export type TransicionEscena = 'corte' | 'desenfoque' | 'empuje' | 'zoom' | 'blanco';

export interface EstadoEscena {
  readonly opacidad: number;
  readonly desenfoque: number;
  /** Fracciones del cuadro. */
  readonly dx: number;
  readonly escala: number;
  /** Velo blanco encima (transición «blanco»), de 0 a 1. */
  readonly blanco: number;
}

export const ESCENA_QUIETA: EstadoEscena = { opacidad: 1, desenfoque: 0, dx: 0, escala: 1, blanco: 0 };

/** Fotogramas de cada transición antes del corte (en la escena que sale) y después (en la que entra). */
const TIEMPOS: Record<TransicionEscena, { sale: number; entra: number }> = {
  corte: { sale: 0, entra: 0 },
  desenfoque: { sale: 3, entra: 5 },
  empuje: { sale: 3, entra: 5 },
  zoom: { sale: 3, entra: 0 },
  blanco: { sale: 0, entra: 5 },
};

/** La escena que se va con la transición `t` hacia la escena que empieza en `limite`. */
export function escenaQueSale(t: TransicionEscena, f: number, limite: number): EstadoEscena {
  const n = TIEMPOS[t].sale;
  if (n === 0 || f < limite - n) return ESCENA_QUIETA;
  const q = anima(f + 1, [limite - n, limite], [0, 1], CURVAS.acelera);
  if (t === 'desenfoque') return { ...ESCENA_QUIETA, desenfoque: 16 * q };
  if (t === 'empuje') return { ...ESCENA_QUIETA, dx: -0.6 * q, desenfoque: 10 * q };
  if (t === 'zoom') return { ...ESCENA_QUIETA, escala: 1 + 0.1 * q, desenfoque: 3 * q };
  return ESCENA_QUIETA;
}

/** La escena que entra con la transición `t` en el fotograma `limite`. */
export function escenaQueEntra(t: TransicionEscena, f: number, limite: number): EstadoEscena {
  const n = TIEMPOS[t].entra;
  if (n === 0 || f >= limite + n) return ESCENA_QUIETA;
  const q = anima(f, [limite, limite + n], [0, 1], CURVAS.frena);
  if (t === 'desenfoque') return { ...ESCENA_QUIETA, opacidad: 0.35 + 0.65 * q, desenfoque: 14 * (1 - q) };
  if (t === 'empuje') return { ...ESCENA_QUIETA, dx: 0.35 * (1 - q), desenfoque: 8 * (1 - q) };
  if (t === 'blanco') return { ...ESCENA_QUIETA, blanco: 1 - q };
  return ESCENA_QUIETA;
}

/** La sombra grande y suave (box-shadow): `lado` +1 hacia la derecha, −1 hacia la izquierda. */
export function sombraGrande(escala = 1, lado = 1, fuerza = 1): string {
  const s = (x: number): string => `${(x * escala).toFixed(1)}px`;
  return [
    `${s(10 * lado)} ${s(26)} ${s(34)} rgba(0,0,0,${(0.32 * fuerza).toFixed(3)})`,
    `${s(26 * lado)} ${s(62)} ${s(92)} rgba(0,0,0,${(0.3 * fuerza).toFixed(3)})`,
    `${s(40 * lado)} ${s(110)} ${s(150)} rgba(0,0,0,${(0.22 * fuerza).toFixed(3)})`,
  ].join(', ');
}

/** La misma sombra como filtro, para formas que no son rectángulos (personaje, destello, fichas redondas). */
export function sombraFiltro(escala = 1, lado = 1, fuerza = 1): string {
  const s = (x: number): string => `${(x * escala).toFixed(1)}px`;
  return [
    `drop-shadow(${s(8 * lado)} ${s(20)} ${s(14)} rgba(0,0,0,${(0.3 * fuerza).toFixed(3)}))`,
    `drop-shadow(${s(22 * lado)} ${s(50)} ${s(40)} rgba(0,0,0,${(0.26 * fuerza).toFixed(3)}))`,
  ].join(' ');
}
