// Subtítulos, en dos modos que elige el usuario en cada video:
//   - «palabra»: grupos cortos de hasta 3 palabras, con la que suena resaltada en el color de acento;
//   - «frase»: la frase entera (hasta ~7 palabras por línea, dos líneas), cortada en la puntuación.
// Van en la franja baja pero por encima de la zona que tapan las aplicaciones.

import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ALTO, ZONA_SEGURA, type Palabra } from './guion.ts';

interface Grupo {
  readonly palabras: readonly Palabra[];
  readonly inicio: number;
  readonly fin: number;
}

/** Agrupa las palabras: corta en la puntuación fuerte, en una pausa larga o al llegar al máximo. */
export function agrupar(palabras: readonly Palabra[], maximo: number): Grupo[] {
  const grupos: Grupo[] = [];
  let actual: Palabra[] = [];
  const cerrar = (): void => {
    if (actual.length === 0) return;
    grupos.push({ palabras: actual, inicio: actual[0].inicio, fin: actual[actual.length - 1].fin });
    actual = [];
  };
  palabras.forEach((p, i) => {
    actual.push(p);
    const siguiente = palabras[i + 1];
    const pausa = siguiente !== undefined && siguiente.inicio - p.fin > 0.35;
    if (/[.!?…:;]$/.test(p.texto) || pausa || actual.length >= maximo || (maximo > 3 && /,$/.test(p.texto) && actual.length >= 3)) cerrar();
  });
  cerrar();
  return grupos;
}

export function Subtitulos({
  palabras,
  modo,
  acento,
  arriba = ALTO - ZONA_SEGURA.abajo - 230,
}: {
  palabras: readonly Palabra[];
  modo: 'palabra' | 'frase';
  acento: string;
  arriba?: number;
}): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const grupos = agrupar(palabras, modo === 'palabra' ? 3 : 7);
  const grupo = grupos.find((g, i) => {
    const siguiente = grupos[i + 1];
    const hasta = Math.min(g.fin + 0.4, siguiente?.inicio ?? Infinity);
    return t >= g.inicio - 0.05 && t < hasta;
  });
  if (grupo === undefined) return null;
  const entrada = interpolate(t, [grupo.inicio - 0.05, grupo.inicio + 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tamano = modo === 'palabra' ? 76 : 58;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: arriba,
          height: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: `translateY(${(1 - entrada) * 14}px) scale(${0.96 + entrada * 0.04})`,
          opacity: entrada,
        }}
      >
        <div
          style={{
            fontFamily: 'Montserrat',
            fontWeight: 900,
            fontSize: tamano,
            lineHeight: 1.15,
            color: '#FFFFFF',
            textTransform: modo === 'palabra' ? 'uppercase' : 'none',
            // El trazo va debajo del relleno (paintOrder), así que se ve la mitad: 7 y 6 px dejan un contorno de 3 px
            // que se lee sobre fondos claros (evaluación del 20/11/2026: ciudad y órganos con 2 px no se leían bien).
            WebkitTextStroke: modo === 'palabra' ? '7px #000' : '6px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 0 12px rgba(0,0,0,0.7), 0 6px 18px rgba(0,0,0,0.6)',
          }}
        >
          {grupo.palabras.map((p, i) => {
            const suena = t >= p.inicio && t < p.fin + 0.05;
            return (
              <span key={i} style={{ color: modo === 'palabra' && suena ? acento : '#FFFFFF' }}>
                {p.texto}
                {i < grupo.palabras.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
