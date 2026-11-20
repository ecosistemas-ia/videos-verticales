// «Maqueta 3D de videojuego»: la ciudad en three.js con luz en tiempo real, y encima la lluvia, la etiqueta fija y los
// rótulos. El mundo, el terreno y la cámara se calculan aquí (funciones puras); la maqueta los dibuja.

import { ThreeCanvas } from '@remotion/three';
import { useMemo, type ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import type { EscenaLista, PropsVideo } from '../../comun/guion.ts';
import { estadoEn, presenciaRotulo } from '../_mundo/esquemas.ts';
import { generarMundo } from '../_mundo/generar.ts';
import { Lluvia } from '../_mundo/Lluvia.tsx';
import { EtiquetaFija, Rotulos } from '../_mundo/Rotulos.tsx';
import { proyectar, techos, tomaEn } from './camara.ts';
import { Maqueta } from './Maqueta.tsx';
import { paleta, PALETA_POR_MUNDO } from './paleta.ts';
import type { AjustesCiudad, EscenaCiudad } from './reglas.ts';
import { crearTerreno } from './terreno.ts';

/** Ángulos de cámara cuando el guion no los da: variados pero siempre del lado de la escalinata y la bahía. */
const ANGULOS = [18, 52, -24, 74, -48, 32, 4, -64];
const DENSIDAD = { poca: 0.7, normal: 1.4, mucha: 2.3 } as const;

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const a = props.ajustes as AjustesCiudad;
  const escenas = props.escenas as readonly EscenaLista<EscenaCiudad>[];
  const mundo = useMemo(() => generarMundo({ tipo: a.mundo, semilla: a.semilla, escala: 'ciudad', agua: a.agua }), [a.mundo, a.semilla, a.agua]);
  const colores = useMemo(() => paleta(a.paleta ?? PALETA_POR_MUNDO[a.mundo]), [a.paleta, a.mundo]);
  const terreno = useMemo(() => crearTerreno(mundo, colores, a.semilla), [mundo, colores, a.semilla]);
  const techo = useMemo(() => techos(mundo), [mundo]);

  const estado = estadoEn(escenas, t, a.luz);
  const escena = escenas[estado.i]?.datos;
  const plano = escena?.plano ?? 'general';
  const lugar = escena?.lugar ?? 'centro';
  const azimut = escena?.angulo ?? ANGULOS[estado.i % ANGULOS.length] + (mundo.tipo === 'puerto' ? 0 : 0);
  const toma = tomaEn(mundo, techo, terreno.altura, plano, lugar, azimut, estado.u, width / height);

  // dónde caen el lugar y la medida en la pantalla (para la chincheta y la barra)
  const l = mundo.lugares[lugar];
  const rot = escena?.rotulo;
  let ancla: { x: number; y: number } | null = null;
  let medida: { base: { x: number; y: number }; tope: { x: number; y: number } } | null = null;
  if (rot?.tipo === 'lugar') {
    const p = proyectar(toma, width, height, l.x, l.y + Math.min(l.alto, 30) * 0.9, l.z);
    ancla = p.delante ? p : null;
  }
  if (rot?.tipo === 'medida') {
    const derecha = new THREE.Vector3().subVectors(toma.mira, toma.pos).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(l.radio * 0.85 + 3);
    const b = proyectar(toma, width, height, l.x + derecha.x, l.y, l.z + derecha.z);
    const c = proyectar(toma, width, height, l.x + derecha.x, l.y + l.alto, l.z + derecha.z);
    medida = b.delante && c.delante ? { base: b, tope: c } : null;
  }
  const lluvia = (estado.clima.de === 'lluvia' ? 1 - estado.clima.k : 0) + (estado.clima.a === 'lluvia' ? estado.clima.k : 0);

  return (
    <AbsoluteFill style={{ backgroundColor: '#C9B9A0' }}>
      <ThreeCanvas width={width} height={height} dpr={1} gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false }}>
        <Maqueta mundo={mundo} terreno={terreno} colores={colores} densidad={DENSIDAD[a.vida]} t={t} estado={estado} toma={toma} ancho={width} alto={height} />
      </ThreeCanvas>
      <Lluvia t={t} fuerza={Math.min(1, lluvia)} />
      <EtiquetaFija texto={a.etiqueta} tema="maqueta" acento={props.guion.marca.acento} />
      <Rotulos rotulo={rot} presencia={presenciaRotulo(estado.tl, estado.duracion)} tl={estado.tl} anio={estado.anio} tema="maqueta" acento={props.guion.marca.acento} ancla={ancla} medida={medida} />
    </AbsoluteFill>
  );
}
