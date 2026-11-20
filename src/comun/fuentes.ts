// Fuentes desde archivos locales (los woff2 de @fontsource, licencia OFL-1.1, instalados con npm en versión exacta),
// nunca desde un servicio en red. El subconjunto «latin» ya trae las tildes, la ñ, ¿ y ¡.
// Trampa conocida: document.fonts.check miente, así que se espera a que cada FontFace cargue de verdad antes del primer
// fotograma; si una fuente no llega, el render se detiene con el error.

import { cancelRender, continueRender, delayRender } from 'remotion';

export interface Cara {
  readonly familia: string;
  readonly url: string;
  readonly peso: number;
}

const pedidas = new Set<string>();

/** Carga las caras una sola vez por familia y peso. Llamarla al importar el componente del estilo. */
export function cargarFuentes(caras: readonly Cara[]): void {
  const nuevas = caras.filter((c) => !pedidas.has(`${c.familia}:${c.peso}`));
  if (nuevas.length === 0 || typeof document === 'undefined') return;
  for (const c of nuevas) pedidas.add(`${c.familia}:${c.peso}`);
  const espera = delayRender(`Fuentes: ${nuevas.map((c) => `${c.familia} ${c.peso}`).join(', ')}`);
  Promise.all(
    nuevas.map(async (c) => {
      const cara = new FontFace(c.familia, `url(${c.url}) format('woff2')`, { weight: String(c.peso) });
      await cara.load();
      document.fonts.add(cara);
    }),
  )
    .then(() => continueRender(espera))
    .catch((error: unknown) => cancelRender(error));
}
