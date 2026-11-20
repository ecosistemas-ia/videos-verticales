// Las tipografías del estilo y la medida de los textos (portado de MOTION: caratteri.ts y TestoAdattato.tsx).
//   - Anton 400: títulos y encabezados (estrechados con scaleX, como en el original);
//   - Allison 400: la cursiva a pincel («La diferencia entre», «nota…»);
//   - Montserrat 900: las líneas de la nota;
//   - Urbanist 400: títulos y etiquetas de las tarjetas.
// Todas OFL-1.1, desde los woff2 de @fontsource instalados (subconjunto latin: tildes, ñ, ¿ y ¡), nunca desde la red.
// Los títulos se ajustan al ancho midiendo con un canvas, así que hay que esperar a que cada cara cargue de verdad
// (document.fonts.check miente) antes de dibujar: useLetras detiene el render hasta entonces.

import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import allison400 from '@fontsource/allison/files/allison-latin-400-normal.woff2';
import anton400 from '@fontsource/anton/files/anton-latin-400-normal.woff2';
import montserrat900 from '@fontsource/montserrat/files/montserrat-latin-900-normal.woff2';
import urbanist400 from '@fontsource/urbanist/files/urbanist-latin-400-normal.woff2';

export const LETRAS = {
  titulo: "'Anton', 'Arial Narrow', sans-serif",
  cursiva: "'Allison', cursive",
  pesada: "'Montserrat', 'Arial Black', sans-serif",
  etiqueta: "'Urbanist', Helvetica, Arial, sans-serif",
} as const;

const CARAS = [
  { familia: 'Anton', peso: 400, url: anton400 },
  { familia: 'Allison', peso: 400, url: allison400 },
  { familia: 'Montserrat', peso: 900, url: montserrat900 },
  { familia: 'Urbanist', peso: 400, url: urbanist400 },
] as const;

let carga: Promise<void> | null = null;
let cargadas = false;

function cargar(): Promise<void> {
  if (carga === null) {
    carga = Promise.all(
      CARAS.map(async (c) => {
        const cara = new FontFace(c.familia, `url(${c.url}) format('woff2')`, { weight: String(c.peso), display: 'block' });
        await cara.load();
        document.fonts.add(cara);
      }),
    ).then(() => {
      cargadas = true;
    });
  }
  return carga;
}

/** Detiene el render hasta que las cuatro caras están cargadas; devuelve true cuando ya se puede medir y dibujar. */
export function useLetras(): boolean {
  const [listas, setListas] = useState(() => cargadas);
  const [espera] = useState(() => (cargadas ? null : delayRender('Tipografías del estilo iconos')));
  useEffect(() => {
    if (espera === null) return;
    cargar()
      .then(() => {
        setListas(true);
        continueRender(espera);
      })
      .catch((error: unknown) => cancelRender(new Error(`Una tipografía no carga: ${String(error)}`)));
  }, [espera]);
  return listas;
}

// ---------------------------------------------------------------------------------------------------------------------
// Medida con canvas.

export interface EstiloTexto {
  readonly familia: string;
  readonly peso: number;
  /** Espaciado entre letras en em. */
  readonly espaciado?: number;
  /** Estiramiento horizontal (1 = ninguno). */
  readonly escalaX?: number;
}

let lienzo: CanvasRenderingContext2D | null = null;

/** Ancho en px de una línea de texto a un tamaño dado, con espaciado y scaleX. */
export function anchoTexto(texto: string, tamano: number, estilo: EstiloTexto): number {
  if (lienzo === null) {
    lienzo = document.createElement('canvas').getContext('2d');
    if (lienzo === null) throw new Error('anchoTexto: no hay canvas 2D');
  }
  lienzo.font = `${estilo.peso} ${tamano}px ${estilo.familia}`;
  const base = lienzo.measureText(texto).width;
  const espacios = (estilo.espaciado ?? 0) * tamano * Math.max(0, [...texto].length - 1);
  return (base + espacios) * (estilo.escalaX ?? 1);
}

/** El tamaño con que un texto cabe en una línea del ancho dado: nunca mayor que `tamano`. */
export function tamanoEnUnaLinea(texto: string, estilo: EstiloTexto, tamano: number, ancho: number): number {
  const lleno = anchoTexto(texto, tamano, estilo);
  if (lleno <= ancho) return tamano;
  return Math.floor(tamano * (ancho / lleno) * 100) / 100;
}

/** Las líneas de un texto cortado entre palabras para caber en el ancho (como el navegador). */
function lineasSimples(palabras: readonly string[], tamano: number, estilo: EstiloTexto, ancho: number): number[][] {
  const lineas: number[][] = [];
  let actual: number[] = [];
  for (let i = 0; i < palabras.length; i++) {
    const prueba = [...actual, i].map((k) => palabras[k]).join(' ');
    if (actual.length > 0 && anchoTexto(prueba, tamano, estilo) > ancho) {
      lineas.push(actual);
      actual = [i];
    } else actual.push(i);
  }
  if (actual.length > 0) lineas.push(actual);
  return lineas;
}

/**
 * Líneas equilibradas: el mismo número de líneas que el corte simple, pero lo más parecidas posible (evita una palabra
 * sola al final, como hace el original en la nota).
 */
export function lineasEquilibradas(palabras: readonly string[], tamano: number, estilo: EstiloTexto, ancho: number): number[][] {
  const simples = lineasSimples(palabras, tamano, estilo, ancho);
  const n = simples.length;
  const m = palabras.length;
  if (n <= 1 || m <= n) return simples;
  const largo = (i: number, j: number): number => anchoTexto(palabras.slice(i, j).join(' '), tamano, estilo);
  const costo: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity));
  const eleccion: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(-1));
  costo[0][0] = 0;
  for (let k = 1; k <= n; k++)
    for (let j = k; j <= m; j++)
      for (let i = k - 1; i < j; i++) {
        if (!Number.isFinite(costo[k - 1][i])) continue;
        const w = largo(i, j);
        if (w > ancho && j - i > 1) continue;
        const c = costo[k - 1][i] + (ancho - w) * (ancho - w);
        if (c < costo[k][j]) {
          costo[k][j] = c;
          eleccion[k][j] = i;
        }
      }
  if (!Number.isFinite(costo[n][m])) return simples;
  const lineas: number[][] = [];
  let j = m;
  for (let k = n; k >= 1; k--) {
    const i = eleccion[k][j];
    lineas.unshift(Array.from({ length: j - i }, (_, t) => i + t));
    j = i;
  }
  return lineas;
}

/**
 * Cuánto bajar el centro de una línea (line-height 1) para que el centro de las MAYÚSCULAS caiga en y. Con
 * line-height 1, Chrome deja la línea base a (asc − (asc + desc − 1)/2) em desde arriba (métricas hhea de cada cara).
 */
export function correccionMayusculas(familia: string, tamano: number, altoMayusculas: number): number {
  const m = METRICAS.find((x) => familia.includes(x.nombre));
  if (m === undefined) return 0;
  const exceso = m.asc + m.desc - 1;
  const base = m.asc - exceso / 2;
  return (0.5 - (base - altoMayusculas / 2)) * tamano;
}

const METRICAS: readonly { readonly nombre: string; readonly asc: number; readonly desc: number }[] = [
  { nombre: 'Anton', asc: 2409 / 2048, desc: 674 / 2048 },
  { nombre: 'Montserrat', asc: 0.968, desc: 0.251 },
  { nombre: 'Urbanist', asc: 0.95, desc: 0.25 },
  { nombre: 'Allison', asc: 0.89, desc: 0.38 },
];
