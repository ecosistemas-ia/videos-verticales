// Las figuras dibujadas con código:
//   - PersonajePixel: un personaje pixel propio (cabecita redonda con antena, dos ojos y dos pies, en una retícula de
//     12 × 10 píxeles), en el color de acento, con borde blanco de pegatina y la sombra grande;
//   - Destello: una forma propia de 11 rayos redondeados de largos distintos, en el color de acento;
//   - Estrella4: la estrella de cuatro puntas negra de las listas;
//   - GrillaCruces: la retícula local de cruces «+» detrás del objeto, que se desvanece hacia los bordes;
//   - Icono: un glifo de Phosphor (iconos.ts).

import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import { ICONOS, type NombreIcono } from './iconos.ts';
import { sombraFiltro } from './movimientos.ts';

/** La silueta: X lleno, O ojo, . vacío. 12 columnas × 10 filas. */
const MAPA = [
  '.....XX.....',
  '......X.....',
  '...XXXXXX...',
  '..XXXXXXXX..',
  '.XXXXXXXXXX.',
  '.XXOXXXXOXX.',
  '.XXXXXXXXXX.',
  '..XXXXXXXX..',
  '...XXXXXX...',
  '..XXX..XXX..',
] as const;
const COLUMNAS = 12;
const FILAS = MAPA.length;

/** Alto / ancho del personaje, para maquetar. */
export const PROPORCION_PERSONAJE = (FILAS + 1.1) / (COLUMNAS + 1.1);

export function PersonajePixel({ ancho, color, ojos = '#141414', sombra = true, parpadeo = 0 }: { readonly ancho: number; readonly color: string; readonly ojos?: string; readonly sombra?: boolean; readonly parpadeo?: number }): ReactNode {
  const p = ancho / (COLUMNAS + 1.4);
  const borde = p * 0.55;
  const w = COLUMNAS * p + 2 * borde;
  const h = FILAS * p + 2 * borde;
  const llenos: { x: number; y: number; ojo: boolean }[] = [];
  MAPA.forEach((fila, r) =>
    [...fila].forEach((c, k) => {
      if (c !== '.') llenos.push({ x: k, y: r, ojo: c === 'O' });
    }),
  );
  return (
    <svg width={w} height={h} viewBox={`${-borde} ${-borde} ${w} ${h}`} style={{ display: 'block', overflow: 'visible', filter: sombra ? sombraFiltro(ancho / 466) : undefined }}>
      {llenos.map((q, i) => (
        <rect key={`b${i}`} x={q.x * p - borde} y={q.y * p - borde} width={p + 2 * borde} height={p + 2 * borde} rx={borde} fill="#FFFFFF" />
      ))}
      {llenos.map((q, i) => (
        <rect key={`p${i}`} x={q.x * p - 0.5} y={q.ojo ? q.y * p - 0.5 + p * parpadeo * 0.45 : q.y * p - 0.5} width={p + 1} height={q.ojo ? (p + 1) * (1 - parpadeo * 0.9) : p + 1} fill={q.ojo ? ojos : color} />
      ))}
      {/* El hueco del ojo que se cierra se rellena con el color del cuerpo. */}
      {parpadeo > 0
        ? llenos
            .filter((q) => q.ojo)
            .map((q, i) => <rect key={`c${i}`} x={q.x * p - 0.5} y={q.y * p - 0.5} width={p + 1} height={(p + 1) * parpadeo * 0.45} fill={color} />)
        : null}
    </svg>
  );
}

/** Los rayos del destello: ángulo (grados) y largo (fracción del radio). */
const RAYOS: readonly (readonly [number, number])[] = [
  [-90, 1],
  [-58, 0.78],
  [-25, 0.95],
  [8, 0.7],
  [38, 0.9],
  [70, 0.74],
  [104, 0.98],
  [138, 0.72],
  [168, 0.88],
  [200, 0.76],
  [232, 0.93],
];

export function Destello({ lado, color, giro = 0, sombra = true }: { readonly lado: number; readonly color: string; readonly giro?: number; readonly sombra?: boolean }): ReactNode {
  const r = lado / 2;
  const grosor = lado * 0.085;
  return (
    <svg width={lado} height={lado} viewBox={`${-r} ${-r} ${lado} ${lado}`} style={{ display: 'block', overflow: 'visible', filter: sombra ? sombraFiltro(lado / 500) : undefined }}>
      <g transform={`rotate(${giro.toFixed(2)})`}>
        <circle r={lado * 0.126} fill={color} />
        {RAYOS.map(([a, l], i) => {
          const rad = (a * Math.PI) / 180;
          return <line key={i} x1={0} y1={0} x2={Math.cos(rad) * (r - grosor / 2) * l} y2={Math.sin(rad) * (r - grosor / 2) * l} stroke={color} strokeWidth={grosor} strokeLinecap="round" />;
        })}
      </g>
    </svg>
  );
}

export function Estrella4({ lado, color = '#000000' }: { readonly lado: number; readonly color?: string }): ReactNode {
  const c = lado / 2;
  const k = lado * 0.09;
  const d = `M ${c} 0 C ${c + k * 0.6} ${c - k * 1.6} ${c + k * 1.6} ${c - k * 0.6} ${lado} ${c} C ${c + k * 1.6} ${c + k * 0.6} ${c + k * 0.6} ${c + k * 1.6} ${c} ${lado} C ${c - k * 0.6} ${c + k * 1.6} ${c - k * 1.6} ${c + k * 0.6} 0 ${c} C ${c - k * 1.6} ${c - k * 0.6} ${c - k * 0.6} ${c - k * 1.6} ${c} 0 Z`;
  return (
    <svg width={lado} height={lado} viewBox={`0 0 ${lado} ${lado}`} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill={color} />
    </svg>
  );
}

/** La retícula local de cruces «+» (cruces de 22 px, trazo 3 px, gris #C3C3C3, paso 90 px), con máscara elíptica. */
export function GrillaCruces({ cx, cy, columnas, filas, paso = 90, cruz = 22, opacidad = 1 }: { readonly cx: number; readonly cy: number; readonly columnas: number; readonly filas: number; readonly paso?: number; readonly cruz?: number; readonly opacidad?: number }): ReactNode {
  const id = useId().replace(/:/g, '');
  const w = columnas * paso;
  const h = filas * paso;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const cruces: ReactNode[] = [];
  for (let r = 0; r < filas; r++)
    for (let c = 0; c < columnas; c++) {
      const x = x0 + paso / 2 + c * paso;
      const y = y0 + paso / 2 + r * paso;
      cruces.push(<path key={`${r}-${c}`} d={`M ${x - cruz / 2} ${y} H ${x + cruz / 2} M ${x} ${y - cruz / 2} V ${y + cruz / 2}`} stroke="#C3C3C3" strokeWidth={3} />);
    }
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: opacidad }}>
      <defs>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <mask id={`m${id}`}>
          <rect x={x0} y={y0} width={w} height={h} fill={`url(#g${id})`} />
        </mask>
      </defs>
      <g mask={`url(#m${id})`}>{cruces}</g>
    </svg>
  );
}

export function Icono({ nombre, lado, color, style }: { readonly nombre: NombreIcono; readonly lado: number; readonly color: string; readonly style?: CSSProperties }): ReactNode {
  return (
    <svg width={lado} height={lado} viewBox="0 0 256 256" style={{ display: 'block', overflow: 'visible', ...style }}>
      {ICONOS[nombre].map((d, i) => (
        <path key={i} d={d} fill={color} />
      ))}
    </svg>
  );
}
