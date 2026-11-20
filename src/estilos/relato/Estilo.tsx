// Relato de un negocio: la hoja teñida del color claro del negocio, los bloques visuales (una escena, o varias tarjetas
// seguidas que comparten tarjeta) con sus pasos (subir, desenfoque, acercar), y lo que queda fijo encima: las flores
// negras desenfocadas que giran en las esquinas, el nombre de la marca arriba a la izquierda y, si el negocio es
// inventado, el aviso en pequeño.

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import gelasio500 from '@fontsource/gelasio/files/gelasio-latin-500-italic.woff2';
import gelasio600 from '@fontsource/gelasio/files/gelasio-latin-600-italic.woff2';
import interTight300 from '@fontsource/inter-tight/files/inter-tight-latin-300-italic.woff2';
import interTight500 from '@fontsource/inter-tight/files/inter-tight-latin-500-italic.woff2';
import montserrat700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import type { EscenaLista, PropsVideo } from '../../comun/guion.ts';
import { CURVAS, anima } from '../_papel/curvas.ts';
import type { Paleta } from '../_papel/dibujos.tsx';
import { FondoTenido, GranoPapel } from '../_papel/fondo.tsx';
import { useFuentes } from '../_papel/fuentes.ts';
import type { CaraPapel } from '../_papel/fuentes.ts';
import { CAPA_QUIETA, entraRelato, saleRelato } from '../_papel/transiciones.ts';
import type { EstadoCapa, PasoRelato } from '../_papel/transiciones.ts';
import { FlorDesenfocada, coloresDelNegocio } from './piezas.tsx';
import { ContenidoBloque, GROTESCA, LETRA_MARCA, SERIFA } from './planos.tsx';
import { esquemaAjustes, pasoPorDefecto } from './reglas.ts';
import type { EscenaRelato } from './reglas.ts';

const CARAS: readonly CaraPapel[] = [
  { familia: SERIFA, url: gelasio500, peso: 500 },
  { familia: SERIFA, url: gelasio600, peso: 600 },
  { familia: GROTESCA, url: interTight300, peso: 300 },
  { familia: GROTESCA, url: interTight500, peso: 500 },
  { familia: LETRA_MARCA, url: montserrat700, peso: 700 },
];

interface Bloque {
  /** Índices de las escenas del bloque (varias solo si son tarjetas seguidas). */
  readonly escenas: readonly number[];
  readonly limites: readonly number[];
  readonly paso: PasoRelato;
}

function bloques(escenas: readonly EscenaLista<EscenaRelato>[], fps: number): Bloque[] {
  const r: { escenas: number[]; limites: number[]; paso: PasoRelato }[] = [];
  escenas.forEach((e, i) => {
    const limite = Math.round(e.inicio * fps);
    const anterior = r[r.length - 1];
    if (anterior !== undefined && e.datos.plano === 'tarjeta' && escenas[i - 1].datos.plano === 'tarjeta') {
      anterior.escenas.push(i);
      anterior.limites.push(limite);
      return;
    }
    r.push({ escenas: [i], limites: [limite], paso: i === 0 ? 'corte' : pasoPorDefecto(e.datos) });
  });
  return r;
}

function combina(a: EstadoCapa, b: EstadoCapa): EstadoCapa {
  return { visible: a.visible && b.visible, opacidad: a.opacidad * b.opacidad, desenfoque: a.desenfoque + b.desenfoque, escala: a.escala * b.escala, giro: a.giro + b.giro, dx: a.dx + b.dx, dy: a.dy + b.dy, estela: false };
}

export function Estilo(props: PropsVideo): ReactNode {
  const listas = useFuentes(CARAS);
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ajustes = esquemaAjustes.parse(props.ajustes);
  const escenas = props.escenas as unknown as readonly EscenaLista<EscenaRelato>[];
  const marca = props.guion.marca;
  const colores = coloresDelNegocio(ajustes.negocio.color ?? marca.acento, ajustes.negocio.claro);
  const paleta: Paleta = { acento: colores.color, claro: colores.claro, nombre: ajustes.negocio.nombre, simbolo: ajustes.negocio.simbolo, letra: SERIFA };
  const lista = useMemo(() => bloques(escenas, fps), [escenas, fps]);

  if (!listas) return <AbsoluteFill style={{ backgroundColor: colores.claro }} />;

  const capas: ReactNode[] = [];
  lista.forEach((b, i) => {
    const desde = b.limites[0];
    const siguiente = lista[i + 1];
    const hasta = siguiente === undefined ? durationInFrames : siguiente.limites[0];
    if (f < desde || f >= hasta) return;
    const entra = i === 0 ? CAPA_QUIETA : entraRelato(b.paso, f, desde);
    const sale = siguiente === undefined ? CAPA_QUIETA : saleRelato(siguiente.paso, f, siguiente.limites[0]);
    const e = combina(entra, sale);
    if (!e.visible) return;
    capas.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: e.opacidad,
          filter: e.desenfoque > 0.05 ? `blur(${e.desenfoque.toFixed(2)}px)` : undefined,
          transform: `translate(${(e.dx * ANCHO).toFixed(1)}px, ${(e.dy * ALTO).toFixed(1)}px) scale(${e.escala.toFixed(4)})`,
        }}
      >
        <ContenidoBloque escenas={b.escenas.map((k) => escenas[k])} limites={b.limites} indice={i} f={f} fps={fps} ajustes={ajustes} colores={colores} paleta={paleta} marca={marca.nombre.trim()} />
      </div>,
    );
  });

  // Las flores aparecen después de la apertura y se van con el cierre.
  const iPrimera = escenas.findIndex((e) => e.datos.plano !== 'apertura');
  const iCierre = escenas.findIndex((e) => e.datos.plano === 'cierre');
  const desdeFlores = iPrimera >= 0 ? Math.round(escenas[iPrimera].inicio * fps) : durationInFrames;
  const hastaFlores = iCierre >= 0 ? Math.round(escenas[iCierre].inicio * fps) : durationInFrames + 30;
  const flores = ajustes.flores ? anima(f, [desdeFlores - 4, desdeFlores + 14], [0, 1], CURVAS.suave) * (1 - anima(f, [hastaFlores - 10, hastaFlores + 6], [0, 1], CURVAS.suave)) : 0;
  const s = f / fps;
  const enCierre = iCierre >= 0 && f >= hastaFlores;

  return (
    <AbsoluteFill style={{ backgroundColor: colores.claro, overflow: 'hidden' }}>
      <FondoTenido ancho={ANCHO} alto={ALTO} claro={colores.claro} />
      <GranoPapel ancho={ANCHO} alto={ALTO} fuerza={0.07} />
      {capas}
      <FlorDesenfocada cx={ANCHO * 0.97} cy={ALTO * 0.07} r={ANCHO * 0.2} giro={20 + 7 * s} opacidad={flores * 0.94} color="#1C1C1C" />
      <FlorDesenfocada cx={ANCHO * 0.02} cy={ALTO * 0.9} r={ANCHO * 0.17} giro={-10 - 6 * s} opacidad={flores * 0.94} color="#1C1C1C" />
      {!enCierre && ajustes.logo && marca.nombre.trim() !== '' ? (
        <div style={{ position: 'absolute', left: 64, top: 232, fontFamily: `"${LETRA_MARCA}"`, fontWeight: 700, fontSize: 34, letterSpacing: '-0.04em', color: colores.nero }}>{marca.nombre}</div>
      ) : null}
      {!enCierre && ajustes.negocio.inventado ? (
        <div style={{ position: 'absolute', left: 64, top: ajustes.logo && marca.nombre.trim() !== '' ? 280 : 236, fontFamily: `"${GROTESCA}"`, fontWeight: 300, fontSize: 28, color: colores.gris }}>Negocio inventado</div>
      ) : null}
    </AbsoluteFill>
  );
}
