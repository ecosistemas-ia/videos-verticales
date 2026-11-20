// Curvas, ruido y formas comunes a los estilos de marionetas (sombras, órganos). Sin JSX ni React: lo pueden cargar
// también los reglas.ts desde Node. Todo es determinista: el ruido sale de un hash, nunca de Math.random().

/** Recorta x al intervalo [a, b]. */
export function limitar(x: number, a = 0, b = 1): number {
  return Math.min(b, Math.max(a, x));
}

/** Mezcla lineal de a a b con k entre 0 y 1. */
export function mezclar(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Curva suave en S (smoothstep) de 0 a 1 entre los instantes desde y hasta. */
export function suave(t: number, desde = 0, hasta = 1): number {
  const x = limitar((t - desde) / Math.max(1e-6, hasta - desde));
  return x * x * (3 - 2 * x);
}

/** Entrada y salida en coseno, más blanda que la S. */
export function coseno(t: number, desde = 0, hasta = 1): number {
  const x = limitar((t - desde) / Math.max(1e-6, hasta - desde));
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

/** Acelera al principio (caída con gravedad). */
export function caida(t: number, desde = 0, hasta = 1): number {
  const x = limitar((t - desde) / Math.max(1e-6, hasta - desde));
  return x * x * x;
}

/** Sale disparado y se asienta con un pequeño rebote por encima de 1. */
export function elastico(t: number, desde = 0, hasta = 1): number {
  const x = limitar((t - desde) / Math.max(1e-6, hasta - desde));
  if (x === 0 || x === 1) return x;
  return 1 + 2 ** (-9 * x) * Math.sin((x * 7 - 0.75) * ((2 * Math.PI) / 3)) * 0.9;
}

/** Seno en grados por segundo: onda(t, 1.2) da 1,2 vueltas por segundo, entre -1 y 1. */
export function onda(t: number, hz: number, fase = 0): number {
  return Math.sin(2 * Math.PI * hz * t + fase);
}

/** Un número entre 0 y 1 para un entero y una semilla. */
export function hash(n: number, semilla = 0): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(semilla | 0, 0xc2b2ae35);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

/** Semilla numérica a partir de un texto (el nombre de un personaje, por ejemplo). */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Ruido suave entre -1 y 1: valores al azar en cada entero, unidos con una curva suave. */
export function ruido(t: number, semilla = 0): number {
  const i = Math.floor(t);
  const f = t - i;
  const k = f * f * (3 - 2 * f);
  return (mezclar(hash(i, semilla), hash(i + 1, semilla), k) - 0.5) * 2;
}

/** Ruido con dos octavas, más orgánico (temblor de una llama, viento). */
export function ruido2(t: number, semilla = 0): number {
  return ruido(t, semilla) * 0.7 + ruido(t * 2.7 + 13.1, semilla + 7) * 0.3;
}

/** Mezcla dos colores #RRGGBB; devuelve #RRGGBB. */
export function mezclarColor(a: string, b: string, k: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const c = (desp: number): number => Math.round(mezclar((na >> desp) & 255, (nb >> desp) & 255, limitar(k)));
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

/** Aclara (k > 0) u oscurece (k < 0) un color #RRGGBB. */
export function tono(color: string, k: number): string {
  return k >= 0 ? mezclarColor(color, '#FFFFFF', k) : mezclarColor(color, '#000000', -k);
}

/** Ángulo en grados a radianes. */
export const rad = (g: number): number => (g * Math.PI) / 180;

export interface Punto {
  readonly x: number;
  readonly y: number;
}

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/**
 * Trazo suave que pasa por todos los puntos (Catmull-Rom convertido a Bézier). Cerrado por defecto. Así se dibujan
 * siluetas orgánicas con solo listar los puntos del contorno.
 */
export function curva(entrada: readonly (readonly [number, number])[], cerrada = true, tension = 1): string {
  const puntos = cerrada ? horario(entrada) : entrada;
  const n = puntos.length;
  if (n < 2) return '';
  const p = (i: number): readonly [number, number] => (cerrada ? puntos[(i + n) % n] : puntos[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(p(0)[0])} ${r1(p(0)[1])}`;
  const tramos = cerrada ? n : n - 1;
  for (let i = 0; i < tramos; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += ` C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return cerrada ? `${d} Z` : d;
}

// Regla de relleno: todas las formas sólidas se trazan en el sentido de las agujas del reloj (en pantalla) y los
// agujeros al revés. Con el relleno «nonzero» de SVG, los sólidos que se pisan se suman y los agujeros restan, así
// que varias piezas pueden ir en un solo trazo. Un agujero tiene que caer dentro de un sólido.

/** Área con signo (positiva = sentido horario en pantalla, con y hacia abajo). */
function area(p: readonly (readonly [number, number])[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function horario(p: readonly (readonly [number, number])[]): readonly (readonly [number, number])[] {
  return area(p) < 0 ? [...p].reverse() : p;
}

function trazoRecto(puntos: readonly (readonly [number, number])[]): string {
  return `M${puntos.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`;
}

/** Polígono de rectas (para recortes con aristas, como las almenas o las hojas de pino). */
export function poligono(puntos: readonly (readonly [number, number])[]): string {
  return trazoRecto(horario(puntos));
}

/** Un agujero con forma de polígono (dentro de un sólido). */
export function agujeroPoligono(puntos: readonly (readonly [number, number])[]): string {
  return trazoRecto([...horario(puntos)].reverse());
}

/** Una elipse sólida. */
export function elipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${r1(cx - rx)} ${r1(cy)} a${r1(rx)} ${r1(ry)} 0 1 1 ${r1(2 * rx)} 0 a${r1(rx)} ${r1(ry)} 0 1 1 ${r1(-2 * rx)} 0 Z`;
}

/** Un agujero elíptico (dentro de un sólido). */
export function agujeroElipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${r1(cx - rx)} ${r1(cy)} a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0 a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0 Z`;
}

/** Un círculo sólido. */
export function circulo(cx: number, cy: number, r: number): string {
  return elipse(cx, cy, r, r);
}

/** Un agujero redondo (dentro de un sólido). */
export function agujeroCirculo(cx: number, cy: number, r: number): string {
  return agujeroElipse(cx, cy, r, r);
}

function puntosRombo(cx: number, cy: number, rx: number, ry: number): [number, number][] {
  return [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ];
}

/** Un rombo sólido. */
export function rombo(cx: number, cy: number, rx: number, ry: number): string {
  return poligono(puntosRombo(cx, cy, rx, ry));
}

/** Un calado en rombo, el típico de las marionetas de cuero (dentro de un sólido). */
export function agujeroRombo(cx: number, cy: number, rx: number, ry: number): string {
  return agujeroPoligono(puntosRombo(cx, cy, rx, ry));
}

/**
 * Un miembro que cuelga desde su pivote (0,0) hacia abajo (+y) hasta (0,largo), con los extremos redondeados y el
 * grosor que pasa de ancho0 a ancho1.
 */
export function capsula(largo: number, ancho0: number, ancho1: number): string {
  const a = ancho0 / 2;
  const b = ancho1 / 2;
  return (
    `M${r1(-a)} 0 A${r1(a)} ${r1(a)} 0 0 1 ${r1(a)} 0 L${r1(b)} ${r1(largo)} ` +
    `A${r1(b)} ${r1(b)} 0 0 1 ${r1(-b)} ${r1(largo)} Z`
  );
}

/**
 * Una banda de grosor variable a lo largo de una línea de puntos (cuerpo de serpiente, cola, cuello de dragón).
 * grosor(i) da el ancho en el punto i. Devuelve un trazo cerrado y suave.
 */
export function banda(espina: readonly Punto[], grosor: (i: number, n: number) => number): string {
  const n = espina.length;
  if (n < 2) return '';
  const izquierda: [number, number][] = [];
  const derecha: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = espina[Math.max(0, i - 1)];
    const b = espina[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const g = grosor(i, n) / 2;
    izquierda.push([espina[i].x + nx * g, espina[i].y + ny * g]);
    derecha.push([espina[i].x - nx * g, espina[i].y - ny * g]);
  }
  return curva([...izquierda, ...derecha.reverse()], true, 0.9);
}

/** Posiciones simples que entiende un guionista: izquierda, centro, derecha, fuera de cuadro o un número de 0 a 1. */
export const POSICIONES = ['fuera_izquierda', 'izquierda', 'centro_izquierda', 'centro', 'centro_derecha', 'derecha', 'fuera_derecha'] as const;
export type PosicionNombrada = (typeof POSICIONES)[number];
export type Posicion = PosicionNombrada | number;

const VALOR_POSICION: Record<PosicionNombrada, number> = {
  fuera_izquierda: -0.25,
  izquierda: 0.22,
  centro_izquierda: 0.36,
  centro: 0.5,
  centro_derecha: 0.64,
  derecha: 0.78,
  fuera_derecha: 1.25,
};

/** De una posición del guion a una fracción del ancho (puede salir de 0..1 si está fuera de cuadro). */
export function fraccionX(p: Posicion): number {
  return typeof p === 'number' ? p : VALOR_POSICION[p];
}
