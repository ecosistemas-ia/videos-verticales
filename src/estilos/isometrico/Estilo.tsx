// «Ilustración isométrica rica»: la maqueta isométrica en SVG (Diorama), con su fondo y lo de delante (Fondo), la
// lluvia, la etiqueta fija y los rótulos en el tema de ilustración. El mundo es el mismo generador de la maqueta 3D, a
// escala de maqueta pequeña; la cámara y el estado del mundo son funciones puras del segundo.

import { useMemo, type ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ALTO, ANCHO, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { liso } from '../_mundo/azar.ts';
import { estadoEn, presenciaRotulo, type Luz } from '../_mundo/esquemas.ts';
import { generarMundo } from '../_mundo/generar.ts';
import { Lluvia } from '../_mundo/Lluvia.tsx';
import { EtiquetaFija, Rotulos } from '../_mundo/Rotulos.tsx';
import { Diorama } from './Diorama.tsx';
import { figurasDelMundo } from './figuras.ts';
import { Delante, Fondo } from './Fondo.tsx';
import { aPantalla, escalaGeneral, iso, tomaIsoEn, transformacion } from './proyeccion.ts';
import type { AjustesIso, EscenaIso } from './reglas.ts';

const NOCHE: Record<Luz, number> = { manana: 0, mediodia: 0, tarde: 0, atardecer: 0.3, noche: 1 };

/** El agua del depósito en el segundo t (null si ninguna escena la usa: entonces el subsuelo es roca). */
function nivelEn(escenas: readonly EscenaLista<EscenaIso>[], t: number): number | null {
  if (!escenas.some((e) => e.datos.nivel !== undefined)) return null;
  let nivel = 0.15;
  for (let i = 0; i < escenas.length; i++) {
    const e = escenas[i];
    const d = e.datos.nivel;
    const [n0, n1] = d === undefined ? [nivel, nivel] : Array.isArray(d) ? d : [nivel, d];
    if (t < e.inicio + e.duracion || i === escenas.length - 1) return n0 + (n1 - n0) * liso(Math.max(0, t - e.inicio) / (e.duracion * 0.85));
    nivel = n1;
  }
  return nivel;
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = props.ajustes as AjustesIso;
  const escenas = props.escenas as readonly EscenaLista<EscenaIso>[];
  const mundo = useMemo(() => generarMundo({ tipo: a.mundo, semilla: a.semilla, escala: 'plastico', agua: a.agua }), [a.mundo, a.semilla, a.agua]);
  const figuras = useMemo(() => figurasDelMundo(mundo), [mundo]);

  const estado = estadoEn(escenas, t, a.luz);
  const e = escenas[estado.i]?.datos;
  const lugar = e?.lugar ?? 'centro';
  const toma = tomaIsoEn(mundo, e?.plano ?? 'general', lugar, estado.u, ANCHO);
  const nivel = nivelEn(escenas, t);
  const noche = NOCHE[estado.luz.de] + (NOCHE[estado.luz.a] - NOCHE[estado.luz.de]) * estado.luz.k;
  const clima = (c: 'lluvia' | 'niebla') => (estado.clima.de === c ? 1 - estado.clima.k : 0) + (estado.clima.a === c ? estado.clima.k : 0);
  const lluvia = Math.min(1, clima('lluvia'));
  const niebla = Math.min(1, clima('niebla'));

  const l = mundo.lugares[lugar];
  const rot = e?.rotulo;
  let ancla: { x: number; y: number } | null = null;
  let medida: { base: { x: number; y: number }; tope: { x: number; y: number } } | null = null;
  if (rot?.tipo === 'lugar') {
    const [x, y] = aPantalla(toma, iso(l.x, l.y + Math.min(l.alto, 30) * 0.9, l.z));
    ancla = { x, y };
  }
  if (rot?.tipo === 'medida') {
    const R = l.radio * 0.75 + 2;
    const [bx, by] = aPantalla(toma, iso(l.x + R, l.y, l.z - R));
    const [tx, ty] = aPantalla(toma, iso(l.x + R, l.y + l.alto, l.z - R));
    medida = { base: { x: bx, y: by }, tope: { x: tx, y: ty } };
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#17163F' }}>
      <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`} style={{ position: 'absolute', inset: 0 }}>
        <Fondo t={t} estado={estado} fondo={a.fondo} noche={noche} lluvia={lluvia} toma={toma} />
        <g transform={transformacion(toma)}>
          <Diorama m={mundo} figuras={figuras} t={t} ciudad={estado.ciudad} nivel={nivel} lluvia={lluvia} noche={noche} />
        </g>
        <Delante t={t} noche={noche} niebla={niebla} lluvia={lluvia} toma={toma} s0={escalaGeneral(mundo, ANCHO)} />
      </svg>
      <Lluvia t={t} fuerza={lluvia} color="#DDEBFF" />
      <EtiquetaFija texto={a.etiqueta} tema="ilustracion" acento={props.guion.marca.acento} />
      <Rotulos rotulo={rot} presencia={presenciaRotulo(estado.tl, estado.duracion)} tl={estado.tl} anio={estado.anio} tema="ilustracion" acento={props.guion.marca.acento} ancla={ancla} medida={medida} />
    </AbsoluteFill>
  );
}
