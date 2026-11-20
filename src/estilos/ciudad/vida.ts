// Lo que se mueve en la maqueta, todo con mallas instanciadas (una llamada de dibujo por tipo) y todo función pura del
// segundo t: gente que pasea y se para, barcas y veleros, coches por las avenidas, pájaros en bandada, humo de las
// chimeneas y hogueras, aspas de molino y el halo de las luces de noche.

import * as THREE from 'three';
import { hash } from '../_mundo/azar.ts';
import type { Material, Mundo, Punto3 } from '../_mundo/tipos.ts';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const ARRIBA = new THREE.Vector3(0, 1, 0);
/** Copos de humo por chimenea. */
const PUFS = 6;

function poner(malla: THREE.InstancedMesh, i: number, x: number, y: number, z: number, giro: number, escala: number, ladeo = 0, sy = 1): void {
  _p.set(x, y, z);
  _e.set(0, giro, ladeo);
  _q.setFromEuler(_e);
  _s.set(escala, escala * sy, escala);
  _m.compose(_p, _q, _s);
  malla.setMatrixAt(i, _m);
}

function ocultar(malla: THREE.InstancedMesh, i: number): void {
  _m.makeScale(0, 0, 0);
  malla.setMatrixAt(i, _m);
}

interface Caminante {
  a: Punto3;
  b: Punto3;
  lado: number;
  v: number;
  pausa: number;
  fase: number;
  umbral: number;
}

interface Carril {
  a: THREE.Vector3;
  dir: THREE.Vector3;
  largo: number;
}

interface Barca {
  ruta: number;
  fase: number;
  velero: boolean;
  /** Si va y viene por un tramo (canal, río) o está amarrada. */
  tramo: { a: Punto3; b: Punto3 } | null;
}

export interface OpcionesVida {
  colores: Record<Material, string>;
  densidad: number;
  antigua: boolean;
}

export class Vida {
  readonly grupo = new THREE.Group();
  private cuerpos: THREE.InstancedMesh;
  private cabezas: THREE.InstancedMesh;
  private cascos: THREE.InstancedMesh;
  private velas: THREE.InstancedMesh;
  private coches: THREE.InstancedMesh;
  private pajaros: THREE.InstancedMesh;
  private humo: THREE.Points;
  private humoMat: THREE.ShaderMaterial;
  private halos: THREE.Points;
  private aspas: THREE.Group[] = [];
  private caminantes: Caminante[] = [];
  private carriles: Array<Carril & { coches: number[] }> = [];
  private barcas: Barca[] = [];
  private humos: Punto3[];
  private haloMat: THREE.PointsMaterial;
  private mundo: Mundo;

  constructor(m: Mundo, op: OpcionesVida, materialBase: THREE.Material) {
    this.mundo = m;
    // --- gente: hasta tres por tramo, más los remeros
    const tramosPersona = m.tramos.filter((t) => t.tipo === 'persona');
    const porTramo = op.densidad;
    tramosPersona.forEach((t, k) => {
      const n = Math.floor(porTramo + hash(k, 1.3) * 0.999);
      for (let q = 0; q < n; q++)
        this.caminantes.push({ a: t.a, b: t.b, lado: (hash(k, q, 2.1) - 0.5) * 2.2, v: 1.0 + hash(k, q, 3.3) * 0.6, pausa: 0.8 + hash(k, q, 4.4) * 3.2, fase: hash(k, q, 5.5) * 30, umbral: hash(k, q, 6.6) });
    });
    if (this.caminantes.length > 1600) this.caminantes = this.caminantes.filter((_, i) => hash(i, 9.1) < 1600 / this.caminantes.length);
    // --- barcas
    m.rutas.forEach((r, ri) => {
      const cuantas = Math.max(2, Math.round((r.tipo === 'velero' ? 3 : 5) * op.densidad));
      for (let q = 0; q < cuantas; q++) this.barcas.push({ ruta: ri, fase: q / cuantas + hash(ri, q) * 0.08, velero: r.tipo === 'velero', tramo: null });
    });
    m.tramos.filter((t) => t.tipo === 'barca').forEach((t, k) => this.barcas.push({ ruta: -1, fase: hash(k, 7.7) * 20, velero: m.tipo === 'puerto' && hash(k, 8.8) < 0.5, tramo: { a: t.a, b: t.b } }));
    // --- coches: carriles largos uniendo los tramos seguidos (saltando cruces)
    const tramosCoche = m.tramos.filter((t) => t.tipo === 'coche');
    const claves = new Map<string, Array<{ a: THREE.Vector3; b: THREE.Vector3 }>>();
    for (const t of tramosCoche) {
      const a = new THREE.Vector3(...t.a);
      const b = new THREE.Vector3(...t.b);
      const d = b.clone().sub(a).normalize();
      const clave = Math.abs(d.x) > 0.5 ? `x${Math.sign(d.x)}:${a.z.toFixed(1)}` : `z${Math.sign(d.z)}:${a.x.toFixed(1)}`;
      if (!claves.has(clave)) claves.set(clave, []);
      claves.get(clave)!.push({ a, b });
    }
    for (const lista of claves.values()) {
      const d = lista[0].b.clone().sub(lista[0].a).normalize();
      lista.sort((p, q) => p.a.dot(d) - q.a.dot(d));
      let actual = { a: lista[0].a.clone(), b: lista[0].b.clone() };
      const cerrar = () => {
        const largo = actual.b.distanceTo(actual.a);
        if (largo > 20) {
          const n = Math.max(1, Math.round((largo / 34) * op.densidad));
          this.carriles.push({ a: actual.a, dir: d.clone(), largo, coches: Array.from({ length: n }, (_, q) => (q + hash(largo, q) * 0.5) / n) });
        }
      };
      for (let k = 1; k < lista.length; k++) {
        if (lista[k].a.distanceTo(actual.b) <= m.celda + 0.5) actual.b = lista[k].b.clone();
        else {
          cerrar();
          actual = { a: lista[k].a.clone(), b: lista[k].b.clone() };
        }
      }
      cerrar();
    }
    const nCoches = this.carriles.reduce((s, c) => s + c.coches.length, 0);

    // --- mallas
    const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
    const nPersonas = this.caminantes.length + this.barcas.length;
    const cuerpoGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 7).translate(0, 0.6, 0);
    this.cuerpos = new THREE.InstancedMesh(cuerpoGeo, mat('#FFFFFF'), Math.max(1, nPersonas));
    this.cabezas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 1).translate(0, 1.42, 0), mat('#FFFFFF'), Math.max(1, nPersonas));
    const ropa = op.antigua ? ['#F2EDE0', '#E8E1CF', '#C8463A', '#3A86A8', '#E3A93A', '#F2EDE0', '#8B5E3C'] : ['#C8463A', '#3A86A8', '#E3A93A', '#2F4A6B', '#F2EDE0', '#5E8C4A', '#8A4F7D', '#D97A3A'];
    const pieles = ['#E2B391', '#C68E66', '#9C6A48', '#7A4E34', '#D9A07A'];
    const c = new THREE.Color();
    for (let i = 0; i < nPersonas; i++) {
      this.cuerpos.setColorAt(i, c.set(ropa[Math.floor(hash(i, 1.1) * ropa.length)]));
      this.cabezas.setColorAt(i, c.set(op.antigua && hash(i, 2.7) < 0.5 ? '#2B2220' : pieles[Math.floor(hash(i, 2.2) * pieles.length)]));
    }
    const cascoGeo = new THREE.CylinderGeometry(0.55, 0.38, 0.55, 6, 1).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).scale(1, 1, 1).translate(0, 0.2, 0);
    cascoGeo.scale(1, 1, 3.4 / 0.55);
    this.cascos = new THREE.InstancedMesh(cascoGeo, mat(op.colores.madera), Math.max(1, this.barcas.length));
    const vela = new THREE.BufferGeometry();
    vela.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, -1.2, 0, 6.5, 0.2, 0, 0.6, 1.8, 0, 0.6, 1.8, 0, 6.5, 0.2, 0, 0.6, -1.2], 3));
    vela.computeVertexNormals();
    const mastil = new THREE.CylinderGeometry(0.07, 0.09, 6.4, 5).translate(0, 3.6, 0.2);
    const velaGeo = mergeSimple([vela, mastil]);
    this.velas = new THREE.InstancedMesh(velaGeo, mat('#F4EFE4', { side: THREE.DoubleSide }), Math.max(1, this.barcas.length));
    const coche = mergeSimple([new THREE.BoxGeometry(1.8, 0.75, 4.1).translate(0, 0.55, 0), new THREE.BoxGeometry(1.55, 0.6, 2.2).translate(0, 1.2, -0.2)]);
    this.coches = new THREE.InstancedMesh(coche, mat('#FFFFFF', { roughness: 0.45 }), Math.max(1, nCoches));
    const coloresCoche = ['#D9483B', '#F2EDE0', '#3A6EA8', '#2B2D33', '#E3B13A', '#8FA3B5', '#4E8A5C'];
    for (let i = 0; i < nCoches; i++) this.coches.setColorAt(i, c.set(coloresCoche[Math.floor(hash(i, 4.2) * coloresCoche.length)]));
    const ala = new THREE.BufferGeometry();
    ala.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -1.1, 0.35, -0.1, 0, 0, -0.35, 0, 0, 0.3, 0, 0, -0.35, 1.1, 0.35, -0.1], 3));
    ala.computeVertexNormals();
    this.pajaros = new THREE.InstancedMesh(ala, mat('#3A3632', { side: THREE.DoubleSide }), 26);
    const maxHumos = Math.round(40 * op.densidad);
    this.humos = m.humos.length > maxHumos ? m.humos.filter((_, i) => hash(i, 3.9) < maxHumos / m.humos.length) : [...m.humos];
    // el humo: copos blandos (puntos con un disco difuso dibujado en el shader) que suben, crecen y se desvanecen
    const nHumo = Math.max(1, this.humos.length * PUFS);
    const humoGeo = new THREE.BufferGeometry();
    humoGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(nHumo * 3), 3));
    humoGeo.setAttribute('aTam', new THREE.Float32BufferAttribute(new Float32Array(nHumo), 1));
    humoGeo.setAttribute('aAlfa', new THREE.Float32BufferAttribute(new Float32Array(nHumo), 1));
    this.humoMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#F1EEE8') }, uEscala: { value: 2200 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aTam;
        attribute float aAlfa;
        varying float vAlfa;
        uniform float uEscala;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aTam * uEscala / max(1.0, -mv.z);
          vAlfa = aAlfa;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlfa;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.15, d) * vAlfa;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    this.humo = new THREE.Points(humoGeo, this.humoMat);
    this.humo.frustumCulled = false;
    this.humo.renderOrder = 2;
    this.grupo.add(this.humo);
    for (const mi of [this.cuerpos, this.cabezas, this.cascos, this.velas, this.coches, this.pajaros]) {
      mi.castShadow = mi !== this.pajaros;
      mi.receiveShadow = true;
      mi.frustumCulled = false;
      mi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.grupo.add(mi);
    }
    // --- aspas de molino
    for (const a of m.aspas) {
      const g = new THREE.Group();
      g.position.set(a.x, a.y, a.z);
      const madera = mat(op.colores.madera);
      const lona = mat('#F1ECDF');
      for (let k = 0; k < 4; k++) {
        const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.22, a.r, 0.18).translate(0, a.r / 2, 0), madera);
        const tela = new THREE.Mesh(new THREE.BoxGeometry(1.4, a.r * 0.78, 0.06).translate(0.75, a.r * 0.55, 0), lona);
        const brazoG = new THREE.Group();
        brazoG.add(brazo, tela);
        brazoG.rotation.z = (k * Math.PI) / 2;
        for (const x of [brazo, tela]) x.castShadow = true;
        g.add(brazoG);
      }
      this.aspas.push(g);
      this.grupo.add(g);
    }
    void materialBase;
    // --- halos de las luces de noche
    const halo = new THREE.BufferGeometry();
    const puntos = [...m.luces];
    halo.setAttribute('position', new THREE.Float32BufferAttribute(puntos.flat(), 3));
    this.haloMat = new THREE.PointsMaterial({ size: 9, map: texturaHalo(), color: '#FFB866', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, sizeAttenuation: true, fog: false });
    this.halos = new THREE.Points(halo, this.haloMat);
    this.halos.frustumCulled = false;
    this.grupo.add(this.halos);
  }

  actualizar(t: number, ciudad: number, noche: number, centroPajaros: THREE.Vector3): void {
    const m = this.mundo;
    // gente
    let i = 0;
    for (const w of this.caminantes) {
      if (w.umbral > ciudad * 1.05) {
        ocultar(this.cuerpos, i);
        ocultar(this.cabezas, i);
        i++;
        continue;
      }
      const dx = w.b[0] - w.a[0];
      const dz = w.b[2] - w.a[2];
      const largo = Math.max(0.01, Math.hypot(dx, dz));
      const ida = largo / w.v;
      const T = 2 * (ida + w.pausa);
      const s = (((t + w.fase) % T) + T) % T;
      let f: number;
      let dir = 1;
      let anda = true;
      if (s < ida) f = s / ida;
      else if (s < ida + w.pausa) {
        f = 1;
        anda = false;
      } else if (s < 2 * ida + w.pausa) {
        f = 1 - (s - ida - w.pausa) / ida;
        dir = -1;
      } else {
        f = 0;
        anda = false;
        dir = -1;
      }
      const nx = -dz / largo;
      const nz = dx / largo;
      const x = w.a[0] + dx * f + nx * w.lado;
      const z = w.a[2] + dz * f + nz * w.lado;
      const y = w.a[1] + (w.b[1] - w.a[1]) * f + (anda ? Math.abs(Math.sin((t + w.fase) * 8.5)) * 0.08 : 0);
      const giro = Math.atan2(dx * dir, dz * dir);
      const balanceo = anda ? Math.sin((t + w.fase) * 8.5) * 0.06 : 0;
      poner(this.cuerpos, i, x, y, z, giro, 1, balanceo);
      poner(this.cabezas, i, x, y, z, giro, 1, balanceo);
      i++;
    }
    // barcas y remeros
    this.barcas.forEach((b, k) => {
      let x: number;
      let z: number;
      let giro: number;
      if (b.tramo === null) {
        const r = m.rutas[b.ruta];
        const pts = r.puntos;
        const per = pts.length;
        const v = b.velero ? 0.006 : 0.004;
        const s = (((t * v + b.fase) % 1) + 1) % 1;
        const fi = s * per;
        const i0 = Math.floor(fi) % per;
        const i1 = (i0 + 1) % per;
        const fr = fi - Math.floor(fi);
        x = pts[i0][0] + (pts[i1][0] - pts[i0][0]) * fr;
        z = pts[i0][1] + (pts[i1][1] - pts[i0][1]) * fr;
        giro = Math.atan2(pts[i1][0] - pts[i0][0], pts[i1][1] - pts[i0][1]);
      } else {
        const { a, b: fin } = b.tramo;
        const dx = fin[0] - a[0];
        const dz = fin[2] - a[2];
        const largo = Math.hypot(dx, dz);
        if (largo < 0.1) {
          x = a[0];
          z = a[2];
          giro = hash(k, 1.7) * 0.6 - 0.3;
        } else {
          const ida = largo / 1.4;
          const T = 2 * (ida + 3);
          const s = (((t + b.fase) % T) + T) % T;
          const f = s < ida ? s / ida : s < ida + 3 ? 1 : s < 2 * ida + 3 ? 1 - (s - ida - 3) / ida : 0;
          const vuelta = s >= ida + 3 && s < 2 * ida + 6;
          x = a[0] + dx * f;
          z = a[2] + dz * f;
          giro = Math.atan2(dx, dz) + (vuelta ? Math.PI : 0);
        }
      }
      const vaiven = Math.sin(t * 1.7 + k) * 0.05;
      const esc = b.velero ? 1.35 : 0.8;
      poner(this.cascos, k, x, m.nivelAgua - 0.15 + vaiven, z, giro, esc, Math.sin(t * 1.3 + k * 2) * 0.05);
      if (b.velero) poner(this.velas, k, x, m.nivelAgua + vaiven, z, giro, esc * 0.9, Math.sin(t * 1.3 + k * 2) * 0.05);
      else ocultar(this.velas, k);
      const pi = this.caminantes.length + k;
      if (b.velero) {
        ocultar(this.cuerpos, pi);
        ocultar(this.cabezas, pi);
      } else {
        poner(this.cuerpos, pi, x, m.nivelAgua + 0.05 + vaiven, z, giro, 0.85, 0, 0.75);
        poner(this.cabezas, pi, x, m.nivelAgua - 0.25 + vaiven, z, giro, 0.85);
      }
    });
    // coches
    let ci = 0;
    for (const c of this.carriles)
      for (const f0 of c.coches) {
        const v = 9 / c.largo;
        const f = (((t * v + f0) % 1) + 1) % 1;
        const visible = hash(ci, 5.5) < ciudad * 1.1;
        if (!visible) ocultar(this.coches, ci);
        else poner(this.coches, ci, c.a.x + c.dir.x * c.largo * f, c.a.y, c.a.z + c.dir.z * c.largo * f, Math.atan2(c.dir.x, c.dir.z), 1);
        ci++;
      }
    // pájaros: dos bandadas que dan vueltas sobre la ciudad
    for (let k = 0; k < 26; k++) {
      const bandada = k < 13 ? 0 : 1;
      const r = bandada === 0 ? 70 : 110;
      const vel = bandada === 0 ? 0.11 : -0.08;
      const a = t * vel + (k % 13) * 0.045 + bandada * 2;
      const x = centroPajaros.x + Math.cos(a) * r + Math.sin(k * 3.1) * 4;
      const z = centroPajaros.z + Math.sin(a) * r + Math.cos(k * 2.3) * 4;
      const y = (bandada === 0 ? 48 : 62) + Math.sin(t * 0.8 + k) * 2 + (k % 13) * 0.4;
      const giro = Math.atan2(-Math.sin(a) * Math.sign(vel), Math.cos(a) * Math.sign(vel));
      poner(this.pajaros, k, x, y, z, giro, 1.1, 0, Math.cos(t * 11 + k * 1.7));
    }
    // humo: copos que suben, crecen, se inclinan con el viento y se desvanecen
    const posH = this.humo.geometry.getAttribute('position') as THREE.BufferAttribute;
    const tamH = this.humo.geometry.getAttribute('aTam') as THREE.BufferAttribute;
    const alfaH = this.humo.geometry.getAttribute('aAlfa') as THREE.BufferAttribute;
    this.humos.forEach((h, k) => {
      const visible = hash(k, 2.3) < ciudad * 1.1;
      for (let q = 0; q < PUFS; q++) {
        const idx = k * PUFS + q;
        const edad = (((t * 0.16 + q / PUFS + hash(k, 1.9)) % 1) + 1) % 1;
        posH.setXYZ(idx, h[0] + edad * edad * 7 + Math.sin(t * 0.6 + q * 1.7 + k) * 0.6, h[1] + 0.6 + edad * 9, h[2] - edad * edad * 3);
        tamH.setX(idx, 1.4 + edad * 5.5);
        alfaH.setX(idx, visible ? 0.55 * Math.min(1, edad * 6) * Math.pow(1 - edad, 1.4) : 0);
      }
    });
    posH.needsUpdate = true;
    tamH.needsUpdate = true;
    alfaH.needsUpdate = true;
    (this.humoMat.uniforms.uColor.value as THREE.Color).set('#F1EEE8').lerp(new THREE.Color('#4A5266'), noche);
    for (let k = 0; k < this.aspas.length; k++) this.aspas[k].rotation.z = -t * m.aspas[k].giro;
    this.haloMat.opacity = Math.min(1, noche * 1.1);
    for (const mi of [this.cuerpos, this.cabezas, this.cascos, this.velas, this.coches, this.pajaros]) mi.instanceMatrix.needsUpdate = true;
    void ARRIBA;
  }
}

function mergeSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.getAttribute('position');
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

/** Un halo radial dibujado con código (sin imágenes). */
function texturaHalo(): THREE.Texture {
  const n = 64;
  const datos = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
      const a = Math.max(0, 1 - d) ** 2.2;
      const k = (y * n + x) * 4;
      datos[k] = 255;
      datos[k + 1] = 255;
      datos[k + 2] = 255;
      datos[k + 3] = Math.round(a * 255);
    }
  const t = new THREE.DataTexture(datos, n, n, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}
