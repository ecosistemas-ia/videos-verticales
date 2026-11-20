// El recorrido: cada escena es un puesto a lo largo del eje X, y la cámara viaja en carril de uno al siguiente al
// empezar cada escena. Aquí se colocan los personajes en su puesto y se calcula, para cada segundo, dónde está la
// cámara, adónde mira, dónde enfoca y qué luz hay. Sin JSX ni React.

import { random } from 'remotion';
import type { EscenaLista } from '../../comun/guion.ts';
import { armarDecorado, type DecoradoArmado } from './decorados.ts';
import { LUCES, type Luz } from './paletas.ts';
import { APARIENCIAS, VARIADO } from './personajes.ts';
import type { V3 } from './piezas.ts';
import { VIAJE, type Accion, type EscenaCabezas, type Hora, type Objeto, type Personaje, type Plano, type Posicion, type Rol } from './reglas.ts';

/** Distancia entre puestos: suficiente para que el decorado vecino no entre en el plano. */
export const SEPARACION = 46;

export interface Actor {
  readonly rol: Rol;
  readonly accion: Accion;
  readonly objeto: Objeto | 'baston';
  /** Posición dentro del puesto. */
  readonly x: number;
  readonly z: number;
  readonly giro: number;
  readonly entrada: number;
  readonly fase: number;
  readonly ladoCaida: number;
  readonly multitud: boolean;
}

export interface Puesto {
  readonly indice: number;
  readonly escena: EscenaLista<EscenaCabezas>;
  readonly origen: V3;
  readonly decorado: DecoradoArmado;
  readonly actores: readonly Actor[];
  /** Punto que encuadra la cámara, dentro del puesto (a la altura del suelo). */
  readonly sujeto: V3;
  /** Lo que se alejan los personajes del sujeto en x. */
  readonly extension: number;
  readonly hora: Hora;
}

export interface Toma {
  readonly pos: V3;
  readonly mira: V3;
  /** Distancia de enfoque y apertura (cuánto se desenfoca lo que no está a esa distancia). */
  readonly foco: number;
  readonly apertura: number;
}

export interface EstadoCamara {
  readonly toma: Toma;
  readonly luz: Luz;
  /** El puesto de la escena en curso. */
  readonly actual: number;
  /** 0..1 durante un viaje entre puestos, si no 0. */
  readonly viaje: number;
}

const limitar = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));
const mezcla = (a: number, b: number, k: number): number => a + (b - a) * k;
const mezcla3 = (a: V3, b: V3, k: number): V3 => [mezcla(a[0], b[0], k), mezcla(a[1], b[1], k), mezcla(a[2], b[2], k)];
const enEntrada = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

function sitio(posicion: Posicion, zona: DecoradoArmado['zona']): [number, number] {
  const a = zona.ancho;
  switch (posicion) {
    case 'izquierda':
      return [-a, zona.frente];
    case 'centro':
      return [0, zona.frente];
    case 'derecha':
      return [a, zona.frente];
    case 'fondo_izquierda':
      return [-a * 1.6, zona.fondo];
    case 'fondo':
      return [0, zona.fondo];
    case 'fondo_derecha':
      return [a * 1.6, zona.fondo];
  }
}

function giroHacia(mira: Personaje['mira'], x: number, otros: readonly number[]): number {
  if (mira === 'camara') return 0;
  if (mira === 'izquierda') return -1.05;
  if (mira === 'derecha') return 1.05;
  if (otros.length === 0) return 0;
  const centro = otros.reduce((s, v) => s + v, 0) / otros.length;
  const dx = centro - x;
  if (Math.abs(dx) < 0.3) return 0;
  return Math.sign(dx) * Math.min(1.0, 0.55 + 0.25 * Math.abs(dx));
}

function objetoDe(rol: Rol, lleva: Objeto): Objeto | 'baston' {
  if (lleva !== 'nada') return lleva;
  return rol === 'anciano' ? 'baston' : 'nada';
}

export function armarPuestos(escenas: readonly EscenaLista<EscenaCabezas>[], horaVideo: Hora): Puesto[] {
  return escenas.map((escena, i) => {
    const d = escena.datos;
    const decorado = armarDecorado(d.decorado);
    const usados = new Map<Posicion, number>();
    const colocados = d.personajes.map((p) => {
      const veces = usados.get(p.posicion) ?? 0;
      usados.set(p.posicion, veces + 1);
      const [x0, z] = sitio(p.posicion, decorado.zona);
      const x = x0 + (veces === 0 ? 0 : (veces % 2 === 1 ? 0.75 : -0.75) * Math.ceil(veces / 2));
      return { p, x, z };
    });
    const actores: Actor[] = colocados.map(({ p, x, z }, k) => ({
      rol: p.rol,
      accion: p.accion,
      objeto: objetoDe(p.rol, p.lleva),
      x,
      z,
      giro: giroHacia(
        p.mira,
        x,
        colocados.filter((_, j) => j !== k).map((o) => o.x),
      ),
      entrada: x > 0.01 ? 1 : -1,
      fase: random(`fase-${i}-${k}`),
      ladoCaida: x < -0.01 ? 1 : -1,
      multitud: false,
    }));

    if (d.multitud !== undefined) {
      const n = d.multitud.cantidad;
      const porFila = Math.max(3, Math.floor((decorado.zona.multitudAncho * 2) / 0.9) + 1);
      for (let k = 0; k < n; k++) {
        const fila = Math.floor(k / porFila);
        const enFila = Math.min(porFila, n - fila * porFila);
        const col = k % porFila;
        const paso = enFila > 1 ? (decorado.zona.multitudAncho * 2) / (enFila - 1) : 0;
        const x = (enFila > 1 ? -decorado.zona.multitudAncho + col * paso : 0) + (fila % 2) * 0.45 + (random(`mx-${i}-${k}`) - 0.5) * 0.3;
        const z = decorado.zona.multitudZ - fila * 1.15 + (random(`mz-${i}-${k}`) - 0.5) * 0.4;
        const rol: Rol = d.multitud.rol === 'variado' ? VARIADO[(k + i) % VARIADO.length] : d.multitud.rol;
        actores.push({
          rol,
          accion: d.multitud.accion,
          objeto: objetoDe(rol, 'nada'),
          x,
          z,
          giro: -x * 0.12 + (random(`mg-${i}-${k}`) - 0.5) * 0.4,
          entrada: x > 0 ? 1 : -1,
          fase: random(`mf-${i}-${k}`),
          ladoCaida: x < 0 ? 1 : -1,
          multitud: true,
        });
      }
    }

    const principales = actores.filter((a) => !a.multitud);
    const sx = principales.length > 0 ? principales.reduce((s, a) => s + a.x, 0) / principales.length : 0;
    const sz = principales.length > 0 ? principales.reduce((s, a) => s + a.z, 0) / principales.length : -1;
    const extension = principales.reduce((m, a) => Math.max(m, Math.abs(a.x - sx)), 0);
    return {
      indice: i,
      escena,
      origen: [i * SEPARACION, 0, 0] as V3,
      decorado,
      actores,
      sujeto: [sx, decorado.suelo, sz] as V3,
      extension,
      hora: d.hora ?? horaVideo,
    };
  });
}

/** La toma de un puesto en el momento u (0 al llegar, 1 al irse; un poco más en la cola). */
export function tomaPuesto(p: Puesto, u: number): Toma {
  const plano: Plano = p.escena.datos.plano;
  const o = p.origen;
  let s: V3 = [o[0] + p.sujeto[0], o[1] + p.sujeto[1], o[2] + p.sujeto[2]];
  const ancho = 0.2047; // tan(fov horizontal / 2) con fov vertical de 40° en 9:16
  let d: number;
  let alto: number;
  let mira: number;
  let apertura: number;
  let lateral = (0.5 - u) * 0.9;
  switch (plano) {
    case 'general':
      d = Math.max(14.5, (p.extension + 1.4) / ancho + 4);
      alto = 3.7;
      mira = 1.45;
      apertura = 0.0004;
      break;
    case 'medio':
      d = limitar((p.extension + 0.95) / ancho, 7.2, 13);
      alto = 2.0;
      mira = 0.82;
      apertura = 0.0013;
      break;
    case 'primer_plano': {
      const a = p.actores.find((x) => !x.multitud);
      const escala = a === undefined ? 1 : APARIENCIAS[a.rol].escala;
      const animal = a !== undefined && APARIENCIAS[a.rol].animal !== undefined;
      if (a !== undefined) s = [o[0] + a.x, o[1] + p.decorado.suelo, o[2] + a.z];
      d = animal ? 2.7 : 3.4;
      alto = animal ? 0.85 : 1.55 * escala;
      mira = animal ? 0.42 : 1.22 * escala;
      apertura = 0.0022;
      lateral *= 0.5;
      break;
    }
    case 'picado':
      d = 7.4 + p.extension * 1.2;
      alto = 7.2 + p.extension * 1.1;
      mira = 0.3;
      apertura = 0.0007;
      break;
    case 'contrapicado':
      d = limitar(((p.extension + 0.9) / ancho) * 0.8, 5, 10);
      alto = 0.45;
      mira = 1.5;
      apertura = 0.0012;
      break;
  }
  const empuje = d * (1.05 - 0.09 * u);
  const pos: V3 = [s[0] + lateral, s[1] + alto * (plano === 'picado' ? 1.02 - 0.05 * u : 1), s[2] + empuje];
  const objetivo: V3 = [s[0] + lateral * 0.3, s[1] + mira, s[2] - (plano === 'picado' ? 0.6 : 0)];
  const foco = Math.hypot(pos[0] - s[0], pos[1] - (s[1] + 1.0), pos[2] - s[2]);
  return { pos, mira: objetivo, foco, apertura };
}

function mezclarLuz(a: Luz, b: Luz, k: number, mezclarColor: (x: string, y: string, k: number) => string): Luz {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return {
    cieloArriba: mezclarColor(a.cieloArriba, b.cieloArriba, k),
    cieloAbajo: mezclarColor(a.cieloAbajo, b.cieloAbajo, k),
    sol: mezclarColor(a.sol, b.sol, k),
    solIntensidad: mezcla(a.solIntensidad, b.solIntensidad, k),
    solDireccion: mezcla3(a.solDireccion, b.solDireccion, k),
    hemiCielo: mezclarColor(a.hemiCielo, b.hemiCielo, k),
    hemiSuelo: mezclarColor(a.hemiSuelo, b.hemiSuelo, k),
    hemiIntensidad: mezcla(a.hemiIntensidad, b.hemiIntensidad, k),
    farol: mezcla(a.farol, b.farol, k),
    brillo: mezcla(a.brillo, b.brillo, k),
  };
}

function mezclarHex(x: string, y: string, k: number): string {
  const a = parseInt(x.slice(1), 16);
  const b = parseInt(y.slice(1), 16);
  const canal = (desplazamiento: number): number => Math.round(mezcla((a >> desplazamiento) & 255, (b >> desplazamiento) & 255, k));
  return `#${((canal(16) << 16) | (canal(8) << 8) | canal(0)).toString(16).padStart(6, '0')}`;
}

/** Qué escena está en curso en el segundo t. */
export function escenaEn(puestos: readonly Puesto[], t: number): number {
  let j = 0;
  for (let i = 0; i < puestos.length; i++) if (t >= puestos[i].escena.inicio) j = i;
  return j;
}

export function estadoEn(puestos: readonly Puesto[], t: number): EstadoCamara {
  const j = escenaEn(puestos, t);
  const p = puestos[j];
  const tl = t - p.escena.inicio;
  if (j > 0 && tl < VIAJE) {
    const k = enEntrada(limitar(tl / VIAJE));
    const arco = Math.sin(Math.PI * k);
    const a = tomaPuesto(puestos[j - 1], 1);
    const b = tomaPuesto(p, 0);
    const pos = mezcla3(a.pos, b.pos, k);
    const mira = mezcla3(a.mira, b.mira, k);
    return {
      toma: {
        pos: [pos[0], pos[1] + arco * 2.6, pos[2] + arco * 1.5],
        mira: [mira[0], mira[1] + arco * 1.1, mira[2]],
        foco: mezcla(a.foco, b.foco, k),
        apertura: mezcla(a.apertura, b.apertura, k) + arco * 0.0012,
      },
      luz: mezclarLuz(LUCES[puestos[j - 1].hora], LUCES[p.hora], k, mezclarHex),
      actual: j,
      viaje: k,
    };
  }
  const dentro = j > 0 ? VIAJE : 0;
  const u = limitar((tl - dentro) / Math.max(0.5, p.escena.duracion - dentro), 0, 1.3);
  return { toma: tomaPuesto(p, u), luz: LUCES[p.hora], actual: j, viaje: 0 };
}

/** La boca de quien «habla»: con voz, se abre en cada palabra; sin voz, mientras dura el texto estimado. */
export function bocaDe(escena: EscenaLista<EscenaCabezas>, arranque: number): (tl: number) => number {
  const voz = escena.voz;
  if (voz !== null) {
    const base = voz.desfase;
    return (tl) => {
      const w = voz.palabras.find((x) => tl >= base + x.inicio && tl <= base + x.fin);
      return w === undefined ? 0 : 0.3 + 0.6 * Math.abs(Math.sin((tl - base - w.inicio) * 17));
    };
  }
  const fin = escena.duracion - 0.45;
  return (tl) => {
    if (tl < arranque || tl > fin) return 0;
    const pausa = ((tl - arranque) % 1.9) > 1.62;
    return pausa ? 0 : 0.3 + 0.6 * Math.abs(Math.sin((tl - arranque) * 10.5));
  };
}
