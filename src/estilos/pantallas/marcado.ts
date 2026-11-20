// El texto de una escena del estilo «pantallas»: lo que lee la voz es también lo que se escribe en pantalla, palabra
// por palabra. El guionista marca el estilo de cada palabra con un marcado mínimo:
//   **palabra**    grande y en negrita          *palabra*   negrita cursiva
//   ***palabra***  grande y cursiva             ^palabra^   titular en MAYÚSCULAS, el más grande
//   /              salto de línea en pantalla (la voz no lo lee)
// El marcado puede abarcar varias palabras («**mil millones**»). Sin «/», las líneas se reparten solas.
// Sin JSX ni React: lo usan reglas.ts (Node) y el dibujo.

import type { VozEscena } from '../../comun/guion.ts';

export type EstiloPalabra = 'normal' | 'grande' | 'cursiva' | 'grande-cursiva' | 'titular';

export interface PalabraMarcada {
  /** Como se escribe en pantalla (sin la puntuación final débil; el titular, en mayúsculas). */
  readonly texto: string;
  /** Como la dice la voz (para alinear con sus tiempos). */
  readonly voz: string;
  readonly estilo: EstiloPalabra;
  /** La línea marcada con «/» a la que pertenece. */
  readonly linea: number;
}

export interface TextoMarcado {
  readonly palabras: readonly PalabraMarcada[];
  /** Verdadero si el guion cortó las líneas con «/». */
  readonly conCortes: boolean;
  /** Índices de las palabras de cada línea marcada (una sola si no hay «/»). */
  readonly lineas: readonly (readonly number[])[];
  /** Un marcado que se abrió y no se cerró («**», «*» o «^»). */
  readonly sinCerrar: boolean;
}

/** Lo que lee la voz: el texto sin marcado y sin los saltos de línea. */
export function textoParaVoz(texto: string): string {
  return texto
    .replace(/[*^]/g, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** La palabra tal como se escribe en pantalla: sin la puntuación débil al final ni signos sueltos al principio; se
 *  quedan ¿ ¡ ? ! y las comillas. */
export function palabraEnPantalla(palabra: string): string {
  return palabra
    .trim()
    .replace(/^[^\p{L}\p{N}¿¡«“"'(#@$€£+-]+/u, '')
    .replace(/[,.;:…]+$/u, '');
}

const cache = new Map<string, TextoMarcado>();

/** Lee el marcado de un texto. */
export function leerMarcado(texto: string): TextoMarcado {
  const guardado = cache.get(texto);
  if (guardado !== undefined) return guardado;
  const palabras: PalabraMarcada[] = [];
  let grande = false;
  let cursiva = false;
  let mayus = false;
  let linea = 0;
  let actual = '';
  let estilo: EstiloPalabra | null = null;
  const cerrar = (): void => {
    if (actual.length > 0 && estilo !== null) {
      const enPantalla = palabraEnPantalla(actual);
      if (enPantalla.length > 0) {
        palabras.push({ texto: estilo === 'titular' ? enPantalla.toLocaleUpperCase('es') : enPantalla, voz: actual, estilo, linea });
      }
    }
    actual = '';
    estilo = null;
  };
  const caracteres = [...texto];
  for (let i = 0; i < caracteres.length; i++) {
    const c = caracteres[i];
    if (c === '*') {
      let n = 1;
      while (caracteres[i + n] === '*') n++;
      if (n >= 3) {
        grande = !grande;
        cursiva = !cursiva;
      } else if (n === 2) grande = !grande;
      else cursiva = !cursiva;
      i += Math.min(n, 3) - 1;
      continue;
    }
    if (c === '^') {
      mayus = !mayus;
      continue;
    }
    if (c === '/') {
      cerrar();
      linea += 1;
      continue;
    }
    if (/\s/.test(c)) {
      cerrar();
      continue;
    }
    if (estilo === null) estilo = mayus ? 'titular' : grande && cursiva ? 'grande-cursiva' : grande ? 'grande' : cursiva ? 'cursiva' : 'normal';
    actual += c;
  }
  cerrar();
  // Renumera las líneas sin huecos (una «/» al principio o dos seguidas no dejan líneas vacías).
  const usadas = [...new Set(palabras.map((p) => p.linea))];
  const renumeradas = palabras.map((p) => ({ ...p, linea: usadas.indexOf(p.linea) }));
  const lineas = usadas.map((_, j) => renumeradas.flatMap((p, k) => (p.linea === j ? [k] : [])));
  const resultado: TextoMarcado = { palabras: renumeradas, conCortes: usadas.length > 1, lineas, sinCerrar: grande || cursiva || mayus };
  cache.set(texto, resultado);
  return resultado;
}

/** Normaliza una palabra para compararla con la de la voz: minúsculas, sin tildes ni signos. */
export function normalizar(palabra: string): string {
  return palabra
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function coinciden(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false;
  if (a === b) return true;
  return a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a));
}

/** Sin voz, las palabras entran a este ritmo (el original: una palabra nueva cada 0,34 s). */
export const INICIO_SIN_VOZ = 0.25;
export const PASO_SIN_VOZ = 0.34;
/** Cada palabra empieza a entrar un poco antes de oírse (el original: mediana 0,2 s). */
export const ANTICIPO_S = 0.2;

/**
 * En qué segundo de la escena se dice cada palabra de la pantalla. Con voz se alinean las palabras del guion con las
 * de la voz (subsecuencia común más larga; las que no casan, como «1.000» leído «mil», se reparten entre sus vecinas).
 * Sin voz, al ritmo de lectura.
 */
export function tiemposDePalabras(palabras: readonly PalabraMarcada[], voz: (VozEscena & { desfase: number }) | null): number[] {
  const n = palabras.length;
  if (voz === null || voz.palabras.length === 0) {
    if (voz !== null && n > 0) {
      const paso = Math.max(0.15, (voz.duracion - 0.2) / n);
      return palabras.map((_, i) => voz.desfase + 0.1 + i * paso);
    }
    return palabras.map((_, i) => INICIO_SIN_VOZ + i * PASO_SIN_VOZ);
  }
  const a = palabras.map((p) => normalizar(p.voz));
  const b = voz.palabras.map((p) => normalizar(p.texto));
  const m = b.length;
  // Subsecuencia común más larga.
  const tabla: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      tabla[i][j] = coinciden(a[i], b[j]) ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
  const pareja: (number | null)[] = new Array<number | null>(n).fill(null);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (coinciden(a[i], b[j]) && tabla[i][j] === tabla[i + 1][j + 1] + 1) {
      pareja[i] = j;
      i++;
      j++;
    } else if (tabla[i + 1][j] >= tabla[i][j + 1]) i++;
    else j++;
  }
  const inicios = voz.palabras.map((p) => p.inicio);
  const finVoz = voz.palabras[m - 1].fin;
  const tiempos: number[] = new Array<number>(n).fill(0);
  let k = 0;
  while (k < n) {
    const pk = pareja[k];
    if (pk !== null) {
      tiempos[k] = inicios[pk];
      k++;
      continue;
    }
    // Un tramo sin pareja: se reparte entre el final de la anterior y el inicio de la siguiente con pareja.
    let fin = k;
    while (fin < n && pareja[fin] === null) fin++;
    const anterior = k > 0 ? pareja[k - 1] : null;
    const desde = anterior !== null ? voz.palabras[anterior].fin : inicios[0];
    const siguiente = fin < n ? pareja[fin] : null;
    const hasta = Math.max(desde, siguiente !== null ? inicios[siguiente] : finVoz);
    const tramo = fin - k;
    for (let x = 0; x < tramo; x++) tiempos[k + x] = desde + ((hasta - desde) * x) / tramo;
    k = fin;
  }
  return tiempos.map((t) => voz.desfase + t);
}

/** Índice de la primera palabra (desde `desde`) que casa con la primera palabra de `nombre`, o −1. */
export function buscarPalabra(palabras: readonly PalabraMarcada[], nombre: string, desde = 0): number {
  const objetivo = normalizar(nombre.trim().split(/\s+/)[0] ?? '');
  if (objetivo.length === 0) return -1;
  for (let k = Math.max(0, desde); k < palabras.length; k++) if (coinciden(normalizar(palabras[k].voz), objetivo)) return k;
  return -1;
}
