// Las acciones de la lista cerrada, animadas por código: cada una es una función del tiempo de la escena que devuelve
// la pose del muñeco (giros de hombros, codos, caderas, rodillas, cabeza, boca y ojos). Determinista: solo senos,
// tramos y la fase propia de cada personaje.

import { inicioAccion, momentoCaida, type Accion, type Objeto } from './reglas.ts';

export interface Pose {
  /** Desplazamiento sobre el suelo respecto a su sitio (entrar caminando). */
  dx: number;
  dz: number;
  /** Salto. */
  y: number;
  /** Hacia dónde mira (rad, 0 = a cámara). */
  giro: number;
  /** 0..1: tumbado de lado. */
  caida: number;
  /** Inclinación del cuerpo hacia delante y de lado. */
  inclina: number;
  ladeo: number;
  cabeza: [number, number, number];
  /** Hombro: [adelante (negativo) / atrás, abierto hacia fuera]. */
  hombroD: [number, number];
  codoD: number;
  hombroI: [number, number];
  codoI: number;
  musloD: number;
  rodillaD: number;
  musloI: number;
  rodillaI: number;
  /** 0..1 */
  sentado: number;
  /** 0..1: boca abierta. */
  boca: number;
  /** Alto de los ojos: 0 cerrados, 1 normales, 1.6 de sorpresa. */
  ojos: number;
  /** Animales: vaivén de las patas y de la cola. */
  patas: number;
  cola: number;
}

export interface ContextoPose {
  readonly indice: number;
  readonly duracion: number;
  /** 0..1, propia de cada personaje: que no se muevan todos a la vez. */
  readonly fase: number;
  readonly giroMira: number;
  /** -1: entra desde la izquierda; 1: desde la derecha. */
  readonly entrada: number;
  readonly objeto: Objeto | 'baston';
  readonly encorvado: number;
  /** Boca de la voz en ese segundo de la escena (0..1). */
  hablando(tl: number): number;
}

const PI = Math.PI;
const limitar = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));
const suave = (a: number, b: number, x: number): number => {
  const k = limitar((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mezcla = (a: number, b: number, k: number): number => a + (b - a) * k;

function parpadeo(tl: number, fase: number): number {
  const ciclo = 3.3 + fase * 1.4;
  const local = (tl + fase * 7) % ciclo;
  return local < 0.13 ? 0.12 : 1;
}

function reposo(tl: number, c: ContextoPose): Pose {
  const f = c.fase * 6.28;
  const p: Pose = {
    dx: 0,
    dz: 0,
    y: 0,
    giro: c.giroMira + 0.06 * Math.sin(0.5 * tl + f),
    caida: 0,
    inclina: c.encorvado + 0.015 * Math.sin(1.9 * tl + f),
    ladeo: 0.012 * Math.sin(1.3 * tl + f),
    cabeza: [0.03 * Math.sin(1.1 * tl + f), 0.12 * Math.sin(0.6 * tl + f * 0.7), 0.03 * Math.sin(0.8 * tl + f)],
    hombroD: [0.04 * Math.sin(1.9 * tl + f), 0.1],
    codoD: -0.18,
    hombroI: [-0.04 * Math.sin(1.9 * tl + f), 0.1],
    codoI: -0.18,
    musloD: 0,
    rodillaD: 0,
    musloI: 0,
    rodillaI: 0,
    sentado: 0,
    boca: 0,
    ojos: parpadeo(tl, c.fase),
    patas: 0,
    cola: 0.35 * Math.sin(5 * tl + f),
  };
  sujetarObjeto(p, c);
  return p;
}

/** Con algo en la mano derecha, el antebrazo va hacia delante para que el objeto quede de pie. */
function sujetarObjeto(p: Pose, c: ContextoPose): void {
  if (c.objeto === 'nada') return;
  if (c.objeto === 'baston') {
    p.hombroD = [-0.3, 0.16];
    p.codoD = -0.12;
    return;
  }
  p.hombroD = [-0.3, 0.14];
  p.codoD = -1.25;
}

function marcha(p: Pose, tA: number, c: ContextoPose, corre: boolean): void {
  const distancia = corre ? 4.8 : 2.7;
  const dura = corre ? limitar(c.duracion * 0.4, 0.8, 1.6) : limitar(c.duracion * 0.6, 1.3, 3.0);
  const k = limitar(tA / dura);
  const avance = corre ? 1 - (1 - k) * (1 - k) : Math.sin((k * PI) / 2);
  p.dx = c.entrada * distancia * (1 - avance);
  const moviendo = 1 - suave(0.82, 1, k);
  const frecuencia = corre ? 3.0 : 1.9;
  const ang = 2 * PI * frecuencia * Math.max(0, tA);
  const a = (corre ? 0.95 : 0.55) * moviendo;
  p.musloD = Math.sin(ang) * a;
  p.musloI = -Math.sin(ang) * a;
  p.rodillaD = Math.max(0, Math.cos(ang)) * a * 1.3;
  p.rodillaI = Math.max(0, -Math.cos(ang)) * a * 1.3;
  if (c.objeto === 'nada') {
    p.hombroD = [p.musloI * 0.85, 0.12];
    p.codoD = -0.3 - (corre ? 1.1 : 0.1) * moviendo;
  }
  p.hombroI = [p.musloD * 0.85, 0.12];
  p.codoI = -0.3 - (corre ? 1.1 : 0.1) * moviendo;
  p.y = Math.abs(Math.sin(ang)) * (corre ? 0.09 : 0.04) * moviendo;
  p.inclina += (corre ? 0.28 : 0.05) * moviendo;
  p.patas = Math.sin(ang) * a * 1.2;
  const giroMarcha = -c.entrada * 1.3;
  p.giro = mezcla(giroMarcha, p.giro, suave(dura * 0.88, dura * 0.88 + 0.45, tA));
  if (corre && k >= 1) {
    const jadeo = 1 - suave(0, 1.6, tA - dura);
    p.inclina += 0.18 * jadeo;
    p.boca = Math.max(p.boca, 0.45 * jadeo * (0.6 + 0.4 * Math.abs(Math.sin(tA * 9))));
  }
}

export function pose(accion: Accion, tl: number, c: ContextoPose): Pose {
  const p = reposo(tl, c);
  const tA = tl - inicioAccion(c.indice);
  const conObjeto = c.objeto !== 'nada' && c.objeto !== 'baston';
  switch (accion) {
    case 'quieto':
      break;
    case 'habla': {
      p.boca = c.hablando(tl);
      const g = Math.sin(2.1 * tA + c.fase * 3);
      if (!conObjeto) {
        p.hombroD = [-0.45 - 0.35 * Math.max(0, g), 0.25];
        p.codoD = -1.0 - 0.3 * Math.max(0, g);
      }
      p.hombroI = [-0.2 - 0.3 * Math.max(0, -g), 0.22];
      p.codoI = -0.75 - 0.3 * Math.max(0, -g);
      p.cabeza[0] += 0.07 * Math.sin(4.6 * tA);
      p.ladeo += 0.03 * Math.sin(1.4 * tA);
      break;
    }
    case 'camina':
      marcha(p, tA, c, false);
      break;
    case 'corre':
      marcha(p, tA, c, true);
      break;
    case 'senala': {
      const k = suave(0, 0.35, tA);
      p.hombroD = [mezcla(p.hombroD[0], -1.5 + 0.06 * Math.sin(3.2 * tA), k), mezcla(p.hombroD[1], 0.22, k)];
      p.codoD = mezcla(p.codoD, -0.05, k);
      p.hombroI = [0.15 * k, 0.1 + 0.4 * k];
      p.codoI = -0.18 - 1.3 * k;
      p.inclina += 0.06 * k;
      p.cabeza[0] -= 0.06 * k;
      break;
    }
    case 'sorprende': {
      const tR = 0.25;
      const k = suave(tR, tR + 0.18, tA);
      const salto = tA > tR && tA < tR + 0.42 ? Math.sin((PI * (tA - tR)) / 0.42) * 0.24 : 0;
      const temblor = tA > tR + 0.5 ? 0.05 * Math.sin(30 * tA) : 0;
      p.y += salto;
      p.hombroD = [-0.35 * k, 0.1 + 2.0 * k + temblor];
      p.hombroI = [-0.35 * k, 0.1 + 2.0 * k - temblor];
      p.codoD = -0.18 - 0.5 * k;
      p.codoI = -0.18 - 0.5 * k;
      p.ojos = tA > tR ? 1 + 0.6 * k : p.ojos;
      p.boca = 0.95 * k;
      p.cabeza[0] -= 0.22 * k;
      p.inclina -= 0.12 * k;
      p.cola = 0.6 * Math.sin(18 * tl);
      break;
    }
    case 'cae': {
      const tC = momentoCaida(c.indice, c.duracion) - inicioAccion(c.indice);
      const u = (tA - tC) / 0.36;
      if (tA > tC - 0.45 && u < 0) {
        const tambaleo = Math.sin(20 * tA);
        p.hombroD = [-0.2, 1.4 + 0.5 * tambaleo];
        p.hombroI = [-0.2, 1.4 - 0.5 * tambaleo];
        p.inclina += 0.1 * Math.sin(14 * tA);
        p.ojos = 1.5;
        p.boca = 0.6;
      }
      if (u >= 0) {
        const rebote = 0.07 * Math.sin(PI * limitar((tA - tC - 0.36) / 0.22));
        p.caida = u < 1 ? u * u : 1 - rebote;
        p.hombroD = [-0.2, 1.3];
        p.hombroI = [-0.2, 1.3];
        p.codoD = -0.3;
        p.codoI = -0.3;
        p.musloD = -0.3;
        p.musloI = -0.15;
        p.ojos = u < 1 ? 1.5 : 0.12;
        p.boca = u < 1 ? 0.7 : 0;
        p.patas = 0.5;
      }
      break;
    }
    case 'celebra': {
      const periodo = 0.62;
      const k = suave(0, 0.2, tA);
      const u = tA > 0 ? (tA / periodo) % 1 : 0;
      const salto = Math.sin(PI * u) * k;
      p.y += salto * 0.22;
      p.hombroD = [-0.1, 0.1 + 2.5 * k + 0.2 * Math.sin((2 * PI * tA) / periodo)];
      p.hombroI = [-0.1, 0.1 + 2.5 * k - 0.2 * Math.sin((2 * PI * tA) / periodo)];
      p.codoD = -0.25;
      p.codoI = -0.25;
      p.musloD = -0.35 * salto;
      p.musloI = -0.35 * salto;
      p.rodillaD = 0.8 * salto;
      p.rodillaI = 0.8 * salto;
      p.boca = 0.65 * k;
      p.cola = 0.7 * Math.sin(16 * tl);
      break;
    }
    case 'sienta': {
      p.sentado = 1;
      p.musloD = -1.45;
      p.musloI = -1.45;
      p.rodillaD = 1.45;
      p.rodillaI = 1.45;
      if (!conObjeto) {
        p.hombroD = [-0.55, 0.1];
        p.codoD = -0.55;
      }
      p.hombroI = [-0.55, 0.1];
      p.codoI = -0.55;
      p.inclina += 0.05;
      break;
    }
    case 'saluda': {
      const k = suave(0, 0.3, tA);
      p.hombroD = [-0.2 * k, 0.1 + 2.3 * k + 0.32 * Math.sin(2 * PI * 2.1 * tA) * k];
      p.codoD = -0.18 - 0.3 * k;
      p.cabeza[2] += 0.12 * k;
      p.boca = 0.3 * k;
      break;
    }
    case 'piensa': {
      const k = suave(0, 0.45, tA);
      p.hombroD = [-1.05 * k, 0.1 - 0.5 * k];
      p.codoD = -0.18 - 2.1 * k;
      p.hombroI = [-0.7 * k, 0.1 - 0.45 * k];
      p.codoI = -0.18 - 1.35 * k;
      p.cabeza = [-0.16 * k + 0.03 * Math.sin(1.2 * tA), p.cabeza[1] * (1 - k) + 0.22 * k, 0.14 * k];
      p.ladeo += 0.03 * Math.sin(0.9 * tA);
      break;
    }
    case 'baila': {
      const k = suave(0, 0.3, tA);
      const b = 2 * PI * 1.7 * Math.max(0, tA);
      const s = Math.sin(b);
      p.ladeo += 0.16 * s * k;
      p.giro += 0.35 * Math.sin(b / 2) * k;
      p.hombroD = [-0.3 + 0.3 * s * k, 0.1 + (1.4 + 0.7 * s) * k];
      p.hombroI = [-0.3 - 0.3 * s * k, 0.1 + (1.4 - 0.7 * s) * k];
      p.codoD = -0.18 - 0.6 * k;
      p.codoI = -0.18 - 0.6 * k;
      p.musloD = -0.35 * Math.max(0, s) * k;
      p.rodillaD = 0.7 * Math.max(0, s) * k;
      p.musloI = -0.35 * Math.max(0, -s) * k;
      p.rodillaI = 0.7 * Math.max(0, -s) * k;
      p.y += 0.05 * Math.abs(s) * k;
      p.boca = 0.4 * k;
      p.patas = 0.4 * s * k;
      p.cola = 0.7 * Math.sin(14 * tl);
      break;
    }
  }
  return p;
}
