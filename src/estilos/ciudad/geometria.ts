// De las piezas del mundo a geometría de three.js: todo lo quieto en UNA malla con colores por vértice (pocas llamadas
// de dibujo, render rápido). Cada vértice lleva su orden de construcción, su base, cuánto le mueve el viento y si brilla
// de noche; el sombreador hace crecer los edificios desde el suelo, mece las copas y enciende ventanas y fuegos. Las
// sombras usan el mismo truco (material de profundidad parcheado), así la sombra crece con el edificio.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hash } from '../_mundo/azar.ts';
import type { Material, Mundo, Pieza } from '../_mundo/tipos.ts';

export interface Acumulador {
  pos: number[];
  nor: number[];
  col: number[];
  /** orden de construcción (−1 = siempre), base del grupo */
  crece: number[];
  /** viento, brillo (0 nada, 1 ventana encendida de noche, 2 fuego), liso (vidrio) */
  extra: number[];
}

export const nuevoAcumulador = (): Acumulador => ({ pos: [], nor: [], col: [], crece: [], extra: [] });

const _c = new THREE.Color();
const _n = new THREE.Vector3();

/** Añade una geometría trasladada y escalada, con su color y sus atributos. */
export function anadir(
  a: Acumulador,
  geo: THREE.BufferGeometry,
  t: [number, number, number],
  s: [number, number, number],
  color: THREE.Color,
  orden: number,
  base: number,
  viento: number,
  brillo: number,
  liso: number,
  ao: number | null,
  alto: number,
): void {
  const p = geo.getAttribute('position');
  const nn = geo.getAttribute('normal');
  const idx = geo.getIndex();
  const cuenta = idx ? idx.count : p.count;
  for (let k = 0; k < cuenta; k++) {
    const v = idx ? idx.getX(k) : k;
    const x = p.getX(v) * s[0] + t[0];
    const y = p.getY(v) * s[1] + t[1];
    const z = p.getZ(v) * s[2] + t[2];
    a.pos.push(x, y, z);
    _n.set(nn.getX(v) / s[0], nn.getY(v) / s[1], nn.getZ(v) / s[2]).normalize();
    a.nor.push(_n.x, _n.y, _n.z);
    // sombra de contacto: el pie de las paredes un poco más oscuro (oclusión barata, sin pasada extra)
    const f = ao === null ? 1 : 0.7 + 0.3 * THREE.MathUtils.smoothstep(y - ao, 0, 2.4);
    a.col.push(color.r * f, color.g * f, color.b * f);
    a.crece.push(orden, base);
    const w = viento > 0 ? viento * THREE.MathUtils.clamp((y - base) / Math.max(1, alto), 0, 1) : 0;
    a.extra.push(w, brillo, liso);
  }
}

export function aGeometria(a: Acumulador): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
  g.setAttribute('aCrece', new THREE.Float32BufferAttribute(a.crece, 2));
  g.setAttribute('aExtra', new THREE.Float32BufferAttribute(a.extra, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

// ------------------------------------------------------------------------------------------------ formas
const UNIDAD_CAJA = new THREE.BoxGeometry(1, 1, 1);

/** Tejado a dos aguas: el caballete va a lo largo del eje. Base en y = 0, centrado. */
function tejado(sx: number, sy: number, sz: number, eje: 'x' | 'z'): THREE.BufferGeometry {
  const hx = sx / 2;
  const hz = sz / 2;
  const v: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => v.push(...a, ...b, ...c, ...a, ...c, ...d);
  const tri = (a: number[], b: number[], c: number[]) => v.push(...a, ...b, ...c);
  if (eje === 'x') {
    const r1 = [-hx, sy, 0];
    const r2 = [hx, sy, 0];
    quad([-hx, 0, hz], [hx, 0, hz], r2, r1);
    quad([hx, 0, -hz], [-hx, 0, -hz], r1, r2);
    tri([-hx, 0, -hz], [-hx, 0, hz], r1);
    tri([hx, 0, hz], [hx, 0, -hz], r2);
    quad([-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]);
  } else {
    const r1 = [0, sy, -hz];
    const r2 = [0, sy, hz];
    quad([hx, 0, hz], [hx, 0, -hz], r1, r2);
    quad([-hx, 0, -hz], [-hx, 0, hz], r2, r1);
    tri([-hx, 0, hz], [hx, 0, hz], r2);
    tri([hx, 0, -hz], [-hx, 0, -hz], r1);
    quad([-hx, 0, hz], [-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** Tronco de pirámide: base sx × sz, cima tx × tz, alto sy. */
function tronco(sx: number, sy: number, sz: number, tx: number, tz: number): THREE.BufferGeometry {
  const b = [
    [-sx / 2, 0, -sz / 2],
    [sx / 2, 0, -sz / 2],
    [sx / 2, 0, sz / 2],
    [-sx / 2, 0, sz / 2],
  ];
  const c = [
    [-tx / 2, sy, -tz / 2],
    [tx / 2, sy, -tz / 2],
    [tx / 2, sy, tz / 2],
    [-tx / 2, sy, tz / 2],
  ];
  const v: number[] = [];
  const quad = (p: number[], q: number[], r: number[], s: number[]) => v.push(...p, ...q, ...r, ...p, ...r, ...s);
  quad(b[3], b[2], c[2], c[3]);
  quad(b[2], b[1], c[1], c[2]);
  quad(b[1], b[0], c[0], c[1]);
  quad(b[0], b[3], c[3], c[0]);
  quad(c[3], c[2], c[1], c[0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

const cacheCil = new Map<string, THREE.BufferGeometry>();
function cilindro(r: number, r2: number, lados: number): THREE.BufferGeometry {
  const clave = `${lados}:${(r2 / r).toFixed(3)}`;
  let g = cacheCil.get(clave);
  if (!g) {
    g = new THREE.CylinderGeometry(r2 / r, 1, 1, lados, 1);
    g.translate(0, 0.5, 0);
    cacheCil.set(clave, g);
  }
  return g;
}
const cacheCono = new Map<number, THREE.BufferGeometry>();
function cono(lados: number): THREE.BufferGeometry {
  let g = cacheCono.get(lados);
  if (!g) {
    g = new THREE.ConeGeometry(1, 1, lados, 1);
    g.translate(0, 0.5, 0);
    cacheCono.set(lados, g);
  }
  return g;
}
const ESFERA = new THREE.IcosahedronGeometry(1, 1);

// ------------------------------------------------------------------------------------------------ el mundo entero
const LISO: Partial<Record<Material, number>> = { vidrio: 1, agua: 1, metal: 0.6 };

export function geometriaDelMundo(mundo: Mundo, colores: Record<Material, string>): THREE.BufferGeometry {
  const a = nuevoAcumulador();
  const color = (m: Material, v: number) => {
    _c.set(colores[m]);
    const hsl = { h: 0, s: 0, l: 0 };
    _c.getHSL(hsl);
    _c.setHSL(hsl.h + v * 0.008, THREE.MathUtils.clamp(hsl.s + v * 0.03, 0, 1), THREE.MathUtils.clamp(hsl.l + v * 0.05, 0, 1));
    return _c.clone();
  };
  mundo.piezas.forEach((p: Pieza, q) => {
    const gr = mundo.grupos[p.g];
    const siempre = gr.tipo === 'suelo' || gr.orden <= 0;
    const orden = siempre ? -1 : gr.orden;
    const base = gr.base;
    const brillo = p.m === 'fuego' ? 2 : p.m === 'ventana' ? (hash(q, 3.7) < 0.62 ? 1 : 0) : 0;
    const liso = LISO[p.m] ?? 0;
    const ao = gr.tipo === 'suelo' || p.m === 'ventana' || p.m === 'fuego' ? null : gr.base;
    const c = color(p.m, p.v ?? 0);
    const viento = p.viento ? 1 : 0;
    const altoViento = gr.tipo === 'arbol' ? 6 : 1.5;
    switch (p.k) {
      case 'caja': {
        if (p.bisel && Math.min(p.sx, p.sy, p.sz) > 0.6) {
          const r = Math.min(0.35, Math.min(p.sx, p.sy, p.sz) * 0.1);
          const g = new RoundedBoxGeometry(p.sx, p.sy, p.sz, 1, r);
          anadir(a, g, [p.x, p.y + p.sy / 2, p.z], [1, 1, 1], c, orden, base, viento, brillo, liso, ao, altoViento);
          g.dispose();
        } else anadir(a, UNIDAD_CAJA, [p.x, p.y + p.sy / 2, p.z], [p.sx, p.sy, p.sz], c, orden, base, viento, brillo, liso, ao, altoViento);
        break;
      }
      case 'tejado': {
        const g = tejado(p.sx, p.sy, p.sz, p.eje);
        anadir(a, g, [p.x, p.y, p.z], [1, 1, 1], c, orden, base, viento, brillo, liso, ao, altoViento);
        g.dispose();
        break;
      }
      case 'tronco': {
        const g = tronco(p.sx, p.sy, p.sz, p.tx, p.tz);
        anadir(a, g, [p.x, p.y, p.z], [1, 1, 1], c, orden, base, viento, brillo, liso, ao, altoViento);
        g.dispose();
        break;
      }
      case 'cilindro':
        anadir(a, cilindro(p.r, p.r2 ?? p.r, p.lados ?? 10), [p.x, p.y, p.z], [p.r, p.sy, p.r], c, orden, base, viento, brillo, liso, ao, altoViento);
        break;
      case 'cono':
        anadir(a, cono(p.lados ?? 10), [p.x, p.y, p.z], [p.r, p.sy, p.r], c, orden, base, viento, brillo, liso, ao, altoViento);
        break;
      case 'esfera':
        anadir(a, ESFERA, [p.x, p.y, p.z], [p.r, p.r * (p.sy ?? 1), p.r], c, orden, base, viento, brillo, liso, ao, altoViento);
        break;
    }
  });
  return aGeometria(a);
}

// ------------------------------------------------------------------------------------------------ materiales
export interface UniformesMundo {
  uCiudad: { value: number };
  uTiempo: { value: number };
  uNoche: { value: number };
}

const VERTICE_PARS = /* glsl */ `
attribute vec2 aCrece;
attribute vec3 aExtra;
uniform float uCiudad;
uniform float uTiempo;
varying float vBrillo;
varying float vLiso;
float crecer(float orden) {
  if (orden < 0.0) return 1.0;
  float g = clamp((uCiudad - orden) / 0.045, 0.0, 1.0);
  float c1 = 1.4;
  float c3 = c1 + 1.0;
  return 1.0 + c3 * pow(g - 1.0, 3.0) + c1 * pow(g - 1.0, 2.0);
}
`;

const VERTICE_CUERPO = /* glsl */ `
vec3 transformed = vec3(position);
float g = crecer(aCrece.x);
transformed.y = g < 0.002 ? aCrece.y - 0.6 : aCrece.y + (transformed.y - aCrece.y) * g;
float w = aExtra.x;
transformed.x += sin(uTiempo * 1.6 + position.x * 0.31 + position.z * 0.17) * 0.16 * w;
transformed.z += cos(uTiempo * 1.25 + position.z * 0.27 + position.x * 0.11) * 0.12 * w;
vBrillo = aExtra.y;
vLiso = aExtra.z;
`;

/** El material de la maqueta: estándar con colores por vértice, más crecer, viento y luces de noche. */
export function materialMundo(u: UniformesMundo): { material: THREE.MeshStandardMaterial; profundidad: THREE.MeshDepthMaterial } {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, envMapIntensity: 0.7 });
  material.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\n${VERTICE_PARS}`).replace('#include <begin_vertex>', VERTICE_CUERPO);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNoche;\nvarying float vBrillo;\nvarying float vLiso;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.2, vLiso);')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float ventana = step(0.5, vBrillo) * (1.0 - step(1.5, vBrillo));
float fuego = step(1.5, vBrillo);
totalEmissiveRadiance += ventana * uNoche * vec3(1.0, 0.66, 0.32) * 2.6 + fuego * vec3(1.0, 0.45, 0.12) * (1.6 + 2.2 * uNoche);`,
      );
  };
  material.customProgramCacheKey = () => 'maqueta-mundo';
  const profundidad = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  profundidad.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\n${VERTICE_PARS}`).replace('#include <begin_vertex>', VERTICE_CUERPO);
  };
  profundidad.customProgramCacheKey = () => 'maqueta-profundidad';
  return { material, profundidad };
}

/** El agua: casi espejo del cielo, con ondas que se mueven. */
export function materialAgua(color: string, u: UniformesMundo): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0, envMapIntensity: 1.0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundoAgua;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMundoAgua = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTiempo;\nvarying vec3 vMundoAgua;').replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
vec2 pa = vMundoAgua.xz;
float dx = cos(pa.x * 0.31 + uTiempo * 1.3) * 0.5 + cos((pa.x + pa.y) * 0.83 + uTiempo * 2.1) * 0.35 + cos(pa.x * 2.1 - uTiempo * 3.0) * 0.12;
float dz = cos(pa.y * 0.37 - uTiempo * 1.1) * 0.5 + cos((pa.x - pa.y) * 0.71 + uTiempo * 1.7) * 0.35 + cos(pa.y * 2.3 + uTiempo * 2.6) * 0.12;
normal = normalize(normal + (viewMatrix * vec4(dx, 0.0, dz, 0.0)).xyz * 0.07);`,
    );
  };
  m.customProgramCacheKey = () => 'maqueta-agua';
  return m;
}
