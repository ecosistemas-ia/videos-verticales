// El papel de los dos estilos, portado de MOTION (foglioCaldo y raccontoPezzi):
//   - VinetaOval: la viñeta ovalada fuerte y quieta encima de todo (surreal: centro intacto, esquinas −40 %). Es un velo
//     que multiplica, así que oscurece también los objetos y los cromados de las esquinas;
//   - FondoTenido: la hoja teñida con el color claro del negocio y su viñeta (relato: esquinas −32 %);
//   - CuadriculaPunteada: la cuadrícula local de trazos detrás de los textos (cuadros de 140 px a 1080, trazos de 17 con
//     huecos de 13, crucecitas en los cruces), un bloque que se desvanece hacia sus bordes;
//   - GranoPapel: la textura del papel, un ruido fino fijo (semilla constante) que se repite en mosaico.
// Dibujo puro (SVG y CSS), sin tiempo.

import type { ReactNode } from 'react';
import { random } from 'remotion';

/** La viñeta ovalada de surreal: un velo que multiplica (blanco en el centro). `fuerza` 1 = el original. */
export function VinetaOval({ ancho, alto, fuerza = 1 }: { readonly ancho: number; readonly alto: number; readonly fuerza?: number }): ReactNode {
  const etapas: readonly [number, number][] = [
    [0, 1],
    [0.38, 0.997],
    [0.52, 0.985],
    [0.62, 0.958],
    [0.707, 0.915],
    [0.8, 0.83],
    [0.9, 0.7],
    [1, 0.58],
  ];
  const paradas = etapas.map(([r, v]) => {
    const g = Math.round(255 * (1 - (1 - v) * fuerza));
    return `rgb(${g},${g},${g}) ${(r * 100).toFixed(1)}%`;
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: ancho,
        height: alto,
        background: `radial-gradient(ellipse farthest-corner at 50% 50%, ${paradas.join(', ')})`,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }}
    />
  );
}

/** La hoja teñida de relato con su viñeta ovalada fuerte (multiplica el color claro del negocio). */
export function FondoTenido({ ancho, alto, claro }: { readonly ancho: number; readonly alto: number; readonly claro: string }): ReactNode {
  const etapas: readonly [number, number][] = [
    [0, 1],
    [0.3, 0.985],
    [0.5, 0.944],
    [0.8, 0.886],
    [1, 0.807],
    [1.2, 0.74],
    [1.414, 0.68],
  ];
  const paradas = etapas.map(([d, v]) => {
    const g = Math.round(255 * v);
    return `rgb(${g},${g},${g}) ${(d * 100).toFixed(1)}%`;
  });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: ancho, height: alto, backgroundColor: claro }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse closest-side at 50% 50%, ${paradas.join(', ')})`, mixBlendMode: 'multiply' }} />
    </div>
  );
}

export interface PropsCuadricula {
  /** Centro del bloque de cuadros, en px del cuadro. */
  readonly cx: number;
  readonly cy: number;
  readonly columnas?: number;
  readonly filas?: number;
  /** Lado del cuadro en px (140 a 1080). */
  readonly lado?: number;
  readonly color?: string;
  readonly colorCruces?: string;
  /** Un nombre único para la máscara SVG. */
  readonly id: string;
}

/** La cuadrícula local de trazos con crucecitas, que se desvanece hacia los bordes del bloque. */
export function CuadriculaPunteada({ cx, cy, columnas = 4, filas = 5, lado = 140, color = '#DCD8D2', colorCruces = '#CFCAC3', id }: PropsCuadricula): ReactNode {
  const w = columnas * lado;
  const h = filas * lado;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const margen = lado * 0.6;
  const lineas: ReactNode[] = [];
  for (let i = 0; i <= columnas; i++) {
    const x = x0 + i * lado;
    lineas.push(<line key={`v${i}`} x1={x} y1={y0 - margen} x2={x} y2={y0 + h + margen} />);
  }
  for (let j = 0; j <= filas; j++) {
    const y = y0 + j * lado;
    lineas.push(<line key={`h${j}`} x1={x0 - margen} y1={y} x2={x0 + w + margen} y2={y} />);
  }
  const cruces: ReactNode[] = [];
  const brazo = lado * 0.09;
  for (let i = 0; i <= columnas; i++)
    for (let j = 0; j <= filas; j++) {
      const x = x0 + i * lado;
      const y = y0 + j * lado;
      cruces.push(<path key={`c${i}-${j}`} d={`M ${x - brazo} ${y} H ${x + brazo} M ${x} ${y - brazo} V ${y + brazo}`} />);
    }
  const rx = w / 2 + margen;
  const ry = h / 2 + margen;
  const r = Math.max(rx, ry);
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
      <defs>
        <radialGradient id={`desv-${id}`} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${cx} ${cy}) scale(${(rx / r).toFixed(4)} ${(ry / r).toFixed(4)}) translate(${-cx} ${-cy})`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.9} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <mask id={`masc-${id}`} maskUnits="userSpaceOnUse" x={x0 - margen * 2} y={y0 - margen * 2} width={w + margen * 4} height={h + margen * 4}>
          <rect x={x0 - margen * 2} y={y0 - margen * 2} width={w + margen * 4} height={h + margen * 4} fill={`url(#desv-${id})`} />
        </mask>
      </defs>
      <g mask={`url(#masc-${id})`}>
        <g stroke={color} strokeWidth={lado * 0.021} strokeDasharray={`${(lado * 0.121).toFixed(1)} ${(lado * 0.093).toFixed(1)}`} fill="none">
          {lineas}
        </g>
        <g stroke={colorCruces} strokeWidth={lado * 0.024} fill="none" strokeLinecap="square">
          {cruces}
        </g>
      </g>
    </svg>
  );
}

let mosaico: string | null = null;

/** Un mosaico de ruido fino de 256 px (semilla fija: el mismo en cada fotograma y en cada equipo). */
function mosaicoRuido(): string {
  if (mosaico !== null) return mosaico;
  if (typeof document === 'undefined') return '';
  const lado = 256;
  const c = document.createElement('canvas');
  c.width = lado;
  c.height = lado;
  const ctx = c.getContext('2d');
  if (ctx === null) return '';
  const img = ctx.createImageData(lado, lado);
  for (let i = 0; i < lado * lado; i++) {
    // Ruido con algo de grumo: la media de dos muestras da fibras suaves, no sal y pimienta.
    const v = (random(`papel-${i}`) + random(`papel-${(i * 7) % (lado * lado)}`)) / 2;
    const g = Math.round(110 + v * 145);
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  mosaico = c.toDataURL('image/png');
  return mosaico;
}

/** La textura del papel: un velo de ruido que multiplica, muy suave. */
export function GranoPapel({ ancho, alto, fuerza = 0.07 }: { readonly ancho: number; readonly alto: number; readonly fuerza?: number }): ReactNode {
  const url = mosaicoRuido();
  if (url === '') return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: ancho,
        height: alto,
        backgroundImage: `url(${url})`,
        backgroundSize: '256px 256px',
        mixBlendMode: 'multiply',
        opacity: fuerza,
        pointerEvents: 'none',
      }}
    />
  );
}
