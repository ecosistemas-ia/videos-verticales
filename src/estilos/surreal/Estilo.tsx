// Surreal en blanco y negro: la línea de tiempo de las escenas con sus pasos (desenfoque, detalle, remolino, destello,
// caída), y lo que queda fijo encima: las formas cromadas que giran en las esquinas, el nombre de la marca arriba, la
// chincheta en el color de la marca, la viñeta ovalada y el cierre oscuro (luz cálida, remolino, la marca en tiras).

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import montserrat400 from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff2';
import montserrat500 from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2';
import montserrat600 from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2';
import montserrat700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import type { EscenaLista, PropsVideo } from '../../comun/guion.ts';
import { CURVAS, anima } from '../_papel/curvas.ts';
import { OBJETOS_DIBUJADOS, PALETA_NEUTRA, PintaDibujo, encajar } from '../_papel/dibujos.tsx';
import { GranoPapel, VinetaOval } from '../_papel/fondo.tsx';
import { useFuentes } from '../_papel/fuentes.ts';
import type { CaraPapel } from '../_papel/fuentes.ts';
import { CAPA_QUIETA, destello, entraSurreal, finVisibleSurreal, luzCalida, retrasoSurreal, saleSurreal } from '../_papel/transiciones.ts';
import type { EstadoCapa, PasoSurreal } from '../_papel/transiciones.ts';
import { BloqueSurreal, ContenidoEscena, FAMILIA, PAPEL, entradas } from './planos.tsx';
import type { Contexto } from './planos.tsx';
import { FormaCromata, MarcaEnTiras, Remolino, angulosForma } from './piezas.tsx';
import { esquemaAjustes } from './reglas.ts';
import type { EscenaSurreal } from './reglas.ts';

const CARAS: readonly CaraPapel[] = [
  { familia: FAMILIA, url: montserrat400, peso: 400 },
  { familia: FAMILIA, url: montserrat500, peso: 500 },
  { familia: FAMILIA, url: montserrat600, peso: 600 },
  { familia: FAMILIA, url: montserrat700, peso: 700 },
];

interface Tramo {
  readonly paso: PasoSurreal;
  /** El primer fotograma en que se ve la escena y el primero en que ya no. */
  readonly limite: number;
  readonly fin: number;
}

/** Cuándo se ve cada escena, con el paso de entrada y el de salida. El cierre no tiene paso: lo cubre la luz cálida. */
function tramos(escenas: readonly EscenaLista<EscenaSurreal>[], fps: number, total: number): Tramo[] {
  const limites = escenas.map((e, i) => {
    const paso: PasoSurreal = i === 0 || e.datos.plano === 'cierre' ? 'corte' : (e.datos.paso ?? 'desenfoque');
    return { paso, limite: i === 0 ? 0 : Math.round(e.inicio * fps) + (e.datos.plano === 'cierre' ? 0 : retrasoSurreal(paso)) };
  });
  return limites.map((l, i) => {
    const siguiente = limites[i + 1];
    const fin = siguiente === undefined ? total : escenas[i + 1].datos.plano === 'cierre' ? siguiente.limite + 1 : finVisibleSurreal(siguiente.paso, siguiente.limite);
    return { ...l, fin };
  });
}

function combina(a: EstadoCapa, b: EstadoCapa): EstadoCapa {
  return { visible: a.visible && b.visible, opacidad: a.opacidad * b.opacidad, desenfoque: a.desenfoque + b.desenfoque, escala: a.escala * b.escala, giro: a.giro + b.giro, dx: a.dx + b.dx, dy: a.dy + b.dy, estela: a.estela || b.estela };
}

function Capa({ estado, children }: { readonly estado: EstadoCapa; readonly children: ReactNode }): ReactNode {
  const copia = (giro: number, opacidad: number, k: number): ReactNode => (
    <div
      key={k}
      style={{
        position: 'absolute',
        inset: 0,
        opacity: opacidad,
        filter: estado.desenfoque > 0.05 ? `blur(${estado.desenfoque.toFixed(2)}px)` : undefined,
        transform: `translate(${(estado.dx * ANCHO).toFixed(1)}px, ${(estado.dy * ALTO).toFixed(1)}px) rotate(${giro.toFixed(2)}deg) scale(${estado.escala.toFixed(4)})`,
        transformOrigin: '50% 48%',
      }}
    >
      {children}
    </div>
  );
  if (!estado.estela) return copia(estado.giro, estado.opacidad, 0);
  // El remolino deja una estela: dos copias giradas detrás, más tenues.
  return (
    <>
      {copia(estado.giro + 9, estado.opacidad * 0.28, 1)}
      {copia(estado.giro - 9, estado.opacidad * 0.28, 2)}
      {copia(estado.giro, estado.opacidad, 0)}
    </>
  );
}

export function Estilo(props: PropsVideo): ReactNode {
  const listas = useFuentes(CARAS);
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ajustes = esquemaAjustes.parse(props.ajustes);
  const escenas = props.escenas as unknown as readonly EscenaLista<EscenaSurreal>[];
  const marca = props.guion.marca;
  const paleta = { ...PALETA_NEUTRA, acento: marca.acento };
  const lineaTiempo = useMemo(() => tramos(escenas, fps, durationInFrames), [escenas, fps, durationInFrames]);

  // Las formas cromadas se paran en la última racha de frases antes del cierre (y en el cierre).
  const angulos = useMemo(() => {
    let desde = durationInFrames + 1;
    for (let i = escenas.length - 1; i >= 0; i--) {
      const p = escenas[i].datos.plano;
      if (p === 'cierre' || p === 'frase') desde = lineaTiempo[i].limite;
      else break;
    }
    return angulosForma(durationInFrames, fps, (k) => k >= desde + Math.round(fps * 0.4));
  }, [escenas, lineaTiempo, durationInFrames, fps]);

  if (!listas) return <AbsoluteFill style={{ backgroundColor: PAPEL }} />;

  const iCierre = escenas.findIndex((e) => e.datos.plano === 'cierre');
  const limiteCierre = iCierre >= 0 ? lineaTiempo[iCierre].limite : Number.POSITIVE_INFINITY;

  // Las capas de las escenas visibles en este fotograma.
  const capas: ReactNode[] = [];
  escenas.forEach((e, i) => {
    const tr = lineaTiempo[i];
    if (e.datos.plano === 'cierre' || f < tr.limite - 1 || f >= tr.fin) return;
    const entra = i === 0 ? CAPA_QUIETA : entraSurreal(tr.paso, f, tr.limite);
    const siguiente = lineaTiempo[i + 1];
    const sale = siguiente === undefined || i + 1 === iCierre ? CAPA_QUIETA : saleSurreal(siguiente.paso, f, siguiente.limite);
    const estado = combina(entra, sale);
    if (!estado.visible || estado.opacidad <= 0.001) return;
    const c: Contexto = { escena: e, indice: i, f, fps, limite: tr.limite, ajustes, paleta, paso: tr.paso };
    capas.push(
      <Capa key={i} estado={estado}>
        <ContenidoEscena {...c} />
      </Capa>,
    );
  });

  // La chincheta: aparece con la primera escena de una racha de chinchetas y se queda hasta la última.
  let chincheta: ReactNode = null;
  for (let i = 0; i < escenas.length; i++) {
    if (escenas[i].datos.plano !== 'chincheta' || (i > 0 && escenas[i - 1].datos.plano === 'chincheta')) continue;
    let j = i;
    while (j + 1 < escenas.length && escenas[j + 1].datos.plano === 'chincheta') j++;
    const desde = lineaTiempo[i].limite;
    const hasta = lineaTiempo[j].fin;
    if (f >= desde && f < hasta) {
      const q = anima(f, [desde + 2, desde + 10], [0, 1], CURVAS.frena);
      const siguiente = lineaTiempo[j + 1];
      const sale = siguiente === undefined || j + 1 === iCierre ? CAPA_QUIETA : saleSurreal(siguiente.paso, f, siguiente.limite);
      let golpe = 0;
      for (let k = i + 1; k <= j; k++) golpe = Math.max(golpe, 1 - Math.abs(f - lineaTiempo[k].limite) / 5);
      const caja = encajar(OBJETOS_DIBUJADOS.chincheta.w, OBJETOS_DIBUJADOS.chincheta.h, { x: ANCHO * 0.488, y: ALTO * 0.336, w: ANCHO * 0.11, h: ALTO * 0.078 });
      const desenfoque = sale.desenfoque + 3 * Math.max(0, golpe) + 6 * (1 - q);
      chincheta = (
        <div style={{ position: 'absolute', inset: 0, opacity: q * sale.opacidad, filter: desenfoque > 0.05 ? `blur(${desenfoque.toFixed(2)}px)` : undefined, transformOrigin: '50% 48%', transform: `translate(${(sale.dx * ANCHO).toFixed(1)}px, ${(sale.dy * ALTO - 60 * (1 - q)).toFixed(1)}px) rotate(${sale.giro.toFixed(2)}deg) scale(${sale.escala.toFixed(4)})` }}>
          <PintaDibujo dibujo={OBJETOS_DIBUJADOS.chincheta} {...caja} id="chincheta" paleta={paleta} filtro="drop-shadow(0 12px 9px rgba(0,0,0,0.28))" estilo={{ transform: `rotate(-16deg) scale(${(1.25 - 0.25 * q).toFixed(3)})`, transformOrigin: '50% 90%' }} />
        </div>
      );
    }
  }

  // Los destellos de las escenas que entran con destello.
  const destellos: ReactNode[] = [];
  lineaTiempo.forEach((tr, i) => {
    if (i === 0 || tr.paso !== 'destello') return;
    const d = destello(f, tr.limite);
    if (d.radio <= 0 && d.velo <= 0) return;
    const r = d.radio * Math.hypot(ANCHO, ALTO);
    destellos.push(
      <div key={i} style={{ position: 'absolute', inset: 0 }}>
        {d.radio > 0 && f < lineaTiempo[i].limite + 2 ? <div style={{ position: 'absolute', left: ANCHO * 0.5 - r, top: ALTO * 0.45 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: 'radial-gradient(circle, #FFFFFF 0%, #FFFFFF 62%, rgba(255,255,255,0) 100%)' }} /> : null}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF', opacity: d.velo }} />
      </div>,
    );
  });

  // El cierre: luz cálida, el fondo oscuro con su remolino, la marca en tiras, sus líneas y la web.
  let cierre: ReactNode = null;
  if (iCierre >= 0 && f >= limiteCierre - 10) {
    const luz = luzCalida(f, limiteCierre - 10);
    const e = escenas[iCierre];
    const datos = e.datos.plano === 'cierre' ? e.datos : null;
    const c: Contexto = { escena: e, indice: iCierre, f, fps, limite: limiteCierre, ajustes, paleta, paso: 'corte' };
    cierre = (
      <>
        {luz.rosa > 0 ? <div style={{ position: 'absolute', inset: 0, opacity: luz.rosa, background: 'radial-gradient(ellipse at 0% 100%, rgba(232,150,120,0.85) 0%, rgba(236,170,130,0.45) 45%, rgba(255,220,190,0.12) 80%)' }} /> : null}
        {luz.pleno !== null ? <div style={{ position: 'absolute', inset: 0, backgroundColor: luz.pleno, opacity: luz.opacidadPleno }} /> : null}
        {luz.oscuro > 0 ? (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#553926' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: luz.oscuro }}>
              <Remolino ancho={ANCHO} alto={ALTO} t={(f - limiteCierre) / fps} />
              <MarcaEnTiras texto={marca.nombre} cx={ANCHO * 0.5} cy={ALTO * 0.485} anchoMax={ANCHO * 0.59} tipo={{ familia: FAMILIA, peso: 700, espaciado: -0.04 }} acento={marca.acento} f={f} desde={limiteCierre + 3} />
              {datos !== null ? (
                <>
                  <BloqueSurreal lineas={datos.lineas} inicios={entradas(c, datos.lineas.map((l) => l.texto))} x={ANCHO * 0.5} ancla={marca.nombre.trim() === '' ? { centro: ALTO * 0.48 } : { arriba: ALTO * 0.556 }} escala={marca.nombre.trim() === '' ? 1 : 0.8} f={f} mayusculas={ajustes.mayusculas} blanco />
                  {datos.web !== undefined ? (
                    <div style={{ position: 'absolute', left: 0, width: ANCHO, top: ALTO * 0.68, textAlign: 'center', fontFamily: `"${FAMILIA}"`, fontWeight: 500, fontSize: 34, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.6)', opacity: anima(f, [limiteCierre + 24, limiteCierre + 36], [0, 1], CURVAS.suave) }}>
                      {datos.web}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </>
    );
  }

  const fundido = anima(f, [durationInFrames - 27, durationInFrames - 1], [0, 1], CURVAS.suave);
  const a = angulos[Math.min(angulos.length - 1, f)];

  return (
    <AbsoluteFill style={{ backgroundColor: PAPEL, overflow: 'hidden' }}>
      <GranoPapel ancho={ANCHO} alto={ALTO} fuerza={0.06} />
      {capas}
      {ajustes.cromados ? (
        <>
          <FormaCromata x={-12} y={46} largo={360} angulo={a} id="cromo-a" filtro="drop-shadow(0 6px 8px rgba(0,0,0,0.25))" />
          <FormaCromata x={1094} y={1840} largo={460} angulo={a * 0.7 + 40} id="cromo-b" filtro="blur(10px) brightness(1.15) contrast(0.75)" opacidad={0.62} />
        </>
      ) : null}
      {ajustes.logo && marca.nombre.trim() !== '' ? (
        <div style={{ position: 'absolute', left: 0, width: ANCHO, top: 236, textAlign: 'center', fontFamily: `"${FAMILIA}"`, fontWeight: 700, fontSize: 44, letterSpacing: '-0.04em', color: '#141414' }}>{marca.nombre}</div>
      ) : null}
      {chincheta}
      <VinetaOval ancho={ANCHO} alto={ALTO} />
      {destellos}
      {cierre}
      {fundido > 0 ? <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000000', opacity: fundido }} /> : null}
    </AbsoluteFill>
  );
}
