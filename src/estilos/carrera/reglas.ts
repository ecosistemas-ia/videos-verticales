// Estilo «Carrera de datos»: barras horizontales que crecen y se adelantan unas a otras a lo largo del tiempo, con el
// año en grande y la fuente siempre a la vista. La narración va por tramos: cada escena lleva la carrera hasta un
// periodo («hasta») mientras la voz cuenta lo que pasa.

import { z } from 'zod';
import { segundosDeLectura, type EscenaLista } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';

export const escenaCarrera = z.object({
  /** Lo que cuenta la voz en este tramo. */
  texto: z.string().min(1),
  /** El periodo al que llega la carrera al final de la escena (una clave de los valores, como «1992»). */
  hasta: z.string().min(1),
});
export type EscenaCarrera = z.infer<typeof escenaCarrera>;

export const ajustesCarrera = z.object({
  titulo: z.string().default(''),
  /** La unidad de los valores, debajo del título («millones de habitantes»). */
  unidad: z.string().default(''),
  /** La fuente de los datos, siempre en pantalla. Obligatoria: sin fuente no hay video. */
  fuente: z.string().min(3),
  /** Cuántas barras se ven a la vez. */
  visibles: z.number().int().min(3).max(12).default(8),
  /** Decimales de los valores. */
  decimales: z.number().int().min(0).max(3).default(1),
  series: z
    .array(
      z.object({
        nombre: z.string().min(1),
        /** #RRGGBB; si falta, se elige de la paleta. */
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        /** periodo → valor. Todos los periodos con el mismo formato y ordenables como texto o como número. */
        valores: z.record(z.string(), z.number()),
      }),
    )
    .min(2),
});
export type AjustesCarrera = z.infer<typeof ajustesCarrera>;

/** Los periodos de todas las series, ordenados. */
export function periodos(a: AjustesCarrera): string[] {
  const todos = new Set<string>();
  for (const s of a.series) for (const p of Object.keys(s.valores)) todos.add(p);
  return [...todos].sort((x, y) => (Number.isFinite(Number(x)) && Number.isFinite(Number(y)) ? Number(x) - Number(y) : x.localeCompare(y)));
}

/** Valor de una serie en una posición fraccionaria de la lista de periodos (interpolación lineal). */
export function valorEn(valores: Record<string, number>, lista: readonly string[], posicion: number): number {
  const i = Math.max(0, Math.min(lista.length - 1, Math.floor(posicion)));
  const j = Math.min(lista.length - 1, i + 1);
  const a = valores[lista[i]] ?? 0;
  const b = valores[lista[j]] ?? a;
  return a + (b - a) * (posicion - i);
}

/** En qué posición de la lista de periodos está la carrera en el segundo t. */
export function posicionEn(escenas: readonly EscenaLista<EscenaCarrera>[], lista: readonly string[], t: number): number {
  let desde = 0;
  for (const e of escenas) {
    const hasta = Math.max(0, lista.indexOf(e.datos.hasta));
    if (t < e.inicio + e.duracion) {
      // La carrera llega al periodo de la escena a los tres cuartos y se queda ahí: la voz suele contar el final del tramo.
      const x = Math.min(1, Math.max(0, (t - e.inicio) / Math.max(0.001, e.duracion * 0.75)));
      const suave = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
      return desde + (hasta - desde) * suave;
    }
    desde = hasta;
  }
  return desde;
}

/** El líder (nombre) en una posición. */
export function lider(a: AjustesCarrera, lista: readonly string[], posicion: number): string {
  let mejor = '';
  let max = -Infinity;
  for (const s of a.series) {
    const v = valorEn(s.valores, lista, posicion);
    if (v > max) {
      max = v;
      mejor = s.nombre;
    }
  }
  return mejor;
}

export const reglas: ReglasEstilo<typeof escenaCarrera, typeof ajustesCarrera> = {
  id: 'carrera',
  familia: 'datos',
  nombre: 'Carrera de datos',
  descripcion: 'Barras que crecen y se adelantan a lo largo de los años, con el año en grande y la fuente a la vista.',
  ideal_para: 'Rankings que cambian con el tiempo: países, marcas, plataformas, precios. Siempre con datos citados.',
  esquemaEscena: escenaCarrera,
  esquemaAjustes: ajustesCarrera,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => 0.2,
  duracion: (e, voz) => Math.max(3, voz === null ? segundosDeLectura(e.texto, 3) : voz.duracion + 0.6),
  cola: 1.5,
  admiteSubtitulos: true,
  subtitulosArriba: 1210,
  efectos: ['whoosh', 'impacto'],
  golpes(escenas, ajustes) {
    const lista = periodos(ajustes);
    const golpes = [{ efecto: 'whoosh', segundo: 0, volumen: 0.4 }];
    const final = escenas.length === 0 ? 0 : escenas[escenas.length - 1].inicio + escenas[escenas.length - 1].duracion;
    let antes = lider(ajustes, lista, 0);
    for (let t = 0; t < final; t += 1 / 10) {
      const ahora = lider(ajustes, lista, posicionEn(escenas, lista, t));
      if (ahora !== antes) golpes.push({ efecto: 'impacto', segundo: t, volumen: 0.5 });
      antes = ahora;
    }
    return golpes;
  },
  musica_sugerida: ['energica', 'tech'],
};
