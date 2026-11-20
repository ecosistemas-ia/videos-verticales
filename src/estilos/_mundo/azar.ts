// Azar determinista para los mundos: el mismo número de semilla da siempre el mismo mundo, en cualquier pestaña del
// render y en cualquier computadora. Nada de Math.random(). Sin JSX: lo usan también las reglas que carga Node.

/** Generador mulberry32: rápido, 32 bits, suficiente para colocar casas y árboles. */
export function crearAzar(semilla: number): () => number {
  let a = (Math.floor(semilla) * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un número fijo entre 0 y 1 a partir de enteros (para lo que se calcula en cada fotograma). */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const entre = (az: () => number, a: number, b: number): number => a + (b - a) * az();
export const elegir = <T>(az: () => number, lista: readonly T[]): T => lista[Math.min(lista.length - 1, Math.floor(az() * lista.length))];
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
export const liso = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
/** Curva suave de entrada y salida, más marcada que liso (para la cámara). */
export const suave = (x: number): number => {
  const u = clamp01(x);
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
};
export const mezcla = (a: number, b: number, u: number): number => a + (b - a) * u;
