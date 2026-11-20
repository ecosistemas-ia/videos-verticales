// El mundo 3D dentro de <ThreeCanvas>: cielo en degradado, niebla del color del horizonte, sol con sombras, luz de
// cielo y suelo, los puestos cercanos a la cámara con sus personajes, el relleno del camino y la profundidad de campo
// (BokehPass de three.js, sin dependencias nuevas). Todo sale del segundo t: el mismo guion da el mismo video.

import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { bocaDe, estadoEn, SEPARACION, type Puesto } from './camara.ts';
import { fondoLejano, relleno } from './decorados.ts';
import { PALETAS_MUNDO } from './paletas.ts';
import { Personaje } from './Personaje.tsx';
import { ajustarBrillo, ListaPiezas, materialToon, resolverColor, type ResolverColor } from './Piezas.tsx';
import { pose } from './poses.ts';
import { ARRANQUE_VOZ, type AjustesCabezas } from './reglas.ts';
import { APARIENCIAS } from './personajes.ts';

interface Enfoque {
  foco: number;
  apertura: number;
}

const CIELO_VERTICE = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const CIELO_FRAGMENTO = /* glsl */ `
  uniform vec3 arriba;
  uniform vec3 abajo;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y * 1.7 + 0.04, 0.0, 1.0);
    gl_FragColor = vec4(mix(abajo, arriba, pow(h, 0.75)), 1.0);
    #include <colorspace_fragment>
  }
`;

/** Profundidad de campo: se renderiza con un compositor propio (MSAA x4, desenfoque por profundidad y salida sRGB). */
function Desenfoque({ enfoque }: { enfoque: RefObject<Enfoque> }): null {
  const { gl, scene, camera, size } = useThree();
  const cadena = useMemo(() => {
    const destino = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, samples: 4 });
    const compositor = new EffectComposer(gl, destino);
    compositor.addPass(new RenderPass(scene, camera));
    const bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0.001, maxblur: 0.009 });
    compositor.addPass(bokeh);
    compositor.addPass(new OutputPass());
    compositor.setSize(size.width, size.height);
    return { compositor, bokeh };
  }, [gl, scene, camera, size.width, size.height]);
  useEffect(() => () => cadena.compositor.dispose(), [cadena]);
  useFrame(() => {
    const u = cadena.bokeh.uniforms as unknown as Record<string, { value: number }>;
    const cam = camera as THREE.PerspectiveCamera;
    u.focus.value = enfoque.current.foco;
    u.aperture.value = enfoque.current.apertura;
    u.aspect.value = cam.aspect;
    u.nearClip.value = cam.near;
    u.farClip.value = cam.far;
    cadena.compositor.render();
  }, 1);
  return null;
}

const Suelo = memo(function Suelo({ largo, color }: { largo: number; color: string }): ReactNode {
  return (
    <mesh position={[largo / 2 - SEPARACION * 3, 0, -170]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={materialToon(color)}>
      <planeGeometry args={[largo, 520]} />
    </mesh>
  );
});

function PuestoVista({ puesto, t, color, acento }: { puesto: Puesto; t: number; color: ResolverColor; acento: string }): ReactNode {
  const tl = t - puesto.escena.inicio;
  const d = puesto.decorado;
  const boca = useMemo(() => bocaDe(puesto.escena, ARRANQUE_VOZ), [puesto.escena]);
  const vaiven = d.balanceo ? { y: 0.07 * Math.sin(1.1 * t), x: 0.012 * Math.sin(0.9 * t + 1), z: 0.022 * Math.sin(0.8 * t) } : { y: 0, x: 0, z: 0 };
  return (
    <group position={[puesto.origen[0], puesto.origen[1], puesto.origen[2]]}>
      <ListaPiezas piezas={d.fijo} color={color} />
      <group position={[0, vaiven.y, 0]} rotation={[vaiven.x, 0, vaiven.z]}>
        <ListaPiezas piezas={d.movil} color={color} />
        <ListaPiezas piezas={d.animadoMovil(t)} color={color} />
        {puesto.actores.map((a, k) => (
          <Personaje
            key={k}
            rol={a.rol}
            objeto={a.objeto}
            posicion={[a.x, d.suelo, a.z]}
            ladoCaida={a.ladoCaida}
            asiento={d.asiento}
            color={color}
            acento={acento}
            pose={pose(a.accion, tl, {
              indice: puesto.indice,
              duracion: puesto.escena.duracion,
              fase: a.fase,
              giroMira: a.giro,
              entrada: a.entrada,
              objeto: a.objeto,
              encorvado: APARIENCIAS[a.rol].encorvado,
              hablando: a.multitud ? () => 0 : boca,
            })}
          />
        ))}
      </group>
      <ListaPiezas piezas={d.animado(t)} color={color} />
    </group>
  );
}

export function Mundo({ puestos, ajustes, acento }: { puestos: readonly Puesto[]; ajustes: AjustesCabezas; acento: string }): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { camera, scene } = useThree();
  const paleta = PALETAS_MUNDO[ajustes.paleta];
  const color = useMemo(() => resolverColor(paleta, acento), [paleta, acento]);
  const estado = estadoEn(puestos, t);

  const sol = useRef<THREE.DirectionalLight>(null);
  const cieloLuz = useRef<THREE.HemisphereLight>(null);
  const farol = useRef<THREE.PointLight>(null);
  const fuego = useRef<THREE.PointLight>(null);
  const cielo = useRef<THREE.Mesh>(null);
  const enfoque = useRef<Enfoque>({ foco: 10, apertura: 0.001 });
  const objetivoSol = useMemo(() => new THREE.Object3D(), []);
  const niebla = useMemo(() => new THREE.Fog('#ffffff', 34, 190), []);
  const materialCielo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { arriba: { value: new THREE.Color() }, abajo: { value: new THREE.Color() } },
        vertexShader: CIELO_VERTICE,
        fragmentShader: CIELO_FRAGMENTO,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  const ultimo = puestos.length - 1;
  const rellenos = useMemo(
    () =>
      puestos.slice(0, -1).map((p, i) => relleno(p.origen[0], puestos[i + 1].origen[0], p.decorado.borde, puestos[i + 1].decorado.borde, `relleno-${i}`)),
    [puestos],
  );
  const extremos = useMemo(
    () => [
      relleno(-SEPARACION, 0, 0, puestos[0].decorado.borde, 'extremo-a'),
      relleno(ultimo * SEPARACION, (ultimo + 1) * SEPARACION, puestos[ultimo].decorado.borde, 0, 'extremo-b'),
    ],
    [puestos, ultimo],
  );
  const fondo = useMemo(() => fondoLejano(0, ultimo * SEPARACION), [ultimo]);

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { toma, luz } = estado;
    scene.fog = niebla;
    cam.fov = 40;
    cam.near = 0.1;
    cam.far = 700;
    cam.position.set(toma.pos[0], toma.pos[1], toma.pos[2]);
    cam.lookAt(toma.mira[0], toma.mira[1], toma.mira[2]);
    cam.updateProjectionMatrix();
    enfoque.current = { foco: toma.foco, apertura: toma.apertura };

    niebla.color.set(luz.cieloAbajo);
    (materialCielo.uniforms.arriba.value as THREE.Color).set(luz.cieloArriba);
    (materialCielo.uniforms.abajo.value as THREE.Color).set(luz.cieloAbajo);
    cielo.current?.position.copy(cam.position);

    if (cieloLuz.current !== null) {
      cieloLuz.current.color.set(luz.hemiCielo);
      cieloLuz.current.groundColor.set(luz.hemiSuelo);
      cieloLuz.current.intensity = luz.hemiIntensidad;
    }
    if (sol.current !== null) {
      const dir = new THREE.Vector3(...luz.solDireccion).normalize();
      objetivoSol.position.set(toma.mira[0], 0, toma.mira[2] - 2);
      objetivoSol.updateMatrixWorld();
      sol.current.target = objetivoSol;
      sol.current.position.copy(objetivoSol.position).addScaledVector(dir, 45);
      sol.current.color.set(luz.sol);
      sol.current.intensity = luz.solIntensidad;
      const sombra = sol.current.shadow.camera;
      sombra.left = -16;
      sombra.right = 16;
      sombra.top = 16;
      sombra.bottom = -16;
      sombra.near = 1;
      sombra.far = 110;
      sombra.updateProjectionMatrix();
    }
    const p = puestos[estado.actual];
    if (farol.current !== null) {
      farol.current.position.set(p.origen[0] + p.sujeto[0] + 1.2, p.decorado.suelo + 2.4, p.origen[2] + p.sujeto[2] + 1.6);
      farol.current.intensity = luz.farol;
    }
    if (fuego.current !== null) {
      const f = p.decorado.fuego;
      if (f === null) {
        fuego.current.intensity = 0;
      } else {
        fuego.current.position.set(p.origen[0] + f[0], f[1] + 0.3, p.origen[2] + f[2]);
        fuego.current.intensity = (1.2 + 1.6 * luz.brillo) * (1 + 0.12 * Math.sin(t * 13) + 0.06 * Math.sin(t * 29));
      }
    }
    ajustarBrillo(luz.brillo);
  });

  const visibles = puestos.filter((p) => Math.abs(p.indice - estado.actual) <= 1);

  return (
    <>
      <mesh ref={cielo} material={materialCielo} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[560, 24, 16]} />
      </mesh>
      <hemisphereLight ref={cieloLuz} />
      <directionalLight ref={sol} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.03} shadow-radius={3} />
      <primitive object={objetivoSol} />
      <pointLight ref={farol} color="#FFD3A0" distance={12} decay={1.6} />
      <pointLight ref={fuego} color="#FFA057" distance={8} decay={1.7} />
      <Suelo largo={SEPARACION * (puestos.length + 6)} color={paleta.pasto} />
      <ListaPiezas piezas={fondo} color={color} />
      {visibles.map((p) => (
        <PuestoVista key={p.indice} puesto={p} t={t} color={color} acento={acento} />
      ))}
      {rellenos.map((r, i) => (Math.abs(i + 0.5 - estado.actual) <= 1.5 ? <ListaPiezas key={i} piezas={r} color={color} /> : null))}
      {estado.actual <= 1 && <ListaPiezas piezas={extremos[0]} color={color} />}
      {estado.actual >= ultimo - 1 && <ListaPiezas piezas={extremos[1]} color={color} />}
      {ajustes.desenfoque && <Desenfoque enfoque={enfoque} />}
    </>
  );
}
