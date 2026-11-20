// La escena que toca en cada segundo y la apertura de la boca de quien habla. Sin JSX: lo puede cargar Node.
//
// Con voz, la boca sigue los tiempos reales de cada palabra (escena.voz.palabras más el desfase). Sin voz, reparte las
// palabras del texto a lo largo de la escena con la misma regla que los subtítulos (palabrasParaSubtitulos), para que
// boca y subtítulos vayan juntos.

import type { EscenaLista } from '../../comun/guion.ts';
import { hash, limitar } from './curvas.ts';

export interface Momento<D> {
  readonly escena: EscenaLista<D>;
  /** Segundos desde el inicio de la escena (puede pasar de su duración en la cola final). */
  readonly local: number;
  readonly anterior: EscenaLista<D> | null;
  readonly siguiente: EscenaLista<D> | null;
}

/** La escena del segundo t (la última si t ya pasó del final). */
export function momentoEn<D>(escenas: readonly EscenaLista<D>[], t: number): Momento<D> | null {
  if (escenas.length === 0) return null;
  let i = escenas.findIndex((e) => t < e.inicio + e.duracion);
  if (i < 0) i = escenas.length - 1;
  const escena = escenas[i];
  return { escena, local: t - escena.inicio, anterior: escenas[i - 1] ?? null, siguiente: escenas[i + 1] ?? null };
}

interface Tramo {
  readonly inicio: number;
  readonly fin: number;
  readonly silabas: number;
}

/** Sílabas aproximadas de una palabra en español: grupos de vocales. */
function silabas(palabra: string): number {
  const grupos = palabra.toLowerCase().match(/[aeiouáéíóúü]+/g);
  return Math.max(1, grupos?.length ?? 1);
}

/** Las palabras de la escena con su inicio y fin en segundos desde el inicio de la escena. */
export function tramosDeHabla(escena: EscenaLista, texto: string): Tramo[] {
  if (escena.voz !== null) {
    const d = escena.voz.desfase;
    return escena.voz.palabras.map((p) => ({ inicio: d + p.inicio, fin: d + p.fin, silabas: silabas(p.texto) }));
  }
  const trozos = texto.trim().split(/\s+/).filter(Boolean);
  if (trozos.length === 0) return [];
  const desde = 0.2;
  const paso = Math.max(0.2, (escena.duracion - 0.5) / trozos.length);
  return trozos.map((p, i) => ({ inicio: desde + i * paso, fin: desde + (i + 1) * paso - 0.06, silabas: silabas(p) }));
}

/**
 * Cuánto está abierta la boca (0 cerrada, 1 abierta del todo) en el segundo local de la escena: un golpe de apertura
 * por sílaba dentro de cada palabra, con amplitud que varía un poco para que no parezca un metrónomo.
 */
export function aperturaBoca(tramos: readonly Tramo[], local: number): number {
  for (let i = 0; i < tramos.length; i++) {
    const w = tramos[i];
    if (local < w.inicio || local > w.fin) continue;
    const x = (local - w.inicio) / Math.max(0.05, w.fin - w.inicio);
    const golpe = Math.abs(Math.sin(Math.PI * x * w.silabas));
    const amplitud = 0.55 + 0.45 * hash(i, 31);
    return limitar(0.12 + golpe * amplitud);
  }
  return 0;
}

/** Si la escena tiene alguien hablando en el segundo local (para gestos de las manos y la cabeza). */
export function hablando(tramos: readonly Tramo[], local: number): boolean {
  return tramos.some((w) => local >= w.inicio - 0.05 && local <= w.fin + 0.15);
}
