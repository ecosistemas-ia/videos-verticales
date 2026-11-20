// El generador de mundos: de un tipo de mundo y una semilla sale una ciudad entera, siempre la misma. Cuatro mundos:
//   ciudad_antigua  pirámide escalonada con santuarios, recinto, casas de adobe, canales, chinampas, calzadas, mercado;
//   ciudad_moderna  avenidas, rascacielos de vidrio, bloques, parque con estanque, coches;
//   pueblo          plaza con iglesia y fuente, casas con tejado, campos de colores, molino, río con puente, bosque;
//   puerto          bahía, muelle con barcas, faro en el espigón, almacenes, casas en ladera.
// Dos escalas: «ciudad» (la maqueta 3D, 20-26 celdas por lado) y «plastico» (la ilustración isométrica, 8-9 celdas,
// pocas piezas grandes y legibles). Todo en metros; una celda mide 12 m. Sin JSX ni three.js.

import { clamp01, crearAzar, elegir, entre } from './azar.ts';
import type { Agua, Grupo, IdLugar, Lugar, Material, Mundo, Pieza, Punto3, Rol, Ruta, TipoGrupo, TipoMundo, Tramo } from './tipos.ts';

export interface OpcionesMundo {
  readonly tipo: TipoMundo;
  readonly semilla: number;
  readonly escala: 'ciudad' | 'plastico';
  /** Si falta, el agua típica del mundo. */
  readonly agua?: Agua;
}

export const AGUA_POR_DEFECTO: Record<TipoMundo, Agua> = {
  ciudad_antigua: 'lago',
  ciudad_moderna: 'rio',
  pueblo: 'rio',
  puerto: 'mar',
};

const C = 12;

/** Lo que se va construyendo: piezas, grupos y lo que se mueve. */
class Obra {
  piezas: Pieza[] = [];
  grupos: Grupo[] = [];
  humos: Punto3[] = [];
  luces: Punto3[] = [];
  tramos: Tramo[] = [];
  rutas: Ruta[] = [];
  aspas: Array<{ x: number; y: number; z: number; r: number; giro: number; g: number }> = [];
  alturaMax = 0;

  grupo(tipo: TipoGrupo, orden: number, x: number, z: number, base: number, rx: number, rz: number): number {
    this.grupos.push({ tipo, orden: clamp01(orden), x, z, base, rx, rz });
    return this.grupos.length - 1;
  }
  poner(p: Pieza): void {
    this.piezas.push(p);
    const tope = p.k === 'cilindro' || p.k === 'cono' ? p.y + p.sy : p.k === 'esfera' ? p.y + p.r * (p.sy ?? 1) : p.y + p.sy;
    if (p.m !== 'tierra' || tope > 2) this.alturaMax = Math.max(this.alturaMax, tope);
  }
  caja(g: number, m: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, extra: { bisel?: boolean; v?: number; viento?: boolean } = {}): void {
    this.poner({ k: 'caja', m, g, x, y, z, sx, sy, sz, ...extra });
  }
  tejado(g: number, m: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, eje: 'x' | 'z', v = 0): void {
    this.poner({ k: 'tejado', m, g, x, y, z, sx, sy, sz, eje, v });
  }
  tronco(g: number, m: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, tx: number, tz: number, v = 0): void {
    this.poner({ k: 'tronco', m, g, x, y, z, sx, sy, sz, tx, tz, v });
  }
  cilindro(g: number, m: Material, x: number, y: number, z: number, r: number, sy: number, extra: { r2?: number; lados?: number; v?: number } = {}): void {
    this.poner({ k: 'cilindro', m, g, x, y, z, r, sy, ...extra });
  }
  cono(g: number, m: Material, x: number, y: number, z: number, r: number, sy: number, extra: { lados?: number; v?: number; viento?: boolean } = {}): void {
    this.poner({ k: 'cono', m, g, x, y, z, r, sy, ...extra });
  }
  esfera(g: number, m: Material, x: number, y: number, z: number, r: number, extra: { sy?: number; v?: number; viento?: boolean } = {}): void {
    this.poner({ k: 'esfera', m, g, x, y, z, r, ...extra });
  }
}

type Especie = 'redondo' | 'conifera' | 'palmera' | 'sauce' | 'arbusto';

function arbol(o: Obra, az: () => number, x: number, y: number, z: number, s: number, especie: Especie, orden = 0): void {
  const g = o.grupo('arbol', orden, x, z, y, 1.6 * s, 1.6 * s);
  const v = entre(az, -1, 1);
  if (especie === 'arbusto') {
    o.esfera(g, az() < 0.5 ? 'hoja' : 'hoja2', x, y, z, 1.1 * s, { sy: 0.75, v, viento: true });
    return;
  }
  if (especie === 'conifera') {
    o.cilindro(g, 'tronco', x, y, z, 0.28 * s, 1.4 * s, { lados: 6 });
    o.cono(g, 'hoja2', x, y + 1.0 * s, z, 1.7 * s, 3.4 * s, { lados: 7, v, viento: true });
    o.cono(g, 'hoja2', x, y + 2.6 * s, z, 1.25 * s, 2.8 * s, { lados: 7, v, viento: true });
    return;
  }
  if (especie === 'palmera') {
    o.cilindro(g, 'tronco', x, y, z, 0.22 * s, 5.2 * s, { r2: 0.16 * s, lados: 6 });
    o.esfera(g, 'hoja', x, y + 5.0 * s, z, 1.9 * s, { sy: 0.38, v, viento: true });
    return;
  }
  const alto = especie === 'sauce' ? 1.6 : 2.1;
  o.cilindro(g, 'tronco', x, y, z, 0.26 * s, alto * s, { r2: 0.2 * s, lados: 6 });
  const r = (especie === 'sauce' ? 1.9 : 1.55) * s;
  const m: Material = especie === 'sauce' ? 'hoja3' : az() < 0.6 ? 'hoja' : 'hoja2';
  o.esfera(g, m, x, y + alto * s + r * 0.55, z, r, { sy: especie === 'sauce' ? 1.15 : 0.95, v, viento: true });
  if (especie === 'redondo' && az() < 0.7) {
    const a = az() * Math.PI * 2;
    o.esfera(g, m, x + Math.cos(a) * r * 0.55, y + alto * s + r * 0.35, z + Math.sin(a) * r * 0.55, r * 0.68, { v: v * 0.6, viento: true });
  }
}

/** Una persona que va y viene entre dos puntos. */
function tramo(o: Obra, a: Punto3, b: Punto3, tipo: Tramo['tipo'] = 'persona'): void {
  o.tramos.push({ a, b, tipo });
}

// ------------------------------------------------------------------------------------------------ la rejilla
interface Rejilla {
  n: number;
  roles: Rol[];
  suelos: number[];
  /** Celdas que eran agua antes de poner muelles, calzadas o puentes. */
  sobreAgua: boolean[];
  /** Estructuras grandes ya colocadas (ocupan varias celdas y se dibujan una vez). */
  hechas: boolean[];
}

const cx = (n: number, i: number): number => (i - n / 2 + 0.5) * C;
const id = (n: number, i: number, j: number): number => j * n + i;
const dentro = (n: number, i: number, j: number): boolean => i >= 0 && j >= 0 && i < n && j < n;

function nuevaRejilla(n: number, rol: Rol): Rejilla {
  return { n, roles: new Array<Rol>(n * n).fill(rol), suelos: new Array<number>(n * n).fill(0.5), sobreAgua: new Array<boolean>(n * n).fill(false), hechas: new Array<boolean>(n * n).fill(false) };
}

function rol(r: Rejilla, i: number, j: number): Rol | null {
  return dentro(r.n, i, j) ? r.roles[id(r.n, i, j)] : null;
}

function poner(r: Rejilla, i: number, j: number, x: Rol): void {
  if (dentro(r.n, i, j)) r.roles[id(r.n, i, j)] = x;
}

const esAgua = (x: Rol | null): boolean => x === 'agua';
const esPaso = (x: Rol | null): boolean => x === 'calle' || x === 'calzada' || x === 'plaza' || x === 'mercado' || x === 'muelle';

// ------------------------------------------------------------------------------------------------ los planos de cada mundo
interface Plan {
  r: Rejilla;
  /** Celda (esquina) y tamaño del monumento. */
  monumento: { i: number; j: number; t: number };
  /** Otras estructuras de varias celdas: plazas, mercados, parques, iglesias. */
  mercado: { i: number; j: number; t: number } | null;
  plaza: { i: number; j: number; t: number } | null;
}

function planAntigua(n: number, az: () => number, agua: Agua, escala: 'ciudad' | 'plastico'): Plan {
  const r = nuevaRejilla(n, 'casa');
  const c = (n - 1) / 2;
  const tm = 3;
  const m0 = Math.round(c - 1);
  const recinto = escala === 'ciudad' ? 2 : 1;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(i - c, j - c) / (n / 2);
      if (agua === 'lago') {
        if (d > 0.9) poner(r, i, j, 'agua');
        else if (d > (escala === 'ciudad' ? 0.66 : 0.74)) poner(r, i, j, 'chinampa');
      } else if (agua === 'mar' && j > n * 0.8) poner(r, i, j, 'agua');
      else if (agua === 'rio' && Math.abs(j - (n * 0.78 + Math.sin(i * 0.5) * 1.2)) < 0.8) poner(r, i, j, 'agua');
      else if (d > 0.8) poner(r, i, j, agua === 'ninguna' ? 'campo' : 'chinampa');
    }
  // calles y canales: una retícula cada 4 celdas, alternando calle y canal si hay lago
  for (let k = 0; k < n; k++)
    for (let l = 0; l < n; l++) {
      const linea = (v: number) => (v - Math.round(c) + 400) % 4 === 2;
      if (!linea(k) && !linea(l)) continue;
      const actual = rol(r, k, l);
      if (actual !== 'casa') continue;
      const canal = agua === 'lago' && escala === 'ciudad' && ((linea(k) && (k - Math.round(c) + 400) % 8 === 6) || (linea(l) && (l - Math.round(c) + 400) % 8 === 6));
      poner(r, k, l, canal ? 'agua' : 'calle');
    }
  // recinto ceremonial: plaza alrededor del templo mayor
  for (let j = m0 - recinto; j < m0 + tm + recinto; j++) for (let i = m0 - recinto; i < m0 + tm + recinto; i++) poner(r, i, j, 'plaza');
  for (let j = m0; j < m0 + tm; j++) for (let i = m0; i < m0 + tm; i++) poner(r, i, j, 'monumento');
  // calzadas hacia la orilla (norte, oeste y sur) y calles hasta el recinto
  const ejes = [Math.round(c)];
  for (const e of ejes) {
    for (let j = 0; j < m0 - recinto; j++) poner(r, e, j, esAgua(rol(r, e, j)) || rol(r, e, j) === 'chinampa' ? 'calzada' : 'calle');
    for (let j = m0 + tm + recinto; j < n; j++) poner(r, e, j, esAgua(rol(r, e, j)) || rol(r, e, j) === 'chinampa' ? 'calzada' : 'calle');
    for (let i = 0; i < m0 - recinto; i++) poner(r, i, e, esAgua(rol(r, i, e)) || rol(r, i, e) === 'chinampa' ? 'calzada' : 'calle');
  }
  // mercado al noreste del recinto
  const tMer = escala === 'ciudad' ? 3 : 2;
  const mi = Math.min(n - tMer - 1, m0 + tm + recinto + 1);
  const mj = Math.max(1, m0 - recinto - tMer - 1);
  let mercado: Plan['mercado'] = null;
  if (escala === 'ciudad' || n >= 9) {
    for (let j = mj; j < mj + tMer; j++) for (let i = mi; i < mi + tMer; i++) poner(r, i, j, 'mercado');
    mercado = { i: mi, j: mj, t: tMer };
  }
  // jardines
  for (let k = 0; k < r.roles.length; k++) if (r.roles[k] === 'casa' && az() < (escala === 'ciudad' ? 0.06 : 0.04)) r.roles[k] = 'parque';
  return { r, monumento: { i: m0, j: m0, t: tm }, mercado, plaza: { i: m0 - recinto, j: m0 - recinto, t: tm + 2 * recinto } };
}

function planModerna(n: number, az: () => number, agua: Agua, escala: 'ciudad' | 'plastico'): Plan {
  const r = nuevaRejilla(n, 'bloque');
  const c = (n - 1) / 2;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(i - c, j - c) / (n / 2);
      const calleV = (i + 400 - Math.round(c)) % 4 === 2;
      const calle = calleV || (j + 400 - Math.round(c)) % 4 === 2;
      let x: Rol = calle ? 'calle' : d < 0.38 ? 'torre' : d < 0.72 ? 'bloque' : 'casa';
      if (agua === 'rio' && Math.abs(j - n * 0.74) < 0.9) x = calleV ? 'calzada' : 'agua';
      if (agua === 'mar' && j > n * 0.82) x = 'agua';
      if (agua === 'lago' && Math.hypot(i - n * 0.82, j - n * 0.82) < n * 0.18) x = 'agua';
      if (!calle && d > 0.92 && escala === 'ciudad') x = az() < 0.6 ? 'bosque' : 'parque';
      poner(r, i, j, x);
    }
  // la manzana del parque y la de la plaza
  const libre = (i0: number, j0: number, t: number) => {
    for (let j = j0; j < j0 + t; j++) for (let i = i0; i < i0 + t; i++) if (!['torre', 'bloque', 'casa'].includes(rol(r, i, j) ?? '')) return false;
    return true;
  };
  const buscar = (di: number, dj: number, t: number): { i: number; j: number } | null => {
    for (let paso = 0; paso < n; paso++) {
      const i = Math.round(c + di * paso);
      const j = Math.round(c + dj * paso);
      if (dentro(n, i, j) && dentro(n, i + t - 1, j + t - 1) && libre(i, j, t)) return { i, j };
    }
    return null;
  };
  const tP = escala === 'ciudad' ? 3 : 1;
  const parque = buscar(-1, 0.4, tP);
  if (parque) for (let j = parque.j; j < parque.j + tP; j++) for (let i = parque.i; i < parque.i + tP; i++) poner(r, i, j, 'parque');
  const pz = buscar(0.6, -1, escala === 'ciudad' ? 2 : 1);
  const tPz = escala === 'ciudad' ? 2 : 1;
  if (pz) for (let j = pz.j; j < pz.j + tPz; j++) for (let i = pz.i; i < pz.i + tPz; i++) poner(r, i, j, 'plaza');
  // el rascacielos más alto: la torre más cerca del centro
  let mejor = { i: Math.round(c), j: Math.round(c), d: Infinity };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (rol(r, i, j) === 'torre' && Math.hypot(i - c, j - c) < mejor.d) mejor = { i, j, d: Math.hypot(i - c, j - c) };
  poner(r, mejor.i, mejor.j, 'monumento');
  return { r, monumento: { i: mejor.i, j: mejor.j, t: 1 }, mercado: pz ? { i: pz.i, j: pz.j, t: tPz } : null, plaza: pz ? { i: pz.i, j: pz.j, t: tPz } : null };
}

function planPueblo(n: number, az: () => number, agua: Agua, escala: 'ciudad' | 'plastico'): Plan {
  const r = nuevaRejilla(n, 'campo');
  const c = (n - 1) / 2;
  const tPz = escala === 'ciudad' ? 2 : 1;
  const p0 = Math.round(c - tPz / 2);
  const rioJ = (i: number) => n * 0.8 + Math.sin(i * 0.45) * 1.1;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(i - c, j - c) / (n / 2);
      const ruido = Math.sin(i * 1.7 + j * 0.9) * 0.08 + Math.cos(i * 0.6 - j * 1.3) * 0.08;
      let x: Rol = d + ruido < (escala === 'ciudad' ? 0.5 : 0.7) ? 'casa' : 'campo';
      if (x === 'campo' && Math.sin(i * 0.7) + Math.cos(j * 0.8) > 1.15) x = 'bosque';
      const anillo = Math.abs(Math.hypot(i - c, j - c) - n * 0.22) < 0.55 && escala === 'ciudad';
      if (i === Math.round(c) || j === Math.round(c) || anillo) x = 'calle';
      if (agua === 'rio' && Math.abs(j - rioJ(i)) < 0.75) x = i === Math.round(c) ? 'calzada' : 'agua';
      if (agua === 'lago' && Math.hypot(i - n * 0.85, j - n * 0.15) < n * 0.2) x = 'agua';
      if (agua === 'mar' && j > n * 0.84) x = 'agua';
      poner(r, i, j, x);
    }
  for (let j = p0; j < p0 + tPz; j++) for (let i = p0; i < p0 + tPz; i++) poner(r, i, j, 'plaza');
  // la iglesia al norte de la plaza
  const ti = escala === 'ciudad' ? 2 : 1;
  const mi = p0;
  const mj = p0 - ti - (escala === 'ciudad' ? 0 : 0);
  for (let j = mj; j < mj + ti; j++) for (let i = mi; i < mi + ti; i++) poner(r, i, j, 'monumento');
  // un molino en los campos
  let molino: { i: number; j: number } | null = null;
  for (let k = 0; k < 200 && molino === null; k++) {
    const i = Math.floor(az() * n);
    const j = Math.floor(az() * n * 0.6);
    if (rol(r, i, j) === 'campo' && Math.hypot(i - c, j - c) > n * 0.3) molino = { i, j };
  }
  if (molino) poner(r, molino.i, molino.j, 'molino');
  return { r, monumento: { i: mi, j: mj, t: ti }, mercado: { i: p0, j: p0, t: tPz }, plaza: { i: p0, j: p0, t: tPz } };
}

function planPuerto(n: number, az: () => number, _agua: Agua, escala: 'ciudad' | 'plastico'): Plan {
  const r = nuevaRejilla(n, 'casa');
  const js = Math.round(n * (escala === 'ciudad' ? 0.66 : 0.62));
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      let x: Rol = 'casa';
      if (j >= js) x = 'agua';
      else if (j === js - 1) x = 'muelle';
      else if (j === js - 2) x = az() < 0.55 ? 'almacen' : 'mercado';
      else if (j === js - 3) x = 'calle';
      else if ((i + 400 - Math.round(n / 2)) % 4 === 2 || (escala === 'ciudad' && (js - 3 - j) % 4 === 0)) x = 'calle';
      if (escala === 'ciudad' && j < 2 && x === 'casa') x = az() < 0.7 ? 'bosque' : 'campo';
      poner(r, i, j, x);
      // ladera: cuanto más lejos del mar, más alto
      if (j < js - 1) r.suelos[id(n, i, j)] = 0.9 + Math.max(0, js - 3 - j) * (escala === 'ciudad' ? 1.3 : 1.1);
      else if (j === js - 1) r.suelos[id(n, i, j)] = 0.9;
    }
  // muelles que entran en el agua
  const muelles = escala === 'ciudad' ? [Math.round(n * 0.3), Math.round(n * 0.55)] : [Math.round(n * 0.3)];
  for (const mi of muelles)
    for (let j = js; j < Math.min(n, js + (escala === 'ciudad' ? 3 : 2)); j++) {
      poner(r, mi, j, 'muelle');
      r.sobreAgua[id(n, mi, j)] = true;
      r.suelos[id(n, mi, j)] = 0.9;
    }
  // el espigón con el faro al final
  const ei = escala === 'ciudad' ? Math.round(n * 0.82) : n - 2;
  const largo = escala === 'ciudad' ? Math.min(n - js - 1, 5) : Math.min(n - js - 1, 2);
  for (let k = 0; k < largo; k++) {
    poner(r, ei, js + k, 'calzada');
    r.sobreAgua[id(n, ei, js + k)] = true;
    r.suelos[id(n, ei, js + k)] = 1.0;
  }
  const fj = js + largo;
  poner(r, ei, fj, 'monumento');
  r.sobreAgua[id(n, ei, fj)] = true;
  r.suelos[id(n, ei, fj)] = 1.2;
  // la plaza con la iglesia en la ladera
  const tPz = escala === 'ciudad' ? 2 : 1;
  const pi = Math.round(n * 0.45);
  const pj = Math.max(0, js - 4 - tPz);
  for (let j = pj; j < pj + tPz; j++)
    for (let i = pi; i < pi + tPz; i++) {
      poner(r, i, j, 'plaza');
      r.suelos[id(n, i, j)] = r.suelos[id(n, pi, pj + tPz - 1)];
    }
  for (let k = 0; k < r.roles.length; k++) if (r.roles[k] === 'casa' && az() < 0.05) r.roles[k] = 'parque';
  return { r, monumento: { i: ei, j: fj, t: 1 }, mercado: { i: Math.round(n * 0.4), j: js - 2, t: 1 }, plaza: { i: pi, j: pj, t: tPz } };
}

// ------------------------------------------------------------------------------------------------ edificios
interface Ctx {
  o: Obra;
  az: () => number;
  r: Rejilla;
  tipo: TipoMundo;
  escala: 'ciudad' | 'plastico';
  /** Orden de construcción de una celda: del centro hacia fuera, con algo de azar. */
  orden: (x: number, z: number) => number;
}

/** Casas de adobe con azotea, parapeto y puerta; alguna con techo de paja o patio. */
function casaAntigua(k: Ctx, x: number, y: number, z: number, w: number, d: number): void {
  const { o, az } = k;
  const g = o.grupo('edificio', k.orden(x, z), x, z, y, w / 2, d / 2);
  const h = entre(az, 2.8, 4.4);
  const v = entre(az, -1, 1);
  const m: Material = az() < 0.35 ? 'adobe_claro' : 'adobe';
  if (az() < 0.22) {
    // casa con techo de paja a dos aguas
    o.caja(g, m, x, y, z, w, h * 0.85, d, { bisel: true, v });
    o.tejado(g, 'paja', x, y + h * 0.85 - 0.1, z, w + 0.9, entre(az, 2.2, 3.2), d + 0.9, w > d ? 'x' : 'z', v);
  } else {
    o.caja(g, m, x, y, z, w, h, d, { bisel: true, v });
    // parapeto de la azotea
    const t = 0.35;
    o.caja(g, m, x, y + h, z - d / 2 + t / 2, w, 0.45, t, { v: v - 0.3 });
    o.caja(g, m, x, y + h, z + d / 2 - t / 2, w, 0.45, t, { v: v - 0.3 });
    o.caja(g, m, x - w / 2 + t / 2, y + h, z, t, 0.45, d - 2 * t, { v: v - 0.3 });
    o.caja(g, m, x + w / 2 - t / 2, y + h, z, t, 0.45, d - 2 * t, { v: v - 0.3 });
    if (az() < 0.35) o.caja(g, 'pintura1', x, y + h - 0.55, z, w + 0.06, 0.32, d + 0.06, { v });
    if (az() < 0.5) {
      // tinajas y leña en la azotea
      o.cilindro(g, 'ladrillo', x + entre(az, -w / 4, w / 4), y + h, z + entre(az, -d / 4, d / 4), 0.45, 0.8, { r2: 0.3, lados: 8 });
      if (az() < 0.4) {
        const hx = x + entre(az, -w / 4, w / 4);
        const hz = z + entre(az, -d / 4, d / 4);
        o.cilindro(g, 'piedra', hx, y + h, hz, 0.55, 0.3, { lados: 7 });
        o.humos.push([hx, y + h + 0.4, hz]);
      }
    }
  }
  // puerta oscura en la cara sur o este
  if (az() < 0.5) o.caja(g, 'madera_oscura', x, y, z + d / 2 - 0.05, Math.min(1.3, w * 0.25), 2.0, 0.2);
  else o.caja(g, 'madera_oscura', x + w / 2 - 0.05, y, z, 0.2, 2.0, Math.min(1.3, d * 0.25));
}

/** Pirámide escalonada con escalinata doble y dos santuarios arriba. */
function templo(k: Ctx, x: number, y: number, z: number, lado: number, gemelo: boolean, orden: number): number {
  const { o } = k;
  const g = o.grupo('monumento', orden, x, z, y, lado / 2, lado / 2);
  const pisos = lado > 24 ? 5 : 3;
  const alto = lado > 24 ? 5.2 : 3.6;
  let s = lado;
  let yy = y;
  for (let p = 0; p < pisos; p++) {
    o.caja(g, 'piedra_clara', x, yy, z, s, alto, s, { bisel: true, v: p % 2 ? -0.4 : 0.2 });
    o.caja(g, 'pintura1', x, yy + alto - 0.5, z, s + 0.08, 0.34, s + 0.08, { v: -0.2 });
    yy += alto;
    s -= lado * 0.14;
  }
  const arriba = s + lado * 0.14;
  // escalinata: escalones al frente (cara sur), doble si es el templo mayor
  const pasos = Math.round((yy - y) / 0.75);
  const fondo = (lado - arriba) / 2;
  const carriles = gemelo ? [-arriba * 0.22, arriba * 0.22] : [0];
  for (const dx of carriles)
    for (let p = 0; p < pasos; p++) {
      const u = p / pasos;
      o.caja(g, 'piedra', x + dx, y + p * ((yy - y) / pasos), z + lado / 2 - u * fondo - 0.6, arriba * (gemelo ? 0.3 : 0.4), (yy - y) / pasos + 0.02, 1.4, { v: -0.5 });
    }
  // santuarios
  const santos = gemelo ? [-arriba * 0.24, arriba * 0.24] : [0];
  santos.forEach((dx, q) => {
    const w = arriba * (gemelo ? 0.36 : 0.5);
    const hs = alto * 1.3;
    o.caja(g, 'cal', x + dx, yy, z - arriba * 0.08, w, hs, w * 0.9, { bisel: true });
    o.caja(g, q === 0 ? 'pintura1' : 'pintura2', x + dx, yy + hs, z - arriba * 0.08, w + 0.4, hs * 0.55, w * 0.9 + 0.4, { bisel: true });
    o.caja(g, 'madera_oscura', x + dx, yy, z - arriba * 0.08 + w * 0.45, w * 0.35, hs * 0.65, 0.2);
    o.cilindro(g, 'piedra', x + dx + w * 0.55, yy, z + arriba * 0.3, 0.6, 1.0, { lados: 8 });
    o.cilindro(g, 'fuego', x + dx + w * 0.55, yy + 1.0, z + arriba * 0.3, 0.42, 0.35, { lados: 8 });
    o.luces.push([x + dx + w * 0.55, yy + 1.6, z + arriba * 0.3]);
    o.humos.push([x + dx + w * 0.55, yy + 1.5, z + arriba * 0.3]);
    o.alturaMax = Math.max(o.alturaMax, yy + hs * 1.55);
  });
  return yy + alto * 2;
}

/** Templo redondo (como el de Ehécatl): cilindros escalonados y techo cónico de paja. */
function temploRedondo(k: Ctx, x: number, y: number, z: number, r: number, orden: number): void {
  const { o } = k;
  const g = o.grupo('monumento', orden, x, z, y, r, r);
  o.cilindro(g, 'piedra_clara', x, y, z, r, 3.2, { lados: 20 });
  o.cilindro(g, 'piedra_clara', x, y + 3.2, z, r * 0.78, 3.0, { lados: 20, v: -0.3 });
  o.cilindro(g, 'cal', x, y + 6.2, z, r * 0.45, 3.4, { lados: 16 });
  o.cono(g, 'paja', x, y + 9.6, z, r * 0.62, 4.2, { lados: 16 });
}

function casaPueblo(k: Ctx, x: number, y: number, z: number, w: number, d: number, mediterranea: boolean): void {
  const { o, az } = k;
  const g = o.grupo('edificio', k.orden(x, z), x, z, y, w / 2, d / 2);
  const pisos = az() < (mediterranea ? 0.55 : 0.35) ? 2 : 1;
  const h = pisos * 3.1 + entre(az, 0, 0.6);
  const v = entre(az, -1, 1);
  const muros: Material[] = mediterranea ? ['cal', 'cal', 'adobe_claro', 'pintura2', 'cal'] : ['cal', 'piedra', 'adobe_claro', 'cal'];
  const m = elegir(az, muros);
  o.caja(g, m, x, y, z, w, h, d, { bisel: true, v });
  const plano = mediterranea && az() < 0.3;
  const eje: 'x' | 'z' = w >= d ? 'x' : 'z';
  if (plano) {
    o.caja(g, m, x, y + h, z, w, 0.5, d, { v: v - 0.4 });
  } else {
    o.tejado(g, 'teja', x, y + h - 0.05, z, w + 0.8, Math.min(w, d) * 0.42, d + 0.8, eje, v);
  }
  // ventanas y puerta
  const filas = pisos;
  for (let p = 0; p < filas; p++) {
    const yy = y + 1.1 + p * 3.1;
    for (const u of w > 6 ? [-0.25, 0.25] : [0]) o.caja(g, 'ventana', x + u * w, yy, z + d / 2 + 0.02, 0.9, 1.1, 0.12);
    for (const u of d > 6 ? [-0.25, 0.25] : [0]) o.caja(g, 'ventana', x + w / 2 + 0.02, yy, z + u * d, 0.12, 1.1, 0.9);
  }
  o.caja(g, 'madera_oscura', x - w * 0.2, y, z + d / 2 + 0.02, 1.0, 2.0, 0.14);
  if (az() < 0.45) {
    const chx = x + (eje === 'x' ? w * 0.28 : 0);
    const chz = z + (eje === 'z' ? d * 0.28 : 0);
    o.caja(g, 'ladrillo', chx, y + h, chz, 0.7, Math.min(w, d) * 0.42 + 0.9, 0.7);
    o.humos.push([chx, y + h + Math.min(w, d) * 0.42 + 1.1, chz]);
  }
  if (mediterranea && az() < 0.3) o.caja(g, 'madera', x, y + 3.1, z + d / 2 + 0.6, w * 0.5, 0.18, 1.2);
}

function torreModerna(k: Ctx, x: number, y: number, z: number, w: number, d: number, alto: number, monumento: boolean): void {
  const { o, az } = k;
  const g = o.grupo(monumento ? 'monumento' : 'edificio', k.orden(x, z), x, z, y, w / 2, d / 2);
  const v = entre(az, -1, 1);
  const tramo1 = monumento ? alto * 0.62 : az() < 0.4 ? alto * 0.7 : alto;
  o.caja(g, 'vidrio', x, y, z, w, tramo1, d, { v });
  for (let p = 3.6; p < tramo1 - 0.5; p += 3.6) o.caja(g, 'hormigon', x, y + p, z, w + 0.3, 0.32, d + 0.3, { v: -0.2 });
  let tope = y + tramo1;
  if (tramo1 < alto) {
    const w2 = w * 0.72;
    const d2 = d * 0.72;
    o.caja(g, 'vidrio', x, tope, z, w2, alto - tramo1, d2, { v: v + 0.3 });
    for (let p = 3.6; p < alto - tramo1 - 0.5; p += 3.6) o.caja(g, 'hormigon', x, tope + p, z, w2 + 0.3, 0.32, d2 + 0.3, { v: -0.2 });
    tope = y + alto;
  }
  o.caja(g, 'hormigon', x, tope, z, w * 0.5, 2.2, d * 0.4);
  if (monumento) {
    o.cilindro(g, 'metal', x, tope + 2.2, z, 0.35, 14, { r2: 0.12, lados: 6 });
    o.luces.push([x, tope + 16, z]);
    o.alturaMax = Math.max(o.alturaMax, tope + 16);
  }
}

function bloqueModerno(k: Ctx, x: number, y: number, z: number, w: number, d: number, pisos: number): void {
  const { o, az } = k;
  const g = o.grupo('edificio', k.orden(x, z), x, z, y, w / 2, d / 2);
  const m = elegir(az, ['ladrillo', 'hormigon', 'cal', 'adobe_claro', 'pintura2'] as Material[]);
  const v = entre(az, -1, 1);
  const h = pisos * 3.3 + 0.6;
  o.caja(g, m, x, y, z, w, h, d, { bisel: true, v });
  for (let p = 0; p < pisos; p++) {
    const yy = y + 1.0 + p * 3.3;
    o.caja(g, 'ventana', x, yy, z, w + 0.08, 1.3, d * 0.8);
    o.caja(g, 'ventana', x, yy, z, w * 0.8, 1.3, d + 0.08);
  }
  o.caja(g, 'hormigon', x, y + h, z, w * 0.3, 1.4, d * 0.3);
  if (az() < 0.3) o.caja(g, 'hierba', x, y + h, z, w * 0.85, 0.3, d * 0.85);
}

function iglesia(k: Ctx, x: number, y: number, z: number, t: number, orden: number): number {
  const { o } = k;
  const s = t * C;
  const g = o.grupo('monumento', orden, x, z, y, s / 2, s / 2);
  const ancho = s * 0.42;
  const largo = s * 0.82;
  const h = s * 0.36;
  o.caja(g, 'piedra_clara', x, y, z + s * 0.05, ancho, h, largo, { bisel: true });
  o.tejado(g, 'teja', x, y + h - 0.1, z + s * 0.05, ancho + 0.9, ancho * 0.48, largo + 0.6, 'z');
  o.cilindro(g, 'piedra_clara', x, y, z - largo / 2 + s * 0.05, ancho / 2, h * 0.82, { lados: 14 });
  o.cono(g, 'teja', x, y + h * 0.82, z - largo / 2 + s * 0.05, ancho / 2 + 0.3, ancho * 0.3, { lados: 14 });
  // campanario delante
  const tw = ancho * 0.55;
  const tz = z + largo / 2 + s * 0.05 - tw / 2;
  const tx = x + ancho / 2 + tw / 2 - 0.2;
  const th = h * 2.3;
  o.caja(g, 'piedra_clara', tx, y, tz, tw, th, tw, { bisel: true, v: 0.2 });
  o.caja(g, 'ventana', tx, y + th * 0.78, tz, tw + 0.1, th * 0.1, tw * 0.4);
  o.caja(g, 'ventana', tx, y + th * 0.78, tz, tw * 0.4, th * 0.1, tw + 0.1);
  o.tronco(g, 'teja', tx, y + th, tz, tw + 0.5, tw * 1.4, tw + 0.5, 0.05, 0.05);
  o.caja(g, 'madera_oscura', x, y, z + largo / 2 + s * 0.05 + 0.02, ancho * 0.22, h * 0.42, 0.2);
  o.esfera(g, 'ventana', x, y + h * 0.7, z + largo / 2 + s * 0.05 + 0.05, ancho * 0.12, { sy: 1 });
  o.alturaMax = Math.max(o.alturaMax, y + th + tw * 1.4);
  return y + th + tw * 1.4;
}

function faro(k: Ctx, x: number, y: number, z: number): number {
  const { o } = k;
  const g = o.grupo('monumento', 0.05, x, z, y, 5, 5);
  o.cilindro(g, 'piedra', x, y, z, 5.2, 1.6, { lados: 16 });
  o.cilindro(g, 'cal', x, y + 1.6, z, 2.4, 17, { r2: 1.7, lados: 14 });
  o.cilindro(g, 'pintura1', x, y + 6.5, z, 2.25, 2.0, { r2: 2.1, lados: 14 });
  o.cilindro(g, 'pintura1', x, y + 12.5, z, 2.0, 2.0, { r2: 1.88, lados: 14 });
  o.cilindro(g, 'metal', x, y + 18.6, z, 2.2, 0.5, { lados: 14 });
  o.cilindro(g, 'ventana', x, y + 19.1, z, 1.4, 2.2, { lados: 12 });
  o.cono(g, 'pintura1', x, y + 21.3, z, 1.9, 2.0, { lados: 12 });
  o.luces.push([x, y + 20.2, z]);
  o.alturaMax = Math.max(o.alturaMax, y + 23.3);
  return y + 23.3;
}

/** Puestos de mercado: toldos de colores sobre postes, con mercancía. */
function puestos(k: Ctx, x0: number, z0: number, y: number, s: number, cuantos: number): void {
  const { o, az } = k;
  const paso = s / cuantos;
  for (let a = 0; a < cuantos; a++)
    for (let b = 0; b < cuantos; b++) {
      if (az() < 0.2) continue;
      const x = x0 - s / 2 + (a + 0.5) * paso + entre(az, -0.6, 0.6);
      const z = z0 - s / 2 + (b + 0.5) * paso + entre(az, -0.6, 0.6);
      const g = o.grupo('detalle', k.orden(x, z), x, z, y, 1.8, 1.8);
      const t = elegir(az, ['tela1', 'tela2', 'tela3'] as Material[]);
      for (const [dx, dz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) o.cilindro(g, 'madera', x + dx, y, z + dz, 0.08, 2.1, { lados: 5 });
      o.tejado(g, t, x, y + 2.1, z, 3.0, 0.7, 2.6, 'x', entre(az, -1, 1));
      o.caja(g, 'madera', x, y, z, 2.4, 0.85, 1.4);
      for (let q = 0; q < 3; q++) o.esfera(g, elegir(az, ['cultivo1', 'cultivo3', 'tela2', 'oro'] as Material[]), x - 0.7 + q * 0.7, y + 0.95, z, 0.3, { sy: 0.7 });
    }
}

// ------------------------------------------------------------------------------------------------ construir
export function generarMundo(op: OpcionesMundo): Mundo {
  const agua = op.agua ?? AGUA_POR_DEFECTO[op.tipo];
  const az = crearAzar(op.semilla * 7919 + op.tipo.length * 31);
  const ciudad = op.escala === 'ciudad';
  const n = ciudad ? { ciudad_antigua: 26, ciudad_moderna: 22, pueblo: 20, puerto: 22 }[op.tipo] : { ciudad_antigua: 9, ciudad_moderna: 8, pueblo: 8, puerto: 8 }[op.tipo];
  const plan = op.tipo === 'ciudad_antigua' ? planAntigua(n, az, agua, op.escala) : op.tipo === 'ciudad_moderna' ? planModerna(n, az, agua, op.escala) : op.tipo === 'pueblo' ? planPueblo(n, az, agua, op.escala) : planPuerto(n, az, agua, op.escala);
  const r = plan.r;
  const o = new Obra();
  const lado = n * C;
  const ordenAz = crearAzar(op.semilla * 31 + 5);
  const ordenes = new Map<string, number>();
  const orden = (x: number, z: number): number => {
    const clave = `${Math.round(x * 10)}:${Math.round(z * 10)}`;
    const ya = ordenes.get(clave);
    if (ya !== undefined) return ya;
    const v = clamp01((Math.hypot(x, z) / (lado * 0.62)) * 0.85 + ordenAz() * 0.15);
    ordenes.set(clave, v);
    return v;
  };
  const k: Ctx = { o, az, r, tipo: op.tipo, escala: op.escala, orden };
  const mediterranea = op.tipo === 'puerto';
  const suelo = (i: number, j: number) => r.suelos[id(n, i, j)];

  // el suelo de cada celda (las de agua no tienen)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const ro = r.roles[id(n, i, j)];
      const x = cx(n, i);
      const z = cx(n, j);
      const y = suelo(i, j);
      if (ro === 'agua' || ro === 'calzada' || ro === 'chinampa') continue;
      if (r.sobreAgua[id(n, i, j)]) continue;
      const g = o.grupo('suelo', 0, x, z, -3, C / 2, C / 2);
      let m: Material = op.tipo === 'ciudad_antigua' ? 'hierba_seca' : 'hierba';
      if (ro === 'calle') m = op.tipo === 'ciudad_moderna' ? 'asfalto' : op.tipo === 'ciudad_antigua' ? 'tierra' : 'piedra';
      if (ro === 'plaza' || ro === 'mercado' || ro === 'monumento') m = op.tipo === 'ciudad_moderna' ? 'acera' : 'piedra_clara';
      if (ro === 'muelle' || ro === 'almacen') m = 'piedra';
      if (ro === 'campo' || ro === 'molino') m = 'tierra';
      o.caja(g, m, x, -3, z, C, y + 3, C, { v: entre(az, -0.4, 0.4) });
    }

  // lo de encima, celda por celda
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const ro = r.roles[id(n, i, j)];
      const x = cx(n, i);
      const z = cx(n, j);
      const y = suelo(i, j);
      const vecinoAgua = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => esAgua(rol(r, i + a, j + b)));
      switch (ro) {
        case 'casa': {
          if (op.tipo === 'ciudad_antigua') {
            if (ciudad) {
              const partes = az() < 0.5 ? 2 : 1;
              const sub = C / partes;
              for (let a = 0; a < partes; a++)
                for (let b = 0; b < partes; b++) {
                  if (partes === 2 && az() < 0.12) {
                    arbol(o, az, x - C / 2 + (a + 0.5) * sub, y, z - C / 2 + (b + 0.5) * sub, entre(az, 0.8, 1.1), 'redondo', orden(x, z));
                    continue;
                  }
                  casaAntigua(k, x - C / 2 + (a + 0.5) * sub, y, z - C / 2 + (b + 0.5) * sub, sub * entre(az, 0.66, 0.84), sub * entre(az, 0.66, 0.84));
                }
            } else casaAntigua(k, x, y, z, C * entre(az, 0.62, 0.74), C * entre(az, 0.62, 0.74));
          } else if (op.tipo === 'ciudad_moderna') {
            casaPueblo(k, x, y, z, C * 0.55, C * 0.5, false);
            arbol(o, az, x + C * 0.32, y, z + C * 0.3, 0.8, 'redondo', orden(x, z));
          } else {
            const w = C * entre(az, 0.55, 0.78);
            const d = C * entre(az, 0.5, 0.72);
            casaPueblo(k, x + entre(az, -0.8, 0.8), y, z + entre(az, -0.8, 0.8), w, d, mediterranea);
            if (ciudad && az() < 0.35) arbol(o, az, x + C * 0.4, y, z - C * 0.38, entre(az, 0.6, 0.9), mediterranea ? 'palmera' : 'redondo', orden(x, z));
          }
          break;
        }
        case 'torre':
          torreModerna(k, x, y, z, C * entre(az, 0.66, 0.8), C * entre(az, 0.66, 0.8), entre(az, 26, ciudad ? 70 : 46), false);
          break;
        case 'bloque':
          bloqueModerno(k, x, y, z, C * entre(az, 0.7, 0.84), C * entre(az, 0.7, 0.84), Math.round(entre(az, 3, ciudad ? 7 : 5)));
          break;
        case 'monumento': {
          if (r.hechas[id(n, i, j)]) break;
          const t = plan.monumento.t;
          for (let b = 0; b < t; b++) for (let a = 0; a < t; a++) if (dentro(n, i + a, j + b)) r.hechas[id(n, i + a, j + b)] = true;
          const mx = cx(n, i) + ((t - 1) * C) / 2;
          const mz = cx(n, j) + ((t - 1) * C) / 2;
          if (op.tipo === 'ciudad_antigua') templo(k, mx, y, mz, t * C * 0.86, true, 0.02);
          else if (op.tipo === 'ciudad_moderna') torreModerna(k, x, y, z, C * 0.82, C * 0.82, ciudad ? 96 : 60, true);
          else if (op.tipo === 'pueblo') iglesia(k, mx, y, mz, t, 0.02);
          else faro(k, x, y, z);
          break;
        }
        case 'plaza': {
          // detalles de plaza: fuente, árboles, faroles o braseros
          if (az() < 0.25) {
            const g = o.grupo('detalle', orden(x, z), x, z, y, 2, 2);
            if (op.tipo === 'ciudad_antigua') {
              o.cilindro(g, 'piedra', x, y, z, 0.7, 1.1, { lados: 8 });
              o.cilindro(g, 'fuego', x, y + 1.1, z, 0.5, 0.35, { lados: 8 });
              o.luces.push([x, y + 1.7, z]);
            } else {
              o.cilindro(g, 'piedra_clara', x, y, z, 2.2, 0.7, { lados: 16 });
              o.cilindro(g, 'agua', x, y + 0.5, z, 1.9, 0.25, { lados: 16 });
              o.cilindro(g, 'piedra_clara', x, y + 0.7, z, 0.35, 1.6, { lados: 8 });
            }
          } else if (az() < 0.35) arbol(o, az, x + entre(az, -3, 3), y, z + entre(az, -3, 3), 0.9, mediterranea ? 'palmera' : 'redondo', orden(x, z));
          if (op.tipo === 'ciudad_antigua' && ciudad) {
            // muro del recinto (coatepantli) en el borde de la plaza
            const p = plan.plaza;
            if (p) {
              const borde = (v: number, v0: number) => v === v0 || v === v0 + p.t - 1;
              const g = o.grupo('detalle', 0.03, x, z, y, C / 2, C / 2);
              if (borde(j, p.j) && i !== Math.round((n - 1) / 2)) o.caja(g, 'piedra', x, y, z + (j === p.j ? -C / 2 + 0.6 : C / 2 - 0.6), C, 1.6, 1.0, { bisel: true });
              if (borde(i, p.i) && j !== Math.round((n - 1) / 2)) o.caja(g, 'piedra', x + (i === p.i ? -C / 2 + 0.6 : C / 2 - 0.6), y, z, 1.0, 1.6, C, { bisel: true });
            }
          }
          for (let q = 0; q < (ciudad ? 2 : 1); q++) tramo(o, [x + entre(az, -5, 5), y, z + entre(az, -5, 5)], [x + entre(az, -5, 5), y, z + entre(az, -5, 5)]);
          break;
        }
        case 'mercado': {
          if (op.tipo === 'puerto') {
            puestos(k, x, z, y, C * 0.9, 2);
          } else {
            const p = plan.mercado;
            if (p && i === p.i && j === p.j) {
              const s = p.t * C;
              puestos(k, cx(n, i) + ((p.t - 1) * C) / 2, cx(n, j) + ((p.t - 1) * C) / 2, y, s * 0.9, Math.round(p.t * (ciudad ? 3 : 2)));
            }
          }
          for (let q = 0; q < (ciudad ? 4 : 2); q++) tramo(o, [x + entre(az, -5, 5), y, z + entre(az, -5, 5)], [x + entre(az, -5, 5), y, z + entre(az, -5, 5)]);
          break;
        }
        case 'parque': {
          const cuantos = ciudad ? 4 : 3;
          if (op.tipo === 'ciudad_moderna' && az() < 0.5) {
            const g = o.grupo('detalle', orden(x, z), x, z, y, 4, 4);
            o.cilindro(g, 'agua', x, y - 0.1, z, 3.8, 0.25, { lados: 18 });
          }
          for (let q = 0; q < cuantos; q++) arbol(o, az, x + entre(az, -4.5, 4.5), y, z + entre(az, -4.5, 4.5), entre(az, 0.8, 1.2), op.tipo === 'pueblo' && az() < 0.4 ? 'conifera' : 'redondo', orden(x, z) * 0.5);
          for (let q = 0; q < 2; q++) arbol(o, az, x + entre(az, -5, 5), y, z + entre(az, -5, 5), entre(az, 0.6, 0.9), 'arbusto', orden(x, z) * 0.5);
          tramo(o, [x - 5, y, z + entre(az, -3, 3)], [x + 5, y, z + entre(az, -3, 3)]);
          break;
        }
        case 'bosque': {
          const cuantos = ciudad ? 5 : 3;
          for (let q = 0; q < cuantos; q++) arbol(o, az, x + entre(az, -5, 5), y, z + entre(az, -5, 5), entre(az, 0.9, 1.4), az() < 0.55 ? 'conifera' : 'redondo', 0);
          break;
        }
        case 'campo': {
          const g = o.grupo('campo', 0, x, z, y, C / 2, C / 2);
          const franjas = ciudad ? 3 : 2;
          const ancho = C / franjas;
          const eje = (i + j) % 2 === 0;
          for (let f = 0; f < franjas; f++) {
            const mc = elegir(az, ['cultivo1', 'cultivo2', 'cultivo3', 'cultivo1'] as Material[]);
            const off = -C / 2 + (f + 0.5) * ancho;
            if (eje) o.caja(g, mc, x + off, y, z, ancho - 0.6, 0.35, C - 0.8, { v: entre(az, -1, 1), viento: mc !== 'cultivo3' });
            else o.caja(g, mc, x, y, z + off, C - 0.8, 0.35, ancho - 0.6, { v: entre(az, -1, 1), viento: mc !== 'cultivo3' });
            // surcos
            for (let s = 0; s < 3; s++) {
              const so = off - ancho / 2 + ((s + 0.5) * (ancho - 0.6)) / 3 + 0.3;
              if (eje) o.caja(g, mc, x + so, y + 0.35, z, 0.45, 0.28, C - 1.2, { v: entre(az, -1, 1) });
              else o.caja(g, mc, x, y + 0.35, z + so, C - 1.2, 0.28, 0.45, { v: entre(az, -1, 1) });
            }
          }
          if (az() < 0.3 && op.tipo !== 'ciudad_moderna') {
            // pacas de heno o un espantapájaros
            o.cilindro(g, 'paja', x + entre(az, -4, 4), y + 0.35, z + entre(az, -4, 4), 0.8, 1.1, { lados: 10 });
          }
          if (az() < 0.25) arbol(o, az, x + C * 0.45, y, z + entre(az, -5, 5), entre(az, 0.8, 1.1), 'redondo', 0);
          break;
        }
        case 'molino': {
          const g = o.grupo('monumento', 0.1, x, z, y, 3, 3);
          o.cilindro(g, 'cal', x, y, z, 2.6, 9, { r2: 1.9, lados: 12 });
          o.cono(g, 'madera_oscura', x, y + 9, z, 2.3, 2.6, { lados: 12 });
          o.caja(g, 'madera_oscura', x, y, z + 2.3, 1.0, 2.0, 0.3);
          o.aspas.push({ x, y: y + 8.6, z: z + 2.5, r: 6.5, giro: 0.9, g });
          o.alturaMax = Math.max(o.alturaMax, y + 15);
          break;
        }
        case 'almacen': {
          const g = o.grupo('edificio', orden(x, z), x, z, y, C * 0.45, C * 0.4);
          o.caja(g, 'ladrillo', x, y, z, C * 0.88, 5.2, C * 0.7, { bisel: true, v: entre(az, -1, 1) });
          o.tejado(g, az() < 0.5 ? 'teja' : 'metal', x, y + 5.1, z, C * 0.92, 2.4, C * 0.76, 'x');
          o.caja(g, 'madera_oscura', x, y, z + C * 0.35 + 0.02, 2.6, 3.2, 0.16);
          break;
        }
        case 'muelle': {
          const g = o.grupo('detalle', 0.05, x, z, y, C / 2, C / 2);
          if (r.sobreAgua[id(n, i, j)]) {
            // pantalán de madera sobre postes
            o.caja(g, 'madera', x, y - 0.25, z, C * 0.34, 0.35, C);
            for (const dz of [-C / 2 + 1, 0, C / 2 - 1]) for (const dx of [-C * 0.15, C * 0.15]) o.cilindro(g, 'madera_oscura', x + dx, -2, z + dz, 0.22, 2.0, { lados: 6 });
            tramo(o, [x, y + 0.1, z - C / 2], [x, y + 0.1, z + C / 2]);
          } else {
            for (const dx of [-C / 3, 0, C / 3]) o.cilindro(g, 'metal', x + dx, y, z + C / 2 - 0.6, 0.25, 0.6, { lados: 6 });
            if (az() < 0.6) for (let q = 0; q < 3; q++) o.caja(g, 'madera', x + entre(az, -4, 4), y, z + entre(az, -3, 2), 1.1, 1.1, 1.1, { v: entre(az, -1, 1) });
            tramo(o, [x - C / 2, y, z + entre(az, -2, 3)], [x + C / 2, y, z + entre(az, -2, 3)]);
            o.luces.push([x, y + 4, z + C / 2 - 1]);
            const gf = o.grupo('detalle', 0.05, x, z + C / 2 - 1, y, 0.5, 0.5);
            o.cilindro(gf, 'metal', x - C * 0.4, y, z + C / 2 - 1.2, 0.12, 4.0, { lados: 5 });
            o.esfera(gf, 'ventana', x - C * 0.4, y + 4.0, z + C / 2 - 1.2, 0.35);
          }
          break;
        }
        case 'calzada': {
          {
            const g = o.grupo('detalle', 0, x, z, y, C / 2, C / 2);
            const horizontal = esPaso(rol(r, i - 1, j)) || esPaso(rol(r, i + 1, j)) || (esAgua(rol(r, i, j - 1)) && esAgua(rol(r, i, j + 1)) && !esPaso(rol(r, i, j - 1)));
            const yb = op.tipo === 'puerto' ? suelo(i, j) : 0.9;
            if (op.tipo === 'puerto') o.caja(g, 'piedra', x, -3, z, C * 0.5, yb + 3, C, { bisel: true });
            else if (horizontal) o.caja(g, op.tipo === 'ciudad_moderna' ? 'hormigon' : 'piedra', x, -3, z, C, yb + 3, C * 0.55, { bisel: true });
            else o.caja(g, op.tipo === 'ciudad_moderna' ? 'hormigon' : 'piedra', x, -3, z, C * 0.55, yb + 3, C, { bisel: true });
            const a: Punto3 = horizontal ? [x - C / 2, yb, z + entre(az, -1.5, 1.5)] : [x + entre(az, -1.5, 1.5), yb, z - C / 2];
            const b: Punto3 = horizontal ? [x + C / 2, yb, a[2]] : [a[0], yb, z + C / 2];
            tramo(o, a, b);
          }
          break;
        }
        case 'chinampa': {
          // franjas de tierra con cultivos entre canales, sauces en las puntas
          const g = o.grupo('campo', 0, x, z, 0, C / 2, C / 2);
          const eje = (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0;
          const franjas = 3;
          const ancho = C / franjas;
          for (let f = 0; f < franjas; f++) {
            const off = -C / 2 + (f + 0.5) * ancho;
            const sx = eje ? ancho * 0.62 : C - 0.4;
            const sz = eje ? C - 0.4 : ancho * 0.62;
            const fx = eje ? x + off : x;
            const fz = eje ? z : z + off;
            o.caja(g, 'tierra', fx, -2, fz, sx, 2.55, sz, { v: entre(az, -1, 1) });
            const mc = elegir(az, ['cultivo1', 'cultivo2', 'cultivo1'] as Material[]);
            const pasos = ciudad ? 5 : 4;
            for (let p = 0; p < pasos; p++) {
              const u = -0.5 + (p + 0.5) / pasos;
              const px = eje ? fx : fx + u * (C - 1.2);
              const pz = eje ? fz + u * (C - 1.2) : fz;
              o.esfera(g, mc, px, 0.45, pz, ancho * 0.24, { sy: 0.85, v: entre(az, -1, 1), viento: true });
            }
          }
          if (az() < 0.45) arbol(o, az, x + C * 0.42, 0.55, z + C * 0.42, entre(az, 0.7, 1.0), 'sauce', 0);
          break;
        }
        case 'calle': {
          // gente por la calle; en la ciudad moderna, aceras, coches y farolas
          const horizontal = esPaso(rol(r, i - 1, j)) || esPaso(rol(r, i + 1, j));
          const vertical = esPaso(rol(r, i, j - 1)) || esPaso(rol(r, i, j + 1));
          if (op.tipo === 'ciudad_moderna') {
            const g = o.grupo('detalle', 0, x, z, y, C / 2, C / 2);
            if (horizontal && !vertical) {
              o.caja(g, 'acera', x, y, z - C / 2 + 1.0, C, 0.22, 2.0);
              o.caja(g, 'acera', x, y, z + C / 2 - 1.0, C, 0.22, 2.0);
              o.caja(g, 'marca', x, y, z, C * 0.4, 0.04, 0.3);
              tramo(o, [x - C / 2, y, z - 2.2], [x + C / 2, y, z - 2.2], 'coche');
              tramo(o, [x + C / 2, y, z + 2.2], [x - C / 2, y, z + 2.2], 'coche');
              tramo(o, [x - C / 2, y + 0.22, z - C / 2 + 1], [x + C / 2, y + 0.22, z - C / 2 + 1]);
            } else if (vertical && !horizontal) {
              o.caja(g, 'acera', x - C / 2 + 1.0, y, z, 2.0, 0.22, C);
              o.caja(g, 'acera', x + C / 2 - 1.0, y, z, 2.0, 0.22, C);
              o.caja(g, 'marca', x, y, z, 0.3, 0.04, C * 0.4);
              tramo(o, [x + 2.2, y, z - C / 2], [x + 2.2, y, z + C / 2], 'coche');
              tramo(o, [x - 2.2, y, z + C / 2], [x - 2.2, y, z - C / 2], 'coche');
              tramo(o, [x + C / 2 - 1, y + 0.22, z - C / 2], [x + C / 2 - 1, y + 0.22, z + C / 2]);
            } else {
              for (let q = -2; q <= 2; q++) o.caja(g, 'marca', x + q * 1.2, y, z + C / 2 - 1.6, 0.6, 0.04, 2.0);
            }
            if ((i + j) % 2 === 0) {
              o.cilindro(g, 'metal', x + C / 2 - 0.8, y, z + C / 2 - 0.8, 0.12, 5.0, { lados: 5 });
              o.esfera(g, 'ventana', x + C / 2 - 0.8, y + 5.0, z + C / 2 - 0.8, 0.4);
              o.luces.push([x + C / 2 - 0.8, y + 5, z + C / 2 - 0.8]);
            }
            if ((i * 3 + j) % 3 === 0 && horizontal !== vertical) arbol(o, az, x + (vertical ? C / 2 - 1 : 0), y + 0.22, z + (horizontal ? -C / 2 + 1 : 0), 0.65, 'redondo', 0.2);
          } else {
            if (horizontal || !vertical) tramo(o, [x - C / 2, y, z + entre(az, -2, 2)], [x + C / 2, y, z + entre(az, -2, 2)]);
            if (vertical) tramo(o, [x + entre(az, -2, 2), y, z - C / 2], [x + entre(az, -2, 2), y, z + C / 2]);
            if (ciudad && az() < 0.25 && op.tipo !== 'ciudad_antigua') arbol(o, az, x + C / 2 - 1.2, y, z + C / 2 - 1.2, 0.6, mediterranea ? 'palmera' : 'redondo', 0.2);
            if (op.tipo === 'pueblo' && (i + j) % 3 === 0) {
              const g = o.grupo('detalle', 0.2, x, z, y, 1, 1);
              o.cilindro(g, 'metal', x - C / 2 + 0.8, y, z - C / 2 + 0.8, 0.1, 3.4, { lados: 5 });
              o.esfera(g, 'ventana', x - C / 2 + 0.8, y + 3.4, z - C / 2 + 0.8, 0.32);
              o.luces.push([x - C / 2 + 0.8, y + 3.4, z - C / 2 + 0.8]);
            }
          }
          break;
        }
        default:
          break;
      }
      // orillas con juncos y árboles
      if (ro !== 'agua' && vecinoAgua && ciudad && az() < 0.18 && ro !== 'muelle' && ro !== 'calzada') arbol(o, az, x + entre(az, -4, 4), y, z + entre(az, -4, 4), entre(az, 0.5, 0.8), 'arbusto', 0);
    }

  // templos menores en el recinto de la ciudad antigua
  if (op.tipo === 'ciudad_antigua' && plan.plaza && ciudad) {
    const p = plan.plaza;
    const x0 = cx(n, p.i) + C;
    const z0 = cx(n, p.j) + C;
    const x1 = cx(n, p.i + p.t - 1) - C;
    const z1 = cx(n, p.j + p.t - 1) - C;
    templo(k, x0, 0.5, z1, 14, false, 0.08);
    templo(k, x1, 0.5, z1, 12, false, 0.1);
    temploRedondo(k, x1, 0.5, z0, 5.5, 0.12);
    // juego de pelota
    const g = o.grupo('monumento', 0.14, x0, z0, 0.5, 8, 4);
    o.caja(g, 'piedra_clara', x0, 0.5, z0 - 3.4, 15, 2.6, 2.4, { bisel: true });
    o.caja(g, 'piedra_clara', x0, 0.5, z0 + 3.4, 15, 2.6, 2.4, { bisel: true });
    o.caja(g, 'pintura1', x0, 0.5, z0, 15, 0.08, 4.4);
  }

  // barcas: vueltas por el lago o la bahía, idas y vueltas por canales y ríos
  const nivel = 0;
  if (agua === 'lago' && op.tipo === 'ciudad_antigua') {
    const rr = (lado / 2) * (ciudad ? 0.94 : 0.95);
    for (let q = 0; q < (ciudad ? 3 : 1); q++) {
      const puntos: Array<[number, number]> = [];
      const radio = rr * (1 + q * 0.05);
      for (let a = 0; a < 48; a++) puntos.push([Math.cos((a / 48) * Math.PI * 2) * radio, Math.sin((a / 48) * Math.PI * 2) * radio]);
      o.rutas.push({ puntos, y: nivel, tipo: 'barca' });
    }
  }
  if (agua === 'mar' || op.tipo === 'puerto') {
    const js = r.roles.findIndex((x) => x === 'agua');
    const zMar = js >= 0 ? cx(n, Math.floor(js / n)) : lado / 2;
    for (let q = 0; q < (ciudad ? 3 : 1); q++) {
      const puntos: Array<[number, number]> = [];
      const cxr = entre(az, -lado * 0.2, lado * 0.2);
      const czr = zMar + (ciudad ? 30 + q * 22 : 10);
      for (let a = 0; a < 48; a++) puntos.push([cxr + Math.cos((a / 48) * Math.PI * 2) * (ciudad ? 70 : 26), czr + Math.sin((a / 48) * Math.PI * 2) * (ciudad ? 18 : 8)]);
      o.rutas.push({ puntos, y: nivel, tipo: q % 2 === 0 ? 'velero' : 'barca' });
    }
  }
  // canales, ríos y barcas amarradas
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      if (!esAgua(rol(r, i, j))) continue;
      const derecha = esAgua(rol(r, i + 1, j)) && esAgua(rol(r, i + 2, j));
      const abajo = esAgua(rol(r, i, j + 1)) && esAgua(rol(r, i, j + 2));
      const tierraCerca = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
        const x = rol(r, i + a, j + b);
        return x !== null && x !== 'agua' && x !== 'chinampa';
      });
      if (!tierraCerca) continue;
      if (az() < (ciudad ? 0.12 : 0.18)) {
        if (derecha) tramo(o, [cx(n, i), nivel, cx(n, j)], [cx(n, i + 2), nivel, cx(n, j)], 'barca');
        else if (abajo) tramo(o, [cx(n, i), nivel, cx(n, j)], [cx(n, i), nivel, cx(n, j + 2)], 'barca');
      }
      if (op.tipo === 'puerto' && rol(r, i, j - 1) === 'muelle' && az() < 0.5) tramo(o, [cx(n, i) + entre(az, -3, 3), nivel, cx(n, j) - 3], [cx(n, i) + entre(az, -3, 3), nivel, cx(n, j) - 3], 'barca');
    }

  // ------------------------------------------------------------------------------------------ los lugares
  const enCelda = (i: number, j: number, radio: number, alto: number): Lugar => ({ x: cx(n, i), z: cx(n, j), y: suelo(Math.max(0, Math.min(n - 1, i)), Math.max(0, Math.min(n - 1, j))), radio, alto });
  const buscar = (cond: (x: Rol, i: number, j: number) => boolean, cerca: [number, number] = [(n - 1) / 2, (n - 1) / 2]): [number, number] | null => {
    let mejor: [number, number] | null = null;
    let dm = Infinity;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++)
        if (cond(r.roles[id(n, i, j)], i, j)) {
          const d = Math.hypot(i - cerca[0], j - cerca[1]);
          if (d < dm) {
            dm = d;
            mejor = [i, j];
          }
        }
    return mejor;
  };
  const m = plan.monumento;
  const mxc = cx(n, m.i) + ((m.t - 1) * C) / 2;
  const mzc = cx(n, m.j) + ((m.t - 1) * C) / 2;
  const altoMon = Math.max(10, ...o.piezas.filter((p) => o.grupos[p.g].tipo === 'monumento' && Math.hypot(o.grupos[p.g].x - mxc, o.grupos[p.g].z - mzc) < m.t * C).map((p) => (p.k === 'esfera' ? p.y + p.r : p.y + p.sy)));
  const yMon = suelo(Math.min(n - 1, m.i), Math.min(n - 1, m.j));
  const monumento: Lugar = { x: mxc, z: mzc, y: yMon, radio: Math.max(m.t * C * 0.6, op.tipo === 'puerto' ? 10 : 8), alto: altoMon - yMon };
  const centroIJ: [number, number] = [(n - 1) / 2, (n - 1) / 2];
  const pz = plan.plaza;
  const plaza: Lugar = pz ? { x: cx(n, pz.i) + ((pz.t - 1) * C) / 2, z: cx(n, pz.j) + ((pz.t - 1) * C) / 2, y: suelo(pz.i, pz.j), radio: Math.max(9, pz.t * C * 0.55), alto: 6 } : monumento;
  const me = plan.mercado;
  const mercado: Lugar = me ? { x: cx(n, me.i) + ((me.t - 1) * C) / 2, z: cx(n, me.j) + ((me.t - 1) * C) / 2, y: suelo(me.i, me.j), radio: Math.max(8, me.t * C * 0.5), alto: 4 } : plaza;
  const casaIJ = buscar((x) => x === 'casa' || x === 'bloque', [centroIJ[0] + n * 0.22, centroIJ[1] + n * 0.18]) ?? centroIJ;
  const calleIJ = buscar((x) => x === 'calle', [centroIJ[0] - n * 0.18, centroIJ[1] + n * 0.12]) ?? centroIJ;
  // el agua que se ve con vida: un canal o la orilla, junto a tierra (no el centro del lago)
  const orilla = (x: Rol, i: number, j: number) =>
    x === 'agua' && !r.sobreAgua[id(n, i, j)] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const v = rol(r, i + a, j + b); return v !== null && v !== 'agua'; });
  const aguaIJ = buscar(orilla, [centroIJ[0] + n * 0.12, centroIJ[1] + n * 0.3]) ?? buscar((x) => x === 'agua', [centroIJ[0] + n * 0.1, n]) ?? [n - 1, n - 1];
  const camposIJ = buscar((x) => x === 'chinampa' || x === 'campo' || x === 'parque', [n * 0.15, n * 0.85]) ?? [0, n - 1];
  const puertoIJ = buscar((x) => x === 'muelle' || x === 'calzada', [centroIJ[0], n]) ?? aguaIJ;
  const centro: Lugar = op.tipo === 'puerto' ? { x: plaza.x, z: (plaza.z + cx(n, puertoIJ[1])) / 2, y: plaza.y, radio: lado * 0.28, alto: 15 } : { x: (monumento.x + plaza.x) / 2, z: (monumento.z + plaza.z) / 2, y: 0.5, radio: lado * 0.22, alto: monumento.alto };
  const lugares: Record<IdLugar, Lugar> = {
    centro,
    monumento,
    plaza,
    mercado,
    barrio: enCelda(casaIJ[0], casaIJ[1], ciudad ? 14 : 10, 6),
    calle: enCelda(calleIJ[0], calleIJ[1], ciudad ? 9 : 8, 4),
    agua: { ...enCelda(aguaIJ[0], aguaIJ[1], ciudad ? 18 : 10, 2), y: nivel },
    campos: enCelda(camposIJ[0], camposIJ[1], ciudad ? 16 : 10, 3),
    puerto: enCelda(puertoIJ[0], puertoIJ[1], ciudad ? 12 : 9, 4),
    afueras: { x: 0, z: 0, y: 0.5, radio: lado * 0.5, alto: o.alturaMax },
  };

  return {
    tipo: op.tipo,
    escala: op.escala,
    agua,
    n,
    celda: C,
    lado,
    roles: r.roles,
    suelos: r.suelos.map((s, q) => (r.roles[q] === 'agua' && !r.sobreAgua[q] ? -2 : s)),
    piezas: o.piezas,
    grupos: o.grupos,
    lugares,
    tramos: o.tramos,
    rutas: o.rutas,
    humos: o.humos,
    luces: o.luces,
    aspas: o.aspas,
    nivelAgua: nivel,
    alturaMax: o.alturaMax,
  };
}
