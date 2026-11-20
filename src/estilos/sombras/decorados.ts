// Los decorados recortados del teatro de sombras. Cada uno nace en su base (0,0) sobre el suelo, crece hacia arriba y
// tiene algo que se mueve siempre: copas con viento, humo, llamas, banderas, estrellas que titilan, agua que corre.

import { agujeroCirculo, agujeroPoligono, banda, circulo, curva, elipse, hash, mezclar, onda, poligono, ruido, ruido2 } from '../_marionetas/curvas.ts';
import { cadena, escalar, girar, mover, type Matriz } from '../_marionetas/geometria.ts';
import { CIELO, PANTALLA, SUELO, type Contexto, type Dibujo, type Pieza } from './dibujo.ts';
import type { NombreDecorado } from './reglas.ts';

export interface OpcionesDecorado {
  readonly elemento: NombreDecorado;
  readonly x: number;
  readonly escala: number;
  /** Solo luna, sol, nube, estrellas: 0..1 sobre el horizonte. */
  readonly altura: number | undefined;
}

/** Los que flotan en el cielo (no se apoyan en el suelo). */
export const CELESTES: readonly NombreDecorado[] = ['luna', 'sol', 'nube', 'estrellas'];

const ALTURA_POR_DEFECTO: Partial<Record<NombreDecorado, number>> = { luna: 0.78, sol: 0.74, nube: 0.7, estrellas: 0.8 };

function humo(cx: number, cy: number, t: number, s: number, ancho: number, cuantas = 7): string {
  const partes: string[] = [];
  for (let i = 0; i < cuantas; i++) {
    const vida = (t / 6 + i / cuantas + hash(i, s) * 0.1) % 1;
    const r = 14 + vida * 70 * ancho;
    const x = cx + vida * 90 * ancho + 18 * ruido(t * 0.4 + i, s);
    const y = cy - vida * 360;
    if (vida < 0.95) partes.push(circulo(x, y, r));
  }
  return partes.join(' ');
}

function llama(t: number, s: number, ancho: number, alto: number): string {
  const a = ruido2(t * 6, s);
  const b = ruido2(t * 7.7, s + 3);
  const c = ruido2(t * 5.1, s + 6);
  return curva([
    [-ancho, 0],
    [-ancho * 1.05 + a * 4, -alto * 0.3],
    [-ancho * 0.55 + b * 6, -alto * 0.62],
    [-ancho * 0.2 + c * 8, -alto * 0.8],
    [a * 10, -alto * (1 + 0.12 * b)],
    [ancho * 0.25 + b * 8, -alto * 0.72],
    [ancho * 0.6 + c * 6, -alto * 0.55],
    [ancho * 1.05 + a * 4, -alto * 0.28],
    [ancho, 0],
  ]);
}

export function dibujarDecorado(o: OpcionesDecorado, ctx: Contexto): Dibujo {
  const { t, semilla: s, calados: cal } = ctx;
  const celeste = CELESTES.includes(o.elemento);
  const alt = o.altura ?? ALTURA_POR_DEFECTO[o.elemento] ?? 0;
  const y = celeste ? SUELO - 140 - alt * (SUELO - 140 - CIELO) : SUELO + 4;
  const R = cadena(mover(o.x, y), escalar(o.escala));
  const piezas: Pieza[] = [];
  const luces: Dibujo['luces'] = [];
  const poner = (d: string, m: Matriz = cadena(), tipo?: Pieza['tipo']): void => {
    if (d !== '') piezas.push({ d, m: cadena(R, m), tipo });
  };
  const luz = (x: number, yy: number, r: number, fuerza: number, color: string): void => {
    luces.push({ x: o.x + x * o.escala, y: y + yy * o.escala, r: r * o.escala, fuerza, color });
  };
  const viento = (k: number): number => 1.6 * ruido2(t * 0.35 + k, s);

  switch (o.elemento) {
    case 'arbol': {
      poner(curva([[-22, 0], [-14, -60], [-12, -130], [-40, -178], [-30, -184], [-6, -160], [-2, -196], [8, -196], [10, -168], [34, -190], [42, -182], [14, -140], [14, -70], [24, 0]]));
      const copa = cadena(mover(0, -170), girar(viento(0)), mover(0, 170));
      const bolas: [number, number, number][] = [[-78, -232, 56], [0, -276, 72], [74, -228, 56], [-44, -310, 52], [46, -312, 50], [0, -206, 54], [-100, -270, 40], [100, -268, 40]];
      for (const [bx, by, br] of bolas) {
        let d = circulo(bx, by, br);
        if (cal) d += ` ${agujeroCirculo(bx - br * 0.3, by - br * 0.1, br * 0.12)} ${agujeroCirculo(bx + br * 0.25, by + br * 0.3, br * 0.1)}`;
        poner(d, copa);
      }
      break;
    }
    case 'pino': {
      poner(poligono([[-12, 0], [-9, -60], [9, -60], [12, 0]]));
      const m = cadena(mover(0, -60), girar(viento(1) * 0.8), mover(0, 60));
      for (let i = 0; i < 5; i++) {
        const base = -50 - i * 62;
        const w = 110 - i * 18;
        const pts: [number, number][] = [[-w, base]];
        for (let j = 1; j < 6; j++) pts.push([-w + (w * 2 * j) / 6, base + (j % 2 === 0 ? 0 : 10)]);
        pts.push([w, base], [0, base - 100]);
        poner(poligono(pts), m);
      }
      break;
    }
    case 'palmera': {
      const tronco = [
        { x: 0, y: 0 },
        { x: 12, y: -90 },
        { x: 34, y: -180 },
        { x: 64, y: -262 },
      ];
      let d = banda(tronco, (i, n) => mezclar(34, 20, i / (n - 1)));
      if (cal) for (let i = 1; i < 9; i++) {
        const k = i / 9;
        const px = mezclar(0, 64, k * k);
        const py = mezclar(0, -262, k);
        d += ' ' + agujeroPoligono([[px - 8, py - 2], [px + 8, py - 6], [px + 8, py - 3], [px - 8, py + 1]]);
      }
      poner(d);
      for (let i = 0; i < 7; i++) {
        const ang = -150 + i * 42 + 6 * ruido2(t * 0.5 + i * 0.4, s + i);
        const r = (ang * Math.PI) / 180;
        const pts = [0, 1, 2, 3, 4].map((k) => {
          const L = 30 + k * 34;
          const caida = k * k * 4.5;
          return { x: Math.cos(r) * L, y: Math.sin(r) * L + caida };
        });
        poner(banda(pts, (k, n) => (k === 0 ? 8 : 26 * Math.sin((Math.PI * k) / (n - 1)) + 4)), cadena(mover(64, -266)));
      }
      break;
    }
    case 'nopal': {
      const pencas: [number, number, number, number, number][] = [
        [0, -70, 46, 72, 0],
        [-58, -170, 36, 56, -24],
        [52, -176, 38, 58, 22],
        [-6, -230, 32, 50, 4],
        [-92, -250, 28, 42, -40],
      ];
      pencas.forEach(([px, py, rx, ry, rot], i) => {
        let d = elipse(0, 0, rx, ry);
        if (cal) for (let j = 0; j < 5; j++) d += ' ' + agujeroCirculo(((j * 37) % 50) - 25 * (rx / 46), ((j * 53) % 80) - 40 * (ry / 72), 2.6);
        poner(d, cadena(mover(px, py), girar(rot + 1.2 * ruido(t * 0.4 + i, s))));
      });
      poner(circulo(-6, -282, 10) + ' ' + circulo(18, -238, 9), cadena());
      break;
    }
    case 'montana': {
      poner(poligono([[-360, 0], [-250, -150], [-200, -130], [-120, -300], [-60, -250], [0, -420], [60, -330], [110, -360], [200, -200], [260, -230], [380, 0]]));
      break;
    }
    case 'volcan': {
      poner(curva([[-330, 0], [-220, -110], [-110, -300], [-58, -420], [-40, -424], [-10, -414], [20, -420], [52, -418], [110, -300], [230, -100], [340, 0]], true, 0.7));
      poner(humo(0, -440, t, s, 1), cadena(), 'membrana');
      break;
    }
    case 'montana_dormida': {
      poner(
        curva(
          [
            [-470, 0],
            [-420, -50],
            [-372, -116],
            [-348, -150],
            [-318, -158],
            [-292, -140],
            [-264, -130],
            [-210, -196],
            [-160, -214],
            [-108, -196],
            [-30, -172],
            [48, -192],
            [104, -238],
            [150, -244],
            [196, -214],
            [262, -160],
            [318, -150],
            [342, -172],
            [366, -150],
            [420, -70],
            [470, 0],
          ],
          true,
          0.85,
        ),
      );
      break;
    }
    case 'casa': {
      let d = poligono([[-90, 0], [-90, -120], [90, -120], [90, 0]]);
      if (cal) d += ` ${agujeroPoligono([[-60, -90], [-24, -90], [-24, -54], [-60, -54]])} ${agujeroPoligono([[24, -60], [52, -60], [52, 0], [24, 0]].map(([x, yy]) => [x, Math.min(yy, -2)] as [number, number]))}`;
      poner(d);
      poner(poligono([[-112, -112], [0, -200], [112, -112]]));
      poner(poligono([[44, -150], [44, -210], [66, -210], [66, -134]]));
      poner(humo(55, -214, t * 0.8, s, 0.45, 5), cadena(), 'membrana');
      if (cal) {
        poner(poligono([[-60, -90], [-24, -90], [-24, -54], [-60, -54]]), cadena(), 'brillo');
        luz(-42, -72, 170, 0.35 + 0.05 * ruido2(t * 3, s), '#FFC066');
      }
      break;
    }
    case 'templo': {
      const niveles = 5;
      for (let i = 0; i < niveles; i++) {
        const w = 230 - i * 38;
        const y0 = -i * 52;
        let d = poligono([[-w, y0], [-w + 10, y0 - 52], [w - 10, y0 - 52], [w, y0]]);
        if (cal) d += ' ' + agujeroPoligono([[-w + 18, y0 - 30], [-w + 60, y0 - 30], [-w + 60, y0 - 24], [-w + 18, y0 - 24]]) + ' ' + agujeroPoligono([[w - 60, y0 - 30], [w - 18, y0 - 30], [w - 18, y0 - 24], [w - 60, y0 - 24]]);
        poner(d);
      }
      let esc = poligono([[-38, 0], [-26, -262], [26, -262], [38, 0]]);
      if (cal) for (let i = 1; i < 14; i++) esc += ' ' + agujeroPoligono([[-30 + i * 0.6, -i * 19], [30 - i * 0.6, -i * 19], [30 - i * 0.6, -i * 19 + 4], [-30 + i * 0.6, -i * 19 + 4]]);
      poner(esc);
      let santuario = poligono([[-62, -258], [-58, -330], [58, -330], [62, -258]]);
      if (cal) santuario += ' ' + agujeroPoligono([[-18, -262], [-18, -304], [18, -304], [18, -262]]);
      poner(santuario);
      poner(poligono([[-72, -326], [72, -326], [60, -354], [-60, -354]]));
      for (let i = 0; i < 5; i++) poner(poligono([[-56 + i * 28, -352], [-48 + i * 28, -380], [-40 + i * 28, -352]]));
      break;
    }
    case 'castillo': {
      const almenas = (x0: number, x1: number, yy: number): [number, number][] => {
        const pts: [number, number][] = [];
        const n = Math.max(2, Math.round((x1 - x0) / 22));
        for (let i = 0; i <= n; i++) {
          const x = mezclar(x0, x1, i / n);
          pts.push([x, i % 2 === 0 ? yy - 18 : yy]);
          if (i < n) pts.push([mezclar(x0, x1, (i + 1) / n), i % 2 === 0 ? yy - 18 : yy]);
        }
        return pts;
      };
      let muro = poligono([[-170, 0], ...almenas(-170, 170, -170), [170, 0]]);
      if (cal) muro += ` ${agujeroPoligono([[-28, 0], [-28, -70], [0, -96], [28, -70], [28, -2]])}`;
      poner(muro);
      for (const [tx, h] of [[-170, 300], [170, 300], [0, 360]] as [number, number][]) {
        let torre = poligono([[tx - 46, 0], [tx - 46, -h], [tx + 46, -h], [tx + 46, 0]]);
        if (cal) torre += ` ${agujeroPoligono([[tx - 8, -h + 60], [tx + 8, -h + 60], [tx + 8, -h + 96], [tx - 8, -h + 96]])}`;
        poner(torre);
        poner(poligono([[tx - 56, -h], [tx, -h - 110], [tx + 56, -h]]));
        poner(banda([{ x: tx, y: -h - 106 }, { x: tx, y: -h - 160 }], () => 4));
        const ola = (k: number): number => 7 * Math.sin(2 * Math.PI * (1.4 * t - k * 1.3) + tx);
        poner(curva([[tx, -h - 160], [tx + 20, -h - 158 + ola(0.3)], [tx + 42, -h - 154 + ola(0.7)], [tx + 46, -h - 146 + ola(1)], [tx + 22, -h - 140 + ola(0.5)], [tx, -h - 138]], true, 0.6));
      }
      break;
    }
    case 'luna': {
      const r = 72;
      poner(circulo(0, 0, r), cadena(mover(0, 4 * onda(t, 0.1, s))), 'brillo');
      luz(0, 0, 360, 0.55, '#FFF4D6');
      break;
    }
    case 'sol': {
      const giro = t * 6;
      const rayos: string[] = [];
      for (let i = 0; i < 12; i++) {
        const a = ((i * 30 + giro) * Math.PI) / 180;
        const l = i % 2 === 0 ? 150 : 124;
        rayos.push(poligono([[Math.cos(a - 0.09) * 92, Math.sin(a - 0.09) * 92], [Math.cos(a) * l, Math.sin(a) * l], [Math.cos(a + 0.09) * 92, Math.sin(a + 0.09) * 92]]));
      }
      poner(rayos.join(' '), cadena(), 'brillo');
      poner(circulo(0, 0, 80), cadena(), 'brillo');
      luz(0, 0, 420, 0.6, '#FFE7A0');
      break;
    }
    case 'nube': {
      const dx = 40 * ruido(t * 0.08, s) + t * 4;
      const bolas: [number, number, number][] = [[-90, 0, 40], [-40, -26, 56], [26, -30, 62], [90, -6, 44], [0, 6, 48]];
      poner(bolas.map(([bx, by, br]) => circulo(bx, by, br)).join(' ') + ' ' + poligono([[-120, 10], [120, 10], [120, 30], [-120, 30]]), cadena(mover(((dx + 200) % 400) - 200, 0)));
      break;
    }
    case 'estrellas': {
      const ancho = PANTALLA.x1 - PANTALLA.x0 - 120;
      const estrellas: string[] = [];
      for (let i = 0; i < 26; i++) {
        const ex = PANTALLA.x0 + 60 + hash(i, 5) * ancho - o.x;
        const ey = (hash(i, 9) - 0.6) * 420;
        const tw = 0.6 + 0.4 * Math.max(0, Math.sin(2 * Math.PI * (0.35 + hash(i, 3) * 0.6) * t + i));
        const r = (3 + hash(i, 7) * 4) * tw;
        estrellas.push(poligono([[ex, ey - r * 2.2], [ex + r * 0.5, ey - r * 0.5], [ex + r * 2.2, ey], [ex + r * 0.5, ey + r * 0.5], [ex, ey + r * 2.2], [ex - r * 0.5, ey + r * 0.5], [ex - r * 2.2, ey], [ex - r * 0.5, ey - r * 0.5]]));
      }
      piezas.push({ d: estrellas.join(' '), m: mover(o.x, y), tipo: 'brillo' });
      break;
    }
    case 'hoguera': {
      poner(poligono([[-70, -6], [60, -34], [66, -20], [-64, 8]]) + ' ' + poligono([[-60, -34], [70, -6], [64, 8], [-66, -20]]));
      for (let i = 0; i < 5; i++) poner(circulo(-60 + i * 30, -2, 14));
      poner(llama(t, s, 50, 160), cadena(mover(0, -18)), 'llama');
      poner(llama(t + 0.4, s + 9, 28, 110), cadena(mover(6, -18)), 'brillo');
      const chispas: string[] = [];
      for (let i = 0; i < 6; i++) {
        const v = (t * 0.8 + hash(i, s) ) % 1;
        chispas.push(circulo(20 * ruido(t + i, s) + (hash(i, 2) - 0.5) * 60, -140 - v * 220, 3 * (1 - v)));
      }
      poner(chispas.join(' '), cadena(), 'llama');
      luz(0, -80, 420, 0.7 + 0.12 * ruido2(t * 4, s), '#FF9A3C');
      break;
    }
    case 'rio': {
      const ancho = PANTALLA.x1 - PANTALLA.x0;
      for (let fila = 0; fila < 3; fila++) {
        const pts: [number, number][] = [];
        const desplaza = (t * (30 + fila * 14)) % 120;
        const yy = -6 - fila * 22;
        for (let x = -60; x <= ancho + 60; x += 30) {
          const ola = Math.sin(((x + desplaza) / 120) * 2 * Math.PI);
          pts.push([PANTALLA.x0 - o.x + x, yy - 8 * ola]);
        }
        for (let x = ancho + 60; x >= -60; x -= 30) pts.push([PANTALLA.x0 - o.x + x, yy + 10]);
        piezas.push({ d: curva(pts, true, 0.8), m: cadena(mover(o.x, SUELO + 6)), tipo: fila === 0 ? undefined : 'membrana' });
      }
      break;
    }
    case 'pasto': {
      const hojas: string[] = [];
      for (let i = 0; i < 18; i++) {
        const bx = -150 + i * 17 + hash(i, s) * 8;
        const h = 40 + hash(i, s + 1) * 60;
        const curva0 = 10 * ruido2(t * 0.8 + i * 0.15, s) + (hash(i, 4) - 0.5) * 20;
        hojas.push(banda([{ x: bx, y: 4 }, { x: bx + curva0 * 0.4, y: -h * 0.5 }, { x: bx + curva0, y: -h }], (k, n) => mezclar(8, 1, k / (n - 1))));
      }
      poner(hojas.join(' '));
      break;
    }
    case 'rocas': {
      poner(curva([[-110, 4], [-96, -40], [-60, -70], [-14, -64], [10, -36], [34, -78], [80, -70], [108, -30], [114, 4]], true, 0.7));
      break;
    }
    default:
      break;
  }
  return { piezas, luces, varillas: [] };
}
