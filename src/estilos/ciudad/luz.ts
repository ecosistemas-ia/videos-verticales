// La luz de la maqueta en tiempo real (sin luz cocida en Blender): un sol con sombras suaves, la luz del cielo
// (hemisferio y un mapa de entorno hecho con el mismo cielo), neblina del color del horizonte y un cielo en degradado con
// el halo del sol y estrellas de noche. Cinco momentos del día que se mezclan entre sí, y el clima encima.

import * as THREE from 'three';
import type { Clima, EstadoMundo, Luz } from '../_mundo/esquemas.ts';

interface Preset {
  az: number;
  elev: number;
  sol: string;
  intSol: number;
  hemiCielo: string;
  hemiSuelo: string;
  intHemi: number;
  arriba: string;
  horizonte: string;
  niebla: string;
  /** Cuánto se ve a lo lejos (1 = día claro). */
  vista: number;
  noche: number;
  entorno: number;
  exposicion: number;
}

const PRESETS: Record<Luz, Preset> = {
  manana: { az: 120, elev: 30, sol: '#FFE2BC', intSol: 3.1, hemiCielo: '#CFE0F2', hemiSuelo: '#B59A78', intHemi: 0.85, arriba: '#6AA4DE', horizonte: '#EDEFE9', niebla: '#C9D5DF', vista: 1, noche: 0, entorno: 0.55, exposicion: 1.0 },
  mediodia: { az: 165, elev: 56, sol: '#FFF3E0', intSol: 3.4, hemiCielo: '#D3E4F6', hemiSuelo: '#B9A688', intHemi: 0.85, arriba: '#5B9BDC', horizonte: '#E3EDF3', niebla: '#C6D6E3', vista: 1.1, noche: 0, entorno: 0.6, exposicion: 0.98 },
  tarde: { az: 235, elev: 32, sol: '#FFD6A0', intSol: 3.2, hemiCielo: '#D7DCE8', hemiSuelo: '#B99A72', intHemi: 0.8, arriba: '#77A5D8', horizonte: '#F4E2C4', niebla: '#D3CEC8', vista: 1, noche: 0, entorno: 0.5, exposicion: 1.0 },
  atardecer: { az: 252, elev: 9, sol: '#FF9A55', intSol: 2.7, hemiCielo: '#A2A8CA', hemiSuelo: '#A06E55', intHemi: 0.65, arriba: '#4C5C96', horizonte: '#F49A64', niebla: '#E6A27E', vista: 0.85, noche: 0.25, entorno: 0.35, exposicion: 1.08 },
  noche: { az: 200, elev: 42, sol: '#A3B8FF', intSol: 0.6, hemiCielo: '#40548A', hemiSuelo: '#1D202C', intHemi: 0.55, arriba: '#081230', horizonte: '#1E2C50', niebla: '#192340', vista: 0.7, noche: 1, entorno: 0.14, exposicion: 1.25 },
};

export interface LuzMezclada {
  dirSol: THREE.Vector3;
  sol: THREE.Color;
  intSol: number;
  hemiCielo: THREE.Color;
  hemiSuelo: THREE.Color;
  intHemi: number;
  arriba: THREE.Color;
  horizonte: THREE.Color;
  niebla: THREE.Color;
  vista: number;
  noche: number;
  entorno: number;
  exposicion: number;
  lluvia: number;
}

const col = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), k);
const num = (a: number, b: number, k: number) => a + (b - a) * k;

function angulo(a: number, b: number, k: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * k;
}

function mezclar(de: Luz, a: Luz, k: number): LuzMezclada {
  const p = PRESETS[de];
  const q = PRESETS[a];
  const az = THREE.MathUtils.degToRad(angulo(p.az, q.az, k));
  const el = THREE.MathUtils.degToRad(num(p.elev, q.elev, k));
  return {
    dirSol: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize(),
    sol: col(p.sol, q.sol, k),
    intSol: num(p.intSol, q.intSol, k),
    hemiCielo: col(p.hemiCielo, q.hemiCielo, k),
    hemiSuelo: col(p.hemiSuelo, q.hemiSuelo, k),
    intHemi: num(p.intHemi, q.intHemi, k),
    arriba: col(p.arriba, q.arriba, k),
    horizonte: col(p.horizonte, q.horizonte, k),
    niebla: col(p.niebla, q.niebla, k),
    vista: num(p.vista, q.vista, k),
    noche: num(p.noche, q.noche, k),
    entorno: num(p.entorno, q.entorno, k),
    exposicion: num(p.exposicion, q.exposicion, k),
    lluvia: 0,
  };
}

function aplicarClima(l: LuzMezclada, c: Clima, k: number): void {
  if (c === 'despejado' || k <= 0) return;
  const gris = new THREE.Color(l.noche > 0.5 ? '#2A3040' : '#A9B0B6');
  if (c === 'lluvia') {
    l.intSol *= 1 - 0.7 * k;
    l.intHemi *= 1 + 0.15 * k;
    l.arriba.lerp(new THREE.Color(l.noche > 0.5 ? '#151A26' : '#7C8792'), 0.85 * k);
    l.horizonte.lerp(gris, 0.85 * k);
    l.niebla.lerp(gris, 0.85 * k);
    l.vista *= 1 - 0.45 * k;
    l.lluvia = k;
  } else {
    l.intSol *= 1 - 0.45 * k;
    l.horizonte.lerp(gris, 0.7 * k);
    l.niebla.lerp(new THREE.Color(l.noche > 0.5 ? '#2C3346' : '#D9DBD8'), 0.85 * k);
    l.vista *= 1 - 0.68 * k;
  }
}

export function luzEn(e: EstadoMundo): LuzMezclada {
  const l = mezclar(e.luz.de, e.luz.a, e.luz.k);
  // el clima: lo de antes se va, lo nuevo llega
  if (e.clima.de !== 'despejado') aplicarClima(l, e.clima.de, 1 - e.clima.k);
  if (e.clima.a !== 'despejado') aplicarClima(l, e.clima.a, e.clima.k);
  return l;
}

/** El cielo: degradado del horizonte al cénit, halo del sol y estrellas de noche. */
export function crearCielo(): { malla: THREE.Mesh; uniformes: Record<string, THREE.IUniform> } {
  const uniformes: Record<string, THREE.IUniform> = {
    uArriba: { value: new THREE.Color('#78A9DC') },
    uHorizonte: { value: new THREE.Color('#F1E3CC') },
    uSolDir: { value: new THREE.Vector3(0, 1, 0) },
    uSol: { value: new THREE.Color('#FFE2BC') },
    uNoche: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: uniformes,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
        vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uArriba;
      uniform vec3 uHorizonte;
      uniform vec3 uSolDir;
      uniform vec3 uSol;
      uniform float uNoche;
      varying vec3 vDir;
      float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float t = pow(clamp(d.y, 0.0, 1.0), 0.55);
        vec3 c = mix(uHorizonte, uArriba, t);
        float s = max(dot(d, normalize(uSolDir)), 0.0);
        c += uSol * (pow(s, 7.0) * 0.28 + pow(s, 90.0) * 0.6) * (1.0 - uNoche * 0.7);
        vec3 q = floor(d * 380.0);
        float estrella = step(0.998, h(q)) * smoothstep(0.05, 0.3, d.y);
        c += vec3(0.9, 0.95, 1.0) * estrella * uNoche * 0.45;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const malla = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material);
  malla.scale.setScalar(5000);
  malla.frustumCulled = false;
  malla.renderOrder = -10;
  return { malla, uniformes };
}

/** Un mapa de entorno con el cielo de día, para el brillo suave de todo (y los reflejos del agua). */
export function crearEntorno(gl: THREE.WebGLRenderer): THREE.Texture {
  const escena = new THREE.Scene();
  const { malla, uniformes } = crearCielo();
  uniformes.uSolDir.value = new THREE.Vector3(0.4, 0.5, 0.6).normalize();
  escena.add(malla);
  // un suelo cálido debajo: la luz que rebota de la tierra
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(4000, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#B49C7C' }));
  suelo.position.y = -1;
  escena.add(suelo);
  const pmrem = new THREE.PMREMGenerator(gl);
  const rt = pmrem.fromScene(escena, 0.02, 1, 6000);
  pmrem.dispose();
  return rt.texture;
}
