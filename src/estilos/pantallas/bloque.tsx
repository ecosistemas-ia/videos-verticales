// El texto en pantalla: las palabras de la voz en renglones centrados, cada palabra con su estilo (normal, grande,
// cursiva, titular) sobre la misma línea de base; todo negro, sin palabras de color.
//   - Cada palabra entra en su momento (~0,2 s antes de oírse) de gris claro a negro, subiendo 14 px en 8 fotogramas.
//   - El renglón se mantiene centrado mientras crece: al entrar una palabra, las anteriores se deslizan de lado.
//   - El bloque crece renglón a renglón y la pila de la escena se vuelve a centrar (30-50 px en ~0,3 s).
//   - Sin «/», los renglones se reparten solos y equilibrados (3-4 palabras); con «/», se respetan y solo se cortan si
//     no caben. Si una escena tiene más renglones de los que caben, van por páginas que se relevan en el mismo sitio.

import type { ReactNode } from 'react';
import { ROBOTO, anchoTexto } from './fuentes.ts';
import type { EstiloPalabra, PalabraMarcada } from './marcado.ts';
import { CURVAS, anima, palabraGris } from './movimientos.ts';

/** Cuerpos en px (a 1080 de ancho), medidos sobre el original: altura de la x de Roboto = 0,528 em. */
export const CUERPOS = { normal: 84, grande: 116, cursiva: 96, titular: 134, punto: 86 } as const;
const ESPACIADO = { recto: -0.025, cursiva: -0.02 } as const;
/** Por debajo de este cuerpo la palabra normal pasa de 400 a 500 (como en el original). */
const CUERPO_NORMAL_500 = 68;
const INTERLINEA = 1.12;
/** Una palabra suelta que no cabe se encoge hasta esta fracción. */
const MINIMO = 0.5;

export interface PalabraColocada {
  readonly k: number;
  readonly texto: string;
  readonly peso: number;
  readonly cursiva: boolean;
  readonly cuerpo: number;
  readonly espaciado: number;
  readonly ancho: number;
  /** Borde izquierdo desde el inicio del renglón. */
  readonly x: number;
}

export interface Renglon {
  readonly palabras: readonly PalabraColocada[];
  readonly ancho: number;
  readonly cuerpoMax: number;
  /** Línea de base desde arriba del bloque. */
  readonly base: number;
  readonly alto: number;
  readonly bajo: number;
}

export interface Bloque {
  readonly renglones: readonly Renglon[];
  readonly altura: number;
  readonly ancho: number;
  readonly primera: number;
}

export interface OpcionesTexto {
  /** Ancho máximo de un renglón. */
  readonly maximo: number;
  /** Ancho al que se apunta al repartir renglones solos. */
  readonly objetivo?: number;
  /** Puntos de una lista: las palabras normales en 600 al cuerpo del punto. */
  readonly punto?: boolean;
  /** Un factor sobre todos los cuerpos. */
  readonly factor?: number;
}

function estiloDe(e: EstiloPalabra, punto: boolean): { cuerpo: number; peso: number; cursiva: boolean } {
  switch (e) {
    case 'titular':
      return { cuerpo: CUERPOS.titular, peso: 600, cursiva: false };
    case 'grande':
      return { cuerpo: CUERPOS.grande, peso: 600, cursiva: false };
    case 'grande-cursiva':
      return { cuerpo: CUERPOS.grande, peso: 600, cursiva: true };
    case 'cursiva':
      return { cuerpo: punto ? CUERPOS.punto : CUERPOS.cursiva, peso: 600, cursiva: true };
    default:
      return punto ? { cuerpo: CUERPOS.punto, peso: 600, cursiva: false } : { cuerpo: CUERPOS.normal, peso: 400, cursiva: false };
  }
}

type Medida = Omit<PalabraColocada, 'x'>;

function medir(palabras: readonly PalabraMarcada[], k: number, o: OpcionesTexto, escala: number): Medida {
  const p = palabras[k];
  const st = estiloDe(p.estilo, o.punto === true);
  const cuerpo = st.cuerpo * (o.factor ?? 1) * escala;
  const peso = st.peso === 400 && cuerpo < CUERPO_NORMAL_500 ? 500 : st.peso;
  const espaciado = st.cursiva ? ESPACIADO.cursiva : ESPACIADO.recto;
  return { k, texto: p.texto, peso, cursiva: st.cursiva, cuerpo, espaciado, ancho: anchoTexto(p.texto, cuerpo, peso, st.cursiva, espaciado, ROBOTO) };
}

const espacioEntre = (a: Medida, b: Medida): number => 0.25 * Math.min(a.cuerpo, b.cuerpo);

function anchoDe(m: readonly Medida[]): number {
  return m.reduce((s, x, i) => s + x.ancho + (i > 0 ? espacioEntre(m[i - 1], x) : 0), 0);
}

/** Reparte una fila de palabras en `n` renglones minimizando el renglón más ancho. */
function equilibrar(m: readonly Medida[], n: number): Medida[][] {
  const N = m.length;
  const ancho = (i: number, j: number): number => anchoDe(m.slice(i, j));
  const coste: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY));
  const corte: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(n + 1).fill(0));
  coste[0][0] = 0;
  for (let j = 1; j <= N; j++)
    for (let c = 1; c <= Math.min(n, j); c++)
      for (let i = c - 1; i < j; i++) {
        const v = Math.max(coste[i][c - 1], ancho(i, j));
        if (v < coste[j][c]) {
          coste[j][c] = v;
          corte[j][c] = i;
        }
      }
  const filas: Medida[][] = [];
  let j = N;
  for (let c = n; c >= 1; c--) {
    const i = corte[j][c];
    filas.unshift(m.slice(i, j));
    j = i;
  }
  return filas;
}

/** Corta una fila en renglones que caben en `maximo`, apuntando a `objetivo`. */
function cortar(m: readonly Medida[], maximo: number, objetivo: number): Medida[][] {
  const total = anchoDe(m);
  if (total <= objetivo || m.length === 1) return [[...m]];
  for (let n = Math.max(2, Math.ceil(total / objetivo)); n <= m.length; n++) {
    const filas = equilibrar(m, n);
    if (filas.every((f) => anchoDe(f) <= maximo)) return filas;
  }
  return m.map((x) => [x]);
}

/** Los renglones de un texto (índices de palabra), agrupados por línea marcada: con «/», cada línea marcada da un grupo
 *  (se encoge hasta un 80 % antes de cortarse en dos); sin «/», un solo grupo repartido solo. */
export function renglonesDe(palabras: readonly PalabraMarcada[], lineas: readonly (readonly number[])[], conCortes: boolean, o: OpcionesTexto): number[][][] {
  const objetivo = o.objetivo ?? o.maximo * 0.78;
  const grupos: number[][][] = [];
  for (const linea of lineas) {
    if (linea.length === 0) continue;
    const m = linea.map((k) => medir(palabras, k, o, 1));
    const partes = conCortes ? (anchoDe(m) * 0.8 <= o.maximo ? [m] : cortar(m, o.maximo, o.maximo * 0.85)) : cortar(m, o.maximo, objetivo);
    grupos.push(partes.map((p) => p.map((x) => x.k)));
  }
  return grupos;
}

/** Agrupa renglones en páginas de como mucho `max` renglones, equilibradas (4+1 → 3+2). */
export function paginar(renglones: readonly (readonly number[])[], max: number): number[][][] {
  if (renglones.length <= max) return renglones.length === 0 ? [] : [renglones.map((r) => [...r])];
  const n = Math.ceil(renglones.length / max);
  const base = Math.floor(renglones.length / n);
  const resto = renglones.length % n;
  const paginas: number[][][] = [];
  let i = 0;
  for (let p = 0; p < n; p++) {
    const cuantos = base + (p < resto ? 1 : 0);
    paginas.push(renglones.slice(i, i + cuantos).map((r) => [...r]));
    i += cuantos;
  }
  return paginas;
}

/** Compone un bloque: renglones sobre su línea de base, encogidos si una palabra suelta no cabe. */
export function componer(palabras: readonly PalabraMarcada[], renglones: readonly (readonly number[])[], o: OpcionesTexto): Bloque {
  let medidas = renglones.map((r) => r.map((k) => medir(palabras, k, o, 1)));
  const masAncho = Math.max(...medidas.map(anchoDe));
  const escala = Math.max(MINIMO, Math.min(1, o.maximo / masAncho));
  if (escala < 1) medidas = renglones.map((r) => r.map((k) => medir(palabras, k, o, escala * 0.995)));
  const lista: Renglon[] = [];
  let base = 0;
  medidas.forEach((m, j) => {
    const cuerpoMax = Math.max(...m.map((x) => x.cuerpo));
    const mayus = (r: readonly Medida[]): boolean => r.every((x) => /\p{L}/u.test(x.texto) && x.texto === x.texto.toLocaleUpperCase('es'));
    const todoMayus = mayus(m);
    const arribaMayus = j > 0 && mayus(medidas[j - 1]);
    if (j === 0) base = (todoMayus ? 0.711 : 0.74) * cuerpoMax;
    else {
      const sobre = lista[j - 1];
      if (todoMayus && arribaMayus) base += 0.86 * cuerpoMax;
      else if (todoMayus) base += sobre.bajo - sobre.base + 0.12 * cuerpoMax + 0.711 * cuerpoMax;
      else base += Math.max(INTERLINEA * cuerpoMax, 0.22 * sobre.cuerpoMax + 0.8 * cuerpoMax);
    }
    let x = 0;
    const colocadas: PalabraColocada[] = m.map((p, i) => {
      if (i > 0) x += espacioEntre(m[i - 1], p);
      const c = { ...p, x };
      x += p.ancho;
      return c;
    });
    const desciende = m.some((p) => /[gjpqyQ,;]/.test(p.texto));
    lista.push({ palabras: colocadas, ancho: anchoDe(m), cuerpoMax, base, alto: base - (todoMayus ? 0.711 : 0.74) * cuerpoMax, bajo: base + (desciende ? 0.21 : 0.04) * cuerpoMax });
  });
  return { renglones: lista, altura: lista.length > 0 ? lista[lista.length - 1].bajo : 0, ancho: Math.max(0, ...lista.map((r) => r.ancho)), primera: renglones[0]?.[0] ?? 0 };
}

/** Cuánto de un renglón «hay» en el fotograma f: la suma de las palabras que ya entraron (en 4 fotogramas cada una). */
function anchoVisible(r: Renglon, f: number, entra: (k: number) => number): number {
  let w = 0;
  r.palabras.forEach((p, i) => {
    const q = anima(f, [entra(p.k), entra(p.k) + 4], [0, 1], CURVAS.frena);
    const espacio = i > 0 ? p.x - (r.palabras[i - 1].x + r.palabras[i - 1].ancho) : 0;
    w += q * (p.ancho + espacio);
  });
  return w;
}

/** La altura del bloque que se ve en el fotograma f: crece renglón a renglón (6 fotogramas desde su primera palabra). */
export function alturaVisible(b: Bloque, f: number, entra: (k: number) => number): number {
  let h = 0;
  b.renglones.forEach((r, j) => {
    const e = entra(r.palabras[0].k);
    const q = anima(f, [e, e + 6], [0, 1], CURVAS.frena);
    h += q * (r.bajo - (j === 0 ? 0 : b.renglones[j - 1].bajo));
  });
  return h;
}

/** Dibuja un bloque de palabras que entran una a una. x: centro (o borde con `alinear`), y: arriba del bloque. */
export function BloqueTexto({ b, f, entra, x, y, alinear = 'centro', opacidad = 1, color = '#000000' }: { readonly b: Bloque; readonly f: number; readonly entra: (k: number) => number; readonly x: number; readonly y: number; readonly alinear?: 'centro' | 'izquierda'; readonly opacidad?: number; readonly color?: string }): ReactNode {
  if (opacidad <= 0.001) return null;
  return (
    <>
      {b.renglones.map((r, j) => {
        const w = anchoVisible(r, f, entra);
        if (w <= 0.01) return null;
        const inicio = alinear === 'centro' ? x - w / 2 : x;
        return r.palabras.map((p) => {
          const st = palabraGris(f, entra(p.k));
          if (!st.visible) return null;
          return (
            <div
              key={`${j}-${p.k}`}
              style={{
                position: 'absolute',
                left: inicio + p.x,
                top: y + r.base - p.cuerpo * 0.942 + st.dy,
                fontFamily: ROBOTO,
                fontWeight: p.peso,
                fontStyle: p.cursiva ? 'italic' : 'normal',
                fontSize: p.cuerpo,
                lineHeight: `${p.cuerpo * 1.2}px`,
                letterSpacing: `${p.espaciado}em`,
                color,
                opacity: st.opacidad * opacidad,
                whiteSpace: 'pre',
              }}
            >
              {p.texto}
            </div>
          );
        });
      })}
    </>
  );
}

/** Un bloque de una escena con su ventana: entra con su primera palabra y se va cuando llega el siguiente. */
export interface Pagina {
  readonly b: Bloque;
  readonly desde: number;
  readonly hasta: number;
}

export function paginasEnEscena(palabras: readonly PalabraMarcada[], paginas: readonly (readonly (readonly number[])[])[], o: OpcionesTexto, entra: (k: number) => number): Pagina[] {
  const bloques = paginas.map((p) => componer(palabras, p, o));
  return bloques.map((b, i) => ({ b, desde: entra(b.primera), hasta: i + 1 < bloques.length ? entra(bloques[i + 1].primera) : Number.POSITIVE_INFINITY }));
}

function activa(paginas: readonly Pagina[], f: number): Pagina | null {
  let a: Pagina | null = null;
  for (const p of paginas) if (p.desde <= f) a = p;
  return a;
}

/** Dibuja las páginas de un campo: la activa y la anterior, que se desvanece en 4 fotogramas. */
export function Paginas({ paginas, f, entra, x, y, alinear = 'centro' }: { readonly paginas: readonly Pagina[]; readonly f: number; readonly entra: (k: number) => number; readonly x: number; readonly y: number; readonly alinear?: 'centro' | 'izquierda' }): ReactNode {
  return (
    <>
      {paginas.map((p, i) => {
        if (f < p.desde || f >= p.hasta + 4) return null;
        const opacidad = f >= p.hasta ? 1 - anima(f, [p.hasta, p.hasta + 4], [0, 1], CURVAS.frena) : 1;
        return <BloqueTexto key={i} b={p.b} f={f} entra={entra} x={x} y={y} alinear={alinear} opacidad={opacidad} />;
      })}
    </>
  );
}

/** Lo más alto que llega a ser un campo de texto (para reservar sitio al objeto). */
export function alturaMaxima(paginas: readonly Pagina[]): number {
  return Math.max(0, ...paginas.map((p) => p.b.altura));
}

// ---------------------------------------------------------------------------------------------------------------------
// La pila: texto encima, objeto, texto debajo, centrados en vertical; se vuelve a centrar cuando llega un renglón.

export interface Pieza {
  /** Alto que ocupa en el fotograma f (0 = aún no está). */
  readonly alto: number;
  /** Cuánto está (0-1): pesa el espacio antes de la pieza. */
  readonly presencia: number;
  readonly espacio: number;
  readonly dibuja: (y: number) => ReactNode;
}

export function piezaTexto(paginas: readonly Pagina[], f: number, entra: (k: number) => number, x: number, espacio: number): Pieza {
  const a = activa(paginas, f);
  return {
    alto: a ? alturaVisible(a.b, f, entra) : 0,
    presencia: a ? anima(f, [a.desde, a.desde + 6], [0, 1], CURVAS.frena) : 0,
    espacio,
    dibuja: (y) => <Paginas paginas={paginas} f={f} entra={entra} x={x} y={y} />,
  };
}

/** Un objeto en la pila: ocupa su alto desde el principio (`siempre`) o desde que entra, en 8 fotogramas. */
export function piezaObjeto(f: number, entra: number, alto: number, espacio: number, dibuja: (y: number) => ReactNode, siempre = true): Pieza {
  const q = siempre ? 1 : anima(f, [entra, entra + 8], [0, 1], CURVAS.frena);
  return { alto: alto * q, presencia: q, espacio, dibuja };
}

export function Pila({ piezas, cy }: { readonly piezas: readonly Pieza[]; readonly cy: number }): ReactNode {
  const presentes = piezas.filter((p) => p.presencia > 0.001 || p.alto > 0.5);
  const total = presentes.reduce((s, p, i) => s + p.alto + (i > 0 ? p.espacio * p.presencia : 0), 0);
  let y = cy - total / 2;
  return (
    <>
      {presentes.map((p, i) => {
        if (i > 0) y += p.espacio * p.presencia;
        const aqui = y;
        y += p.alto;
        return <Trozo key={i}>{p.dibuja(aqui)}</Trozo>;
      })}
    </>
  );
}

function Trozo({ children }: { readonly children: ReactNode }): ReactNode {
  return <>{children}</>;
}
