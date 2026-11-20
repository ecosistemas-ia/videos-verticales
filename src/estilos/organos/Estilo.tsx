// «Órganos con cara». Personajes de diseño propio (personajes.ts) sobre un fondo plano con detalles del interior del
// cuerpo. Quien habla mueve la boca con la voz (o al ritmo estimado si no hay voz); los demás le miran y reaccionan.
// Un personaje que sigue de una escena a otra no vuelve a entrar: se desliza a su nuevo sitio.

import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import bowlby400 from '@fontsource/bowlby-one/files/bowlby-one-latin-400-normal.woff2';
import poppins600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff2';
import poppins800 from '@fontsource/poppins/files/poppins-latin-800-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ALTO, ANCHO, ZONA_SEGURA, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { coseno, elastico, fraccionX, hash, limitar, mezclar, mezclarColor, onda, ruido, ruido2, semillaDe, suave, tono } from '../_marionetas/curvas.ts';
import { aperturaBoca, momentoEn, tramosDeHabla } from '../_marionetas/tiempo.ts';
import { ORGANOS, type Organo } from './personajes.ts';
import type { AjustesOrganos, Emocion, EscenaOrganos, Fondo, PersonajeOrgano } from './reglas.ts';

cargarFuentes([
  { familia: 'Bowlby One', url: bowlby400, peso: 400 },
  { familia: 'Poppins', url: poppins600, peso: 600 },
  { familia: 'Poppins', url: poppins800, peso: 800 },
]);

const SUELO = 1225;
const PIERNA = 64;

interface ColoresFondo {
  readonly arriba: string;
  readonly abajo: string;
  readonly motivo: string;
  readonly suelo: string;
}

const FONDOS_COLORES: Readonly<Record<Fondo, ColoresFondo>> = {
  cuerpo: { arriba: '#FFC9B8', abajo: '#FF9E8A', motivo: '#FFE2D8', suelo: '#E5705F' },
  cerebro: { arriba: '#CDBDF7', abajo: '#A28CE6', motivo: '#EDE6FF', suelo: '#7F67CF' },
  sangre: { arriba: '#F28189', abajo: '#D44E5B', motivo: '#B3303F', suelo: '#9E2A39' },
  estomago: { arriba: '#F6E894', abajo: '#E2C95A', motivo: '#FFF8CF', suelo: '#C3A43A' },
  pulmones: { arriba: '#C6E8F8', abajo: '#92CBEC', motivo: '#EEF9FF', suelo: '#6AA5D0' },
  noche: { arriba: '#343A7A', abajo: '#1C1F4E', motivo: '#F7E7A6', suelo: '#14163C' },
};

/** De una fracción del ancho a x en píxeles, sin la franja de botones de la derecha. */
const xPx = (f: number): number => 70 + f * 880;

/** Lo que se puede ocupar sin tapar la franja de botones de la derecha. */
const BORDE_IZQ = 50;
const BORDE_DER = ANCHO - ZONA_SEGURA.derecha + 60;

function Fondos({ fondo, t, opacidad }: { fondo: Fondo; t: number; opacidad: number }): ReactNode {
  const c = FONDOS_COLORES[fondo];
  const motivos: ReactNode[] = [];
  if (fondo === 'cuerpo') {
    for (let i = 0; i < 3; i++) {
      const y0 = 420 + i * 300;
      const d = Array.from({ length: 12 }, (_, k) => {
        const x = -60 + k * 110;
        const y = y0 + 40 * Math.sin(k * 0.9 + t * 0.6 + i * 2);
        return `${k === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
      }).join(' ');
      motivos.push(<path key={`v${i}`} d={d} stroke={c.motivo} strokeWidth={34} fill="none" opacity={0.28} strokeLinecap="round" strokeLinejoin="round" />);
    }
    for (let i = 0; i < 9; i++) {
      const x = (hash(i, 1) * 1180 + t * (8 + hash(i, 2) * 10)) % 1180 - 50;
      const y = 300 + hash(i, 3) * 1000 + 20 * Math.sin(t * 0.5 + i);
      const r = 40 + hash(i, 4) * 50;
      motivos.push(
        <g key={`c${i}`} opacity={0.45}>
          <circle cx={x} cy={y} r={r} fill={c.motivo} opacity={0.5} />
          <circle cx={x} cy={y} r={r} fill="none" stroke={c.motivo} strokeWidth={6} />
          <circle cx={x + r * 0.2} cy={y - r * 0.1} r={r * 0.28} fill={c.abajo} opacity={0.5} />
        </g>,
      );
    }
  } else if (fondo === 'cerebro') {
    const nodos = Array.from({ length: 14 }, (_, i) => ({ x: 60 + hash(i, 11) * 960, y: 260 + hash(i, 12) * 1000 }));
    nodos.forEach((n, i) => {
      const m = nodos[(i * 5 + 3) % nodos.length];
      const k = (t * 0.5 + hash(i, 13)) % 1;
      motivos.push(
        <g key={`n${i}`}>
          <line x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke={c.motivo} strokeWidth={6} opacity={0.35} />
          <circle cx={mezclar(n.x, m.x, k)} cy={mezclar(n.y, m.y, k)} r={10} fill="#FFFFFF" opacity={0.7} />
          <circle cx={n.x} cy={n.y} r={22} fill={c.motivo} opacity={0.55} />
        </g>,
      );
    });
  } else if (fondo === 'sangre') {
    for (let i = 0; i < 14; i++) {
      const x = ((hash(i, 21) * 1300 + t * (40 + hash(i, 22) * 30)) % 1300) - 110;
      const y = 260 + hash(i, 23) * 1000 + 30 * Math.sin(t * 0.7 + i);
      const r = 36 + hash(i, 24) * 34;
      motivos.push(
        <g key={`g${i}`} opacity={0.55} transform={`rotate(${(t * 20 + i * 40) % 360} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.8} fill={c.motivo} />
          <ellipse cx={x} cy={y} rx={r * 0.5} ry={r * 0.36} fill={tono(c.motivo, -0.2)} />
        </g>,
      );
    }
  } else if (fondo === 'estomago') {
    for (let i = 0; i < 16; i++) {
      const vida = (t * (0.08 + hash(i, 31) * 0.06) + hash(i, 32)) % 1;
      const x = 40 + hash(i, 33) * 1000 + 20 * Math.sin(t * 2 + i);
      const y = 1200 - vida * 1000;
      const r = 10 + hash(i, 34) * 26;
      motivos.push(<circle key={`b${i}`} cx={x} cy={y} r={r} fill={c.motivo} fillOpacity={0.35} stroke={c.motivo} strokeWidth={5} opacity={0.9 * (1 - vida)} />);
    }
  } else if (fondo === 'pulmones') {
    const racimos: [number, number][] = [[120, 360], [900, 420], [140, 980], [930, 1000], [520, 300]];
    racimos.forEach(([cx, cy], j) => {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = 30 + 6 * Math.sin(t * 1.9 + j);
        motivos.push(<circle key={`a${j}-${i}`} cx={cx + Math.cos(a) * 46} cy={cy + Math.sin(a) * 46} r={r} fill={c.motivo} opacity={0.4} />);
      }
    });
    for (let i = 0; i < 4; i++) {
      const y = 500 + i * 180;
      const desfase = (t * 60 + i * 200) % 1300;
      motivos.push(<path key={`w${i}`} d={`M${desfase - 300} ${y} c 60 -40 120 40 180 0 s 120 -40 180 0`} stroke={c.motivo} strokeWidth={8} fill="none" opacity={0.5} strokeLinecap="round" />);
    }
  } else {
    for (let i = 0; i < 30; i++) {
      const x = hash(i, 41) * 1080;
      const y = 220 + hash(i, 42) * 900;
      const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * (1 + hash(i, 43) * 2) + i));
      motivos.push(<circle key={`s${i}`} cx={x} cy={y} r={3 + hash(i, 44) * 4} fill={c.motivo} opacity={tw} />);
    }
    motivos.push(
      <path key="luna" d="M850 330 a90 90 0 1 0 60 160 a72 72 0 1 1 -60 -160 z" fill={c.motivo} opacity={0.95} transform={`translate(-30 ${190 + 6 * Math.sin(t * 0.5)})`} />,
    );
  }
  const ondaSuelo = Array.from({ length: 13 }, (_, k) => {
    const x = k * 90;
    const y = SUELO + 6 + 10 * Math.sin(k * 1.3 + t * 0.8);
    return `L${x} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <g opacity={opacidad}>
      <defs>
        <linearGradient id={`fondo-${fondo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.arriba} />
          <stop offset="1" stopColor={c.abajo} />
        </linearGradient>
        <radialGradient id={`vineta-${fondo}`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.22} />
        </radialGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill={`url(#fondo-${fondo})`} />
      {motivos}
      <path d={`M0 ${SUELO + 10} ${ondaSuelo} L1080 ${SUELO + 10} L1080 ${ALTO} L0 ${ALTO} Z`} fill={c.suelo} />
      <rect width={ANCHO} height={ALTO} fill={`url(#vineta-${fondo})`} />
    </g>
  );
}

interface Rasgos {
  readonly parpado: number;
  readonly ceja: number;
  readonly alzaCeja: number;
  readonly sonrisa: number;
  readonly anchoBoca: number;
  readonly ojo: number;
  readonly pupila: number;
}

const RASGOS: Readonly<Record<Emocion, Rasgos>> = {
  feliz: { parpado: 0, ceja: 8, alzaCeja: 8, sonrisa: 1, anchoBoca: 1, ojo: 1, pupila: 1 },
  neutral: { parpado: 0.12, ceja: 0, alzaCeja: 0, sonrisa: 0.25, anchoBoca: 0.8, ojo: 1, pupila: 1 },
  triste: { parpado: 0.3, ceja: 24, alzaCeja: 6, sonrisa: -0.75, anchoBoca: 0.8, ojo: 1, pupila: 1.05 },
  cansado: { parpado: 0.52, ceja: 6, alzaCeja: -6, sonrisa: -0.25, anchoBoca: 0.75, ojo: 0.95, pupila: 1 },
  enojado: { parpado: 0.26, ceja: -26, alzaCeja: -8, sonrisa: -0.55, anchoBoca: 0.9, ojo: 0.95, pupila: 0.9 },
  asustado: { parpado: 0, ceja: 18, alzaCeja: 18, sonrisa: -0.5, anchoBoca: 0.65, ojo: 1.16, pupila: 0.62 },
  sorprendido: { parpado: 0, ceja: 6, alzaCeja: 24, sonrisa: 0, anchoBoca: 0.5, ojo: 1.16, pupila: 0.8 },
  mareado: { parpado: 0, ceja: 12, alzaCeja: 4, sonrisa: -0.3, anchoBoca: 0.8, ojo: 1, pupila: 1 },
  orgulloso: { parpado: 1, ceja: 10, alzaCeja: 12, sonrisa: 1.1, anchoBoca: 1.05, ojo: 1, pupila: 1 },
};

/** Un ojo: blanco con contorno, pupila que mira, brillos y párpado (o cerrado, o en espiral). */
function Ojo({ x, y, e, lado, r, parpado, mirada, contorno, piel, cerrado, espiral, t }: { x: number; y: number; e: number; lado: 1 | -1; r: Rasgos; parpado: number; mirada: [number, number]; contorno: string; piel: string; cerrado: 'no' | 'feliz' | 'dormido'; espiral: boolean; t: number }): ReactNode {
  const ry = e * r.ojo;
  const rx = ry * 0.82;
  if (cerrado !== 'no') {
    const curva = cerrado === 'feliz' ? -ry * 0.55 : ry * 0.45;
    return <path d={`M${x - rx} ${y} Q${x} ${y + curva} ${x + rx} ${y}`} stroke={contorno} strokeWidth={e * 0.22} fill="none" strokeLinecap="round" />;
  }
  if (espiral) {
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.45 + t * 6 * lado;
      const rr = (i / 40) * rx * 0.9;
      pts.push(`${i === 0 ? 'M' : 'L'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`);
    }
    return (
      <g>
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" stroke={contorno} strokeWidth={e * 0.18} />
        <path d={pts.join(' ')} stroke={contorno} strokeWidth={e * 0.12} fill="none" />
      </g>
    );
  }
  const pr = rx * 0.52 * r.pupila;
  const px = x + mirada[0] * rx * 0.32;
  const py = y + mirada[1] * ry * 0.25 + ry * 0.08;
  const p = limitar(parpado);
  // Párpado: casquete del color de la piel que baja desde arriba, inclinado según la emoción.
  const yl = -ry + 2 * ry * p;
  const xl = rx * Math.sqrt(Math.max(0, 1 - (yl / ry) ** 2));
  const inclina = (r.ceja < 0 ? 16 : r.ceja > 14 ? -14 : 0) * lado * (p > 0.05 ? 1 : 0);
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" />
      <circle cx={px} cy={py} r={pr} fill={contorno} />
      <circle cx={px - pr * 0.35} cy={py - pr * 0.4} r={pr * 0.36} fill="#FFFFFF" />
      <circle cx={px + pr * 0.38} cy={py + pr * 0.32} r={pr * 0.14} fill="#FFFFFF" />
      {p > 0.02 && (
        <g transform={`rotate(${inclina} ${x} ${y})`}>
          <path d={`M${x - xl - 2} ${y + yl} A${rx + 2} ${ry + 2} 0 ${p > 0.5 ? 1 : 0} 1 ${x + xl + 2} ${y + yl} Z`} fill={piel} />
          <path d={`M${x - xl} ${y + yl} L${x + xl} ${y + yl}`} stroke={contorno} strokeWidth={e * 0.16} strokeLinecap="round" />
        </g>
      )}
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke={contorno} strokeWidth={e * 0.18} />
    </g>
  );
}

interface EstadoCara {
  readonly emocion: Emocion;
  readonly boca: number;
  readonly mirada: [number, number];
  readonly parpadeo: number;
  readonly cerrado: 'no' | 'feliz' | 'dormido';
  readonly espiral: boolean;
  readonly bostezo: number;
  readonly lengua: boolean;
}

function Cara({ o, c, contorno, t, semilla }: { o: Organo; c: EstadoCara; contorno: string; t: number; semilla: number }): ReactNode {
  const { x, y, sep, ojo: e } = o.cara;
  const r = RASGOS[c.emocion];
  const parpado = Math.max(r.parpado === 1 ? 0 : r.parpado, c.parpadeo);
  const cerrado = c.cerrado !== 'no' ? c.cerrado : r.parpado === 1 ? 'feliz' : 'no';
  const espiral = c.espiral || c.emocion === 'mareado';
  // Boca: comisuras arriba (sonrisa) o abajo; se abre al hablar.
  const ancho = e * 1.5 * r.anchoBoca;
  const by = y + e * 1.55;
  const abre = Math.max(c.boca, c.bostezo * 1.6, c.emocion === 'sorprendido' ? 0.7 : 0, c.emocion === 'asustado' ? 0.35 : 0);
  const s = r.sonrisa * (1 - 0.35 * Math.min(1, abre));
  const comisura = -s * e * 0.38;
  const alto = abre * e * 1.05;
  const redonda = c.emocion === 'sorprendido' || c.bostezo > 0.3;
  const anchoReal = redonda ? ancho * mezclar(0.55, 0.75, Math.min(1, abre)) : ancho;
  const arriba = by + comisura - s * e * 0.1 - alto * 0.25;
  const abajo = by + comisura + s * e * 0.55 + alto;
  const dBoca = `M${x - anchoReal / 2} ${by + comisura} Q${x} ${arriba} ${x + anchoReal / 2} ${by + comisura} Q${x} ${abajo} ${x - anchoReal / 2} ${by + comisura} Z`;
  const cejaY = y - e * r.ojo - e * 0.55 - r.alzaCeja - 4 * c.boca;
  const cejas = ([-1, 1] as const).map((lado) => {
    const ex = x + (lado * sep) / 2;
    const largo = e * 0.75;
    const ang = (r.ceja * Math.PI) / 180;
    // Extremo interior (hacia el centro) sube con ángulo positivo.
    const xi = ex - lado * largo;
    const xo = ex + lado * largo;
    const yi = cejaY - Math.sin(ang) * largo;
    const yo = cejaY + Math.sin(ang) * largo;
    return <path key={lado} d={`M${xi} ${yi} Q${ex} ${cejaY - e * 0.18} ${xo} ${yo}`} stroke={contorno} strokeWidth={e * 0.26} strokeLinecap="round" fill="none" />;
  });
  const lagrima = c.emocion === 'triste' ? (t * 0.7 + (semilla % 7) * 0.1) % 1 : -1;
  const sudor = c.emocion === 'asustado' ? (t * 0.9) % 1 : -1;
  return (
    <g>
      {/* Mejillas. */}
      <ellipse cx={x - sep / 2 - e * 0.55} cy={y + e * 1.05} rx={e * 0.5} ry={e * 0.28} fill="#FF6F8E" opacity={0.42} />
      <ellipse cx={x + sep / 2 + e * 0.55} cy={y + e * 1.05} rx={e * 0.5} ry={e * 0.28} fill="#FF6F8E" opacity={0.42} />
      {c.emocion === 'cansado' && (
        <>
          <path d={`M${x - sep / 2 - e * 0.6} ${y + e * 1.05} Q${x - sep / 2} ${y + e * 1.45} ${x - sep / 2 + e * 0.6} ${y + e * 1.05}`} stroke="#6A4A8C" strokeWidth={e * 0.12} fill="none" opacity={0.6} />
          <path d={`M${x + sep / 2 - e * 0.6} ${y + e * 1.05} Q${x + sep / 2} ${y + e * 1.45} ${x + sep / 2 + e * 0.6} ${y + e * 1.05}`} stroke="#6A4A8C" strokeWidth={e * 0.12} fill="none" opacity={0.6} />
        </>
      )}
      {c.emocion === 'enojado' && <ellipse cx={x} cy={y} rx={sep} ry={e * 1.6} fill="#FF2A2A" opacity={0.12 + 0.06 * onda(t, 2, semilla)} />}
      <Ojo x={x - sep / 2} y={y} e={e} lado={-1} r={r} parpado={parpado} mirada={c.mirada} contorno={contorno} piel={o.color} cerrado={cerrado} espiral={espiral} t={t} />
      <Ojo x={x + sep / 2} y={y} e={e} lado={1} r={r} parpado={parpado} mirada={c.mirada} contorno={contorno} piel={o.color} cerrado={cerrado} espiral={espiral} t={t} />
      {cejas}
      {abre < 0.06 && !redonda ? (
        <path d={`M${x - ancho / 2} ${by + comisura} Q${x} ${by + comisura + s * e * 0.7} ${x + ancho / 2} ${by + comisura}`} stroke={contorno} strokeWidth={e * 0.2} strokeLinecap="round" fill="none" />
      ) : (
        <g>
          <path d={dBoca} fill="#5A1A35" stroke={contorno} strokeWidth={e * 0.16} strokeLinejoin="round" />
          <clipPath id={`boca-${semilla}`}>
            <path d={dBoca} />
          </clipPath>
          <g clipPath={`url(#boca-${semilla})`}>
            <ellipse cx={x} cy={abajo - alto * 0.05} rx={anchoReal * 0.32} ry={Math.max(4, alto * 0.42)} fill="#FF7A93" />
            {c.emocion === 'enojado' && <rect x={x - anchoReal / 2} y={arriba - 4} width={anchoReal} height={e * 0.32 + 4} fill="#FFFFFF" />}
          </g>
        </g>
      )}
      {c.lengua && <path d={`M${x + 4} ${by + e * 0.2} q 10 30 0 44 q -16 6 -18 -10 z`} fill="#FF7A93" stroke={contorno} strokeWidth={e * 0.12} />}
      {lagrima >= 0 && (
        <path d={`M${x - sep / 2 + e * 0.4} ${y + e * 0.8 + lagrima * e * 2.2} q 9 14 0 20 q -9 -6 0 -20 z`} fill="#7EC8FF" stroke={contorno} strokeWidth={3} opacity={1 - lagrima} />
      )}
      {sudor >= 0 && (
        <path d={`M${x + sep / 2 + e * 1.3} ${y - e * 1.1 + sudor * e * 1.6} q 11 16 0 24 q -11 -8 0 -24 z`} fill="#BFE6FF" stroke={contorno} strokeWidth={3} opacity={1 - sudor * 0.8} />
      )}
    </g>
  );
}

/** Brazo de goma: curva de hombro a mano, con contorno, y la mano redonda (con índice si señala). */
function Brazo({ h, m, lado, color, contorno, dedo }: { h: [number, number]; m: [number, number]; lado: 1 | -1; color: string; contorno: string; dedo: boolean }): ReactNode {
  const mx = (h[0] + m[0]) / 2;
  const my = (h[1] + m[1]) / 2;
  const dx = m[0] - h[0];
  const dy = m[1] - h[1];
  const l = Math.hypot(dx, dy) || 1;
  const curva = 0.22 * l * lado;
  const cx = mx + (-dy / l) * curva;
  const cy = my + (dx / l) * curva;
  const d = `M${h[0]} ${h[1]} Q${cx} ${cy} ${m[0]} ${m[1]}`;
  const ang = (Math.atan2(m[1] - cy, m[0] - cx) * 180) / Math.PI;
  return (
    <g>
      <path d={d} stroke={contorno} strokeWidth={30} fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth={17} fill="none" strokeLinecap="round" />
      <g transform={`translate(${m[0]} ${m[1]}) rotate(${ang})`}>
        {dedo && <rect x={6} y={-7} width={40} height={14} rx={7} fill={color} stroke={contorno} strokeWidth={6} />}
        <circle cx={0} cy={0} r={21} fill={color} stroke={contorno} strokeWidth={7} />
        <circle cx={-4} cy={-14} r={9} fill={color} stroke={contorno} strokeWidth={6} />
        <circle cx={-6} cy={-6} r={6} fill="#FFFFFF" opacity={0.25} />
      </g>
    </g>
  );
}

function Pierna({ c, p, color, contorno, lado }: { c: readonly [number, number]; p: [number, number]; color: string; contorno: string; lado: 1 | -1 }): ReactNode {
  const d = `M${c[0]} ${c[1]} Q${(c[0] + p[0]) / 2 + lado * 10} ${(c[1] + p[1]) / 2} ${p[0]} ${p[1] - 10}`;
  return (
    <g>
      <path d={d} stroke={contorno} strokeWidth={30} fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth={17} fill="none" strokeLinecap="round" />
      <ellipse cx={p[0] + lado * 10} cy={p[1] - 6} rx={30} ry={16} fill={contorno} />
      <ellipse cx={p[0] + lado * 2} cy={p[1] - 13} rx={10} ry={5} fill="#FFFFFF" opacity={0.3} />
    </g>
  );
}

interface Colocado {
  readonly p: PersonajeOrgano;
  readonly x: number;
  readonly escala: number;
}

/** Coloca a los personajes: tamaño según cuántos son y separación mínima para que no se pisen. */
function colocar(e: EscenaOrganos): Colocado[] {
  const n = e.personajes.length;
  const base = [1.55, 1.3, 1.0][n - 1] ?? 1.0;
  const lista = e.personajes.map((p) => ({ p, x: xPx(fraccionX(p.x)), escala: base * p.escala }));
  const dentro = lista.filter((c) => c.x > BORDE_IZQ - 40 && c.x < BORDE_DER + 40);
  const ancho = (c: { p: PersonajeOrgano; escala: number }): number => ORGANOS[c.p.personaje].ancho * c.escala + 14;
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
  contorno,
  xHablante,
  previo,
  sigue,
}: {
  col: Colocado;
  idx: number;
  escena: EscenaLista<EscenaOrganos>;
  local: number;
  t: number;
  habla: boolean;
  tramos: ReturnType<typeof tramosDeHabla>;
  contorno: string;
  xHablante: number | null;
  previo: Colocado | null;
  sigue: boolean;
}): ReactNode {
  const { p } = col;
  const o = ORGANOS[p.personaje];
  const semilla = semillaDe(`${p.personaje}-${escena.indice}-${idx}`) % 997;
  const fase = (semilla % 100) / 16;
  const dur = escena.duracion;
  const tl = Math.max(0, local - p.retraso);
  const empezo = local >= p.retraso;
  const accion = empezo ? p.accion : 'quieto';
  const boca = habla ? aperturaBoca(tramos, local) : 0;

  // Entrada, salida y deslizamiento entre escenas.
  let x = col.x;
  let escala = col.escala;
  if (previo !== null) {
    const k = coseno(local, 0, 0.55);
    x = mezclar(previo.x, col.x, k);
    escala = mezclar(previo.escala, col.escala, k);
  }
  let aparece = previo === null ? elastico(local, 0.02 + (p.accion === 'entra' ? p.retraso : 0), 0.62 + (p.accion === 'entra' ? p.retraso : 0)) : 1;
  if (p.accion === 'entra' && local < p.retraso) aparece = 0;
  let subida = 0;
  if (p.accion === 'entra') {
    subida = (1 - aparece) * 900;
    aparece = local < p.retraso ? 0 : 1;
  }
  if (!sigue) aparece *= 1 - suave(local, dur - 0.22, dur);
  if (aparece <= 0.001) return null;

  // Cuerpo: rebote, aplastar y estirar, latido o respiración.
  let dy = -7 * Math.abs(Math.sin(Math.PI * 1.05 * t + fase)) - 9 * boca;
  let sx = 1 + 0.018 * Math.sin(2 * Math.PI * 1.05 * t + fase);
  let sy = 1 - 0.018 * Math.sin(2 * Math.PI * 1.05 * t + fase) + 0.03 * boca;
  let giro = 2.5 * ruido(t * 0.5, semilla) + 2 * boca * onda(t, 1.7, fase);
  let dxCuerpo = 0;
  let cerrado: EstadoCara['cerrado'] = 'no';
  let espiral = false;
  let bostezo = 0;
  let lengua = false;
  let emocion = p.emocion;
  let pasos = 0;
  let enAire = 0;
  if (accion === 'salta' || accion === 'celebra') {
    const periodo = accion === 'salta' ? 0.9 : 0.62;
    const altura = accion === 'salta' ? 130 : 46;
    const f = (tl % periodo) / periodo;
    const vuelo = Math.max(0, Math.sin(Math.PI * Math.min(1, f / 0.8)));
    enAire = vuelo;
    dy = -altura * vuelo;
    const aterriza = f > 0.8 ? Math.sin(Math.PI * ((f - 0.8) / 0.2)) : 0;
    sy = 1 + 0.12 * vuelo * (1 - vuelo) * 2 - 0.16 * aterriza;
    sx = 1 - 0.08 * vuelo * (1 - vuelo) * 2 + 0.14 * aterriza;
  }
  if (accion === 'tiembla') {
    dxCuerpo = 5 * Math.sin(2 * Math.PI * 17 * t);
    sy = 0.97 + 0.01 * Math.sin(2 * Math.PI * 13 * t);
  }
  if (accion === 'duerme') {
    cerrado = 'dormido';
    giro = 8 + 2 * Math.sin(t * 1.2);
    sy = 1 + 0.035 * Math.sin(2 * Math.PI * 0.28 * t);
    sx = 1 - 0.02 * Math.sin(2 * Math.PI * 0.28 * t);
    dy = 0;
  }
  if (accion === 'bosteza') {
    bostezo = suave(tl, 0.25, 0.75) * (1 - suave(tl, 1.9, 2.4));
    sy += 0.08 * bostezo;
    sx -= 0.04 * bostezo;
    if (bostezo > 0.3) cerrado = 'dormido';
    if (emocion === 'feliz') emocion = 'cansado';
  }
  let desmayo = 0;
  if (accion === 'se_desmaya') {
    desmayo = suave(tl, 0.7, 1.2);
    // Cae de lado girando sobre su centro y se queda tumbado en el suelo, con un pequeño rebote.
    const rebote = desmayo >= 1 ? 4 * Math.exp(-(tl - 1.2) * 6) * Math.sin((tl - 1.2) * 30) : 0;
    giro = (86 + rebote) * desmayo * (fase > 3 ? 1 : -1);
    espiral = tl > 0.5;
    lengua = desmayo > 0.5;
    dy = 0;
  }
  if (accion === 'corre') {
    const destino = p.hasta === undefined ? col.x : xPx(fraccionX(p.hasta));
    const k = suave(tl, 0.1, Math.max(0.8, dur - p.retraso - 0.4));
    const quieto = 1 - 4 * k * (1 - k);
    x = mezclar(col.x, destino, k);
    pasos = (1 - quieto) * 1;
    dy = -14 * Math.abs(Math.sin(2 * Math.PI * 2.4 * t)) * pasos;
    giro = 6 * Math.sign(destino - col.x) * pasos;
  }
  if (accion === 'sale') {
    const k = suave(tl, Math.max(0, dur - p.retraso - 1.0), dur - p.retraso - 0.3);
    dy = -60 * Math.sin(Math.PI * Math.min(1, k * 2)) + (k > 0.5 ? (k - 0.5) * 2 * 900 : 0);
  }

  // Parpadeo: un cierre corto cada pocos segundos.
  const periodoParpadeo = 2.6 + (semilla % 13) * 0.12;
  const enCiclo = (t + fase) % periodoParpadeo;
  const parpadeo = enCiclo < 0.16 ? Math.sin((Math.PI * enCiclo) / 0.16) : 0;

  // A dónde mira.
  const dirMira = p.mira === 'izquierda' ? -1 : p.mira === 'derecha' ? 1 : p.mira === 'frente' ? 0 : xHablante !== null && !habla ? Math.sign(xHablante - x) : 0.35 * ruido(t * 0.4, semilla);
  const mirada: [number, number] = [dirMira, 0.1 * ruido(t * 0.6, semilla + 3)];

  // Brazos.
  const [hI, hD] = o.hombros;
  const brazo = (lado: 1 | -1): { m: [number, number]; dedo: boolean } => {
    const h = lado === -1 ? hI : hD;
    const balanceo = 6 * Math.sin(2 * Math.PI * 0.9 * t + fase + (lado === 1 ? 1 : 0));
    let m: [number, number] = [h[0] + lado * 36 + balanceo * 0.5, h[1] + 96 + balanceo];
    let dedo = false;
    if (habla && lado === 1 && accion === 'quieto') {
      const g = boca * 0.6 + 0.4 * Math.max(0, ruido2(t * 1.6, semilla));
      m = [h[0] + 70 + 24 * ruido2(t * 1.3, semilla + 5), h[1] + 40 - 110 * g];
    }
    switch (accion) {
      case 'saluda':
        if (lado === 1) m = [h[0] + 64 + 26 * Math.sin(2 * Math.PI * 2.3 * t), h[1] - 136];
        break;
      case 'senala': {
        const dir = p.mira === 'izquierda' ? -1 : p.mira === 'derecha' ? 1 : xHablante !== null ? Math.sign(xHablante - x) || 1 : 1;
        if (lado === dir) {
          m = [h[0] + dir * (150 + 6 * Math.sin(t * 3)), h[1] - 26];
          dedo = true;
        }
        break;
      }
      case 'celebra':
        m = [h[0] + lado * 74, h[1] - 150 + 14 * Math.sin(2 * Math.PI * 3 * t + lado)];
        break;
      case 'tiembla':
        m = [h[0] - lado * 34 + 4 * Math.sin(2 * Math.PI * 15 * t), h[1] + 50];
        break;
      case 'bosteza':
        m = [mezclar(m[0], h[0] + lado * 60, bostezo), mezclar(m[1], h[1] - 170, bostezo)];
        break;
      case 'duerme':
        m = [h[0] + lado * 18, h[1] + 100];
        break;
      case 'corre': {
        const f = 2 * Math.PI * 2.4 * t + (lado === 1 ? 0 : Math.PI);
        m = [h[0] + lado * 30 + 48 * Math.sin(f) * pasos, h[1] + 50 - 34 * Math.cos(f) * pasos];
        break;
      }
      case 'suda':
        if (lado === 1) m = [h[0] + 30 + 16 * Math.sin(2 * Math.PI * 3.2 * t), h[1] - 90 + 14 * Math.cos(2 * Math.PI * 3.2 * t)];
        break;
      case 'trabaja': {
        const golpe = Math.max(0, Math.sin(2 * Math.PI * 1.3 * t + (lado === 1 ? 0 : Math.PI)));
        m = [h[0] + lado * 70, h[1] + 50 - 110 * golpe];
        break;
      }
      case 'se_desmaya':
        m = [h[0] + lado * 60, h[1] + 70];
        break;
      default:
        break;
    }
    return { m, dedo };
  };
  const bI = brazo(-1);
  const bD = brazo(1);

  // Piernas.
  const pie = (lado: 1 | -1): [number, number] => {
    const cad = lado === -1 ? o.caderas[0] : o.caderas[1];
    const f = 2 * Math.PI * 2.4 * t + (lado === 1 ? 0 : Math.PI);
    return [cad[0] * 1.05 + 30 * Math.sin(f) * pasos, o.base + PIERNA - 18 * Math.max(0, Math.cos(f)) * pasos - 26 * enAire * (lado === 1 ? 1 : 0.7)];
  };

  // Pulso propio del órgano.
  let pulso = 1;
  let respira = 1;
  if (o.pulso === 'latido') {
    const ritmo = emocion === 'asustado' || accion === 'corre' || accion === 'trabaja' ? 1.9 : 1.15;
    const f = (t * ritmo) % 1;
    pulso = 1 + 0.06 * Math.exp(-((f - 0.05) ** 2) / 0.002) + 0.04 * Math.exp(-((f - 0.22) ** 2) / 0.002);
  }
  if (o.pulso === 'respira') respira = 1 + 0.045 * Math.sin(2 * Math.PI * 0.32 * t);

  const partes = o.partes(t);
  const sombraId = `sombra-${escena.indice}-${idx}`;
  const alturaCentro = o.base + PIERNA;
  const cuerpoT = `translate(0 ${-alturaCentro}) scale(${pulso * respira} ${pulso}) `;
  const top = -(alturaCentro + 170);

  return (
    <g transform={`translate(${x + dxCuerpo} ${SUELO + subida}) scale(${escala * aparece})`}>
      <ellipse cx={0} cy={4} rx={o.ancho * 0.36 * (1 - 0.4 * enAire)} ry={18} fill="#000" opacity={0.16} />
      <g transform={`translate(0 ${dy + desmayo * (o.base + PIERNA - o.ancho * 0.42)}) rotate(${giro} 0 ${-(o.base + PIERNA) * desmayo}) scale(${sx} ${sy})`}>
        <g transform={`translate(0 ${-alturaCentro})`}>
          <Pierna c={o.caderas[0]} p={pie(-1)} color={o.miembro} contorno={contorno} lado={-1} />
          <Pierna c={o.caderas[1]} p={pie(1)} color={o.miembro} contorno={contorno} lado={1} />
        </g>
        <g transform={cuerpoT}>
          {/* Contorno común de todas las partes y relleno encima. */}
          {partes.map((pt, i) => (
            <path key={`c${i}`} d={pt.d} fill={contorno} stroke={contorno} strokeWidth={20} strokeLinejoin="round" />
          ))}
          {partes.filter((pt) => pt.detras === true).map((pt, i) => (
            <path key={`d${i}`} d={pt.d} fill={pt.color} />
          ))}
          <clipPath id={sombraId}>
            {partes.filter((pt) => pt.detras !== true).map((pt, i) => (
              <path key={i} d={pt.d} />
            ))}
          </clipPath>
          <g clipPath={`url(#${sombraId})`}>
            <rect x={-400} y={-400} width={800} height={800} fill={o.sombra} />
            <g transform="translate(-16 -18)">
              {partes.filter((pt) => pt.detras !== true).map((pt, i) => (
                <path key={i} d={pt.d} fill={pt.color} />
              ))}
            </g>
            {(o.manchas ?? []).map((m, i) => (
              <path key={`m${i}`} d={m.d} fill={m.color} />
            ))}
          </g>
          {o.lineas.map((d, i) => (
            <path key={`l${i}`} d={d} stroke={contorno} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.42} />
          ))}
          <ellipse cx={o.brillo.x} cy={o.brillo.y} rx={o.brillo.rx} ry={o.brillo.ry} fill="#FFFFFF" opacity={0.55} transform={`rotate(-24 ${o.brillo.x} ${o.brillo.y})`} />
          <Cara o={o} c={{ emocion, boca, mirada, parpadeo, cerrado, espiral, bostezo, lengua }} contorno={contorno} t={t} semilla={semilla} />
        </g>
        <g transform={`translate(0 ${-alturaCentro})`}>
          <Brazo h={[hI[0], hI[1]]} m={bI.m} lado={-1} color={o.miembro} contorno={contorno} dedo={bI.dedo} />
          <Brazo h={[hD[0], hD[1]]} m={bD.m} lado={1} color={o.miembro} contorno={contorno} dedo={bD.dedo} />
          {accion === 'duerme' &&
            [0, 1, 2].map((i) => {
              const v = (t * 0.45 + i / 3) % 1;
              return (
                <text key={i} x={90 + v * 90} y={top + 40 - v * 170} fontFamily="Bowlby One" fontSize={40 + v * 30} fill="#FFFFFF" stroke={contorno} strokeWidth={6} paintOrder="stroke" opacity={1 - v}>
                  Z
                </text>
              );
            })}
          {accion === 'suda' &&
            [0, 1].map((i) => {
              const v = (t * 1.1 + i * 0.5) % 1;
              return <path key={i} d={`M${-o.ancho * 0.42 + i * 30} ${-150 + v * 120} q 12 18 0 27 q -12 -9 0 -27 z`} fill="#BFE6FF" stroke={contorno} strokeWidth={4} opacity={1 - v} />;
            })}
        </g>
      </g>
    </g>
  );
}

function Globo({ texto, x, y, local, color, contorno }: { texto: string; x: number; y: number; local: number; color: string; contorno: string }): ReactNode {
  const k = elastico(local, 0.25, 0.75);
  if (k <= 0.001) return null;
  const izquierda = Math.min(Math.max(40, x - 230), ANCHO - ZONA_SEGURA.derecha - 460);
  return (
    <div
      style={{
        position: 'absolute',
        left: izquierda,
        top: y,
        width: 460,
        display: 'flex',
        justifyContent: 'center',
        transform: `translateY(-100%) scale(${k})`,
        transformOrigin: `${x - izquierda}px 100%`,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: color,
          border: `7px solid ${contorno}`,
          borderRadius: 36,
          padding: '16px 26px',
          fontFamily: 'Poppins',
          fontWeight: 800,
          fontSize: 38,
          lineHeight: 1.15,
          color: contorno,
          textAlign: 'center',
          boxShadow: `0 10px 0 ${contorno}`,
        }}
      >
        {texto}
        <div
          style={{
            position: 'absolute',
            left: Math.min(380, Math.max(30, x - izquierda - (460 - 0) / 2 + 200)),
            bottom: -34,
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderTop: `34px solid ${contorno}`,
          }}
        />
      </div>
    </div>
  );
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = props.ajustes as AjustesOrganos;
  const escenas = props.escenas as readonly EscenaLista<EscenaOrganos>[];
  const m = momentoEn(escenas, t);
  if (m === null) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  const { escena, local, anterior, siguiente } = m;
  const d = escena.datos;
  const acento = props.guion.marca.acento;
  const contorno = a.contorno;
  const fondo = d.fondo ?? a.fondo;
  const fondoAntes = anterior?.datos.fondo ?? a.fondo;
  const kFondo = anterior === null || fondoAntes === fondo ? 1 : coseno(local, 0, 0.4);

  const colocados = colocar(d);
  const previos = anterior === null ? [] : colocar(anterior.datos);
  const tramos = tramosDeHabla(escena, d.texto);
  const hablante = d.habla === 'narrador' ? null : colocados.find((c) => c.p.personaje === d.habla) ?? null;
  const golpeCamara = 1 + 0.025 * (1 - coseno(local, 0, 0.35));

  // Rótulo y dato: entran si cambian respecto a la escena anterior.
  const rotuloNuevo = d.rotulo !== undefined && d.rotulo !== anterior?.datos.rotulo;
  const kRotulo = d.rotulo === undefined ? 0 : rotuloNuevo ? elastico(local, 0.05, 0.6) : 1;
  const rotuloSale = d.rotulo !== undefined && siguiente !== null && siguiente.datos.rotulo !== d.rotulo ? 1 - suave(local, escena.duracion - 0.2, escena.duracion) : 1;
  const datoNuevo = d.dato !== undefined && d.dato !== anterior?.datos.dato;
  const kDato = d.dato === undefined ? 0 : datoNuevo ? elastico(local, 0.35, 0.9) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: FONDOS_COLORES[fondo].abajo, overflow: 'hidden' }}>
      <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`} style={{ position: 'absolute', inset: 0 }}>
        {kFondo < 1 && <Fondos fondo={fondoAntes} t={t} opacidad={1} />}
        <Fondos fondo={fondo} t={t} opacidad={kFondo} />
        <g transform={`translate(540 ${SUELO}) scale(${golpeCamara}) translate(-540 ${-SUELO})`}>
          {colocados.map((c, i) => {
            const previo = previos.find((p) => p.p.personaje === c.p.personaje) ?? null;
            // En la última escena nadie se va: se quedan en pantalla durante la cola.
            const sigue = siguiente === null || siguiente.datos.personajes.some((p) => p.personaje === c.p.personaje);
            return (
              <Personaje
                key={`${c.p.personaje}-${i}`}
                col={c}
                idx={i}
                escena={escena}
                local={local}
                t={t}
                habla={hablante === c}
                tramos={tramos}
                contorno={contorno}
                xHablante={hablante?.x ?? null}
                previo={previo}
                sigue={sigue}
              />
            );
          })}
        </g>
      </svg>

      {d.rotulo !== undefined && kRotulo > 0.001 && (
        <div style={{ position: 'absolute', left: 70, right: ZONA_SEGURA.derecha + 10, top: ZONA_SEGURA.arriba + 20, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              transform: `rotate(-2.5deg) scale(${kRotulo * rotuloSale})`,
              background: acento,
              border: `8px solid ${contorno}`,
              borderRadius: 28,
              boxShadow: `0 12px 0 ${contorno}`,
              padding: '14px 30px 10px',
              fontFamily: 'Bowlby One',
              fontSize: d.rotulo.length > 22 ? 52 : 64,
              lineHeight: 1.05,
              color: contorno,
              textAlign: 'center',
              maxWidth: 780,
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
            left: 620,
            top: ZONA_SEGURA.arriba + 210,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: `9px solid ${contorno}`,
            boxShadow: `0 12px 0 ${contorno}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${8 + 3 * Math.sin(t * 2)}deg) scale(${kDato})`,
            fontFamily: 'Bowlby One',
            fontSize: d.dato.length <= 3 ? 92 : d.dato.length <= 5 ? 66 : d.dato.length <= 7 ? 52 : 40,
            whiteSpace: 'nowrap',
            color: contorno,
            textAlign: 'center',
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
        const o = ORGANOS[c.p.personaje];
        const top = SUELO - c.escala * (o.base + PIERNA + 200) - 20;
        return <Globo key={i} texto={c.p.globo} x={c.x} y={top} local={local - c.p.retraso} color="#FFFFFF" contorno={contorno} />;
      })}
      {a.mostrar_fuente && d.fuente !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: ZONA_SEGURA.izquierda,
            right: ZONA_SEGURA.derecha,
            top: SUELO + 18,
            fontFamily: 'Poppins',
            fontWeight: 600,
            fontSize: 24,
            color: mezclarColor('#FFFFFF', FONDOS_COLORES[fondo].suelo, 0.15),
            opacity: 0.85 * coseno(local, 0.2, 0.6),
          }}
        >
          Fuente: {d.fuente}
        </div>
      )}
    </AbsoluteFill>
  );
}
