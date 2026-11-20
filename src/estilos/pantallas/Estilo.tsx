// «Noticia tech con pantallas»: la raíz del dibujo. Sobre la hoja blanca #FDFDFD se ve la escena actual, con la
// transición hacia la siguiente en su final y la de entrada en su principio, y un respiro lento de la cámara (se acerca
// un 1,5 % por segundo, como mucho un 4 %). Las palabras de cada escena entran sincronizadas con su voz
// (escena.voz.palabras + escena.voz.desfase) o, sin voz, a ritmo de lectura. Los subtítulos sobran: el texto es la voz.

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { EscenaLista, PropsVideo } from '../../comun/guion.ts';
import { useLetras } from './fuentes.ts';
import { ANTICIPO_S, leerMarcado, tiemposDePalabras } from './marcado.ts';
import { CURVAS, anima, escenaQueEntra, escenaQueSale } from './movimientos.ts';
import { Cierre, Frase, Lista, Marcas, Numero, Persona, Personaje, PlanoPantalla, type Contexto } from './planos.tsx';
import { transiciones, type AjustesPantallas, type EscenaPantallas } from './reglas.ts';

const FONDO = '#FDFDFD';
/** La cámara respira hacia este punto (abajo, donde estaba la marca de agua del original). */
const ORIGEN_RESPIRO = '50% 1500px';

/** Las imágenes opcionales del guion. */
function imagenesDe(escenas: readonly EscenaLista<EscenaPantallas>[]): string[] {
  const rutas = new Set<string>();
  for (const e of escenas) {
    const d = e.datos;
    if (d.plano === 'pantalla' && d.pantalla.tipo === 'captura') rutas.add(d.pantalla.imagen);
    if (d.plano === 'marcas') for (const m of d.marcas) if (m.imagen) rutas.add(m.imagen);
    if ((d.plano === 'persona' || d.plano === 'cierre') && d.imagen) rutas.add(d.imagen);
  }
  return [...rutas];
}

const tamanosGuardados = new Map<string, readonly [number, number]>();

/** Mide las imágenes del guion antes del primer fotograma (para maquetar las capturas). Detiene el render si falta una. */
function useTamanos(rutas: readonly string[]): ReadonlyMap<string, readonly [number, number]> | null {
  const faltan = rutas.filter((r) => !tamanosGuardados.has(r));
  const [listo, setListo] = useState(faltan.length === 0);
  const [espera] = useState(() => (faltan.length === 0 ? null : delayRender(`Imágenes del guion: ${faltan.join(', ')}`)));
  useEffect(() => {
    if (espera === null) return;
    Promise.all(
      faltan.map(
        (ruta) =>
          new Promise<void>((bien, mal) => {
            const img = new Image();
            img.onload = () => {
              tamanosGuardados.set(ruta, [img.naturalWidth || 1600, img.naturalHeight || 1000]);
              bien();
            };
            img.onerror = () => mal(new Error(`No encuentro ${ruta}: tiene que estar en la carpeta del video, dentro de imagenes/.`));
            img.src = staticFile(ruta);
          }),
      ),
    )
      .then(() => {
        setListo(true);
        continueRender(espera);
      })
      .catch((error: unknown) => cancelRender(error));
    // Solo una vez: las rutas no cambian durante el render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espera]);
  return listo ? tamanosGuardados : null;
}

export function Estilo(props: PropsVideo): ReactNode {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const escenas = props.escenas as readonly EscenaLista<EscenaPantallas>[];
  const ajustes = props.ajustes as AjustesPantallas;
  const letras = useLetras();
  const rutas = useMemo(() => imagenesDe(escenas), [escenas]);
  const tamanos = useTamanos(rutas);

  // La línea de tiempo en fotogramas: inicio, fin, transiciones y el momento de entrada de cada palabra.
  const linea = useMemo(() => {
    const pasos = transiciones(escenas.map((e) => e.datos));
    return escenas.map((e, i) => {
      const inicio = Math.round(e.inicio * fps);
      const fin = i + 1 < escenas.length ? Math.round(escenas[i + 1].inicio * fps) : durationInFrames;
      const palabras = leerMarcado(e.datos.texto).palabras;
      const tiempos = tiemposDePalabras(palabras, e.voz);
      const entradas = tiempos.map((t) => Math.max(inicio, Math.round((e.inicio + t - ANTICIPO_S) * fps)));
      return { e, inicio, fin, palabras, entradas, transicion: pasos[i], siguiente: i + 1 < escenas.length ? pasos[i + 1] : null };
    });
  }, [escenas, fps, durationInFrames]);

  if (!letras || tamanos === null || linea.length === 0) return <AbsoluteFill style={{ backgroundColor: FONDO }} />;

  let i = 0;
  while (i + 1 < linea.length && linea[i + 1].inicio <= f) i++;
  const s = linea[i];
  const despues = linea[i + 1];

  const contexto: Contexto = {
    f,
    fps,
    escena: s.e,
    inicio: s.inicio,
    fin: s.fin,
    transicion: s.transicion,
    siguiente: s.siguiente,
    palabras: s.palabras,
    entra: (k) => s.entradas[Math.max(0, Math.min(s.entradas.length - 1, k))] ?? s.inicio,
    acento: props.guion.marca.acento,
    ajustes,
    tamanos,
  };

  // La transición hacia la escena siguiente (al final de esta) y la de entrada (al principio).
  const sale = despues ? escenaQueSale(despues.transicion, f, despues.inicio) : null;
  const entra = escenaQueEntra(s.transicion, f, s.inicio);
  const opacidad = (sale?.opacidad ?? 1) * entra.opacidad;
  const desenfoque = (sale?.desenfoque ?? 0) + entra.desenfoque;
  const dx = ((sale?.dx ?? 0) + entra.dx) * 1080;
  const escala = (sale?.escala ?? 1) * entra.escala;
  // El respiro: las escenas que no tienen su propia cámara se acercan despacio.
  const conCamara = s.e.datos.plano === 'persona' || s.e.datos.plano === 'cierre';
  const amplitud = Math.min(0.04, (0.015 * (s.fin - s.inicio)) / fps);
  const respiro = conCamara ? 1 : 1 + amplitud * anima(f, [s.inicio, Math.max(s.inicio + 1, s.fin)], [0, 1], CURVAS.respiro);

  return (
    <AbsoluteFill style={{ backgroundColor: FONDO, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `translateX(${dx.toFixed(2)}px) scale(${escala.toFixed(4)})`,
          opacity: opacidad,
          filter: desenfoque > 0.05 ? `blur(${desenfoque.toFixed(2)}px)` : undefined,
        }}
      >
        <AbsoluteFill style={{ transform: respiro === 1 ? undefined : `scale(${respiro.toFixed(5)})`, transformOrigin: ORIGEN_RESPIRO }}>
          <Plano c={contexto} nombreMarca={props.guion.marca.nombre} />
        </AbsoluteFill>
      </AbsoluteFill>
      {entra.blanco > 0.001 ? <AbsoluteFill style={{ backgroundColor: FONDO, opacity: entra.blanco }} /> : null}
    </AbsoluteFill>
  );
}

function Plano({ c, nombreMarca }: { readonly c: Contexto; readonly nombreMarca: string }): ReactNode {
  switch (c.escena.datos.plano) {
    case 'frase':
      return <Frase c={c} />;
    case 'pantalla':
      return <PlanoPantalla c={c} />;
    case 'marcas':
      return <Marcas c={c} />;
    case 'persona':
      return <Persona c={c} />;
    case 'personaje':
      return <Personaje c={c} />;
    case 'numero':
      return <Numero c={c} />;
    case 'lista':
      return <Lista c={c} />;
    case 'cierre':
      return <Cierre c={c} nombreMarca={nombreMarca} />;
  }
}
