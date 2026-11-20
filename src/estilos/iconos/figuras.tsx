// Las figuras, dibujadas con código en SVG en el estilo plano del original (acento, azul y blanco, con rendijas
// oscuras). Portadas de MOTION (plantilla M3, figure.tsx):
//   - bombilla: cabeza de bombilla con reflejo y 9 rayos, saco azul, camisa blanca y corbata roja;
//   - persona: glifo rojo con la línea del pelo, cuello y brazos; sombra en el suelo;
//   - grupo, megafono, portatil, duda: en el mismo estilo.
// Además, cualquier ícono de Phosphor puede ser la figura: se dibuja grande en el color de acento con un trazo claro.
// Cada figura tiene su cuadro en px del original con los pies abajo al centro: el estilo la posa con (x, pies, escala).

import type { ReactNode } from 'react';
import { mezclarColores } from './curvas.ts';
import type { Colores } from './diseno.ts';
import { Icono, type Iconos } from './Icono.tsx';
import { FIGURAS_DIBUJADAS, type FiguraDibujada } from './reglas.ts';

/** El cuadro de cada figura en px del original (ancho, alto) y la altura de la cabeza (para las burbujas). */
const CUADROS: { readonly [f in FiguraDibujada | 'icono']: { readonly w: number; readonly h: number; readonly cabeza: number } } = {
  bombilla: { w: 200, h: 250, cabeza: 112 },
  persona: { w: 200, h: 250, cabeza: 62 },
  grupo: { w: 300, h: 250, cabeza: 70 },
  megafono: { w: 240, h: 200, cabeza: 80 },
  portatil: { w: 260, h: 200, cabeza: 70 },
  duda: { w: 220, h: 250, cabeza: 62 },
  icono: { w: 230, h: 230, cabeza: 60 },
};

export function esDibujada(figura: string): figura is FiguraDibujada {
  return (FIGURAS_DIBUJADAS as readonly string[]).includes(figura);
}

export function cuadro(figura: string): { readonly w: number; readonly h: number; readonly cabeza: number } {
  return esDibujada(figura) ? CUADROS[figura] : CUADROS.icono;
}

/** Las rendijas oscuras dentro de las figuras: el acento casi negro. */
function rendija(acento: string): string {
  return mezclarColores(acento, '#000000', 0.86);
}

function Persona({ color, x = 100, escala = 1 }: { color: string; x?: number; escala?: number }): ReactNode {
  const oscuro = rendija(color);
  return (
    <g transform={`translate(${x} 250) scale(${escala}) translate(-100 -250)`}>
      <path d="M54,46 A46,46 0 0 1 146,46 L146,90 C146,111 126,123 100,123 C74,123 54,111 54,90 Z" fill={color} />
      <path d="M80,112 L120,112 L120,146 L80,146 Z" fill={color} />
      <path d="M18,250 L18,206 C18,166 46,146 80,142 L120,142 C154,146 182,166 182,206 L182,250 Z" fill={color} />
      <path d="M51,47 C68,35 84,53 100,46 C116,39 132,34 149,43" fill="none" stroke={oscuro} strokeWidth={6} strokeLinecap="round" />
      <path d="M77,142 C83,161 117,161 123,142" fill="none" stroke={oscuro} strokeWidth={6} strokeLinecap="round" />
      <path d="M50,203 L50,250 M150,203 L150,250" fill="none" stroke={oscuro} strokeWidth={6} strokeLinecap="round" />
    </g>
  );
}

function Bombilla({ c }: { c: Colores }): ReactNode {
  const cx = 100;
  const cy = 112;
  const rayos = [0, 31, -31, 62, -62, 93, -93, 124, -124];
  return (
    <g>
      {rayos.map((a) => {
        const r = (a * Math.PI) / 180;
        const s = Math.sin(r);
        const co = -Math.cos(r);
        return <line key={a} x1={cx + 68 * s} y1={cy + 68 * co} x2={cx + 88 * s} y2={cy + 88 * co} stroke={c.acento} strokeWidth={8} strokeLinecap="round" />;
      })}
      <path d="M22,250 L22,224 C22,203 42,192 72,188 L128,188 C158,192 178,203 178,224 L178,250 Z" fill={c.azul} />
      <path d="M74,188 L100,238 L126,188 Z" fill="#EEF1F4" />
      <path d="M72,188 L98,189 L86,207 Z M128,188 L102,189 L114,207 Z" fill="#C9CFD6" />
      <path d="M93,192 L107,192 L104,203 L96,203 Z" fill={mezclarColores(c.acento, '#000000', 0.4)} />
      <path d="M96,203 L104,203 L110,238 L100,249 L90,238 Z" fill={mezclarColores(c.acento, '#000000', 0.12)} />
      <path d="M62,140 L138,140 C132,160 124,170 122,191 L78,191 C76,170 68,160 62,140 Z" fill={c.acento} />
      <circle cx={cx} cy={cy} r={55} fill={c.acento} />
      <path d="M106,73 A40,40 0 0 1 139,106" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
    </g>
  );
}

function Grupo({ c }: { c: Colores }): ReactNode {
  return (
    <g>
      <Persona color={c.azul} x={78} escala={0.8} />
      <Persona color={c.azul} x={222} escala={0.8} />
      <Persona color={c.acento} x={150} />
    </g>
  );
}

function Megafono({ c }: { c: Colores }): ReactNode {
  return (
    <g transform="rotate(-14 120 120)">
      <path d="M38,98 L98,86 L98,150 L38,138 Z" fill={c.azul} />
      <path d="M98,86 L176,46 L176,190 L98,150 Z" fill={c.acento} />
      <ellipse cx={176} cy={118} rx={14} ry={72} fill={mezclarColores(c.acento, '#000000', 0.25)} />
      <path d="M60,138 L74,140 L80,184 L64,186 Z" fill={c.azul} />
      <rect x={24} y={102} width={16} height={32} rx={5} fill="#C9CFD6" />
      <path d="M200,92 C210,104 210,132 200,144 M214,76 C232,98 232,138 214,160 M228,60 C254,92 254,144 228,176" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
    </g>
  );
}

function Portatil({ c }: { c: Colores }): ReactNode {
  return (
    <g>
      <rect x={42} y={36} width={176} height={118} rx={10} fill={c.azul} />
      <rect x={54} y={48} width={152} height={94} rx={4} fill="#1C2733" />
      <rect x={72} y={104} width={20} height={28} rx={3} fill={c.acento} />
      <rect x={102} y={86} width={20} height={46} rx={3} fill={c.acento} />
      <rect x={132} y={70} width={20} height={62} rx={3} fill="#FFFFFF" />
      <rect x={162} y={92} width={20} height={40} rx={3} fill={c.acento} />
      <path d="M18,160 L242,160 L228,186 L32,186 Z" fill="#C9CFD6" />
      <rect x={110} y={164} width={40} height={6} rx={3} fill="#9AA3AD" />
    </g>
  );
}

function Duda({ c }: { c: Colores }): ReactNode {
  return (
    <g>
      <Persona color={c.acento} x={100} />
      <g transform="translate(176 46)">
        <circle cx={0} cy={0} r={30} fill="#FFFFFF" />
        <path d="M-10,-8 C-10,-20 10,-22 10,-8 C10,2 0,3 0,12" fill="none" stroke="#111111" strokeWidth={7} strokeLinecap="round" />
        <circle cx={0} cy={22} r={4} fill="#111111" />
      </g>
    </g>
  );
}

export interface PropsFigura {
  readonly figura: string;
  readonly colores: Colores;
  readonly iconos: Iconos;
  /** Punto de abajo al centro (los pies) en px del cuadro y escala (px del original → px del cuadro). */
  readonly x: number;
  readonly pies: number;
  readonly escala: number;
  /** Opacidad de la sombra en el suelo (0 mientras llega, 1 cuando se posó). */
  readonly sombra: number;
  readonly escalaExtra?: number;
  readonly desenfoque?: number;
  readonly opacidad?: number;
  readonly origen?: string;
  /** Todo en un color (la figura blanca de la apertura). */
  readonly monocromo?: string;
}

/** Una figura posada con los pies en (x, pies), con su sombra (que no se desenfoca con la figura). */
export function Figura({ figura, colores, iconos, x, pies, escala, sombra, escalaExtra = 1, desenfoque = 0, opacidad = 1, origen = '50% 60%', monocromo }: PropsFigura): ReactNode {
  const r = cuadro(figura);
  const w = r.w * escala;
  const h = r.h * escala;
  const c: Colores = monocromo === undefined ? colores : { ...colores, acento: monocromo, azul: monocromo };
  const dibujo: ReactNode =
    figura === 'bombilla' ? (
      <Bombilla c={c} />
    ) : figura === 'persona' ? (
      <Persona color={c.acento} />
    ) : figura === 'grupo' ? (
      <Grupo c={c} />
    ) : figura === 'megafono' ? (
      <Megafono c={c} />
    ) : figura === 'portatil' ? (
      <Portatil c={c} />
    ) : figura === 'duda' ? (
      <Duda c={c} />
    ) : null;
  const sinSombra = figura === 'megafono' || figura === 'portatil';
  const anchoSombra = Math.max(r.w, 165) * 1.8 * escala;
  return (
    <>
      {sombra > 0.01 && !sinSombra ? (
        <div
          style={{
            position: 'absolute',
            left: x - anchoSombra / 2,
            top: pies + 13 * escala,
            width: anchoSombra,
            height: 30 * escala,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 72%)',
            filter: `blur(${4 * escala}px)`,
            opacity: sombra * opacidad,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: pies - h,
          width: w,
          height: h,
          transform: `scale(${escalaExtra})`,
          transformOrigin: origen,
          filter: desenfoque > 0.05 ? `blur(${desenfoque.toFixed(2)}px)` : undefined,
          opacity: opacidad,
        }}
      >
        {dibujo !== null ? (
          <svg width={w} height={h} viewBox={`0 0 ${r.w} ${r.h}`} style={{ overflow: 'visible' }}>
            {sinSombra ? <g transform={`translate(0 ${r.h - 200})`}>{dibujo}</g> : dibujo}
          </svg>
        ) : (
          // Un ícono de Phosphor como figura: la parte de relleno en el acento, el trazo en blanco.
          <Icono
            iconos={iconos}
            nombre={figura}
            estilo="duotono"
            lado={w}
            color={monocromo ?? '#FFFFFF'}
            colorFondo={c.acento}
            style={{ filter: `drop-shadow(0 ${4 * escala}px ${8 * escala}px rgba(0,0,0,0.45))` }}
          />
        )}
      </div>
    </>
  );
}

export type TipoBurbuja = 'corazon' | 'mensaje' | 'check' | 'pregunta' | 'exclamacion';
export type LadoBurbuja = 'arriba' | 'izquierda' | 'derecha';

/** Una burbuja blanca (corazón, mensaje, check, ¿, !) con la punta hacia la figura; (cx, cy) es su centro. */
export function Burbuja({ tipo, lado, cx, cy, escala, valor }: { tipo: TipoBurbuja; lado: LadoBurbuja; cx: number; cy: number; escala: number; valor: number }): ReactNode {
  if (valor <= 0.001) return null;
  const cuadrada = tipo !== 'mensaje';
  const w = cuadrada ? 75 : 77;
  const h = cuadrada ? 65 : 53;
  const punta =
    lado === 'arriba'
      ? `M${w / 2 - 9},${h - 1} L${w / 2},${h + 12} L${w / 2 + 9},${h - 1} Z`
      : lado === 'izquierda'
        ? `M${w - 1},${h * 0.22} L${w + 14},${h * 0.14} L${w - 1},${h * 0.52} Z`
        : `M1,${h * 0.22} L-14,${h * 0.14} L1,${h * 0.52} Z`;
  const origen = lado === 'arriba' ? `${w / 2}px ${h + 12}px` : lado === 'izquierda' ? `${w + 14}px ${h * 0.3}px` : `-14px ${h * 0.3}px`;
  return (
    <svg
      width={w * escala}
      height={h * escala}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: 'absolute',
        left: cx - (w * escala) / 2,
        top: cy - (h * escala) / 2,
        overflow: 'visible',
        transform: `scale(${valor})`,
        transformOrigin: origen,
        filter: `drop-shadow(0 ${2 * escala}px ${3 * escala}px rgba(0,0,0,0.3))`,
      }}
    >
      <rect x={0} y={0} width={w} height={h} rx={5} fill="#FFFFFF" />
      <path d={punta} fill="#FFFFFF" />
      {tipo === 'corazon' ? (
        <path
          d="M37.5,50 C24,40 17,33 17,24.5 C17,18 22,13.5 28,13.5 C32.5,13.5 35.5,16 37.5,19.5 C39.5,16 42.5,13.5 47,13.5 C53,13.5 58,18 58,24.5 C58,33 51,40 37.5,50 Z"
          fill="none"
          stroke="#141414"
          strokeWidth={6}
          strokeLinejoin="round"
        />
      ) : tipo === 'check' ? (
        <path d="M22,33 L33,44 L54,22" fill="none" stroke="#141414" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      ) : tipo === 'pregunta' || tipo === 'exclamacion' ? (
        <text x={w / 2} y={h / 2 + 15} textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontWeight={900} fontSize={42} fill="#141414">
          {tipo === 'pregunta' ? '?' : '!'}
        </text>
      ) : (
        <g fill="#141414">
          <circle cx={26} cy={27} r={4.5} />
          <circle cx={38.5} cy={27} r={4.5} />
          <circle cx={51} cy={27} r={4.5} />
        </g>
      )}
    </svg>
  );
}

/** Dónde va una burbuja respecto a los pies de la figura, en px del original. */
export function posicionBurbuja(figura: string, lado: LadoBurbuja): { dx: number; dy: number } {
  const r = cuadro(figura);
  if (lado === 'arriba') return { dx: -3, dy: -(r.h + 60) };
  const dy = -(r.h - r.cabeza) * 0.55 - 5;
  const dx = Math.max(139, r.w / 2 + 39);
  return lado === 'izquierda' ? { dx: -dx, dy } : { dx: dx + 1, dy: dy - 5 };
}
