// Las líneas de texto de los estilos de papel. En surreal y en relato lo que se lee en pantalla ES lo que dice la voz:
// cada escena lleva sus líneas, la voz las lee en orden y cada línea entra cuando suena su primera palabra. Aquí: el
// esquema de una línea (texto suelto o {texto, estilo}), el texto que lee la voz y el segundo en que suena cada palabra
// (con los tiempos reales de la voz, o repartidos a ritmo de voz calmada cuando no hay voz).
// Sin JSX ni React: lo cargan las reglas desde Node.

import { z } from 'zod';
import type { EscenaLista } from '../../comun/guion.ts';

/** Ritmo de una voz calmada en español (MOTION: 2,1-2,6 palabras por segundo). Solo para cuando no hay voz. */
export const PALABRAS_POR_SEGUNDO = 2.5;

export interface Linea<E extends string = string> {
  readonly texto: string;
  readonly estilo: E;
  /** Multiplica el cuerpo de la línea (0,5-1,5). */
  readonly tamano?: number;
}

/**
 * El esquema de una línea: un texto suelto (con el estilo por defecto) o un objeto con su estilo. `maximos` da cuántos
 * caracteres caben en cada estilo; si se pasa, el guion no valida y dice qué línea dividir.
 */
export function esquemaLinea<const E extends readonly [string, ...string[]]>(estilos: E, porDefecto: E[number], maximos: { readonly [k in E[number]]: number }) {
  const objeto = z.object({
    texto: z.string().trim().min(1),
    estilo: z.enum(estilos).default(porDefecto as never),
    tamano: z.number().min(0.5).max(1.5).optional(),
  });
  return z
    .union([z.string().trim().min(1), objeto])
    .transform((v) => (typeof v === 'string' ? { texto: v, estilo: porDefecto } : v) as Linea<E[number]>)
    .superRefine((l, ctx) => {
      const max = maximos[l.estilo as E[number]];
      if (l.texto.length > max) {
        ctx.addIssue({ code: 'custom', message: `La línea «${l.texto}» (${l.estilo}) tiene ${l.texto.length} caracteres y caben ${max}: divídela en dos líneas o en dos escenas.` });
      }
    });
}

/** Las palabras de un texto, como las cuenta la voz. */
export function palabras(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

/** El texto que lee la voz: los trozos en orden, separados por un espacio. */
export function unir(trozos: readonly (string | undefined | null | false)[]): string {
  return trozos.filter((t): t is string => typeof t === 'string' && t.trim() !== '').join(' ');
}

/** Lo que tarda una voz calmada en leer un texto (sin voz real). */
export function vozEstimada(texto: string): number {
  const n = palabras(texto).length;
  return n === 0 ? 0 : 0.2 + n / PALABRAS_POR_SEGUNDO;
}

/** Una palabra sin mayúsculas, tildes ni signos, para compararla con la de la voz. */
function normal(p: string): string {
  return p
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ%]/g, '');
}

/**
 * Las palabras que dice la voz, cada una con el segundo (del video) en que empieza. Con voz: las de la voz, con sus
 * tiempos reales (aunque la voz haya partido el texto de otra manera, por ejemplo «21,4%» en «veintiuno coma cuatro
 * por ciento»). Sin voz: las del texto, a ritmo de voz calmada desde `desfase`.
 */
function palabrasConTiempo(escena: EscenaLista, texto: string, desfase: number): { readonly n: string; readonly s: number }[] {
  if (escena.voz !== null && escena.voz.palabras.length > 0) {
    const base = escena.inicio + escena.voz.desfase;
    return escena.voz.palabras.map((p) => ({ n: normal(p.texto), s: base + p.inicio }));
  }
  const lista = palabras(texto);
  const dur = vozEstimada(texto) - 0.2;
  return lista.map((p, i) => ({ n: normal(p), s: escena.inicio + desfase + (i * dur) / Math.max(1, lista.length) }));
}

/**
 * El segundo en que empieza cada trozo en pantalla (líneas, elementos de una lista). Cada trozo se busca en orden entre
 * las palabras que dice la voz y empieza cuando suena su primera palabra; así funciona también cuando la voz dice más
 * que la pantalla (campo `voz` del guion). Un trozo que no aparece (un número leído en letras) empieza en proporción a
 * su lugar en el texto, nunca antes que el anterior.
 */
export function momentosDeTrozos(escena: EscenaLista, textoVoz: string, desfase: number, trozos: readonly string[]): number[] {
  const voz = palabrasConTiempo(escena, textoVoz, desfase);
  if (voz.length === 0) return trozos.map(() => escena.inicio + desfase);
  const totalTexto = Math.max(1, palabras(textoVoz).length);
  const r: number[] = [];
  let k = 0;
  let enTexto = 0;
  for (const t of trozos) {
    const propias = palabras(t).map(normal).filter(Boolean);
    let hallado = -1;
    if (propias.length > 0) {
      // Primero con las dos primeras palabras (más seguro), luego solo con la primera.
      for (let j = k; j < voz.length && hallado < 0; j++) if (voz[j].n === propias[0] && (propias.length < 2 || voz[j + 1]?.n === propias[1])) hallado = j;
      for (let j = k; j < voz.length && hallado < 0; j++) if (voz[j].n === propias[0]) hallado = j;
    }
    const proporcional = Math.min(voz.length - 1, Math.round((enTexto * voz.length) / totalTexto));
    const en = hallado >= 0 ? hallado : Math.max(Math.min(k, voz.length - 1), proporcional);
    r.push(voz[en].s);
    k = Math.min(voz.length, en + Math.max(1, propias.length));
    enTexto += propias.length;
  }
  return r;
}

/** Una imagen opcional en la carpeta imagenes/ del video. */
export const esquemaImagen = z
  .string()
  .regex(/^imagenes\/[^/\\]+\.(png|webp|jpe?g)$/i, 'la imagen va en la carpeta imagenes/ del video: «imagenes/archivo.png»');

/** La línea tal como se ve: con la inicial en mayúscula si se pide (los signos ¿ ¡ « se respetan). */
export function conInicial(texto: string, mayuscula: boolean): string {
  if (!mayuscula) return texto;
  const m = /^([^\p{L}\p{N}]*)(\p{L})/u.exec(texto);
  return m === null ? texto : m[1] + m[2].toLocaleUpperCase('es') + texto.slice(m[0].length);
}
