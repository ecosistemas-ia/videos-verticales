// El paso final de cada fotograma: la escena se dibuja con antialias 4× en una textura de alto rango y luego, en una sola
// pasada, se le pone el desenfoque de maqueta (nítido en la franja del foco, borroso arriba y abajo: el efecto
// «miniatura» que hace leer la ciudad como un juguete), una viñeta suave, el mapeo de tonos y el paso a sRGB.

import * as THREE from 'three';

export class Post {
  readonly rt: THREE.WebGLRenderTarget;
  readonly escena = new THREE.Scene();
  readonly camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly u: Record<string, THREE.IUniform>;

  constructor(ancho: number, alto: number) {
    this.rt = new THREE.WebGLRenderTarget(ancho, alto, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    this.u = {
      tColor: { value: this.rt.texture },
      uRes: { value: new THREE.Vector2(ancho, alto) },
      uFoco: { value: 0.5 },
      uBanda: { value: 0.12 },
      uMax: { value: 9 },
      uExposicion: { value: 1 },
      uCalor: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.u,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tColor;
        uniform vec2 uRes;
        uniform float uFoco;
        uniform float uBanda;
        uniform float uMax;
        uniform float uExposicion;
        uniform float uCalor;
        varying vec2 vUv;
        void main() {
          float dy = abs((1.0 - vUv.y) - uFoco);
          float r = uMax * smoothstep(uBanda, uBanda + 0.34, dy);
          vec3 acc = texture2D(tColor, vUv).rgb;
          float w = 1.0;
          if (r > 0.6) {
            for (int i = 0; i < 28; i++) {
              float fi = float(i);
              float rr = sqrt((fi + 0.5) / 28.0) * r;
              float th = fi * 2.39996;
              acc += texture2D(tColor, vUv + vec2(cos(th), sin(th)) * rr / uRes).rgb;
              w += 1.0;
            }
          }
          vec3 c = acc / w * uExposicion;
          // un poco más cálido en las luces y más frío en las sombras: el color de las maquetas de juego
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(mix(vec3(l), c, 1.14), 0.0);
          c *= mix(vec3(0.97, 0.99, 1.04), vec3(1.04, 1.0, 0.95), smoothstep(0.05, 0.8, l) * uCalor + (1.0 - uCalor) * 0.5);
          vec2 q = (vUv - 0.5) * vec2(1.0, 0.75);
          c *= 1.0 - dot(q, q) * 0.7;
          gl_FragColor = vec4(max(c, 0.0), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          gl_FragColor.rgb = clamp((gl_FragColor.rgb - 0.5) * 1.07 + 0.52, 0.0, 1.0);
        }`,
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const malla = new THREE.Mesh(tri, material);
    malla.frustumCulled = false;
    this.escena.add(malla);
  }

  dibujar(gl: THREE.WebGLRenderer, escena: THREE.Scene, camara: THREE.Camera): void {
    gl.setRenderTarget(this.rt);
    gl.clear();
    gl.render(escena, camara);
    gl.setRenderTarget(null);
    gl.render(this.escena, this.camara);
  }
}
