// Las piezas fijas de surreal, portadas de MOTION (formaCromata, scacchiera, PersoneDallAlto y el cierre):
//   - FormaCromata: los tubos cromados en V de las esquinas, cuatro brazos a 90° que giran con un falso 3D;
//   - Tablero: un tablero de ajedrez en perspectiva que se pierde en la niebla del horizonte;
//   - MesaDesdeArriba: personas vistas desde arriba alrededor de una mesa blanca;
//   - Remolino: el fondo oscuro del cierre con una espiral apenas visible;
//   - MarcaEnTiras: el nombre de la marca que se compone en tiras verticales con un poco de glitch.

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { random } from 'remotion';
import { CURVAS, anima } from '../_papel/curvas.ts';
import { anchoTexto, baseEnCaja } from '../_papel/fuentes.ts';
import type { Tipo } from '../_papel/fuentes.ts';
import { OBJETOS_DIBUJADOS, PintaDibujo, encajar } from '../_papel/dibujos.tsx';

// ---------------------------------------------------------------------------------------------------------------------
// Formas cromadas.

/** Las bandas del metal a lo ancho del tubo (de un borde al otro). */
const BANDAS = ['#0B0B0B', '#2A2A2A', '#A8A8A8', '#F4F4F4', '#4A4A4A', '#101010', '#3A3A3A', '#D9D9D9', '#FFFFFF', '#383838', '#0C0C0C'];
const LARGOS = [1, 0.88, 1, 0.88];

/** Grados/segundo del giro de las formas. */
export const VELOCIDAD_FORMA = 26;

/**
 * El ángulo de las formas en cada fotograma: integra la velocidad fotograma a fotograma y la frena (con rampas de
 * coseno de medio segundo) en los tramos quietos, así nunca salta.
 */
export function angulosForma(total: number, fps: number, quieto: (f: number) => boolean): Float32Array {
  const r = new Float32Array(total + 1);
  const rampa = Math.round(fps * 0.5);
  const factor = new Float32Array(total + 1);
  for (let f = 0; f <= total; f++) factor[f] = quieto(f) ? 0 : 1;
  // Suaviza el factor con una ventana de coseno para que la frenada y el arranque sean progresivos.
  const suave = new Float32Array(total + 1);
  for (let f = 0; f <= total; f++) {
    let s = 0;
    let w = 0;
    for (let k = -rampa; k <= rampa; k++) {
      const g = 0.5 + 0.5 * Math.cos((Math.PI * k) / (rampa + 1));
      s += g * factor[Math.min(total, Math.max(0, f + k))];
      w += g;
    }
    suave[f] = s / w;
  }
  r[0] = 18;
  for (let f = 1; f <= total; f++) r[f] = r[f - 1] + (VELOCIDAD_FORMA / fps) * suave[f];
  return r;
}

/** Un tubo cromado de cuatro brazos con su vértice en (x, y). */
export function FormaCromata({ x, y, largo, angulo, id, filtro, opacidad = 1 }: { readonly x: number; readonly y: number; readonly largo: number; readonly angulo: number; readonly id: string; readonly filtro?: string; readonly opacidad?: number }): ReactNode {
  const brazos = LARGOS.map((l, i) => {
    const a = angulo + i * 90;
    const rad = (a * Math.PI) / 180;
    // Falso 3D: un brazo que apunta al lado se ve entero; uno que apunta arriba o abajo, acortado.
    const k = 0.8 + 0.2 * Math.cos(2 * rad);
    return { a, largo: largo * l * k, base: largo * l * 0.27, punta: largo * l * 0.1, fondo: Math.sin(rad) };
  });
  // Primero los brazos que se alejan (hacia arriba), luego los que vienen hacia nosotros.
  const orden = [...brazos].sort((p, q) => p.fondo - q.fondo);
  const n = BANDAS.length - 1;
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: filtro, opacity: opacidad }} width={1} height={1}>
      <defs>
        <linearGradient id={`${id}-tubo`} x1={0} y1={0} x2={0} y2={1}>
          {BANDAS.map((c, i) => (
            <stop key={i} offset={i / n} stopColor={c} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-nudo`} cx={0.4} cy={0.35} r={0.7}>
          <stop offset={0} stopColor="#FFFFFF" />
          <stop offset={0.35} stopColor="#9A9A9A" />
          <stop offset={0.7} stopColor="#1A1A1A" />
          <stop offset={1} stopColor="#050505" />
        </radialGradient>
      </defs>
      {orden.map((b, i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${b.a.toFixed(2)})`}>
          <path d={`M 0 ${-b.base / 2} L ${b.largo} ${-b.punta / 2} Q ${b.largo + b.punta * 0.9} 0 ${b.largo} ${b.punta / 2} L 0 ${b.base / 2} Z`} fill={`url(#${id}-tubo)`} />
        </g>
      ))}
      <circle cx={x} cy={y} r={largo * 0.1} fill={`url(#${id}-nudo)`} />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Tablero en perspectiva.

interface Casilla {
  readonly d: string;
  readonly negra: boolean;
}

/** Las casillas del tablero proyectadas en el cuadro (se calculan una vez). */
function casillas(ancho: number, horizonte: number, giro: number): Casilla[] {
  const focal = 860;
  const alturaCamara = 1.2;
  const cs = Math.cos((giro * Math.PI) / 180);
  const sn = Math.sin((giro * Math.PI) / 180);
  const cx = ancho * 0.52;
  const proyecta = (i: number, j: number): readonly [number, number, number] => {
    const x = i * cs - j * sn + 0.35;
    const z = i * sn + j * cs + 0.6;
    return [cx + (focal * x) / z, horizonte + (focal * alturaCamara) / z, z];
  };
  const r: Casilla[] = [];
  for (let i = -40; i < 40; i++)
    for (let j = -40; j < 40; j++) {
      const p = [proyecta(i, j), proyecta(i + 1, j), proyecta(i + 1, j + 1), proyecta(i, j + 1)];
      if (p.some((q) => q[2] < 0.3) || p.every((q) => q[2] > 34)) continue;
      if (p.every((q) => q[0] < -50) || p.every((q) => q[0] > ancho + 50) || p.every((q) => q[1] > 2000)) continue;
      r.push({ d: `M ${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L ')} Z`, negra: ((i + j) & 1) === 0 });
    }
  return r;
}

/** El tablero de ajedrez desde el horizonte hacia abajo, con niebla en el horizonte y las dos piezas. */
export function Tablero({ ancho, alto, horizonte, papel, id, t }: { readonly ancho: number; readonly alto: number; readonly horizonte: number; readonly papel: string; readonly id: string; readonly t: number }): ReactNode {
  const lista = useMemo(() => casillas(ancho, horizonte, 26), [ancho, horizonte]);
  const reina = encajar(OBJETOS_DIBUJADOS.reina.w, OBJETOS_DIBUJADOS.reina.h, { x: ancho * 0.72, y: horizonte + 300, w: 480, h: 900 }, 'abajo');
  const peon = encajar(OBJETOS_DIBUJADOS.peon.w, OBJETOS_DIBUJADOS.peon.h, { x: ancho * 0.2, y: horizonte + 70, w: 90, h: 140 }, 'abajo');
  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={ancho} height={alto}>
        <defs>
          <linearGradient id={`${id}-niebla`} x1={0} y1={horizonte - 2} x2={0} y2={horizonte + 330} gradientUnits="userSpaceOnUse">
            <stop offset={0} stopColor={papel} stopOpacity={1} />
            <stop offset={0.25} stopColor={papel} stopOpacity={0.82} />
            <stop offset={0.6} stopColor={papel} stopOpacity={0.3} />
            <stop offset={1} stopColor={papel} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g>
          {lista.map((c, i) => (
            <path key={i} d={c.d} fill={c.negra ? '#0C0C0C' : '#F1EFEB'} />
          ))}
        </g>
        <rect x={0} y={horizonte - 4} width={ancho} height={340} fill={`url(#${id}-niebla)`} />
      </svg>
      {/* Sombras bajo las piezas y las piezas. */}
      <div style={{ position: 'absolute', left: peon.x + peon.w * 0.1, top: peon.y + peon.h - 8, width: peon.w * 0.8, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', filter: 'blur(4px)' }} />
      <PintaDibujo dibujo={OBJETOS_DIBUJADOS.peon} {...peon} id={`${id}-peon`} t={t} />
      <div style={{ position: 'absolute', left: reina.x - 20, top: reina.y + reina.h - 34, width: reina.w + 70, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: 'blur(14px)' }} />
      <PintaDibujo dibujo={OBJETOS_DIBUJADOS.reina} {...reina} id={`${id}-reina`} t={t} filtro="drop-shadow(0 18px 18px rgba(0,0,0,0.25))" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Mesa vista desde arriba.

function Persona({ x, y, giro, id, papel }: { readonly x: number; readonly y: number; readonly giro: number; readonly id: string; readonly papel: boolean }): ReactNode {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      {/* Mirando hacia +y (la mesa): hombros, brazos hacia delante, cabeza y, en la mesa, su hoja o su portátil. */}
      {papel ? <rect x={-46} y={96} width={92} height={70} rx={4} fill="#FFFFFF" stroke="#C9C9C9" strokeWidth={2} /> : <rect x={-50} y={92} width={100} height={66} rx={6} fill="#D9D9D9" stroke="#9A9A9A" strokeWidth={2} />}
      <path d="M -56 10 C -66 50 -50 86 -30 102" stroke="#1E1E1E" strokeWidth={26} strokeLinecap="round" fill="none" />
      <path d="M 56 10 C 66 50 50 86 30 102" stroke="#1E1E1E" strokeWidth={26} strokeLinecap="round" fill="none" />
      <ellipse cx={-28} cy={106} rx={13} ry={11} fill="#BDBDBD" />
      <ellipse cx={28} cy={106} rx={13} ry={11} fill="#BDBDBD" />
      <ellipse cx={0} cy={0} rx={84} ry={46} fill={`url(#${id}-hombros)`} />
      <circle cx={0} cy={4} r={36} fill={`url(#${id}-cabeza)`} />
    </g>
  );
}

/** Una mesa larga y blanca con personas alrededor, vista desde arriba. */
export function MesaDesdeArriba({ cx, cy, personas, id }: { readonly cx: number; readonly cy: number; readonly personas: number; readonly id: string }): ReactNode {
  const largo = 1040;
  const ancho = 440;
  const porLado = Math.max(1, Math.floor((personas - 2) / 2));
  const sitios: { x: number; y: number; giro: number }[] = [];
  for (let i = 0; i < porLado; i++) {
    const y = cy - largo / 2 + (largo * (i + 0.5)) / porLado;
    sitios.push({ x: cx - ancho / 2 - 70, y, giro: -90 });
    sitios.push({ x: cx + ancho / 2 + 70, y, giro: 90 });
  }
  sitios.push({ x: cx, y: cy - largo / 2 - 70, giro: 0 });
  sitios.push({ x: cx, y: cy + largo / 2 + 70, giro: 180 });
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
      <defs>
        <radialGradient id={`${id}-hombros`} cx={0.5} cy={0.4} r={0.6}>
          <stop offset={0} stopColor="#4A4A4A" />
          <stop offset={1} stopColor="#151515" />
        </radialGradient>
        <radialGradient id={`${id}-cabeza`} cx={0.4} cy={0.35} r={0.65}>
          <stop offset={0} stopColor="#5A5A5A" />
          <stop offset={0.6} stopColor="#202020" />
          <stop offset={1} stopColor="#0E0E0E" />
        </radialGradient>
        <filter id={`${id}-sombra`} x="-20%" y="-10%" width="140%" height="120%">
          <feDropShadow dx={0} dy={10} stdDeviation={12} floodColor="#000000" floodOpacity={0.22} />
        </filter>
      </defs>
      <rect x={cx - ancho / 2} y={cy - largo / 2} width={ancho} height={largo} rx={18} fill="#FBFAF8" filter={`url(#${id}-sombra)`} />
      {sitios.map((s, i) => (
        <Persona key={i} x={s.x} y={s.y} giro={s.giro} id={id} papel={i % 3 !== 1} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Cierre.

/** El fondo oscuro del cierre con una espiral de cinco brazos, blanca y casi invisible, que gira despacio. */
export function Remolino({ ancho, alto, t }: { readonly ancho: number; readonly alto: number; readonly t: number }): ReactNode {
  const cx = ancho / 2;
  const cy = alto * 0.48;
  const brazos: string[] = [];
  for (let b = 0; b < 5; b++) {
    const pts: string[] = [];
    for (let k = 0; k <= 60; k++) {
      const q = k / 60;
      const a = b * ((Math.PI * 2) / 5) + q * Math.PI * 2.4 + t * 0.35;
      const r = 40 + q * 1050;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
    }
    brazos.push(`M ${pts.join(' L ')}`);
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: ancho, height: alto, backgroundColor: '#1E1E1E' }}>
      <svg style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(26px)' }} width={ancho} height={alto}>
        {brazos.map((d, i) => (
          <path key={i} d={d} stroke="#FFFFFF" strokeOpacity={0.045} strokeWidth={110} fill="none" strokeLinecap="round" />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse closest-side at 50% 48%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)' }} />
    </div>
  );
}

const TIRAS = 16;
const FOTOGRAMAS_TIRAS = 27;

/** El nombre de la marca en blanco que se compone en 16 tiras verticales (27 fotogramas desde `desde`). */
export function MarcaEnTiras({ texto, cx, cy, anchoMax, tipo, acento, f, desde }: { readonly texto: string; readonly cx: number; readonly cy: number; readonly anchoMax: number; readonly tipo: Tipo; readonly acento: string; readonly f: number; readonly desde: number }): ReactNode {
  if (texto.trim() === '' || f < desde) return null;
  const natural = anchoTexto(texto, 100, tipo);
  const cuerpo = Math.min(150, (100 * anchoMax) / natural);
  const ancho = anchoTexto(texto, cuerpo, tipo);
  const top = cy - baseEnCaja(tipo, cuerpo) + cuerpo * 0.36;
  const k = f - desde;
  const tiras: ReactNode[] = [];
  for (let i = 0; i < TIRAS; i++) {
    const llega = Math.floor(random(`tira-${i}`) * (FOTOGRAMAS_TIRAS - 9));
    if (k < llega) continue;
    const q = anima(k, [llega, llega + 9], [0, 1], CURVAS.frena);
    const salto = (random(`tira-dy-${i}`) - 0.5) * 2 * 110 * (1 - q);
    const ruido = k < llega + 9 ? (random(`tira-dx-${i}-${k}`) - 0.5) * 26 * (1 - q) : 0;
    const x0 = (i / TIRAS) * 100;
    const x1 = ((i + 1) / TIRAS) * 100;
    tiras.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: cx - ancho / 2 - 20,
          top,
          width: ancho + 40,
          height: cuerpo * 1.3,
          lineHeight: `${cuerpo}px`,
          fontFamily: `"${tipo.familia}"`,
          fontWeight: tipo.peso,
          fontSize: cuerpo,
          letterSpacing: `${tipo.espaciado}em`,
          color: '#FFFFFF',
          textAlign: 'center',
          whiteSpace: 'pre',
          clipPath: `inset(0 ${(100 - x1).toFixed(2)}% 0 ${x0.toFixed(2)}%)`,
          transform: `translate(${ruido.toFixed(1)}px, ${salto.toFixed(1)}px)`,
          opacity: Math.min(1, q * 2.2),
        }}
      >
        {texto}
      </div>,
    );
  }
  const barra = anima(k, [FOTOGRAMAS_TIRAS - 4, FOTOGRAMAS_TIRAS + 10], [0, 1], CURVAS.frena);
  return (
    <>
      {tiras}
      <div style={{ position: 'absolute', left: cx - ancho * 0.11, top: cy + cuerpo * 0.42, width: ancho * 0.22, height: Math.max(6, cuerpo * 0.07), borderRadius: 4, backgroundColor: acento, transform: `scaleX(${barra.toFixed(3)})` }} />
    </>
  );
}
