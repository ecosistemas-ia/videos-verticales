// Los textos animados, portados de MOTION (src/comune/Testi.tsx):
//   - Cursiva: la línea a pincel se escribe de izquierda a derecha (una máscara de borde suave que avanza a velocidad
//     constante, como una pluma);
//   - TituloEstrecho: el título entra con las letras muy separadas y el espaciado se cierra en medio segundo, con
//     estela horizontal;
//   - TextoCentrado: una línea centrada en (x, y), con scaleX; con `altoMayusculas`, y es el centro de las mayúsculas.

import type { CSSProperties, ReactNode } from 'react';
import { CURVAS, aVelocidadConstante, animar } from './curvas.ts';
import { correccionMayusculas } from './letras.ts';
import { DesenfoqueDireccional } from './movimientos.tsx';

export function Cursiva({
  texto,
  x,
  y,
  tamano,
  color,
  familia,
  desde,
  hasta,
  fotograma,
  opacidad = 1,
}: {
  readonly texto: string;
  readonly x: number;
  readonly y: number;
  readonly tamano: number;
  readonly color: string;
  readonly familia: string;
  /** Fotograma en que la pluma empieza y en que termina de escribir. */
  readonly desde: number;
  readonly hasta: number;
  readonly fotograma: number;
  readonly opacidad?: number;
}): ReactNode {
  if (fotograma < desde || texto.trim() === '') return null;
  const cuota = aVelocidadConstante(fotograma, [desde, Math.max(desde + 1, hasta)], [0, 1], 'la pluma de la cursiva escribe a velocidad constante');
  const margen = tamano * 0.5;
  const borde = 9; // % del ancho: el borde suave de la pluma
  const p = -borde + cuota * (100 + borde * 2);
  const mascara = cuota >= 1 ? undefined : `linear-gradient(90deg, #000 ${p - borde}%, transparent ${p}%)`;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        padding: `${margen * 0.6}px ${margen}px`,
        fontFamily: familia,
        fontSize: tamano,
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
        opacity: opacidad,
        WebkitMaskImage: mascara,
        maskImage: mascara,
        textShadow: `0 0 ${tamano * 0.08}px rgba(0,0,0,0.35)`,
        // Allison es más fina que el pincel del original: un contorno del mismo color engorda el trazo.
        WebkitTextStroke: `${(tamano * 0.018).toFixed(2)}px ${color}`,
      }}
    >
      {texto}
    </div>
  );
}

export interface PropsTextoCentrado {
  readonly texto: string;
  readonly x: number;
  readonly y: number;
  readonly tamano: number;
  readonly familia: string;
  readonly peso?: number;
  readonly altoMayusculas?: number;
  readonly escalaX?: number;
  /** Espaciado en em. */
  readonly espaciado?: number;
  readonly color: string;
  readonly style?: CSSProperties;
}

export function TextoCentrado({ texto, x, y, tamano, familia, peso = 400, altoMayusculas, escalaX = 1, espaciado = 0, color, style }: PropsTextoCentrado): ReactNode {
  const ajuste = altoMayusculas === undefined ? 0 : correccionMayusculas(familia, tamano, altoMayusculas);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + ajuste,
        transform: `translate(-50%, -50%) scaleX(${escalaX})`,
        fontFamily: familia,
        fontWeight: peso,
        fontSize: tamano,
        lineHeight: 1,
        letterSpacing: `${espaciado}em`,
        marginRight: `-${espaciado}em`,
        color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {texto}
    </div>
  );
}

/** El título con el espaciado que se cierra (y la estela horizontal mientras se mueve). */
export function TituloEstrecho(p: {
  readonly texto: string;
  readonly x: number;
  readonly y: number;
  readonly tamano: number;
  readonly familia: string;
  readonly altoMayusculas: number;
  readonly escalaX: number;
  readonly color: string;
  readonly desde: number;
  readonly duracion?: number;
  readonly espaciadoInicial?: number;
  readonly fotograma: number;
  readonly style?: CSSProperties;
}): ReactNode {
  const { fotograma, desde } = p;
  if (fotograma < desde) return null;
  const duracion = p.duracion ?? 16;
  const inicial = p.espaciadoInicial ?? 0.9;
  const espaciado = animar(fotograma, [desde, desde + duracion], [inicial, 0], CURVAS.frena);
  const antes = animar(fotograma - 1, [desde, desde + duracion], [inicial, 0], CURVAS.frena);
  const letras = [...p.texto].length;
  const velocidad = Math.abs(antes - espaciado) * p.tamano * (letras / 2) * p.escalaX;
  const estela = Math.min(18, velocidad * 0.35);
  const opacidad = animar(fotograma, [desde, desde + 3], [0, 1], CURVAS.frena);
  return (
    <DesenfoqueDireccional x={estela} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: opacidad }}>
      <TextoCentrado
        texto={p.texto}
        x={p.x}
        y={p.y}
        tamano={p.tamano}
        familia={p.familia}
        altoMayusculas={p.altoMayusculas}
        escalaX={p.escalaX}
        espaciado={espaciado}
        color={p.color}
        style={p.style}
      />
    </DesenfoqueDireccional>
  );
}
