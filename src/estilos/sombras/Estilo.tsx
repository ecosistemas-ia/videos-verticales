// «Teatro de sombras». Un teatrito con cenefa y telón de terciopelo; dentro, una pantalla de papel que ilumina una
// lámpara que parpadea. Las figuras son siluetas articuladas (humanos.ts, animales.ts) y los decorados, recortes en
// tres capas: lejos de la pantalla salen borrosos y claros, pegados a ella, nítidos. Las transiciones son de teatro:
// telón, lámpara que se apaga y se enciende, o sombras que se alejan de la pantalla (fundido).

import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import dmSerif400 from '@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ALTO, ANCHO, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { coseno, fraccionX, hash, mezclarColor, ruido, ruido2, semillaDe, suave, tono } from '../_marionetas/curvas.ts';
import { aSvg } from '../_marionetas/geometria.ts';
import { momentoEn } from '../_marionetas/tiempo.ts';
import { dibujarAnimal } from './animales.ts';
import { CELESTES, dibujarDecorado } from './decorados.ts';
import { PANTALLA, SUELO, xPantalla, yAltura, type Dibujo, type Luz, type Pieza } from './dibujo.ts';
import { dibujarHumano, recorrido } from './humanos.ts';
import { DESPLAZAN, HUMANOS, TRANSICION, type AjustesSombras, type Ambiente, type EscenaSombras, type FiguraSombras } from './reglas.ts';

cargarFuentes([{ familia: 'DM Serif Display', url: dmSerif400, peso: 400 }]);

interface Paleta {
  readonly centro: string;
  readonly medio: string;
  readonly borde: string;
  readonly esquina: string;
  readonly silueta: string;
}

const PALETAS: Readonly<Record<Ambiente, Paleta>> = {
  calido: { centro: '#FFE4A8', medio: '#F4A24A', borde: '#B4521C', esquina: '#3E1606', silueta: '#150A05' },
  fuego: { centro: '#FFD08E', medio: '#EE6A2C', borde: '#9C2414', esquina: '#2C0704', silueta: '#130403' },
  noche: { centro: '#D6E6F4', medio: '#7C9FC6', borde: '#2C4A76', esquina: '#0A1426', silueta: '#05080F' },
  alba: { centro: '#FFF5D4', medio: '#F6CD78', borde: '#C48A3C', esquina: '#4A2C0C', silueta: '#1B0F05' },
  misterio: { centro: '#DDF2C6', medio: '#88BA68', borde: '#36622C', esquina: '#0C1C08', silueta: '#060C04' },
};

function mezclarPaleta(a: Paleta, b: Paleta, k: number): Paleta {
  return {
    centro: mezclarColor(a.centro, b.centro, k),
    medio: mezclarColor(a.medio, b.medio, k),
    borde: mezclarColor(a.borde, b.borde, k),
    esquina: mezclarColor(a.esquina, b.esquina, k),
    silueta: mezclarColor(a.silueta, b.silueta, k),
  };
}

const ESCALA_HUMANO = 1.12;
const ESCALA_ANIMAL = 1.15;

/** Lo que pide cada figura: dibujo, desenfoque y opacidad (aparecer o desaparecer = acercarse o alejarse). */
interface FiguraLista {
  readonly dibujo: Dibujo;
  readonly desenfoque: number;
  readonly opacidad: number;
}

function prepararFigura(f: FiguraSombras, i: number, escena: EscenaLista<EscenaSombras>, local: number, t: number, a: AjustesSombras): FiguraLista | null {
  const semilla = semillaDe(`${f.figura}-${escena.indice}-${i}`) % 1000;
  const durResto = Math.max(0.5, escena.duracion - f.retraso);
  const tl = local - f.retraso;
  const esperando = tl < 0;
  if (esperando && f.accion === 'aparece') return null;
  const accion = esperando ? 'quieto' : f.accion;
  const xIni = xPantalla(fraccionX(f.x));
  const humano = (HUMANOS as readonly string[]).includes(f.figura);
  const escalaPx = f.escala * (humano ? ESCALA_HUMANO : ESCALA_ANIMAL);
  const mueve = DESPLAZAN.includes(f.accion) && f.hasta !== undefined;
  const distancia = mueve ? xPantalla(fraccionX(f.hasta ?? f.x)) - xIni : 0;
  const rec = mueve ? recorrido(distancia, Math.max(0, tl), durResto, escalaPx) : null;
  const x = xIni + (rec?.avance ?? 0);
  const direccion: 1 | -1 = f.mira !== undefined ? (f.mira === 'derecha' ? 1 : -1) : mueve && Math.abs(distancia) > 1 ? (distancia > 0 ? 1 : -1) : fraccionX(f.x) <= 0.5 ? 1 : -1;
  const ctx = { t, calados: a.calados, semilla };

  let desenfoque = 0;
  let opacidad = 1;
  if (f.accion === 'aparece' && !esperando) {
    const k = suave(tl, 0, 0.95);
    desenfoque = 18 * (1 - k);
    opacidad = k;
  }
  if (f.accion === 'desaparece' && !esperando) {
    const k = suave(tl, durResto - 1.2, durResto - 0.25);
    desenfoque = 18 * k;
    opacidad = 1 - k;
  }

  let dibujo: Dibujo;
  if (humano) {
    const suelo = SUELO - (f.altura ?? 0) * (SUELO - 330);
    dibujo = dibujarHumano({ figura: f.figura, accion, objeto: f.objeto, x, suelo, escala: escalaPx, direccion, tl: Math.max(0, tl), dur: durResto, rec, varillas: a.varillas }, ctx);
  } else {
    const voladora = f.figura === 'dragon' || f.accion === 'vuela' || (f.figura === 'ave' && (f.altura ?? 0) > 0);
    const y = voladora ? yAltura(f.altura ?? (f.figura === 'dragon' ? 0.52 : 0.58)) : SUELO - (f.altura ?? 0) * (SUELO - 330);
    dibujo = dibujarAnimal({ figura: f.figura, accion, x, y, vuela: voladora, escala: escalaPx, direccion, tl: Math.max(0, tl), dur: durResto, rec, varillas: a.varillas }, ctx);
  }
  return { dibujo, desenfoque, opacidad };
}

function Trazos({ piezas, relleno }: { piezas: readonly Pieza[]; relleno: string }): ReactNode {
  return (
    <>
      {piezas.map((p, i) => (
        <path key={i} d={p.d} transform={aSvg(p.m)} fill={relleno} />
      ))}
    </>
  );
}

function Escena({ escena, local, t, a, paleta, opacidad, alejamiento, sufijo }: { escena: EscenaLista<EscenaSombras>; local: number; t: number; a: AjustesSombras; paleta: Paleta; opacidad: number; alejamiento: number; sufijo: string }): ReactNode {
  const d = escena.datos;
  const decorados = d.decorado.map((dec, i) => ({
    capa: dec.capa,
    dibujo: dibujarDecorado({ elemento: dec.elemento, x: xPantalla(fraccionX(dec.x)), escala: dec.escala * (dec.capa === 'fondo' ? 0.9 : 1), altura: dec.altura }, { t, calados: a.calados, semilla: (escena.indice * 31 + i * 7) % 997 }),
    celeste: CELESTES.includes(dec.elemento),
  }));
  const figuras = d.figuras.map((f, i) => prepararFigura(f, i, escena, local, t, a));
  const luces: Luz[] = [...decorados.flatMap((x) => x.dibujo.luces), ...figuras.flatMap((f) => (f === null ? [] : f.dibujo.luces.map((l) => ({ ...l, fuerza: l.fuerza * f.opacidad }))))];
  const brillo = tono(paleta.centro, 0.55);
  const solo = (dib: Dibujo, tipo: Pieza['tipo']): Pieza[] => dib.piezas.filter((p) => (p.tipo ?? 'sombra') === tipo);
  const sombraYMembrana = (dib: Dibujo): ReactNode => (
    <>
      <Trazos piezas={solo(dib, 'sombra')} relleno={paleta.silueta} />
      <g opacity={0.62}>
        <Trazos piezas={solo(dib, 'membrana')} relleno={paleta.silueta} />
      </g>
    </>
  );
  const capa = (nombre: 'fondo' | 'medio' | 'frente'): ReactNode =>
    decorados
      .filter((x) => x.capa === nombre)
      .map((x, i) => (
        <g key={`${nombre}-${i}`} opacity={nombre === 'fondo' ? 0.42 : nombre === 'medio' ? 0.82 : 1} filter={nombre === 'fondo' ? `url(#lejos-${sufijo})` : nombre === 'medio' ? `url(#medio-${sufijo})` : undefined}>
          {sombraYMembrana(x.dibujo)}
        </g>
      ));
  const desenfoqueGlobal = alejamiento * 16;
  return (
    <g opacity={opacidad} filter={desenfoqueGlobal > 0.3 ? `url(#aleja-${sufijo})` : undefined}>
      <defs>
        <filter id={`lejos-${sufijo}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={4.5} />
        </filter>
        <filter id={`medio-${sufijo}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={1.3} />
        </filter>
        <filter id={`aleja-${sufijo}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={desenfoqueGlobal} />
        </filter>
        {luces.map((l, i) => (
          <radialGradient key={i} id={`luz-${sufijo}-${i}`} cx={l.x} cy={l.y} r={l.r} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={l.color} stopOpacity={Math.min(1, l.fuerza)} />
            <stop offset="0.45" stopColor={l.color} stopOpacity={Math.min(1, l.fuerza) * 0.35} />
            <stop offset="1" stopColor={l.color} stopOpacity={0} />
          </radialGradient>
        ))}
        {figuras.map((f, i) =>
          f === null ? null : (
            <filter key={i} id={`fig-${sufijo}-${i}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={f.desenfoque} result="nitida" />
              <feGaussianBlur in="SourceAlpha" stdDeviation={7 + f.desenfoque} result="b" />
              <feOffset in="b" dx="3" dy="5" result="o" />
              <feFlood floodColor={paleta.silueta} floodOpacity={0.3} result="c" />
              <feComposite in="c" in2="o" operator="in" result="penumbra" />
              <feMerge>
                <feMergeNode in="penumbra" />
                <feMergeNode in="nitida" />
              </feMerge>
            </filter>
          ),
        )}
      </defs>
      {/* Luz que aclara el papel alrededor de antorchas, hogueras, luna. */}
      <g style={{ mixBlendMode: 'screen' }}>
        {luces.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={`url(#luz-${sufijo}-${i})`} />
        ))}
      </g>
      {/* Cielo: luna, sol y estrellas son agujeros de luz en el decorado. */}
      <g filter="url(#resplandor)">
        {decorados.map((x, i) => (
          <Trazos key={i} piezas={solo(x.dibujo, 'brillo')} relleno={brillo} />
        ))}
      </g>
      {capa('fondo')}
      {capa('medio')}
      {/* Varillas: finas, algo borrosas, detrás de la figura. */}
      <g stroke={paleta.silueta} strokeWidth={2.6} opacity={0.75} filter="url(#varilla)">
        {figuras.map((f, i) =>
          f === null
            ? null
            : f.dibujo.varillas.map((p, j) => {
                const largo = PANTALLA.y1 + 30 - p.y;
                const dx = (p.x < 540 ? -1 : 1) * 0.16 * largo + (hash(i * 7 + j, 3) - 0.5) * 50;
                return <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={p.x + dx} y2={PANTALLA.y1 + 30} opacity={f.opacidad} />;
              }),
        )}
      </g>
      {figuras.map((f, i) =>
        f === null ? null : (
          <g key={i} opacity={f.opacidad} filter={`url(#fig-${sufijo}-${i})`}>
            {sombraYMembrana(f.dibujo)}
          </g>
        ),
      )}
      {capa('frente')}
      {/* Fuego: papel de color iluminado, delante. */}
      <g filter="url(#resplandor)">
        {[...decorados.map((x) => x.dibujo), ...figuras.filter((f): f is FiguraLista => f !== null).map((f) => f.dibujo)].map((dib, i) => (
          <g key={i}>
            <Trazos piezas={solo(dib, 'llama')} relleno="url(#fuego)" />
          </g>
        ))}
      </g>
    </g>
  );
}

function Titulo({ texto, local, dur, color }: { texto: string; local: number; dur: number; color: string }): ReactNode {
  const entra = suave(local, 0.15, 1.0);
  const sale = suave(local, dur - 0.7, dur - 0.1);
  const k = entra * (1 - sale);
  if (k <= 0.001) return null;
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > 19 && actual !== '') {
      lineas.push(actual);
      actual = p;
    } else actual = (actual + ' ' + p).trim();
  }
  if (actual !== '') lineas.push(actual);
  const tam = lineas.length > 2 ? 64 : 82;
  const y0 = 300;
  const fin = y0 + (lineas.length - 1) * tam * 1.04;
  return (
    <g opacity={k} filter={k < 0.98 ? 'url(#titulo-blur)' : undefined} style={{ transformBox: 'fill-box' }}>
      <text x={500} y={y0} textAnchor="middle" fontFamily="DM Serif Display" fontSize={tam} fill={color} letterSpacing="0.01em">
        {lineas.map((l, i) => (
          <tspan key={i} x={500} dy={i === 0 ? 0 : tam * 1.04}>
            {l}
          </tspan>
        ))}
      </text>
      <g fill={color} transform={`translate(500 ${fin + 38})`}>
        <path d="M-210 0 C-160 -14 -110 14 -40 0 L-14 0 L0 -10 L14 0 L40 0 C110 14 160 -14 210 0 C160 6 110 22 40 6 L14 6 L0 16 L-14 6 L-40 6 C-110 22 -160 6 -210 0 Z" />
      </g>
    </g>
  );
}

/** El suelo recortado al pie de la pantalla, con matas de hierba que se mecen. */
function Suelo({ t, color }: { t: number; color: string }): ReactNode {
  const pts: string[] = [`M${PANTALLA.x0} ${PANTALLA.y1}`];
  for (let x = PANTALLA.x0; x <= PANTALLA.x1 + 20; x += 20) {
    const y = SUELO - 2 + 7 * Math.sin(x / 70) + 4 * hash(Math.round(x / 20), 4);
    pts.push(`L${x} ${y.toFixed(1)}`);
  }
  pts.push(`L${PANTALLA.x1} ${PANTALLA.y1} Z`);
  const matas: string[] = [];
  for (let i = 0; i < 26; i++) {
    const x = PANTALLA.x0 + 20 + i * 39 + hash(i, 8) * 16;
    const h = 14 + hash(i, 2) * 22;
    const v = 5 * ruido2(t * 0.7 + i * 0.3, 2);
    matas.push(`M${x - 4} ${SUELO + 4} Q${x - 2 + v * 0.5} ${SUELO - h * 0.5} ${x + v} ${SUELO - h} Q${x + 2 + v * 0.4} ${SUELO - h * 0.45} ${x + 5} ${SUELO + 4} Z`);
  }
  return <path d={`${pts.join(' ')} ${matas.join(' ')}`} fill={color} />;
}

/** Cenefa, telón, marco y proscenio del teatrito. */
function Marco({ cierre, telon, t, luzPantalla }: { cierre: number; telon: string; t: number; luzPantalla: string }): ReactNode {
  const oscuro = tono(telon, -0.55);
  const claro = tono(telon, 0.18);
  const oro = '#D7A446';
  const abierto = 46;
  const ancho = abierto + cierre * (ANCHO / 2 - abierto + 6);
  const ondas = (lado: 1 | -1): string => {
    const x0 = lado === 1 ? 0 : ANCHO;
    const borde = lado === 1 ? ancho : ANCHO - ancho;
    const pts = [`M${x0} 0`, `L${borde} 0`];
    for (let y = 0; y <= PANTALLA.y1 + 20; y += 40) {
      const ola = (8 + 10 * cierre) * Math.sin(y / 46 + t * 1.3 * (0.4 + cierre)) + 10 * (1 - cierre) * (y / PANTALLA.y1) ** 2;
      pts.push(`L${borde + lado * ola} ${y}`);
    }
    pts.push(`L${x0} ${PANTALLA.y1 + 20} Z`);
    return pts.join(' ');
  };
  const festones: string[] = ['M0 0 L1080 0 L1080 160'];
  const n = 7;
  for (let i = n; i > 0; i--) {
    const xa = (i / n) * ANCHO;
    const xb = ((i - 1) / n) * ANCHO;
    festones.push(`Q${(xa + xb) / 2} 240 ${xb} 160`);
  }
  festones.push('Z');
  const borla: ReactNode[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * ANCHO;
    borla.push(<path key={i} d={`M${x} 160 L${x} 196 M${x - 8} 214 Q${x} 186 ${x + 8} 214 Z`} stroke={oro} strokeWidth={3} fill={oro} />);
  }
  return (
    <g>
      {/* Proscenio de madera bajo la pantalla. */}
      <rect x={0} y={PANTALLA.y1} width={ANCHO} height={ALTO - PANTALLA.y1} fill="url(#madera)" />
      <rect x={0} y={PANTALLA.y1} width={ANCHO} height={ALTO - PANTALLA.y1} fill="url(#derrame)" style={{ mixBlendMode: 'screen' }} />
      <rect x={0} y={PANTALLA.y1} width={ANCHO} height={10} fill={oro} />
      <rect x={0} y={PANTALLA.y1 + 16} width={ANCHO} height={3} fill={oro} opacity={0.6} />
      <g fill="#060302">
        {[110, 300, 520, 740, 950].map((x, i) => {
          const y = 1752 + 10 * hash(i, 6) + 3 * Math.sin(t * 0.8 + i);
          return <path key={i} d={`M${x - 120} 1920 C${x - 115} ${y + 110} ${x - 70} ${y + 86} ${x - 52} ${y + 78} C${x - 70} ${y + 40} ${x - 66} ${y - 20} ${x} ${y - 24} C${x + 66} ${y - 20} ${x + 70} ${y + 40} ${x + 52} ${y + 78} C${x + 70} ${y + 86} ${x + 115} ${y + 110} ${x + 120} 1920 Z`} />;
        })}
      </g>
      {/* Marco de la pantalla. */}
      <rect x={PANTALLA.x0 - 6} y={PANTALLA.y0 - 6} width={PANTALLA.x1 - PANTALLA.x0 + 12} height={PANTALLA.y1 - PANTALLA.y0 + 12} fill="none" stroke="#1C0E06" strokeWidth={12} />
      {/* Telones laterales. */}
      <path d={ondas(1)} fill="url(#pliegues)" />
      <path d={ondas(-1)} fill="url(#pliegues)" />
      <path d={ondas(1)} fill="url(#sombra-telon-izq)" />
      <path d={ondas(-1)} fill="url(#sombra-telon-der)" />
      {/* Cenefa con festones y borlas. */}
      <path d={festones.join(' ')} fill="url(#pliegues-cenefa)" />
      <path d={festones.join(' ')} fill="none" stroke={oro} strokeWidth={7} />
      {borla}
      <rect x={0} y={0} width={ANCHO} height={160} fill={oscuro} opacity={0.25} />
      <defs>
        <linearGradient id="pliegues" x1="0" y1="0" x2="58" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
          <stop offset="0" stopColor={oscuro} />
          <stop offset="0.45" stopColor={claro} />
          <stop offset="0.6" stopColor={telon} />
          <stop offset="1" stopColor={oscuro} />
        </linearGradient>
        <linearGradient id="pliegues-cenefa" x1="0" y1="0" x2="154" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
          <stop offset="0" stopColor={oscuro} />
          <stop offset="0.5" stopColor={claro} />
          <stop offset="1" stopColor={oscuro} />
        </linearGradient>
        <linearGradient id="sombra-telon-izq" x1={ancho - 60} y1="0" x2={ancho + 20} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </linearGradient>
        <linearGradient id="sombra-telon-der" x1={ANCHO - ancho + 60} y1="0" x2={ANCHO - ancho - 20} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </linearGradient>
        <linearGradient id="madera" x1="0" y1={PANTALLA.y1} x2="0" y2={ALTO} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2E170A" />
          <stop offset="0.4" stopColor="#1C0D05" />
          <stop offset="1" stopColor="#0B0503" />
        </linearGradient>
        <radialGradient id="derrame" cx={540} cy={PANTALLA.y1} r={700} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={luzPantalla} stopOpacity={0.32} />
          <stop offset="1" stopColor={luzPantalla} stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  );
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = props.ajustes as AjustesSombras;
  const escenas = props.escenas as readonly EscenaLista<EscenaSombras>[];
  const m = momentoEn(escenas, t);
  if (m === null) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  const { escena, local, anterior } = m;
  const ambienteDe = (e: EscenaLista<EscenaSombras> | null): Ambiente => e?.datos.ambiente ?? a.ambiente;
  const kAmb = coseno(local, 0, 0.9);
  const paleta = mezclarPaleta(PALETAS[ambienteDe(anterior)], PALETAS[ambienteDe(escena)], anterior === null ? 1 : kAmb);

  // Transiciones.
  const ultima = escenas[escenas.length - 1];
  const finUltima = ultima.inicio + ultima.duracion;
  let cierre = 0;
  if (a.abrir_y_cerrar) {
    cierre = Math.max(1 - coseno(t, 0.05, 0.05 + TRANSICION.apertura), coseno(t, finUltima + 0.05, finUltima + 0.05 + TRANSICION.cierre));
  }
  const siguienteTelon = m.siguiente !== null && m.siguiente.datos.transicion === 'telon';
  if (siguienteTelon) cierre = Math.max(cierre, coseno(local, escena.duracion - TRANSICION.cierra, escena.duracion));
  if (escena.datos.transicion === 'telon' && anterior !== null) cierre = Math.max(cierre, 1 - coseno(local, 0.02, TRANSICION.abre));
  let apagon = 0;
  if (m.siguiente !== null && m.siguiente.datos.transicion === 'luz') apagon = Math.max(apagon, coseno(local, escena.duracion - 0.4, escena.duracion));
  if (escena.datos.transicion === 'luz' && anterior !== null) apagon = Math.max(apagon, 1 - coseno(local, 0.02, 0.55));
  const fundido = escena.datos.transicion === 'fundido' && anterior !== null && local < TRANSICION.fundido ? coseno(local, 0, TRANSICION.fundido) : 1;

  // Lámpara: parpadeo suave y algún bajón.
  const parpadeo = 0.06 + 0.05 * Math.max(0, ruido2(t * 4.2, 11)) + 0.06 * Math.max(0, ruido(t * 0.9, 5) - 0.55) * 4;
  const lx = 520 + 10 * ruido(t * 1.3, 2);
  const ly = 640 + 8 * ruido(t * 1.1, 3);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0503' }}>
      <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`}>
        <defs>
          <radialGradient id="lampara" cx={lx} cy={ly} r={1050} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={paleta.centro} />
            <stop offset="0.32" stopColor={paleta.medio} />
            <stop offset="0.72" stopColor={paleta.borde} />
            <stop offset="1" stopColor={paleta.esquina} />
          </radialGradient>
          <radialGradient id="fuego" cx="0.5" cy="0.9" r="0.95">
            <stop offset="0" stopColor="#FFF7D6" />
            <stop offset="0.35" stopColor="#FFC24A" />
            <stop offset="0.75" stopColor="#F2742A" stopOpacity={0.92} />
            <stop offset="1" stopColor="#C9361A" stopOpacity={0.8} />
          </radialGradient>
          <clipPath id="recorte">
            <rect x={PANTALLA.x0} y={PANTALLA.y0} width={PANTALLA.x1 - PANTALLA.x0} height={PANTALLA.y1 - PANTALLA.y0} />
          </clipPath>
          <filter id="papel" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={7} result="grano" />
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={3} seed={3} result="fibra" />
            <feBlend in="grano" in2="fibra" mode="multiply" result="mezcla" />
            <feColorMatrix in="mezcla" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
          </filter>
          <filter id="resplandor" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={10} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="varilla" x="-20%" y="-5%" width="140%" height="110%">
            <feGaussianBlur stdDeviation={1.2} />
          </filter>
          <filter id="titulo-blur" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation={6 * (1 - Math.min(1, suave(local, 0.15, 1.0) * (1 - suave(local, escena.duracion - 0.7, escena.duracion - 0.1))))} />
          </filter>
          <linearGradient id="sombra-arriba" x1="0" y1={PANTALLA.y0} x2="0" y2={PANTALLA.y0 + 160} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#000" stopOpacity={0.55} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>

        <g clipPath="url(#recorte)">
          <rect x={PANTALLA.x0} y={PANTALLA.y0} width={PANTALLA.x1 - PANTALLA.x0} height={PANTALLA.y1 - PANTALLA.y0} fill="url(#lampara)" />
          <rect x={PANTALLA.x0} y={PANTALLA.y0} width={PANTALLA.x1 - PANTALLA.x0} height={PANTALLA.y1 - PANTALLA.y0} filter="url(#papel)" opacity={0.16} style={{ mixBlendMode: 'multiply' }} />

          {anterior !== null && fundido < 1 && (
            <Escena escena={anterior} local={t - anterior.inicio} t={t} a={a} paleta={paleta} opacidad={1 - fundido} alejamiento={fundido} sufijo="a" />
          )}
          <Escena escena={escena} local={local} t={t} a={a} paleta={paleta} opacidad={fundido} alejamiento={1 - fundido} sufijo="b" />
          {escena.datos.titulo !== undefined && <Titulo texto={escena.datos.titulo} local={local} dur={escena.duracion} color={paleta.silueta} />}
          <Suelo t={t} color={paleta.silueta} />

          <rect x={PANTALLA.x0} y={PANTALLA.y0} width={PANTALLA.x1 - PANTALLA.x0} height={160} fill="url(#sombra-arriba)" />
          <rect x={PANTALLA.x0} y={PANTALLA.y0} width={PANTALLA.x1 - PANTALLA.x0} height={PANTALLA.y1 - PANTALLA.y0} fill="#000" opacity={parpadeo} />
          <rect x={PANTALLA.x0} y={PANTALLA.y0} width={PANTALLA.x1 - PANTALLA.x0} height={PANTALLA.y1 - PANTALLA.y0} fill="#050201" opacity={apagon * 0.94} />
        </g>

        <Marco cierre={cierre} telon={a.telon} t={t} luzPantalla={paleta.medio} />
      </svg>
    </AbsoluteFill>
  );
}
