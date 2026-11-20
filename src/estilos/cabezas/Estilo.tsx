// «Personajes de cabeza blanca en un mundo 3D». El mundo se dibuja con three.js dentro de <ThreeCanvas> (Mundo.tsx);
// encima van una viñeta suave, el rótulo de cada escena (lugar y año) y la frase gancho de la primera. La narración
// no está en pantalla: los subtítulos los pone lo común, en su franja, que aquí queda libre.

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import montserrat900 from '@fontsource/montserrat/files/montserrat-latin-900-normal.woff2';
import poppins700 from '@fontsource/poppins/files/poppins-latin-700-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ALTO, ANCHO, ZONA_SEGURA, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { armarPuestos, escenaEn } from './camara.ts';
import { Mundo } from './Mundo.tsx';
import { TINTA } from './paletas.ts';
import { inicioAccion, type AjustesCabezas, type EscenaCabezas } from './reglas.ts';

cargarFuentes([
  { familia: 'Montserrat', url: montserrat900, peso: 900 },
  { familia: 'Poppins', url: poppins700, peso: 700 },
]);

function Rotulo({ texto, tl, duracion, indice }: { texto: string; tl: number; duracion: number; indice: number }): ReactNode {
  if (texto.trim() === '') return null;
  const desde = inicioAccion(indice) + 0.05;
  const entra = interpolate(tl, [desde, desde + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sale = interpolate(tl, [duracion - 0.35, duracion - 0.05], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const k = Math.min(entra, sale);
  return (
    <div
      style={{
        position: 'absolute',
        left: ZONA_SEGURA.izquierda,
        top: ZONA_SEGURA.arriba + 16,
        padding: '12px 26px 14px',
        background: '#FBF1DC',
        border: `4px solid ${TINTA}`,
        borderRadius: 16,
        boxShadow: `6px 7px 0 ${TINTA}`,
        fontFamily: 'Poppins',
        fontWeight: 700,
        fontSize: 40,
        color: TINTA,
        letterSpacing: '0.01em',
        opacity: k,
        transform: `translateX(${(1 - k) * -40}px) rotate(-1.5deg)`,
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </div>
  );
}

function Gancho({ texto, t, fin, conRotulo }: { texto: string; t: number; fin: number; conRotulo: boolean }): ReactNode {
  if (texto.trim() === '') return null;
  const entra = interpolate(t, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sale = interpolate(t, [fin - 0.4, fin - 0.05], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const k = Math.min(entra, sale);
  return (
    <div
      style={{
        position: 'absolute',
        left: ZONA_SEGURA.izquierda,
        right: ZONA_SEGURA.derecha - 40,
        top: ZONA_SEGURA.arriba + (conRotulo ? 120 : 30),
        textAlign: 'center',
        fontFamily: 'Montserrat',
        fontWeight: 900,
        fontSize: texto.length > 40 ? 64 : 74,
        lineHeight: 1.1,
        color: '#FFFFFF',
        WebkitTextStroke: `10px ${TINTA}`,
        paintOrder: 'stroke fill',
        textShadow: `0 8px 0 ${TINTA}`,
        opacity: k,
        transform: `scale(${0.9 + 0.1 * k})`,
      }}
    >
      {texto}
    </div>
  );
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ajustes = props.ajustes as AjustesCabezas;
  const escenas = props.escenas as readonly EscenaLista<EscenaCabezas>[];
  const puestos = useMemo(() => armarPuestos(escenas, ajustes.hora), [escenas, ajustes.hora]);
  const j = escenaEn(puestos, t);
  const actual = escenas[j];
  const primera = escenas[0];

  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1410' }}>
      <ThreeCanvas
        width={ANCHO}
        height={ALTO}
        dpr={1}
        flat
        shadows="percentage"
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 40, near: 0.1, far: 700, position: [0, 3, 14] }}
      >
        <Mundo puestos={puestos} ajustes={ajustes} acento={props.guion.marca.acento} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 75% at 50% 45%, rgba(0,0,0,0) 55%, rgba(35,18,8,0.38) 100%)' }} />
      {actual !== undefined && <Rotulo texto={actual.datos.rotulo} tl={t - actual.inicio} duracion={actual.duracion} indice={j} />}
      {primera !== undefined && (
        <Gancho texto={ajustes.gancho} t={t} fin={primera.inicio + primera.duracion} conRotulo={primera.datos.rotulo.trim() !== ''} />
      )}
    </AbsoluteFill>
  );
}
