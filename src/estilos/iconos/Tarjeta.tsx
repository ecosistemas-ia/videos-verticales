// La tarjeta con íconos que entran (las «Tiene: / No tiene:» del original), portada de MOTION
// (src/comune/Scheda.tsx), medida sobre el video de referencia a 720 px de ancho:
//   - recuadro 494 × 277, borde blanco fino más tenue arriba, relleno carmesí transparente que se aclara hacia abajo
//     (opacidad de 0,28 a 0,63) y una sombra interior oscura arriba;
//   - título arriba a la izquierda (Urbanist) con una línea fina debajo;
//   - los ítems en casillas de paso fijo (150 px): ícono lleno blanco y etiqueta debajo; cada ítem entra sobre su
//     palabra, el ícono de desenfocado y luminoso a nítido, la etiqueta escrita letra por letra.

import type { ReactNode } from 'react';
import { CURVAS, aVelocidadConstante, animar, rgb } from './curvas.ts';
import { TARJETA } from './diseno.ts';
import { Icono, type Iconos } from './Icono.tsx';
import { LETRAS, correccionMayusculas, tamanoEnUnaLinea } from './letras.ts';

export interface ItemEnTarjeta {
  readonly icono: string;
  readonly texto: string;
  /** Fotograma en que entra. */
  readonly entra: number;
}

/** Fotogramas por letra de la etiqueta que se escribe (el original: «Ti» → «Time» en 0,25 s). */
const POR_LETRA = 1.6;

export function Tarjeta(p: {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly titulo: string;
  readonly entra: number;
  readonly items: readonly ItemEnTarjeta[];
  readonly iconos: Iconos;
  readonly fotograma: number;
  readonly color: string;
  readonly id: string;
}): ReactNode {
  const { fotograma, u } = p;
  if (fotograma < p.entra) return null;
  const M = TARJETA;
  const w = M.ancho * u;
  const h = M.alto * u;
  const c = rgb(p.color);
  const q = animar(fotograma, [p.entra, p.entra + 8], [0, 1], CURVAS.frena);
  const casillas = Math.max(3, p.items.length);
  const paso = (M.paso * u * 3) / casillas;
  const estiloEtiqueta = { familia: LETRAS.etiqueta, peso: 400, escalaX: 1.06 };
  const idBorde = `borde-${p.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x,
        top: p.y,
        width: w,
        height: h,
        opacity: q,
        transform: `scale(${1.06 - 0.06 * q})`,
        filter: q < 0.99 ? `blur(${(6 * (1 - q) * u).toFixed(2)}px)` : undefined,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(${c},0.28) 0%, rgba(${c},0.63) 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.72) 4%, rgba(0,0,0,0.16) 10%, rgba(0,0,0,0) 16%)' }} />
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id={idBorde} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
            <stop offset="0.25" stopColor="#FFFFFF" stopOpacity={0.62} />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <rect x={u} y={u} width={w - 2 * u} height={h - 2 * u} fill="none" stroke={`url(#${idBorde})`} strokeWidth={2 * u} />
        <line x1={M.linea.desde * u} x2={M.linea.hasta * u} y1={M.linea.y * u} y2={M.linea.y * u} stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={M.linea.grosor * u} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: M.titulo.x * u,
          top: M.titulo.centro * u,
          transform: 'translateY(-50%) scaleX(1.1)',
          transformOrigin: '0% 50%',
          fontFamily: LETRAS.etiqueta,
          fontWeight: 400,
          fontSize: M.titulo.tamano * u,
          lineHeight: 1,
          color: '#FFFFFF',
          whiteSpace: 'nowrap',
          textShadow: `0 ${u}px ${2 * u}px rgba(0,0,0,0.35)`,
        }}
      >
        {p.titulo}
      </div>
      {p.items.map((it, j) => {
        if (fotograma < it.entra) return null;
        const cx = w / 2 + (j - (casillas - 1) / 2) * paso;
        const qi = animar(fotograma, [it.entra, it.entra + 7], [0, 1], CURVAS.frena);
        const letras = [...it.texto];
        const escritas = Math.floor(
          aVelocidadConstante(fotograma, [it.entra + 1, it.entra + 1 + letras.length * POR_LETRA], [0, letras.length], 'la etiqueta se escribe letra por letra a ritmo constante, como en el original'),
        );
        const tamano = tamanoEnUnaLinea(it.texto, estiloEtiqueta, M.etiqueta.tamano * u, paso - 10 * u);
        const lado = M.icono.lado * u;
        return (
          <div key={j}>
            <div
              style={{
                position: 'absolute',
                left: cx - lado / 2,
                top: M.icono.centro * u - lado / 2,
                opacity: Math.min(1, qi * 1.8),
                transform: `scale(${1.25 - 0.25 * qi})`,
                filter:
                  qi < 0.99
                    ? `blur(${(8 * (1 - qi) * u).toFixed(2)}px) drop-shadow(0 0 ${(10 * (1 - qi) * u).toFixed(2)}px rgba(255,255,255,0.9))`
                    : `drop-shadow(0 ${u}px ${2 * u}px rgba(0,0,0,0.3))`,
              }}
            >
              <Icono iconos={p.iconos} nombre={it.icono} estilo="lleno" lado={lado} color="#FFFFFF" />
            </div>
            <div
              style={{
                position: 'absolute',
                left: cx,
                top: M.etiqueta.centro * u + correccionMayusculas(LETRAS.etiqueta, tamano, 0.7),
                transform: 'translate(-50%, -50%) scaleX(1.06)',
                fontFamily: LETRAS.etiqueta,
                fontWeight: 400,
                fontSize: tamano,
                lineHeight: 1,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                textShadow: `0 ${u}px ${2 * u}px rgba(0,0,0,0.35)`,
              }}
            >
              {letras.slice(0, escritas).join('')}
              <span style={{ opacity: 0 }}>{letras.slice(escritas).join('')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
