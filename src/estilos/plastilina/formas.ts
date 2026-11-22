// Las formas de los personajes de plastilina: siluetas redondeadas sin brazos ni piernas, apoyadas en el suelo (y = 0
// es la base, el cuerpo sube hacia y negativa). Cada forma declara sus partes (la primera es el cuerpo), dónde va la
// cara, su alto y su ancho, y su color por defecto. Sin JSX: lo carga también Node.

import { circulo, curva, elipse } from '../_marionetas/curvas.ts';

export const FORMAS = [
  'bola',
  'nube',
  'gota',
  'cubo',
  'corazon',
  'estrella',
  'diente',
  'hoja',
  'moneda',
  'bombilla',
  'taza',
  'casa',
  'nota',
  'telefono',
] as const;
export type NombreForma = (typeof FORMAS)[number];

export const COLORES = {
  azul: '#2F7BFF',
  celeste: '#4FB8F0',
  amarillo: '#FFC21A',
  naranja: '#FF8A3D',
  rojo: '#F2474F',
  rosa: '#FF5FA2',
  morado: '#8B5CF6',
  verde: '#3FBF5F',
  menta: '#2FD1AE',
  blanco: '#F3EEE3',
  crema: '#F6DDB0',
  dorado: '#E8B10E',
  gris: '#A3ACBA',
  negro: '#34343E',
} as const;
export type NombreColor = keyof typeof COLORES;

export interface ParteForma {
  readonly d: string;
  /** Color propio (si falta, el del personaje). */
  readonly color?: string;
}

export interface Forma {
  readonly partes: (t: number) => ParteForma[];
  /** Líneas finas de detalle (renglones, ranuras), del color del cuerpo más oscuro. */
  readonly lineas?: readonly string[];
  readonly cara: { readonly x: number; readonly y: number; readonly sep: number; readonly ojo: number };
  /** Lo más alto de la forma (y negativa), para sombreros y globos. */
  readonly cima: number;
  readonly ancho: number;
  readonly color: NombreColor;
  /** Sale vapor por arriba (taza). */
  readonly vapor?: boolean;
}

/** Contorno cerrado por puntos polares, con la base aplastada para que apoye en el suelo. */
function polar(n: number, r: (a: number) => number, sy = 1, plano = 0.78): string {
  const pts: [number, number][] = [];
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r(a);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * sy]);
  }
  const corte = Math.max(...pts.map((p) => p[1])) * plano;
  const aplastados = pts.map(([x, y]) => [x, y > corte ? corte + (y - corte) * 0.12 : y] as [number, number]);
  for (const p of aplastados) maxY = Math.max(maxY, p[1]);
  return curva(aplastados.map(([x, y]) => [x, y - maxY] as [number, number]));
}

const tiembla = (t: number, a: number, k = 3): number => 0.012 * Math.sin(k * a + t * 2.1);

const DIENTE: [number, number][] = [
  [-118, -262], [-80, -300], [-30, -290], [0, -270], [30, -290], [80, -300], [118, -262], [126, -200], [112, -130],
  [92, -66], [72, -10], [44, 0], [26, -40], [12, -92], [0, -100], [-12, -92], [-26, -40], [-44, 0], [-72, -10],
  [-92, -66], [-112, -130], [-126, -200],
];

const ESTRELLA = (t: number): [number, number][] =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = (i % 2 === 0 ? 168 : 82) * (1 + 0.01 * Math.sin(t * 2 + i));
    return [Math.cos(a) * r, Math.sin(a) * r - 150] as [number, number];
  });

export const FORMAS_DEF: Readonly<Record<NombreForma, Forma>> = {
  bola: {
    partes: (t) => [{ d: polar(48, (a) => 150 * (1 + tiembla(t, a)), 0.96) }],
    cara: { x: 0, y: -150, sep: 64, ojo: 22 },
    cima: -290,
    ancho: 300,
    color: 'azul',
  },
  nube: {
    partes: (t) => [{ d: polar(60, (a) => 150 * (1 + 0.075 * Math.sin(5 * a + 0.6) + tiembla(t, a)), 0.88) }],
    cara: { x: 0, y: -130, sep: 66, ojo: 22 },
    cima: -270,
    ancho: 320,
    color: 'celeste',
  },
  gota: {
    partes: (t) => [{ d: polar(60, (a) => 150 * (1 + 0.14 * Math.sin(3 * a) + tiembla(t, a)), 1.12) }],
    cara: { x: 0, y: -120, sep: 60, ojo: 20 },
    cima: -330,
    ancho: 300,
    color: 'amarillo',
  },
  cubo: {
    partes: (t) => [{ d: polar(64, (a) => 150 / Math.pow(Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4, 0.25) * (0.93 + tiembla(t, a)), 0.95, 0.95) }],
    cara: { x: 0, y: -150, sep: 66, ojo: 22 },
    cima: -270,
    ancho: 290,
    color: 'naranja',
  },
  corazon: {
    partes: (t) => {
      const s = 1 + 0.025 * Math.max(0, Math.sin(t * 7.5)) ** 8;
      const p: [number, number][] = Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const x = 16 * Math.sin(a) ** 3;
        const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        return [x * 10 * s, y * 10 * s - 160] as [number, number];
      });
      return [{ d: curva(p) }];
    },
    cara: { x: 0, y: -175, sep: 70, ojo: 21 },
    cima: -300,
    ancho: 320,
    color: 'rojo',
  },
  estrella: {
    partes: (t) => [{ d: curva(ESTRELLA(t), true, 0.55) }],
    cara: { x: 0, y: -150, sep: 52, ojo: 18 },
    cima: -318,
    ancho: 330,
    color: 'amarillo',
  },
  diente: {
    partes: () => [{ d: curva(DIENTE) }],
    cara: { x: 0, y: -205, sep: 72, ojo: 21 },
    cima: -300,
    ancho: 260,
    color: 'blanco',
  },
  hoja: {
    partes: (t) => {
      const g = 2 * Math.sin(t * 1.4);
      return [
        { d: curva([[0, -340 + g], [92, -250], [120, -150], [80, -50], [0, -10], [-80, -50], [-120, -150], [-92, -250]]) },
        { d: `M -6 -8 Q 0 10 6 -8 L 6 -2 Q 0 30 -6 -2 Z`, color: '#2E7D3E' },
      ];
    },
    lineas: ['M 0 -300 Q 6 -170 0 -30'],
    cara: { x: 0, y: -170, sep: 56, ojo: 18 },
    cima: -340,
    ancho: 250,
    color: 'verde',
  },
  moneda: {
    partes: (t) => [{ d: polar(48, (a) => 150 * (1 + tiembla(t, a) * 0.5), 1, 0.96) }, { d: circulo(0, -150, 116), color: '#F6C93A' }],
    cara: { x: 0, y: -150, sep: 62, ojo: 21 },
    cima: -300,
    ancho: 300,
    color: 'dorado',
  },
  bombilla: {
    partes: (t) => [
      { d: curva([[0, -350 + 2 * Math.sin(t * 2)], [110, -300], [140, -210], [96, -120], [64, -70], [-64, -70], [-96, -120], [-140, -210], [-110, -300]]) },
      { d: 'M -62 -78 L 62 -78 Q 68 -44 54 -12 Q 0 6 -54 -12 Q -68 -44 -62 -78 Z', color: '#A3ACBA' },
    ],
    lineas: ['M -58 -52 Q 0 -40 58 -52', 'M -54 -28 Q 0 -16 54 -28'],
    cara: { x: 0, y: -225, sep: 62, ojo: 20 },
    cima: -350,
    ancho: 280,
    color: 'amarillo',
  },
  taza: {
    partes: () => [
      { d: curva([[-130, -250], [130, -250], [122, -120], [96, -20], [40, 0], [-40, 0], [-96, -20], [-122, -120]], true, 0.7) },
      { d: 'M 112 -210 C 200 -220 200 -90 104 -96 L 104 -126 C 160 -128 160 -184 112 -180 Z' },
      { d: elipse(0, -248, 124, 22), color: '#6B3E26' },
    ],
    vapor: true,
    cara: { x: -6, y: -150, sep: 62, ojo: 20 },
    cima: -300,
    ancho: 330,
    color: 'blanco',
  },
  casa: {
    partes: () => [
      { d: curva([[0, -330], [150, -200], [130, -190], [130, -20], [110, 0], [-110, 0], [-130, -20], [-130, -190], [-150, -200]], true, 0.5) },
      { d: 'M -34 0 L -34 -76 Q 0 -104 34 -76 L 34 0 Z', color: '#7A4A2E' },
    ],
    cara: { x: 0, y: -165, sep: 64, ojo: 20 },
    cima: -330,
    ancho: 300,
    color: 'rojo',
  },
  nota: {
    partes: () => [
      { d: curva([[-110, -320], [60, -320], [116, -264], [116, -20], [100, 0], [-100, 0], [-116, -20], [-116, -300]], true, 0.45) },
      { d: 'M 60 -320 L 60 -270 Q 62 -262 70 -262 L 116 -264 Z', color: '#D9D3C4' },
    ],
    lineas: ['M -70 -110 L 70 -110', 'M -70 -76 L 40 -76', 'M -70 -42 L 56 -42'],
    cara: { x: 0, y: -200, sep: 64, ojo: 20 },
    cima: -320,
    ancho: 250,
    color: 'blanco',
  },
  telefono: {
    partes: () => [
      { d: curva([[-110, -340], [110, -340], [118, -320], [118, -20], [100, 0], [-100, 0], [-118, -20], [-118, -320]], true, 0.35) },
      { d: curva([[-92, -300], [92, -300], [92, -48], [-92, -48]], true, 0.2), color: '#1B1C24' },
    ],
    cara: { x: 0, y: -190, sep: 62, ojo: 20 },
    cima: -340,
    ancho: 250,
    color: 'negro',
  },
};

/** Las formas con pantalla oscura detrás de la cara: los ojos van claros. */
export const CARA_CLARA: ReadonlySet<NombreForma> = new Set(['telefono']);
