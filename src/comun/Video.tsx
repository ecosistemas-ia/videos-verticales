// Lo común a todos los estilos: el estilo dibuja la imagen; aquí se añaden los subtítulos, la firma de la marca y el
// sonido (voz, música y efectos).

import type { ComponentType, FC, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import montserrat900 from '@fontsource/montserrat/files/montserrat-latin-900-normal.woff2';
import poppins600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff2';
import { cargarFuentes } from './fuentes.ts';
import { ALTO, ZONA_SEGURA, palabrasParaSubtitulos, type PropsVideo } from './guion.ts';
import type { ReglasEstilo } from './reglas.ts';
import { Sonidos } from './Sonidos.tsx';
import { Subtitulos } from './Subtitulos.tsx';

cargarFuentes([
  { familia: 'Montserrat', url: montserrat900, peso: 900 },
  { familia: 'Poppins', url: poppins600, peso: 600 },
]);

export function Firma({ nombre, tono = 'clara' }: { nombre: string; tono?: 'clara' | 'oscura' | 'ninguna' }): ReactNode {
  if (nombre.trim() === '' || tono === 'ninguna') return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: ZONA_SEGURA.izquierda,
        // Justo encima de la zona que tapan las aplicaciones, debajo de la franja de los subtítulos.
        top: ALTO - ZONA_SEGURA.abajo - 46,
        fontFamily: 'Poppins',
        fontWeight: 600,
        fontSize: 30,
        color: tono === 'clara' ? 'rgba(255,255,255,0.75)' : 'rgba(14,16,20,0.78)',
        textShadow: tono === 'clara' ? '0 2px 8px rgba(0,0,0,0.6)' : '0 1px 6px rgba(255,255,255,0.7)',
        letterSpacing: '0.02em',
      }}
    >
      {nombre}
    </div>
  );
}

/** Envuelve el componente de un estilo con lo común. */
export function conLoComun(Estilo: ComponentType<PropsVideo>, reglas: ReglasEstilo): FC<PropsVideo> {
  function VideoCompleto(props: PropsVideo): ReactNode {
    const modo = props.guion.subtitulos;
    const golpes = props.guion.efectos
      ? reglas.golpes(props.escenas as never, reglas.esquemaAjustes.parse(props.ajustes), props.guion)
      : [];
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        <Estilo {...props} />
        {reglas.admiteSubtitulos && modo !== 'ninguno' && (
          <Subtitulos palabras={palabrasParaSubtitulos(props.escenas.filter((e) => reglas.subtitulosEn?.(e.datos) ?? true), (d) => reglas.textoVoz(d))} modo={modo} acento={props.guion.marca.acento} arriba={reglas.subtitulosArriba} />
        )}
        <Firma nombre={props.guion.marca.nombre} tono={reglas.firma} />
        <Sonidos props={props} golpes={golpes} />
      </AbsoluteFill>
    );
  }
  VideoCompleto.displayName = `Video(${reglas.id})`;
  return VideoCompleto;
}
