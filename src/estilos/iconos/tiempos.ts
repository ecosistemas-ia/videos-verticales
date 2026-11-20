// Los tiempos dentro de una escena. Todo entra sobre una palabra de la voz, como en el original (2 fotogramas antes):
//   - con voz, las palabras y sus tiempos salen de escena.voz.palabras (más el desfase de la escena);
//   - sin voz, las palabras del texto se reparten por la escena con la misma fórmula que usan los subtítulos comunes
//     (palabrasParaSubtitulos): lo que aparece en pantalla y el subtítulo van juntos también sin voz.
// Una «pista» es algo que aparece: su ancla explícita (`en`, una palabra o frase corta del texto de la escena;
// «palabra#2» = la segunda vez que se dice) o, si no la hay, su propio texto, que se busca solo en la voz («Velocidad»
// entra cuando la voz dice «velocidad»). Lo que no se encuentra se reparte entre sus vecinos encontrados.
// Sin JSX ni React: lo usan reglas.ts (en Node, para los efectos de sonido) y el estilo.

import type { EscenaLista } from '../../comun/guion.ts';

/** Segundos de anticipo de una entrada respecto a su palabra (el original: 2 fotogramas a 30 fps). */
export const ANTICIPO = 2 / 30;

export interface PalabraEscena {
  readonly texto: string;
  /** Segundos desde el inicio de la escena. */
  readonly inicio: number;
  readonly fin: number;
}

/** Minúsculas, sin tildes ni signos: «¿Qué» → «que», «SEO,» → «seo». */
export function normalizar(palabra: string): string {
  return palabra
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, '');
}

function fichas(texto: string): string[] {
  return texto
    .trim()
    .split(/\s+/)
    .map(normalizar)
    .filter((t) => t.length > 0);
}

/** Las palabras del texto, una por hueco, como las corta el motor común (split por espacios). */
export function trozos(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

/** Las palabras de una escena con sus tiempos, en segundos desde el inicio de la escena. */
export function palabrasDeEscena(escena: EscenaLista, texto: string): PalabraEscena[] {
  if (escena.voz !== null) {
    const d = escena.voz.desfase;
    return escena.voz.palabras.map((p) => ({ texto: p.texto, inicio: p.inicio + d, fin: p.fin + d }));
  }
  // La misma fórmula que palabrasParaSubtitulos (src/comun/guion.ts).
  const lista = trozos(texto);
  const desde = 0.2;
  const paso = Math.max(0.2, (escena.duracion - 0.5) / Math.max(1, lista.length));
  return lista.map((t, i) => ({ texto: t, inicio: desde + i * paso, fin: desde + (i + 1) * paso - 0.04 }));
}

/** Raíz de comparación: las primeras letras de una palabra larga («garantías» y «garantizarte» → «garant»). */
function raiz(f: string): string {
  return f.length >= 6 ? f.slice(0, Math.max(5, f.length - 3)) : f;
}

/**
 * Dónde empieza una consulta («velocidad», «no tiene», «clic#2») dentro de una lista de palabras: índice o null.
 * Primero la frase exacta; si no, la primera palabra con contenido; si no, por la raíz de esa palabra.
 */
export function buscar(palabras: readonly string[], consulta: string, estricta = false): number | null {
  const m = /^(.*?)(?:#(\d+))?$/.exec(consulta.trim());
  const vez = Math.max(1, Number(m?.[2] ?? 1));
  const buscada = fichas(m?.[1] ?? consulta);
  if (buscada.length === 0) return null;
  const lista = palabras.map(normalizar);
  const nesima = (prueba: (i: number) => boolean): number | null => {
    let n = 0;
    for (let i = 0; i < lista.length; i++) if (prueba(i) && ++n === vez) return i;
    return null;
  };
  const exacta = nesima((i) => buscada.every((f, k) => lista[i + k] === f));
  if (exacta !== null || estricta) return exacta;
  const principal = buscada.find((f) => f.length >= 3) ?? buscada[0];
  const sola = nesima((i) => lista[i] === principal);
  if (sola !== null) return sola;
  if (principal.length < 5) return null;
  const r = raiz(principal);
  return nesima((i) => lista[i].length >= 4 && (lista[i].startsWith(r) || r.startsWith(raiz(lista[i]))));
}

/** Vero si la consulta está en el texto (para validar las anclas `en` del guion). */
export function estaEnTexto(texto: string, consulta: string): boolean {
  return buscar(trozos(texto), consulta) !== null;
}

/** Algo que aparece en la escena: su ancla explícita y, si no la hay, su texto para buscarlo solo. */
export interface Pista {
  readonly en?: string;
  readonly texto?: string;
  /** Su texto solo vale si se dice tal cual (para «Tiene:» y «No tiene:», que comparten palabra). */
  readonly estricta?: boolean;
}

/**
 * El segundo (desde el inicio de la escena) en que entra cada pista. Las que no se encuentran se reparten entre las
 * encontradas vecinas (o entre `desde` y `hasta`). Nunca antes de `desde`.
 */
export function momentos(escena: EscenaLista, textoVoz: string, pistas: readonly Pista[], desde: number, hasta: number): number[] {
  const palabras = palabrasDeEscena(escena, textoVoz);
  const textos = palabras.map((p) => p.texto);
  const delTexto = trozos(textoVoz);
  const hallar = (consulta: string, estricta: boolean): number | null => {
    const i = buscar(textos, consulta, estricta);
    if (i !== null) return Math.max(desde, palabras[i].inicio - ANTICIPO);
    // Con voz, la palabra puede venir escrita distinto (números, siglas): se ubica por su posición en el texto.
    if (escena.voz === null || palabras.length === 0) return null;
    const j = buscar(delTexto, consulta, estricta);
    if (j === null) return null;
    const ultimo = palabras[palabras.length - 1].fin;
    return Math.max(desde, palabras[0].inicio + (j / Math.max(1, delTexto.length)) * (ultimo - palabras[0].inicio) - ANTICIPO);
  };
  const crudos = pistas.map((p) => {
    if (p.en !== undefined && p.en.trim() !== '') return hallar(p.en, false);
    if (p.texto !== undefined && p.texto.trim() !== '') return hallar(p.texto, p.estricta === true);
    return null;
  });
  // Relleno de los huecos: reparto uniforme entre el anterior conocido (o `desde`) y el siguiente (o `hasta`).
  const salida: number[] = new Array<number>(pistas.length);
  let i = 0;
  while (i < crudos.length) {
    const c = crudos[i];
    if (c !== null) {
      salida[i] = c;
      i++;
      continue;
    }
    let j = i;
    while (j < crudos.length && crudos[j] === null) j++;
    const n = j - i;
    const a = i > 0 ? salida[i - 1] : null;
    const b = j < crudos.length ? (crudos[j] as number) : null;
    for (let k = 0; k < n; k++) {
      let t: number;
      if (a === null) t = desde + ((b ?? hasta) - desde) * (k / n);
      else t = a + (Math.max(a, b ?? hasta) - a) * ((k + 1) / (n + 1));
      salida[i + k] = Math.max(desde, t);
    }
    i = j;
  }
  return salida;
}

/** Fin de lo que se habla en la escena (segundos desde su inicio). */
export function finDelHabla(escena: EscenaLista, textoVoz: string): number {
  const p = palabrasDeEscena(escena, textoVoz);
  return p.length === 0 ? escena.duracion : p[p.length - 1].fin;
}
