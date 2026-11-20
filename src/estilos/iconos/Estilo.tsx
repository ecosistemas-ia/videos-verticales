// «Explicación con íconos». La raíz del estilo: espera a las tipografías y a los íconos del guion, arma el plan
// (plan.ts) y dibuja el fotograma: fondo, plano activo y encabezados. En los últimos 20 fotogramas todo se desenfoca y
// se apaga hacia el negro, como en el original. Subtítulos, firma y sonido los pone el motor común (Video.tsx).

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { EscenaLista, PropsVideo } from '../../comun/guion.ts';
import { CURVAS, animar } from './curvas.ts';
import { coloresDelVideo } from './diseno.ts';
import { Encabezados } from './Encabezados.tsx';
import type { PropsEscena } from './escenas/comunes.ts';
import { EscenaFigura, EscenaOrbita } from './escenas/Figuras.tsx';
import { EscenaCierre, EscenaNota, EscenaTarjetas } from './escenas/Texto.tsx';
import { Titulo } from './escenas/Titulo.tsx';
import { Fondo } from './Fondo.tsx';
import { useIconos } from './Icono.tsx';
import { useLetras } from './letras.ts';
import { iconosUsados, planificar } from './plan.ts';
import type { AjustesIconos, EscenaIconos } from './reglas.ts';

const PLANOS: { readonly [t in EscenaIconos['tipo']]: (p: PropsEscena) => ReactNode } = {
  titulo: Titulo,
  orbita: EscenaOrbita,
  // La pregunta solo tiene cursiva y título, que dibuja la capa de encabezados.
  pregunta: () => null,
  figura: EscenaFigura,
  tarjetas: EscenaTarjetas,
  nota: EscenaNota,
  cierre: EscenaCierre,
};

/** Fotogramas del desenfoque final. */
const DESENFOQUE_FINAL = 20;

export function Estilo(props: PropsVideo): ReactNode {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const escenas = props.escenas as readonly EscenaLista<EscenaIconos>[];
  const ajustes = props.ajustes as AjustesIconos;
  const listas = useLetras();
  const nombres = useMemo(() => iconosUsados(escenas), [escenas]);
  const iconos = useIconos(nombres);
  const colores = useMemo(() => coloresDelVideo(ajustes, props.guion.marca.acento), [ajustes, props.guion.marca.acento]);
  const plan = useMemo(() => planificar(escenas, fps, durationInFrames), [escenas, fps, durationInFrames]);
  if (!listas || iconos === null) return <AbsoluteFill style={{ backgroundColor: '#000000' }} />;
  const qFin = animar(f, [durationInFrames - DESENFOQUE_FINAL, durationInFrames - 1], [0, 1], CURVAS.suave);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ filter: qFin > 0.001 ? `blur(${(18 * qFin).toFixed(2)}px)` : undefined, opacity: 1 - 0.88 * qFin }}>
        <Fondo fondoBajo={colores.fondoBajo} fotograma={f} fps={fps} cambio={plan.cambioRejilla} total={durationInFrames} />
        {plan.escenas.map((s) => {
          if (f < s.inicio || f >= s.fin) return null;
          const Plano = PLANOS[s.datos.tipo];
          return <Plano key={s.indice} s={s} f={f} fps={fps} colores={colores} iconos={iconos} plan={plan} />;
        })}
        <Encabezados plan={plan} f={f} colores={colores} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
