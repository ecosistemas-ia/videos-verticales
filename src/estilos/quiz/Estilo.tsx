// «Quiz con cuenta atrás». Fondo de color con formas que flotan, el tema arriba, la pregunta grande, una barra que se
// vacía con el tic-tac, opciones que entran una a una y la correcta que se ilumina en verde.

import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import montserrat700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2';
import montserrat800 from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff2';
import montserrat900 from '@fontsource/montserrat/files/montserrat-latin-900-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ZONA_SEGURA, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { tiemposPregunta, type AjustesQuiz, type EscenaQuiz } from './reglas.ts';

cargarFuentes([
  { familia: 'Montserrat', url: montserrat700, peso: 700 },
  { familia: 'Montserrat', url: montserrat800, peso: 800 },
  { familia: 'Montserrat', url: montserrat900, peso: 900 },
]);

const VERDE = '#2BD576';
const ROJO = '#FF4D5E';
const LETRAS = ['A', 'B', 'C', 'D'];
const lim = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function Fondo({ frame, acento }: { frame: number; acento: string }): ReactNode {
  const formas = Array.from({ length: 9 }, (_, i) => ({
    x: (i * 137) % 1080,
    y: (i * 311) % 1920,
    r: 60 + ((i * 53) % 120),
    v: 0.4 + (i % 3) * 0.25,
  }));
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #24124A 0%, #121E4A 55%, #0A1430 100%)', overflow: 'hidden' }}>
      {formas.map((f, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: f.x - f.r,
            top: ((f.y - frame * f.v * 2) % 2100) + (f.y - frame * f.v * 2 < 0 ? 2100 : 0) - 150,
            width: f.r * 2,
            height: f.r * 2,
            borderRadius: i % 2 === 0 ? f.r : 28,
            border: `6px solid ${i % 3 === 0 ? acento : 'rgba(255,255,255,0.10)'}`,
            opacity: i % 3 === 0 ? 0.22 : 1,
            transform: `rotate(${frame * f.v}deg)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function Cartel({ texto, frame, inicio, fps, grande }: { texto: string; frame: number; inicio: number; fps: number; grande?: boolean }): ReactNode {
  const s = spring({ frame: frame - Math.round(inicio * fps), fps, config: { damping: 12 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        top: 560,
        height: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#FFFFFF',
        fontWeight: 900,
        fontSize: grande === true ? 96 : 76,
        lineHeight: 1.1,
        transform: `scale(${interpolate(s, [0, 1], [0.6, 1])}) rotate(${interpolate(s, [0, 1], [-4, 0])}deg)`,
        opacity: s,
        textShadow: '0 10px 30px rgba(0,0,0,0.35)',
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
  const ajustes = props.ajustes as AjustesQuiz;
  const acento = props.guion.marca.acento;
  const escenas = props.escenas as readonly EscenaLista<EscenaQuiz>[];
  const escena = escenas.find((e) => t >= e.inicio && t < e.inicio + e.duracion) ?? escenas[escenas.length - 1];
  const preguntas = escenas.filter((e) => e.datos.tipo === 'pregunta');
  const local = t - escena.inicio;

  let contenido: ReactNode = null;
  const d = escena.datos;
  if (d.tipo === 'intro' || d.tipo === 'cierre') {
    contenido = <Cartel texto={d.texto} frame={frame} inicio={escena.inicio} fps={fps} grande={d.tipo === 'intro'} />;
  } else {
    const momentos = tiemposPregunta(d, escena.voz?.duracion ?? null, ajustes.cuenta);
    const numero = preguntas.findIndex((p) => p.indice === escena.indice) + 1;
    const revelada = local >= momentos.revela;
    const restante = Math.max(0, momentos.revela - Math.max(local, momentos.cuenta));
    const fraccion = restante / ajustes.cuenta;
    const entradaPregunta = spring({ frame: frame - Math.round(escena.inicio * fps), fps, config: { damping: 14 } });
    const tamano = Math.round(Math.max(52, Math.min(80, 92 - d.texto.length * 0.45)));
    contenido = (
      <>
        <div style={{ position: 'absolute', top: ZONA_SEGURA.arriba + 160, width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 34 }}>
          Pregunta {numero} de {preguntas.length}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            top: ZONA_SEGURA.arriba + 220,
            height: 330,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: tamano,
            lineHeight: 1.12,
            opacity: entradaPregunta,
            transform: `translateY(${(1 - entradaPregunta) * 40}px)`,
          }}
        >
          {d.texto}
        </div>
        <div style={{ position: 'absolute', left: 90, right: 90, top: ZONA_SEGURA.arriba + 575, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', opacity: revelada ? 0 : 1 }}>
          <div
            style={{
              width: `${local < momentos.cuenta ? 100 : fraccion * 100}%`,
              height: '100%',
              borderRadius: 11,
              background: fraccion < 0.35 && local >= momentos.cuenta ? ROJO : acento,
            }}
          />
        </div>
        {local >= momentos.cuenta && !revelada && (
          <div
            style={{
              position: 'absolute',
              right: 90,
              top: ZONA_SEGURA.arriba + 490,
              color: fraccion < 0.35 ? ROJO : '#FFFFFF',
              fontWeight: 900,
              fontSize: 64,
              transform: `scale(${1 + 0.25 * (1 - ((local - momentos.cuenta) % 1))})`,
            }}
          >
            {Math.ceil(restante)}
          </div>
        )}
        {d.opciones.map((op, i) => {
          const entra = spring({ frame: frame - Math.round((escena.inicio + momentos.opciones[i]) * fps), fps, config: { damping: 15 } });
          const correcta = i === d.correcta;
          const golpe = revelada && correcta ? spring({ frame: frame - Math.round((escena.inicio + momentos.revela) * fps), fps, config: { damping: 8 } }) : 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 90,
                right: 90,
                top: ZONA_SEGURA.arriba + 640 + i * 150,
                height: 126,
                borderRadius: 63,
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: '0 34px',
                background: revelada && correcta ? VERDE : 'rgba(255,255,255,0.96)',
                color: '#121a2e',
                fontWeight: 800,
                fontSize: op.length > 26 ? 38 : 46,
                opacity: entra * (revelada && !correcta ? 0.35 : 1),
                transform: `translateX(${(1 - entra) * 120}px) scale(${1 + golpe * 0.06})`,
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  flexShrink: 0,
                  background: revelada && correcta ? '#FFFFFF' : acento,
                  color: '#121a2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 40,
                }}
              >
                {revelada && correcta ? '✓' : LETRAS[i]}
              </div>
              {op}
            </div>
          );
        })}
        {revelada && d.dato !== '' && (
          <div
            style={{
              position: 'absolute',
              left: 90,
              right: 90,
              top: ZONA_SEGURA.arriba + 650 + d.opciones.length * 150,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1.3,
              textAlign: 'center',
              opacity: interpolate(local - momentos.revela, [0.2, 0.5], [0, 1], lim),
            }}
          >
            {d.dato}
          </div>
        )}
      </>
    );
  }

  return (
    <AbsoluteFill style={{ fontFamily: 'Montserrat' }}>
      <Fondo frame={frame} acento={acento} />
      <div style={{ position: 'absolute', top: ZONA_SEGURA.arriba, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            background: acento,
            color: '#121a2e',
            fontWeight: 900,
            fontSize: 36,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '14px 34px',
            borderRadius: 40,
          }}
        >
          Quiz · {ajustes.tema}
        </div>
      </div>
      {contenido}
    </AbsoluteFill>
  );
}
