// Los rótulos sobre el mundo, comunes a los dos estilos, con dos temas:
//   maqueta      (3D): placas oscuras translúcidas, cifras blancas grandes, como un documental de juego;
//   ilustracion  (2D): cartelas magenta y violeta con cifras blancas, vidrio índigo, como la divulgación ilustrada.
// Todo en la mitad de arriba de la pantalla, fuera de la franja de los subtítulos y dentro de la zona segura.

import type { CSSProperties, ReactNode } from 'react';
import interTight600 from '@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff2';
import interTight800 from '@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff2';
import poppins700 from '@fontsource/poppins/files/poppins-latin-700-normal.woff2';
import poppins800 from '@fontsource/poppins/files/poppins-latin-800-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ANCHO, ZONA_SEGURA } from '../../comun/guion.ts';
import { clamp01, liso } from './azar.ts';
import type { Rotulo } from './esquemas.ts';

cargarFuentes([
  { familia: 'Inter Tight', url: interTight600, peso: 600 },
  { familia: 'Inter Tight', url: interTight800, peso: 800 },
  { familia: 'Poppins', url: poppins700, peso: 700 },
  { familia: 'Poppins', url: poppins800, peso: 800 },
]);

export type Tema = 'maqueta' | 'ilustracion';

export interface PuntoPantalla {
  x: number;
  y: number;
}

/** Hasta dónde pueden bajar los rótulos: encima de la franja de subtítulos. */
const TOPE_ABAJO = 1230;

const fuente = (tema: Tema) => (tema === 'maqueta' ? 'Inter Tight' : 'Poppins');

/** Cuenta una cifra escrita en español («7,3», «1.200», «70 %») de 0 a su valor. */
function contar(valor: string, k: number): string {
  const m = valor.match(/^(\D*)([\d.]+(?:,\d+)?)(.*)$/);
  if (m === null || k >= 1) return valor;
  const [, antes, num, despues] = m;
  const decimales = num.includes(',') ? num.split(',')[1].length : 0;
  const n = Number(num.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return valor;
  const v = n * liso(k);
  const texto = v.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: num.includes('.') });
  return `${antes}${texto}${despues}`;
}

export function EtiquetaFija({ texto, tema, acento }: { texto: string; tema: Tema; acento: string }): ReactNode {
  if (texto.trim() === '') return null;
  const estilo: CSSProperties =
    tema === 'maqueta'
      ? { background: 'rgba(24,20,16,0.58)', color: '#F7F1E6', border: '1px solid rgba(255,255,255,0.14)' }
      : { background: 'rgba(28,26,84,0.72)', color: '#EEF0FF', border: '1px solid rgba(160,170,255,0.35)' };
  return (
    <div
      style={{
        position: 'absolute',
        left: ZONA_SEGURA.izquierda,
        top: ZONA_SEGURA.arriba + 4,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px 10px 16px',
        borderRadius: tema === 'maqueta' ? 8 : 40,
        fontFamily: fuente(tema),
        fontWeight: tema === 'maqueta' ? 800 : 700,
        fontSize: 25,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        ...estilo,
      }}
    >
      <span style={{ width: 11, height: 11, borderRadius: 6, background: tema === 'maqueta' ? acento : '#FF5C9A', boxShadow: `0 0 10px ${tema === 'maqueta' ? acento : '#FF5C9A'}` }} />
      {texto}
    </div>
  );
}

export function Rotulos({
  rotulo,
  presencia,
  tl,
  anio,
  tema,
  acento,
  ancla,
  medida,
}: {
  rotulo: Rotulo | undefined;
  presencia: number;
  tl: number;
  anio: number | null;
  tema: Tema;
  acento: string;
  /** Dónde cae el lugar en la pantalla (para la chincheta). */
  ancla?: PuntoPantalla | null;
  /** Base y tope de lo que se mide, en la pantalla. */
  medida?: { base: PuntoPantalla; tope: PuntoPantalla } | null;
}): ReactNode {
  if (rotulo === undefined || presencia <= 0.001) return null;
  const p = presencia;
  const sube = (1 - p) * 16;
  const f = fuente(tema);
  const sombra = tema === 'maqueta' ? '0 4px 22px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.6)' : '0 6px 26px rgba(20,10,60,0.55)';

  if (rotulo.tipo === 'titulo') {
    return (
      <div style={{ position: 'absolute', left: 80, right: 180, top: 360, opacity: p, transform: `translateY(${sube}px)`, fontFamily: f, color: '#FFFFFF', textShadow: sombra }}>
        {rotulo.antetitulo !== '' && (
          <div style={{ fontWeight: tema === 'maqueta' ? 800 : 700, fontSize: 32, letterSpacing: '0.16em', textTransform: 'uppercase', color: tema === 'maqueta' ? '#F6D9A6' : '#FFB3D1', marginBottom: 14 }}>{rotulo.antetitulo}</div>
        )}
        <div style={{ fontWeight: 800, fontSize: rotulo.texto.length > 26 ? 84 : 100, lineHeight: 1.02, letterSpacing: '-0.01em' }}>{rotulo.texto}</div>
      </div>
    );
  }

  if (rotulo.tipo === 'anio') {
    const valor = anio ?? rotulo.hasta;
    const texto = Math.abs(valor).toLocaleString('es-ES', { useGrouping: Math.abs(valor) >= 10000 });
    return (
      <div style={{ position: 'absolute', left: 0, right: 100, top: 300, textAlign: 'center', opacity: p, transform: `translateY(${sube}px)`, fontFamily: f, color: '#FFFFFF', textShadow: sombra, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontWeight: 800, fontSize: 132, letterSpacing: '-0.02em' }}>{texto}</span>
        {rotulo.sufijo !== '' && <span style={{ fontWeight: 700, fontSize: 46, marginLeft: 14 }}>{rotulo.sufijo}</span>}
      </div>
    );
  }

  if (rotulo.tipo === 'dato') {
    const k = clamp01((tl - 0.35) / 0.9);
    const caja: CSSProperties =
      tema === 'maqueta'
        ? { background: 'rgba(24,20,16,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18 }
        : { background: 'linear-gradient(160deg, #F2508F 0%, #C23E9E 55%, #7E3CC0 100%)', borderRadius: 30, boxShadow: '0 18px 50px rgba(40,10,80,0.45), inset 0 2px 0 rgba(255,255,255,0.35)' };
    return (
      <div style={{ position: 'absolute', left: 0, right: 100, top: 320, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${sube}px) scale(${0.94 + 0.06 * p})` }}>
        <div style={{ ...caja, padding: '22px 46px 26px', textAlign: 'center', fontFamily: f, color: '#FFFFFF', maxWidth: 780 }}>
          <div style={{ fontWeight: 800, fontSize: rotulo.valor.length > 7 ? 112 : 150, lineHeight: 1, letterSpacing: '-0.02em', textShadow: tema === 'maqueta' ? sombra : '0 4px 0 rgba(90,20,90,0.35)', fontVariantNumeric: 'tabular-nums' }}>{contar(rotulo.valor, k)}</div>
          {rotulo.texto !== '' && (
            <div style={{ fontWeight: tema === 'maqueta' ? 800 : 700, fontSize: 34, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10, color: tema === 'maqueta' ? '#F6E7CF' : '#FFFFFF' }}>{rotulo.texto}</div>
          )}
        </div>
      </div>
    );
  }

  if (rotulo.tipo === 'lugar') {
    if (!ancla) return null;
    const x = Math.min(ANCHO - ZONA_SEGURA.derecha - 120, Math.max(ZONA_SEGURA.izquierda + 120, ancla.x));
    const yPunto = Math.min(TOPE_ABAJO, Math.max(ZONA_SEGURA.arriba + 160, ancla.y));
    const largo = 90 + 30 * (1 - p);
    const yPlaca = Math.max(ZONA_SEGURA.arriba + 70, yPunto - largo);
    const placa: CSSProperties =
      tema === 'maqueta'
        ? { background: 'rgba(24,20,16,0.62)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8 }
        : { background: '#FFFFFF', color: '#2A1E5C', borderRadius: 40, boxShadow: '0 10px 30px rgba(30,10,70,0.45)' };
    return (
      <div style={{ position: 'absolute', inset: 0, opacity: p, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: x - 1.5, top: yPlaca, width: 3, height: yPunto - yPlaca, background: tema === 'maqueta' ? 'rgba(255,255,255,0.85)' : '#FFFFFF', boxShadow: '0 0 6px rgba(0,0,0,0.4)' }} />
        <div style={{ position: 'absolute', left: x - 11, top: yPunto - 11, width: 22, height: 22, borderRadius: 11, background: tema === 'maqueta' ? '#FFFFFF' : '#FF5C9A', border: `4px solid ${tema === 'maqueta' ? acento : '#FFFFFF'}`, boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'absolute', left: x, top: yPlaca, transform: `translate(-50%, -100%) translateY(${sube * 0.6}px)`, ...placa, padding: '12px 24px', fontFamily: f, fontWeight: 800, fontSize: 36, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {rotulo.texto}
        </div>
      </div>
    );
  }

  // medida: barra vertical que se llena de la base al tope, con el valor arriba
  if (!medida) return null;
  const k = liso((tl - 0.35) / 1.1);
  const xb = Math.min(ANCHO - ZONA_SEGURA.derecha - 90, Math.max(ZONA_SEGURA.izquierda + 40, medida.base.x));
  const yBase = Math.min(TOPE_ABAJO, medida.base.y);
  const yTope = Math.max(ZONA_SEGURA.arriba + 120, Math.min(yBase - 80, medida.tope.y));
  const yActual = yBase + (yTope - yBase) * k;
  const color = tema === 'maqueta' ? '#FFFFFF' : '#FFD25C';
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: p, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: xb - 2, top: yTope, width: 4, height: yBase - yTope, background: 'rgba(255,255,255,0.25)' }} />
      <div style={{ position: 'absolute', left: xb - 3, top: yActual, width: 6, height: yBase - yActual, background: color, boxShadow: '0 0 10px rgba(0,0,0,0.45)', borderRadius: 3 }} />
      <div style={{ position: 'absolute', left: xb - 18, top: yBase - 2, width: 36, height: 4, background: color }} />
      <div style={{ position: 'absolute', left: xb - 18, top: yActual - 2, width: 36, height: 4, background: color }} />
      <div style={{ position: 'absolute', left: xb + 28, top: yActual - 34, fontFamily: f, color: '#FFFFFF', textShadow: sombra, whiteSpace: 'nowrap' }}>
        <span style={{ fontWeight: 800, fontSize: 64 }}>{contar(rotulo.valor, k)}</span>
        <span style={{ fontWeight: 700, fontSize: 40, marginLeft: 8 }}>{rotulo.unidad}</span>
      </div>
    </div>
  );
}
