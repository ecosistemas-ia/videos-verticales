// El catálogo cerrado de decorados. Cada uno es un «puesto» del recorrido, centrado en (0, 0, 0): los personajes
// ocupan más o menos x ∈ [-2, 2], z ∈ [-2.5, 1]; la cámara mira desde +z. Todo está hecho con primitivas (piezas.ts) y
// colores de la paleta; el azar es determinista (random de Remotion con semilla).

import { random } from 'remotion';
import { caja, cilindro, colocar, cono, esfera, palo, prisma, roca, type Pieza, type V3 } from './piezas.ts';
import type { Decorado } from './reglas.ts';

export type Asiento = 'taburete' | 'trono' | 'silla' | 'tronco' | 'caja' | 'roca';

export interface DecoradoArmado {
  /** Piezas quietas. */
  readonly fijo: readonly Pieza[];
  /** Piezas que se mecen con los personajes (el barco). */
  readonly movil: readonly Pieza[];
  /** Altura del suelo donde pisan los personajes. */
  readonly suelo: number;
  /** Dónde se colocan: z de la fila de delante y de la del fondo, separación en x y la multitud. */
  readonly zona: { readonly frente: number; readonly fondo: number; readonly ancho: number; readonly multitudZ: number; readonly multitudAncho: number };
  readonly asiento: Asiento;
  readonly balanceo: boolean;
  readonly interior: boolean;
  /** Mitad del ancho del suelo propio (agua, arena): fuera de eso va el relleno del camino. */
  readonly borde: number;
  /** Un fuego encendido (luz cálida), en coordenadas del puesto. */
  readonly fuego: V3 | null;
  /** Piezas que se mueven con el tiempo (banderas, olas, llamas). */
  animado(t: number): Pieza[];
  /** Lo mismo, pero dentro de lo que se mece (la bandera del barco). */
  animadoMovil(t: number): Pieza[];
}

const PI = Math.PI;
const OSCURO = '#2A1E19';
const ZONA = { frente: 0.6, fondo: -1.7, ancho: 0.95, multitudZ: -3.4, multitudAncho: 3.4 };

// ── Piezas compuestas ────────────────────────────────────────────────────────────────────────────────────────────

export function arbol(x: number, z: number, s = 1, c1 = 'follaje', c2 = 'follaje2'): Pieza[] {
  return [
    cilindro(0.14 * s, 0.2 * s, 1.5 * s, 'tronco', x, 0, z, {}, 7),
    { f: 'esfera', m: [0.95 * s, 7], c: c1, p: [x, 1.95 * s, z] },
    { f: 'esfera', m: [0.62 * s, 7], c: c2, p: [x + 0.48 * s, 2.5 * s, z + 0.18 * s] },
  ];
}

export function pino(x: number, z: number, s = 1, c = 'follaje'): Pieza[] {
  return [
    cilindro(0.1 * s, 0.14 * s, 0.7 * s, 'tronco', x, 0, z, {}, 6),
    cono(1.0 * s, 1.5 * s, c, x, 0.5 * s, z, {}, 8),
    cono(0.8 * s, 1.3 * s, c, x, 1.2 * s, z, {}, 8),
    cono(0.55 * s, 1.1 * s, c, x, 1.9 * s, z, {}, 8),
  ];
}

export function arbusto(x: number, z: number, s = 1, c = 'follaje2'): Pieza[] {
  return [{ f: 'esfera', m: [0.6 * s, 7], c, p: [x, 0.25 * s, z], s: [1, 0.72, 1] }];
}

export function piedra(x: number, z: number, s = 1, c = 'piedra'): Pieza[] {
  return [roca(0.5 * s, c, x, 0.12 * s, z, { s: [1, 0.65, 0.85] })];
}

function casa(w: number, d: number, h: number, pared: string, tejado: string): Pieza[] {
  const piezas: Pieza[] = [
    caja(w, h, d, pared, 0, 0, 0),
    prisma(w + 0.5, h * 0.55, d + 0.5, tejado, 0, h, 0),
    caja(0.85, 1.4, 0.08, 'madera2', 0, 0, d / 2 + 0.03),
    caja(0.45, 1.1, 0.45, 'piedra2', w * 0.28, h + 0.15, -d * 0.12),
  ];
  for (const sx of [-1, 1]) {
    const x = sx * w * 0.3;
    piezas.push(caja(0.62, 0.62, 0.06, 'ventana', x, h * 0.42, d / 2 + 0.03, { brillo: 0.6, g: 2 }));
    piezas.push(caja(0.66, 0.07, 0.08, 'madera2', x, h * 0.42 + 0.28, d / 2 + 0.05, { g: 0 }));
    piezas.push(caja(0.07, 0.66, 0.08, 'madera2', x, h * 0.42 - 0.02, d / 2 + 0.05, { g: 0 }));
  }
  return piezas;
}

function valla(x1: number, x2: number, z: number): Pieza[] {
  const piezas: Pieza[] = [
    caja(x2 - x1, 0.09, 0.06, 'madera', (x1 + x2) / 2, 0.55, z, { g: 2 }),
    caja(x2 - x1, 0.09, 0.06, 'madera', (x1 + x2) / 2, 0.28, z, { g: 2 }),
  ];
  for (let x = x1; x <= x2 + 0.01; x += 1.1) piezas.push(caja(0.12, 0.85, 0.12, 'madera', x, 0, z, { g: 2 }));
  return piezas;
}

function mesa(x: number, z: number, w: number, d: number, h: number, c = 'madera'): Pieza[] {
  const piezas: Pieza[] = [caja(w, 0.12, d, c, x, h, z)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) piezas.push(caja(0.1, h, 0.1, 'madera2', x + sx * (w / 2 - 0.12), 0.12, z + sz * (d / 2 - 0.12), { g: 2 }));
  return piezas;
}

/** Bandera que ondea: el paño son tres tramos encadenados con giros desfasados. */
export function bandera(t: number, x: number, y: number, z: number, c: string, fase = 0, escala = 1): Pieza[] {
  const piezas: Pieza[] = [];
  let px = x;
  let pz = z;
  let angulo = 0;
  for (let k = 0; k < 3; k++) {
    angulo += 0.28 * Math.sin(t * 5.2 - k * 1.1 + fase);
    const largo = 0.34 * escala;
    const cx = px + (Math.cos(angulo) * largo) / 2;
    const cz = pz - (Math.sin(angulo) * largo) / 2;
    piezas.push({ f: 'caja', m: [largo + 0.01, 0.52 * escala, 0.03], c, p: [cx, y, cz], r: [0, angulo, 0], g: 2, sombra: false });
    px += Math.cos(angulo) * largo;
    pz -= Math.sin(angulo) * largo;
  }
  return piezas;
}

function suelo(w: number, d: number, c: string, x: number, z: number, g = 0): Pieza {
  return caja(w, 0.03, d, c, x, 0, z, { g, sombra: false });
}

function interior(c: string, baldosa: string | null): Pieza[] {
  const piezas: Pieza[] = [
    caja(14, 0.12, 22, c, 0, 0, 4, { g: 2, sombra: false }),
    caja(14.6, 9, 0.3, 'muroInterior', 0, 0, -6.6, { sombra: false }),
    caja(0.3, 9, 8, 'muroInterior', -7.15, 0, -2.8, { sombra: false }),
    caja(0.3, 9, 8, 'muroInterior', 7.15, 0, -2.8, { sombra: false }),
    caja(14, 0.45, 0.1, 'madera2', 0, 0.12, -6.42, { g: 2, sombra: false }),
  ];
  if (baldosa !== null) {
    for (let i = -6; i < 6; i++) {
      for (let j = -6; j < 4; j++) {
        if ((i + j) % 2 === 0) piezas.push(caja(0.97, 0.012, 0.97, baldosa, i + 0.5, 0.12, j + 0.5, { g: 0, sombra: false }));
      }
    }
  }
  return piezas;
}

function montana(x: number, z: number, r: number, h: number, nieve: number): Pieza[] {
  return [
    cono(r, h, 'piedra2', x, 0, z, {}, 7),
    cono(r * nieve * 1.05, h * nieve * 1.03, 'nieve', x, h * (1 - nieve) - 0.02 * h, z, { g: 2 }, 7),
  ];
}

function barcoLejano(x: number, z: number, s: number, giro: number): Pieza[] {
  return colocar(
    [
      caja(7, 1.4, 3, 'madera2', 0, -0.4, 0),
      caja(2.2, 1.4, 2.2, 'madera2', 3.2, -0.4, 0, { r: [0, PI / 4, 0] }),
      cilindro(0.1, 0.14, 6.5, 'madera2', 1.2, 1, 0, {}, 6),
      caja(2.8, 2.4, 0.06, 'pared', 1.2, 3.4, 0.15),
      caja(2.2, 1.5, 0.06, 'pared', 1.2, 6.0, 0.15),
    ],
    x,
    z,
    giro,
    s,
  );
}

function palmera(x: number, z: number, s: number): Pieza[] {
  const piezas: Pieza[] = [];
  for (let k = 0; k < 4; k++) {
    piezas.push({ f: 'cilindro', m: [0.13 * s, 0.16 * s, 0.8 * s, 7], c: 'tronco', p: [x + k * 0.13 * s, (0.4 + k * 0.72) * s, z], r: [0, 0, -0.14] });
  }
  const tope: V3 = [x + 0.5 * s, 3.05 * s, z];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * PI * 2 + 0.3;
    piezas.push({
      f: 'cono',
      m: [0.32 * s, 1.9 * s, 4],
      c: k % 2 === 0 ? 'follaje' : 'follaje2',
      p: [tope[0] + Math.cos(a) * 0.85 * s, tope[1] - 0.22 * s, tope[2] - Math.sin(a) * 0.85 * s],
      r: [0, a, -(PI / 2 + 0.38)],
      s: [1, 1, 0.28],
      g: 2,
    });
  }
  piezas.push(esfera(0.22 * s, 'tronco', tope[0], tope[1], tope[2]));
  return piezas;
}

function tienda(x: number, z: number, giro: number, s = 1): Pieza[] {
  return colocar(
    [
      prisma(2.8, 2.0, 2.7, 'pared2', 0, 0, 0, { r: [0, PI / 2, 0] }),
      prisma(0.06, 1.25, 1.1, '#5A4636', 0, 0, 1.41, { r: [0, PI / 2, 0], g: 0 }),
      cilindro(0.04, 0.04, 2.3, 'madera2', 0, 0, 1.45, { g: 1.5 }, 6),
    ],
    x,
    z,
    giro,
    s,
  );
}

function fila<T>(n: number, f: (i: number) => T[]): T[] {
  const r: T[] = [];
  for (let i = 0; i < n; i++) r.push(...f(i));
  return r;
}

const alAzar = (semilla: string, a: number, b: number): number => a + (b - a) * random(semilla);

/** Matas, flores o piedrecitas delante de los personajes: el desenfoque las convierte en profundidad. */
function primerPlano(semilla: string, tipo: 'pasto' | 'piedras', color = 'piedra2'): Pieza[] {
  const piezas: Pieza[] = [];
  for (let i = 0; i < 20; i++) {
    const x = alAzar(`${semilla}-x-${i}`, -3.8, 3.8);
    const z = alAzar(`${semilla}-z-${i}`, 1.7, 5.4);
    if (Math.abs(x) < 1.6 && z < 2.8) continue;
    const r = random(`${semilla}-t-${i}`);
    if (tipo === 'piedras') {
      piezas.push(roca(0.1 + 0.14 * r, color, x, 0.03, z, { g: 1.5, sombra: false, s: [1, 0.6, 0.9] }));
    } else if (r < 0.75) {
      // Matojo: tres hojas finas abiertas en abanico.
      for (let k = -1; k <= 1; k++) {
        piezas.push(cono(0.035, 0.22 + 0.12 * r - Math.abs(k) * 0.05, 'pasto2', x + k * 0.05, 0, z, { r: [0, 0, -k * 0.35], g: 1.2, sombra: false }, 4));
      }
    } else {
      // Flores bajas: un puñado de bolitas a ras de suelo.
      const c = ['tela', 'pared', 'tejado'][i % 3];
      for (let k = 0; k < 3; k++) piezas.push(esfera(0.045, c, x + (k - 1) * 0.08, 0.06 + (k % 2) * 0.04, z + (k % 2) * 0.06, { g: 1.2, sombra: false }));
    }
  }
  return piezas;
}

// ── Decorados ────────────────────────────────────────────────────────────────────────────────────────────────────

function base(): Omit<DecoradoArmado, 'fijo'> {
  return { movil: [], suelo: 0, zona: ZONA, asiento: 'tronco', balanceo: false, interior: false, borde: 13, fuego: null, animado: () => [], animadoMovil: () => [] };
}

function campo(): DecoradoArmado {
  const fijo: Pieza[] = [
    suelo(12, 10, 'tierra', 0.5, -10, 2),
    ...fila(7, (r) =>
      fila(10, (k) => [{ f: 'esfera', m: [0.34, 7], c: k % 3 === 0 ? 'follaje2' : 'follaje', p: [-4.3 + k * 1.0 + (r % 2) * 0.5, 0.2, -5.7 - r * 1.25], s: [1, 0.8, 1], g: 2 } as Pieza]),
    ),
    ...colocar(casa(4.4, 3.8, 3.0, 'tejado', 'madera2'), 6.4, -12, -0.35),
    cilindro(1.05, 1.05, 5.2, 'metal', 9.6, 0, -15, {}, 12),
    { f: 'cupula', m: [1.08], c: 'tejado2', p: [9.6, 5.2, -15] },
    cilindro(0.65, 0.72, 0.9, 'tela', -4.7, 0, -3.8, {}, 10),
    cilindro(0.55, 0.62, 0.75, 'tela', -5.9, 0, -5.4, {}, 10),
    ...valla(-7.2, -2.3, -3.1),
    ...valla(2.3, 7.2, -3.1),
    ...arbol(4.5, -3.8, 1.15),
    ...fila(9, (i) => pino(-11 + i * 2.8, -20 - (i % 2) * 2, 1.3)),
    ...[
      [-2.6, 3.2],
      [-2.2, 3.7],
      [2.5, 3.4],
      [2.9, 2.9],
      [-3.1, 2.5],
    ].map(([x, z]) => cono(0.12, 0.5, 'pasto2', x, 0, z, { g: 2 }, 5)),
  ];
  return { ...base(), fijo: [...fijo, ...primerPlano('campo', 'pasto')], asiento: 'caja' };
}

function casaDecorado(): DecoradoArmado {
  const flores: Pieza[] = fila(8, (i) => [esfera(0.1, ['tejado', 'tela', 'tela2', 'pared'][i % 4], 0.9 + i * 0.62, 0.62, -4.1, { g: 1.5 })]);
  const fijo: Pieza[] = [
    suelo(1.5, 5, 'camino', 0, -3.2, 2),
    ...colocar(casa(5.2, 3.8, 3.3, 'pared', 'tejado'), 0, -7.4),
    ...colocar(casa(3.6, 3.2, 2.8, 'pared2', 'tejado2'), 6.2, -10.5, -0.45),
    ...colocar(casa(3.4, 3.0, 2.6, 'pared3', 'tejado'), -7.2, -12.5, 0.45),
    ...valla(-7, -1.1, -3.6),
    ...valla(1.1, 6.6, -3.6),
    ...arbol(-4.9, -5.9, 1.25),
    ...arbol(9, -8, 1.1),
    ...arbusto(2.2, -4.3, 1),
    ...arbusto(3.4, -4.5, 0.85),
    ...arbusto(4.6, -4.4, 0.9),
    ...flores,
    ...fila(7, (i) => pino(-12 + i * 4, -22, 1.4)),
    ...arbusto(-2.9, 3.0, 0.75),
    ...piedra(2.8, 3.3, 0.7),
  ];
  return { ...base(), fijo: [...fijo, ...primerPlano('casa', 'pasto')], asiento: 'taburete' };
}

function castillo(): DecoradoArmado {
  const fijo: Pieza[] = [
    suelo(2.8, 10, 'camino', 0, -6, 2),
    caja(17, 4.6, 1.6, 'piedra', 0, 0, -11.5),
    ...fila(13, (i) => [caja(0.75, 0.6, 1.6, 'piedra', -8.2 + i * 1.37, 4.6, -11.5)]),
    caja(2.6, 3.0, 0.15, 'madera2', 0, 0, -10.65),
    { f: 'cilindro', m: [1.3, 1.3, 0.15, 16], c: 'madera2', p: [0, 3.0, -10.66], r: [PI / 2, 0, 0] },
    ...[-1, 1].flatMap((sx) => [
      cilindro(1.75, 1.95, 8, 'piedra2', sx * 8.5, 0, -11.5, {}, 12),
      cono(2.3, 3.2, 'tejado', sx * 8.5, 8, -11.5, {}, 12),
      caja(0.4, 0.8, 0.1, OSCURO, sx * 8.5, 5.2, -9.62, { g: 0 }),
      cilindro(0.05, 0.05, 1.6, 'madera2', sx * 8.5, 11.2, -11.5, { g: 1.5 }, 6),
      caja(1.0, 2.2, 0.06, 'acento', sx * 3.2, 1.6, -10.67, { g: 2 }),
      esfera(0.2, 'dorado', sx * 3.2, 2.9, -10.62, { s: [1, 1, 0.3], g: 1.5 }),
      cilindro(0.05, 0.06, 0.8, 'madera2', sx * 1.8, 2.0, -10.5, { g: 1.5 }, 6),
      esfera(0.16, '#FFB347', sx * 1.8, 2.9, -10.5, { brillo: 1.2, g: 1.5 }),
    ]),
    caja(6, 9.5, 4.5, 'piedra', 2.5, 0, -16),
    prisma(6.6, 3.2, 5.1, 'tejado2', 2.5, 9.5, -16),
    ...[1.3, 2.5, 3.7].map((x) => caja(0.5, 1, 0.1, OSCURO, x, 6.5, -13.72, { g: 0 })),
    cilindro(1.3, 1.4, 12, 'piedra2', -3.5, 0, -18, {}, 12),
    cono(1.7, 3, 'tejado', -3.5, 12, -18, {}, 12),
    ...arbusto(-4.5, -8.2, 1.1),
    ...arbusto(5, -8.6, 1),
    ...arbusto(-6.2, -7.6, 0.8),
    ...piedra(3.4, 2.8, 0.75),
    ...arbusto(-3.2, 3.4, 0.7),
    ...fila(9, (i) => pino(-16 + i * 4, -25 - (i % 3), 1.5)),
  ];
  return {
    ...base(),
    fijo: [...fijo, ...primerPlano('castillo', 'pasto')],
    asiento: 'taburete',
    animado: (t) => [...bandera(t, 8.5, 12.45, -11.5, 'acento', 0), ...bandera(t, -8.5, 12.45, -11.5, 'acento', 1.7)],
  };
}

function bosque(): DecoradoArmado {
  const arboles: Pieza[] = [];
  for (let fila = 0; fila < 5; fila++) {
    for (let k = 0; k < 9; k++) {
      const semilla = `bosque-${fila}-${k}`;
      const x = -10.5 + k * 2.6 + alAzar(`${semilla}-x`, -0.8, 0.8);
      const z = -4.6 - fila * 3.1 + alAzar(`${semilla}-z`, -0.8, 0.8);
      if (fila === 0 && Math.abs(x) < 1.6) continue;
      const s = alAzar(`${semilla}-s`, 0.95, 1.45);
      arboles.push(...(random(`${semilla}-t`) < 0.55 ? pino(x, z, s * 1.15) : arbol(x, z, s, fila % 2 === 0 ? 'follaje' : 'follaje2', 'follaje')));
    }
  }
  const fijo: Pieza[] = [
    suelo(30, 26, 'pasto2', 0, -9),
    ...arboles,
    ...pino(-3.4, -1.2, 1.3),
    ...arbol(3.6, -0.8, 1.2),
    ...pino(-2.6, 3.4, 1.0),
    ...arbol(2.8, 3.8, 0.9),
    { f: 'cilindro', m: [0.24, 0.26, 2.2, 8], c: 'tronco', p: [2.6, 0.24, -3.0], r: [0, 0.3, PI / 2] },
    ...piedra(-2.4, -3.2, 1.1, 'piedra2'),
    ...piedra(3.0, 1.6, 0.6),
    ...[
      [-1.9, 1.6],
      [-1.6, 1.9],
      [1.8, -2.6],
    ].flatMap(([x, z]) => [cilindro(0.05, 0.07, 0.2, 'pared', x, 0, z, { g: 1.5 }, 6), { f: 'cupula', m: [0.14], c: 'tejado', p: [x, 0.2, z], g: 1.5 } as Pieza]),
    ...arbusto(-3.4, 1.2, 0.8),
    ...arbusto(3.2, -2.2, 0.9),
  ];
  return { ...base(), fijo: [...fijo, ...primerPlano('bosque', 'pasto')], asiento: 'tronco' };
}

function calle(): DecoradoArmado {
  const fijo: Pieza[] = [suelo(6.2, 70, 'piedra2', 0, -30), caja(2, 0.16, 70, 'piedra', -4.1, 0, -30, { g: 2, sombra: false }), caja(2, 0.16, 70, 'piedra', 4.1, 0, -30, { g: 2, sombra: false })];
  const colores = ['pared', 'pared2', 'pared3', 'pared2'];
  for (let k = 0; k < 9; k++) {
    for (const s of [-1, 1]) {
      const z = 3 - k * 5.6;
      const x = s * 7.0;
      const h = 5 + 4.5 * random(`calle-${k}-${s}`);
      const color = colores[(k + (s > 0 ? 1 : 0)) % colores.length];
      fijo.push(caja(3.8, h, 5.4, color, x, 0, z));
      fijo.push(caja(4.2, 0.3, 5.8, 'madera2', x, h, z));
      fijo.push(caja(0.06, 1.5, 0.9, 'madera2', s * 5.08, 0.16, z, { g: 2 }));
      fijo.push(caja(0.6, 0.08, 1.5, k % 2 === 0 ? 'tela' : 'tejado', s * 4.82, 1.95, z, { r: [0, 0, s * 0.35], g: 2 }));
      for (let y = 2.8; y < h - 0.9; y += 1.6) {
        for (const dz of [-1.4, 1.4]) fijo.push(caja(0.06, 0.9, 0.75, 'ventana', s * 5.08, y, z + dz, { brillo: 0.55, g: 2 }));
      }
    }
  }
  for (let k = 0; k < 6; k++) {
    for (const s of [-1, 1]) {
      const z = 1.5 - k * 8;
      fijo.push(cilindro(0.06, 0.08, 3.4, '#3A3A3A', s * 3.6, 0.16, z, { g: 2 }, 8));
      fijo.push(caja(0.34, 0.42, 0.34, '#3A3A3A', s * 3.6, 3.5, z, { g: 2 }));
      fijo.push(esfera(0.15, 'ventana', s * 3.6, 3.72, z, { brillo: 1.1, g: 0 }));
    }
  }
  fijo.push(caja(4, 12, 4, 'pared2', 0, 0, -50), cono(3.2, 4.5, 'tejado', 0, 12, -50, { r: [0, PI / 4, 0] }, 4));
  fijo.push(cilindro(0.35, 0.35, 0.8, 'madera', -2.5, 0, 3.4, {}, 10), caja(0.6, 0.6, 0.6, 'madera', 2.6, 0, 3.0, { r: [0, 0.4, 0] }));
  return { ...base(), fijo, asiento: 'caja', borde: 14 };
}

function laboratorio(): DecoradoArmado {
  const liquidos = ['follaje2', 'tela2', 'tejado', 'tela'];
  const fijo: Pieza[] = [
    ...interior('sueloInterior', 'piedra'),
    ...[2.0, 3.2].flatMap((y) => [
      caja(3.6, 0.12, 0.6, 'madera', -3.6, y, -6.15),
      ...fila(6, (k) => [cilindro(0.11, 0.14, 0.45, liquidos[(k + Math.round(y)) % 4], -5.0 + k * 0.56, y + 0.12, -6.12, { brillo: 0.4, g: 2 }, 8)]),
    ]),
    caja(3.8, 2.2, 0.1, '#2F4A3A', 2.6, 1.8, -6.4),
    caja(4.0, 0.14, 0.16, 'madera', 2.6, 1.72, -6.36, { g: 2 }),
    caja(4.0, 0.14, 0.16, 'madera', 2.6, 3.98, -6.36, { g: 2 }),
    ...[
      [1.5, 3.5, 1.6],
      [2.9, 3.5, 0.8],
      [1.9, 3.0, 2.2],
      [3.3, 2.5, 1.4],
      [1.6, 2.1, 1.0],
    ].map(([x, y, w]) => caja(w, 0.06, 0.02, 'pared', x, y, -6.34, { g: 0 })),
    ...mesa(-4.3, -3.0, 2.6, 1.2, 1.0),
    cono(0.24, 0.42, '#BFE3F0', -4.9, 1.12, -3.0, { brillo: 0.2, g: 2 }, 10),
    cilindro(0.07, 0.07, 0.3, '#BFE3F0', -4.9, 1.5, -3.0, { g: 2 }, 8),
    cono(0.17, 0.22, 'follaje2', -4.9, 1.13, -2.9, { brillo: 1.1, g: 0 }, 10),
    cilindro(0.2, 0.24, 0.1, 'metal', -3.7, 1.12, -3.1, {}, 10),
    caja(0.12, 0.6, 0.12, 'metal', -3.7, 1.2, -3.25, { r: [0.25, 0, 0] }),
    cilindro(0.07, 0.07, 0.4, 'metal', -3.7, 1.55, -3.05, { r: [0.5, 0, 0] }, 8),
    ...mesa(4.4, -2.7, 2.2, 1.1, 1.0),
    esfera(0.36, 'tela2', 4.2, 1.48, -2.7, { brillo: 1.0, liso: true }),
    cilindro(0.08, 0.08, 0.3, '#BFE3F0', 4.2, 1.8, -2.7, { g: 2 }, 8),
    caja(0.5, 0.12, 0.4, 'tejado', 4.95, 1.12, -2.6, { g: 2 }),
    caja(0.5, 0.12, 0.4, 'tela2', 4.95, 1.24, -2.6, { r: [0, 0.2, 0], g: 2 }),
    ...[-2.5, 2.5].flatMap((x) => [
      cilindro(0.015, 0.015, 2.2, '#3A3A3A', x, 6.3, -2, { g: 0, sombra: false }, 4),
      cono(0.45, 0.35, 'metal', x, 5.95, -2, { sombra: false }, 12),
      esfera(0.13, 'ventana', x, 5.95, -2, { brillo: 1.2, g: 0, sombra: false }),
    ]),
  ];
  return { ...base(), fijo, suelo: 0.12, asiento: 'taburete', interior: true };
}

function barco(): DecoradoArmado {
  const fijo: Pieza[] = [
    caja(44, 0.05, 100, 'agua', 0, 0, -30, { g: 0, sombra: false }),
    ...barcoLejano(-11, -24, 0.55, 0.3),
    ...barcoLejano(13, -36, 0.5, -0.2),
    { f: 'esfera', m: [9, 8], c: 'pasto2', p: [20, -2, -72], s: [1.8, 0.4, 0.8] },
    ...pino(17, -70, 2.2),
    ...pino(21, -69, 2.6),
  ];
  // Quilla a lo largo de z, con la proa hacia la cámara: en 9:16 el barco cabe, y las velas quedan de fondo.
  const casco: Pieza[] = [
    caja(3.4, 1.5, 7.6, 'madera2', 0, -0.45, -0.4),
    caja(2.4, 1.5, 2.4, 'madera2', 0, -0.45, 3.4, { r: [0, PI / 4, 0] }),
    caja(3.42, 0.18, 7.62, 'dorado', 0, 0.5, -0.4, { g: 2 }),
    caja(2.42, 0.18, 2.42, 'dorado', 0, 0.5, 3.4, { r: [0, PI / 4, 0], g: 2 }),
    ...fila(6, (k) => [-1, 1].map((sx) => caja(0.04, 0.32, 0.42, OSCURO, sx * 1.72, 0.05, -3.4 + k * 1.15, { g: 0 }))),
    caja(3.2, 0.1, 7.5, 'madera', 0, 1.02, -0.4, { g: 2 }),
    caja(2.2, 0.1, 2.2, 'madera', 0, 1.02, 3.4, { r: [0, PI / 4, 0], g: 2 }),
    caja(0.1, 0.4, 7.5, 'madera2', -1.62, 1.12, -0.4, { g: 2 }),
    caja(0.1, 0.4, 7.5, 'madera2', 1.62, 1.12, -0.4, { g: 2 }),
    caja(0.1, 0.35, 2.3, 'madera2', 0.85, 1.12, 4.25, { r: [0, -PI / 4, 0], g: 2 }),
    caja(0.1, 0.35, 2.3, 'madera2', -0.85, 1.12, 4.25, { r: [0, PI / 4, 0], g: 2 }),
    palo([0, 1.35, 4.9], [0, 2.5, 7.3], 0.07, 'madera2', { g: 2 }),
    caja(3.2, 1.5, 1.9, 'madera', 0, 1.12, -3.25),
    caja(3.4, 0.12, 2.1, 'madera2', 0, 2.62, -3.25),
    ...[-0.75, 0.75].map((x) => caja(0.45, 0.45, 0.05, 'ventana', x, 1.6, -2.28, { brillo: 0.6, g: 2 })),
    caja(0.6, 1.05, 0.05, 'madera2', 0, 1.12, -2.28, { g: 2 }),
    cilindro(0.12, 0.16, 8.3, 'madera2', 0, 1.12, -1.6, {}, 8),
    { f: 'cilindro', m: [0.06, 0.06, 3.7, 6], c: 'madera2', p: [0, 6.75, -1.47], r: [0, 0, PI / 2], g: 1.5 },
    { f: 'cilindro', m: [0.05, 0.05, 3.0, 6], c: 'madera2', p: [0, 8.55, -1.47], r: [0, 0, PI / 2], g: 1.5 },
    caja(3.3, 2.7, 0.06, 'pared', 0, 3.98, -1.45),
    caja(2.7, 1.55, 0.06, 'pared', 0, 6.92, -1.45),
    { f: 'cilindro', m: [0.5, 0.5, 0.02, 20], c: 'acento', p: [0, 5.35, -1.41], r: [PI / 2, 0, 0], g: 1.5 },
    cilindro(0.09, 0.12, 4.4, 'madera2', 0, 2.68, -3.5, {}, 8),
    caja(2.3, 1.8, 0.06, 'pared', 0, 3.75, -3.38),
    { f: 'cilindro', m: [0.05, 0.05, 2.5, 6], c: 'madera2', p: [0, 5.6, -3.4], r: [0, 0, PI / 2], g: 1.5 },
    caja(0.55, 0.55, 0.55, 'madera', -1.05, 1.12, -1.95),
    cilindro(0.28, 0.28, 0.65, 'madera2', 1.1, 1.12, 2.3, {}, 10),
  ];
  const giro = -0.32;
  const movil = colocar(casco, 0, 0, giro);
  const olas: Array<[number, number, number]> = fila(30, (i) => [[alAzar(`ola-x-${i}`, -18, 18), alAzar(`ola-z-${i}`, -40, 6), alAzar(`ola-f-${i}`, 0, 6)] as [number, number, number]]);
  return {
    ...base(),
    fijo,
    movil,
    suelo: 1.12,
    zona: { frente: 0.7, fondo: -0.55, ancho: 0.8, multitudZ: -1.0, multitudAncho: 1.25 },
    asiento: 'caja',
    balanceo: true,
    borde: 21,
    animado: (t) => [
      ...olas.map(([x, z, f]) => ({
        f: 'esfera' as const,
        m: [0.5, 6],
        c: '#EAF6FA',
        p: [x + ((t * 0.35 + f) % 3) - 1.5, 0.05, z] as V3,
        s: [1.6, 0.08, 0.35 + 0.15 * Math.sin(t * 1.5 + f)] as V3,
        g: 0,
        sombra: false,
      })),
    ],
    animadoMovil: (t) => colocar(bandera(t, 0, 9.65, -1.6, 'acento', 0, 0.9), 0, 0, giro),
  };
}

function montanaDecorado(): DecoradoArmado {
  const fijo: Pieza[] = [
    suelo(26, 24, 'piedra', 0, -9),
    ...montana(-7, -26, 9, 15, 0.32),
    ...montana(8, -36, 12, 21, 0.3),
    ...montana(-18, -40, 10, 16, 0.3),
    ...montana(20, -30, 7, 10, 0.36),
    ...montana(1, -55, 15, 26, 0.28),
    { f: 'esfera', m: [5, 8], c: 'pasto2', p: [-9, -1.5, -14], s: [1.4, 0.6, 1] },
    { f: 'esfera', m: [6, 8], c: 'pasto2', p: [10, -2, -16], s: [1.4, 0.55, 1] },
    ...fila(10, (i) => pino(-11 + i * 2.4 + alAzar(`mp-${i}`, -0.6, 0.6), -8 - (i % 3) * 2.2, 1.1 + 0.3 * random(`mps-${i}`))),
    roca(1.15, 'piedra2', -3.9, 0.5, -3.1, { s: [1.1, 0.9, 1] }),
    roca(0.8, 'piedra2', 3.7, 0.35, -2.3),
    ...piedra(2.4, 3.3, 0.8),
    ...piedra(-2.7, 3.5, 0.9, 'piedra2'),
    cilindro(0.06, 0.06, 1.4, 'madera', 2.7, 0, -1.4, { g: 2 }, 6),
    caja(0.85, 0.26, 0.05, 'madera', 2.95, 1.05, -1.4, { r: [0, 0, -0.1], g: 2 }),
  ];
  return { ...base(), fijo: [...fijo, ...primerPlano('montana', 'piedras')], asiento: 'roca', borde: 13 };
}

function palacio(): DecoradoArmado {
  const fijo: Pieza[] = [
    ...interior('piedra', 'pared'),
    caja(2.4, 0.02, 18, 'alfombra', 0, 0.12, 2, { g: 1.5, sombra: false }),
    caja(0.1, 0.024, 18, 'dorado', -1.2, 0.12, 2, { g: 0, sombra: false }),
    caja(0.1, 0.024, 18, 'dorado', 1.2, 0.12, 2, { g: 0, sombra: false }),
    ...[-5.6, -3.2, 3.2, 5.6].flatMap((x) => [
      caja(1.0, 0.35, 1.0, 'pared2', x, 0.12, -4.8),
      cilindro(0.36, 0.4, 6.6, 'pared', x, 0.47, -4.8, {}, 12),
      caja(1.0, 0.4, 1.0, 'pared2', x, 7.07, -4.8),
    ]),
    ...[-3.6, 3.6].flatMap((x) => [cilindro(0.36, 0.4, 7.5, 'pared', x, 0.12, 3.4, {}, 12), caja(1.0, 0.35, 1.0, 'pared2', x, 0.12, 3.4)]),
    ...[-1.9, 1.9].flatMap((x) => [
      caja(1.2, 3.6, 0.06, 'alfombra', x, 3.2, -6.42),
      esfera(0.26, 'dorado', x, 5.0, -6.36, { s: [1, 1, 0.3], g: 1.5 }),
      { f: 'cilindro', m: [0.05, 0.05, 1.5, 6], c: 'dorado', p: [x, 6.85, -6.38], r: [0, 0, PI / 2], g: 1.5 } as Pieza,
    ]),
    ...[-4.4, 4.4].flatMap((x) => [
      caja(1.2, 3.2, 0.06, 'ventana', x, 2.6, -6.43, { brillo: 0.7, g: 2 }),
      { f: 'cilindro', m: [0.6, 0.6, 0.06, 16], c: 'ventana', p: [x, 5.8, -6.43], r: [PI / 2, 0, 0], brillo: 0.7, g: 2 } as Pieza,
    ]),
    caja(3.4, 0.25, 2.2, 'pared2', 0, 0.12, -5.3),
    caja(1.5, 0.6, 1.2, 'alfombra', 0, 0.37, -5.3),
    caja(1.6, 2.8, 0.3, 'dorado', 0, 0.37, -5.95),
    esfera(0.3, 'dorado', 0, 3.3, -5.95),
    ...[-0.85, 0.85].map((x) => caja(0.25, 0.4, 1.2, 'dorado', x, 0.97, -5.3)),
    { f: 'toro', m: [1.0, 0.07], c: 'dorado', p: [0, 6.8, -2], r: [PI / 2, 0, 0], sombra: false },
    cilindro(0.02, 0.02, 2.2, 'dorado', 0, 6.8, -2, { g: 0, sombra: false }, 4),
    ...fila(6, (i) => [esfera(0.09, 'ventana', Math.cos((i / 6) * PI * 2), 6.95, -2 - Math.sin((i / 6) * PI * 2), { brillo: 1.2, g: 0, sombra: false })]),
  ];
  return { ...base(), fijo, suelo: 0.12, asiento: 'trono', interior: true };
}

function desierto(): DecoradoArmado {
  const fijo: Pieza[] = [
    caja(42, 0.03, 80, 'arena', 0, 0, -25, { g: 0, sombra: false }),
    ...[
      [-12, -16, 6],
      [10, -20, 7],
      [-2, -30, 6],
      [16, -42, 9],
      [-18, -38, 8],
    ].map(([x, z, r]) => ({ f: 'esfera', m: [r, 14], c: 'arena', p: [x, -r * 0.3, z], s: [1.8, 0.55, 1], liso: true, g: 2 }) as Pieza),
    cono(9, 11, 'pared2', -7, 0, -40, { r: [0, PI / 4, 0] }, 4),
    cono(6.5, 8, 'pared2', 6, 0, -31, { r: [0, PI / 4, 0] }, 4),
    cono(3.5, 4.5, 'pared3', 13, 0, -26, { r: [0, PI / 4, 0] }, 4),
    ...palmera(-3.8, -3.4, 1.2),
    ...palmera(4.0, -5.2, 1.35),
    ...palmera(-6.5, -8.5, 1.0),
    ...palmera(2.9, 3.6, 0.8),
    ...piedra(-2.6, -2.4, 0.8, 'pared3'),
    ...piedra(3.2, -1.2, 0.6, 'pared3'),
    ...arbusto(-3.0, -2.6, 0.6, 'follaje'),
  ];
  return { ...base(), fijo: [...fijo, ...primerPlano('desierto', 'piedras', 'pared3')], asiento: 'roca', borde: 21 };
}

function oficina(): DecoradoArmado {
  const libros = ['tejado', 'tela2', 'tela', 'follaje', 'pared3', 'alfombra'];
  const fijo: Pieza[] = [
    ...interior('piedra', null),
    caja(5.8, 3.4, 0.06, 'ventana', 1.6, 1.8, -6.43, { brillo: 0.55, g: 2 }),
    ...[
      [-0.5, 1.4],
      [0.3, 2.3],
      [1.1, 1.2],
      [1.9, 2.8],
      [2.7, 1.7],
      [3.5, 2.2],
      [4.2, 1.1],
    ].map(([x, h]) => caja(0.75, h, 0.02, 'tela2', x, 1.8, -6.39, { g: 0, sombra: false })),
    ...[-1.25, 0.2, 1.6, 3.0, 4.45].map((x) => caja(0.1, 3.5, 0.1, 'madera2', x, 1.75, -6.38, { g: 1.5, sombra: false })),
    ...[1.75, 5.2].map((y) => caja(5.9, 0.1, 0.1, 'madera2', 1.6, y, -6.38, { g: 1.5, sombra: false })),
    ...mesa(-3.4, -3.0, 2.8, 1.3, 0.85),
    caja(1.15, 0.72, 0.07, '#2A2F3A', -3.4, 1.17, -3.3),
    caja(1.0, 0.6, 0.02, 'tela2', -3.4, 1.23, -3.26, { brillo: 1.1, g: 0 }),
    caja(0.1, 0.25, 0.1, '#2A2F3A', -3.4, 0.97, -3.3),
    caja(0.75, 0.04, 0.26, '#D9D9D9', -3.4, 0.97, -2.75, { g: 1.5 }),
    cilindro(0.07, 0.07, 0.16, 'tejado', -2.45, 0.97, -2.7, { g: 1.5 }, 10),
    caja(0.72, 0.12, 0.72, '#3A3F4A', -3.4, 0.5, -1.95),
    caja(0.72, 0.85, 0.1, '#3A3F4A', -3.4, 0.62, -1.6),
    cilindro(0.05, 0.05, 0.38, '#3A3F4A', -3.4, 0.12, -1.95, { g: 1.5 }, 6),
    caja(2.2, 3.6, 0.5, 'madera', 4.7, 0.12, -6.1),
    ...[0.9, 1.9, 2.9].flatMap((y) => [
      caja(2.0, 0.08, 0.4, 'madera2', 4.7, y, -5.98, { g: 0 }),
      ...fila(6, (k) => [caja(0.18, 0.62, 0.36, libros[(k + Math.round(y * 2)) % libros.length], 3.95 + k * 0.28, y + 0.08, -5.95, { g: 1.5 })]),
    ]),
    cilindro(0.3, 0.24, 0.55, 'tejado', -5.7, 0.12, -4.6, {}, 10),
    { f: 'esfera', m: [0.48, 7], c: 'follaje', p: [-5.7, 1.1, -4.6] },
    { f: 'esfera', m: [0.36, 7], c: 'follaje2', p: [-5.45, 1.45, -4.4] },
    { f: 'cilindro', m: [0.42, 0.42, 0.06, 20], c: 'pared', p: [-1.9, 5.3, -6.42], r: [PI / 2, 0, 0], g: 2 },
    caja(0.04, 0.3, 0.02, OSCURO, -1.9, 5.3, -6.37, { g: 0 }),
    caja(0.22, 0.04, 0.02, OSCURO, -1.8, 5.3, -6.37, { g: 0 }),
    ...[-2.5, 2.5].map((x) => caja(2.4, 0.08, 0.8, 'ventana', x, 7.4, -2, { brillo: 1.1, sombra: false })),
  ];
  return { ...base(), fijo, suelo: 0.12, asiento: 'silla', interior: true };
}

function campamento(): DecoradoArmado {
  const fuego: V3 = [2.9, 0, -0.7];
  const fijo: Pieza[] = [
    { f: 'cilindro', m: [8, 8, 0.03, 18], c: 'camino', p: [0, 0.015, -3], g: 2, sombra: false },
    ...tienda(-4.6, -5.6, 0.35),
    ...tienda(4.9, -6.6, -0.4),
    ...tienda(0.4, -10.2, 0, 1.15),
    ...fila(7, (i) => {
      const a = (i / 7) * PI * 2;
      return [roca(0.15, 'piedra2', fuego[0] + Math.cos(a) * 0.48, 0.06, fuego[2] + Math.sin(a) * 0.48, { g: 1.5 })];
    }),
    { f: 'cilindro', m: [0.08, 0.08, 0.9, 6], c: 'tronco', p: [fuego[0], 0.1, fuego[2]], r: [0, 0.5, PI / 2], g: 1.5 },
    { f: 'cilindro', m: [0.08, 0.08, 0.9, 6], c: 'tronco', p: [fuego[0], 0.16, fuego[2]], r: [0, -0.7, PI / 2], g: 1.5 },
    cilindro(0.06, 0.08, 6.2, 'madera2', -6.6, 0, -8.6, { g: 2 }, 8),
    caja(0.7, 0.7, 0.7, 'madera', -3.3, 0, -2.6, { r: [0, 0.3, 0] }),
    caja(0.5, 0.5, 0.5, 'madera2', -3.15, 0.7, -2.6, { r: [0, -0.25, 0] }),
    cilindro(0.32, 0.32, 0.8, 'madera2', 3.9, 0, -3.8, {}, 10),
    { f: 'toro', m: [0.33, 0.03], c: 'metal', p: [3.9, 0.2, -3.8], r: [PI / 2, 0, 0], g: 0 },
    { f: 'toro', m: [0.33, 0.03], c: 'metal', p: [3.9, 0.6, -3.8], r: [PI / 2, 0, 0], g: 0 },
    ...fila(9, (i) => pino(-13 + i * 3.2 + alAzar(`cp-${i}`, -0.5, 0.5), -15 - (i % 2) * 2.5, 1.3)),
    ...pino(-7.5, -2, 1.2),
    ...pino(8, -3, 1.3),
    ...arbusto(-2.8, 3.2, 0.7),
  ];
  return {
    ...base(),
    fijo: [...fijo, ...primerPlano('campamento', 'piedras')],
    asiento: 'tronco',
    fuego: [fuego[0], 0.5, fuego[2]],
    animado: (t) => {
      const a = 1 + 0.16 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29 + 1);
      const b = 1 + 0.2 * Math.sin(t * 9 + 2);
      return [
        cono(0.3 * a, 0.8 * b, '#FF8A33', fuego[0], 0.12, fuego[2], { brillo: 1.4, g: 1.5, sombra: false }, 7),
        cono(0.18 * b, 0.55 * a, '#FFD36B', fuego[0] + 0.05, 0.12, fuego[2] + 0.06, { brillo: 1.6, g: 0, sombra: false }, 7),
        ...bandera(t, -6.6, 5.9, -8.6, 'acento', 0.6),
      ];
    },
  };
}

const CONSTRUCTORES: Readonly<Record<Decorado, () => DecoradoArmado>> = {
  campo,
  casa: casaDecorado,
  castillo,
  bosque,
  calle,
  laboratorio,
  barco,
  montana: montanaDecorado,
  palacio,
  desierto,
  oficina,
  campamento,
};

const CACHE = new Map<Decorado, DecoradoArmado>();

export function armarDecorado(nombre: Decorado): DecoradoArmado {
  let d = CACHE.get(nombre);
  if (d === undefined) {
    d = CONSTRUCTORES[nombre]();
    CACHE.set(nombre, d);
  }
  return d;
}

// ── El mundo entre puestos ───────────────────────────────────────────────────────────────────────────────────────

/** Árboles, matas y piedras en el tramo entre dos puestos, sin pisar el suelo propio de ninguno. */
export function relleno(desde: number, hasta: number, bordeDesde: number, bordeHasta: number, semilla: string): Pieza[] {
  const a = desde + bordeDesde + 1.5;
  const b = hasta - bordeHasta - 1.5;
  const piezas: Pieza[] = [];
  if (b - a < 2) return piezas;
  piezas.push(suelo(b - a + 3, 1.8, 'camino', (a + b) / 2, -0.6));
  const n = Math.round((b - a) * 0.9);
  for (let i = 0; i < n; i++) {
    const s = `${semilla}-${i}`;
    const x = alAzar(`${s}-x`, a, b);
    const z = alAzar(`${s}-z`, -30, 5);
    if (Math.abs(z + 0.6) < 1.4) continue;
    const tipo = random(`${s}-t`);
    const escala = alAzar(`${s}-s`, 0.8, 1.5);
    if (tipo < 0.35) piezas.push(...pino(x, z, escala * 1.2));
    else if (tipo < 0.65) piezas.push(...arbol(x, z, escala));
    else if (tipo < 0.85) piezas.push(...arbusto(x, z, escala));
    else piezas.push(...piedra(x, z, escala));
  }
  return piezas;
}

/** Cordillera lejana y nubes, a lo largo de todo el recorrido. */
export function fondoLejano(desde: number, hasta: number): Pieza[] {
  const piezas: Pieza[] = [];
  for (let x = desde - 60; x < hasta + 60; x += 22) {
    const h = alAzar(`cord-h-${x}`, 22, 40);
    const r = h * alAzar(`cord-r-${x}`, 0.75, 1.0);
    piezas.push(cono(r, h, 'piedra2', x + alAzar(`cord-x-${x}`, -6, 6), 0, -140 - alAzar(`cord-z-${x}`, 0, 25), { g: 2 }, 7));
  }
  for (let x = desde - 40; x < hasta + 40; x += 17) {
    const y = alAzar(`nube-y-${x}`, 20, 30);
    const z = alAzar(`nube-z-${x}`, -90, -55);
    const s = alAzar(`nube-s-${x}`, 1.4, 2.4);
    piezas.push(
      { f: 'esfera', m: [1.6 * s, 7], c: '#FFFFFF', p: [x, y, z], s: [1.4, 0.75, 1], g: 2, sombra: false },
      { f: 'esfera', m: [1.2 * s, 7], c: '#FFFFFF', p: [x + 1.9 * s, y - 0.3 * s, z + 0.4], s: [1.3, 0.7, 1], g: 2, sombra: false },
      { f: 'esfera', m: [1.0 * s, 7], c: '#FFFFFF', p: [x - 1.8 * s, y - 0.4 * s, z + 0.3], s: [1.3, 0.7, 1], g: 2, sombra: false },
    );
  }
  return piezas;
}
