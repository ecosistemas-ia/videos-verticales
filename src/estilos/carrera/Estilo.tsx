// «Carrera de datos». Las barras se ordenan en cada fotograma por su valor interpolado; la posición vertical se
// suaviza promediando el puesto de las últimas décimas de segundo, para que los adelantamientos se vean como un
// cruce y no como un salto.

import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import poppins500 from '@fontsource/poppins/files/poppins-latin-500-normal.woff2';
import poppins700 from '@fontsource/poppins/files/poppins-latin-700-normal.woff2';
import poppins800 from '@fontsource/poppins/files/poppins-latin-800-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ALTO, ZONA_SEGURA, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { periodos, posicionEn, valorEn, type AjustesCarrera, type EscenaCarrera } from './reglas.ts';

cargarFuentes([
  { familia: 'Poppins', url: poppins500, peso: 500 },
  { familia: 'Poppins', url: poppins700, peso: 700 },
  { familia: 'Poppins', url: poppins800, peso: 800 },
]);

const PALETA = ['#4C8DFF', '#FF6B6B', '#2BD576', '#FFC83D', '#B57BFF', '#FF8A3D', '#2EC4E6', '#FF5FA2', '#9BD34B', '#E0E0E0', '#1F6FEB', '#C2185B', '#00A88F', '#D4A017', '#7E57C2', '#8D6E63'];
const ARRIBA = 420;
const ALTO_GRAFICO = 760;
const IZQUIERDA = 70;
const ANCHO_GRAFICO = 1080 - IZQUIERDA - 190;

/** Texto oscuro o claro según el color de fondo. */
function contraste(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0E1220' : '#FFFFFF';
}

function formatear(v: number, decimales: number): string {
  return v.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = props.ajustes as AjustesCarrera;
  const escenas = props.escenas as readonly EscenaLista<EscenaCarrera>[];
  const lista = periodos(a);
  const pos = posicionEn(escenas, lista, t);
  const periodo = lista[Math.round(pos)] ?? '';

  const puestoEn = (momento: number): Map<string, number> => {
    const p = posicionEn(escenas, lista, Math.max(0, momento));
    const orden = a.series.map((s) => ({ nombre: s.nombre, v: valorEn(s.valores, lista, p) })).sort((x, y) => y.v - x.v);
    return new Map(orden.map((o, i) => [o.nombre, i]));
  };
  const muestras = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map((d) => puestoEn(t - d));
  const filas = a.series.map((s, i) => {
    const v = valorEn(s.valores, lista, pos);
    const puesto = muestras.reduce((suma, m) => suma + (m.get(s.nombre) ?? 0), 0) / muestras.length;
    return { nombre: s.nombre, color: s.color ?? PALETA[i % PALETA.length], v, puesto };
  });
  const maximo = Math.max(...filas.map((f) => f.v), 0.0001);
  const alto = ALTO_GRAFICO / a.visibles;
  const grosor = alto * 0.8;
  const entrada = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0E1220 0%, #121A30 100%)', fontFamily: 'Poppins', color: '#FFFFFF' }}>
      <div style={{ position: 'absolute', left: 70, right: 70, top: ZONA_SEGURA.arriba, textAlign: 'center', opacity: entrada }}>
        <div style={{ fontWeight: 800, fontSize: a.titulo.length > 40 ? 50 : 58, lineHeight: 1.12 }}>{a.titulo}</div>
        {a.unidad !== '' && <div style={{ fontWeight: 500, fontSize: 32, color: '#9AA6C0', marginTop: 10 }}>{a.unidad}</div>}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 80,
          top: ARRIBA + ALTO_GRAFICO - 210,
          fontWeight: 800,
          fontSize: 200,
          color: 'rgba(255,255,255,0.13)',
          lineHeight: 1,
        }}
      >
        {periodo}
      </div>

      {filas
        .filter((f) => f.puesto < a.visibles + 0.5)
        .map((f) => {
          const ancho = Math.max(8, (f.v / maximo) * ANCHO_GRAFICO);
          const opacidad = interpolate(f.puesto, [a.visibles - 0.6, a.visibles], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const dentro = ancho > 300;
          return (
            <div key={f.nombre} style={{ position: 'absolute', left: IZQUIERDA, top: ARRIBA + f.puesto * alto, height: grosor, opacity: opacidad * entrada }}>
              <div
                style={{
                  width: ancho,
                  height: grosor,
                  borderRadius: 14,
                  background: f.color,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 22,
                  boxSizing: 'border-box',
                  color: contraste(f.color),
                  fontWeight: 700,
                  fontSize: Math.min(38, grosor * 0.45),
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                }}
              >
                {dentro ? f.nombre : ''}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: ancho + 16,
                  top: 0,
                  height: grosor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  whiteSpace: 'nowrap',
                  fontSize: Math.min(34, grosor * 0.42),
                }}
              >
                <span style={{ fontWeight: 800 }}>{formatear(f.v, a.decimales)}</span>
                {!dentro && <span style={{ fontWeight: 600, color: '#C9D2E3' }}>{f.nombre}</span>}
              </div>
            </div>
          );
        })}

      <div style={{ position: 'absolute', left: 70, right: 200, top: ALTO - ZONA_SEGURA.abajo - 50, fontWeight: 500, fontSize: 24, color: '#8D99B3' }}>
        Fuente: {a.fuente}
      </div>
    </AbsoluteFill>
  );
}
