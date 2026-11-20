// El terreno alrededor de la ciudad: una malla de alturas que sigue a la ciudad en sus bordes (la orilla del lago, el
// río que entra y sale, la costa, la ladera del puerto) y sube hacia montañas lejanas que la neblina vuelve azuladas.
// Más la campiña: árboles en grupos, campos de colores y calzadas que llegan a la orilla. Todo determinista.

import * as THREE from 'three';
import { crearAzar, entre, hash } from '../_mundo/azar.ts';
import type { Grupo, Material, Mundo, Pieza } from '../_mundo/tipos.ts';
import { aGeometria, anadir, nuevoAcumulador } from './geometria.ts';

/** Ruido de valor suave en 2D. */
function ruido(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, z: number): number {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < 4; o++) {
    s += amp * ruido(x * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}

export interface Terreno {
  /** Altura del terreno fuera de la ciudad (dentro devuelve el suelo de la celda). */
  altura: (x: number, z: number) => number;
  geometria: THREE.BufferGeometry;
  campina: { piezas: Pieza[]; grupos: Grupo[] };
  /** Medio lado de todo lo que se ve. */
  extension: number;
}

export function crearTerreno(m: Mundo, colores: Record<Material, string>, semilla: number): Terreno {
  const L = m.lado / 2;
  const C = m.celda;
  const margen = m.escala === 'ciudad' ? 54 : 30;
  const seg = m.n + 2 * margen;
  const extension = L + margen * C;
  const montes = m.tipo === 'ciudad_antigua' ? 380 : m.tipo === 'pueblo' ? 200 : m.tipo === 'puerto' ? 220 : 150;
  // el río: el agua de las columnas del borde, prolongada hacia fuera
  const filaAgua = (i: number): number | null => {
    const zs: number[] = [];
    for (let j = 0; j < m.n; j++) if (m.roles[j * m.n + i] === 'agua' || m.roles[j * m.n + i] === 'calzada') zs.push((j - m.n / 2 + 0.5) * C);
    return zs.length > 0 && zs.length < m.n * 0.5 ? zs.reduce((a, b) => a + b, 0) / zs.length : null;
  };
  const rioO = m.agua === 'rio' ? filaAgua(0) : null;
  const rioE = m.agua === 'rio' ? filaAgua(m.n - 1) : null;
  // la costa: primera fila de agua de la ciudad
  let zCosta = Infinity;
  if (m.agua === 'mar') for (let j = 0; j < m.n && zCosta === Infinity; j++) if (m.roles[j * m.n + Math.floor(m.n / 2)] === 'agua') zCosta = (j - m.n / 2) * C;

  const sueloBorde = (x: number, z: number): number => {
    const i = Math.max(0, Math.min(m.n - 1, Math.floor(x / C + m.n / 2)));
    const j = Math.max(0, Math.min(m.n - 1, Math.floor(z / C + m.n / 2)));
    const s = m.suelos[j * m.n + i];
    const rol = m.roles[j * m.n + i];
    return rol === 'agua' || rol === 'chinampa' || rol === 'calzada' ? -3 : s;
  };

  const altura = (x: number, z: number): number => {
    const dx = Math.abs(x) - L;
    const dz = Math.abs(z) - L;
    if (dx < -0.01 && dz < -0.01) return -4;
    const d = Math.max(0, Math.hypot(Math.max(0, dx), Math.max(0, dz)));
    const ang = Math.atan2(z, x);
    const lejos = THREE.MathUtils.smoothstep(d, L * 0.6, L * 0.6 + 520);
    // crestas: ruido «plegado» (1 − |2n − 1|) para que las sierras tengan filo
    const cresta = 1 - Math.abs(2 * fbm(x * 0.0045 + 11, z * 0.0045 + 3) - 1);
    const monte = (Math.pow(cresta, 2.2) * 1.5 + fbm(x * 0.02, z * 0.02) * 0.2) * montes * lejos;
    const ondula = (fbm(x * 0.012 + 5, z * 0.012) - 0.5) * 6 * THREE.MathUtils.smoothstep(d, 20, 140);
    const borde = sueloBorde(x, z);
    let tierra = Math.max(0.5, 0.5 + ondula) + monte;
    tierra = THREE.MathUtils.lerp(Math.max(borde, 0.5), tierra, THREE.MathUtils.smoothstep(d, 0, 70));
    if (m.agua === 'lago') {
      const orilla = L * (m.escala === 'ciudad' ? 0.5 : 0.9) * (1 + 0.28 * (fbm(Math.cos(ang) * 2 + 4, Math.sin(ang) * 2 + 4) - 0.5));
      if (d < orilla) return -3;
      return THREE.MathUtils.lerp(-3, tierra, THREE.MathUtils.smoothstep(d, orilla, orilla + 26));
    }
    if (m.agua === 'mar') {
      const costa = zCosta + (fbm(x * 0.01, 7) - 0.5) * 40 + Math.max(0, Math.abs(x) - L) * 0.25;
      if (z > costa + 6) return -3 - Math.min(4, (z - costa) * 0.05);
      if (z > costa - 14) return THREE.MathUtils.lerp(tierra, -3, THREE.MathUtils.smoothstep(z, costa - 14, costa + 6));
      return tierra;
    }
    if (m.agua === 'rio') {
      const zr = x < 0 ? rioO : rioE;
      if (zr !== null && Math.abs(x) > L - 0.01) {
        const zc = zr + (fbm(x * 0.008, 3) - 0.5) * 50 * THREE.MathUtils.smoothstep(Math.abs(x) - L, 0, 200);
        const dist = Math.abs(z - zc);
        const ancho = C * 0.75;
        if (dist < ancho) return -3;
        return THREE.MathUtils.lerp(-3, tierra, THREE.MathUtils.smoothstep(dist, ancho, ancho + 10));
      }
    }
    return tierra;
  };

  // ---------------------------------------------------------------------------------------------- la malla
  const geo = new THREE.PlaneGeometry(extension * 2, extension * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const col: number[] = [];
  const c = new THREE.Color();
  const cHierba = new THREE.Color(colores.hierba);
  const cSeca = new THREE.Color(colores.hierba_seca);
  const cArena = new THREE.Color(colores.arena);
  const cRoca = new THREE.Color(colores.roca).lerp(new THREE.Color('#6F7684'), 0.4);
  const cTierra = new THREE.Color(colores.tierra);
  const cNieve = new THREE.Color('#F1EEE8');
  const cBosque = new THREE.Color(colores.hoja2).multiplyScalar(0.8);
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k);
    const z = pos.getZ(k);
    const y = altura(x, z);
    pos.setY(k, y);
    const n = fbm(x * 0.02 + 40, z * 0.02);
    c.copy(cHierba).lerp(cSeca, THREE.MathUtils.clamp((n - 0.35) * 2.2, 0, 1));
    if (n > 0.66) c.lerp(cTierra, 0.25);
    if (y < 1.4) c.lerp(cArena, THREE.MathUtils.clamp((1.4 - y) / 2, 0, 1));
    // laderas con monte bajo, luego roca y nieve en las cumbres
    if (y > 12) c.lerp(cBosque, THREE.MathUtils.clamp((y - 12) / 70, 0, 0.65));
    if (y > montes * 0.35) c.lerp(cRoca, THREE.MathUtils.clamp((y - montes * 0.35) / (montes * 0.3), 0, 0.85));
    if (y > montes * 0.75 && m.tipo !== 'ciudad_moderna') c.lerp(cNieve, THREE.MathUtils.clamp((y - montes * 0.75) / 30, 0, 0.95));
    col.push(c.r, c.g, c.b);
  }
  geo.computeVertexNormals();
  const ac = nuevoAcumulador();
  const blanco = new THREE.Color(1, 1, 1);
  anadir(ac, geo, [0, 0, 0], [1, 1, 1], blanco, -1, 0, 0, 0, 0, null, 1);
  // los colores por vértice del terreno (anadir puso blanco): se copian en el orden de los triángulos
  const idx = geo.getIndex();
  if (idx) for (let q = 0; q < idx.count; q++) {
    const v = idx.getX(q);
    ac.col[q * 3] = col[v * 3];
    ac.col[q * 3 + 1] = col[v * 3 + 1];
    ac.col[q * 3 + 2] = col[v * 3 + 2];
  }
  geo.dispose();
  const geometria = aGeometria(ac);

  // ---------------------------------------------------------------------------------------------- la campiña
  const az = crearAzar(semilla * 13 + 3);
  const piezas: Pieza[] = [];
  const grupos: Grupo[] = [];
  const grupo = (x: number, z: number, y: number, r: number): number => {
    grupos.push({ tipo: 'arbol', orden: 0, x, z, base: y, rx: r, rz: r });
    return grupos.length - 1;
  };
  const fuera = (x: number, z: number, margen2: number) => Math.abs(x) > L + margen2 || Math.abs(z) > L + margen2;
  const llano = (x: number, z: number) => {
    const y = altura(x, z);
    const e = 3;
    return y > 0.3 && Math.abs(altura(x + e, z) - y) < 1.2 && Math.abs(altura(x, z + e) - y) < 1.2 ? y : null;
  };
  const radioCampina = m.escala === 'ciudad' ? 420 : 140;
  // árboles en bosquecillos
  const cuantos = m.escala === 'ciudad' ? 900 : 160;
  for (let k = 0; k < cuantos; k++) {
    const x = entre(az, -radioCampina - L, radioCampina + L);
    const z = entre(az, -radioCampina - L, radioCampina + L);
    if (!fuera(x, z, 6)) continue;
    if (fbm(x * 0.015 + 9, z * 0.015 + 2) < 0.5) continue;
    const y = llano(x, z);
    if (y === null) continue;
    const s = entre(az, 0.8, 1.5);
    const g = grupo(x, z, y, 2);
    const conifera = m.tipo === 'pueblo' ? az() < 0.6 : m.tipo === 'ciudad_antigua' ? az() < 0.2 : az() < 0.3;
    const v = entre(az, -1, 1);
    if (conifera) {
      piezas.push({ k: 'cilindro', m: 'tronco', g, x, y, z, r: 0.3 * s, sy: 1.4 * s, lados: 6 });
      piezas.push({ k: 'cono', m: 'hoja2', g, x, y: y + 1.0 * s, z, r: 1.8 * s, sy: 4.6 * s, lados: 7, v, viento: true });
    } else {
      piezas.push({ k: 'cilindro', m: 'tronco', g, x, y, z, r: 0.28 * s, sy: 2.0 * s, lados: 6 });
      piezas.push({ k: 'esfera', m: az() < 0.5 ? 'hoja' : 'hoja2', g, x, y: y + 2.0 * s + 1.0 * s, z, r: 1.7 * s, sy: 0.95, v, viento: true });
    }
  }
  // campos de colores cerca de la ciudad
  if (m.tipo !== 'ciudad_moderna') {
    const nCampos = m.escala === 'ciudad' ? 90 : 14;
    for (let k = 0; k < nCampos; k++) {
      const x = entre(az, -L - 240, L + 240);
      const z = entre(az, -L - 240, L + 240);
      if (!fuera(x, z, 10)) continue;
      const y = llano(x, z);
      if (y === null || y > 4) continue;
      const w = entre(az, 14, 30);
      const d = entre(az, 10, 24);
      if (llano(x + w / 2, z + d / 2) === null || llano(x - w / 2, z - d / 2) === null) continue;
      grupos.push({ tipo: 'campo', orden: 0, x, z, base: y, rx: w / 2, rz: d / 2 });
      const g = grupos.length - 1;
      const mc: Material = (['cultivo1', 'cultivo2', 'cultivo3', 'cultivo1'] as const)[Math.floor(az() * 4)];
      piezas.push({ k: 'caja', m: mc, g, x, y: y - 0.3, z, sx: w, sy: 0.55, sz: d, v: entre(az, -1, 1) });
      const surcos = Math.floor(w / 2.4);
      for (let s = 0; s < surcos; s++) piezas.push({ k: 'caja', m: mc, g, x: x - w / 2 + (s + 0.5) * (w / surcos), y: y + 0.25, z, sx: 0.7, sy: 0.25, sz: d - 1, v: entre(az, -1, 1) });
    }
  }
  // calzadas que llegan a la orilla del lago
  if (m.agua === 'lago') {
    const ancho = C * 0.55;
    for (let i = 0; i < m.n; i++)
      for (const [j, dir] of [[0, -1], [m.n - 1, 1]] as const) {
        if (m.roles[j * m.n + i] !== 'calzada') continue;
        const x = (i - m.n / 2 + 0.5) * C;
        for (let paso = 1; paso < 40; paso++) {
          const z = dir * (L + (paso - 0.5) * C);
          if (altura(x, z) > 0.4) break;
          grupos.push({ tipo: 'detalle', orden: 0, x, z, base: -3, rx: ancho / 2, rz: C / 2 });
          piezas.push({ k: 'caja', m: 'piedra', g: grupos.length - 1, x, y: -3, z, sx: ancho, sy: 3.9, sz: C, bisel: true });
        }
      }
    for (let j = 0; j < m.n; j++)
      for (const [i, dir] of [[0, -1], [m.n - 1, 1]] as const) {
        if (m.roles[j * m.n + i] !== 'calzada') continue;
        const z = (j - m.n / 2 + 0.5) * C;
        for (let paso = 1; paso < 40; paso++) {
          const x = dir * (L + (paso - 0.5) * C);
          if (altura(x, z) > 0.4) break;
          grupos.push({ tipo: 'detalle', orden: 0, x, z, base: -3, rx: C / 2, rz: ancho / 2 });
          piezas.push({ k: 'caja', m: 'piedra', g: grupos.length - 1, x, y: -3, z, sx: C, sy: 3.9, sz: ancho, bisel: true });
        }
      }
  }
  return { altura, geometria, campina: { piezas, grupos }, extension };
}
