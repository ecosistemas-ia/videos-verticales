// Lo que se ve en cada plano de relato: las líneas que aparecen grises y se oscurecen (en la apertura llegan en arco
// desde la derecha), el producto que entra girando, la cinta, el círculo punteado, las tarjetas con escenas de papel, el
// dato que cuenta hasta su valor y el primer plano con las líneas en escalera. Medidas de MOTION (racconto/misure.ts):
// los cuerpos salen de la altura de la x que se quiere ver, no del tamaño de la letra.

import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import type { EscenaLista } from '../../comun/guion.ts';
import type { NombreProducto } from '../_papel/catalogo.ts';
import { PRODUCTOS } from '../_papel/catalogo.ts';
import { CURVAS, anima, escalaEntre, frenada, mezcla } from '../_papel/curvas.ts';
import { PintaDibujo, encajar } from '../_papel/dibujos.tsx';
import type { Caja, Paleta } from '../_papel/dibujos.tsx';
import { ESCENAS_DIBUJADAS, PRODUCTOS_DIBUJADOS } from '../_papel/dibujos_color.tsx';
import { anchoTexto, metricas } from '../_papel/fuentes.ts';
import type { Tipo } from '../_papel/fuentes.ts';
import { momentosDeTrozos } from '../_papel/lineas.ts';
import type { Linea } from '../_papel/lineas.ts';
import { LineaTexto, posarBloque } from '../_papel/texto.tsx';
import type { Alineacion } from '../_papel/texto.tsx';
import { balanceo, destelloMarco } from '../_papel/transiciones.ts';
import { CirculoPunteado, Cinta, SimboloDesvaido, cuotaCinta } from './piezas.tsx';
import type { Colores } from './piezas.tsx';
import { desfaseRelato, textoPantalla, textoVozRelato } from './reglas.ts';
import type { AjustesRelato, EscenaRelato, EstiloLinea } from './reglas.ts';

export const SERIFA = 'Gelasio Cursiva Papel';
export const GROTESCA = 'Grotesca Cursiva Papel';
export const LETRA_MARCA = 'Montserrat Papel';
export const X_CENTRO = 510;

const TIPOS: { readonly [e in EstiloLinea]: Tipo } = {
  pequena: { familia: GROTESCA, peso: 300, espaciado: -0.01 },
  media: { familia: GROTESCA, peso: 500, espaciado: -0.015 },
  grande: { familia: SERIFA, peso: 500, espaciado: -0.01 },
};
const SERIFA_FUERTE: Tipo = { familia: SERIFA, peso: 600, espaciado: -0.01 };

/** El cuerpo que da una altura de x (medida a 720 px de ancho, como en MOTION) en esta cara, a 1080. */
export function cuerpoX(x720: number, tipo: Tipo): number {
  return (x720 * 1.5) / Math.max(0.3, metricas(tipo.familia, tipo.peso).x);
}

type Tamanos = { readonly [e in EstiloLinea]: number };
const TAMANOS: { readonly [p in 'apertura' | 'producto' | 'primer_plano' | 'frase' | 'cierre']: Tamanos } = {
  apertura: { pequena: 19, media: 24, grande: 30 },
  producto: { pequena: 19, media: 23, grande: 27 },
  primer_plano: { pequena: 38, media: 44, grande: 52 },
  frase: { pequena: 21, media: 27, grande: 36 },
  cierre: { pequena: 17, media: 20, grande: 26 },
};

export interface Contexto {
  /** Las escenas de este bloque visual (varias si son tarjetas seguidas) y su primer fotograma visible. */
  readonly escenas: readonly EscenaLista<EscenaRelato>[];
  readonly limites: readonly number[];
  readonly indice: number;
  readonly f: number;
  readonly fps: number;
  readonly ajustes: AjustesRelato;
  readonly colores: Colores;
  readonly paleta: Paleta;
  /** El nombre de la marca (cierre). */
  readonly marca: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// Texto.

/** Los fotogramas en que aparece cada trozo: se adelantan a la voz y cada uno llega, como mucho, 0,2 s tras el anterior. */
function entradas(escena: EscenaLista<EscenaRelato>, limite: number, trozos: readonly string[], fps: number): number[] {
  const texto = textoVozRelato(escena.datos);
  const desfase = escena.voz?.desfase ?? desfaseRelato(escena.datos);
  const w = momentosDeTrozos(escena, texto, desfase, trozos).map((s) => Math.round(s * fps));
  const r: number[] = [];
  w.forEach((x, k) => r.push(k === 0 ? Math.max(limite + 3, x - 4) : Math.min(Math.max(r[k - 1] + 2, x - 6), r[k - 1] + Math.round(fps * 0.2))));
  return r;
}

/** Una línea que aparece gris y desenfocada en su sitio y se oscurece y se enfoca en 5 fotogramas. */
function estadoLinea(f: number, inicio: number, final: string, colores: Colores, arco: boolean): { readonly color: string; readonly estilo: Record<string, string | number> } | null {
  if (f < inicio) return null;
  const q = anima(f, [inicio, inicio + 5], [0, 1], CURVAS.frena);
  const estilo: Record<string, string | number> = {};
  const b = 5 * (1 - q);
  if (b > 0.05) estilo.filter = `blur(${b.toFixed(2)}px)`;
  if (arco) {
    // En la apertura llegan desde la derecha siguiendo un arco.
    const a = anima(f, [inicio, inicio + 13], [0, 1], CURVAS.frena);
    estilo.transform = `translate(${(360 * (1 - a)).toFixed(1)}px, ${(130 * (1 - a) * (1 - a)).toFixed(1)}px) rotate(${(10 * (1 - a)).toFixed(2)}deg)`;
    estilo.opacity = Math.min(1, a * 3);
  }
  return { color: q >= 1 ? final : mezcla(colores.entrada, final, q), estilo };
}

function colorDe(e: EstiloLinea, c: Colores): string {
  return e === 'pequena' ? c.gris : e === 'media' ? c.nero : c.titulo;
}

type Ancla = { readonly arriba: number } | { readonly abajo: number } | { readonly centro: number };

function BloqueRelato({ lineas, inicios, x, ancla, tamanos, f, colores, alineacion = 'centro', anchoMax = 820, sangria, arco = false, fuerte = false }: { readonly lineas: readonly Linea<EstiloLinea>[]; readonly inicios: readonly number[]; readonly x: number; readonly ancla: Ancla; readonly tamanos: Tamanos; readonly f: number; readonly colores: Colores; readonly alineacion?: Alineacion; readonly anchoMax?: number; readonly sangria?: (l: Linea<EstiloLinea>, k: number) => number; readonly arco?: boolean; readonly fuerte?: boolean }): ReactNode {
  if (lineas.length === 0) return null;
  const piezas = lineas.map((l) => {
    const tipo = l.estilo === 'grande' && fuerte ? SERIFA_FUERTE : TIPOS[l.estilo];
    return { texto: l.texto, tipo, cuerpo: cuerpoX(tamanos[l.estilo], tipo) * (l.tamano ?? 1), color: colorDe(l.estilo, colores) };
  });
  const b = posarBloque(piezas, anchoMax, (a, p) => Math.max(10, 0.15 * Math.min(a.cuerpo, p.cuerpo)));
  const y0 = 'arriba' in ancla ? ancla.arriba : 'abajo' in ancla ? ancla.abajo - b.alto : ancla.centro - b.alto / 2;
  return (
    <>
      {b.lineas.map((l, k) => {
        const e = estadoLinea(f, inicios[k] ?? 0, l.color, colores, arco);
        if (e === null) return null;
        return <LineaTexto key={k} linea={{ ...l, color: e.color }} x={x + (sangria ? sangria(lineas[k], k) : 0)} base={y0 + l.base} alineacion={alineacion} estilo={e.estilo} />;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Dibujos.

function Producto({ nombre, caja, id, paleta, t, giro = 0, filtro }: { readonly nombre: NombreProducto; readonly caja: Caja; readonly id: string; readonly paleta: Paleta; readonly t: number; readonly giro?: number; readonly filtro?: string }): ReactNode {
  const d = PRODUCTOS_DIBUJADOS[nombre];
  const r = encajar(d.w, d.h, caja);
  return <PintaDibujo dibujo={d} {...r} id={id} paleta={paleta} t={t} filtro={filtro ?? 'drop-shadow(0 22px 22px rgba(0,0,0,0.22))'} estilo={{ transform: `rotate(${giro.toFixed(2)}deg)`, transformOrigin: '50% 50%' }} />;
}

/** El contenido de una tarjeta: una escena de papel a sangre, un producto sobre la tarjeta o la imagen del guion. */
function ContenidoTarjeta({ datos, ancho, alto, id, paleta, t, porDefecto }: { readonly datos: Extract<EscenaRelato, { plano: 'tarjeta' }>; readonly ancho: number; readonly alto: number; readonly id: string; readonly paleta: Paleta; readonly t: number; readonly porDefecto: NombreProducto }): ReactNode {
  const zoom = 1 + 0.035 * Math.min(4, t);
  if (datos.imagen !== undefined) return <Img src={staticFile(datos.imagen)} style={{ position: 'absolute', inset: 0, width: ancho, height: alto, objectFit: 'cover', transform: `scale(${zoom.toFixed(4)})` }} />;
  const nombre = datos.dibujo ?? porDefecto;
  if ((PRODUCTOS as readonly string[]).includes(nombre)) {
    const d = PRODUCTOS_DIBUJADOS[nombre as NombreProducto];
    const r = encajar(d.w, d.h, { x: ancho / 2, y: alto / 2, w: ancho * 0.62, h: alto * 0.72 });
    return (
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(4)})` }}>
        <PintaDibujo dibujo={d} {...r} id={id} paleta={paleta} t={t} filtro="drop-shadow(0 18px 16px rgba(0,0,0,0.2))" />
      </div>
    );
  }
  const escena = ESCENAS_DIBUJADAS[nombre as keyof typeof ESCENAS_DIBUJADAS];
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${escena.w} ${escena.h}`} preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${zoom.toFixed(4)})` }}>
      {escena.pintar({ id, p: paleta, t })}
    </svg>
  );
}

/** La caja de las tarjetas (MOTION: 0,655 × 0,557 del cuadro), un poco más arriba para dejar libre la franja de abajo. */
const TARJETA: Caja = { x: ANCHO * 0.5, y: ALTO * 0.49, w: ANCHO * 0.655, h: ALTO * 0.53 };
const SOMBRA_GRANDE = '0 46px 70px rgba(0,0,0,0.26), 0 14px 22px rgba(0,0,0,0.14)';
const CINTA_TARJETA: readonly (readonly [number, number])[] = [
  [1220, 260],
  [960, 520],
  [560, 900],
  [180, 1180],
  [-140, 1330],
];
const CINTA_APERTURA: readonly (readonly [number, number])[] = [
  [-140, 500],
  [240, 640],
  [600, 870],
  [900, 1010],
  [1240, 1090],
];

function Tarjeta({ children, opacidadLampo, color }: { readonly children: ReactNode; readonly opacidadLampo: number; readonly color: string }): ReactNode {
  return (
    <div style={{ position: 'absolute', left: TARJETA.x - TARJETA.w / 2, top: TARJETA.y - TARJETA.h / 2, width: TARJETA.w, height: TARJETA.h, borderRadius: 42, boxShadow: SOMBRA_GRANDE, overflow: 'hidden', backgroundColor: color }}>
      {children}
      {opacidadLampo > 0 ? <div style={{ position: 'absolute', inset: 0, backgroundColor: '#FFF6EA', opacity: opacidadLampo }} /> : null}
    </div>
  );
}

/** Un número que cuenta hasta su valor conservando prefijo, sufijo, decimales y separador («21,4%», «+40», «3 de 10»). */
export function numeroContando(texto: string, q: number): string {
  const m = /^(.*?)(\d+(?:[.,]\d+)?)(.*)$/.exec(texto);
  if (m === null) return texto;
  const sep = m[2].includes(',') ? ',' : '.';
  const decimales = m[2].includes(sep) ? m[2].split(sep)[1].length : 0;
  const valor = Number.parseFloat(m[2].replace(',', '.'));
  const actual = (valor * Math.min(1, Math.max(0, q))).toFixed(decimales).replace('.', sep);
  return `${m[1]}${actual}${m[3]}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Planos.

export function ContenidoBloque(c: Contexto): ReactNode {
  const primera = c.escenas[0];
  const limite = c.limites[0];
  const d = primera.datos;
  const f = c.f;
  const t = Math.max(0, (f - limite) / c.fps);
  const id = `r${c.indice}`;
  const col = c.colores;
  const simbolo = c.ajustes.negocio.simbolo;
  switch (d.plano) {
    case 'apertura': {
      const ins = entradas(primera, limite, textoPantalla(d), c.fps);
      const nA = d.arriba.length;
      const producto = d.producto ?? c.ajustes.producto;
      const llega = anima(f, [limite, limite + Math.round(c.fps * 0.95)], [0, 1], CURVAS.frena);
      const giroProducto = -26 + 21 * llega + 2 * Math.min(1, t / 4);
      const caja: Caja = { x: ANCHO * 0.5, y: ALTO * 0.49, w: ANCHO * 0.27, h: ALTO * 0.25 };
      const copias: readonly (readonly [number, number, number, number])[] = [
        [ANCHO * 0.52, -10, 120, 32],
        [ANCHO * 0.02, ALTO * 0.86, 130, -38],
        [ANCHO * 1.0, ALTO * 0.3, 100, 64],
      ];
      return (
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `rotate(${balanceo(f, limite, c.fps).toFixed(3)}deg)` }}>
          <SimboloDesvaido cx={ANCHO * 0.5} cy={ALTO * 0.49} r={ANCHO * 0.34} simbolo={simbolo} claro={col.claro} conSimbolo={false} />
          {copias.map(([x, y, w, g], i) => (
            <Producto key={i} nombre={producto} caja={{ x, y, w, h: w * 1.4 }} id={`${id}-copia${i}`} paleta={c.paleta} t={t} giro={g} filtro="blur(1.5px) drop-shadow(0 8px 8px rgba(0,0,0,0.2))" />
          ))}
          <Cinta puntos={CINTA_APERTURA} cuota={cuotaCinta(f, limite + 4, 26)} grosor={ANCHO * 0.09} color={col.color} id={`${id}-cinta`} />
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${(-430 * (1 - llega)).toFixed(1)}px, ${(660 * (1 - llega)).toFixed(1)}px)` }}>
            <Producto nombre={producto} caja={caja} id={`${id}-prod`} paleta={c.paleta} t={t} giro={giroProducto} />
          </div>
          <BloqueRelato lineas={d.arriba} inicios={ins.slice(0, nA)} x={X_CENTRO} ancla={{ abajo: ALTO * 0.345 }} tamanos={TAMANOS.apertura} f={f} colores={col} arco />
          <BloqueRelato lineas={d.abajo} inicios={ins.slice(nA)} x={X_CENTRO} ancla={{ arriba: ALTO * 0.635 }} tamanos={TAMANOS.apertura} f={f} colores={col} arco />
        </div>
      );
    }
    case 'producto': {
      const ins = entradas(primera, limite, textoPantalla(d), c.fps);
      const nA = d.arriba.length;
      const productos = d.productos ?? [c.ajustes.producto];
      const q = anima(f, [limite + 3, limite + 14], [0, 1], CURVAS.suave);
      const escala = frenada(t, 1.06, 1, 0.5, 2);
      const cy = ALTO * 0.485;
      return (
        <>
          <SimboloDesvaido cx={ANCHO * 0.5} cy={cy} r={ANCHO * 0.36} simbolo={simbolo} claro={col.claro} conSimbolo />
          <CirculoPunteado cx={ANCHO * 0.5} cy={cy} r={ANCHO * 0.25} q={q} color={col.neroSuave} grosor={4} />
          <div style={{ position: 'absolute', inset: 0, transformOrigin: `50% ${cy}px`, transform: `scale(${escala.toFixed(4)})` }}>
            {productos[1] !== undefined ? <Producto nombre={productos[1]} caja={{ x: ANCHO * 0.28, y: cy + 14, w: ANCHO * 0.3, h: ALTO * 0.13 }} id={`${id}-p1`} paleta={c.paleta} t={t} giro={-24} /> : null}
            {productos[2] !== undefined ? <Producto nombre={productos[2]} caja={{ x: ANCHO * 0.72, y: cy + 14, w: ANCHO * 0.3, h: ALTO * 0.13 }} id={`${id}-p2`} paleta={c.paleta} t={t} giro={24} /> : null}
            <Producto nombre={productos[0]} caja={{ x: ANCHO * 0.5, y: cy, w: ANCHO * 0.34, h: ALTO * 0.19 }} id={`${id}-p0`} paleta={c.paleta} t={t} />
          </div>
          <BloqueRelato lineas={d.arriba} inicios={ins.slice(0, nA)} x={X_CENTRO} ancla={{ abajo: cy - ANCHO * 0.27 }} tamanos={TAMANOS.producto} f={f} colores={col} />
          <BloqueRelato lineas={d.abajo} inicios={ins.slice(nA)} x={X_CENTRO} ancla={{ arriba: cy + ANCHO * 0.29 }} tamanos={TAMANOS.producto} f={f} colores={col} />
        </>
      );
    }
    case 'tarjeta': {
      // Las tarjetas seguidas comparten la tarjeta: cambian contenido y título con un destello dentro del marco.
      let k = 0;
      for (let i = 1; i < c.escenas.length; i++) if (f >= c.limites[i]) k = i;
      const activa = c.escenas[k];
      const datos = activa.datos.plano === 'tarjeta' ? activa.datos : null;
      if (datos === null) return null;
      const lim = c.limites[k];
      const lampo = c.limites.slice(1).reduce((m, l) => Math.max(m, destelloMarco(f, l)), 0);
      const tTarjeta = Math.max(0, (f - lim) / c.fps);
      const entrada = Math.max(lim + (k === 0 ? 4 : 1), entradas(activa, lim, [datos.titulo], c.fps)[0]);
      return (
        <>
          <Cinta puntos={CINTA_TARJETA} cuota={cuotaCinta(f, limite + 2, 24)} grosor={ANCHO * 0.09} color={col.color} id={`${id}-cinta`} />
          <Tarjeta opacidadLampo={lampo} color={col.carta}>
            <ContenidoTarjeta datos={datos} ancho={TARJETA.w} alto={TARJETA.h} id={`${id}-t${k}`} paleta={c.paleta} t={tTarjeta} porDefecto={c.ajustes.producto} />
          </Tarjeta>
          <BloqueRelato lineas={[{ texto: datos.titulo, estilo: 'pequena' }]} inicios={[entrada]} x={ANCHO * 0.5} ancla={{ abajo: TARJETA.y - TARJETA.h / 2 - 30 }} tamanos={{ pequena: 21, media: 21, grande: 21 }} f={f} colores={{ ...col, gris: col.neroSuave }} anchoMax={TARJETA.w + 120} />
        </>
      );
    }
    case 'dato': {
      const trozos = textoPantalla(d);
      const ins = entradas(primera, limite, trozos, c.fps);
      const iNumero = trozos.length - 1;
      const cuenta = Math.max(limite + 8, ins[iNumero] - 18);
      const q = anima(f, [cuenta, cuenta + 34], [0, 1], CURVAS.frena);
      const tipoNumero = SERIFA_FUERTE;
      const cuerpoNumero = Math.min(cuerpoX(66, tipoNumero), (100 * TARJETA.w * 0.84) / Math.max(1, anchoTexto(d.numero, 100, tipoNumero)));
      const yNumero = TARJETA.y - 20;
      return (
        <>
          <Cinta puntos={CINTA_TARJETA} cuota={cuotaCinta(f, limite + 2, 24)} grosor={ANCHO * 0.09} color={col.color} id={`${id}-cinta`} />
          <Tarjeta opacidadLampo={0} color={col.carta}>
            <div style={{ position: 'absolute', left: 0, width: TARJETA.w, top: yNumero - (TARJETA.y - TARJETA.h / 2) - cuerpoNumero * 0.62, textAlign: 'center', fontFamily: `"${SERIFA}"`, fontWeight: 600, fontSize: cuerpoNumero, lineHeight: `${cuerpoNumero}px`, letterSpacing: '-0.01em', color: col.titulo, opacity: f >= cuenta ? 1 : 0 }}>
              {numeroContando(d.numero, q)}
            </div>
            <div style={{ position: 'absolute', left: 0, width: TARJETA.w, bottom: 38, textAlign: 'center', fontFamily: `"${GROTESCA}"`, fontWeight: 300, fontSize: 26, color: col.gris, opacity: anima(f, [cuenta + 20, cuenta + 34], [0, 1], CURVAS.suave) }}>Fuente: {d.fuente}</div>
          </Tarjeta>
          <BloqueRelato lineas={[{ texto: d.etiqueta, estilo: 'pequena' }]} inicios={[ins[d.titulo === undefined ? 0 : 1]]} x={ANCHO * 0.5} ancla={{ arriba: yNumero + cuerpoNumero * 0.38 }} tamanos={{ pequena: 19, media: 19, grande: 19 }} f={f} colores={col} anchoMax={TARJETA.w * 0.84} />
          {d.titulo !== undefined ? <BloqueRelato lineas={[{ texto: d.titulo, estilo: 'pequena' }]} inicios={[ins[0]]} x={ANCHO * 0.5} ancla={{ abajo: TARJETA.y - TARJETA.h / 2 - 30 }} tamanos={{ pequena: 21, media: 21, grande: 21 }} f={f} colores={{ ...col, gris: col.neroSuave }} anchoMax={TARJETA.w + 120} /> : null}
        </>
      );
    }
    case 'primer_plano': {
      const ins = entradas(primera, limite, textoPantalla(d), c.fps);
      const producto = d.producto ?? c.ajustes.producto;
      const caja: Caja = { x: ANCHO * 0.13, y: ALTO * 0.5, w: ANCHO * 0.62, h: ALTO * 0.66 };
      return (
        <>
          <SimboloDesvaido cx={ANCHO * 0.62} cy={ALTO * 0.47} r={ANCHO * 0.33} simbolo={simbolo} claro={col.claro} conSimbolo />
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(8 * t).toFixed(1)}px) scale(${escalaEntre(1.04, 1, Math.min(1, t / 3)).toFixed(4)})`, transformOrigin: `${caja.x}px ${caja.y}px` }}>
            <Producto nombre={producto} caja={caja} id={`${id}-prod`} paleta={c.paleta} t={t} giro={-3} filtro="drop-shadow(0 30px 30px rgba(0,0,0,0.25))" />
          </div>
          <BloqueRelato lineas={d.lineas} inicios={ins} x={ANCHO * 0.47} ancla={{ centro: ALTO * 0.44 }} alineacion="izquierda" tamanos={TAMANOS.primer_plano} f={f} colores={col} anchoMax={ANCHO * 0.42} sangria={(l, k) => (l.estilo === 'grande' ? 0 : ANCHO * 0.07 * (k % 2 === 0 ? 0.5 : 1.6))} fuerte />
        </>
      );
    }
    case 'frase': {
      const ins = entradas(primera, limite, textoPantalla(d), c.fps);
      return (
        <>
          <SimboloDesvaido cx={ANCHO * 0.5} cy={ALTO * 0.47} r={ANCHO * 0.34} simbolo={simbolo} claro={col.claro} conSimbolo />
          <BloqueRelato lineas={d.lineas} inicios={ins} x={X_CENTRO} ancla={{ centro: ALTO * 0.47 }} tamanos={TAMANOS.frase} f={f} colores={col} />
        </>
      );
    }
    case 'cierre': {
      const ins = entradas(primera, limite, textoPantalla(d), c.fps);
      const qMarca = anima(f, [limite + 8, limite + 20], [0, 1], CURVAS.frena);
      const qWeb = anima(f, [limite + 18, limite + 30], [0, 1], CURVAS.frena);
      const cuerpoMarca = Math.min(96, (ANCHO * 0.62) / Math.max(1, c.marca.length * 0.62));
      return (
        <>
          <BloqueRelato lineas={d.lineas} inicios={ins} x={ANCHO * 0.5} ancla={{ abajo: ALTO * 0.45 }} tamanos={TAMANOS.cierre} f={f} colores={col} />
          {c.marca !== '' ? (
            <div style={{ position: 'absolute', left: 0, width: ANCHO, top: ALTO * 0.49 - cuerpoMarca / 2, height: cuerpoMarca, lineHeight: `${cuerpoMarca}px`, textAlign: 'center', fontFamily: `"${LETRA_MARCA}"`, fontWeight: 700, fontSize: cuerpoMarca, letterSpacing: '-0.04em', color: col.nero, opacity: qMarca, filter: qMarca < 1 ? `blur(${(10 * (1 - qMarca)).toFixed(2)}px)` : undefined }}>
              {c.marca}
            </div>
          ) : null}
          {d.web !== undefined ? (
            <div style={{ position: 'absolute', left: 0, width: ANCHO, top: ALTO * 0.49 + cuerpoMarca * 0.75, textAlign: 'center', fontFamily: `"${GROTESCA}"`, fontWeight: 300, fontSize: 36, color: col.gris, opacity: qWeb }}>
              {d.web}
            </div>
          ) : null}
        </>
      );
    }
  }
}
