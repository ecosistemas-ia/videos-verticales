// Los dibujos a color de los estilos de papel: los símbolos del negocio (el medallón), los productos y las escenas de
// papel recortado que llenan las tarjetas del relato. En MOTION eran fotos (la bolsa de papel kraft, el pan, las manos
// que amasan); aquí son capas de papel con su sombrita, en el color del negocio, sin una sola imagen externa.

import type { ReactNode } from 'react';
import type { NombreSimbolo } from './catalogo.ts';
import { mezcla } from './curvas.ts';
import { Lineal, Radial, curvaPor } from './dibujos.tsx';
import type { Dibujo, Lienzo } from './dibujos.tsx';

// ---------------------------------------------------------------------------------------------------------------------
// Símbolos: dibujados en una caja de 100 × 100, en el color dado (blanco dentro del medallón).

export function Simbolo({ nombre, color }: { readonly nombre: NombreSimbolo; readonly color: string }): ReactNode {
  switch (nombre) {
    case 'espiga': {
      const granos: ReactNode[] = [];
      for (let i = 0; i < 5; i++) {
        const y = 30 + i * 11;
        granos.push(<ellipse key={`i${i}`} cx={43} cy={y} rx={5.2} ry={9} transform={`rotate(-28 43 ${y})`} fill={color} />);
        granos.push(<ellipse key={`d${i}`} cx={57} cy={y} rx={5.2} ry={9} transform={`rotate(28 57 ${y})`} fill={color} />);
      }
      return (
        <g>
          <ellipse cx={50} cy={18} rx={4.6} ry={9} fill={color} />
          {granos}
          <path d="M 50 26 L 50 94" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
        </g>
      );
    }
    case 'taza':
      return (
        <g fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 22 44 L 70 44 L 66 76 Q 64 84 56 84 L 36 84 Q 28 84 26 76 Z" fill={color} />
          <path d="M 70 52 Q 86 52 84 63 Q 82 72 68 72" />
          <path d="M 16 90 L 78 90" />
          <path d="M 36 34 Q 30 26 36 18 M 50 34 Q 44 24 50 14 M 62 34 Q 56 26 62 18" strokeWidth={3.6} />
        </g>
      );
    case 'libro':
      return (
        <g fill={color}>
          <path d="M 48 30 Q 30 20 12 24 L 12 78 Q 30 74 48 84 Z" />
          <path d="M 52 30 Q 70 20 88 24 L 88 78 Q 70 74 52 84 Z" />
        </g>
      );
    case 'flor':
      return (
        <g fill={color}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={50} cy={30} rx={12} ry={20} transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx={50} cy={50} r={9} fill="none" stroke={color} strokeWidth={0} />
        </g>
      );
    case 'tijeras':
      return (
        <g fill="none" stroke={color} strokeWidth={5.5} strokeLinecap="round">
          <circle cx={30} cy={74} r={11} />
          <circle cx={70} cy={74} r={11} />
          <path d="M 38 66 L 72 14 M 62 66 L 28 14" />
        </g>
      );
    case 'hoja':
      return (
        <g>
          <path d="M 50 10 C 82 30 82 70 50 92 C 18 70 18 30 50 10 Z" fill={color} />
          <path d="M 50 22 L 50 88" stroke="#000000" strokeOpacity={0.18} strokeWidth={3} />
        </g>
      );
  }
}

/** El medallón del negocio: un disco en su color con el símbolo en blanco y un anillo fino. */
export function Medallon({ cx, cy, r, color, simbolo, claro = '#FFFFFF' }: { readonly cx: number; readonly cy: number; readonly r: number; readonly color: string; readonly simbolo: NombreSimbolo; readonly claro?: string }): ReactNode {
  const k = (r * 1.25) / 100;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={claro} strokeOpacity={0.55} strokeWidth={r * 0.035} />
      <g transform={`translate(${cx - 50 * k} ${cy - 50 * k}) scale(${k})`}>
        <Simbolo nombre={simbolo} color={claro} />
      </g>
    </g>
  );
}

/** El nombre del negocio, en cursiva con serifa, centrado y encogido si no cabe. */
function Nombre({ x, y, texto, cuerpo, color, letra, anchoMax }: { readonly x: number; readonly y: number; readonly texto: string; readonly cuerpo: number; readonly color: string; readonly letra: string; readonly anchoMax: number }): ReactNode {
  if (texto === '') return null;
  const estimado = texto.length * cuerpo * 0.5;
  const c = estimado > anchoMax ? (cuerpo * anchoMax) / estimado : cuerpo;
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily={`"${letra}", Georgia, serif`} fontSize={c} fontWeight={600} fill={color}>
      {texto}
    </text>
  );
}

/** Una sombrita de papel recortado para cada capa. */
function SombraPapel({ id, fuerza = 0.2, d = 4 }: { readonly id: string; readonly fuerza?: number; readonly d?: number }): ReactNode {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx={0} dy={d} stdDeviation={d * 0.9} floodColor="#000000" floodOpacity={fuerza} />
    </filter>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Productos.

const KRAFT: readonly (readonly [number, string])[] = [
  [0, '#A9824F'],
  [0.12, '#C49A64'],
  [0.45, '#D2AA74'],
  [0.7, '#C79E68'],
  [0.9, '#B48A55'],
  [1, '#9E7746'],
];

const bolsa: Dibujo = {
  w: 240,
  h: 430,
  pintar: ({ id, p }: Lienzo) => (
    <>
      <defs>
        <Lineal id={`${id}-kraft`} paradas={KRAFT} />
        <Lineal id={`${id}-pliegue`} x2={0} y2={1} paradas={[[0, '#000000', 0.16], [1, '#000000', 0]]} />
        <Lineal id={`${id}-pinza`} x2={0} y2={1} paradas={[[0, '#2A2A2A'], [0.5, '#0C0C0C'], [1, '#1C1C1C']]} />
        <filter id={`${id}-fibra`} x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency="0.55 0.08" numOctaves={2} seed={3} result="r" />
          <feColorMatrix in="r" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" result="vetas" />
          <feComposite in="vetas" in2="SourceGraphic" operator="in" result="dentro" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="dentro" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id}-fibra)`}>
        {/* El cuerpo, con el fondo plegado abajo y el borde de arriba en dientes de sierra. */}
        <path d={`M 8 22 ${Array.from({ length: 16 }, (_, i) => `L ${8 + (i + 0.5) * 14} ${i % 2 === 0 ? 16 : 22}`).join(' ')} L 232 22 L 232 416 L 8 416 Z`} fill={`url(#${id}-kraft)`} />
        <rect x={8} y={22} width={224} height={30} fill={`url(#${id}-pliegue)`} />
        <path d="M 8 52 L 232 52" stroke="#8C6838" strokeOpacity={0.35} strokeWidth={1.4} />
        <path d="M 8 360 L 232 360 M 8 360 L 40 416 M 232 360 L 200 416" stroke="#8C6838" strokeOpacity={0.3} strokeWidth={1.4} fill="none" />
        <path d="M 30 52 L 30 360 M 210 52 L 210 360" stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={6} />
      </g>
      {/* La pinza negra de arriba. */}
      <rect x={100} y={6} width={40} height={24} rx={3} fill={`url(#${id}-pinza)`} />
      <path d="M 108 30 Q 104 50 120 52 Q 136 50 132 30" fill="none" stroke="#9A9A9A" strokeWidth={2.4} />
      <Medallon cx={120} cy={196} r={50} color={p.acento} simbolo={p.simbolo} />
      <Nombre x={120} y={286} texto={p.nombre} cuerpo={30} color={p.acento} letra={p.letra} anchoMax={196} />
    </>
  ),
};

const taza: Dibujo = {
  w: 320,
  h: 300,
  pintar: ({ id, p, t }: Lienzo) => {
    const vapor = (dx: number, fase: number): ReactNode => {
      const s = Math.sin(t * 1.6 + fase) * 6;
      return <path key={dx} d={`M ${140 + dx} 70 C ${128 + dx + s} 52 ${152 + dx - s} 38 ${140 + dx} 16`} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.55 + 0.25 * Math.sin(t * 2 + fase)} />;
    };
    return (
      <>
        <defs>
          <Lineal id={`${id}-loza`} paradas={[[0, '#CFCBC4'], [0.25, '#FBFAF7'], [0.55, '#F2EFE9'], [1, '#B9B4AC']]} />
          <Radial id={`${id}-plato`} cx={0.5} cy={0.45} r={0.6} paradas={[[0, '#FFFFFF'], [0.75, '#EEEAE3'], [1, '#C9C4BB']]} />
          <Radial id={`${id}-cafe`} cx={0.5} cy={0.5} r={0.5} paradas={[[0, '#7A4A2A'], [0.8, '#4E2C17'], [1, '#3A2010']]} />
        </defs>
        <ellipse cx={150} cy={262} rx={146} ry={34} fill={`url(#${id}-plato)`} />
        <ellipse cx={150} cy={258} rx={96} ry={18} fill="#000000" opacity={0.08} />
        {/* El asa y el cuerpo. */}
        <path d="M 236 128 C 300 124 300 210 228 206" fill="none" stroke={`url(#${id}-loza)`} strokeWidth={20} strokeLinecap="round" />
        <path d="M 48 92 L 252 92 C 252 170 236 238 182 252 L 118 252 C 64 238 48 170 48 92 Z" fill={`url(#${id}-loza)`} />
        <rect x={50} y={118} width={200} height={26} fill={p.acento} opacity={0.92} />
        <ellipse cx={150} cy={92} rx={102} ry={22} fill="#EDE9E2" />
        <ellipse cx={150} cy={94} rx={90} ry={17} fill={`url(#${id}-cafe)`} />
        <Medallon cx={150} cy={190} r={34} color={p.acento} simbolo={p.simbolo} />
        {vapor(-28, 0)}
        {vapor(0, 1.7)}
        {vapor(28, 3.1)}
      </>
    );
  },
};

const hogaza: Dibujo = {
  w: 380,
  h: 250,
  pintar: ({ id }: Lienzo) => (
    <>
      <defs>
        <Radial id={`${id}-corteza`} cx={0.42} cy={0.32} r={0.75} paradas={[[0, '#E9C58E'], [0.35, '#D29A55'], [0.7, '#A86A2E'], [1, '#6E4019']]} />
        <filter id={`${id}-miga`} x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves={3} seed={11} result="r" />
          <feColorMatrix in="r" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0  0 0 0 0.45 -0.08" result="manchas" />
          <feComposite in="manchas" in2="SourceGraphic" operator="in" result="dentro" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="dentro" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx={190} cy={232} rx={170} ry={14} fill="#000000" opacity={0.18} />
      <path d={curvaPor([[20, 200], [40, 96], [130, 36], [250, 36], [340, 96], [360, 200], [300, 232], [80, 232]], true)} fill={`url(#${id}-corteza)`} filter={`url(#${id}-miga)`} />
      {/* Los cortes del panadero, con la miga clara asomando. */}
      {[0, 1, 2].map((i) => {
        const x = 120 + i * 70;
        return <path key={i} d={`M ${x - 46} ${150 - i * 4} Q ${x} ${70 - i * 6} ${x + 46} ${112 - i * 8}`} stroke="#F3DDB4" strokeWidth={13} strokeLinecap="round" fill="none" opacity={0.95} />;
      })}
      <path d="M 70 92 Q 120 60 170 56" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={8} strokeLinecap="round" fill="none" />
      <path d="M 60 120 L 64 116 M 300 90 L 306 94 M 250 70 L 255 66 M 110 170 L 116 172" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
    </>
  ),
};

const croissant: Dibujo = {
  w: 380,
  h: 220,
  pintar: ({ id }: Lienzo) => {
    const tramos: ReactNode[] = [];
    // Siete gajos en abanico, el central el más gordo.
    for (let i = 0; i < 7; i++) {
      const q = (i - 3) / 3;
      const a = q * 62;
      const largo = 96 - Math.abs(q) * 30;
      const ancho = 44 - Math.abs(q) * 18;
      tramos.push(
        <g key={i} transform={`rotate(${a} 190 210)`}>
          <ellipse cx={190} cy={210 - largo} rx={ancho} ry={largo * 0.58} fill={`url(#${id}-dorado)`} />
          <path d={`M ${190 - ancho * 0.7} ${210 - largo * 1.05} Q 190 ${210 - largo * 1.25} ${190 + ancho * 0.7} ${210 - largo * 1.05}`} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>,
      );
    }
    const orden = [0, 6, 1, 5, 2, 4, 3];
    return (
      <>
        <defs>
          <Radial id={`${id}-dorado`} cx={0.45} cy={0.3} r={0.75} paradas={[[0, '#F2C47A'], [0.5, '#D68F3C'], [1, '#8F4F17']]} />
        </defs>
        <ellipse cx={190} cy={206} rx={170} ry={12} fill="#000000" opacity={0.16} />
        {orden.map((i) => tramos[i])}
      </>
    );
  },
};

const frasco: Dibujo = {
  w: 230,
  h: 320,
  pintar: ({ id, p }: Lienzo) => {
    const dulce = mezcla(p.acento, '#5A1A08', 0.25);
    return (
      <>
        <defs>
          <Lineal id={`${id}-vidrio`} paradas={[[0, '#FFFFFF', 0.25], [0.15, '#FFFFFF', 0.65], [0.3, '#FFFFFF', 0.1], [0.85, '#FFFFFF', 0.08], [1, '#FFFFFF', 0.4]]} />
          <Lineal id={`${id}-tapa`} paradas={[[0, mezcla(p.acento, '#000000', 0.4)], [0.35, mezcla(p.acento, '#FFFFFF', 0.25)], [1, mezcla(p.acento, '#000000', 0.45)]]} />
          <Lineal id={`${id}-dulce`} x2={0} y2={1} paradas={[[0, mezcla(dulce, '#FFFFFF', 0.15)], [1, mezcla(dulce, '#000000', 0.35)]]} />
        </defs>
        <ellipse cx={115} cy={308} rx={98} ry={10} fill="#000000" opacity={0.16} />
        <path d="M 30 80 Q 18 92 18 120 L 18 280 Q 18 306 46 306 L 184 306 Q 212 306 212 280 L 212 120 Q 212 92 200 80 Z" fill={`url(#${id}-dulce)`} />
        <path d="M 30 80 Q 18 92 18 120 L 18 280 Q 18 306 46 306 L 184 306 Q 212 306 212 280 L 212 120 Q 212 92 200 80 Z" fill={`url(#${id}-vidrio)`} />
        <rect x={34} y={150} width={162} height={110} rx={8} fill="#F7F1E6" />
        <Medallon cx={115} cy={190} r={26} color={p.acento} simbolo={p.simbolo} />
        <Nombre x={115} y={244} texto={p.nombre} cuerpo={22} color={p.acento} letra={p.letra} anchoMax={146} />
        <rect x={26} y={30} width={178} height={54} rx={10} fill={`url(#${id}-tapa)`} />
        {[42, 56, 70].map((y) => (
          <path key={y} d={`M 28 ${y} L 202 ${y}`} stroke="#000000" strokeOpacity={0.15} strokeWidth={2} />
        ))}
      </>
    );
  },
};

const caja: Dibujo = {
  w: 360,
  h: 300,
  pintar: ({ id, p }: Lienzo) => {
    const frente = mezcla(p.acento, '#FFFFFF', 0.08);
    const lado = mezcla(p.acento, '#000000', 0.28);
    const tapa = mezcla(p.acento, '#FFFFFF', 0.22);
    return (
      <>
        <defs>
          <Lineal id={`${id}-cordel`} paradas={[[0, '#F2EBDD'], [1, '#D9CDB6']]} />
        </defs>
        <ellipse cx={180} cy={290} rx={170} ry={10} fill="#000000" opacity={0.18} />
        <polygon points="20,110 270,110 270,286 20,286" fill={frente} />
        <polygon points="270,110 340,74 340,250 270,286" fill={lado} />
        <polygon points="20,110 90,74 340,74 270,110" fill={tapa} />
        {/* El cordel atado y el lazo. */}
        <path d="M 145 110 L 145 286 M 215 74 L 145 110 M 20 198 L 270 198 L 340 162" stroke={`url(#${id}-cordel)`} strokeWidth={6} fill="none" />
        <path d="M 180 92 C 150 70 140 100 178 94 C 212 104 214 70 182 92" stroke="#F2EBDD" strokeWidth={6} fill="none" />
        <circle cx={145} cy={198} r={44} fill="#F7F1E6" />
        <Medallon cx={145} cy={198} r={36} color={p.acento} simbolo={p.simbolo} />
      </>
    );
  },
};

export const PRODUCTOS_DIBUJADOS = { bolsa, taza, hogaza, croissant, frasco, caja } as const;

// ---------------------------------------------------------------------------------------------------------------------
// Escenas de papel recortado (600 × 800): llenan una tarjeta del relato. Capas planas con su sombrita.

const ESC_W = 600;
const ESC_H = 800;

const amanecer: Dibujo = {
  w: ESC_W,
  h: ESC_H,
  pintar: ({ id, p, t }: Lienzo) => {
    const sol = Math.max(0, Math.min(1, t / 2.4));
    const ySol = 470 - 120 * (1 - Math.pow(1 - sol, 3));
    const fondo = mezcla(p.claro, '#F6C9A0', 0.55);
    return (
      <>
        <defs>
          <Lineal id={`${id}-cielo`} x2={0} y2={1} paradas={[[0, mezcla(fondo, '#7FA3C4', 0.35)], [0.55, fondo], [1, mezcla(fondo, '#FFE6B0', 0.6)]]} />
          <SombraPapel id={`${id}-s`} />
        </defs>
        <rect width={ESC_W} height={ESC_H} fill={`url(#${id}-cielo)`} />
        <circle cx={300} cy={ySol} r={110} fill="#FFD27A" opacity={0.35} />
        <circle cx={300} cy={ySol} r={78} fill="#FFC45C" filter={`url(#${id}-s)`} />
        <g filter={`url(#${id}-s)`}>
          <path d="M 0 480 L 0 410 L 70 410 L 70 360 L 150 360 L 150 430 L 230 430 L 230 380 L 300 340 L 370 380 L 370 450 L 460 450 L 460 370 L 540 370 L 540 420 L 600 420 L 600 480 Z" fill={mezcla(p.acento, '#6B5A6E', 0.6)} opacity={0.75} />
        </g>
        <g filter={`url(#${id}-s)`}>
          <path d="M 0 560 L 0 470 L 110 470 L 110 430 L 200 430 L 200 500 L 330 500 L 330 450 L 420 450 L 420 500 L 520 500 L 520 460 L 600 460 L 600 560 Z" fill={mezcla(p.acento, '#3A2E3A', 0.55)} />
          {/* La ventana encendida del obrador. */}
          <rect x={240} y={520} width={56} height={30} fill="#FFD789" />
        </g>
        <g filter={`url(#${id}-s)`}>
          <rect y={560} width={ESC_W} height={240} fill={mezcla(p.claro, '#8C7A6B', 0.5)} />
          <path d="M 300 560 L 180 800 L 420 800 Z" fill={mezcla(p.claro, '#B9A894', 0.5)} />
        </g>
      </>
    );
  },
};

const fachada: Dibujo = {
  w: ESC_W,
  h: ESC_H,
  pintar: ({ id, p }: Lienzo) => {
    const rayas: ReactNode[] = [];
    for (let i = 0; i < 8; i++) {
      rayas.push(<path key={i} d={`M ${60 + i * 60} 300 L ${60 + (i + 1) * 60} 300 L ${60 + (i + 1) * 60 + 6} 380 L ${60 + i * 60 + 6} 380 Z`} fill={i % 2 === 0 ? p.acento : '#F7F2E9'} />);
    }
    const ondas: string[] = [];
    for (let i = 0; i < 8; i++) ondas.push(`Q ${90 + i * 60} 410 ${120 + i * 60 + 6} 380`);
    return (
      <>
        <defs>
          <SombraPapel id={`${id}-s`} />
        </defs>
        <rect width={ESC_W} height={ESC_H} fill={mezcla(p.claro, '#D9CFC3', 0.4)} />
        <rect x={40} y={120} width={520} height={640} fill={mezcla(p.claro, '#EFE6DA', 0.3)} filter={`url(#${id}-s)`} />
        {/* El cartel con el nombre. */}
        <g filter={`url(#${id}-s)`}>
          <rect x={90} y={170} width={420} height={96} rx={6} fill={mezcla(p.acento, '#1C1C1C', 0.55)} />
          <text x={300} y={234} textAnchor="middle" fontFamily={`"${p.letra}", Georgia, serif`} fontSize={p.nombre.length > 14 ? 36 : 48} fontWeight={600} fill="#F7F1E6">
            {p.nombre}
          </text>
        </g>
        {/* El toldo a rayas con su borde ondulado. */}
        <g filter={`url(#${id}-s)`}>
          {rayas}
          <path d={`M 60 380 ${ondas.join(' ')} L 546 380 Z`} fill={p.acento} />
        </g>
        {/* El escaparate con panes y la puerta. */}
        <g filter={`url(#${id}-s)`}>
          <rect x={80} y={430} width={270} height={250} fill="#F9E7C6" />
          <rect x={380} y={430} width={140} height={330} fill={mezcla(p.acento, '#3A2A22', 0.5)} />
          <circle cx={500} cy={600} r={7} fill="#E9D7B0" />
        </g>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={135 + i * 80} cy={560} rx={34} ry={22} fill={['#C88A44', '#D9A35E', '#B87A38'][i]} filter={`url(#${id}-s)`} />
        ))}
        <rect x={100} y={600} width={230} height={10} fill="#C9B79A" />
        <rect x={80} y={430} width={270} height={250} fill="none" stroke={mezcla(p.acento, '#3A2A22', 0.5)} strokeWidth={10} />
      </>
    );
  },
};

const mesa: Dibujo = {
  w: ESC_W,
  h: ESC_H,
  pintar: ({ id, p, t }: Lienzo) => (
    <>
      <defs>
        <SombraPapel id={`${id}-s`} d={6} />
        <Lineal id={`${id}-madera`} x2={0} y2={1} paradas={[[0, '#B88A5C'], [1, '#8C6340']]} />
      </defs>
      <rect width={ESC_W} height={ESC_H} fill={`url(#${id}-madera)`} />
      {[120, 270, 430, 590].map((y) => (
        <path key={y} d={`M 0 ${y} L 600 ${y + 8}`} stroke="#6E4A2C" strokeOpacity={0.4} strokeWidth={3} />
      ))}
      {/* Un mantel en el color del negocio, la taza vista desde arriba y el pan en su tabla. */}
      <rect x={60} y={90} width={480} height={620} rx={10} fill={mezcla(p.acento, '#FFFFFF', 0.75)} filter={`url(#${id}-s)`} transform="rotate(-5 300 400)" />
      <g filter={`url(#${id}-s)`}>
        <circle cx={210} cy={250} r={118} fill="#F7F4EE" />
        <circle cx={210} cy={250} r={78} fill="#FBFAF7" />
        <circle cx={210} cy={250} r={58} fill="#5A3319" />
        <path d="M 288 250 L 330 250" stroke="#F7F4EE" strokeWidth={22} strokeLinecap="round" />
        <circle cx={196} cy={238} r={16} fill="#C89A6C" opacity={0.7 + 0.2 * Math.sin(t * 2)} />
      </g>
      <g filter={`url(#${id}-s)`} transform="rotate(8 360 540)">
        <rect x={200} y={430} width={340} height={230} rx={24} fill="#D8B48A" />
        <ellipse cx={370} cy={545} rx={130} ry={74} fill="#C98B47" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${300 + i * 50} ${510 + i * 4} Q ${330 + i * 50} ${540} ${310 + i * 50} ${590}`} stroke="#F2D9AE" strokeWidth={10} strokeLinecap="round" fill="none" />
        ))}
      </g>
    </>
  ),
};

const calendario: Dibujo = {
  w: ESC_W,
  h: ESC_H,
  pintar: ({ id, p }: Lienzo) => {
    const celdas: ReactNode[] = [];
    for (let f = 0; f < 4; f++)
      for (let c = 0; c < 7; c++) {
        const domingo = c === 6;
        celdas.push(<rect key={`${f}-${c}`} x={92 + c * 62} y={460 + f * 62} width={50} height={50} rx={6} fill={domingo ? p.acento : '#E9E3D8'} opacity={domingo ? 0.9 : 1} />);
      }
    return (
      <>
        <defs>
          <SombraPapel id={`${id}-s`} d={6} />
        </defs>
        <rect width={ESC_W} height={ESC_H} fill={mezcla(p.claro, '#D7CEC2', 0.4)} />
        <g filter={`url(#${id}-s)`}>
          <rect x={70} y={90} width={460} height={650} rx={18} fill="#FBF8F2" />
          <rect x={70} y={90} width={460} height={130} rx={18} fill={p.acento} />
          <rect x={70} y={180} width={460} height={40} fill={p.acento} />
        </g>
        {[170, 300, 430].map((x) => (
          <rect key={x} x={x - 8} y={60} width={16} height={60} rx={8} fill="#3A3A3A" />
        ))}
        <text x={300} y={340} textAnchor="middle" fontFamily={`"${p.letra}", Georgia, serif`} fontSize={150} fontWeight={600} fill={mezcla(p.acento, '#1C1C1C', 0.35)}>
          DOM
        </text>
        {celdas}
      </>
    );
  },
};

const reloj: Dibujo = {
  w: ESC_W,
  h: ESC_H,
  pintar: ({ id, p, t }: Lienzo) => {
    // Las agujas llegan a las siete en punto.
    const q = 1 - Math.exp(-t * 2.2);
    const minutos = -40 * (1 - q);
    const aMin = (minutos / 60) * 360;
    const aHora = 210 + aMin / 12;
    const marcas: ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      marcas.push(<line key={i} x1={300 + Math.sin(a) * 160} y1={400 - Math.cos(a) * 160} x2={300 + Math.sin(a) * 186} y2={400 - Math.cos(a) * 186} stroke="#2A2A2A" strokeWidth={i % 3 === 0 ? 10 : 5} strokeLinecap="round" />);
    }
    return (
      <>
        <defs>
          <SombraPapel id={`${id}-s`} d={8} fuerza={0.25} />
        </defs>
        <rect width={ESC_W} height={ESC_H} fill={mezcla(p.claro, '#E3D8C8', 0.35)} />
        <circle cx={300} cy={400} r={230} fill={p.acento} filter={`url(#${id}-s)`} />
        <circle cx={300} cy={400} r={204} fill="#FBF8F2" />
        {marcas}
        <line x1={300} y1={400} x2={300 + Math.sin((aHora * Math.PI) / 180) * 100} y2={400 - Math.cos((aHora * Math.PI) / 180) * 100} stroke="#1C1C1C" strokeWidth={16} strokeLinecap="round" />
        <line x1={300} y1={400} x2={300 + Math.sin((aMin * Math.PI) / 180) * 150} y2={400 - Math.cos((aMin * Math.PI) / 180) * 150} stroke="#1C1C1C" strokeWidth={9} strokeLinecap="round" />
        <circle cx={300} cy={400} r={14} fill={p.acento} />
      </>
    );
  },
};

export const ESCENAS_DIBUJADAS = { amanecer, fachada, mesa, calendario, reloj } as const;
