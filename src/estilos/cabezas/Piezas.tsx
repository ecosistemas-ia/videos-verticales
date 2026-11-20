// El dibujo de las piezas: sombreado de dibujo animado en tres tonos (MeshToonMaterial) y contorno de tinta con la
// técnica del casco invertido. El casco se infla en espacio de pantalla, así que la línea tiene el mismo grosor en
// píxeles cerca y lejos (más fina a lo lejos). Geometrías y materiales se crean una vez y se comparten.

import { memo, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import { TINTA, type Paleta } from './paletas.ts';
import type { Forma, Pieza } from './piezas.ts';

// ── Geometrías ───────────────────────────────────────────────────────────────────────────────────────────────────

const geometrias = new Map<string, THREE.BufferGeometry>();
const contornos = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

function prismaGeometria(largo: number, alto: number, ancho: number): THREE.BufferGeometry {
  const forma = new THREE.Shape();
  forma.moveTo(-ancho / 2, 0);
  forma.lineTo(ancho / 2, 0);
  forma.lineTo(0, alto);
  forma.closePath();
  const g = new THREE.ExtrudeGeometry(forma, { depth: largo, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-largo / 2, 0, 0);
  return g;
}

function crear(f: Forma, m: readonly number[]): THREE.BufferGeometry {
  switch (f) {
    case 'caja':
      return new THREE.BoxGeometry(m[0], m[1], m[2]);
    case 'esfera': {
      const lados = m[1] ?? (m[0] < 0.2 ? 14 : m[0] < 1 ? 20 : 24);
      return new THREE.SphereGeometry(m[0], lados, Math.max(4, Math.round(lados * 0.66)));
    }
    case 'cupula':
      return new THREE.SphereGeometry(m[0], 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    case 'cilindro':
      return new THREE.CylinderGeometry(m[0], m[1], m[2], m[3] ?? 14);
    case 'cono':
      return new THREE.ConeGeometry(m[0], m[1], m[2] ?? 12);
    case 'prisma':
      return prismaGeometria(m[0], m[1], m[2]);
    case 'capsula':
      return new THREE.CapsuleGeometry(m[0], m[1], 4, 14);
    case 'toro':
      return new THREE.TorusGeometry(m[0], m[1], 8, 22);
    case 'roca':
      return new THREE.IcosahedronGeometry(m[0], 0);
  }
}

/** Geometría compartida. «facetado»: normales por cara, para el aspecto de pocos polígonos. */
export function geometria(f: Forma, m: readonly number[], facetado: boolean): THREE.BufferGeometry {
  const clave = `${f}:${m.join(',')}:${facetado ? 'f' : 's'}`;
  let g = geometrias.get(clave);
  if (g === undefined) {
    g = crear(f, m);
    if (facetado && g.index !== null) {
      const sinIndice = g.toNonIndexed();
      g.dispose();
      sinIndice.computeVertexNormals();
      g = sinIndice;
    }
    g.computeBoundingSphere();
    geometrias.set(clave, g);
  }
  return g;
}

/** El casco de la tinta: la misma geometría con los vértices soldados, para que al inflarse no se abra en las aristas. */
export function contorno(g: THREE.BufferGeometry): THREE.BufferGeometry {
  let c = contornos.get(g);
  if (c === undefined) {
    const copia = new THREE.BufferGeometry();
    copia.setAttribute('position', g.getAttribute('position').clone());
    if (g.index !== null) copia.setIndex(g.index.clone());
    c = mergeVertices(copia, 1e-3);
    c.computeVertexNormals();
    c.computeBoundingSphere();
    // El casco ocupa algo más que la pieza: que no lo recorte la cámara antes de tiempo.
    if (c.boundingSphere !== null) c.boundingSphere.radius += 0.05;
    copia.dispose();
    contornos.set(g, c);
  }
  return c;
}

// ── Materiales ───────────────────────────────────────────────────────────────────────────────────────────────────

let gradiente: THREE.DataTexture | null = null;

/** Tres tonos: sombra, medio y luz. Es lo que da el aspecto de dibujo animado. */
function gradienteToon(): THREE.DataTexture {
  if (gradiente === null) {
    gradiente = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
    gradiente.minFilter = THREE.NearestFilter;
    gradiente.magFilter = THREE.NearestFilter;
    gradiente.generateMipmaps = false;
    gradiente.needsUpdate = true;
  }
  return gradiente;
}

const materiales = new Map<string, THREE.MeshToonMaterial>();
/** Materiales con brillo menor que 1: su brillo sigue a la hora (de noche las ventanas se encienden). */
const luminosos: Array<{ material: THREE.MeshToonMaterial; base: number }> = [];

export function materialToon(color: string, brillo = 0): THREE.MeshToonMaterial {
  const clave = `${color}:${brillo}`;
  let m = materiales.get(clave);
  if (m === undefined) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: gradienteToon(),
      emissive: brillo > 0 ? color : '#000000',
      emissiveIntensity: brillo,
    });
    materiales.set(clave, m);
    if (brillo > 0 && brillo < 1) luminosos.push({ material: m, base: brillo });
  }
  return m;
}

/** La cabeza y las manos: blancas, con un poco de luz propia para que no se vuelvan grises en la sombra. */
export function materialCabeza(): THREE.MeshToonMaterial {
  let m = materiales.get('cabeza');
  if (m === undefined) {
    m = new THREE.MeshToonMaterial({ color: '#FFFFFF', gradientMap: gradienteToon(), emissive: '#FFF4E8', emissiveIntensity: 0.16 });
    materiales.set('cabeza', m);
  }
  return m;
}

export function ajustarBrillo(factor: number): void {
  for (const l of luminosos) l.material.emissiveIntensity = l.base * factor;
}

const VERTICE_TINTA = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  uniform float grosor;
  uniform vec2 resolucion;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 clip = projectionMatrix * mvPosition;
    vec3 n = normalize(normalMatrix * normal);
    vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy;
    float largo = length(dir);
    dir = largo > 1e-5 ? dir / largo : vec2(0.0);
    float px = grosor * clamp(14.0 / max(clip.w, 0.001), 0.45, 1.0);
    clip.xy += dir * px * 4.0 / resolucion * clip.w;
    gl_Position = clip;
    #include <fog_vertex>
  }
`;

const FRAGMENTO_TINTA = /* glsl */ `
  uniform vec3 color;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

const tintas = new Map<number, THREE.ShaderMaterial>();

export function materialTinta(grosor: number): THREE.ShaderMaterial {
  let m = tintas.get(grosor);
  if (m === undefined) {
    m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { color: { value: new THREE.Color(TINTA) }, grosor: { value: grosor }, resolucion: { value: new THREE.Vector2(ANCHO, ALTO) } },
      ]),
      vertexShader: VERTICE_TINTA,
      fragmentShader: FRAGMENTO_TINTA,
      side: THREE.BackSide,
      fog: true,
    });
    tintas.set(grosor, m);
  }
  return m;
}

// ── Colores ──────────────────────────────────────────────────────────────────────────────────────────────────────

export type ResolverColor = (c: string) => string;

export function resolverColor(paleta: Paleta, acento: string): ResolverColor {
  return (c) => {
    if (c.startsWith('#')) return c;
    if (c === 'acento') return acento;
    return (paleta as unknown as Record<string, string>)[c] ?? '#FF00FF';
  };
}

export const tal: ResolverColor = (c) => c;

// ── Componentes ──────────────────────────────────────────────────────────────────────────────────────────────────

export function PiezaVista({ pieza: p, color }: { pieza: Pieza; color: ResolverColor }): ReactNode {
  const facetado = p.liso !== true && (p.f === 'esfera' || p.f === 'roca');
  const geo = geometria(p.f, p.m, facetado);
  const mat = materialToon(color(p.c), p.brillo ?? 0);
  const g = p.g ?? 3;
  const r = p.r ?? [0, 0, 0];
  const s = p.s ?? [1, 1, 1];
  return (
    <group position={[p.p[0], p.p[1], p.p[2]]} rotation={[r[0], r[1], r[2], 'YXZ']} scale={[s[0], s[1], s[2]]}>
      <mesh geometry={geo} material={mat} castShadow={p.sombra !== false} receiveShadow />
      {g > 0 && <mesh geometry={contorno(geo)} material={materialTinta(g)} />}
    </group>
  );
}

/** Una lista de piezas quietas: memo, para que no se vuelva a dibujar el árbol de React en cada fotograma. */
export const ListaPiezas = memo(function ListaPiezas({ piezas, color }: { piezas: readonly Pieza[]; color: ResolverColor }): ReactNode {
  return (
    <>
      {piezas.map((p, i) => (
        <PiezaVista key={i} pieza={p} color={color} />
      ))}
    </>
  );
});
