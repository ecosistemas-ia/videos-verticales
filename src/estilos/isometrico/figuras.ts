// Del mundo común (piezas en metros) a figuras isométricas: cada pieza se vuelve dos o tres caras planas, un cilindro o
// una esfera, con el nombre de su degradado. Se calcula una vez. El orden de dibujo es el del pintor: grupo a grupo de
// atrás hacia delante (x + z), y dentro de cada grupo pieza a pieza; los adornos finos pegados a una cara de atrás
// (ventanas, puertas) no se dibujan, porque no se verían.

import { hash } from '../_mundo/azar.ts';
import type { Material, Mundo, Pieza, TipoGrupo } from '../_mundo/tipos.ts';
import { MATERIALES, PAREDES } from './colores.ts';
import { C30, iso, type P2 } from './proyeccion.ts';

export type Cara = 'sup' | 'izq' | 'der' | 'cil' | 'esf';

export interface Trazo {
  readonly d: string;
  /** Id del degradado: i-<material>-<variante>-<cara>. */
  readonly relleno: string;
}

export interface FiguraGrupo {
  readonly g: number;
  readonly tipo: TipoGrupo;
  readonly orden: number;
  /** Clave del orden de dibujo (más grande = más delante). */
  readonly clave: number;
  /** Pie del grupo en unidades iso: desde ahí crece. */
  readonly pie: P2;
  readonly trazos: readonly Trazo[];
}

export interface Figuras {
  readonly grupos: readonly FiguraGrupo[];
  /** Las celdas de agua (sin losa de suelo): su superficie, en unidades iso, y su centro en metros (x, z). */
  readonly agua: readonly string[];
  readonly centrosAgua: ReadonlyArray<readonly [number, number]>;
  /** Qué celdas del borde de delante son agua (para el corte): [i en la cara derecha, j en la cara izquierda]. */
  readonly bordeAgua: { readonly derecha: readonly boolean[]; readonly izquierda: readonly boolean[] };
  /** Los degradados que se usan: material, variante y cara. */
  readonly degradados: ReadonlyArray<{ readonly m: Material; readonly v: number; readonly cara: Cara }>;
}

const f = (n: number) => n.toFixed(2);
function poligono(...ps: P2[]): string {
  return `M${ps.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`;
}
function elipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}

/** Radio en pantalla (unidades iso) de un círculo horizontal de radio r: elipse rx × ry. */
const RX = Math.SQRT2 * C30;
const RY = Math.SQRT1_2;

function trazosDe(p: Pieza, variante: number, usar: (m: Material, v: number, c: Cara) => string, suelo: boolean): Trazo[] {
  const t: Trazo[] = [];
  const r = (c: Cara) => usar(p.m, variante, c);
  if (p.k === 'caja' || p.k === 'tronco') {
    const y0 = suelo ? Math.max(0, p.y) : p.y;
    const y1 = p.y + p.sy;
    if (y1 <= y0 + 0.001 && !suelo) return t;
    const bx = p.sx / 2;
    const bz = p.sz / 2;
    const tx = p.k === 'tronco' ? p.tx / 2 : bx;
    const tz = p.k === 'tronco' ? p.tz / 2 : bz;
    const { x, z } = p;
    if (y1 - y0 > 0.05) {
      t.push({ d: poligono(iso(x - bx, y0, z + bz), iso(x + bx, y0, z + bz), iso(x + tx, y1, z + tz), iso(x - tx, y1, z + tz)), relleno: r('izq') });
      t.push({ d: poligono(iso(x + bx, y0, z - bz), iso(x + bx, y0, z + bz), iso(x + tx, y1, z + tz), iso(x + tx, y1, z - tz)), relleno: r('der') });
    }
    if (tx > 0.02 && tz > 0.02) t.push({ d: poligono(iso(x - tx, y1, z - tz), iso(x + tx, y1, z - tz), iso(x + tx, y1, z + tz), iso(x - tx, y1, z + tz)), relleno: r('sup') });
    return t;
  }
  if (p.k === 'tejado') {
    const { x, y, z, sy } = p;
    const hx = p.sx / 2;
    const hz = p.sz / 2;
    if (p.eje === 'x') {
      t.push({ d: poligono(iso(x - hx, y, z - hz), iso(x + hx, y, z - hz), iso(x + hx, y + sy, z), iso(x - hx, y + sy, z)), relleno: r('sup') });
      t.push({ d: poligono(iso(x - hx, y, z + hz), iso(x + hx, y, z + hz), iso(x + hx, y + sy, z), iso(x - hx, y + sy, z)), relleno: r('izq') });
      t.push({ d: poligono(iso(x + hx, y, z - hz), iso(x + hx, y, z + hz), iso(x + hx, y + sy, z)), relleno: usar('cal', 0, 'der') });
    } else {
      t.push({ d: poligono(iso(x - hx, y, z - hz), iso(x - hx, y, z + hz), iso(x, y + sy, z + hz), iso(x, y + sy, z - hz)), relleno: r('sup') });
      t.push({ d: poligono(iso(x + hx, y, z - hz), iso(x + hx, y, z + hz), iso(x, y + sy, z + hz), iso(x, y + sy, z - hz)), relleno: r('der') });
      t.push({ d: poligono(iso(x - hx, y, z + hz), iso(x + hx, y, z + hz), iso(x, y + sy, z + hz)), relleno: usar('cal', 0, 'izq') });
    }
    return t;
  }
  if (p.k === 'cilindro' || p.k === 'cono') {
    const [cx, cy] = iso(p.x, p.y, p.z);
    const [, ty] = iso(p.x, p.y + p.sy, p.z);
    const rb = p.r;
    const rt = p.k === 'cono' ? 0 : (p.r2 ?? p.r);
    const d =
      rt > 0.02
        ? `M${f(cx - rb * RX)} ${f(cy)}A${f(rb * RX)} ${f(rb * RY)} 0 0 0 ${f(cx + rb * RX)} ${f(cy)}L${f(cx + rt * RX)} ${f(ty)}A${f(rt * RX)} ${f(rt * RY)} 0 0 0 ${f(cx - rt * RX)} ${f(ty)}Z`
        : `M${f(cx - rb * RX)} ${f(cy)}A${f(rb * RX)} ${f(rb * RY)} 0 0 0 ${f(cx + rb * RX)} ${f(cy)}L${f(cx)} ${f(ty)}Z`;
    t.push({ d, relleno: r('cil') });
    if (rt > 0.02) t.push({ d: elipse(cx, ty, rt * RX, rt * RY), relleno: r('sup') });
    return t;
  }
  // esfera (y es el centro)
  const [cx, cy] = iso(p.x, p.y, p.z);
  const sy = p.sy ?? 1;
  t.push({ d: elipse(cx, cy, p.r * RX, p.r * Math.sqrt(0.5 + sy * sy)), relleno: r('esf') });
  return t;
}

function centro(p: Pieza): { x: number; z: number; y: number } {
  return { x: p.x, z: p.z, y: p.y };
}

/** Un adorno fino pegado a la cara de atrás de su grupo: no se ve. */
function deEspaldas(p: Pieza, gx: number, gz: number): boolean {
  if (p.k !== 'caja') return false;
  if (p.sx < 0.5 && p.sx < p.sz && p.x < gx - 0.3) return true;
  if (p.sz < 0.5 && p.sz < p.sx && p.z < gz - 0.3) return true;
  return false;
}

export function figurasDelMundo(m: Mundo): Figuras {
  const usados = new Map<string, { m: Material; v: number; cara: Cara }>();
  const usar = (mat: Material, v: number, cara: Cara) => {
    const id = `i-${mat}-${v}-${cara}`;
    if (!usados.has(id)) usados.set(id, { m: mat, v, cara });
    return id;
  };
  const porGrupo = new Map<number, Pieza[]>();
  m.piezas.forEach((p) => {
    const lista = porGrupo.get(p.g);
    if (lista) lista.push(p);
    else porGrupo.set(p.g, [p]);
  });
  const conSuelo = new Set<number>();
  const C = m.celda;
  const celda = (x: number, z: number) => {
    const i = Math.floor(x / C + m.n / 2);
    const j = Math.floor(z / C + m.n / 2);
    return i >= 0 && j >= 0 && i < m.n && j < m.n ? j * m.n + i : -1;
  };
  const grupos: FiguraGrupo[] = [];
  for (const [g, piezas] of porGrupo) {
    const gr = m.grupos[g];
    const suelo = gr.tipo === 'suelo';
    if (suelo) for (const p of piezas) conSuelo.add(celda(p.x, p.z));
    const variante = (mat: Material) => (PAREDES.has(mat) ? Math.floor(hash(g, 3.7) * MATERIALES[mat].length) % MATERIALES[mat].length : 0);
    const ordenadas = piezas
      .filter((p) => !deEspaldas(p, gr.x, gr.z))
      .map((p, i) => ({ p, i, c: centro(p) }))
      .sort((a, b) => a.c.x + a.c.z + a.c.y * 0.9 - (b.c.x + b.c.z + b.c.y * 0.9) || a.i - b.i);
    const trazos: Trazo[] = [];
    for (const { p } of ordenadas) trazos.push(...trazosDe(p, variante(p.m), usar, suelo));
    if (trazos.length === 0) continue;
    grupos.push({ g, tipo: gr.tipo, orden: gr.orden, clave: gr.x + gr.z - (suelo ? C * 0.5 : 0), pie: iso(gr.x, gr.base, gr.z), trazos });
  }
  grupos.sort((a, b) => a.clave - b.clave || a.g - b.g);
  // el agua: las celdas sin losa
  const agua: string[] = [];
  const centrosAgua: Array<readonly [number, number]> = [];
  const h = m.lado / 2;
  const derecha: boolean[] = [];
  const izquierda: boolean[] = [];
  for (let j = 0; j < m.n; j++)
    for (let i = 0; i < m.n; i++) {
      if (conSuelo.has(j * m.n + i)) continue;
      const x0 = -h + i * C;
      const z0 = -h + j * C;
      agua.push(poligono(iso(x0, m.nivelAgua, z0), iso(x0 + C, m.nivelAgua, z0), iso(x0 + C, m.nivelAgua, z0 + C), iso(x0, m.nivelAgua, z0 + C)));
      centrosAgua.push([x0 + C / 2, z0 + C / 2]);
    }
  for (let k = 0; k < m.n; k++) {
    derecha.push(!conSuelo.has(k * m.n + (m.n - 1)));
    izquierda.push(!conSuelo.has((m.n - 1) * m.n + k));
  }
  return { grupos, agua, centrosAgua, bordeAgua: { derecha, izquierda }, degradados: [...usados.values()] };
}
