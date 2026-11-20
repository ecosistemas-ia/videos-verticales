// La proyección isométrica y la cámara de la maqueta 2D. El mundo está en metros (x al este, z al sur, y arriba) y se
// dibuja en «unidades iso» (1 m = 1 unidad): x va abajo a la derecha, z abajo a la izquierda, y hacia arriba. La cámara
// no gira (así el orden de dibujo es siempre el mismo): solo se acerca, se aleja y se desliza, como la del original.

import { clamp01, mezcla, suave } from '../_mundo/azar.ts';
import type { IdLugar, Mundo } from '../_mundo/tipos.ts';

export const C30 = Math.cos(Math.PI / 6);

export type P2 = readonly [number, number];

export function iso(x: number, y: number, z: number): P2 {
  return [(x - z) * C30, (x + z) * 0.5 - y];
}

export type PlanoIso = 'general' | 'acercamiento' | 'alejamiento' | 'detalle' | 'paneo' | 'corte';

/** Lleva el punto f (unidades iso) al punto q de la pantalla con s píxeles por metro. */
export interface TomaIso {
  readonly fx: number;
  readonly fy: number;
  readonly s: number;
  readonly qx: number;
  readonly qy: number;
}

export function aPantalla(t: TomaIso, p: P2): P2 {
  return [(p[0] - t.fx) * t.s + t.qx, (p[1] - t.fy) * t.s + t.qy];
}

/** La transformación SVG de la cámara. */
export function transformacion(t: TomaIso): string {
  return `translate(${(t.qx - t.fx * t.s).toFixed(2)} ${(t.qy - t.fy * t.s).toFixed(2)}) scale(${t.s.toFixed(4)})`;
}

/** Hondo del cubo (el corte que enseña el subsuelo). */
export function hondo(m: Mundo): number {
  return Math.round(m.lado * 0.3);
}

/** Lo más alto de la maqueta en unidades iso (la punta de la torre más alta) y lo más bajo (la esquina del corte). */
const extensiones = new WeakMap<Mundo, { arriba: number; abajo: number }>();
function extension(m: Mundo): { arriba: number; abajo: number } {
  const ya = extensiones.get(m);
  if (ya) return ya;
  let arriba = -m.lado / 2;
  for (const p of m.piezas) {
    const tope = p.k === 'esfera' ? p.y + p.r : p.y + p.sy;
    arriba = Math.min(arriba, iso(p.x, tope, p.z)[1]);
  }
  const e = { arriba, abajo: m.lado / 2 + hondo(m) };
  extensiones.set(m, e);
  return e;
}

/** Zona libre de la pantalla para la maqueta entera: entre los rótulos de arriba y los subtítulos. */
const ZONA = { arriba: 330, abajo: 1260 };

/** Escala del plano general: la maqueta entera, con sus edificios, entre los rótulos y los subtítulos. */
export function escalaGeneral(m: Mundo, ancho: number): number {
  const h = m.lado / 2;
  const e = extension(m);
  return Math.min((ancho * 0.93) / (4 * h * C30), (ZONA.abajo - ZONA.arriba) / (e.abajo - e.arriba));
}

export function tomaIsoEn(m: Mundo, plano: PlanoIso, lugar: IdLugar, u0: number, ancho: number): TomaIso {
  const u = 0.2 * u0 + 0.8 * suave(u0);
  const s0 = escalaGeneral(m, ancho);
  const h = m.lado / 2;
  const D = hondo(m);
  const qx = ancho / 2;
  const qy = (ZONA.arriba + ZONA.abajo) / 2;
  const ext = extension(m);
  const centro: P2 = [0, (ext.arriba + ext.abajo) / 2];
  const l = m.lugares[lugar];
  const R = Math.max(8, l.radio);
  const pl = iso(l.x, l.y + Math.min(l.alto, 40) * 0.4, l.z);
  // el lugar ocupa unos 600 px de ancho
  const sLugar = Math.min(s0 * 3.2, Math.max(s0 * 1.6, 600 / (4 * R * C30)));
  const entre = (a: P2, b: P2, k: number): [number, number] => [mezcla(a[0], b[0], k), mezcla(a[1], b[1], k)];
  switch (plano) {
    case 'general': {
      const [fx, fy] = entre([centro[0] - 4, centro[1]], [centro[0] + 4, centro[1]], u);
      return { fx, fy, s: s0 * mezcla(1, 1.05, u), qx, qy };
    }
    case 'acercamiento': {
      const [fx, fy] = entre(centro, pl, u);
      return { fx, fy, s: mezcla(s0 * 1.02, sLugar, u), qx, qy };
    }
    case 'alejamiento': {
      const [fx, fy] = entre(pl, centro, u);
      return { fx, fy, s: mezcla(sLugar, s0, u), qx, qy };
    }
    case 'detalle': {
      const [fx, fy] = entre([pl[0] - 3, pl[1]], [pl[0] + 3, pl[1] - 2], u);
      return { fx, fy, s: sLugar * mezcla(1.25, 1.34, u), qx, qy };
    }
    case 'paneo': {
      const [fx, fy] = entre([pl[0] - R * 1.1, pl[1]], [pl[0] + R * 1.1, pl[1]], u);
      return { fx, fy, s: sLugar * 0.95, qx, qy };
    }
    case 'corte': {
      // la esquina de delante del cubo, donde se juntan las dos caras del corte
      const esquina = iso(h, -D * 0.5, h);
      const k = clamp01(u);
      return { fx: esquina[0], fy: esquina[1] - mezcla(3, 0, k), s: s0 * mezcla(3.5, 3.8, k), qx, qy: 960 };
    }
  }
}
