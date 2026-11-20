// Los nombres y las medidas de los pasos entre escenas (sin Remotion ni JSX: los usan también las reglas desde Node).
// Las animaciones de cada paso están en transiciones.ts.

export const PASOS_SURREAL = ['desenfoque', 'detalle', 'remolino', 'destello', 'caida', 'corte'] as const;
export type PasoSurreal = (typeof PASOS_SURREAL)[number];

/** Fotogramas de cada paso: antes del límite (en la escena que sale) y después (en la que entra). */
export const TIEMPOS_SURREAL = {
  desenfoque: { sale: 5, entra: 7 },
  detalle: { sale: 0, entra: 3, foco: 15 },
  remolino: { sale: 14, vuela: 8, entra: 7 },
  destello: { crece: 9, blanco: 8, aflora: 9 },
  caida: { sale: 8, entra: 3 },
} as const;

/** Cuántos fotogramas después del límite de los datos se pone el límite visible, para que el paso quepa en la pausa. */
export function retrasoSurreal(p: PasoSurreal): number {
  switch (p) {
    case 'remolino':
      return 10;
    case 'destello':
      return 13;
    case 'caida':
    case 'detalle':
      return 3;
    default:
      return 0;
  }
}

export const PASOS_RELATO = ['corte', 'subir', 'desenfoque', 'acercar'] as const;
export type PasoRelato = (typeof PASOS_RELATO)[number];

export const TIEMPOS_RELATO: { readonly [p in PasoRelato]: { readonly sale: number; readonly entra: number } } = {
  subir: { sale: 15, entra: 19 },
  desenfoque: { sale: 9, entra: 12 },
  acercar: { sale: 4, entra: 10 },
  corte: { sale: 0, entra: 0 },
};
