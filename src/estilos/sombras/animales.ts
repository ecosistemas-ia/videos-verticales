// Los animales del teatro de sombras: cuadrúpedos con un esqueleto común (caballo, lobo, venado, jaguar), el ave, la
// serpiente (también emplumada) y el dragón. Todos miran a la derecha en su marco; la dirección la da la escala.

import { agujeroCirculo, agujeroElipse, agujeroRombo, banda, capsula, circulo, curva, elipse, limitar, mezclar, onda, poligono, ruido, ruido2, suave, type Punto } from '../_marionetas/curvas.ts';
import { aplicar, cadena, escalar, girar, mover, type Matriz } from '../_marionetas/geometria.ts';
import type { Contexto, Dibujo, Pieza } from './dibujo.ts';
import type { Accion } from './reglas.ts';
import type { Recorrido } from './humanos.ts';

export interface OpcionesAnimal {
  readonly figura: string;
  readonly accion: Accion;
  readonly x: number;
  /** y del suelo (los que andan) o del centro del cuerpo (los que vuelan). */
  readonly y: number;
  readonly vuela: boolean;
  readonly escala: number;
  readonly direccion: 1 | -1;
  readonly tl: number;
  readonly dur: number;
  readonly rec: Recorrido | null;
  readonly varillas: boolean;
}

// ——— Cuadrúpedos ———

interface Cuadrupedo {
  readonly largo: number;
  readonly alto: number;
  readonly p1: number;
  readonly p2: number;
  readonly gp: number;
  readonly cuello: number;
  readonly angCuello: number;
  readonly grosorCuello: number;
  readonly angCabeza: number;
  readonly cabeza: 'caballo' | 'lobo' | 'venado' | 'jaguar';
  readonly cola: 'crin' | 'peluda' | 'corta' | 'larga';
  readonly crin: boolean;
  readonly manchas: boolean;
  readonly astas: boolean;
  readonly ciclo: number;
  readonly casco: boolean;
}

const CUADRUPEDOS: Readonly<Record<string, Cuadrupedo>> = {
  caballo: { largo: 150, alto: 92, p1: 72, p2: 80, gp: 22, cuello: 96, angCuello: 54, grosorCuello: 48, angCabeza: 58, cabeza: 'caballo', cola: 'crin', crin: true, manchas: false, astas: false, ciclo: 430, casco: true },
  lobo: { largo: 118, alto: 62, p1: 54, p2: 54, gp: 17, cuello: 48, angCuello: 30, grosorCuello: 40, angCabeza: 12, cabeza: 'lobo', cola: 'peluda', crin: false, manchas: false, astas: false, ciclo: 300, casco: false },
  venado: { largo: 116, alto: 64, p1: 68, p2: 76, gp: 14, cuello: 72, angCuello: 60, grosorCuello: 30, angCabeza: 34, cabeza: 'venado', cola: 'corta', crin: false, manchas: false, astas: true, ciclo: 360, casco: true },
  jaguar: { largo: 142, alto: 58, p1: 50, p2: 50, gp: 20, cuello: 34, angCuello: 16, grosorCuello: 44, angCabeza: 4, cabeza: 'jaguar', cola: 'larga', crin: false, manchas: true, astas: false, ciclo: 320, casco: false },
};

function cabezaCuadrupedo(c: Cuadrupedo['cabeza'], cal: boolean): string {
  switch (c) {
    case 'caballo':
      return curva([[-12, -14], [-2, -22], [2, -40], [10, -22], [26, -17], [48, -6], [64, 2], [68, 12], [60, 20], [42, 19], [20, 16], [0, 14], [-14, 6]]) + (cal ? ' ' + agujeroElipse(14, -6, 4, 2.6) : '');
    case 'lobo':
      return curva([[-14, -10], [-10, -20], [-6, -42], [4, -22], [16, -18], [32, -10], [52, -4], [57, 2], [50, 8], [32, 11], [14, 16], [-6, 14]]) + (cal ? ' ' + agujeroElipse(16, -9, 4.5, 2) : '');
    case 'venado':
      return curva([[-10, -10], [-28, -24], [-6, -18], [6, -16], [24, -8], [42, 0], [47, 8], [38, 14], [18, 14], [0, 12], [-12, 6]]) + (cal ? ' ' + agujeroElipse(12, -5, 3.6, 2.4) : '');
    default:
      return curva([[-14, -14], [-12, -26], [-3, -31], [4, -24], [20, -20], [32, -10], [39, 0], [37, 10], [26, 16], [8, 18], [-8, 14]]) + (cal ? ' ' + agujeroElipse(18, -7, 4.4, 2.6) : '');
  }
}

function astasD(): string {
  const w = (): number => 5;
  return [
    banda([{ x: -2, y: -14 }, { x: -10, y: -40 }, { x: -20, y: -66 }, { x: -36, y: -86 }], w),
    banda([{ x: -10, y: -40 }, { x: 2, y: -58 }, { x: 6, y: -70 }], w),
    banda([{ x: -20, y: -66 }, { x: -10, y: -88 }, { x: -8, y: -100 }], w),
    banda([{ x: -24, y: -72 }, { x: -42, y: -70 }, { x: -52, y: -62 }], w),
  ].join(' ');
}

interface PoseCuadrupedo {
  inclinacion: number;
  cuello: number;
  cabeza: number;
  patas: [number, number][]; // [arriba, abajo] para: delantera cerca, delantera lejos, trasera cerca, trasera lejos
}

function poseCuadrupedo(c: Cuadrupedo, o: OpcionesAnimal, t: number, s: number): PoseCuadrupedo {
  const reposo: [number, number][] = [
    [0, 0],
    [4, 2],
    [12, -16],
    [8, -12],
  ];
  const base: PoseCuadrupedo = {
    inclinacion: 1.5 * onda(t, 0.3, s),
    cuello: c.angCuello + 8 * ruido2(t * 0.35, s),
    cabeza: c.angCabeza + 6 * ruido2(t * 0.5, s + 2),
    patas: reposo.map(([a, b], i) => [a + 2 * ruido(t * 0.4, s + i), b] as [number, number]),
  };
  const q = (a: number, b: number): number => suave(o.tl, a, b);
  switch (o.accion) {
    case 'camina':
    case 'corre': {
      const r = o.rec ?? { ritmo: 0, distancia: 0, avance: 0 };
      const corre = o.accion === 'corre';
      const fase = (2 * Math.PI * r.distancia) / (corre ? c.ciclo * 1.6 : c.ciclo);
      const amp = r.ritmo;
      const A = corre ? 34 : 22;
      const B = corre ? 70 : 42;
      const desfases = corre ? [0.5, 0.62, 0, 0.12] : [0, 0.5, 0.5, 0];
      return {
        inclinacion: (corre ? 6 * Math.sin(fase) : 1.5 * Math.sin(2 * fase)) * amp,
        cuello: c.angCuello - (corre ? 16 : 4) * amp + (corre ? 8 : 4) * Math.sin(fase * (corre ? 1 : 2) + 1) * amp,
        cabeza: c.angCabeza + (corre ? -6 : 0) * amp,
        patas: desfases.map((d, i) => {
          const f = fase + d * 2 * Math.PI;
          const trasera = i >= 2;
          const arriba = reposo[i][0] * (1 - amp) + A * amp * Math.sin(f) + (trasera ? 8 * amp : 0);
          const flex = B * amp * Math.max(0, Math.cos(f)) ** 1.3;
          return [arriba, (trasera ? -flex : flex) + reposo[i][1] * (1 - amp)];
        }),
      };
    }
    case 'encabrita': {
      const sube = q(0.15, 0.75) * (1 - suave(o.tl, o.dur - 1.0, o.dur - 0.35));
      const pateo = 22 * onda(t, 2.4, s);
      return {
        inclinacion: -38 * sube,
        cuello: c.angCuello + 14 * sube,
        cabeza: c.angCabeza - 22 * sube,
        patas: [
          [mezclar(0, 70, sube) + pateo * sube, mezclar(0, 95, sube) + pateo * sube * 0.6],
          [mezclar(4, 56, sube) - pateo * sube, mezclar(2, 105, sube) - pateo * sube * 0.5],
          [mezclar(12, 44, sube), mezclar(-16, -8, sube)],
          [mezclar(8, 36, sube), mezclar(-12, -4, sube)],
        ],
      };
    }
    case 'aulla': {
      const sienta = q(0.05, 0.7);
      const aullido = q(0.6, 1.1);
      return {
        inclinacion: -30 * sienta,
        cuello: mezclar(c.angCuello, 82, aullido) + 2 * onda(t, 6, s) * aullido,
        cabeza: mezclar(c.angCabeza, -44, aullido),
        patas: [
          [mezclar(0, 30, sienta), 0],
          [mezclar(4, 34, sienta), 2],
          [mezclar(12, 100, sienta), mezclar(-16, -150, sienta)],
          [mezclar(8, 96, sienta), mezclar(-12, -146, sienta)],
        ],
      };
    }
    default:
      return base;
  }
}

function dibujarCuadrupedo(o: OpcionesAnimal, ctx: Contexto): Dibujo {
  const c = CUADRUPEDOS[o.figura] ?? CUADRUPEDOS.caballo;
  const { t, semilla: s, calados: cal } = ctx;
  const p = poseCuadrupedo(c, o, t, s);
  const L = c.largo;
  const Hh = c.alto;
  const B = girar(p.inclinacion);
  const pivotes: [number, number][] = [
    [L / 2 - 4, Hh * 0.16],
    [L / 2 - 12, Hh * 0.16],
    [-L / 2 + 6, Hh * 0.1],
    [-L / 2 - 2, Hh * 0.1],
  ];
  const piernas = pivotes.map(([px, py], i) => {
    const trasera = i >= 2;
    const U = cadena(B, mover(px, py), girar(-p.patas[i][0]));
    const D = cadena(U, mover(0, c.p1), girar(p.patas[i][1]));
    const P = cadena(D, mover(0, c.p2));
    return { U, D, P, trasera };
  });
  // Apoyo en el suelo: el casco o la pata más baja.
  let bajo = -Infinity;
  for (const pi of piernas) bajo = Math.max(bajo, aplicar(pi.P, 0, 8).y);
  bajo = Math.max(bajo, aplicar(B, -L / 2 - 20, Hh * 0.4).y + 4);
  const R = cadena(mover(o.x, o.y), escalar(o.direccion * o.escala, o.escala), mover(0, -bajo));
  const piezas: Pieza[] = [];
  const poner = (d: string, m: Matriz, tipo?: Pieza['tipo']): void => {
    if (d !== '') piezas.push({ d, m: cadena(R, m), tipo });
  };
  const pata = (pi: (typeof piernas)[number], lejos: boolean): void => {
    const g = c.gp * (lejos ? 0.92 : 1);
    poner(capsula(c.p1, g * (pi.trasera ? 1.35 : 1.1), g * 0.72), pi.U);
    poner(capsula(c.p2, g * 0.7, g * 0.5), pi.D);
    poner(c.casco ? poligono([[-g * 0.32, -2], [g * 0.4, -2], [g * 0.55, 9], [-g * 0.38, 9]]) : elipse(4, 4, g * 0.5, 6), pi.P);
  };
  pata(piernas[1], true);
  pata(piernas[3], true);

  // Cola: cadena que se mece con retraso.
  const viento = (o.rec?.ritmo ?? 0) * (o.accion === 'corre' ? 1 : 0.4);
  const raiz = { x: -L / 2 - 20, y: -Hh * 0.24 };
  const colaCfg = {
    crin: { a0: 128, curva: 7, seg: 24, n: 6, g: [16, 24, 8] },
    peluda: { a0: 152, curva: 4, seg: 18, n: 5, g: [12, 26, 6] },
    corta: { a0: 205, curva: 0, seg: 8, n: 3, g: [12, 12, 6] },
    larga: { a0: 118, curva: -16, seg: 24, n: 6, g: [13, 10, 6] },
  }[c.cola];
  const espinaCola: Punto[] = [raiz];
  let ang = colaCfg.a0 + 26 * viento;
  for (let i = 1; i <= colaCfg.n; i++) {
    ang += colaCfg.curva + 9 * ruido2(t * 0.8 - i * 0.12, s + 21);
    const prev = espinaCola[i - 1];
    espinaCola.push({ x: prev.x + Math.cos((ang * Math.PI) / 180) * colaCfg.seg, y: prev.y + Math.sin((ang * Math.PI) / 180) * colaCfg.seg });
  }
  poner(
    banda(espinaCola, (i, n) => {
      const k = i / (n - 1);
      return k < 0.5 ? mezclar(colaCfg.g[0], colaCfg.g[1], k * 2) : mezclar(colaCfg.g[1], colaCfg.g[2], (k - 0.5) * 2);
    }),
    B,
  );

  // Cuerpo.
  let cuerpo = curva([
    [L / 2 + 26, -Hh * 0.12],
    [L / 2 + 12, -Hh * 0.42],
    [L / 2 - 14, -Hh * 0.52],
    [0, -Hh * 0.44],
    [-L / 2 + 4, -Hh * 0.52],
    [-L / 2 - 24, -Hh * 0.3],
    [-L / 2 - 28, Hh * 0.06],
    [-L / 2 - 12, Hh * 0.36],
    [-L / 2 + 20, Hh * 0.44],
    [0, Hh * 0.5],
    [L / 2 - 16, Hh * 0.44],
    [L / 2 + 14, Hh * 0.3],
  ]);
  if (cal && c.manchas) {
    for (let i = 0; i < 11; i++) {
      const mx = mezclar(-L / 2 + 2, L / 2 - 4, (i * 0.37 + 0.05) % 1);
      const my = mezclar(-Hh * 0.26, Hh * 0.26, (i * 0.61 + 0.2) % 1);
      cuerpo += ` ${agujeroCirculo(mx, my, 6.5)} ${circulo(mx, my, 2.6)}`;
    }
  }
  if (cal && !c.manchas) cuerpo += ` ${agujeroRombo(L * 0.12, -Hh * 0.05, 5, 8)} ${agujeroRombo(-L * 0.08, -Hh * 0.05, 5, 8)} ${agujeroRombo(-L * 0.28, -Hh * 0.08, 4, 6)}`;
  poner(cuerpo, B);

  // Cuello y cabeza.
  const base = { x: L / 2 + 4, y: -Hh * 0.18 };
  const ac = (p.cuello * Math.PI) / 180;
  const fin = { x: base.x + Math.cos(ac) * c.cuello, y: base.y - Math.sin(ac) * c.cuello };
  const medio = { x: mezclar(base.x, fin.x, 0.5) - 4, y: mezclar(base.y, fin.y, 0.5) - 3 };
  const espinaCuello = [base, medio, fin];
  poner(banda(espinaCuello, (i, n) => mezclar(c.grosorCuello, c.grosorCuello * 0.55, i / (n - 1))), B);
  if (c.crin) {
    const pts: [number, number][] = [];
    const nx = -Math.sin(ac);
    const ny = -Math.cos(ac);
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const bx = mezclar(base.x - 6, fin.x - 6, k) + nx * c.grosorCuello * 0.42 * (1 - 0.4 * k);
      const by = mezclar(base.y, fin.y, k) + ny * c.grosorCuello * 0.42 * (1 - 0.4 * k);
      pts.push([bx, by]);
      if (i < 8) {
        const ola = 6 * ruido2(t * 1.1 - k, s + 30) - 14 * viento;
        pts.push([bx + nx * 14 - 10 + ola, by + ny * 14 + 4]);
      }
    }
    pts.push([fin.x - 10, fin.y + 10], [base.x - 4, base.y + 10]);
    poner(poligono(pts), B);
  }
  const Hc = cadena(B, mover(fin.x, fin.y), girar(p.cabeza));
  poner(cabezaCuadrupedo(c.cabeza, cal), Hc);
  if (c.astas) poner(astasD(), Hc);

  pata(piernas[0], false);
  pata(piernas[2], false);

  const varillas: Dibujo['varillas'] = [];
  if (o.varillas) {
    varillas.push(aplicar(cadena(R, B), 0, 0));
    varillas.push(aplicar(cadena(R, Hc), 6, 0));
  }
  return { piezas, luces: [], varillas };
}

// ——— Ave ———

function alaAve(cal: boolean): string {
  return (
    curva([
      [12, 2],
      [16, -38],
      [9, -80],
      [-5, -118],
      [-22, -142],
      [-31, -132],
      [-26, -121],
      [-39, -117],
      [-32, -105],
      [-45, -100],
      [-38, -88],
      [-49, -80],
      [-41, -62],
      [-37, -30],
      [-22, -4],
    ]) + (cal ? ` ${agujeroElipse(-12, -40, 4, 10)} ${agujeroElipse(-22, -70, 3.5, 9)}` : '')
  );
}

function dibujarAve(o: OpcionesAnimal, ctx: Contexto): Dibujo {
  const { t, semilla: s, calados: cal } = ctx;
  const vuela = o.accion === 'vuela' || o.vuela;
  const fase = 2 * Math.PI * 2.3 * t + s;
  const aleteo = vuela ? 0.12 + 0.88 * Math.sin(fase) : 0;
  const sube = vuela ? -12 * Math.sin(fase + 0.6) : 0;
  const cabezazo = vuela ? 0 : 6 * ruido2(t * 0.8, s);
  const R = cadena(mover(o.x, o.y + sube - (vuela ? 0 : 22 * o.escala)), escalar(o.direccion * o.escala, o.escala), girar(vuela ? -4 + 3 * Math.sin(fase) : 0));
  const piezas: Pieza[] = [];
  const poner = (d: string, m: Matriz): void => {
    piezas.push({ d, m: cadena(R, m) });
  };
  const ala = (lejos: boolean): Matriz =>
    vuela
      ? cadena(mover(lejos ? 0 : 8, -8), girar(-8 * Math.sin(fase) + (lejos ? -6 : 0)), escalar(1, aleteo * (lejos ? 0.85 : 1)))
      : cadena(mover(10, -10), girar(-76 + 3 * ruido(t * 0.6, s) + (lejos ? 4 : 0)), escalar(0.62, 0.62 + 0.04 * ruido(t, s)));
  poner(alaAve(cal), ala(true));
  poner(curva([[-32, -6], [-76, -18], [-88, -10], [-80, -2], [-88, 5], [-78, 12], [-32, 6]]), girar(vuela ? 0 : -6 + 4 * ruido(t * 0.5, s + 3)));
  poner(curva([[38, -4], [26, -16], [0, -17], [-26, -10], [-40, -3], [-30, 8], [0, 14], [28, 10]]), cadena());
  poner(curva([[30, -10], [40, -24], [54, -28], [64, -24], [74, -17], [70, -11], [62, -12], [56, -8], [44, -2], [34, 2]]) + (cal ? ' ' + agujeroCirculo(55, -20, 2.6) : ''), cadena(mover(34, -4), girar(cabezazo), mover(-34, 4)));
  if (vuela) {
    poner(capsula(26, 6, 4), cadena(mover(-6, 10), girar(72)));
  } else {
    poner(capsula(26, 6, 4) + ' ' + poligono([[-2, 24], [12, 26], [12, 30], [-4, 30]]), cadena(mover(4, 10), girar(-4)));
    poner(capsula(26, 6, 4) + ' ' + poligono([[-2, 24], [12, 26], [12, 30], [-4, 30]]), cadena(mover(-6, 10), girar(6)));
  }
  poner(alaAve(cal), ala(false));
  const varillas: Dibujo['varillas'] = o.varillas ? [aplicar(R, 0, 6)] : [];
  return { piezas, luces: [], varillas };
}

// ——— Serpiente ———

function cabezaSerpiente(boca: number, cal: boolean): { arriba: string; abajo: string } {
  return {
    arriba: curva([[-8, -12], [10, -15], [28, -11], [40, -3], [36, 1], [14, 0], [-6, 2]]) + (cal ? ' ' + agujeroElipse(16, -7, 3.6, 2.2) : '') + (boca > 6 ? ' ' + poligono([[30, 0], [33, 9], [35, 0]]) : ''),
    abajo: curva([[-6, 2], [14, 1], [34, 2], [30, 8], [12, 10], [-6, 10]]),
  };
}

function dibujarSerpiente(o: OpcionesAnimal, ctx: Contexto): Dibujo {
  const { t, semilla: s, calados: cal } = ctx;
  const emplumada = o.figura === 'serpiente_emplumada';
  const enAire = o.accion === 'vuela';
  const L = 430;
  const N = 34;
  const repta = o.accion === 'repta';
  const ritmo = o.rec?.ritmo ?? 0;
  const golpe = o.accion === 'ataca' ? (() => {
    const f = ((o.tl - 0.4) / 1.3) % 1;
    if (o.tl < 0.4) return 0;
    return f < 0.18 ? suave(f, 0, 0.18) : 1 - suave(f, 0.3, 0.9);
  })() : 0;
  const alzado = enAire ? 30 : repta ? mezclar(110, 46, ritmo) : 112;
  const w = repta ? 6 : 2.2;
  const espina: Punto[] = [];
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1);
    const sube = Math.exp(-((k / 0.2) ** 2));
    let x = -k * L * 0.82 + 24 * Math.sin((Math.PI * k) / 0.24) * Math.exp(-((k / 0.26) ** 2)) + 70 * golpe * Math.exp(-((k / 0.18) ** 2));
    let y = -alzado * sube - 4 * onda(t, 0.5, s) * sube;
    if (enAire) {
      y = 30 * Math.sin(2 * Math.PI * k * 1.5 - 3.2 * t) * (0.35 + k) - 40 * sube;
      x = -k * L * 0.9;
    } else {
      const ola = Math.max(0, Math.sin(2 * Math.PI * k * 2.4 - w * t - s));
      y -= (repta ? 18 : 7) * ola * (k > 0.18 ? 1 : 0) * (1 - k * 0.5);
    }
    espina.push({ x, y });
  }
  const grosor = (i: number, n: number): number => {
    const k = i / (n - 1);
    return k < 0.06 ? 22 + 60 * k : 26 * (1 - 0.9 * ((k - 0.06) / 0.94) ** 1.3) + 3;
  };
  const yBase = enAire ? o.y : o.y - 13 * o.escala;
  const R = cadena(mover(o.x, yBase), escalar(o.direccion * o.escala, o.escala));
  const piezas: Pieza[] = [];
  const poner = (d: string, m: Matriz): void => {
    piezas.push({ d, m: cadena(R, m) });
  };
  let cuerpo = banda(espina, grosor);
  if (cal) {
    for (let i = 4; i < N - 4; i += 3) cuerpo += ' ' + agujeroRombo(espina[i].x, espina[i].y, grosor(i, N) * 0.16, grosor(i, N) * 0.2);
  }
  poner(cuerpo, cadena());
  if (emplumada) {
    for (let i = 5; i < N - 6; i += 4) {
      const p0 = espina[i];
      const p1 = espina[i + 1];
      const ang = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI + 100 + 10 * ruido2(t - i * 0.1, s);
      poner(curva([[0, 0], [5, -14], [3, -30], [0, -38], [-3, -30], [-5, -14]]), cadena(mover(p0.x, p0.y - grosor(i, N) * 0.35), girar(ang)));
    }
  }
  const dir = Math.atan2(espina[0].y - espina[2].y, espina[0].x - espina[2].x);
  const angCabeza = limitar((dir * 180) / Math.PI, -35, 35) * 0.6 + 6 * ruido(t * 0.7, s);
  const boca = o.accion === 'ataca' ? 26 * golpe : 0;
  const Hc = cadena(mover(espina[0].x - 4, espina[0].y), girar(angCabeza));
  const cab = cabezaSerpiente(boca, cal);
  poner(cab.arriba, cadena(Hc, mover(-4, 1), girar(-boca * 0.6), mover(4, -1)));
  poner(cab.abajo, cadena(Hc, mover(-4, 1), girar(boca * 0.5), mover(4, -1)));
  const lengua = Math.max(0, Math.sin(2 * Math.PI * 1.3 * t + s)) ** 6;
  if (lengua > 0.05 && boca < 4) poner(poligono([[36, 0], [54, -2], [60, -7], [56, -1], [61, 3], [54, 1], [36, 2]]), cadena(Hc, mover(0, 0), escalar(0.4 + 0.6 * lengua, 1)));
  if (emplumada) {
    for (let i = 0; i < 4; i++) poner(curva([[0, 0], [6, -18], [4, -38], [0, -46], [-4, -38], [-6, -18]]), cadena(Hc, mover(-6 + i * 4, -12), girar(-70 + i * 14 + 8 * ruido2(t + i * 0.2, s))));
  }
  const varillas: Dibujo['varillas'] = o.varillas ? [aplicar(cadena(R, Hc), 0, 0), aplicar(R, espina[14].x, espina[14].y)] : [];
  return { piezas, luces: [], varillas };
}

// ——— Dragón ———

function alaDragon(): { membrana: string; huesos: string } {
  const g = (): number => 5;
  return {
    membrana: curva(
      [
        [4, 2],
        [12, -60],
        [-6, -130],
        [-12, -196],
        [-36, -152],
        [-74, -172],
        [-84, -128],
        [-124, -134],
        [-112, -92],
        [-148, -72],
        [-110, -40],
        [-70, -10],
        [-30, 6],
      ],
      true,
      0.55,
    ),
    huesos: [
      banda([{ x: 2, y: 0 }, { x: 12, y: -60 }, { x: -6, y: -130 }], () => 9),
      banda([{ x: -6, y: -130 }, { x: -12, y: -196 }], g),
      banda([{ x: -6, y: -130 }, { x: -74, y: -172 }], g),
      banda([{ x: -6, y: -130 }, { x: -124, y: -134 }], g),
      banda([{ x: -6, y: -130 }, { x: -148, y: -72 }], g),
    ].join(' '),
  };
}

function dibujarDragon(o: OpcionesAnimal, ctx: Contexto): Dibujo {
  const { t, semilla: s, calados: cal } = ctx;
  const L = 400;
  const N = 34;
  const vuela = o.accion === 'vuela';
  const hz = vuela ? 1.5 : 1.15;
  const fase = 2 * Math.PI * hz * t + s;
  const aleteo = 0.1 + 0.9 * Math.sin(fase);
  const fuego = o.accion === 'ataca' ? suave(o.tl, 0.5, 0.8) * (1 - suave(o.tl, o.dur - 0.6, o.dur - 0.2)) : 0;
  const espina: Punto[] = [];
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1);
    espina.push({
      x: -k * L + 10 * Math.exp(-((k / 0.1) ** 2)),
      y: 22 * Math.sin(2 * Math.PI * k * 1.2 - 3 * t) * (0.25 + k) - 54 * Math.exp(-((k / 0.13) ** 2)) - 10 * fuego * Math.exp(-((k / 0.1) ** 2)),
    });
  }
  const grosor = (i: number, n: number): number => {
    const k = i / (n - 1);
    if (k < 0.12) return 24 + 10 * (k / 0.12);
    if (k < 0.32) return 34 + 24 * ((k - 0.12) / 0.2);
    return 58 * (1 - (k - 0.32) / 0.68) ** 1.25 + 3;
  };
  const sube = -14 * Math.sin(fase + 0.8);
  const R = cadena(mover(o.x, o.y + sube), escalar(o.direccion * o.escala, o.escala));
  const piezas: Pieza[] = [];
  const poner = (d: string, m: Matriz, tipo?: Pieza['tipo']): void => {
    piezas.push({ d, m: cadena(R, m), tipo });
  };
  const ala = alaDragon();
  const raizAla = espina[Math.round(N * 0.28)];
  const marcoAla = (lejos: boolean): Matriz => cadena(mover(raizAla.x + (lejos ? 14 : 0), raizAla.y - 16), girar(-6 * Math.sin(fase) + (lejos ? -8 : 0)), escalar(lejos ? 0.88 : 1, aleteo * (lejos ? 0.88 : 1)));
  poner(ala.membrana, marcoAla(true), 'membrana');
  poner(ala.huesos, marcoAla(true));
  // Patas recogidas.
  const pataEn = (k: number, desf: number): void => {
    const p = espina[Math.round(N * k)];
    const U = cadena(mover(p.x, p.y + 12), girar(40 + 6 * Math.sin(fase + desf)));
    poner(capsula(40, 18, 12), U);
    poner(capsula(34, 12, 8) + ' ' + poligono([[-6, 30], [14, 36], [-8, 40]]), cadena(U, mover(0, 38), girar(-70)));
  };
  pataEn(0.22, 0);
  pataEn(0.5, 1);
  let cuerpo = banda(espina, grosor);
  if (cal) for (let i = 6; i < N - 6; i += 3) cuerpo += ' ' + agujeroRombo(espina[i].x, espina[i].y + 4, grosor(i, N) * 0.12, grosor(i, N) * 0.16);
  poner(cuerpo, cadena());
  // Crestas del lomo y punta de la cola.
  const crestas: string[] = [];
  for (let i = 3; i < N - 4; i += 2) {
    const p0 = espina[i];
    const p1 = espina[i + 1];
    const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const nx = Math.sin(a);
    const ny = -Math.cos(a);
    const g = grosor(i, N) / 2;
    const h = 8 + g * 0.35;
    crestas.push(poligono([[p0.x - nx * g * 0.8, p0.y + ny * g * 0.8 + 2], [p0.x - nx * (g + h) - 6, p0.y + ny * (g + h)], [p1.x - nx * g * 0.8, p1.y + ny * g * 0.8 + 2]]));
  }
  poner(crestas.join(' '), cadena());
  const cola = espina[N - 1];
  const pre = espina[N - 3];
  const ac = (Math.atan2(cola.y - pre.y, cola.x - pre.x) * 180) / Math.PI;
  poner(poligono([[0, 0], [10, -14], [34, 0], [10, 14]]), cadena(mover(cola.x, cola.y), girar(ac)));
  // Cabeza con cuernos y mandíbula.
  const boca = 24 * fuego + 3 * Math.max(0, onda(t, 0.6, s));
  const Hc = cadena(mover(espina[0].x + 4, espina[0].y), girar(8 + 5 * ruido2(t * 0.6, s) + 6 * fuego));
  poner(
    curva([[-6, -16], [16, -22], [38, -18], [60, -10], [64, -2], [44, 2], [20, 4], [-6, 6]]) + (cal ? ' ' + agujeroElipse(24, -10, 5, 2.4) : '') + ' ' + poligono([[2, -18], [-26, -44], [-6, -16]]) + ' ' + poligono([[14, -21], [0, -52], [20, -21]]),
    cadena(Hc, mover(-4, 2), girar(-boca * 0.4), mover(4, -2)),
  );
  poner(curva([[-4, 2], [20, 4], [48, 6], [58, 10], [42, 16], [10, 16], [-6, 10]]) + (boca > 8 ? ' ' + poligono([[40, 6], [44, 0], [48, 7]]) : ''), cadena(Hc, mover(-4, 2), girar(boca * 0.6), mover(4, -2)));
  const luces: Dibujo['luces'] = [];
  if (fuego > 0.02) {
    const pts: [number, number][] = [[58, 0]];
    const largo = 250 * fuego;
    for (let i = 1; i <= 7; i++) {
      const k = i / 7;
      pts.push([58 + largo * k, -6 - 34 * k * (1 + 0.4 * ruido2(t * 7 + i, s)) + 12 * k]);
    }
    pts.push([58 + largo * 1.05 + 20 * ruido(t * 9, s), 18 + 10 * ruido(t * 8, s + 2)]);
    for (let i = 7; i >= 1; i--) {
      const k = i / 7;
      pts.push([58 + largo * k, 8 + 34 * k * (1 + 0.4 * ruido2(t * 6.4 + i, s + 5)) + 12 * k]);
    }
    const marcoFuego = cadena(Hc, girar(16));
    poner(curva(pts), marcoFuego, 'llama');
    const c = aplicar(cadena(R, marcoFuego), 58 + largo * 0.6, 8);
    luces.push({ x: c.x, y: c.y, r: 360, fuerza: 0.75 * fuego, color: '#FF9A3C' });
  }
  poner(ala.membrana, marcoAla(false), 'membrana');
  poner(ala.huesos, marcoAla(false));
  const varillas: Dibujo['varillas'] = o.varillas ? [aplicar(cadena(R, Hc), 0, 0), aplicar(R, raizAla.x, raizAla.y)] : [];
  return { piezas, luces, varillas };
}

export function dibujarAnimal(o: OpcionesAnimal, ctx: Contexto): Dibujo {
  switch (o.figura) {
    case 'ave':
      return dibujarAve(o, ctx);
    case 'serpiente':
    case 'serpiente_emplumada':
      return dibujarSerpiente(o, ctx);
    case 'dragon':
      return dibujarDragon(o, ctx);
    default:
      return dibujarCuadrupedo(o, ctx);
  }
}

