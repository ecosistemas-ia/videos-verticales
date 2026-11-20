// Las personas del teatro de sombras: un solo esqueleto con pivotes (cadera, torso, cabeza, hombros, codos, muslos,
// rodillas) y once variantes que cambian proporciones, ropa, tocado y objeto. Cada acción es una función del tiempo
// que da una pose; encima se suma la «vida» (respiración, peso, cabeza) para que nada quede quieto.
//
// Convenciones (figura mirando a la derecha, y hacia abajo): ángulos en grados; en brazos y piernas, positivo = hacia
// delante; en rodillas, positivo = flexión; en torso y cabeza, positivo = inclinarse hacia delante; giro negativo =
// caer de espaldas.

import { agujeroCirculo, agujeroElipse, agujeroPoligono, agujeroRombo, banda, caida, capsula, circulo, coseno, curva, elipse, limitar, mezclar, onda, poligono, ruido, ruido2, suave } from '../_marionetas/curvas.ts';
import { aplicar, cadena, escalar, girar, mover, type Matriz } from '../_marionetas/geometria.ts';
import type { Contexto, Dibujo, Pieza } from './dibujo.ts';
import { CAIDA, LUCHA, type Accion, type Objeto } from './reglas.ts';

type Tocado = 'ninguno' | 'penacho' | 'corona' | 'casco' | 'capucha' | 'sombrero' | 'tiara';

interface Variante {
  readonly talla: number;
  readonly cabeza: number;
  readonly ancho: number;
  readonly encorvado: number;
  readonly falda: 'no' | 'tunica' | 'larga';
  readonly pelo: 'corto' | 'largo' | 'mono' | 'coleta' | 'calvo';
  readonly tocado: Tocado;
  readonly barba: boolean;
  readonly capa: boolean;
  readonly escudo: 'no' | 'redondo' | 'blason';
  readonly objeto: Objeto;
  readonly nariz: number;
  readonly mangas: boolean;
  readonly adorno: 'rombos' | 'collar' | 'medalla' | 'ninguno';
  readonly femenina: boolean;
}

const BASE: Variante = {
  talla: 1,
  cabeza: 1,
  ancho: 1,
  encorvado: 0,
  falda: 'tunica',
  pelo: 'corto',
  tocado: 'ninguno',
  barba: false,
  capa: false,
  escudo: 'no',
  objeto: 'nada',
  nariz: 1,
  mangas: false,
  adorno: 'ninguno',
  femenina: false,
};

export const VARIANTES: Readonly<Record<string, Variante>> = {
  hombre: { ...BASE, capa: true, adorno: 'rombos' },
  mujer: { ...BASE, ancho: 0.86, falda: 'larga', pelo: 'largo', adorno: 'collar', femenina: true },
  guerrero: { ...BASE, ancho: 1.14, tocado: 'penacho', escudo: 'redondo', objeto: 'lanza', adorno: 'rombos' },
  caballero: { ...BASE, ancho: 1.12, tocado: 'casco', capa: true, escudo: 'blason', objeto: 'espada', adorno: 'ninguno' },
  rey: { ...BASE, ancho: 1.06, falda: 'larga', tocado: 'corona', barba: true, capa: true, mangas: true, adorno: 'medalla' },
  princesa: { ...BASE, ancho: 0.84, falda: 'larga', pelo: 'largo', tocado: 'tiara', adorno: 'collar', femenina: true },
  anciano: { ...BASE, encorvado: 16, falda: 'larga', pelo: 'calvo', barba: true, objeto: 'baston', mangas: true },
  anciana: { ...BASE, ancho: 0.9, encorvado: 20, falda: 'larga', pelo: 'mono', tocado: 'capucha', objeto: 'baston', mangas: true, femenina: true },
  nino: { ...BASE, talla: 0.62, cabeza: 1.32, adorno: 'ninguno' },
  nina: { ...BASE, talla: 0.62, cabeza: 1.32, ancho: 0.9, falda: 'larga', pelo: 'coleta', femenina: true },
  bruja: { ...BASE, ancho: 0.86, encorvado: 10, falda: 'larga', pelo: 'largo', tocado: 'sombrero', objeto: 'escoba', nariz: 1.7, mangas: true, femenina: true },
};

// Medidas del esqueleto (talla 1).
const MUSLO = 92;
const ESPINILLA = 90;
const HOMBRO_Y = -122;
const CUELLO_Y = -134;
const BRAZO = 74;
const ANTEBRAZO = 68;

export interface Pose {
  dx: number;
  giro: number;
  torso: number;
  cabeza: number;
  hombroD: number;
  codoD: number;
  hombroT: number;
  codoT: number;
  musloD: number;
  rodillaD: number;
  musloT: number;
  rodillaT: number;
  /** 0..1: dedo índice estirado. */
  punta: number;
}

const DE_PIE: Pose = { dx: 0, giro: 0, torso: 0, cabeza: 0, hombroD: 6, codoD: 14, hombroT: -5, codoT: 10, musloD: 3, rodillaD: 3, musloT: -3, rodillaT: 4, punta: 0 };

function mezclaPose(a: Pose, b: Pose, k: number): Pose {
  const r = { ...a };
  for (const c of Object.keys(a) as (keyof Pose)[]) r[c] = mezclar(a[c], b[c], k);
  return r;
}

/** Lo que se mueve siempre: respiración, peso que cambia de pie, cabeza que mira, brazos que no cuelgan muertos. */
function vida(t: number, s: number, fuerza = 1): Partial<Pose> {
  return {
    torso: (1.3 * onda(t, 0.28, s) + 1.2 * ruido(t * 0.35, s)) * fuerza,
    cabeza: (3.5 * ruido(t * 0.45, s + 3) + 1.2 * onda(t, 0.28, s + 1)) * fuerza,
    hombroD: 4 * ruido(t * 0.55, s + 5) * fuerza,
    hombroT: 4 * ruido(t * 0.5, s + 8) * fuerza,
    codoD: 5 * ruido(t * 0.6, s + 9) * fuerza,
    dx: 2.5 * onda(t, 0.18, s) * fuerza,
  };
}

function sumar(p: Pose, d: Partial<Pose>): Pose {
  const r = { ...p };
  for (const c of Object.keys(d) as (keyof Pose)[]) r[c] += d[c] ?? 0;
  return r;
}

export interface Recorrido {
  /** Desplazamiento horizontal en píxeles de pantalla desde x. */
  readonly avance: number;
  /** Velocidad relativa 0..1 (para la amplitud del paso). */
  readonly ritmo: number;
  /** Distancia recorrida en unidades del esqueleto (para la fase del paso, sin patinar). */
  readonly distancia: number;
}

/** Ida de x a hasta con arranque y frenada suaves, entre el retraso y casi el final de la escena. */
export function recorrido(distanciaPx: number, tl: number, dur: number, escalaPx: number): Recorrido {
  const t0 = 0.1;
  const t1 = Math.max(t0 + 0.6, dur - 0.35);
  const x = limitar((tl - t0) / (t1 - t0));
  // Perfil de velocidad trapezoidal: arranca, va parejo y frena. pos es la integral de la velocidad.
  const a = 0.18;
  const total = 1 - a;
  const pos = x < a ? (x * x) / (2 * a) : x > 1 - a ? total - ((1 - x) * (1 - x)) / (2 * a) : a / 2 + (x - a);
  const avance = (pos / total) * distanciaPx;
  const ritmo = x <= 0 || x >= 1 ? 0 : x < a ? x / a : x > 1 - a ? (1 - x) / a : 1;
  return { avance, ritmo: Math.abs(distanciaPx) < 2 ? 0 : coseno(ritmo), distancia: Math.abs(avance) / escalaPx };
}

/** La pose de una acción en el segundo tl (desde que empieza la acción de la figura) de una escena de dur segundos. */
export function poseHumana(accion: Accion, tl: number, dur: number, t: number, s: number, v: Variante, rec: Recorrido | null, objeto: Objeto): Pose {
  const encorvado = v.encorvado;
  let p: Pose = { ...DE_PIE, torso: encorvado, cabeza: -encorvado * 0.6 };
  const conObjeto = objeto !== 'nada';
  if (conObjeto) p = { ...p, hombroD: 18, codoD: 40 };
  if (objeto === 'lanza') p = { ...p, hombroD: 14, codoD: 62 };
  if (objeto === 'farol') p = { ...p, hombroD: 30, codoD: 30 };
  if (objeto === 'baston') p = { ...p, hombroD: 26, codoD: 18 };
  const k = (a: number, b: number): number => suave(tl, a, b);

  switch (accion) {
    case 'camina':
    case 'corre': {
      const r = rec ?? { ritmo: 0, distancia: 0, avance: 0 };
      const corre = accion === 'corre';
      const ciclo = corre ? 470 : 300;
      const fase = (2 * Math.PI * r.distancia) / ciclo;
      const amp = r.ritmo;
      const A = corre ? 38 : 24;
      const sD = Math.sin(fase);
      p = {
        ...p,
        torso: encorvado + (corre ? 14 : 4) * amp,
        cabeza: p.cabeza - (corre ? 6 : 1) * amp,
        musloD: A * amp * sD,
        musloT: -A * amp * sD,
        rodillaD: 4 + (corre ? 75 : 40) * amp * Math.max(0, Math.cos(fase)) ** 1.4,
        rodillaT: 4 + (corre ? 75 : 40) * amp * Math.max(0, -Math.cos(fase)) ** 1.4,
        hombroD: conObjeto ? p.hombroD + 4 * amp * sD : 6 - (corre ? 34 : 18) * amp * sD,
        hombroT: -4 + (corre ? 34 : 18) * amp * sD,
        codoD: conObjeto ? p.codoD : 14 + (corre ? 70 : 12) * amp,
        codoT: 10 + (corre ? 70 : 12) * amp,
      };
      return sumar(p, vida(t, s, 0.5));
    }
    case 'habla': {
      p = {
        ...p,
        hombroD: conObjeto ? p.hombroD + 8 * ruido2(t * 1.1, s) : 28 + 20 * ruido2(t * 1.3, s),
        codoD: conObjeto ? p.codoD : 62 + 32 * ruido2(t * 1.7, s + 3),
        hombroT: 2 + 10 * ruido2(t * 0.9, s + 4),
        codoT: 30 + 20 * ruido(t * 1.2, s + 6),
        torso: encorvado + 3 + 2 * ruido(t * 0.8, s + 2),
        cabeza: p.cabeza + 5 * onda(t, 1.15, s) + 3 * ruido(t, s + 7),
      };
      return sumar(p, vida(t, s, 0.6));
    }
    case 'senala': {
      const q = k(0.05, 0.5);
      p = {
        ...p,
        hombroD: mezclar(p.hombroD, 86, q) + 2.5 * onda(t, 0.9, s),
        codoD: mezclar(p.codoD, 4, q),
        hombroT: mezclar(p.hombroT, -14, q),
        torso: encorvado + 5 * q,
        cabeza: p.cabeza - 5 * q,
        musloD: mezclar(3, 14, q),
        musloT: mezclar(-3, -10, q),
        punta: q,
      };
      return sumar(p, vida(t, s, 0.5));
    }
    case 'levanta_brazos': {
      const q = k(0.05, 0.65);
      p = {
        ...p,
        hombroD: mezclar(p.hombroD, 158, q) + 7 * onda(t, 0.85, s) * q,
        hombroT: mezclar(p.hombroT, 146, q) + 7 * onda(t, 0.85, s + 1.4) * q,
        codoD: mezclar(p.codoD, 14, q),
        codoT: mezclar(p.codoT, 14, q),
        cabeza: p.cabeza - 22 * q,
        torso: encorvado * (1 - 0.5 * q) - 6 * q,
      };
      return sumar(p, vida(t, s, 0.4));
    }
    case 'se_inclina': {
      const q = k(0.1, 0.95);
      const lean = encorvado + 44 * q + 2 * onda(t, 0.35, s) * q;
      p = { ...p, torso: lean, cabeza: 14 * q + p.cabeza * (1 - q), hombroD: conObjeto ? p.hombroD + lean * 0.8 : lean * 0.9 + 8, hombroT: lean * 0.9 - 2, codoD: conObjeto ? p.codoD : 12, codoT: 8, musloD: 4, musloT: -6 };
      return sumar(p, vida(t, s, 0.35));
    }
    case 'arrodilla': {
      const q = k(0.1, 1.0);
      const sostiene = objeto === 'antorcha' || objeto === 'farol';
      p = {
        ...p,
        musloD: mezclar(3, 84, q),
        rodillaD: mezclar(3, 86, q),
        musloT: mezclar(-3, -4, q),
        rodillaT: mezclar(4, 96, q),
        torso: mezclar(encorvado, encorvado * 0.5 + 6, q),
        cabeza: mezclar(p.cabeza, 14, q),
        hombroD: sostiene ? mezclar(p.hombroD, 52, q) : mezclar(p.hombroD, 34, q),
        codoD: sostiene ? mezclar(p.codoD, 34, q) : mezclar(p.codoD, 50, q),
        hombroT: mezclar(p.hombroT, 18, q),
        codoT: mezclar(p.codoT, 40, q),
      };
      return sumar(p, vida(t, s, 0.45));
    }
    case 'llora': {
      const q = k(0.05, 0.6);
      const sollozo = Math.max(0, onda(t, 1.1, s)) ** 3;
      p = {
        ...p,
        torso: encorvado + 22 * q + 3.5 * sollozo * q,
        cabeza: 28 * q + p.cabeza * (1 - q) + 2 * onda(t, 4.2, s) * sollozo,
        hombroD: mezclar(p.hombroD, 92, q) + 5 * sollozo,
        codoD: mezclar(p.codoD, 128, q),
        hombroT: mezclar(p.hombroT, 84, q) + 5 * sollozo,
        codoT: mezclar(p.codoT, 122, q),
        musloD: 6,
        rodillaD: 10,
        rodillaT: 10,
      };
      return sumar(p, vida(t, s, 0.3));
    }
    case 'lucha': {
      const q = k(0, 0.35);
      const fase = (tl - LUCHA.primero + LUCHA.periodo) / LUCHA.periodo;
      const pt = ((fase % 1) + 1) % 1;
      const golpe = tl < LUCHA.primero - 0.3 ? 0 : pt < 0.22 ? suave(pt, 0, 0.22) : 1 - suave(pt, 0.22, 1);
      p = {
        ...p,
        musloD: 28 * q,
        rodillaD: 26 * q,
        musloT: -24 * q,
        rodillaT: 14 * q,
        torso: encorvado + (6 + 12 * golpe) * q,
        cabeza: -4 * q,
        hombroD: mezclar(p.hombroD, 36 + 56 * golpe, q),
        codoD: mezclar(p.codoD, 74 - 66 * golpe, q),
        hombroT: mezclar(p.hombroT, 52, q),
        codoT: mezclar(p.codoT, 76, q),
        dx: 16 * golpe * q,
      };
      return sumar(p, vida(t, s, 0.3));
    }
    case 'cae': {
      const tropieza = suave(tl, 0, CAIDA.espera);
      const a = caida(tl, CAIDA.espera, CAIDA.espera + CAIDA.dura);
      const tras = tl - CAIDA.espera - CAIDA.dura;
      const rebote = tras > 0 ? 5 * Math.exp(-tras * 7) * Math.sin(tras * 22) : 0;
      p = {
        ...p,
        giro: -88 * a + rebote,
        torso: encorvado * (1 - a) - 8 * tropieza * (1 - a),
        cabeza: -12 * tropieza * (1 - a) - 6 * a,
        hombroD: mezclar(mezclar(p.hombroD, 60, tropieza), 150, a) - (tras > 0 ? 144 * suave(tras, 0, 0.7) : 0),
        hombroT: mezclar(mezclar(p.hombroT, 40, tropieza), 120, a) - (tras > 0 ? 118 * suave(tras, 0, 0.7) : 0),
        codoD: 20 - (tras > 0 ? 12 * suave(tras, 0, 0.7) : 0),
        codoT: 20 - (tras > 0 ? 12 * suave(tras, 0, 0.7) : 0),
        musloD: 10 * tropieza * (1 - a) + 4 * a,
        rodillaD: 14 * (1 - a),
        musloT: -6 * (1 - a),
      };
      return sumar(p, vida(t, s, 0.2 * (1 - a)));
    }
    case 'yace': {
      const respira = 0.6 * onda(t, 0.22, s);
      return { ...p, giro: -90, torso: respira, cabeza: -6 + 0.8 * onda(t, 0.22, s + 1), hombroD: 5 + 0.6 * onda(t, 0.22, s), codoD: 8, hombroT: 3, codoT: 6, musloD: 2, rodillaD: 3, musloT: 0, rodillaT: 5, dx: 0 };
    }
    default:
      return sumar(p, vida(t, s, 1));
  }
}

// ——— Formas (cada una en el marco de su pieza) ———

function cabezaD(v: Variante, cal: boolean): string {
  const n = v.nariz - 1;
  const pts: [number, number][] = [
    [-9, 2],
    [-10, -14],
    [-23, -25],
    [-27, -43],
    [-19, -61],
    [-1, -68],
    [15, -62],
    [21, -51],
    [22, -44],
    [25 + 4 * n, -39 + 2 * n],
    [30 + 12 * n, -33 + 7 * n],
    [23 + 2 * n, -29 + 2 * n],
    [25, -25],
    [22, -22],
    [24, -18],
    [18, -11],
    [8, -9],
    [8, 2],
  ];
  return curva(pts) + (cal ? ' ' + agujeroElipse(12, -43, 4.4, 2.3) : '');
}

function peloD(v: Variante, s: number): string {
  switch (v.pelo) {
    case 'largo':
      return curva([
        [-2, -69],
        [-20, -63],
        [-30, -48],
        [-32, -24],
        [-33 + s * 0.2, 4],
        [-37 + s * 0.5, 36],
        [-36 + s * 0.9, 66],
        [-29 + s, 84],
        [-22 + s * 0.8, 64],
        [-18 + s * 0.5, 34],
        [-15 + s * 0.2, 6],
        [-12, -18],
        [-4, -40],
        [6, -58],
        [14, -63],
      ]);
    case 'coleta':
      return (
        curva([
          [-14, -66],
          [-28, -58],
          [-40 + s * 0.3, -44],
          [-48 + s * 0.6, -18],
          [-46 + s, 6],
          [-38 + s, 2],
          [-36 + s * 0.5, -22],
          [-26, -44],
        ]) +
        ' ' +
        curva([
          [-2, -70],
          [-22, -62],
          [-28, -44],
          [-16, -52],
          [4, -62],
        ])
      );
    case 'mono':
      return circulo(-22, -60, 13);
    case 'corto':
      return curva([
        [-27, -42],
        [-25, -60],
        [-8, -71],
        [10, -67],
        [18, -60],
        [6, -62],
        [-12, -60],
        [-22, -38],
      ]);
    default:
      return '';
  }
}

function barbaD(s: number): string {
  return curva([
    [20, -14],
    [23, -6],
    [18, 14],
    [8, 34],
    [2 + s * 0.4, 48],
    [-3, 30],
    [2, 4],
    [6, -8],
  ]);
}

function pluma(largo: number, ancho: number, cal: boolean): string {
  const L = largo;
  return (
    curva([
      [0, 0],
      [ancho * 0.9, -L * 0.25],
      [ancho, -L * 0.6],
      [ancho * 0.4, -L * 0.92],
      [0, -L],
      [-ancho * 0.4, -L * 0.92],
      [-ancho, -L * 0.6],
      [-ancho * 0.9, -L * 0.25],
    ]) + (cal ? ' ' + agujeroElipse(0, -L * 0.6, 1.6, L * 0.22) : '')
  );
}

/** El tocado: piezas en el marco de la cabeza (o con su propia matriz, como las plumas). */
function tocado(v: Variante, H: Matriz, t: number, s: number, cal: boolean, viento: number): Pieza[] {
  const piezas: Pieza[] = [];
  switch (v.tocado) {
    case 'penacho': {
      piezas.push({ d: poligono([[-27, -47], [21, -55], [22, -48], [-26, -40]]) + (cal ? ` ${agujeroCirculo(-12, -46, 2.2)} ${agujeroCirculo(0, -48, 2.2)} ${agujeroCirculo(12, -50, 2.2)}` : ''), m: H });
      for (let i = 0; i < 6; i++) {
        const ang = 18 - i * 17 + 5 * ruido2(t * 0.9 + i * 0.3, s + i) + viento * (0.4 + i * 0.12);
        piezas.push({ d: pluma(96 - i * 6, 9, cal), m: cadena(H, mover(-9 + i * 2.5, -62 + i * 1.5), girar(ang)) });
      }
      break;
    }
    case 'corona':
      piezas.push({
        d:
          poligono([[-20, -58], [-23, -86], [-12, -71], [-4, -95], [5, -71], [15, -87], [18, -59]]) +
          (cal ? ` ${agujeroCirculo(-4, -66, 3.2)} ${agujeroCirculo(-13, -64, 2.4)} ${agujeroCirculo(9, -64, 2.4)}` : ''),
        m: cadena(H, girar(-6)),
      });
      break;
    case 'casco': {
      piezas.push({
        d:
          curva([[-29, -34], [-31, -56], [-14, -73], [6, -73], [21, -63], [26, -48], [27, -38], [15, -40], [13, -31], [-4, -27], [-19, -20], [-27, -24]]) +
          (cal ? ' ' + agujeroElipse(14, -47, 9, 1.8) : ''),
        m: H,
      });
      const ondula = 6 * ruido2(t * 0.8, s) + viento * 0.6;
      piezas.push({
        d: banda(
          [
            { x: -2, y: -72 },
            { x: -20, y: -92 },
            { x: -46, y: -98 + ondula * 0.3 },
            { x: -70, y: -86 + ondula * 0.7 },
            { x: -86, y: -62 + ondula },
          ],
          (i, n) => 7 + 16 * Math.sin((Math.PI * i) / (n - 1)),
        ),
        m: H,
      });
      break;
    }
    case 'capucha':
      piezas.push({
        d: curva([[20, -55], [10, -71], [-8, -78], [-29, -67], [-39, -40], [-43, -6], [-41, 28], [-30, 44], [-8, 42], [2, 22], [-5, 0], [-9, -24], [5, -46], [13, -52]]),
        m: H,
      });
      break;
    case 'sombrero': {
      const punta = 10 * ruido2(t * 0.7, s) + viento * 0.8;
      piezas.push({ d: curva([[-48, -57], [0, -66], [46, -62], [48, -56], [0, -55], [-46, -51]]), m: H });
      piezas.push({ d: curva([[-20, -60], [-15, -100], [-9, -130], [-22 - punta, -166], [-4, -128], [5, -96], [17, -62]]), m: H });
      break;
    }
    case 'tiara':
      piezas.push({ d: poligono([[-14, -64], [-4, -68], [2, -82], [7, -68], [16, -62], [14, -58], [2, -63], [-12, -59]]) + (cal ? ' ' + agujeroCirculo(2, -73, 2.2) : ''), m: H });
      break;
    default:
      break;
  }
  return piezas;
}

function torsoD(v: Variante, cal: boolean): string {
  const pts: [number, number][] = v.femenina
    ? [[-17, 6], [-15, -40], [-19, -80], [-21, -112], [-17, -128], [-7, -136], [6, -136], [17, -128], [24, -110], [26, -98], [19, -84], [14, -56], [17, -20], [18, 6], [0, 10]]
    : [[-20, 6], [-22, -30], [-25, -75], [-27, -108], [-22, -126], [-10, -136], [0, -139], [10, -137], [22, -128], [28, -110], [27, -86], [22, -60], [21, -30], [20, 6], [0, 12]];
  let d = curva(pts.map(([x, y]) => [x * v.ancho, y]));
  if (!cal) return d;
  if (v.adorno === 'rombos') d += ` ${agujeroRombo(-7, -100, 5, 7)} ${agujeroRombo(8, -100, 5, 7)} ${agujeroRombo(1, -80, 4, 6)} ${agujeroCirculo(-12, -14, 2.6)} ${agujeroCirculo(-3, -14, 2.6)} ${agujeroCirculo(6, -14, 2.6)} ${agujeroCirculo(14, -14, 2.6)}`;
  if (v.adorno === 'collar') d += ` ${agujeroCirculo(-4, -125, 2.4)} ${agujeroCirculo(2, -120, 2.4)} ${agujeroCirculo(9, -118, 2.4)} ${agujeroCirculo(15, -121, 2.4)}`;
  if (v.adorno === 'medalla') d += ` ${agujeroCirculo(10, -104, 8)} ${circulo(10, -104, 4)}`;
  return d;
}

function manoD(): string {
  return (
    curva([[-6, -2], [6, -2], [8, 9], [4, 17], [-3, 17], [-7, 9]]) +
    ' ' +
    curva([[5, 2], [12, 6], [10, 11], [5, 8]])
  );
}

function pieD(): string {
  return curva([[-7, -8], [-9, 3], [-3, 8], [27, 8], [31, 3], [24, -3], [6, -8]]);
}

function mangaD(): string {
  return curva([[-8, 2], [8, 0], [14, 34], [6, 60], [-14, 56], [-12, 24]]);
}

function escudoD(tipo: 'redondo' | 'blason', cal: boolean): string {
  if (tipo === 'redondo') {
    let d = circulo(0, 0, 36);
    if (cal) {
      d += ' ' + agujeroCirculo(0, 0, 7);
      for (let i = 0; i < 8; i++) d += ' ' + agujeroCirculo(Math.cos((i * Math.PI) / 4) * 24, Math.sin((i * Math.PI) / 4) * 24, 3.2);
    }
    for (let i = 0; i < 4; i++) d += ' ' + curva([[-16 + i * 10.5, 30], [-12 + i * 10.5, 52], [-14 + i * 10.5, 64], [-18 + i * 10.5, 50]]);
    return d;
  }
  let d = curva([[-30, -34], [0, -38], [30, -34], [30, 0], [18, 26], [0, 40], [-18, 26], [-30, 0]], true, 0.6);
  if (cal) d += ` ${agujeroPoligono([[-3, -26], [3, -26], [3, -8], [-3, -8]])} ${agujeroPoligono([[-3, 2], [3, 2], [3, 28], [-3, 28]])} ${agujeroPoligono([[-20, -7], [-5, -7], [-5, -1], [-20, -1]])} ${agujeroPoligono([[5, -7], [20, -7], [20, -1], [5, -1]])}`;
  return d;
}

/** El objeto en la mano: su trazo (agarre en 0,0; eje hacia arriba) y si da luz. */
function objetoD(o: Objeto, t: number, s: number, cal: boolean): { sombra: string; llama: string; luz: [number, number] | null } {
  switch (o) {
    case 'antorcha': {
      const a = ruido2(t * 6, s);
      const b = ruido2(t * 7.3, s + 4);
      return {
        sombra: `${poligono([[-4, 36], [4, 36], [5, -50], [-5, -50]])} ${poligono([[-12, -48], [12, -48], [9, -62], [-9, -62]])}`,
        llama: curva([[-11, -60], [-14 + a * 3, -76], [-6 + b * 4, -96], [a * 7, -118 - 8 * b], [7 + b * 3, -94], [13 + a * 2, -76], [11, -60]]),
        luz: [a * 4, -86],
      };
    }
    case 'lanza':
      return {
        sombra:
          `${poligono([[-3, 112], [3, 112], [3, -106], [-3, -106]])} ` +
          curva([[0, -152], [8, -128], [5, -108], [-5, -108], [-8, -128]]) +
          ' ' +
          curva([[-2, -104], [-12, -94], [-10, -84], [-2, -96]]),
        llama: '',
        luz: null,
      };
    case 'espada':
      return {
        sombra: `${poligono([[-4.5, -14], [4.5, -14], [3, -112], [0, -126], [-3, -112]])} ${poligono([[-17, -10], [17, -10], [17, -17], [-17, -17]])} ${poligono([[-3, -10], [3, -10], [3, 12], [-3, 12]])} ${circulo(0, 16, 5)}`,
        llama: '',
        luz: null,
      };
    case 'baston':
      return {
        sombra: banda(
          [
            { x: 12, y: -14 },
            { x: 6, y: -22 },
            { x: -3, y: -18 },
            { x: -1, y: -4 },
            { x: 0, y: 70 },
            { x: 0, y: 150 },
          ],
          () => 7,
        ),
        llama: '',
        luz: null,
      };
    case 'escoba':
      return {
        sombra: `${poligono([[-3, -72], [3, -72], [3, 108], [-3, 108]])} ${curva([[-5, 102], [5, 102], [20, 150], [9, 157], [0, 150], [-9, 157], [-20, 150]])}`,
        llama: '',
        luz: null,
      };
    case 'flor': {
      let petalos = '';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        petalos += ' ' + elipse(Math.cos(a) * 9, -72 + Math.sin(a) * 9, 6, 6);
      }
      return {
        sombra: banda([{ x: 0, y: 10 }, { x: 2, y: -20 }, { x: -2, y: -50 }, { x: 0, y: -66 }], () => 4) + petalos + ' ' + circulo(0, -72, 4),
        llama: '',
        luz: null,
      };
    }
    case 'farol':
      return {
        sombra:
          banda([{ x: 0, y: 0 }, { x: -8, y: 10 }, { x: 0, y: 22 }], () => 3) +
          ' ' +
          poligono([[-16, 20], [16, 20], [12, 26], [-12, 26]]) +
          ' ' +
          poligono([[-13, 26], [13, 26], [11, 60], [-11, 60]]) +
          ' ' +
          (cal ? `${agujeroPoligono([[-8, 31], [-1.5, 31], [-1.5, 55], [-7, 55]])} ${agujeroPoligono([[1.5, 31], [8, 31], [7, 55], [1.5, 55]])}` : ''),
        llama: cal ? `${poligono([[-8, 31], [-1.5, 31], [-1.5, 55], [-7, 55]])} ${poligono([[1.5, 31], [8, 31], [7, 55], [1.5, 55]])}` : '',
        luz: [0, 42],
      };
    default:
      return { sombra: '', llama: '', luz: null };
  }
}

/** Ángulo del objeto respecto al cuerpo según qué se hace con él. */
function anguloObjeto(o: Objeto, accion: Accion, antebrazo: number, t: number, s: number): number {
  const brazo = antebrazo + 172;
  switch (o) {
    case 'antorcha':
      return accion === 'levanta_brazos' ? antebrazo + 180 : -6 + 4 * ruido(t * 0.8, s);
    case 'lanza':
      return accion === 'lucha' ? brazo - 6 : accion === 'levanta_brazos' ? antebrazo + 180 : 2 + 2 * ruido(t * 0.5, s);
    case 'espada':
      return accion === 'lucha' || accion === 'levanta_brazos' || accion === 'senala' ? brazo : antebrazo + 160;
    case 'baston':
      return 4 + 2 * ruido(t * 0.6, s);
    case 'escoba':
      return 30;
    case 'flor':
      return -14 + 6 * ruido(t * 0.7, s);
    case 'farol':
      return 5 * onda(t, 0.55, s);
    default:
      return 0;
  }
}

export interface OpcionesHumano {
  readonly figura: string;
  readonly accion: Accion;
  readonly objeto: Objeto | undefined;
  /** Posición del punto bajo la cadera en la pantalla. */
  readonly x: number;
  readonly suelo: number;
  readonly escala: number;
  readonly direccion: 1 | -1;
  readonly tl: number;
  readonly dur: number;
  readonly rec: Recorrido | null;
  readonly varillas: boolean;
}

/** Dibuja una persona: piezas colocadas en la pantalla, luces de lo que lleva y puntos de las varillas. */
export function dibujarHumano(o: OpcionesHumano, ctx: Contexto): Dibujo {
  const v = VARIANTES[o.figura] ?? VARIANTES.hombre;
  const objeto = o.objeto ?? v.objeto;
  const { t, semilla: s, calados: cal } = ctx;
  const p = poseHumana(o.accion, o.tl, o.dur, t, s, v, o.rec, objeto);
  const a = v.ancho;
  const escala = o.escala * v.talla;
  const viento = (o.rec?.ritmo ?? 0) * (o.accion === 'corre' ? 26 : 12);

  // Cuerpo con la cadera en (0,0); luego se apoya en el suelo.
  const B = cadena(mover(p.dx, 0), girar(p.giro));
  const T = cadena(B, girar(p.torso));
  const H = cadena(T, mover(0, CUELLO_Y), girar(p.cabeza), escalar(v.cabeza));
  const SD = cadena(T, mover(4, HOMBRO_Y), girar(-p.hombroD));
  const ED = cadena(SD, mover(0, BRAZO), girar(-p.codoD));
  const MD = cadena(ED, mover(0, ANTEBRAZO));
  const ST = cadena(T, mover(-4, HOMBRO_Y), girar(-p.hombroT));
  const ET = cadena(ST, mover(0, BRAZO), girar(-p.codoT));
  const MT = cadena(ET, mover(0, ANTEBRAZO));
  const UD = cadena(B, mover(3, 0), girar(-p.musloD));
  const RD = cadena(UD, mover(0, MUSLO), girar(p.rodillaD));
  const PD = cadena(RD, mover(0, ESPINILLA), girar((p.musloD - p.rodillaD) * 0.85));
  const UT = cadena(B, mover(-3, 0), girar(-p.musloT));
  const RT = cadena(UT, mover(0, MUSLO), girar(p.rodillaT));
  const PT = cadena(RT, mover(0, ESPINILLA), girar((p.musloT - p.rodillaT) * 0.85));

  // Apoyo: el punto más bajo (pies, rodillas, cadera, espalda, cabeza) toca el suelo.
  const apoyos: Array<[Matriz, number, number, number]> = [
    [PD, 28, 8, 1],
    [PD, -8, 8, 1],
    [PT, 28, 8, 1],
    [PT, -8, 8, 1],
    [RD, 0, 0, 12],
    [RT, 0, 0, 12],
    [B, 0, 0, 22],
    [T, 0, -70, 24],
    [T, 0, HOMBRO_Y, 20],
    [H, 0, -36, 26],
  ];
  let bajo = -Infinity;
  for (const [m, x, y, r] of apoyos) bajo = Math.max(bajo, aplicar(m, x, y).y + r);
  const R = cadena(mover(o.x, o.suelo), escalar(o.direccion * escala, escala), mover(0, -bajo));
  const en = (m: Matriz): Matriz => cadena(R, m);

  const piezas: Pieza[] = [];
  const ponerSombra = (d: string, m: Matriz): void => {
    if (d !== '') piezas.push({ d, m: en(m) });
  };

  // Detrás: brazo de atrás, capa, pierna de atrás.
  if (v.capa) {
    const flota = viento + 6 * ruido2(t * 0.7, s + 11);
    ponerSombra(
      curva([[10, -134], [-14, -134], [-28, -102], [-36, -30], [-44 - flota * 0.5, 50], [-52 - flota, 128], [-30 - flota * 0.8, 150], [-8 - flota * 0.4, 140], [-8, 60], [-4, -40]]),
      T,
    );
  }
  ponerSombra(capsula(BRAZO, 20 * a, 15 * a), ST);
  ponerSombra(capsula(ANTEBRAZO, 15 * a, 11 * a), ET);
  ponerSombra(manoD(), MT);
  if (v.mangas) ponerSombra(mangaD(), ET);
  ponerSombra(capsula(MUSLO, 26 * a, 19 * a), UT);
  ponerSombra(capsula(ESPINILLA, 19 * a, 13 * a), RT);
  ponerSombra(pieD(), PT);
  // Pierna de delante.
  ponerSombra(capsula(MUSLO, 26 * a, 19 * a), UD);
  ponerSombra(capsula(ESPINILLA, 19 * a, 13 * a), RD);
  ponerSombra(pieD(), PD);
  // Torso y faldas.
  ponerSombra(torsoD(v, cal), T);
  if (v.falda !== 'no') {
    const larga = v.falda === 'larga';
    const enPierna = (m: Matriz): { x: number; y: number } => (larga ? aplicar(m, 0, ESPINILLA * 0.9) : aplicar(m, 0, MUSLO * 0.55));
    const h1 = enPierna(larga ? RD : UD);
    const h2 = enPierna(larga ? RT : UT);
    const atras = h1.x < h2.x ? h1 : h2;
    const delante = h1.x < h2.x ? h2 : h1;
    const cin = aplicar(T, 0, -16);
    const ancho = (larga ? 20 : 24) * a;
    const vuelo = viento * 0.5;
    const hA = { x: atras.x - (larga ? 30 : 14) * a - vuelo, y: atras.y + (larga ? 2 : 6) };
    const hD = { x: delante.x + (larga ? 28 : 14) * a, y: delante.y + (larga ? 2 : 6) };
    const pts: [number, number][] = [[cin.x + ancho * 0.85, cin.y], [cin.x - ancho, cin.y]];
    pts.push([mezclar(cin.x - ancho, hA.x, 0.5) - 6, mezclar(cin.y, hA.y, 0.5)]);
    pts.push([hA.x, hA.y]);
    const dientes = larga ? 5 : 6;
    for (let i = 1; i < dientes; i++) {
      const k = i / dientes;
      pts.push([mezclar(hA.x, hD.x, k), mezclar(hA.y, hD.y, k) + (i % 2 === 0 ? 0 : larga ? -5 : -9)]);
    }
    pts.push([hD.x, hD.y]);
    pts.push([mezclar(cin.x + ancho, hD.x, 0.5) + 6, mezclar(cin.y, hD.y, 0.5)]);
    let calado = '';
    if (cal && larga) {
      for (let i = 1; i <= 5; i++) {
        const k = i / 6;
        const cx = mezclar(hA.x, hD.x, k);
        const cy = mezclar(hA.y, hD.y, k) - 22;
        calado += ' ' + agujeroRombo(mezclar(cx, cin.x, 0.08), cy, 4, 6);
      }
      calado += ' ' + agujeroRombo(mezclar(hA.x, hD.x, 0.5) * 0.5 + cin.x * 0.5, mezclar(cin.y, mezclar(hA.y, hD.y, 0.5), 0.55), 5, 8);
    }
    ponerSombra(curva(pts) + calado, cadena());
  }
  // Cabeza, pelo, tocado y barba.
  const sPelo = -viento * 0.7 + 4 * ruido2(t * 0.6, s + 13);
  ponerSombra(peloD(v, sPelo), H);
  ponerSombra(cabezaD(v, cal), H);
  if (v.barba) ponerSombra(barbaD(3 * ruido2(t * 0.7, s + 17)), H);
  for (const pz of tocado(v, H, t, s, cal, -viento)) ponerSombra(pz.d, pz.m);
  // Escudo en el brazo de atrás (de frente al público).
  if (v.escudo !== 'no' && o.accion !== 'yace' && o.accion !== 'cae') {
    const c = aplicar(ET, 0, 34);
    ponerSombra(escudoD(v.escudo, cal), cadena(mover(c.x, c.y), girar(p.giro + p.torso * 0.3)));
  }
  // Brazo de delante y lo que lleva.
  ponerSombra(capsula(BRAZO, 20 * a, 15 * a), SD);
  ponerSombra(capsula(ANTEBRAZO, 15 * a, 11 * a), ED);
  if (v.mangas) ponerSombra(mangaD(), ED);
  ponerSombra(manoD(), MD);
  if (p.punta > 0.05) ponerSombra(capsula(16 * p.punta, 5, 4), cadena(MD, mover(2, 14)));

  const luces: Dibujo['luces'] = [];
  if (objeto !== 'nada') {
    const antebrazo = p.giro + p.torso - p.hombroD - p.codoD;
    const agarre = aplicar(MD, 0, 10);
    const O = cadena(mover(agarre.x, agarre.y), girar(anguloObjeto(objeto, o.accion, antebrazo, t, s) + (o.accion === 'yace' ? 0 : 0)));
    const ob = objetoD(objeto, t, s, cal);
    ponerSombra(ob.sombra, O);
    if (ob.llama !== '') piezas.push({ d: ob.llama, m: en(O), tipo: 'llama' });
    if (ob.luz !== null) {
      const c = aplicar(en(O), ob.luz[0], ob.luz[1]);
      luces.push({ x: c.x, y: c.y, r: objeto === 'antorcha' ? 300 : 220, fuerza: (objeto === 'antorcha' ? 0.6 : 0.45) * (0.85 + 0.15 * ruido2(t * 5, s)), color: '#FFB24A' });
    }
  }

  const varillas: Dibujo['varillas'] = [];
  if (o.varillas) {
    varillas.push(aplicar(en(MD), 0, 6));
    varillas.push(aplicar(en(T), 0, -96));
    if (o.accion !== 'yace' && o.accion !== 'cae') varillas.push(aplicar(en(MT), 0, 6));
  }
  return { piezas, luces, varillas };
}
