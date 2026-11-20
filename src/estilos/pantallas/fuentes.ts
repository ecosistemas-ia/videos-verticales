// Las letras del estilo: Roboto (la del original, OFL-1.1, de @fontsource/roboto) en 400, 500, 600 y 700 y en cursiva
// 600, más Courier Prime para la terminal. Van con un nombre propio de familia para no mezclarse con otra Roboto.
// Cargador propio y no `cargarFuentes` (src/comun/fuentes.ts) porque hace falta la cursiva, y porque las líneas se
// miden con el canvas: hay que medir solo cuando las letras ya están cargadas (si no, la medida sale con la letra de
// reserva y queda guardada). Trampa conocida: document.fonts.check miente; se espera a cada FontFace.

import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import r400 from '@fontsource/roboto/files/roboto-latin-400-normal.woff2';
import r500 from '@fontsource/roboto/files/roboto-latin-500-normal.woff2';
import r600 from '@fontsource/roboto/files/roboto-latin-600-normal.woff2';
import r700 from '@fontsource/roboto/files/roboto-latin-700-normal.woff2';
import r600i from '@fontsource/roboto/files/roboto-latin-600-italic.woff2';
import c400 from '@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2';
import c700 from '@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2';
import p600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff2';

export const ROBOTO = "'Roboto Pantallas', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'Courier Prime Pantallas', 'Courier New', monospace";
/** La misma Poppins 600 de la firma común (src/comun/Video.tsx), solo para medir su ancho. */
export const POPPINS_FIRMA = "'Poppins Pantallas', sans-serif";

const CARAS: ReadonlyArray<{ familia: string; url: string; peso: number; cursiva: boolean }> = [
  { familia: 'Roboto Pantallas', url: r400, peso: 400, cursiva: false },
  { familia: 'Roboto Pantallas', url: r500, peso: 500, cursiva: false },
  { familia: 'Roboto Pantallas', url: r600, peso: 600, cursiva: false },
  { familia: 'Roboto Pantallas', url: r700, peso: 700, cursiva: false },
  { familia: 'Roboto Pantallas', url: r600i, peso: 600, cursiva: true },
  { familia: 'Courier Prime Pantallas', url: c400, peso: 400, cursiva: false },
  { familia: 'Courier Prime Pantallas', url: c700, peso: 700, cursiva: false },
  { familia: 'Poppins Pantallas', url: p600, peso: 600, cursiva: false },
];

let carga: Promise<void> | null = null;
let cargadas = false;

function cargar(): Promise<void> {
  if (carga === null) {
    carga = Promise.all(
      CARAS.map(async (c) => {
        const cara = new FontFace(c.familia, `url(${c.url}) format('woff2')`, {
          weight: String(c.peso),
          style: c.cursiva ? 'italic' : 'normal',
          display: 'block',
        });
        await cara.load();
        document.fonts.add(cara);
      }),
    ).then(() => {
      cargadas = true;
    });
  }
  return carga;
}

/** Detiene el render hasta que las letras están cargadas; devuelve verdadero cuando ya se puede medir. */
export function useLetras(): boolean {
  const [listas, setListas] = useState(() => cargadas);
  const [espera] = useState(() => (cargadas ? null : delayRender('Letras del estilo pantallas (Roboto, Courier Prime)')));
  useEffect(() => {
    if (espera === null) return;
    cargar()
      .then(() => {
        setListas(true);
        continueRender(espera);
      })
      .catch((error: unknown) => cancelRender(new Error(`No cargan las letras: ${String(error)}`)));
  }, [espera]);
  return listas;
}

let lienzo: CanvasRenderingContext2D | null = null;
const medidas = new Map<string, number>();

/** Ancho en px de un texto de una línea en Roboto, con la separación entre letras en em. */
export function anchoTexto(texto: string, cuerpo: number, peso: number, cursiva = false, espaciado = 0, familia = ROBOTO): number {
  const clave = `${familia}|${peso}|${cursiva ? 'i' : 'n'}|${texto}`;
  let w = medidas.get(clave);
  if (w === undefined) {
    if (!cargadas) throw new Error('Las letras aún no están cargadas: usa useLetras() antes de medir');
    if (lienzo === null) {
      lienzo = document.createElement('canvas').getContext('2d');
      if (lienzo === null) throw new Error('El canvas 2D no está disponible');
    }
    lienzo.font = `${cursiva ? 'italic ' : ''}${peso} 1000px ${familia}`;
    w = lienzo.measureText(texto).width / 1000;
    medidas.set(clave, w);
  }
  return w * cuerpo + espaciado * cuerpo * Math.max(0, [...texto].length - 1);
}

/** Corta un texto en renglones que caben en `ancho` (por palabras, como el navegador). */
export function envolver(texto: string, ancho: number, cuerpo: number, peso: number, familia = ROBOTO): string[] {
  const renglones: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual === '' ? palabra : `${actual} ${palabra}`;
    if (actual !== '' && anchoTexto(prueba, cuerpo, peso, false, 0, familia) > ancho) {
      renglones.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual !== '') renglones.push(actual);
  return renglones;
}
