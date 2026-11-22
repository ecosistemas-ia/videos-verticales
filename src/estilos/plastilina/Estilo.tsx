// «Personajes de plastilina». Formas lisas y brillantes (formas.ts) con cara, sin brazos ni piernas, sobre un fondo de
// estudio. Quien habla rebota y mueve la boca con la voz (o al ritmo estimado si no hay voz); los demás le miran. Un
// personaje que sigue de una escena a otra (mismo id) no vuelve a entrar: se desliza a su nuevo sitio.

import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import bowlby400 from '@fontsource/bowlby-one/files/bowlby-one-latin-400-normal.woff2';
import poppins600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff2';
import poppins800 from '@fontsource/poppins/files/poppins-latin-800-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ALTO, ANCHO, ZONA_SEGURA, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { coseno, elastico, fraccionX, hash, limitar, mezclar, mezclarColor, ruido, semillaDe, suave, tono } from '../_marionetas/curvas.ts';
import { aperturaBoca, momentoEn, tramosDeHabla } from '../_marionetas/tiempo.ts';
import { CARA_CLARA, COLORES, FORMAS_DEF, type Forma } from './formas.ts';
import { DibujoEscenario, ESCENARIOS_OSCUROS } from './escenarios.tsx';
import type { Accesorio, AjustesPlastilina, Emocion, Escenario, EscenaPlastilina, Fondo, PersonajePlastilina } from './reglas.ts';

cargarFuentes([
  { familia: 'Bowlby One', url: bowlby400, peso: 400 },
  { familia: 'Poppins', url: poppins600, peso: 600 },
  { familia: 'Poppins', url: poppins800, peso: 800 },
]);

const SUELO = 1210;
const TINTA_OJOS = '#141418';

interface ColoresFondo {
  readonly arriba: string;
  readonly abajo: string;
  readonly suelo: string;
  readonly luz: string;
  readonly oscuro: boolean;
}

const FONDOS_COLORES: Readonly<Record<Fondo, ColoresFondo>> = {
  estudio: { arriba: '#2B2B35', abajo: '#121217', suelo: '#0C0C10', luz: '#3A3A48', oscuro: true },
  noche: { arriba: '#2A2F5E', abajo: '#14163A', suelo: '#0E1028', luz: '#3C4280', oscuro: true },
  crema: { arriba: '#FBF2E6', abajo: '#F0DFC9', suelo: '#E2C8A6', luz: '#FFF8EE', oscuro: false },
  menta: { arriba: '#E6F8F1', abajo: '#C4EEDF', suelo: '#A2DBC6', luz: '#F4FFFB', oscuro: false },
  cielo: { arriba: '#E7F2FF', abajo: '#C3DBF7', suelo: '#A2C2EA', luz: '#F6FAFF', oscuro: false },
  lavanda: { arriba: '#F1EBFF', abajo: '#D8CCF8', suelo: '#BCACEE', luz: '#FAF7FF', oscuro: false },
  melocoton: { arriba: '#FFEEE2', abajo: '#FFD5BD', suelo: '#F6B998', luz: '#FFF8F2', oscuro: false },
};

const xPx = (f: number): number => 70 + f * 880;
const BORDE_IZQ = 50;
const BORDE_DER = ANCHO - ZONA_SEGURA.derecha + 60;

function Fondos({ fondo, t, opacidad }: { fondo: Fondo; t: number; opacidad: number }): ReactNode {
  const c = FONDOS_COLORES[fondo];
  const paleta = Object.values(COLORES);
  const bolas: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const x = ((hash(i, 51) * 1300 + t * (6 + hash(i, 52) * 8)) % 1300) - 110;
    const y = 220 + hash(i, 53) * 760 + 18 * Math.sin(t * 0.4 + i);
    const r = 30 + hash(i, 54) * 70;
    bolas.push(<circle key={i} cx={x} cy={y} r={r} fill={paleta[Math.floor(hash(i, 55) * paleta.length)]} opacity={c.oscuro ? 0.16 : 0.22} filter={`url(#desenfoque-${fondo})`} />);
  }
  const estrellas =
    fondo === 'noche'
      ? Array.from({ length: 26 }, (_, i) => (
          <circle key={`s${i}`} cx={hash(i, 61) * 1080} cy={200 + hash(i, 62) * 800} r={2 + hash(i, 63) * 3} fill="#F7E7A6" opacity={0.35 + 0.6 * Math.max(0, Math.sin(t * (1 + hash(i, 64) * 2) + i))} />
        ))
      : null;
  return (
    <g opacity={opacidad}>
      <defs>
        <linearGradient id={`fondo-${fondo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.arriba} />
          <stop offset="1" stopColor={c.abajo} />
        </linearGradient>
        <linearGradient id={`suelo-${fondo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.suelo} />
          <stop offset="1" stopColor={tono(c.suelo, -0.25)} />
        </linearGradient>
        <radialGradient id={`foco-${fondo}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c.luz} stopOpacity={c.oscuro ? 0.75 : 0.9} />
          <stop offset="1" stopColor={c.luz} stopOpacity={0} />
        </radialGradient>
        <filter id={`desenfoque-${fondo}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <radialGradient id={`vineta-${fondo}`} cx="0.5" cy="0.5" r="0.72">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={c.oscuro ? 0.55 : 0.18} />
        </radialGradient>
        <linearGradient id={`horizonte-${fondo}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={c.oscuro ? 0.14 : 0.35} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <filter id={`grano-${fondo}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={3} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0.07} />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width={ANCHO} height={ALTO} fill={`url(#fondo-${fondo})`} />
      <ellipse cx={540} cy={820} rx={620} ry={560} fill={`url(#foco-${fondo})`} />
      {estrellas}
      {bolas}
      <path d={`M0 ${SUELO - 40} Q 540 ${SUELO - 70} 1080 ${SUELO - 40} L1080 ${ALTO} L0 ${ALTO} Z`} fill={`url(#suelo-${fondo})`} />
      <path d={`M0 ${SUELO - 40} Q 540 ${SUELO - 70} 1080 ${SUELO - 40}`} stroke={`url(#horizonte-${fondo})`} strokeWidth={4} fill="none" />
      <ellipse cx={540} cy={SUELO} rx={520} ry={70} fill={`url(#foco-${fondo})`} opacity={0.6} />
      <rect width={ANCHO} height={ALTO} fill={`url(#vineta-${fondo})`} />
      <rect width={ANCHO} height={ALTO} filter={`url(#grano-${fondo})`} />
    </g>
  );
}

interface Gesto {
  /** Cuánto se abren los ojos (1 normal). */
  readonly ojo: number;
  /** Curva de la boca cerrada: + sonrisa, - triste. */
  readonly sonrisa: number;
  /** Cejas: 0 ninguna, + tristes (interior arriba), - enojadas (interior abajo). */
  readonly ceja: number;
  readonly alzaCeja: number;
}

const GESTOS: Readonly<Record<Emocion, Gesto>> = {
  feliz: { ojo: 1, sonrisa: 0.55, ceja: 0, alzaCeja: 0 },
  neutral: { ojo: 1, sonrisa: 0.12, ceja: 0, alzaCeja: 0 },
  triste: { ojo: 0.9, sonrisa: -0.45, ceja: 22, alzaCeja: 0 },
  cansado: { ojo: 0.5, sonrisa: -0.05, ceja: 0, alzaCeja: 0 },
  enojado: { ojo: 0.9, sonrisa: -0.4, ceja: -24, alzaCeja: -4 },
  asustado: { ojo: 1.15, sonrisa: -0.25, ceja: 16, alzaCeja: 12 },
  sorprendido: { ojo: 1.22, sonrisa: 0, ceja: 6, alzaCeja: 16 },
  orgulloso: { ojo: 1, sonrisa: 0.7, ceja: 0, alzaCeja: 0 },
};

interface EstadoCara {
  readonly emocion: Emocion;
  readonly boca: number;
  readonly mirada: number;
  readonly parpadeo: number;
  readonly dormido: boolean;
}

function Cara({ f, c, saltones, clave, color, clara }: { f: Forma; c: EstadoCara; saltones: boolean; clave: string; color: string; clara: boolean }): ReactNode {
  const { x, y, sep, ojo: e } = f.cara;
  const g = GESTOS[c.emocion];
  const tinta = clara ? '#EAF6FF' : TINTA_OJOS;
  const dx = c.mirada * e * 0.38;
  const cerrado = c.dormido || c.emocion === 'orgulloso';
  const ojos = ([-1, 1] as const).map((lado) => {
    const ox = x + (lado * sep) / 2 + dx;
    if (cerrado) {
      const k = c.dormido ? 0.5 : -0.6;
      return <path key={lado} d={`M${ox - e * 0.8} ${y} Q${ox} ${y + k * e * 1.2} ${ox + e * 0.8} ${y}`} stroke={tinta} strokeWidth={e * 0.32} fill="none" strokeLinecap="round" />;
    }
    const abierto = Math.max(0.08, 1 - c.parpadeo);
    if (saltones) {
      const r = e * 1.15 * g.ojo;
      const pr = r * (c.emocion === 'asustado' ? 0.32 : 0.5);
      return (
        <g key={lado} transform={`translate(${ox} ${y}) scale(1 ${abierto}) translate(${-ox} ${-y})`}>
          <circle cx={ox} cy={y + r * 0.1} r={r * 1.04} fill="#000000" opacity={0.2} />
          <circle cx={ox} cy={y} r={r} fill={`url(#blanco-${clave})`} />
          <circle cx={ox + c.mirada * r * 0.35} cy={y + r * 0.08} r={pr} fill={`url(#ojo-${clave})`} />
          <circle cx={ox + c.mirada * r * 0.35 - pr * 0.36} cy={y - pr * 0.32} r={pr * 0.34} fill="#FFFFFF" />
          <circle cx={ox + c.mirada * r * 0.35 + pr * 0.4} cy={y + pr * 0.36} r={pr * 0.12} fill="#FFFFFF" opacity={0.8} />
          <ellipse cx={ox - r * 0.38} cy={y - r * 0.5} rx={r * 0.3} ry={r * 0.16} fill="#FFFFFF" opacity={0.9} transform={`rotate(-30 ${ox - r * 0.38} ${y - r * 0.5})`} />
        </g>
      );
    }
    const rx = e * 0.74 * (c.emocion === 'asustado' ? 0.82 : 1);
    const ry = e * g.ojo * abierto;
    const oy = y + (c.emocion === 'cansado' ? e * 0.3 : 0);
    return (
      <g key={lado}>
        <ellipse cx={ox} cy={oy + ry * 0.12} rx={rx * 1.08} ry={ry * 1.06} fill="#000000" opacity={clara ? 0 : 0.18} />
        <ellipse cx={ox} cy={oy} rx={rx} ry={ry} fill={clara ? tinta : `url(#ojo-${clave})`} />
        {abierto > 0.5 && !clara && (
          <>
            <ellipse cx={ox - rx * 0.3} cy={oy - ry * 0.4} rx={rx * 0.34} ry={ry * 0.26} fill="#FFFFFF" opacity={0.95} transform={`rotate(-20 ${ox - rx * 0.3} ${oy - ry * 0.4})`} />
            <circle cx={ox + rx * 0.34} cy={oy - ry * 0.05} r={rx * 0.11} fill="#FFFFFF" opacity={0.85} />
            <path d={`M${ox - rx * 0.55} ${oy + ry * 0.55} Q${ox} ${oy + ry * 0.92} ${ox + rx * 0.55} ${oy + ry * 0.55}`} stroke="#9FB4FF" strokeWidth={rx * 0.14} fill="none" strokeLinecap="round" opacity={0.45} />
          </>
        )}
      </g>
    );
  });
  const cejas =
    g.ceja === 0 && g.alzaCeja === 0
      ? null
      : ([-1, 1] as const).map((lado) => {
          const ex = x + (lado * sep) / 2 + dx;
          const ey = y - e * (saltones ? 1.75 : 1.55) * g.ojo - g.alzaCeja;
          const ang = (g.ceja * Math.PI) / 180;
          const l = e * 0.7;
          const yi = ey - Math.sin(ang) * l;
          const yo = ey + Math.sin(ang) * l;
          return <path key={`c${lado}`} d={`M${ex - lado * l} ${yi} L${ex + lado * l} ${yo}`} stroke={tinta} strokeWidth={e * 0.3} strokeLinecap="round" />;
        });
  // Boca: pequeña; se abre con la voz.
  const w = e * 1.25;
  const by = y + e * (saltones ? 2.0 : 1.7);
  const abre = Math.max(c.boca, c.emocion === 'sorprendido' ? 0.55 : 0, c.emocion === 'asustado' ? 0.3 : 0);
  const s = g.sonrisa * e * (1 - 0.5 * Math.min(1, abre));
  let boca: ReactNode;
  if (abre < 0.06) {
    boca = <path d={`M${x - w / 2 + dx * 0.5} ${by} Q${x + dx * 0.5} ${by + s} ${x + w / 2 + dx * 0.5} ${by}`} stroke={tinta} strokeWidth={e * 0.26} strokeLinecap="round" fill="none" />;
  } else {
    const ancho = c.emocion === 'sorprendido' ? w * 0.6 : w;
    const alto = abre * e * 1.1;
    const bx = x + dx * 0.5;
    const d = `M${bx - ancho / 2} ${by} Q${bx} ${by - alto * 0.25 - s * 0.2} ${bx + ancho / 2} ${by} Q${bx} ${by + alto + s * 0.6} ${bx - ancho / 2} ${by} Z`;
    boca = (
      <g>
        <clipPath id={`boca-${clave}`}>
          <path d={d} />
        </clipPath>
        <path d={d} fill={clara ? '#0E2530' : `url(#boca-g-${clave})`} />
        <ellipse cx={bx} cy={by + alto * 0.85} rx={ancho * 0.3} ry={Math.max(3, alto * 0.38)} fill="#FF7A93" clipPath={`url(#boca-${clave})`} />
      </g>
    );
  }
  const rubor = clara || color === COLORES.rojo || color === COLORES.rosa ? null : (
    <g filter={`url(#suave-${clave})`} opacity={0.4}>
      <ellipse cx={x - sep / 2 - e * 0.95} cy={y + e * 1.25} rx={e * 0.72} ry={e * 0.4} fill="#FF6F91" />
      <ellipse cx={x + sep / 2 + e * 0.95} cy={y + e * 1.25} rx={e * 0.72} ry={e * 0.4} fill="#FF6F91" />
    </g>
  );
  return (
    <g>
      <defs>
        <radialGradient id={`ojo-${clave}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#4A4A5A" />
          <stop offset="0.45" stopColor="#15151B" />
          <stop offset="1" stopColor="#050507" />
        </radialGradient>
        <radialGradient id={`blanco-${clave}`} cx="0.4" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#F2F2F6" />
          <stop offset="1" stopColor="#CFCFDA" />
        </radialGradient>
        <linearGradient id={`boca-g-${clave}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E0910" />
          <stop offset="1" stopColor="#5A1E2C" />
        </linearGradient>
      </defs>
      {rubor}
      {ojos}
      {cejas}
      {boca}
    </g>
  );
}

/** Relieve de plastilina: la silueta desenfocada hace de mapa de altura (más alto en el centro), con un grano fino de
 *  arcilla; encima, luz difusa desde arriba a la izquierda y un brillo especular. `hinchado` es cuánto se redondea. */
function Inflar({ id, hinchado }: { id: string; hinchado: number }): ReactNode {
  return (
    <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={hinchado} result="altura" />
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves={2} seed={7} result="grano" />
      <feComposite in="altura" in2="grano" operator="arithmetic" k1={0} k2={1} k3={0.022} k4={0} result="relieve" />
      <feDiffuseLighting in="relieve" surfaceScale={hinchado * 0.55} diffuseConstant={1} lightingColor="#FFFFFF" result="difusa">
        <feDistantLight azimuth={235} elevation={52} />
      </feDiffuseLighting>
      <feComponentTransfer in="difusa" result="difusaSuave">
        <feFuncR type="linear" slope={0.55} intercept={0.52} />
        <feFuncG type="linear" slope={0.55} intercept={0.52} />
        <feFuncB type="linear" slope={0.55} intercept={0.52} />
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="difusaSuave" mode="multiply" result="sombreado" />
      <feSpecularLighting in="relieve" surfaceScale={hinchado * 0.55} specularConstant={1} specularExponent={28} lightingColor="#FFFFFF" result="brillo">
        <feDistantLight azimuth={235} elevation={48} />
      </feSpecularLighting>
      <feComposite in="brillo" in2="SourceAlpha" operator="in" result="brilloDentro" />
      <feComposite in="sombreado" in2="brilloDentro" operator="arithmetic" k1={0} k2={1} k3={0.75} k4={0} result="conBrillo" />
      <feComposite in="conBrillo" in2="SourceAlpha" operator="in" />
    </filter>
  );
}

/** Un brillo de plastilina sobre una pieza (degradado de luz). */
function degradado(id: string, color: string): ReactNode {
  return (
    <radialGradient id={id} cx="0.36" cy="0.26" r="0.86">
      <stop offset="0" stopColor={mezclarColor(color, '#FFFFFF', 0.22)} />
      <stop offset="0.55" stopColor={color} />
      <stop offset="1" stopColor={tono(color, -0.18)} />
    </radialGradient>
  );
}

function Accesorio({ a, f, clave, t }: { a: Accesorio; f: Forma; clave: string; t: number }): ReactNode {
  const { x, y, sep, ojo: e } = f.cara;
  const cima = f.cima;
  const oscuro = '#1C1C22';
  switch (a) {
    case 'gafas':
    case 'gafas_sol': {
      const r = e * 1.55;
      const sol = a === 'gafas_sol';
      return (
        <g>
          {([-1, 1] as const).map((l) => (
            <g key={l}>
              <circle cx={x + (l * sep) / 2} cy={y} r={r} fill={sol ? '#111116' : '#FFFFFF'} fillOpacity={sol ? 0.95 : 0.12} stroke={oscuro} strokeWidth={e * 0.3} />
              {sol && <ellipse cx={x + (l * sep) / 2 - r * 0.35} cy={y - r * 0.4} rx={r * 0.32} ry={r * 0.16} fill="#FFFFFF" opacity={0.55} transform={`rotate(-25 ${x + (l * sep) / 2} ${y})`} />}
            </g>
          ))}
          <path d={`M${x - sep / 2 + r} ${y - 2} Q${x} ${y - e * 0.6} ${x + sep / 2 - r} ${y - 2}`} stroke={oscuro} strokeWidth={e * 0.28} fill="none" />
        </g>
      );
    }
    case 'boina':
      return (
        <g transform={`rotate(-9 0 ${cima})`}>
          <ellipse cx={f.ancho * 0.06} cy={cima + 18} rx={f.ancho * 0.36} ry={44} fill={`url(#acc-${clave})`} />
          <circle cx={f.ancho * 0.06} cy={cima - 30} r={11} fill="#2A2A33" />
        </g>
      );
    case 'gorro_fiesta':
      return (
        <g transform={`rotate(8 0 ${cima})`}>
          <path d={`M-60 ${cima + 22} L60 ${cima + 22} L8 ${cima - 120} Z`} fill={`url(#acc-${clave})`} />
          <path d={`M-38 ${cima - 18} L44 ${cima - 2} M-16 ${cima - 72} L28 ${cima - 62}`} stroke="#FFFFFF" strokeWidth={12} opacity={0.7} strokeLinecap="round" />
          <circle cx={8} cy={cima - 124} r={18} fill="#FFC21A" />
        </g>
      );
    case 'corona':
      return (
        <path
          d={`M-78 ${cima + 18} L-84 ${cima - 56} L-40 ${cima - 18} L0 ${cima - 74} L40 ${cima - 18} L84 ${cima - 56} L78 ${cima + 18} Z`}
          fill={`url(#acc-${clave})`}
          stroke="#B8860B"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      );
    case 'lazo':
      return (
        <g transform={`translate(${f.ancho * 0.22} ${cima + 30}) rotate(${12 + 3 * Math.sin(t * 2)})`}>
          <path d="M0 0 L-62 -36 Q-74 0 -62 36 Z" fill={`url(#acc-${clave})`} />
          <path d="M0 0 L62 -36 Q74 0 62 36 Z" fill={`url(#acc-${clave})`} />
          <circle r={18} fill="#E0457F" />
        </g>
      );
    case 'auriculares': {
      const lx = f.ancho * 0.5;
      return (
        <g>
          <path d={`M${-lx + 14} ${y} Q${-lx} ${cima - 30} 0 ${cima - 28} Q${lx} ${cima - 30} ${lx - 14} ${y}`} stroke={oscuro} strokeWidth={18} fill="none" strokeLinecap="round" />
          {([-1, 1] as const).map((l) => (
            <rect key={l} x={l * lx - 30} y={y - 50} width={60} height={96} rx={28} fill={`url(#acc-${clave})`} />
          ))}
        </g>
      );
    }
    case 'casco':
      return (
        <g>
          <path d={`M-110 ${cima + 40} Q-110 ${cima - 70} 0 ${cima - 72} Q110 ${cima - 70} 110 ${cima + 40} Z`} fill={`url(#acc-${clave})`} />
          <rect x={-140} y={cima + 26} width={280} height={30} rx={15} fill="#E5A800" />
          <rect x={-12} y={cima - 70} width={24} height={100} rx={12} fill="#FFFFFF" opacity={0.35} />
        </g>
      );
    case 'espejo': {
      const yb = y - e * 2.7;
      return (
        <g>
          <path d={`M${-f.ancho * 0.46} ${yb + 30} Q0 ${yb - 40} ${f.ancho * 0.46} ${yb + 30}`} stroke="#2A2A31" strokeWidth={16} fill="none" strokeLinecap="round" />
          <circle cx={0} cy={yb - 12} r={e * 1.55} fill={`url(#acc-${clave})`} stroke="#7D8796" strokeWidth={6} />
          <circle cx={0} cy={yb - 12} r={e * 0.32} fill="#3A3F48" />
          <ellipse cx={-e * 0.6} cy={yb - 12 - e * 0.6} rx={e * 0.45} ry={e * 0.22} fill="#FFFFFF" opacity={0.9} transform={`rotate(-30 0 ${yb})`} />
        </g>
      );
    }
    case 'sombrero':
      return (
        <g transform={`rotate(-6 0 ${cima})`}>
          <rect x={-70} y={cima - 120} width={140} height={136} rx={16} fill={`url(#acc-${clave})`} />
          <rect x={-70} y={cima - 14} width={140} height={22} fill="#F2474F" />
          <ellipse cx={0} cy={cima + 14} rx={116} ry={22} fill="#26262E" />
        </g>
      );
    case 'gorro_chef':
      return (
        <g>
          {[-52, 0, 52].map((cx, i) => (
            <circle key={i} cx={cx} cy={cima - 56 - (i === 1 ? 22 : 0)} r={52} fill={`url(#acc-${clave})`} />
          ))}
          <rect x={-78} y={cima - 36} width={156} height={62} rx={14} fill="#F4F4F6" />
        </g>
      );
    case 'bigote': {
      const my = y + e * 1.2;
      return <path d={`M${x} ${my} Q${x - e * 1.3} ${my - e * 0.7} ${x - e * 2} ${my + e * 0.2} Q${x - e * 1.1} ${my + e * 0.5} ${x} ${my + e * 0.25} Q${x + e * 1.1} ${my + e * 0.5} ${x + e * 2} ${my + e * 0.2} Q${x + e * 1.3} ${my - e * 0.7} ${x} ${my} Z`} fill="#4A2C1E" />;
    }
    default:
      return null;
  }
}

const COLOR_ACCESORIO: Readonly<Record<Accesorio, string>> = {
  ninguno: '#000000',
  gafas: '#000000',
  gafas_sol: '#000000',
  boina: '#2E2E38',
  gorro_fiesta: '#FF5FA2',
  corona: '#F6C93A',
  lazo: '#FF5FA2',
  auriculares: '#2F7BFF',
  casco: '#FFC21A',
  espejo: '#DDE3EB',
  sombrero: '#2A2A33',
  gorro_chef: '#FFFFFF',
  bigote: '#000000',
};

interface Colocado {
  readonly p: PersonajePlastilina;
  readonly x: number;
  readonly escala: number;
}

function colocar(e: EscenaPlastilina): Colocado[] {
  const n = e.personajes.length;
  const base = [2.0, 1.6, 1.22][n - 1] ?? 1.22;
  const lista = e.personajes.map((p) => ({ p, x: xPx(fraccionX(p.x)), escala: base * p.escala }));
  const dentro = lista.filter((c) => c.x > BORDE_IZQ - 40 && c.x < BORDE_DER + 40);
  const ancho = (c: { p: PersonajePlastilina; escala: number }): number => FORMAS_DEF[c.p.forma].ancho * c.escala + 10;
  const disponible = BORDE_DER - BORDE_IZQ;
  const total = dentro.reduce((s, c) => s + ancho(c), 0);
  if (total > disponible) for (const c of dentro) c.escala *= disponible / total;
  dentro.sort((a, b) => a.x - b.x);
  for (let vuelta = 0; vuelta < 30; vuelta++) {
    for (let i = 0; i + 1 < dentro.length; i++) {
      const a = dentro[i];
      const b = dentro[i + 1];
      const falta = (ancho(a) + ancho(b)) / 2 - (b.x - a.x);
      if (falta > 0) {
        a.x -= falta / 2;
        b.x += falta / 2;
      }
    }
    for (const c of dentro) c.x = limitar(c.x, BORDE_IZQ + ancho(c) / 2, BORDE_DER - ancho(c) / 2);
  }
  return lista;
}

function Personaje({
  col,
  idx,
  escena,
  local,
  t,
  habla,
  tramos,
  xHablante,
  previo,
  sigue,
  oscuro,
}: {
  col: Colocado;
  idx: number;
  escena: EscenaLista<EscenaPlastilina>;
  local: number;
  t: number;
  habla: boolean;
  tramos: ReturnType<typeof tramosDeHabla>;
  xHablante: number | null;
  previo: Colocado | null;
  sigue: boolean;
  oscuro: boolean;
}): ReactNode {
  const { p } = col;
  const f = FORMAS_DEF[p.forma];
  const color = COLORES[p.color ?? f.color];
  const clave = `${escena.indice}-${idx}`;
  const semilla = semillaDe(p.id) % 997;
  const fase = (semilla % 100) / 16;
  const dur = escena.duracion;
  const tl = Math.max(0, local - p.retraso);
  const accion = local >= p.retraso ? p.accion : 'quieto';
  const boca = habla ? aperturaBoca(tramos, local) : 0;

  let x = col.x;
  let escala = col.escala;
  if (previo !== null) {
    const k = coseno(local, 0, 0.55);
    x = mezclar(previo.x, col.x, k);
    escala = mezclar(previo.escala, col.escala, k);
  }
  let aparece = previo === null && p.accion !== 'entra' ? elastico(local, 0.02 + p.retraso, 0.6 + p.retraso) : 1;
  if (p.accion === 'entra' && local < p.retraso) aparece = 0;
  if (!sigue) aparece *= 1 - suave(local, dur - 0.22, dur);
  if (aparece <= 0.001) return null;

  // Respira, y al hablar rebota y se aplasta un poco con cada sílaba.
  const respira = Math.sin(2 * Math.PI * 0.9 * t + fase);
  let dy = -16 * boca;
  let sx = 1 + 0.015 * respira - 0.05 * boca;
  let sy = 1 - 0.015 * respira + 0.07 * boca;
  let giro = 2 * ruido(t * 0.5, semilla) + 3 * boca * Math.sin(t * 5 + fase);
  let dxCuerpo = 0;
  let caraVisible = 1;
  let dormido = false;
  let enAire = 0;
  let emocion = p.emocion;

  if (p.accion === 'entra' && previo === null) {
    const cae = 0.45;
    if (tl < cae) {
      const k = tl / cae;
      dy = -1000 * (1 - k * k);
      sy = 1.12;
      sx = 0.92;
      enAire = 1 - k;
    } else {
      const r = Math.exp(-(tl - cae) * 7) * Math.sin((tl - cae) * 24);
      sy += -0.2 * r;
      sx += 0.16 * r;
    }
  }
  if (accion === 'salta' || accion === 'celebra') {
    const periodo = accion === 'salta' ? 0.95 : 0.55;
    const altura = accion === 'salta' ? 150 : 50;
    const k = (tl % periodo) / periodo;
    const vuelo = Math.max(0, Math.sin(Math.PI * Math.min(1, k / 0.78)));
    const aterriza = k > 0.78 ? Math.sin(Math.PI * ((k - 0.78) / 0.22)) : 0;
    enAire = vuelo;
    dy = -altura * vuelo;
    sy = 1 + 0.12 * vuelo * (1 - vuelo) * 2 - 0.2 * aterriza;
    sx = 1 - 0.08 * vuelo * (1 - vuelo) * 2 + 0.17 * aterriza;
    if (accion === 'celebra') giro = 8 * Math.sin(2 * Math.PI * tl * 0.9);
  }
  if (accion === 'tiembla') {
    dxCuerpo = 6 * Math.sin(2 * Math.PI * 16 * t);
    sy = 0.96 + 0.012 * Math.sin(2 * Math.PI * 12 * t);
  }
  if (accion === 'asiente') {
    const k = Math.max(0, Math.sin(2 * Math.PI * 2 * tl));
    sy -= 0.08 * k;
    sx += 0.05 * k;
    giro += 4 * k;
  }
  if (accion === 'niega') giro = 9 * Math.sin(2 * Math.PI * 2.2 * tl);
  if (accion === 'gira') {
    const periodo = 2.2;
    const k = suave(tl % periodo, 0, 0.8);
    const c = Math.cos(2 * Math.PI * k);
    sx *= Math.max(0.06, Math.abs(c));
    caraVisible = c > 0.15 ? 1 : 0;
  }
  if (accion === 'duerme') {
    dormido = true;
    sy = 1 + 0.04 * Math.sin(2 * Math.PI * 0.3 * t);
    sx = 1 - 0.025 * Math.sin(2 * Math.PI * 0.3 * t);
    giro = 7;
    dy = 0;
  }
  if (accion === 'corre') {
    const destino = p.hasta === undefined ? col.x : xPx(fraccionX(p.hasta));
    const k = suave(tl, 0.1, Math.max(0.8, dur - p.retraso - 0.4));
    const moviendo = 4 * k * (1 - k);
    x = mezclar(col.x, destino, k);
    dy = -40 * Math.abs(Math.sin(2 * Math.PI * 2.2 * t)) * moviendo;
    giro = 8 * Math.sign(destino - col.x) * moviendo;
  }
  if (accion === 'sale') {
    const k = suave(tl, Math.max(0, dur - p.retraso - 1.0), dur - p.retraso - 0.25);
    dy = -80 * Math.sin(Math.PI * Math.min(1, k * 2)) - (k > 0.5 ? (k - 0.5) * 2 * 1200 : 0);
  }
  if (emocion === 'asustado' && accion === 'quieto') dxCuerpo = 2.5 * Math.sin(2 * Math.PI * 14 * t);

  const periodoParpadeo = 2.7 + (semilla % 13) * 0.13;
  const enCiclo = (t + fase) % periodoParpadeo;
  const parpadeo = enCiclo < 0.15 ? Math.sin((Math.PI * enCiclo) / 0.15) : 0;
  const mirada = p.mira === 'izquierda' ? -1 : p.mira === 'derecha' ? 1 : p.mira === 'frente' ? 0 : xHablante !== null && !habla ? Math.sign(xHablante - x) : 0.45 * ruido(t * 0.4, semilla);
  if (habla && emocion === 'neutral') emocion = 'feliz';

  const partes = f.partes(t);
  const cuerpo = partes[0];
  const medio = f.cima / 2;

  return (
    <g transform={`translate(${x + dxCuerpo} ${SUELO}) scale(${escala * aparece})`}>
      <ellipse cx={8} cy={6} rx={f.ancho * 0.56 * (1 - 0.35 * enAire)} ry={30 * (1 - 0.3 * enAire)} fill="#000" opacity={(oscuro ? 0.35 : 0.14) * (1 - 0.5 * enAire)} filter={`url(#suave-${clave})`} />
      <ellipse cx={4} cy={2} rx={f.ancho * 0.36 * (1 - 0.5 * enAire)} ry={12 * (1 - 0.5 * enAire)} fill="#000" opacity={(oscuro ? 0.6 : 0.25) * (1 - 0.7 * enAire)} />
      <g transform={`translate(0 ${dy}) rotate(${giro} 0 ${medio}) scale(${sx} ${sy})`}>
        <defs>
          {degradado(`cuerpo-${clave}`, color)}
          {partes.slice(1).map((pt, i) => (pt.color !== undefined ? <g key={i}>{degradado(`parte-${clave}-${i}`, pt.color)}</g> : null))}
          {degradado(`acc-${clave}`, COLOR_ACCESORIO[p.accesorio])}
          <linearGradient id={`sombra-${clave}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.22} />
          </linearGradient>
          <clipPath id={`silueta-${clave}`}>
            <path d={cuerpo.d} />
          </clipPath>
          <filter id={`suave-${clave}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <Inflar id={`inflar-${clave}`} hinchado={Math.round(f.ancho * 0.1)} />
          <Inflar id={`inflar-acc-${clave}`} hinchado={7} />
        </defs>
        {/* Las piezas propias (asa, casquillo) van detrás o encima según su orden; cada una con su relieve. */}
        <g filter={`url(#inflar-${clave})`}>
          <path d={cuerpo.d} fill={`url(#cuerpo-${clave})`} />
        </g>
        {partes.slice(1).map((pt, i) => (
          <g key={i} filter={`url(#inflar-acc-${clave})`}>
            <path d={pt.d} fill={pt.color !== undefined ? `url(#parte-${clave}-${i})` : `url(#cuerpo-${clave})`} />
          </g>
        ))}
        <path d={cuerpo.d} fill={`url(#sombra-${clave})`} />
        {(f.lineas ?? []).map((d, i) => (
          <path key={`l${i}`} d={d} stroke={tono(color, -0.32)} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.55} />
        ))}
        <g clipPath={`url(#silueta-${clave})`}>
          <ellipse cx={-f.ancho * 0.24} cy={f.cima * 0.78} rx={f.ancho * 0.045} ry={f.ancho * 0.022} fill="#FFFFFF" opacity={0.95} transform={`rotate(-30 ${-f.ancho * 0.24} ${f.cima * 0.78})`} />
        </g>
        {f.vapor === true &&
          [0, 1].map((i) => {
            const v = (t * 0.5 + i * 0.5) % 1;
            return <path key={`v${i}`} d={`M${-26 + i * 46} ${f.cima + 20 - v * 90} q -16 -26 0 -50 q 16 -24 0 -48`} stroke="#FFFFFF" strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.5 * Math.sin(Math.PI * v)} />;
          })}
        {caraVisible > 0 && <Cara f={f} c={{ emocion, boca, mirada, parpadeo, dormido }} saltones={p.ojos === 'saltones'} clave={clave} color={color} clara={CARA_CLARA.has(p.forma)} />}
        {caraVisible > 0 && (
          <g filter={p.accesorio === 'bigote' || p.accesorio === 'gafas' ? undefined : `url(#inflar-acc-${clave})`}>
            <Accesorio a={p.accesorio} f={f} clave={clave} t={t} />
          </g>
        )}
        {accion === 'duerme' &&
          [0, 1, 2].map((i) => {
            const v = (t * 0.45 + i / 3) % 1;
            return (
              <text key={i} x={f.ancho * 0.3 + v * 90} y={f.cima + 30 - v * 170} fontFamily="Bowlby One" fontSize={44 + v * 30} fill="#FFFFFF" stroke="#1E1B2E" strokeWidth={6} paintOrder="stroke" opacity={1 - v}>
                Z
              </text>
            );
          })}
        {accion === 'celebra' &&
          Array.from({ length: 7 }, (_, i) => {
            const v = (tl * 0.8 + i / 7) % 1;
            const a = (i / 7) * Math.PI * 2 + tl;
            const r = f.ancho * (0.45 + 0.4 * v);
            const c = Object.values(COLORES)[i % 8];
            return <circle key={`b${i}`} cx={Math.cos(a) * r} cy={medio + Math.sin(a) * r * 0.8} r={10 * (1 - v) + 3} fill={c} opacity={1 - v} />;
          })}
      </g>
    </g>
  );
}

function Globo({ texto, x, y, local, tinta }: { texto: string; x: number; y: number; local: number; tinta: string }): ReactNode {
  const k = elastico(local, 0.25, 0.75);
  if (k <= 0.001) return null;
  const izquierda = Math.min(Math.max(40, x - 230), ANCHO - ZONA_SEGURA.derecha - 460);
  return (
    <div style={{ position: 'absolute', left: izquierda, top: y, width: 460, display: 'flex', justifyContent: 'center', transform: `translateY(-100%) scale(${k})`, transformOrigin: `${x - izquierda}px 100%` }}>
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #EFEFF4 100%)',
          borderRadius: 40,
          padding: '18px 28px',
          fontFamily: 'Poppins',
          fontWeight: 800,
          fontSize: 38,
          lineHeight: 1.15,
          color: tinta,
          textAlign: 'center',
          boxShadow: 'inset 0 8px 14px rgba(255,255,255,.8), inset 0 -10px 16px rgba(0,0,0,.1), 0 14px 28px rgba(0,0,0,.3)',
        }}
      >
        {texto}
        <div style={{ position: 'absolute', left: Math.min(380, Math.max(30, x - izquierda - 30)), bottom: -28, width: 0, height: 0, borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderTop: '30px solid #EFEFF4' }} />
      </div>
    </div>
  );
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = props.ajustes as AjustesPlastilina;
  const escenas = props.escenas as readonly EscenaLista<EscenaPlastilina>[];
  const m = momentoEn(escenas, t);
  if (m === null) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  const { escena, local, anterior, siguiente } = m;
  const d = escena.datos;
  const acento = props.guion.marca.acento;
  // Lo de detrás: el escenario de la escena (o el de los ajustes) y, si no hay ninguno, el fondo liso.
  type Detras = { tipo: 'escenario'; e: Escenario } | { tipo: 'fondo'; f: Fondo };
  const detrasDe = (x: EscenaPlastilina): Detras => {
    const e = x.escenario ?? (x.fondo === undefined ? a.escenario : undefined);
    return e !== undefined ? { tipo: 'escenario', e } : { tipo: 'fondo', f: x.fondo ?? a.fondo };
  };
  const igual = (p: Detras, q: Detras): boolean => (p.tipo === 'escenario' ? q.tipo === 'escenario' && q.e === p.e : q.tipo === 'fondo' && q.f === p.f);
  const pintar = (x: Detras, opacidad: number): ReactNode =>
    x.tipo === 'fondo' ? <Fondos fondo={x.f} t={t} opacidad={opacidad} /> : <g opacity={opacidad}><DibujoEscenario e={x.e} t={t} /></g>;
  const detras = detrasDe(d);
  const detrasAntes = anterior === null ? detras : detrasDe(anterior.datos);
  const kFondo = igual(detras, detrasAntes) ? 1 : coseno(local, 0, 0.4);
  const oscuro = detras.tipo === 'fondo' ? FONDOS_COLORES[detras.f].oscuro : ESCENARIOS_OSCUROS.has(detras.e);
  const colorBase = detras.tipo === 'fondo' ? FONDOS_COLORES[detras.f].abajo : '#000000';

  const colocados = colocar(d);
  const previos = anterior === null ? [] : colocar(anterior.datos);
  const tramos = tramosDeHabla(escena, d.texto);
  const hablante = d.habla === 'narrador' ? null : colocados.find((c) => c.p.id === d.habla) ?? null;
  const golpeCamara = 1 + 0.02 * (1 - coseno(local, 0, 0.35));

  const rotuloNuevo = d.rotulo !== undefined && d.rotulo !== anterior?.datos.rotulo;
  const kRotulo = d.rotulo === undefined ? 0 : rotuloNuevo ? elastico(local, 0.05, 0.6) : 1;
  const rotuloSale = d.rotulo !== undefined && siguiente !== null && siguiente.datos.rotulo !== d.rotulo ? 1 - suave(local, escena.duracion - 0.2, escena.duracion) : 1;
  const datoNuevo = d.dato !== undefined && d.dato !== anterior?.datos.dato;
  const kDato = d.dato === undefined ? 0 : datoNuevo ? elastico(local, 0.35, 0.9) : 1;
  const plastico = 'inset 0 10px 18px rgba(255,255,255,.45), inset 0 -14px 20px rgba(0,0,0,.18), 0 16px 30px rgba(0,0,0,.35)';

  return (
    <AbsoluteFill style={{ backgroundColor: colorBase, overflow: 'hidden' }}>
      <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`} style={{ position: 'absolute', inset: 0 }}>
        {kFondo < 1 && pintar(detrasAntes, 1)}
        {pintar(detras, kFondo)}
        <g transform={`translate(540 ${SUELO}) scale(${golpeCamara}) translate(-540 ${-SUELO})`}>
          {colocados.map((c, i) => {
            const previo = previos.find((p) => p.p.id === c.p.id) ?? null;
            const sigue = siguiente === null || siguiente.datos.personajes.some((p) => p.id === c.p.id);
            return (
              <Personaje
                key={`${c.p.id}-${i}`}
                col={c}
                idx={i}
                escena={escena}
                local={local}
                t={t}
                habla={hablante === c}
                tramos={tramos}
                xHablante={hablante?.x ?? null}
                previo={previo}
                sigue={sigue}
                oscuro={oscuro}
              />
            );
          })}
        </g>
      </svg>

      {d.rotulo !== undefined && kRotulo > 0.001 && (
        <div style={{ position: 'absolute', left: 70, right: ZONA_SEGURA.derecha + 10, top: ZONA_SEGURA.arriba + 20, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              transform: `rotate(-2deg) scale(${kRotulo * rotuloSale})`,
              background: acento,
              borderRadius: 999,
              boxShadow: plastico,
              padding: '18px 44px 14px',
              fontFamily: 'Bowlby One',
              fontSize: d.rotulo.length > 22 ? 50 : 62,
              lineHeight: 1.05,
              color: a.tinta,
              textAlign: 'center',
              maxWidth: 800,
            }}
          >
            {d.rotulo}
          </div>
        </div>
      )}
      {d.dato !== undefined && kDato > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: 640,
            top: ZONA_SEGURA.arriba + 200,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 28%, #FFFFFF 0%, #F1F1F5 55%, #D9D9E2 100%)',
            boxShadow: '0 16px 30px rgba(0,0,0,.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${8 + 3 * Math.sin(t * 2)}deg) scale(${kDato})`,
            fontFamily: 'Bowlby One',
            fontSize: d.dato.length <= 3 ? 88 : d.dato.length <= 5 ? 64 : d.dato.length <= 7 ? 50 : 38,
            whiteSpace: 'nowrap',
            color: a.tinta,
            lineHeight: 1,
            padding: 10,
            boxSizing: 'border-box',
          }}
        >
          {d.dato}
        </div>
      )}
      {colocados.map((c, i) => {
        if (c.p.globo === undefined) return null;
        const f = FORMAS_DEF[c.p.forma];
        const top = SUELO + c.escala * (f.cima - 60) - 10;
        return <Globo key={i} texto={c.p.globo} x={c.x} y={top} local={local - c.p.retraso} tinta={a.tinta} />;
      })}
      {a.mostrar_fuente && d.fuente !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: ZONA_SEGURA.izquierda,
            right: ZONA_SEGURA.derecha,
            top: SUELO + 22,
            opacity: 0.95 * coseno(local, 0.2, 0.6),
          }}
        >
          <span
            style={{
              fontFamily: 'Poppins',
              fontWeight: 600,
              fontSize: 24,
              color: '#F2F2F6',
              background: 'rgba(16,16,22,.55)',
              borderRadius: 999,
              padding: '6px 18px',
            }}
          >
            Fuente: {d.fuente}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
}

