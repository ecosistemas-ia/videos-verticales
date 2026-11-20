// Los planos del estilo. Casi todos apilan en vertical el texto de encima, el objeto y el texto de debajo (la «pila»),
// y vuelven a centrar el grupo cuando llega un renglón nuevo. Los objetos entran por la derecha creciendo y salen por
// la izquierda antes de un corte; las fichas y las estrellas entran de golpe en su palabra; el personaje pixel crece
// inclinado y se balancea; los números suben de 0 a su valor frenando.

import type { CSSProperties, ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { ALTO, ANCHO, type EscenaLista } from '../../comun/guion.ts';
import { Paginas, Pila, alturaMaxima, componer, paginar, paginasEnEscena, piezaObjeto, piezaTexto, renglonesDe, type Bloque, type OpcionesTexto, type Pagina } from './bloque.tsx';
import { Destello, Estrella4, GrillaCruces, Icono, PersonajePixel, PROPORCION_PERSONAJE } from './figuras.tsx';
import { ROBOTO, anchoTexto } from './fuentes.ts';
import { Buscador, Captura, Chat, Navegador, PROPORCIONES, Terminal, altoCaptura } from './interfaces.tsx';
import type { PalabraMarcada } from './marcado.ts';
import { CURVAS, anima, deGolpe, desdeDerecha, haciaIzquierda, QUIETO, sombraFiltro, sombraGrande, type EstadoObjeto } from './movimientos.ts';
import { palabrasDeMarcas, partesLista, type AjustesPantallas, type EscenaPantallas, type Transicion } from './reglas.ts';

/** El centro de la composición: x en el centro del cuadro; y en el centro de la zona segura (220-1500). */
export const CX = ANCHO / 2;
export const CENTRO_PILA = 860;
/** Alto útil de la pila (zona segura, con un margen). */
const ALTO_UTIL = 1230;
/** Ancho máximo de un renglón: deja libre la franja de la derecha que tapan los botones. */
export const ANCHO_TEXTO = 840;
const ESPACIO_OBJETO = 60;

export interface Contexto {
  readonly f: number;
  readonly fps: number;
  readonly escena: EscenaLista<EscenaPantallas>;
  /** Fotogramas de inicio y fin de la escena. */
  readonly inicio: number;
  readonly fin: number;
  readonly transicion: Transicion;
  readonly siguiente: Transicion | null;
  readonly palabras: readonly PalabraMarcada[];
  /** El fotograma en que entra la palabra k. */
  readonly entra: (k: number) => number;
  readonly acento: string;
  readonly ajustes: AjustesPantallas;
  readonly tamanos: ReadonlyMap<string, readonly [number, number]>;
}

type Datos<P extends EscenaPantallas['plano']> = Extract<EscenaPantallas, { plano: P }>;

/** Los segundos de movimiento lento desde `desde`: crecen con curva suave en toda la escena (nada se queda quieto). */
function segundosDeMovimiento(c: Contexto, desde: number): number {
  const fin = Math.max(desde + 1, c.fin);
  return anima(c.f, [desde, fin], [0, (fin - desde) / c.fps], CURVAS.respiro);
}

/** El texto de un plano con objeto, partido en las páginas de encima y las de debajo. */
function textosConObjeto(c: Contexto, arriba: number, opciones: OpcionesTexto = { maximo: ANCHO_TEXTO }): { encima: Pagina[]; debajo: Pagina[] } {
  // Las `arriba` primeras líneas marcadas con «/» van encima (sin «/», los `arriba` primeros renglones).
  const grupos = renglonesDe(c.palabras, lineasDe(c), conCortes(c), opciones);
  const renglones = grupos.length === 1 ? grupos[0].map((r) => [r]) : grupos;
  const n = Math.min(arriba, renglones.length);
  return {
    encima: paginasEnEscena(c.palabras, paginar(renglones.slice(0, n).flat(), 3), opciones, c.entra),
    debajo: paginasEnEscena(c.palabras, paginar(renglones.slice(n).flat(), 3), opciones, c.entra),
  };
}

function lineasDe(c: Contexto): readonly (readonly number[])[] {
  const porLinea = new Map<number, number[]>();
  c.palabras.forEach((p, k) => porLinea.set(p.linea, [...(porLinea.get(p.linea) ?? []), k]));
  return [...porLinea.keys()].sort((a, b) => a - b).map((l) => porLinea.get(l) ?? []);
}

function conCortes(c: Contexto): boolean {
  return c.palabras.some((p) => p.linea > 0);
}

/** Cuánto alto le queda al objeto, con el texto de encima y de debajo en su página más alta. */
function altoLibre(encima: readonly Pagina[], debajo: readonly Pagina[]): number {
  const hE = alturaMaxima(encima);
  const hD = alturaMaxima(debajo);
  return ALTO_UTIL - hE - hD - (hE > 0 ? ESPACIO_OBJETO : 0) - (hD > 0 ? ESPACIO_OBJETO : 0);
}

/** La pila estándar: encima, objeto, debajo. */
function PilaConObjeto({ c, encima, debajo, alto, dibuja, cy = CENTRO_PILA }: { readonly c: Contexto; readonly encima: readonly Pagina[]; readonly debajo: readonly Pagina[]; readonly alto: number; readonly dibuja: (y: number) => ReactNode; readonly cy?: number }): ReactNode {
  return (
    <Pila
      cy={cy}
      piezas={[piezaTexto(encima, c.f, c.entra, CX, 0), piezaObjeto(c.f, c.inicio, alto, ESPACIO_OBJETO, dibuja), piezaTexto(debajo, c.f, c.entra, CX, ESPACIO_OBJETO)]}
    />
  );
}

/** El contenedor de un objeto centrado en cx con su estado de entrada y su salida. */
function Objeto({ cx, arriba, w, h, estado, salida, children, style }: { readonly cx: number; readonly arriba: number; readonly w: number; readonly h: number; readonly estado: EstadoObjeto; readonly salida?: { dx: number; desenfoque: number }; readonly children: ReactNode; readonly style?: CSSProperties }): ReactNode {
  if (!estado.visible) return null;
  const dx = (estado.dx + (salida?.dx ?? 0)) * ANCHO;
  const desenfoque = estado.desenfoque + (salida?.desenfoque ?? 0);
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: arriba,
        width: w,
        height: h,
        transform: `translate(${dx.toFixed(2)}px, ${(estado.dy * ALTO).toFixed(2)}px) scale(${estado.escala.toFixed(4)})`,
        transformOrigin: '50% 50%',
        opacity: estado.opacidad,
        filter: desenfoque > 0.05 ? `blur(${desenfoque.toFixed(2)}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** La entrada de un objeto: por la derecha si la escena entra con corte; si no, ya en su sitio. */
function entradaObjeto(c: Contexto, entra: number, duracion = 12, escalaDesde = 0.85): EstadoObjeto {
  return c.transicion === 'corte' || entra > c.inicio + 1 ? desdeDerecha(c.f, entra, duracion, escalaDesde) : { ...QUIETO, visible: c.f >= entra };
}

/** La salida por la izquierda antes de un corte. */
function salidaObjeto(c: Contexto): { dx: number; desenfoque: number } {
  return c.siguiente === 'corte' ? haciaIzquierda(c.f, c.fin) : { dx: 0, desenfoque: 0 };
}

// ---------------------------------------------------------------------------------------------------------------------

export function Frase({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'frase'>;
  const renglones = renglonesDe(c.palabras, lineasDe(c), conCortes(c), { maximo: ANCHO_TEXTO }).flat();
  const paginas = paginasEnEscena(c.palabras, paginar(renglones, 4), { maximo: ANCHO_TEXTO }, c.entra);
  if (d.destello) {
    const lado = 460;
    const q = anima(c.f, [c.inicio, c.inicio + 9], [0, 1], CURVAS.frena);
    const giro = 24 * segundosDeMovimiento(c, c.inicio);
    return (
      <Pila
        cy={CENTRO_PILA}
        piezas={[
          piezaObjeto(c.f, c.inicio, lado, 0, (y) => (
            <div style={{ position: 'absolute', left: CX - lado / 2, top: y, transform: `scale(${(0.6 + 0.4 * q).toFixed(4)})`, opacity: q }}>
              <Destello lado={lado} color={colorPersonaje(c)} giro={giro} />
            </div>
          )),
          piezaTexto(paginas, c.f, c.entra, CX, 70),
        ]}
      />
    );
  }
  return <Pila cy={CENTRO_PILA} piezas={[piezaTexto(paginas, c.f, c.entra, CX, 0)]} />;
}

// ---------------------------------------------------------------------------------------------------------------------

export function PlanoPantalla({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'pantalla'>;
  const { encima, debajo } = textosConObjeto(c, d.arriba);
  const p = d.pantalla;
  let w = 860;
  let h: number;
  if (p.tipo === 'captura') h = altoCaptura(w, c.tamanos.get(p.imagen) ?? [1600, 1000]);
  else h = Math.round(w * PROPORCIONES[p.tipo]);
  // Si con el texto no cabe, la pantalla se encoge entera (también lo de dentro).
  const libre = altoLibre(encima, debajo);
  if (h > libre) {
    const k = Math.max(0.6, libre / h);
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  const entra = c.inicio;
  const estado = entradaObjeto(c, entra);
  const t = Math.max(0, (c.f - entra) / c.fps);
  const dur = Math.max(0.5, (c.fin - entra) / c.fps);
  const comun = { ancho: w, alto: h, t, dur, acento: c.acento };
  const interfaz =
    p.tipo === 'navegador' ? (
      <Navegador {...comun} direccion={p.direccion} titulo={p.titulo} lineas={p.lineas} />
    ) : p.tipo === 'chat' ? (
      <Chat {...comun} nombre={p.nombre} pregunta={p.pregunta} respuesta={p.respuesta} />
    ) : p.tipo === 'buscador' ? (
      <Buscador {...comun} consulta={p.consulta} respuesta={p.respuesta} resultados={p.resultados} />
    ) : p.tipo === 'terminal' ? (
      <Terminal {...comun} lineas={p.lineas} />
    ) : (
      <Captura {...comun} imagen={p.imagen} direccion={p.direccion} tamano={c.tamanos.get(p.imagen) ?? [1600, 1000]} />
    );
  return (
    <PilaConObjeto
      c={c}
      encima={encima}
      debajo={debajo}
      alto={h}
      dibuja={(y) => (
        <Objeto cx={CX} arriba={y} w={w} h={h} estado={estado} salida={salidaObjeto(c)} style={{ boxShadow: sombraGrande() }}>
          {interfaz}
        </Objeto>
      )}
    />
  );
}

// ---------------------------------------------------------------------------------------------------------------------

/** Las iniciales de un nombre: una letra, o dos si son varias palabras. */
function iniciales(nombre: string, maximo = 2): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 1) return [...partes[0]].slice(0, 1).join('').toLocaleUpperCase('es');
  return partes
    .slice(0, maximo)
    .map((x) => [...x][0] ?? '')
    .join('')
    .toLocaleUpperCase('es');
}

export function Marcas({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'marcas'>;
  const { encima, debajo } = textosConObjeto(c, d.arriba);
  const n = d.marcas.length;
  const filas = n === 4 ? 2 : 1;
  const porFila = n === 4 ? 2 : n;
  let lado = n === 1 ? 250 : n === 2 ? 220 : n === 3 ? 196 : 190;
  const nombre = 42;
  const altoFicha = (l: number): number => l + 22 + nombre * 1.2;
  const separacion = 60;
  let alto = filas * altoFicha(lado) + (filas - 1) * 40;
  const libre = altoLibre(encima, debajo);
  if (alto > libre) {
    lado = Math.max(120, lado * (libre / alto));
    alto = filas * altoFicha(lado) + (filas - 1) * 40;
  }
  const palabraDe = palabrasDeMarcas(d);
  const paso = Math.max(lado + separacion, Math.min(300, 840 / porFila));
  const fichas = (y: number): ReactNode => (
    <>
      <GrillaCruces cx={CX} cy={y + alto / 2} columnas={9} filas={Math.max(4, Math.ceil(alto / 90) + 2)} />
      {d.marcas.map((m, i) => {
        const fila = Math.floor(i / porFila);
        const col = i % porFila;
        const enFila = fila === filas - 1 ? n - fila * porFila : porFila;
        const x = CX + (col - (enFila - 1) / 2) * paso;
        const top = y + fila * (altoFicha(lado) + 40);
        const st = deGolpe(c.f, c.entra(palabraDe[i]));
        if (!st.visible) return null;
        const redonda = i % 2 === 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x - lado / 2, top, width: lado, transform: `scale(${st.escala.toFixed(4)})`, opacity: st.opacidad }}>
            {m.imagen ? (
              <Img src={staticFile(m.imagen)} style={{ width: lado, height: lado, objectFit: 'contain', display: 'block', filter: sombraFiltro(0.55, 1, 0.8) }} />
            ) : (
              <div style={{ width: lado, height: lado, borderRadius: redonda ? '50%' : lado * 0.24, background: '#0E0E0E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sombraGrande(0.55) }}>
                {m.icono ? (
                  <Icono nombre={m.icono} lado={lado * 0.52} color="#FFFFFF" />
                ) : (
                  <div style={{ fontFamily: ROBOTO, fontWeight: 700, fontSize: lado * (iniciales(m.nombre).length > 1 ? 0.36 : 0.46), letterSpacing: '-0.03em', color: '#FFFFFF' }}>{iniciales(m.nombre)}</div>
                )}
              </div>
            )}
            <div style={{ marginTop: 22, textAlign: 'center', fontFamily: ROBOTO, fontWeight: 500, fontSize: nombre, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#262626', whiteSpace: 'nowrap', marginLeft: -100, marginRight: -100 }}>{m.nombre}</div>
          </div>
        );
      })}
    </>
  );
  return <PilaConObjeto c={c} encima={encima} debajo={debajo} alto={alto} dibuja={fichas} />;
}

// ---------------------------------------------------------------------------------------------------------------------

export function Persona({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'persona'>;
  const { encima, debajo } = textosConObjeto(c, d.arriba);
  const libre = altoLibre(encima, debajo);
  const k = Math.min(1, Math.max(0.6, libre / 660));
  const lado = 520 * k;
  const avatar = 320 * k;
  const cuerpoNombre = 50 * k;
  const cuerpoCargo = 34 * k;
  // El cargo va debajo de los rayos del destello, para que se lea.
  const arribaCargo = Math.max(lado / 2 + avatar / 2 + cuerpoNombre * 1.15 + 16 * k, lado * 0.97);
  const alto = d.cargo ? arribaCargo + cuerpoCargo * 1.3 : lado * 0.5 + avatar / 2 + cuerpoNombre * 1.1 + 10;
  // La cámara empieza cerca y se aleja (el retrato del original: ×0,80 en 1,6 s, casi todo en el primer segundo).
  const q = anima(c.f, [c.inicio, c.inicio + Math.round(1.4 * c.fps)], [0, 1], CURVAS.frena);
  const escala = 1.18 - 0.18 * q;
  const giro = -8 + 12 * segundosDeMovimiento(c, c.inicio);
  const foto = d.imagen;
  const dibuja = (y: number): ReactNode => (
    <Objeto cx={CX} arriba={y} w={ANCHO} h={alto} estado={entradaObjeto(c, c.inicio, 12, 0.92)} salida={salidaObjeto(c)}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${escala.toFixed(4)})`, transformOrigin: `50% ${lado * 0.5}px` }}>
        <div style={{ position: 'absolute', left: CX - lado / 2, top: 0 }}>
          <Destello lado={lado} color={colorPersonaje(c)} giro={giro} />
        </div>
        <div style={{ position: 'absolute', left: CX - avatar / 2, top: lado / 2 - avatar / 2, width: avatar, height: avatar, borderRadius: '50%', overflow: 'hidden', border: `${10 * k}px solid #FFFFFF`, boxSizing: 'border-box', boxShadow: sombraGrande(0.8), background: 'linear-gradient(160deg, #F1F1F1 0%, #CFCFCF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {foto ? (
            <Img src={staticFile(foto)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%', filter: 'grayscale(1) contrast(1.05)', transform: `scale(${(1 + 0.03 * segundosDeMovimiento(c, c.inicio)).toFixed(5)})` }} />
          ) : (
            <div style={{ fontFamily: ROBOTO, fontWeight: 600, fontSize: avatar * 0.36, letterSpacing: '-0.03em', color: '#2B2B2B' }}>{iniciales(d.nombre)}</div>
          )}
        </div>
        <div style={{ position: 'absolute', left: 0, width: ANCHO, top: lado / 2 + avatar / 2 - cuerpoNombre * 0.4, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', color: '#111111', fontFamily: ROBOTO, fontWeight: 600, fontSize: cuerpoNombre, letterSpacing: '-0.02em', lineHeight: 1.1, padding: `${cuerpoNombre * 0.28}px ${cuerpoNombre * 0.6}px`, borderRadius: cuerpoNombre, boxShadow: sombraGrande(0.45, 1, 0.8), whiteSpace: 'nowrap' }}>{d.nombre}</div>
        </div>
        {d.cargo ? (
          <div style={{ position: 'absolute', left: 0, width: ANCHO, top: arribaCargo, textAlign: 'center', fontFamily: ROBOTO, fontWeight: 500, fontSize: cuerpoCargo, color: '#6A6A6A', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{d.cargo}</div>
        ) : null}
      </div>
    </Objeto>
  );
  return <PilaConObjeto c={c} encima={encima} debajo={debajo} alto={alto} dibuja={dibuja} />;
}

// ---------------------------------------------------------------------------------------------------------------------

function colorPersonaje(c: Contexto): string {
  return c.ajustes.color_personaje ?? c.acento;
}

/** Parpadeo del personaje: cada ~2,6 s cierra los ojos 4 fotogramas (determinista). */
function parpadeo(f: number, fase: number): number {
  const ciclo = 78;
  const x = (f + fase) % ciclo;
  return x < 4 ? Math.sin((x / 4) * Math.PI) : 0;
}

export function Personaje({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'personaje'>;
  const { encima, debajo } = textosConObjeto(c, d.arriba);
  const libre = altoLibre(encima, debajo);
  const color = colorPersonaje(c);
  const ojos = c.ajustes.color_ojos;
  const entra = c.inicio;
  if (d.cantidad === 1) {
    const caja = Math.min(500, libre);
    const w = caja * 0.94;
    const h = w * PROPORCION_PERSONAJE;
    const q = anima(c.f, [entra, entra + 9], [0, 1], CURVAS.frena);
    const s = (c.f - entra) / c.fps;
    const oscila = Math.sin(s * Math.PI * 0.9) * 4 * q;
    const salta = Math.sin(s * Math.PI * 2.2) * 9 * q;
    const dibuja = (y: number): ReactNode =>
      c.f < entra ? null : (
        <>
          <GrillaCruces cx={CX} cy={y + caja / 2} columnas={9} filas={6} />
          <div style={{ position: 'absolute', left: CX - w / 2, top: y + (caja - h) / 2, transform: `translateY(${salta.toFixed(2)}px) rotate(${(-26 + oscila).toFixed(2)}deg) scale(${(0.25 + 0.75 * q).toFixed(4)})`, transformOrigin: '50% 50%' }}>
            <PersonajePixel ancho={w} color={color} ojos={ojos} parpadeo={parpadeo(c.f, 30)} />
          </div>
        </>
      );
    return <PilaConObjeto c={c} encima={encima} debajo={debajo} alto={caja} dibuja={dibuja} />;
  }
  // Varios: una cuadrícula que se llena uno a uno, fila a fila, en ~2 s.
  const n = d.cantidad;
  const columnas = n <= 4 ? n : n <= 9 ? 3 : 4;
  const filas = Math.ceil(n / columnas);
  let paso = 205;
  if (filas * paso > libre) paso = Math.max(120, libre / filas);
  const lado = paso * 0.83;
  const alto = filas * paso;
  const durLlenado = Math.round(Math.min(2, Math.max(0.6, (c.fin - c.inicio) / c.fps - 0.6)) * c.fps);
  const dibuja = (y: number): ReactNode => (
    <>
      <GrillaCruces cx={CX} cy={y + alto / 2} columnas={9} filas={Math.ceil(alto / 90) + 2} />
      {Array.from({ length: n }, (_, i) => {
        const e = entra + Math.round((i / n) * durLlenado);
        const st = deGolpe(c.f, e);
        if (!st.visible) return null;
        const col = i % columnas;
        const fila = Math.floor(i / columnas);
        const salto = Math.sin(((c.f - e) / c.fps) * Math.PI * 1.8 + i * 1.3) * 5;
        const x = CX + (col - (columnas - 1) / 2) * paso;
        const top = y + fila * paso + (paso - lado * PROPORCION_PERSONAJE) / 2;
        return (
          <div key={i} style={{ position: 'absolute', left: x - lado / 2, top, transform: `translateY(${salto.toFixed(2)}px) scale(${st.escala.toFixed(4)})`, opacity: st.opacidad }}>
            <PersonajePixel ancho={lado} color={color} ojos={ojos} parpadeo={parpadeo(c.f, i * 17)} />
          </div>
        );
      })}
    </>
  );
  return <PilaConObjeto c={c} encima={encima} debajo={debajo} alto={alto} dibuja={dibuja} />;
}

// ---------------------------------------------------------------------------------------------------------------------

function escribirNumero(valor: number, decimales: number, formato: AjustesPantallas['numeros']): string {
  return new Intl.NumberFormat(formato, { minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: true }).format(valor);
}

export function Numero({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'numero'>;
  const { encima, debajo } = textosConObjeto(c, d.arriba);
  // El contador arranca al empezar la escena y sube frenando (como mucho 2,4 s); llega ~0,6 s antes del final y se queda.
  const entra = c.inicio + 3;
  const duracion = Math.max(Math.round(0.8 * c.fps), Math.min(Math.round(2.4 * c.fps), c.fin - entra - Math.round(0.6 * c.fps)));
  const avance = anima(c.f, [entra, entra + duracion], [0, 1], CURVAS.frena);
  const q = avance > 0.997 ? 1 : avance;
  const paso = Math.pow(10, -d.decimales);
  const final = `${d.prefijo}${escribirNumero(d.valor, d.decimales, c.ajustes.numeros)}${d.sufijo}`;
  const ahora = `${d.prefijo}${escribirNumero(Math.round((d.valor * q) / paso) * paso, d.decimales, c.ajustes.numeros)}${d.sufijo}`;
  const anchoFinal = anchoTexto(final, 100, 600, false, -0.035);
  const cuerpo = Math.min(260, (ANCHO_TEXTO / anchoFinal) * 100);
  const alto = cuerpo * 1.02;
  const st = deGolpe(c.f, entra);
  const dibuja = (y: number): ReactNode => (
    <>
      <GrillaCruces cx={CX} cy={y + alto / 2} columnas={9} filas={5} opacidad={0.8} />
      {st.visible ? (
        <div style={{ position: 'absolute', left: 0, width: ANCHO, top: y + alto / 2 - cuerpo * 0.6, textAlign: 'center', fontFamily: ROBOTO, fontWeight: 600, fontSize: cuerpo, lineHeight: `${cuerpo * 1.2}px`, letterSpacing: '-0.035em', color: '#000000', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', transform: `scale(${st.escala.toFixed(4)})`, opacity: st.opacidad }}>
          {ahora}
        </div>
      ) : null}
    </>
  );
  return <PilaConObjeto c={c} encima={encima} debajo={debajo} alto={alto} dibuja={dibuja} />;
}

// ---------------------------------------------------------------------------------------------------------------------

export function Lista({ c }: { readonly c: Contexto }): ReactNode {
  const d = c.escena.datos as Datos<'lista'>;
  const { cabecera, puntos } = partesLista(d);
  const x0 = 110;
  const estrella = 80;
  const xTexto = x0 + estrella * 1.55;
  const anchoPunto = ANCHO - xTexto - 150;
  const opPunto: OpcionesTexto = { maximo: anchoPunto, punto: true };
  const bloqueCabecera = cabecera ? componer(c.palabras, renglonesDe(c.palabras, [cabecera], false, { maximo: ANCHO_TEXTO }).flat(), { maximo: ANCHO_TEXTO }) : null;
  const bloques = puntos.map((p) => componer(c.palabras, renglonesDe(c.palabras, [p], false, { ...opPunto, objetivo: anchoPunto }).flat(), opPunto));
  const pasoMin = 190;
  const alturas = bloques.map((b) => Math.max(pasoMin, b.altura + 70));
  const altoPuntos = alturas.reduce((s, h) => s + h, 0) - (alturas.length > 0 ? alturas[alturas.length - 1] - bloques[bloques.length - 1].altura : 0);
  const altoCabecera = bloqueCabecera ? bloqueCabecera.altura + 90 : 0;
  const total = altoCabecera + altoPuntos;
  const arriba = Math.max(250, CENTRO_PILA - total / 2);
  let y = arriba + altoCabecera;
  const tops = alturas.map((h) => {
    const t = y;
    y += h;
    return t;
  });
  return (
    <>
      {bloqueCabecera ? <Paginas1 c={c} b={bloqueCabecera} x={CX} y={arriba} /> : null}
      {bloques.map((b, i) => {
        const e = c.entra(b.primera);
        const st = deGolpe(c.f, e);
        if (!st.visible) return null;
        const r = b.renglones[0];
        const cy = tops[i] + r.base - r.cuerpoMax * 0.27;
        return (
          <div key={i}>
            <div style={{ position: 'absolute', left: x0, top: cy - estrella / 2, transform: `scale(${st.escala.toFixed(4)})`, opacity: st.opacidad }}>
              <Estrella4 lado={estrella} />
            </div>
            <Paginas1 c={c} b={b} x={xTexto} y={tops[i]} alinear="izquierda" />
          </div>
        );
      })}
    </>
  );
}

/** Un bloque solo, que entra con su primera palabra y se queda. */
function Paginas1({ c, b, x, y, alinear = 'centro' }: { readonly c: Contexto; readonly b: Bloque; readonly x: number; readonly y: number; readonly alinear?: 'centro' | 'izquierda' }): ReactNode {
  return <Paginas paginas={[{ b, desde: c.entra(b.primera), hasta: Number.POSITIVE_INFINITY }]} f={c.f} entra={c.entra} x={x} y={y} alinear={alinear} />;
}

// ---------------------------------------------------------------------------------------------------------------------

export function Cierre({ c, nombreMarca }: { readonly c: Contexto; readonly nombreMarca: string }): ReactNode {
  const d = c.escena.datos as Datos<'cierre'>;
  const { encima, debajo } = textosConObjeto(c, d.arriba);
  const nombre = d.nombre || nombreMarca;
  const libre = altoLibre(encima, debajo);
  const st = deGolpe(c.f, c.inicio + 2);
  let alto: number;
  let contenido: ReactNode;
  if (d.imagen) {
    alto = Math.min(320, libre);
    contenido = <Img src={staticFile(d.imagen)} style={{ width: 680, height: alto, objectFit: 'contain', filter: sombraFiltro(0.9, 1, 0.9) }} />;
  } else if (nombre.trim() !== '') {
    const ancho = anchoTexto(nombre, 100, 700, false, -0.03);
    const cuerpo = Math.min(170, (760 / ancho) * 100);
    alto = cuerpo * 1.15;
    contenido = <div style={{ fontFamily: ROBOTO, fontWeight: 700, fontSize: cuerpo, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#000000', whiteSpace: 'nowrap' }}>{nombre}</div>;
  } else {
    alto = Math.min(360, libre);
    contenido = <PersonajePixel ancho={alto * 0.95} color={colorPersonaje(c)} ojos={c.ajustes.color_ojos} parpadeo={parpadeo(c.f, 50)} />;
  }
  // Un subrayado en el color de acento que se dibuja debajo del nombre.
  const raya = anima(c.f, [c.inicio + 8, c.inicio + 22], [0, 1], CURVAS.frena);
  const dibuja = (y: number): ReactNode => (
    <>
      <GrillaCruces cx={CX} cy={y + alto / 2} columnas={9} filas={Math.max(5, Math.ceil(alto / 90) + 3)} />
      {st.visible ? (
        <div style={{ position: 'absolute', left: 0, width: ANCHO, top: y, height: alto, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${st.escala.toFixed(4)})`, opacity: st.opacidad }}>{contenido}</div>
      ) : null}
      {!d.imagen && nombre.trim() !== '' ? <div style={{ position: 'absolute', left: CX - 150 * raya, width: 300 * raya, top: y + alto + 6, height: 12, borderRadius: 6, background: c.acento }} /> : null}
    </>
  );
  return <PilaConObjeto c={c} encima={encima} debajo={debajo} alto={alto} dibuja={dibuja} />;
}
