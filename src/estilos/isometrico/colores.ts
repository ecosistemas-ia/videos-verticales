// Los colores de la ilustración isométrica: fondos índigo y violeta, colores saturados para todo lo demás, y la regla de
// la divulgación ilustrada: las luces van hacia el ámbar y las sombras hacia el violeta frío. Portado de
// VIDEO_3D/stili/ricco/colori.ts (sposta → mover, luce → aclarar, ombra → oscurecer).

import type { Material } from '../_mundo/tipos.ts';

type Rgb = [number, number, number];

function hexRgb(h: string): Rgb {
  const x = h.replace('#', '');
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}
function rgbHex([r, g, b]: Rgb): string {
  const c = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
function rgbHsl([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}
function hslRgb([h, s, l]: [number, number, number]): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Mueve un color: dl = luminosidad (−1…1), ds = saturación, dh = tono en grados. */
export function mover(hex: string, dl: number, ds = 0, dh = 0): string {
  const [h, s, l] = rgbHsl(hexRgb(hex));
  return rgbHex(hslRgb([(h + dh + 360) % 360, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, l + dl))]));
}

const hacia = (hex: string, objetivo: number, cuanto: number) => {
  const [h] = rgbHsl(hexRgb(hex));
  let d = objetivo - h;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d * cuanto;
};
/** Más claro y hacia el ámbar. */
export const aclarar = (hex: string, k = 1) => mover(hex, 0.1 * k, 0.04 * k, hacia(hex, 45, 0.12 * k));
/** Más oscuro y hacia el violeta frío. */
export const oscurecer = (hex: string, k = 1) => mover(hex, -0.13 * k, 0.06 * k, hacia(hex, 255, 0.16 * k));

/** Mezcla dos colores (#RRGGBB) en proporción k. */
export function mezclar(a: string, b: string, k: number): string {
  const p = hexRgb(a);
  const q = hexRgb(b);
  return rgbHex([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]);
}

/** Tonos base de la ilustración: la paleta del estilo «ricco» del kit (técnica de divulgación ilustrada en vectores). */
export const T = {
  fondo: '#17163F',
  tinta: '#1A1433',
  indigo: '#2B2F78',
  indigoNoche: '#1B1C52',
  violeta: '#5B3A9E',
  magenta: '#E0407A',
  coral: '#FF6B5A',
  ambar: '#FFB547',
  oro: '#F7C948',
  turquesa: '#2EC4B6',
  verde: '#3DBE7A',
  celeste: '#5AA9FF',
  crema: '#FFF1DC',
};

/** Cada material con una o varias variantes: dos casas de adobe no tienen por qué ser del mismo color. */
export const MATERIALES: Record<Material, readonly string[]> = {
  hierba: ['#3DBE7A'],
  hierba_seca: ['#8CC152'],
  tierra: ['#C9733F'],
  arena: ['#F2C27A'],
  roca: ['#8E7CC3'],
  piedra: ['#A9A6DA'],
  piedra_clara: ['#E4DEFA'],
  adobe: ['#F08A5D', '#F7A85F', '#E9765B'],
  adobe_claro: ['#FFD3A1', '#F9C08A', '#FFE0BF'],
  cal: ['#F4F0FF', '#FFE6D2', '#DDEEFF'],
  ladrillo: ['#E0507A', '#F0605D', '#C94C6B'],
  teja: ['#FF6B5A', '#FF8A4C'],
  paja: ['#F7C948'],
  madera: ['#D07A3E'],
  madera_oscura: ['#7E3B33'],
  hormigon: ['#FF6B5A', '#F7B547', '#2EC4B6', '#E0407A', '#5AA9FF'],
  vidrio: ['#5AA9FF', '#7CC6FF', '#4FD1C5'],
  metal: ['#C7D3F0'],
  asfalto: ['#4B4E8C'],
  acera: ['#8F95D6'],
  marca: ['#FFFFFF'],
  tela1: ['#E0407A'],
  tela2: ['#2EC4B6'],
  tela3: ['#FFB547'],
  hoja: ['#3DBE7A'],
  hoja2: ['#22A06B'],
  hoja3: ['#7ED957'],
  tronco: ['#7E3B33'],
  cultivo1: ['#F7C948'],
  cultivo2: ['#9BD64B'],
  cultivo3: ['#FF9F5A'],
  pintura1: ['#FF4F5E'],
  pintura2: ['#3F8CFF'],
  oro: ['#FFD25C'],
  ventana: ['#BFE3FF'],
  fuego: ['#FFB547'],
  agua: ['#3B6FE0'],
};

/** Materiales de pared: cada edificio toma una variante según su grupo. */
export const PAREDES: ReadonlySet<Material> = new Set(['adobe', 'adobe_claro', 'cal', 'ladrillo', 'hormigon', 'vidrio', 'teja']);

/** Los fondos: un índigo profundo y el halo del cielo detrás de la maqueta, según la luz. */
export const FONDOS = {
  indigo: { fondo: '#17163F', fondoNoche: '#0D0F33' },
  violeta: { fondo: '#24164A', fondoNoche: '#120B30' },
  azul: { fondo: '#10234F', fondoNoche: '#08132E' },
} as const;
export type NombreFondo = keyof typeof FONDOS;

/** El halo del cielo por momento del día: [color del borde, color del centro]. */
export const HALOS = {
  manana: ['#5B6FD0', '#FFC48A'],
  mediodia: ['#4E8FE0', '#BFE3FF'],
  tarde: ['#6A3FA6', '#FF9F5A'],
  atardecer: ['#7A3A9E', '#FF6B6B'],
  noche: ['#1E2A7A', '#3559D4'],
} as const;
