// Los dibujos de los estilos de papel, hechos solo con código (SVG): objetos con volumen (degradados de metal, de
// laca negra, de cristal), siluetas y crucecitas de luz. En MOTION eran fotos de stock recortadas; aquí cada objeto se
// ve bien sin imágenes. Cada dibujo tiene su caja (w × h, el viewBox) y se pinta con un prefijo de ids único, así el
// mismo objeto puede salir dos veces en el mismo fotograma. Los colores son los naturales: surreal los pasa a blanco y
// negro con un filtro; relato los usa tal cual con el color del negocio (Paleta).
// Este archivo: la infraestructura y los objetos. Los productos y las escenas a color están en dibujos_color.tsx.

import type { CSSProperties, ReactNode } from 'react';
import type { NombreSimbolo } from './catalogo.ts';
import { mezcla } from './curvas.ts';

/** El color del negocio (relato) o el acento de la marca (surreal), para las partes de color de un dibujo. */
export interface Paleta {
  readonly acento: string;
  /** Un tono claro del negocio, para fondos de las escenas. */
  readonly claro: string;
  /** Nombre del negocio (se escribe en la bolsa, en el cartel de la fachada). */
  readonly nombre: string;
  readonly simbolo: NombreSimbolo;
  /** Familia de la letra del nombre en los productos. */
  readonly letra: string;
}

export const PALETA_NEUTRA: Paleta = { acento: '#2F6FED', claro: '#F1EEE8', nombre: '', simbolo: 'espiga', letra: 'Georgia' };

export interface Lienzo {
  /** Prefijo único de los ids de degradados y filtros. */
  readonly id: string;
  readonly p: Paleta;
  /** Segundos desde que el dibujo está en pantalla (para las partes que se mueven: la rueda del monitor, la aguja). */
  readonly t: number;
}

export interface Dibujo {
  readonly w: number;
  readonly h: number;
  readonly pintar: (l: Lienzo) => ReactNode;
}

// ---------------------------------------------------------------------------------------------------------------------
// Ayudas de dibujo.

export type Parada = readonly [number, string] | readonly [number, string, number];

/** Un degradado lineal en unidades de la caja del objeto (0-1). */
export function Lineal({ id, x1 = 0, y1 = 0, x2 = 1, y2 = 0, paradas }: { readonly id: string; readonly x1?: number; readonly y1?: number; readonly x2?: number; readonly y2?: number; readonly paradas: readonly Parada[] }): ReactNode {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {paradas.map((s, i) => (
        <stop key={i} offset={s[0]} stopColor={s[1]} stopOpacity={s[2] ?? 1} />
      ))}
    </linearGradient>
  );
}

/** Un degradado radial en unidades de la caja del objeto. */
export function Radial({ id, cx = 0.5, cy = 0.5, r = 0.5, fx, fy, paradas }: { readonly id: string; readonly cx?: number; readonly cy?: number; readonly r?: number; readonly fx?: number; readonly fy?: number; readonly paradas: readonly Parada[] }): ReactNode {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r} fx={fx ?? cx} fy={fy ?? cy}>
      {paradas.map((s, i) => (
        <stop key={i} offset={s[0]} stopColor={s[1]} stopOpacity={s[2] ?? 1} />
      ))}
    </radialGradient>
  );
}

/** Metal pulido (bandas claras y oscuras a lo largo de un cilindro). */
export const CROMO: readonly Parada[] = [
  [0, '#2B2B2B'],
  [0.1, '#5E5E5E'],
  [0.24, '#D6D6D6'],
  [0.32, '#FFFFFF'],
  [0.42, '#A2A2A2'],
  [0.58, '#474747'],
  [0.76, '#B9B9B9'],
  [0.88, '#7A7A7A'],
  [1, '#2E2E2E'],
];
/** Laca negra brillante (las piezas de ajedrez). */
export const LACA: readonly Parada[] = [
  [0, '#030303'],
  [0.14, '#1E1E1E'],
  [0.25, '#7E7E7E'],
  [0.3, '#D8D8D8'],
  [0.35, '#3A3A3A'],
  [0.5, '#0C0C0C'],
  [0.78, '#0E0E0E'],
  [0.9, '#4C4C4C'],
  [1, '#060606'],
];
/** Hierro viejo, oscuro y mate. */
export const HIERRO: readonly Parada[] = [
  [0, '#1A1A1A'],
  [0.2, '#3B3B3B'],
  [0.38, '#7C7C7C'],
  [0.5, '#4A4A4A'],
  [0.8, '#2A2A2A'],
  [1, '#141414'],
];
/** Mármol (la columna). */
export const MARMOL: readonly Parada[] = [
  [0, '#8E8C88'],
  [0.15, '#C9C6C0'],
  [0.4, '#F4F2EE'],
  [0.6, '#E6E3DD'],
  [0.85, '#B4B1AB'],
  [1, '#85827D'],
];

/** Un punto de una curva suave (Catmull-Rom) convertida a Bézier: la ruta pasa por todos los puntos. */
export function curvaPor(puntos: readonly (readonly [number, number])[], cerrar = false): string {
  if (puntos.length < 2) return '';
  const p = puntos;
  const n = p.length;
  const en = (i: number): readonly [number, number] => (cerrar ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  const tramos = cerrar ? n : n - 1;
  for (let i = 0; i < tramos; i++) {
    const p0 = en(i - 1);
    const p1 = en(i);
    const p2 = en(i + 1);
    const p3 = en(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return cerrar ? `${d} Z` : d;
}

/** El perfil de una pieza torneada alrededor del eje x = cx: puntos [y, radio] de arriba abajo. */
export function torneado(cx: number, puntos: readonly (readonly [number, number])[]): string {
  const derecha = puntos.map(([y, r]) => [cx + r, y] as const);
  const izquierda = [...puntos].reverse().map(([y, r]) => [cx - r, y] as const);
  const a = curvaPor(derecha);
  const b = curvaPor(izquierda).replace(/^M/, 'L');
  return `${a} ${b} Z`;
}

/** Un anillo torneado: un cilindro corto con la cara de arriba en elipse. */
export function Anillo({ cx, y, r, alto, relleno, tapa, k = 0.2 }: { readonly cx: number; readonly y: number; readonly r: number; readonly alto: number; readonly relleno: string; readonly tapa: string; readonly k?: number }): ReactNode {
  const ry = r * k;
  return (
    <g>
      <path d={`M ${cx - r} ${y - alto / 2} L ${cx - r} ${y + alto / 2} A ${r} ${ry} 0 0 0 ${cx + r} ${y + alto / 2} L ${cx + r} ${y - alto / 2} Z`} fill={relleno} />
      <ellipse cx={cx} cy={y - alto / 2} rx={r} ry={ry} fill={tapa} />
    </g>
  );
}

/** Un trazo grueso de punta redonda (miembros de las siluetas). */
function Trazo({ d, ancho, color }: { readonly d: string; readonly ancho: number; readonly color: string }): ReactNode {
  return <path d={d} fill="none" stroke={color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" />;
}

// ---------------------------------------------------------------------------------------------------------------------
// Objetos.

const balanza: Dibujo = {
  w: 420,
  h: 380,
  pintar: ({ id }) => {
    const cx = 210;
    const izq = 66;
    const der = 354;
    const yBrazo = 96;
    const yPlato = 262;
    const plato = (x: number): ReactNode => (
      <g>
        {[-52, 0, 52].map((dx) => (
          <line key={dx} x1={x} y1={yBrazo + 6} x2={x + dx} y2={yPlato} stroke="#8A8A8A" strokeWidth={1.8} />
        ))}
        <path d={`M ${x - 64} ${yPlato} Q ${x} ${yPlato + 34} ${x + 64} ${yPlato} Z`} fill={`url(#${id}-cuenco)`} />
        <ellipse cx={x} cy={yPlato} rx={64} ry={8} fill={`url(#${id}-borde)`} />
        <circle cx={x} cy={yBrazo + 5} r={5} fill={`url(#${id}-cromo)`} />
      </g>
    );
    return (
      <>
        <defs>
          <Lineal id={`${id}-cromo`} paradas={CROMO} />
          <Lineal id={`${id}-brazo`} x2={0} y2={1} paradas={[[0, '#F2F2F2'], [0.4, '#B5B5B5'], [0.7, '#5A5A5A'], [1, '#2E2E2E']]} />
          <Lineal id={`${id}-cuenco`} paradas={[[0, '#3A3A3A'], [0.3, '#BDBDBD'], [0.45, '#F5F5F5'], [0.7, '#7A7A7A'], [1, '#2C2C2C']]} />
          <Lineal id={`${id}-borde`} x2={0} y2={1} paradas={[[0, '#FAFAFA'], [1, '#9A9A9A']]} />
          <Lineal id={`${id}-tapa`} paradas={[[0, '#9A9A9A'], [0.35, '#FFFFFF'], [1, '#8A8A8A']]} />
        </defs>
        {plato(izq)}
        {plato(der)}
        {/* El brazo: una barra que se afina hacia los extremos y sube un poco, con un rombo en el centro. */}
        <path d={`M ${izq - 8} ${yBrazo - 6} Q ${cx} ${yBrazo + 6} ${der + 8} ${yBrazo - 6} L ${der + 8} ${yBrazo - 1} Q ${cx} ${yBrazo + 16} ${izq - 8} ${yBrazo - 1} Z`} fill={`url(#${id}-brazo)`} />
        <path d={`M ${cx} ${yBrazo - 18} L ${cx + 16} ${yBrazo + 4} L ${cx} ${yBrazo + 24} L ${cx - 16} ${yBrazo + 4} Z`} fill={`url(#${id}-cromo)`} />
        {/* La columna, con sus anillos, el remate y la aguja. */}
        <rect x={cx - 8} y={yBrazo} width={16} height={232} fill={`url(#${id}-cromo)`} />
        <Anillo cx={cx} y={200} r={13} alto={8} relleno={`url(#${id}-cromo)`} tapa={`url(#${id}-tapa)`} />
        <Anillo cx={cx} y={290} r={16} alto={10} relleno={`url(#${id}-cromo)`} tapa={`url(#${id}-tapa)`} />
        <path d={torneado(cx, [[44, 1], [56, 4], [66, 11], [76, 12], [86, 7], [92, 6]])} fill={`url(#${id}-cromo)`} />
        <path d={`M ${cx - 2} 18 L ${cx + 2} 18 L ${cx + 3} 46 L ${cx - 3} 46 Z`} fill={`url(#${id}-cromo)`} />
        {/* La base: tres discos. */}
        <Anillo cx={cx} y={318} r={36} alto={14} relleno={`url(#${id}-cromo)`} tapa={`url(#${id}-tapa)`} />
        <Anillo cx={cx} y={336} r={58} alto={14} relleno={`url(#${id}-cromo)`} tapa={`url(#${id}-tapa)`} />
        <Anillo cx={cx} y={356} r={78} alto={16} relleno={`url(#${id}-cromo)`} tapa={`url(#${id}-tapa)`} />
      </>
    );
  },
};

const barco: Dibujo = {
  w: 440,
  h: 270,
  pintar: ({ id }) => (
    <>
      <defs>
        <Lineal id={`${id}-casco`} x2={0} y2={1} paradas={[[0, '#F3F3F1'], [1, '#D4D4D0']]} />
        <Lineal id={`${id}-velaI`} x1={0} y1={1} x2={1} y2={0} paradas={[[0, '#FFFFFF'], [1, '#EDEDEA']]} />
        <Lineal id={`${id}-velaD`} paradas={[[0, '#C9C9C5'], [1, '#B3B3AF']]} />
      </defs>
      {/* La vela: dos caras dobladas por el centro. */}
      <polygon points="220,14 128,150 220,150" fill={`url(#${id}-velaI)`} />
      <polygon points="220,14 312,150 220,150" fill={`url(#${id}-velaD)`} />
      <line x1={220} y1={16} x2={220} y2={150} stroke="#A9A9A4" strokeWidth={1.4} />
      {/* El casco: la cara delantera, la franja doblada de arriba y los pliegues. */}
      <polygon points="14,132 426,132 340,256 100,256" fill={`url(#${id}-casco)`} />
      <polygon points="14,132 426,132 410,150 30,150" fill="#BEBEB9" />
      <polygon points="14,132 128,150 100,256" fill="#E2E2DE" opacity={0.85} />
      <polygon points="426,132 312,150 340,256" fill="#C3C3BE" opacity={0.85} />
      <path d="M 128 150 L 170 256 M 312 150 L 270 256 M 220 150 L 220 256" stroke="#C6C6C1" strokeWidth={1.4} fill="none" />
    </>
  ),
};

/** Una pieza de ajedrez de laca negra a partir de su perfil y sus anillos. */
function pieza(id: string, cx: number, perfil: readonly (readonly [number, number])[], anillos: readonly (readonly [number, number, number])[], extra?: ReactNode): ReactNode {
  return (
    <>
      <defs>
        <Lineal id={`${id}-laca`} paradas={LACA} />
        <Lineal id={`${id}-tapa`} paradas={[[0, '#0A0A0A'], [0.3, '#5A5A5A'], [0.5, '#1A1A1A'], [1, '#050505']]} />
      </defs>
      <path d={torneado(cx, perfil)} fill={`url(#${id}-laca)`} />
      {anillos.map(([y, r, alto], i) => (
        <Anillo key={i} cx={cx} y={y} r={r} alto={alto} relleno={`url(#${id}-laca)`} tapa={`url(#${id}-tapa)`} k={0.16} />
      ))}
      {extra}
    </>
  );
}

const reina: Dibujo = {
  w: 220,
  h: 450,
  pintar: ({ id }) => {
    const cx = 110;
    // La corona: un borde dentado de 7 puntas sobre una copa que se abre hacia arriba.
    const puntas: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const x = cx - 50 + (100 * i) / 12;
      const y = i % 2 === 0 ? 40 : 54;
      puntas.push(`${x.toFixed(1)},${y}`);
    }
    return pieza(
      id,
      cx,
      [
        [54, 50],
        [70, 40],
        [86, 30],
        [100, 27],
        [140, 26],
        [190, 31],
        [222, 34],
        [270, 44],
        [320, 58],
        [352, 66],
      ],
      [
        [102, 42, 10],
        [210, 50, 12],
        [224, 42, 8],
        [362, 80, 18],
        [384, 90, 20],
        [410, 98, 22],
      ],
      <>
        <polygon points={`${puntas.join(' ')} ${cx + 50},60 ${cx - 50},60`} fill={`url(#${id}-laca)`} />
        <ellipse cx={cx} cy={56} rx={50} ry={9} fill={`url(#${id}-tapa)`} />
        <circle cx={cx} cy={24} r={14} fill={`url(#${id}-laca)`} />
        <ellipse cx={cx - 5} cy={19} rx={4} ry={3} fill="#E6E6E6" opacity={0.7} />
      </>,
    );
  },
};

const peon: Dibujo = {
  w: 200,
  h: 310,
  pintar: ({ id }) =>
    pieza(
      id,
      100,
      [
        [96, 20],
        [120, 22],
        [160, 32],
        [200, 46],
        [222, 56],
      ],
      [
        [96, 40, 10],
        [234, 66, 16],
        [256, 74, 18],
        [282, 80, 22],
      ],
      <>
        <circle cx={100} cy={56} r={38} fill={`url(#${id}-laca)`} />
        <ellipse cx={88} cy={42} rx={8} ry={6} fill="#E6E6E6" opacity={0.55} />
      </>,
    ),
};

/** El contorno de una rueda dentada de n dientes. */
function dientes(cx: number, cy: number, n: number, rExt: number, rInt: number): string {
  const pts: (readonly [number, number])[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const paso = (Math.PI * 2) / n;
    const angs: readonly [number, number][] = [
      [a0, rInt],
      [a0 + paso * 0.18, rExt],
      [a0 + paso * 0.48, rExt],
      [a0 + paso * 0.66, rInt],
    ];
    for (const [a, r] of angs) pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`;
}

const engranaje: Dibujo = {
  w: 400,
  h: 400,
  pintar: ({ id }) => {
    const c = 200;
    const agujeros: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const a1 = a - 0.36;
      const a2 = a + 0.36;
      const r1 = 78;
      const r2 = 128;
      agujeros.push(
        `M ${c + Math.cos(a1) * r1} ${c + Math.sin(a1) * r1} A ${r1} ${r1} 0 0 1 ${c + Math.cos(a2) * r1} ${c + Math.sin(a2) * r1} L ${c + Math.cos(a2 + 0.08) * r2} ${c + Math.sin(a2 + 0.08) * r2} A ${r2} ${r2} 0 0 0 ${c + Math.cos(a1 - 0.08) * r2} ${c + Math.sin(a1 - 0.08) * r2} Z`,
      );
    }
    return (
      <>
        <defs>
          <Radial id={`${id}-metal`} cx={0.42} cy={0.36} r={0.7} paradas={[[0, '#9C9C9C'], [0.45, '#5C5C5C'], [0.8, '#353535'], [1, '#1E1E1E']]} />
          <Radial id={`${id}-cubo`} cx={0.4} cy={0.35} r={0.65} paradas={[[0, '#D0D0D0'], [0.5, '#7A7A7A'], [1, '#2A2A2A']]} />
          <filter id={`${id}-grano`} x="0" y="0" width="1" height="1">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} result="ruido" />
            <feColorMatrix in="ruido" type="saturate" values="0" result="gris" />
            <feComposite in="gris" in2="SourceGraphic" operator="in" result="dentro" />
            <feBlend in="SourceGraphic" in2="dentro" mode="multiply" />
          </filter>
        </defs>
        <g filter={`url(#${id}-grano)`}>
          <path d={`${dientes(c, c, 30, 192, 170)} ${agujeros.join(' ')} M ${c + 30} ${c} A 30 30 0 1 0 ${c - 30} ${c} A 30 30 0 1 0 ${c + 30} ${c} Z`} fill={`url(#${id}-metal)`} fillRule="evenodd" />
          <circle cx={c} cy={c} r={160} fill="none" stroke="#262626" strokeWidth={3} opacity={0.6} />
          <circle cx={c} cy={c} r={142} fill="none" stroke="#7A7A7A" strokeWidth={2} opacity={0.5} />
          <path d={`M ${c + 62} ${c} A 62 62 0 1 0 ${c - 62} ${c} A 62 62 0 1 0 ${c + 62} ${c} Z M ${c + 30} ${c} A 30 30 0 1 1 ${c - 30} ${c} A 30 30 0 1 1 ${c + 30} ${c} Z`} fill={`url(#${id}-cubo)`} fillRule="evenodd" />
          <circle cx={c} cy={c} r={46} fill="none" stroke="#3A3A3A" strokeWidth={4} opacity={0.7} />
        </g>
      </>
    );
  },
};

const lupa: Dibujo = {
  w: 440,
  h: 280,
  pintar: ({ id }) => (
    <>
      <defs>
        <Lineal id={`${id}-aro`} x1={0} y1={0} x2={1} y2={1} paradas={CROMO} />
        <Radial id={`${id}-cristal`} cx={0.42} cy={0.4} r={0.6} paradas={[[0, '#FFFFFF', 0.85], [0.7, '#E8ECEE', 0.6], [1, '#B8C0C4', 0.75]]} />
        <Lineal id={`${id}-mango`} x2={0} y2={1} paradas={[[0, '#5A5A5A'], [0.3, '#1E1E1E'], [0.6, '#0B0B0B'], [1, '#2A2A2A']]} />
        <Lineal id={`${id}-virola`} x2={0} y2={1} paradas={CROMO} />
      </defs>
      <g transform="rotate(24 130 130)">
        {/* El mango: la virola de metal y la madera oscura de punta redonda. */}
        <rect x={232} y={118} width={34} height={24} rx={4} fill={`url(#${id}-virola)`} />
        <path d="M 262 116 L 410 112 Q 432 130 410 148 L 262 144 Z" fill={`url(#${id}-mango)`} />
        <rect x={210} y={122} width={26} height={16} fill={`url(#${id}-virola)`} />
        {/* El aro y el cristal. */}
        <circle cx={130} cy={130} r={98} fill={`url(#${id}-aro)`} />
        <circle cx={130} cy={130} r={84} fill={`url(#${id}-cristal)`} />
        <path d="M 72 104 A 66 66 0 0 1 116 66" fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" opacity={0.9} />
        <path d="M 178 170 A 60 60 0 0 1 150 192" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      </g>
    </>
  ),
};

const llave: Dibujo = {
  w: 460,
  h: 190,
  pintar: ({ id }) => (
    <>
      <defs>
        <Lineal id={`${id}-hierro`} x2={0} y2={1} paradas={HIERRO} />
        <Radial id={`${id}-ojo`} cx={0.4} cy={0.35} r={0.7} paradas={[[0, '#6E6E6E'], [0.6, '#2C2C2C'], [1, '#121212']]} />
      </defs>
      {/* El ojo: tres lóbulos con un agujero. */}
      <path
        d="M 80 30 C 110 30 128 52 126 70 C 150 74 160 94 152 112 C 146 128 128 136 114 132 C 112 152 92 166 72 162 C 46 158 30 136 34 114 C 14 108 6 86 16 68 C 26 52 46 48 56 54 C 56 40 66 30 80 30 Z M 84 76 A 22 22 0 1 0 84 120 A 22 22 0 1 0 84 76 Z"
        fill={`url(#${id}-ojo)`}
        fillRule="evenodd"
      />
      {/* El cuello, la caña y los anillos. */}
      <rect x={140} y={84} width={300} height={20} rx={6} fill={`url(#${id}-hierro)`} />
      <rect x={150} y={78} width={14} height={32} rx={4} fill={`url(#${id}-hierro)`} />
      <rect x={172} y={80} width={10} height={28} rx={3} fill={`url(#${id}-hierro)`} />
      {/* El paletón con sus dientes. */}
      <path d="M 372 100 L 436 100 L 436 160 L 420 160 L 420 140 L 404 140 L 404 166 L 388 166 L 388 132 L 372 132 Z" fill={`url(#${id}-hierro)`} />
      <rect x={140} y={86} width={300} height={4} fill="#9A9A9A" opacity={0.5} />
    </>
  ),
};

const bombilla: Dibujo = {
  w: 240,
  h: 390,
  pintar: ({ id }) => (
    <>
      <defs>
        <Radial id={`${id}-vidrio`} cx={0.38} cy={0.3} r={0.75} paradas={[[0, '#FFFFFF', 0.9], [0.55, '#EEF0F0', 0.55], [0.85, '#C4C9CB', 0.7], [1, '#8D9396', 0.9]]} />
        <Lineal id={`${id}-rosca`} paradas={CROMO} />
      </defs>
      <path d="M 120 14 C 186 14 226 64 226 120 C 226 170 192 196 172 226 C 162 242 160 256 160 270 L 80 270 C 80 256 78 242 68 226 C 48 196 14 170 14 120 C 14 64 54 14 120 14 Z" fill={`url(#${id}-vidrio)`} stroke="#9EA4A7" strokeWidth={2.5} />
      {/* El filamento y sus soportes. */}
      <path d="M 100 268 L 96 150 M 140 268 L 144 150" stroke="#6C6C6C" strokeWidth={2.4} fill="none" />
      <path d="M 96 150 L 104 136 L 112 150 L 120 136 L 128 150 L 136 136 L 144 150" stroke="#2E2E2E" strokeWidth={3} fill="none" strokeLinejoin="round" />
      <path d="M 52 96 C 58 66 80 44 108 38" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.85} />
      {/* La rosca. */}
      <rect x={78} y={270} width={84} height={70} rx={6} fill={`url(#${id}-rosca)`} />
      {[284, 300, 316].map((y) => (
        <path key={y} d={`M 78 ${y} L 162 ${y + 8}`} stroke="#3C3C3C" strokeWidth={4} opacity={0.65} />
      ))}
      <path d="M 92 340 L 148 340 L 136 362 L 104 362 Z" fill="#2A2A2A" />
      <ellipse cx={120} cy={366} rx={14} ry={6} fill="#151515" />
    </>
  ),
};

const relojArena: Dibujo = {
  w: 260,
  h: 410,
  pintar: ({ id }) => (
    <>
      <defs>
        <Lineal id={`${id}-madera`} x2={0} y2={1} paradas={[[0, '#7A6A5A'], [0.4, '#4A3B2E'], [1, '#22180F']]} />
        <Lineal id={`${id}-poste`} paradas={[[0, '#2A1E14'], [0.4, '#8A7563'], [1, '#2A1E14']]} />
        <Lineal id={`${id}-vidrio`} paradas={[[0, '#C2C8CB', 0.75], [0.25, '#FFFFFF', 0.5], [0.55, '#EEF1F2', 0.25], [1, '#A9B0B3', 0.7]]} />
      </defs>
      <path d="M 60 44 C 60 124 120 172 126 205 C 120 238 60 286 60 366 L 200 366 C 200 286 140 238 134 205 C 140 172 200 124 200 44 Z" fill={`url(#${id}-vidrio)`} stroke="#9AA2A5" strokeWidth={2} />
      {/* La arena: lo que queda arriba, el hilo y el montón de abajo. */}
      <path d="M 82 120 C 100 150 122 182 128 204 L 132 204 C 138 182 160 150 178 120 Z" fill="#8C8172" />
      <line x1={130} y1={204} x2={130} y2={318} stroke="#8C8172" strokeWidth={2.2} />
      <path d="M 64 366 C 70 330 110 312 130 312 C 150 312 190 330 196 366 Z" fill="#8C8172" />
      <path d="M 74 70 C 76 110 96 140 112 162" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.7} />
      {/* Los postes y las tapas de madera. */}
      <rect x={24} y={30} width={14} height={350} rx={6} fill={`url(#${id}-poste)`} />
      <rect x={222} y={30} width={14} height={350} rx={6} fill={`url(#${id}-poste)`} />
      <rect x={10} y={12} width={240} height={32} rx={8} fill={`url(#${id}-madera)`} />
      <rect x={10} y={366} width={240} height={32} rx={8} fill={`url(#${id}-madera)`} />
    </>
  ),
};

const escalera: Dibujo = {
  w: 240,
  h: 460,
  pintar: ({ id }) => {
    const peldanos: ReactNode[] = [];
    for (let i = 0; i < 8; i++) {
      const q = i / 8;
      const y = 440 - 420 * (1 - Math.pow(1 - q, 1.15));
      const ancho = 1 - q * 0.42;
      const x1 = 120 - 84 * ancho;
      const x2 = 120 + 84 * ancho;
      peldanos.push(<rect key={i} x={x1} y={y - 7 * ancho} width={x2 - x1} height={12 * ancho} rx={3} fill={`url(#${id}-peldano)`} />);
    }
    return (
      <>
        <defs>
          <Lineal id={`${id}-larguero`} paradas={[[0, '#4B3A2B'], [0.45, '#A48A6E'], [1, '#3A2B1E']]} />
          <Lineal id={`${id}-peldano`} x2={0} y2={1} paradas={[[0, '#C2A887'], [1, '#5C4632']]} />
        </defs>
        {peldanos}
        <path d="M 22 456 L 34 456 L 78 8 L 70 8 Z" fill={`url(#${id}-larguero)`} />
        <path d="M 206 456 L 218 456 L 170 8 L 162 8 Z" fill={`url(#${id}-larguero)`} />
      </>
    );
  },
};

const brujula: Dibujo = {
  w: 330,
  h: 370,
  pintar: ({ id, t }) => {
    const cx = 165;
    const cy = 205;
    const marcas: ReactNode[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const mayor = i % 12 === 0;
      const r1 = mayor ? 100 : 108;
      marcas.push(<line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * 118} y2={cy + Math.sin(a) * 118} stroke="#3A3A3A" strokeWidth={mayor ? 3 : 1.4} />);
    }
    // La aguja busca el norte: oscila amortiguada alrededor de −20°.
    const giro = -20 + 16 * Math.exp(-t * 1.2) * Math.cos(t * 5);
    const letra = (txt: string, a: number): ReactNode => (
      <text x={cx + Math.cos(a) * 82} y={cy + Math.sin(a) * 82 + 9} textAnchor="middle" fontSize={26} fontFamily="Georgia, serif" fill="#2A2A2A">
        {txt}
      </text>
    );
    return (
      <>
        <defs>
          <Lineal id={`${id}-caja`} x1={0} y1={0} x2={1} y2={1} paradas={CROMO} />
          <Radial id={`${id}-esfera`} cx={0.45} cy={0.4} r={0.6} paradas={[[0, '#FBFAF7'], [0.8, '#E6E3DC'], [1, '#BDB9B1']]} />
        </defs>
        <circle cx={cx} cy={30} r={22} fill="none" stroke={`url(#${id}-caja)`} strokeWidth={9} />
        <rect x={cx - 16} y={42} width={32} height={26} rx={6} fill={`url(#${id}-caja)`} />
        <circle cx={cx} cy={cy} r={150} fill={`url(#${id}-caja)`} />
        <circle cx={cx} cy={cy} r={128} fill={`url(#${id}-esfera)`} />
        {marcas}
        {letra('N', -Math.PI / 2)}
        {letra('S', Math.PI / 2)}
        {letra('E', 0)}
        {letra('O', Math.PI)}
        <g transform={`rotate(${giro.toFixed(2)} ${cx} ${cy})`}>
          <polygon points={`${cx},${cy - 96} ${cx + 13},${cy} ${cx - 13},${cy}`} fill="#1C1C1C" />
          <polygon points={`${cx},${cy + 96} ${cx + 13},${cy} ${cx - 13},${cy}`} fill="#B5B5B5" />
        </g>
        <circle cx={cx} cy={cy} r={9} fill={`url(#${id}-caja)`} />
        <path d={`M ${cx - 96} ${cy - 40} A 104 104 0 0 1 ${cx - 30} ${cy - 100}`} stroke="#FFFFFF" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.75} />
      </>
    );
  },
};

const rompecabezas: Dibujo = {
  w: 360,
  h: 260,
  pintar: ({ id }) => {
    // Dos piezas que encajan: la de la derecha (oscura) con el hueco, la de la izquierda (clara) con la lengüeta.
    const izquierda = 'M 30 60 L 180 60 L 180 104 C 196 92 222 98 222 126 C 222 154 196 160 180 148 L 180 210 L 30 210 L 30 160 C 46 172 70 166 70 138 C 70 110 46 104 30 116 Z';
    const derecha = 'M 186 60 L 330 60 L 330 210 L 186 210 L 186 148 C 202 160 228 154 228 126 C 228 98 202 92 186 104 Z';
    return (
      <>
        <defs>
          <Lineal id={`${id}-clara`} x1={0} y1={0} x2={1} y2={1} paradas={[[0, '#F7F6F3'], [1, '#C9C7C2']]} />
          <Lineal id={`${id}-oscura`} x1={0} y1={0} x2={1} y2={1} paradas={[[0, '#5A5A5A'], [1, '#1E1E1E']]} />
        </defs>
        <path d={derecha} fill={`url(#${id}-oscura)`} transform="translate(8 6)" />
        <path d={izquierda} fill={`url(#${id}-clara)`} stroke="#A9A7A2" strokeWidth={2} transform="rotate(-4 120 135)" />
      </>
    );
  },
};

const caminante: Dibujo = {
  w: 210,
  h: 450,
  pintar: () => {
    const n = '#141414';
    return (
      <g fill={n}>
        {/* Sombrero de ala y cabeza. */}
        <path d="M 58 46 Q 100 36 140 44 L 140 50 Q 100 44 58 52 Z" />
        <path d="M 72 46 C 72 18 86 8 100 8 C 116 8 128 18 128 46 Z" />
        <ellipse cx={98} cy={60} rx={20} ry={21} />
        {/* Abrigo largo, con los brazos dentro de las mangas. */}
        <path d="M 84 74 C 64 80 56 96 54 130 C 50 180 46 230 44 272 L 136 274 C 136 230 134 170 132 128 C 130 96 120 78 104 74 Z" />
        <Trazo d="M 64 96 C 52 130 44 170 36 214" ancho={26} color={n} />
        <Trazo d="M 120 98 C 134 130 146 168 156 204" ancho={24} color={n} />
        <ellipse cx={34} cy={226} rx={10} ry={13} />
        <ellipse cx={158} cy={216} rx={9} ry={12} />
        {/* Piernas: la de atrás con el talón levantado, la de delante apoyando. */}
        <Trazo d="M 78 262 C 70 310 58 352 40 404" ancho={28} color={n} />
        <Trazo d="M 108 262 C 118 312 132 356 146 410" ancho={28} color={n} />
        <path d="M 22 396 C 30 392 44 396 50 402 L 46 420 C 34 422 18 416 14 408 Z" />
        <path d="M 132 406 L 176 414 C 186 418 186 428 176 430 L 136 428 Z" />
      </g>
    );
  },
};

const cayendo: Dibujo = {
  w: 400,
  h: 380,
  pintar: () => {
    const n = '#141414';
    return (
      <g fill={n}>
        {/* Un hombre de traje que cae de espaldas: cabeza abajo a la izquierda, piernas arriba, brazos abiertos. */}
        <circle cx={96} cy={262} r={31} />
        <Trazo d="M 132 236 L 226 160" ancho={78} color={n} />
        <path d="M 196 150 L 252 128 L 262 176 L 214 196 Z" />
        <Trazo d="M 150 206 C 126 168 108 140 84 104" ancho={30} color={n} />
        <Trazo d="M 84 104 L 58 70" ancho={26} color={n} />
        <Trazo d="M 160 246 C 186 268 214 286 252 300" ancho={30} color={n} />
        <Trazo d="M 252 300 L 290 304" ancho={26} color={n} />
        <ellipse cx={52} cy={62} rx={14} ry={11} />
        <ellipse cx={298} cy={304} rx={13} ry={11} />
        <Trazo d="M 236 148 C 262 120 284 98 300 72" ancho={40} color={n} />
        <Trazo d="M 300 72 L 322 38" ancho={34} color={n} />
        <Trazo d="M 246 178 C 282 178 310 186 330 206" ancho={40} color={n} />
        <Trazo d="M 330 206 L 362 222" ancho={34} color={n} />
        <path d="M 306 30 L 346 14 C 358 12 362 26 352 32 L 326 48 Z" />
        <path d="M 356 208 L 388 214 C 398 220 394 236 382 236 L 352 234 Z" />
      </g>
    );
  },
};

const columna: Dibujo = {
  w: 230,
  h: 460,
  pintar: ({ id }) => {
    const estrias: ReactNode[] = [];
    for (let i = 0; i < 9; i++) {
      const x = 46 + i * 16.5;
      estrias.push(<rect key={i} x={x} y={92} width={7} height={312} rx={3.5} fill="#000000" opacity={0.08 + 0.05 * Math.abs(4 - i) / 4} />);
    }
    const voluta = (cx: number, sentido: number): ReactNode => (
      <g>
        <circle cx={cx} cy={58} r={24} fill={`url(#${id}-marmol)`} stroke="#9C9893" strokeWidth={2} />
        <path d={`M ${cx} 58 m ${-6 * sentido} 0 a 6 6 0 1 1 ${12 * sentido} 0 a 12 12 0 1 1 ${-24 * sentido} 0 a 18 18 0 1 1 ${36 * sentido} 0`} fill="none" stroke="#8E8A85" strokeWidth={2.5} />
      </g>
    );
    return (
      <>
        <defs>
          <Lineal id={`${id}-marmol`} paradas={MARMOL} />
        </defs>
        {/* Fuste con estrías, ligeramente más estrecho arriba. */}
        <path d="M 40 404 L 190 404 L 184 88 L 46 88 Z" fill={`url(#${id}-marmol)`} />
        {estrias}
        {/* Capitel jónico: equino, volutas y ábaco. */}
        <rect x={34} y={72} width={162} height={20} rx={4} fill={`url(#${id}-marmol)`} />
        {voluta(36, 1)}
        {voluta(194, -1)}
        <rect x={12} y={26} width={206} height={18} rx={2} fill={`url(#${id}-marmol)`} />
        {/* Basa: dos toros y el plinto. */}
        <rect x={32} y={402} width={166} height={16} rx={8} fill={`url(#${id}-marmol)`} />
        <rect x={24} y={416} width={182} height={18} rx={9} fill={`url(#${id}-marmol)`} />
        <rect x={12} y={432} width={206} height={24} fill={`url(#${id}-marmol)`} />
      </>
    );
  },
};

const monitor: Dibujo = {
  w: 380,
  h: 480,
  pintar: ({ id, t }) => {
    // Un busto con traje y, en lugar de cabeza, un monitor de tubo con la rueda de carga (montaje surrealista).
    const pasos = Math.floor(t * 10) % 8;
    const puntos: ReactNode[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const edad = (pasos - i + 8) % 8;
      puntos.push(<circle key={i} cx={176 + Math.cos(a) * 22} cy={150 + Math.sin(a) * 22} r={4.6} fill="#F2F2F2" opacity={Math.max(0.15, 1 - edad * 0.12)} />);
    }
    return (
      <>
        <defs>
          <Lineal id={`${id}-traje`} paradas={[[0, '#141414'], [0.3, '#2E2E2E'], [0.55, '#1C1C1C'], [0.8, '#2A2A2A'], [1, '#101010']]} />
          <Lineal id={`${id}-carcasa`} x2={0} y2={1} paradas={[[0, '#ECEAE4'], [0.6, '#CFCCC4'], [1, '#A8A59D']]} />
          <Lineal id={`${id}-trasera`} paradas={[[0, '#8E8B84'], [1, '#C2BFB8']]} />
          <Radial id={`${id}-pantalla`} cx={0.45} cy={0.42} r={0.7} paradas={[[0, '#2C2C2C'], [0.7, '#141414'], [1, '#0A0A0A']]} />
        </defs>
        {/* El traje: hombros, solapas, camisa blanca y corbata. */}
        <path d="M 14 480 C 16 400 26 336 70 310 C 106 290 140 280 156 270 L 216 270 C 232 280 268 290 304 310 C 348 336 362 400 366 480 Z" fill={`url(#${id}-traje)`} />
        <path d="M 156 270 L 216 270 L 186 380 Z" fill="#F1F0EC" />
        <path d="M 156 270 L 186 380 L 150 330 L 132 286 Z" fill="#262626" />
        <path d="M 216 270 L 186 380 L 222 330 L 240 286 Z" fill="#262626" />
        <path d="M 178 278 L 194 278 L 198 292 L 192 300 L 200 372 L 186 388 L 172 372 L 180 300 L 174 292 Z" fill="#0E0E0E" />
        {/* El monitor de tubo: la trasera en perspectiva, el marco, la pantalla y su pie. */}
        <polygon points="70,64 40,88 50,212 70,236" fill={`url(#${id}-trasera)`} />
        <rect x={150} y={236} width={60} height={30} fill="#9C998F" />
        <rect x={130} y={256} width={100} height={14} rx={4} fill="#B9B6AE" />
        <rect x={70} y={60} width={220} height={180} rx={18} fill={`url(#${id}-carcasa)`} />
        <rect x={92} y={80} width={168} height={132} rx={14} fill={`url(#${id}-pantalla)`} stroke="#8F8C84" strokeWidth={3} />
        {puntos}
        <circle cx={268} cy={226} r={4} fill="#7A776F" />
        <circle cx={254} cy={226} r={4} fill="#7A776F" />
        <path d="M 102 92 Q 140 84 176 86" stroke="#FFFFFF" strokeWidth={3} opacity={0.18} fill="none" />
      </>
    );
  },
};

const chincheta: Dibujo = {
  w: 130,
  h: 210,
  pintar: ({ id, p }) => {
    const c = p.acento;
    const oscuro = mezcla(c, '#000000', 0.45);
    const claro = mezcla(c, '#FFFFFF', 0.5);
    return (
      <>
        <defs>
          <Lineal id={`${id}-cuerpo`} paradas={[[0, oscuro], [0.25, c], [0.4, claro], [0.55, c], [1, oscuro]]} />
          <Lineal id={`${id}-tapa`} paradas={[[0, c], [0.4, claro], [1, c]]} />
          <Lineal id={`${id}-aguja`} paradas={[[0, '#6A6A6A'], [0.5, '#E2E2E2'], [1, '#6A6A6A']]} />
        </defs>
        <path d="M 62 132 L 68 132 L 66 206 L 64 206 Z" fill={`url(#${id}-aguja)`} />
        <path d="M 20 112 L 20 124 A 45 13 0 0 0 110 124 L 110 112 Z" fill={`url(#${id}-cuerpo)`} />
        <ellipse cx={65} cy={112} rx={45} ry={13} fill={`url(#${id}-tapa)`} />
        <path d="M 44 46 C 46 70 50 88 42 112 L 88 112 C 80 88 84 70 86 46 Z" fill={`url(#${id}-cuerpo)`} />
        <path d="M 28 26 L 28 42 A 37 11 0 0 0 102 42 L 102 26 Z" fill={`url(#${id}-cuerpo)`} />
        <ellipse cx={65} cy={26} rx={37} ry={11} fill={`url(#${id}-tapa)`} />
        <ellipse cx={52} cy={24} rx={12} ry={3.5} fill="#FFFFFF" opacity={0.55} />
      </>
    );
  },
};

export const OBJETOS_DIBUJADOS = { balanza, barco, reina, peon, engranaje, lupa, llave, bombilla, reloj_arena: relojArena, escalera, brujula, rompecabezas, caminante, cayendo, columna, monitor, chincheta } as const;

// ---------------------------------------------------------------------------------------------------------------------
// Colocar un dibujo.

export interface Caja {
  /** Centro y medidas. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Dónde queda un dibujo de proporción `w × h` dentro de una caja, sin deformarse: alineado abajo o al centro. */
export function encajar(w: number, h: number, caja: Caja, alinear: 'centro' | 'abajo' = 'centro'): { readonly x: number; readonly y: number; readonly w: number; readonly h: number } {
  const k = Math.min(caja.w / w, caja.h / h);
  const ww = w * k;
  const hh = h * k;
  return { x: caja.x - ww / 2, y: alinear === 'abajo' ? caja.y + caja.h / 2 - hh : caja.y - hh / 2, w: ww, h: hh };
}

/** Un dibujo del catálogo en el rectángulo dado (esquina y medidas), con su filtro y su estilo. */
export function PintaDibujo({ dibujo, x, y, w, h, id, paleta = PALETA_NEUTRA, t = 0, filtro, estilo, espejo }: { readonly dibujo: Dibujo; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly id: string; readonly paleta?: Paleta; readonly t?: number; readonly filtro?: string; readonly estilo?: CSSProperties; readonly espejo?: boolean }): ReactNode {
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${dibujo.w} ${dibujo.h}`}
      style={{ position: 'absolute', left: x, top: y, overflow: 'visible', filter: filtro, transform: espejo ? 'scaleX(-1)' : undefined, ...estilo }}
    >
      {dibujo.pintar({ id, p: paleta, t })}
    </svg>
  );
}

