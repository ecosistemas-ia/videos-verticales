// Lo común al guion de los dos estilos de mundo (ciudad e isometrico): los rótulos, la luz, el clima, la construcción
// de la ciudad y el estado del mundo en cada segundo, que sale solo de la lista de escenas (función pura del tiempo).
// Sin JSX: lo cargan las reglas en Node.

import { z } from 'zod';
import { segundosDeLectura, type EscenaLista, type Golpe, type VozEscena } from '../../comun/guion.ts';
import { clamp01, liso } from './azar.ts';
import { LUGARES } from './tipos.ts';

export const LUCES = ['manana', 'mediodia', 'tarde', 'atardecer', 'noche'] as const;
export type Luz = (typeof LUCES)[number];
export const CLIMAS = ['despejado', 'lluvia', 'niebla'] as const;
export type Clima = (typeof CLIMAS)[number];

/**
 * Un rótulo por escena, como mucho. Textos cortos: se leen en un segundo.
 * - dato: una cifra grande con su explicación («10» · «toneladas pesa la puerta»);
 * - anio: un contador de año que corre de «desde» a «hasta» durante la escena («900» con sufijo «d. C.»);
 * - lugar: el nombre del lugar, clavado sobre él con una chincheta;
 * - medida: una barra vertical junto al lugar, con su altura;
 * - titulo: el título grande del video, para la primera escena.
 */
export const esquemaRotulo = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('dato'), valor: z.string().min(1).max(12), texto: z.string().max(42).default('') }),
  z.object({ tipo: z.literal('anio'), desde: z.number().int().optional(), hasta: z.number().int(), sufijo: z.string().max(10).default('') }),
  z.object({ tipo: z.literal('lugar'), texto: z.string().min(1).max(26) }),
  z.object({ tipo: z.literal('medida'), valor: z.string().min(1).max(8), unidad: z.string().max(6).default('m') }),
  z.object({ tipo: z.literal('titulo'), texto: z.string().min(1).max(44), antetitulo: z.string().max(30).default('') }),
]);
export type Rotulo = z.infer<typeof esquemaRotulo>;

/** Cuánto de la ciudad está construido: un número (al final de la escena) o [desde, hasta] (crece durante la escena). */
export const esquemaCiudad = z.union([z.number().min(0).max(1), z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])]);

export const esquemaLugar = z.enum(LUGARES);

/** Los campos de una escena que comparten los dos estilos. Cada estilo añade su `plano`. */
export const camposEscena = {
  /** Lo que dice la voz en esta escena: una o dos frases. No sale en pantalla (van los subtítulos). */
  texto: z.string().min(1),
  /** Adónde mira la cámara. */
  lugar: esquemaLugar.default('centro'),
  /** Luz al final de la escena; si cambia, la escena hace el paso (un atardecer que cae). Sin luz: la de antes. */
  luz: z.enum(LUCES).optional(),
  /** Clima al final de la escena. Sin clima: el de antes. */
  clima: z.enum(CLIMAS).optional(),
  /** Cuánto de la ciudad está construido (0 a 1). [0.1, 0.8] = la ciudad crece durante la escena. Sin dato: lo de antes. */
  ciudad: esquemaCiudad.optional(),
  rotulo: esquemaRotulo.optional(),
};

export interface EscenaMundo {
  texto: string;
  lugar: (typeof LUGARES)[number];
  luz?: Luz;
  clima?: Clima;
  ciudad?: number | [number, number];
  rotulo?: Rotulo;
}

export function duracionEscena(e: { texto: string }, voz: VozEscena | null): number {
  return voz === null ? Math.max(2.6, segundosDeLectura(e.texto, 2.6) + 0.3) : Math.max(2.6, voz.duracion + 0.5);
}

/** El estado del mundo en el segundo t: escena en curso, luz, clima, construcción y año. */
export interface EstadoMundo {
  readonly i: number;
  /** Avance dentro de la escena (0 a 1) y segundos desde su inicio. */
  readonly u: number;
  readonly tl: number;
  readonly duracion: number;
  readonly luz: { readonly de: Luz; readonly a: Luz; readonly k: number };
  readonly clima: { readonly de: Clima; readonly a: Clima; readonly k: number };
  readonly ciudad: number;
  /** El año del contador, si la escena lleva un rótulo de año. */
  readonly anio: number | null;
}

/** Fracción de la escena que tarda un cambio de luz, de clima o de construcción. */
const PASO = 0.75;

export function estadoEn(escenas: readonly EscenaLista<EscenaMundo>[], t: number, luzInicial: Luz): EstadoMundo {
  let luz: Luz = luzInicial;
  let clima: Clima = 'despejado';
  let ciudad = 1;
  let anio: number | null = null;
  const ultima = escenas.length - 1;
  for (let i = 0; i <= ultima; i++) {
    const e = escenas[i];
    const d = e.datos;
    const luzFin: Luz = d.luz ?? luz;
    const climaFin: Clima = d.clima ?? clima;
    const [c0, c1] = d.ciudad === undefined ? [ciudad, ciudad] : Array.isArray(d.ciudad) ? d.ciudad : [ciudad, d.ciudad];
    const anio1: number | null = d.rotulo?.tipo === 'anio' ? d.rotulo.hasta : anio;
    const anio0 = d.rotulo?.tipo === 'anio' ? (d.rotulo.desde ?? anio ?? d.rotulo.hasta) : anio;
    if (t < e.inicio + e.duracion || i === ultima) {
      const tl = Math.max(0, t - e.inicio);
      const u = clamp01(tl / e.duracion);
      const k = liso(tl / (e.duracion * PASO));
      return {
        i,
        u,
        tl,
        duracion: e.duracion,
        luz: { de: luz, a: luzFin, k: luz === luzFin ? 1 : k },
        clima: { de: clima, a: climaFin, k: clima === climaFin ? 1 : k },
        ciudad: c0 + (c1 - c0) * liso(tl / (e.duracion * 0.85)),
        anio: d.rotulo?.tipo === 'anio' && anio0 !== null && anio1 !== null ? Math.round(anio0 + (anio1 - anio0) * liso((tl - 0.3) / (e.duracion * 0.7))) : null,
      };
    }
    luz = luzFin;
    clima = climaFin;
    ciudad = c1;
    anio = anio1;
  }
  return { i: 0, u: 0, tl: 0, duracion: 1, luz: { de: luz, a: luz, k: 1 }, clima: { de: clima, a: clima, k: 1 }, ciudad, anio };
}

/** Cuánto se ve el rótulo de una escena (0 a 1): entra a los 0,35 s y sale 0,3 s antes del corte. */
export function presenciaRotulo(tl: number, duracion: number): number {
  return Math.min(liso((tl - 0.3) / 0.35), liso((duracion - 0.25 - tl) / 0.3));
}

/** Los efectos comunes: un paso suave en cada corte, un pop con cada rótulo y una subida cuando la ciudad crece. */
export function golpesMundo(escenas: readonly EscenaLista<EscenaMundo>[]): Golpe[] {
  const golpes: Golpe[] = [];
  let ciudad = 1;
  escenas.forEach((e, i) => {
    if (i > 0) golpes.push({ efecto: 'whoosh', segundo: Math.max(0, e.inicio - 0.15), volumen: 0.16 });
    const r = e.datos.rotulo;
    if (r !== undefined) golpes.push({ efecto: r.tipo === 'dato' || r.tipo === 'titulo' ? 'impacto' : 'pop', segundo: e.inicio + 0.35, volumen: r.tipo === 'dato' ? 0.35 : 0.28 });
    const c = e.datos.ciudad;
    const [c0, c1] = c === undefined ? [ciudad, ciudad] : Array.isArray(c) ? c : [ciudad, c];
    if (c1 - c0 > 0.25) golpes.push({ efecto: 'subida', segundo: e.inicio + 0.1, volumen: 0.22 });
    ciudad = c1;
  });
  return golpes;
}
