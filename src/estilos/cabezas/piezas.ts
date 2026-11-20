// Las piezas con las que se arma el mundo: primitivas de three.js descritas como datos. Un decorado es una lista de
// piezas; el dibujo (Piezas.tsx) las pinta con sombreado de dibujo animado y su contorno de tinta.

export type V3 = readonly [number, number, number];

export type Forma = 'caja' | 'esfera' | 'cupula' | 'cilindro' | 'cono' | 'prisma' | 'capsula' | 'toro' | 'roca';

/**
 * Medidas por forma:
 * - caja: [ancho, alto, fondo]
 * - esfera, cupula, roca: [radio, (lados)]
 * - cilindro: [radio arriba, radio abajo, alto, (lados)]
 * - cono: [radio, alto, (lados)]
 * - prisma: [largo en x, alto, ancho en z] (tejado a dos aguas; la posición es el centro de su base)
 * - capsula: [radio, largo]
 * - toro: [radio, grosor]
 */
export interface Pieza {
  readonly f: Forma;
  readonly m: readonly number[];
  /** Clave de la paleta («tejado», «follaje»…), «acento» (color de la marca) o un color #RRGGBB. */
  readonly c: string;
  readonly p: V3;
  /** Giro en radianes, orden YXZ (el giro en Y se aplica el último, como si fuera del grupo). */
  readonly r?: V3;
  readonly s?: V3;
  /** Grosor de la tinta en píxeles (0 = sin contorno). Por defecto 3. */
  readonly g?: number;
  /** Proyecta sombra (por defecto, sí). */
  readonly sombra?: boolean;
  /** Sombreado suave en vez de facetado. */
  readonly liso?: boolean;
  /** Brillo propio (ventanas, fuego): se multiplica por la luz de la hora. */
  readonly brillo?: number;
}

type Extra = Partial<Omit<Pieza, 'f' | 'm' | 'c' | 'p'>>;

/** Caja apoyada en el suelo: (x, y, z) es el centro de su base. */
export const caja = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, o: Extra = {}): Pieza => ({
  f: 'caja',
  m: [w, h, d],
  c,
  p: [x, y + h / 2, z],
  ...o,
});
export const esfera = (r: number, c: string, x: number, y: number, z: number, o: Extra = {}): Pieza => ({ f: 'esfera', m: [r], c, p: [x, y, z], ...o });
/** Cilindro apoyado: (x, y, z) es el centro de su base. */
export const cilindro = (rt: number, rb: number, h: number, c: string, x: number, y: number, z: number, o: Extra = {}, lados = 14): Pieza => ({
  f: 'cilindro',
  m: [rt, rb, h, lados],
  c,
  p: [x, y + h / 2, z],
  ...o,
});
/** Cono apoyado: (x, y, z) es el centro de su base. */
export const cono = (r: number, h: number, c: string, x: number, y: number, z: number, o: Extra = {}, lados = 12): Pieza => ({
  f: 'cono',
  m: [r, h, lados],
  c,
  p: [x, y + h / 2, z],
  ...o,
});
export const prisma = (largo: number, alto: number, ancho: number, c: string, x: number, y: number, z: number, o: Extra = {}): Pieza => ({
  f: 'prisma',
  m: [largo, alto, ancho],
  c,
  p: [x, y, z],
  ...o,
});
export const roca = (r: number, c: string, x: number, y: number, z: number, o: Extra = {}): Pieza => ({ f: 'roca', m: [r], c, p: [x, y, z], ...o });

/** Gira un grupo de piezas alrededor de un punto (eje Y) y lo desplaza. */
export function colocar(piezas: readonly Pieza[], x: number, z: number, giro = 0, escala = 1, y = 0): Pieza[] {
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  return piezas.map((p) => {
    const px = p.p[0] * escala;
    const pz = p.p[2] * escala;
    const r = p.r ?? [0, 0, 0];
    const sc = p.s ?? [1, 1, 1];
    return {
      ...p,
      p: [x + px * c + pz * s, y + p.p[1] * escala, z - px * s + pz * c] as V3,
      r: [r[0], r[1] + giro, r[2]] as V3,
      s: [sc[0] * escala, sc[1] * escala, sc[2] * escala] as V3,
    };
  });
}

/** Un palo (cuerda, bauprés) entre dos puntos cualesquiera. Con orden YXZ: se inclina en X y se orienta en Y. */
export function palo(a: V3, b: V3, radio: number, c: string, o: Extra = {}): Pieza {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const largo = Math.hypot(dx, dy, dz);
  return {
    f: 'cilindro',
    m: [radio, radio, largo, 6],
    c,
    p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    r: [Math.acos(Math.max(-1, Math.min(1, dy / largo))), Math.atan2(dx, dz), 0],
    g: 1.5,
    sombra: false,
    ...o,
  };
}
