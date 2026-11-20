// Las piezas de relato, portadas de MOTION (raccontoPezzi, caratteriRacconto):
//   - coloresDelNegocio: la paleta que sale del color del negocio (todo mezclado en OKLab);
//   - Cinta: la cinta del color del negocio que cruza el cuadro siguiendo una curva, con la punta afilada;
//   - CirculoPunteado: el círculo de 78 trazos que se dibuja en el sentido del reloj;
//   - FlorDesenfocada: la flor negra de cinco pétalos, desenfocada, que gira despacio en una esquina;
//   - SimboloDesvaido: el anillo y el símbolo del negocio, enormes y desvaídos, detrás del texto.

import type { ReactNode } from 'react';
import { CURVAS, anima, mezcla } from '../_papel/curvas.ts';
import type { NombreSimbolo } from '../_papel/catalogo.ts';
import { Simbolo } from '../_papel/dibujos_color.tsx';

export interface Colores {
  readonly color: string;
  readonly claro: string;
  readonly nero: string;
  readonly neroSuave: string;
  readonly gris: string;
  readonly titulo: string;
  /** El gris claro con que aparece una línea antes de oscurecerse. */
  readonly entrada: string;
  readonly carta: string;
}

export function coloresDelNegocio(color: string, claro?: string): Colores {
  const cl = claro ?? mezcla('#F3F4F3', color, 0.09);
  return {
    color,
    claro: cl,
    nero: mezcla('#1C1C1C', color, 0.1),
    neroSuave: mezcla('#333333', color, 0.1),
    gris: mezcla('#8A8D8B', color, 0.07),
    titulo: mezcla('#0F0F0F', color, 0.08),
    entrada: mezcla(cl, '#9AA09D', 0.45),
    carta: mezcla(cl, '#FFFFFF', 0.55),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Cinta.

type Punto = readonly [number, number];

/** Muestrea una curva suave que pasa por los puntos (Catmull-Rom) en tramos cortos, con su longitud acumulada. */
function muestrear(puntos: readonly Punto[], porTramo = 24): { readonly p: Punto[]; readonly s: number[] } {
  const n = puntos.length;
  const en = (i: number): Punto => puntos[Math.max(0, Math.min(n - 1, i))];
  const p: Punto[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = en(i - 1);
    const p1 = en(i);
    const p2 = en(i + 1);
    const p3 = en(i + 2);
    for (let k = 0; k < porTramo; k++) {
      const t = k / porTramo;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      p.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  p.push(puntos[n - 1]);
  const s: number[] = [0];
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, s };
}

/**
 * La cinta: un listón del color del negocio que avanza por la curva hasta la cuota `cuota` (0-1), con la punta afilada
 * en los últimos `afilado` px y un brillo suave a lo largo.
 */
export function Cinta({ puntos, cuota, grosor, color, id }: { readonly puntos: readonly Punto[]; readonly cuota: number; readonly grosor: number; readonly color: string; readonly id: string }): ReactNode {
  if (cuota <= 0) return null;
  const { p, s } = muestrear(puntos);
  const total = s[s.length - 1];
  const hasta = total * Math.min(1, cuota);
  const afilado = grosor * 1.6;
  const izq: string[] = [];
  const der: string[] = [];
  for (let i = 0; i < p.length; i++) {
    if (s[i] > hasta) break;
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    // La cinta se retuerce un poco: el ancho respira a lo largo, y en la punta se afila.
    const respira = 0.86 + 0.14 * Math.cos(s[i] / 260);
    const punta = cuota >= 1 ? 1 : Math.min(1, (hasta - s[i]) / afilado);
    const h = (grosor / 2) * respira * Math.sqrt(Math.max(0, punta));
    izq.push(`${(p[i][0] + nx * h).toFixed(1)} ${(p[i][1] + ny * h).toFixed(1)}`);
    der.push(`${(p[i][0] - nx * h).toFixed(1)} ${(p[i][1] - ny * h).toFixed(1)}`);
  }
  if (izq.length < 2) return null;
  const d = `M ${izq.join(' L ')} L ${der.reverse().join(' L ')} Z`;
  const oscuro = mezcla(color, '#000000', 0.18);
  const claro = mezcla(color, '#FFFFFF', 0.12);
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
      <defs>
        <linearGradient id={`${id}-cinta`} x1={0} y1={0} x2={1} y2={1}>
          <stop offset={0} stopColor={oscuro} />
          <stop offset={0.45} stopColor={claro} />
          <stop offset={1} stopColor={color} />
        </linearGradient>
        <filter id={`${id}-sombra`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx={0} dy={6} stdDeviation={7} floodColor="#000000" floodOpacity={0.16} />
        </filter>
      </defs>
      <path d={d} fill={`url(#${id}-cinta)`} filter={`url(#${id}-sombra)`} />
    </svg>
  );
}

/** Cuánto de la cinta se ve: avanza frenando desde `desde` durante `dura` fotogramas. */
export function cuotaCinta(f: number, desde: number, dura: number): number {
  return anima(f, [desde, desde + dura], [0, 1], CURVAS.frena);
}

// ---------------------------------------------------------------------------------------------------------------------
// Círculo punteado.

/** El círculo de 78 trazos que se dibuja en el sentido del reloj desde arriba (q 0-1). */
export function CirculoPunteado({ cx, cy, r, q, color, grosor = 4 }: { readonly cx: number; readonly cy: number; readonly r: number; readonly q: number; readonly color: string; readonly grosor?: number }): ReactNode {
  if (q <= 0) return null;
  const trazos = 78;
  const visibles = Math.ceil(trazos * Math.min(1, q));
  const d: string[] = [];
  for (let i = 0; i < visibles; i++) {
    const a0 = -Math.PI / 2 + (i / trazos) * Math.PI * 2;
    const a1 = a0 + ((Math.PI * 2) / trazos) * 0.55;
    d.push(`M ${(cx + Math.cos(a0) * r).toFixed(1)} ${(cy + Math.sin(a0) * r).toFixed(1)} A ${r} ${r} 0 0 1 ${(cx + Math.cos(a1) * r).toFixed(1)} ${(cy + Math.sin(a1) * r).toFixed(1)}`);
  }
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
      <path d={d.join(' ')} stroke={color} strokeWidth={grosor} fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Flor.

/** La flor negra desenfocada: cinco pétalos en gota alrededor de (cx, cy), girando. */
export function FlorDesenfocada({ cx, cy, r, giro, opacidad, color = '#1C1C1C' }: { readonly cx: number; readonly cy: number; readonly r: number; readonly giro: number; readonly opacidad: number; readonly color?: string }): ReactNode {
  if (opacidad <= 0) return null;
  const petalo = `M 0 ${-r * 0.16} C ${r * 0.2} ${-r * 0.42} ${r * 0.2} ${-r * 0.86} 0 ${-r} C ${-r * 0.2} ${-r * 0.86} ${-r * 0.2} ${-r * 0.42} 0 ${-r * 0.16} Z`;
  return (
    <svg style={{ position: 'absolute', left: cx - r * 1.2, top: cy - r * 1.2, overflow: 'visible', filter: `blur(${(r * 0.035).toFixed(1)}px)`, opacity: opacidad }} width={r * 2.4} height={r * 2.4}>
      <g transform={`translate(${r * 1.2} ${r * 1.2}) rotate(${giro.toFixed(2)})`} fill={color}>
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d={petalo} transform={`rotate(${a})`} />
        ))}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Símbolo desvaído.

/** El anillo grande y, si se pide, el símbolo del negocio en blanco: un relieve apenas visible detrás del texto. */
export function SimboloDesvaido({ cx, cy, r, simbolo, claro, conSimbolo, opacidad = 1 }: { readonly cx: number; readonly cy: number; readonly r: number; readonly simbolo: NombreSimbolo; readonly claro: string; readonly conSimbolo: boolean; readonly opacidad?: number }): ReactNode {
  const lado = r * 1.25;
  const anillo = mezcla(claro, '#FFFFFF', 0.55);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: opacidad }}>
      <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
        <circle cx={cx} cy={cy + 5} r={r} fill="none" stroke="#000000" strokeOpacity={0.05} strokeWidth={r * 0.06} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={anillo} strokeOpacity={0.75} strokeWidth={r * 0.06} />
        {conSimbolo ? (
          <>
            <g transform={`translate(${cx - lado / 2} ${cy - lado / 2 + 6}) scale(${lado / 100})`} opacity={0.075}>
              <Simbolo nombre={simbolo} color="#000000" />
            </g>
            <g transform={`translate(${cx - lado / 2} ${cy - lado / 2}) scale(${lado / 100})`} opacity={0.55}>
              <Simbolo nombre={simbolo} color={anillo} />
            </g>
          </>
        ) : null}
      </svg>
    </div>
  );
}
