// Lo que recibe cada plano y dos ayudas: el estado de salida de la escena y el tamaño de un papel de texto que cabe
// en una línea.

import { ALTO } from '../../../comun/guion.ts';
import { CURVAS, animar } from '../curvas.ts';
import type { Colores, Papel } from '../diseno.ts';
import type { Iconos } from '../Icono.tsx';
import { LETRAS, tamanoEnUnaLinea, type EstiloTexto } from '../letras.ts';
import { QUIETA, salidaHaciaAbajo, type EstadoSalida } from '../movimientos.tsx';
import type { EscenaPlan, Plan } from '../plan.ts';

export interface PropsEscena {
  readonly s: EscenaPlan;
  readonly f: number;
  readonly fps: number;
  readonly colores: Colores;
  readonly iconos: Iconos;
  readonly plan: Plan;
}

/** Cuánto baja el contenido de una escena que sale hacia abajo (el original: las tarjetas salen por abajo). */
export const BAJADA_CONTENIDO = 0.6;
/** Cuánto baja el encabezado, que sigue más despacio. */
export const BAJADA_ENCABEZADO = 0.3;

/** El estado de salida de la escena en el fotograma f. */
export function estadoSalida(s: EscenaPlan, f: number, cuota = BAJADA_CONTENIDO): EstadoSalida {
  if (s.salida === 'abajo') return salidaHaciaAbajo(f, s.fin, { duracion: s.duracionSalida, distancia: ALTO * cuota });
  if (s.salida === 'desvanece') return { ...QUIETA, opacidad: 1 - animar(f, [s.fin - s.duracionSalida, s.fin], [0, 1], CURVAS.salida) };
  if (s.salida === 'crece')
    return {
      ...QUIETA,
      escala: 1 + 0.12 * animar(f, [s.fin - s.duracionSalida, s.fin], [0, 1], CURVAS.acelera),
      opacidad: 1 - animar(f, [s.fin - 2, s.fin], [0, 1], CURVAS.salida),
    };
  return QUIETA;
}

/** El estilo de medida de un papel. */
export function estiloDe(p: Papel): EstiloTexto {
  return { familia: LETRAS[p.familia], peso: p.peso, espaciado: p.espaciado, escalaX: p.escalaX };
}

/** El tamaño de un texto de un papel que cabe en una línea del ancho dado (escala u). */
export function tamanoPapel(texto: string, p: Papel, u: number, ancho: number): number {
  return tamanoEnUnaLinea(texto, estiloDe(p), p.tamano * u, ancho);
}

/** Segundos de la escena → fotograma absoluto. */
export function fotogramaDe(s: EscenaPlan, segundos: number, fps: number): number {
  return s.inicio + Math.round(segundos * fps);
}
