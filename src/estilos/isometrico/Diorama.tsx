// La maqueta isométrica dibujada en SVG, en unidades iso (la cámara la escala y la mueve desde fuera): el cubo cortado
// con las capas del subsuelo y el depósito de agua, la superficie del agua, los grupos del mundo en orden de pintor y,
// mezclados en ese orden, lo que se mueve (gente, coches, barcas). Los grupos crecen con un pequeño rebote cuando la
// ciudad se construye. Todo es función pura del segundo t.

import { memo, useMemo, type ReactNode } from 'react';
import { clamp01, hash } from '../_mundo/azar.ts';
import type { Mundo, Punto3 } from '../_mundo/tipos.ts';
import { aclarar, MATERIALES, mezclar, oscurecer, T } from './colores.ts';
import type { Figuras, FiguraGrupo } from './figuras.ts';
import { hondo, iso, type P2 } from './proyeccion.ts';

const f = (n: number) => n.toFixed(2);
const pts = (...ps: P2[]) => ps.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');

/** Los degradados de cada cara (luz arriba a la izquierda, sombra violeta abajo a la derecha). Cambian con la noche. */
function Degradados({ figuras, noche }: { figuras: Figuras; noche: number }): ReactNode {
  return (
    <defs>
      {figuras.degradados.map(({ m, v, cara }) => {
        let b = MATERIALES[m][v] ?? MATERIALES[m][0];
        if (m === 'ventana') b = mezclar(mezclar(b, T.indigoNoche, noche * 0.6), '#FFD98A', noche * 0.85);
        else if (m === 'fuego') b = mezclar(b, '#FFD27A', noche * 0.6);
        else b = mezclar(b, T.indigoNoche, noche * 0.42);
        const id = `i-${m}-${v}-${cara}`;
        if (cara === 'esf')
          return (
            <radialGradient key={id} id={id} cx="0.36" cy="0.3" r="0.8">
              <stop offset="0" stopColor={aclarar(b, 1.3)} />
              <stop offset="0.6" stopColor={b} />
              <stop offset="1" stopColor={oscurecer(b, 0.9)} />
            </radialGradient>
          );
        const [x2, y2] = cara === 'sup' ? [1, 1] : cara === 'cil' ? [1, 0] : [0, 1];
        const paradas: Array<[number, string]> =
          cara === 'sup'
            ? [[0, aclarar(b, 1.3)], [1, aclarar(b, 0.45)]]
            : cara === 'izq'
              ? [[0, aclarar(b, 0.9)], [0.07, b], [1, oscurecer(b, 0.35)]]
              : cara === 'der'
                ? [[0, oscurecer(b, 0.75)], [1, oscurecer(b, 1.3)]]
                : [[0, aclarar(b, 0.7)], [0.42, b], [1, oscurecer(b, 1.2)]];
        return (
          <linearGradient key={id} id={id} x1="0" y1="0" x2={x2} y2={y2}>
            {paradas.map(([o, c]) => (
              <stop key={o} offset={o} stopColor={c} />
            ))}
          </linearGradient>
        );
      })}
      <linearGradient id="iso-agua" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={mezclar('#6FB6FF', T.indigoNoche, noche * 0.5)} />
        <stop offset="1" stopColor={mezclar('#3559D4', T.indigoNoche, noche * 0.5)} />
      </linearGradient>
      <linearGradient id="iso-tierra" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mezclar('#D07A3E', T.indigoNoche, noche * 0.4)} />
        <stop offset="1" stopColor={mezclar('#A9552F', T.indigoNoche, noche * 0.4)} />
      </linearGradient>
    </defs>
  );
}

/** El cubo cortado: capas de tierra, la capa porosa, y abajo roca o el depósito de agua con su nivel. */
function Cubo({ m, figuras, t, nivel, lluvia, noche }: { m: Mundo; figuras: Figuras; t: number; nivel: number | null; lluvia: number; noche: number }): ReactNode {
  const h = m.lado / 2;
  const D = hondo(m);
  const TIERRA = -m.lado * 0.043;
  const POROSA = -m.lado * 0.143;
  const FONDO = -D;
  const caraIzq = (y1: number, y2: number) => pts(iso(-h, y1, h), iso(h, y1, h), iso(h, y2, h), iso(-h, y2, h));
  const caraDer = (y1: number, y2: number) => pts(iso(h, y1, -h), iso(h, y1, h), iso(h, y2, h), iso(h, y2, -h));
  const oscuro = mezclar('#0D0F33', '#05061A', noche);
  const azul = mezclar('#3559D4', '#22307A', noche * 0.5);
  const roca = mezclar('#3A2F6B', '#211A44', noche * 0.5);
  const zAgua = nivel === null ? FONDO : FONDO + (POROSA - 2 - FONDO) * nivel;
  const capaVegetal = mezclar('#7E3B33', '#3A1E2A', noche * 0.5);
  const C = m.celda;
  return (
    <g>
      {/* sombra de la maqueta sobre el fondo */}
      <ellipse cx={0} cy={h + D + 6} rx={h * 2.1} ry={h * 0.32} fill="#000000" fillOpacity={0.22} />
      <polygon points={caraIzq(TIERRA, FONDO)} fill="url(#iso-tierra)" />
      <polygon points={caraDer(TIERRA, FONDO)} fill="url(#iso-tierra)" />
      <polygon points={caraIzq(POROSA, FONDO)} fill={nivel === null ? roca : oscuro} />
      <polygon points={caraDer(POROSA, FONDO)} fill={nivel === null ? roca : oscuro} />
      {nivel === null &&
        Array.from({ length: 26 }).map((_, k) => {
          const u = hash(k, 1.1);
          const yy = Math.max(FONDO + 2, Math.min(POROSA - 2, POROSA - 2 - hash(k, 2.2) * (POROSA - FONDO - 4)));
          const p = k % 2 ? iso(-h + u * 2 * h, yy, h) : iso(h, yy, -h + u * 2 * h);
          return <ellipse key={k} cx={p[0]} cy={p[1]} rx={2.2 + 2 * hash(k, 3.3)} ry={1.1 + hash(k, 4.4)} fill="#5A4A94" fillOpacity={0.55} />;
        })}
      {nivel !== null && (
        <g>
          <polygon points={caraIzq(zAgua, FONDO)} fill={azul} />
          <polygon points={caraDer(zAgua, FONDO)} fill={azul} />
          <polygon points={caraIzq(zAgua, zAgua - 3)} fill="#FFFFFF" fillOpacity={0.16} />
          <polygon points={caraDer(zAgua, zAgua - 3)} fill="#FFFFFF" fillOpacity={0.12} />
          <polyline points={pts(iso(-h, zAgua, h), iso(h, zAgua, h), iso(h, zAgua, -h))} fill="none" stroke="#FFFFFF" strokeWidth={0.7} strokeOpacity={0.8} />
          {/* las marcas del nivel en la cara derecha */}
          {Array.from({ length: 11 }).map((_, k) => {
            const y = FONDO + ((POROSA - 2 - FONDO) * k) / 10;
            const cerca = Math.abs(y - zAgua) < (POROSA - FONDO) / 20;
            return <polyline key={k} points={pts(iso(h, y, h - 10), iso(h, y, h - (cerca ? 3.5 : 6.5)))} stroke={cerca ? T.ambar : '#FFFFFF'} strokeWidth={cerca ? 0.7 : 0.3} strokeOpacity={cerca ? 0.95 : 0.4} />;
          })}
        </g>
      )}
      {/* poros de la capa que hace de esponja */}
      {Array.from({ length: 34 }).map((_, k) => {
        const u = hash(k, 5.1);
        const y = TIERRA - 1.2 - hash(k, 5.2) * (TIERRA - POROSA - 2.4);
        const p = k % 2 ? iso(-h + u * 2 * h, y, h) : iso(h, y, -h + u * 2 * h);
        return <ellipse key={k} cx={p[0]} cy={p[1]} rx={0.9 + 0.7 * hash(k, 5.3)} ry={0.6 + 0.35 * hash(k, 5.4)} fill="#7E3B33" fillOpacity={0.55} />;
      })}
      {/* piedras en la tierra */}
      {Array.from({ length: 16 }).map((_, k) => {
        const u = hash(k, 6.1);
        const y = TIERRA - 0.8 - hash(k, 6.2) * 2.4;
        const p = k % 2 ? iso(-h + u * 2 * h, y, h) : iso(h, y, -h + u * 2 * h);
        return <ellipse key={`p${k}`} cx={p[0]} cy={p[1]} rx={0.7} ry={0.45} fill="#F2C27A" fillOpacity={0.35} />;
      })}
      {/* gotas que bajan por el subsuelo cuando llueve: la ciudad «bebe» */}
      {lluvia > 0.02 &&
        Array.from({ length: 30 }).map((_, k) => {
          const u = hash(k, 7.1);
          const q = (((t * 0.55 + hash(k, 7.2)) % 1) + 1) % 1;
          const yFin = nivel === null ? POROSA : zAgua;
          const y = TIERRA - q * (TIERRA - yFin);
          const p = k % 2 ? iso(-h + u * 2 * h, y, h) : iso(h, y, -h + u * 2 * h);
          return <ellipse key={`g${k}`} cx={p[0]} cy={p[1]} rx={0.45} ry={0.65} fill="#CFEAFF" fillOpacity={lluvia * Math.min(1, (1 - q) * 4)} />;
        })}
      <polygon points={caraIzq(0, TIERRA)} fill={capaVegetal} />
      <polygon points={caraDer(0, TIERRA)} fill={capaVegetal} />
      {/* donde el borde es agua, el corte enseña el agua */}
      {figuras.bordeAgua.izquierda.map((esAgua, i) =>
        esAgua ? <polygon key={`ai${i}`} points={pts(iso(-h + i * C, 0, h), iso(-h + (i + 1) * C, 0, h), iso(-h + (i + 1) * C, TIERRA, h), iso(-h + i * C, TIERRA, h))} fill="#4F8BF0" /> : null,
      )}
      {figuras.bordeAgua.derecha.map((esAgua, j) =>
        esAgua ? <polygon key={`ad${j}`} points={pts(iso(h, 0, -h + j * C), iso(h, 0, -h + (j + 1) * C), iso(h, TIERRA, -h + (j + 1) * C), iso(h, TIERRA, -h + j * C))} fill="#3F74D8" /> : null,
      )}
      {/* la luz y la sombra de las dos caras */}
      <polygon points={caraIzq(0, FONDO)} fill="#000000" fillOpacity={0.08} />
      <polygon points={caraDer(0, FONDO)} fill="#000000" fillOpacity={0.26} />
      <polyline points={pts(iso(-h, 0, h), iso(h, 0, h), iso(h, 0, -h))} fill="none" stroke="#FFFFFF" strokeWidth={0.5} strokeOpacity={0.35} />
      <polyline points={pts(iso(h, 0, h), iso(h, FONDO, h))} fill="none" stroke="#FFFFFF" strokeWidth={0.35} strokeOpacity={0.25} />
    </g>
  );
}

/** El agua de arriba: lisa, con brillos que corren. */
function Agua({ figuras, t, m }: { figuras: Figuras; t: number; m: Mundo }): ReactNode {
  return (
    <g>
      {figuras.agua.map((d, k) => (
        <path key={k} d={d} fill="url(#iso-agua)" />
      ))}
      {figuras.centrosAgua.map(([x, z], k) => {
        const q = (((t * 0.35 + hash(k, 8.1)) % 1) + 1) % 1;
        const dx = (hash(k, 8.2) - 0.5) * m.celda * 0.6;
        const dz = (q - 0.5) * m.celda * 0.7;
        const a = iso(x + dx, m.nivelAgua, z + dz);
        const b = iso(x + dx + 2.2, m.nivelAgua, z + dz);
        return <line key={`b${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#FFFFFF" strokeWidth={0.35} strokeLinecap="round" strokeOpacity={0.45 * Math.sin(q * Math.PI)} />;
      })}
    </g>
  );
}

/** Un grupo del mundo (estático: se dibuja una vez y React lo reutiliza). */
const Grupo = memo(function Grupo({ figura }: { figura: FiguraGrupo }) {
  return (
    <g>
      {figura.trazos.map((tr, k) => (
        <path key={k} d={tr.d} fill={`url(#${tr.relleno})`} />
      ))}
    </g>
  );
});

const ROPA = [T.magenta, T.turquesa, T.ambar, T.coral, T.celeste, T.verde, '#8E6CFF'];
const PIEL = ['#F5B48A', '#C98A62', '#FBC8A2', '#8C5A3C'];

interface Movil {
  clave: number;
  nodo: ReactNode;
}

function vaivenEn(a: Punto3, b: Punto3, v: number, pausa: number, t: number): { x: number; y: number; z: number; anda: boolean } {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const largo = Math.max(0.01, Math.hypot(dx, dz));
  const ida = largo / v;
  const T2 = 2 * (ida + pausa);
  const s = ((t % T2) + T2) % T2;
  const fr = s < ida ? s / ida : s < ida + pausa ? 1 : s < 2 * ida + pausa ? 1 - (s - ida - pausa) / ida : 0;
  return { x: a[0] + dx * fr, y: a[1] + (b[1] - a[1]) * fr, z: a[2] + dz * fr, anda: s < ida || (s >= ida + pausa && s < 2 * ida + pausa) };
}

function moviles(m: Mundo, t: number, ciudad: number): Movil[] {
  const out: Movil[] = [];
  // gente: figuritas un poco más grandes que la escala, para que se lean
  const personas = m.tramos.filter((tr) => tr.tipo === 'persona');
  const cuantas = Math.min(personas.length, 70);
  for (let k = 0; k < cuantas; k++) {
    const tr = personas[Math.floor((k * personas.length) / cuantas)];
    if (hash(k, 9.9) > ciudad * 1.05) continue;
    const lado = (hash(k, 2.1) - 0.5) * 2;
    const p = vaivenEn(tr.a, tr.b, 1.1 + hash(k, 3.1) * 0.5, 1 + hash(k, 4.1) * 3, t + hash(k, 5.1) * 30);
    const [sx, sy] = iso(p.x + lado * 0.6, p.y, p.z - lado * 0.6);
    const paso = p.anda ? Math.sin(t * 8 + k) * 0.25 : 0;
    const ropa = ROPA[Math.floor(hash(k, 6.1) * ROPA.length)];
    const e = 1.45;
    out.push({
      clave: p.x + p.z + 0.4,
      nodo: (
        <g key={`p${k}`}>
          <ellipse cx={sx} cy={sy} rx={0.8 * e} ry={0.35 * e} fill="#000000" fillOpacity={0.22} />
          <path d={`M${f(sx - 0.3 * e)} ${f(sy)}L${f(sx - 0.25 * e + paso)} ${f(sy - 0.9 * e)}M${f(sx + 0.3 * e)} ${f(sy)}L${f(sx + 0.25 * e - paso)} ${f(sy - 0.9 * e)}`} stroke={oscurecer(ropa, 1)} strokeWidth={0.32 * e} strokeLinecap="round" />
          <rect x={sx - 0.42 * e} y={sy - 2.0 * e} width={0.84 * e} height={1.25 * e} rx={0.35 * e} fill={ropa} />
          <circle cx={sx} cy={sy - 2.45 * e} r={0.42 * e} fill={PIEL[Math.floor(hash(k, 7.1) * PIEL.length)]} />
        </g>
      ),
    });
  }
  // coches
  const coches = m.tramos.filter((tr) => tr.tipo === 'coche');
  coches.forEach((tr, k) => {
    if (hash(k, 1.7) > ciudad * 1.05 || hash(k, 1.9) > 0.7) return;
    const p = vaivenEn(tr.a, tr.b, 5 + hash(k, 2.7) * 3, 0.6, t + hash(k, 3.7) * 20);
    const alongX = Math.abs(tr.b[0] - tr.a[0]) > Math.abs(tr.b[2] - tr.a[2]);
    const [hx, hz] = alongX ? [1.9, 0.9] : [0.9, 1.9];
    const y0 = p.y;
    const y1 = p.y + 1.1;
    const color = [T.coral, T.ambar, T.celeste, '#F4F0FF', T.turquesa, T.magenta][Math.floor(hash(k, 4.7) * 6)];
    const { x, z } = p;
    out.push({
      clave: x + z + 0.3,
      nodo: (
        <g key={`c${k}`}>
          <polygon points={pts(iso(x - hx, y0, z + hz), iso(x + hx, y0, z + hz), iso(x + hx, y1, z + hz), iso(x - hx, y1, z + hz))} fill={color} />
          <polygon points={pts(iso(x + hx, y0, z - hz), iso(x + hx, y0, z + hz), iso(x + hx, y1, z + hz), iso(x + hx, y1, z - hz))} fill={oscurecer(color, 1)} />
          <polygon points={pts(iso(x - hx, y1, z - hz), iso(x + hx, y1, z - hz), iso(x + hx, y1, z + hz), iso(x - hx, y1, z + hz))} fill={aclarar(color, 1)} />
          <polygon points={pts(iso(x - hx * 0.55, y1 + 0.01, z - hz * 0.55), iso(x + hx * 0.55, y1 + 0.01, z - hz * 0.55), iso(x + hx * 0.55, y1 + 0.01, z + hz * 0.55), iso(x - hx * 0.55, y1 + 0.01, z + hz * 0.55))} fill="#2B2E6E" fillOpacity={0.55} />
        </g>
      ),
    });
  });
  // barcas: las que dan vueltas y las que van y vienen por los canales
  const barca = (x: number, z: number, rumboX: boolean, vela: boolean, k: number): Movil => {
    const y = m.nivelAgua + Math.sin(t * 1.8 + k) * 0.08;
    const [hx, hz] = rumboX ? [2.2, 0.8] : [0.8, 2.2];
    const casco = '#D07A3E';
    return {
      clave: x + z + 0.2,
      nodo: (
        <g key={`b${k}`}>
          <polygon points={pts(iso(x - hx, y, z + hz), iso(x + hx, y, z + hz), iso(x + hx, y + 0.7, z + hz), iso(x - hx, y + 0.7, z + hz))} fill={casco} />
          <polygon points={pts(iso(x + hx, y, z - hz), iso(x + hx, y, z + hz), iso(x + hx, y + 0.7, z + hz), iso(x + hx, y + 0.7, z - hz))} fill={oscurecer(casco, 1)} />
          <polygon points={pts(iso(x - hx, y + 0.7, z - hz), iso(x + hx, y + 0.7, z - hz), iso(x + hx, y + 0.7, z + hz), iso(x - hx, y + 0.7, z + hz))} fill="#7E3B33" />
          {vela && <polygon points={pts(iso(x, y + 0.7, z), iso(x, y + 6.5, z), rumboX ? iso(x + 2.6, y + 0.9, z) : iso(x, y + 0.9, z + 2.6))} fill="#FFF1DC" />}
          <polyline points={pts(iso(x - hx - 1.5, m.nivelAgua, z + (rumboX ? 0 : hz + 1.5)), iso(x - hx, m.nivelAgua, z + (rumboX ? hz : hz)))} stroke="#FFFFFF" strokeWidth={0.3} strokeOpacity={0.5} />
        </g>
      ),
    };
  };
  m.rutas.forEach((r, ri) => {
    const n = r.tipo === 'velero' ? 2 : 3;
    for (let q = 0; q < n; q++) {
      const s = (((t * (r.tipo === 'velero' ? 0.012 : 0.008) + q / n + hash(ri, q) * 0.1) % 1) + 1) % 1;
      const fi = s * r.puntos.length;
      const i0 = Math.floor(fi) % r.puntos.length;
      const i1 = (i0 + 1) % r.puntos.length;
      const fr = fi - Math.floor(fi);
      const x = r.puntos[i0][0] + (r.puntos[i1][0] - r.puntos[i0][0]) * fr;
      const z = r.puntos[i0][1] + (r.puntos[i1][1] - r.puntos[i0][1]) * fr;
      if (Math.abs(x) > m.lado / 2 - 2 || Math.abs(z) > m.lado / 2 - 2) continue;
      out.push(barca(x, z, Math.abs(r.puntos[i1][0] - r.puntos[i0][0]) > Math.abs(r.puntos[i1][1] - r.puntos[i0][1]), r.tipo === 'velero', 100 + ri * 10 + q));
    }
  });
  m.tramos
    .filter((tr) => tr.tipo === 'barca')
    .forEach((tr, k) => {
      const p = vaivenEn(tr.a, tr.b, 1.4, 3, t + hash(k, 6.6) * 20);
      out.push(barca(p.x, p.z, Math.abs(tr.b[0] - tr.a[0]) >= Math.abs(tr.b[2] - tr.a[2]), m.tipo === 'puerto' && hash(k, 8.8) < 0.5, 300 + k));
    });
  return out.sort((a, b) => a.clave - b.clave);
}

/** Crecimiento con rebote (sale un poco y vuelve). */
function rebote(k: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
}

export function Diorama({ m, figuras, t, ciudad, nivel, lluvia, noche }: { m: Mundo; figuras: Figuras; t: number; ciudad: number; nivel: number | null; lluvia: number; noche: number }): ReactNode {
  const estaticos = useMemo(() => figuras.grupos.map((fg) => ({ fg, nodo: <Grupo key={fg.g} figura={fg} /> })), [figuras]);
  const movs = moviles(m, t, ciudad);
  const nodos: ReactNode[] = [];
  let k = 0;
  for (const { fg, nodo } of estaticos) {
    while (k < movs.length && movs[k].clave < fg.clave) nodos.push(movs[k++].nodo);
    if (fg.tipo === 'suelo' || fg.orden < 0 || ciudad >= 0.999) {
      nodos.push(nodo);
      continue;
    }
    const a = clamp01((ciudad * 1.06 - fg.orden) / 0.06);
    if (a <= 0) continue;
    if (a >= 1) {
      nodos.push(nodo);
      continue;
    }
    const s = Math.max(0, rebote(a));
    nodos.push(
      <g key={`c${fg.g}`} transform={`translate(${f(fg.pie[0])} ${f(fg.pie[1])}) scale(${s.toFixed(3)}) translate(${f(-fg.pie[0])} ${f(-fg.pie[1])})`}>
        {nodo}
      </g>,
    );
  }
  while (k < movs.length) nodos.push(movs[k++].nodo);
  return (
    <g>
      <Degradados figuras={figuras} noche={noche} />
      <Cubo m={m} figuras={figuras} t={t} nivel={nivel} lluvia={lluvia} noche={noche} />
      <Agua figuras={figuras} t={t} m={m} />
      {nodos}
    </g>
  );
}
