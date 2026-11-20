// Los personajes-órgano, de diseño propio: siluetas redondeadas con contorno grueso, sombra plana abajo a la derecha,
// un brillo arriba a la izquierda y la cara en su sitio. Cada uno declara sus partes (que se unen bajo un solo
// contorno), sus detalles (líneas internas), dónde van la cara, los hombros y las caderas. Sin JSX.

import { banda, circulo, curva, elipse, onda } from '../_marionetas/curvas.ts';
import type { NombrePersonaje } from './reglas.ts';

export interface Parte {
  readonly d: string;
  readonly color: string;
  /** Las partes «detras» no reciben la sombra del cuerpo (tubos, vasos). */
  readonly detras?: boolean;
}

export interface Organo {
  readonly color: string;
  readonly sombra: string;
  /** Color de brazos y piernas. */
  readonly miembro: string;
  readonly partes: (t: number) => Parte[];
  /** Líneas internas (circunvoluciones, pliegues, anillos), con trazo del color del contorno. */
  readonly lineas: readonly string[];
  /** Manchas de color encima del cuerpo (núcleo, hoyuelo), sin contorno. */
  readonly manchas?: readonly Parte[];
  readonly cara: { readonly x: number; readonly y: number; readonly sep: number; readonly ojo: number };
  readonly hombros: readonly [readonly [number, number], readonly [number, number]];
  readonly caderas: readonly [readonly [number, number], readonly [number, number]];
  /** y donde empiezan las piernas (lo más bajo del cuerpo que se apoya). */
  readonly base: number;
  /** Ancho aproximado, para separar personajes. */
  readonly ancho: number;
  /** Late (corazón) o respira (pulmones): escala propia. */
  readonly pulso?: 'latido' | 'respira';
  /** Dónde poner el brillo. */
  readonly brillo: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number };
}

const VENA = '#6F86E0';
const ARTERIA = '#F26A80';

function bulto(n: number, r1: number, r2: number, t: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (i % 2 === 0 ? r1 : r2) + 4 * onda(t, 0.6, i);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

export const ORGANOS: Readonly<Record<NombrePersonaje, Organo>> = {
  corazon: {
    color: '#E8445A',
    sombra: '#B42A44',
    miembro: '#B42A44',
    partes: () => [
      { d: banda([{ x: -74, y: -40 }, { x: -84, y: -120 }, { x: -78, y: -176 }], () => 38), color: VENA, detras: true },
      { d: banda([{ x: 44, y: -80 }, { x: 58, y: -142 }, { x: 84, y: -162 }], () => 34), color: '#C93A57', detras: true },
      { d: banda([{ x: -12, y: -80 }, { x: -8, y: -150 }, { x: 22, y: -192 }, { x: 74, y: -192 }, { x: 98, y: -150 }], () => 44), color: ARTERIA, detras: true },
      { d: curva([[0, -78], [-52, -124], [-122, -96], [-146, -14], [-108, 70], [-36, 128], [18, 162], [80, 112], [138, 24], [134, -68], [72, -116]]), color: '#E8445A' },
    ],
    lineas: [],
    cara: { x: -2, y: 0, sep: 96, ojo: 34 },
    hombros: [
      [-128, 10],
      [126, 0],
    ],
    caderas: [
      [-40, 112],
      [46, 112],
    ],
    base: 118,
    ancho: 290,
    pulso: 'latido',
    brillo: { x: -84, y: -62, rx: 28, ry: 16 },
  },
  cerebro: {
    color: '#F4A6C6',
    sombra: '#D27CA2',
    miembro: '#C9739A',
    partes: () => [
      { d: banda([{ x: 30, y: 70 }, { x: 40, y: 120 }, { x: 38, y: 150 }], () => 42), color: '#E58BB0', detras: true },
      { d: curva([[40, 60], [100, 40], [138, 74], [122, 120], [70, 126], [36, 100]]), color: '#E58BB0' },
      { d: curva([[-152, 0], [-146, -76], [-96, -134], [-8, -154], [88, -138], [146, -82], [156, 2], [124, 70], [40, 96], [-46, 96], [-126, 70]]), color: '#F4A6C6' },
    ],
    lineas: [
      'M0 -152 C -8 -128 8 -106 0 -78',
      'M-126 -50 C -104 -86 -76 -40 -52 -80 S -20 -122 -14 -96',
      'M-140 6 C -124 -18 -112 18 -94 -10',
      'M24 -100 C 40 -128 66 -88 84 -116 S 120 -92 132 -70',
      'M104 -30 C 118 -46 136 -20 148 -36',
      'M56 106 C 76 96 96 112 118 100',
    ],
    cara: { x: 0, y: 14, sep: 104, ojo: 32 },
    hombros: [
      [-146, 34],
      [150, 30],
    ],
    caderas: [
      [-44, 90],
      [42, 92],
    ],
    base: 96,
    ancho: 310,
    brillo: { x: -78, y: -104, rx: 34, ry: 16 },
  },
  estomago: {
    color: '#F6A45E',
    sombra: '#D27A34',
    miembro: '#C8742F',
    partes: () => [
      { d: banda([{ x: -55, y: -95 }, { x: -60, y: -150 }, { x: -50, y: -210 }], () => 50), color: '#F2B27A', detras: true },
      { d: banda([{ x: 96, y: 86 }, { x: 132, y: 116 }, { x: 156, y: 150 }], () => 40), color: '#F2B27A', detras: true },
      { d: curva([[-80, -112], [-20, -126], [40, -102], [112, -52], [148, 30], [122, 112], [40, 152], [-50, 142], [-122, 92], [-142, 10], [-122, -62]]), color: '#F6A45E' },
    ],
    lineas: ['M-96 -38 C -60 -58 -24 -28 12 -50', 'M70 -70 C 96 -50 110 -20 118 6', 'M-80 112 C -40 128 10 126 60 120'],
    cara: { x: -6, y: 8, sep: 98, ojo: 33 },
    hombros: [
      [-136, 14],
      [142, 10],
    ],
    caderas: [
      [-46, 136],
      [44, 140],
    ],
    base: 140,
    ancho: 300,
    brillo: { x: -70, y: -80, rx: 30, ry: 14 },
  },
  pulmones: {
    color: '#F79AAB',
    sombra: '#D46C84',
    miembro: '#C76079',
    partes: () => [
      { d: banda([{ x: 0, y: -222 }, { x: 0, y: -150 }, { x: 0, y: -96 }], () => 40), color: '#F4CAD2', detras: true },
      { d: banda([{ x: 0, y: -104 }, { x: -54, y: -66 }], () => 28) + ' ' + banda([{ x: 0, y: -104 }, { x: 54, y: -66 }], () => 28), color: '#F4CAD2', detras: true },
      { d: curva([[-44, -52], [44, -52], [46, 112], [-46, 120]]), color: '#F6B7C3' },
      { d: curva([[-20, -94], [-66, -126], [-126, -104], [-160, -24], [-162, 86], [-120, 152], [-42, 142], [-20, 72]]), color: '#F79AAB' },
      { d: curva([[20, -94], [64, -122], [122, -100], [152, -20], [152, 82], [114, 148], [52, 142], [40, 96], [22, 40]]), color: '#F79AAB' },
    ],
    lineas: ['M-16 -206 H16', 'M-16 -184 H16', 'M-16 -162 H16', 'M-16 -140 H16', 'M-122 -40 C -110 -10 -126 30 -112 60', 'M118 -40 C 106 -10 122 30 110 60'],
    cara: { x: 0, y: 6, sep: 168, ojo: 33 },
    hombros: [
      [-158, 26],
      [150, 26],
    ],
    caderas: [
      [-62, 140],
      [62, 140],
    ],
    base: 146,
    ancho: 320,
    pulso: 'respira',
    brillo: { x: -104, y: -70, rx: 26, ry: 14 },
  },
  higado: {
    color: '#BB544D',
    sombra: '#8E3A36',
    miembro: '#863633',
    partes: () => [
      { d: curva([[48, 52], [96, 58], [104, 96], [72, 116], [44, 92]]), color: '#86C25E', detras: true },
      { d: curva([[-166, -30], [-110, -106], [0, -120], [122, -102], [166, -56], [150, 6], [70, 60], [-30, 106], [-122, 92], [-172, 30]]), color: '#BB544D' },
    ],
    lineas: ['M44 -112 C 36 -70 28 -30 18 26'],
    cara: { x: -40, y: -14, sep: 98, ojo: 30 },
    hombros: [
      [-162, 0],
      [158, -24],
    ],
    caderas: [
      [-78, 94],
      [8, 86],
    ],
    base: 96,
    ancho: 330,
    brillo: { x: -110, y: -60, rx: 30, ry: 14 },
  },
  rinon: {
    color: '#CB5A6F',
    sombra: '#9D3D53',
    miembro: '#963A50',
    partes: () => [
      { d: banda([{ x: -50, y: -14 }, { x: -108, y: -26 }], () => 24), color: ARTERIA, detras: true },
      { d: banda([{ x: -50, y: 16 }, { x: -108, y: 22 }], () => 24), color: VENA, detras: true },
      { d: curva([[-30, -150], [46, -148], [106, -90], [118, 10], [96, 112], [36, 160], [-36, 150], [-80, 100], [-56, 42], [-50, -6], [-68, -60], [-84, -116]]), color: '#CB5A6F' },
    ],
    lineas: [],
    cara: { x: 26, y: 0, sep: 86, ojo: 30 },
    hombros: [
      [-62, 62],
      [112, 30],
    ],
    caderas: [
      [-18, 146],
      [56, 138],
    ],
    base: 150,
    ancho: 240,
    brillo: { x: 20, y: -108, rx: 26, ry: 14 },
  },
  intestino: {
    color: '#F7B59C',
    sombra: '#DA8E73',
    miembro: '#C97A62',
    partes: () => [
      { d: banda([{ x: -144, y: 150 }, { x: -152, y: -20 }, { x: -128, y: -124 }, { x: 0, y: -146 }, { x: 128, y: -124 }, { x: 152, y: -20 }, { x: 140, y: 126 }], () => 58), color: '#EC9479' },
      { d: curva([[-108, -92], [108, -96], [118, 100], [0, 132], [-114, 106]]), color: '#F7B59C' },
    ],
    lineas: ['M-176 -60 H-128', 'M-170 40 H-130', 'M-100 -150 L-92 -110', 'M0 -170 V-124', 'M100 -150 L92 -110', 'M128 40 H172', 'M128 -60 H176', 'M-84 72 C -60 50 -40 110 -14 84 S 30 60 52 92 S 80 70 90 84'],
    cara: { x: 0, y: -26, sep: 100, ojo: 32 },
    hombros: [
      [-176, 6],
      [176, 6],
    ],
    caderas: [
      [-52, 140],
      [52, 140],
    ],
    base: 146,
    ancho: 350,
    brillo: { x: -70, y: -70, rx: 28, ry: 12 },
  },
  piel: {
    color: '#F3C49E',
    sombra: '#D9A27B',
    miembro: '#C98E66',
    partes: () => [
      { d: curva([[-142, 0], [142, -6], [148, 116], [-148, 122]]), color: '#F2A49C' },
      { d: curva([[-142, -100], [-90, -126], [-40, -106], [10, -128], [60, -108], [110, -126], [146, -100], [146, 30], [-146, 36]]), color: '#F3C49E' },
    ],
    lineas: ['M-82 -118 C -84 -140 -96 -156 -94 -178', 'M20 -126 C 22 -150 34 -166 30 -190', 'M100 -120 C 98 -140 88 -152 92 -172', 'M-146 34 C -90 22 -40 44 0 30 S 90 22 146 30'],
    manchas: [{ d: `${circulo(-100, 76, 5)} ${circulo(-60, 96, 4)} ${circulo(90, 80, 5)} ${circulo(120, 100, 4)} ${circulo(40, 102, 4)}`, color: '#D9837C' }],
    cara: { x: 0, y: -42, sep: 104, ojo: 31 },
    hombros: [
      [-150, -16],
      [150, -16],
    ],
    caderas: [
      [-56, 116],
      [56, 116],
    ],
    base: 120,
    ancho: 310,
    brillo: { x: -96, y: -84, rx: 26, ry: 10 },
  },
  hueso: {
    color: '#F5ECD7',
    sombra: '#D5C6A2',
    miembro: '#BBA77F',
    partes: () => [
      { d: circulo(-142, -46, 54), color: '#F5ECD7' },
      { d: circulo(-142, 46, 54), color: '#F5ECD7' },
      { d: circulo(142, -46, 54), color: '#F5ECD7' },
      { d: circulo(142, 46, 54), color: '#F5ECD7' },
      { d: curva([[-130, -56], [0, -64], [130, -56], [130, 56], [0, 64], [-130, 56]], true, 0.3), color: '#F5ECD7' },
    ],
    lineas: [],
    cara: { x: 0, y: -8, sep: 92, ojo: 28 },
    hombros: [
      [-96, 34],
      [96, 34],
    ],
    caderas: [
      [-52, 60],
      [52, 60],
    ],
    base: 64,
    ancho: 400,
    brillo: { x: -150, y: -70, rx: 22, ry: 12 },
  },
  globulo_rojo: {
    color: '#E43D4E',
    sombra: '#B82536',
    miembro: '#A8202F',
    partes: () => [{ d: elipse(0, 0, 138, 132), color: '#E43D4E' }],
    lineas: [],
    manchas: [{ d: elipse(4, 6, 84, 76), color: '#CC2C3E' }],
    cara: { x: 0, y: 0, sep: 98, ojo: 31 },
    hombros: [
      [-134, 18],
      [134, 18],
    ],
    caderas: [
      [-46, 124],
      [46, 124],
    ],
    base: 128,
    ancho: 280,
    brillo: { x: -70, y: -90, rx: 30, ry: 14 },
  },
  globulo_blanco: {
    color: '#F4F2FB',
    sombra: '#CBC5E6',
    miembro: '#A79FCB',
    partes: (t) => [{ d: curva(bulto(16, 142, 126, t)), color: '#F4F2FB' }],
    lineas: [],
    manchas: [{ d: `${circulo(-54, -78, 30)} ${circulo(0, -96, 32)} ${circulo(54, -78, 30)}`, color: '#D9CEF4' }],
    cara: { x: 0, y: 16, sep: 98, ojo: 32 },
    hombros: [
      [-136, 22],
      [136, 22],
    ],
    caderas: [
      [-46, 126],
      [46, 126],
    ],
    base: 130,
    ancho: 290,
    brillo: { x: -84, y: -40, rx: 22, ry: 12 },
  },
};
