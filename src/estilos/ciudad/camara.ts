// La cámara de la maqueta: cada plano es una función pura del avance de la escena (u, de 0 a 1), así cada fotograma se
// calcula solo, en cualquier orden y en cualquier pestaña del render. Se mueve siempre un poco (nunca queda quieta) y
// con curva suave. Nunca se mete dentro de una casa: se queda por encima de lo construido.

import * as THREE from 'three';
import { mezcla, suave } from '../_mundo/azar.ts';
import type { IdLugar, Mundo } from '../_mundo/tipos.ts';

export type Plano = 'general' | 'aereo' | 'acercamiento' | 'alejamiento' | 'recorrido' | 'orbita' | 'detalle' | 'cenital';

export interface Toma {
  pos: THREE.Vector3;
  mira: THREE.Vector3;
  fov: number;
  /** El punto que queda nítido (el resto se desenfoca como una maqueta) y cuánto desenfoque. */
  enfoque: THREE.Vector3;
  desenfoque: number;
}

const rad = THREE.MathUtils.degToRad;

/** Altura de lo construido en cada celda, para que la cámara no atraviese casas. */
export function techos(m: Mundo): Float32Array {
  const t = new Float32Array(m.n * m.n);
  for (const p of m.piezas) {
    const g = m.grupos[p.g];
    if (g.tipo === 'suelo') continue;
    const tope = p.k === 'esfera' ? p.y + p.r * (p.sy ?? 1) : p.y + p.sy;
    const i = Math.floor(p.x / m.celda + m.n / 2);
    const j = Math.floor(p.z / m.celda + m.n / 2);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const ii = i + a;
        const jj = j + b;
        if (ii >= 0 && jj >= 0 && ii < m.n && jj < m.n) t[jj * m.n + ii] = Math.max(t[jj * m.n + ii], tope);
      }
  }
  return t;
}

function techoEn(m: Mundo, t: Float32Array, x: number, z: number, altura: (x: number, z: number) => number): number {
  const i = Math.floor(x / m.celda + m.n / 2);
  const j = Math.floor(z / m.celda + m.n / 2);
  if (i >= 0 && j >= 0 && i < m.n && j < m.n) return t[j * m.n + i];
  return Math.max(0, altura(x, z) + 3);
}

/** Mira hacia el centro con la cabeza levantada: inclinación fija hacia abajo (grados), así el horizonte, las montañas
 * y el cielo entran por arriba del cuadro vertical y la ciudad queda en la mitad de abajo. */
function conCielo(pos: THREE.Vector3, centro: THREE.Vector3, inclinacion: number): THREE.Vector3 {
  const d = new THREE.Vector3(centro.x - pos.x, 0, centro.z - pos.z).normalize();
  const p = rad(inclinacion);
  return pos.clone().add(new THREE.Vector3(d.x * Math.cos(p), -Math.sin(p), d.z * Math.cos(p)).multiplyScalar(100));
}

/** Desde qué lado mira, en grados: 0 = desde el sur (z positivo) mirando al norte. */
function desde(centro: THREE.Vector3, azGrados: number, elevGrados: number, dist: number): THREE.Vector3 {
  const a = rad(azGrados);
  const e = rad(elevGrados);
  return new THREE.Vector3(centro.x + Math.sin(a) * Math.cos(e) * dist, centro.y + Math.sin(e) * dist, centro.z + Math.cos(a) * Math.cos(e) * dist);
}

export function tomaEn(
  m: Mundo,
  techo: Float32Array,
  altura: (x: number, z: number) => number,
  plano: Plano,
  lugar: IdLugar,
  azimut: number,
  u0: number,
  aspecto: number,
): Toma {
  const l = m.lugares[lugar];
  const R = Math.max(8, l.radio);
  const H = Math.max(3, l.alto);
  const u = 0.2 * u0 + 0.8 * suave(u0);
  const blanco = new THREE.Vector3(l.x, l.y + Math.min(H * 0.42, 18), l.z);
  const total = m.lado;
  // con más ancho que alto, la cámara puede acercarse más
  const k = aspecto < 1 ? 1 : 0.75;
  let pos: THREE.Vector3;
  let mira = blanco.clone();
  let fov = 46;
  let desenfoque = 1;
  let enfoque: THREE.Vector3 | null = null;
  switch (plano) {
    case 'general': {
      const centro = new THREE.Vector3(0, Math.min(m.alturaMax * 0.15, 10), m.tipo === 'puerto' ? m.lado * 0.08 : 0);
      pos = desde(centro, azimut + mezcla(-7, 7, u), mezcla(24, 22, u), total * mezcla(1.12, 1.04, u) * k);
      mira = conCielo(pos, centro, 20);
      enfoque = centro;
      fov = 54;
      desenfoque = 1.1;
      break;
    }
    case 'aereo': {
      const deriva = new THREE.Vector3(Math.cos(rad(azimut)), 0, -Math.sin(rad(azimut))).multiplyScalar(mezcla(-R * 0.5, R * 0.5, u));
      mira = blanco.clone().add(deriva);
      pos = desde(mira, azimut + mezcla(-4, 4, u), mezcla(64, 58, u), (R * 4.2 + 70) * k);
      desenfoque = 1.2;
      break;
    }
    case 'acercamiento':
      pos = desde(blanco, azimut + mezcla(-5, 6, u), mezcla(38, 24, u), mezcla(R * 5.5 + 110, R * 2.9 + 30, u) * k);
      break;
    case 'alejamiento': {
      const centro = blanco.clone().lerp(new THREE.Vector3(0, 6, 0), u * 0.7);
      pos = desde(centro, azimut + mezcla(6, -6, u), mezcla(24, 27, u), mezcla(R * 2.6 + 24, total * 1.15, u) * k);
      mira = centro.clone().lerp(conCielo(pos, centro, 20), suave(Math.min(1, u * 1.3)));
      enfoque = centro;
      fov = mezcla(46, 54, u);
      desenfoque = mezcla(1, 1.1, u);
      break;
    }
    case 'recorrido': {
      const lateral = new THREE.Vector3(Math.cos(rad(azimut)), 0, -Math.sin(rad(azimut)));
      const atras = new THREE.Vector3(Math.sin(rad(azimut)), 0, Math.cos(rad(azimut)));
      const d = (R * 1.9 + 22) * k;
      pos = blanco.clone().addScaledVector(atras, d).addScaledVector(lateral, mezcla(-R * 1.3 - 10, R * 1.3 + 10, u));
      pos.y = l.y + Math.max(17, H * 0.6 + 9);
      mira = blanco.clone().addScaledVector(lateral, mezcla(-R * 0.4, R * 0.4, u));
      fov = 50;
      desenfoque = 0.8;
      break;
    }
    case 'orbita':
      pos = desde(blanco, azimut + mezcla(-32, 32, u), 26, (R * 3.1 + 34) * k);
      break;
    case 'detalle':
      blanco.y = l.y + Math.min(H * 0.3, 5);
      mira = blanco;
      pos = desde(blanco, azimut + mezcla(-6, 6, u), mezcla(19, 15, u), mezcla(R * 1.25 + 12, R * 1.05 + 9, u) * k);
      fov = 44;
      desenfoque = 0.75;
      break;
    case 'cenital':
      mira = blanco;
      pos = desde(blanco, azimut + mezcla(0, 28, u), 80, (R * 4.5 + 80) * k);
      desenfoque = 1.1;
      break;
  }
  // nunca dentro de una casa ni bajo el terreno
  const tope = techoEn(m, techo, pos.x, pos.z, altura) + 4;
  if (pos.y < tope) pos.y = tope;
  return { pos, mira, fov, enfoque: enfoque ?? mira, desenfoque };
}

/** Proyecta un punto del mundo a la pantalla (en píxeles) con la toma. */
export function proyectar(t: Toma, ancho: number, alto: number, x: number, y: number, z: number): { x: number; y: number; delante: boolean } {
  const cam = camaraDe(t, ancho / alto);
  const v = new THREE.Vector3(x, y, z).project(cam);
  return { x: ((v.x + 1) / 2) * ancho, y: ((1 - v.y) / 2) * alto, delante: v.z < 1 };
}

export function camaraDe(t: Toma, aspecto: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(t.fov, aspecto, 1, 12000);
  cam.position.copy(t.pos);
  cam.lookAt(t.mira);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}
