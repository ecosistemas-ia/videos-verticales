// Fuentes de los estilos de papel y medida del texto. Las caras salen de los woff2 de @fontsource (OFL-1.1, en local,
// nunca de la red) con un nombre de familia propio, así que una cursiva se registra como cara normal de su familia.
// La maqueta mide el texto (para estrechar una línea que no cabe y apilar las líneas sobre la tinta), así que el
// estilo no dibuja nada hasta que las caras están cargadas de verdad: useFuentes devuelve falso mientras tanto y retiene
// el fotograma con delayRender. Después las medidas se guardan en caché.

import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';

export interface CaraPapel {
  readonly familia: string;
  readonly url: string;
  readonly peso: number;
}

const promesas = new Map<string, Promise<void>>();
const listas = new Set<string>();
const clave = (c: CaraPapel): string => `${c.familia}:${c.peso}`;

function cargar(c: CaraPapel): Promise<void> {
  const k = clave(c);
  let p = promesas.get(k);
  if (p === undefined) {
    const cara = new FontFace(c.familia, `url(${c.url}) format('woff2')`, { weight: String(c.peso), style: 'normal', display: 'block' });
    p = cara.load().then((cargada) => {
      document.fonts.add(cargada);
      listas.add(k);
    });
    promesas.set(k, p);
  }
  return p;
}

/** Retiene el render hasta que todas las caras estén cargadas; devuelve verdadero cuando lo están. */
export function useFuentes(caras: readonly CaraPapel[]): boolean {
  const [lista, setLista] = useState(() => caras.every((c) => listas.has(clave(c))));
  const [espera] = useState(() => (lista ? null : delayRender(`Fuentes: ${caras.map(clave).join(', ')}`)));
  useEffect(() => {
    if (espera === null) return;
    Promise.all(caras.map(cargar))
      .then(() => {
        setLista(true);
        continueRender(espera);
      })
      .catch((error: unknown) => cancelRender(new Error(`Una fuente no carga: ${String(error)}`)));
    // Las caras son constantes del estilo: basta con cargarlas una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espera]);
  return lista;
}

export interface Tipo {
  readonly familia: string;
  readonly peso: number;
  /** Espaciado entre letras, en em. */
  readonly espaciado: number;
}

let lienzo: CanvasRenderingContext2D | null = null;
function contexto(): CanvasRenderingContext2D {
  if (lienzo === null) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (ctx === null) throw new Error('No hay contexto 2D para medir el texto');
    lienzo = ctx;
  }
  return lienzo;
}

const anchos = new Map<string, number>();

/** Ancho en px de un texto en una línea, con su espaciado. */
export function anchoTexto(texto: string, cuerpo: number, t: Tipo): number {
  const k = `${t.familia}|${t.peso}|${t.espaciado}|${cuerpo}|${texto}`;
  const ya = anchos.get(k);
  if (ya !== undefined) return ya;
  const ctx = contexto();
  ctx.font = `${t.peso} ${cuerpo}px "${t.familia}"`;
  const w = ctx.measureText(texto).width + t.espaciado * cuerpo * Array.from(texto).length;
  anchos.set(k, w);
  return w;
}

export interface Metricas {
  /** En em: ascendente y descendente de la caja de la fuente, altura de las mayúsculas y de la x. */
  readonly ascendente: number;
  readonly descendente: number;
  readonly mayusculas: number;
  readonly x: number;
}

const metricasCache = new Map<string, Metricas>();

/** Las métricas de una cara, medidas en el navegador a 100 px. */
export function metricas(familia: string, peso: number): Metricas {
  const k = `${familia}|${peso}`;
  const ya = metricasCache.get(k);
  if (ya !== undefined) return ya;
  const ctx = contexto();
  ctx.font = `${peso} 100px "${familia}"`;
  const h = ctx.measureText('H');
  const x = ctx.measureText('x');
  const m: Metricas = {
    ascendente: h.fontBoundingBoxAscent / 100,
    descendente: h.fontBoundingBoxDescent / 100,
    mayusculas: h.actualBoundingBoxAscent / 100,
    x: x.actualBoundingBoxAscent / 100,
  };
  metricasCache.set(k, m);
  return m;
}

const ALTAS = /[\p{Lu}\p{N}bdfhklt'’"¿¡áéíóúÁÉÍÓÚñÑ]/u;
const BAJAS = /[gjpqyQ,;¿]/u;

/** Cuánto sube la tinta sobre la línea base y cuánto baja (px): mayúsculas o x, y descendentes si las hay. */
export function tinta(texto: string, cuerpo: number, t: Tipo): { readonly arriba: number; readonly abajo: number } {
  const m = metricas(t.familia, t.peso);
  return { arriba: (ALTAS.test(texto) ? m.mayusculas : m.x) * cuerpo, abajo: BAJAS.test(texto) ? 0.21 * cuerpo : 0 };
}

/** Dónde cae la línea base dentro de una caja de `line-height` igual al cuerpo (px desde arriba). */
export function baseEnCaja(t: Tipo, cuerpo: number): number {
  const m = metricas(t.familia, t.peso);
  return cuerpo / 2 + ((m.ascendente - m.descendente) * cuerpo) / 2;
}
