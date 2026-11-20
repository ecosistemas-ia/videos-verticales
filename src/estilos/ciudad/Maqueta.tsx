// La maqueta 3D dentro del lienzo de @remotion/three: se construye UNA vez por pestaña del render (mundo, terreno,
// campiña, agua, cielo, luces, vida) y en cada fotograma solo se actualizan uniformes, instancias, luz y cámara, y se
// dibuja con el posproceso propio. El render automático de react-three-fiber queda apagado (useFrame con prioridad 1).

import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import type { EstadoMundo } from '../_mundo/esquemas.ts';
import type { Material, Mundo } from '../_mundo/tipos.ts';
import type { Toma } from './camara.ts';
import { geometriaDelMundo, materialAgua, materialMundo, type UniformesMundo } from './geometria.ts';
import { crearCielo, crearEntorno, luzEn } from './luz.ts';
import { Post } from './post.ts';
import type { Terreno } from './terreno.ts';
import { Vida } from './vida.ts';

interface Montaje {
  dibujar: (t: number, estado: EstadoMundo, toma: Toma) => void;
}

function montar(gl: THREE.WebGLRenderer, mundo: Mundo, terreno: Terreno, colores: Record<Material, string>, densidad: number, ancho: number, alto: number): Montaje {
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFShadowMap;
  gl.toneMapping = THREE.AgXToneMapping;
  gl.toneMappingExposure = 1.0;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.setPixelRatio(1);

  const escena = new THREE.Scene();
  const u: UniformesMundo = { uCiudad: { value: 1 }, uTiempo: { value: 0 }, uNoche: { value: 0 } };
  const { material, profundidad } = materialMundo(u);

  const ciudad = new THREE.Mesh(geometriaDelMundo(mundo, colores), material);
  ciudad.castShadow = true;
  ciudad.receiveShadow = true;
  ciudad.customDepthMaterial = profundidad;
  ciudad.frustumCulled = false;
  escena.add(ciudad);

  const suelo = new THREE.Mesh(terreno.geometria, material);
  suelo.receiveShadow = true;
  suelo.frustumCulled = false;
  escena.add(suelo);

  const campina = new THREE.Mesh(geometriaDelMundo({ ...mundo, piezas: terreno.campina.piezas, grupos: terreno.campina.grupos }, colores), material);
  campina.castShadow = true;
  campina.receiveShadow = true;
  campina.customDepthMaterial = profundidad;
  campina.frustumCulled = false;
  escena.add(campina);

  const agua = new THREE.Mesh(new THREE.PlaneGeometry(terreno.extension * 2.2, terreno.extension * 2.2).rotateX(-Math.PI / 2), materialAgua(colores.agua, u));
  agua.position.y = mundo.nivelAgua;
  agua.receiveShadow = true;
  escena.add(agua);

  const cielo = crearCielo();
  escena.add(cielo.malla);
  escena.environment = crearEntorno(gl);

  const sol = new THREE.DirectionalLight('#FFFFFF', 3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(4096, 4096);
  const L = mundo.lado / 2 + 30;
  const sc = sol.shadow.camera;
  sc.left = -L * 1.15;
  sc.right = L * 1.15;
  sc.top = L * 1.15;
  sc.bottom = -L * 1.15;
  sc.near = 10;
  sc.far = 1800;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.12;
  sol.shadow.radius = 2.2;
  escena.add(sol, sol.target);
  const hemi = new THREE.HemisphereLight('#CFE0F2', '#B59A78', 0.8);
  escena.add(hemi);
  escena.fog = new THREE.Fog('#E8DDCC', 200, 1200);

  const vida = new Vida(mundo, { colores, densidad, antigua: mundo.tipo === 'ciudad_antigua' }, material);
  escena.add(vida.grupo);

  const post = new Post(ancho, alto);
  const camara = new THREE.PerspectiveCamera(46, ancho / alto, 1, 12000);
  const centroPajaros = new THREE.Vector3();

  return {
    dibujar(t, estado, toma) {
      const l = luzEn(estado);
      u.uCiudad.value = estado.ciudad;
      u.uTiempo.value = t;
      u.uNoche.value = l.noche;
      sol.position.copy(l.dirSol).multiplyScalar(900);
      sol.target.position.set(0, 0, 0);
      sol.color.copy(l.sol);
      sol.intensity = l.intSol;
      hemi.color.copy(l.hemiCielo);
      hemi.groundColor.copy(l.hemiSuelo);
      hemi.intensity = l.intHemi;
      cielo.uniformes.uArriba.value.copy(l.arriba);
      cielo.uniformes.uHorizonte.value.copy(l.horizonte);
      cielo.uniformes.uSolDir.value.copy(l.dirSol);
      cielo.uniformes.uSol.value.copy(l.sol);
      cielo.uniformes.uNoche.value = l.noche;
      escena.environmentIntensity = l.entorno;
      const fog = escena.fog as THREE.Fog;
      fog.color.copy(l.niebla);
      const dist = toma.pos.distanceTo(toma.mira);
      fog.near = (dist * 0.8 + 60) * l.vista;
      fog.far = (dist * 3.2 + 950) * l.vista;
      camara.fov = toma.fov;
      camara.aspect = ancho / alto;
      camara.position.copy(toma.pos);
      camara.lookAt(toma.mira);
      camara.updateProjectionMatrix();
      camara.updateMatrixWorld(true);
      const foco = toma.enfoque.clone().project(camara);
      post.u.uFoco.value = Math.min(0.85, Math.max(0.15, (1 - foco.y) / 2));
      post.u.uMax.value = 8 * toma.desenfoque;
      post.u.uBanda.value = 0.1;
      post.u.uExposicion.value = l.exposicion;
      post.u.uCalor.value = 1 - l.noche;
      centroPajaros.set(toma.mira.x * 0.5, 0, toma.mira.z * 0.5);
      vida.actualizar(t, estado.ciudad, l.noche, centroPajaros);
      post.dibujar(gl, escena, camara);
    },
  };
}

export function Maqueta({
  mundo,
  terreno,
  colores,
  densidad,
  t,
  estado,
  toma,
  ancho,
  alto,
}: {
  mundo: Mundo;
  terreno: Terreno;
  colores: Record<Material, string>;
  densidad: number;
  t: number;
  estado: EstadoMundo;
  toma: Toma;
  ancho: number;
  alto: number;
}): ReactNode {
  const gl = useThree((s) => s.gl) as THREE.WebGLRenderer;
  useFrame(() => undefined, 1);
  const montaje = useMemo(() => montar(gl, mundo, terreno, colores, densidad, ancho, alto), [gl, mundo, terreno, colores, densidad, ancho, alto]);
  useLayoutEffect(() => {
    montaje.dibujar(t, estado, toma);
  }, [montaje, t, estado, toma]);
  return null;
}
