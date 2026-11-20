// Los movimientos elementales del estilo, portados de MOTION (src/comune/mosse.tsx), medidos en el video de
// referencia fotograma a fotograma:
//   - salto con rebote: un resorte de 0 a 1 que se pasa un poco (burbujas, el ícono del título);
//   - entrada «grande y desenfocada»: la figura llega a 2,2× desenfocada y se posa en 12 fotogramas;
//   - salida hacia abajo: la escena resbala acelerando con estela vertical y desaparece (las tarjetas);
//   - latido: el grupo crece un 9,6 % sobre una palabra y vuelve despacio;
//   - respiro: un zoom lento del 1-2 % durante toda la escena;
//   - desenfoque en una sola dirección (filtro SVG), para las estelas.

import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import { random } from 'remotion';
import { CURVAS, animar, resorte } from './curvas.ts';

/** El valor de un salto con rebote (0 → 1, se pasa un poco y vuelve) desde el fotograma `desde`. */
export function salto(fotograma: number, fps: number, desde: number): number {
  if (fotograma < desde) return 0;
  return resorte(fotograma, fps, desde, { amortiguacion: 9, rigidez: 170 });
}

export interface Estado {
  readonly escala: number;
  readonly desenfoque: number;
  readonly opacidad: number;
}

/** Entrada «grande y desenfocada»: opaca desde el primer fotograma a 2,2×, se posa frenando en 12 fotogramas. */
export function entradaGrande(fotograma: number, desde: number, opciones: { readonly duracion?: number; readonly escala?: number; readonly desenfoque?: number } = {}): Estado {
  const duracion = opciones.duracion ?? 12;
  const escala = opciones.escala ?? 2.2;
  const desenfoque = opciones.desenfoque ?? 14;
  if (fotograma < desde) return { escala, desenfoque, opacidad: 0 };
  const q = animar(fotograma, [desde, desde + duracion], [0, 1], CURVAS.posa);
  return { escala: escala + (1 - escala) * q, desenfoque: desenfoque * (1 - q), opacidad: 1 };
}

/** El estado de una salida: desplazamiento vertical, escala, estela vertical (px) y opacidad. */
export interface EstadoSalida {
  readonly dy: number;
  readonly escala: number;
  readonly estela: number;
  readonly opacidad: number;
}

export const QUIETA: EstadoSalida = { dy: 0, escala: 1, estela: 0, opacidad: 1 };

/** Salida hacia abajo en los últimos `duracion` fotogramas antes de `fin` (distancia en px). */
export function salidaHaciaAbajo(fotograma: number, fin: number, opciones: { readonly duracion?: number; readonly distancia: number; readonly escala?: number }): EstadoSalida {
  const duracion = opciones.duracion ?? 13;
  const tramo: readonly [number, number] = [fin - duracion, fin];
  const q = animar(fotograma, tramo, [0, 1], CURVAS.acelera);
  const antes = animar(fotograma - 1, tramo, [0, 1], CURVAS.acelera);
  const velocidad = opciones.distancia * (q - antes);
  return {
    dy: opciones.distancia * q,
    escala: 1 + ((opciones.escala ?? 1.08) - 1) * q,
    estela: Math.min(28, velocidad * 0.45),
    opacidad: 1 - animar(fotograma, [fin - Math.round(duracion * 0.4), fin], [0, 1], CURVAS.salida),
  };
}

/** El latido sobre una palabra: +9,6 % en 4 fotogramas y vuelta lenta en ~22. Antes de `desde` vale 1. */
export function latido(fotograma: number, desde: number | null, amplitud = 0.096): number {
  if (desde === null || fotograma < desde) return 1;
  const sube = animar(fotograma, [desde, desde + 4], [0, 1], CURVAS.frena);
  const baja = animar(fotograma, [desde + 4, desde + 26], [0, 1], CURVAS.respiro);
  return 1 + amplitud * sube * (1 - baja);
}

/** El respiro lento: de 1 a 1 + `amplitud` durante el tramo. */
export function respiro(fotograma: number, desde: number, hasta: number, amplitud = 0.02): number {
  return 1 + amplitud * animar(fotograma, [desde, hasta], [0, 1], CURVAS.respiro);
}

/** Desenfoque en una sola dirección (feGaussianBlur «x y»). Con x = y = 0 no aplica nada. */
export function DesenfoqueDireccional({ x, y = 0, children, style }: { readonly x: number; readonly y?: number; readonly children: ReactNode; readonly style?: CSSProperties }): ReactNode {
  const id = `desenfoque-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const activo = x > 0.05 || y > 0.05;
  return (
    <>
      {activo ? (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      <div style={{ ...style, filter: activo ? `url(#${id})` : style?.filter }}>{children}</div>
    </>
  );
}

/** Aplica a un grupo el estado de salida (hacia abajo con estela, desvanecido o creciendo). */
export function Saliente({ estado, origen, children }: { readonly estado: EstadoSalida; readonly origen: string; readonly children: ReactNode }): ReactNode {
  return (
    <DesenfoqueDireccional
      x={0}
      y={estado.estela}
      style={{ position: 'absolute', inset: 0, opacity: estado.opacidad, transform: `translateY(${estado.dy.toFixed(2)}px) scale(${estado.escala.toFixed(4)})`, transformOrigin: origen }}
    >
      {children}
    </DesenfoqueDireccional>
  );
}

/** Un número pseudoaleatorio determinista en [0, 1) a partir de una semilla (las cruces que brillan, las órbitas). */
export function aleatorio(semilla: number): number {
  return random(`iconos-${semilla}`);
}
