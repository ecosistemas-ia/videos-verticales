// La órbita, portada de MOTION (src/comune/Orbita.tsx) con las medidas del video de referencia:
//   - al llegar, el anillo viene de unas tres veces su tamaño girando, con los trazos estirados en estelas
//     desenfocadas, y se posa en 9 fotogramas;
//   - mientras se posa, el círculo punteado se dibuja (el arco crece hasta la vuelta entera);
//   - luego el círculo queda quieto y los íconos a dos colores giran en sentido horario (~32° por segundo), derechos.

import type { ReactNode } from 'react';
import { useId } from 'react';
import { CURVAS, aVelocidadConstante, animar } from './curvas.ts';
import { Icono, type Iconos } from './Icono.tsx';
import { aleatorio } from './movimientos.tsx';

const LLEGADA = 9;
/** Grados por segundo, en sentido horario (medido en el original). */
const GIRO = 32;

export function Orbita(p: {
  readonly cx: number;
  readonly cy: number;
  readonly radio: number;
  readonly nombres: readonly string[];
  readonly iconos: Iconos;
  /** Fotograma en que llega y fotograma en que termina la escena. */
  readonly desde: number;
  readonly fin: number;
  readonly fotograma: number;
  readonly fps: number;
  readonly ladoIcono: number;
  readonly grosor: number;
  readonly trazo: number;
  readonly hueco: number;
  readonly colorIconos: string;
  readonly colorFondoIconos: string;
}): ReactNode {
  const { fotograma, desde } = p;
  const idMascara = `arco-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (fotograma < desde) return null;
  const q = animar(fotograma, [desde, desde + LLEGADA], [0, 1], CURVAS.frena);
  const escala = 3.2 + (1 - 3.2) * q;
  const giroLlegada = -75 * (1 - q);
  const giro = aVelocidadConstante(fotograma, [desde, Math.max(p.fin, desde + 1)], [0, (GIRO * Math.max(1, p.fin - desde)) / p.fps], 'los íconos giran a velocidad constante sobre el círculo, como en el original');
  const desenfoque = 14 * (1 - q);
  const estiramiento = 1 + 7 * (1 - q) * (1 - q);
  const circunferencia = 2 * Math.PI * p.radio;
  const arco = animar(fotograma, [desde + 5, desde + LLEGADA + 7], [0, 1], CURVAS.suave);
  const opacidad = animar(fotograma, [desde, desde + 3], [0, 1], CURVAS.frena);
  const n = p.nombres.length;
  const anillo = 1 - animar(fotograma, [desde + 4, desde + LLEGADA + 2], [0, 1], CURVAS.salida);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: opacidad }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <mask id={idMascara} maskUnits="userSpaceOnUse">
            <circle
              cx={p.cx}
              cy={p.cy}
              r={p.radio}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={p.grosor * 8}
              strokeDasharray={`${circunferencia * arco} ${circunferencia}`}
              transform={`rotate(-90 ${p.cx} ${p.cy})`}
            />
          </mask>
        </defs>
        {arco > 0.001 ? (
          <circle
            mask={arco < 0.999 ? `url(#${idMascara})` : undefined}
            cx={p.cx}
            cy={p.cy}
            r={p.radio}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.92}
            strokeWidth={p.grosor}
            strokeLinecap="round"
            strokeDasharray={`${p.trazo} ${p.hueco}`}
          />
        ) : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotate(${giroLlegada}deg) scale(${escala})`,
          transformOrigin: `${p.cx}px ${p.cy}px`,
          filter: desenfoque > 0.1 ? `blur(${desenfoque.toFixed(2)}px)` : undefined,
        }}
      >
        {anillo > 0.001 ? (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: anillo }}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r={p.radio}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.92}
              strokeWidth={p.grosor * (1 + (estiramiento - 1) * 0.25)}
              strokeLinecap="round"
              strokeDasharray={`${p.trazo * estiramiento} ${p.hueco}`}
              strokeDashoffset={-circunferencia * 0.02 * (1 - q)}
            />
          </svg>
        ) : null}
        {p.nombres.map((nombre, i) => {
          const angulo = ((-90 + (360 * i) / n + giro) * Math.PI) / 180;
          const x = p.cx + p.radio * Math.cos(angulo);
          const y = p.cy + p.radio * Math.sin(angulo);
          const inclinacion = (aleatorio(i + 3) - 0.5) * 24;
          return (
            <div
              key={`${nombre}-${i}`}
              style={{
                position: 'absolute',
                left: x - p.ladoIcono / 2,
                top: y - p.ladoIcono / 2,
                transform: `rotate(${inclinacion - giroLlegada}deg)`,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
              }}
            >
              <Icono iconos={p.iconos} nombre={nombre} estilo="duotono" lado={p.ladoIcono} color={p.colorIconos} colorFondo={p.colorFondoIconos} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
